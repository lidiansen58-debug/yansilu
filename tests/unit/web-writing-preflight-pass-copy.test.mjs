import test from "node:test";
import assert from "node:assert/strict";
import { readWritingEngineSource } from "./copy-source-helpers.mjs";

test("writing preflight pass messages use Chinese copy", async () => {
  const source = await readWritingEngineSource();

  assert.match(source, /写作篮里的每条笔记都已经完成一句话判断与三句话提纯确认。/);
  assert.match(source, /写作篮笔记里没有明显的提纯过短、重复或缺边界问题。/);
  assert.match(source, /\$\{notesWithBoundary\.length\} 条写作篮笔记已经带有反方或边界。/);
  assert.doesNotMatch(source, /Every basket note has confirmed thesis and three-line distillation\./);
  assert.doesNotMatch(source, /Basket notes do not show obvious short, repetitive, or boundary-missing distillation issues\./);
  assert.doesNotMatch(source, /basket notes carry boundaries or counterpoints\./);
});
