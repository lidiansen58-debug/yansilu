import test from "node:test";
import assert from "node:assert/strict";

import { readPrototypeAppSource } from "./copy-source-helpers.mjs";

test("graph review surfaces describe missing rationales with current relation wording", async () => {
  const source = await readPrototypeAppSource();

  assert.match(source, /尚未写清这条关系为什么成立。/);
  assert.doesNotMatch(source, /Markdown wikilink/);
});
