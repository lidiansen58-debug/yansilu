import { normalizeAiInboxFilters } from "./ai-inbox-model.js";

export { systemMessageActionRoute } from "./system-message-route-model.js";

export function normalizeSystemMessage(item = {}) {
  const id = String(item.id || "").trim() || `sys_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const createdAt = String(item.createdAt || item.created_at || "").trim() || new Date().toISOString();
  const aiInboxFilters = item.aiInboxFilters && typeof item.aiInboxFilters === "object" && !Array.isArray(item.aiInboxFilters)
    ? normalizeAiInboxFilters(item.aiInboxFilters)
    : null;
  const workflowRoute = item.workflowRoute && typeof item.workflowRoute === "object" && !Array.isArray(item.workflowRoute)
    ? {
        module: String(item.workflowRoute.module || "explorer").trim() || "explorer",
        focus: String(item.workflowRoute.focus || "").trim(),
        mode: String(item.workflowRoute.mode || "").trim(),
        relationAction: String(item.workflowRoute.relationAction || "").trim(),
        source: String(item.workflowRoute.source || "").trim(),
        graphSelectionKind: String(item.workflowRoute.graphSelectionKind || item.workflowRoute.graph_selection_kind || item.workflowRoute.selectionKind || item.workflowRoute.selection_kind || "").trim(),
        indexCardId: String(item.workflowRoute.indexCardId || item.workflowRoute.index_card_id || "").trim(),
        basketNoteIds: String(item.workflowRoute.basketNoteIds || item.workflowRoute.basket_note_ids || "").trim()
      }
    : null;
  return {
    id,
    createdAt,
    type: String(item.type || "system").trim() || "system",
    category: String(item.category || "").trim(),
    title: String(item.title || "系统消息").trim() || "系统消息",
    body: String(item.body || "").trim(),
    action: String(item.action || "").trim(),
    actionLabel: String(item.actionLabel || "").trim(),
    noteId: String(item.noteId || "").trim(),
    sourceNoteId: String(item.sourceNoteId || item.source_note_id || "").trim(),
    targetNoteId: String(item.targetNoteId || item.target_note_id || "").trim(),
    dedupeKey: String(item.dedupeKey || item.dedupe_key || "").trim(),
    resolvedAt: String(item.resolvedAt || item.resolved_at || "").trim(),
    artifactCount: Math.max(0, Number(item.artifactCount || 0) || 0),
    ...(aiInboxFilters ? { aiInboxFilters } : {}),
    ...(workflowRoute ? { workflowRoute } : {}),
    read: item.read === true
  };
}

export function systemMessageActionLabel(message = {}) {
  if (message.resolvedAt) return "";
  if (message.actionLabel) return message.actionLabel;
  if (message.action === "open-ai-inbox") return "查看待确认建议";
  if (message.action === "open-graph") return "查看候选并确认关系";
  if (message.action === "open-writing") return "继续整理主题";
  if (message.action === "open-note") return "打开笔记";
  if (message.action === "open-note-workflow") return "打开并处理";
  if (message.action === "open-settings-update") return "查看更新";
  return "";
}

export function systemMessagePreviewText(message = {}) {
  const body = String(message.body || "").replace(/\s+/g, " ").trim();
  if (body) return body.length > 74 ? `${body.slice(0, 74)}...` : body;
  if (message.artifactCount) return `${message.artifactCount} 条待确认建议`;
  return "打开右侧查看详情和下一步操作。";
}

export function systemMessageSubjectText(message = {}, notes = []) {
  const noteId = String(message.noteId || message.sourceNoteId || "").trim();
  const note = noteId ? (Array.isArray(notes) ? notes : []).find((item) => item.id === noteId) || null : null;
  const quotedTitle = String(message.body || "").match(/“([^”]+)”/)?.[1] || "";
  return String(note?.title || quotedTitle || noteId || "").trim();
}

export function systemMessageDisplayTitle(message = {}, notes = []) {
  const title = String(message.title || "").trim();
  const subject = systemMessageSubjectText(message, notes);
  if (title === "孤立笔记发现了潜在关联") {
    return subject ? `${subject} 发现了潜在关联` : title;
  }
  if (title === "永久笔记还没有进入图谱") {
    return subject ? `${subject} 还没有进入图谱` : title;
  }
  return title || subject || "系统消息";
}

export function aiInboxFiltersForSystemMessage(message = {}) {
  const filters = message?.aiInboxFilters && typeof message.aiInboxFilters === "object" ? message.aiInboxFilters : {};
  const hasSourceNote = String(message?.noteId || filters.sourceNoteId || "").trim();
  return normalizeAiInboxFilters({
    view: String(filters.view || "pending").trim() || "pending",
    type: String(filters.type || "all").trim() || "all",
    privacyMode: String(filters.privacyMode || "").trim(),
    sourceNoteId: hasSourceNote
  });
}

export function globalPendingAiInboxFilters() {
  return normalizeAiInboxFilters({
    view: "pending",
    type: "all",
    privacyMode: "",
    sourceNoteId: ""
  });
}

export function upsertSystemMessageList(messages = [], message = {}, {
  normalize = normalizeSystemMessage,
  limit = 80,
  preserveRead = true
} = {}) {
  const currentMessages = Array.isArray(messages) ? messages : [];
  const requested = normalize(message);
  const existing = currentMessages.find((item) => item.id === requested.id || (requested.dedupeKey && item.dedupeKey === requested.dedupeKey));
  const reactivated = Boolean(existing?.resolvedAt && !requested.resolvedAt);
  const normalized = normalize({
    ...(existing || {}),
    ...requested,
    id: existing?.id || requested.id,
    createdAt: existing?.createdAt || requested.createdAt,
    read: reactivated ? false : preserveRead && existing ? existing.read === true : requested.read === true
  });
  return {
    message: normalized,
    messages: [normalized, ...currentMessages.filter((item) => item.id !== normalized.id)].slice(0, Math.max(1, Number(limit || 80) || 80)),
    existing,
    reactivated
  };
}

export function markSystemMessageRead(messages = [], messageId = "") {
  const cleanId = String(messageId || "").trim();
  if (!cleanId) return Array.isArray(messages) ? messages : [];
  return (Array.isArray(messages) ? messages : []).map((message) => (message.id === cleanId ? { ...message, read: true } : message));
}

export function noteAnalysisSystemMessageForResult({
  noteId = "",
  noteTitle = "",
  result = null,
  now = () => Date.now()
} = {}) {
  const artifactCount = Number(result?.reviewItems?.storedArtifactIds?.length || result?.reviewItems?.artifacts?.length || 0);
  if (artifactCount <= 0) return null;
  const relationCount = Number(result?.analysis?.relationCandidates?.length || 0);
  const titleText = String(noteTitle || noteId || "").trim();
  return normalizeSystemMessage({
    id: `ai-analysis:${String(noteId || "").trim()}:${now()}`,
    type: "ai",
    title: `${titleText} 产生了待确认建议`,
    body: relationCount
      ? `“${titleText}”有 ${artifactCount} 条待确认建议，其中包含潜在关联。先审阅理由，再决定是否采纳。`
      : `“${titleText}”有 ${artifactCount} 条待确认建议。先审阅理由，再决定是否采纳。`,
    action: "open-ai-inbox",
    actionLabel: "查看待确认建议",
    noteId: String(noteId || "").trim(),
    artifactCount
  });
}

export function scheduledTaskSystemMessageForArtifacts(artifactCount = 0, { now = () => Date.now() } = {}) {
  const count = Number(artifactCount || 0);
  if (count <= 0) return null;
  return normalizeSystemMessage({
    id: `scheduled-ai:${now()}`,
    type: "ai",
    title: "计划任务产生了待确认建议",
    body: `计划任务生成了 ${count} 条待确认建议。先看对象和理由，再决定是否采纳到笔记或图谱。`,
    action: "open-ai-inbox",
    actionLabel: "查看待确认建议",
    artifactCount: count,
    aiInboxFilters: { view: "pending", sourceNoteId: "" }
  });
}

export function writingAnalysisSystemMessageForResult({
  projectId = "",
  noteIds = [],
  model = "strong_model",
  artifactCount = 0,
  now = () => Date.now()
} = {}) {
  const key = String(projectId || (Array.isArray(noteIds) ? noteIds.join("-") : "") || "basket").trim();
  const count = Number(artifactCount || 0);
  if (count > 0) {
    return normalizeSystemMessage({
      id: `writing-ai-analysis:${key}:${now()}`,
      type: "ai",
      title: "写作分析产生了待确认建议",
      body: `写作强模型分析生成了 ${count} 条待确认建议。先看对象和理由，再决定是否采纳到写作项目。`,
      action: "open-ai-inbox",
      actionLabel: "查看待确认建议",
      artifactCount: count,
      aiInboxFilters: { view: "pending", type: "all", sourceNoteId: "" }
    });
  }
  return normalizeSystemMessage({
    id: `writing-ai-request:${key}:${now()}`,
    type: "ai",
    title: "强模型写作分析请求包已准备",
    body: `已为项目 ${String(projectId || "当前写作项目").trim()} 准备 ${String(model || "strong_model").trim()} 请求包。当前没有直接调用远程模型，也没有自动写入笔记；你可以先复核请求范围、写作目标和写作篮材料。`,
    artifactCount: 0
  });
}

export function writingAnalysisSystemMessageDeliveryOptions({ artifactCount = 0 } = {}) {
  return Number(artifactCount || 0) > 0 ? { interrupt: true } : {};
}
