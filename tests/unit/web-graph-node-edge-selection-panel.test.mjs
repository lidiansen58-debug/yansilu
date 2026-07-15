import test from "node:test";
import assert from "node:assert/strict";
import {
  renderGraphNodeSelectionPanel
} from "../../apps/web/src/graph-node-selection-panel.js";
import {
  renderGraphEdgeSelectionPanel
} from "../../apps/web/src/graph-edge-selection-panel.js";

const escapeHtml = (value = "") => String(value ?? "")
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;");

function shell({ className = "", title = "", meta = "", task = null, body = "", actions = "", roleLabel = "" } = {}) {
  return `<aside class="${className}" data-title="${escapeHtml(title)}" data-meta="${escapeHtml(meta)}" data-task="${escapeHtml(task?.status || "")}" data-role="${escapeHtml(roleLabel)}">${body}${actions}</aside>`;
}

test("graph node selection panel keeps only relation workspace and candidates", () => {
  const nodeMap = new Map([
    ["note-a", { id: "note-a", title: "Note A", noteType: "permanent", degree: 1 }],
    ["note-b", { id: "note-b", title: "Note B", noteType: "permanent" }]
  ]);
  const edges = [{ id: "rel-1", fromNoteId: "note-a", toNoteId: "note-b", relationType: "supports", status: "confirmed" }];
  const html = renderGraphNodeSelectionPanel({
    selection: { kind: "node", nodeId: "note-a" },
    nodeMap,
    edges
  }, {
    escapeHtml,
    graphRelationStatusCountsAsNetworkEdge: (status) => status === "confirmed",
    graphNodeNeedsRelationWorkflow: () => false,
    graphRelationGroupCounts: () => ({ total: 1, support: 1, conflict: 0, boundary: 0, bridge: 0, flow: 0 }),
    graphNodeRoleMeta: () => ({ tone: "support", prompt: "role prompt" }),
    graphNodeInsightMeta: () => ({ position: "support", quality: "clear" }),
    renderGraphNodeInsightPanel: () => "<section data-node-insight>insight</section>",
    renderGraphRelationWorkspaceForNote: () => "<section data-relation-workspace>relations</section>",
    renderGraphAiConnectCandidates: () => "<section data-ai-candidates>candidates</section>",
    graphThemeCandidateNoteIdsForNode: () => ["note-a", "note-b", "note-c"],
    suggestedThemeIndexTitle: () => "Theme title",
    renderGraphSelectionMetrics: () => "<span data-metrics>metrics</span>",
    renderGraphPromptDetails: () => "<details data-prompts>prompts</details>",
    renderGraphSelectionShell: shell,
    noteTypeLabel: () => "永久笔记",
    aiAnalysisLoading: true
  });

  assert.doesNotMatch(html, /data-node-insight/);
  assert.match(html, /data-relation-workspace/);
  assert.match(html, /data-ai-candidates/);
  assert.doesNotMatch(html, /data-open-note="note-a"/);
  assert.doesNotMatch(html, /data-graph-ai-connect-note="note-a" disabled/);
  assert.doesNotMatch(html, /data-graph-open-relation-form data-graph-relation-source="note-a"/);
  assert.doesNotMatch(html, /data-graph-create-theme-index/);
  assert.doesNotMatch(html, /data-graph-theme-title="Theme title"/);
});

test("graph node selection panel delegates isolated nodes back to isolated workflow panel", () => {
  const nodeMap = new Map([["note-a", { id: "note-a", title: "Note A" }]]);
  const html = renderGraphNodeSelectionPanel({
    selection: { kind: "node", nodeId: "note-a" },
    isolatedNotes: [{ noteId: "note-a" }],
    nodeMap,
    edges: []
  }, {
    graphNodeNeedsRelationWorkflow: () => true,
    renderGraphIsolatedSelectionPanel: ({ selection }) => `<aside data-isolated="${selection.noteId}">${selection.title}</aside>`
  });

  assert.match(html, /data-isolated="note-a"/);
  assert.match(html, /Note A/);
});

test("graph edge selection panel keeps relation adjustment and open-note actions", () => {
  const nodeMap = new Map([
    ["source", { id: "source", title: "Source" }],
    ["target", { id: "target", title: "Target" }]
  ]);
  const edges = [{
    id: "rel-1",
    fromNoteId: "source",
    toNoteId: "target",
    fromTitle: "Source",
    toTitle: "Target",
    relationType: "supports",
    status: "confirmed",
    createdBy: "manual",
    rationale: "Source supports target."
  }];
  const html = renderGraphEdgeSelectionPanel({
    selection: { kind: "edge", edgeKey: "rel-1" },
    nodeMap,
    edges
  }, {
    escapeHtml,
    graphEdgeSelectionKey: (edge) => edge.id,
    graphNodeTitle: (_nodeMap, noteId) => noteId,
    graphRelationTypeLabel: () => "支持",
    graphRelationGroupMeta: () => ({ label: "支撑" }),
    graphEdgeReviewMeta: () => ({ tone: "support", label: "检查支撑强度", detail: "detail", prompt: "prompt" }),
    graphEdgeAdjustmentPlan: () => ({
      label: "先补理由",
      detail: "detail",
      cards: [
        { key: "strengthen", title: "补理由", text: "text", actionLabel: "去补理由", active: true },
        { key: "split", title: "拆分", text: "split text", actionLabel: "去拆分" }
      ]
    }),
    graphFocusCardActionMeta: () => ({ label: "去补理由" }),
    graphRelationSourceLabel: () => "手动",
    graphRelationStatusLabel: () => "已确认",
    renderGraphSelectionMetrics: () => "<span data-edge-metrics>metrics</span>",
    renderGraphPromptDetails: () => "<details data-edge-prompts>prompts</details>",
    renderGraphSelectionShell: shell,
    focusContextMode: "argument",
    relationAdjustmentFocusById: { "rel-1": "split" }
  });

  assert.match(html, /data-title="Source → Target"/);
  assert.match(html, /Source supports target\./);
  assert.match(html, /data-graph-relation-adjustment="strengthen"/);
  assert.match(html, /data-graph-relation-adjustment="split"/);
  assert.match(html, /data-graph-relation-id="rel-1"/);
  assert.match(html, /data-graph-target-note="target"/);
  assert.match(html, /data-graph-relation-type="supports"/);
  assert.match(html, /data-graph-open-relation-form data-graph-relation-source="source"/);
  assert.match(html, /data-edge-metrics/);
  assert.match(html, /data-open-note="source"/);
});
