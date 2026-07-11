import test from "node:test";
import assert from "node:assert/strict";
import {
  renderSettingsDetailFocusForRuntime,
  renderSettingsSidebarColumnForRuntime,
  renderSettingsWorkbenchChromeForRuntime
} from "../../apps/web/src/settings-panel-shell.js";

function createElement() {
  const toggles = [];
  const removed = [];
  const attrs = {};
  return {
    textContent: "",
    innerHTML: "",
    value: "",
    toggles,
    removed,
    attrs,
    classList: {
      toggle: (name, force) => toggles.push([name, force]),
      remove: (name) => removed.push(name)
    },
    setAttribute: (name, value) => {
      attrs[name] = value;
    },
    querySelector(selector) {
      return this.children?.[selector] || null;
    }
  };
}

test("settings panel shell toggles active section and updates overview metrics", () => {
  const elements = new Map();
  const get = (id) => {
    if (!elements.has(id)) elements.set(id, createElement());
    return elements.get(id);
  };
  const labels = [createElement(), createElement(), createElement()];
  const document = {
    querySelector(selector) {
      if (selector === "#settingsPanel .settings-overview-kicker") return get("kicker");
      if (selector === "#settingsPanel .settings-overview-title") return get("title");
      if (selector === "#settingsPanel .settings-overview-body") return get("body");
      return null;
    },
    querySelectorAll(selector) {
      return selector === "#settingsPanel .settings-overview-label" ? labels : [];
    }
  };

  renderSettingsWorkbenchChromeForRuntime({
    $: get,
    document,
    settingsState: {
      activeSection: "ai",
      activeItem: "ai-settings",
      vault: { vaultPath: "E:/Vaults/Main", initialized: true, defaultVaultPath: "E:/Vaults" },
      ai: { suggestionsTotal: 3, scheduledTasksTotal: 2 }
    },
    settingsSectionChromeMap: () => ({ ai: { badge: "AI", meta: "本地模型" } }),
    settingsAiOverviewSummary: () => ({ value: "本地优先", meta: "已连接" }),
    settingsMobileItemOptionsHtml: () => "<option value=\"ai-settings\">AI 设置</option>",
    settingsLeafLabel: (value) => String(value).split("/").at(-1),
    formatSettingsUserError: () => ""
  });

  assert.deepEqual(get("settingsPaneAi").toggles.at(-1), ["hidden", false]);
  assert.deepEqual(get("settingsNavAi").toggles.at(-1), ["is-active", true]);
  assert.equal(get("settingsNavAi").attrs["aria-pressed"], "true");
  assert.equal(get("settingsMapStatusValue").textContent, "AI 设置");
  assert.equal(get("settingsMobileItemSelect").value, "ai-settings");
  assert.equal(get("settingsOverviewWorkspaceName").textContent, "Main");
  assert.equal(get("settingsOverviewAiRoute").textContent, "本地优先");
  assert.equal(get("settingsOverviewAutomation").textContent, "5 个待看项");
  assert.equal(labels[0].textContent, "工作区");
});

test("settings panel shell renders sidebar focus and escapes checklist notes", () => {
  const elements = new Map();
  const get = (id) => {
    if (!elements.has(id)) elements.set(id, createElement());
    return elements.get(id);
  };
  const navCardNote = createElement();
  const document = {
    querySelector(selector) {
      if (selector !== "#settingsSectionNav") return null;
      return {
        closest: () => ({
          querySelector: () => navCardNote
        })
      };
    }
  };

  renderSettingsSidebarColumnForRuntime({
    $: get,
    document,
    settingsState: { activeSection: "ai", activeItem: "ai-settings" },
    settingsSectionChromeMap: () => ({ ai: { badge: "AI" } }),
    settingsSectionGuidanceMap: () => ({ ai: { focus: "先确认 AI 路线。", notes: ["<本地>", "远程"] } }),
    escapeHtml: (value) => String(value).replace(/</g, "&lt;").replace(/>/g, "&gt;")
  });

  assert.deepEqual(get("settingsNavEntryCard").removed, ["hidden"]);
  assert.equal(get("settingsSidebarFocusPill").textContent, "AI 设置 · AI");
  assert.equal(get("settingsSidebarFocusBody").textContent, "先确认 AI 路线。");
  assert.equal(get("settingsSidebarChecklist").innerHTML, "<li>&lt;本地&gt;</li><li>远程</li>");
  assert.equal(navCardNote.textContent, "按工作区、模板、AI、自动处理和帮助分类。");
});

test("settings panel shell focuses the selected detail cards", () => {
  const elements = new Map();
  const get = (id) => {
    if (!elements.has(id)) elements.set(id, createElement());
    return elements.get(id);
  };
  const paneTitle = createElement();
  const paneNote = createElement();
  get("settingsPaneSupport").children = {
    ".settings-pane-title": paneTitle,
    ".settings-pane-note": paneNote
  };

  renderSettingsDetailFocusForRuntime({
    $: get,
    settingsState: { activeItem: "feedback" }
  });

  assert.deepEqual(get("settingsFeedbackCard").toggles.at(-1), ["hidden", false]);
  assert.deepEqual(get("settingsCardAiSettings").toggles.at(-1), ["hidden", true]);
  assert.equal(paneTitle.textContent, "问题反馈");
  assert.match(paneNote.textContent, /反馈/);
});
