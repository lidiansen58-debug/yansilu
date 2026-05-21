import test from "node:test";
import assert from "node:assert/strict";
import { readPrototypeAppSource } from "./copy-source-helpers.mjs";

test("writing module summary uses 草稿骨架 wording", async () => {
  const source = await readPrototypeAppSource();

  assert.match(source, /可写主题、项目和草稿骨架/);
  assert.doesNotMatch(source, /可写主题、项目和脚手架/);
});
