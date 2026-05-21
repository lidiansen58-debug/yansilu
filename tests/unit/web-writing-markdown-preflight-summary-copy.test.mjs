import test from "node:test";
import assert from "node:assert/strict";
import { readWritingEngineSource } from "./copy-source-helpers.mjs";

test("writing markdown preflight summary rows use Chinese labels", async () => {
  const source = await readWritingEngineSource();

  assert.match(source, /- 状态: \$\{renderWritingMarkdownStatus\(preflight\.status\)\}/);
  assert.match(source, /- 通过项: \$\{preflight\.passCount\}\/\$\{preflight\.checks\.length\}/);
  assert.match(source, /- 提醒项: \$\{preflight\.warningCount\}/);
  assert.doesNotMatch(source, /- Status: \$\{preflight\.status\}/);
  assert.doesNotMatch(source, /- Passing checks: \$\{preflight\.passCount\}\/\$\{preflight\.checks\.length\}/);
  assert.doesNotMatch(source, /- Warnings: \$\{preflight\.warningCount\}/);
});
