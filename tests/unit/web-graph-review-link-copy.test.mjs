import test from "node:test";
import assert from "node:assert/strict";

import { readPrototypeAppSource } from "./copy-source-helpers.mjs";

test("graph review surfaces no longer describe untyped links as 正文链接 and Markdown 链接", async () => {
  const source = await readPrototypeAppSource();

  assert.match(source, /尚未写清这条关系为什么成立。/);
  assert.doesNotMatch(source, /正文链接/);
  assert.doesNotMatch(source, /Markdown 链接/);
  assert.doesNotMatch(source, /Markdown wikilink/);
});
