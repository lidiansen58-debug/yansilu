import { titleFromBody, normalizedBodyTextForDirtyCheck } from "./editor-template-workspace.js";
import { sourceNoteReference } from "./note-persistence-policy.js";

const pendingPromotions = new WeakMap();

export function recordSourceNotePromotion(payload = {}, deps = {}) {
  const { state = {}, editor } = deps;
  const existing = pendingPromotions.get(state);
  if (existing) {
    if (existing.noteId === payload.sourceNoteId) return existing.promise;
    deps.setStatus?.("正在生成永久笔记，请稍后再试。", "warn");
    return Promise.resolve(false);
  }
  const scope = state.noteMoveVaultScope;
  const isCurrent = () => state.noteMoveVaultScope === scope && !state.noteMoveVaultSwitching && !state.noteMoveVaultUncertain;
  const entryTabId = state.activeTabId, entryModule = state.module;
  const canOpenResult = () => state.activeTabId === entryTabId && state.module === entryModule;
  const previousSave = editor?.savingPromise;
  editor?.clearAutoSaveTimer?.();
  const pending = Promise.resolve(previousSave).catch(() => false).then(() => {
    if (!isCurrent()) return false;
    // A previous background save may clear its lock as it finishes.
    if (editor) editor.savingPromise = pending;
    editor?.clearAutoSaveTimer?.();
    return recordOriginalFromNote(payload, { ...deps, isCurrent, canOpenResult });
  }).finally(() => {
    pendingPromotions.delete(state);
    if (editor?.savingPromise === pending) editor.savingPromise = null;
    if (isCurrent() && state.tabs?.find(tab => tab.id === state.activeTabId)?.dirty) editor?.scheduleAutoSave?.();
  });
  pendingPromotions.set(state, { noteId: payload.sourceNoteId, promise: pending });
  if (editor) editor.savingPromise = pending;
  return pending;
}

