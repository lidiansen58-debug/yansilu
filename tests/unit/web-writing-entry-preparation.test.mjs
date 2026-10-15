import test from "node:test";
import assert from "node:assert/strict";
import { prepareWritingEntryNote, renderWritingEntryPreparation } from "../../apps/web/src/writing-entry-preparation.js";

function fixture(overrides = {}) {
  const note = { id: "n", noteType: "permanent", title: "My view", body: "# My view\nA clear judgment.", fileRevision: "a".repeat(64), updatedAt: "1", status: "draft", authorship: { user_confirmed: false, ai_assisted: true } };
  const state = { notes: [note], tabs: [] };
  const writes = [];
  const deps = { state, getVaultPath: () => "test-vault", mapNoteItem: item => item, confirm: () => true, read: async () => ({ ...note }),
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
  assert.equal(writes[0].input.expectedBody, state.notes[0].body);
  assert.equal(writes[0].input.expectedRevision, "a".repeat(64));
  assert.equal(writes[0].input.expectedVaultPath, "test-vault");
  assert.equal(state.notes[0].status, "active");
});

test("cancelling confirmation does not write or add a note", async () => {
  const { writes, deps } = fixture({ confirm: () => false });
  assert.equal(await prepareWritingEntryNote("n", deps), false);
  assert.equal(writes.length, 0);
});

test("writing confirmation refreshes the open tab revision for subsequent editing", async () => {
  const { note, state, deps } = fixture();
  state.tabs = [{ noteId: "n", body: note.body, savedBody: note.body, savedFileRevision: note.fileRevision, dirty: false }];
  deps.update = async (_id, input) => ({ ...note, ...input, fileRevision: "b".repeat(64) });
  assert.equal(await prepareWritingEntryNote("n", deps), true);
  assert.equal(state.tabs[0].savedFileRevision, "b".repeat(64));
  assert.equal(state.tabs[0].savedBody, note.body);
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

test("writing preparation propagates a guarded write conflict without confirming client state", async () => {
  const { state, deps } = fixture({ update: async (_id, input) => {
    assert.equal(input.expectedRevision, "a".repeat(64));
    throw Object.assign(new Error("笔记正文或信息已在其他地方修改，本次未覆盖。"), { code: "NOTE_SAVE_CONFLICT" });
  } });
  await assert.rejects(prepareWritingEntryNote("n", deps), /本次未覆盖/);
  assert.equal(state.notes[0].authorship.user_confirmed, false);
  assert.equal(state.notes[0].status, "draft");
});

test("preparation is only shown for an ineligible permanent note", () => {
  const { note } = fixture();
  const deps = { escapeHtml: String, isWritingEligibleNote: () => false };
  assert.match(renderWritingEntryPreparation(note, deps), /确认并加入相关笔记/);
  assert.equal(renderWritingEntryPreparation({ ...note, noteType: "fleeting" }, deps), "");
  assert.equal(renderWritingEntryPreparation(note, { ...deps, isWritingEligibleNote: () => true }), "");
});

function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

for (const accepted of [false, true]) {
  test(`writing preparation waits for asynchronous decision (${accepted}) before any checking or writing`, async () => {
    const decision = deferred(), started = deferred();
    const h = fixture({ confirm: () => { started.resolve(); return decision.promise; } });
    let hydration = 0;
    h.deps.editor.linkedLiteratureForHydratedOriginality = async () => { hydration++; return []; };
    const pending = prepareWritingEntryNote("n", h.deps);
    await started.promise;
    assert.equal(hydration, 0);
    assert.deepEqual(h.writes, []);
    await assert.rejects(prepareWritingEntryNote("n", h.deps), /正在确认或检查/);
    decision.resolve(accepted);
    assert.equal(await pending, accepted);
    assert.equal(hydration, accepted ? 1 : 0);
    assert.equal(h.writes.length, accepted ? 1 : 0);
  });
}

for (const change of ["scope", "path", "switching", "uncertain", "move", "dirty", "module", "theme", "project", "title", "body", "revision", "authorship"]) {
  test(`late author approval aborts before originality work when ${change} changes`, async () => {
    const decision = deferred(), started = deferred();
    let vaultPath = "test-vault";
    const h = fixture({ getVaultPath: () => vaultPath, confirm: () => { started.resolve(); return decision.promise; }, writingState: { project: { id: "p1" }, selectedThemeIndexId: "t1" } });
    let hydration = 0;
    h.deps.editor.linkedLiteratureForHydratedOriginality = async () => { hydration++; return []; };
    const pending = prepareWritingEntryNote("n", h.deps);
    await started.promise;
    if (change === "scope") h.state.noteMoveVaultScope = {};
    if (change === "path") vaultPath = "new-vault";
    if (change === "switching") h.state.noteMoveVaultSwitching = true;
    if (change === "uncertain") h.state.noteMoveVaultUncertain = true;
    if (change === "move") h.state.unresolvedNoteMove = {};
    if (change === "dirty") h.state.tabs.push({ noteId: "n", dirty: true });
    if (change === "module") h.state.module = "explorer";
    if (change === "theme") h.deps.writingState.selectedThemeIndexId = "t2";
    if (change === "project") h.deps.writingState.project = { id: "p2" };
    if (change === "title") h.note.title = "Changed title";
    if (change === "body") h.note.body = "Changed body";
    if (change === "revision") h.note.fileRevision = "b".repeat(64);
    if (change === "authorship") h.note.authorship = { user_confirmed: true, ai_assisted: false };
    decision.resolve(true);
    await assert.rejects(pending);
    assert.equal(hydration, 0);
    assert.deepEqual(h.writes, []);
  });
}

test("native author confirmation error releases the pending guard for retry", async () => {
  const h = fixture({ confirm: async () => { throw new Error("native confirmation failed"); } });
  await assert.rejects(prepareWritingEntryNote("n", h.deps), /confirmation failed/);
  assert.deepEqual(h.writes, []);
  h.deps.confirm = async () => true;
  assert.equal(await prepareWritingEntryNote("n", h.deps), true);
});
