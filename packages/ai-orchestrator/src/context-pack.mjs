function cleanText(value) {
  return String(value || "").trim();
}

function generatedId(prefix = "ctx") {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function estimateTokens(text) {
  const value = String(text || "");
  return Math.max(1, Math.ceil(value.length / 4));
}

function normalizePrivacyMode(value) {
  const mode = cleanText(value) || "normal";
  if (!["normal", "private_project", "local_only", "enterprise_restricted"].includes(mode)) {
    const error = new Error(`Unsupported privacy mode: ${mode}`);
    error.code = "AI_CONTEXT_PRIVACY_INVALID";
    throw error;
  }
  return mode;
}

export function createContextItem(input = {}) {
  const kind = cleanText(input.kind || "note");
  const sourceId = cleanText(input.sourceId || input.source_id || input.id);
  if (!sourceId) {
    const error = new Error("context item sourceId is required");
    error.code = "AI_CONTEXT_ITEM_SOURCE_REQUIRED";
    throw error;
  }

  const content = String(input.content ?? input.body ?? "");
  const privacyMode = normalizePrivacyMode(input.privacyMode || input.privacy_mode || input.privacy?.mode);
  return {
    itemId: cleanText(input.itemId || input.item_id) || generatedId("ctx_item"),
    kind,
    sourceId,
    title: cleanText(input.title),
    content,
    contentFormat: cleanText(input.contentFormat || input.content_format) || "plain_text",
    origin: cleanText(input.origin) || "human_authored",
    includedReason: cleanText(input.includedReason || input.included_reason) || "explicit",
    relevance: input.relevance || { score: 1, method: "explicit" },
    privacy: { mode: privacyMode, redacted: input.redacted === true },
    tokenEstimate: Number(input.tokenEstimate || input.token_estimate) || estimateTokens(content),
    sourcePointer: input.sourcePointer || input.source_pointer || {
      noteId: kind === "note" ? sourceId : null,
      blockIds: [],
      sourceDocId: kind === "source_doc" ? sourceId : null,
      artifactId: kind === "artifact" ? sourceId : null
    }
  };
}

export function createContextPack(input = {}) {
  const taskId = cleanText(input.taskId || input.task_id);
  if (!taskId) {
    const error = new Error("context pack taskId is required");
    error.code = "AI_CONTEXT_TASK_REQUIRED";
    throw error;
  }

  const privacyMode = normalizePrivacyMode(input.privacyMode || input.privacy_mode || input.privacy?.mode);
  const items = Array.isArray(input.items) ? input.items.map(createContextItem) : [];
  const estimatedInputTokens = items.reduce((sum, item) => sum + Number(item.tokenEstimate || 0), 0);

  return {
    contextPackId: cleanText(input.contextPackId || input.context_pack_id) || generatedId("ctx"),
    taskId,
    agentRunId: cleanText(input.agentRunId || input.agent_run_id),
    createdAt: cleanText(input.createdAt || input.created_at) || new Date().toISOString(),
    createdBy: cleanText(input.createdBy || input.created_by) || "ai_orchestrator_context_builder_v1",
    task: input.task || {
      taskType: cleanText(input.taskType || input.task_type) || "reflection",
      agentId: cleanText(input.agentId || input.agent_id) || "reflection_agent",
      trigger: cleanText(input.trigger) || "user_command"
    },
    privacy: {
      mode: privacyMode,
      cloudAllowed: input.cloudAllowed !== false && privacyMode !== "local_only",
      redactionsApplied: input.redactionsApplied === true
    },
    budget: {
      targetInputTokens: Number(input.targetInputTokens || input.target_input_tokens) || 12000,
      estimatedInputTokens,
      maxItems: Number(input.maxItems || input.max_items) || 24
    },
    items,
    omitted: Array.isArray(input.omitted) ? input.omitted : [],
    retrievalTrace: Array.isArray(input.retrievalTrace || input.retrieval_trace)
      ? input.retrievalTrace || input.retrieval_trace
      : [],
    summary: input.summary || { humanSummary: "", machineSummary: "" }
  };
}

export function createCurrentNoteContextPack({ taskId, agentRunId, note, privacyMode = "normal" } = {}) {
  if (!note?.id) {
    const error = new Error("current note id is required");
    error.code = "AI_CONTEXT_CURRENT_NOTE_REQUIRED";
    throw error;
  }
  return createContextPack({
    taskId,
    agentRunId,
    privacyMode,
    items: [
      createContextItem({
        kind: "note",
        sourceId: note.id,
        title: note.title,
        content: note.body || note.content || "",
        origin: note.origin || "human_authored",
        includedReason: "current_note",
        privacyMode
      })
    ],
    retrievalTrace: [
      {
        step: "current_note",
        tool: "read_note",
        resultCount: 1,
        selectedCount: 1
      }
    ]
  });
}
