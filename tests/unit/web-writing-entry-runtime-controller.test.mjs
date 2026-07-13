import test from "node:test";
import assert from "node:assert/strict";

import {
  createWritingEntryRuntimeController
} from "../../apps/web/src/writing-entry-runtime-controller.js";

function fieldValues(values = {}) {
  return (id) => ({ value: values[id] || "" });
}

test("writing entry runtime controller begins a fresh basket entry", () => {
  const calls = [];
  const writingState = {
    strongModelEpoch: 1,
    contextualAiActionState: { actionId: "check_outline", status: "awaiting_confirmation" },
    sourceIndexIds: ["idx_old"],
    selectedThemeIndexId: "idx_old"
  };
  const controller = createWritingEntryRuntimeController(() => ({
    $: fieldValues({
      writingGoal: "Goal",
      writingAudience: "Audience",
      writingTone: "Tone"
    }),
    clearWritingSourceIndexIds: () => calls.push(["clear-source"]),
    refreshWritingRelationCounts: async (ids) => calls.push(["relations", ids]),
    renderWritingPanel: () => calls.push(["render"]),
    resetWritingLocalBookIdeas: () => calls.push(["reset-book"]),
    resetWritingProjectContext: (context) => calls.push(["reset-project", context]),
    setSelectedWritingThemeIndex: (id) => calls.push(["theme", id]),
    setWritingBasketIds: (ids) => calls.push(["basket", ids]),
    showWritingResult: (payload) => calls.push(["result", payload]),
    writingState
  }));

  const ok = controller.beginWritingEntry([" n1 ", "n1", "n2"], {
    title: " Draft title ",
    source: "import"
  });

  assert.equal(ok, true);
  assert.equal(writingState.strongModelEpoch, 2);
  assert.equal(writingState.strongModelLoading, false);
  assert.equal(writingState.contextualAiActionState, null);
  assert.equal(writingState.loadingRelationCounts, true);
  assert.deepEqual(calls.find((call) => call[0] === "basket"), ["basket", ["n1", "n2"]]);
  assert.deepEqual(calls.find((call) => call[0] === "theme"), ["theme", ""]);
  assert.deepEqual(calls.find((call) => call[0] === "reset-project"), ["reset-project", {
    title: "Draft title",
    goal: "Goal",
    audience: "Audience",
    tone: "Tone"
  }]);
  assert.deepEqual(calls.find((call) => call[0] === "result")[1], {
    stage: "writing_entry_from_notes",
    source: "import",
    basketNoteIds: ["n1", "n2"]
  });
});

test("writing entry runtime controller continues an existing basket entry", () => {
  const calls = [];
  const writingState = {
    strongModelEpoch: 0,
    contextualAiActionState: { actionId: "check_outline", status: "awaiting_confirmation" },
    sourceIndexIds: ["idx_existing"],
    selectedThemeIndexId: "idx_existing"
  };
  const controller = createWritingEntryRuntimeController(() => ({
    $: fieldValues({
      writingTitle: "Existing title",
      writingGoal: "Goal"
    }),
    clearWritingSourceIndexIds: () => calls.push(["clear-source"]),
    parseWritingBasketIds: () => ["n1"],
    refreshWritingRelationCounts: async (ids) => calls.push(["relations", ids]),
    renderWritingPanel: () => calls.push(["render"]),
    resetWritingLocalBookIdeas: () => calls.push(["reset-book"]),
    resetWritingProjectContext: (context) => calls.push(["reset-project", context]),
    setSelectedWritingThemeIndex: (id) => calls.push(["theme", id]),
    setWritingBasketIds: (ids) => calls.push(["basket", ids]),
    setWritingSourceIndexIds: (ids) => calls.push(["source", ids]),
    showWritingResult: (payload) => calls.push(["result", payload]),
    writingState
  }));

  const plan = controller.continueWritingEntry(["n2", "n1"], {
    title: "Requested title",
    source: "theme",
    sourceIndexIds: ["idx_new"],
    preserveSourceIndexIds: true
  });

  assert.equal(plan.entryMode, "append");
  assert.equal(writingState.contextualAiActionState, null);
  assert.deepEqual(plan.basketNoteIds, ["n1", "n2"]);
  assert.equal(plan.resolvedTitle, "Existing title");
  assert.deepEqual(calls.find((call) => call[0] === "source"), ["source", ["idx_existing", "idx_new"]]);
  assert.deepEqual(calls.find((call) => call[0] === "theme"), ["theme", "idx_existing"]);
  assert.deepEqual(calls.find((call) => call[0] === "basket"), ["basket", ["n1", "n2"]]);
});

