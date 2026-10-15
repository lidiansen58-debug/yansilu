import test from "node:test";
import assert from "node:assert/strict";
import { handleWritingCreateScaffoldClick } from "../../apps/web/src/writing-panel-events.js";

function fixture({ refreshFails = false, generationFails = false } = {}) {
  let release, started;
  const held = new Promise(resolve => { release = resolve; });
  const refreshing = new Promise(resolve => { started = resolve; });
  const writingState = { project: { id: "project", title: "Theme" }, projectOpenRevision: 1 };
  const state = { noteMoveVaultScope: 1 };
  let vault = "vault", generationCount = 0;
  const tabs = [], stages = [], messages = [], refreshes = [];
  const deps = { writingState, state, getVaultPath: () => vault,
    createDraftScaffold: async () => {
      generationCount++;
      if (generationFails) throw new Error("Generation unavailable");
      return { item: { id: "scaffold", sections: [{ heading: "Returned outline" }] } };
    },
    loadWritingProjectsList: async () => {
      refreshes.push("projects"); started(); await held;
      if (refreshFails) throw new Error("History unavailable");
    },
    loadWritingScaffoldVersions: async () => { refreshes.push("scaffolds"); },
    loadWritingDraftVersions: async () => { refreshes.push("drafts"); },
    applyWritingTab: tab => tabs.push(tab),
    showWritingResult: result => stages.push(result.stage),
    setStatus: (message, tone) => messages.push({ message, tone }) };
  return { deps, writingState, state, tabs, stages, messages, refreshes, release, refreshing,
    switchVault: () => { vault = "other-vault"; }, generationCount: () => generationCount };
}

test("a returned outline opens before slow history refresh and duplicate clicks do not regenerate", async () => {
  const f = fixture(), operation = handleWritingCreateScaffoldClick(f.deps);
  try {
    await f.refreshing;
    assert.equal(f.writingState.scaffold.id, "scaffold");
    assert.deepEqual([...f.tabs], ["outline"]);
    assert.equal(f.messages.at(-1).tone, "ok");
    await handleWritingCreateScaffoldClick(f.deps);
    assert.equal(f.generationCount(), 1);
  } finally { f.release(); await operation; }
  assert.equal(f.writingState.scaffoldGenerationPending, false);
});

test("failed history refresh retains the generated outline without a generation failure", async () => {
  const f = fixture({ refreshFails: true }), operation = handleWritingCreateScaffoldClick(f.deps);
  f.release(); await operation;
  assert.deepEqual(f.stages, ["draft_scaffold"]);
  assert.deepEqual(f.tabs, ["outline"]);
  assert.equal(f.writingState.scaffold.id, "scaffold");
  assert.equal(f.messages.at(-1).tone, "warn");
  assert.match(f.messages.at(-1).message, /提纲已生成/);
});

test("late history refresh preserves the user's tab and outline edits", async () => {
  const f = fixture(), operation = handleWritingCreateScaffoldClick(f.deps);
  try {
    await f.refreshing;
    f.tabs.push("user-draft");
    f.writingState.scaffold.sections[0].heading = "User's new heading";
  } finally { f.release(); await operation; }
  assert.equal(f.tabs.at(-1), "user-draft");
  assert.equal(f.writingState.scaffold.sections[0].heading, "User's new heading");
});

for (const change of ["project", "revision", "vault", "scope"]) {
  test(`history refresh stops following a changed ${change}`, async () => {
    const f = fixture(), operation = handleWritingCreateScaffoldClick(f.deps);
    try {
      await f.refreshing;
      if (change === "project") f.writingState.project = { id: "other-project" };
      if (change === "revision") f.writingState.projectOpenRevision++;
      if (change === "vault") f.switchVault();
      if (change === "scope") f.state.noteMoveVaultScope++;
    } finally { f.release(); await operation; }
    assert.deepEqual(f.refreshes, ["projects"]);
  });
}

test("an actual generation failure still reports failure without refreshing history", async () => {
  const f = fixture({ generationFails: true });
  await handleWritingCreateScaffoldClick(f.deps);
  assert.deepEqual(f.stages, ["draft_scaffold_error"]);
  assert.deepEqual(f.tabs, []);
  assert.deepEqual(f.refreshes, []);
  assert.equal(f.messages.at(-1).tone, "bad");
  assert.equal(f.writingState.scaffoldGenerationPending, false);
});
