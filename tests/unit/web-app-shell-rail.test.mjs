import test from "node:test";
import assert from "node:assert/strict";

import {
  settingsRailLabel,
  syncRailSelectionDom,
  todayRailHasTasks
} from "../../apps/web/src/app-shell-rail.js";

function createButton(dataset = {}) {
  const classes = new Set();
  return {
    dataset,
    attributes: {},
    classList: {
      toggle(name, value) {
        if (value) classes.add(name);
        else classes.delete(name);
      },
      contains(name) {
        return classes.has(name);
      }
    },
    setAttribute(name, value) {
      this.attributes[name] = String(value);
    }
  };
}

test("app shell rail marks current quick entry and active module", () => {
  const quickOriginal = createButton({ action: "quick-original" });
  const quickLiterature = createButton({ action: "quick-literature" });
  const graph = createButton({ module: "graph" });
  const settings = createButton({ module: "settings" });
  const document = {
    querySelectorAll(selector) {
      if (selector === ".quick-entry") return [quickOriginal, quickLiterature];
      if (selector === ".rail-btn[data-module]") return [graph, settings];
      return [];
    }
  };

  syncRailSelectionDom({
    document,
    currentQuickAction: "quick-literature",
    currentModule: "explorer",
    updateAvailable: false
  });

  assert.equal(quickOriginal.classList.contains("active"), false);
  assert.equal(quickLiterature.classList.contains("active"), true);
  assert.equal(quickLiterature.classList.contains("current-root"), true);
  assert.equal(graph.classList.contains("active"), false);
  assert.equal(settings.classList.contains("has-update"), false);
  assert.equal(settings.attributes.title, "设置");
});

test("app shell rail shows a restrained settings update indicator", () => {
  const settings = createButton({ module: "settings" });
  const document = {
    querySelectorAll(selector) {
      if (selector === ".quick-entry") return [];
      if (selector === ".rail-btn[data-module]") return [settings];
      return [];
    }
  };

  syncRailSelectionDom({
    document,
    currentModule: "settings",
    updateAvailable: true
  });

  assert.equal(settingsRailLabel(true), "设置 · 有新版本");
  assert.equal(settings.classList.contains("active"), true);
  assert.equal(settings.classList.contains("has-update"), true);
  assert.equal(settings.attributes.title, "设置 · 有新版本");
  assert.equal(settings.attributes["data-tip"], "设置 · 有新版本");
  assert.equal(settings.attributes["aria-label"], "设置 · 有新版本");
});

test("app shell rail marks today organizing when there are tasks", () => {
  const today = createButton({ module: "today" });
  const settings = createButton({ module: "settings" });
  const document = {
    querySelectorAll(selector) {
      if (selector === ".quick-entry") return [];
      if (selector === ".rail-btn[data-module]") return [today, settings];
      return [];
    }
  };

  syncRailSelectionDom({
    document,
    currentModule: "explorer",
    todayHasTasks: true
  });

  assert.equal(today.classList.contains("active"), false);
  assert.equal(today.classList.contains("has-unread"), true);
  assert.equal(today.attributes.title, "今日整理 · 有待处理任务");
  assert.equal(today.attributes["data-tip"], "今日整理 · 有待处理任务");
  assert.equal(today.attributes["aria-label"], "今日整理 · 有待处理任务");

  syncRailSelectionDom({
    document,
    currentModule: "today",
    todayHasTasks: false
  });

  assert.equal(today.classList.contains("active"), true);
  assert.equal(today.classList.contains("has-unread"), false);
  assert.equal(today.attributes.title, "今日整理");
});

test("today rail attention only reflects maintenance tasks", () => {
  assert.equal(todayRailHasTasks({ pendingMaterialCount: 1 }), true);
  assert.equal(todayRailHasTasks({ isolatedCount: 1 }), true);
  assert.equal(todayRailHasTasks({
    reviewChecklist: { items: [{ type: "missingRationale" }] }
  }), true);
  assert.equal(todayRailHasTasks({
    themeCount: 2,
    writingReadyCount: 4,
    reviewChecklist: { items: [{ type: "writableTopic" }] }
  }), false);
});
