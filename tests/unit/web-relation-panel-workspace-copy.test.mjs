import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const sourcePath = new URL("../../apps/web/src/components-editor-pane.js", import.meta.url);
const shellPath = new URL("../../apps/web/src/prototype.html", import.meta.url);

test("relation side panel uses action-first workspace copy without noisy placeholders", async () => {
  const source = await readFile(sourcePath, "utf8");
  const shell = await readFile(shellPath, "utf8");

  assert.match(shell, /<div class="panel-title">关系整理<\/div>/);
  assert.match(shell, /先处理当前建议，再确认正式关系。/);
  assert.match(source, /<div class="inspector-section-title">建议下一步<\/div>/);
  assert.match(source, /<div class="inspector-section-title">关系网络<\/div>/);
  assert.match(source, /data-main-path-next-action/);
  assert.match(source, /data-deferred-workspace/);
  assert.match(source, /提纯与 AI/);
  assert.match(source, /querySelector\?\.\("\[data-deferred-workspace\]"\)\?\.setAttribute\("open", ""\)/);
  assert.match(source, /待确认线索/);

  assert.doesNotMatch(source, /renderRelated\("当前笔记关联总览"\)/);
  assert.doesNotMatch(shell, /关联线索<\/div>/);
  assert.doesNotMatch(source, /主路径下一步/);
  assert.doesNotMatch(source, /<span class="inspector-chip">正文链接 \$\{/);
  assert.doesNotMatch(source, /<span class="inspector-chip">标签线索 \$\{/);
});
