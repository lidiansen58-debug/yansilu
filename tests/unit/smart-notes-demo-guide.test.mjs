import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

function loadDemo() {
  return JSON.parse(fs.readFileSync("tests/fixtures/demo-smart-notes-product-thinking/demo.json", "utf8"));
}

test("Smart Notes demo guide gives a beginner five-step path", () => {
  const demo = loadDemo();
  const guide = (demo.guide_notes || []).find((note) => note.id === "GUIDE-SN-001");

  assert.ok(guide, "expected Smart Notes guide note");
  assert.match(guide.title, /00 从这里开始/);
  assert.match(guide.body, /先走 5 步/);
  assert.match(guide.body, /SRC-SMART-NOTES/);
  assert.match(guide.body, /LN-SN-001/);
  assert.doesNotMatch(guide.body, /LIT-SN-001/);
  assert.match(guide.body, /PN-SN-001/);
  assert.match(guide.body, /PN-SN-101/);
  assert.match(guide.body, /\[\[PN-SN-101\|/);
  assert.doesNotMatch(guide.body, /`PN-SN-101`/);
  assert.match(guide.body, /补一句“为什么相关”/);
  assert.doesNotMatch(guide.body, /`IC-SN-012`/);
  assert.match(guide.body, /打开主题索引示例/);
  assert.match(guide.body, /3 到 7 条永久笔记/);
  assert.doesNotMatch(guide.body, /`WP-SN-PM-001`/);
  assert.doesNotMatch(guide.body, /`DS-SN-PM-001`/);
  assert.match(guide.body, /打开写作中心/);
  assert.match(guide.body, /今天只做一个动作/);
});

test("Smart Notes demo guide has a short onboarding note set", () => {
  const demo = loadDemo();
  assert.equal(demo.guide_notes.length, 6);
  assert.deepEqual(
    demo.guide_notes.map((note) => note.title),
    [
      "00 从这里开始：10 分钟走完研思录",
      "01 今天先做哪一步",
      "02 什么是永久笔记",
      "03 为什么要建立关系",
      "04 什么是可写主题",
      "05 怎么从主题进入写作中心"
    ]
  );
});

test("Smart Notes demo guide avoids advanced workflow jargon on the main path", () => {
  const demo = loadDemo();
  const guide = (demo.guide_notes || []).find((note) => note.id === "GUIDE-SN-001");

  assert.ok(guide, "expected Smart Notes guide note");
  assert.doesNotMatch(guide.body, /候选队列|复核|线索/);
});

test("Smart Notes demo guide references notes that exist in the fixture", () => {
  const demo = loadDemo();
  const guide = (demo.guide_notes || []).find((note) => note.id === "GUIDE-SN-001");
  const noteIds = new Set([
    ...(demo.sources || []).map((note) => note.id),
    ...(demo.guide_notes || []).map((note) => note.id),
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
