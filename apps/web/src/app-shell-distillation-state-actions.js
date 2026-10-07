import { reconcileDistillationTab } from "./distillation-body-merge.js";

function captureDistillationContext(state, note, getVaultPath) {
  const scope = state.noteMoveVaultScope;
  const vaultPath = getVaultPath?.();
  const fileRevision = note.fileRevision;
  const tab = (state.tabs || []).find((item) => item.noteId === note.id);
  const snapshot = tab && {
    body: tab.body, title: tab.title, savedBody: tab.savedBody,
    savedTitle: tab.savedTitle, savedFileRevision: tab.savedFileRevision, dirty: tab.dirty
  };
  return {
    tab, snapshot, vaultPath,
    isCurrent: () => state.noteMoveVaultScope === scope
      && !state.noteMoveVaultSwitching && !state.noteMoveVaultUncertain
      && getVaultPath?.() === vaultPath
      && (state.notes || []).includes(note) && note.fileRevision === fileRevision
  };
}

function syncDistillationTabFromNote(state, context, updated) {
  const { tab, snapshot } = context;
  if (!tab || !updated || typeof updated.body !== "string" || !(state.tabs || []).includes(tab)) return;
  // A different save owns its newer baseline; never roll it back to this result.
  if (tab.savedFileRevision !== snapshot.savedFileRevision
    || tab.savedBody !== snapshot.savedBody || tab.savedTitle !== snapshot.savedTitle) return;
  const hasNewerInput = tab.body !== snapshot.body || tab.title !== snapshot.title;
  const hasUnsavedInput = (typeof snapshot.savedBody === "string" && snapshot.body !== snapshot.savedBody)
    || (typeof snapshot.savedTitle === "string" && snapshot.title !== snapshot.savedTitle)
    || (snapshot.dirty === true && typeof snapshot.savedBody !== "string");
  if (!hasNewerInput && !hasUnsavedInput) {
    tab.body = updated.body;
    tab.title = updated.title || tab.title;
  } else {
    return reconcileDistillationTab(tab, updated, snapshot);
  }
  tab.savedBody = updated.body;
  tab.savedFileRevision = updated.fileRevision;
  tab.savedTitle = updated.title || snapshot.title;
  tab.dirty = tab.body !== tab.savedBody || tab.title !== tab.savedTitle;
  return true;
}

