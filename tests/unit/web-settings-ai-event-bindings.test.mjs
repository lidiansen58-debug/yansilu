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
    "settingsAiAutoPrepareLocal",
    "settingsAiAdvancedModelRef",
    "settingsAiSecretRef",
    "settingsAiRemoteRuntimeModel",
    "settingsAiProviderEndpointUrl",
    "settingsAiTestPrompt",
    "settingsAiTestChatMeta",
    "settingsAiTestChatOutput",
    "btnAiTestChatRun",
    "settingsAiProviderHealthEndpointUrl",
    "settingsAiSaveProviderConfig",
    "settingsAiCheckProviderHealth",
    "settingsAiRemoteHelp",
    "settingsAiRemoteHelpToggle",
    "settingsAiDetectOllama",
    "settingsAiRuntimeToggle",
    "settingsAiPullOllamaModel",
    "settingsAiCopyOllamaInstallCommand",
    "settingsAiTopAction",
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
    applySettingsAiQuickSetup: async (...args) => harness.calls.push(["quick", ...args]),
    openSettingsAiDialog: (...args) => harness.calls.push(["open-dialog", ...args]),
    closeSettingsAiDialogs: () => harness.calls.push(["close-dialog"])
  });

  await harness.listeners.get("settingsAiRuntimeMode:change")({ target: { value: "local" } });
  await harness.listeners.get("settingsAiHybridToggle:click")({});
  harness.listeners.get("settingsAiUserMode:change")({ target: { value: "Manual" } });
  harness.listeners.get("settingsAiModelPack:change")({ target: { value: "Local Fast" } });
  await harness.listeners.get("settingsAiLocalModel:change")({ target: { value: "qwen" } });
  harness.listeners.get("settingsAiAutoPrepareLocal:change")({ target: { checked: true } });
  await harness.listeners.get("settingsAiSecretRef:blur")({ target: { value: "vault-key" } });
  assert.equal(settingsState.ai.testMeta, "");
  assert.equal(settingsState.ai.testOutput, "");
  harness.elements.get("settingsAiTestPrompt").value = "hello";
  await harness.listeners.get("btnAiTestChatRun:click")({});
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
  assert.equal(settingsState.ai.autoPrepareLocalAi, true);
  assert.equal(settingsState.ai.remoteApiKey, "vault-key");
  assert.equal(settingsState.ai.secretRef, "local:settings-remote-api-key");
  assert.equal(settingsState.ai.testRunning, false);
  assert.equal(settingsState.ai.testOutput, "done");
  assert.equal(settingsState.ai.testModel, "");
  assert.deepEqual(harness.calls.filter((call) => ["runtime", "pack", "local-model", "provider-sync", "test-chat", "quick", "open-dialog", "close-dialog"].includes(call[0])), [
    ["runtime", "local"],
    ["runtime", "auto"],
    ["pack", "Local Fast", { source: "settings" }],
    ["local-model", "qwen"],
    ["test-chat", "hello", "secret", "key", "model"],
    ["quick", "starter"],
    ["open-dialog", "remote"],
    ["close-dialog"]
  ]);
});

test("settings AI event bindings do not clear successful test when remote field value is unchanged", async () => {
  const harness = createHarness();
  const settingsState = {
    ai: {
      remoteApiKey: "AI_KEY",
      secretRef: "local:settings-remote-api-key",
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
    syncAiProviderConfigToApi: async () => harness.calls.push(["provider-sync"])
  });

  await harness.listeners.get("settingsAiSecretRef:blur")({ target: { value: "AI_KEY" } });

  assert.equal(settingsState.ai.testStatus, "success");
  assert.equal(settingsState.ai.testOutput, "pong");
  assert.ok(!harness.calls.some((call) => call[0] === "provider-sync"));
});

