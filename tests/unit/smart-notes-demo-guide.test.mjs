import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("Smart Notes demo guide gives a beginner three-step path", () => {
  const demo = JSON.parse(fs.readFileSync("tests/fixtures/demo-smart-notes-product-thinking/demo.json", "utf8"));
  const guide = (demo.guide_notes || []).find((note) => note.id === "GUIDE-SN-001");

  assert.ok(guide, "expected Smart Notes guide note");
  assert.match(guide.body, /第一次打开先做三步/);
  assert.match(guide.body, /先看一条材料如何变成永久笔记/);
  assert.match(guide.body, /再处理一条未关联笔记/);
  assert.match(guide.body, /最后进入写作中心生成文章提纲/);
  assert.match(guide.body, /把它当成结果视图/);
});
