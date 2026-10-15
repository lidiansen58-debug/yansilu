import test from "node:test";
import assert from "node:assert/strict";
import { loadWritingThemeIndexesForRuntime } from "../../apps/web/src/writing-theme-index-loader.js";

import {
  createWritingEntryRuntimeController
} from "../../apps/web/src/writing-entry-runtime-controller.js";

function fieldValues(values = {}) {
  return (id) => ({ value: values[id] || "" });
}

test("plain writing entry uses the same empty-folder Vault fallback as a theme refresh", async () => {
  const queries = [], writingState = { projectFilters: {} };
  const controller = createWritingEntryRuntimeController(() => ({ writingState,
    writingThemeIndexScopeDirectoryId: () => "usage-notes",
    listIndexCards: async query => { queries.push(query); return query.directoryId ? [] : [{ id: "vault-theme" }]; }
  }));
  await controller.openWritingModule({ statusMessage: "" });
  assert.deepEqual(queries.map(query => query.directoryId), ["usage-notes", undefined]);
  assert.deepEqual(writingState.themeIndexes, [{ id: "vault-theme" }]);
  assert.equal(writingState.loadingThemeIndexes, false);
});

test("an entry still hydrating cannot claim ownership after a newer theme refresh", async () => {
  let releaseHydration, queries = 0;
  const writingState = { projectFilters: {}, themeIndexes: ["keep"] };
  const controller = createWritingEntryRuntimeController(() => ({ writingState,
    ensureNotesLoaded: () => new Promise(resolve => { releaseHydration = resolve; }),
    writingThemeIndexScopeDirectoryId: () => "old-folder",
    listIndexCards: async () => { queries++; return [{ id: "stale" }]; }
  }));
  const old = controller.openWritingModule({ statusMessage: "" });
  await loadWritingThemeIndexesForRuntime({ writingState, directoryId: "new-folder",
    listIndexCards: async () => [{ id: "fresh" }], renderWritingPanel: () => {} });
  releaseHydration(); await old;
  assert.deepEqual(writingState.themeIndexes, [{ id: "fresh" }]);
  assert.equal(queries, 0);
  assert.equal(writingState.loadingThemeIndexes, false);
});

for (const order of ["older first", "newer first"]) {
  test(`writing entry and a newer theme refresh share request ownership: ${order}`, async () => {
    let releaseOld, releaseNew;
    const writingState = { projectFilters: {}, themeIndexes: ["keep"] };
    const controller = createWritingEntryRuntimeController(() => ({ writingState,
      writingThemeIndexScopeDirectoryId: () => "old-folder",
      listIndexCards: () => new Promise(resolve => { releaseOld = resolve; })
    }));
    const old = controller.openWritingModule({ statusMessage: "" });
    await new Promise(resolve => setImmediate(resolve));
    const newer = loadWritingThemeIndexesForRuntime({ writingState, directoryId: "new-folder",
      listIndexCards: () => new Promise(resolve => { releaseNew = resolve; }), renderWritingPanel: () => {} });
    if (order === "older first") {
      releaseOld([{ id: "stale" }]); await old;
      assert.deepEqual(writingState.themeIndexes, ["keep"]);
      assert.equal(writingState.loadingThemeIndexes, true);
      releaseNew([{ id: "fresh" }]); await newer;
    } else {
      releaseNew([{ id: "fresh" }]); await newer;
      releaseOld([{ id: "stale" }]); await old;
    }
    assert.deepEqual(writingState.themeIndexes, [{ id: "fresh" }]);
    assert.equal(writingState.loadingThemeIndexes, false);
  });
}

test("a newer theme refresh prevents an older writing entry from starting its fallback", async () => {
  let release, calls = 0;
  const writingState = { projectFilters: {} };
  const controller = createWritingEntryRuntimeController(() => ({ writingState,
    writingThemeIndexScopeDirectoryId: () => "old-folder",
    listIndexCards: () => { calls++; return new Promise(resolve => { release = resolve; }); }
  }));
  const old = controller.openWritingModule({ statusMessage: "" });
  await new Promise(resolve => setImmediate(resolve));
  await loadWritingThemeIndexesForRuntime({ writingState, directoryId: "new-folder",
    listIndexCards: async () => [{ id: "fresh" }], renderWritingPanel: () => {} });
  release([]); await old;
  assert.equal(calls, 1);
  assert.deepEqual(writingState.themeIndexes, [{ id: "fresh" }]);
});

test("new writing entries cannot replace unsaved or saving drafts", () => {
  for (const draftSaveState of ["dirty", "error", "saving"]) {
    for (const method of ["beginWritingEntry", "continueWritingEntry"]) {
      const calls = [];
      const writingState = { draftSaveState, project: { id: "existing" }, draftMarkdown: "Keep my text" };
      const before = structuredClone(writingState);
      const controller = createWritingEntryRuntimeController(() => ({
        writingState, parseWritingBasketIds: () => ["n1"],
        resetWritingProjectContext: () => calls.push("reset"),
        setWritingBasketIds: () => calls.push("basket")
      }));
      assert.throws(() => controller[method](["n2"]), /保存/);
      assert.deepEqual(writingState, before);
      assert.deepEqual(calls, []);
    }
  }
});

test("opening writing hydrates restored basket notes before rendering their titles", async () => {
  const calls = [];
  const controller = createWritingEntryRuntimeController(() => ({
    writingState: { projectFilters: {} },
    parseWritingBasketIds: () => ["restored"],
    ensureNotesLoaded: async (ids) => calls.push(["hydrate", ids]),
    renderWritingPanel: () => calls.push(["render"])
  }));
  await controller.openWritingModule({ statusMessage: "" });
  assert.deepEqual(calls[0], ["hydrate", ["restored"]]);
  assert.equal(calls.some(([type]) => type === "render"), true);
});

test("opening writing aborts after hydration if vault, basket, project or open request changed", async () => {
  for (const change of ["vault", "basket", "project", "open-request"]) {
    let release;
    let vault = "/one";
    let ids = ["n1"];
    const state = { project: null, projectFilters: {} };
    const calls = [];
    const controller = createWritingEntryRuntimeController(() => ({
      writingState: state, getVaultPath: () => vault, parseWritingBasketIds: () => ids,
      ensureNotesLoaded: () => new Promise(resolve => { release = resolve; }),
      listWritingProjects: async () => { calls.push("projects"); return []; },
      renderWritingPanel: () => calls.push("render"),
      setStatus: () => calls.push("status")
    }));
    const pending = controller.openWritingModule();
    if (change === "vault") vault = "/two";
    if (change === "basket") ids = ["n2"];
    if (change === "project") state.project = { id: "another" };
    if (change === "open-request") state.projectOpenRevision = 1;
    release();
    await pending;
    assert.deepEqual(calls, [], change);
  }
});

test("late workspace refresh cannot replace a new vault's writing state", async () => {
  let vault = "/one";
  let release;
  const state = { project: null, projectFilters: {}, projects: [] };
  const controller = createWritingEntryRuntimeController(() => ({
    writingState: state, getVaultPath: () => vault, parseWritingBasketIds: () => ["n1"],
    listWritingProjects: () => new Promise(resolve => { release = resolve; })
  }));
  const pending = controller.openWritingModule({ statusMessage: "" });
  await Promise.resolve();
  vault = "/two";
  state.projects = [{ id: "new-vault-project" }];
  state.loadingProjects = true;
  release([{ id: "old-vault-project" }]);
  await pending;
  assert.deepEqual(state.projects, [{ id: "new-vault-project" }]);
  assert.equal(state.loadingProjects, true);
});

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
