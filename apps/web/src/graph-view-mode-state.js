export const GRAPH_RELATION_TYPE_FILTER_KEY = "yansilu:graph:relation-type-filter";

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

export function normalizeGraphRelationTypeFilter(value = "", fallback = "meaningful") {
  const key = String(value || "").trim().toLowerCase();
  const normalizedFallback = String(fallback || "meaningful").trim().toLowerCase() || "meaningful";
  const allowed = new Set(["meaningful", "all", "noisy", "index", ...GRAPH_RELATION_TYPE_KEYS]);
  if (GRAPH_INDEX_RELATION_TYPES.has(key)) return "index";
  return allowed.has(key) ? key : normalizedFallback;
}

export function graphReadingModeMeta(value = "argument") {
  const key = String(value || "argument").trim().toLowerCase() === "structure" ? "structure" : "argument";
  if (key === "structure") {
    return {
      key,
      label: "看主题分布",
      purpose: "用来快速看这批笔记大致聚成哪些主题。",
      filterHint: "默认只看主题归属；要回到支持、反驳或边界，切回看观点关系。",
      mapNote: "只保留主题归属和聚集位置。拖动画布，就能快速判断这批笔记主要落在哪些主题。"
    };
  }
  return {
    key: "argument",
    label: "看观点关系",
    purpose: "用来判断这批笔记之间谁支持谁、谁反对谁、哪里需要限定。",
    filterHint: "关系类型还能继续收窄，方便只看当前最重要的一类连接。",
    mapNote: "只保留当前模式最值得看的关系。拖动画布换位置，悬停笔记或关系继续读局部。"
  };
}

export function setGraphRelationTypeFilterForRuntime(graphState = {}, value = "", deps = {}) {
  const next = normalizeGraphRelationTypeFilter(value, "meaningful");
  if (!graphState.filters || typeof graphState.filters !== "object") graphState.filters = {};
  graphState.filters.relationType = next;
  if (deps.persist !== false) {
    const writeStoredText = deps.writeStoredText || (() => {});
    writeStoredText(GRAPH_RELATION_TYPE_FILTER_KEY, next);
  }
  return next;
}

export function renderGraphViewModeSwitcher(relationType = "meaningful", deps = {}) {
  const escapeHtml = deps.escapeHtml || defaultEscapeHtml;
  const mode = graphViewModeForRelationType(relationType);
  const modes = [graphReadingModeMeta("argument"), graphReadingModeMeta("structure")];
  return `
    <div class="graph-view-tabs" aria-label="图谱类型">
      ${modes
        .map((item) => {
          const active = item.key === mode;
          return `
            <button class="graph-view-tab${active ? " is-active" : ""}" type="button" data-graph-view-mode="${escapeHtml(item.key)}" aria-pressed="${active}" title="${escapeHtml(item.purpose)}">
              <span>${escapeHtml(item.label)}</span>
            </button>
          `;
        })
        .join("")}
    </div>
  `;
}

export function renderGraphRelationTypeFilter(edges = [], selected = "meaningful", compact = false, statsOverride = null, deps = {}) {
  const escapeHtml = deps.escapeHtml || defaultEscapeHtml;
  const graphFilterOptions = deps.graphFilterOptions || (() => "");
  const graphRelationTypeLabel = deps.graphRelationTypeLabel || ((value) => String(value || "").trim() || "关联");
  return `
    <div class="graph-filters graph-filters-single${compact ? " graph-filters-compact" : ""}" data-graph-filters>
      <select id="graphRelationTypeFilter" data-graph-filter="relationType" aria-label="关系类型筛选">
        ${graphFilterOptions(edges, "relationType", selected, "全部关系", graphRelationTypeLabel, statsOverride)}
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
