import test from "node:test";
import assert from "node:assert/strict";
import { readWritingEngineSource } from "./copy-source-helpers.mjs";

test("writing intent pass message uses Chinese copy", async () => {
  const source = await readWritingEngineSource();

  assert.match(source, /项目已经有清晰的写作意图。/);
  assert.doesNotMatch(source, /The project has a clear writing intent\./);
});
