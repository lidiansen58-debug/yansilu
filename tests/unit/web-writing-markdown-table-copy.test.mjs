import test from "node:test";
import assert from "node:assert/strict";
import { readWritingEngineSource } from "./copy-source-helpers.mjs";

test("writing markdown table heading and columns use Chinese copy", async () => {
  const source = await readWritingEngineSource();

  assert.match(source, /## 段落-证据对照表/);
  assert.match(source, /\| 章节 \| 证据笔记 \| 缺口 \| 反方与边界 \| 待回答问题 \|/);
  assert.doesNotMatch(source, /## Paragraph-Evidence Map/);
  assert.doesNotMatch(source, /\| Section \| Evidence notes \| Gaps \| Counterpoints \| Open questions \|/);
});
