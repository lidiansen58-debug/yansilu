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

test("graph workbench panel shows concrete actions instead of generic instructions", () => {
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
  assert.match(html, /具体待检查笔记与关系/);
  assert.match(html, /data-graph-workbench-close/);
  assert.doesNotMatch(html, /data-graph-workbench-tab=/);
  assert.doesNotMatch(html, /graph-priority-queue/);
  assert.doesNotMatch(html, /graph-workbench-all/);
  assert.doesNotMatch(html, /孤立笔记|全部关系|graph-workbench-note-list|如何找缺口/);
  assert.match(html, /data-action="x"/);
  assert.doesNotMatch(html, /关联任务|洞察问题/);
});

test("graph workbench theme panel summarizes likely theme areas", () => {
  const html = renderGraphWorkbenchPanelView(
    {
      clueSummary: { total: 0 },
      questionSummary: { total: 22, detail: "22 个主题线索" },
      thinkingItems: [
        { view: "theme", title: "AI 应该在具体任务旁提供帮助", question: "这些笔记是否都在回答 AI 何时出现？", actionLabel: "确认主题", actionAttrs: 'data-graph-select-theme="topic-a"' },
        { view: "question", title: "关系类型怎么选", detail: "围绕关联判断和理由写法。" },
        { view: "organize", title: "补关系" }
      ]
    },
    deps({ workbenchPanelOpen: true, workbenchPanelTab: "questions" })
  );

  assert.match(html, /2 组相关材料/);
  assert.doesNotMatch(html, /如何发现主题|data-graph-workbench-guide-toggle/);
  assert.match(html, /graph-workbench-theme-overview/);
  assert.match(html, /graph-workbench-theme-overview-item/);
  assert.match(html, /data-graph-select-theme="topic-a"/);
  assert.match(html, /AI 应该在具体任务旁提供帮助/);
  assert.match(html, /这些笔记是否都在回答 AI 何时出现/);
  assert.match(html, /关系类型怎么选/);
  assert.doesNotMatch(html, /补关系/);
});

test("workbench does not leak another task's items into an empty category", () => {
  const html = renderGraphWorkbenchPanelView({
    clueSummary: { total: 99 },
    thinkingItems: [{ view: "theme", title: "主题不属于关系缺口", actionAttrs: 'data-open-note="wrong"' }]
  }, deps({ workbenchPanelOpen: true, workbenchPanelTab: "clues" }));
  assert.match(html, /当前没有待检查的关系/);
  assert.doesNotMatch(html, /主题不属于关系缺口|data-open-note="wrong"|99/);
});

test("workbench keeps all actual tasks available without duplicate row actions", () => {
  const html = renderGraphWorkbenchPanelView({ thinkingItems: Array.from({ length: 5 }, (_, i) => ({
    view: "organize", title: `笔记 ${i}`, meta: "没有已保存的关系", detail: "真实观点",
    actionAttrs: `data-open-note="n${i}"`
  })) }, deps({ workbenchPanelOpen: true, workbenchPanelTab: "clues" }));
  assert.match(html, /其余 2 项/);
  assert.match(html, /笔记 4/);
  assert.equal((html.match(/data-open-note=/g) || []).length, 5);
  assert.doesNotMatch(html, /graph-priority-item-action|真正补关系/);
});

test("theme workbench exposes all material groups without another guide panel", () => {
  const html = renderGraphWorkbenchPanelView(
    {
      questionSummary: { total: 1 },
      thinkingItems: Array.from({ length: 5 }, (_, i) => ({ view: "theme", title: `主题 ${i}`, meta: "3 条笔记", detail: "真实笔记标题", actionAttrs: `data-graph-create-theme-index data-graph-theme-note-ids="a,b,c${i}"` }))
    },
    deps({ workbenchPanelOpen: true, workbenchPanelTab: "questions", workbenchGuideOpen: true })
  );

  assert.doesNotMatch(html, /data-graph-workbench-guide-toggle/);
  assert.match(html, /其余 2 组/);
  assert.match(html, /主题 4/);
  assert.match(html, /3 条笔记/);
  assert.match(html, /真实笔记标题/);
  assert.equal((html.match(/data-graph-create-theme-index/g) || []).length, 5);
});
