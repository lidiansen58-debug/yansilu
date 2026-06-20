export function candidatePreviewFromPayload(payload = {}) {
  return payload.candidatePreview || payload.importRecord?.candidatePreview || null;
}

export function candidateSelectionFromPayload(payload = {}) {
  return payload.candidateSelection || payload.importRecord?.candidateSelection || null;
}

export function candidateSelectionIds(candidateSelection = null) {
  if (!candidateSelection || typeof candidateSelection !== "object") return [];
  return [
    ...(Array.isArray(candidateSelection.sources) ? candidateSelection.sources : []),
    ...(Array.isArray(candidateSelection.literatureNotes) ? candidateSelection.literatureNotes : []),
    ...(Array.isArray(candidateSelection.permanentNotes) ? candidateSelection.permanentNotes : [])
  ].map((item) => String(item || "").trim()).filter(Boolean);
}

export function candidateIdsForSelection(candidatePreview, candidateSelection = null, { candidatePreviewItemIds = () => [] } = {}) {
  const ids = candidateSelectionIds(candidateSelection);
  return ids.length ? [...new Set(ids)] : candidatePreviewItemIds(candidatePreview);
}

export function defaultSelectedCandidateIds(
  candidatePreview,
  candidateSelection = null,
  originalityGuard = null,
  { selectedCandidateIdsForImportAction }
 = {}) {
  return selectedCandidateIdsForImportAction({
    action: "confirmable",
    candidatePreview,
    candidateSelection,
    originalityGuard,
    visibleOnly: true
  });
}

export function syncImportSelectionState(
  importState,
  importRecordId,
  candidatePreview,
  candidateSelection = null,
  { preserve = false, selectedIds = null } = {},
  deps = {}
) {
  const cleanRecordId = String(importRecordId || "").trim();
  const candidateIds = candidateIdsForSelection(candidatePreview, candidateSelection, deps);
  const selected = new Set();
  if (selectedIds instanceof Set) {
    for (const id of candidateIds) {
      if (selectedIds.has(id)) selected.add(id);
    }
  } else if (preserve && importState.selectionImportRecordId === cleanRecordId) {
    for (const id of candidateIds) {
      if (importState.selectedCandidateIds.has(id)) selected.add(id);
    }
  } else {
    for (const id of candidateIds) selected.add(id);
  }
  importState.selectionImportRecordId = cleanRecordId;
  importState.selectedCandidateIds = selected;
}

export function selectedCandidateIdsForImportState(
  importState,
  candidatePreview,
  candidateSelection,
  importRecordId,
  selection = null,
  deps = {}
) {
  if (selection && Array.isArray(selection.candidateIds)) {
    return new Set(selection.candidateIds.map((item) => String(item || "").trim()).filter(Boolean));
  }
  if (importState.selectionImportRecordId === String(importRecordId || "").trim()) {
    return new Set(importState.selectedCandidateIds);
  }
  return new Set(candidateIdsForSelection(candidatePreview, candidateSelection, deps));
}

export function selectionSummaryForImportState(
  importState,
  candidatePreview,
  importRecordId,
  selection = null,
  candidateSelection = null,
  { candidatePreviewItemIds = () => [], summarizeCandidateSelection = () => ({}) } = {}
) {
  const selectedIds = selectedCandidateIdsForImportState(
    importState,
    candidatePreview,
    candidateSelection,
    importRecordId,
    selection,
    { candidatePreviewItemIds }
  );
  const visibleSummary = summarizeCandidateSelection(candidatePreview, new Set(
    candidatePreviewItemIds(candidatePreview).filter((id) => selectedIds.has(id))
  ));
  if (selection && Number.isFinite(Number(selection.totalCandidates))) {
    const selectedCount = Number.isFinite(Number(selection.selectedCandidates)) ? Number(selection.selectedCandidates) : selectedIds.size;
    const totalCount = Number(selection.totalCandidates);
    return {
      ...visibleSummary,
      selectedIds,
      selectedCount,
      totalCount,
      excludedCount: Math.max(0, totalCount - selectedCount)
    };
  }
  const totalIds = candidateIdsForSelection(candidatePreview, candidateSelection, { candidatePreviewItemIds });
  const selectedCount = totalIds.filter((id) => selectedIds.has(id)).length;
  return {
    ...visibleSummary,
    selectedIds,
    selectedCount,
    totalCount: totalIds.length,
    excludedCount: Math.max(0, totalIds.length - selectedCount)
  };
}

