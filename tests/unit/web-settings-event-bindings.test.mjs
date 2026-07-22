import test from "node:test";
import assert from "node:assert/strict";
import {
  describeSettingsDemoImportError,
  installSettingsEventBindings
} from "../../apps/web/src/settings-event-bindings.js";

function createHarness() {
  const listeners = new Map();
  const elements = new Map();
  const calls = [];

  function element(id, extra = {}) {
    const node = {
      id,
      value: "",
      checked: false,
      dataset: {},
      addEventListener(type, handler) {
        listeners.set(`${id}:${type}`, handler);
      },
      ...extra
    };
    elements.set(id, node);
    return node;
  }

  function target(matches = {}, extra = {}) {
    return {
      closest(selector) {
        return matches[selector] || null;
      },
      ...extra
    };
  }

  function attrNode(attrs = {}) {
    return {
      getAttribute(name) {
        return attrs[name] || "";
      },
      setAttribute(name, value) {
        attrs[name] = value;
      },
      removeAttribute(name) {
        delete attrs[name];
      },
      ...attrs
    };
  }

  const ids = [
    "settingsRefreshVault",
    "settingsSectionNav",
    "settingsMobileItemSelect",
    "settingsCheckUpdate",
    "settingsOpenUpdateDownload",
    "settingsInstallUpdate",
    "settingsRelaunchUpdate",
    "settingsRemindUpdateLater",
    "settingsIgnoreUpdateVersion",
    "settingsAutoUpdateEnabled",
    "moduleSidebar",
    "settingsBrowseVault",
    "settingsSwitchVault",
    "settingsVaultPath",
    "settingsPreviewPermanentTemplate",
    "settingsPreviewLiteratureTemplate",
    "settingsSavePermanentTemplate",
    "settingsResetPermanentTemplate",
    "settingsSaveLiteratureTemplate",
    "settingsResetLiteratureTemplate",
    "settingsPermanentTemplateEditor",
    "settingsLiteratureTemplateEditor",
    "settingsTemplatePreviewClose",
    "settingsTemplatePreviewModal",
    "settingsPaneAutomationBody",
    "settingsPaneSupport",
    "settingsImportSmartNotesDemoStatus"
  ];
  ids.forEach((id) => element(id));

  return {
    calls,
    listeners,
    elements,
    $: (id) => elements.get(id) || null,
    target,
    attrNode
  };
}

test("settings event bindings route section, item, and template actions", () => {
  const harness = createHarness();
  installSettingsEventBindings({
    $: harness.$,
    state: { module: "settings" },
    settingsState: { ai: {}, update: {} },
    setSettingsSection: (...args) => harness.calls.push(["section", ...args]),
    setSettingsItem: (...args) => harness.calls.push(["item", ...args]),
    activateModule: (...args) => harness.calls.push(["module", ...args]),
    openNoteTemplatePreview: (...args) => harness.calls.push(["preview", ...args]),
    saveNoteTemplateFromEditor: (...args) => harness.calls.push(["save-template", ...args]),
    resetNoteTemplateToDefault: (...args) => harness.calls.push(["reset-template", ...args]),
    updateNoteTemplatePreviewFromEditor: (...args) => harness.calls.push(["update-template", ...args]),
    closeNoteTemplatePreview: () => harness.calls.push(["close-template"])
  });

  harness.listeners.get("settingsSectionNav:click")({
    target: harness.target({
      "[data-settings-section]": harness.attrNode({ "data-settings-section": "workspace" })
    })
  });
  harness.listeners.get("settingsMobileItemSelect:change")({ target: { value: "templates" } });
  harness.listeners.get("moduleSidebar:click")({
    target: harness.target({
      "#settingsSidebarBackToApp": harness.attrNode()
    })
  });
  harness.listeners.get("settingsPreviewPermanentTemplate:click")({});
  harness.listeners.get("settingsSaveLiteratureTemplate:click")({});
  harness.listeners.get("settingsPermanentTemplateEditor:input")({});
  harness.listeners.get("settingsTemplatePreviewClose:click")({});

  assert.deepEqual(harness.calls, [
    ["section", "workspace", { announce: true }],
    ["item", "templates", { announce: true }],
    ["module", "explorer"],
    ["section", "templates", { render: false }],
    ["preview", "permanent"],
    ["save-template", "literature"],
    ["update-template", "permanent"],
    ["close-template"]
  ]);
});