test("settings AI remote field blur only stores drafts until explicit tested save", async () => {
  const harness = createHarness();
  const settingsState = {
    ai: {
      providerEndpointUrl: "",
      remoteRuntimeModel: "",
      secretRef: "",
      remoteApiKey: "",
      providerDraftTouched: {},
      testStatus: ""
    }
  };

  installSettingsAiEventBindings({
    $: harness.$,
    settingsState,
    documentRef: harness.documentRef,
    clipboard: harness.clipboard,
    persistAiSettingsToStorage: () => harness.calls.push(["persist"]),
    renderSettingsPanel: () => harness.calls.push(["render"]),
    setStatus: (...args) => harness.calls.push(["status", ...args]),
    markAiProviderDraftTouched: (...args) => harness.calls.push(["touch", ...args]),
    syncAiProviderConfigToApi: async () => harness.calls.push(["provider-sync"])
  });

  await harness.listeners.get("settingsAiSecretRef:blur")({ target: { value: "sk-test-key" } });
  await harness.listeners.get("settingsAiRemoteRuntimeModel:blur")({ target: { value: "gpt-4.1-mini" } });
  await harness.listeners.get("settingsAiProviderEndpointUrl:blur")({ target: { value: "https://api.example.com/v1/chat/completions" } });

  assert.equal(settingsState.ai.remoteApiKey, "sk-test-key");
  assert.equal(settingsState.ai.secretRef, "local:settings-remote-api-key");
  assert.equal(settingsState.ai.remoteRuntimeModel, "gpt-4.1-mini");
  assert.equal(settingsState.ai.providerEndpointUrl, "https://api.example.com/v1");
  assert.ok(!harness.calls.some((call) => call[0] === "provider-sync"));
  assert.ok(harness.calls.some((call) => call[0] === "status" && /测试连接后再保存远程设置/.test(call[1])));
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
  const failedState = {
    ai: {
      testPrompt: "hello",
      providerEndpointUrl: "https://api.example/v1",
      remoteRuntimeModel: "gpt-test",
      secretRef: "local:key",
      routePreview: { privacy: { mode: "remote" } }
    }
  };
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
  assert.equal(failedState.ai.testProviderId, "remote");
  assert.equal(failedState.ai.testEndpointUrl, "https://api.example/v1");
  assert.equal(failedState.ai.testRemoteModel, "gpt-test");
  assert.equal(failedState.ai.testSecretRef, "local:key");
});

