import test from "node:test";
import assert from "node:assert/strict";
import { readWritingEngineSource } from "./copy-source-helpers.mjs";

test("writing scaffold open-question prompts use Chinese copy", async () => {
  const source = await readWritingEngineSource();

  assert.match(source, /这组相关笔记里有哪些相近概念还需要进一步区分？/);
  assert.match(source, /围绕 \$\{titledNotes\.join\(", "\)\} 的相近概念，哪些地方还需要进一步区分？/);
  assert.match(source, /还缺哪部分证据？/);
  assert.match(source, /正式起草前还要处理哪条反方？/);
  assert.match(source, /对整体论证来说，\$\{noteLabel\(noteWithBoundary\)\} 的哪条边界最关键？/);
  assert.doesNotMatch(source, /Where do similar concepts in this basket need sharper separation\?/);
  assert.doesNotMatch(source, /Where do apparently similar concepts around/);
  assert.doesNotMatch(source, /What evidence is missing\?/);
  assert.doesNotMatch(source, /What counterpoint should be handled before drafting\?/);
  assert.doesNotMatch(source, /Which boundary matters most for the overall argument:/);
});
