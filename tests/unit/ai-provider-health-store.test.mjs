import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  createAiStores,
  createInMemoryProviderHealthStore,
  createSqliteAiStores,
  createSqliteProviderHealthStore,
  getProviderPreset,
  providerHealthCandidateInput,
  resolveModelRoute,
  selectProviderForRoute
} from "../../packages/ai-orchestrator/src/index.mjs";

async function hasNodeSqlite() {
  try {
    await import("node:sqlite");
    return true;
  } catch {
    return false;
  }
}

async function makeTempVault() {
  return fs.mkdtemp(path.join(os.tmpdir(), "yansilu-ai-provider-health-"));
}

function modelRoute() {
  return resolveModelRoute({
    agent: {
      agentId: "research_agent",
      defaultModelTier: "standard",
      requiredCapabilities: ["structured_output"]
    },
    providerDescriptor: getProviderPreset("openai_compatible_gateway"),
    modelPack: "Global Optimized",
    userMode: "Auto",
    privacyMode: "normal"
  });
}

test("memory provider health store records latest status and history", () => {
  const store = createInMemoryProviderHealthStore();
  const first = store.recordProviderHealth({
    id: "health_gateway_1",
    providerId: "openai_compatible_gateway",
    status: "degraded",
    latencyMs: 2400,
    checkedAt: "2026-05-11T01:00:00.000Z",
    message: "Slow gateway",
    payload: { region: "global" }
  });
  const second = store.recordProviderHealth({
    id: "health_gateway_2",
    providerId: "openai_compatible_gateway",
    status: "healthy",
    latencyMs: 320,
    checkedAt: "2026-05-11T01:05:00.000Z"
  });
  store.recordProviderHealth({
    id: "health_local_1",
    providerId: "local_private_gateway",
    status: "unknown",
    checkedAt: "2026-05-11T01:02:00.000Z"
  });

  assert.equal(first.status, "degraded");
  assert.equal(second.status, "healthy");
  assert.equal(store.getLatestProviderHealth({ providerId: "openai_compatible_gateway" }).id, "health_gateway_2");
  assert.equal(store.listProviderHealth({ providerId: "openai_compatible_gateway" }).length, 2);
  assert.deepEqual(store.listLatestProviderHealth().map((item) => item.providerId).sort(), [
    "local_private_gateway",
    "openai_compatible_gateway"
  ]);
  assert.equal(store.listLatestProviderHealth({ status: "healthy" })[0].providerId, "openai_compatible_gateway");
});

test("health store feeds latest status into provider fallback selection", () => {
  const store = createInMemoryProviderHealthStore({
    records: [
      {
        id: "health_primary_down",
        providerId: "openai_compatible_gateway",
        status: "down",
        checkedAt: "2026-05-11T01:00:00.000Z"
      },
      {
        id: "health_fallback_healthy",
        providerId: "platform_managed_openai",
        status: "healthy",
        checkedAt: "2026-05-11T01:00:01.000Z"
      }
    ]
  });

  const selection = selectProviderForRoute({
    route: modelRoute(),
    primaryProvider: providerHealthCandidateInput(getProviderPreset("openai_compatible_gateway"), store),
    candidates: [providerHealthCandidateInput(getProviderPreset("platform_managed_openai"), store)]
  });

  assert.equal(selection.action, "fallback");
  assert.equal(selection.fallbackUsed, true);
  assert.equal(selection.selectedProviderId, "platform_managed_openai");
  assert.equal(selection.fallbackReason, "provider_down");
});

test("sqlite provider health store persists latest status and history", async (t) => {
  if (!(await hasNodeSqlite())) {
    t.skip("node:sqlite is not available in current runtime");
    return;
  }

  const vaultPath = await makeTempVault();
  let store = await createSqliteProviderHealthStore({ vaultPath });
  store.recordProviderHealth({
    id: "health_sqlite_gateway_1",
    providerId: "openai_compatible_gateway",
    providerConfigId: "provider_openai_compatible_gateway",
    status: "degraded",
    latencyMs: 1800,
    checkedAt: "2026-05-11T02:00:00.000Z",
    source: "health_check",
    payload: { endpoint: "https://gateway.example.test/health" }
  });
  store.recordProviderHealth({
    id: "health_sqlite_gateway_2",
    providerId: "openai_compatible_gateway",
    providerConfigId: "provider_openai_compatible_gateway",
    status: "healthy",
    latencyMs: 410,
    checkedAt: "2026-05-11T02:05:00.000Z",
    source: "health_check"
  });

  assert.equal(store.getLatestProviderHealth({ providerId: "openai_compatible_gateway" }).id, "health_sqlite_gateway_2");
  assert.equal(store.listProviderHealth({ providerId: "openai_compatible_gateway" }).length, 2);
  store.close();

  store = await createSqliteProviderHealthStore({ vaultPath });
  const latest = store.getLatestProviderHealth({ providerId: "openai_compatible_gateway" });

  assert.equal(latest.status, "healthy");
  assert.equal(latest.providerConfigId, "provider_openai_compatible_gateway");
  assert.equal(store.listLatestProviderHealth()[0].providerId, "openai_compatible_gateway");
  assert.equal(store.listProviderHealth({ status: "degraded" })[0].payload.endpoint, "https://gateway.example.test/health");
  store.close();
});

test("ai store factories expose provider health store", async (t) => {
  const memoryStores = await createAiStores({ storageMode: "memory" });
  const memoryHealth = memoryStores.providerHealthStore.recordProviderHealth({
    providerId: "platform_managed_openai",
    status: "healthy"
  });

  assert.equal(memoryStores.providerHealthStore.getLatestProviderHealth({ providerId: "platform_managed_openai" }).id, memoryHealth.id);
  memoryStores.close();

  if (!(await hasNodeSqlite())) {
    t.skip("node:sqlite is not available in current runtime");
    return;
  }

  const vaultPath = await makeTempVault();
  let sqliteStores = await createSqliteAiStores({ vaultPath });
  sqliteStores.providerHealthStore.recordProviderHealth({
    id: "health_factory_sqlite",
    providerId: "platform_managed_openai",
    status: "healthy",
    checkedAt: "2026-05-11T03:00:00.000Z"
  });
  const dbPath = sqliteStores.dbPath;
  sqliteStores.close();

  sqliteStores = await createSqliteAiStores({ dbPath });
  assert.equal(sqliteStores.providerHealthStore.getLatestProviderHealth({ providerId: "platform_managed_openai" }).id, "health_factory_sqlite");
  sqliteStores.close();
});
