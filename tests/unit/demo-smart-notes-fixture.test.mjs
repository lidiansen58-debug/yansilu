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
  "complements",
  "extends",
  "contrasts",
  "contradicts",
  "qualifies",
  "precedes",
  "follows",
  "example_of",
  "counterexample_to",
  "same_topic",
  "unexpected_connection",
  "bridges",
  "restates",
  "reframes",
  "appears_in_draft",
  "duplicates"
];

test("smart notes product demo fixture keeps the requested scope", () => {
  assert.equal(fixture.sources.length, 1);
  assert.equal(fixture.fleeting_notes.length, 2);
  assert.equal(fixture.literature_notes.length, 24);
  assert.equal(fixture.permanent_notes.length, 101);
  assert.equal(fixture.index_cards.length, 12);
  assert.equal(fixture.relations.length, 322);
  assert.equal(fixture.writing_projects.length, 1);
  assert.equal(fixture.draft_scaffolds.length, 1);
  assert.equal(fixture.final_essays.length, 1);
  assert.equal(fixture.guide_notes.length, 1);
  assert.deepEqual(fixture.counts, {
    sources: 1,
    fleeting_notes: 2,
    literature_notes: 24,
    permanent_notes: 101,
    index_cards: 12,
    relations: 322,
    writing_projects: 1,
    draft_scaffolds: 1,
    final_essays: 1,
    guide_notes: 1
  });
});

test("smart notes product demo fixture includes a source card as the reading boundary anchor", () => {
  const source = fixture.sources[0];
  assert.equal(source.note_type, "source");
  assert.equal(source.id, "SRC-SMART-NOTES");
  assert.ok(source.title, "source card should have a title");
  assert.ok(source.use_boundary, "source card should define the reuse boundary");
  assert.ok(source.extraction_scope, "source card should define extraction scope");
  assert.ok(source.conversion_policy, "source card should define conversion policy");
  assert.equal(source.knowledge_point_ids.length, fixture.knowledge_extraction.knowledge_points.length);
});

test("smart notes product demo fixture declares rich extraction templates and key notes", () => {
  assert.deepEqual(Object.keys(fixture.conversion_templates), [
    "fleeting_note",
    "literature_note",
    "permanent_note",
    "index_card",
    "key_note"
  ]);
  assert.equal(fixture.knowledge_extraction.knowledge_points.length, 9);
  assert.equal(fixture.key_notes.length, 9);

  const permanentIds = new Set(fixture.permanent_notes.map((note) => note.id));
  const indexIds = new Set(fixture.index_cards.map((card) => card.id));
  const declaredClusters = new Set(fixture.knowledge_extraction.knowledge_points.map((point) => point.cluster));
  const seenClusters = new Set();
  for (const keyNote of fixture.key_notes) {
    assert.ok(permanentIds.has(keyNote.note_id), `${keyNote.id} references missing permanent note`);
    assert.ok(indexIds.has(keyNote.index_card_id), `${keyNote.id} references missing index card`);
    assert.equal(keyNote.role, "cluster_anchor", `${keyNote.id} should be the anchor for its cluster`);
    assert.ok(keyNote.cluster, `${keyNote.id} should declare a cluster`);
    seenClusters.add(keyNote.cluster);
  }
  assert.deepEqual([...seenClusters].sort(), [...declaredClusters].sort(), "key notes should cover every declared knowledge cluster");
});

test("smart notes product demo fixture models processed fleeting notes", () => {
  const permanentIds = new Set(fixture.permanent_notes.map((note) => note.id));

  for (const note of fixture.fleeting_notes) {
    assert.equal(note.note_type, "fleeting");
    assert.equal(note.status, "needs_processing");
    assert.equal(note.template.type, "fleeting_note");
    assert.ok(note.body.includes("## 原始闪念"), `${note.id} body should follow the fleeting-note template`);
    assert.ok(note.body.includes("## 已转换为"), `${note.id} body should expose converted targets`);
    assert.ok(note.next_action, `${note.id} should tell the user what to do next`);
    assert.ok(note.processed_into.length > 0, `${note.id} should point to processed permanent notes`);
    for (const targetId of note.processed_into) {
      assert.ok(permanentIds.has(targetId), `${note.id} points to missing processed note ${targetId}`);
    }
  }
});

