import test from "node:test";
import assert from "node:assert/strict";
import { loadStartupVaultNotes } from "../../apps/web/src/startup-vault-notes.js";

test("startup loads every root so material-only libraries are not presented as empty", async () => {
  const calls = [];
  await loadStartupVaultNotes({ state: { browserRootId: "permanent", folders: [
    { id: "permanent" }, { id: "fleeting" }, { id: "literature" }, { id: "nested", parentId: "literature" }
  ] }, syncNotesForDirectoryTree: async id => calls.push(id) });
  assert.deepEqual(calls, ["permanent", "fleeting", "literature"]);
});

test("startup still loads its selected scope without directory metadata and does not mask a failure", async () => {
  const calls = [];
  await loadStartupVaultNotes({ state: { browserRootId: "selected" }, syncNotesForDirectoryTree: async id => calls.push(id) });
  assert.deepEqual(calls, ["selected"]);
  await assert.rejects(loadStartupVaultNotes({ state: { browserRootId: "bad" }, syncNotesForDirectoryTree: async () => { throw new Error("材料目录无法读取"); } }), /材料目录无法读取/);
});
