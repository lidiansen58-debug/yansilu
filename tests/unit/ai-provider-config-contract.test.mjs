import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  aiProviderConfigToSchemaConfig,
  assertValidAiProviderConfig,
  createInMemoryAiProviderConfigStore,
  createSqliteAiProviderConfigStore,
  providerConfigToDescriptorInput,
  providerConfigToSettingsInput,
  validateAiProviderConfig
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
  return fs.mkdtemp(path.join(os.tmpdir(), "yansilu-ai-provider-config-"));
}

async function readProviderConfigSchema() {
  const raw = await fs.readFile(path.join(process.cwd(), "schemas", "ai_provider_config.schema.json"), "utf8");
  return JSON.parse(raw);
}

function errorCodes(result) {
  return result.errors.map((error) => error.code);
}

test("provider config schema declares endpoint secret and health-check boundaries", async () => {
  const schema = await readProviderConfigSchema();

  assert.ok(schema.required.includes("provider_id"));
  assert.ok(schema.required.includes("auth_mode"));
  assert.ok(schema.required.includes("secret_ref"));
  assert.ok(schema.required.includes("endpoint_url"));
  assert.ok(schema.required.includes("health_check"));
  assert.ok(schema.required.includes("runtime_model_map"));
  assert.ok(schema.properties.adapter_type.enum.includes("aggregated_gateway"));
  assert.ok(schema.properties.adapter_type.enum.includes("local_gateway"));
  assert.ok(schema.properties.auth_mode.enum.includes("byok_advanced"));
  assert.ok(schema.properties.auth_mode.enum.includes("local_no_key"));
  assert.deepEqual(
    [...schema.properties.health_check.required].sort(),
    ["enabled", "endpoint_url", "expected_status", "interval_seconds", "method", "timeout_ms"].sort()
  );
});

test("valid gateway provider config compiles to descriptor and settings inputs", () => {
  const config = assertValidAiProviderConfig({
    providerId: "openai_compatible_gateway",
    authMode: "workspace_managed",
    secretRef: "secret_gateway",
    endpointUrl: "https://gateway.example.test/v1/chat/completions",
    headers: { "x-workspace-id": "workspace_01" },
    modelMap: { standard: "openai_compatible_gateway:standard_override" },
    runtimeModelMap: { "openai_compatible_gateway:standard_override": "gateway-standard-model" },
    healthCheck: {
      enabled: true,
      endpointUrl: "https://gateway.example.test/health",
      method: "GET",
      timeoutMs: 2000,
      expectedStatus: 200,
      intervalSeconds: 60
    }
  });
  const schemaConfig = aiProviderConfigToSchemaConfig(config);
  const descriptor = providerConfigToDescriptorInput(config);
  const settings = providerConfigToSettingsInput(config);

  assert.equal(config.providerId, "openai_compatible_gateway");
  assert.equal(schemaConfig.provider_id, "openai_compatible_gateway");
  assert.equal(schemaConfig.secret_ref, "secret_gateway");
  assert.equal(schemaConfig.health_check.enabled, true);
  assert.equal(descriptor.endpointUrl, "https://gateway.example.test/v1/chat/completions");
  assert.equal(descriptor.secretRef, "secret_gateway");
  assert.equal(descriptor.modelMap.standard, "openai_compatible_gateway:standard_override");
  assert.equal(descriptor.runtimeModelMap["openai_compatible_gateway:standard_override"], "gateway-standard-model");
  assert.equal(schemaConfig.runtime_model_map["openai_compatible_gateway:standard_override"], "gateway-standard-model");
  assert.equal(settings.providerConfigId, config.id);
  assert.equal(settings.secretRef, "secret_gateway");
  assert.equal(settings.runtimeModelMap["openai_compatible_gateway:standard_override"], "gateway-standard-model");
});

test("provider config rejects raw secrets and auth headers", () => {
  const result = validateAiProviderConfig({
    providerId: "openai_compatible_gateway",
    authMode: "byok_advanced",
    secretRef: "secret_user_key",
    endpointUrl: "https://gateway.example.test/v1/chat/completions",
    apiKey: "sk-test-raw-secret",
    headers: {
      authorization: "Bearer sk-test-raw-secret"
    }
  });

  assert.equal(result.valid, false);
  assert.ok(errorCodes(result).includes("raw_secret_forbidden"));
  assert.ok(errorCodes(result).includes("secret_header_forbidden"));
  assert.throws(() => assertValidAiProviderConfig({
    providerId: "openai_compatible_gateway",
    authMode: "byok_advanced",
    secretRef: "secret_user_key",
    endpointUrl: "https://gateway.example.test/v1/chat/completions",
    token: "sk-test-raw-secret"
  }), { code: "AI_PROVIDER_CONFIG_INVALID" });
});

test("provider config rejects unsupported auth mode and missing enabled gateway endpoint", () => {
  const result = validateAiProviderConfig({
    providerId: "openai_compatible_gateway",
    authMode: "platform_managed",
    endpointUrl: ""
  });

  assert.equal(result.valid, false);
  assert.ok(errorCodes(result).includes("auth_mode_not_supported"));
  assert.ok(errorCodes(result).includes("endpoint_url_required"));
});

test("provider config permits localhost local gateway without a secret", () => {
  const result = validateAiProviderConfig({
    providerId: "local_private_gateway",
    authMode: "local_no_key",
    endpointUrl: "http://localhost:11434/v1/chat/completions",
    healthCheck: {
      enabled: true,
      endpointUrl: "http://localhost:11434/api/tags",
      method: "GET",
      timeoutMs: 1000,
      expectedStatus: 200,
      intervalSeconds: 30
    }
  });

  assert.equal(result.valid, true, JSON.stringify(result.errors, null, 2));
  assert.equal(result.config.healthCheck.enabled, true);
  assert.equal(result.config.secretRef, "");
});

