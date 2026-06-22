import test from "node:test";
import assert from "node:assert/strict";

import { readPrototypeAppSource } from "./copy-source-helpers.mjs";

test("graph edge details frame connection copy around relation reasons", async () => {
  const source = await readPrototypeAppSource();

  assert.match(source, /关系说明已经较清楚，可以开始挑一条阅读路径进入写作中心。/);
  assert.match(source, /还没把这条关系为什么成立写清楚。/);
});
