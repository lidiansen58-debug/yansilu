import assert from "node:assert/strict";
import test from "node:test";

import {
  createGraphIsolatedWorkflowShellRenderer
} from "../../apps/web/src/graph-isolated-workflow-shell.js";

function baseShell(overrides = {}) {
  return createGraphIsolatedWorkflowShellRenderer({
    isolatedQueueItems: () => [
      { noteId: "current", isolatedKey: "current", title: "当前笔记", current: true, decision: { tone: "bridge" } },
      { noteId: "next", isolatedKey: "next", title: "下一条笔记", decision: { tone: "keep" }, aiCount: 1 }
    ],
    nextIsolatedQueueItem: (items, currentNoteId) => items.find((item) => item.noteId !== currentNoteId) || items[0] || null,
    resolveIsolatedSelection: () => ({
      noteId: "current",
      title: "当前笔记",
      item: { thesis: "当前判断需要接入关系网。" }
    }),
    allNotes: () => [{ id: "current", title: "当前笔记", noteType: "permanent" }],
    fullNoteById: (noteId, nodeMap) => nodeMap.get(noteId) || null,
    nodeTitle: (nodeMap, id, fallback) => nodeMap.get(id)?.title || fallback,
    noteTypeLabel: () => "永久笔记",
    decisionMeta: () => ({ tone: "bridge", label: "补桥接" }),
    relationStatusCountsAsNetworkEdge: (status) => status !== "archived",
    renderSelectionShell: ({ className = "", title = "", meta = "", body = "" } = {}) => `<section class="${className}" data-title="${title}" data-meta="${meta}">${body}</section>`,
    renderRelationWorkspaceForNote: (noteId, { title = "" } = {}) => `<div data-relation-workspace="${noteId}">${title}</div>`,
    renderJoinNetworkFlow: (noteId) => `<form data-join-flow="${noteId}"></form>`,
    renderNextStepActions: (noteId) => `<div data-next-step="${noteId}"></div>`,
    ...overrides
  });
}

test("graph isolated workflow shell renders queue entries from prepared queue items", () => {
  const shell = baseShell();

  const html = shell.renderQueue({
    currentNoteId: "current",
    compact: true,
    queueItems: [
      { noteId: "current", isolatedKey: "current", title: "当前笔记", current: true, decision: { tone: "bridge" } },
      { noteId: "next", isolatedKey: "next", title: "下一条笔记", decision: { tone: "keep" }, aiCount: 2 }
    ]
  });

  assert.match(html, /继续处理其它未关联笔记/);
  assert.match(html, /data-graph-select-isolated="next"/);
  assert.match(html, /AI 推荐 2/);
});

test("graph isolated workflow shell uses concise queue actions", () => {
  const shell = baseShell();
  const html = shell.renderQueueStrip({
    currentNoteId: "",
    queueItems: [
      { noteId: "next", isolatedKey: "next", title: "下一条笔记", decision: { tone: "keep" }, aiCount: 1 }
    ]
  });

  assert.match(html, />关联<\/button>/);
  assert.match(html, />查看<\/button>/);
  assert.match(html, /data-graph-queue-strip-toggle/);
  assert.match(html, /aria-expanded="true">收起<\/button>/);
  assert.doesNotMatch(html, /开始关联/);
  assert.doesNotMatch(html, /查看这些笔记/);
});

test("graph isolated workflow shell can render the queue strip collapsed", () => {
  const shell = baseShell();
  const html = shell.renderQueueStrip({
    collapsed: true,
    currentNoteId: "",
    queueItems: [
      { noteId: "next", isolatedKey: "next", title: "下一条笔记", decision: { tone: "keep" }, aiCount: 1 }
    ]
  });

  assert.match(html, /graph-isolated-queue-strip is-collapsed/);
  assert.match(html, /aria-expanded="false">展开<\/button>/);
  assert.match(html, /class="graph-isolated-queue-detail"/);
});

test("graph isolated workflow shell shows relation organizing flow before a note has network edges", () => {
  const shell = baseShell();
  const nodeMap = new Map([["current", { id: "current", title: "当前笔记", noteType: "permanent" }]]);

  const html = shell.renderSelectionPanel({
    selection: { kind: "isolated", noteId: "current" },
    isolatedNotes: [{ noteId: "current" }],
    nodeMap,
    edges: []
  });

  assert.match(html, /class="is-isolated is-bridge"/);
  assert.match(html, /data-meta="选对象，写理由，保存"/);
  assert.match(html, /当前判断需要接入关系网。/);
  assert.match(html, /data-join-flow="current"/);
  assert.doesNotMatch(html, /data-relation-workspace="current"/);
});

test("graph isolated workflow shell switches to saved relations and next steps after a network edge exists", () => {
  const shell = baseShell();
  const nodeMap = new Map([["current", { id: "current", title: "当前笔记", noteType: "permanent" }]]);

  const html = shell.renderSelectionPanel({
    selection: { kind: "isolated", noteId: "current" },
    isolatedNotes: [{ noteId: "current" }],
    nodeMap,
    edges: [{ fromNoteId: "current", toNoteId: "other", status: "confirmed" }]
  });

  assert.match(html, /data-meta="已保存 1 条关系"/);
  assert.match(html, /data-relation-workspace="current"/);
  assert.match(html, /data-next-step="current"/);
  assert.doesNotMatch(html, /data-join-flow="current"/);
});

test("graph isolated workflow shell renders completion result with the next isolated item", () => {
  const shell = baseShell();
  const nodeMap = new Map([["current", { id: "current", title: "当前笔记", noteType: "permanent" }]]);

  const html = shell.renderCompletePanel({
    selection: {
      kind: "isolatedComplete",
      noteId: "current",
      saveResult: { targetTitle: "目标笔记", relationLabel: "支持" }
    },
    isolatedNotes: [{ noteId: "current" }, { noteId: "next" }],
    nodeMap,
    edges: [{ fromNoteId: "current", toNoteId: "target", status: "confirmed" }]
  });

  assert.match(html, /已关联到：目标笔记/);
  assert.match(html, /关系类型：支持/);
  assert.match(html, /继续处理：下一条笔记/);
  assert.match(html, /data-graph-open-relation-form/);
  assert.match(html, /data-relation-workspace="current"/);
});
