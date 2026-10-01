import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { SQLITE_DB_FILES } from "../../packages/domain/src/sqlite-migrations.mjs";
import { initVault, createNoteInDirectory, updateNoteContent, getNoteById, listNoteRelations, searchNotes, registerMarkdownNoteInCatalog } from "../../packages/domain/src/index.mjs";

async function vault(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "yansilu-rename-links-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  await initVault(root);
  return root;
}

async function note(root, title, text = "") {
  return createNoteInDirectory(root, { directoryId: "dir_fleeting_default", body: `# ${title}\n\n${text}` });
}

test("renaming retains old title and path links without rewriting referring files", async t => {
  const root = await vault(t);
  const source = await note(root, "Original source", "Source evidence.");
  const reference = await note(root, "My judgment", `[[Original source]]\n[[${source.markdownPath}]]`);
  const referenceBytes = await fs.readFile(path.join(root, reference.markdownPath), "utf8");
  const renamed = await updateNoteContent(root, source.id, { body: "# Renamed source\n\nSource evidence." });
  assert.equal(renamed.id, source.id);
  assert.ok(renamed.linkAliases.includes("Original source"));
  assert.ok(renamed.linkAliases.includes(source.markdownPath));
  assert.equal(await fs.readFile(path.join(root, reference.markdownPath), "utf8"), referenceBytes);
  await updateNoteContent(root, reference.id, { body: reference.body });
  assert.deepEqual((await listNoteRelations(root, reference.id)).outgoingLinks.map(x => x.toNoteId), [source.id]);
  assert.equal((await searchNotes(root, { query: "Original source" })).items[0].id, source.id);
  assert.equal((await searchNotes(root, { query: "fleeting/Original source.md" })).items[0].id, source.id);
  assert.ok((await getNoteById(root, source.id)).linkAliases.includes("Original source"));
});

test("repeated renames and Markdown-only catalog registration preserve earlier names", async t => {
  const root = await vault(t);
  const source = await note(root, "First source");
  await updateNoteContent(root, source.id, { body: "# Second source" });
  const renamed = await updateNoteContent(root, source.id, { body: "# Third source" });
  const restored = await vault(t);
  await fs.copyFile(path.join(root, renamed.markdownPath), path.join(restored, renamed.markdownPath));
  await registerMarkdownNoteInCatalog(restored, { noteId: source.id, noteType: source.noteType, title: renamed.title, markdownPath: renamed.markdownPath, directoryId: source.directoryId });
  for (const title of ["First source", "Second source"]) {
    const reference = await note(restored, `Reference to ${title}`, `[[${title}]]`);
    assert.deepEqual((await listNoteRelations(restored, reference.id)).outgoingLinks.map(x => x.toNoteId), [source.id]);
  }
});

test("reusing an old name is ambiguous rather than silently linking the new note", async t => {
  const root = await vault(t);
  const source = await note(root, "Shared name");
  await updateNoteContent(root, source.id, { body: "# New name" });
  const replacement = await note(root, "Shared name");
  const reference = await note(root, "Ambiguous reference", "[[Shared name]]");
  assert.deepEqual((await listNoteRelations(root, reference.id)).outgoingLinks, []);
  assert.deepEqual(new Set((await searchNotes(root, { query: "Shared name", excludeNoteId: reference.id })).items.map(x => x.id)), new Set([source.id, replacement.id]));
});

for (const rejectedOperation of ["title update", "alias insertion"]) test(`a failed ${rejectedOperation} restores the original file and commits no aliases`, async t => {
  const root = await vault(t);
  const source = await note(root, "Keep source", "Original body.");
  const original = await fs.readFile(path.join(root, source.markdownPath), "utf8");
  const db = new DatabaseSync(path.join(root, ".yansilu", SQLITE_DB_FILES.catalog));
  try {
    db.exec(rejectedOperation === "title update"
      ? "CREATE TRIGGER reject_rename BEFORE UPDATE OF title ON notes BEGIN SELECT RAISE(ABORT, 'rename rejected'); END;"
      : "CREATE TRIGGER reject_rename BEFORE INSERT ON note_link_aliases BEGIN SELECT RAISE(ABORT, 'rename rejected'); END;");
    await assert.rejects(updateNoteContent(root, source.id, { body: "# Rejected name\n\nChanged body." }), /rename rejected/);
    assert.equal(await fs.readFile(path.join(root, source.markdownPath), "utf8"), original);
    assert.deepEqual(await fs.readdir(path.join(root, "notes/fleeting")), [path.basename(source.markdownPath)]);
    assert.equal(db.prepare("SELECT COUNT(*) AS count FROM note_link_aliases").get().count, 0);
    assert.equal((await getNoteById(root, source.id)).title, "Keep source");
  } finally { db.close(); }
});
