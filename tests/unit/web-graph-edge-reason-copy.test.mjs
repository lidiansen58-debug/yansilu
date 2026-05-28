import test from "node:test";
import assert from "node:assert/strict";

import { readPrototypeAppSource } from "./copy-source-helpers.mjs";

test("graph edge details frame connection copy as reasons, not generic descriptions", async () => {
  const source = await readPrototypeAppSource();

  assert.match(source, /理由/);
  assert.match(source, /尚未写清这条关系为什么成立。/);
});
