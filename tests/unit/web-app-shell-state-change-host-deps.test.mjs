import test from "node:test";
import assert from "node:assert/strict";

import {
  routeAppShellStateChange
} from "../../apps/web/src/app-shell-state-change-router.js";
import {
  buildAppShellStateChangePrototypeHostDeps,
  createAppShellStateChangePrototypeDepsProvider
} from "../../apps/web/src/app-shell-state-change-host-deps.js";

test("app shell state-change prototype host deps keeps shell collaborators in one mapping", () => {
  const host = {};
  const keys = [
    "GRAPH_ORIGINAL_SCOPE_DIRECTORY_ID",
    "activateModule",
    "addSystemMessage",
    "aiInboxState",
    "analyzePermanentNote",
    "applyExplorerSelectionContext",
    "clearSaveAiSuggestion",
    "confirm",
    "confirmPermanentNoteDistillation",
    "continueWritingEntry",
    "continueWritingProjectEntry",
    "createNote",
    "createNoteInSelectedFolder",
    "createPrimaryOriginalNote",
    "createWritingProjectFromCurrentBasket",
    "deleteDirectory",
    "deleteNote",
    "descendantDirectoryIds",
    "editor",
    "ensureNoteBodyLoaded",
    "expandGraphBrowserTree",
    "ensureLocalAiReadyForFeature",
    "explorer",
    "folderById",
    "generatedOriginalNoteIdFromBody",
    "graphAssociateNoteRoute",
    "graphNodeNeedsRelationWorkflowFromCurrentGraph",
    "graphRelationWorkflowController",
    "graphState",
    "handleStateChange",
    "importSmartNotesDemo",
    "isOriginalRecordableSource",
    "isPermanentLikeNote",
    "mapNoteItem",
    "moveNote",
    "moveNoteInClientState",
    "movedDirectoryFsPath",
    "noteGeneratedOriginalNoteId",
    "noteMainPathWritingContinuationEntry",
    "notePersistenceFieldsForSave",
    "noteSaveFailureFeedback",
    "normalizeAiInboxFilters",
    "normalizeAuthorshipItem",
    "normalizeOptionalNumber",
    "normalizeThinkingStatusItem",
    "normalizeWritingProjectTitleSeed",
    "noteAnalysisSystemMessageForResult",
    "openAiInboxModule",
    "openGraphSelection",
    "openRelationComposerFromGraphAction",
    "openImportModule",
    "openNoteById",
    "openNoteRelationEditor",
    "openSystemMessages",
    "openWritingModule",
    "originalDraftBodyFromSource",
    "parseLinks",
    "parseTags",
    "refreshDirectoryGraph",
    "removeNoteFromClientState",
    "renamedDirectoryFsPath",
    "renderAll",
    "renderDistillationPanel",
    "replaceFirstMarkdownTitle",
    "rootBoxIdFromFolder",
    "saveAiSuggestion",
    "setGraphIsolatedWorkflowActiveTab",
    "setStatus",
    "showSaveAiSuggestionForNote",
    "state",
    "syncExplorerContextToActiveTab",
    "syncExplorerContextToNote",
    "syncDirectoriesFromApi",
    "syncLoadedNotesForDirectories",
    "syncNoteRelationNetworkStatus",
    "syncNotesForDirectory",
    "syncSourcePromotionSystemMessageForNote",
    "titleFromSeedText",
    "typeFromFolder",
    "updateDirectory",
    "updateNote",
    "updatePermanentNoteDistillation",
    "usingLocalFallbackData",
    "windowRef",
    "withGeneratedOriginalMarker",
    "withGeneratedOriginalReference",
    "writingCenterContinuationFailureMessage",
    "writingCenterContinuationStatusMessage"
  ];
  for (const key of keys) host[key] = { key };

  const deps = buildAppShellStateChangePrototypeHostDeps(host);

  assert.notEqual(deps, host);
  assert.deepEqual(Object.keys(deps), keys);
  for (const key of keys) {
    assert.equal(deps[key], host[key]);
  }
});

test("app shell state-change prototype deps provider builds grouped runtime deps from current host", () => {
  let graphState = { loading: false };
  const provider = createAppShellStateChangePrototypeDepsProvider(() => ({
    GRAPH_ORIGINAL_SCOPE_DIRECTORY_ID: "dir-original",
    graphState,
    refreshDirectoryGraph: async () => true,
    renderAll: () => "rendered"
  }));

  const first = provider();
  graphState = { loading: true };
  const second = provider();

  assert.notEqual(first, second);
  assert.equal(first.refreshGraph.graphState.loading, false);
  assert.equal(second.refreshGraph.graphState.loading, true);
  assert.equal(second.graphFocusNote.graphOriginalScopeDirectoryId, "dir-original");
  assert.equal(second.renderAll(), "rendered");
});

test("app shell state-change deps provider keeps empty-start demo import dependencies routable", async () => {
  const calls = [];
  const provider = createAppShellStateChangePrototypeDepsProvider(() => ({
    confirm: () => {
      calls.push("confirm");
      return true;
    },
    importSmartNotesDemo: async (payload) => {
      calls.push(["demo", payload.source, payload.confirmed]);
      return true;
    },
    openImportModule: (payload) => calls.push(["import", payload.source]),
    setStatus: (message, tone) => calls.push(["status", message, tone])
  }));

  assert.equal(await routeAppShellStateChange("open-import", { source: "empty-start" }, provider()), true);
  assert.equal(await routeAppShellStateChange("seed-smart-notes-demo", {
    source: "empty-start",
    confirmed: true
  }, provider()), true);

  assert.deepEqual(calls, [
    ["import", "empty-start"],
    ["demo", "empty-start", true]
  ]);
});