test("settings AI event bindings require remote test and privacy confirmation before saving", async () => {
  const untestedHarness = createHarness();
  const untestedState = {
    ai: {
      providerEndpointUrl: "https://api.example/v1/chat/completions",
      remoteRuntimeModel: "gpt-test",
      secretRef: "sk-test",
      providerHealthResult: null,
      testStatus: ""
    }
  };
  installSettingsAiEventBindings({
    $: untestedHarness.$,
    settingsState: untestedState,
    documentRef: untestedHarness.documentRef,
    clipboard: untestedHarness.clipboard,
    setStatus: (...args) => untestedHarness.calls.push(["status", ...args]),
    currentAiProviderId: () => "openai_compatible_gateway",
    syncAiProviderConfigToApi: async () => untestedHarness.calls.push(["provider-sync"]),
    openSettingsAiDialog: (...args) => untestedHarness.calls.push(["open-dialog", ...args])
  });

  await untestedHarness.listeners.get("settingsAiSaveProviderConfig:click")({});

  assert.deepEqual(untestedHarness.calls.filter((call) => ["open-dialog", "provider-sync"].includes(call[0])), [
    ["open-dialog", "test"]
  ]);

  const testedHarness = createHarness();
  const testedState = {
    ai: {
      providerEndpointUrl: "https://api.example/v1/chat/completions",
      remoteRuntimeModel: "gpt-test",
      secretRef: "sk-test",
      providerHealthResult: { record: { status: "healthy" } },
      providerHealthProviderId: "openai_compatible_gateway",
      providerHealthEndpointUrlSnapshot: "https://api.example/v1/chat/completions",
      providerHealthCheckEndpointUrlSnapshot: "",
      providerHealthRemoteModel: "gpt-test",
      providerHealthSecretRef: "sk-test",
      testStatus: ""
    }
  };
  installSettingsAiEventBindings({
    $: testedHarness.$,
    settingsState: testedState,
    documentRef: testedHarness.documentRef,
    clipboard: testedHarness.clipboard,
    setStatus: (...args) => testedHarness.calls.push(["status", ...args]),
    currentAiProviderId: () => "openai_compatible_gateway",
    syncAiProviderConfigToApi: async () => testedHarness.calls.push(["provider-sync"]),
    confirmRemoteAiUse: () => {
      testedHarness.calls.push(["confirm-remote"]);
      return true;
    }
  });

  await testedHarness.listeners.get("settingsAiSaveProviderConfig:click")({});

  assert.deepEqual(testedHarness.calls.filter((call) => ["confirm-remote", "provider-sync"].includes(call[0])), [
    ["confirm-remote"],
    ["provider-sync"]
  ]);

  const failedHarness = createHarness();
  const failedState = {
    ai: {
      providerEndpointUrl: "https://api.example/v1/chat/completions",
      remoteRuntimeModel: "gpt-test",
      secretRef: "sk-test",
      providerHealthResult: { record: { status: "healthy" } },
      providerHealthProviderId: "openai_compatible_gateway",
      providerHealthEndpointUrlSnapshot: "https://api.example/v1/chat/completions",
      providerHealthCheckEndpointUrlSnapshot: "",
      providerHealthRemoteModel: "gpt-test",
      providerHealthSecretRef: "sk-test",
      testStatus: "failed",
      testProviderId: "openai_compatible_gateway",
      testEndpointUrl: "https://api.example/v1/chat/completions",
      testRemoteModel: "gpt-test",
      testSecretRef: "sk-test"
    }
  };
  installSettingsAiEventBindings({
    $: failedHarness.$,
    settingsState: failedState,
    documentRef: failedHarness.documentRef,
    clipboard: failedHarness.clipboard,
    setStatus: (...args) => failedHarness.calls.push(["status", ...args]),
    currentAiProviderId: () => "openai_compatible_gateway",
    syncAiProviderConfigToApi: async () => failedHarness.calls.push(["provider-sync"]),
    openSettingsAiDialog: (...args) => failedHarness.calls.push(["open-dialog", ...args])
  });

  await failedHarness.listeners.get("settingsAiSaveProviderConfig:click")({});

  assert.deepEqual(failedHarness.calls.filter((call) => ["open-dialog", "provider-sync"].includes(call[0])), [
    ["open-dialog", "test"]
  ]);

  const recoveredHarness = createHarness();
  const recoveredState = {
    ai: {
      providerEndpointUrl: "https://api.example/v1/chat/completions",
      remoteRuntimeModel: "gpt-test",
      secretRef: "sk-test",
      providerHealthResult: { record: { status: "healthy" } },
      providerHealthProviderId: "openai_compatible_gateway",
      providerHealthEndpointUrlSnapshot: "https://api.example/v1/chat/completions",
      providerHealthCheckEndpointUrlSnapshot: "",
      providerHealthRemoteModel: "gpt-test",
      providerHealthSecretRef: "sk-test",
      testStatus: ""
    }
  };
  installSettingsAiEventBindings({
    $: recoveredHarness.$,
    settingsState: recoveredState,
    documentRef: recoveredHarness.documentRef,
    clipboard: recoveredHarness.clipboard,
    setStatus: (...args) => recoveredHarness.calls.push(["status", ...args]),
    currentAiProviderId: () => "openai_compatible_gateway",
    syncAiProviderConfigToApi: async () => recoveredHarness.calls.push(["provider-sync"]),
    confirmRemoteAiUse: () => true
  });

  await recoveredHarness.listeners.get("settingsAiSaveProviderConfig:click")({});

  assert.deepEqual(recoveredHarness.calls.filter((call) => call[0] === "provider-sync"), [
    ["provider-sync"]
  ]);
});

