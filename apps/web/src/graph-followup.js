export const GRAPH_FOLLOWUP_ACTIONS = {
  relations: "relations",
  bridge: "bridge",
  tension: "tension",
  boundary: "boundary",
  writing: "writing"
};

const GRAPH_TENSION_RELATION_TYPES = new Set(["contradicts", "counterexample_to", "contrasts"]);
const GRAPH_BOUNDARY_RELATION_TYPES = new Set(["qualifies"]);

export function graphFollowupActionForRelationType(type = "") {
  const relationType = String(type || "").trim().toLowerCase();
  if (GRAPH_BOUNDARY_RELATION_TYPES.has(relationType)) return GRAPH_FOLLOWUP_ACTIONS.boundary;
  if (GRAPH_TENSION_RELATION_TYPES.has(relationType)) return GRAPH_FOLLOWUP_ACTIONS.tension;
  if (relationType === "bridges" || relationType === "unexpected_connection" || relationType === "reframes") {
    return GRAPH_FOLLOWUP_ACTIONS.bridge;
  }
  return GRAPH_FOLLOWUP_ACTIONS.relations;
}

export function graphNextActionForSummary({
  hasNodes = false,
  hasEdges = false,
  firstNodeId = "",
  visibleNodeCount = 0,
  visibleEdgeCount = 0,
  isolatedNoteId = "",
  isolatedCount = 0,
  thinRationaleFromNoteId = "",
  thinRationaleCount = 0,
  untypedFromNoteId = "",
  untypedRelationId = "",
  conflictFromNoteId = "",
  conflictRelationType = "",
  bridgeNoteId = "",
  bridgeTargetNoteId = "",
  writingContinuation = null,
  writingEntryPlan = null
} = {}) {
  if (!hasNodes) {
    return {
      title: "先写出几条永久笔记",
      note: "当前目录还没有节点。先回到编辑器建立笔记，再用 [[关联笔记]] 串起观点。"
    };
  }

  if (!hasEdges) {
    return {
      title: "下一步：关联第一条笔记",
      note: "先把两条最相关的永久笔记建立成第一条正式关联，再刷新图谱查看局部结构。",
      noteId: String(firstNodeId || "").trim(),
      action: GRAPH_FOLLOWUP_ACTIONS.relations,
      actionLabel: "去关联笔记"
    };
  }

  if (isolatedNoteId) {
    return {
      title: "先处理孤立观点",
      note: `当前还有 ${Number(isolatedCount || 1)} 条永久笔记没有进入关系网络。先补起最关键的一条连接，或明确它为什么暂时不进网络，再决定下一步写作会更稳。`,
      noteId: String(isolatedNoteId || "").trim(),
      action: GRAPH_FOLLOWUP_ACTIONS.relations,
      actionLabel: "先补孤立观点"
    };
  }

  if (thinRationaleFromNoteId) {
    return {
      title: "先补关系理由",
      note: `当前已经有 ${Number(thinRationaleCount || 1)} 条显式关系，但理由和问题还不够清楚。先把最关键的关系补得更牢靠，再决定下一步写作会更稳。`,
      noteId: String(thinRationaleFromNoteId || "").trim(),
      action: GRAPH_FOLLOWUP_ACTIONS.relations,
      actionLabel: "先补关系理由"
    };
  }

    if (untypedFromNoteId) {
      return {
        title: "补关系理由",
        note: "优先打开关系整理队列里的源笔记，把“为什么相关”写清楚。",
        noteId: String(untypedFromNoteId || "").trim(),
        action: untypedRelationId ? "relations-edit" : GRAPH_FOLLOWUP_ACTIONS.relations,
        actionLabel: "去补关系理由",
        relationId: String(untypedRelationId || "").trim()
      };
    }

  if (conflictFromNoteId) {
    if (graphFollowupActionForRelationType(conflictRelationType) === GRAPH_FOLLOWUP_ACTIONS.boundary) {
      return {
        title: "先补边界",
        note: "当前已经出现限定/适用条件一类关系。先把这条判断在哪些条件下成立、在哪些条件下不成立写清，再继续推进图谱或写作。",
        noteId: String(conflictFromNoteId || "").trim(),
        action: GRAPH_FOLLOWUP_ACTIONS.boundary,
        actionLabel: "去补边界"
      };
    }
    return {
      title: "下一步：处理张力",
      note: "已经有冲突或反例信号。补反方、边界和例外条件后，写作时会更稳。",
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

  if (writingContinuation?.projectId) {
    return {
      title: `下一步：${writingContinuation.status}`,
      note: writingContinuation.hint,
      action: GRAPH_FOLLOWUP_ACTIONS.writing,
      actionLabel: writingContinuation.actionLabel
    };
  }

  if (writingEntryPlan?.mode === "already-in-basket") {
    return {
      title: "下一步：继续当前写作篮",
      note: "当前可见图谱里的永久笔记已经都在写作篮中。直接继续当前写作篮推进，会比重复挑选更顺。",
      action: GRAPH_FOLLOWUP_ACTIONS.writing,
      actionLabel: "继续当前写作篮"
    };
  }

  if (writingEntryPlan?.mode === "no-candidates" && writingEntryPlan.hasBasket) {
    return {
      title: "下一步：继续当前写作篮",
      note: "当前图谱切片里暂时没有适合新增到写作篮的永久笔记。直接继续当前写作篮，或先回到图谱补关系和边界，会比重复挑选更顺。",
      action: GRAPH_FOLLOWUP_ACTIONS.writing,
      actionLabel: "继续当前写作篮"
    };
  }

  if (writingEntryPlan?.mode === "no-candidates") {
    return {
      title: "下一步：先补关系和边界",
      note: "当前图谱切片里还没有可直接推进写作的永久笔记。先补关系、边界或完成原创性检查，再决定下一步写作会更顺。",
      noteId: String(firstNodeId || "").trim(),
      action: GRAPH_FOLLOWUP_ACTIONS.relations,
      actionLabel: "先补关系/边界"
    };
  }

  if (writingEntryPlan?.mode === "prefill-visible" && Number(writingEntryPlan.addedCount || 0) > 0) {
    return {
      title: `下一步：带入 ${Number(writingEntryPlan.addedCount || 0)} 条永久笔记`,
      note: writingEntryPlan.hasBasket
        ? `当前图谱切片里还有 ${Number(writingEntryPlan.addedCount || 0)} 条可直接推进写作的永久笔记。继续当前写作篮时会一起加入。`
        : `当前图谱切片里有 ${Number(writingEntryPlan.addedCount || 0)} 条可直接推进写作的永久笔记。这些笔记会一起带入写作篮。`,
      action: GRAPH_FOLLOWUP_ACTIONS.writing,
      actionLabel: "带入写作篮"
    };
  }

  if (writingEntryPlan?.mode === "pick-manually" && Number(writingEntryPlan.candidateCount || 0) > 0) {
    return {
      title: "下一步：先挑 2-5 条加入写作篮",
      note: `当前可见图谱里有 ${Number(writingEntryPlan.candidateCount || 0)} 条可用永久笔记。先挑 2-5 条加入写作篮，再推进成主题或项目会更稳。`,
      action: GRAPH_FOLLOWUP_ACTIONS.writing,
      actionLabel: "先挑 2-5 条"
    };
  }

  if (Number(visibleNodeCount || 0) >= 3 && Number(visibleEdgeCount || 0) <= 1) {
    return {
      title: "下一步：先补关键关系",
      note: "当前切片里已经不止两条永久笔记，但显式关系还太少。先补出 1-2 条最关键的关系，再决定下一步写作会更稳。",
      noteId: String(firstNodeId || "").trim(),
      action: GRAPH_FOLLOWUP_ACTIONS.relations,
      actionLabel: "先补关键关系"
    };
  }

  return {
    title: "下一步：进入写作中心",
    note: "当前目录结构已经比较清晰，可以把这组永久笔记带进写作中心，继续推进成主题或项目。",
    action: GRAPH_FOLLOWUP_ACTIONS.writing,
    actionLabel: "进入写作中心"
  };
}

export function graphWritingFollowupEntryPlan({
  basketNoteIds = [],
  candidateNoteIds = [],
  scopeNoteIds = []
} = {}) {
  const basketIds = [...new Set((basketNoteIds || []).map((id) => String(id || "").trim()).filter(Boolean))];
  const candidateIds = [...new Set((candidateNoteIds || []).map((id) => String(id || "").trim()).filter(Boolean))];
  const scopeIds = [...new Set((scopeNoteIds || []).map((id) => String(id || "").trim()).filter(Boolean))];
  const addedCandidateIds = candidateIds.filter((id) => !basketIds.includes(id));

  if (!candidateIds.length) {
    return {
      mode: "no-candidates",
      candidateCount: 0,
      addedCount: 0,
      hasBasket: basketIds.length > 0,
      prefillNoteIds: [],
      statusMessage: scopeIds.length
        ? basketIds.length
          ? "当前图谱切片里还没有适合新增到写作篮的永久笔记。继续当前写作篮，或回到图谱补关系/边界。"
          : "当前图谱切片里还没有可直接推进写作的永久笔记，先补关系、边界或完成原创性检查会更顺。"
        : basketIds.length
          ? "当前可见图谱里的永久笔记已经都在写作篮中，继续当前写作篮推进。"
          : "当前可见图谱里还没有可直接推进写作的永久笔记，先补关系、边界或完成原创性检查会更顺。"
    };
  }

  if (candidateIds.length <= 5 && addedCandidateIds.length) {
    return {
      mode: "prefill-visible",
      candidateCount: candidateIds.length,
      addedCount: addedCandidateIds.length,
      hasBasket: basketIds.length > 0,
      prefillNoteIds: addedCandidateIds,
      statusMessage: basketIds.length
        ? `已把当前可见图谱里的 ${addedCandidateIds.length} 条永久笔记加入写作篮，继续当前写作篮推进。`
        : `已把当前可见图谱里的 ${addedCandidateIds.length} 条永久笔记带入写作篮。`
    };
  }

  if (basketIds.length && !addedCandidateIds.length) {
    return {
      mode: "already-in-basket",
      candidateCount: candidateIds.length,
      addedCount: 0,
      hasBasket: true,
      prefillNoteIds: [],
      statusMessage: "当前可见图谱里的永久笔记已经都在写作篮中，继续当前写作篮推进。"
    };
  }

  return {
    mode: "pick-manually",
    candidateCount: candidateIds.length,
    addedCount: addedCandidateIds.length,
    hasBasket: basketIds.length > 0,
    prefillNoteIds: [],
    statusMessage: `当前可见图谱里有 ${candidateIds.length} 条可用永久笔记，先挑 2-5 条加入写作篮。`
  };
}

export function graphWritingCandidateNoteIds(visibleNodeIds = [], { noteLookup = () => null, isEligible = () => false } = {}) {
  return [...new Set((visibleNodeIds || []).map((id) => String(id || "").trim()).filter(Boolean))].filter((id) => {
    const note = noteLookup(id);
    return Boolean(note) && Boolean(isEligible(note));
  });
}

export function graphIsolatedNodeIds(nodes = [], edges = [], { filterActive = false } = {}) {
  if (filterActive) return [];
  const nodeIds = [...new Set((nodes || []).map((node) => String(node?.id || "").trim()).filter(Boolean))];
  const linkedNodeIds = new Set(
    (edges || []).flatMap((edge) => [edge?.fromNoteId, edge?.toNoteId].map((id) => String(id || "").trim()).filter(Boolean))
  );
  return nodeIds.filter((id) => !linkedNodeIds.has(id));
}
