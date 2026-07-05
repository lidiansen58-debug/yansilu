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
      label: "主题有哪些",
      purpose: "看这批笔记主要聚成哪些主题，适合找可写方向。",
      filterHint: "当前只看主题归属。想检查支持、反驳、边界等论证关系时，切回“观点怎么连”。",
      mapNote: "主题视图强调聚集位置。先看哪些主题已经成形，再决定是否保存为主题索引。"
    };
  }
  return {
    key: "argument",
    label: "观点怎么连",
    purpose: "看笔记之间如何支持、反驳、限定或补充，用来检查一个观点是否站得住。",
    filterHint: "当前优先显示观点关系。可以继续按关系类型收窄，只看最需要判断的一类连接。",
    mapNote: "观点关系视图强调论证结构。点击笔记或关系，检查理由是否清楚。"
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
    <div class="graph-view-tabs" aria-label="图谱主要视角">
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
  const graphRelationTypeLabel = deps.graphRelationTypeLabel || ((value) => String(value || "").trim() || "关系");
  return `
    <div class="graph-filters graph-filters-single${compact ? " graph-filters-compact" : ""}" data-graph-filters>
      <select id="graphRelationTypeFilter" data-graph-filter="relationType" aria-label="筛选关系类型">
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
