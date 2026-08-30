import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { initVault, createNoteInDirectory, searchNotes, updateNoteContent, deleteNoteById, moveNoteToDirectory, getNoteById, createNoteRelation, listNoteRelations, parseMarkdownWithFrontmatter } from "../../packages/domain/src/index.mjs";
import { applyMovedNoteToClientState } from "../../apps/web/src/note-move-client-state.js";
import { DatabaseSync } from "node:sqlite";
import { SQLITE_DB_FILES } from "../../packages/domain/src/sqlite-migrations.mjs";

async function vault(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "yansilu-ux-domain-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  await initVault(root);
  return root;
}

test("duplicate note IDs never leave a second Markdown file", async t => {
  const root = await vault(t);
  const input = { id: "note_duplicate", directoryId: "dir_fleeting_default", body: "# Stable\n\nOriginal" };
  const first = await createNoteInDirectory(root, input);
  await assert.rejects(createNoteInDirectory(root, { ...input, body: "# Changed\n\nDo not keep" }), { code: "NOTE_ID_EXISTS" });
  assert.deepEqual(await fs.readdir(path.join(root, "notes/fleeting")), [path.basename(first.markdownPath)]);
  assert.match((await getNoteById(root, first.id)).body, /Original/);
});

test("concurrent duplicate IDs clean up the losing file", async t => {
  const root = await vault(t);
  const input = { id: "note_race", directoryId: "dir_fleeting_default", body: "# Concurrent" };
  const results = await Promise.allSettled([createNoteInDirectory(root, input), createNoteInDirectory(root, input)]);
  assert.equal(results.filter(x => x.status === "fulfilled").length, 1);
  assert.equal((await fs.readdir(path.join(root, "notes/fleeting"))).length, 1);
});

test("database insertion failure removes only the newly created file", async t => {
  const root = await vault(t);
  const kept = await createNoteInDirectory(root, { directoryId: "dir_fleeting_default", body: "# Keep" });
  const db = new DatabaseSync(path.join(root, ".yansilu", SQLITE_DB_FILES.catalog));
  try {
    db.exec("CREATE TRIGGER reject_creation BEFORE INSERT ON notes BEGIN SELECT RAISE(ABORT, 'blocked insertion'); END;");
    await assert.rejects(createNoteInDirectory(root, { directoryId: "dir_fleeting_default", body: "# Rejected" }), /blocked insertion/);
    assert.deepEqual(await fs.readdir(path.join(root, "notes/fleeting")), [path.basename(kept.markdownPath)]);
  } finally { db.close(); }
});

test("partial Markdown writes are removed without leaving a phantom note", async t => {
  const root = await vault(t);
  const open = fs.open.bind(fs);
  t.mock.method(fs, "open", async (...args) => {
    const handle = await open(...args);
    return { close: () => handle.close(), writeFile: async () => {
      await handle.writeFile("partial", "utf8");
      throw new Error("Simulated disk full");
    } };
  });
  await assert.rejects(createNoteInDirectory(root, { directoryId: "dir_fleeting_default", body: "# Partial" }), /disk full/);
  assert.deepEqual(await fs.readdir(path.join(root, "notes/fleeting")), []);
});

test("failed move rollback reports recovery paths and retains the recoverable file", async t => {
  const root = await vault(t);
  const note = await createNoteInDirectory(root, { directoryId: "dir_fleeting_default", body: "# Recover me\n\nOriginal content" });
  const originalPath = path.join(root, note.markdownPath);
  const original = await fs.readFile(originalPath, "utf8");
  const db = new DatabaseSync(path.join(root, ".yansilu", SQLITE_DB_FILES.catalog));
  const rename = fs.rename.bind(fs);
  const link = fs.link.bind(fs);
  t.mock.method(fs, "link", async (from, to) => {
    if (to === originalPath) throw new Error("Rollback destination unavailable");
    return link(from, to);
  });
  try {
    db.exec("CREATE TRIGGER reject_move BEFORE UPDATE OF markdown_path ON notes BEGIN SELECT RAISE(ABORT, 'blocked update'); END;");
    let error;
    try { await moveNoteToDirectory(root, note.id, "dir_literature_default"); } catch (caught) { error = caught; }
    assert.equal(error?.code, "NOTE_MOVE_RECOVERY_REQUIRED");
    assert.equal(error.details.originalDirectoryId, note.directoryId);
    assert.equal(error.details.originalMarkdownPath, note.markdownPath);
    assert.equal(error.details.originalPath, originalPath);
    assert.equal(await fs.readFile(error.details.remainingPath, "utf8"), original);
    await assert.rejects(fs.access(originalPath));
    db.exec("DROP TRIGGER reject_move;");
    await assert.rejects(getNoteById(root, note.id), { code: "ENOENT" });
    await rename(error.details.remainingPath, originalPath);
    const restored = await getNoteById(root, note.id);
    assert.equal(restored.directoryId, note.directoryId);
    assert.equal(restored.markdownPath, note.markdownPath);
    assert.match(restored.body, /Original content/);
  } finally { db.close(); }
});

