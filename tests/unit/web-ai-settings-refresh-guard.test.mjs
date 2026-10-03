import test from "node:test";
import assert from "node:assert/strict";
import { createAiSettingsRefreshGuard, refreshAiSettingsReadback } from "../../apps/web/src/ai-settings-refresh-guard.js";

test("late settings reads cannot replace a changed or deliberately cleared draft", () => {
  const ai = { runtimeMode: "cloud_only", providerEndpointUrl: "https://saved.test/v1", remoteApiKey: "synthetic-key", providerDraftTouched: {} };
  const guard = createAiSettingsRefreshGuard(() => ai);
  assert.equal(guard.isCurrent(), true);
  assert.equal(guard.canApplyPreferences(), true);
  ai.providerEndpointUrl = "";
  ai.providerDraftTouched.providerEndpointUrl = true;
  assert.equal(guard.isCurrent(), false);
  guard.capture();
  assert.equal(guard.isCurrent(), true);
  assert.equal(guard.canApplyPreferences(), false);
  ai.remoteApiKey = "synthetic-replacement";
  assert.equal(guard.isCurrent(), false);
});

test("runtime telemetry does not invalidate reads but user selection and consent do", () => {
  const ai = { localModel: "qwen2.5:7b", remoteConsentScope: "" };
  const guard = createAiSettingsRefreshGuard(() => ai);
  ai.localRuntimeStatus = "available";
  ai.testStatus = "success";
  assert.equal(guard.isCurrent(), true);
  ai.localModel = "qwen3:8b";
  assert.equal(guard.isCurrent(), false);
  guard.capture();
  ai.remoteConsentScope = "synthetic-scope";
  assert.equal(guard.isCurrent(), false);
});

test("delayed preferences and configs cannot overwrite inputs changed during refresh", async () => {
  const settingsState = { ai: { providerEndpointUrl: "old", providerConfigs: [{ id: "old" }] } };
  const aiRefresh = createAiSettingsRefreshGuard(() => settingsState.ai);
  let resolvePreferences;
  let resolveConfigs;
  let applied = 0;
  const refreshing = refreshAiSettingsReadback({
    aiRefresh, settingsState,
    fetchPreferences: () => new Promise(resolve => { resolvePreferences = resolve; }),
    applyPreferences: () => { applied++; settingsState.ai.providerEndpointUrl = "saved"; },
    fetchProviderConfigs: () => new Promise(resolve => { resolveConfigs = resolve; }),
    applyProviderConfig: () => { applied++; settingsState.ai.providerEndpointUrl = "configured"; }
  });
  settingsState.ai.providerEndpointUrl = "user-draft";
  resolvePreferences({ runtimeMode: "old" });
  await new Promise(resolve => setImmediate(resolve));
  settingsState.ai.providerEndpointUrl = "";
  resolveConfigs([{ id: "new" }]);
  await refreshing;
  assert.equal(applied, 0);
  assert.equal(settingsState.ai.providerEndpointUrl, "");
  assert.deepEqual(settingsState.ai.providerConfigs, [{ id: "new" }]);
});

test("read errors preserve selection and saved provider inventory", async () => {
  const settingsState = { ai: { localModel: "selected", providerConfigs: [{ id: "saved" }] } };
  let applied = 0;
  await refreshAiSettingsReadback({
    aiRefresh: createAiSettingsRefreshGuard(() => settingsState.ai), settingsState,
    fetchPreferences: async () => { throw new Error("offline"); },
    fetchProviderConfigs: async () => { throw new Error("offline"); },
    applyPreferences: () => { applied++; }, applyProviderConfig: () => { applied++; }
  });
  assert.equal(applied, 0);
  assert.equal(settingsState.ai.localModel, "selected");
  assert.deepEqual(settingsState.ai.providerConfigs, [{ id: "saved" }]);
});

test("unchanged refresh applies preferences then configs with the refreshed baseline", async () => {
  const settingsState = { ai: { localModel: "old" } };
  const calls = [];
  await refreshAiSettingsReadback({
    aiRefresh: createAiSettingsRefreshGuard(() => settingsState.ai), settingsState,
    fetchPreferences: async () => ({ localModel: "new" }),
    applyPreferences: preferences => { calls.push("preferences"); settingsState.ai.localModel = preferences.localModel; },
    fetchProviderConfigs: async () => [],
    applyProviderConfig: () => { calls.push("configs"); },
    persist: () => calls.push("persist")
  });
  assert.equal(settingsState.ai.localModel, "new");
  assert.deepEqual(calls, ["preferences", "persist", "configs", "persist"]);
});
