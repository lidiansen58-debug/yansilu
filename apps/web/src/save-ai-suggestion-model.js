export function saveAiSuggestionForNoteModel(note = null, context = {}, deps = {}) {
  const {
    currentModule = "",
    activeNote = null,
    activeBody = ""
  } = context;
  const {
    isEmptyUntitledMarkdown = () => false,
    isOriginalRecordableSource = () => false,
    noteHasGeneratedOriginal = () => false,
    noteTypeForNote = (item) => String(item?.noteType || "").trim().toLowerCase(),
    isPermanentLikeNote = () => false,
    distillationStatusOf = () => "",
    saveAiSuggestionKey = (item, action) => `${item?.id || ""}:${action}`
  } = deps;

  if (!note?.id || currentModule !== "explorer") return null;
  if (!activeNote || activeNote.id !== note.id) return null;
  if (isEmptyUntitledMarkdown(note.body || activeBody, note.folderId)) return null;

  if (isOriginalRecordableSource(note) && !noteHasGeneratedOriginal(note)) {
    const noteType = noteTypeForNote(note);
    const action = "record-permanent";
    const fleeting = noteType === "fleeting";
    return {
      key: saveAiSuggestionKey(note, action),
      noteId: note.id,
      action,
      text: fleeting ? "已保存，记得清理或沉淀为永久笔记" : "已保存，可提炼为永久笔记",
      primaryLabel: fleeting ? "提炼为永久笔记" : "立即处理",
      laterLabel: fleeting ? "稍后清理" : "稍后"
    };
  }

  if (isPermanentLikeNote(note) && distillationStatusOf(note) !== "confirmed") {
    const action = "open-distillation";
    return {
      key: saveAiSuggestionKey(note, action),
      noteId: note.id,
      action,
      text: "已保存，可继续整理观点",
      primaryLabel: "立即处理",
      laterLabel: "稍后"
    };
  }

  return null;
}

export function dismissSaveAiSuggestionForLater(suggestion = null, dismissedKeys = new Set()) {
  if (suggestion?.key) dismissedKeys.add(suggestion.key);
  return null;
}

export function saveAiSuggestionPrimaryRoute(suggestion = null, note = null) {
  const noteId = String(suggestion?.noteId || "").trim();
  if (!noteId) return { kind: "noop" };
  if (!note) return { kind: "missing-note", noteId };
  if (suggestion?.action === "record-permanent") return { kind: "record-permanent", noteId };
  if (suggestion?.action === "open-distillation") {
    return {
      kind: "open-note-main-route",
      noteId,
      action: "writing",
      mode: "distillation"
    };
  }
  return { kind: "unsupported", noteId, action: String(suggestion?.action || "").trim() };
}