test("persistent partial writes during a move never truncate the original note", async t => {
  const root = await vault(t);
  const note = await createNoteInDirectory(root, { directoryId: "dir_fleeting_default", body: "# Keep the original\n\nThe complete text must survive disk exhaustion." });
  const originalPath = path.join(root, note.markdownPath);
  const original = await fs.readFile(originalPath, "utf8");
  const writeFile = fs.writeFile.bind(fs);
  let writes = 0;
  t.mock.method(fs, "writeFile", async (target, data, ...args) => {
    if (String(target).includes(`${path.sep}literature${path.sep}`)) {
      writes++;
      await writeFile(target, String(data).slice(0, 12), ...args);
      throw Object.assign(new Error("Persistent disk full"), { code: "ENOSPC" });
    }
    return writeFile(target, data, ...args);
  });
  await assert.rejects(moveNoteToDirectory(root, note.id, "dir_literature_default"), { code: "ENOSPC" });
  assert.equal(writes, 1);
  assert.equal(await fs.readFile(originalPath, "utf8"), original);
  assert.deepEqual(await fs.readdir(path.join(root, "notes/literature")), []);
  const current = await getNoteById(root, note.id);
  assert.equal(current.directoryId, note.directoryId);
  assert.equal(current.body, note.body);
});

test("database rejection rolls back by rename even when further writes fail", async t => {
  const root = await vault(t);
  const note = await createNoteInDirectory(root, { directoryId: "dir_fleeting_default", body: "# Restore without writing\n\nPreserve the whole original." });
  const originalPath = path.join(root, note.markdownPath);
  const original = await fs.readFile(originalPath, "utf8");
  const db = new DatabaseSync(path.join(root, ".yansilu", SQLITE_DB_FILES.catalog));
  const writeFile = fs.writeFile.bind(fs);
  let writes = 0;
  t.mock.method(fs, "writeFile", async (...args) => {
    if (++writes > 1) throw Object.assign(new Error("No more space"), { code: "ENOSPC" });
    return writeFile(...args);
  });
  try {
    db.exec("CREATE TRIGGER reject_move BEFORE UPDATE OF markdown_path ON notes BEGIN SELECT RAISE(ABORT, 'blocked update'); END;");
    await assert.rejects(moveNoteToDirectory(root, note.id, "dir_literature_default"), /blocked update/);
    assert.equal(writes, 1);
    assert.equal(await fs.readFile(originalPath, "utf8"), original);
    assert.deepEqual(await fs.readdir(path.join(root, "notes/fleeting")), [path.basename(originalPath)]);
    assert.deepEqual(await fs.readdir(path.join(root, "notes/literature")), []);
  } finally { db.close(); }
});

test("a failed publication and rollback retain the complete recovery copy", async t => {
  const root = await vault(t);
  const note = await createNoteInDirectory(root, { directoryId: "dir_fleeting_default", body: "# Publication failure\n\nDo not lose the original." });
  const originalPath = path.join(root, note.markdownPath);
  const original = await fs.readFile(originalPath, "utf8");
  const rename = fs.rename.bind(fs);
  t.mock.method(fs, "rename", async (from, to) => {
    if (String(from).endsWith(".move-tmp")) throw new Error("Rename unavailable");
    return rename(from, to);
  });
  t.mock.method(fs, "link", async () => { throw new Error("Restore unavailable"); });
  let error;
  try { await moveNoteToDirectory(root, note.id, "dir_literature_default"); } catch (caught) { error = caught; }
  assert.equal(error?.code, "NOTE_MOVE_RECOVERY_REQUIRED");
  assert.equal(await fs.readFile(error.details.remainingPath, "utf8"), original);
  assert.deepEqual(await fs.readdir(path.join(root, "notes/literature")), []);
  await rename(error.details.remainingPath, originalPath);
  assert.equal((await getNoteById(root, note.id)).body, note.body);
});

