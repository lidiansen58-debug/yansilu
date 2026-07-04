import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import {
  routeAppShellStateChange
} from "../../apps/web/src/app-shell-state-change-router.js";
import {
  runConfirmedSmartNotesDemoImport
} from "../../apps/web/src/smart-notes-demo-import-flow.js";

test("empty editor first screen makes Demo import the clear primary action", () => {
  const html = fs.readFileSync("apps/web/src/prototype.html", "utf8");

  assert.match(html, /第一次打开，建议先体验示例库/);
  assert.match(html, /data-empty-start-action="seed-demo"/);
  assert.match(html, /导入示例库 \/ 体验 Demo/);
  assert.match(html, /点下面按钮后会先请你确认/);
  assert.match(html, /一键导入一套可照着学的 Demo 笔记/);
  assert.match(html, /确认后创建 Smart Notes 示例笔记/);
  assert.doesNotMatch(html, /data-empty-start-action="open-import"/);
  assert.doesNotMatch(html, /选择 Obsidian 文件夹/);
  assert.match(html, /data-empty-start-action="create-note"/);
  assert.match(html, /跳过 Demo，写第一条笔记/);
});

test("empty start routes demo import with confirmation and the existing-notes import module through shell actions", async () => {
  const calls = [];

  assert.equal(await routeAppShellStateChange("open-import", { source: "empty-start" }, {
    openImportModule: (payload) => calls.push(["import", payload.source])
  }), true);
  assert.equal(await routeAppShellStateChange("seed-smart-notes-demo", { source: "empty-start" }, {
    confirm: (message) => {
      calls.push(["confirm", /Smart Notes Demo/.test(message)]);
      return true;
    },
    importSmartNotesDemo: async (payload) => {
      calls.push(["demo", payload.source, payload.confirmed]);
      return true;
    }
  }), true);

  assert.deepEqual(calls, [
    ["import", "empty-start"],
    ["confirm", true],
    ["demo", "empty-start", true]
  ]);
});

test("empty start cancels Smart Notes Demo import when the user declines", async () => {
  const calls = [];
  const result = await routeAppShellStateChange("seed-smart-notes-demo", { source: "empty-start" }, {
    confirm: () => false,
    importSmartNotesDemo: async () => calls.push("unexpected"),
    setStatus: (message, tone) => calls.push(["status", message, tone])
  });

  assert.equal(result, false);
  assert.deepEqual(calls, [["status", "已取消 Smart Notes Demo 导入。", "warn"]]);
});

test("startup Smart Notes Demo import does not block on a confirmation dialog", async () => {
  const calls = [];
  const result = await runConfirmedSmartNotesDemoImport({ startup: true }, {
    confirm: () => calls.push("unexpected-confirm"),
    importSmartNotesDemo: async (payload) => {
      calls.push(["demo", payload.startup, payload.confirmed]);
      return true;
    }
  });

  assert.equal(result, true);
  assert.deepEqual(calls, [["demo", true, true]]);
});

test("empty start does not import Smart Notes Demo without a confirmation function", async () => {
  const calls = [];
  const result = await routeAppShellStateChange("seed-smart-notes-demo", { source: "empty-start" }, {
    importSmartNotesDemo: async () => calls.push("unexpected"),
    setStatus: (message, tone) => calls.push(["status", message, tone])
  });

  assert.equal(result, false);
  assert.deepEqual(calls, [["status", "需要先确认，才会导入 Smart Notes Demo。", "warn"]]);
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
  assert.match(css, /\.editor-stage-shell\.editor-empty-stage \.tabs/);
  assert.match(css, /\.editor-stage-shell\.editor-empty-stage \.editor-stage-top \.toolbar/);
  assert.match(css, /display:\s*none/);
  assert.match(css, /\.editor-empty-start\s*\{[\s\S]*z-index:\s*38/);
  assert.doesNotMatch(css, /\.editor-empty-start\s*\{\s*display:\s*none !important;/);
});
