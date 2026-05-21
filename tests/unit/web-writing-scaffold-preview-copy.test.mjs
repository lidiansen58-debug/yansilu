import test from "node:test";
import assert from "node:assert/strict";
import { readPrototypeAppSource } from "./copy-source-helpers.mjs";

test("writing scaffold preview summary uses 草稿骨架 wording", async () => {
  const source = await readPrototypeAppSource();

  assert.match(source, /草稿骨架：\$\{escapeHtml\(writingState\.scaffold\.id \|\| "未命名"\)\}/);
  assert.doesNotMatch(source, /Scaffold：\$\{escapeHtml\(writingState\.scaffold\.id \|\| "未命名"\)\}/);
});
