import test from "node:test";
import assert from "node:assert/strict";
import { PermanentRelationComposerController } from "../../apps/web/src/permanent-relation-composer-controller.js";

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
