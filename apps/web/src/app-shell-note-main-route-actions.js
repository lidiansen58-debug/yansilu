const MAIN_PATH_CONTINUATION_COPY = {
  sourceLabel: "主路径",
  scaffoldLabel: "当前项目的草稿骨架"
};

export async function handleOpenNoteMainRouteStateChange(payload = {}, deps = {}) {
  const {
    state = {},
    editor = null,
    windowRef = typeof window !== "undefined" ? window : { setTimeout: (fn) => fn() },
    folderById = () => null,
    rootBoxIdFromFolder = () => "",
    syncNotesForDirectory = async () => {},
    refreshDirectoryGraph = async () => {},
    activateModule = () => {},
    openNoteById = () => {},
    ensureNoteBodyLoaded = async () => {},
    openWritingModule = async () => {},
    continueWritingEntry = () => ({}),
    normalizeWritingProjectTitleSeed = (title) => title,
    noteMainPathWritingContinuationEntry = () => null,
    continueWritingProjectEntry = async () => {},
    createWritingProjectFromCurrentBasket = async () => {},
    writingCenterContinuationStatusMessage = () => "",
    writingCenterContinuationFailureMessage = (_continuation, error) => String(error?.message || error),
    setStatus = () => {}
  } = deps;

  const noteId = String(payload.noteId || "").trim();
  const action = String(payload.action || "").trim();
  const mode = String(payload.mode || "").trim().toLowerCase();
  const note = (state.notes || []).find((item) => item.id === noteId) || null;
  if (!noteId || !note) return false;

  if (action === "graph") {
    const noteFolderId = String(note.folderId || note.directoryId || "").trim();
    if (noteFolderId && folderById(state, noteFolderId)) {
      state.browserRootId = rootBoxIdFromFolder(state, noteFolderId);
      state.selectedFolderId = noteFolderId;
      await syncNotesForDirectory(noteFolderId);
    }
    state.selectedFileId = noteId;
    activateModule("graph");
    await refreshDirectoryGraph();
    setStatus("已打开关系图谱，继续看这条笔记周围的结构和主题候选", "ok");
    return true;
  }

  if (action === "writing") {
    const noteContinuation = noteMainPathWritingContinuationEntry(noteId, "当前笔记");
    try {
      await ensureNoteBodyLoaded(noteId);
      if (mode === "distillation") {
        state.selectedFileId = noteId;
        activateModule("explorer");
        openNoteById(noteId, { preferTitleSelection: false });
        state.inspectorVisible = false;
        editor?.setInspectorVisible?.(false);
        windowRef.setTimeout(() => {
          editor?.jumpToInspectorSection?.("[data-note-distillation-section]", {
            focus: true,
            focusSelector: '[data-note-distillation-form] textarea[name="thesis"]'
          });
        }, 40);
        setStatus(`已打开“${note.title || noteId}”的观点提纯区域`, "ok");
        return true;
      }
      if (mode === "requirements") {
        await openWritingModule({ statusMessage: "" });
        const requirementsMessage = note?.authorship?.user_confirmed
          ? "这条笔记还没满足写作要求：先完成原创确认，再进入写作中心。"
          : "这条笔记还没满足写作要求：先完成作者确认，再进入写作中心。";
        setStatus(requirementsMessage, "warn", { requireModule: "writing" });
        return true;
      }
      const plan = continueWritingEntry([noteId], {
        title: normalizeWritingProjectTitleSeed(note.title || "未命名笔记"),
        source: "note_main_path"
      });
      const addedCount = Number(plan?.addedNoteIds?.length || 0);
      const statusMessage =
        addedCount > 0
          ? `已把“${note.title || noteId}”加入写作篮，并打开写作中心`
          : `“${note.title || noteId}”已在写作篮中，已打开写作中心`;
      if (mode === "project") {
        await openWritingModule({ statusMessage: "" });
        if (noteContinuation?.projectId) {
          await continueWritingProjectEntry(noteContinuation.projectId, {
            openDraft: noteContinuation.action === "open-draft",
            statusMessage: writingCenterContinuationStatusMessage(noteContinuation, MAIN_PATH_CONTINUATION_COPY)
          });
          return true;
        }
        await createWritingProjectFromCurrentBasket();
        return true;
      }
      if (noteContinuation?.projectId) {
        await continueWritingProjectEntry(noteContinuation.projectId, {
          openDraft: noteContinuation.action === "open-draft",
          statusMessage: writingCenterContinuationStatusMessage(noteContinuation, MAIN_PATH_CONTINUATION_COPY)
        });
        return true;
      }
      await openWritingModule({ statusMessage });
      return true;
    } catch (error) {
      if (mode === "distillation") {
        setStatus(`打开观点提纯区域失败：${String(error?.message || error)}`, "bad");
        return false;
      }
      if (mode === "requirements" || mode === "project" || mode === "writing") {
        if (noteContinuation?.projectId) {
          setStatus(writingCenterContinuationFailureMessage(noteContinuation, error, MAIN_PATH_CONTINUATION_COPY), "bad");
          return false;
        }
        setStatus(`${mode === "project" ? "从主路径创建项目" : "从主路径进入写作中心"}失败：${String(error?.message || error)}`, "bad");
        return false;
      }
      throw error;
    }
  }

  return false;
}
