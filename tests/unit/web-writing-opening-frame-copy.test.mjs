import test from "node:test";
import assert from "node:assert/strict";
import { readWritingEngineSource } from "./copy-source-helpers.mjs";

test("writing opening frame prompts use Chinese copy", async () => {
  const source = await readWritingEngineSource();

  assert.match(source, /正式起草前，还需要更鲜明的开场张力、场景或问题。/);
  assert.match(source, /开头应该先承认哪种读者预设或对立框架？/);
  assert.match(source, /是什么张力或问题让这篇内容有必要存在？/);
  assert.match(source, /应该尽早亮出来自「\$\{noteLabel\(noteWithBoundary\)\}」的哪条分歧、反例或边界？/);
  assert.doesNotMatch(source, /Need a sharper opening tension, scene, or question before drafting prose\./);
  assert.doesNotMatch(source, /What reader assumption or opposing frame should the opening acknowledge\?/);
  assert.doesNotMatch(source, /What tension or question makes this piece necessary\?/);
  assert.doesNotMatch(source, /Which disagreement or limit from "\$\{noteLabel\(noteWithBoundary\)\}" should surface early\?/);
});