test("smart notes product demo fixture permanent notes follow the unified PM-angle template", () => {
  const literatureIds = new Set(fixture.literature_notes.map((note) => note.id));
  const universalSections = [
    "核心论点",
    "知识点提取",
    "三句话压缩",
    "论证理由",
    "来源追溯",
    "产品含义",
    "关键笔记定位",
    "边界或反例"
  ];

  for (const note of fixture.permanent_notes) {
    assert.equal(note.note_type, "permanent");
    assert.equal(note.status, "active");
    assert.equal(note.distillation_status, "confirmed");
    assert.deepEqual(note.authorship, { user_confirmed: true, ai_assisted: false });
    assert.equal(note.originality_status, "pass");
    assert.ok(note.thesis, `${note.id} needs a thesis`);
    assert.equal(note.threeLineSummary.length, 3, `${note.id} needs a three-line summary`);
    assert.equal(note.core_claim, note.thesis, `${note.id} core claim should mirror its confirmed thesis`);
    assert.ok(note.knowledge_point?.id, `${note.id} should link to an extracted knowledge point`);
    assert.deepEqual(note.template?.required_sections, universalSections, `${note.id} should declare the unified permanent-note template`);
    assert.equal(Boolean(note.pmRestatement), false, `${note.id} should not carry a separate PM restatement field`);
    assert.ok(note.productImplication, `${note.id} needs a product implication`);
    assert.equal(note.body.includes("## 产品经理复述"), false, `${note.id} body should not repeat a PM restatement section`);
    assert.ok(note.body.includes("## 知识点提取"), `${note.id} body should expose richer knowledge extraction`);
    for (const sourceId of note.from_literature_note_ids || []) {
      assert.ok(literatureIds.has(sourceId), `${note.id} references missing literature note ${sourceId}`);
    }
  }
});

test("smart notes product demo fixture literature notes are original paraphrases", () => {
  const permanentIds = new Set(fixture.permanent_notes.map((note) => note.id));
  for (const note of fixture.literature_notes) {
    assert.equal(note.note_type, "literature");
    assert.equal(note.status, "paraphrased");
    assert.equal(note.template.type, "literature_note");
    assert.ok(note.quote_text, `${note.id} needs a source boundary`);
    assert.ok(Array.isArray(note.knowledge_points) && note.knowledge_points.length >= 3, `${note.id} needs extracted knowledge points`);
    assert.ok(note.body.includes("## 知识点提取"), `${note.id} body should follow the literature-note template`);
    assert.ok(note.paraphrase_text && note.paraphrase_text.length >= 24, `${note.id} needs a paraphrase_text`);
    assert.ok(note.my_takeaway && note.my_takeaway.length >= 12, `${note.id} needs a my_takeaway`);
    assert.ok(Array.isArray(note.candidate_permanent_notes) && note.candidate_permanent_notes.length > 0, `${note.id} needs candidates`);
    for (const targetId of note.candidate_permanent_notes) {
      assert.ok(permanentIds.has(targetId), `${note.id} points to missing permanent note ${targetId}`);
    }
  }
});

test("smart notes product demo fixture includes an inspection guide", () => {
  const guide = fixture.guide_notes[0];
  assert.equal(guide.id, "GUIDE-SN-001");
  assert.equal(guide.note_type, "guide");
  assert.match(guide.body, /第一次打开先走五步|五步走完整流程/);
  assert.match(guide.body, /SRC-SMART-NOTES/);
  assert.match(guide.body, /LN-SN-001/);
  assert.doesNotMatch(guide.body, /LIT-SN-001/);
  assert.match(guide.body, /PN-SN-101/);
  assert.match(guide.body, /未关联笔记进入关系网/);
  assert.match(guide.body, /主题索引笔记不是文章/);
  assert.match(guide.body, /3 到 7 条永久笔记/);
  assert.match(guide.body, /每条关键关系都写了理由/);
  assert.match(guide.body, /WP-SN-PM-001/);
  assert.match(guide.body, /DS-SN-PM-001/);
  assert.match(guide.body, /孤立笔记/);
  assert.match(guide.body, /过宽标签/);
  assert.match(guide.body, /没有理由的关系/);
  assert.match(guide.body, /可以写成文章的主题/);
  assert.doesNotMatch(guide.body, /候选|队列|复核|线索/);
});

