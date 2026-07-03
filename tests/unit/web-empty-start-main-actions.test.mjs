import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import {
  routeAppShellStateChange
} from "../../apps/web/src/app-shell-state-change-router.js";

test("empty editor first screen offers three beginner actions", () => {
  const html = fs.readFileSync("apps/web/src/prototype.html", "utf8");

  assert.match(html, /先选一个开始方式/);
  assert.match(html, /data-empty-start-action="seed-demo"/);
  assert.match(html, /导入示例数据/);
  assert.match(html, /data-empty-start-action="open-import"/);
  assert.match(html, /选择 Obsidian 文件夹/);
  assert.match(html, /data-empty-start-action="create-note"/);
  assert.match(html, /写第一条随笔 \/ 永久笔记/);
});

test("empty start routes demo import and Obsidian import through shell actions", async () => {
  const calls = [];

  assert.equal(await routeAppShellStateChange("open-import", { source: "empty-start" }, {
    openImportModule: (payload) => calls.push(["import", payload.source])
  }), true);
  assert.equal(await routeAppShellStateChange("seed-smart-notes-demo", { source: "empty-start" }, {
    importSmartNotesDemo: async (payload) => {
      calls.push(["demo", payload.source]);
      return true;
    }
  }), true);

  assert.deepEqual(calls, [
    ["import", "empty-start"],
    ["demo", "empty-start"]
  ]);
});

test("empty start actions keep destructive and async actions guarded", () => {
  const source = fs.readFileSync("apps/web/src/components-editor-pane.js", "utf8");

  assert.match(source, /this\.emptyStartActionPending = false/);
  assert.match(source, /if \(action === "create-note"\) \{\s*this\.requestCreateNoteFromEmptyState\(\);/s);
  assert.match(source, /if \(this\.emptyStartActionPending\) return/);
  assert.match(source, /querySelectorAll\?\.\("\[data-empty-start-action\]"\)\.forEach/);
});

test("empty editor state shows beginner action cards over the editor", () => {
  const dirtyStateSource = fs.readFileSync("apps/web/src/editor-dirty-state.js", "utf8");
  const css = fs.readFileSync("apps/web/src/prototype.css", "utf8");

  assert.match(dirtyStateSource, /emptyStart\?\.[\s\S]*classList\.toggle\("hidden", !empty\)/);
  assert.match(dirtyStateSource, /editor-empty-stage/);
  assert.match(css, /\.editor-stage-shell\.editor-empty-stage \.markdown-split/);
  assert.match(css, /opacity:\s*0\.18/);
  assert.match(css, /\.editor-empty-start\s*\{[\s\S]*z-index:\s*38/);
  assert.doesNotMatch(css, /\.editor-empty-start\s*\{\s*display:\s*none !important;/);
});
