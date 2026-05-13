import test from "node:test";
import assert from "node:assert/strict";

import {
  buildProviderHealthCheckRequest,
  createInMemoryProviderHealthStore,
  runProviderHealthCheck,
  runProviderHealthChecks
} from "../../packages/ai-orchestrator/src/index.mjs";

function gatewayConfig(input = {}) {
  return {
    providerId: "openai_compatible_gateway",
    authMode: "workspace_managed",
    secretRef: "secret_gateway",
    endpointUrl: "https://gateway.example.test/v1/chat/completions",
    headers: { "x-workspace-id": "workspace_01" },
    healthCheck: {
      enabled: true,
      endpointUrl: "https://gateway.example.test/health",
      method: "GET",
      timeoutMs: 1000,
      expectedStatus: 204,
      intervalSeconds: 60
    },
    ...input
  };
}

function response(status = 204) {
  return {
    status,
    ok: status >= 200 && status < 300
  };
}

test("health runner builds a safe health-check request from provider config", () => {
  const request = buildProviderHealthCheckRequest(gatewayConfig());

  assert.equal(request.providerId, "openai_compatible_gateway");
  assert.equal(request.providerConfigId, "provider_openai_compatible_gateway");
  assert.equal(request.url, "https://gateway.example.test/health");
  assert.equal(request.init.method, "GET");
  assert.equal(request.init.headers["x-workspace-id"], "workspace_01");
  assert.equal(request.init.headers.authorization, undefined);
  assert.equal(request.expectedStatus, 204);
  assert.equal(request.enabled, true);
});

test("health runner records unknown when network execution is disabled", async () => {
  const store = createInMemoryProviderHealthStore();
  const result = await runProviderHealthCheck({
    providerConfig: gatewayConfig(),
    providerHealthStore: store,
    trigger: "scheduled_task"
  });
  const latest = store.getLatestProviderHealth({ providerId: "openai_compatible_gateway" });

  assert.equal(result.status, "skipped");
  assert.equal(result.record.status, "unknown");
  assert.equal(result.record.errorType, "network_disabled");
  assert.equal(result.record.trigger, "scheduled_task");
  assert.equal(latest.id, result.record.id);
});

test("health runner records skipped unknown when health check is disabled", async () => {
  const store = createInMemoryProviderHealthStore();
  const result = await runProviderHealthCheck({
    providerConfig: gatewayConfig({
      healthCheck: {
        enabled: false,
        endpointUrl: "https://gateway.example.test/health",
        method: "GET",
        timeoutMs: 1000,
        expectedStatus: 204,
        intervalSeconds: 60
      }
    }),
    providerHealthStore: store,
    fetchImpl: async () => response(204)
  });

  assert.equal(result.status, "skipped");
  assert.equal(result.record.status, "unknown");
  assert.equal(result.record.errorType, "health_check_disabled");
  assert.equal(store.listProviderHealth({ providerId: "openai_compatible_gateway" }).length, 1);
});

test("health runner records healthy status on expected HTTP response", async () => {
  const store = createInMemoryProviderHealthStore();
  const result = await runProviderHealthCheck({
    providerConfig: gatewayConfig(),
    providerHealthStore: store,
    fetchImpl: async (url, init) => {
      assert.equal(url, "https://gateway.example.test/health");
      assert.equal(init.method, "GET");
      assert.equal(init.headers["x-workspace-id"], "workspace_01");
      return response(204);
    }
  });

  assert.equal(result.status, "succeeded");
  assert.equal(result.record.status, "healthy");
  assert.equal(result.record.errorType, "");
  assert.equal(result.record.payload.actualStatus, 204);
  assert.equal(store.getLatestProviderHealth({ providerId: "openai_compatible_gateway" }).status, "healthy");
});

test("health runner records degraded status for non-expected client response", async () => {
  const store = createInMemoryProviderHealthStore();
  const result = await runProviderHealthCheck({
    providerConfig: gatewayConfig(),
    providerHealthStore: store,
    fetchImpl: async () => response(401)
  });

  assert.equal(result.status, "failed");
  assert.equal(result.record.status, "degraded");
  assert.equal(result.record.errorType, "unexpected_status");
  assert.equal(result.record.retryable, false);
});

test("health runner records down status for retryable provider response", async () => {
  const store = createInMemoryProviderHealthStore();
  const result = await runProviderHealthCheck({
    providerConfig: gatewayConfig(),
    providerHealthStore: store,
    fetchImpl: async () => response(503)
  });

  assert.equal(result.status, "failed");
  assert.equal(result.record.status, "down");
  assert.equal(result.record.errorType, "unexpected_status");
  assert.equal(result.record.retryable, true);
});

test("health runner records down status for timeout-like errors", async () => {
  const store = createInMemoryProviderHealthStore();
  const timeoutError = new Error("Request timed out");
  timeoutError.code = "timeout";
  const result = await runProviderHealthCheck({
    providerConfig: gatewayConfig(),
    providerHealthStore: store,
    fetchImpl: async () => {
      throw timeoutError;
    }
  });

  assert.equal(result.status, "failed");
  assert.equal(result.record.status, "down");
  assert.equal(result.record.errorType, "timeout");
  assert.equal(result.record.retryable, true);
});

test("health runner batches provider configs and summarizes statuses", async () => {
  const store = createInMemoryProviderHealthStore();
  const result = await runProviderHealthChecks({
    providerHealthStore: store,
    configs: [
      gatewayConfig({ providerId: "openai_compatible_gateway" }),
      gatewayConfig({
        providerId: "china_optimized_gateway",
        endpointUrl: "https://china-gateway.example.test/v1/chat/completions",
        healthCheck: {
          enabled: true,
          endpointUrl: "https://china-gateway.example.test/health",
          method: "GET",
          timeoutMs: 1000,
          expectedStatus: 200,
          intervalSeconds: 60
        }
      })
    ],
    fetchImpl: async (url) => {
      if (url.includes("china-gateway")) return response(503);
      return response(204);
    }
  });

  assert.equal(result.summary.total, 2);
  assert.equal(result.summary.healthy, 1);
  assert.equal(result.summary.down, 1);
  assert.equal(store.getLatestProviderHealth({ providerId: "openai_compatible_gateway" }).status, "healthy");
  assert.equal(store.getLatestProviderHealth({ providerId: "china_optimized_gateway" }).status, "down");
});
