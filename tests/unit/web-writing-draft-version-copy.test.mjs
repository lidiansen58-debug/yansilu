import test from "node:test";
import assert from "node:assert/strict";
import { readPrototypeAppSource } from "./copy-source-helpers.mjs";

test("writing draft version card uses 当前版本 wording", async () => {
  const source = await readPrototypeAppSource();

  assert.match(source, /当前版本/);
  assert.match(source, /设为当前版本失败：/);
  assert.doesNotMatch(source, / · 当前草稿/);
  assert.doesNotMatch(source, /设为当前草稿失败：/);
});
