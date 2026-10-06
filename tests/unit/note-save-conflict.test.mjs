import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { initVault, createNoteInDirectory, getNoteById, updateNoteContent, listNoteRelations, createNoteRelation, updateNoteRelation, deleteNoteRelation } from "../../packages/domain/src/index.mjs";

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

test("matching outgoing relation baselines permit a save without changing manual relations", async t => {
  const { vault, note } = await fixture(t);
  const peer = await createNoteInDirectory(vault, { directoryId: "dir_original_default", title: "Peer", body: "# Peer\n\nA different note." });
  await createNoteRelation(vault, note.id, { toNoteId: peer.id, relationType: "supports", rationale: "This other note provides evidence for the claim." });
  const baseline = (await listNoteRelations(vault, note.id)).outgoingLinks;
  const saved = await updateNoteContent(vault, note.id, { body: "# Save base\n\nNEXT", expectedOutgoingRelations: baseline });
  assert.match(saved.body, /NEXT/);
  assert.deepEqual((await listNoteRelations(vault, note.id)).outgoingLinks, baseline);
});

for (const mutation of ["delete", "edit", "add"]) test(`a ${mutation} of outgoing relations rejects a stale guarded note save`, async t => {
  const { vault, note, file } = await fixture(t);
  const peer = await createNoteInDirectory(vault, { directoryId: "dir_original_default", title: "Peer", body: "# Peer\n\nA different note." });
  const relation = await createNoteRelation(vault, note.id, { toNoteId: peer.id, relationType: "supports", rationale: "This other note provides evidence for the claim." });
  const baseline = mutation === "add" ? [] : (await listNoteRelations(vault, note.id)).outgoingLinks;
  if (mutation === "delete") await deleteNoteRelation(vault, relation.id);
  if (mutation === "edit") await updateNoteRelation(vault, relation.id, { rationale: "Updated evidence and conditions for this claim.", status: "archived" });
  const disk = await fs.readFile(file, "utf8");
  const current = (await listNoteRelations(vault, note.id)).outgoingLinks;
  await assert.rejects(updateNoteContent(vault, note.id, { body: "# Save base\n\nSTALE", expectedOutgoingRelations: baseline }), { code: "NOTE_SAVE_CONFLICT" });
  assert.equal(await fs.readFile(file, "utf8"), disk);
  assert.deepEqual((await listNoteRelations(vault, note.id)).outgoingLinks, current);
});

test("malformed outgoing relation baselines cannot disable save protection", async t => {
  const { vault, note, file } = await fixture(t);
  const disk = await fs.readFile(file, "utf8");
  for (const expectedOutgoingRelations of [null, {}, [{}], [{ id: "" }]]) {
    await assert.rejects(updateNoteContent(vault, note.id, { body: "EDITOR", expectedOutgoingRelations }), { code: "NOTE_SAVE_BASE_INVALID" });
  }
  assert.equal(await fs.readFile(file, "utf8"), disk);
});

for (const rename of [false, true]) test(`relation conflict rollback preserves an external edit after writing${rename ? " and renaming" : ""}`, async t => {
  const { vault, note, file } = await fixture(t);
  const peer = await createNoteInDirectory(vault, { directoryId: "dir_original_default", title: "Peer", body: "# Peer\n\nA different note." });
  const relation = await createNoteRelation(vault, note.id, { toNoteId: peer.id, relationType: "supports", rationale: "This other note provides evidence for the claim." });
  const baseline = (await listNoteRelations(vault, note.id)).outgoingLinks;
  const realWrite = fs.writeFile.bind(fs);
  let externalPath;
  let externalMarkdown;
  t.mock.method(fs, "writeFile", async (target, content, ...args) => {
    const result = await realWrite(target, content, ...args);
    if (!externalPath && String(content).includes("EDITOR-SAVE")) {
      externalPath = String(target);
      await deleteNoteRelation(vault, relation.id);
      externalMarkdown = `${content}\nEXTERNAL-AFTER-WRITE\n`;
      await realWrite(target, externalMarkdown, "utf8");
    }
    return result;
  });
  await assert.rejects(updateNoteContent(vault, note.id, {
    ...(rename ? { title: "Renamed save" } : {}),
    body: `# ${rename ? "Renamed save" : "Save base"}\n\nEDITOR-SAVE`,
    expectedOutgoingRelations: baseline
  }), { code: "NOTE_SAVE_CONFLICT" });
  assert.ok(externalPath);
  assert.equal(await fs.readFile(file, "utf8"), externalMarkdown);
  if (rename) await assert.rejects(fs.access(externalPath), { code: "ENOENT" });
  assert.match((await getNoteById(vault, note.id)).body, /EXTERNAL-AFTER-WRITE/);
  assert.equal((await listNoteRelations(vault, note.id)).outgoingLinks.length, 0);
});

test("relation conflict rollback restores an unchanged renamed file", async t => {
  const { vault, note, file } = await fixture(t);
  const beforeNote = await getNoteById(vault, note.id);
  const before = await fs.readFile(file, "utf8");
  const peer = await createNoteInDirectory(vault, { directoryId: "dir_original_default", title: "Peer", body: "# Peer\n\nA different note." });
  const relation = await createNoteRelation(vault, note.id, { toNoteId: peer.id, relationType: "supports", rationale: "This other note provides evidence for the claim." });
  const baseline = (await listNoteRelations(vault, note.id)).outgoingLinks;
  const realWrite = fs.writeFile.bind(fs);
  let renamedPath;
  t.mock.method(fs, "writeFile", async (target, content, ...args) => {
    const result = await realWrite(target, content, ...args);
    if (!renamedPath && String(content).includes("EDITOR-SAVE")) {
      renamedPath = String(target);
      await deleteNoteRelation(vault, relation.id);
    }
    return result;
  });
  await assert.rejects(updateNoteContent(vault, note.id, {
    title: "Renamed save", body: "# Renamed save\n\nEDITOR-SAVE", expectedOutgoingRelations: baseline
  }), { code: "NOTE_SAVE_CONFLICT" });
  assert.ok(renamedPath);
  assert.notEqual(path.resolve(renamedPath), path.resolve(file));
  await assert.rejects(fs.access(renamedPath), { code: "ENOENT" });
  assert.equal(await fs.readFile(file, "utf8"), before);
  assert.deepEqual(await getNoteById(vault, note.id), beforeNote);
  assert.equal((await listNoteRelations(vault, note.id)).outgoingLinks.length, 0);
});
