import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { initVault, createDirectory, createNoteInDirectory, getNoteById, updateNoteContent, listNoteRelations, deleteNoteRelation, updateNoteRelation, createNoteRelation, syncMarkdownNoteCatalogRelations } from "../../packages/domain/src/index.mjs";
import { getWritingProject, listProjectDraftVersions, bindDraftNoteToProject } from "../../packages/writing-engine/src/index.mjs";
import { seedSmartNotesProductThinking } from "../../scripts/seed-smart-notes-product-thinking.mjs";
import { upgradeSmartNotesDemoInstructions } from "../../scripts/smart-notes-demo-instruction-upgrade.mjs";

const legacy = JSON.parse(await fs.readFile(new URL("../fixtures/demo-smart-notes-product-thinking/legacy-instructions-v3.json", import.meta.url), "utf8"));
const fixture = JSON.parse(await fs.readFile(new URL("../fixtures/demo-smart-notes-product-thinking/demo.json", import.meta.url), "utf8"));
const manualId = "ESSAY-SMART-NOTES-USER-MANUAL";

async function oldVault(t) {
  const vault = await fs.mkdtemp(path.join(os.tmpdir(), "yansilu-instruction-upgrade-"));
  t.after(() => fs.rm(vault, { recursive: true, force: true }));
  await initVault(vault);
  await createDirectory(vault, { id: "dir_demo_smart_notes_product_thinking_guide", title: "Demo 导览", directoryType: "custom", fsPath: path.join(vault, "notes", "smart-notes-demo-guide"), maxNotes: 32 });
  for (const note of legacy) {
    await createNoteInDirectory(vault, { id: note.id, title: note.title, body: note.body, ...Object.fromEntries(Object.entries(note.metadata).filter(([, value]) => value !== null)), directoryId: "dir_demo_smart_notes_product_thinking_guide" });
    const actual = await getNoteById(vault, note.id);
    assert.equal(actual.body, note.body);
    for (const [key, value] of Object.entries(note.metadata)) assert.deepEqual(actual[key] ?? null, value, `${note.id}: ${key}`);
  }
  await createNoteInDirectory(vault, { id: "LN-SHORT-PRACTICE", title: "练习材料：让读书笔记帮助写作", body: "# 练习材料：让读书笔记帮助写作\n\n旧版练习材料。", directoryId: "dir_literature_default" });
  const oldFixturePath = path.join(vault, "legacy-demo.json");
  await fs.writeFile(oldFixturePath, JSON.stringify({ ...fixture, id: "demo-smart-notes-product-thinking-v3", version: 3, guide_notes: [] }), "utf8");
  await seedSmartNotesProductThinking(vault, { fixturePath: oldFixturePath });
  for (const note of legacy) await syncMarkdownNoteCatalogRelations(vault, note.id);
  return vault;
}

test("reimport upgrades exact legacy instructions, keeps the current writing binding and is idempotent", async t => {
  const vault = await oldVault(t);
  const oldProject = await getWritingProject(vault, "WRITE-SMART-NOTES-DEMO");
  const oldVersions = await listProjectDraftVersions(vault, oldProject.id);
  assert.match((await getNoteById(vault, manualId)).body, /六步分别要求/);
  const result = await seedSmartNotesProductThinking(vault);
  assert.equal(result.summary.updatedNotes, 9);
  const project = await getWritingProject(vault, "WRITE-SMART-NOTES-DEMO");
  assert.equal(project.draft_note_id, manualId);
  assert.deepEqual(project, oldProject);
  const versions = await listProjectDraftVersions(vault, project.id);
  assert.deepEqual(versions, oldVersions);
  for (const note of legacy) {
    const upgraded = await getNoteById(vault, note.id);
    assert.equal(upgraded.title, note.title);
    assert.doesNotMatch(upgraded.body, /上方.*练习按钮|进度才会推进|点上方|六步分别要求/);
    assert.notEqual(upgraded.body, note.body);
  }
  const before = await getNoteById(vault, manualId);
  assert.match(before.body, /\[\[示例目录\]\]/);
  assert.equal((await seedSmartNotesProductThinking(vault)).summary.updatedNotes, 0);
  assert.deepEqual(await getNoteById(vault, manualId), before);
  assert.deepEqual(await getWritingProject(vault, project.id), project);
  assert.deepEqual(await listProjectDraftVersions(vault, project.id), versions);
});

