import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { initVault, createNoteInDirectory, getNoteById } from "../../packages/domain/src/index.mjs";
import { createNoteCreationController } from "../../apps/web/src/note-creation-controller.js";

test("ordinary creation after refresh opens the persisted file without changing it", async t => {
  const vault = await fs.mkdtemp(path.join(os.tmpdir(), "yansilu-create-refresh-"));
  t.after(() => fs.rm(vault, { recursive: true, force: true }));
  await initVault(vault);
  const records = new Map();
  const storage = { getItem: key => records.get(key) ?? null, setItem: (key, value) => records.set(key, value), removeItem: key => records.delete(key) };
  let writes = 0, persisted;
  const controller = () => {
    const state = { notes: [], tabs: [], selectedFolderId: "dir_original_default" };
    const opened = [];
    return { state, opened, create: createNoteCreationController({
      state, getVaultPath: () => vault, getStorage: () => storage,
      folderById: () => ({}), findUntitledPlaceholder: async () => null,
      isLocalOnlyNote: () => false, initialBodyForFolder: () => "# First note\n\nOriginal input",
      mapNoteItem: item => ({ ...item, bodyLoaded: true }), ensureEditableNoteBody: value => value,
      createId: () => "12345678-1234-1234-1234-123456789abc",
      createNote: async input => {
        writes++;
        persisted = await createNoteInDirectory(vault, { id: `note_${input.clientCreationId}`, directoryId: input.directoryId, body: input.body });
        throw Object.assign(new Error("Response lost after disk write"), { code: "api_unavailable" });
      },
      fetchNote: async id => getNoteById(vault, id),
      openNoteById: id => opened.push(id), openStandaloneEditorWindow: id => opened.push(id)
    }) };
  };
  // Block readback until the original client has gone away.
  const blockedState = { notes: [], tabs: [], selectedFolderId: "dir_original_default" };
  const first = createNoteCreationController({
    state: blockedState, getVaultPath: () => vault, getStorage: () => storage,
    folderById: () => ({}), findUntitledPlaceholder: async () => null,
    isLocalOnlyNote: () => false, initialBodyForFolder: () => "# First note\n\nOriginal input",
    mapNoteItem: item => item, ensureEditableNoteBody: value => value,
    createId: () => "12345678-1234-1234-1234-123456789abc",
    createNote: async input => {
      writes++;
      persisted = await createNoteInDirectory(vault, { id: `note_${input.clientCreationId}`, directoryId: input.directoryId, body: input.body });
      throw Object.assign(new Error("Response lost"), { code: "api_unavailable" });
    },
    fetchNote: async () => { throw new Error("Read unavailable"); },
    openNoteById: () => assert.fail("not yet confirmed"), openStandaloneEditorWindow: () => {}
  });
  assert.equal((await first()).error.code, "creation_pending");
  const file = path.join(vault, persisted.markdownPath);
  const bytes = await fs.readFile(file);
  const modified = (await fs.stat(file)).mtimeMs;
  const refreshed = controller();
  assert.equal((await refreshed.create()).note.id, persisted.id);
  assert.equal(writes, 1);
  assert.deepEqual(refreshed.opened, [persisted.id]);
  assert.deepEqual(await fs.readFile(file), bytes);
  assert.equal((await fs.stat(file)).mtimeMs, modified);
  assert.equal(records.size, 0);
});
