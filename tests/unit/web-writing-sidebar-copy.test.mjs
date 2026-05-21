import test from "node:test";
import assert from "node:assert/strict";
import { readPrototypeAppSource } from "./copy-source-helpers.mjs";

test("writing sidebar path uses 草稿骨架 wording", async () => {
  const source = await readPrototypeAppSource();

  assert.match(source, /生成并迭代草稿骨架，优先处理冲突与缺口/);
  assert.doesNotMatch(source, /生成并迭代 scaffold，优先处理冲突与缺口/);
});
