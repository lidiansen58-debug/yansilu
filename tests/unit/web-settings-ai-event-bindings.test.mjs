import test from "node:test";
import assert from "node:assert/strict";
import { installSettingsAiEventBindings } from "../../apps/web/src/settings-ai-event-bindings.js";

function createHarness() {
  const listeners = new Map();
  const elements = new Map();
  const calls = [];

  function element(id, extra = {}) {
    const node = {
      id,
      value: "",
      textContent: "",
      dataset: {},
      classList: {
        contains: () => false,
        toggle: (...args) => calls.push(["toggle", id, ...args])
      },
      setAttribute: (...args) => calls.push(["set-attr", id, ...args]),
      focus: () => calls.push(["focus", id]),
      addEventListener(type, handler) {
        listeners.set(`${id}:${type}`, handler);
      },
      ...extra
    };
    elements.set(id, node);
    return node;
  }

  function attrNode(attrs = {}) {
    return {
      getAttribute(name) {
        return attrs[name] || "";
      },
      ...attrs
    };
  }

  function target(matches = {}, extra = {}) {
    return {
      closest(selector) {
        return matches[selector] || null;
      },
      ...extra
    };
  }

  [
    "settingsAiRuntimeMode",
    "settingsAiHybridToggle",
    "settingsAiUserMode",
    "settingsAiModelPack",
    "settingsAiLocalModel",
    "settingsAiAdvancedModelRef",
    "settingsAiSecretRef",
    "settingsAiRemoteRuntimeModel",
    "settingsAiProviderEndpointUrl",
    "settingsAiTestPrompt",
    "settingsAiTestChatMeta",
    "settingsAiTestChatOutput",
    "btnAiTestChatRun",
    "btnAiTestChatCopy",
    "settingsAiProviderHealthEndpointUrl",
    "settingsAiSaveProviderConfig",
    "settingsAiCheckProviderHealth",
    "settingsAiRemoteHelp",
    "settingsAiRemoteHelpToggle",
    "settingsAiDetectOllama",
    "settingsAiStartOllama",
    "settingsAiStopOllama",
    "settingsAiPullOllamaModel",
    "settingsAiCopyOllamaInstallCommand",
    "settingsCardAiSettings"
  ].forEach((id) => element(id));

  return {
    calls,
    listeners,
    elements,
    $: (id) => elements.get(id) || null,
    attrNode,
    target,
    documentRef: {
      addEventListener(type, handler) {
        listeners.set(`document:${type}`, handler);
      }
    },
    clipboard: {
      async writeText(text) {
        calls.push(["clipboard", text]);
      }
    }
  };
}

test("settings AI event bindings route core field changes and delegated actions", async () => {
  const harness = createHarness();
  const settingsState = {
    ai: {
      runtimeMode: "hybrid",
      userMode: "Auto",
      routePreview: { privacy: { mode: "remote" } },
      testPrompt: "",
      testMeta: "测试成功",
      testOutput: "copy me"
    }
  };

  installSettingsAiEventBindings({
    $: harness.$,
    settingsState,
    documentRef: harness.documentRef,
    clipboard: harness.clipboard,
    normalizeAiRuntimeMode: (value) => value,
    applyAiRuntimeModeChange: async (mode) => harness.calls.push(["runtime", mode]),
    persistAiSettingsToStorage: () => harness.calls.push(["persist"]),
    syncAiSettingsToApi: () => harness.calls.push(["sync"]),
    refreshAiRoutePreview: () => harness.calls.push(["preview"]),
    renderSettingsPanel: () => harness.calls.push(["render"]),
    setStatus: (...args) => harness.calls.push(["status", ...args.slice(1)]),
    applyAiModelPackChange: (...args) => harness.calls.push(["pack", ...args]),
    selectInstalledLocalModelFromUi: async (...args) => harness.calls.push(["local-model", ...args]),
    markAiProviderDraftTouched: (...args) => harness.calls.push(["touch", ...args]),
    syncAiProviderConfigToApi: async () => {
      harness.calls.push(["provider-sync"]);
      return true;
    },
    aiTestBlockedReason: () => "",
    currentAiProviderId: () => "remote",
    aiSettingsPayload: () => ({ advancedSettings: { secretRef: "key", modelRef: "model" } }),
    authModeForProvider: (...args) => {
      harness.calls.push(["auth", ...args]);
      return "secret";
    },
    runAiTestChat: async (payload) => {
      harness.calls.push(["test-chat", payload.prompt, payload.authMode, payload.secretRef, payload.modelRef]);
      return { providerId: "remote", modelRef: "model", status: "ok", output: { content: "done" } };
    },
    checkCurrentAiProviderHealth: async () => harness.calls.push(["health"]),
    detectOllamaModels: async () => harness.calls.push(["detect"]),
    startOllamaRuntimeFromUi: async () => harness.calls.push(["start"]),
    stopOllamaRuntimeFromUi: async () => harness.calls.push(["stop"]),
    pullRecommendedOllamaModel: async (...args) => harness.calls.push(["pull", ...args]),
    copyTextToClipboard: async (...args) => harness.calls.push(["copy", ...args]),
    applySettingsAiQuickSetup: async (...args) => harness.calls.push(["quick", ...args]),
    openSettingsAiDialog: (...args) => harness.calls.push(["open-dialog", ...args]),
    closeSettingsAiDialogs: () => harness.calls.push(["close-dialog"])
  });

  await harness.listeners.get("settingsAiRuntimeMode:change")({ target: { value: "local" } });
  await harness.listeners.get("settingsAiHybridToggle:click")({});
  harness.listeners.get("settingsAiUserMode:change")({ target: { value: "Manual" } });
  harness.listeners.get("settingsAiModelPack:change")({ target: { value: "Local Fast" } });
  await harness.listeners.get("settingsAiLocalModel:change")({ target: { value: "qwen" } });
  await harness.listeners.get("settingsAiSecretRef:blur")({ target: { value: "vault-key" } });
  assert.equal(settingsState.ai.testMeta, "");
  assert.equal(settingsState.ai.testOutput, "");
  harness.elements.get("settingsAiTestPrompt").value = "hello";
  await harness.listeners.get("btnAiTestChatRun:click")({});
  await harness.listeners.get("btnAiTestChatCopy:click")({});
  await harness.listeners.get("settingsCardAiSettings:click")({
    target: harness.target({
      "[data-settings-ai-quick-setup]": harness.attrNode({ "data-settings-ai-quick-setup": "starter" })
    })
  });
  await harness.listeners.get("settingsCardAiSettings:click")({
    target: harness.target({
      "[data-settings-ai-dialog-open]": harness.attrNode({ "data-settings-ai-dialog-open": "remote" })
    })
  });
  harness.listeners.get("document:keydown")({ key: "Escape" });

  assert.equal(settingsState.ai.userMode, "Manual");
  assert.equal(settingsState.ai.secretRef, "vault-key");
  assert.equal(settingsState.ai.testRunning, false);
  assert.equal(settingsState.ai.testOutput, "done");
  assert.deepEqual(harness.calls.filter((call) => ["runtime", "pack", "local-model", "provider-sync", "test-chat", "clipboard", "quick", "open-dialog", "close-dialog"].includes(call[0])), [
    ["runtime", "local"],
    ["runtime", "auto"],
    ["pack", "Local Fast", { source: "settings" }],
    ["local-model", "qwen"],
    ["provider-sync"],
    ["test-chat", "hello", "secret", "key", "model"],
    ["clipboard", "done"],
    ["quick", "starter"],
    ["open-dialog", "remote"],
    ["close-dialog"]
  ]);
});

