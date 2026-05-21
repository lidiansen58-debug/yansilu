import test from "node:test";
import assert from "node:assert/strict";
import { readPrototypeAppSource } from "./copy-source-helpers.mjs";

test("writing scaffold preview empty states use 草稿骨架 wording", async () => {
  const source = await readPrototypeAppSource();

  assert.match(source, /当前草稿骨架还没有章节。/);
  assert.match(source, /当前草稿骨架还没有开放问题。/);
  assert.doesNotMatch(source, /当前 scaffold 还没有章节。/);
  assert.doesNotMatch(source, /当前 scaffold 还没有开放问题。/);
});
