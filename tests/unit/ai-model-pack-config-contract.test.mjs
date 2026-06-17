import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";

import {
  assertValidModelPackConfigBundle,
  createModelPackConfigBundle,
  DEFAULT_LOCAL_AI_MODEL,
  DEFAULT_LOCAL_AI_MODEL_DOWNLOAD_COMMAND,
  LOCAL_AI_MODEL_TIERS,
  validateModelPackConfigBundle
} from "../../packages/ai-orchestrator/src/index.mjs";

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

async function readModelPackSchema() {
  const raw = await fs.readFile(path.join(process.cwd(), "schemas", "model_pack_config.schema.json"), "utf8");
  return JSON.parse(raw);
}

function errorCodes(result) {
  return result.errors.map((error) => error.code);
}

test("model pack config schema declares the multi-model contract", async () => {
  const schema = await readModelPackSchema();
  const modelPackSchema = schema.properties.model_packs.items;
  const providerPresetSchema = schema.properties.provider_presets.items;

  assert.deepEqual(
    [...schema.required].sort(),
    ["auth_modes", "model_packs", "model_tiers", "provider_presets", "user_modes", "version"].sort()
  );
  assert.ok(schema.properties.user_modes.items.enum.includes("Local / Private"));
  assert.ok(schema.properties.user_modes.items.enum.includes("Deep Thinking"));
  assert.ok(schema.properties.model_tiers.items.enum.includes("strong_reasoning"));
  assert.ok(schema.properties.model_tiers.items.enum.includes("local_private"));
  assert.ok(modelPackSchema.required.includes("fallback_policy"));
  assert.ok(modelPackSchema.required.includes("privacy"));
  assert.ok(providerPresetSchema.required.includes("model_map"));
  assert.ok(providerPresetSchema.required.includes("runtime_model_map"));
  assert.ok(providerPresetSchema.properties.adapter_type.enum.includes("aggregated_gateway"));
  assert.ok(providerPresetSchema.properties.adapter_type.enum.includes("local_gateway"));
});

test("built-in model packs compile into a valid config bundle", () => {
  const bundle = createModelPackConfigBundle();
  const result = validateModelPackConfigBundle(bundle);
  const packIds = bundle.model_packs.map((pack) => pack.model_pack_id).sort();
  const providerPresets = bundle.provider_presets.map((preset) => preset.provider_preset).sort();
  const privacyFirst = bundle.model_packs.find((pack) => pack.model_pack_id === "privacy_first");
  const starterAuto = bundle.model_packs.find((pack) => pack.model_pack_id === "starter_auto");
  const platformProvider = bundle.provider_presets.find((preset) => preset.provider_preset === "platform_managed_openai");

  assert.equal(result.valid, true, JSON.stringify(result.errors, null, 2));
  assert.doesNotThrow(() => assertValidModelPackConfigBundle(bundle));
  assert.deepEqual(
    packIds,
    [
      "china_optimized",
      "deep_work",
      "global_optimized",
      "low_cost_research",
      "minicpm_local",
      "minicpm_remote",
      "ollama_local",
      "privacy_first",
      "starter_auto"
    ].sort()
  );
  assert.deepEqual(
    providerPresets,
    [
      "china_optimized_gateway",
      "local_private_gateway",
      "minicpm_local_gateway",
      "minicpm_remote_gateway",
      "ollama_local_gateway",
      "openai_compatible_gateway",
      "platform_managed_openai"
    ].sort()
  );
  assert.equal(starterAuto.provider_visibility, "hidden");
  assert.equal(starterAuto.auth_mode, "platform_managed");
  assert.equal(platformProvider.runtime_model_map["platform_managed_openai:strong_reasoning"], "gpt-5.5");
  assert.equal(privacyFirst.default_user_mode, "Local / Private");
  assert.equal(privacyFirst.privacy.default_mode, "local_only");
  assert.equal(privacyFirst.privacy.allow_cloud, false);
  assert.equal(privacyFirst.fallback_policy.allow_cloud_fallback, false);
  assert.equal(privacyFirst.fallback_policy.allow_cloud_fallback_for_private, false);
  const minicpmLocal = bundle.model_packs.find((pack) => pack.model_pack_id === "minicpm_local");
  const minicpmRemote = bundle.model_packs.find((pack) => pack.model_pack_id === "minicpm_remote");
  const ollamaLocal = bundle.model_packs.find((pack) => pack.model_pack_id === "ollama_local");
  const minicpmLocalProvider = bundle.provider_presets.find((preset) => preset.provider_preset === "minicpm_local_gateway");
  const minicpmRemoteProvider = bundle.provider_presets.find((preset) => preset.provider_preset === "minicpm_remote_gateway");
  const ollamaLocalProvider = bundle.provider_presets.find((preset) => preset.provider_preset === "ollama_local_gateway");
  assert.equal(ollamaLocal.provider_preset, "ollama_local_gateway");
  assert.equal(ollamaLocal.privacy.default_mode, "local_only");
  assert.equal(ollamaLocalProvider.local_execution, true);
  assert.equal(ollamaLocalProvider.runtime_model_map["ollama_local_gateway:local_private"], DEFAULT_LOCAL_AI_MODEL);
  assert.equal(minicpmLocal.provider_preset, "minicpm_local_gateway");
  assert.equal(minicpmLocal.privacy.default_mode, "local_only");
  assert.equal(minicpmRemote.provider_preset, "minicpm_remote_gateway");
  assert.equal(minicpmRemote.privacy.allow_cloud, true);
  assert.equal(minicpmLocalProvider.local_execution, true);
  assert.equal(minicpmLocalProvider.runtime_model_map["minicpm_local_gateway:local_private"], "minicpm");
  assert.equal(minicpmRemoteProvider.adapter_type, "aggregated_gateway");
  assert.equal(minicpmRemoteProvider.runtime_model_map["minicpm_remote_gateway:standard"], "minicpm");
});

