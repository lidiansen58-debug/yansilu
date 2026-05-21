import test from "node:test";
import assert from "node:assert/strict";
import { readWritingEngineSource } from "./copy-source-helpers.mjs";

test("writing opening-frame follow-up question uses Chinese copy", async () => {
  const source = await readWritingEngineSource();

  assert.match(source, /应该尽早亮出来自「\$\{noteLabel\(noteWithBoundary\)\}」的哪条分歧、反例或边界？/);
  assert.doesNotMatch(source, /Which disagreement or limit from "\$\{noteLabel\(noteWithBoundary\)\}" should surface early\?/);
});
