import test from "node:test";
import assert from "node:assert/strict";
import { readWritingEngineSource } from "./copy-source-helpers.mjs";

test("writing markdown readiness fields use Chinese labels", async () => {
  const source = await readWritingEngineSource();

  assert.match(source, /intent: "写作意图"/);
  assert.match(source, /desired_reader_takeaway: "读者收获"/);
  assert.match(source, /renderWritingMarkdownField\(item\.field\)/);
  assert.doesNotMatch(source, /- \$\{item\.field\}: \$\{item\.message\}/);
});
