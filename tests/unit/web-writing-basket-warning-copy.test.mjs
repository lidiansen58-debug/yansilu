import test from "node:test";
import assert from "node:assert/strict";
import { readWritingEngineSource } from "./copy-source-helpers.mjs";

test("writing basket-size warning uses Chinese copy", async () => {
  const source = await readWritingEngineSource();

  assert.match(source, /至少先放入两条永久笔记，再把这次组织当成一条真正的论证。/);
  assert.doesNotMatch(source, /Add at least two permanent notes before treating this as a real argument\./);
});
