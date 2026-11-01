import test from "node:test";
import assert from "node:assert/strict";
import { createWritingManualThemeController } from "../../apps/web/src/writing-manual-theme-controller.js";

function setup() {
  const input = { value: "", focus() {} };
  let basket = ["previous-source"];
  const calls = [];
  const deps = {
    state: { noteMoveVaultScope: {} }, writingState: { projects: [] },
    $: id => id === "writingTitle" ? input : null,
    parseWritingBasketIds: () => basket,
    setWritingBasketIds: ids => { basket = ids; },
    resetWritingStrongModelState() {}, resetWritingLocalBookIdeas() {}, clearWritingSourceIndexIds() {},
    setSelectedWritingThemeIndex: id => { deps.writingState.selectedThemeIndexId = id; },
    resetWritingProjectContext: () => { deps.writingState.project = null; input.value = ""; },
    openTheme: () => calls.push("theme"), openDraft: () => calls.push("draft"),
    createWritingProject: async payload => { calls.push(payload); return { id: "project", title: payload.title, entry_mode: payload.entryMode, basket_note_ids: payload.basketNoteIds, related_index_ids: [] }; }
  };
  return { deps, input, calls, controller: createWritingManualThemeController(deps) };
}

test("new theme opens the existing form with no prompts or material prerequisite", () => {
  const { controller, deps, input, calls } = setup();
  controller.begin();
  assert.equal(deps.writingState.manualThemeEntry, true);
  assert.equal(input.value, "");
  assert.deepEqual(deps.parseWritingBasketIds(), []);
  assert.deepEqual(calls, ["theme"]);
});

for (const noteIds of [[], ["one-source"]]) test(`a thought starts a draft with ${noteIds.length} sources and no outline`, async () => {
  const { controller, deps, input, calls } = setup();
  controller.begin();
  input.value = "我想说清楚的一件事";
  deps.setWritingBasketIds(noteIds);
  await controller.start();
  assert.equal(calls[1].title, input.value);
  assert.deepEqual(calls[1].basketNoteIds, noteIds);
  assert.equal(calls[1].requireEligibleSources, true);
  assert.equal(calls[2], "draft");
  assert.equal(deps.writingState.scaffold, undefined);
});

test("blank input does not create an article", async () => {
  const { controller, input, calls } = setup();
  controller.begin(); input.value = "  ";
  assert.equal(await controller.start(), null);
  assert.deepEqual(calls, ["theme"]);
});

test("repeated start clicks share a request, failure keeps text for retry", async () => {
  const { controller, deps, input, calls } = setup();
  controller.begin(); input.value = "保留我的想法";
  const create = deps.createWritingProject;
  deps.createWritingProject = async () => { throw new Error("disk full"); };
  const first = controller.start();
  assert.equal(first, controller.start());
  await assert.rejects(first, /disk full/);
  assert.equal(input.value, "保留我的想法");
  assert.deepEqual(calls, ["theme"]);
  deps.createWritingProject = create;
  await controller.start();
  assert.equal(calls.at(-1), "draft");
});

test("late response from another vault cannot open a draft", async () => {
  const { controller, deps, input, calls } = setup();
  controller.begin(); input.value = "My thought";
  deps.createWritingProject = async () => { deps.state.noteMoveVaultScope = {}; return { id: "stale" }; };
  await assert.rejects(controller.start(), /已切换/);
  assert.equal(deps.writingState.project, null);
  assert.deepEqual(calls, ["theme"]);
});

for (const status of ["dirty", "saving", "error"]) test(`new theme preserves a ${status} draft`, () => {
  const { controller, deps, calls } = setup();
  deps.writingState.draftSaveState = status;
  assert.throws(() => controller.begin(), /草稿/);
  assert.deepEqual(calls, []);
});
