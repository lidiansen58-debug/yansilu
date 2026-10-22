import test from "node:test";
import assert from "node:assert/strict";
import { selectWritingThemeForRuntime } from "../../apps/web/src/writing-theme-selection-request.js";
import { shouldPreserveWritingThemeContext } from "../../apps/web/src/writing-center-flow.js";
import { sameUniqueStringSetForRuntime, writingThemeIndexNoteIdsForRuntime } from "../../apps/web/src/writing-theme-state.js";
import { assertWritingDraftCanLeave } from "../../apps/web/src/writing-draft-save-controller.js";
import { beginAppNavigation, captureAppNavigation } from "../../apps/web/src/app-navigation-intent.js";

function deferred() {
  let resolve, reject;
  const promise = new Promise((done, fail) => { resolve = done; reject = fail; });
  return { promise, resolve, reject };
}

function harness({ loadedIds = ["previous-note"], relationIds = ["previous-note"] } = {}) {
  const state = { module: "writing", noteMoveVaultScope: {} };
  const writingState = {
    selectedThemeIndexId: "previous-theme", projectOpenRevision: 2,
    themeNoteDetailIds: loadedIds, themeRelationNoteIds: relationIds,
    loadingThemeNoteDetails: true, themeRelationCounts: { "previous-note": 3 },
    themeIndexes: [{ id: "previous-theme", item_note_ids: ["previous-note"] }]
  };
  const commits = [], loads = [];
  let vaultPath = "vault-a", callerCurrent = true;
  const deps = {
    state, writingState, getVaultPath: () => vaultPath, assertWritingDraftCanLeave,
    fetchIndexCard: async id => ({ id, item_note_ids: ["incoming-note"] }),
    writingThemeIndexNoteIds: writingThemeIndexNoteIdsForRuntime,
    shouldPreserveWritingThemeContext, sameUniqueStringSet: sameUniqueStringSetForRuntime,
    ensureNotesLoaded: async ids => { loads.push(ids); },
    upsertWritingThemeIndex: item => { commits.push(["upsert", item.id]); writingState.themeIndexes.push(item); },
    setSelectedWritingThemeIndex: id => { commits.push(["select", id]); writingState.selectedThemeIndexId = id; },
    clearWritingThemeRelationCounts: ids => {
      commits.push(["clear-relations", ids]);
      writingState.themeRelationNoteIds = ids;
      writingState.themeRelationCounts = {};
    },
    renderWritingPanel: () => { commits.push(["render"]); }
  };
  return {
    deps, state, writingState, commits, loads,
    setVaultPath: value => { vaultPath = value; },
    setCallerCurrent: value => { callerCurrent = value; },
    run: id => selectWritingThemeForRuntime(id, deps, { isCurrent: () => callerCurrent })
  };
}

function pauseAt(h, stage) {
  const gate = deferred(), reached = deferred();
  const item = { id: "incoming-theme", item_note_ids: ["incoming-note"] };
  if (stage === "theme fetch") {
    h.deps.fetchIndexCard = () => { reached.resolve(); return gate.promise; };
  } else {
    h.deps.fetchIndexCard = async () => item;
    h.deps.ensureNotesLoaded = ids => { h.loads.push(ids); reached.resolve(); return gate.promise; };
  }
  return { reached: reached.promise, resume: () => gate.resolve(item), reject: gate.reject };
}

function assertUnpublished(h) {
  assert.deepEqual(h.commits, []);
  assert.deepEqual(h.writingState.themeIndexes.map(item => item.id), ["previous-theme"]);
  assert.deepEqual(h.writingState.themeNoteDetailIds, ["previous-note"]);
  assert.deepEqual(h.writingState.themeRelationCounts, { "previous-note": 3 });
  assert.equal(h.writingState.loadingThemeNoteDetails, true);
}

test("a selected theme is published after its notes load and clears unrelated relation counts", async () => {
  const h = harness(), paused = pauseAt(h, "note load");
  const work = h.run("incoming-theme");
  await paused.reached;
  assertUnpublished(h);
  paused.resume();
  assert.equal((await work).id, "incoming-theme");
  assert.equal(h.writingState.selectedThemeIndexId, "incoming-theme");
  assert.deepEqual(h.writingState.themeNoteDetailIds, ["incoming-note"]);
  assert.deepEqual(h.writingState.themeRelationCounts, {});
  assert.equal(h.writingState.loadingThemeNoteDetails, false);
  assert.deepEqual(h.commits, [["upsert", "incoming-theme"], ["select", "incoming-theme"], ["clear-relations", ["incoming-note"]], ["render"]]);
});

test("selecting a theme with the same hydrated notes preserves existing relation work", async () => {
  const h = harness({ loadedIds: ["second", "first"], relationIds: ["first", "second"] });
  const counts = { first: 2, second: 4 };
  h.writingState.themeRelationCounts = counts;
  h.deps.fetchIndexCard = async id => ({ id, item_note_ids: ["first", "second", "first"] });
  await h.run("incoming-theme");
  assert.deepEqual(h.loads, [["first", "second"]]);
  assert.equal(h.writingState.themeRelationCounts, counts);
  assert.equal(h.commits.some(([action]) => action === "clear-relations"), false);
});