test("smart notes product demo fixture index cards organize ordered items and key-note anchors", () => {
  const permanentIds = new Set(fixture.permanent_notes.map((note) => note.id));
  const keyNoteIds = new Set(fixture.key_notes.map((note) => note.note_id));
  const keyNotesByCluster = new Map(fixture.key_notes.map((note) => [note.cluster, note.note_id]));
  const knowledgePointsById = new Map(fixture.knowledge_extraction.knowledge_points.map((point) => [point.id, point]));

  for (const card of fixture.index_cards) {
    assert.equal(card.index_type, "topic");
    assert.equal(card.template.type, "index_card");
    assert.ok(card.items.length > 0, `${card.id} should expose ordered index items`);
    assert.ok(card.key_note_ids.length > 0, `${card.id} should expose key note anchors`);
    assert.ok(card.knowledge_point_ids.length > 0, `${card.id} should expose supporting knowledge points`);
    for (const item of card.items) {
      assert.ok(permanentIds.has(item.note_id), `${card.id} item references missing note ${item.note_id}`);
      assert.ok(item.rationale, `${card.id} item ${item.note_id} needs a rationale`);
    }
    for (const keyNoteId of card.key_note_ids) {
      assert.ok(keyNoteIds.has(keyNoteId), `${card.id} key note ${keyNoteId} should be registered`);
    }
    for (const knowledgePointId of card.knowledge_point_ids) {
      const point = knowledgePointsById.get(knowledgePointId);
      assert.ok(point, `${card.id} knowledge point ${knowledgePointId} should be registered`);
      assert.ok(card.key_note_ids.includes(keyNotesByCluster.get(point.cluster)), `${card.id} should anchor the key note for cluster ${point.cluster}`);
    }
  }
});

test("smart notes product demo fixture includes one unlinked practice note for the guide", () => {
  const practiceNote = fixture.permanent_notes.find((note) => note.id === "PN-SN-101");
  assert.ok(practiceNote, "expected unlinked practice note");
  assert.match(practiceNote.title, /关系练习|未关联/);
  assert.equal(practiceNote.demo_role, "unlinked_relation_practice");
  assert.equal(practiceNote.template_completion.has_relation_context, false);
  assert.match(practiceNote.body, /待补充与相邻笔记的显式关系/);

  const touchingRelations = fixture.relations.filter((relation) => relation.from === practiceNote.id || relation.to === practiceNote.id);
  assert.equal(touchingRelations.length, 0, "practice note should start outside the relation network");
});

