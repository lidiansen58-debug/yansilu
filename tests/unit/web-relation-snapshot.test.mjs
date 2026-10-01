import test from "node:test";
import assert from "node:assert/strict";
import { beginRelationSnapshotRead, rememberRelationSnapshot, currentRelationSnapshot, clearRelationSnapshot } from "../../apps/web/src/relation-snapshot.js";

test("snapshot reads share note ownership and invalidate on vault changes and reset", () => {
  let vault = "a";
  const host = { vaultScope: () => vault };
  const oldRead = beginRelationSnapshotRead(host, "note");
  const otherNoteRead = beginRelationSnapshotRead(host, "other");
  const newRead = beginRelationSnapshotRead(host, "note");
  assert.equal(oldRead(), false);
  assert.equal(newRead(), true);
  assert.equal(otherNoteRead(), true);
  const otherHostRead = beginRelationSnapshotRead({ vaultScope: () => vault }, "note");
  vault = "b";
  assert.equal(newRead(), false);
  assert.equal(otherHostRead(), false);
  const resetRead = beginRelationSnapshotRead(host, "note");
  clearRelationSnapshot(host);
  assert.equal(resetRead(), false);
});

test("relation snapshots survive repeated reads of the same note and accept an empty replacement", () => {
  const host = { vaultScope: () => "vault-a" };
  const saved = { outgoingLinks: [{ id: "relation" }] }, empty = { outgoingLinks: [] };
  rememberRelationSnapshot(host, "note-a", saved);
  assert.equal(currentRelationSnapshot(host, "note-a"), saved);
  rememberRelationSnapshot(host, "note-a", null);
  assert.equal(currentRelationSnapshot(host, "note-a"), saved);
  rememberRelationSnapshot(host, "note-a", empty);
  assert.equal(currentRelationSnapshot(host, "note-a"), empty);
  clearRelationSnapshot(host);
  assert.equal(currentRelationSnapshot(host, "note-a"), null);
});

test("relation snapshots never leak into a different note, vault or editor host", () => {
  let vault = "vault-a";
  const host = { vaultScope: () => vault };
  rememberRelationSnapshot(host, "same-id", { outgoingLinks: [{ id: "old" }] });
  assert.equal(currentRelationSnapshot(host, "other-note"), null);
  assert.equal(currentRelationSnapshot({ vaultScope: () => vault }, "same-id"), null);
  vault = "vault-b";
  assert.equal(currentRelationSnapshot(host, "same-id"), null);
});
