import test from "node:test";
import assert from "node:assert/strict";
import { rememberRelationSnapshot, currentRelationSnapshot, clearRelationSnapshot } from "../../apps/web/src/relation-snapshot.js";

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
