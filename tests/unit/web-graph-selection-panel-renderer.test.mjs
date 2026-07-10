import test from "node:test";
import assert from "node:assert/strict";

import {
  createGraphSelectionPanelRenderer
} from "../../apps/web/src/graph-selection-panel-renderer.js";

test("graph selection panel renderer keeps dispatcher and node edge panel wiring outside prototype", () => {
  const host = {
    escapeHtml: (value = "") => String(value ?? ""),
    renderGraphClusterSelectionPanel: () => "cluster-panel",
    renderGraphThemeSelectionPanel: () => "theme-panel",
    renderGraphIsolatedSelectionPanel: () => "isolated-panel",
    renderGraphIsolatedCompletePanel: () => "isolated-complete-panel",
    renderGraphBridgeSelectionPanel: () => "bridge-panel",
    normalizeGraphSelectionForVisibleItems: (selection) => selection,
    graphRelationStatusCountsAsNetworkEdge: () => true,
    graphNodeNeedsRelationWorkflow: () => false,
    graphRelationGroupCounts: () => ({ total: 1 }),
    graphNodeRoleMeta: () => ({ tone: "ready", prompt: "" }),
    graphNodeInsightMeta: () => ({}),
    renderGraphNodeInsightPanel: () => "<insight />",
    renderGraphRelationWorkspaceForNote: () => "",
    renderGraphAiConnectCandidates: () => "",
    graphThemeCandidateNoteIdsForNode: () => [],
    suggestedThemeIndexTitle: () => "",
    renderGraphSelectionMetrics: () => "<metrics />",
    renderGraphPromptDetails: () => "<prompts />",
    renderGraphSelectionShell: ({ title = "", actions = "" } = {}) => `<shell title="${title}">${actions}</shell>`,
    noteTypeLabel: () => "permanent",
    graphState: { aiAnalysisLoading: false }
  };
  const renderer = createGraphSelectionPanelRenderer(() => host);
  const nodeMap = new Map([["n1", { id: "n1", title: "Alpha", noteType: "permanent", degree: 1 }]]);

  assert.equal(renderer.renderGraphSelectionPanel({ selection: { kind: "cluster" } }), "cluster-panel");
  const html = renderer.renderGraphSelectionPanel({
    selection: { kind: "node", nodeId: "n1" },
    nodeMap,
    edges: [{ fromNoteId: "n1", toNoteId: "n2", status: "confirmed" }]
  });

  assert.match(html, /title="Alpha"/);
  assert.match(html, /data-graph-ai-connect-note="n1"/);
});
