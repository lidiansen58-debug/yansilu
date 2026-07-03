function cleanText(value = "") {
  return String(value || "").trim();
}

function graphSelectionNeedsConfirmation(graphState = {}) {
  const selection = graphState?.selection || null;
  const kind = cleanText(selection?.kind);
  if (!selection || !["isolated", "relationForm"].includes(kind)) return false;

  const noteId = cleanText(selection.noteId || selection.sourceNoteId || selection.nodeId);
  const draft = noteId ? graphState?.isolatedRelationDraftByNoteId?.[noteId] : null;
  if (!draft || typeof draft !== "object") return false;

  return Boolean(
    cleanText(draft.rationale) ||
    cleanText(draft.manualRationale) ||
    cleanText(draft.aiRationale) ||
    cleanText(draft.insightQuestion) ||
    cleanText(draft.manualInsightQuestion) ||
    cleanText(draft.aiInsightQuestion) ||
    cleanText(draft.manualSearchText) ||
    cleanText(draft.manualTargetNoteId)
  );
}

function permanentRelationWorkspaceNeedsConfirmation(workspaceState = {}) {
  if (!workspaceState?.open) return false;
  if (workspaceState.dirty !== true) return false;
  return Boolean(
    cleanText(workspaceState.rationale) ||
    cleanText(workspaceState.insightQuestion) ||
    cleanText(workspaceState.manualQuery) ||
    (cleanText(workspaceState.mode) === "manual" && cleanText(workspaceState.selectedTargetNoteId))
  );
}

export function dismissSafeOverlaysForNavigation({
  graphState = {},
  permanentRelationWorkspaceState = {},
  closePermanentRelationWorkspace = () => {},
  closeSystemMessages = () => {},
  isSystemMessageModalOpen = () => false,
  renderGraphPanel = () => {},
  setStatus = () => {},
  confirm = globalThis.confirm
} = {}) {
  let changed = false;
  if (isSystemMessageModalOpen()) {
    closeSystemMessages();
    changed = true;
  }

  if (graphSelectionNeedsConfirmation(graphState)) {
    const ok = typeof confirm === "function"
      ? confirm("当前建联面板里还有未保存的关系理由或输入。要放弃这些未保存输入并切换模块吗？")
      : false;
    if (!ok) {
      setStatus("已保留建联输入，先停在当前图谱面板。", "warn");
      return { ok: false, changed, reason: "graph-unsaved-input" };
    }
  }

  if (permanentRelationWorkspaceNeedsConfirmation(permanentRelationWorkspaceState)) {
    const ok = typeof confirm === "function"
      ? confirm("当前关系工作台里还有未保存的关系理由或输入。要放弃这些未保存输入并切换吗？")
      : false;
    if (!ok) {
      setStatus("已保留关系工作台输入，先停在当前笔记。", "warn");
      return { ok: false, changed, reason: "permanent-relation-unsaved-input" };
    }
  }

  if (permanentRelationWorkspaceState?.open) {
    closePermanentRelationWorkspace();
    changed = true;
  }

  if (graphState?.selection) {
    graphState.selection = null;
    changed = true;
  }
  if (graphState?.workbenchPanelOpen) {
    graphState.workbenchPanelOpen = false;
    changed = true;
  }
  if (graphState?.utilityDrawerOpen) {
    graphState.utilityDrawerOpen = false;
    changed = true;
  }
  if (changed) renderGraphPanel();
  return { ok: true, changed, reason: changed ? "dismissed" : "" };
}

export function dismissSafeOverlaysForEscape(event = null, deps = {}) {
  const result = dismissSafeOverlaysForNavigation(deps);
  if (result.changed || !result.ok) event?.preventDefault?.();
  return result;
}