const contextChanges = [
  ["page", h => { h.state.module = "explorer"; }],
  ["a page round trip", h => {
    beginAppNavigation(h.state); h.state.module = "settings";
    beginAppNavigation(h.state); h.state.module = "writing";
  }],
  ["vault identity", h => { h.state.noteMoveVaultScope = {}; }],
  ["vault path", h => { h.setVaultPath("vault-b"); }],
  ["project revision", h => { h.writingState.projectOpenRevision++; }],
  ["selected theme", h => { h.writingState.selectedThemeIndexId = "manually-selected"; }],
  ["caller ownership", h => { h.setCallerCurrent(false); }],
  ["vault switching", h => { h.state.noteMoveVaultSwitching = true; }],
  ["uncertain vault", h => { h.state.noteMoveVaultUncertain = true; }],
  ["unresolved move", h => { h.state.unresolvedNoteMove = { noteId: "moving-note" }; }]
];

test("capturing navigation keeps the calling entry active until a later navigation begins", () => {
  const state = { noteMoveVaultScope: {} };
  const owner = beginAppNavigation(state);
  const captured = captureAppNavigation(state);
  assert.equal(owner(), true);
  assert.equal(captured(), true);
  beginAppNavigation(state);
  assert.equal(owner(), false);
  assert.equal(captured(), false);
});

for (const stage of ["theme fetch", "note load"]) {
  for (const [label, change] of contextChanges) {
    test(`${label} changing during ${stage} prevents old theme publication`, async () => {
      const h = harness(), paused = pauseAt(h, stage);
      const work = h.run("incoming-theme");
      await paused.reached;
      change(h);
      paused.resume();
      assert.equal(await work, null);
      assertUnpublished(h);
      if (stage === "theme fetch") assert.deepEqual(h.loads, []);
    });
  }

  test(`a newer selection owns the result even if the older ${stage} finishes first`, async () => {
    const h = harness(), oldGate = deferred(), newGate = deferred(), oldReached = deferred();
    const first = { id: "first", item_note_ids: ["first-note"] };
    const second = { id: "second", item_note_ids: ["second-note"] };
    h.deps.fetchIndexCard = id => {
      if (id === "second") return newGate.promise;
      if (stage === "theme fetch") { oldReached.resolve(); return oldGate.promise; }
      return Promise.resolve(first);
    };
    h.deps.ensureNotesLoaded = ids => {
      h.loads.push(ids);
      if (stage === "note load" && ids.includes("first-note")) { oldReached.resolve(); return oldGate.promise; }
      return Promise.resolve();
    };
    const older = h.run("first");
    await oldReached.promise;
    const newer = h.run("second");
    oldGate.resolve(first);
    assert.equal(await older, null);
    assertUnpublished(h);
    newGate.resolve(second);
    assert.equal(await newer, second);
    assert.equal(h.writingState.selectedThemeIndexId, "second");
    assert.deepEqual(h.commits.filter(([action]) => action === "upsert"), [["upsert", "second"]]);
  });

  test(`a current error during ${stage} remains visible to the caller`, async () => {
    const h = harness(), paused = pauseAt(h, stage), error = new Error("local service unavailable");
    const work = h.run("incoming-theme");
    await paused.reached;
    const rejected = assert.rejects(work, actual => actual === error);
    paused.reject(error);
    await rejected;
    assertUnpublished(h);
  });

  test(`an obsolete error during ${stage} cannot surface on a different page`, async () => {
    const h = harness(), paused = pauseAt(h, stage);
    const work = h.run("incoming-theme");
    await paused.reached;
    h.state.module = "explorer";
    paused.reject(new Error("old request failed"));
    assert.equal(await work, null);
    assertUnpublished(h);
  });
}

test("newly typed draft content during note loading prevents a theme switch", async () => {
  const h = harness(), paused = pauseAt(h, "note load");
  const work = h.run("incoming-theme");
  await paused.reached;
  h.writingState.draftSaveState = "dirty";
  h.writingState.draftMarkdown = "我刚刚写下的文章内容。";
  const rejected = assert.rejects(work, /草稿还有未保存内容/);
  paused.resume();
  await rejected;
  assertUnpublished(h);
  assert.equal(h.writingState.draftMarkdown, "我刚刚写下的文章内容。");
});

test("a dirty draft blocks a different theme before any read begins", async () => {
  const h = harness();
  h.writingState.draftSaveState = "dirty";
  let reads = 0;
  h.deps.fetchIndexCard = async () => { reads++; };
  await assert.rejects(h.run("incoming-theme"), /草稿还有未保存内容/);
  assert.equal(reads, 0);
  assertUnpublished(h);
});

test("refreshing the same theme keeps a dirty draft and does not demand navigation", async () => {
  const h = harness();
  h.writingState.draftSaveState = "dirty";
  h.writingState.draftMarkdown = "未保存的当前主题草稿。";
  assert.equal((await h.run("previous-theme")).id, "previous-theme");
  assert.equal(h.writingState.draftMarkdown, "未保存的当前主题草稿。");
  assert.equal(h.writingState.draftSaveState, "dirty");
});

test("a mismatched server response cannot select a different theme", async () => {
  const h = harness();
  h.deps.fetchIndexCard = async () => ({ id: "unexpected-theme", item_note_ids: ["other-note"] });
  assert.equal(await h.run("incoming-theme"), null);
  assertUnpublished(h);
  assert.deepEqual(h.loads, []);
});

test("an expired caller does not begin fetching", async () => {
  const h = harness();
  h.setCallerCurrent(false);
  let reads = 0;
  h.deps.fetchIndexCard = async () => { reads++; };
  assert.equal(await h.run("incoming-theme"), null);
  assert.equal(reads, 0);
  assertUnpublished(h);
});