test("settings demo import button shows progress while import is running", async () => {
  const harness = createHarness();
  let finishImport = null;
  const importButton = harness.attrNode({
    "data-settings-help-action": "import-demo",
    disabled: false,
    textContent: "导入示例库 / 体验 Demo"
  });

  installSettingsEventBindings({
    $: harness.$,
    handleStateChange: (reason, payload) => {
      harness.calls.push(["state", reason, payload.source]);
      return new Promise((resolve) => {
        finishImport = () => resolve(true);
      });
    }
  });

  const importPromise = harness.listeners.get("settingsPaneSupport:click")({
    preventDefault: () => harness.calls.push(["prevent"]),
    target: harness.target({
      "[data-settings-help-action]": importButton
    })
  });

  assert.equal(importButton.disabled, true);
  assert.equal(importButton.textContent, "正在导入...");
  assert.equal(harness.elements.get("settingsImportSmartNotesDemoStatus").textContent, "正在导入示例库。完成后会自动打开首页。");
  assert.equal(harness.elements.get("settingsImportSmartNotesDemoStatus").dataset.tone, "busy");
  finishImport();
  await importPromise;

  assert.equal(importButton.disabled, false);
  assert.equal(importButton.textContent, "导入示例库 / 体验 Demo");
  assert.deepEqual(harness.calls, [
    ["prevent"],
    ["state", "seed-smart-notes-demo", "settings-help"]
  ]);
});

test("settings demo import shows details when the import flow reports its original error", async () => {
  const harness = createHarness();
  const importButton = harness.attrNode({
    "data-settings-help-action": "import-demo",
    disabled: false,
    textContent: "导入示例库 / 体验 Demo"
  });

  installSettingsEventBindings({
    $: harness.$,
    handleStateChange: async () => {
      const error = new Error("service unavailable");
      error.code = "api_unavailable";
      error.details = { port: 3001, lastError: "EADDRINUSE" };
      throw error;
    },
    setStatus: (message, tone) => harness.calls.push(["status", message, tone])
  });

  await harness.listeners.get("settingsPaneSupport:click")({
    preventDefault: () => harness.calls.push(["prevent"]),
    target: harness.target({
      "[data-settings-help-action]": importButton
    })
  });

  assert.equal(importButton.disabled, false);
  assert.equal(importButton.textContent, "导入示例库 / 体验 Demo");
  assert.match(harness.elements.get("settingsImportSmartNotesDemoStatus").textContent, /导入失败：service unavailable/);
  assert.match(harness.elements.get("settingsImportSmartNotesDemoStatus").textContent, /错误代码：api_unavailable/);
  assert.match(harness.elements.get("settingsImportSmartNotesDemoStatus").textContent, /详情：port: 3001；lastError: EADDRINUSE/);
  assert.match(harness.elements.get("settingsImportSmartNotesDemoStatus").textContent, /请完全退出研思录后重新打开/);
  assert.equal(harness.elements.get("settingsImportSmartNotesDemoStatus").dataset.tone, "bad");
  assert.deepEqual(harness.calls, [
    ["prevent"],
    ["status", harness.elements.get("settingsImportSmartNotesDemoStatus").textContent, "bad"]
  ]);
});

test("settings demo import error describes timeout, code, and underlying cause", () => {
  const error = new Error("Request timed out after 60000ms");
  error.code = "request_timeout";
  error.cause = new Error("socket stalled");

  const message = describeSettingsDemoImportError(error);

  assert.match(message, /错误代码：request_timeout/);
  assert.match(message, /原因：socket stalled/);
  assert.match(message, /请稍等片刻后重试/);
});

