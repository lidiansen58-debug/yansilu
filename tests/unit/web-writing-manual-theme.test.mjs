import test from "node:test";
import assert from "node:assert/strict";
import { createWritingManualThemeController } from "../../apps/web/src/writing-manual-theme-controller.js";

function setup() {
  const notes = ["a", "b", "c"].map(id => ({ id, title: `Note ${id}`, body: `Judgment ${id}`, eligible: true }));
  const calls = { prompts: [], creates: [], opens: [], selections: [], upserts: [] };
  const answers = ["A manual article", "When does explaining a concept show understanding?"];
  const deps = {
    state: {},
    writingState: {},
    parseWritingBasketIds: () => notes.map(note => note.id),
    writingThemeIndexScopeDirectoryId: () => "original",
    async ensureNotesLoaded() {},
    writingNoteById: id => notes.find(note => note.id === id),
    writingNoteEligibility: note => ({ ok: Boolean(note?.eligible), message: note?.eligibilityMessage || "这条永久笔记还没完成作者确认。" }),
    async requestTextInput(options) { calls.prompts.push(options); return answers.shift(); },
    async createIndexCard(payload) { calls.creates.push(payload); return { id: "theme-1", ...payload }; },
    upsertWritingThemeIndex(card) { calls.upserts.push(card); },
    async useThemeIndexAsWritingEntry(id, options) { calls.selections.push({ id, options }); },
    openTheme() { calls.opens.push(true); }
  };
  return { deps, notes, calls, answers, controller: createWritingManualThemeController(deps) };
}

test("manual theme persists the user's question and opens the selected theme without AI", async () => {
  const { controller, calls } = setup();
  const card = await controller.save();
  assert.equal(card.id, "theme-1");
  assert.deepEqual(calls.creates[0].noteIds, ["a", "b", "c"]);
  assert.equal(calls.creates[0].title, "A manual article");
  assert.equal(calls.creates[0].centralQuestion, "When does explaining a concept show understanding?");
  assert.equal(calls.creates[0].orderingStrategy, "manual");
  assert.doesNotMatch(calls.creates[0].thesis, /聚集|本地关系|共同信号/);
  assert.equal(calls.selections[0].id, "theme-1");
  const { assertCurrent, ...options } = calls.selections[0].options;
  assert.equal(typeof assertCurrent, "function");
  assert.deepEqual(options, { replaceBasket: true, resetContext: true, source: "writing_manual_theme" });
  assert.equal(calls.upserts.length, 1);
  assert.equal(calls.opens.length, 1);
});

for (const cancelAt of [0, 1]) {
  test(`cancel at input ${cancelAt} does not create or select a theme`, async () => {
    const { controller, calls, answers } = setup();
    answers[cancelAt] = "";
    assert.equal(await controller.save(), null);
    assert.equal(calls.creates.length, 0);
    assert.equal(calls.selections.length, 0);
  });
}

test("insufficient or ineligible notes do not start theme input", async () => {
  const { controller, deps, notes, calls } = setup();
  deps.parseWritingBasketIds = () => ["a", "b", "b"];
  await assert.rejects(controller.save(), /至少 3 条/);
  deps.parseWritingBasketIds = () => ["a", "b", "c"];
  notes[1].eligible = false;
  await assert.rejects(controller.save(), /作者确认/);
  assert.equal(calls.prompts.length, 0);
  assert.equal(calls.creates.length, 0);
});

test("a confirmed note failing originality reports its title and actual blocker", async () => {
  const { controller, notes, calls } = setup();
  notes[1].eligible = false;
  notes[1].eligibilityMessage = "这条永久笔记还未通过原创性检查，请检查后再加入写作。";
  await assert.rejects(controller.save(), error => {
    assert.match(error.message, /Note b.*原创性检查/);
    assert.match(error.message, /相关笔记/);
    assert.doesNotMatch(error.message, /作者确认|draft/);
    return true;
  });
  assert.equal(calls.prompts.length, 0);
  assert.equal(calls.creates.length, 0);
});

