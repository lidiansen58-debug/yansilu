import test from "node:test";
import assert from "node:assert/strict";
import { readWritingEngineSource } from "./copy-source-helpers.mjs";

test("writing markdown status values use Chinese labels", async () => {
  const source = await readWritingEngineSource();

  assert.match(source, /needs_clarification: "待澄清"/);
  assert.match(source, /needs_attention: "仍有提醒"/);
  assert.match(source, /ready: "已就绪"/);
  assert.match(source, /renderWritingMarkdownStatus\(readiness\.status\)/);
  assert.match(source, /renderWritingMarkdownStatus\(preflight\.status\)/);
  assert.doesNotMatch(source, /- 状态: \$\{readiness\.status\}/);
  assert.doesNotMatch(source, /- 状态: \$\{preflight\.status\}/);
});
