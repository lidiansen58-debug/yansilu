import test from "node:test";
import assert from "node:assert/strict";
import { prepareWritingEntryNote, renderWritingEntryPreparation } from "../../apps/web/src/writing-entry-preparation.js";

function fixture(overrides = {}) {
  const note = { id: "n", noteType: "permanent", title: "My view", body: "# My view\nA clear judgment.", updatedAt: "1", status: "draft", authorship: { user_confirmed: false, ai_assisted: true } };
  const state = { notes: [note], tabs: [] };
  const writes = [];
  const deps = { state, mapNoteItem: item => item, confirm: () => true, read: async () => ({ ...note }),
    editor: { linkedLiteratureForHydratedOriginality: async () => [], originalityPayloadFromLiterature: () => ({}) },
    check: async payload => { assert.equal(payload.originalityPlan.requireCitationLocator, false); return { originalityGuard: { evaluations: [{ permanentId: "n", status: "pass", similarity: 0 }] } }; },
    update: async (id, input) => { writes.push({ id, input }); return { ...note, ...input }; }, ...overrides };
  return { note, state, writes, deps };
}

test("writing preparation requires confirmation and preserves AI attribution", async () => {
  const { state, writes, deps } = fixture();
  assert.equal(await prepareWritingEntryNote("n", deps), true);
  assert.equal(writes.length, 1);
  assert.deepEqual(writes[0].input.authorship, { user_confirmed: true, ai_assisted: true });
  assert.equal(writes[0].input.body, undefined);
  assert.equal(state.notes[0].status, "active");
});

test("cancelling confirmation does not write or add a note", async () => {
  const { writes, deps } = fixture({ confirm: () => false });
  assert.equal(await prepareWritingEntryNote("n", deps), false);
  assert.equal(writes.length, 0);
});

for (const status of ["warning", "blocked", "missing"]) {
  test(`writing preparation does not bypass ${status} originality result`, async () => {
    const { writes, deps } = fixture({ check: async () => ({ originalityGuard: { evaluations: [{ permanentId: "n", status }] } }) });
    await assert.rejects(prepareWritingEntryNote("n", deps));
    assert.equal(writes.length, 0);
  });
}

test("writing preparation protects unsaved edits", async () => {
  const { state, writes, deps } = fixture();
  state.tabs = [{ noteId: "n", dirty: true }];
  await assert.rejects(prepareWritingEntryNote("n", deps), /未保存/);
  assert.equal(writes.length, 0);
});

test("writing preparation rejects a vault switch during checking", async () => {
  const { state, writes, deps } = fixture();
  deps.check = async () => { state.noteMoveVaultScope = {}; return {}; };
  await assert.rejects(prepareWritingEntryNote("n", deps), /笔记库/);
  assert.equal(writes.length, 0);
});

test("writing preparation rejects content changed during checking", async () => {
  const { note, writes, deps } = fixture();
  let reads = 0;
  deps.read = async () => ({ ...note, body: ++reads === 1 ? note.body : "Changed" });
  await assert.rejects(prepareWritingEntryNote("n", deps), /发生了变化/);
  assert.equal(writes.length, 0);
});

test("preparation is only shown for an ineligible permanent note", () => {
  const { note } = fixture();
  const deps = { escapeHtml: String, isWritingEligibleNote: () => false };
  assert.match(renderWritingEntryPreparation(note, deps), /确认并加入相关笔记/);
  assert.equal(renderWritingEntryPreparation({ ...note, noteType: "fleeting" }, deps), "");
  assert.equal(renderWritingEntryPreparation(note, { ...deps, isWritingEligibleNote: () => true }), "");
});
