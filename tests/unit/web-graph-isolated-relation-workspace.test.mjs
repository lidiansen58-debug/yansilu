import assert from "node:assert/strict";
import test from "node:test";

import {
  graphIsolatedJoinNetworkWorkspaceModel,
  renderGraphIsolatedJoinNetworkFlowHtml
} from "../../apps/web/src/graph-isolated-relation-workspace.js";

const reversibleRelationTypes = new Set(["bridges", "same_topic", "associated_with"]);
const escapeHtml = (value = "") => String(value ?? "")
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;")
  .replace(/'/g, "&#039;");
const workflowTabKey = (value = "") => {
  const key = String(value || "").trim().toLowerCase();
  return ["ai", "manual"].includes(key) ? key : "ai";
};
const mojibakeCopyPattern = new RegExp("\\u93b5\\u5b2a\\u4f10|\\u934f\\u5d07\\u90f4|\\u951b");
const baseDeps = {
  escapeHtml,
  reversibleRelationTypes,
  workflowTabKey,
  activeTabForNote: () => "manual",
  nodeTitle: (nodeMap, noteId, fallback = "") => nodeMap.get(noteId)?.title || fallback,
  relationStatusCountsAsNetworkEdge: (status = "") => ["suggested", "draft", "confirmed"].includes(String(status || "confirmed").trim().toLowerCase()),
  candidatePercent: () => 70,
  graphFullNoteById: (noteId = "", nodeMap = new Map()) => nodeMap.get(noteId) || null,
  noteTypeLabel: (value = "") => value || "永久笔记",
  graphNotePreviewText: (note = {}) => note.summary || note.title || "",
  graphNoteTags: (note = {}) => Array.isArray(note.tags) ? note.tags : [],
  relationFormTypeOptions: (selectedType = "associated_with") => ["associated_with", "supports", "bridges"]
    .map((type) => `<option value="${type}"${type === selectedType ? " selected" : ""}>${type}</option>`)
    .join(""),
  renderPreviewPanel: (noteId = "", { preferredTargetNoteId = "" } = {}) => `<aside data-preview-for="${escapeHtml(noteId)}" data-preview-target="${escapeHtml(preferredTargetNoteId)}">目标预览</aside>`
};

test("graph isolated relation workspace model prepares candidates and direct edge status", () => {
  const model = graphIsolatedJoinNetworkWorkspaceModel(
    "source",
    {
      nodeMap: new Map([["source", { id: "source", title: "Source" }]]),
      edges: [
        { fromNoteId: "source", toNoteId: "connected", status: "confirmed" },
        { fromNoteId: "source", toNoteId: "dismissed", status: "dismissed" }
      ],
      aiCandidates: [{ counterpartNoteId: "ai-target", relationType: "same_topic" }],
      manualTargets: [{ id: "manual-target", title: "Manual Target" }]
    },
    baseDeps
  );

  assert.equal(model.cleanNoteId, "source");
  assert.equal(model.activeMode, "manual");
  assert.equal(model.directEdges.length, 1);
  assert.equal(model.aiCandidates.length, 1);
  assert.equal(model.manualTargets.length, 1);
});

test("graph isolated relation workspace renders manual targets beyond the first eighty notes", () => {
  const nodeMap = new Map([["source", { id: "source", title: "Source", noteType: "permanent" }]]);
  const manualTargets = [];
  for (let index = 1; index <= 120; index += 1) {
    const id = `target-${String(index).padStart(3, "0")}`;
    nodeMap.set(id, { id, title: `Target ${String(index).padStart(3, "0")}`, noteType: "permanent" });
    manualTargets.push({ id, title: `Target ${String(index).padStart(3, "0")}`, noteType: "permanent", folder: "" });
  }

  const html = renderGraphIsolatedJoinNetworkFlowHtml("source", { nodeMap, edges: [], manualTargets }, baseDeps);

  assert.match(html, /data-graph-pick-manual-target="target-120"/);
  assert.match(html, /目标预览/);
  assert.match(html, /手工搜索目标/);
  assert.doesNotMatch(html, mojibakeCopyPattern);
});

test("graph isolated relation workspace keeps manual mode separate from AI rationale", () => {
  const html = renderGraphIsolatedJoinNetworkFlowHtml(
    "source",
    {
      nodeMap: new Map([
        ["source", { id: "source", title: "Source", noteType: "permanent" }],
        ["manual-target", { id: "manual-target", title: "Manual Target", summary: "Manual target preview.", tags: ["manual"], noteType: "permanent" }]
      ]),
      edges: [],
      relationDraft: { mode: "manual", manualTargetNoteId: "manual-target" },
      aiCandidates: [{ counterpartNoteId: "ai-target", counterpartTitle: "AI Target", relationType: "same_topic", rationaleDraft: "AI reason should not leak." }],
      manualTargets: [{ id: "manual-target", title: "Manual Target", noteType: "permanent" }]
    },
    baseDeps
  );

  assert.doesNotMatch(html, /<textarea[^>]*>AI reason should not leak\.<\/textarea>/);
  assert.match(html, /data-graph-rationale-source="manual"/);
  assert.match(html, /data-graph-manual-rationale="[^"]*Manual Target/);
  assert.match(html, /data-graph-preview-title="Manual Target"/);
  assert.match(html, /data-graph-preview-text="Manual target preview\."/);
});

