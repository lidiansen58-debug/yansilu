import test from "node:test";
import assert from "node:assert/strict";
import { createGraphFollowupController } from "../../apps/web/src/graph-followup-controller.js";

function fixture() {
  const state = { notes: [{ id: "source", title: "来源" }], module: "graph", selectedFileId: "" };
  let vault = "vault-a", relation = null, field = null;
  const calls = [], intervals = new Map(), timeouts = [];
  const editor = { vaultScope: () => vault, activeNote: () => ({ id: state.selectedFileId }),
    findSemanticRelation: () => relation, permanentRelationWorkspaceState: { open: false },
    openEditRelationForm: id => calls.push(["edit", id]),
    jumpToInspectorSection: selector => calls.push(["focus", selector]),
    setDistillationPrefill: () => {}, renderRelated: () => {} };
  const runtime = createGraphFollowupController(() => ({ state, editor,
    activateModule: module => { state.module = module; }, openNoteById: id => { state.selectedFileId = id; },
    document: { querySelector: () => field }, EventCtor: class {},
    window: { setInterval: fn => { const id = intervals.size + 1; intervals.set(id, fn); return id; },
      clearInterval: id => intervals.delete(id), setTimeout: fn => timeouts.push(fn) }
  }));
  return { state, editor, calls, runtime, intervals, timeouts,
    setVault: value => { vault = value; }, setRelation: value => { relation = value; },
    setField: value => { field = value; }, tick: () => [...intervals.values()].forEach(fn => fn()) };
}

for (const change of ["note", "vault", "module", "new-action", "new-composer"]) {
  test(`pending relation followup cancels after ${change} changes`, () => {
    const f = fixture();
    f.runtime.openGraphFollowupNote("source", "relations-edit", { relationId: "relation" });
    if (change === "note") f.state.selectedFileId = "other";
    if (change === "vault") f.setVault("vault-b");
    if (change === "module") f.state.module = "graph";
    if (change === "new-action") f.runtime.openGraphFollowupNote("source", "open");
    if (change === "new-composer") f.editor.permanentRelationWorkspaceState.open = true;
    f.setRelation({ id: "relation" });
    f.tick();
    assert.equal(f.calls.some(call => call[0] === "edit"), false);
    assert.equal(f.intervals.size, 0);
  });
}

test("pending relation followup opens when data arrives but delayed focus cancels on note switch", () => {
  const f = fixture();
  f.runtime.openGraphFollowupNote("source", "relations-edit", { relationId: "relation" });
  f.setRelation({ id: "relation" });
  f.tick();
  assert.deepEqual(f.calls.filter(call => call[0] === "edit"), [["edit", "relation"]]);
  f.state.selectedFileId = "other";
  f.calls.length = 0;
  f.timeouts.forEach(fn => fn());
  assert.deepEqual(f.calls, []);
});

test("pending boundary followup never writes or focuses a field after vault switch", () => {
  const f = fixture();
  f.runtime.openGraphFollowupNote("source", "boundary");
  const field = { value: "", dispatchEvent: () => { throw new Error("stale field write"); } };
  f.setField(field);
  f.setVault("vault-b");
  f.calls.length = 0;
  f.tick();
  assert.equal(field.value, "");
  assert.deepEqual(f.calls, []);
  assert.equal(f.intervals.size, 0);
});
