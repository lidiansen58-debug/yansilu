import test from "node:test";
import assert from "node:assert/strict";
import { readWritingEngineSource } from "./copy-source-helpers.mjs";

test("writing synthesis section prompts use Chinese copy", async () => {
  const source = await readWritingEngineSource();

  assert.match(source, /还缺哪一步连接动作，才能把选中的笔记串成一个完整论证？/);
  assert.match(source, /这组笔记之间的哪条张力应该被明确说出来，而不是被抹平？/);
  assert.match(source, /正式起草前，哪条判断还需要更强的证据？/);
  assert.doesNotMatch(source, /What connective move is still missing to turn the selected notes into one argument\?/);
  assert.doesNotMatch(source, /Which tension between the selected notes should be made explicit instead of smoothed over\?/);
  assert.doesNotMatch(source, /Which claim still needs stronger evidence before drafting\?/);
});
