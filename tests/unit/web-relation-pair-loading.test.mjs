import test from "node:test";
import assert from "node:assert/strict";
import { PermanentRelationComposerController } from "../../apps/web/src/permanent-relation-composer-controller.js";
import { permanentRelationWorkspaceSelectedTarget } from "../../apps/web/src/permanent-relation-workspace-model.js";
import { renderRelationPairPreview } from "../../apps/web/src/relation-pair-preview.js";
import { renderPermanentRelationWorkspace } from "../../apps/web/src/permanent-relation-workspace.js";

function fixture() {
  const source = { id: "source", title: "Source", body: "Actual source content", bodyLoaded: true };
  const target = { id: "target", title: "Target", body: "# Target\n", bodyLoaded: false };
  let vault = "vault-a", applied = 0;
  const host = {
    state: { notes: [source, target] },
    permanentRelationWorkspaceState: { open: true, sourceNoteId: source.id, noteId: source.id,
      relationComposerSessionId: "session", selectedTargetNoteId: target.id, rationale: "Keep my reason" },
    vaultScope: () => vault,
    syncPermanentRelationWorkspaceOverlay() {},
    fetchNoteForResolution: async id => ({ id, title: "Target", body: "Actual target evidence" }),
    upsertApiNotes(items) { applied++; for (const item of items) Object.assign(host.state.notes.find(n => n.id === item.id), item, { bodyLoaded: true }); }
  };
  return { host, controller: new PermanentRelationComposerController(host), applied: () => applied, setVault: value => { vault = value; } };
}

test("search placeholders are not presented as actual target evidence", () => {
  const { host } = fixture();
  const target = permanentRelationWorkspaceSelectedTarget({ state: host.permanentRelationWorkspaceState, notes: host.state.notes });
  assert.equal(target.bodyLoaded, false);
  const html = renderRelationPairPreview({ note: host.state.notes[0], target });
  assert.match(html, /Actual source content/);
  assert.doesNotMatch(html, /# Target/);
});

test("selected search target loads actual content and preserves the user's reason", async () => {
  const { host, controller, applied } = fixture();
  const pending = controller.loadPairPreview();
  assert.equal(host.permanentRelationWorkspaceState.pairPreviewState, "loading");
  assert.equal(await pending, true);
  assert.equal(applied(), 1);
  assert.equal(host.state.notes[1].body, "Actual target evidence");
  assert.equal(host.permanentRelationWorkspaceState.pairPreviewState, "ready");
  assert.equal(host.permanentRelationWorkspaceState.rationale, "Keep my reason");
});

test("failed target read retains the draft and can be retried", async () => {
  const { host, controller } = fixture();
  host.fetchNoteForResolution = async () => { throw new Error("service unavailable"); };
  assert.equal(await controller.loadPairPreview(), false);
  assert.equal(host.permanentRelationWorkspaceState.pairPreviewState, "error");
  assert.match(host.permanentRelationWorkspaceState.pairPreviewError, /service unavailable/);
  assert.equal(host.permanentRelationWorkspaceState.rationale, "Keep my reason");
  host.fetchNoteForResolution = async id => ({ id, body: "Recovered actual evidence" });
  assert.equal(await controller.loadPairPreview(), true);
  assert.equal(host.permanentRelationWorkspaceState.pairPreviewError, "");
});

for (const change of ["vault", "session", "source", "target", "close"]) {
  test(`late target read is ignored after ${change} changes`, async () => {
    const { host, controller, applied, setVault } = fixture();
    let release;
    host.fetchNoteForResolution = () => new Promise(resolve => { release = resolve; });
    const pending = controller.loadPairPreview();
    if (change === "vault") setVault("vault-b");
    if (change === "session") host.permanentRelationWorkspaceState.relationComposerSessionId = "other";
    if (change === "source") host.permanentRelationWorkspaceState.sourceNoteId = "other";
    if (change === "target") host.permanentRelationWorkspaceState.selectedTargetNoteId = "other";
    if (change === "close") host.permanentRelationWorkspaceState.open = false;
    const state = host.permanentRelationWorkspaceState;
    release({ id: "target", body: "Obsolete content" });
    assert.equal(await pending, false);
    assert.equal(applied(), 0);
    assert.equal(host.permanentRelationWorkspaceState, state);
  });
}

test("reselecting the same target ignores an older in-flight read", async () => {
  const { host, controller } = fixture();
  const releases = [];
  host.fetchNoteForResolution = () => new Promise(resolve => releases.push(resolve));
  const old = controller.loadPairPreview();
  host.permanentRelationWorkspaceState.pairPreviewState = "";
  const current = controller.loadPairPreview();
  releases[1]({ id: "target", body: "Current evidence" });
  await current;
  releases[0]({ id: "target", body: "Obsolete evidence" });
  await old;
  assert.equal(host.state.notes[1].body, "Current evidence");
});

for (const state of ["loading", "error"]) {
  test(`submit does not mutate while actual evidence is ${state}`, async () => {
    const { host, controller } = fixture();
    host.permanentRelationWorkspaceState.pairPreviewState = state;
    await controller.submit(null);
    assert.equal(host.permanentRelationWorkspaceState.rationale, "Keep my reason");
  });
  test(`actual-evidence ${state} is visible and disables the save command`, () => {
    const { host } = fixture();
    const html = renderPermanentRelationWorkspace({ note: host.state.notes[0], notes: host.state.notes,
      state: { ...host.permanentRelationWorkspaceState, pairPreviewState: state,
        pairPreviewError: "Service unavailable", relationType: "associated_with", dirty: true } });
    assert.match(html, /type="submit" disabled/);
    assert.match(html, /Keep my reason/);
    if (state === "loading") assert.match(html, /正在读取双方笔记/);
    else assert.match(html, /Service unavailable[\s\S]*data-permanent-relation-preview-retry/);
  });
}
