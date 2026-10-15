function cleanText(value = "") {
  return String(value || "").trim();
}

const pendingDismissals = new WeakMap();

function overlaySnapshot(graphState, workspace) {
  const selection = graphState.selection;
  const id = selection?.noteId || selection?.sourceNoteId || selection?.nodeId;
  const draft = graphState.isolatedRelationDraftByNoteId?.[id] || {};
  return JSON.stringify([
    selection, graphState.workbenchPanelOpen, graphState.utilityDrawerOpen,
    ...["rationale", "manualRationale", "aiRationale", "insightQuestion", "manualInsightQuestion", "aiInsightQuestion",
      "manualSearchText", "manualTargetNoteId", "relationType", "manualRelationType"].map(key => draft[key]),
    ...["open", "dirty", "mode", "noteId", "sourceNoteId", "relationComposerSessionId", "editingRelationId", "relationType",
      "selectedTargetNoteId", "rationale", "insightQuestion", "manualQuery", "saveState"].map(key => workspace?.[key])
  ]);
}

function graphSelectionNeedsConfirmation(graphState = {}) {
  const selection = graphState?.selection || null;
  const kind = cleanText(selection?.kind);
  if (!selection || kind !== "isolated") return false;

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

export async function dismissSafeOverlaysForNavigation({
  state = {},
  getVaultPath = () => "",
  isCurrentNavigation = () => true,
  intent = "navigate",
  graphState = {},
  permanentRelationWorkspaceState = {},
  getPermanentRelationWorkspaceState = () => permanentRelationWorkspaceState,
  closePermanentRelationWorkspace = () => {},
  closeSystemMessages = () => {},
  isSystemMessageModalOpen = () => false,
  renderGraphPanel = () => {},
  setStatus = () => {},
  confirm = globalThis.confirm
} = {}) {
  const scope = state.noteMoveVaultScope, vaultPath = getVaultPath(), module = state.module, activeTabId = state.activeTabId;
  const systemModalOpen = isSystemMessageModalOpen();
  const before = overlaySnapshot(graphState, getPermanentRelationWorkspaceState());
  const isCurrentContext = () => state.noteMoveVaultScope === scope && getVaultPath() === vaultPath
    && state.module === module && state.activeTabId === activeTabId
    && !state.noteMoveVaultSwitching && !state.noteMoveVaultUncertain
    && isSystemMessageModalOpen() === systemModalOpen
    && overlaySnapshot(graphState, getPermanentRelationWorkspaceState()) === before;
  const blocked = reason => ({ ok: false, changed: false, reason });
  const pending = pendingDismissals.get(graphState);
  if (pending) {
    if (intent === "navigate" && pending.intent === "navigate" && pending.isCurrentContext() && pending.promise) {
      pending.isCurrentNavigation = isCurrentNavigation;
      return pending.promise;
    }
    return blocked("confirmation-pending");
  }
  if (!isCurrentContext() || !isCurrentNavigation()) return blocked("context-changed");
  const operation = { intent, isCurrentContext, isCurrentNavigation, promise: null };
  const isCurrent = () => isCurrentContext() && operation.isCurrentNavigation();
  pendingDismissals.set(graphState, operation);
  operation.promise = (async () => {
    try {
      const ask = async () => typeof confirm === "function" && await confirm(
        `当前关联还有未保存的输入。放弃这些输入并${intent === "close" ? "收起面板" : "切换页面"}？`
      ) === true;

      if (graphSelectionNeedsConfirmation(graphState)) {
        const ok = await ask();
        if (!isCurrent()) return blocked("context-changed");
        if (!ok) {
          setStatus("已保留关联输入。", "warn");
          return blocked("graph-unsaved-input");
        }
      }

      if (permanentRelationWorkspaceNeedsConfirmation(getPermanentRelationWorkspaceState())) {
        const ok = await ask();
        if (!isCurrent()) return blocked("context-changed");
        if (!ok) {
          setStatus("已保留关联输入。", "warn");
          return blocked("permanent-relation-unsaved-input");
        }
      }

      let changed = false;
      if (isSystemMessageModalOpen()) {
        closeSystemMessages();
        changed = true;
      }
      if (getPermanentRelationWorkspaceState()?.open) {
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
    } catch (error) {
      if (isCurrent()) setStatus(`确认未完成：${String(error?.message || error)}`, "warn");
      return blocked("confirmation-error");
    } finally {
      pendingDismissals.delete(graphState);
    }
  })();
  return operation.promise;
}

export function dismissSafeOverlaysForEscape(event = null, deps = {}) {
  if (event?.isComposing || event?.keyCode === 229) return Promise.resolve({ ok: true, changed: false });
  const graph = deps.graphState || {};
  const workspace = deps.getPermanentRelationWorkspaceState?.() || deps.permanentRelationWorkspaceState || {};
  if (graph.selection || graph.workbenchPanelOpen || graph.utilityDrawerOpen || workspace.open || deps.isSystemMessageModalOpen?.()) {
    event?.preventDefault?.();
    event?.stopPropagation?.();
  }
  return dismissSafeOverlaysForNavigation({ ...deps, intent: "close" });
}

export function createOverlayDismissalCallbacks(deps) {
  return {
    dismissSafeOverlaysForNavigation: context => dismissSafeOverlaysForNavigation({ ...deps, ...context }),
    dismissSafeOverlaysForEscape: event => dismissSafeOverlaysForEscape(event, deps)
  };
}
