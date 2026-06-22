function syncDistillationTabFromNote(state = {}, note = null, updated = null) {
  if (!note || !updated || typeof updated.body !== "string") return;
  const tab = (state.tabs || []).find((item) => item.noteId === note.id);
  if (!tab) return;
  tab.body = updated.body;
  tab.savedBody = updated.body;
  tab.title = updated.title || tab.title;
  tab.savedTitle = tab.title;
  tab.dirty = false;
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

  try {
    const requestedStatus = String(payload.distillationStatus || "draft").trim();
    const shouldConfirm = requestedStatus === "confirmed";
    const updated = await updatePermanentNoteDistillation(note.id, {
      thesis: payload.thesis || "",
      threeLineSummary: Array.isArray(payload.threeLineSummary) ? payload.threeLineSummary : [],
      boundaryOrCounterpoint: payload.boundaryOrCounterpoint || "",
      distillationStatus: shouldConfirm ? "draft" : requestedStatus || "draft"
    });
    let finalUpdated = updated;
    if (shouldConfirm) {
      finalUpdated = await confirmPermanentNoteDistillation(note.id, {
        aiAssisted: Boolean(payload.authorship?.ai_assisted ?? note.authorship?.ai_assisted)
      });
    }
    if (finalUpdated) {
      Object.assign(note, mapNoteItem(finalUpdated), { bodyLoaded: true });
      syncDistillationTabFromNote(state, note, finalUpdated);
    }
    setStatus(shouldConfirm ? "观点字段已保存并确认" : "观点字段已保存", "ok");
    renderDistillationPanel();
    renderAll();
    return finalUpdated || true;
  } catch (error) {
    setStatus(`观点字段保存失败：${String(error?.message || error)}`, "bad");
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

  try {
    const updated = await confirmPermanentNoteDistillation(note.id, {
      aiAssisted: Boolean(note.authorship?.ai_assisted)
    });
    if (updated) Object.assign(note, mapNoteItem(updated), { bodyLoaded: true });
    setStatus("观点已确认", "ok");
    renderAll();
    return updated || true;
  } catch (error) {
    setStatus(`观点确认失败：${String(error?.message || error)}`, "bad");
    return false;
  }
}
