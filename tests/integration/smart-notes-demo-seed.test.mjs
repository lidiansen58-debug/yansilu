import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";

import { initVault, SQLITE_DB_FILES, getDirectoryGraph, getNoteById, getNotePath, updateNoteContent, updateNoteRelation, getIndexCard, updateIndexCard } from "../../packages/domain/src/index.mjs";
import { bindDraftNoteToProject, getWritingProject, syncWritingProject, getDraftScaffold, updateDraftScaffold, listProjectDraftVersions } from "../../packages/writing-engine/src/index.mjs";
import { seedSmartNotesProductThinking } from "../../scripts/seed-smart-notes-product-thinking.mjs";
import { SMART_NOTES_MANUAL_ID, smartNotesDemoManual } from "../../scripts/smart-notes-demo-manual.mjs";
import { beginDemoDraftInitialization, finishDemoDraftInitialization } from "../../scripts/smart-notes-demo-draft-initialization.mjs";

test("partial marker write does not publish a damaged file and import retries safely", async t => {
  const vaultPath = await fs.mkdtemp(path.join(os.tmpdir(), "yansilu-demo-marker-write-"));
  t.after(() => fs.rm(vaultPath, { recursive: true, force: true }));
  const realWrite = fs.writeFile;
  fs.writeFile = async (target, data, options) => {
    if (String(target).includes("demo-initialization")) {
      await realWrite(target, "{", options);
      throw Object.assign(new Error("marker disk full"), { code: "ENOSPC" });
    }
    return realWrite(target, data, options);
  };
  try { await assert.rejects(seedSmartNotesProductThinking(vaultPath), /marker disk full/); }
  finally { fs.writeFile = realWrite; }
  assert.deepEqual(await fs.readdir(path.join(vaultPath, ".yansilu", "demo-initialization")), []);
  // An older version may already have left a torn final marker before creating a project.
  const marker = path.join(vaultPath, ".yansilu", "demo-initialization", "draft-WRITE-SMART-NOTES-DEMO.json");
  await fs.writeFile(marker, "{", "utf8");
  await seedSmartNotesProductThinking(vaultPath);
  assert.equal((await getWritingProject(vaultPath, "WRITE-SMART-NOTES-DEMO")).draft_note_id, SMART_NOTES_MANUAL_ID);
  await assert.rejects(fs.readFile(marker), { code: "ENOENT" });
});

for (const priorVersion of [false, true]) {
  test(`draft saved during recovery remains current, including legacy partial binding: ${priorVersion}`, async t => {
    const vaultPath = await fs.mkdtemp(path.join(os.tmpdir(), "yansilu-demo-bind-race-"));
    t.after(() => fs.rm(vaultPath, { recursive: true, force: true }));
    await seedSmartNotesProductThinking(vaultPath);
    const id = "WRITE-SMART-NOTES-DEMO";
    const db = new DatabaseSync(path.join(vaultPath, ".yansilu", SQLITE_DB_FILES.catalog));
    let manualPath;
    try {
      db.prepare("UPDATE writing_projects SET draft_note_id = NULL WHERE id = ?").run(id);
      if (!priorVersion) db.prepare("DELETE FROM draft_note_versions WHERE writing_project_id = ?").run(id);
      manualPath = path.resolve(vaultPath, db.prepare("SELECT markdown_path FROM notes WHERE id = ?").get(SMART_NOTES_MANUAL_ID).markdown_path);
    } finally { db.close(); }
    await beginDemoDraftInitialization(vaultPath, id, SMART_NOTES_MANUAL_ID);
    const userDraft = "PERM-PERMANENT-NOTE-IS-JUDGMENT";
    const realRead = fs.readFile;
    let injected = false;
    fs.readFile = async (target, ...args) => {
      if (!injected && path.resolve(String(target)) === manualPath) {
        injected = true;
        await bindDraftNoteToProject(vaultPath, { writingProjectId: id, draftNoteId: userDraft, versionNote: "并发保存的用户草稿" });
      }
      return realRead(target, ...args);
    };
    try { await finishDemoDraftInitialization(vaultPath, id, SMART_NOTES_MANUAL_ID, "DRAFT-SMART-NOTES-DEMO"); }
    finally { fs.readFile = realRead; }
    assert.equal(injected, true);
    assert.equal((await getWritingProject(vaultPath, id)).draft_note_id, userDraft);
    assert.equal((await listProjectDraftVersions(vaultPath, id)).length, priorVersion ? 2 : 1);
  });
}

