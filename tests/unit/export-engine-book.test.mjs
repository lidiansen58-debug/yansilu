import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { exportBook, buildBookExport } from "../../packages/export-engine/src/index.mjs";
import { initVault, createNoteInDirectory, updateNoteContent as updateNoteById, getNoteById } from "../../packages/domain/src/index.mjs";
import { createWritingProject, updateWritingProjectBookStructure } from "../../packages/writing-engine/src/writing-engine.mjs";

async function fixture() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "yansilu-book-export-"));
  const vaultPath = path.join(root, "vault");
  await initVault(vaultPath);
  const source = await createNoteInDirectory(vaultPath, { directoryId: "dir_original_default", title: "真实来源", body: "# 真实来源\n\nSOURCE" });
  const notes = [];
  for (let index = 1; index <= 3; index++) notes.push(await createNoteInDirectory(vaultPath, {
    directoryId: "dir_original_default", title: `Chapter ${index}`, body: `# Chapter ${index}\n\nUNIQUE-BODY-${index}\n\n[[真实来源]]\n\n    indented code  \n\nEnd\n`
  }));
  await createNoteInDirectory(vaultPath, { directoryId: "dir_original_default", title: "Unrelated", body: "OTHER-PROJECT-PROSE" });
  const project = await createWritingProject(vaultPath, { title: "三章书稿", basketNoteIds: [source.id], bookStructure: { schema_version: 1,
    parts: [{ id: "part", title: "Part", chapters: notes.map((note, index) => ({ id: `c${index}`, title: note.title, draft_note_id: note.id, evidence_note_ids: [source.id] })) }] } });
  return { root, vaultPath, projectId: project.id, expectedBookStructure: project.book_structure, targetPath: path.join(root, "output"), notes, source };
}

test("book export combines real saved chapters in directory order without mixing other prose or modifying notes", async () => {
  const s = await fixture();
  const snapshots = await Promise.all(s.notes.map(note => fs.readFile(path.join(s.vaultPath, note.markdownPath), "utf8")));
  s.expectedBookStructure.parts[0].chapters.reverse();
  const project = await updateWritingProjectBookStructure(s.vaultPath, s.projectId, { bookStructure: s.expectedBookStructure });
  s.expectedBookStructure = project.book_structure;
  const result = await exportBook(s);
  const body = await fs.readFile(result.bookPath, "utf8");
  assert.equal(result.chapterCount, 3);
  assert.equal(result.sourceCount, 1);
  assert.ok(body.indexOf("UNIQUE-BODY-3") < body.indexOf("UNIQUE-BODY-2"));
  assert.ok(body.indexOf("UNIQUE-BODY-2") < body.indexOf("UNIQUE-BODY-1"));
  assert.match(body, /^# 三章书稿/);
  assert.match(body, /### Chapter 3/);
  assert.match(body, /\[\[真实来源\]\]/);
  assert.match(body, /    indented code  \n/);
  assert.doesNotMatch(body, /OTHER-PROJECT-PROSE|draft_note_id/);
  assert.deepEqual(await Promise.all(s.notes.map(note => fs.readFile(path.join(s.vaultPath, note.markdownPath), "utf8"))), snapshots);
  const second = await exportBook(s);
  assert.notEqual(second.bookPath, result.bookPath);
});

test("chapter-relative image links become portable and attachments are copied once", async () => {
  const s = await fixture();
  const asset = "assets/images/shared.png";
  await fs.mkdir(path.join(s.vaultPath, "assets", "images"), { recursive: true });
  await fs.writeFile(path.join(s.vaultPath, asset), Buffer.from([1, 2, 3]));
  for (const note of s.notes) {
    const link = path.posix.relative(path.posix.dirname(note.markdownPath), asset);
    await updateNoteById(s.vaultPath, note.id, { body: `${note.body}\n![图](${link})\n` });
  }
  const result = await exportBook(s);
  assert.equal(result.assetCount, 1);
  assert.equal((await fs.readFile(result.bookPath, "utf8")).split("![图](assets/images/shared.png)").length - 1, 3);
  assert.deepEqual(await fs.readFile(path.join(result.targetPath, asset)), Buffer.from([1, 2, 3]));
});

test("unsaved chapter bindings and stale directories fail before publishing files", async () => {
  const s = await fixture();
  await assert.rejects(exportBook({ ...s, expectedBookStructure: { parts: [] } }), /目录已变化/);
  const structure = structuredClone(s.expectedBookStructure);
  structure.parts[0].chapters[1].draft_note_id = null;
  const updated = await updateWritingProjectBookStructure(s.vaultPath, s.projectId, { bookStructure: structure });
  await assert.rejects(exportBook({ ...s, expectedBookStructure: updated.book_structure }), /Chapter 2.*保存/);
  await assert.rejects(fs.stat(s.targetPath), { code: "ENOENT" });
});

test("missing chapter files, heading-only chapters and missing assets are reported without partial export", async () => {
  const s = await fixture();
  await updateNoteById(s.vaultPath, s.notes[0].id, { body: "# Chapter 1\n\n" });
  await assert.rejects(exportBook(s), /仅有标题/);
  await updateNoteById(s.vaultPath, s.notes[0].id, { body: "Saved text\n![image](../../assets/missing.png)" });
  await assert.rejects(exportBook(s), /找不到附件/);
  const note = await getNoteById(s.vaultPath, s.notes[1].id);
  await fs.unlink(path.join(s.vaultPath, note.markdownPath));
  await assert.rejects(exportBook(s), /无法读取.*Chapter 2/);
  await assert.rejects(fs.stat(s.targetPath), { code: "ENOENT" });
});

test("targets inside the vault are refused and absent body source citations use real note titles", async () => {
  const s = await fixture();
  await updateNoteById(s.vaultPath, s.notes[0].id, { body: "Text without generated citations" });
  const output = await buildBookExport(s);
  assert.match(output.markdown, /参考笔记：\[\[真实来源\]\]/);
  await assert.rejects(exportBook({ ...s, targetPath: path.join(s.vaultPath, "output") }), /笔记库之外/);
});
