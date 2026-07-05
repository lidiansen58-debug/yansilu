import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const fixturePath = path.resolve("tests", "fixtures", "demo-smart-notes-product-thinking", "demo.json");

async function readFixture() {
  return JSON.parse(await fs.readFile(fixturePath, "utf8"));
}

test("Smart Notes Demo fixture teaches the current home-first beginner path", async () => {
  const fixture = await readFixture();
  const allText = JSON.stringify(fixture);

  assert.doesNotMatch(allText, /PN-SN|WP-SN|IC-SN/);
  assert.doesNotMatch(allText, /今日整理/);
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
