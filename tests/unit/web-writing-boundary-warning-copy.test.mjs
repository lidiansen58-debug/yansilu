import test from "node:test";
import assert from "node:assert/strict";
import { readWritingEngineSource } from "./copy-source-helpers.mjs";

test("writing boundary warning uses Chinese copy", async () => {
  const source = await readWritingEngineSource();

  assert.match(source, /正式起草前，至少先补一条反方或边界，不然论证会太顺。/);
  assert.doesNotMatch(source, /Add at least one boundary or counterpoint before drafting, or the argument may become too smooth\./);
});
