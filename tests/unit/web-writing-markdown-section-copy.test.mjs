import test from "node:test";
import assert from "node:assert/strict";
import { readWritingEngineSource } from "./copy-source-helpers.mjs";

test("writing markdown section labels use Chinese copy", async () => {
  const source = await readWritingEngineSource();

  assert.match(source, /"证据:"/);
  assert.match(source, /"待补缺口:"/);
  assert.match(source, /"反方与边界:"/);
  assert.match(source, /"待回答问题:"/);
  assert.doesNotMatch(source, /"Evidence:"/);
  assert.doesNotMatch(source, /"Gaps:"/);
  assert.doesNotMatch(source, /"Counterpoints:"/);
  assert.doesNotMatch(source, /"Open questions:"/);
});
