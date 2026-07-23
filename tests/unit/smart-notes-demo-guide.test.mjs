import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

function loadDemo() {
  return JSON.parse(fs.readFileSync("tests/fixtures/demo-smart-notes-product-thinking/demo.json", "utf8"));
}

test("Smart Notes demo guide gives a beginner title-based path", () => {
  const demo = loadDemo();
  const guide = (demo.guide_notes || []).find((note) => note.id === "GUIDE-SMART-NOTES-START");

  assert.ok(guide, "expected Smart Notes guide note");
  assert.match(guide.title, /从这里开始/);
  assert.match(guide.body, /你不用先学术语/);
  assert.match(guide.body, /\[\[手机上先记一句：我总是收藏很多但不会用\]\]/);
  assert.match(guide.body, /\[\[阅读一开始就要面向未来写作\]\]/);
  assert.match(guide.body, /\[\[写作不是最后一步，而是整理笔记的方向\]\]/);
  assert.match(guide.body, /\[\[关系理由练习：给已有笔记补一条说明\]\]/);
  assert.match(guide.body, /\[\[03 为什么要建立关系？\|为什么要关联笔记？\]\]/);
  assert.match(guide.body, /\[\[02 什么是永久笔记？\|永久笔记是什么？\]\]/);
  assert.doesNotMatch(guide.body, /\b(?:PN-SN|WP-SN|IC-SN)-/);
});

test("Smart Notes demo guide has a short onboarding note set", () => {
  const demo = loadDemo();
  assert.ok(demo.guide_notes.length >= 6);
  assert.deepEqual(
    demo.guide_notes.slice(0, 6).map((note) => note.title),
    [
      "00 从这里开始：10 分钟走完研思录",
      "01 今天先做哪一步？",
      "02 什么是永久笔记？",
      "03 为什么要建立关系？",
      "04 什么是可写主题？",
      "05 怎么从主题进入写作中心？"
    ]
  );
  assert.ok(demo.guide_notes.some((note) => note.title === "06 遇到问题先看这里：按任务找帮助"));
  assert.ok(demo.guide_notes.some((note) => note.title === "07 手机和 AI：先知道边界"));
});

test("Smart Notes demo guide avoids advanced workflow jargon on the main path", () => {
  const demo = loadDemo();
  const guide = (demo.guide_notes || []).find((note) => note.id === "GUIDE-SMART-NOTES-START");

  assert.ok(guide, "expected Smart Notes guide note");
  assert.doesNotMatch(guide.body, /候选队列|复核队列|线索卡/);
});

test("Smart Notes demo guide references titles that exist in the fixture", () => {
  const demo = loadDemo();
  const guide = (demo.guide_notes || []).find((note) => note.id === "GUIDE-SMART-NOTES-START");
  const titles = new Set([
    ...(demo.sources || []).map((note) => note.title),
    ...(demo.guide_notes || []).map((note) => note.title),
    ...(demo.fleeting_notes || []).map((note) => note.title),
    ...(demo.literature_notes || []).map((note) => note.title),
    ...(demo.permanent_notes || []).map((note) => note.title),
    ...(demo.index_cards || []).map((note) => note.title)
  ]);

  assert.ok(guide, "expected Smart Notes guide note");
  for (const match of guide.body.matchAll(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g)) {
    assert.ok(titles.has(match[1]), `${match[1]} should exist as a readable note title`);
  }
});
