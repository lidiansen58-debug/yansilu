import assert from "node:assert/strict";
import test from "node:test";

import {
  createGraphThinkingPanelResidualView
} from "../../apps/web/src/graph-thinking-panel-residual-view.js";
import {
  buildGraphThinkingItemsForGraph
} from "../../apps/web/src/graph-thinking-items-model.js";
import {
  createGraphThinkingModelRuntimeDepsProvider
} from "../../apps/web/src/graph-workspace-host-deps.js";

test("graph thinking residual view falls back to computed candidate endpoint helper", () => {
  const residualView = createGraphThinkingPanelResidualView({
    escapeHtml: (value = "") => String(value ?? ""),
    graphState: {},
    state: {},
    createGraphThinkingModelRuntimeDepsProvider,
    buildGraphThinkingItemsForGraph,
    computeGraphCandidateEndpointIds: (candidate = {}) => ({
      sourceNoteId: String(candidate.fromNoteId || "").trim(),
      targetNoteId: String(candidate.toNoteId || "").trim()
    })
  });

  const items = residualView.buildGraphThinkingItems({
    nodes: [{ id: "source", title: "Source" }, { id: "target", title: "Target" }],
    edges: [],
    aiAnalysis: {
      analysis: {
        relationCandidates: [{ fromNoteId: "source", toNoteId: "target", relationType: "supports", rationale: "usable" }]
      }
    }
  });

  assert.equal(items.length, 1);
  assert.equal(items[0].title, "Source -> Target");
  assert.deepEqual(items[0].highlightNodeIds, ["source", "target"]);
});