test("settings demo import keeps cancellation separate from an import failure", async () => {
  const harness = createHarness();
  const importButton = harness.attrNode({
    "data-settings-help-action": "import-demo",
    disabled: false,
    textContent: "导入示例库 / 体验 Demo"
  });

  installSettingsEventBindings({
    $: harness.$,
    handleStateChange: async () => false,
    setStatus: (message, tone) => harness.calls.push(["status", message, tone])
  });

  await harness.listeners.get("settingsPaneSupport:click")({
    preventDefault: () => {},
    target: harness.target({
      "[data-settings-help-action]": importButton
    })
  });

  assert.equal(harness.elements.get("settingsImportSmartNotesDemoStatus").textContent, "已取消导入。需要时可再次点击按钮。");
  assert.equal(harness.elements.get("settingsImportSmartNotesDemoStatus").dataset.tone, "");
});

test("settings event bindings keep update and scheduled task actions behavior-driven", async () => {
  const harness = createHarness();
  const settingsState = {
    update: { auto: false },
    ai: {
      scheduledTaskForm: {},
      scheduledTaskFilters: {},
      scheduledTaskFormOpen: false
    }
  };
  installSettingsEventBindings({
    $: harness.$,
    state: { module: "settings", selectedFileId: "note-1", selectedFolderId: "dir-1" },
    settingsState,
    updateController: {
      persistUpdateSettingsToStorage: () => harness.calls.push(["persist-update"])
    },
    renderSettingsPanel: () => harness.calls.push(["render-settings"]),
    setStatus: (...args) => harness.calls.push(["status", ...args.slice(1)]),
    updateStateAutoCheckEnabled: (current, checked) => ({ ...current, auto: checked }),
    scheduledTaskFiltersFromUi: () => ({ status: "enabled" }),
    scheduledTaskFormFromUi: () => ({ noteIdsText: "", directoryIdsText: "" }),
    refreshScheduledTasks: async () => harness.calls.push(["refresh-tasks"]),
    runDueScheduledTasksFromUi: async () => harness.calls.push(["run-due"]),
    renderScheduledTasksWorkspace: () => harness.calls.push(["render-tasks"]),
    resetScheduledTaskForm: () => harness.calls.push(["reset-form"]),
    saveScheduledTaskFromUi: async () => harness.calls.push(["save-task"]),
    editScheduledTaskFromList: (id) => harness.calls.push(["edit-task", id]),
    setScheduledTaskStatus: async (id, status) => harness.calls.push(["set-task-status", id, status]),
    applyScheduledTaskTemplateToForm: (id) => harness.calls.push(["apply-template", id])
  });

  harness.listeners.get("settingsAutoUpdateEnabled:change")({ target: { checked: true } });

  const panel = harness.attrNode();
  await harness.listeners.get("settingsPaneAutomationBody:click")({
    target: harness.target({
      "#settingsScheduledTasksPanel": panel,
      "#btnScheduledTasksApplyFilters": harness.attrNode()
    })
  });
  await harness.listeners.get("settingsPaneAutomationBody:click")({
    target: harness.target({
      "#settingsScheduledTasksPanel": panel,
      "#btnScheduledTaskUseCurrentNote": harness.attrNode()
    })
  });
  await harness.listeners.get("settingsPaneAutomationBody:click")({
    target: harness.target({
      "#settingsScheduledTasksPanel": panel,
      "[data-scheduled-task-status]": harness.attrNode({
        "data-scheduled-task-id": "task-1",
        "data-scheduled-task-status": "paused"
      })
    })
  });
  harness.listeners.get("settingsPaneAutomationBody:change")({
    target: harness.target({
      "#settingsScheduledTasksPanel": panel,
      "#scheduledTaskForm": harness.attrNode(),
      "#scheduledTaskTemplateSelect": harness.attrNode()
    }, {
      value: "daily"
    })
  });

  assert.equal(settingsState.update.auto, true);
  assert.deepEqual(settingsState.ai.scheduledTaskFilters, { status: "enabled" });
  assert.deepEqual(settingsState.ai.scheduledTaskForm, { noteIdsText: "", directoryIdsText: "" });
  assert.equal(settingsState.ai.scheduledTaskFormOpen, true);
  assert.deepEqual(harness.calls.map((call) => call[0]), [
    "persist-update",
    "render-settings",
    "status",
    "refresh-tasks",
    "status",
    "render-tasks",
    "set-task-status",
    "apply-template"
  ]);
});
