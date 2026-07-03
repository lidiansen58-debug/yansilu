import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("Smart Notes demo guide gives a beginner five-step path", () => {
  const demo = JSON.parse(fs.readFileSync("tests/fixtures/demo-smart-notes-product-thinking/demo.json", "utf8"));
  const guide = (demo.guide_notes || []).find((note) => note.id === "GUIDE-SN-001");

  assert.ok(guide, "expected Smart Notes guide note");
  assert.match(guide.body, /第一次打开先走五步/);
  assert.match(guide.body, /LN-SN-001/);
  assert.doesNotMatch(guide.body, /LIT-SN-001/);
  assert.match(guide.body, /PN-SN-101/);
  assert.match(guide.body, /先看一条材料如何变成永久笔记/);
  assert.match(guide.body, /让一条未关联笔记进入关系网/);
  assert.match(guide.body, /多条永久笔记如何形成主题索引笔记/);
  assert.match(guide.body, /从主题索引进入写作中心生成提纲/);
  assert.match(guide.body, /定期回顾/);
  assert.match(guide.body, /孤立笔记/);
  assert.match(guide.body, /过宽标签/);
  assert.match(guide.body, /没有理由的关系/);
  assert.match(guide.body, /可以写成文章的主题/);
  assert.match(guide.body, /主题索引笔记不是文章/);
  assert.match(guide.body, /3 到 7 条永久笔记/);
  assert.match(guide.body, /每条关键关系都写了理由/);
  assert.match(guide.body, /卢曼式卡片盒/);
});

test("Smart Notes demo guide avoids advanced workflow jargon on the main path", () => {
  const demo = JSON.parse(fs.readFileSync("tests/fixtures/demo-smart-notes-product-thinking/demo.json", "utf8"));
  const guide = (demo.guide_notes || []).find((note) => note.id === "GUIDE-SN-001");

  assert.ok(guide, "expected Smart Notes guide note");
  assert.doesNotMatch(guide.body, /候选|队列|复核|线索/);
});

test("Smart Notes demo guide references notes that exist in the fixture", () => {
  const demo = JSON.parse(fs.readFileSync("tests/fixtures/demo-smart-notes-product-thinking/demo.json", "utf8"));
  const guide = (demo.guide_notes || []).find((note) => note.id === "GUIDE-SN-001");
  const noteIds = new Set([
    ...(demo.sources || []).map((note) => note.id),
    ...(demo.fleeting_notes || []).map((note) => note.id),
    ...(demo.literature_notes || []).map((note) => note.id),
    ...(demo.permanent_notes || []).map((note) => note.id),
    ...(demo.index_cards || []).map((note) => note.id),
    ...(demo.writing_projects || []).map((note) => note.id),
    ...(demo.draft_scaffolds || []).map((note) => note.id)
  ]);

  assert.ok(guide, "expected Smart Notes guide note");
  for (const id of guide.body.match(/[A-Z]+-SN(?:-[A-Z]+)?-\d{3}|SRC-SMART-NOTES/g) || []) {
    assert.ok(noteIds.has(id), `${id} should exist in the Smart Notes fixture`);
  }
});