test("settings AI event bindings only resumes remote contextual actions after save", async () => {
  const remoteTestHarness = createHarness();
  const remoteTestState = {
    ai: {
      providerEndpointUrl: "https://api.example/v1",
      remoteRuntimeModel: "gpt-test",
      secretRef: "local:key",
      testPrompt: "hello",
      routePreview: { privacy: { mode: "remote" } }
    }
  };
  remoteTestHarness.elements.get("settingsAiTestPrompt").value = "hello";
  installSettingsAiEventBindings({
    $: remoteTestHarness.$,
    settingsState: remoteTestState,
    documentRef: remoteTestHarness.documentRef,
    renderSettingsPanel: () => remoteTestHarness.calls.push(["render"]),
    setStatus: () => {},
    aiTestBlockedReason: () => "",
    currentAiProviderId: () => "remote",
    aiSettingsPayload: () => ({ advancedSettings: {} }),
    authModeForProvider: () => "secret",
    runAiTestChat: async () => ({ providerId: "remote", modelRef: "m", status: "ok", output: { content: "ok" } }),
    onAiSettingsReady: async (payload) => remoteTestHarness.calls.push(["ready", payload.source])
  });

  await remoteTestHarness.listeners.get("btnAiTestChatRun:click")({});

  const localTestHarness = createHarness();
  const localTestState = { ai: { localModel: "qwen3:8b", testPrompt: "hello", routePreview: { privacy: { mode: "local" } } } };
  localTestHarness.elements.get("settingsAiTestPrompt").value = "hello";
  installSettingsAiEventBindings({
    $: localTestHarness.$,
    settingsState: localTestState,
    documentRef: localTestHarness.documentRef,
    renderSettingsPanel: () => localTestHarness.calls.push(["render"]),
    setStatus: () => {},
    aiTestBlockedReason: () => "",
    currentAiProviderId: () => "ollama_local_gateway",
    aiSettingsPayload: () => ({ advancedSettings: {} }),
    authModeForProvider: () => "none",
    runAiTestChat: async () => ({ providerId: "ollama_local_gateway", modelRef: "local", status: "ok", output: { content: "ok" } }),
    onAiSettingsReady: async (payload) => localTestHarness.calls.push(["ready", payload.source])
  });

  await localTestHarness.listeners.get("btnAiTestChatRun:click")({});

  assert.equal(remoteTestState.ai.testModel, "");
  assert.equal(remoteTestState.ai.testProviderId, "remote");
  assert.equal(remoteTestState.ai.testEndpointUrl, "https://api.example/v1");
  assert.equal(remoteTestState.ai.testRemoteModel, "gpt-test");
  assert.equal(remoteTestState.ai.testSecretRef, "local:key");
  assert.equal(localTestState.ai.testModel, "qwen3:8b");

  const saveHarness = createHarness();
  const saveState = {
    ai: {
      providerEndpointUrl: "https://api.example/v1/chat/completions",
      remoteRuntimeModel: "gpt-test",
      secretRef: "sk-test",
      providerHealthResult: { record: { status: "healthy" } },
      providerHealthProviderId: "openai_compatible_gateway",
      providerHealthEndpointUrlSnapshot: "https://api.example/v1/chat/completions",
      providerHealthCheckEndpointUrlSnapshot: "",
      providerHealthRemoteModel: "gpt-test",
      providerHealthSecretRef: "sk-test",
      testStatus: ""
    }
  };
  installSettingsAiEventBindings({
    $: saveHarness.$,
    settingsState: saveState,
    documentRef: saveHarness.documentRef,
    setStatus: () => {},
    currentAiProviderId: () => "openai_compatible_gateway",
    syncAiProviderConfigToApi: async () => true,
    confirmRemoteAiUse: () => true,
    onAiSettingsReady: async (payload) => saveHarness.calls.push(["ready", payload.source])
  });

  await saveHarness.listeners.get("settingsAiSaveProviderConfig:click")({});

  assert.deepEqual(remoteTestHarness.calls.filter((call) => call[0] === "ready"), []);
  assert.deepEqual(localTestHarness.calls.filter((call) => call[0] === "ready"), [["ready", "test"]]);
  assert.deepEqual(saveHarness.calls.filter((call) => call[0] === "ready"), [["ready", "save"]]);
});

test("settings AI event bindings do not save remote config using a stale local test", async () => {
  const harness = createHarness();
  const settingsState = {
    ai: {
      providerEndpointUrl: "https://api.example/v1/chat/completions",
      remoteRuntimeModel: "gpt-test",
      secretRef: "sk-test",
      providerHealthResult: null,
      testStatus: "success",
      testModel: "qwen3:8b"
    }
  };

  installSettingsAiEventBindings({
    $: harness.$,
    settingsState,
    documentRef: harness.documentRef,
    clipboard: harness.clipboard,
    setStatus: (...args) => harness.calls.push(["status", ...args]),
    currentAiProviderId: () => "openai_compatible_gateway",
    syncAiProviderConfigToApi: async () => harness.calls.push(["provider-sync"]),
    openSettingsAiDialog: (...args) => harness.calls.push(["open-dialog", ...args]),
    confirmRemoteAiUse: () => {
      harness.calls.push(["confirm-remote"]);
      return true;
    }
  });

  await harness.listeners.get("settingsAiSaveProviderConfig:click")({});

  assert.deepEqual(harness.calls.filter((call) => ["open-dialog", "confirm-remote", "provider-sync"].includes(call[0])), [
    ["open-dialog", "test"]
  ]);
});

