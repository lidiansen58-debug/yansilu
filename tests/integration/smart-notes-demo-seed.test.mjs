import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { getDirectoryGraph, getNoteById, getNotePath, updateNoteContent, updateNoteRelation, getIndexCard, updateIndexCard } from "../../packages/domain/src/index.mjs";
import { getWritingProject, syncWritingProject, getDraftScaffold, updateDraftScaffold } from "../../packages/writing-engine/src/index.mjs";
import { seedSmartNotesProductThinking } from "../../scripts/seed-smart-notes-product-thinking.mjs";

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
