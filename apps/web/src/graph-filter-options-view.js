export function graphFilterOptionsForRuntime(edges, field, selected, allLabel, labelFn, statsOverride = null, deps = {}) {
  const {
    escapeHtml = (value = "") => String(value ?? ""),
    normalizeGraphRelationTypeFilter = (value = "meaningful") => String(value || "meaningful"),
    graphRelationGroupMeta = () => ({ key: "neutral" }),
    GRAPH_RELATION_GROUP_META = { neutral: { label: "其他" } },
    GRAPH_MEANINGFUL_RELATION_TYPES = new Set(),
    GRAPH_INDEX_RELATION_TYPES = new Set(),
    GRAPH_LINK_CLUE_RELATION_TYPES = new Set()
  } = deps;
  const fallbackCounts = edges.reduce((acc, edge) => {
    const fallback = field === "status" ? "confirmed" : "associated_with";
    const key = String(edge?.[field] || fallback).trim().toLowerCase();
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  if (field === "relationType") {
    const counts = statsOverride?.counts && typeof statsOverride.counts === "object" ? statsOverride.counts : fallbackCounts;
    const selectedKey = normalizeGraphRelationTypeFilter(selected, "meaningful");
    const structureFallback = statsOverride?.structureFallback === true;
    const meaningfulCount =
      Number.isFinite(Number(statsOverride?.meaningfulCount))
        ? Number(statsOverride.meaningfulCount)
        : edges.filter((edge) => GRAPH_MEANINGFUL_RELATION_TYPES.has(String(edge?.relationType || "associated_with").trim().toLowerCase())).length;
    const indexCount =
      Number.isFinite(Number(statsOverride?.indexCount))
        ? Number(statsOverride.indexCount)
        : edges.filter((edge) => GRAPH_INDEX_RELATION_TYPES.has(String(edge?.relationType || "associated_with").trim().toLowerCase())).length;
    const noisyCount =
      Number.isFinite(Number(statsOverride?.noisyCount))
        ? Number(statsOverride.noisyCount)
        : edges.filter((edge) => GRAPH_LINK_CLUE_RELATION_TYPES.has(String(edge?.relationType || "associated_with").trim().toLowerCase())).length;
    const totalCount = Number.isFinite(Number(statsOverride?.totalCount)) ? Number(statsOverride.totalCount) : edges.length;
    const leadingOptions = [
      `<option value="meaningful"${selectedKey === "meaningful" ? " selected" : ""}>先看关联 (${meaningfulCount})</option>`,
      `<option value="all"${selectedKey === "all" ? " selected" : ""}>${escapeHtml(allLabel)} (${totalCount})</option>`
    ];
    if (noisyCount > 0) {
      leadingOptions.push(`<option value="noisy"${selectedKey === "noisy" ? " selected" : ""}>只看普通链接 (${noisyCount})</option>`);
    }
    if (indexCount > 0 || structureFallback) {
      const indexLabel = structureFallback && selectedKey === "index" ? "主题分布（自动分组）" : "只看主题归属";
      const indexDisplayCount = structureFallback && selectedKey === "index" ? meaningfulCount || totalCount : indexCount;
      leadingOptions.push(`<option value="index"${selectedKey === "index" ? " selected" : ""}>${escapeHtml(indexLabel)} (${indexDisplayCount})</option>`);
    }
    const selectedTypeHasOption =
      selectedKey === "meaningful" ||
      selectedKey === "all" ||
      (selectedKey === "noisy" && noisyCount > 0) ||
      (selectedKey === "index" && structureFallback) ||
      (selectedKey === "index" && indexCount > 0) ||
      (selectedKey !== "meaningful" &&
        selectedKey !== "all" &&
        selectedKey !== "noisy" &&
        selectedKey !== "index" &&
        Object.prototype.hasOwnProperty.call(counts, selectedKey));
    if (!selectedTypeHasOption && selectedKey) {
      const selectedLabel =
        selectedKey === "noisy"
          ? "只看普通链接"
          : selectedKey === "index"
            ? "只看主题归属"
            : labelFn(selectedKey);
      leadingOptions.push(`<option value="${escapeHtml(selectedKey)}" selected>${escapeHtml(selectedLabel)} (0)</option>`);
    }
    const groupedCounts = new Map();
    for (const [value, count] of Object.entries(counts)) {
      const group = graphRelationGroupMeta(value);
      const key = group.key || "neutral";
      if (!groupedCounts.has(key)) groupedCounts.set(key, []);
      groupedCounts.get(key).push({ value, count, label: labelFn(value), group });
    }
    const groupOrder = ["support", "conflict", "boundary", "bridge", "flow", "neutral", "index"];
    const typedOptions = groupOrder
      .filter((key) => groupedCounts.has(key) && key !== "index")
      .map((key) => {
        const items = groupedCounts
          .get(key)
          .slice()
          .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "zh-Hans-CN"));
        const groupMeta = GRAPH_RELATION_GROUP_META[key] || GRAPH_RELATION_GROUP_META.neutral;
        const groupCount = items.reduce((sum, item) => sum + item.count, 0);
        const options = items
          .map((item) => {
            const selectedAttr = item.value === selectedKey ? " selected" : "";
            return `<option value="${escapeHtml(item.value)}"${selectedAttr}>${escapeHtml(item.label)} (${item.count})</option>`;
          })
          .join("");
        return `<optgroup label="${escapeHtml(`${groupMeta.label} (${groupCount})`)}">${options}</optgroup>`;
      })
      .join("");
    return `${leadingOptions.join("")}${typedOptions}`;
  }
  const options = Object.entries(fallbackCounts)
    .sort((a, b) => b[1] - a[1] || labelFn(a[0]).localeCompare(labelFn(b[0]), "zh-Hans-CN"))
    .map(([value, count]) => {
      const selectedAttr = value === selected ? " selected" : "";
      return `<option value="${escapeHtml(value)}"${selectedAttr}>${escapeHtml(labelFn(value))} (${count})</option>`;
    })
    .join("");
  return `<option value="all"${selected === "all" ? " selected" : ""}>${escapeHtml(allLabel)} (${edges.length})</option>${options}`;
}
