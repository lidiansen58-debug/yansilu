import test from "node:test";
import assert from "node:assert/strict";

import {
  GRAPH_RELATION_TYPE_FILTER_KEY,
  graphHasMeaningfulStructureEdges,
  graphReadingModeMeta,
  graphStructureFallbackEdges,
  graphViewModeForRelationType,
  normalizeGraphRelationTypeFilter,
  renderGraphRelationTypeFilter,
  renderGraphViewModeSwitcher,
  setGraphRelationTypeFilterForRuntime
} from "../../apps/web/src/graph-view-mode-state.js";

test("graph view mode state normalizes relation filters and modes", () => {
  assert.equal(normalizeGraphRelationTypeFilter(" belongs_to_topic "), "index");
  assert.equal(normalizeGraphRelationTypeFilter("supports"), "supports");
  assert.equal(normalizeGraphRelationTypeFilter("bad", "all"), "all");
  assert.equal(graphViewModeForRelationType("index"), "structure");
  assert.equal(graphViewModeForRelationType("belongs_to_topic"), "structure");
  assert.equal(graphViewModeForRelationType("supports"), "argument");
});

test("graph view mode state exposes direct reading mode copy", () => {
  assert.equal(graphReadingModeMeta("structure").label, "找主题");
  assert.match(graphReadingModeMeta("structure").mapNote, /继续写作/);
  assert.equal(graphReadingModeMeta("bad").key, "argument");
  assert.match(graphReadingModeMeta("argument").purpose, /中心笔记/);
  assert.equal(graphReadingModeMeta("argument").label, "看结构");
});

test("graph relation type setter updates graph state and persists when allowed", () => {
  const graphState = { filters: {} };
  const writes = [];
  const writeStoredText = (key, value) => writes.push([key, value]);

  assert.equal(setGraphRelationTypeFilterForRuntime(graphState, "belongs_to_topic", { writeStoredText }), "index");
  assert.equal(graphState.filters.relationType, "index");
  assert.deepEqual(writes.at(-1), [GRAPH_RELATION_TYPE_FILTER_KEY, "index"]);

  assert.equal(setGraphRelationTypeFilterForRuntime(graphState, "supports", { writeStoredText, persist: false }), "supports");
  assert.equal(graphState.filters.relationType, "supports");
  assert.equal(writes.length, 1);
});

test("graph view mode render helpers use injected escaping and filter options", () => {
  const switcher = renderGraphViewModeSwitcher("index");
  assert.doesNotMatch(switcher, /看图/);
  assert.match(switcher, /data-graph-task-view="themes" aria-pressed="true"/);
  assert.match(renderGraphViewModeSwitcher("meaningful", "bridge"), /data-graph-task-view="relations" aria-pressed="true"/);
  assert.match(renderGraphViewModeSwitcher("meaningful", "argument"), /data-graph-task-view="structure" aria-pressed="true"/);
  assert.doesNotMatch(switcher, /data-graph-view-mode=/);
  assert.doesNotMatch(switcher, /data-graph-reading-lens=/);

  const filter = renderGraphRelationTypeFilter([{ relationType: "supports" }], "supports", true, { supports: 1 }, {
    graphFilterOptions: (edges, field, selected, allLabel, labelFn, stats) =>
      `<option>${edges.length}:${field}:${selected}:${allLabel}:${labelFn("supports")}:${stats.supports}</option>`,
    graphRelationTypeLabel: () => "支持"
  });
  assert.match(filter, /graph-filters-compact/);
  assert.match(filter, /筛选/);
  assert.match(filter, /1:relationType:supports:全部:支持:1/);
});

test("graph view mode state detects meaningful structure and filters fallback edges", () => {
  const edges = [
    { id: "index", relationType: "belongs_to_topic" },
    { id: "support", relationType: "supports" },
    { id: "link", relationType: "associated_with" }
  ];

  assert.equal(graphHasMeaningfulStructureEdges(edges), true);
  assert.deepEqual(
    graphStructureFallbackEdges(edges, { relationType: "index" }, {
      graphEdgeMatchesFilters: (edge, filters) => filters.relationType === "meaningful" && edge.relationType === "supports"
    }),
    [{ id: "support", relationType: "supports" }]
  );
});
