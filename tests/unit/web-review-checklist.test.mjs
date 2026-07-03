import test from "node:test";
import assert from "node:assert/strict";

import { buildReviewChecklist } from "../../apps/web/src/review-checklist-model.js";
import { renderReviewChecklistPanel } from "../../apps/web/src/review-checklist-panel.js";
import { installTodayOrganizingEvents } from "../../apps/web/src/today-organizing-events.js";

function clickTarget(action, dataset = {}) {
  return {
    preventDefault() {},
    target: {
      closest: (selector) => selector === "[data-today-action]"
        ? {
            disabled: false,
            dataset,
            getAttribute: () => action
          }
        : null
    }
  };
}

test("review checklist creates action items for the four local review rules", () => {
  const checklist = buildReviewChecklist({
    notes: [
      { id: "pn_isolated", title: "孤立判断", noteType: "permanent", relationNetworkStatus: "isolated" },
      { id: "pn_tag", title: "宽标签笔记", noteType: "permanent", tags: ["阅读"], relationNetworkStatus: "connected" },
      { id: "pn_source", title: "来源判断", noteType: "permanent", relationNetworkStatus: "connected" },
      { id: "pn_target", title: "目标判断", noteType: "permanent", relationNetworkStatus: "connected" }
    ],
    relations: [
      { sourceNoteId: "pn_source", targetNoteId: "pn_target", relationType: "supports", status: "confirmed" }
    ],
    themeIndexes: [
      { id: "idx_topic", title: "慢读训练", item_note_ids: ["pn_isolated", "pn_source", "pn_target"] }
    ],
    relationsReady: true
  }, {
    relationNetworkStatusForNote: (note) => note.relationNetworkStatus
  });

  assert.deepEqual(checklist.items.map((item) => item.type), [
    "isolatedNote",
    "broadTag",
    "missingRationale",
    "writableTopic"
  ]);
  assert.deepEqual(checklist.items.map((item) => item.action), [
    "review-connect-isolated",
    "review-refine-tag",
    "review-complete-rationale",
    "review-generate-outline"
  ]);
  assert.equal(checklist.items.every((item) => item.actionLabel && item.action), true);
});

test("review checklist treats AI as supplemental advice, not as the source of action items", () => {
  const aiOnly = buildReviewChecklist({
    notes: [{ id: "pn_done", title: "已整理", noteType: "permanent", explicitRelationCount: 1 }],
    relations: [{ sourceNoteId: "pn_done", targetNoteId: "pn_other", relationType: "supports", rationale: "已经说明理由" }],
    themeIndexes: [],
    relationsReady: true,
    aiSuggestions: [{ type: "broadTag", noteId: "pn_done", summary: "AI 认为标签可以更具体。" }]
  });
  assert.equal(aiOnly.items.length, 0);

  const withLocalRule = buildReviewChecklist({
    notes: [{ id: "pn_isolated", title: "孤立判断", noteType: "permanent", relationNetworkStatus: "isolated" }],
    aiSuggestions: [{ type: "isolatedNote", noteId: "pn_isolated", summary: "可以先找同主题旧笔记。" }]
  }, {
    relationNetworkStatusForNote: (note) => note.relationNetworkStatus
  });
  assert.equal(withLocalRule.items.length, 1);
  assert.equal(withLocalRule.items[0].source, "local-rule");
  assert.equal(withLocalRule.items[0].aiSuggestion, "可以先找同主题旧笔记。");
});

test("review checklist keeps wikilink-only notes in the isolated action queue", () => {
  const checklist = buildReviewChecklist({
    notes: [
      {
        id: "pn_wikilink_only",
        title: "只有正文链接",
        noteType: "permanent",
        links: ["另一条笔记"],
        body: "这条笔记只写了 [[另一条笔记]]，还没有正式关系。"
      }
    ],
    relations: [],
    relationsReady: false
  });

  assert.equal(checklist.items[0]?.type, "isolatedNote");
  assert.equal(checklist.items[0]?.action, "review-connect-isolated");
});

test("review checklist does not mark relation-loaded connected notes as isolated", () => {
  const checklist = buildReviewChecklist({
    notes: [
      {
        id: "pn_connected",
        title: "图谱已有关系",
        noteType: "permanent",
        links: ["另一条笔记"]
      }
    ],
    relations: [
      { sourceNoteId: "pn_connected", targetNoteId: "pn_other", relationType: "supports", rationale: "正式关系理由" }
    ],
    relationsReady: true
  });

  assert.equal(checklist.items.some((item) => item.type === "isolatedNote"), false);
});

