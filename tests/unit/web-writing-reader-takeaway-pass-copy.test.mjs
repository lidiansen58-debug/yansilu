import test from "node:test";
import assert from "node:assert/strict";
import { readWritingEngineSource } from "./copy-source-helpers.mjs";

test("writing reader takeaway pass message uses Chinese copy", async () => {
  const source = await readWritingEngineSource();

  assert.match(source, /读者最后应带走的判断已经明确。/);
  assert.doesNotMatch(source, /The desired reader takeaway is explicit\./);
});
