function uniqueStrings(items = []) {
  return [...new Set(items.map((item) => String(item || "").trim()).filter(Boolean))];
}

export function candidateGroups(candidatePreview) {
  if (!candidatePreview) return [];
  return [
    { title: "Source", items: candidatePreview.sources || [] },
    { title: "LiteratureNote", items: candidatePreview.literatureNotes || [] },
    { title: "PermanentNote", items: candidatePreview.permanentNotes || [] }
  ].filter((group) => Array.isArray(group.items) && group.items.length);
}

export function candidatePreviewItems(candidatePreview) {
  return candidateGroups(candidatePreview).flatMap((group) =>
    group.items
      .filter((item) => item?.id)
      .map((item) => ({
        ...item,
        candidateGroup: group.title
      }))
  );
}

export function candidatePreviewItemIds(candidatePreview) {
  return candidatePreviewItems(candidatePreview).map((item) => String(item.id));
}

export function normalizePreviewOriginalityPlan(originalityGuard = null) {
  const plan = originalityGuard?.plan || {};
  return {
    allowDraftOnWarning: plan.allowDraftOnWarning !== false,
    blockOnBlocked: plan.blockOnBlocked !== false
  };
}

export function isConfirmableCandidate(item = {}, originalityGuard = null) {
  if (item.candidateGroup !== "PermanentNote") return true;
  const plan = normalizePreviewOriginalityPlan(originalityGuard);
  if (item.originalityStatus === "blocked") return !plan.blockOnBlocked;
  if (item.originalityStatus === "warning") return plan.allowDraftOnWarning;
  return true;
}

export function candidateBadge(item = {}) {
  return item.originalityStatus || item.status || item.sourceType || item.type || "candidate";
}

export function candidateMeta(item = {}) {
  return uniqueStrings([item.id, item.importedFrom, item.locator, item.sourceId]).join(" · ");
}

export function candidateReasonText(reason) {
  const map = {
    core_claim_empty: "核心主张为空",
    similarity_above_warn_threshold: "相似度偏高",
    similarity_above_block_threshold: "相似度阻断",
    citation_locator_missing: "缺少引用定位"
  };
  return map[String(reason || "")] || String(reason || "");
}

export function candidateTone(item = {}) {
  if (item.originalityStatus === "blocked") return "blocked";
  if (item.originalityStatus === "warning") return "warning";
  if (item.originalityStatus === "pass") return "pass";
  return "neutral";
}

export function safeCandidateIds(candidatePreview) {
  return candidatePreviewItems(candidatePreview)
    .filter((item) => item.originalityStatus !== "blocked")
    .map((item) => String(item.id));
}

export function confirmableCandidateIds(candidatePreview, originalityGuard = null) {
  return candidatePreviewItems(candidatePreview)
    .filter((item) => isConfirmableCandidate(item, originalityGuard))
    .map((item) => String(item.id));
}

export function candidateIdsByOriginalityStatus(candidatePreview, originalityStatus) {
  return candidatePreviewItems(candidatePreview)
    .filter((item) => item.originalityStatus === originalityStatus)
    .map((item) => String(item.id));
}

export function riskyCandidateIds(candidatePreview) {
  return candidatePreviewItems(candidatePreview)
    .filter((item) => item.originalityStatus === "warning" || item.originalityStatus === "blocked")
    .map((item) => String(item.id));
}

export function selectionSummary(candidatePreview, selectedIds) {
  const totalIds = candidatePreviewItemIds(candidatePreview);
  const normalizedSelectedIds = selectedIds instanceof Set ? selectedIds : new Set();
  return {
    selectedIds: normalizedSelectedIds,
    selectedCount: totalIds.filter((id) => normalizedSelectedIds.has(id)).length,
    totalCount: totalIds.length,
    excludedCount: totalIds.filter((id) => !normalizedSelectedIds.has(id)).length
  };
}

export function candidateFilterCounts(candidatePreview, selectedIds, originalityGuard = null) {
  const items = candidatePreviewItems(candidatePreview);
  const normalizedSelectedIds = selectedIds instanceof Set ? selectedIds : new Set();
  const safeIds = new Set(safeCandidateIds(candidatePreview));
  const confirmableIds = new Set(confirmableCandidateIds(candidatePreview, originalityGuard));
  return {
    all: items.length,
    confirmable: items.filter((item) => confirmableIds.has(String(item.id))).length,
    safe: items.filter((item) => safeIds.has(String(item.id))).length,
    risky: items.filter((item) => item.originalityStatus === "warning" || item.originalityStatus === "blocked").length,
    excluded: items.filter((item) => !normalizedSelectedIds.has(String(item.id))).length,
    warning: items.filter((item) => item.originalityStatus === "warning").length,
    blocked: items.filter((item) => item.originalityStatus === "blocked").length
  };
}

export function matchesCandidateFilter(item, filter, selectedIds, originalityGuard = null) {
  const candidateId = String(item?.id || "");
  const normalizedSelectedIds = selectedIds instanceof Set ? selectedIds : new Set();
  if (filter === "confirmable") return isConfirmableCandidate(item, originalityGuard);
  if (filter === "safe") return item?.originalityStatus !== "blocked";
  if (filter === "risky") return item?.originalityStatus === "warning" || item?.originalityStatus === "blocked";
  if (filter === "excluded") return !normalizedSelectedIds.has(candidateId);
  if (filter === "warning") return item?.originalityStatus === "warning";
  if (filter === "blocked") return item?.originalityStatus === "blocked";
  return true;
}

