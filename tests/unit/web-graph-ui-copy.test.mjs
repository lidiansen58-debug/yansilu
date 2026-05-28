import test from "node:test";
import assert from "node:assert/strict";
import { readPrototypeAppSource } from "./copy-source-helpers.mjs";

test("graph interpretation copy uses 写作中心 wording", async () => {
  const source = await readPrototypeAppSource();

  assert.match(source, /关系理由已经较清楚，可以开始挑一条阅读路径进入写作中心。/);
  assert.match(source, /写作中心/);
  assert.match(source, /appears_in_draft: "进入草稿"/);
});
