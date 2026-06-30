import test from "node:test";
import assert from "node:assert/strict";
import { readWritingEngineSource } from "./copy-source-helpers.mjs";

test("writing preflight scaffold warnings use 文章提纲 wording", async () => {
  const source = await readWritingEngineSource();

  assert.match(source, /已经可以组织成文章提纲/);
  assert.match(source, /再继续推进文章提纲/);
  assert.match(source, /让文章提纲有明确目标/);
  assert.match(source, /让文章提纲有可复用的问题上下文/);
  assert.match(source, /当前没有阻塞项，可以继续生成文章提纲/);
  assert.doesNotMatch(source, /trusting the scaffold/);
  assert.doesNotMatch(source, /scaffold has a target judgment/);
  assert.doesNotMatch(source, /this scaffold has a reusable question context/);
  assert.doesNotMatch(source, /organized into a scaffold/);
  assert.doesNotMatch(source, /No blocking gaps detected for scaffold generation/);
});