export async function handleSaveNoteDistillationStateChange(payload = {}, deps = {}) {
  const {
    state = {},
    updatePermanentNoteDistillation = async () => null,
    confirmPermanentNoteDistillation = async () => null,
    mapNoteItem = (item) => item,
    setStatus = () => {},
    renderDistillationPanel = () => {},
    renderAll = () => {}
  } = deps;

  const noteId = String(payload.noteId || "").trim();
  const note = (state.notes || []).find((item) => item.id === noteId);
  if (!note) return false;
  const context = captureDistillationContext(state, note, deps.getVaultPath);
  if (!context.isCurrent()) return false;

  let updated = null;
  try {
    const requestedStatus = String(payload.distillationStatus || "draft").trim();
    const shouldConfirm = requestedStatus === "confirmed";
    const updatePayload = {
      ...(context.vaultPath ? { expectedVaultPath: context.vaultPath } : {}),
      thesis: payload.thesis || "",
      threeLineSummary: Array.isArray(payload.threeLineSummary) ? payload.threeLineSummary : [],
      boundaryOrCounterpoint: payload.boundaryOrCounterpoint || "",
      distillationStatus: shouldConfirm ? "draft" : requestedStatus || "draft"
    };
    if (Object.prototype.hasOwnProperty.call(payload, "startingQuestion")) {
      updatePayload.startingQuestion = payload.startingQuestion || "";
    }
    if (Object.prototype.hasOwnProperty.call(payload, "title")) updatePayload.title = payload.title;
    if (payload.expectedRevision !== undefined) updatePayload.expectedRevision = payload.expectedRevision;
    if (Object.prototype.hasOwnProperty.call(payload, "thesisChangeReason")) {
      updatePayload.thesisChangeReason = payload.thesisChangeReason || "";
    }
    if (Array.isArray(payload.viewpointChangeSourceNoteIds)) {
      updatePayload.viewpointChangeSourceNoteIds = payload.viewpointChangeSourceNoteIds;
    }
    if (payload.commitViewpointChange === true) {
      updatePayload.commitViewpointChange = true;
    }
    updated = await updatePermanentNoteDistillation(note.id, updatePayload);
    if (!context.isCurrent()) return false;
    let finalUpdated = updated;
    if (shouldConfirm) {
      finalUpdated = await confirmPermanentNoteDistillation(note.id, {
        ...(context.vaultPath ? { expectedVaultPath: context.vaultPath } : {}),
        aiAssisted: Boolean(payload.authorship?.ai_assisted ?? note.authorship?.ai_assisted),
        ...(updated?.fileRevision ? { expectedRevision: updated.fileRevision } : {})
      });
    }
    if (!context.isCurrent()) return false;
    let reconciled;
    if (finalUpdated) {
      Object.assign(note, mapNoteItem(finalUpdated), { bodyLoaded: true });
      reconciled = syncDistillationTabFromNote(state, context, finalUpdated);
    }
    setStatus(reconciled === false ? "观点已保存；正文修改冲突，请保留修改后重新打开核对。"
      : shouldConfirm ? "当前观点已保存" : "观点草稿已保存", reconciled === false ? "warn" : "ok");
    renderDistillationPanel();
    renderAll();
    return finalUpdated ? { ...finalUpdated,
      ...(reconciled !== undefined ? { distillationEditorBaseline: context.snapshot } : {}) } : true;
  } catch (error) {
    if (!context.isCurrent()) return false;
    if (updated) {
      Object.assign(note, mapNoteItem(updated), { bodyLoaded: true });
      const reconciled = syncDistillationTabFromNote(state, context, updated);
      setStatus(`观点草稿已保存，但确认失败：${String(error?.message || error)}。请重试保存。`, "bad");
      renderDistillationPanel();
      renderAll();
      return { ...updated, distillationSaveIncomplete: true,
        ...(reconciled !== undefined ? { distillationEditorBaseline: context.snapshot } : {}) };
    }
    setStatus(`当前观点保存失败：${String(error?.message || error)}`, "bad");
    return false;
  }
}

export async function handleConfirmNoteDistillationStateChange(payload = {}, deps = {}) {
  const {
    state = {},
    confirmPermanentNoteDistillation = async () => null,
    mapNoteItem = (item) => item,
    setStatus = () => {},
    renderAll = () => {}
  } = deps;

  const noteId = String(payload.noteId || "").trim();
  const note = (state.notes || []).find((item) => item.id === noteId);
  if (!note) return false;
  const context = captureDistillationContext(state, note, deps.getVaultPath);
  if (!context.isCurrent()) return false;

  try {
    const updated = await confirmPermanentNoteDistillation(note.id, {
      ...(context.vaultPath ? { expectedVaultPath: context.vaultPath } : {}),
      aiAssisted: Boolean(note.authorship?.ai_assisted),
      ...(note.fileRevision ? { expectedRevision: note.fileRevision } : {})
    });
    if (!context.isCurrent()) return false;
    let reconciled;
    if (updated) {
      Object.assign(note, mapNoteItem(updated), { bodyLoaded: true });
      reconciled = syncDistillationTabFromNote(state, context, updated);
    }
    setStatus(reconciled === false ? "观点已保存；正文修改冲突，请保留修改后重新打开核对。"
      : "提炼内容已整理到正文", reconciled === false ? "warn" : "ok");
    renderAll();
    return updated ? { ...updated,
      ...(reconciled !== undefined ? { distillationEditorBaseline: context.snapshot } : {}) } : true;
  } catch (error) {
    if (!context.isCurrent()) return false;
    setStatus(`整理到正文失败：${String(error?.message || error)}`, "bad");
    return false;
  }
}
