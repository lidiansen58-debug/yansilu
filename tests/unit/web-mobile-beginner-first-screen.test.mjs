import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

test("mobile CSS prioritizes demo walkthrough and keeps editor toolbar usable", () => {
  const css = fs.readFileSync("apps/web/src/prototype.css", "utf8");

  assert.match(css, /data-smart-notes-demo-walkthrough/);
  assert.match(css, /order:\s*-20/);
  assert.match(css, /\.sidebar-flow-card\[data-smart-notes-demo-walkthrough\] \.sidebar-flow-note[\s\S]*display:\s*block/);
  assert.match(css, /\.sidebar-flow-current\s*\{/);
  assert.match(css, /\.sidebar-flow-card\[data-smart-notes-demo-walkthrough\] \.sidebar-flow-action[\s\S]*min-height:\s*38px/);
  assert.match(css, /\.editor-stage-top \.toolbar/);
  assert.match(css, /\.editor-stage-shell \.editor-stage-top \.toolbar[\s\S]*min-height:\s*44px/);
  assert.match(css, /\.editor-stage-shell \.editor-stage-top \.toolbar[\s\S]*opacity:\s*1/);
  assert.match(css, /\.editor-stage-shell \.editor-stage-top \.toolbar[\s\S]*-webkit-overflow-scrolling:\s*touch/);
  assert.match(css, /\.app\s*\{[\s\S]*grid-template-columns:\s*46px minmax\(0,\s*1fr\)/);
  assert.match(css, /\.sidebar\s*\{[\s\S]*display:\s*none !important/);
  assert.match(css, /\.mobile-new-note-fab\s*\{[\s\S]*z-index:\s*180/);
  assert.match(css, /focus-within \.toolbar/);
  assert.doesNotMatch(css, /\.editor-stage-shell \.editor-stage-top \.toolbar\s*\{[^}]*display:\s*none !important/);
  assert.match(css, /\.editor-stage-shell\.editor-empty-stage \.editor-stage-top \.toolbar[\s\S]*display:\s*none !important/);
  assert.doesNotMatch(css, /\.editor-empty-start\s*\{\s*display:\s*none !important;/);
  assert.match(css, /\.editor-empty-actions\s*\{\s*grid-template-columns:\s*1fr/);
});
