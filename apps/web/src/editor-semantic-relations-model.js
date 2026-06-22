import { normalizeRelationTemplateVariants } from "./editor-relation-helpers.js";

export function emptyEditorSemanticRelationPanelState(noteId = "") {
  return {
    noteId: String(noteId || "").trim(),
    mode: "list",
    relationId: "",
    targetNoteId: "",
    relationType: "",
    entryHint: "",
    rationaleDraft: "",
    insightQuestionDraft: "",
    draftVariants: [],
    selectedTemplateVariant: "",
    rememberedTemplateVariantLabel: "",
    entryRoute: null
  };
}

export function normalizeEditorSemanticRelationPanelState(mode = "list", options = {}, deps = {}) {
  const cleanMode = ["list", "create", "edit"].includes(String(mode || "").trim()) ? String(mode || "").trim() : "list";
  const noteId = String(options.noteId || deps.activeNoteId || "").trim();
  if (cleanMode === "list") return emptyEditorSemanticRelationPanelState(noteId);

  const preferredTemplateVariant = String(deps.preferredTemplateVariant || "").trim();
  const rememberedTemplateVariant = deps.rememberedTemplateVariant || { key: "", label: "" };
  const normalizedTemplates = normalizeRelationTemplateVariants(options.draftVariants || [], preferredTemplateVariant);

  return {
    noteId,
    mode: cleanMode,
    relationId: cleanMode === "edit" ? String(options.relationId || "").trim() : "",
    targetNoteId: cleanMode === "create" ? String(options.targetNoteId || "").trim() : "",
    relationType: cleanMode === "create" ? String(options.relationType || "").trim().toLowerCase() : "",
    entryHint: String(options.entryHint || "").trim(),
    rationaleDraft: String(options.rationaleDraft || "").trim(),
    insightQuestionDraft: String(options.insightQuestionDraft || "").trim(),
    draftVariants: normalizedTemplates.items,
    selectedTemplateVariant: normalizedTemplates.selectedKey,
    rememberedTemplateVariantLabel:
      rememberedTemplateVariant.key && rememberedTemplateVariant.key === normalizedTemplates.selectedKey ? rememberedTemplateVariant.label : "",
    entryRoute: options.entryRoute && typeof options.entryRoute === "object" ? options.entryRoute : null
  };
}

export function currentEditorSemanticRelationPanelState(state = null, noteId = "") {
  const cleanNoteId = String(noteId || "").trim();
  if (!cleanNoteId || !state || state.noteId !== cleanNoteId) return emptyEditorSemanticRelationPanelState(cleanNoteId);
  return state;
}

export function editorSemanticRelationFormValues(data) {
  return {
    toNoteId: String(data?.get?.("toNoteId") || "").trim(),
    relationType: String(data?.get?.("relationType") || "").trim(),
    status: String(data?.get?.("status") || "").trim(),
    rationale: String(data?.get?.("rationale") || "").trim(),
    insightQuestion: String(data?.get?.("insightQuestion") || "").trim()
  };
}

export function validateCreateSemanticRelationForm(values = {}) {
  if (!values.toNoteId || !values.relationType || !values.rationale) {
    return {
      ok: false,
      error: "请选择要关联的笔记、关系类型，并写下一句为什么相关。"
    };
  }
  return { ok: true, error: "" };
}

export function validateEditSemanticRelationForm(values = {}) {
  if (!values.relationType || !values.status || !values.rationale) {
    return {
      ok: false,
      error: "关系类型、状态和关系说明不能为空。"
    };
  }
  return { ok: true, error: "" };
}

export function nextRelationTargetHighlight({
  items = [],
  selectedBefore = "",
  highlightBefore = "",
  query = ""
} = {}) {
  const cleanHighlight = String(highlightBefore || "").trim();
  const cleanSelected = String(selectedBefore || "").trim();
  const cleanQuery = String(query || "").trim();
  if (cleanHighlight && items.some((item) => item?.id === cleanHighlight)) return cleanHighlight;
  if (cleanQuery) return items[0]?.id || "";
  if (cleanSelected && items.some((item) => item?.id === cleanSelected)) return cleanSelected;
  return items[0]?.id || "";
}

export function relationTargetStatusText({
  selectedNote = null,
  itemCount = 0,
  query = "",
  hasScopedCandidates = false
} = {}) {
  const cleanQuery = String(query || "").trim();
  if (selectedNote) return `已选：${selectedNote.title || selectedNote.id}`;
  if (itemCount > 0) return cleanQuery ? `已筛选 ${itemCount} 条` : "输入关键词后选择一条笔记";
  if (cleanQuery) return "没有匹配笔记";
  return hasScopedCandidates ? "输入关键词后选择一条笔记" : "当前范围没有可连接笔记";
}