test("review checklist panel renders only actionable cards with buttons", () => {
  const html = renderReviewChecklistPanel({
    items: [
      { type: "isolatedNote", title: "孤立笔记", objectTitle: "孤立判断", summary: "补一条关系", meta: "本地规则", action: "review-connect-isolated", actionLabel: "补一条关系", noteId: "pn_1" },
      { type: "broadTag", title: "标签太宽", objectTitle: "#阅读", summary: "改成更具体标签", meta: "本地规则", action: "review-refine-tag", actionLabel: "改成更具体标签", noteId: "pn_2", tag: "阅读" }
    ]
  });

  assert.match(html, /定期回顾清单/);
  assert.match(html, /data-today-action="review-connect-isolated"/);
  assert.match(html, /data-today-action="review-refine-tag"/);
  assert.match(html, /<button class="mini-btn primary"/);
  assert.doesNotMatch(html, /纯状态|状态列表/);
});

test("review checklist actions route to existing workflows without automatic edits", async () => {
  const handlers = new Map();
  const calls = [];
  installTodayOrganizingEvents({ addEventListener: (eventName, handler) => handlers.set(eventName, handler) }, () => ({
    activateModule: (moduleName) => calls.push(["module", moduleName]),
    handleStateChange: async (reason, payload) => calls.push(["state", reason, payload]),
    openNoteById: (noteId, options) => calls.push(["open-note", noteId, options]),
    openWritingModule: async (options) => calls.push(["writing", options]),
    addWritingBasketIds: (noteIds) => calls.push(["basket", noteIds]),
    selectWritingThemeIndex: async (themeId) => calls.push(["theme", themeId]),
    createReviewOutline: async (payload) => calls.push(["outline", payload]),
    setStatus: (message, tone) => calls.push(["status", message, tone])
  }));

  const click = (event) => handlers.get("click")(event);
  await click(clickTarget("review-connect-isolated", { reviewNoteId: "pn_isolated" }));
  await click(clickTarget("review-refine-tag", { reviewNoteId: "pn_tag", reviewTag: "阅读" }));
  await click(clickTarget("review-complete-rationale", { reviewNoteId: "pn_source" }));
  await click(clickTarget("review-generate-outline", { reviewThemeId: "idx_topic", reviewNoteIds: "pn_a,pn_b,pn_c" }));

  assert.deepEqual(calls[0], ["module", "graph"]);
  assert.deepEqual(calls[1], ["state", "graph-associate-note", { noteId: "pn_isolated", source: "review-checklist" }]);
  assert.deepEqual(calls[2], ["module", "explorer"]);
  assert.deepEqual(calls[3], ["open-note", "pn_tag", { preferTitleSelection: false }]);
  assert.deepEqual(calls[5], ["module", "graph"]);
  assert.deepEqual(calls[6], ["state", "open-note-relations", { noteId: "pn_source", source: "review-checklist" }]);
  assert.deepEqual(calls[7], ["outline", { themeId: "idx_topic", noteIds: ["pn_a", "pn_b", "pn_c"], source: "review-checklist" }]);
  assert.equal(calls.some((call) => call[0] === "basket" && call[1]?.includes?.("pn_a")), false);
  assert.equal(calls.some((call) => call[0] === "writing"), false);
  assert.equal(calls.some((call) => call[0] === "theme"), false);
});

test("review checklist outline action falls back to existing writing routing without a host outline action", async () => {
  const handlers = new Map();
  const calls = [];
  installTodayOrganizingEvents({ addEventListener: (eventName, handler) => handlers.set(eventName, handler) }, () => ({
    activateModule: (moduleName) => calls.push(["module", moduleName]),
    openWritingModule: async (options) => calls.push(["writing", options]),
    addWritingBasketIds: (noteIds) => calls.push(["basket", noteIds]),
    selectWritingThemeIndex: async (themeId) => calls.push(["theme", themeId])
  }));

  await handlers.get("click")(clickTarget("review-generate-outline", { reviewThemeId: "idx_topic", reviewNoteIds: "pn_a,pn_b" }));

  assert.deepEqual(calls[0], ["basket", ["pn_a", "pn_b"]]);
  assert.deepEqual(calls[1], ["module", "writing"]);
  assert.equal(calls[2][0], "writing");
  assert.equal(calls[2][1].entrySourceLabel, "定期回顾清单");
  assert.deepEqual(calls[3], ["theme", "idx_topic"]);
});