export function renderImportWritingActions(payload = {}, { literatureBatchSummaryForPayload } = {}) {
  const permanentNoteIds = createdNoteIdsByTypeFromImportPayload(payload, "permanent");
  const literatureNoteIds = createdNoteIdsByTypeFromImportPayload(payload, "literature");
  const literatureBatchSummary = literatureBatchSummaryForPayload?.(payload) || null;
  if (!permanentNoteIds.length && !literatureNoteIds.length) return "";
  return `
    <div class="result-actions-inline">
      ${
        literatureNoteIds.length
          ? `
      ${
        literatureBatchSummary
          ? `
      <div class="result-metrics">
        <div class="result-metric"><span>待转述</span><strong>${literatureBatchSummary.pending}</strong></div>
        <div class="result-metric"><span>待提炼</span><strong>${literatureBatchSummary.refine}</strong></div>
        <div class="result-metric"><span>可转永久笔记</span><strong>${literatureBatchSummary.ready}</strong></div>
      </div>
      `
          : ""
      }
      <button class="mini-btn" type="button" data-import-writing-action="open-literature-queue">
        处理待转述队列 ${literatureNoteIds.length}
      </button>
      <div class="toolbar-note">${
        literatureBatchSummary
          ? `本批次预测：已完成转述 ${literatureBatchSummary.paraphraseDone}/${literatureBatchSummary.total}，剩余待处理 ${literatureBatchSummary.remaining} 条。`
          : `这 ${literatureNoteIds.length} 条文献笔记会先进入待转述队列，并默认只显示本次导入范围。`
      }</div>
      `
          : ""
      }
      ${
        permanentNoteIds.length
          ? `
      <button class="mini-btn" type="button" data-import-writing-action="add-permanent-notes">
        加入写作篮 ${permanentNoteIds.length}
      </button>
      <button class="mini-btn" type="button" data-import-writing-action="add-permanent-notes-open-writing">
        加入并打开写作中心
      </button>
      <button class="mini-btn" type="button" data-import-writing-action="create-writing-project">
        直接创建项目
      </button>
      <div class="toolbar-note">把本次新写入的 PermanentNote 直接送进写作中心。</div>
      `
          : ""
      }
    </div>
  `;
}

export function createdFilesFromImportPayload(payload = {}) {
  const stage = String(payload?.stage || "").trim();
  if (stage === "confirm") return Array.isArray(payload?.result?.createdFiles) ? payload.result.createdFiles : [];
  if (stage === "record") return Array.isArray(payload?.importRecord?.confirmResult?.createdFiles) ? payload.importRecord.confirmResult.createdFiles : [];
  return [];
}

export function createdNoteIdsByTypeFromImportPayload(payload = {}, noteType = "") {
  const normalizedType = String(noteType || "").trim();
  if (!normalizedType) return [];
  return [
    ...new Set(
      createdFilesFromImportPayload(payload)
        .filter((item) => String(item?.noteType || "").trim() === normalizedType)
        .map((item) => String(item?.noteId || "").trim())
        .filter(Boolean)
    )
  ];
}