test("provider config supports MiniCPM local and remote gateway paths", () => {
  const local = validateAiProviderConfig({
    providerId: "minicpm_local_gateway",
    authMode: "local_no_key",
    endpointUrl: "http://127.0.0.1:11434/v1/chat/completions",
    runtimeModelMap: {
      "minicpm_local_gateway:local_private": "minicpm-local"
    }
  });
  const remote = validateAiProviderConfig({
    providerId: "minicpm_remote_gateway",
    authMode: "workspace_managed",
    secretRef: "secret_minicpm_gateway",
    endpointUrl: "https://minicpm-gateway.example.test/v1/chat/completions",
    runtimeModelMap: {
      "minicpm_remote_gateway:standard": "third-party-minicpm"
    }
  });

  assert.equal(local.valid, true, JSON.stringify(local.errors, null, 2));
  assert.equal(local.config.adapterType, "local_gateway");
  assert.equal(local.config.secretRef, "");
  assert.equal(remote.valid, true, JSON.stringify(remote.errors, null, 2));
  assert.equal(remote.config.adapterType, "aggregated_gateway");
  assert.equal(remote.config.secretRef, "secret_minicpm_gateway");
});

test("provider config rejects insecure non-local endpoints", () => {
  const result = validateAiProviderConfig({
    providerId: "openai_compatible_gateway",
    authMode: "workspace_managed",
    secretRef: "secret_gateway",
    endpointUrl: "http://gateway.example.test/v1/chat/completions"
  });

  assert.equal(result.valid, false);
  assert.ok(errorCodes(result).includes("endpoint_url_insecure"));
});

test("provider config validates runtime model map against logical model refs", () => {
  const valid = validateAiProviderConfig({
    providerId: "platform_managed_openai",
    authMode: "platform_managed",
    runtimeModelMap: { "platform_managed_openai:standard": "gpt-custom-standard" }
  });
  const invalid = validateAiProviderConfig({
    providerId: "platform_managed_openai",
    authMode: "platform_managed",
    runtimeModelMap: { standard: "gpt-custom-standard" }
  });

  assert.equal(valid.valid, true, JSON.stringify(valid.errors, null, 2));
  assert.equal(invalid.valid, false);
  assert.ok(errorCodes(invalid).includes("runtime_model_ref_unknown"));
});

test("provider config store validates configs and indexes by provider id", () => {
  const store = createInMemoryAiProviderConfigStore();
  const config = store.setProviderConfig({
    providerId: "china_optimized_gateway",
    authMode: "workspace_managed",
    secretRef: "secret_china_gateway",
    endpointUrl: "https://china-gateway.example.test/v1/chat/completions"
  });

  assert.equal(config.providerId, "china_optimized_gateway");
  assert.equal(store.getProviderConfig({ providerId: "china_optimized_gateway" }).secretRef, "secret_china_gateway");
  assert.equal(store.listProviderConfigs({ status: "enabled" }).length, 1);
  assert.throws(() => store.setProviderConfig({
    providerId: "openai_compatible_gateway",
    authMode: "workspace_managed",
    endpointUrl: "https://gateway.example.test/v1/chat/completions"
  }), { code: "AI_PROVIDER_CONFIG_INVALID" });
  assert.throws(() => store.setProviderConfig({
    providerId: "openai_compatible_gateway",
    authMode: "workspace_managed",
    secretRef: "secret_gateway",
    endpointUrl: "https://gateway.example.test/v1/chat/completions",
    apiKey: "sk-test-raw-secret"
  }), { code: "AI_PROVIDER_CONFIG_INVALID" });
});

test("sqlite provider config store persists configs without raw secrets", async (t) => {
  if (!(await hasNodeSqlite())) {
    t.skip("node:sqlite is not available in current runtime");
    return;
  }

  const vaultPath = await makeTempVault();
  let store = await createSqliteAiProviderConfigStore({ vaultPath });
  const saved = store.setProviderConfig({
    providerId: "china_optimized_gateway",
    authMode: "workspace_managed",
    secretRef: "secret_china_gateway",
    endpointUrl: "https://china-gateway.example.test/v1/chat/completions",
    runtimeModelMap: {
      "china_optimized_gateway:standard": "qwen-plus"
    }
  });

  assert.equal(saved.providerId, "china_optimized_gateway");
  assert.equal(saved.secretRef, "secret_china_gateway");
  assert.equal(store.getProviderConfig({ providerId: "china_optimized_gateway" }).runtimeModelMap["china_optimized_gateway:standard"], "qwen-plus");
  assert.throws(() => store.setProviderConfig({
    providerId: "openai_compatible_gateway",
    authMode: "workspace_managed",
    secretRef: "secret_gateway",
    endpointUrl: "https://gateway.example.test/v1/chat/completions",
    apiKey: "sk-test-raw-secret"
  }), { code: "AI_PROVIDER_CONFIG_INVALID" });
  const dbPath = store.dbPath;
  store.close();

  store = await createSqliteAiProviderConfigStore({ dbPath });
  const persisted = store.getProviderConfig({ providerId: "china_optimized_gateway" });

  assert.equal(persisted.secretRef, "secret_china_gateway");
  assert.equal(store.listProviderConfigs({ status: "enabled" }).length, 1);
  assert.equal(store.deleteProviderConfig({ providerId: "china_optimized_gateway" }), true);
  assert.equal(store.getProviderConfig({ providerId: "china_optimized_gateway" }), null);
  store.close();
});
