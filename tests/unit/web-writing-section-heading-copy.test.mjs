import test from "node:test";
import assert from "node:assert/strict";
import { readWritingEngineSource } from "./copy-source-helpers.mjs";

test("writing scaffold fixed section headings use Chinese copy", async () => {
  const source = await readWritingEngineSource();

  assert.match(source, /heading: "开篇框架"/);
  assert.match(source, /介绍 \$\{project\.title\}。/);
  assert.match(source, /heading: "综合与下一步"/);
  assert.match(source, /把选中的笔记串成一个最终含义，但先不展开成完整文章。/);
  assert.doesNotMatch(source, /heading: "Opening frame"/);
  assert.doesNotMatch(source, /Introduce \$\{project\.title\}\./);
  assert.doesNotMatch(source, /heading: "Synthesis and next step"/);
  assert.doesNotMatch(source, /Connect the selected notes into a final implication without drafting the full article\./);
});
