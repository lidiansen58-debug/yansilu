import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const currentFile = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(currentFile), "../..");

function readRepoFile(...segments) {
  return fs.readFileSync(path.join(repoRoot, ...segments), "utf8");
}

test("tag token inspector stays focused on useful note context", () => {
  const editorSource = readRepoFile("apps/web/src/components-editor-pane.js");
  const handlerStart = editorSource.indexOf("  async handleTokenAction(token) {");
  const linkStart = editorSource.indexOf("    const linkMatch = token.match", handlerStart);
  assert.ok(handlerStart >= 0 && linkStart > handlerStart, "expected tag token handler to exist");
  const tagHandlerSource = editorSource.slice(handlerStart, linkStart);

  assert.match(tagHandlerSource, /renderTagResult/);
  assert.match(tagHandlerSource, /relatedNoteMeta\(n, \{ includeFolder: false \}\)/);
  assert.match(tagHandlerSource, /tag-related-item/);
  assert.doesNotMatch(tagHandlerSource, /folderLabel\(n\.folderId\)/);
  assert.doesNotMatch(tagHandlerSource, /当前目录范围/);
  assert.doesNotMatch(tagHandlerSource, /结果 \$\{list\.length\}/);
});
