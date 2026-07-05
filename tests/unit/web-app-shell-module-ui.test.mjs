import test from "node:test";
import assert from "node:assert/strict";

import {
  currentModuleSidebarUi
} from "../../apps/web/src/app-shell-module-ui.js";

const escapeHtml = (value) => String(value ?? "")
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;");

test("app shell module ui renders module sidebar copy with escaped root name", () => {
  const ui = currentModuleSidebarUi({
    module: "distillation",
    rootName: "Root & <draft>",
    escapeHtml
  });

  assert.ok(ui.sidebarTitle);
  assert.ok(ui.title);
  assert.match(ui.sidebarHtml, /module-sidebar-card/);
  assert.match(ui.sidebarHtml, /Root &amp; &lt;draft&gt;/);
});

test("app shell module ui delegates settings sidebar navigation", () => {
  const ui = currentModuleSidebarUi({
    module: "settings",
    settingsSidebarNavigationHtml: () => "<nav>settings</nav>"
  });

  assert.equal(ui.sidebarHtml, "<nav>settings</nav>");
});

test("app shell module ui exposes organizer as the daily start entry", () => {
  const ui = currentModuleSidebarUi({ module: "today" });

  assert.equal(ui.title, "让笔记长出思想");
  assert.equal(ui.sidebarTitle, "首页");
  assert.match(ui.summary, /每天只推进最值得做的一步/);
  assert.match(ui.summary, /可写主题/);
  assert.match(ui.sidebarHtml, /首页是你的整理台/);
  assert.match(ui.sidebarHtml, /先点主按钮推进一次/);
  assert.doesNotMatch(ui.sidebarHtml, /<ol class="module-sidebar-list">/);
  assert.doesNotMatch(ui.summary + ui.sidebarHtml, /候选队列|复核|线索/);
});

test("app shell module ui returns a stable fallback for unknown modules", () => {
  const ui = currentModuleSidebarUi({ module: "unknown-module" });

  assert.ok(ui.sidebarTitle);
  assert.ok(ui.summary);
  assert.equal(ui.sidebarHtml, "");
});