export function createdNoteIdsByTypeFromImportRecord(record = {}, noteType = "") {
  const normalizedType = String(noteType || "").trim();
  if (!normalizedType) return [];
  return [
    ...new Set(
      (Array.isArray(record?.confirmResult?.createdFiles) ? record.confirmResult.createdFiles : [])
        .filter((item) => String(item?.noteType || "").trim() === normalizedType)
        .map((item) => String(item?.noteId || "").trim())
        .filter(Boolean)
    )
  ];
}

export function importPayloadRecordId(payload = {}) {
  return String(payload?.importRecordId || payload?.importRecord?.importRecordId || "").trim();
}

export function summarizeLiteratureBatchFromNotes(notes = [], { rankedLiteratureQueueNotes = (items) => items } = {}) {
  let pending = 0;
  let refine = 0;
  let ready = 0;
  const ranked = rankedLiteratureQueueNotes(notes);
  for (const item of ranked) {
    if (item.lane === "pending") pending += 1;
    else if (item.lane === "refine") refine += 1;
    else ready += 1;
  }
  const total = notes.length;
  const nextPending = ranked.find((item) => item.lane === "pending") || ranked.find((item) => item.lane === "refine") || null;
  const nextReady = ranked.find((item) => item.lane === "ready") || null;
  return {
    total,
    pending,
    refine,
    ready,
    paraphraseDone: total - pending,
    remaining: pending + refine,
    nextPendingNoteId: nextPending?.note?.id || "",
    nextPendingTitle: nextPending?.note?.title || nextPending?.note?.id || "",
    nextPendingLane: nextPending?.lane || "",
    nextReadyNoteId: nextReady?.note?.id || "",
    nextReadyTitle: nextReady?.note?.title || nextReady?.note?.id || ""
  };
}

export function literatureBatchSummaryForPayload(payload = {}, summary = null) {
  if (!summary) return null;
  const recordId = importPayloadRecordId(payload);
  const noteIds = createdNoteIdsByTypeFromImportPayload(payload, "literature");
  const key = `${recordId}|${noteIds.join(",")}`;
  return summary.key === key ? summary : null;
}

export function renderWritingResultDetails(data = {}, { escapeHtml = String } = {}) {
  const stage = String(data.stage || "");
  if (stage === "writing_project") {
    const notes = Array.isArray(data.basketNotes) ? data.basketNotes : [];
    return `
      <div class="writing-preview">
        <h4>写作篮快照</h4>
        ${
          notes.length
            ? `<ul>${notes
                .map((note) => `<li><strong>${escapeHtml(note.title || note.id)}</strong> ${escapeHtml(note.id || "")}</li>`)
                .join("")}</ul>`
            : `<div class="writing-empty">当前返回里没有篮子明细。</div>`
        }
      </div>
    `;
  }

  if (stage === "draft_scaffold") {
    const sections = Array.isArray(data.sections) ? data.sections : [];
    const markdown = String(data.markdown || "").trim();
    return `
      <div class="writing-preview">
        <h4>草稿骨架快照</h4>
        <div class="toolbar-note">这里只组织结构、证据与开放问题，不直接替你完成终稿。</div>
        ${
          sections.length
            ? `<ol>${sections
                .map((section) => `<li><strong>${escapeHtml(section.heading || `Section ${section.order || ""}`)}</strong> ${escapeHtml(section.purpose || "")}</li>`)
                .join("")}</ol>`
            : `<div class="writing-empty">当前返回里没有章节结构。</div>`
        }
        ${markdown ? `<pre>${escapeHtml(markdown)}</pre>` : ""}
      </div>
    `;
  }

  if (stage === "writing_draft_note") {
    return `
      <div class="writing-preview">
        <h4>草稿已落成笔记</h4>
        <ul>
          <li><strong>Note ID</strong> ${escapeHtml(data.noteId || "")}</li>
          <li><strong>目录</strong> ${escapeHtml(data.directoryId || "")}</li>
          <li><strong>标题</strong> ${escapeHtml(data.title || "")}</li>
        </ul>
      </div>
    `;
  }

  return "";
}
