import test from "node:test";
import assert from "node:assert/strict";

import {
  renderGraphResearchNavigatorEntryView,
  renderGraphThinkingItemsView,
  renderGraphThinkingPanelContentView,
  renderGraphWorkbenchEntryPillsView,
  renderGraphWorkbenchPanelView
} from "../../apps/web/src/graph-workbench-panel.js";

const tabMeta = (value = "clues") => {
  const items = {
    clues: {
      key: "clues",
      label: "关系待办",
      emptyLabel: "关系清楚",
      panelTitle: "关系待办",
      note: "处理关系"
    },
    questions: {
      key: "questions",
      label: "思考问题",
      emptyLabel: "暂无问题",
      panelTitle: "思考问题",
      note: "处理问题"
    }
  };
  return items[value] || items.clues;
};

const filterMeta = (value = "all") => {
  const items = {
    all: { key: "all", label: "全部", note: "全部" },
    theme: { key: "theme", label: "主题", note: "主题" },
    organize: { key: "organize", label: "关系", note: "关系" }
  };
  return items[value] || items.all;
};

function deps(graphState = {}) {
  return {
    graphState,
    graphWorkbenchTabMeta: tabMeta,
    graphThinkingFilterMeta: filterMeta,
    renderGraphIcon: (name) => `<i>${name}</i>`,
    graphThinkingHighlightAttrs: (item) => item.noteId ? `data-graph-select-node="${item.noteId}"` : "",
    graphCompactActionLabel: (label) => label.slice(0, 2)
  };
}

test("graph workbench entry pills expose clue and question entry state", () => {
  const html = renderGraphWorkbenchEntryPillsView(
    { clueSummary: { total: 2 }, questionSummary: { total: 0 } },
    deps({ workbenchPanelOpen: true, workbenchPanelTab: "clues" })
  );

  assert.match(html, /graph-workbench-entry-group/);
  assert.match(html, /data-graph-workbench-entry="clues"/);
  assert.match(html, /data-graph-workbench-entry="questions"/);
  assert.match(html, /is-active/);
  assert.match(html, /is-empty/);
  assert.match(html, />2<\/strong>/);
});

test("graph research navigator entry toggles open and close actions", () => {
  assert.match(renderGraphResearchNavigatorEntryView(false), /data-graph-research-open/);
  assert.match(renderGraphResearchNavigatorEntryView(true), /data-graph-research-close/);
});

test("graph thinking items filter content and keep action attrs", () => {
  const html = renderGraphThinkingItemsView(
    [
      { view: "theme", title: "主题 A", actionLabel: "打开主题", actionAttrs: 'data-open-theme="a"', noteId: "n1" },
      { view: "organize", title: "关系 B" }
    ],
    "theme",
    deps({})
  );

  assert.match(html, /graph-thinking-list/);
  assert.match(html, /主题 A/);
  assert.doesNotMatch(html, /关系 B/);
  assert.match(html, /data-open-theme="a"/);
  assert.match(html, /data-graph-select-node="n1"/);
});

test("graph thinking panel content renders filters, summary, review note, and body", () => {
  const html = renderGraphThinkingPanelContentView(
    {
      summary: { categories: [{ count: 3, label: "待补理由" }], artifactCount: 2 },
      items: [{ view: "organize", title: "补理由" }],
      includeSummary: true
    },
    deps({ thinkingFilter: "organize" })
  );

  assert.match(html, /data-graph-thinking-filter="organize"/);
  assert.match(html, /graph-thinking-categories/);
  assert.match(html, /data-open-ai-inbox-from-graph/);
  assert.match(html, /补理由/);
});

test("graph workbench panel renders active tabs, priority queue, and folded body", () => {
  const html = renderGraphWorkbenchPanelView(
    {
      clueSummary: { total: 4, detail: "4 条关系" },
      questionSummary: { total: 1, detail: "1 个问题" },
      clueSectionsMarkup: "<section>全部关系</section>",
      thinkingItems: [
        { view: "organize", title: "先处理", tone: "bridge", actionAttrs: 'data-action="x"', actionLabel: "处理" }
      ],
      isolatedQueueMarkup: "<aside>孤立笔记</aside>"
    },
    deps({ workbenchPanelOpen: true, workbenchPanelTab: "clues" })
  );

  assert.match(html, /graph-workbench-panel/);
  assert.match(html, /data-graph-workbench-tab="clues"/);
  assert.match(html, /graph-priority-queue/);
  assert.match(html, /孤立笔记/);
  assert.match(html, /全部关系/);
  assert.match(html, /data-graph-workbench-close/);
});
