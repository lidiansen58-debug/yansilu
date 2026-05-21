import test from "node:test";
import assert from "node:assert/strict";
import { readWritingEngineSource } from "./copy-source-helpers.mjs";

test("writing markdown template uses 草稿骨架 headings", async () => {
  const source = await readWritingEngineSource();

  assert.match(source, /## 草稿骨架/);
  assert.match(source, /## 草稿骨架预检/);
  assert.doesNotMatch(source, /## Draft Scaffold/);
  assert.doesNotMatch(source, /## Scaffold Readiness Check/);
});
