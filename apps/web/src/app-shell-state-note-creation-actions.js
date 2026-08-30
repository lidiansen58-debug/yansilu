function creationFailure(setStatus, error) {
  if (error?.code === "vault_changed") return false;
  if (error?.code === "creation_pending") {
    setStatus(error.message, "warn", { notify: true, force: true, holdMs: 12000 });
    return false;
  }
  setStatus(`未能创建笔记：${String(error?.message || error || "本地服务没有返回保存结果")}。正在编辑的内容已保留，请检查笔记库和本地服务后重试。`, "bad", { notify: true, force: true, holdMs: 12000 });
  return false;
}

export async function handleCreatePrimaryNoteStateChange(payload = {}, deps = {}) {
  const {
    createPrimaryOriginalNote = async () => ({}),
    setStatus = () => {}
  } = deps;
  setStatus("正在创建笔记...", "busy", { notify: true, force: true });
  let result;
  try {
    result = await createPrimaryOriginalNote({ preferTitleSelection: true });
  } catch (error) { return creationFailure(setStatus, error); }
  if (result?.error) return creationFailure(setStatus, result.error);
  if (result.reused) {
    setStatus(
      result.cleanedCount
        ? `已打开永久笔记占位，并清理 ${result.cleanedCount} 条空白占位`
        : "已打开永久笔记占位",
      result.cleanedCount ? "warn" : "ok"
    );
  } else if (result.remote) {
    setStatus("笔记已保存到本地", "ok", { notify: true, force: true });
  } else {
    return creationFailure(setStatus, result.error);
  }
  return result || true;
}

export async function handleCreateNoteInSelectedFolderStateChange(payload = {}, deps = {}) {
  const {
    applyExplorerSelectionContext = () => {},
    createNoteInSelectedFolder = async () => ({}),
    setStatus = () => {}
  } = deps;

  if (payload.folderId) {
    applyExplorerSelectionContext({
      folderId: String(payload.folderId || "").trim(),
      clearSelectedFile: true,
      expandFolder: true
    });
  }

  setStatus("正在创建笔记...", "busy", { notify: true, force: true });
  let result;
  try {
    result = await createNoteInSelectedFolder({ preferTitleSelection: true });
  } catch (error) { return creationFailure(setStatus, error); }
  if (result?.error) return creationFailure(setStatus, result.error);
  if (result.reused) {
    setStatus(
      result.cleanedCount
        ? `已打开现有未命名笔记，并清理 ${result.cleanedCount} 条空白占位`
        : "已打开现有未命名笔记",
      result.cleanedCount ? "warn" : "ok"
    );
  } else if (result.remote) {
    setStatus("笔记已保存到本地", "ok", { notify: true, force: true });
  } else {
    return creationFailure(setStatus, result.error);
  }
  return result || true;
}

export async function handleRecordOriginalFromNoteStateChange(payload = {}, deps = {}) {
  const {
    state = {},
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
  const sourceType = String(
    payload.sourceType ||
    (sourceNote?.folderId ? typeFromFolder(state, sourceNote.folderId) : "") ||
    sourceNote?.noteType ||
    ""
  ).trim().toLowerCase();
  const sourceTitle = String(payload.sourceTitle || sourceNote?.title || "").trim();
  const explicitDraftBody = String(payload.draftBody || "").trim();
  const body = explicitDraftBody || originalDraftBodyFromSource({
    ...payload,
    sourceType,
    sourceTitle,
    sourceBody: payload.sourceBody || sourceNote?.body || ""
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
      body
    });
    if (!created) throw new Error("创建永久笔记失败");
    const note = mapNoteItem({
      ...created,
      body: typeof created?.body === "string" ? created.body : body
    });
    syncNoteRelationNetworkStatus(note, { connectivityReady: false, connectedIds: null });
    state.notes = [note, ...(state.notes || []).filter((item) => item.id !== note.id)];

    if (sourceNoteId && sourceNote && isOriginalRecordableSource(sourceNote)) {
      const sourceBodyWithVisibleReference = withGeneratedOriginalReference(
        String(payload.sourceBody || sourceNote.body || ""),
        note.title || title
      );
      const nextSourceBody = withGeneratedOriginalMarker(sourceBodyWithVisibleReference, note.id);
      sourceNote.body = nextSourceBody;
      sourceNote.generatedOriginalNoteId = note.id;
      syncSourcePromotionSystemMessageForNote(sourceNote);
      sourceNote.tags = parseTags(nextSourceBody);
      sourceNote.links = parseLinks(nextSourceBody);
      sourceNote.updatedAt = new Date().toISOString();
      const sourceTab = (state.tabs || []).find((item) => item.noteId === sourceNote.id);
      if (sourceTab) {
        sourceTab.body = nextSourceBody;
        sourceTab.savedBody = nextSourceBody;
        sourceTab.title = sourceNote.title;
        sourceTab.savedTitle = sourceNote.title;
        sourceTab.dirty = false;
      }
      try {
        const updatedSource = await updateNote(sourceNote.id, {
          title: sourceNote.title,
          body: sourceNote.body,
          status: sourceNote.status || "draft",
          generatedOriginalNoteId: sourceNote.generatedOriginalNoteId || undefined,
          originalityStatus: sourceNote.originalityStatus || undefined,
          originalitySimilarity: sourceNote.originalitySimilarity ?? undefined
        });
        if (updatedSource) Object.assign(sourceNote, mapNoteItem(updatedSource), { bodyLoaded: true });
      } catch (sourceError) {
        setStatus(`永久笔记已创建，但来源笔记标记保存失败：${String(sourceError?.message || sourceError)}`, "warn");
      }
    }

    activateModule("explorer");
    openNoteById(note.id, { preferTitleSelection: false });
    setStatus(`已生成并打开永久笔记：${note.title || title}`, "ok");
    return note;
  } catch (error) {
    setStatus(`记录永久笔记失败：${String(error?.message || error)}`, "bad");
    return false;
  }
}
