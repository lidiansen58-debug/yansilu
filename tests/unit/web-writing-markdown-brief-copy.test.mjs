import test from "node:test";
import assert from "node:assert/strict";
import { readWritingEngineSource } from "./copy-source-helpers.mjs";

test("writing markdown brief block uses Chinese headings and labels", async () => {
  const source = await readWritingEngineSource();

  assert.match(source, /## 写作简述/);
  assert.match(source, /- 目标: \$\{project\.goal \|\| "待补充"\}/);
  assert.match(source, /- 读者: \$\{project\.audience \|\| "待补充"\}/);
  assert.match(source, /- 语气: \$\{project\.tone \|\| "待补充"\}/);
  assert.match(source, /- 意图: \$\{project\.intent \|\| "待补充"\}/);
  assert.match(source, /- 读者收获: \$\{project\.desired_reader_takeaway \|\| "待补充"\}/);
  assert.match(source, /## 就绪检查/);
  assert.match(source, /- 状态: \$\{renderWritingMarkdownStatus\(readiness\.status\)\}/);
  assert.doesNotMatch(source, /## Writing Brief/);
  assert.doesNotMatch(source, /- Goal: /);
  assert.doesNotMatch(source, /- Audience: /);
  assert.doesNotMatch(source, /- Tone: /);
  assert.doesNotMatch(source, /- Intent: /);
  assert.doesNotMatch(source, /- Reader takeaway: /);
  assert.doesNotMatch(source, /## Readiness Check/);
  assert.doesNotMatch(source, /- Status: \$\{readiness\.status\}/);
});
