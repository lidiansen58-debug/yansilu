import test from "node:test";
import assert from "node:assert/strict";
import { readWritingEngineSource } from "./copy-source-helpers.mjs";

test("writing confirmed-distillation warning uses Chinese copy", async () => {
  const source = await readWritingEngineSource();

  assert.match(source, /还有 \$\{Math\.max\(0, basketCount - confirmedNotes\.length\)\} 条写作篮笔记需要补齐一句话判断与三句话提纯确认。/);
  assert.doesNotMatch(source, /basket notes still need confirmed thesis and three-line distillation\./);
  assert.doesNotMatch(source, /thesis 与三句话提纯确认/);
});