test("local model catalog declares qwen3 8b default capability assumptions", () => {
  const defaultProfile = LOCAL_AI_MODEL_TIERS.find((model) => model.tier === "default");
  const tierNames = LOCAL_AI_MODEL_TIERS.map((model) => model.name);

  assert.equal(DEFAULT_LOCAL_AI_MODEL, "qwen3:8b");
  assert.equal(DEFAULT_LOCAL_AI_MODEL_DOWNLOAD_COMMAND, "ollama pull qwen3:8b");
  assert.deepEqual(tierNames, ["qwen2.5:7b", "qwen3:8b", "qwen3.5:9b"]);
  assert.ok(defaultProfile.capabilityTags.includes("适合观点提纯"));
  assert.ok(defaultProfile.capabilityTags.includes("适合潜在关联"));
  assert.ok(defaultProfile.capabilityTags.includes("JSON 输出较稳定"));
  assert.ok(defaultProfile.capabilityTags.includes("速度中等"));
});

test("model pack config rejects unsupported provider auth modes", () => {
  const bundle = createModelPackConfigBundle();
  const broken = clone(bundle);
  const starterAuto = broken.model_packs.find((pack) => pack.model_pack_id === "starter_auto");
  starterAuto.auth_mode = "local_no_key";

  const result = validateModelPackConfigBundle(broken);

  assert.equal(result.valid, false);
  assert.ok(errorCodes(result).includes("auth_mode_not_supported"));
  assert.throws(() => assertValidModelPackConfigBundle(broken), { code: "AI_MODEL_PACK_CONFIG_INVALID" });
});

test("model pack config rejects silent cloud fallback for local private packs", () => {
  const bundle = createModelPackConfigBundle();
  const broken = clone(bundle);
  const privacyFirst = broken.model_packs.find((pack) => pack.model_pack_id === "privacy_first");
  privacyFirst.fallback_policy.allow_cloud_fallback = true;
  privacyFirst.fallback_policy.allow_cloud_fallback_for_private = true;
  privacyFirst.privacy.allow_cloud = true;

  const result = validateModelPackConfigBundle(broken);

  assert.equal(result.valid, false);
  assert.ok(errorCodes(result).includes("local_private_cloud_fallback_forbidden"));
  assert.ok(errorCodes(result).includes("private_cloud_fallback_forbidden"));
  assert.ok(errorCodes(result).includes("local_only_blocks_cloud"));
});

test("model pack config rejects incomplete local gateway presets", () => {
  const bundle = createModelPackConfigBundle();
  const broken = clone(bundle);
  const localGateway = broken.provider_presets.find((preset) => preset.provider_preset === "local_private_gateway");
  localGateway.local_execution = false;
  delete localGateway.model_map.standard;

  const result = validateModelPackConfigBundle(broken);

  assert.equal(result.valid, false);
  assert.ok(errorCodes(result).includes("local_gateway_requires_local_execution"));
  assert.ok(errorCodes(result).includes("required_model_tier"));
});

test("model pack config rejects runtime model refs that bypass model_map", () => {
  const bundle = createModelPackConfigBundle();
  const broken = clone(bundle);
  const platform = broken.provider_presets.find((preset) => preset.provider_preset === "platform_managed_openai");
  platform.runtime_model_map = {
    standard: "gpt-custom-standard"
  };

  const result = validateModelPackConfigBundle(broken);

  assert.equal(result.valid, false);
  assert.ok(errorCodes(result).includes("runtime_model_ref_unknown"));
});
