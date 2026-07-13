import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const fixturePath = path.resolve("tests", "fixtures", "demo-smart-notes-product-thinking", "demo.json");

async function readFixture() {
  return JSON.parse(await fs.readFile(fixturePath, "utf8"));
}

function wikilinkTargets(body = "") {
  const targets = [];
  for (const match of String(body || "").matchAll(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g)) {
    const target = String(match[1] || "").trim();
    if (target) targets.push(target);
  }
  return targets;
}

function relationPairKey(from = "", to = "") {
  return [String(from || "").trim(), String(to || "").trim()].sort().join("::");
}

test("Smart Notes Demo fixture teaches the current home-first beginner path", async () => {
  const fixture = await readFixture();
  const allText = JSON.stringify(fixture);

  assert.doesNotMatch(allText, /PN-SN|WP-SN|IC-SN/);
  assert.doesNotMatch(allText, /今日整理/);
  assert.doesNotMatch(allText, /备份与恢复比导入导出更重要|未来产品路线可以从笔记中长出来/);
  assert.match(allText, /首页/);

  assert.ok(fixture.permanent_notes.some((note) => note.id === "PERM-DEMO-FIRST-RUN-RECOMMENDED"));
  assert.ok(fixture.index_cards.some((card) => card.id === "THEME-DEMO-FIRST-RUN"));
  assert.ok(fixture.permanent_notes.some((note) => note.id === "PERM-HELP-SHOULD-FOLLOW-TASKS"));
  assert.ok(fixture.permanent_notes.some((note) => note.id === "PERM-BEST-PATH-STARTS-FROM-HOME"));
  assert.ok(fixture.index_cards.some((card) => card.id === "THEME-HELP-BEST-PATH"));
  assert.ok(fixture.guide_notes.some((note) => note.id === "GUIDE-HELP-TASKS"));
  assert.ok(fixture.guide_notes.some((note) => note.id === "GUIDE-BACKUP-MOBILE-AI"));
  assert.ok(fixture.fleeting_notes.some((note) => note.status === "needs_processing"));
  assert.ok(fixture.literature_notes.some((note) => note.status === "needs_processing"));
  assert.ok(fixture.relations.some((relation) => relation.from === "PERM-DEMO-FIRST-RUN-RECOMMENDED"));
  assert.ok(fixture.relations.some((relation) => relation.from === "PERM-HELP-SHOULD-FOLLOW-TASKS"));
  assert.ok(fixture.relations.some((relation) => relation.from === "PERM-BEST-PATH-STARTS-FROM-HOME"));
  assert.ok(fixture.writing_projects.length > 0);
  assert.ok(fixture.draft_scaffolds.length > 0);
});

test("Smart Notes Demo turns permanent-note wikilinks into lightweight body relations", async () => {
  const fixture = await readFixture();
  const permanentByTitle = new Map(fixture.permanent_notes.map((note) => [note.title, note]));
  const relationPairs = new Set(fixture.relations.map((relation) => relationPairKey(relation.from, relation.to)));
  const bodyRelations = fixture.relations.filter((relation) => relation.relationSource === "body_wikilink");
  const manualRelations = fixture.relations.filter((relation) => relation.relationSource === "manual");
  const missing = [];

  for (const note of fixture.permanent_notes || []) {
    for (const target of wikilinkTargets(note.body)) {
      const targetNote = permanentByTitle.get(target);
      if (!targetNote || targetNote.id === note.id) continue;
      const pairKey = relationPairKey(note.id, targetNote.id);
      if (!relationPairs.has(pairKey)) missing.push(`${note.id} -> ${targetNote.id}`);
    }
  }

  assert.deepEqual(missing, []);
  assert.ok(bodyRelations.length > 0);
  assert.ok(bodyRelations.every((relation) => relation.relationType === "associated_with"));
  assert.ok(bodyRelations.every((relation) => relation.rationale === "markdown_wikilink"));
  assert.ok(manualRelations.length >= 40);
  assert.ok(manualRelations.every((relation) => relation.rationale && relation.rationale !== "markdown_wikilink"));
});

test("Smart Notes Demo still keeps a few permanent notes available for relation practice", async () => {
  const fixture = await readFixture();
  const relationNoteIds = new Set();
  for (const relation of fixture.relations) {
    relationNoteIds.add(relation.from);
    relationNoteIds.add(relation.to);
  }
  const isolatedPermanentNotes = fixture.permanent_notes.filter((note) => !relationNoteIds.has(note.id));

  assert.ok(isolatedPermanentNotes.length >= 2);
});

test("Smart Notes Demo teaches current contextual AI without making it a required path", async () => {
  const fixture = await readFixture();
  const allText = JSON.stringify(fixture);

  for (const id of [
    "PERM-AI-DISTILL-DRAFT",
    "PERM-AI-RELATION-EXPLAINS-WHY",
    "PERM-AI-WRITING-CHECK-DOES-NOT-REWRITE",
    "PERM-AI-SHOULD-ASK-FOR-CONFIRMATION"
  ]) {
    assert.ok(fixture.permanent_notes.some((note) => note.id === id), `missing current AI teaching note ${id}`);
  }

  assert.match(allText, /帮我提炼/);
  assert.match(allText, /候选关联/);
  assert.match(allText, /生成提纲/);
  assert.match(allText, /检查/);
  assert.match(allText, /不用 AI 也能完整使用|没有 AI 也能走完整主流程/);
  assert.match(allText, /确认/);
});
