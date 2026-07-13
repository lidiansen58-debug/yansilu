import { normalizeArtifact } from "./artifacts.mjs";

function cleanText(value) {
  return String(value || "").replace(/\r\n/g, "\n").trim();
}

function compactText(value) {
  return cleanText(value).replace(/\s+/g, " ");
}

function stringItems(value) {
  return (Array.isArray(value) ? value : []).map((item) => cleanText(item)).filter(Boolean);
}

function firstSentence(text = "", maxLength = 360) {
  const compact = compactText(text);
  if (!compact) return "";
  return compact.length > maxLength ? `${compact.slice(0, maxLength - 3).trim()}...` : compact;
}

function stablePart(value = "") {
  return cleanText(value).toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]+/giu, "_").replace(/^_+|_+$/g, "").slice(0, 48);
}

function stableId(prefix, parts = []) {
  const suffix = parts.map(stablePart).filter(Boolean).join("_");
  return `${prefix}_${suffix || "item"}`;
}

function normalizeWritingNote(input = {}) {
  return {
    noteId: cleanText(input.noteId || input.note_id || input.id),
    title: cleanText(input.title),
    noteType: cleanText(input.noteType || input.note_type),
    thesis: cleanText(input.thesis),
    body: cleanText(input.body || input.markdown || input.markdownBody || input.markdown_body),
    tags: stringItems(input.tags),
    citations: Array.isArray(input.citations) ? input.citations.map((item) => ({ ...item })) : []
  };
}

function ensureRemoteConfirmation(input = {}, context = {}) {
  const privacyMode = cleanText(input.privacyMode || input.privacy_mode || context.privacyMode || context.privacy_mode || context.privacy?.mode);
  if (privacyMode === "local_only") return;
  const confirmed =
    input.userConfirmedRemoteModel === true ||
    input.user_confirmed_remote_model === true ||
    context.userConfirmedRemoteModel === true ||
    context.user_confirmed_remote_model === true;
  if (!confirmed) {
    const error = new Error("remote strong-model writing analysis requires explicit user confirmation");
    error.code = "WRITING_REMOTE_MODEL_CONFIRMATION_REQUIRED";
    throw error;
  }
}

function writingPrivacyMode(input = {}, context = {}) {
  return cleanText(input.privacyMode || input.privacy_mode || context.privacyMode || context.privacy_mode || context.privacy?.mode) || "remote_after_confirmation";
}

function isLocalWritingRequest(input = {}, context = {}) {
  return writingPrivacyMode(input, context) === "local_only";
}

function extractJsonObject(value) {
  if (value && typeof value === "object") return value;
  const text = cleanText(value);
  if (!text) return {};
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/iu);
  const candidate = fenced ? fenced[1] : text;
  try {
    return JSON.parse(candidate);
  } catch {
    const start = candidate.indexOf("{");
    const end = candidate.lastIndexOf("}");
    if (start >= 0 && end > start) return JSON.parse(candidate.slice(start, end + 1));
    throw new Error("writing model response must be JSON");
  }
}

function artifactContext(context = {}, request = {}) {
  const privacyMode = cleanText(context.privacyMode || context.privacy_mode || context.privacy?.mode || request.privacy?.mode) || "remote_after_confirmation";
  const localOnly = privacyMode === "local_only";
  return {
    agentRunId: cleanText(context.agentRunId || context.agent_run_id) || "run_writing_strong_model_analysis",
    contextPackId: cleanText(context.contextPackId || context.context_pack_id),
    model: context.model || request.model || {
      provider: "remote_strong_model",
      model: "remote_strong_model",
      tier: "strong",
      mode: "Remote / Confirmed"
    },
    privacy: context.privacy || {
      mode: privacyMode,
      cloudModelUsed: !localOnly
    },
    now: context.now
  };
}

