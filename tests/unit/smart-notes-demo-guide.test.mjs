import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("Smart Notes demo guide gives a beginner six-step Luhmann path", () => {
  const demo = JSON.parse(fs.readFileSync("tests/fixtures/demo-smart-notes-product-thinking/demo.json", "utf8"));
  const guide = (demo.guide_notes || []).find((note) => note.id === "GUIDE-SN-001");
  const source = (demo.sources || []).find((note) => note.id === "SRC-SMART-NOTES");
  const firstLiteratureNote = (demo.literature_notes || []).find((note) => note.id === "LN-SN-001");

  assert.ok(guide, "expected Smart Notes guide note");
  assert.ok(source, "expected guide source note");
  assert.ok(firstLiteratureNote, "expected first literature note");
  assert.match(guide.body, /第一次打开按 6 步走/);
  assert.match(guide.body, /写一条永久笔记/);
  assert.match(guide.body, /立即找一条旧笔记建立关系/);
  assert.match(guide.body, /给关系写理由/);
  assert.match(guide.body, /创建主题索引笔记/);
  assert.match(guide.body, /从主题索引进入写作中心/);
  assert.match(guide.body, /每周回顾一次/);
  assert.match(guide.body, /孤立笔记、太宽的标签、没有说明理由的关系，以及已经可以进入写作中心的主题/);
  assert.match(guide.body, /主题索引笔记不是文章/);
  assert.doesNotMatch([guide.body, source.conversion_policy, firstLiteratureNote.body].join("\n"), /候选|队列|复核|线索/);
});

test("Smart Notes demo help document mirrors the non-technical training path", () => {
  const help = fs.readFileSync("docs/SMART_NOTES_DEMO_HELP.md", "utf8");

  assert.match(help, /第一次按 6 步走/);
  assert.match(help, /一条材料如何变成永久笔记/);
  assert.match(help, /一条笔记如何进入关系网/);
  assert.match(help, /主题索引笔记不是文章/);
  assert.match(help, /每周回顾看什么/);
  assert.match(help, /孤立笔记/);
  assert.match(help, /宽标签|太宽的标签/);
  assert.match(help, /缺理由关系|没有说明理由的关系/);
  assert.match(help, /可写主题|已经可以进入写作的主题/);
  assert.doesNotMatch(help, /候选|队列|复核|线索/);
});
