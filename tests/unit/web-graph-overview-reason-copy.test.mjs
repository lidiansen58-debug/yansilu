import test from "node:test";
import assert from "node:assert/strict";

import { readPrototypeAppSource } from "./copy-source-helpers.mjs";

test("graph overview card frames missing untyped links as reasons, not generic descriptions", async () => {
  const source = await readPrototypeAppSource();

  assert.match(source, /条关系还缺理由，优先补“为什么相连”，洞见会更容易浮出来。/);
  assert.match(source, /关系理由已经较清楚，可以开始挑一条阅读路径进入写作中心。/);
});
