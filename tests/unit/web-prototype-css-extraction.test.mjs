import test from "node:test";
import assert from "node:assert/strict";
import {
  readPrototypeCssSource,
  readPrototypeHtmlSource
} from "./copy-source-helpers.mjs";

test("prototype shell loads extracted stylesheet with relative route-safe path", async () => {
  const html = await readPrototypeHtmlSource();

  assert.match(html, /<link rel="stylesheet" href="\.\/vendor\/toastui-editor\.css" \/>/);
  assert.match(html, /<link rel="stylesheet" href="\.\/prototype\.css" \/>/);
  assert.match(await readPrototypeCssSource(), /@import "\.\/prototype-update\.css";/);
  assert.doesNotMatch(html, /<style>[\s\S]*\.app\s*\{/);
});

test("prototype extracted stylesheet keeps key workspace domains styled", async () => {
  const css = await readPrototypeCssSource();

  assert.match(css, /:root\s*\{[\s\S]*--bg:/);
  assert.match(css, /\.rail-btn\s*\{/);
  assert.match(css, /\.settings-sidebar-shell\s*\{/);
  assert.match(css, /\.graph-workbench-panel\s*\{/);
  assert.match(css, /\.writing-status-strip\s*\{/);
  assert.match(css, /\.system-message-layout\s*\{/);
});