test("graph isolated relation workspace preserves manual draft while AI lookup rerenders", () => {
  const html = renderGraphIsolatedJoinNetworkFlowHtml(
    "current",
    {
      nodeMap: new Map([
        ["current", { id: "current", title: "Current Note" }],
        ["target", { id: "target", title: "Target Note", noteType: "permanent" }]
      ]),
      edges: [],
      loading: true,
      relationDraft: {
        mode: "manual",
        targetNoteId: "target",
        manualSearchText: "Target",
        relationType: "bridges",
        rationale: "用户已经写好的关系说明，不应该被刷新吃掉。",
        rationaleSource: "user",
        insightQuestion: "它们之间缺什么桥接判断？"
      },
      manualTargets: [{ id: "target", title: "Target Note", folder: "Folder", noteType: "permanent" }]
    },
    { ...baseDeps, activeTabForNote: () => "ai" }
  );

  assert.match(html, /aria-selected="true"[^>]*data-graph-isolated-tab="manual"/);
  assert.match(html, /value="target"/);
  assert.match(html, /Target Note/);
  assert.match(html, /value="bridges" selected/);
  assert.match(html, /data-graph-rationale-source="user"/);
  assert.match(html, /用户已经写好的关系说明，不应该被刷新吃掉。/);
  assert.match(html, /它们之间缺什么桥接判断？/);
});

test("graph isolated relation workspace keeps intentionally cleared rationale empty", () => {
  const nodeMap = new Map([
    ["current", { id: "current", title: "Current Note" }],
    ["ai-target", { id: "ai-target", title: "AI Target", noteType: "permanent" }],
    ["manual-target", { id: "manual-target", title: "Manual Target", noteType: "permanent" }]
  ]);
  const aiCandidates = [{
    counterpartNoteId: "ai-target",
    targetNoteId: "ai-target",
    counterpartTitle: "AI Target",
    relationType: "supports",
    rationaleDraft: "AI fallback should not return."
  }];
  const manualTargets = [{ id: "manual-target", title: "Manual Target", folder: "Folder", noteType: "permanent" }];

  const aiHtml = renderGraphIsolatedJoinNetworkFlowHtml(
    "current",
    {
      nodeMap,
      edges: [],
      aiCandidates,
      manualTargets,
      relationDraft: {
        mode: "ai",
        targetNoteId: "ai-target",
        aiTargetNoteId: "ai-target",
        aiRelationType: "supports",
        aiRationale: "",
        aiRationaleSource: "user",
        aiInsightQuestion: ""
      }
    },
    { ...baseDeps, activeTabForNote: () => "ai" }
  );
  assert.match(aiHtml, /data-graph-rationale-source="user" rows="4"[^>]*><\/textarea>/);
  assert.equal(aiHtml.match(/<textarea data-graph-isolated-rationale[\s\S]*?>([\s\S]*?)<\/textarea>/)?.[1] || "", "");

  const manualHtml = renderGraphIsolatedJoinNetworkFlowHtml(
    "current",
    {
      nodeMap,
      edges: [],
      aiCandidates,
      manualTargets,
      relationDraft: {
        mode: "manual",
        targetNoteId: "manual-target",
        manualTargetNoteId: "manual-target",
        manualSearchText: "Manual Target",
        manualRelationType: "bridges",
        manualRationale: "",
        manualRationaleSource: "user",
        manualInsightQuestion: ""
      }
    },
    { ...baseDeps, activeTabForNote: () => "ai" }
  );
  assert.match(manualHtml, /data-graph-rationale-source="user" rows="4"[^>]*><\/textarea>/);
  assert.equal(manualHtml.match(/<textarea data-graph-isolated-rationale[\s\S]*?>([\s\S]*?)<\/textarea>/)?.[1] || "", "");
});

test("graph isolated relation workspace preserves preferred bridge type and save hint", () => {
  const html = renderGraphIsolatedJoinNetworkFlowHtml(
    "source",
    {
      nodeMap: new Map([
        ["source", { id: "source", title: "Source", noteType: "permanent" }],
        ["bridge-target", { id: "bridge-target", title: "Bridge Target", summary: "Bridge target preview.", noteType: "permanent" }]
      ]),
      edges: [],
      preferredTargetNoteId: "bridge-target",
      preferredRelationType: "bridges",
      preferredRationale: "Bridge reason.",
      manualTargets: [{ id: "bridge-target", title: "Bridge Target", noteType: "permanent" }],
      saveHint: "保存后仍留在当前图谱。"
    },
    baseDeps
  );

  assert.match(html, /data-graph-default-relation-type="bridges"/);
  assert.match(html, /<option value="bridges" selected>bridges<\/option>/);
  assert.match(html, />Bridge reason\.<\/textarea>/);
  assert.match(html, /保存后仍留在当前图谱。/);
});

test("graph isolated relation workspace downgrades directed reverse AI candidates", () => {
  const html = renderGraphIsolatedJoinNetworkFlowHtml(
    "current",
    {
      nodeMap: new Map([
        ["current", { id: "current", title: "Current Note" }],
        ["other", { id: "other", title: "Other Note" }]
      ]),
      edges: [],
      aiCandidates: [{
        sourceNoteId: "other",
        targetNoteId: "current",
        actionSourceNoteId: "other",
        actionTargetNoteId: "current",
        counterpartNoteId: "other",
        counterpartTitle: "Other Note",
        relationType: "supports",
        rationaleDraft: "Other supports current."
      }],
      manualTargets: []
    },
    { ...baseDeps, activeTabForNote: () => "ai" }
  );

  assert.match(html, /<option value="other"[^>]*data-graph-relation-type="associated_with"/);
  assert.doesNotMatch(html, /<textarea[^>]*>Other supports current\.<\/textarea>/);
});
