export const GRAPH_FOLLOWUP_ACTIONS = {
  relations: "relations",
  bridge: "bridge",
  tension: "tension",
  boundary: "boundary"
};

const GRAPH_CONFLICT_RELATION_TYPES = new Set(["contradicts", "counterexample_to", "contrasts", "qualifies"]);

export function graphFollowupActionForRelationType(type = "") {
  const relationType = String(type || "").trim().toLowerCase();
  if (GRAPH_CONFLICT_RELATION_TYPES.has(relationType)) return GRAPH_FOLLOWUP_ACTIONS.tension;
  if (relationType === "bridges") return GRAPH_FOLLOWUP_ACTIONS.bridge;
  return GRAPH_FOLLOWUP_ACTIONS.relations;
}

export function graphNextActionForSummary({
  hasNodes = false,
  hasEdges = false,
  firstNodeId = "",
  untypedFromNoteId = "",
  untypedRelationId = "",
  conflictFromNoteId = "",
  bridgeNoteId = "",
  bridgeTargetNoteId = ""
} = {}) {
  if (!hasNodes) {
    return {
      title: "先写出几条永久笔记",
      note: "当前目录还没有节点。先回到编辑器建立笔记，再用 [[关联笔记]] 串起观点。"
    };
  }
  if (!hasEdges) {
    return {
      title: "下一步：建立第一条关系",
      note: "在两条相关笔记之间加入 [[关联笔记]]，再刷新图谱查看局部结构。",
      noteId: String(firstNodeId || "").trim(),
      action: GRAPH_FOLLOWUP_ACTIONS.relations,
      actionLabel: "去补关系"
    };
  }
  if (untypedFromNoteId) {
    return {
      title: "下一步：补关系理由",
      note: "优先打开关系整理队列里的源笔记，把“为什么相连”写清楚。",
      noteId: String(untypedFromNoteId || "").trim(),
      action: untypedRelationId ? "relations-edit" : GRAPH_FOLLOWUP_ACTIONS.relations,
      actionLabel: "去补关系",
      relationId: String(untypedRelationId || "").trim()
    };
  }
  if (conflictFromNoteId) {
    return {
      title: "下一步：处理张力",
      note: "已经有冲突或重名信号。补反方、边界和例外条件后，写作时更稳。",
      noteId: String(conflictFromNoteId || "").trim(),
      action: GRAPH_FOLLOWUP_ACTIONS.tension,
      actionLabel: "去补反例/边界"
    };
  }
  if (bridgeNoteId) {
    return {
      title: "下一步：补桥接",
      note: "当前结构已经有局部中心，但桥接缺口还会让读者断在半路。优先补过渡关系。",
      noteId: String(bridgeNoteId || "").trim(),
      action: GRAPH_FOLLOWUP_ACTIONS.bridge,
      actionLabel: "去补桥接",
      targetNoteId: String(bridgeTargetNoteId || "").trim(),
      relationType: "bridges"
    };
  }
  return {
    title: "下一步：进入写作中心",
    note: "当前目录结构已经比较清楚，可以挑选永久笔记放入写作篮。"
  };
}
