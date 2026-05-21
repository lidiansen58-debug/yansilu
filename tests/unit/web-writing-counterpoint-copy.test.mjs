import test from "node:test";
import assert from "node:assert/strict";
import { readWritingEngineSource } from "./copy-source-helpers.mjs";

test("writing scaffold counterpoint prompt uses Chinese copy", async () => {
  const source = await readWritingEngineSource();

  assert.match(source, /在「\$\{noteLabel\(note\)\}」这一段里，要正面处理哪条反方或边界：\$\{boundary\}/);
  assert.match(source, /「\$\{noteLabel\(note\)\}」这一段还应该补出哪条反方、限制或例外？/);
  assert.doesNotMatch(source, /Address this counterpoint or boundary in "\$\{noteLabel\(note\)\}": \$\{boundary\}/);
  assert.doesNotMatch(source, /What counterpoint, limit, or exception should "\$\{noteLabel\(note\)\}" acknowledge\?/);
});