test("settings AI event bindings do not save remote config using stale health result", async () => {
  const harness = createHarness();
  const settingsState = {
    ai: {
      providerEndpointUrl: "https://api.example/v1",
      remoteRuntimeModel: "gpt-test",
      secretRef: "local:key",
      providerHealthResult: { record: { status: "healthy" } },
      providerHealthProviderId: "openai_compatible_gateway",
      providerHealthEndpointUrlSnapshot: "https://old.example/v1",
      providerHealthCheckEndpointUrlSnapshot: "",
      providerHealthRemoteModel: "gpt-test",
      providerHealthSecretRef: "local:key",
      testStatus: ""
    }
  };

  installSettingsAiEventBindings({
    $: harness.$,
    settingsState,
    documentRef: harness.documentRef,
    clipboard: harness.clipboard,
    setStatus: (...args) => harness.calls.push(["status", ...args]),
    currentAiProviderId: () => "openai_compatible_gateway",
    syncAiProviderConfigToApi: async () => harness.calls.push(["provider-sync"]),
    openSettingsAiDialog: (...args) => harness.calls.push(["open-dialog", ...args]),
    confirmRemoteAiUse: () => {
      harness.calls.push(["confirm-remote"]);
      return true;
    }
  });

  await harness.listeners.get("settingsAiSaveProviderConfig:click")({});

  assert.deepEqual(harness.calls.filter((call) => ["open-dialog", "confirm-remote", "provider-sync"].includes(call[0])), [
    ["open-dialog", "test"]
  ]);
});

test("settings AI event bindings save remote config after the current config was tested", async () => {
  const harness = createHarness();
  const settingsState = {
    ai: {
      providerEndpointUrl: "https://api.example/v1",
      remoteRuntimeModel: "gpt-test",
      secretRef: "local:key",
      providerHealthResult: null,
      testStatus: "success",
      testProviderId: "openai_compatible_gateway",
      testEndpointUrl: "https://api.example/v1",
      testRemoteModel: "gpt-test",
      testSecretRef: "local:key"
    }
  };

  installSettingsAiEventBindings({
    $: harness.$,
    settingsState,
    documentRef: harness.documentRef,
    clipboard: harness.clipboard,
    setStatus: (...args) => harness.calls.push(["status", ...args]),
    currentAiProviderId: () => "openai_compatible_gateway",
    syncAiProviderConfigToApi: async () => {
      harness.calls.push(["provider-sync"]);
      return true;
    },
    confirmRemoteAiUse: () => {
      harness.calls.push(["confirm-remote"]);
      return true;
    },
    onAiSettingsReady: async (payload) => harness.calls.push(["ready", payload.source])
  });

  await harness.listeners.get("settingsAiSaveProviderConfig:click")({});

  assert.deepEqual(harness.calls.filter((call) => ["confirm-remote", "provider-sync", "ready"].includes(call[0])), [
    ["confirm-remote"],
    ["provider-sync"],
    ["ready", "save"]
  ]);
});