test("eligibility changed during input reports the current blocker without creating a theme", async () => {
  const { controller, deps, notes, calls } = setup();
  deps.requestTextInput = async () => {
    notes[2].eligible = false;
    notes[2].eligibilityMessage = "这条永久笔记还未通过原创性检查，请检查后再加入写作。";
    return "Article";
  };
  await assert.rejects(controller.save(), /Note c.*原创性检查/);
  assert.equal(calls.creates.length, 0);
});

test("vault or selection changes while collecting input prevent persistence", async () => {
  for (const change of [(deps) => { deps.state.noteMoveVaultScope = {}; }, (_deps, notes) => { notes.pop(); }]) {
    const { controller, deps, notes, calls } = setup();
    deps.requestTextInput = async () => { change(deps, notes); return "Article"; };
    await assert.rejects(controller.save(), /已改变/);
    assert.equal(calls.creates.length, 0);
    assert.equal(calls.opens.length, 0);
  }
});

test("late create response from a different vault cannot select a theme", async () => {
  const { controller, deps, calls } = setup();
  deps.createIndexCard = async payload => { deps.state.noteMoveVaultScope = {}; return { id: "old-theme", ...payload }; };
  await assert.rejects(controller.save(), /已改变/);
  assert.equal(calls.upserts.length, 0);
  assert.equal(calls.selections.length, 0);
});

test("save failure retains input for retry and does not show a theme", async () => {
  const { controller, deps, calls, answers } = setup();
  const create = deps.createIndexCard;
  deps.createIndexCard = async () => { throw new Error("disk full"); };
  await assert.rejects(controller.save(), /disk full/);
  assert.equal(calls.opens.length, 0);
  answers.push("A manual article", "When does explaining a concept show understanding?");
  deps.createIndexCard = create;
  await controller.save();
  assert.equal(calls.prompts[2].value, "A manual article");
  assert.equal(calls.prompts[3].value, "When does explaining a concept show understanding?");
});

test("opening failure retries the saved theme instead of creating a duplicate", async () => {
  const { controller, deps, calls } = setup();
  const select = deps.useThemeIndexAsWritingEntry;
  deps.useThemeIndexAsWritingEntry = async () => { throw new Error("read failed"); };
  await assert.rejects(controller.save(), /read failed/);
  deps.useThemeIndexAsWritingEntry = select;
  await controller.save();
  assert.equal(calls.creates.length, 1);
  assert.equal(calls.prompts.length, 2);
  assert.equal(calls.opens.length, 1);
});

test("repeated save clicks share one operation", async () => {
  const { controller, calls } = setup();
  const first = controller.save();
  const second = controller.save();
  assert.equal(first, second);
  await first;
  assert.equal(calls.creates.length, 1);
});

test("unsaved or saving drafts cannot be reset by creating a new theme", async () => {
  for (const draftSaveState of ["dirty", "saving", "error"]) {
    const { controller, deps, calls } = setup();
    deps.writingState.draftSaveState = draftSaveState;
    await assert.rejects(controller.save(), /草稿完成保存/);
    assert.equal(calls.prompts.length, 0);
    assert.equal(calls.creates.length, 0);
  }
});

test("a project change during input prevents creating a stale theme", async () => {
  const { controller, deps, calls } = setup();
  deps.requestTextInput = async () => { deps.writingState.project = { id: "new-project" }; return "Article"; };
  await assert.rejects(controller.save(), /写作内容已切换/);
  assert.equal(calls.creates.length, 0);
});

test("selecting the newly saved theme may intentionally change the writing context", async () => {
  const { controller, deps, calls } = setup();
  deps.useThemeIndexAsWritingEntry = async id => { deps.writingState.selectedThemeIndexId = id; };
  await controller.save();
  assert.equal(calls.opens.length, 1);
});

test("hydration of the saved theme rechecks context before activating it", async () => {
  const { controller, deps, calls } = setup();
  deps.useThemeIndexAsWritingEntry = async (_id, options) => {
    deps.state.noteMoveVaultScope = {};
    options.assertCurrent();
  };
  await assert.rejects(controller.save(), /已改变/);
  assert.equal(calls.opens.length, 0);
});