test("damaged legacy marker on an existing project does not block import or alter user work", async t => {
  const vaultPath = await fs.mkdtemp(path.join(os.tmpdir(), "yansilu-demo-marker-corrupt-"));
  t.after(() => fs.rm(vaultPath, { recursive: true, force: true }));
  await seedSmartNotesProductThinking(vaultPath);
  const id = "WRITE-SMART-NOTES-DEMO";
  const before = await getWritingProject(vaultPath, id);
  const versions = await listProjectDraftVersions(vaultPath, id);
  const marker = path.join(vaultPath, ".yansilu", "demo-initialization", `draft-${id}.json`);
  for (const damaged of ["", "{", "null", "{}"] ) {
    await fs.writeFile(marker, damaged, "utf8");
    await seedSmartNotesProductThinking(vaultPath);
    assert.deepEqual(await getWritingProject(vaultPath, id), before);
    assert.deepEqual(await listProjectDraftVersions(vaultPath, id), versions);
    await assert.rejects(fs.readFile(marker), { code: "ENOENT" });
  }
});

for (const failure of ["insert", "update", "legacy-update", "user-draft"]) {
  test(`failed demo draft initialization recovers without duplicate versions or replacing user work: ${failure}`, async t => {
    const vaultPath = await fs.mkdtemp(path.join(os.tmpdir(), "yansilu-demo-bind-retry-"));
    let db;
    t.after(async () => {
      db?.close();
      await fs.rm(vaultPath, { recursive: true, force: true });
    });
    await initVault(vaultPath);
    db = new DatabaseSync(path.join(vaultPath, ".yansilu", SQLITE_DB_FILES.catalog));
    db.exec(failure.includes("update")
      ? "CREATE TRIGGER fail_demo_bind BEFORE UPDATE OF draft_note_id ON writing_projects BEGIN SELECT RAISE(ABORT, 'binding failed'); END"
      : "CREATE TRIGGER fail_demo_bind BEFORE INSERT ON draft_note_versions BEGIN SELECT RAISE(ABORT, 'binding failed'); END");
    await assert.rejects(seedSmartNotesProductThinking(vaultPath), /binding failed/);
    const id = "WRITE-SMART-NOTES-DEMO";
    if (failure === "legacy-update") {
      // The old, nontransactional binder could persist a version before failing.
      await assert.rejects(bindDraftNoteToProject(vaultPath, { writingProjectId: id, draftNoteId: SMART_NOTES_MANUAL_ID }), /binding failed/);
    }
    assert.equal((await getWritingProject(vaultPath, id)).draft_note_id, null);
    const marker = path.join(vaultPath, ".yansilu", "demo-initialization", `draft-${id}.json`);
    assert.equal(JSON.parse(await fs.readFile(marker, "utf8")).draftNoteId, SMART_NOTES_MANUAL_ID);
    assert.equal((await listProjectDraftVersions(vaultPath, id)).length, failure === "legacy-update" ? 1 : 0);
    db.exec("DROP TRIGGER fail_demo_bind");
    const expectedDraft = failure === "user-draft" ? "PERM-PERMANENT-NOTE-IS-JUDGMENT" : SMART_NOTES_MANUAL_ID;
    if (failure === "user-draft") await bindDraftNoteToProject(vaultPath, { writingProjectId: id, draftNoteId: expectedDraft, versionNote: "用户自己保存的草稿" });
    await seedSmartNotesProductThinking(vaultPath);
    assert.equal((await getWritingProject(vaultPath, id)).draft_note_id, expectedDraft);
    const versions = await listProjectDraftVersions(vaultPath, id);
    assert.equal(versions.length, 1);
    assert.equal(versions[0].draft_note_id, expectedDraft);
    await assert.rejects(fs.readFile(marker), { code: "ENOENT" });
    await seedSmartNotesProductThinking(vaultPath);
    assert.deepEqual(await listProjectDraftVersions(vaultPath, id), versions);
  });
}