export function buildWritingStrongModelRequest(input = {}, context = {}) {
  ensureRemoteConfirmation(input, context);
  const localOnly = isLocalWritingRequest(input, context);
  const privacyMode = localOnly ? "local_only" : "remote_after_confirmation";
  const notes = (Array.isArray(input.notes) ? input.notes : [])
    .map(normalizeWritingNote)
    .filter((note) => note.noteId)
    .slice(0, Number(input.noteLimit || input.note_limit) || 24);
  const writingGoal = cleanText(input.writingGoal || input.writing_goal || input.goal || input.topic);
  const projectId = cleanText(input.projectId || input.project_id);
  const payload = {
    task: "writing_strong_model_analysis",
    privacyMode: localOnly ? "local_only" : "remote_after_user_confirmation",
    instructions: [
      "Only return JSON.",
      "Use the selected notes as source material.",
      "Do not write final prose for the user.",
      "Return reviewable writing support only.",
      "Keep source note ids visible in every item."
    ],
    requiredOutputShape: {
      writingMoves: [
        {
          moveType: "claim|counterpoint|transition|caveat|example|section_move",
          text: "string",
          sourceNoteIds: ["note id"],
          suggestedLocation: "string",
          whyItMatters: "string"
        }
      ],
      outlineDrafts: [
        {
          title: "string",
          sections: ["string"],
          sourceNoteIds: ["note id"],
          gaps: ["string"]
        }
      ],
      sourceGaps: [
        {
          gap: "string",
          claim: "string",
          requiredSourceType: "note|source|citation",
          relatedNoteIds: ["note id"],
          suggestedAction: "string"
        }
      ]
    },
    project: {
      projectId,
      writingGoal,
      audience: cleanText(input.audience),
      format: cleanText(input.format || input.outputFormat || input.output_format)
    },
    notes: notes.map((note) => ({
      noteId: note.noteId,
      title: note.title,
      noteType: note.noteType,
      thesis: note.thesis,
      excerpt: firstSentence(note.body || note.thesis || note.title, 900),
      tags: note.tags,
      citationCount: note.citations.length
    })),
    acceptedArtifactIds: stringItems(input.acceptedArtifactIds || input.accepted_artifact_ids)
  };

  return {
    requestType: "writing_strong_model_analysis",
    privacy: {
      mode: privacyMode,
      cloudModelAllowed: !localOnly,
      cloudModelUsed: false,
      userConfirmed: localOnly ? false : true
    },
    model: context.model || {
      provider: cleanText(input.provider) || "remote_strong_model",
      model: cleanText(input.model) || cleanText(context.remoteModel || context.remote_model) || "strong_model",
      tier: "strong",
      mode: "Remote / Confirmed"
    },
    messages: [
      {
        role: "system",
        content: "You help prepare source-grounded writing support. Never mutate notes, confirm claims, or write final prose."
      },
      {
        role: "user",
        content: JSON.stringify(payload, null, 2)
      }
    ],
    responseContract: payload.requiredOutputShape,
    canAutoConfirm: false,
    sourceNoteIds: notes.map((note) => note.noteId)
  };
}

function writingMoveArtifact(move = {}, index = 0, request = {}, context = {}) {
  const sourceNoteIds = stringItems(move.sourceNoteIds || move.source_note_ids);
  const text = cleanText(move.text || move.body || move.summary);
  if (!text) return null;
  return normalizeArtifact(
    {
      id: stableId("artifact_writing_move", [context.artifactIdSalt, index, text]),
      type: "WritingMove",
      title: cleanText(move.title) || `Writing move: ${cleanText(move.moveType || move.move_type) || "candidate"}`,
      summary: cleanText(move.whyItMatters || move.why_it_matters) || text,
      body: text,
      status: "pending_review",
      origin: "ai_generated",
      sources: { noteIds: sourceNoteIds, sourceDocIds: [], artifactIds: [], externalUrls: [] },
      confidence: { score: null, label: "medium", reason: "remote strong-model writing analysis" },
      payload: {
        moveType: cleanText(move.moveType || move.move_type) || "section_move",
        move_type: cleanText(move.moveType || move.move_type) || "section_move",
        text,
        sourceNoteIds,
        source_note_ids: sourceNoteIds,
        suggestedLocation: cleanText(move.suggestedLocation || move.suggested_location),
        suggested_location: cleanText(move.suggestedLocation || move.suggested_location),
        whyItMatters: cleanText(move.whyItMatters || move.why_it_matters),
        why_it_matters: cleanText(move.whyItMatters || move.why_it_matters),
        suggestedAction: cleanText(move.suggestedAction || move.suggested_action) || "insert_after_review",
        suggested_action: cleanText(move.suggestedAction || move.suggested_action) || "insert_after_review"
      }
    },
    artifactContext(context, request)
  );
}

