import test from "node:test";
import assert from "node:assert/strict";

import { readPrototypeAppSource } from "./copy-source-helpers.mjs";

test("graph insight and loading copy keep missing-rationale wording on the review surface", async () => {
  const source = await readPrototypeAppSource();

  assert.match(source, /条关系还缺理由，优先补“为什么相连”/);
  assert.match(source, /正在读取永久笔记盒及其子目录里的笔记、正式关系和待补理由/);
  assert.doesNotMatch(source, /条关系还缺说明，优先补“为什么相连”/);
  assert.doesNotMatch(source, /正在读取永久笔记盒及其子目录里的笔记节点、显式关系和待补说明/);
});