test("reimport does not initialize a preexisting empty project without a pending import marker", async t => {
  const vaultPath = await fs.mkdtemp(path.join(os.tmpdir(), "yansilu-demo-existing-project-"));
  t.after(() => fs.rm(vaultPath, { recursive: true, force: true }));
  const fixture = JSON.parse(await fs.readFile("tests/fixtures/demo-smart-notes-product-thinking/demo.json", "utf8"));
  delete fixture.writing_projects[0].draftNoteId;
  const fixturePath = path.join(vaultPath, "old-demo.json");
  await fs.writeFile(fixturePath, JSON.stringify(fixture), "utf8");
  await seedSmartNotesProductThinking(vaultPath, { fixturePath });
  const before = await getWritingProject(vaultPath, "WRITE-SMART-NOTES-DEMO");
  assert.equal(before.draft_note_id, null);
  await seedSmartNotesProductThinking(vaultPath);
  assert.deepEqual(await getWritingProject(vaultPath, before.id), before);
  assert.deepEqual(await listProjectDraftVersions(vaultPath, before.id), []);
});

test("imported user manual is a saved writing draft with resolvable sources and survives editing and reimport", async t => {
  const vaultPath = await fs.mkdtemp(path.join(os.tmpdir(), "yansilu-demo-manual-"));
  t.after(() => fs.rm(vaultPath, { recursive: true, force: true }));
  const seeded = await seedSmartNotesProductThinking(vaultPath);
  const project = await getWritingProject(vaultPath, "WRITE-SMART-NOTES-DEMO");
  assert.equal(project.draft_note_id, SMART_NOTES_MANUAL_ID);
  const manual = await getNoteById(vaultPath, project.draft_note_id);
  assert.equal(manual.noteType, "permanent");
  assert.ok(manual.body.includes(smartNotesDemoManual().body.trim()));
  const fixture = JSON.parse(await fs.readFile(seeded.fixturePath, "utf8"));
  for (const match of manual.body.matchAll(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g)) {
    const source = fixture.permanent_notes.find(note => note.title === match[1]);
    assert.ok(source, `manual source is missing: ${match[1]}`);
    assert.equal((await getNoteById(vaultPath, source.id)).title, match[1]);
  }
  const versions = await listProjectDraftVersions(vaultPath, project.id);
  await updateNoteContent(vaultPath, manual.id, { body: `${manual.body}\n我自己的实践说明。` });
  const edited = await getNoteById(vaultPath, manual.id);
  await seedSmartNotesProductThinking(vaultPath);
  assert.deepEqual(await getNoteById(vaultPath, manual.id), edited);
  assert.deepEqual(await listProjectDraftVersions(vaultPath, project.id), versions);
  assert.equal((await getWritingProject(vaultPath, project.id)).draft_note_id, manual.id);
});

