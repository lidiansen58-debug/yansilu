import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { withShortSmartNotesPractice } from "../../scripts/smart-notes-short-practice.mjs";

function loadDemo() {
  return JSON.parse(fs.readFileSync("tests/fixtures/demo-smart-notes-product-thinking/demo.json", "utf8"));
}

test("current short practice names six saved outcomes and only links existing notes", () => {
  const demo = withShortSmartNotesPractice(loadDemo());
  const guide = demo.guide_notes.find(note => note.id === "GUIDE-SHORT-PRACTICE");
  const titles = new Set(Object.values(demo).filter(Array.isArray).flat().map(note => note?.title).filter(Boolean));
  assert.equal([...guide.body.matchAll(/^\d\. /gm)].length, 6);
  for (const action of ["保存当前观点", "保存草稿", "导出文章 .md", "已有提纲或草稿"]) assert.ok(guide.body.includes(action));
  assert.match(guide.body, /不需要 AI/);
  assert.match(guide.body, /正文链接和手动关联同样进入网络/);
  assert.match(guide.body, /示例观点不代表你的判断/);
  for (const match of guide.body.matchAll(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g)) assert.ok(titles.has(match[1]), `missing ${match[1]}`);
  const writingGuide = demo.guide_notes.find(note => note.id === "GUIDE-INDEX-TO-WRITING");
  for (const label of ["继续提纲", "继续草稿", "继续写"]) assert.ok(writingGuide.body.includes(`“${label}”`));
  assert.doesNotMatch(writingGuide.body, /继续提纲\/草稿/);
  assert.match(writingGuide.body, /已保存整稿/);
});

test("Smart Notes demo guide gives a beginner title-based path", () => {
  const demo = loadDemo();
  const guide = (demo.guide_notes || []).find((note) => note.id === "GUIDE-SMART-NOTES-START");

  assert.ok(guide, "expected Smart Notes guide note");
  assert.match(guide.title, /观点怎样形成/);
  assert.match(guide.body, /你不用先学术语/);
  assert.match(guide.body, /\[\[手机上先记一句：我总是收藏很多但不会用\]\]/);
  assert.match(guide.body, /\[\[用自己的话重说，才能检查理解\]\]/);
  assert.match(guide.body, /\[\[永久笔记是一条用户愿意承担的判断\]\]/);
  assert.match(guide.body, /\[\[关系理由练习：给已有笔记补一条说明\]\]/);
  assert.match(guide.body, /\[\[为什么要关联笔记？\]\]/);
  assert.doesNotMatch(guide.body, /\b(?:PN-SN|WP-SN|IC-SN)-/);
});

test("Smart Notes demo guide has a short onboarding note set", () => {
  const demo = loadDemo();
  assert.ok(demo.guide_notes.length >= 6);
  assert.deepEqual(
    demo.guide_notes.slice(0, 6).map((note) => note.title),
    [
      "00 从这里开始：3 分钟看懂观点怎样形成",
      "01 今天先做哪一步？",
      "02 什么是永久笔记？",
      "03 为什么要建立关系？",
      "04 什么是可写主题？",
      "05 怎么从主题进入写作中心？"
    ]
  );
  assert.ok(demo.guide_notes.some((note) => note.title === "06 关系怎么选？"));
});

test("Smart Notes demo guide explains viewpoint changes and equivalent relation paths", () => {
  const demo = loadDemo();
  const start = (demo.guide_notes || []).find((note) => note.id === "GUIDE-SMART-NOTES-START");
  const relationGuide = (demo.guide_notes || []).find((note) => note.id === "GUIDE-WHY-RELATE");

  assert.match(start?.body || "", /看它为什么变化/);
  assert.match(relationGuide?.body || "", /正文中自动生成的链接和手动保存的关联都会进入知识网络/);
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
