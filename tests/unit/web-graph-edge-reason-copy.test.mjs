import test from "node:test";
import assert from "node:assert/strict";

import { readPrototypeAppSource } from "./copy-source-helpers.mjs";

test("graph edge details frame connection copy as reasons, not generic descriptions", async () => {
  const source = await readPrototypeAppSource();

  assert.match(source, /每条边都要写清两条笔记为什么相连：支持、反驳、限定、桥接、补充或推进。/);
  assert.match(source, /；理由：\$\{escapeHtml\(/);
  assert.doesNotMatch(source, /每条边说明两条笔记为什么相连：支持、反驳、限定、桥接、补充或推进。/);
  assert.doesNotMatch(source, /；说明：\$\{escapeHtml\(/);
});
