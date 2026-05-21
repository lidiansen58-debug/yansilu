import test from "node:test";
import assert from "node:assert/strict";
import { readWritingEngineSource } from "./copy-source-helpers.mjs";

test("writing scaffold section follow-up questions use Chinese copy", async () => {
  const source = await readWritingEngineSource();

  assert.match(source, /这条笔记怎样接进更大的论证，而不只是单独站着？/);
  assert.match(source, /这一段应该明确亮出哪条边界、反例或对立用例？/);
  assert.doesNotMatch(source, /How does this note connect to the broader line of argument instead of standing alone\?/);
  assert.doesNotMatch(source, /Which boundary, counterexample, or opposing use-case should this section make explicit\?/);
});