test("smart notes product demo fixture relations are typed and complete enough", () => {
  const permanentIds = new Set(fixture.permanent_notes.map((note) => note.id));
  const fleetingIds = new Set(fixture.fleeting_notes.map((note) => note.id));
  const literatureIds = new Set(fixture.literature_notes.map((note) => note.id));
  const projectIds = new Set(fixture.writing_projects.map((project) => project.id));
  const finalEssayIds = new Set(fixture.final_essays.map((note) => note.id));
  const guideIds = new Set(fixture.guide_notes.map((note) => note.id));
  const validTargets = new Set([...permanentIds, ...fleetingIds, ...literatureIds, ...projectIds, ...finalEssayIds, ...guideIds]);
  const relationTypes = new Set();
  const permanentTouchCount = new Map([...permanentIds].map((id) => [id, 0]));
  const seenKeys = new Set();

  for (const relation of fixture.relations) {
    assert.ok(validTargets.has(relation.from), `${relation.id} has missing from target ${relation.from}`);
    assert.ok(validTargets.has(relation.to), `${relation.id} has missing to target ${relation.to}`);
    assert.notEqual(relation.from, relation.to, `${relation.id} links a note to itself`);
    assert.ok(relation.rationale.length >= 12, `${relation.id} should explain the relation`);
    assert.ok(relation.insight_question.length >= 12, `${relation.id} should carry a follow-up question`);

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
  assert.ok(relationTypes.has("belongs_to_topic"), "fixture should link ordinary notes to key notes");
  assert.ok(relationTypes.has("bridges"), "fixture should link key notes into a reading path");
  const intentionallyUnlinkedIds = new Set(["PN-SN-101"]);
  for (const [noteId, count] of permanentTouchCount) {
    if (intentionallyUnlinkedIds.has(noteId)) {
      assert.equal(count, 0, `${noteId} should remain available for the guide relation practice`);
      continue;
    }
    assert.ok(count > 0, `${noteId} should have at least one relation`);
  }
});

test("smart notes product demo fixture writing project traces notes and sources", () => {
  const permanentIds = new Set(fixture.permanent_notes.map((note) => note.id));
  const literatureIds = new Set(fixture.literature_notes.map((note) => note.id));
  const indexIds = new Set(fixture.index_cards.map((card) => card.id));
  const keyNoteIds = new Set(fixture.key_notes.map((note) => note.note_id));
  const declaredKeyNoteIds = fixture.key_notes.map((note) => note.note_id);
  const project = fixture.writing_projects[0];
  const scaffold = fixture.draft_scaffolds[0];

  assert.equal(scaffold.writing_project_id, project.id);
  assert.match(project.goal, /研思录为什么不是资料仓库|思考工作台/);
  assert.ok(project.basketNoteIds.length >= 8);
  assert.ok(project.indexCardIds.length >= 4);
  assert.deepEqual(project.keyNoteIds, declaredKeyNoteIds);
  assert.deepEqual(scaffold.key_note_ids, declaredKeyNoteIds);

  for (const noteId of project.basketNoteIds) {
    assert.ok(permanentIds.has(noteId), `${project.id} basket references missing note ${noteId}`);
  }
  for (const cardId of project.indexCardIds) {
    assert.ok(indexIds.has(cardId), `${project.id} references missing index card ${cardId}`);
  }
  for (const section of project.outline) {
    assert.ok(section.noteTraceIds.length > 0, `${section.sectionId} should trace permanent notes`);
    assert.ok(section.literatureTraceIds.length > 0, `${section.sectionId} should trace literature notes`);
    assert.ok(section.keyNoteTraceIds.length > 0, `${section.sectionId} should trace key notes`);
    for (const noteId of section.noteTraceIds) assert.ok(permanentIds.has(noteId), `${section.sectionId} missing note ${noteId}`);
    for (const noteId of section.literatureTraceIds) assert.ok(literatureIds.has(noteId), `${section.sectionId} missing literature ${noteId}`);
    for (const noteId of section.keyNoteTraceIds) assert.ok(keyNoteIds.has(noteId), `${section.sectionId} missing key note ${noteId}`);
  }
  for (const section of scaffold.sections) {
    assert.ok(section.key_note_ids.length > 0, `${section.id} should keep scaffold key-note trace`);
    for (const noteId of section.key_note_ids) assert.ok(keyNoteIds.has(noteId), `${section.id} missing scaffold key note ${noteId}`);
  }
  assert.match(fixture.final_essays[0].body, /研思录/);
});

test("smart notes product demo fixture graph exposes key-note paths", () => {
  const sourceIds = new Set(fixture.sources.map((note) => note.id));
  const literatureIds = new Set(fixture.literature_notes.map((note) => note.id));
  const keyNoteIds = new Set(fixture.key_notes.map((note) => note.note_id));
  const permanentIds = new Set(fixture.permanent_notes.map((note) => note.id));
  const indexIds = new Set(fixture.index_cards.map((card) => card.id));
  const writingProjectIds = new Set(fixture.writing_projects.map((project) => project.id));
  const finalEssayIds = new Set(fixture.final_essays.map((note) => note.id));
  const draftScaffoldIds = new Set(fixture.draft_scaffolds.map((scaffold) => scaffold.id));
  const validReadingPathIds = new Set([
    ...sourceIds,
    ...literatureIds,
    ...permanentIds,
    ...indexIds,
    ...writingProjectIds,
    ...finalEssayIds,
    ...draftScaffoldIds
  ]);
  const graphClusters = new Set(fixture.graph.key_note_paths.map((path) => path.cluster));
  const keyNoteClusters = new Set(fixture.key_notes.map((note) => note.cluster));

  assert.equal(fixture.graph.key_note_paths.length, fixture.key_notes.length);
  assert.deepEqual(fixture.graph.reading_path, [
    "SRC-SMART-NOTES",
    "LN-SN-001",
    "PN-SN-001",
    "IC-SN-001",
    "WP-SN-PM-001",
    "ESSAY-SN-PM-001",
    "DS-SN-PM-001"
  ]);
  for (const id of fixture.graph.reading_path) {
    assert.ok(validReadingPathIds.has(id), `reading path references missing node ${id}`);
  }
  assert.deepEqual([...graphClusters].sort(), [...keyNoteClusters].sort(), "graph key-note paths should cover every key-note cluster");
  for (const path of fixture.graph.key_note_paths) {
    assert.ok(keyNoteIds.has(path.key_note_id), `${path.key_note_id} should be a registered key note`);
    assert.ok(indexIds.has(path.index_card_id), `${path.key_note_id} should point to an index card`);
    assert.ok(path.cluster, `${path.key_note_id} should declare a cluster path`);
    assert.ok(path.supporting_note_ids.length > 0, `${path.key_note_id} should have supporting notes`);
    for (const noteId of path.supporting_note_ids) {
      assert.ok(permanentIds.has(noteId), `${path.key_note_id} has missing support ${noteId}`);
    }
  }
});