for (const when of ["before-copy", "before-preserve", "after-publish"]) {
  test(`concurrent external edits ${when} cancel the move without losing the new text`, async t => {
    const root = await vault(t);
    const note = await createNoteInDirectory(root, { directoryId: "dir_fleeting_default", body: "# Concurrent edit\n\nOriginal body." });
    const source = path.join(root, note.markdownPath);
    const rename = fs.rename.bind(fs), copyFile = fs.copyFile.bind(fs);
    let backup, edited = false;
    const edit = async file => { edited = true; await fs.appendFile(file, "\nSaved concurrently.\n", "utf8"); };
    t.mock.method(fs, "copyFile", async (from, to, ...args) => {
      if (when === "before-copy" && from === source) await edit(source);
      return copyFile(from, to, ...args);
    });
    t.mock.method(fs, "rename", async (from, to) => {
      if (from === source && String(to).endsWith(".move-original")) {
        backup = to;
        if (when === "before-preserve") await edit(source);
      }
      await rename(from, to);
      if (when === "after-publish" && String(from).endsWith(".move-tmp")) await edit(backup);
    });
    await assert.rejects(moveNoteToDirectory(root, note.id, "dir_literature_default"), { code: "NOTE_MOVE_SOURCE_CHANGED" });
    assert.equal(edited, true);
    const current = await getNoteById(root, note.id);
    assert.equal(current.directoryId, note.directoryId);
    assert.match(current.body, /Saved concurrently/);
    assert.deepEqual(await fs.readdir(path.join(root, "notes/literature")), []);
    assert.deepEqual(await fs.readdir(path.dirname(source)), [path.basename(source)]);
  });
}

test("rollback never overwrites a source path recreated by another editor", async t => {
  const root = await vault(t);
  const note = await createNoteInDirectory(root, { directoryId: "dir_fleeting_default", body: "# Recreated source\n\nOriginal." });
  const source = path.join(root, note.markdownPath);
  const original = await fs.readFile(source, "utf8");
  const recreated = `${original}\nSaved at the original path again.\n`;
  const rename = fs.rename.bind(fs);
  t.mock.method(fs, "rename", async (from, to) => {
    await rename(from, to);
    if (String(from).endsWith(".move-tmp")) await fs.writeFile(source, recreated, "utf8");
  });
  let error;
  try { await moveNoteToDirectory(root, note.id, "dir_literature_default"); } catch (caught) { error = caught; }
  assert.equal(error?.code, "NOTE_MOVE_RECOVERY_REQUIRED");
  assert.equal(await fs.readFile(source, "utf8"), recreated);
  assert.equal(await fs.readFile(error.details.remainingPath, "utf8"), original);
});

test("body search covers unopened notes, scopes, updates and deletions", async (t) => {
  const root = await vault(t);
  const note = await createNoteInDirectory(root, { directoryId: "dir_fleeting_default", body: "# 阅读记录\n\n知识积累需要主动回忆，而不是反复收藏。" });
  const exact = await createNoteInDirectory(root, { directoryId: "dir_literature_default", body: "# 主动回忆\n\n另一份材料" });
  let found = await searchNotes(root, { query: "主动回忆", limit: 1 });
  assert.equal(found.total, 2);
  assert.equal(found.items[0].id, exact.id);
  found = await searchNotes(root, { query: "主动回忆", rootDirectoryId: "dir_fleeting_default" });
  assert.equal(found.items[0].id, note.id);
  assert.equal(found.items[0].matchKind, "body_contains");
  assert.match(found.items[0].excerpt, /知识积累需要主动回忆/);
  assert.equal((await searchNotes(root, { query: "主动回忆", excludeNoteId: note.id })).total, 1);
  await updateNoteContent(root, note.id, { body: "# 阅读记录\n\n改为间隔练习。" });
  assert.equal((await searchNotes(root, { query: "主动回忆" })).total, 1);
  const file = path.join(root, note.markdownPath);
  await fs.writeFile(file, (await fs.readFile(file, "utf8")).replace("间隔练习", "主动检索"));
  assert.equal((await searchNotes(root, { query: "主动检索" })).items[0].id, note.id);
  await deleteNoteById(root, note.id);
  assert.equal((await searchNotes(root, { query: "主动检索" })).total, 0);
});

