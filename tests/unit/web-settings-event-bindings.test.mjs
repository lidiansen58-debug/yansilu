import test from "node:test";
import assert from "node:assert/strict";
import { installSettingsEventBindings } from "../../apps/web/src/settings-event-bindings.js";

function createHarness() {
  const listeners = new Map();
  const elements = new Map();
  const calls = [];

  function element(id, extra = {}) {
    const node = {
      id,
      value: "",
      checked: false,
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
    "settingsPaneAutomationBody"
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
