export const GRAPH_RELATION_VISUALS = {
  associated_with: { key: "neutral", className: "is-neutral" },
  belongs_to_topic: { key: "index", className: "is-index" },
  duplicates: { key: "neutral", className: "is-neutral" },
  same_topic: { key: "neutral", className: "is-neutral" },
  asks: { key: "bridge", className: "is-bridge" },
  supports: { key: "support", className: "is-support" },
  complements: { key: "support", className: "is-support" },
  extends: { key: "support", className: "is-support" },
  example_of: { key: "support", className: "is-support" },
  follows: { key: "flow", className: "is-flow" },
  precedes: { key: "flow", className: "is-flow" },
  appears_in_draft: { key: "flow", className: "is-flow" },
  contradicts: { key: "conflict", className: "is-conflict" },
  counterexample_to: { key: "conflict", className: "is-conflict" },
  contrasts: { key: "conflict", className: "is-conflict" },
  qualifies: { key: "boundary", className: "is-boundary" },
  bridges: { key: "bridge", className: "is-bridge" },
  unexpected_connection: { key: "bridge", className: "is-bridge" },
  restates: { key: "neutral", className: "is-neutral" },
  reframes: { key: "bridge", className: "is-bridge" }
};

export const GRAPH_RELATION_MARKER_COLORS = {
  index: "#cbd5e1",
  neutral: "#8fa0b3",
  support: "#35b779",
  flow: "#38a3c9",
  conflict: "#ef6f6c",
  boundary: "#d59c2a",
  bridge: "#a88be8"
};

export const GRAPH_RELATION_GROUP_META = {
  support: {
    label: "支持关系",
    shortLabel: "支持",
    detail: "支持、补充、推进或举例说明当前笔记。"
  },
  conflict: {
    label: "反方与张力",
    shortLabel: "反方",
    detail: "反驳、对比或提供反例，提醒这条判断不能单边成立。"
  },
  boundary: {
    label: "适用边界",
    shortLabel: "边界",
    detail: "说明这条笔记在什么条件下成立，或在哪些地方需要限定。"
  },
  bridge: {
    label: "桥接关系",
    shortLabel: "桥接",
    detail: "把当前笔记连到另一个主题、问题或过渡概念。"
  },
  flow: {
    label: "写作顺序",
    shortLabel: "顺序",
    detail: "前提、后续或进入草稿，帮助把笔记排成文章段落。"
  },
  neutral: {
    label: "正文链接",
    shortLabel: "链接",
    detail: "正文里的双链或泛相关关系。它提示可能有关联，但还需要补一句为什么相关。"
  },
  index: {
    label: "主题归属",
    shortLabel: "主题",
    detail: "这条笔记被放入哪个主题或索引结构。"
  }
};

export function graphRelationVisual(type = "") {
  const key = String(type || "associated_with").trim().toLowerCase();
  return GRAPH_RELATION_VISUALS[key] || GRAPH_RELATION_VISUALS.associated_with;
}

export function graphRelationGroupMeta(type = "") {
  const visual = graphRelationVisual(type);
  return {
    ...visual,
    ...(GRAPH_RELATION_GROUP_META[visual.key] || GRAPH_RELATION_GROUP_META.neutral)
  };
}

export function graphEdgeSelectionKey(edge = {}) {
  const id = String(edge?.id || "").trim();
  if (id) return `id:${id}`;
  return [
    "pair",
    String(edge?.fromNoteId || "").trim(),
    String(edge?.toNoteId || "").trim(),
    String(edge?.relationType || "associated_with").trim().toLowerCase(),
    String(edge?.createdBy || "").trim().toLowerCase()
  ].join("::");
}
