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
      label: "补全关系",
      emptyLabel: "暂无需要补的关系",
      panelTitle: "补全关系",
      note: "处理关系"
    },
    questions: {
      key: "questions",
      label: "找主题",
      emptyLabel: "暂无可找主题的线索",
      panelTitle: "找主题",
      note: "处理主题"
    }
  };
  return items[value] || items.clues;
};

const filterMeta = (value = "all") => {
  const items = {
    all: { key: "all", label: "全部", note: "全部" },
    theme: { key: "theme", label: "找主题", note: "找主题" },
    organize: { key: "organize", label: "补全关系", note: "补全关系" }
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

test("graph workbench entry pills keep only task labels", () => {
  const html = renderGraphWorkbenchEntryPillsView(
    { clueSummary: { total: 2 }, questionSummary: { total: 0 } },
    deps({ workbenchPanelOpen: true, workbenchPanelTab: "clues" })
  );

  assert.match(html, /graph-workbench-entry-group/);
  assert.match(html, /data-graph-workbench-entry="clues"/);
  assert.match(html, /data-graph-workbench-entry="questions"/);
  assert.match(html, /补全关系/);
  assert.match(html, /找主题/);
  assert.match(html, /is-active/);
  assert.match(html, /is-empty/);
  assert.match(html, />2<\/strong>/);
  assert.doesNotMatch(html, /关联任务|洞察问题/);
});

test("graph research navigator entry is no longer a separate lower-row button", () => {
  assert.equal(renderGraphResearchNavigatorEntryView(false), "");
  assert.equal(renderGraphResearchNavigatorEntryView(true), "");
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

test("graph thinking panel content removes secondary filters but keeps summary and review action", () => {
  const html = renderGraphThinkingPanelContentView(
    {
      summary: { total: 1, artifactCount: 2 },
      items: [{ view: "organize", title: "补理由" }],
      includeSummary: true
    },
    deps({ thinkingFilter: "organize" })
  );

  assert.doesNotMatch(html, /data-graph-thinking-filter=/);
  assert.match(html, /graph-thinking-categories/);
  assert.match(html, /data-graph-focus-thinking-review/);
  assert.match(html, /2 项待确认/);
  assert.doesNotMatch(html, /系统消息|关联任务|洞察问题/);
  assert.match(html, /补理由/);
});

test("graph workbench panel renders only a minimal read-only explanation", () => {
  const html = renderGraphWorkbenchPanelView(
    {
      clueSummary: { total: 4, detail: "4 条关系" },
      questionSummary: { total: 1, detail: "1 个主题线索" },
      clueSectionsMarkup: "<section>全部关系</section>",
      thinkingItems: [
        { view: "organize", title: "先处理", tone: "bridge", actionAttrs: 'data-action="x"', actionLabel: "处理" }
      ],
      isolatedQueueMarkup: "<aside>孤立笔记</aside>"
    },
    deps({ workbenchPanelOpen: true, workbenchPanelTab: "clues" })
  );

  assert.match(html, /graph-workbench-panel/);
  assert.match(html, /aria-label="补全关系"/);
  assert.match(html, /graph-workbench-note-list/);
  assert.match(html, /data-graph-workbench-close/);
  assert.doesNotMatch(html, /data-graph-workbench-tab=/);
  assert.doesNotMatch(html, /graph-priority-queue/);
  assert.doesNotMatch(html, /graph-workbench-all/);
  assert.doesNotMatch(html, /孤立笔记|全部关系|data-action="x"/);
  assert.doesNotMatch(html, /关联任务|洞察问题/);
});