function outlineArtifact(outline = {}, index = 0, request = {}, context = {}) {
  const sourceNoteIds = stringItems(outline.sourceNoteIds || outline.source_note_ids);
  const sections = stringItems(outline.sections);
  const title = cleanText(outline.title) || "Outline draft";
  if (!sections.length) return null;
  return normalizeArtifact(
    {
      id: stableId("artifact_outline_draft", [context.artifactIdSalt, index, title]),
      type: "OutlineDraft",
      title,
      summary: cleanText(outline.summary) || `${sections.length} reviewable sections`,
      body: sections.join("\n"),
      status: "pending_review",
      origin: "ai_generated",
      sources: { noteIds: sourceNoteIds, sourceDocIds: [], artifactIds: [], externalUrls: [] },
      confidence: { score: null, label: "medium", reason: "remote strong-model writing analysis" },
      payload: {
        sections,
        sectionPurposes: Array.isArray(outline.sectionPurposes || outline.section_purposes)
          ? [...(outline.sectionPurposes || outline.section_purposes)]
          : [],
        section_purposes: Array.isArray(outline.sectionPurposes || outline.section_purposes)
          ? [...(outline.sectionPurposes || outline.section_purposes)]
          : [],
        sourceNoteIds,
        source_note_ids: sourceNoteIds,
        gaps: stringItems(outline.gaps),
        suggestedNextAction: cleanText(outline.suggestedNextAction || outline.suggested_next_action) || "review_outline",
        suggested_next_action: cleanText(outline.suggestedNextAction || outline.suggested_next_action) || "review_outline"
      }
    },
    artifactContext(context, request)
  );
}

function sourceGapArtifact(gap = {}, index = 0, request = {}, context = {}) {
  const relatedNoteIds = stringItems(gap.relatedNoteIds || gap.related_note_ids || gap.sourceNoteIds || gap.source_note_ids);
  const claim = cleanText(gap.claim || gap.text);
  const gapText = cleanText(gap.gap || gap.summary || gap.reason);
  if (!claim && !gapText) return null;
  return normalizeArtifact(
    {
      id: stableId("artifact_writing_source_gap", [context.artifactIdSalt, index, claim || gapText]),
      type: "SourceGap",
      title: cleanText(gap.title) || "Writing source gap",
      summary: gapText || claim,
      body: claim || gapText,
      status: "pending_review",
      origin: "ai_generated",
      sources: { noteIds: relatedNoteIds, sourceDocIds: [], artifactIds: [], externalUrls: [] },
      confidence: { score: null, label: "medium", reason: "remote strong-model writing analysis" },
      payload: {
        gap: gapText,
        claim,
        requiredSourceType: cleanText(gap.requiredSourceType || gap.required_source_type) || "note",
        required_source_type: cleanText(gap.requiredSourceType || gap.required_source_type) || "note",
        relatedNoteIds,
        related_note_ids: relatedNoteIds,
        suggestedAction: cleanText(gap.suggestedAction || gap.suggested_action) || "find_supporting_note",
        suggested_action: cleanText(gap.suggestedAction || gap.suggested_action) || "find_supporting_note"
      }
    },
    artifactContext(context, request)
  );
}

export function mergeWritingStrongModelResponse(request = {}, response = {}, context = {}) {
  const privacyMode = cleanText(context.privacyMode || context.privacy_mode || context.privacy?.mode || request.privacy?.mode) || "remote_after_confirmation";
  const localOnly = privacyMode === "local_only";
  const parsed = extractJsonObject(response?.content ?? response?.text ?? response?.output ?? response);
  const writingMoves = Array.isArray(parsed.writingMoves || parsed.writing_moves)
    ? parsed.writingMoves || parsed.writing_moves
    : [];
  const outlineDrafts = Array.isArray(parsed.outlineDrafts || parsed.outline_drafts)
    ? parsed.outlineDrafts || parsed.outline_drafts
    : [];
  const sourceGaps = Array.isArray(parsed.sourceGaps || parsed.source_gaps)
    ? parsed.sourceGaps || parsed.source_gaps
    : [];
  const artifacts = [
    ...writingMoves.map((item, index) => writingMoveArtifact(item, index, request, context)),
    ...outlineDrafts.map((item, index) => outlineArtifact(item, index, request, context)),
    ...sourceGaps.map((item, index) => sourceGapArtifact(item, index, request, context))
  ].filter(Boolean);

  return {
    analysisMode: localOnly ? "local_model_writing" : "remote_strong_model_writing",
    provenance: {
      contentOrigin: "ai_generated",
      modelUsed: true,
      cloudModelUsed: !localOnly,
      userConfirmedRemoteModel: localOnly ? false : true,
      canAutoConfirm: false
    },
    artifacts,
    summary: {
      artifactCount: artifacts.length,
      writingMoveCount: artifacts.filter((item) => item.type === "WritingMove").length,
      outlineDraftCount: artifacts.filter((item) => item.type === "OutlineDraft").length,
      sourceGapCount: artifacts.filter((item) => item.type === "SourceGap").length,
      canAutoConfirm: false
    },
    raw: parsed
  };
}
