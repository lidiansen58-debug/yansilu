import test from "node:test";
import assert from "node:assert/strict";
import { readWritingEngineSource } from "./copy-source-helpers.mjs";

test("writing markdown brief placeholders use 待补充 instead of TBD", async () => {
  const source = await readWritingEngineSource();

  assert.match(source, /- 目标: \$\{project\.goal \|\| "待补充"\}/);
  assert.match(source, /- 读者: \$\{project\.audience \|\| "待补充"\}/);
  assert.match(source, /- 语气: \$\{project\.tone \|\| "待补充"\}/);
  assert.match(source, /- 意图: \$\{project\.intent \|\| "待补充"\}/);
  assert.match(source, /- 读者收获: \$\{project\.desired_reader_takeaway \|\| "待补充"\}/);
  assert.doesNotMatch(source, /- 目标: \$\{project\.goal \|\| "TBD"\}/);
  assert.doesNotMatch(source, /- 读者: \$\{project\.audience \|\| "TBD"\}/);
  assert.doesNotMatch(source, /- 语气: \$\{project\.tone \|\| "TBD"\}/);
  assert.doesNotMatch(source, /- 意图: \$\{project\.intent \|\| "TBD"\}/);
  assert.doesNotMatch(source, /- 读者收获: \$\{project\.desired_reader_takeaway \|\| "TBD"\}/);
});