test("writing entry runtime controller opens writing module and refreshes workspace state", async () => {
  const calls = [];
  const writingState = {
    project: { id: "wp_1" },
    projectFilters: { q: "draft", status: "active", hasDraft: "yes" },
    projects: [],
    themeIndexes: [],
    scaffoldVersions: [],
    draftVersions: [],
    relationCounts: {},
    relationCountErrors: {}
  };
  const controller = createWritingEntryRuntimeController(() => ({
    activateModule: (moduleId) => calls.push(["activate", moduleId]),
    clearWritingFocusedCandidateScope: () => calls.push(["clear-focus"]),
    ensureNotesLoaded: async (ids, options) => calls.push(["ensure", ids, options]),
    fetchWritingProject: async (projectId) => ({ id: projectId, title: "Project" }),
    listIndexCards: async (request) => {
      calls.push(["indexes", request]);
      return [{ id: "idx_1" }];
    },
    listProjectDraftVersions: async (projectId, limit) => {
      calls.push(["drafts", projectId, limit]);
      return [{ id: "draft_v1" }];
    },
    listProjectScaffolds: async (projectId, limit) => {
      calls.push(["scaffolds", projectId, limit]);
      return [{ id: "scaffold_v1" }];
    },
    listWritingProjects: async (request) => {
      calls.push(["projects", request]);
      return [{ id: "wp_1" }];
    },
    parseWritingBasketIds: () => ["n1", "n2"],
    refreshWritingRelationCounts: async (ids, options) => {
      calls.push(["relations", ids, options]);
      return { counts: { n1: 2 }, errors: {} };
    },
    renderWritingPanel: () => calls.push(["render"]),
    setStatus: (...args) => calls.push(["status", ...args]),
    setWritingFocusedCandidateScope: (...args) => calls.push(["focus", ...args]),
    statusRevision: 7,
    syncWritingResultFromCurrentState: () => calls.push(["sync-result"]),
    writingState,
    writingThemeIndexScopeDirectoryId: () => "dir_original"
  }));

  await controller.openWritingModule({
    statusMessage: "opened",
    focusedCandidateNoteIds: ["n2", "n2", "n3"],
    focusedCandidateScopeLabel: "slice",
    entryReason: "visible graph slice is ready",
    entrySourceLabel: "Graph"
  });

  assert.deepEqual(writingState.projects, [{ id: "wp_1" }]);
  assert.deepEqual(writingState.themeIndexes, [{ id: "idx_1" }]);
  assert.deepEqual(writingState.scaffoldVersions, [{ id: "scaffold_v1" }]);
  assert.deepEqual(writingState.draftVersions, [{ id: "draft_v1" }]);
  assert.deepEqual(writingState.relationCounts, { n1: 2 });
  assert.equal(writingState.loadingProjects, false);
  assert.equal(writingState.entryContextReason, "visible graph slice is ready");
  assert.equal(writingState.entryContextSourceLabel, "Graph");
  assert.deepEqual(calls.find((call) => call[0] === "ensure"), ["ensure", ["n2", "n3"], { force: true }]);
  assert.deepEqual(calls.find((call) => call[0] === "focus"), ["focus", ["n2", "n3"], "slice"]);
  assert.deepEqual(calls.find((call) => call[0] === "activate"), ["activate", "writing"]);
  assert.equal(calls.some((call) => call[0] === "sync-result"), true);
  assert.deepEqual(calls.find((call) => call[0] === "status"), ["status", "opened", "ok", {
    skipIfStaleSince: 7,
    requireModule: "writing"
  }]);
});

test("writing entry runtime controller clears stale entry context on a plain open", async () => {
  const calls = [];
  const writingState = {
    project: null,
    projectFilters: { q: "", status: "all", hasDraft: "all" },
    projects: [],
    themeIndexes: [],
    relationCounts: {},
    relationCountErrors: {},
    entryContextReason: "stale reason",
    entryContextSourceLabel: "stale source"
  };
  const controller = createWritingEntryRuntimeController(() => ({
    activateModule: (moduleId) => calls.push(["activate", moduleId]),
    clearWritingFocusedCandidateScope: () => calls.push(["clear-focus"]),
    listIndexCards: async () => [],
    listWritingProjects: async () => [],
    parseWritingBasketIds: () => [],
    refreshWritingRelationCounts: async () => ({ counts: {}, errors: {} }),
    renderWritingPanel: () => calls.push(["render"]),
    setStatus: (...args) => calls.push(["status", ...args]),
    syncWritingResultFromCurrentState: () => calls.push(["sync-result"]),
    writingState,
    writingThemeIndexScopeDirectoryId: () => "dir_original"
  }));

  await controller.openWritingModule({ statusMessage: "" });

  assert.equal(calls.some((call) => call[0] === "clear-focus"), true);
  assert.equal(writingState.entryContextReason, "");
  assert.equal(writingState.entryContextSourceLabel, "");
});

test("writing entry runtime controller does not preserve stale entry context with focused scope", async () => {
  const writingState = {
    project: null,
    projectFilters: { q: "", status: "all", hasDraft: "all" },
    projects: [],
    themeIndexes: [],
    relationCounts: {},
    relationCountErrors: {},
    entryContextReason: "old graph reason",
    entryContextSourceLabel: "图谱"
  };
  const controller = createWritingEntryRuntimeController(() => ({
    activateModule: () => {},
    listIndexCards: async () => [],
    listWritingProjects: async () => [],
    parseWritingBasketIds: () => [],
    refreshWritingRelationCounts: async () => ({ counts: {}, errors: {} }),
    renderWritingPanel: () => {},
    setStatus: () => {},
    syncWritingResultFromCurrentState: () => {},
    writingState,
    writingThemeIndexScopeDirectoryId: () => "dir_original"
  }));

  await controller.openWritingModule({
    statusMessage: "",
    preserveFocusedCandidateScope: true
  });

  assert.equal(writingState.entryContextReason, "");
  assert.equal(writingState.entryContextSourceLabel, "");
});