test("legacy body, title and judgment edits and a user's replacement draft survive reimport", async t => {
  const vault = await oldVault(t);
  await updateNoteContent(vault, manualId, { body: `${legacy.find(note => note.id === manualId).body}\n我的写作内容。` });
  await updateNoteContent(vault, "GUIDE-SHORT-PRACTICE", { body: legacy.find(note => note.id === "GUIDE-SHORT-PRACTICE").body.replace(/^# [^\n]+/, "# 我的短文说明") });
  await updateNoteContent(vault, "GUIDE-TODAY-NEXT-STEP", { thesis: "我的判断", authorship: { user_confirmed: true, ai_assisted: false } });
  const ids = [manualId, "GUIDE-SHORT-PRACTICE", "GUIDE-TODAY-NEXT-STEP"];
  const before = await Promise.all(ids.map(id => getNoteById(vault, id)));
  assert.equal(before[1].title, "我的短文说明");
  assert.equal(before[2].thesis, "我的判断");
  assert.equal((await seedSmartNotesProductThinking(vault)).summary.updatedNotes, 6);
  for (let index = 0; index < ids.length; index++) assert.deepEqual(await getNoteById(vault, ids[index]), before[index]);
  await bindDraftNoteToProject(vault, { writingProjectId: "WRITE-SMART-NOTES-DEMO", draftNoteId: "PERM-PERMANENT-NOTE-IS-JUDGMENT", versionNote: "自己的草稿" });
  const project = await getWritingProject(vault, "WRITE-SMART-NOTES-DEMO");
  const versions = await listProjectDraftVersions(vault, project.id);
  await seedSmartNotesProductThinking(vault);
  assert.deepEqual(await getWritingProject(vault, project.id), project);
  assert.deepEqual(await listProjectDraftVersions(vault, project.id), versions);
});

test("an external edit during instruction upgrade is retained instead of overwritten", async t => {
  const vault = await oldVault(t);
  const note = await getNoteById(vault, manualId);
  const file = path.resolve(vault, note.markdownPath);
  const realRead = fs.readFile;
  let reads = 0;
  let injected = false;
  fs.readFile = async (target, ...args) => {
    if (path.resolve(String(target)) === file && ++reads === 2) {
      injected = true;
      const current = await realRead(target, "utf8");
      await fs.writeFile(target, `${current}\n外部编辑期间保存的正文。\n`, "utf8");
    }
    return realRead(target, ...args);
  };
  try { await upgradeSmartNotesDemoInstructions(vault, fixture); }
  finally { fs.readFile = realRead; }
  assert.equal(injected, true);
  const preserved = await getNoteById(vault, manualId);
  assert.match(preserved.body, /外部编辑期间保存的正文/);
  assert.match(preserved.body, /六步分别要求/);
});

test("reimport preserves deleted, edited and newly added outgoing relations on legacy instructions", async t => {
  const vault = await oldVault(t);
  const removedTarget = "PERM-WRITING-CENTER-FROM-CONFIRMED-NOTES";
  const removed = (await listNoteRelations(vault, manualId)).outgoingLinks.find(link => link.toNoteId === removedTarget);
  assert.ok(removed);
  await deleteNoteRelation(vault, removed.id);
  const edited = (await listNoteRelations(vault, "GUIDE-WHY-RELATE")).outgoingLinks[0];
  await updateNoteRelation(vault, edited.id, { relationType: "qualifies", rationale: "我的关系理由：这个判断需要结合材料使用。", status: "archived", confidence: 0.6 });
  await createNoteRelation(vault, "GUIDE-WHAT-PERMANENT", { toNoteId: fixture.permanent_notes.find(note => note.id !== "PERM-PERMANENT-NOTE-IS-JUDGMENT").id, relationType: "supports", rationale: "我新增的判断依据，重复导入时保留。" });
  const ids = [manualId, "GUIDE-WHY-RELATE", "GUIDE-WHAT-PERMANENT"];
  const before = await Promise.all(ids.map(async id => ({ note: await getNoteById(vault, id), outgoing: (await listNoteRelations(vault, id)).outgoingLinks })));
  for (let attempt = 0; attempt < 2; attempt++) {
    await seedSmartNotesProductThinking(vault);
    for (let index = 0; index < ids.length; index++) {
      assert.deepEqual(await getNoteById(vault, ids[index]), before[index].note);
      assert.deepEqual((await listNoteRelations(vault, ids[index])).outgoingLinks, before[index].outgoing);
    }
    assert.equal((await listNoteRelations(vault, manualId)).outgoingLinks.some(link => link.toNoteId === removedTarget), false);
  }
});

test("a relation removed during upgrade remains removed and aborts the guarded note save", async t => {
  const vault = await oldVault(t);
  const before = await getNoteById(vault, manualId);
  const file = path.resolve(vault, before.markdownPath);
  const edge = (await listNoteRelations(vault, manualId)).outgoingLinks.find(link => link.toNoteId === "PERM-WRITING-CENTER-FROM-CONFIRMED-NOTES");
  const realWrite = fs.writeFile;
  let injected = false;
  fs.writeFile = async (target, ...args) => {
    const result = await realWrite(target, ...args);
    if (!injected && path.resolve(String(target)) === file) {
      injected = true;
      await deleteNoteRelation(vault, edge.id);
    }
    return result;
  };
  try { await seedSmartNotesProductThinking(vault); }
  finally { fs.writeFile = realWrite; }
  assert.equal(injected, true);
  assert.deepEqual(await getNoteById(vault, manualId), before);
  assert.equal((await listNoteRelations(vault, manualId)).outgoingLinks.some(link => link.toNoteId === edge.toNoteId), false);
});

test("an external edit after upgrade writes survives relation conflict rollback and repeated import", async t => {
  const vault = await oldVault(t);
  const before = await getNoteById(vault, manualId);
  const file = path.resolve(vault, before.markdownPath);
  const edge = (await listNoteRelations(vault, manualId)).outgoingLinks.find(link => link.toNoteId === "PERM-WRITING-CENTER-FROM-CONFIRMED-NOTES");
  const realWrite = fs.writeFile.bind(fs);
  let externalMarkdown;
  t.mock.method(fs, "writeFile", async (target, content, ...args) => {
    const result = await realWrite(target, content, ...args);
    if (!externalMarkdown && path.resolve(String(target)) === file) {
      await deleteNoteRelation(vault, edge.id);
      externalMarkdown = `${content}\n外部编辑器同期保存的正文。\n`;
      await realWrite(target, externalMarkdown, "utf8");
    }
    return result;
  });
  await seedSmartNotesProductThinking(vault);
  assert.ok(externalMarkdown);
  assert.equal(await fs.readFile(file, "utf8"), externalMarkdown);
  const preserved = await getNoteById(vault, manualId);
  assert.match(preserved.body, /外部编辑器同期保存的正文/);
  await seedSmartNotesProductThinking(vault);
  assert.deepEqual(await getNoteById(vault, manualId), preserved);
  assert.equal(await fs.readFile(file, "utf8"), externalMarkdown);
  assert.equal((await listNoteRelations(vault, manualId)).outgoingLinks.some(link => link.toNoteId === edge.toNoteId), false);
});
