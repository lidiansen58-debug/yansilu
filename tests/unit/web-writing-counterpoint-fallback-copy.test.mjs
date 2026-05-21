import test from "node:test";
import assert from "node:assert/strict";
import { readWritingEngineSource } from "./copy-source-helpers.mjs";

test("writing scaffold counterpoint fallback prompt uses Chinese copy", async () => {
  const source = await readWritingEngineSource();

  assert.match(source, /「\$\{noteLabel\(note\)\}」这一段还应该补出哪条反方、限制或例外？/);
  assert.doesNotMatch(source, /What counterpoint, limit, or exception should "\$\{noteLabel\(note\)\}" acknowledge\?/);
});
