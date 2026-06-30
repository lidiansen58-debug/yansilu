import test from "node:test";
import assert from "node:assert/strict";
import { readWritingEngineSource } from "./copy-source-helpers.mjs";

test("writing markdown template uses 文章提纲 headings", async () => {
  const source = await readWritingEngineSource();

  assert.match(source, /## 文章提纲/);
  assert.match(source, /## 文章提纲预检/);
  assert.doesNotMatch(source, /## Draft Scaffold/);
  assert.doesNotMatch(source, /## Scaffold Readiness Check/);
});
