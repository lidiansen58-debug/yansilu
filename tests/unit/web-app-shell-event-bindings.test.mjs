import test from "node:test";
import assert from "node:assert/strict";
import { installAppRailEventBindings } from "../../apps/web/src/app-rail-event-bindings.js";
import { installGraphEntryEventBindings } from "../../apps/web/src/graph-entry-event-bindings.js";
import { installQuickActionEventBindings } from "../../apps/web/src/quick-action-event-bindings.js";

function button(dataset = {}) {
  const listeners = new Map();
  return {
    dataset,
    addEventListener(type, handler) {
      listeners.set(type, handler);
    },
    async click(extra = {}) {
      await listeners.get("click")?.({
        preventDefault: () => {},
        stopPropagation: () => {},
        ...extra
      });
    }
  };
}

function documentWith(selectorMap = {}) {
  return {
    querySelectorAll(selector) {
      return selectorMap[selector] || [];
    }
  };
}

test("graph entry bindings refresh graph and route graph demo buttons", async () => {
  const calls = [];
  const elements = {
    graphRefresh: button(),
    graphBackToDirectory: button(),
    graphSeedYijing: button(),
    graphSeedYijingRich: button()
  };
  const state = { selectedFileId: "note-1" };
  installGraphEntryEventBindings({
    $: (id) => elements[id] || null,
    state,
    explorer: { restoreAutoCollapsedDisconnectedGroups: () => calls.push(["restore"]) },
    graphState: { error: "failed" },
    refreshDirectoryGraph: async () => {
      calls.push(["refresh"]);
      return true;
    },
    importYijingKnowledgeNetworkDemo: async () => calls.push(["seed-basic"]),
    importYijingRichAcceptanceDemo: async () => calls.push(["seed-rich"]),
    renderAll: () => calls.push(["render"]),
    setStatus: (...args) => calls.push(["status", ...args.slice(1)])
  });

  await elements.graphRefresh.click();
  await elements.graphBackToDirectory.click();
  await elements.graphSeedYijing.click();
  await elements.graphSeedYijingRich.click();

  assert.equal(state.selectedFileId, null);
  assert.deepEqual(calls.map((call) => call[0]), ["refresh", "status", "restore", "render", "status", "seed-basic", "seed-rich"]);
});

test("rail bindings keep graph activation guarded during async graph open", async () => {
  const calls = [];
  const state = { module: "" };
  let guardUntil = 0;
  const graphButton = button({ module: "graph" });
  installAppRailEventBindings({
    documentRef: documentWith({ ".rail-btn[data-module]": [graphButton] }),
    state,
    now: () => 1000,
    getGraphModuleActivationGuardUntil: () => guardUntil,
    setGraphModuleActivationGuardUntil: (value) => {
      guardUntil = value;
    },
    activateModule: (module) => {
      calls.push(["activate", module]);
      state.module = module;
    },
    previewOllamaLocalAiBootstrapFromUi: async (options) => calls.push(["preview", options]),
    localAiPreviewOptionsForAction: (action) => ({ action }),
    refreshDirectoryGraph: async () => {
      calls.push(["refresh"]);
      state.module = "explorer";
    },
    setStatus: (...args) => calls.push(["status", ...args.slice(1)])
  });

  await graphButton.click();

  assert.equal(guardUntil, 2800);
  assert.equal(state.module, "graph");
  assert.deepEqual(calls, [
    ["activate", "graph"],
    ["preview", { action: "graph_module_open" }],
    ["refresh"],
    ["activate", "graph"],
    ["status", "ok"]
  ]);
});

test("quick action bindings switch roots, respect graph guard, and open handoff", async () => {
  const calls = [];
  const state = {
    module: "graph",
    tabs: [{ id: "tab-1", dirty: true }],
    activeTabId: "tab-1",
    browserRootId: "dir_original_default",
    selectedFolderId: "dir_original_default",
    selectedFileId: "note-1"
  };
  const quickOriginal = button({ action: "quick-original" });
  const quickLiterature = button({ action: "quick-literature" });
  const handoff = button({ action: "open-handoff" });
  installQuickActionEventBindings({
    documentRef: documentWith({
      "[data-action^='quick-']": [quickOriginal, quickLiterature],
      "[data-action='open-handoff']": [handoff]
    }),
    windowRef: {
      location: { origin: "http://localhost:3000" },
      open: (...args) => calls.push(["open", ...args])
    },
    state,
    editor: {
      updateActiveTabFromEditor: () => calls.push(["update-editor"]),
      autoSaveTabById: (id, reason) => calls.push(["autosave", id, reason])
    },
    now: () => 1000,
    getGraphModuleActivationGuardUntil: () => 1500,
    folderById: (_, id) => ({ id, name: id }),
    displayFolderName: (folder) => folder.name,
    syncNotesForDirectoryTree: async (id) => calls.push(["sync-tree", id]),
    syncRailSelectionState: () => calls.push(["sync-rail"]),
    renderAll: () => calls.push(["render"]),
    setStatus: (...args) => calls.push(["status", ...args.slice(1)])
  });

  await quickOriginal.click();
  assert.equal(state.module, "graph");
  assert.deepEqual(calls, [["status", "ok"]]);

  calls.length = 0;
  installQuickActionEventBindings({
    documentRef: documentWith({ "[data-action^='quick-']": [quickLiterature], "[data-action='open-handoff']": [handoff] }),
    windowRef: {
      location: { origin: "http://localhost:3000" },
      open: (...args) => calls.push(["open", ...args])
    },
    state,
    editor: {
      updateActiveTabFromEditor: () => calls.push(["update-editor"]),
      autoSaveTabById: (id, reason) => calls.push(["autosave", id, reason])
    },
    now: () => 2000,
    getGraphModuleActivationGuardUntil: () => 1500,
    folderById: (_, id) => ({ id, name: id }),
    displayFolderName: (folder) => folder.name,
    syncNotesForDirectoryTree: async (id) => calls.push(["sync-tree", id]),
    syncRailSelectionState: () => calls.push(["sync-rail"]),
    renderAll: () => calls.push(["render"]),
    setStatus: (...args) => calls.push(["status", ...args.slice(1)])
  });

  await quickLiterature.click();
  await handoff.click();

  assert.equal(state.module, "explorer");
  assert.equal(state.browserRootId, "dir_literature_default");
  assert.equal(state.selectedFolderId, "dir_literature_default");
  assert.equal(state.selectedFileId, null);
  assert.deepEqual(calls.map((call) => call[0]), ["update-editor", "autosave", "sync-tree", "sync-rail", "status", "render", "open", "status"]);
  assert.equal(calls.at(-2)[1], "http://localhost:3000/app/handoff");
});
