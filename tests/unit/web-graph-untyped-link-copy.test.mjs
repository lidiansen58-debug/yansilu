import test from "node:test";
import assert from "node:assert/strict";

import { readPrototypeAppSource } from "./copy-source-helpers.mjs";

test("graph untyped relation surfaces use reason wording instead of raw link wording", async () => {
  const source = await readPrototypeAppSource();

  assert.match(source, /尚未写清这条关系为什么成立。/);
  assert.match(source, /待补关系理由/);
});
