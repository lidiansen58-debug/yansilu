import test from "node:test";
import assert from "node:assert/strict";

import { readPrototypeAppSource } from "./copy-source-helpers.mjs";

test("graph overview card frames missing untyped relations around reasons", async () => {
  const source = await readPrototypeAppSource();

  assert.match(source, /条关系还缺理由，优先补“为什么相连”，洞见会更容易浮出来。/);
  assert.match(source, /还没把这条关系为什么成立写清楚。/);
});
