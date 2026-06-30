import test from "node:test";
import assert from "node:assert/strict";
import { readWritingEngineSource } from "./copy-source-helpers.mjs";

test("writing distillation-quality warning uses Chinese prefix", async () => {
  const source = await readWritingEngineSource();

  assert.match(source, /条相关笔记的提纯还比较粗糙。\$\{qualitySample\}/);
  assert.doesNotMatch(source, /basket notes still look rough\./);
});
