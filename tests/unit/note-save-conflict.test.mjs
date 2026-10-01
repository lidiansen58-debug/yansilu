import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { initVault, createNoteInDirectory, getNoteById, updateNoteContent } from "../../packages/domain/src/index.mjs";

async function fixture(t) {
  const vault = await fs.mkdtemp(path.join(os.tmpdir(), "yansilu-save-conflict-"));
  t.after(() => fs.rm(vault, { recursive: true, force: true }));
  await initVault(vault);
  const note = await createNoteInDirectory(vault, { directoryId: "dir_original_default", title: "Save base", body: "# Save base\n\nBASE" });
  return { vault, note, file: path.join(vault, note.markdownPath) };
}

test("matching saved body permits a guarded save and returns the next baseline", async t => {
  const { vault, note } = await fixture(t);
  const saved = await updateNoteContent(vault, note.id, { expectedBody: note.body, body: "# Save base\n\nNEXT" });
  assert.match(saved.body, /NEXT/);
  const next = await updateNoteContent(vault, note.id, { expectedBody: saved.body, body: "# Save base\n\nSECOND" });
  assert.match(next.body, /SECOND/);
});

test("a whole-file revision detects metadata-only edits while body remains identical", async t => {
  const { vault, note, file } = await fixture(t);
  assert.match(note.fileRevision, /^[a-f0-9]{64}$/);
  const disk = await fs.readFile(file, "utf8");
  const changed = disk.replace("status: draft", "status: active");
  assert.notEqual(changed, disk);
  await fs.writeFile(file, changed, "utf8");
  const reread = await getNoteById(vault, note.id);
  assert.equal(reread.body, note.body);
  assert.notEqual(reread.fileRevision, note.fileRevision);
  await assert.rejects(updateNoteContent(vault, note.id, { expectedBody: note.body, expectedRevision: note.fileRevision, body: "EDITOR", status: "draft" }), { code: "NOTE_SAVE_CONFLICT" });
  assert.equal(await fs.readFile(file, "utf8"), changed);
  const saved = await updateNoteContent(vault, note.id, { expectedBody: reread.body, expectedRevision: reread.fileRevision, body: "# Save base\n\nACKNOWLEDGED" });
  assert.equal(saved.fileRevision, (await getNoteById(vault, note.id)).fileRevision);
});

test("invalid whole-file versions do not silently disable the conflict check", async t => {
  const { vault, note } = await fixture(t);
  for (const expectedRevision of ["", "not-a-version", null]) {
    await assert.rejects(updateNoteContent(vault, note.id, { expectedRevision, body: "EDITOR" }), { code: "NOTE_SAVE_BASE_INVALID" });
  }
});

test("a stale client's body cannot replace newer prose or rename its file", async t => {
  const { vault, note, file } = await fixture(t);
  await updateNoteContent(vault, note.id, { body: "# Save base\n\nNEWER" });
  const disk = await fs.readFile(file, "utf8");
  await assert.rejects(updateNoteContent(vault, note.id, { expectedBody: note.body, title: "Stale rename", body: "STALE" }), { code: "NOTE_SAVE_CONFLICT" });
  assert.equal(await fs.readFile(file, "utf8"), disk);
  assert.match((await getNoteById(vault, note.id)).body, /NEWER/);
});

test("external Markdown changes are checked against the disk body, not cached catalog metadata", async t => {
  const { vault, note, file } = await fixture(t);
  const changed = (await fs.readFile(file, "utf8")).replace("BASE", "EXTERNAL");
  await fs.writeFile(file, changed, "utf8");
  await assert.rejects(updateNoteContent(vault, note.id, { expectedBody: note.body, body: "EDITOR" }), { code: "NOTE_SAVE_CONFLICT" });
  assert.equal(await fs.readFile(file, "utf8"), changed);
});

test("an empty baseline is a real condition and malformed baselines are refused", async t => {
  const { vault, note, file } = await fixture(t);
  const disk = await fs.readFile(file, "utf8");
  await assert.rejects(updateNoteContent(vault, note.id, { expectedBody: "", body: "EDITOR" }), { code: "NOTE_SAVE_CONFLICT" });
  await assert.rejects(updateNoteContent(vault, note.id, { expectedBody: null, body: "EDITOR" }), { code: "NOTE_SAVE_BASE_INVALID" });
  assert.equal(await fs.readFile(file, "utf8"), disk);
});

test("concurrent saves with the same baseline accept exactly one writer", async t => {
  const { vault, note, file } = await fixture(t);
  const readFile = fs.readFile.bind(fs);
  let reads = 0;
  t.mock.method(fs, "readFile", async (...args) => {
    const content = await readFile(...args);
    if (path.resolve(String(args[0])) === file && ++reads <= 2) await new Promise(resolve => setTimeout(resolve, 40));
    return content;
  });
  const results = await Promise.allSettled([
    updateNoteContent(vault, note.id, { expectedBody: note.body, body: "# Save base\n\nWRITER-A" }),
    updateNoteContent(vault, note.id, { expectedBody: note.body, body: "# Save base\n\nWRITER-B" })
  ]);
  assert.equal(results.filter(result => result.status === "fulfilled").length, 1);
  assert.equal(results.find(result => result.status === "rejected")?.reason?.code, "NOTE_SAVE_CONFLICT");
  const accepted = results.find(result => result.status === "fulfilled").value;
  assert.equal((await getNoteById(vault, note.id)).body, accepted.body);
});

test("external edits after the initial read survive validation and prevent a rename", async t => {
  const { vault, note, file } = await fixture(t);
  const readFile = fs.readFile.bind(fs);
  let changed;
  t.mock.method(fs, "readFile", async (...args) => {
    const content = await readFile(...args);
    if (!changed && path.resolve(String(args[0])) === file) {
      changed = String(content).replace("BASE", "EXTERNAL-DURING-VALIDATION");
      await fs.writeFile(file, changed, "utf8");
    }
    return content;
  });
  await assert.rejects(updateNoteContent(vault, note.id, { expectedBody: note.body, title: "Renamed", body: "EDITOR" }), { code: "NOTE_SAVE_CONFLICT" });
  assert.equal(await readFile(file, "utf8"), changed);
});
