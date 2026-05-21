import test from "node:test";
import assert from "node:assert/strict";
import { readWritingEngineSource } from "./copy-source-helpers.mjs";

test("writing markdown status mapping includes has_gaps", async () => {
  const source = await readWritingEngineSource();

  assert.match(source, /has_gaps: "仍有缺口"/);
});