async function recordOriginalFromNote(payload = {}, deps = {}) {
  const {
    state = {},
    editor = null,
    isCurrent = () => true,
    canOpenResult = () => true,
    typeFromFolder = () => "",
    rootBoxIdFromFolder = () => "",
    originalDraftBodyFromSource = () => "",
    titleFromSeedText = (_text, fallback = "未命名笔记") => fallback,
    createNote = async () => null,
    mapNoteItem = (item) => item,
    syncNoteRelationNetworkStatus = () => {},
    isOriginalRecordableSource = () => false,
    withGeneratedOriginalReference = (body) => body,
    withGeneratedOriginalMarker = (body) => body,
    syncSourcePromotionSystemMessageForNote = () => {},
    parseTags = () => [],
    parseLinks = () => [],
    updateNote = async () => null,
    activateModule = () => {},
    openNoteById = () => {},
    setStatus = () => {}
  } = deps;

  const sourceNoteId = String(payload.sourceNoteId || "").trim();
  const sourceNote = (state.notes || []).find((item) => item.id === sourceNoteId) || null;
  const sourceTab = () => (state.tabs || []).find(tab => tab.noteId === sourceNoteId);
  const readSourceBody = () => {
    if (sourceTab()?.id && sourceTab().id === state.activeTabId) editor?.updateActiveTabFromEditor?.();
    return sourceTab()?.body ?? payload.sourceBody ?? sourceNote?.body ?? "";
  };
  const sourceBody = readSourceBody();
  const sourceType = String(
    payload.sourceType ||
    (sourceNote?.folderId ? typeFromFolder(state, sourceNote.folderId) : "") ||
    sourceNote?.noteType ||
    ""
  ).trim().toLowerCase();
  const sourceTitle = /^#\s/.test(sourceBody) ? titleFromBody(sourceBody) : String(payload.sourceTitle || sourceNote?.title || "").trim();
  const explicitDraftBody = String(payload.draftBody || "").trim();
  const body = explicitDraftBody
    ? `${explicitDraftBody}${sourceNoteId ? `\n\n来源：${sourceNoteReference(sourceTitle, sourceNoteId)}` : ""}`
    : originalDraftBodyFromSource({
    ...payload,
    sourceType,
    sourceTitle,
    sourceBody
  });
  const explicitDraftTitle = String(payload.draftTitle || "").trim();
  const title = explicitDraftTitle || titleFromSeedText(
    payload.paraphrase || payload.sourceBody || payload.sourceTitle || sourceTitle || "",
    sourceTitle || "未命名永久笔记"
  );
  const requestedDirectoryId = String(payload.directoryId || "").trim();
  const directoryId =
    requestedDirectoryId && rootBoxIdFromFolder(state, requestedDirectoryId) === "dir_original_default"
      ? requestedDirectoryId
      : "dir_original_default";

  try {
    const created = await createNote({
      directoryId,
      status: "draft",
      body,
      ...(payload.authorshipAiAssisted === true ? { authorshipAiAssisted: true } : {})
    });
    if (!isCurrent()) return false;
    if (!created?.id) throw new Error("创建永久笔记失败：本地服务未返回创建结果");
    const note = mapNoteItem({
      ...created,
      body: typeof created?.body === "string" ? created.body : body
    });
    syncNoteRelationNetworkStatus(note, { connectivityReady: false, connectedIds: null });
    state.notes = [note, ...(state.notes || []).filter((item) => item.id !== note.id)];

    let sourceError = null;
    if (sourceNoteId && sourceNote && isOriginalRecordableSource(sourceNote)) {
      const addReference = body => withGeneratedOriginalMarker(withGeneratedOriginalReference(body, note.title || title, note.id), note.id);
      const nextSourceBody = addReference(readSourceBody());
      const nextSourceTitle = /^#\s/.test(nextSourceBody) ? titleFromBody(nextSourceBody) : sourceTitle;
      let updatedSource = null;
      try {
        const sourceSaveTab = sourceTab();
        const expectedBody = typeof sourceSaveTab?.savedBody === "string" ? sourceSaveTab.savedBody : sourceNote.body;
        const expectedRevision = sourceSaveTab?.savedFileRevision ?? sourceNote.fileRevision;
        updatedSource = await updateNote(sourceNote.id, {
          ...(typeof expectedBody === "string" ? { expectedBody } : {}),
          ...(expectedRevision !== undefined ? { expectedRevision } : {}),
          title: nextSourceTitle,
          body: nextSourceBody,
          status: sourceNote.status || "draft",
          generatedOriginalNoteId: note.id,
          originalityStatus: sourceNote.originalityStatus || undefined,
          originalitySimilarity: sourceNote.originalitySimilarity ?? undefined
        });
        if (updatedSource?.id !== sourceNote.id || typeof updatedSource.body !== "string") throw new Error("本地服务未返回保存结果");
      } catch (error) {
        updatedSource = null;
        sourceError = error;
      }
      if (!isCurrent()) return false;
      const liveBody = addReference(readSourceBody());
      Object.assign(sourceNote, updatedSource ? mapNoteItem(updatedSource) : {}, {
        body: updatedSource?.body ?? nextSourceBody,
        title: updatedSource?.title || nextSourceTitle,
        generatedOriginalNoteId: note.id,
        bodyLoaded: true
      });
      sourceNote.tags = parseTags(sourceNote.body);
      sourceNote.links = parseLinks(sourceNote.body);
      syncSourcePromotionSystemMessageForNote(sourceNote);
      const tab = sourceTab();
      if (tab) {
        tab.body = liveBody;
        tab.title = /^#\s/.test(liveBody) ? titleFromBody(liveBody) : sourceTitle;
        if (updatedSource) {
          tab.savedBody = sourceNote.body;
          tab.savedTitle = sourceNote.title;
          tab.savedFileRevision = updatedSource.fileRevision;
          tab.saveConflict = false;
        }
        const recoveryMode = sourceError?.code === "NOTE_SAVE_CONFLICT" ? "conflict" : sourceError?.code === "NOTE_SAVE_RESULT_UNCERTAIN" ? "uncertain" : "";
        if (recoveryMode) tab.saveConflict = true;
        tab.dirty = Boolean(sourceError) || normalizedBodyTextForDirtyCheck(tab.body) !== normalizedBodyTextForDirtyCheck(tab.savedBody) || tab.title !== tab.savedTitle;
        tab.saveUiState = { mode: recoveryMode || (sourceError ? "error" : tab.dirty ? "dirty" : "saved"), message: recoveryMode ? String(sourceError.message) : sourceError ? "来源笔记保存失败，修改仍保留在编辑器中。" : tab.dirty ? "仍有未保存编辑" : "当前文件：已自动同步" };
        if (state.activeTabId === tab.id) editor?.setEditorValue?.(tab.body);
        if (tab.dirty) editor?.writeDraft?.(tab);
        else editor?.clearDraft?.(sourceNote.id);
      } else if (sourceError) {
        editor?.writeDraft?.({ noteId: sourceNote.id, body: liveBody, title: nextSourceTitle, dirty: true });
      }
    }

    const opened = canOpenResult();
    if (opened) {
      activateModule("explorer");
      openNoteById(note.id, { preferTitleSelection: false });
    }
    editor?.renderTabs?.();
    if (sourceError) setStatus(`永久笔记已创建，但来源笔记标记保存失败：${String(sourceError?.message || sourceError)}`, "warn");
    else setStatus(`${opened ? "已生成并打开永久笔记" : "已生成永久笔记"}：${note.title || title}`, "ok");
    return note;
  } catch (error) {
    setStatus(`记录永久笔记失败：${String(error?.message || error)}`, "bad");
    return false;
  }
}
