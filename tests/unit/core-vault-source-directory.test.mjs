import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import fs from "node:fs/promises";
import os from "node:os";

import { createDirectory, createNoteInDirectory, initVault, readNote } from "../../packages/domain/src/index.mjs";

async function makeTempVault() {
  return fs.mkdtemp(path.join(os.tmpdir(), "yansilu-source-directory-vault-"));
}

test("createNoteInDirectory treats dir_source_default as source notes", async () => {
  const vaultPath = await makeTempVault();
  await initVault(vaultPath);

  const created = await createNoteInDirectory(vaultPath, {
    directoryId: "dir_source_default",
    title: "Source Directory Note",
    body: "# Source Directory Note\n\nSource body"
  });

  assert.match(created.id, /^src_/);
  assert.equal(created.noteType, "source");
  assert.equal(created.directoryId, "dir_source_default");
  assert.match(created.markdownPath, /^notes\/sources\//);

  const source = await readNote(vaultPath, "source", created.id);
  assert.equal(source.note.note_type, "source");
  assert.equal(source.note.title, "Source Directory Note");
  assert.equal(source.note.body, "Source body\n");
  assert.match(source.markdown, /^---[\s\S]*\nnote_type: source$/m);
});

test("createNoteInDirectory inherits source note type for custom child directories", async () => {
  const vaultPath = await makeTempVault();
  await initVault(vaultPath);

  const child = await createDirectory(vaultPath, {
    title: "Source Child",
    parentDirectoryId: "dir_source_default",
    directoryType: "custom",
    fsPath: path.join(vaultPath, "notes", "sources", "child")
  });

  const created = await createNoteInDirectory(vaultPath, {
    directoryId: child.id,
    title: "Nested Source",
    body: "# Nested Source\n\nBody"
  });

  assert.match(created.id, /^src_/);
  assert.equal(created.noteType, "source");
  assert.equal(created.directoryId, child.id);
  assert.match(created.markdownPath, /^notes\/sources\/child\//);

  const source = await readNote(vaultPath, "source", created.id);
  assert.equal(source.note.note_type, "source");
  assert.equal(source.note.title, "Nested Source");
  assert.equal(source.note.body, "Body\n");
});
