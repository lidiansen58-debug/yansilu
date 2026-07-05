import test from "node:test";
import assert from "node:assert/strict";

import {
  renderModuleWorkspaceHeaderForRuntime
} from "../../apps/web/src/app-shell-module-header.js";

function elementStub() {
  const listeners = new Map();
  const children = new Map();
  return {
    textContent: "",
    innerHTML: "",
    value: "",
    listeners,
    children,
    addEventListener(type, handler) {
      listeners.set(type, handler);
    },
    querySelector(selector) {
      return children.get(selector) || null;
    }
  };
}

function headerElements() {
  return {
    moduleTitle: elementStub(),
    moduleSummary: elementStub(),
    moduleHeaderActions: elementStub()
  };
}

test("module header renders shell-only empty actions for explorer settings graph imports backup ai inbox today and writing", () => {
  for (const [module, expectedTitle, expectedSummary] of [
    ["explorer", "", ""],
    ["settings", "Settings", "Settings summary"],
    ["graph", "", ""],
    ["imports", "Imports", "Import summary"],
    ["backup", "Backup", "Backup summary"],
    ["aiInbox", "AI Inbox", "AI Inbox summary"],
    ["today", "Today", "Today summary"],
    ["writing", "Writing", "Writing summary"]
  ]) {
    const elements = headerElements();
    elements.moduleHeaderActions.innerHTML = "old";
    renderModuleWorkspaceHeaderForRuntime({
      state: { module },
      elements,
      moduleUi: {
        title: expectedTitle || "Imports",
        summary: expectedSummary || "Import summary"
      },
      settingsHeader: { title: "Settings", summary: "Settings summary" }
    });

    assert.equal(elements.moduleTitle.textContent, expectedTitle);
    assert.equal(elements.moduleSummary.textContent, expectedSummary);
    assert.equal(elements.moduleHeaderActions.innerHTML, "");
  }
});

test("module header renders AI route badges and binds module actions", async () => {
  const elements = headerElements();
  const backButton = elementStub();
  const packSelect = elementStub();
  const refreshButton = elementStub();
  elements.moduleHeaderActions.children.set("#moduleBackToNotes", backButton);
  elements.moduleHeaderActions.children.set("#moduleAiModelPack", packSelect);
  elements.moduleHeaderActions.children.set("#moduleAiRefreshRoute", refreshButton);
  const calls = [];

  renderModuleWorkspaceHeaderForRuntime({
    state: { module: "delivery" },
    elements,
    settingsState: {
      ai: {
        modelPack: "Privacy First",
        routePreview: {
          provider: { providerId: "openai" },
          route: { modelRef: "openai:gpt-test", localOnly: false },
          health: { status: "healthy" }
        }
      }
    },
    moduleUi: { title: "Writing", summary: "Write" },
    settingsPackOptionsHtml: "<option value=\"Privacy First\">Privacy First</option>",
    currentAiProviderId: () => "fallback",
    activateModule: (module) => calls.push(["activate", module]),
    applyAiModelPackChange: (next, options) => calls.push(["pack", next, options]),
    refreshAiRoutePreview: async (options) => calls.push(["refresh", options]),
    renderModuleWorkspaceHeader: () => calls.push(["render-header"]),
    renderSettingsPanel: () => calls.push(["render-settings"]),
    setStatus: (message, tone) => calls.push(["status", message, tone]),
    escapeHtml: (value) => String(value ?? "")
  });

  assert.equal(elements.moduleTitle.textContent, "Writing");
  assert.equal(elements.moduleSummary.textContent, "Write");
  assert.match(elements.moduleHeaderActions.innerHTML, /回到笔记/);
  assert.match(elements.moduleHeaderActions.innerHTML, /云端/);
  assert.match(elements.moduleHeaderActions.innerHTML, /已连接/);
  assert.match(elements.moduleHeaderActions.innerHTML, /gpt-test/);
  assert.equal(packSelect.value, "Privacy First");

  backButton.listeners.get("click")();
  packSelect.listeners.get("change")({ target: { value: "Starter Auto" } });
  await refreshButton.listeners.get("click")();

  assert.deepEqual(calls, [
    ["activate", "explorer"],
    ["pack", "Starter Auto", { source: "module" }],
    ["refresh", { render: false }],
    ["render-header"],
    ["render-settings"],
    ["status", "AI 连接信息已刷新", "ok"]
  ]);
});