export function filterLabel(filter) {
  const labels = {
    all: "全部",
    confirmable: "仅可确认项",
    safe: "仅安全项",
    risky: "仅风险项",
    excluded: "已排除",
    warning: "仅 Warning",
    blocked: "仅 Blocked"
  };
  return labels[filter] || "全部";
}

export function resultFocusLabel(reason) {
  const labels = {
    unselected: "未勾选跳过",
    invalid: "原创性跳过",
    conflicted: "文件冲突跳过"
  };
  return labels[String(reason || "").trim()] || "候选";
}

export function excludedCandidateItems(candidatePreview, selectedIds) {
  const normalizedSelectedIds = selectedIds instanceof Set ? selectedIds : new Set();
  return candidatePreviewItems(candidatePreview).filter((item) => !normalizedSelectedIds.has(String(item.id)));
}

export function confirmSkippedCandidateIds(payload = {}, candidatePreview = null) {
  const empty = { unselected: [], invalid: [], conflicted: [] };
  if (String(payload.stage || "") !== "confirm" || !candidatePreview) return empty;

  const items = candidatePreviewItems(candidatePreview);
  const itemIds = items.map((item) => String(item.id || ""));
  const selectedIds = new Set((Array.isArray(payload.result?.selection?.candidateIds) ? payload.result.selection.candidateIds : []).map((item) => String(item || "").trim()).filter(Boolean));
  const unselected = itemIds.filter((id) => !selectedIds.has(id));

  const evaluationById = new Map(
    (Array.isArray(payload.originalityGuard?.evaluations) ? payload.originalityGuard.evaluations : []).map((item) => [
      String(item?.permanentId || item?.id || ""),
      item
    ])
  );
  const plan = normalizePreviewOriginalityPlan(payload.originalityGuard || null);
  const invalid = items
    .filter((item) => item.candidateGroup === "PermanentNote" && selectedIds.has(String(item.id || "")))
    .filter((item) => {
      const evaluation = evaluationById.get(String(item.id || ""));
      const status = String(evaluation?.status || item.originalityStatus || "");
      return status === "warning" && !plan.allowDraftOnWarning;
    })
    .map((item) => String(item.id || ""));

  const invalidSet = new Set(invalid);
  const createdIds = new Set((Array.isArray(payload.result?.createdFiles) ? payload.result.createdFiles : []).map((item) => String(item?.noteId || "")).filter(Boolean));
  const conflicted = itemIds.filter((id) => selectedIds.has(id) && !invalidSet.has(id) && !createdIds.has(id));

  return {
    unselected,
    invalid,
    conflicted
  };
}

export function confirmSkipReasonMap(payload = {}, candidatePreview = null) {
  if (String(payload.stage || "") !== "confirm" || !candidatePreview) return {};

  const skippedIds = confirmSkippedCandidateIds(payload, candidatePreview);
  const evaluationById = new Map(
    (Array.isArray(payload.originalityGuard?.evaluations) ? payload.originalityGuard.evaluations : []).map((item) => [
      String(item?.permanentId || item?.id || ""),
      item
    ])
  );
  const map = {};

  for (const candidateId of skippedIds.unselected) {
    map[candidateId] = {
      reason: "unselected",
      tone: "neutral",
      message: "未写入原因：确认前取消勾选。"
    };
  }
  for (const candidateId of skippedIds.invalid) {
    const evaluation = evaluationById.get(candidateId);
    const reasons = Array.isArray(evaluation?.reasons) ? evaluation.reasons.map(candidateReasonText).filter(Boolean) : [];
    map[candidateId] = {
      reason: "invalid",
      tone: "warning",
      message: `未写入原因：原创性 warning，当前未允许按 draft 写入。${reasons.length ? ` ${reasons.join("、")}。` : ""}`.trim()
    };
  }
  for (const candidateId of skippedIds.conflicted) {
    map[candidateId] = {
      reason: "conflicted",
      tone: "bad",
      message: "未写入原因：目标路径已有同名文件，系统没有覆盖。"
    };
  }

  return map;
}

export function confirmCreatedPermanentNoteIds(payload = {}) {
  if (String(payload.stage || "") !== "confirm") return [];
  return [
    ...new Set(
      (Array.isArray(payload.result?.createdFiles) ? payload.result.createdFiles : [])
        .filter((item) => String(item?.noteType || "").trim() === "permanent")
        .map((item) => String(item?.noteId || "").trim())
        .filter(Boolean)
    )
  ];
}

export function confirmCreatedLiteratureNoteIds(payload = {}) {
  if (String(payload.stage || "") !== "confirm") return [];
  return [
    ...new Set(
      (Array.isArray(payload.result?.createdFiles) ? payload.result.createdFiles : [])
        .filter((item) => String(item?.noteType || "").trim() === "literature")
        .map((item) => String(item?.noteId || "").trim())
        .filter(Boolean)
    )
  ];
}
