import test from "node:test";
import assert from "node:assert/strict";

import {
  buildGraphThinkingModelRuntimeDeps,
  buildGraphWorkspaceRenderDeps,
  createGraphThinkingModelRuntimeDepsProvider
} from "../../apps/web/src/graph-workspace-host-deps.js";

function marker(name) {
  return Object.assign(() => name, { marker: name });
}

test("graph workspace render deps maps prototype graph helpers to workspace view names", () => {
  const host = {
    graphRelationStatusCountsAsNetworkEdge: marker("status"),
    graphRelationGroupCounts: marker("counts"),
    graphNodeTitle: marker("title"),
    suggestedThemeIndexTitle: marker("theme-title"),
    graphEdgeSelectionKey: marker("edge-key"),
    graphRelationTypeLabel: marker("type-label"),
    renderGraphSelectionMetrics: marker("metrics")
  };

  const deps = buildGraphWorkspaceRenderDeps(host);

  assert.equal(deps.relationStatusCountsAsNetworkEdge, host.graphRelationStatusCountsAsNetworkEdge);
  assert.equal(deps.relationGroupCounts, host.graphRelationGroupCounts);
  assert.equal(deps.nodeTitle, host.graphNodeTitle);
  assert.equal(deps.suggestThemeIndexTitle, host.suggestedThemeIndexTitle);
  assert.equal(deps.edgeSelectionKey, host.graphEdgeSelectionKey);
  assert.equal(deps.relationTypeLabel, host.graphRelationTypeLabel);
  assert.equal(deps.renderSelectionMetrics, host.renderGraphSelectionMetrics);
});

test("graph thinking model deps provider reads current host helpers", () => {
  let relationTypeLabel = marker("type-a");
  const provider = createGraphThinkingModelRuntimeDepsProvider(() => ({
    escapeHtml: marker("escape"),
    graphAiAnalysisPayload: marker("payload"),
    graphRelationTypeLabel: relationTypeLabel,
    graphThemeSelectionKey: marker("theme-key")
  }));

  const first = provider();
  relationTypeLabel = marker("type-b");
  const second = provider();

  assert.notEqual(first, second);
  assert.equal(first.graphRelationTypeLabel.marker, "type-a");
  assert.equal(second.graphRelationTypeLabel.marker, "type-b");
  assert.equal(second.escapeHtml.marker, "escape");
  assert.equal(buildGraphThinkingModelRuntimeDeps({ graphThemeSelectionKey: marker("theme") }).graphThemeSelectionKey.marker, "theme");
});
