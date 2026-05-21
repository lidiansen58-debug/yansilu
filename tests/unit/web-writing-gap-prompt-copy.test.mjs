import test from "node:test";
import assert from "node:assert/strict";
import { readWritingEngineSource } from "./copy-source-helpers.mjs";

test("writing scaffold gap prompt uses Chinese copy", async () => {
  const source = await readWritingEngineSource();

  assert.match(source, /在「\$\{noteLabel\(note\)\}」能独立撑起一整段之前，还缺哪条证据、例子或过渡？/);
  assert.doesNotMatch(source, /What evidence, example, or transition is still missing before "\$\{noteLabel\(note\)\}" can carry a full paragraph\?/);
});