test("settings AI event bindings treats platform online AI as remote for resume and confirmation", async () => {
  const testHarness = createHarness();
  const testState = { ai: { testPrompt: "hello", routePreview: { privacy: { mode: "remote" } } } };
  testHarness.elements.get("settingsAiTestPrompt").value = "hello";
  installSettingsAiEventBindings({
    $: testHarness.$,
    settingsState: testState,
    documentRef: testHarness.documentRef,
    renderSettingsPanel: () => testHarness.calls.push(["render"]),
    setStatus: () => {},
    aiTestBlockedReason: () => "",
    currentAiProviderId: () => "platform_managed_openai",
    aiSettingsPayload: () => ({ advancedSettings: {} }),
    authModeForProvider: () => "platform",
    runAiTestChat: async () => ({ providerId: "platform_managed_openai", modelRef: "m", status: "ok", output: { content: "ok" } }),
    onAiSettingsReady: async (payload) => testHarness.calls.push(["ready", payload.source])
  });

  await testHarness.listeners.get("btnAiTestChatRun:click")({});

  const saveHarness = createHarness();
  const saveState = {
    ai: {
      providerHealthResult: { record: { status: "healthy" } },
      providerHealthProviderId: "platform_managed_openai",
      providerHealthEndpointUrlSnapshot: "",
      providerHealthCheckEndpointUrlSnapshot: "",
      providerHealthRemoteModel: "",
      providerHealthSecretRef: "",
      testStatus: ""
    }
  };
  installSettingsAiEventBindings({
    $: saveHarness.$,
    settingsState: saveState,
    documentRef: saveHarness.documentRef,
    setStatus: () => {},
    currentAiProviderId: () => "platform_managed_openai",
    syncAiProviderConfigToApi: async () => {
      saveHarness.calls.push(["provider-sync"]);
      return true;
    },
    confirmRemoteAiUse: () => {
      saveHarness.calls.push(["confirm-remote"]);
      return true;
    },
    onAiSettingsReady: async (payload) => saveHarness.calls.push(["ready", payload.source])
  });

  await saveHarness.listeners.get("settingsAiSaveProviderConfig:click")({});

  assert.deepEqual(testHarness.calls.filter((call) => call[0] === "ready"), []);
  assert.deepEqual(saveHarness.calls.filter((call) => ["confirm-remote", "provider-sync", "ready"].includes(call[0])), [
    ["confirm-remote"],
    ["provider-sync"],
    ["ready", "save"]
  ]);
});

test("settings AI event bindings save a cleared remote API key without requiring a remote test", async () => {
  const harness = createHarness();
  const settingsState = {
    ai: {
      providerEndpointUrl: "https://api.example/v1/chat/completions",
      remoteRuntimeModel: "gpt-test",
      remoteApiKey: "",
      providerDraftTouched: { secretRef: true },
      providerHealthResult: null,
      testStatus: ""
    }
  };

  installSettingsAiEventBindings({
    $: harness.$,
    settingsState,
    documentRef: harness.documentRef,
    clipboard: harness.clipboard,
    setStatus: (...args) => harness.calls.push(["status", ...args]),
    currentAiProviderId: () => "openai_compatible_gateway",
    syncAiProviderConfigToApi: async () => harness.calls.push(["provider-sync"]),
    openSettingsAiDialog: (...args) => harness.calls.push(["open-dialog", ...args]),
    confirmRemoteAiUse: () => {
      harness.calls.push(["confirm-remote"]);
      return true;
    }
  });

  await harness.listeners.get("settingsAiSaveProviderConfig:click")({});

  assert.deepEqual(harness.calls.filter((call) => ["open-dialog", "confirm-remote", "provider-sync"].includes(call[0])), [
    ["provider-sync"]
  ]);
});

test("settings AI event bindings routes first-screen action buttons to existing setup actions", async () => {
  const harness = createHarness();
  const settingsState = { ai: {} };

  installSettingsAiEventBindings({
    $: harness.$,
    settingsState,
    documentRef: harness.documentRef,
    clipboard: harness.clipboard,
    setStatus: (...args) => harness.calls.push(["status", ...args]),
    applyAiRuntimeModeChange: async (...args) => harness.calls.push(["runtime", ...args]),
    applySettingsAiQuickSetup: async (...args) => harness.calls.push(["quick", ...args]),
    selectInstalledLocalModelFromUi: async (...args) => harness.calls.push(["select-local", ...args]),
    detectOllamaModels: async () => harness.calls.push(["detect"]),
    startOllamaRuntimeFromUi: async () => harness.calls.push(["start"]),
    pullRecommendedOllamaModel: async () => harness.calls.push(["pull"]),
    openSettingsAiDialog: (...args) => harness.calls.push(["open-dialog", ...args]),
    onAiSettingsReady: async (payload) => {
      harness.calls.push(["ready", payload.source]);
      return payload.source === "local-model";
    }
  });
  settingsState.ai.localModel = "qwen";

  await harness.listeners.get("settingsCardAiSettings:click")({
    target: harness.target({
      "[data-settings-ai-primary-action]": harness.attrNode({ "data-settings-ai-primary-action": "start-local" })
    })
  });
  await harness.listeners.get("settingsCardAiSettings:click")({
    target: harness.target({
      "[data-settings-ai-primary-action]": harness.attrNode({ "data-settings-ai-primary-action": "download-local-model" })
    })
  });
  await harness.listeners.get("settingsCardAiSettings:click")({
    target: harness.target({
      "[data-settings-ai-primary-action]": harness.attrNode({ "data-settings-ai-primary-action": "test-remote" })
    })
  });
  await harness.listeners.get("settingsCardAiSettings:click")({
    target: harness.target({
      "[data-settings-ai-primary-action]": harness.attrNode({ "data-settings-ai-primary-action": "off" })
    })
  });
  await harness.listeners.get("settingsCardAiSettings:click")({
    target: harness.target({
      "[data-settings-ai-primary-action]": harness.attrNode({ "data-settings-ai-primary-action": "choose-local-model" })
    })
  });

  assert.deepEqual(harness.calls.filter((call) => ["start", "pull", "open-dialog", "runtime", "ready", "select-local"].includes(call[0])), [
    ["start"],
    ["ready", "local-start"],
    ["pull"],
    ["ready", "local-model"],
    ["open-dialog", "test"],
    ["runtime", "off"],
    ["select-local", "qwen"],
    ["ready", "local-model"]
  ]);
});

