import test from "node:test";
import assert from "node:assert/strict";

import {
  GRAPH_RELATION_TYPE_FILTER_KEY,
  GRAPH_DEFAULT_RELATION_TYPE_FILTER,
  initialGraphRelationTypeFilter,
  graphHasMeaningfulStructureEdges,
  graphReadingModeMeta,
  graphStructureFallbackEdges,
  graphViewModeForRelationType,
  normalizeGraphRelationTypeFilter,
  renderGraphRelationTypeFilter,
  renderGraphViewModeSwitcher,
  setGraphRelationTypeFilterForRuntime
} from "../../apps/web/src/graph-view-mode-state.js";
import { graphFilterOptionsForRuntime } from "../../apps/web/src/graph-filter-options-view.js";
import { GRAPH_MEANINGFUL_RELATION_TYPES, GRAPH_LINK_CLUE_RELATION_TYPES, GRAPH_INDEX_RELATION_TYPES } from "../../apps/web/src/graph-view-mode-state.js";

test("graph starts with all relations and preserves an explicit saved filter", () => {
  assert.equal(GRAPH_DEFAULT_RELATION_TYPE_FILTER, "all");
  assert.equal(initialGraphRelationTypeFilter(), "all");
  for (const filter of ["meaningful", "noisy", "index", "supports", "all"]) {
    assert.equal(initialGraphRelationTypeFilter((key) => {
      assert.equal(key, GRAPH_RELATION_TYPE_FILTER_KEY);
      return filter;
    }), filter);
  }
  assert.equal(initialGraphRelationTypeFilter(() => "obsolete"), "all");
  assert.equal(normalizeGraphRelationTypeFilter(), "all");
});

test("filter counts classify relation types, not body-link versus external origin", () => {
  const edges = [
    { relationType: "associated_with", source: "markdown_wikilink" },
    { relationType: "associated_with", source: "manual" },
    { relationType: "supports", source: "manual" }
  ];
  const options = graphFilterOptionsForRuntime(edges, "relationType", "", "全部", type => type, null, {
    normalizeGraphRelationTypeFilter, GRAPH_MEANINGFUL_RELATION_TYPES, GRAPH_LINK_CLUE_RELATION_TYPES, GRAPH_INDEX_RELATION_TYPES
  });
  assert.match(options, /^<option value="all" selected>全部 \(3\)/);
  assert.match(options, /相关、引用等 \(2\)/);
  assert.match(options, /支持、反驳等 \(1\)/);
  assert.doesNotMatch(options, /正文链接|主要关系/);
  const filter = renderGraphRelationTypeFilter(undefined, undefined, false, null, {
    graphFilterOptions: (_edges, _field, selected) => `<option>${selected}</option>`
  });
  assert.match(filter, /<option>all<\/option>/);
});

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