test("reclassification preserves identity, body, relationships and disk metadata", async (t) => {
  const root = await vault(t);
  const note = await createNoteInDirectory(root, { directoryId: "dir_fleeting_default", body: "# 我的阅读判断\n\n主动解释比收集更能发现理解的缺口。\n\n![图](../../assets/test.png)" });
  const other = await createNoteInDirectory(root, { directoryId: "dir_fleeting_default", body: "# 一个例子\n\n尝试向朋友解释时发现不懂的部分。" });
  await createNoteRelation(root, note.id, { toNoteId: other.id, relationType: "associated_with", rationale: "都在讨论如何检查理解", status: "confirmed" });
  const moved = await moveNoteToDirectory(root, note.id, "dir_original_default");
  assert.ok((await fs.readdir(path.join(root, "notes/fleeting"))).every(name => !name.includes(".move-")));
  assert.ok((await fs.readdir(path.join(root, "notes/permanent"))).every(name => !name.includes(".move-")));
  assert.equal(moved.id, note.id);
  assert.equal(moved.noteType, "permanent");
  assert.equal(moved.status, "draft");
  const parsed = parseMarkdownWithFrontmatter(await fs.readFile(path.join(root, moved.markdownPath), "utf8"));
  assert.equal(parsed.frontmatter.note_type, "permanent");
  assert.match(parsed.body, /主动解释比收集/);
  assert.match(parsed.body, /assets\/test.png/);
  await assert.rejects(fs.access(path.join(root, note.markdownPath)));
  assert.equal((await getNoteById(root, note.id)).noteType, "permanent");
  const relations = await listNoteRelations(root, note.id);
  assert.equal(relations.outgoingLinks.length, 1);
  const restored = await moveNoteToDirectory(root, note.id, "dir_fleeting_default");
  assert.equal(restored.noteType, "fleeting");
  assert.equal((await listNoteRelations(root, note.id)).outgoingLinks[0].toNoteId, other.id);
});

test("failed reclassification restores the original file and catalog", async (t) => {
  const root = await vault(t);
  const note = await createNoteInDirectory(root, { directoryId: "dir_fleeting_default", body: "# 保留我的内容\n\n这段记录不能丢失。" });
  const originalPath = path.join(root, note.markdownPath);
  const original = await fs.readFile(originalPath, "utf8");
  const writeFile = fs.writeFile.bind(fs);
  let failed = false;
  t.mock.method(fs, "writeFile", async (target, ...args) => {
    if (!failed && String(target).includes(`${path.sep}literature${path.sep}`)) {
      failed = true;
      throw new Error("simulated disk failure");
    }
    return writeFile(target, ...args);
  });
  await assert.rejects(moveNoteToDirectory(root, note.id, "dir_literature_default"), /simulated disk failure/);
  assert.equal(failed, true);
  assert.equal(await fs.readFile(originalPath, "utf8"), original);
  const current = await getNoteById(root, note.id);
  assert.equal(current.noteType, "fleeting");
  assert.equal(current.markdownPath, note.markdownPath);
});

for (const directoryId of ["dir_fleeting_default", "dir_literature_default"]) {
  test(`viewpoint metadata survives reclassification, editing and returning from ${directoryId}`, async (t) => {
    const root = await vault(t);
    const note = await createNoteInDirectory(root, {
      directoryId: "dir_original_default",
      body: "# A testable judgment\n\nExplaining an idea reveals gaps in understanding.",
      thesis: "Explaining reveals gaps.",
      threeLineSummary: ["Explain the idea.", "Notice missing reasons.", "Revise the judgment."],
      startingQuestion: "How can I check understanding?",
      boundaryOrCounterpoint: "Only for ideas that can be explained and tested."
    });
    const before = await getNoteById(root, note.id);
    const moved = await moveNoteToDirectory(root, note.id, directoryId);
    const editedBody = `${moved.body}\nAn additional observation.\n`;
    await updateNoteContent(root, note.id, { body: editedBody });
    const disk = parseMarkdownWithFrontmatter(await fs.readFile(path.join(root, moved.markdownPath), "utf8"));
    assert.equal(disk.frontmatter.boundary_or_counterpoint, before.boundaryOrCounterpoint);
    const refreshedSource = await getNoteById(root, note.id);
    const state = { notes: [{ ...refreshedSource, thesis: "", startingQuestion: "", threeLineSummary: [] }], tabs: [] };
    const returned = await moveNoteToDirectory(root, note.id, "dir_original_default");
    applyMovedNoteToClientState(state, note.id, "dir_original_default", returned, {
      typeFromFolder: () => "permanent", rootBoxIdFromFolder: () => "dir_original_default"
    });
    const restored = await getNoteById(root, note.id);
    for (const field of ["thesis", "threeLineSummary", "startingQuestion", "boundaryOrCounterpoint"]) {
      assert.deepEqual(restored[field], before[field], field);
      assert.deepEqual(state.notes[0][field], restored[field], `client ${field}`);
    }
    assert.match(restored.body, /An additional observation/);
    await updateNoteContent(root, note.id, { body: restored.body, boundaryOrCounterpoint: "" });
    assert.equal((await getNoteById(root, note.id)).boundaryOrCounterpoint || "", "");
  });
}
