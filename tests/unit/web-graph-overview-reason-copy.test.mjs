import test from "node:test";
import assert from "node:assert/strict";

import { readPrototypeAppSource } from "./copy-source-helpers.mjs";

test("graph overview card frames missing untyped links as reasons, not generic descriptions", async () => {
  const source = await readPrototypeAppSource();

  assert.match(source, /<strong>缺口与理由<\/strong>/);
  assert.match(source, /条连接还缺明确关系理由。/);
  assert.doesNotMatch(source, /<strong>缺口与说明<\/strong>/);
  assert.doesNotMatch(source, /条连接还缺明确关系说明。/);
});
