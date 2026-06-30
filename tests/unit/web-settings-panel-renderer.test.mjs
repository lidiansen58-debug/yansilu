import test from "node:test";
import assert from "node:assert/strict";
import {
  renderSettingsAiTestPanel,
  renderSettingsFeedbackCard,
  renderSettingsPanelForRuntime,
  syncSettingsAiInputs
} from "../../apps/web/src/settings-panel-renderer.js";

function createElement() {
  const toggles = [];
  const attrs = {};
  return {
    textContent: "",
    innerHTML: "",
    value: "",
    disabled: false,
    href: "",
    toggles,
    attrs,
    classList: {
      toggle: (name, force) => toggles.push([name, force])
    },
    setAttribute: (name, value) => {
      attrs[name] = value;
    },
    removeAttribute: (name) => {
      delete attrs[name];
    }
  };
}

function elementMap() {
  const elements = new Map();
  const get = (id) => {
    if (!elements.has(id)) elements.set(id, createElement());
    return elements.get(id);
  };
  return { get };
}

test("settings panel renderer syncs vault, feedback, inputs, and child renders", () => {
  const { get } = elementMap();
  const calls = [];

  renderSettingsPanelForRuntime({
    $: get,
    document: { nodeType: 9 },
    state: { module: "settings" },
    settingsState: {
      vault: { vaultPath: "E:/Vaults/Main", initialized: true },
      ai: {
        userMode: "Auto",
        modelPack: "Starter Auto",
        advancedModelRef: "openai:gpt-test",
        secretRef: "AI_KEY",
        testPrompt: "ping",
        testMeta: "ready",
        testStatus: "success",
        testOutput: "pong"
      }
    },
    appVersion: "1.2.3",
    feedbackRepository: "owner/repo",
    feedbackRepositoryReady: true,
    syncRailSelectionState: () => calls.push("sync-rail"),
    ensureSettingsWorkbenchLayout: () => calls.push("layout"),
    mountSettingsAutomationWorkspace: () => calls.push("mount-automation"),
    renderSettingsWorkbenchChrome: () => calls.push("chrome"),
    renderSettingsSidebarColumn: () => calls.push("sidebar"),
    renderSettingsDetailFocus: () => calls.push("detail"),
    settingsLeafLabel: (value) => String(value).split("/").at(-1),
    feedbackBaseUrl: () => "https://github.com/owner/repo/issues/new",
    renderUpdateSettingsCard: ({ appVersion }) => calls.push(`update-${appVersion}`),
    renderNoteTemplateSettingsCard: (kind) => calls.push(`template-${kind}`),
    renderAiLocalModelControls: () => calls.push("ai-local"),
    renderAiSettingsExperience: () => calls.push("ai-experience"),
    renderAiProviderConfigControls: () => calls.push("ai-provider"),
    renderAiRoutePreview: () => calls.push("ai-route"),
    renderScheduledTasksWorkspace: () => calls.push("scheduled"),
    renderAiSuggestionsWorkspace: () => calls.push("suggestions"),
    aiTestBlockedReason: () => "",
    renderAiCanonicalDebugPanel: () => calls.push("debug"),
    renderSidebarTitle: () => calls.push("sidebar-title"),
    renderModuleWorkspaceHeader: () => calls.push("module-header")
  });

  assert.equal(get("settingsVaultPath").value, "E:/Vaults/Main");
  assert.equal(get("settingsVaultSwitchHint").textContent, "当前使用：Main · 已就绪");
  assert.equal(get("settingsFeedbackRepoBadge").textContent, "owner/repo");
  assert.equal(get("settingsFeedbackLink").href, "https://github.com/owner/repo/issues/new");
  assert.equal(get("settingsAiAdvancedModelRef").value, "openai:gpt-test");
  assert.equal(get("settingsAiSecretRef").value, "AI_KEY");
  assert.equal(get("settingsAiTestPrompt").value, "ping");
  assert.equal(get("btnAiTestChatRun").textContent, "测试一句话");
  assert.equal(get("settingsAiTestChatMeta").textContent, "测试成功");
  assert.equal(get("settingsAiTestChatOutput").textContent, "pong");
  assert.deepEqual(calls.slice(0, 6), ["sync-rail", "layout", "mount-automation", "chrome", "sidebar", "detail"]);
  assert.ok(calls.includes("sidebar-title"));
  assert.equal(calls.at(-1), "module-header");
});

test("settings feedback card renders unbound repository state", () => {
  const { get } = elementMap();

  renderSettingsFeedbackCard({
    $: get,
    feedbackRepository: "owner/repo",
    feedbackRepositoryReady: false,
    feedbackBaseUrl: () => "https://github.com/owner/repo/issues/new"
  });

  assert.equal(get("settingsFeedbackRepoBadge").textContent, "待绑定仓库");
  assert.deepEqual(get("settingsFeedbackRepoBadge").toggles, [["ok", false], ["warn", true]]);
  assert.equal(get("settingsFeedbackLink").href, "#");
  assert.equal(get("settingsFeedbackLink").attrs["aria-disabled"], "true");
});

test("settings AI input sync preserves current values when already aligned", () => {
  const { get } = elementMap();
  get("settingsAiUserMode").value = "Auto";

  syncSettingsAiInputs({
    $: get,
    settingsState: { ai: { userMode: "Auto", modelPack: "Research", advancedModelRef: "", secretRef: "" } }
  });

  assert.equal(get("settingsAiUserMode").value, "Auto");
  assert.equal(get("settingsAiModelPack").value, "Research");
});

test("settings AI test panel blocks run and shows reason", () => {
  const { get } = elementMap();

  renderSettingsAiTestPanel({
    $: get,
    settingsState: { ai: { testPrompt: "ping", testOutput: "", testRunning: false } },
    aiTestBlockedReason: () => "missing key"
  });

  assert.equal(get("btnAiTestChatRun").disabled, true);
  assert.equal(get("btnAiTestChatRun").textContent, "先完成设置");
  assert.equal(get("btnAiTestChatRun").attrs.title, "missing key");
  assert.equal(get("settingsAiTestChatMeta").textContent, "missing key");
  assert.deepEqual(get("settingsAiTestChatMeta").toggles, [["warn", true]]);
  assert.equal(get("settingsAiTestChatOutput").textContent, "还没有测试结果");
});