test("settings AI event bindings do not clear successful test when remote field value is unchanged", async () => {
  const harness = createHarness();
  const settingsState = {
    ai: {
      secretRef: "AI_KEY",
      testMeta: "remote / model (ok)",
      testStatus: "success",
      testOutput: "pong"
    }
  };

  installSettingsAiEventBindings({
    $: harness.$,
    settingsState,
    documentRef: harness.documentRef,
    clipboard: harness.clipboard,
    persistAiSettingsToStorage: () => harness.calls.push(["persist"]),
    renderSettingsPanel: () => harness.calls.push(["render"]),
    setStatus: () => {},
    markAiProviderDraftTouched: (...args) => harness.calls.push(["touch", ...args]),
    syncAiProviderConfigToApi: async () => true
  });

  await harness.listeners.get("settingsAiSecretRef:blur")({ target: { value: "AI_KEY" } });

  assert.equal(settingsState.ai.testStatus, "success");
  assert.equal(settingsState.ai.testOutput, "pong");
});

test("settings AI event bindings mark blocked and failed test runs without success status", async () => {
  const blockedHarness = createHarness();
  const blockedState = { ai: { testPrompt: "" } };
  installSettingsAiEventBindings({
    $: blockedHarness.$,
    settingsState: blockedState,
    documentRef: blockedHarness.documentRef,
    clipboard: blockedHarness.clipboard,
    renderSettingsPanel: () => blockedHarness.calls.push(["render"]),
    setStatus: () => {}
  });

  await blockedHarness.listeners.get("btnAiTestChatRun:click")({});
  assert.equal(blockedState.ai.testStatus, "blocked");

  const failedHarness = createHarness();
  const failedState = { ai: { testPrompt: "hello", routePreview: { privacy: { mode: "remote" } } } };
  failedHarness.elements.get("settingsAiTestPrompt").value = "hello";
  installSettingsAiEventBindings({
    $: failedHarness.$,
    settingsState: failedState,
    documentRef: failedHarness.documentRef,
    clipboard: failedHarness.clipboard,
    renderSettingsPanel: () => failedHarness.calls.push(["render"]),
    setStatus: () => {},
    aiTestBlockedReason: () => "",
    currentAiProviderId: () => "remote",
    aiSettingsPayload: () => ({ advancedSettings: {} }),
    authModeForProvider: () => "secret",
    runAiTestChat: async () => {
      throw new Error("timeout");
    }
  });

  await failedHarness.listeners.get("btnAiTestChatRun:click")({});
  assert.equal(failedState.ai.testStatus, "failed");
  assert.equal(failedState.ai.testOutput, "timeout");
});
