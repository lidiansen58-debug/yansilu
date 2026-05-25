import test from "node:test";
import assert from "node:assert/strict";
import { readPrototypeAppSource } from "./copy-source-helpers.mjs";

test("writing scaffold surfaces reuse current basket continuity wording before reopening a project", async () => {
  const source = await readPrototypeAppSource();

  assert.match(source, /const scaffoldNote = hasScaffold/);
  assert.match(source, /projectEntry\?\.projectId && projectEntry\?\.actionLabel\s*\? `先\$\{projectEntry\.actionLabel\}，再生成草稿骨架`/);
  assert.match(source, /const projectEntry = \(!writingState\.project\?\.id && currentWritingContinuationEntry\("当前写作篮"\)\) \|\| null;/);
  assert.match(source, /当前写作篮已经对应\$\{escapeHtml\(projectEntry\.status\)\}。先用上面的“\$\{escapeHtml\(projectEntry\.actionLabel\)\}”继续，再回来查看草稿骨架预览。/);
});
