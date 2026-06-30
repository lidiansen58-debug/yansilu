import test from "node:test";
import assert from "node:assert/strict";
import { readWritingEngineSource } from "./copy-source-helpers.mjs";

test("writing topic-entry pass message uses Chinese copy", async () => {
  const source = await readWritingEngineSource();

  assert.match(source, /这个主题已经挂到主题或索引入口上。/);
  assert.doesNotMatch(source, /The project is tied to a theme\/index entry\./);
});