test("Smart Notes Demo seed preserves the traceable viewpoint example", async (t) => {
  const vaultPath = await fs.mkdtemp(path.join(os.tmpdir(), "yansilu-smart-notes-demo-"));
  t.after(() => fs.rm(vaultPath, { recursive: true, force: true }));

  const seeded = await seedSmartNotesProductThinking(vaultPath);
  const note = await getNoteById(vaultPath, "PERM-PERMANENT-NOTE-IS-JUDGMENT");
  const graph = await getDirectoryGraph(vaultPath, seeded.directoryId);

  assert.match(note.startingQuestion, /材料变成/);
  assert.equal(note.viewpointHistory.length, 1);
  assert.equal(note.viewpointHistory.at(-1)?.thesis, note.thesis);
  assert.deepEqual(note.viewpointHistory[0]?.sourceNoteIds, [
    "PERM-PARAPHRASE-BEFORE-JUDGMENT",
    "PERM-FLEETING-NOTE-IS-CAPTURE"
  ]);
  const formationRelations = graph.edges.filter((relation) => (
    note.viewpointHistory[0].sourceNoteIds.includes(relation.fromNoteId)
  ));
  assert.ok(
    formationRelations.some((relation) => (
      relation.fromNoteId === "PERM-PARAPHRASE-BEFORE-JUDGMENT"
      && relation.toNoteId === note.id
      && relation.relationType === "supports"
    )),
    "the paraphrase should directly support the current viewpoint"
  );
  assert.equal(
    formationRelations.find((relation) => relation.fromNoteId === "PERM-FLEETING-NOTE-IS-CAPTURE")?.relationType,
    "precedes"
  );
  assert.equal(
    formationRelations.find((relation) => relation.fromNoteId === "PERM-FLEETING-NOTE-IS-CAPTURE")?.toNoteId,
    "PERM-PARAPHRASE-BEFORE-JUDGMENT"
  );

  const nextByNoteId = new Map();
  for (const relation of graph.edges) {
    const next = nextByNoteId.get(relation.fromNoteId) || [];
    next.push(relation.toNoteId);
    nextByNoteId.set(relation.fromNoteId, next);
  }
  for (const sourceNoteId of note.viewpointHistory[0].sourceNoteIds) {
    const queue = [sourceNoteId];
    const seen = new Set(queue);
    while (queue.length) {
      const current = queue.shift();
      for (const next of nextByNoteId.get(current) || []) {
        if (seen.has(next)) continue;
        seen.add(next);
        queue.push(next);
      }
    }
    assert.ok(seen.has(note.id), `${sourceNoteId} should reach the current viewpoint in the graph`);
  }

  const formationEdgeSnapshot = graph.edges
    .filter((relation) => note.viewpointHistory[0].sourceNoteIds.includes(relation.fromNoteId))
    .map((relation) => `${relation.id}:${relation.fromNoteId}:${relation.toNoteId}:${relation.relationType}`)
    .sort();
  await seedSmartNotesProductThinking(vaultPath);
  const refreshedGraph = await getDirectoryGraph(vaultPath, seeded.directoryId);
  const refreshedFormationEdgeSnapshot = refreshedGraph.edges
    .filter((relation) => note.viewpointHistory[0].sourceNoteIds.includes(relation.fromNoteId))
    .map((relation) => `${relation.id}:${relation.fromNoteId}:${relation.toNoteId}:${relation.relationType}`)
    .sort();

  assert.equal(refreshedGraph.totalEdges, graph.totalEdges);
  assert.deepEqual(refreshedFormationEdgeSnapshot, formationEdgeSnapshot);
});

