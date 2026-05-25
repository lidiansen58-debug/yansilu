import test from "node:test";
import assert from "node:assert/strict";

import { readPrototypeAppSource } from "./copy-source-helpers.mjs";

test("graph untyped relation surfaces use link wording instead of raw wikilink copy", async () => {
  const source = await readPrototypeAppSource();

  assert.match(source, /条连接仍主要依赖正文链接，没有写清是支持、反驳、延展还是对照。/);
  assert.match(source, /尚未写明，当前来自 Markdown 链接。/);
  assert.doesNotMatch(source, /条连接仍主要依赖 wikilink，没有写清是支持、反驳、延展还是对照。/);
  assert.doesNotMatch(source, /尚未写明，当前来自 Markdown wikilink。/);
});
