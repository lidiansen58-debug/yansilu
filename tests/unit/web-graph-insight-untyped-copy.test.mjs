import test from "node:test";
import assert from "node:assert/strict";

import { readPrototypeAppSource } from "./copy-source-helpers.mjs";

test("graph insight coach frames untyped relations as missing reasons, not generic descriptions", async () => {
  const source = await readPrototypeAppSource();

  assert.match(source, /条关系还缺理由，优先补“为什么相连”/);
  assert.doesNotMatch(source, /条关系还缺说明，优先补“为什么相连”/);
});
