import test from "node:test";
import assert from "node:assert/strict";
import { PermanentRelationComposerController } from "../../apps/web/src/permanent-relation-composer-controller.js";

test("a redundant search change event preserves the newly selected target", () => {
  const draft = { manualQuery: "same query", selectedTargetNoteId: "selected" };
  const host = { permanentRelationWorkspaceState: draft };
  new PermanentRelationComposerController(host).queueManualSearch({ value: "same query" });
  assert.equal(host.permanentRelationWorkspaceState, draft);
  assert.equal(draft.selectedTargetNoteId, "selected");
});

for (const change of ["vault", "session", "note"]) {
  test(`editing target search clears the old choice immediately and cancels queued work after ${change} changes`, () => {
    let callback, vault = "vault-a", searches = 0;
    const submit = { disabled: false }, source = { id: "source" };
    const host = { state: { notes: [source] }, activeNote: () => source, vaultScope: () => vault,
      permanentRelationSearchSerial: 0, permanentRelationWorkspaceState: {
        sourceNoteId: source.id, noteId: source.id, relationComposerSessionId: "session-a", selectedTargetNoteId: "old-target"
      }, windowRef: { clearTimeout: () => {}, setTimeout: fn => { callback = fn; } },
      syncPermanentRelationManualResults: () => {}, permanentRelationWorkspaceElement: () => ({ querySelector: () => submit }) };
    const controller = new PermanentRelationComposerController(host);
    controller.refreshManualSearch = () => { searches++; };
    controller.queueManualSearch({ value: "new query" });
    assert.equal(host.permanentRelationWorkspaceState.selectedTargetNoteId, "");
    assert.equal(submit.disabled, true);
    if (change === "vault") vault = "vault-b";
    if (change === "session") host.permanentRelationWorkspaceState.relationComposerSessionId = "session-b";
    if (change === "note") host.permanentRelationWorkspaceState.sourceNoteId = "other";
    callback();
    assert.equal(searches, 0);
  });
}

test("a missing explicit relation source does not fall back to a different active note", () => {
  const active = { id: "active" };
  const host = { state: { notes: [active] }, activeNote: () => active,
    permanentRelationWorkspaceState: { sourceNoteId: "deleted-source" } };
  const controller = new PermanentRelationComposerController(host);
  assert.equal(controller.sourceNote(), null);
  host.permanentRelationWorkspaceState = {};
  assert.equal(controller.sourceNote(), active);
});

for (const fail of [false, true]) {
  test(`relation search ignores an old vault ${fail ? "error" : "result"} even when note and session ids match`, async t => {
    const originalFetch = globalThis.fetch;
    t.after(() => { globalThis.fetch = originalFetch; });
    let resolve, reject, entered;
    const held = new Promise((done, failed) => { resolve = done; reject = failed; });
    const started = new Promise(done => { entered = done; });
    globalThis.fetch = async () => { entered(); return held; };
    let scope = "vault-a";
    let inserted = 0;
    const note = { id: "source" };
    const host = { state: { notes: [note] }, activeNote: () => note, vaultScope: () => scope,
      permanentRelationSearchSerial: 0,
      permanentRelationWorkspaceState: { sourceNoteId: note.id, noteId: note.id, relationComposerSessionId: "same-session" },
      syncPermanentRelationManualResults: () => {}, relationTargetSearchRootId: () => "root",
      upsertApiNotes: () => { inserted++; } };
    const running = new PermanentRelationComposerController(host).refreshManualSearch("query");
    await started;
    scope = "vault-b";
    const currentDraft = { ...host.permanentRelationWorkspaceState, error: "", manualTargets: [{ id: "new-vault" }] };
    host.permanentRelationWorkspaceState = currentDraft;
    if (fail) reject(new Error("old vault error"));
    else resolve(new Response(JSON.stringify({ items: [{ id: "old-vault" }] }), { status: 200 }));
    await running;
    assert.equal(inserted, 0);
    assert.equal(host.permanentRelationWorkspaceState, currentDraft);
  });
}
