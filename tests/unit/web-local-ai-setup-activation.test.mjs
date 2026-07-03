import test from "node:test";
import assert from "node:assert/strict";

import {
  activateLocalAiSetupSelection
} from "../../apps/web/src/local-ai-setup-activation.js";

test("local AI setup activation restores previous selection when preference save fails", async () => {
  const calls = [];
  const routePreview = { access: { ready: false }, provider: { providerId: "platform_managed_openai" } };
  const aiState = {
    runtimeMode: "auto",
    modelPack: "Starter Auto",
    userMode: "Auto",
    advancedModelRef: "",
    secretRef: "secret_remote",
    providerEndpointUrl: "https://remote.example.test",
    providerHealthEndpointUrl: "https://remote.example.test/health",
    remoteRuntimeModel: "remote-model",
    localModel: "",
    routePreview,
    localAiSetupSyncPending: false,
    providerDraftTouched: { secretRef: true }
  };

  const saved = await activateLocalAiSetupSelection({
    aiState,
    reconcileAiSelectionState: () => {
      calls.push(["reconcile", aiState.runtimeMode, aiState.modelPack]);
      aiState.routePreview = null;
      aiState.providerDraftTouched = {};
      aiState.secretRef = "";
    },
    persistAiSettingsToStorage: () => calls.push(["persist", aiState.runtimeMode, aiState.modelPack]),
    syncAiSettingsToApi: async () => false
  });

  assert.equal(saved, false);
  assert.equal(aiState.runtimeMode, "auto");
  assert.equal(aiState.modelPack, "Starter Auto");
  assert.equal(aiState.secretRef, "secret_remote");
  assert.equal(aiState.providerEndpointUrl, "https://remote.example.test");
  assert.equal(aiState.remoteRuntimeModel, "remote-model");
  assert.equal(aiState.routePreview, routePreview);
  assert.equal(aiState.localAiSetupSyncPending, false);
  assert.deepEqual(aiState.providerDraftTouched, { secretRef: true });
  assert.deepEqual(calls, [
    ["reconcile", "local_only", "Ollama Local"],
    ["persist", "local_only", "Ollama Local"],
    ["persist", "auto", "Starter Auto"]
  ]);
});

test("local AI setup activation keeps local selection when preference save succeeds", async () => {
  const aiState = {
    runtimeMode: "auto",
    modelPack: "Starter Auto",
    userMode: "Auto",
    localAiSetupSyncPending: false,
    providerDraftTouched: {}
  };

  const saved = await activateLocalAiSetupSelection({
    aiState,
    reconcileAiSelectionState: () => {},
    persistAiSettingsToStorage: () => {},
    syncAiSettingsToApi: async () => true
  });

  assert.equal(saved, true);
  assert.equal(aiState.runtimeMode, "local_only");
  assert.equal(aiState.modelPack, "Ollama Local");
  assert.equal(aiState.userMode, "Local / Private");
  assert.equal(aiState.localAiSetupSyncPending, false);
});

test("local AI setup activation can keep local setup visible when save fails during guided setup", async () => {
  const calls = [];
  const aiState = {
    runtimeMode: "auto",
    modelPack: "Starter Auto",
    userMode: "Auto",
    routePreview: { access: { ready: false } },
    localAiSetupSyncPending: false,
    providerDraftTouched: {}
  };

  const saved = await activateLocalAiSetupSelection({
    aiState,
    restoreOnFailure: false,
    reconcileAiSelectionState: () => {
      aiState.routePreview = null;
      calls.push(["reconcile"]);
    },
    persistAiSettingsToStorage: () => calls.push(["persist", aiState.runtimeMode, aiState.modelPack]),
    syncAiSettingsToApi: async () => false
  });

  assert.equal(saved, false);
  assert.equal(aiState.runtimeMode, "local_only");
  assert.equal(aiState.modelPack, "Ollama Local");
  assert.equal(aiState.userMode, "Local / Private");
  assert.equal(aiState.routePreview, null);
  assert.equal(aiState.localAiSetupSyncPending, true);
  assert.deepEqual(calls, [
    ["reconcile"],
    ["persist", "local_only", "Ollama Local"]
  ]);
});
