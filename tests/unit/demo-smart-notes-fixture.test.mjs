import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturePath = path.resolve(__dirname, "..", "fixtures", "demo-smart-notes-product-thinking", "demo.json");
const fixture = JSON.parse(fs.readFileSync(fixturePath, "utf8"));

const REQUIRED_RELATION_TYPES = [
  "supports",
  "extends",
  "contrasts",
  "tension",
  "gap",
  "leads_to",
  "evidence_for",
  "example_of",
  "counterexample_to",
  "depends_on",
  "duplicates_or_overlaps",
  "refines",
  "source_gap",
  "writing_move"
];

test("smart notes product demo fixture keeps the requested scope", () => {
  assert.equal(fixture.sources.length, 1);
  assert.equal(fixture.fleeting_notes.length, 2);
  assert.equal(fixture.literature_notes.length, 24);
  assert.equal(fixture.permanent_notes.length, 100);
  assert.equal(fixture.index_cards.length, 12);
  assert.equal(fixture.relations.length, 159);
  assert.equal(fixture.writing_projects.length, 1);
  assert.equal(fixture.draft_scaffolds.length, 1);
  assert.equal(fixture.final_essays.length, 1);
  assert.deepEqual(fixture.counts, {
    sources: 1,
    fleeting_notes: 2,
    literature_notes: 24,
    permanent_notes: 100,
    index_cards: 12,
    relations: 159,
    writing_projects: 1,
    draft_scaffolds: 1,
    final_essays: 1
  });
});

test("smart notes product demo fixture models processed fleeting notes", () => {
  const permanentIds = new Set(fixture.permanent_notes.map((note) => note.id));

  for (const note of fixture.fleeting_notes) {
    assert.equal(note.note_type, "fleeting");
    assert.equal(note.status, "needs_processing");
    assert.ok(note.next_action, `${note.id} should tell the user what to do next`);
    assert.ok(note.processed_into.length > 0, `${note.id} should point to processed permanent notes`);
    for (const targetId of note.processed_into) {
      assert.ok(permanentIds.has(targetId), `${note.id} points to missing processed note ${targetId}`);
    }
  }
});

test("smart notes product demo fixture permanent notes are PM-restated judgments", () => {
  const literatureIds = new Set(fixture.literature_notes.map((note) => note.id));

  for (const note of fixture.permanent_notes) {
    assert.equal(note.note_type, "permanent");
    assert.equal(note.distillation_status, "confirmed");
    assert.ok(note.thesis, `${note.id} needs a thesis`);
    assert.equal(note.threeLineSummary.length, 3, `${note.id} needs a three-line summary`);
    assert.ok(note.pmRestatement, `${note.id} needs a product-manager restatement`);
    assert.ok(note.productImplication, `${note.id} needs a product implication`);
    assert.ok(note.body.includes("## 产品经理复述"), `${note.id} body should expose the PM restatement`);
    for (const sourceId of note.from_literature_note_ids || []) {
      assert.ok(literatureIds.has(sourceId), `${note.id} references missing literature note ${sourceId}`);
    }
  }
});

test("smart notes product demo fixture relations are typed and complete enough", () => {
  const permanentIds = new Set(fixture.permanent_notes.map((note) => note.id));
  const fleetingIds = new Set(fixture.fleeting_notes.map((note) => note.id));
  const projectIds = new Set(fixture.writing_projects.map((project) => project.id));
  const validTargets = new Set([...permanentIds, ...fleetingIds, ...projectIds]);
  const relationTypes = new Set();
  const permanentTouchCount = new Map([...permanentIds].map((id) => [id, 0]));
  const seenKeys = new Set();

  for (const relation of fixture.relations) {
    assert.ok(validTargets.has(relation.from), `${relation.id} has missing from target ${relation.from}`);
    assert.ok(validTargets.has(relation.to), `${relation.id} has missing to target ${relation.to}`);
    assert.notEqual(relation.from, relation.to, `${relation.id} links a note to itself`);
    assert.ok(relation.rationale.length >= 12, `${relation.id} should explain the relation`);

    const key = `${relation.from}->${relation.to}:${relation.relationType}`;
    assert.equal(seenKeys.has(key), false, `duplicate relation key ${key}`);
    seenKeys.add(key);
    relationTypes.add(relation.relationType);

    if (permanentTouchCount.has(relation.from)) permanentTouchCount.set(relation.from, permanentTouchCount.get(relation.from) + 1);
    if (permanentTouchCount.has(relation.to)) permanentTouchCount.set(relation.to, permanentTouchCount.get(relation.to) + 1);
  }

  for (const type of REQUIRED_RELATION_TYPES) {
    assert.ok(relationTypes.has(type), `fixture should include relation type ${type}`);
  }
  for (const [noteId, count] of permanentTouchCount) {
    assert.ok(count > 0, `${noteId} should have at least one relation`);
  }
});

test("smart notes product demo fixture writing project traces notes and sources", () => {
  const permanentIds = new Set(fixture.permanent_notes.map((note) => note.id));
  const literatureIds = new Set(fixture.literature_notes.map((note) => note.id));
  const indexIds = new Set(fixture.index_cards.map((card) => card.id));
  const project = fixture.writing_projects[0];
  const scaffold = fixture.draft_scaffolds[0];

  assert.equal(scaffold.writing_project_id, project.id);
  assert.ok(project.basketNoteIds.length >= 8);
  assert.ok(project.indexCardIds.length >= 4);

  for (const noteId of project.basketNoteIds) {
    assert.ok(permanentIds.has(noteId), `${project.id} basket references missing note ${noteId}`);
  }
  for (const cardId of project.indexCardIds) {
    assert.ok(indexIds.has(cardId), `${project.id} references missing index card ${cardId}`);
  }
  for (const section of project.outline) {
    assert.ok(section.noteTraceIds.length > 0, `${section.sectionId} should trace permanent notes`);
    assert.ok(section.literatureTraceIds.length > 0, `${section.sectionId} should trace literature notes`);
    for (const noteId of section.noteTraceIds) assert.ok(permanentIds.has(noteId), `${section.sectionId} missing note ${noteId}`);
    for (const noteId of section.literatureTraceIds) assert.ok(literatureIds.has(noteId), `${section.sectionId} missing literature ${noteId}`);
  }
  assert.match(fixture.final_essays[0].body, /研思录/);
});
