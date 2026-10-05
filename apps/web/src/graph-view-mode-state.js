export const GRAPH_RELATION_TYPE_FILTER_KEY = "yansilu:graph:relation-type-filter";
export const GRAPH_DEFAULT_RELATION_TYPE_FILTER = "all";

export const GRAPH_INDEX_RELATION_TYPES = new Set(["belongs_to_topic"]);
export const GRAPH_LINK_CLUE_RELATION_TYPES = new Set(["associated_with", "free_link", "duplicates", "same_topic", "restates"]);
export const GRAPH_RELATION_TYPE_KEYS = [
  "associated_with",
  "free_link",
  "asks",
  "duplicates",
  "belongs_to_topic",
  "supports",
  "complements",
  "contrasts",
  "contradicts",
  "extends",
  "precedes",
  "follows",
  "qualifies",
  "example_of",
  "counterexample_to",
  "same_topic",
  "unexpected_connection",
  "bridges",
  "restates",
  "reframes",
  "appears_in_draft"
];
export const GRAPH_MEANINGFUL_RELATION_TYPES = new Set(
  GRAPH_RELATION_TYPE_KEYS.filter((type) => !GRAPH_INDEX_RELATION_TYPES.has(type) && !GRAPH_LINK_CLUE_RELATION_TYPES.has(type))
);

function defaultEscapeHtml(value = "") {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function graphViewModeForRelationType(value = "") {
  const key = String(value || "meaningful").trim().toLowerCase();
  if (key === "index" || GRAPH_INDEX_RELATION_TYPES.has(key)) return "structure";
  return "argument";
}

export function normalizeGraphRelationTypeFilter(value = "", fallback = GRAPH_DEFAULT_RELATION_TYPE_FILTER) {
  const key = String(value || "").trim().toLowerCase();
  const normalizedFallback = String(fallback || GRAPH_DEFAULT_RELATION_TYPE_FILTER).trim().toLowerCase() || GRAPH_DEFAULT_RELATION_TYPE_FILTER;
  const allowed = new Set(["meaningful", "all", "noisy", "index", ...GRAPH_RELATION_TYPE_KEYS]);
  if (GRAPH_INDEX_RELATION_TYPES.has(key)) return "index";
  return allowed.has(key) ? key : normalizedFallback;
}

export function initialGraphRelationTypeFilter(readStoredText = () => "") {
  return normalizeGraphRelationTypeFilter(readStoredText(GRAPH_RELATION_TYPE_FILTER_KEY, GRAPH_DEFAULT_RELATION_TYPE_FILTER));
}

export function graphReadingModeMeta(value = "argument") {
  const key = String(value || "argument").trim().toLowerCase() === "structure" ? "structure" : "argument";
  if (key === "structure") {
    return {
      key,
      label: "找主题",
      purpose: "看最值得继续整理的一组笔记。",
      filterHint: "当前优先显示主题关系。要找缺口时切到“找缺口”。",
      mapNote: "找主题会突出可能已经能继续写作的笔记组。"
    };
  }
  return {
    key: "argument",
    label: "看结构",
    purpose: "看笔记如何分组，先从中心笔记读起。",
    filterHint: "正文链接与外部关联同等展示，可按关系类型筛选。",
    mapNote: "看结构会突出分组和中心笔记。"
  };
}
export function setGraphRelationTypeFilterForRuntime(graphState = {}, value = "", deps = {}) {
  const next = normalizeGraphRelationTypeFilter(value);
  if (!graphState.filters || typeof graphState.filters !== "object") graphState.filters = {};
  graphState.filters.relationType = next;
  if (deps.persist !== false) {
    const writeStoredText = deps.writeStoredText || (() => {});
    writeStoredText(GRAPH_RELATION_TYPE_FILTER_KEY, next);
  }
  return next;
}

export function graphTaskViewForState(relationType = "meaningful", activeLens = "insight") {
  const mode = graphViewModeForRelationType(relationType);
  const lensKey = String(activeLens || "insight").trim().toLowerCase();
  if (mode === "structure") return "themes";
  if (lensKey === "bridge") return "relations";
  return "structure";
}

export function renderGraphViewModeSwitcher(relationType = "meaningful", activeLens = "insight", deps = {}) {
  if (activeLens && typeof activeLens === "object" && !Array.isArray(activeLens)) {
    deps = activeLens;
    activeLens = "insight";
  }
  const escapeHtml = deps.escapeHtml || defaultEscapeHtml;
  const activeKey = graphTaskViewForState(relationType, activeLens);
  const modes = [
    {
      key: "structure",
      label: "看结构",
      title: "看笔记如何分组，先从中心笔记读起。",
      attr: `data-graph-task-view="structure"`
    },
    {
      key: "relations",
      label: "找缺口",
      title: "检查未关联笔记和已有关系。",
      attr: `data-graph-task-view="relations"`
    },
    {
      key: "themes",
      label: "找主题",
      title: "看最值得继续整理的一组笔记。",
      attr: `data-graph-task-view="themes"`
    }
  ];
  return `
    <div class="graph-view-tabs" aria-label="图谱任务">
      ${modes
        .map((item) => {
          const active = item.key === activeKey;
          return `
            <button class="graph-view-tab${active ? " is-active" : ""}" type="button" ${item.attr} aria-pressed="${active}" title="${escapeHtml(item.title)}">
              <span>${escapeHtml(item.label)}</span>
            </button>
          `;
        })
        .join("")}
    </div>
  `;
}

export function renderGraphRelationTypeFilter(edges = [], selected = GRAPH_DEFAULT_RELATION_TYPE_FILTER, compact = false, statsOverride = null, deps = {}) {
  const escapeHtml = deps.escapeHtml || defaultEscapeHtml;
  const graphFilterOptions = deps.graphFilterOptions || (() => "");
  const graphRelationTypeLabel = deps.graphRelationTypeLabel || ((value) => String(value || "").trim() || "关系");
  return `
    <div class="graph-filters graph-filters-single${compact ? " graph-filters-compact" : ""}" data-graph-filters>
      <label class="graph-filter-label" for="graphRelationTypeFilter">筛选</label>
      <select id="graphRelationTypeFilter" data-graph-filter="relationType" aria-label="筛选关系范围">
        ${graphFilterOptions(edges, "relationType", selected, "全部", graphRelationTypeLabel, statsOverride)}
      </select>
    </div>
  `;
}

export function graphHasMeaningfulStructureEdges(edges = []) {
  return (Array.isArray(edges) ? edges : []).some((edge) =>
    GRAPH_MEANINGFUL_RELATION_TYPES.has(String(edge?.relationType || "associated_with").trim().toLowerCase())
  );
}

export function graphStructureFallbackEdges(edges = [], filters = {}, deps = {}) {
  const graphEdgeMatchesFilters = deps.graphEdgeMatchesFilters || (() => true);
  const baseFilters = { ...filters, relationType: "meaningful" };
  return (Array.isArray(edges) ? edges : []).filter((edge) => graphEdgeMatchesFilters(edge, baseFilters));
}
