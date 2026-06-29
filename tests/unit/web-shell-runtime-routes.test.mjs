import test from "node:test";
import assert from "node:assert/strict";

import { createDirectoryOptionRuntime } from "../../apps/web/src/directory-option-runtime.js";
import { createSaveAiSuggestionWorkflowRoutes } from "../../apps/web/src/save-ai-suggestion-workflow-routes.js";
import { createSettingsPanelRuntimeRoutes } from "../../apps/web/src/settings-panel-runtime-routes.js";

function fakeElement(value = "") {
  const classes = new Set();
  return {
    value,
    innerHTML: "",
    textContent: "",
    dataset: {},
    classList: {
      toggle(name, force) {
        if (force) classes.add(name);
        else classes.delete(name);
      },
      contains(name) {
        return classes.has(name);
      }
    }
  };
}

test("directory option runtime derives import, move, and export options from host state", () => {
  const elements = {
    exportDirectoryId: fakeElement("dir_original_child"),
    exportTargetHint: fakeElement(),
    exportTargetPath: fakeElement("")
  };
  const state = {
    selectedFolderId: "dir_original_child",
    folders: [
      { id: "dir_original_default", name: "永久笔记盒" },
      { id: "dir_original_child", name: "子目录", parentId: "dir_original_default" },
      { id: "dir_literature_default", name: "文献" },
      { id: "dir_hidden", name: "隐藏", hidden: true }
    ]
  };
  const runtime = createDirectoryOptionRuntime(() => ({
    $: (id) => elements[id] || null,
    directoryPathLabel: (id) => `path:${id}`,
    displayFolderName: (folder) => folder.name,
    escapeHtml: (value) => String(value),
    folderById: (_state, id) => state.folders.find((folder) => folder.id === id) || null,
    isDirectoryUnderOriginalRoot: (id) => id === "dir_original_default" || id === "dir_original_child",
    lastChosenPermanentDirectoryId: () => "dir_original_default",
    preferredImportDirectoryIdFromOptions: ({ currentValue, directoryOptions }) =>
      directoryOptions.some((folder) => folder.id === currentValue) ? currentValue : directoryOptions[0]?.id || "",
    rootBoxIdFromFolder: (_state, id) => id.startsWith("dir_literature") ? "dir_literature_default" : "dir_original_default",
    state
  }));

  assert.deepEqual(runtime.permanentExportDirectories().map((folder) => folder.id), ["dir_original_child", "dir_original_default"]);
  assert.equal(runtime.defaultPermanentDirectoryId(), "dir_original_child");
  assert.deepEqual(runtime.importTargetDirectories().map((folder) => folder.id), ["dir_literature_default", "dir_original_child", "dir_original_default"]);
  assert.equal(runtime.preferredImportDirectoryId("dir_literature_default"), "dir_literature_default");

  runtime.syncExportDirectoryOptions();
  assert.match(elements.exportDirectoryId.innerHTML, /dir_original_child/);
  assert.match(elements.exportTargetHint.textContent, /path:dir_original_child/);
});

test("save AI suggestion workflow routes render only for the active explorer note", () => {
  const elements = {
    saveAiSuggestion: fakeElement(),
    saveAiSuggestionText: fakeElement(),
    btnSaveAiSuggestionPrimary: fakeElement(),
    btnSaveAiSuggestionLater: fakeElement()
  };
  let currentSuggestion = null;
  const activeNote = { id: "note-1", folderId: "dir_original_default", body: "body" };
  const routes = createSaveAiSuggestionWorkflowRoutes(() => ({
    $: (id) => elements[id] || null,
    activeEditorBody: () => "body",
    activeEditorNote: () => activeNote,
    dismissedSaveAiSuggestionKeys: new Set(),
    distillationStatusOf: () => "missing",
    getSaveAiSuggestion: () => currentSuggestion,
    isEmptyUntitledMarkdown: () => false,
    isOriginalRecordableSource: () => true,
    isPermanentLikeNote: () => false,
    noteHasGeneratedOriginal: () => false,
    resolveSystemMessageByDedupeKey: () => null,
    saveAiSuggestionKey: (note, action) => `${note.id}:${action}`,
    setSaveAiSuggestion: (suggestion) => {
      currentSuggestion = suggestion;
    },
    state: { module: "explorer" },
    typeFromFolder: () => "literature",
    upsertSystemMessage: () => {}
  }));

  const suggestion = routes.showSaveAiSuggestionForNote(activeNote);

  assert.equal(suggestion?.noteId, "note-1");
  assert.equal(currentSuggestion?.noteId, "note-1");
  assert.equal(elements.saveAiSuggestionText.textContent.length > 0, true);
  assert.equal(elements.saveAiSuggestion.classList.contains("hidden"), false);
});

test("settings panel runtime routes update section and item state without prototype helpers", () => {
  const statuses = [];
  const settingsState = { activeSection: "workspace", activeItem: "workspace-vault", ai: {}, error: "" };
  const routes = createSettingsPanelRuntimeRoutes(() => ({
    $: () => null,
    document: { querySelectorAll: () => [] },
    state: { module: "settings" },
    settingsState,
    feedbackRepository: "owner/repo",
    feedbackRepositoryReady: true,
    escapeHtml: (value) => String(value),
    setStatus: (...args) => statuses.push(args),
    renderSidebarTitle: () => {}
  }));

  routes.setSettingsSection("ai", { render: false, announce: true });
  assert.equal(settingsState.activeSection, "ai");
  assert.equal(statuses.at(-1)?.[1], "ok");

  routes.setSettingsItem("permanent-template", { render: false, announce: true });
  assert.equal(settingsState.activeItem, "permanent-template");
  assert.equal(settingsState.activeSection, "templates");
});
