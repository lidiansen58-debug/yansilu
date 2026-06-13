import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturePath = path.resolve(__dirname, "..", "fixtures", "acceptance", "yijing-rich-acceptance.json");
const fixture = JSON.parse(fs.readFileSync(fixturePath, "utf8"));

test("Yijing rich acceptance fixture keeps the requested note counts", () => {
  assert.equal(fixture.fleeting_notes.length, 2);
  assert.equal(fixture.literature_notes.length, 3);
  assert.equal(fixture.original_notes.length, fixture.counts.original_notes);
  assert.equal(fixture.relations.length, fixture.counts.relations);
  assert.equal(fixture.writing_projects.length, 2);
  assert.deepEqual(fixture.counts, {
    fleeting_notes: fixture.fleeting_notes.length,
    literature_notes: fixture.literature_notes.length,
    original_notes: fixture.original_notes.length,
    relations: fixture.relations.length,
    index_cards: fixture.index_cards.length,
    writing_projects: fixture.writing_projects.length
  });
});

test("Yijing rich acceptance fixture relations and traces reference existing notes", () => {
  const originalIds = new Set(fixture.original_notes.map((note) => note.id));
  const literatureIds = new Set(fixture.literature_notes.map((note) => note.id));
  const seenRelationKeys = new Set();

  assert.equal(originalIds.size, fixture.counts.original_notes);

  for (const note of fixture.literature_notes) {
    assert.ok(note.demoUse, `${note.id} should explain demo usage`);
    assert.ok(note.readingFocus.length >= 2, `${note.id} should include reading focus`);
    assert.ok(note.extractionPlan.length >= 2, `${note.id} should include an extraction plan`);
    assert.ok(note.candidateNoteIds.length >= 4, `${note.id} should point to candidate permanent notes`);
  }

  for (const note of fixture.original_notes) {
    assert.ok(note.thesis, `${note.id} should have a thesis`);
    assert.equal(note.threeLineSummary.length, 3, `${note.id} should have three-line summary`);
    assert.equal(note.template_version, "permanent-note-v2", `${note.id} should use the current permanent note template`);
    assert.ok(note.boundary_or_counterpoint, `${note.id} should preserve a boundary or counterpoint`);
    assert.match(note.body, /## 一句话论点/);
    assert.match(note.body, /## 三句话压缩/);
    assert.match(note.body, /## 问题来源/);
    assert.match(note.body, /## 边界与反例/);
    assert.match(note.body, /## 关联理由写法/);
    assert.match(note.body, /## 可进入的使用场景/);
    for (const sourceId of note.from_literature_note_ids || []) {
      assert.ok(literatureIds.has(sourceId), `${note.id} references missing literature note ${sourceId}`);
    }
  }

  for (const relation of fixture.relations) {
    assert.ok(originalIds.has(relation.from), `relation ${relation.id} has missing from note`);
    assert.ok(originalIds.has(relation.to), `relation ${relation.id} has missing to note`);
    assert.notEqual(relation.from, relation.to, `relation ${relation.id} links a note to itself`);
    assert.ok(relation.rationale.length >= 8, `relation ${relation.id} should explain the link`);
    assert.ok(relation.relationTypeLabel, `relation ${relation.id} should expose a readable type label`);
    assert.ok(relation.reviewHint, `relation ${relation.id} should include a demo review hint`);
    assert.match(relation.rationale, /这条边不是弱相关/);
    const key = `${relation.from}->${relation.to}:${relation.relationType}`;
    assert.equal(seenRelationKeys.has(key), false, `duplicate relation key ${key}`);
    seenRelationKeys.add(key);
  }

  for (const project of fixture.writing_projects) {
    assert.ok(project.basketNoteIds.length > 0, `${project.id} needs a basket`);
    for (const noteId of project.basketNoteIds) {
      assert.ok(originalIds.has(noteId), `${project.id} basket references missing note ${noteId}`);
    }
    for (const section of project.outline) {
      assert.ok(section.noteTraceIds.length > 0, `${project.id}/${section.sectionId} needs note traces`);
      assert.ok(section.literatureTraceIds.length > 0, `${project.id}/${section.sectionId} needs literature traces`);
      for (const noteId of section.noteTraceIds) {
        assert.ok(originalIds.has(noteId), `${project.id}/${section.sectionId} references missing note ${noteId}`);
      }
      for (const literatureId of section.literatureTraceIds) {
        assert.ok(
          literatureIds.has(literatureId),
          `${project.id}/${section.sectionId} references missing literature note ${literatureId}`
        );
      }
    }
  }
});

test("Yijing rich acceptance fixture graph exposes every semantic relation", () => {
  const graphLines = fixture.graph.mermaid.split(/\r?\n/);
  const edgeLines = graphLines.filter((line) => line.includes("-->|"));
  assert.equal(edgeLines.length, fixture.relations.length);

  for (const relation of fixture.relations) {
    const from = relation.from.replace(/[^a-z0-9]+/gi, "_");
    const to = relation.to.replace(/[^a-z0-9]+/gi, "_");
    const expectedEdge = `${from} -->|${relation.relationType}| ${to}`;
    assert.ok(
      edgeLines.some((line) => line.includes(expectedEdge)),
      `graph is missing ${expectedEdge}`
    );
  }
});