test("settings AI event bindings resumes pending AI action from local setup controls", async () => {
  const harness = createHarness();
  const settingsState = { ai: { localRuntimeStatus: "stopped" } };

  installSettingsAiEventBindings({
    $: harness.$,
    settingsState,
    documentRef: harness.documentRef,
    clipboard: harness.clipboard,
    detectOllamaModels: async () => harness.calls.push(["detect"]),
    startOllamaRuntimeFromUi: async () => harness.calls.push(["start"]),
    stopOllamaRuntimeFromUi: async () => harness.calls.push(["stop"]),
    pullRecommendedOllamaModel: async (...args) => harness.calls.push(["pull", ...args]),
    selectInstalledLocalModelFromUi: async (...args) => harness.calls.push(["select-local", ...args]),
    onAiSettingsReady: async (payload) => harness.calls.push(["ready", payload.source])
  });

  await harness.listeners.get("settingsAiDetectOllama:click")({});
  await harness.listeners.get("settingsAiRuntimeToggle:click")({});
  await harness.listeners.get("settingsAiPullOllamaModel:click")({});
  await harness.listeners.get("settingsCardAiSettings:click")({
    target: harness.target({
      "[data-settings-ai-select-local-model]": harness.attrNode({ "data-settings-ai-select-local-model": "qwen" })
    })
  });
  await harness.listeners.get("settingsCardAiSettings:click")({
    target: harness.target({
      "[data-settings-ai-detect-ollama]": harness.attrNode({ "data-settings-ai-detect-ollama": "true" })
    })
  });
  await harness.listeners.get("settingsCardAiSettings:click")({
    target: harness.target({
      "[data-settings-ai-pull-local-model]": harness.attrNode({ "data-settings-ai-pull-local-model": "qwen" })
    })
  });

  assert.deepEqual(harness.calls.filter((call) => ["detect", "start", "pull", "select-local", "ready"].includes(call[0])), [
    ["detect"],
    ["ready", "local-detect"],
    ["start"],
    ["ready", "local-start"],
    ["pull"],
    ["ready", "local-model"],
    ["select-local", "qwen"],
    ["ready", "local-model"],
    ["detect"],
    ["ready", "local-detect"],
    ["pull", "qwen"],
    ["ready", "local-model"]
  ]);
});

test("settings AI event bindings does not resume pending AI action when stopping local model", async () => {
  const harness = createHarness();
  const settingsState = { ai: { localRuntimeStatus: "available" } };

  installSettingsAiEventBindings({
    $: harness.$,
    settingsState,
    documentRef: harness.documentRef,
    clipboard: harness.clipboard,
    stopOllamaRuntimeFromUi: async () => harness.calls.push(["stop"]),
    onAiSettingsReady: async (payload) => harness.calls.push(["ready", payload.source])
  });

  await harness.listeners.get("settingsAiRuntimeToggle:click")({});

  assert.deepEqual(harness.calls.filter((call) => ["stop", "ready"].includes(call[0])), [
    ["stop"]
  ]);
});