test("reimport preserves edited notes, sources, relations, themes and writing work", async (t) => {
  const vaultPath = await fs.mkdtemp(path.join(os.tmpdir(), "yansilu-demo-reimport-"));
  t.after(() => fs.rm(vaultPath, { recursive: true, force: true }));
  const seeded = await seedSmartNotesProductThinking(vaultPath);
  const noteId = "PERM-PERMANENT-NOTE-IS-JUDGMENT";
  await updateNoteContent(vaultPath, noteId, { title: "我的改写观点", body: "# 我的改写观点\n保留练习正文", thesis: "我的新判断", thesisChangeReason: "补充自己的理解和适用条件" });
  const graph = await getDirectoryGraph(vaultPath, seeded.directoryId);
  const relation = graph.edges.find((item) => item.relationSource !== "body_wikilink" && item.fromNoteId === "PERM-PARAPHRASE-BEFORE-JUDGMENT");
  assert.ok(relation);
  await updateNoteRelation(vaultPath, relation.id, { relationType: "qualifies", rationale: "我的理由和条件，不用示例覆盖" });
  const project = await getWritingProject(vaultPath, "WRITE-SMART-NOTES-DEMO");
  const cardId = project.related_index_ids[0];
  await updateIndexCard(vaultPath, cardId, { title: "我的主题", centralQuestion: "我自己的问题" });
  await syncWritingProject(vaultPath, project.id, { title: "我的文章", goal: "我自己的写作目标" });
  const scaffold = await getDraftScaffold(vaultPath, project.scaffold_id);
  await updateDraftScaffold(vaultPath, scaffold.id, { sections: [{ ...scaffold.sections[0], heading: "我的章节" }] });
  const sourcePath = getNotePath(vaultPath, "source", "SRC-SMART-NOTES");
  const source = await fs.readFile(sourcePath, "utf8");
  await fs.writeFile(sourcePath, `${source}\n用户补充的来源说明\n`, "utf8");
  const before = {
    note: await getNoteById(vaultPath, noteId),
    source: await fs.readFile(sourcePath, "utf8"),
    project: await getWritingProject(vaultPath, project.id),
    scaffold: await getDraftScaffold(vaultPath, scaffold.id),
    card: await getIndexCard(vaultPath, cardId),
    graph: await getDirectoryGraph(vaultPath, seeded.directoryId)
  };
  const repeated = await seedSmartNotesProductThinking(vaultPath);
  assert.deepEqual(await getNoteById(vaultPath, noteId), before.note);
  assert.equal(await fs.readFile(sourcePath, "utf8"), before.source);
  assert.deepEqual(await getWritingProject(vaultPath, project.id), before.project);
  assert.deepEqual(await getDraftScaffold(vaultPath, scaffold.id), before.scaffold);
  assert.deepEqual(await getIndexCard(vaultPath, cardId), before.card);
  const afterGraph = await getDirectoryGraph(vaultPath, seeded.directoryId);
  assert.deepEqual(afterGraph.edges, before.graph.edges);
  const preserved = afterGraph.edges.find((item) => item.id === relation.id);
  assert.equal(preserved.relationType, "qualifies");
  assert.equal(preserved.rationale, "我的理由和条件，不用示例覆盖");
  assert.equal(repeated.summary.createdNotes, 0);
  assert.equal(repeated.summary.updatedNotes, 0);
  assert.ok(repeated.summary.preservedNotes > 0);

  const fixture = JSON.parse(await fs.readFile(seeded.fixturePath, "utf8"));
  fixture.guide_notes.push({ id: "GUIDE-REIMPORT-MISSING", note_type: "guide", title: "补齐的练习", body: "只添加缺失示例" });
  const fixturePath = path.join(vaultPath, "reimport-test-fixture.json");
  await fs.writeFile(fixturePath, JSON.stringify(fixture), "utf8");
  const completed = await seedSmartNotesProductThinking(vaultPath, { fixturePath });
  assert.equal(completed.summary.createdNotes, 1);
  assert.match((await getNoteById(vaultPath, "GUIDE-REIMPORT-MISSING")).body, /只添加缺失示例/);
  assert.deepEqual(await getNoteById(vaultPath, noteId), before.note);
  assert.deepEqual(await getWritingProject(vaultPath, project.id), before.project);
});

test("short practice starts with real source material and three unconfirmed blank judgments", async (t) => {
  const vaultPath = await fs.mkdtemp(path.join(os.tmpdir(), "yansilu-short-demo-"));
  t.after(() => fs.rm(vaultPath, { recursive: true, force: true }));
  const seeded = await seedSmartNotesProductThinking(vaultPath);
  assert.equal(seeded.firstNoteId, "GUIDE-SHORT-PRACTICE");
  assert.equal(seeded.writingProjectId, "WRITE-SHORT-PRACTICE");
  const material = await getNoteById(vaultPath, "LN-SHORT-PRACTICE");
  const source = await getNoteById(vaultPath, "LN-PARAPHRASE-IS-FIRST-CHECK");
  const paragraph = source.body.match(/## 我的转述\s*\n([\s\S]*?)(?=\n## |$)/)[1].trim();
  assert.ok(material.body.includes(paragraph));
  for (const id of ["PERM-PRACTICE-EXPLAIN", "PERM-PRACTICE-REUSE", "PERM-PRACTICE-WRITE"]) {
    const note = await getNoteById(vaultPath, id);
    assert.equal(note.thesis || "", "");
    assert.notEqual(note.distillationStatus, "confirmed");
    assert.ok(note.startingQuestion);
    assert.ok(note.body.includes(paragraph));
  }
  const project = await getWritingProject(vaultPath, seeded.writingProjectId);
  assert.equal(project.scaffold_id, null);
  assert.equal(project.basket_note_ids.length, 3);
  assert.ok((await getWritingProject(vaultPath, "WRITE-SMART-NOTES-DEMO")).scaffold_id);
  await updateNoteContent(vaultPath, "PERM-PRACTICE-EXPLAIN", { thesis: "自己的判断", body: "自己写的解释" });
  const before = await getNoteById(vaultPath, "PERM-PRACTICE-EXPLAIN");
  await seedSmartNotesProductThinking(vaultPath);
  assert.deepEqual(await getNoteById(vaultPath, before.id), before);
});
