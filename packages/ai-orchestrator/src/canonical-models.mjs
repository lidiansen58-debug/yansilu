import { toAiInboxItem } from "./artifact-inbox.mjs";
import { normalizeArtifact } from "./artifacts.mjs";
import { normalizeScheduledAgentTask } from "./scheduled-agent-tasks.mjs";
import { normalizeSuggestion } from "./suggestions.mjs";

function cleanText(value) {
  return String(value || "").trim();
}

function clone(value) {
  return JSON.parse(JSON.stringify(value ?? null));
}

function normalizeFeedback(feedback = {}) {
  return {
    useful: feedback.useful === true,
    noisy: feedback.noisy === true,
    wrong: feedback.wrong === true,
    already_known: feedback.alreadyKnown === true || feedback.already_known === true,
    privacy_concern: feedback.privacyConcern === true || feedback.privacy_concern === true
  };
}

function canonicalDecision(decision = {}, fallbackArtifactId = "") {
  return {
    decision_id: cleanText(decision.decisionId || decision.decision_id),
    artifact_id: cleanText(decision.artifactId || decision.artifact_id || fallbackArtifactId),
    decision: cleanText(decision.decision),
    user_id: cleanText(decision.userId || decision.user_id),
    note_id: cleanText(decision.noteId || decision.note_id),
    comment: cleanText(decision.comment),
    feedback: normalizeFeedback(decision.feedback || {}),
    created_at: cleanText(decision.createdAt || decision.created_at)
  };
}

function canonicalConfidence(confidence = {}) {
  return {
    score: typeof confidence?.score === "number" ? confidence.score : null,
    label: cleanText(confidence?.label) || "medium",
    reason: cleanText(confidence?.reason)
  };
}

export function artifactToCanonical(input = {}, context = {}) {
  const artifact = normalizeArtifact(input, context);
  const fieldSuggestionId = cleanText(
    artifact.payload?.fieldSuggestionId ||
      artifact.payload?.field_suggestion_id ||
      artifact.payload?.fieldSuggestion?.id ||
      artifact.payload?.field_suggestion?.id
  );
  return {
    id: artifact.id,
    type: artifact.type,
    title: artifact.title,
    summary: cleanText(artifact.summary),
    body: clone(artifact.body),
    status: artifact.status,
    origin: cleanText(artifact.origin),
    created_at: cleanText(artifact.createdAt || artifact.created_at),
    updated_at: cleanText(artifact.updatedAt || artifact.updated_at),
    agent_run_id: cleanText(artifact.agentRunId || artifact.agent_run_id),
    context_pack_id: cleanText(artifact.contextPackId || artifact.context_pack_id),
    model: clone(artifact.model),
    sources: {
      note_ids: Array.isArray(artifact.sources?.noteIds) ? [...artifact.sources.noteIds] : [],
      source_doc_ids: Array.isArray(artifact.sources?.sourceDocIds) ? [...artifact.sources.sourceDocIds] : [],
      artifact_ids: Array.isArray(artifact.sources?.artifactIds) ? [...artifact.sources.artifactIds] : [],
      external_urls: Array.isArray(artifact.sources?.externalUrls) ? [...artifact.sources.externalUrls] : []
    },
    provenance: {
      content_origin: cleanText(artifact.provenance?.contentOrigin || artifact.provenance?.content_origin) || "ai_generated",
      citation_required: artifact.provenance?.citationRequired === true || artifact.provenance?.citation_required === true,
      human_accepted: artifact.provenance?.humanAccepted === true || artifact.provenance?.human_accepted === true,
      human_rewritten: artifact.provenance?.humanRewritten === true || artifact.provenance?.human_rewritten === true
    },
    confidence: canonicalConfidence(artifact.confidence || {}),
    privacy: {
      mode: cleanText(artifact.privacy?.mode) || "normal",
      cloud_model_used: artifact.privacy?.cloudModelUsed === true || artifact.privacy?.cloud_model_used === true
    },
    ...(fieldSuggestionId ? { field_suggestion_id: fieldSuggestionId } : {}),
    user_decisions: Array.isArray(artifact.userDecisions) ? artifact.userDecisions.map((decision) => canonicalDecision(decision, artifact.id)) : [],
    payload: clone(artifact.payload || {})
  };
}

export function aiInboxItemToCanonical(input = {}) {
  const item = Object.prototype.hasOwnProperty.call(input, "artifactId") ? clone(input) : toAiInboxItem(input);
  return {
    artifact_id: cleanText(item.artifactId || item.artifact_id),
    type: cleanText(item.type),
    title: cleanText(item.title),
    summary: cleanText(item.summary),
    status: cleanText(item.status),
    action_state: cleanText(item.actionState || item.action_state),
    origin: cleanText(item.origin),
    privacy_mode: cleanText(item.privacyMode || item.privacy_mode) || "normal",
    created_at: cleanText(item.createdAt || item.created_at),
    updated_at: cleanText(item.updatedAt || item.updated_at),
    agent_run_id: cleanText(item.agentRunId || item.agent_run_id),
    context_pack_id: cleanText(item.contextPackId || item.context_pack_id),
    primary_source_note_id: cleanText(item.primarySourceNoteId || item.primary_source_note_id),
    source_note_ids: Array.isArray(item.sourceNoteIds || item.source_note_ids) ? [...(item.sourceNoteIds || item.source_note_ids)] : [],
    source_doc_ids: Array.isArray(item.sourceDocIds || item.source_doc_ids) ? [...(item.sourceDocIds || item.source_doc_ids)] : [],
    suggestion_id: cleanText(item.suggestionId || item.suggestion_id),
    decision_count: Number(item.decisionCount || item.decision_count || 0) || 0,
    latest_decision: item.latestDecision ? canonicalDecision(item.latestDecision, item.artifactId || item.artifact_id) : null,
    confidence: item.confidence ? canonicalConfidence(item.confidence) : null
  };
}

function canonicalSuggestionFallback(input = {}, context = {}) {
  const target = input.target && typeof input.target === "object" ? input.target : {};
  const provenance = input.provenance && typeof input.provenance === "object" ? input.provenance : {};
  const history = Array.isArray(input.history) ? input.history : Array.isArray(input.transitions) ? input.transitions : [];
  return {
    id: cleanText(input.id),
    target: {
      type: cleanText(target.type || target.kind || input.targetType || input.target_type || input.targetKind || input.target_kind),
      id: cleanText(target.id || input.targetId || input.target_id),
      ...(cleanText(target.field || input.targetField || input.target_field)
        ? { field: cleanText(target.field || input.targetField || input.target_field) }
        : {})
    },
    scope: cleanText(input.scope || context.scope),
    content: clone(input.content),
    status: cleanText(input.status || context.status || "suggested"),
    origin: cleanText(input.origin || context.origin) || "ai_generated",
    created_at: cleanText(input.createdAt || input.created_at || context.now),
    updated_at: cleanText(input.updatedAt || input.updated_at || context.now),
    model: clone(input.model || context.model || null),
    ...(cleanText(input.sourceArtifactId || input.source_artifact_id || context.sourceArtifactId || context.source_artifact_id)
      ? { source_artifact_id: cleanText(input.sourceArtifactId || input.source_artifact_id || context.sourceArtifactId || context.source_artifact_id) }
      : {}),
    provenance: {
      content_origin: cleanText(provenance.contentOrigin || provenance.content_origin) || "ai_generated",
      human_confirmed: provenance.humanConfirmed === true || provenance.human_confirmed === true,
      human_edited: provenance.humanEdited === true || provenance.human_edited === true
    },
    history: history.map((item) => ({
      from_status: cleanText(item.fromStatus || item.from_status),
      to_status: cleanText(item.toStatus || item.to_status),
      action: cleanText(item.action),
      actor: cleanText(item.actor),
      user_id: cleanText(item.userId || item.user_id),
      comment: cleanText(item.comment),
      created_at: cleanText(item.createdAt || item.created_at)
    }))
  };
}

export function suggestionToCanonical(input = {}, context = {}) {
  try {
    const suggestion = normalizeSuggestion(input, context);
    return canonicalSuggestionFallback(suggestion, context);
  } catch (error) {
    if (error?.code !== "AI_SUGGESTION_TARGET_REQUIRED") throw error;
    return canonicalSuggestionFallback(input, context);
  }
}

export function scheduledTaskToCanonical(input = {}, existing = {}) {
  const task = normalizeScheduledAgentTask(input, existing);
  return {
    scheduled_task_id: cleanText(task.scheduledTaskId || task.scheduled_task_id),
    workspace_id: cleanText(task.workspaceId || task.workspace_id),
    user_id: cleanText(task.userId || task.user_id),
    name: cleanText(task.name),
    status: cleanText(task.status),
    task_type: cleanText(task.taskType || task.task_type),
    agent_id: cleanText(task.agentId || task.agent_id),
    schedule: {
      type: cleanText(task.schedule?.type) || "manual_only",
      timezone: cleanText(task.schedule?.timezone) || "local",
      day_of_week: cleanText(task.schedule?.dayOfWeek || task.schedule?.day_of_week),
      time: cleanText(task.schedule?.time),
      interval_minutes: Number(task.schedule?.intervalMinutes || task.schedule?.interval_minutes || 0) || 0,
      interval_hours: Number(task.schedule?.intervalHours || task.schedule?.interval_hours || 0) || 0,
      interval_days: Number(task.schedule?.intervalDays || task.schedule?.interval_days || 0) || 0,
      rrule: cleanText(task.schedule?.rrule)
    },
    scope: {
      project_ids: Array.isArray(task.scope?.projectIds || task.scope?.project_ids) ? [...(task.scope?.projectIds || task.scope?.project_ids)] : [],
      note_ids: Array.isArray(task.scope?.noteIds || task.scope?.note_ids) ? [...(task.scope?.noteIds || task.scope?.note_ids)] : [],
      directory_ids: Array.isArray(task.scope?.directoryIds || task.scope?.directory_ids) ? [...(task.scope?.directoryIds || task.scope?.directory_ids)] : [],
      tags: Array.isArray(task.scope?.tags) ? [...task.scope.tags] : [],
      source_feed_ids: Array.isArray(task.scope?.sourceFeedIds || task.scope?.source_feed_ids) ? [...(task.scope?.sourceFeedIds || task.scope?.source_feed_ids)] : [],
      keywords: Array.isArray(task.scope?.keywords) ? [...task.scope.keywords] : [],
      include_private_notes: task.scope?.includePrivateNotes === true || task.scope?.include_private_notes === true
    },
    model: {
      user_mode: cleanText(task.model?.userMode || task.model?.user_mode) || "Auto",
      model_pack: cleanText(task.model?.modelPack || task.model?.model_pack),
      max_tier: cleanText(task.model?.maxTier || task.model?.max_tier) || "standard",
      allow_strong_reasoning: task.model?.allowStrongReasoning === true || task.model?.allow_strong_reasoning === true
    },
    budget: {
      max_runs_per_period: Number(task.budget?.maxRunsPerPeriod ?? task.budget?.max_runs_per_period ?? 1) || 1,
      max_estimated_cost_per_run: task.budget?.maxEstimatedCostPerRun ?? task.budget?.max_estimated_cost_per_run ?? null,
      max_estimated_cost_per_period: task.budget?.maxEstimatedCostPerPeriod ?? task.budget?.max_estimated_cost_per_period ?? null,
      period: cleanText(task.budget?.period) || "week",
      spent_this_period: Number(task.budget?.spentThisPeriod ?? task.budget?.spent_this_period ?? 0) || 0,
      runs_this_period: Number(task.budget?.runsThisPeriod ?? task.budget?.runs_this_period ?? 0) || 0
    },
    privacy: {
      mode: cleanText(task.privacy?.mode) || "normal",
      allow_cloud_models: task.privacy?.allowCloudModels !== false && task.privacy?.allow_cloud_models !== false,
      require_confirmation_for_private_notes:
        task.privacy?.requireConfirmationForPrivateNotes !== false && task.privacy?.require_confirmation_for_private_notes !== false
    },
    output: {
      destination: cleanText(task.output?.destination) || "ai_inbox",
      artifact_types: Array.isArray(task.output?.artifactTypes || task.output?.artifact_types) ? [...(task.output?.artifactTypes || task.output?.artifact_types)] : [],
      notify_user: cleanText(task.output?.notifyUser || task.output?.notify_user) || "only_if_high_signal"
    },
    run_input: clone(task.runInput || task.run_input || null),
    failure_count: Number(task.failureCount ?? task.failure_count ?? 0) || 0,
    last_run_at: cleanText(task.lastRunAt || task.last_run_at),
    last_run_status: cleanText(task.lastRunStatus || task.last_run_status),
    last_run_reason: cleanText(task.lastRunReason || task.last_run_reason),
    last_agent_run_id: cleanText(task.lastAgentRunId || task.last_agent_run_id),
    next_run_at: cleanText(task.nextRunAt || task.next_run_at),
    created_at: cleanText(task.createdAt || task.created_at),
    updated_at: cleanText(task.updatedAt || task.updated_at)
  };
}

export function artifactDecisionToCanonicalAdoptionEvent(input = {}, artifact = {}, context = {}) {
  const decision = canonicalDecision(input, artifact.id || input.artifactId || input.artifact_id);
  const target = context.target && typeof context.target === "object" ? context.target : {};
  const metadata = context.metadata && typeof context.metadata === "object" ? context.metadata : {};
  return {
    adoption_event_id: cleanText(input.decisionId || input.decision_id) || cleanText(input.id),
    subject_kind: "artifact",
    subject_id: cleanText(decision.artifact_id),
    event_type: cleanText(decision.decision),
    actor_type: cleanText(input.actorType || input.actor_type) || "user",
    actor_id: cleanText(decision.user_id),
    target: {
      kind: cleanText(target.kind || target.type || input.targetKind || input.target_kind || "note"),
      id: cleanText(target.id || decision.note_id),
      field: cleanText(target.field || input.targetField || input.target_field)
    },
    comment: cleanText(decision.comment),
    feedback: normalizeFeedback(decision.feedback || {}),
    metadata: {
      from_status: cleanText(metadata.fromStatus || metadata.from_status || input.fromStatus || input.from_status || artifact.status),
      to_status: cleanText(metadata.toStatus || metadata.to_status || decision.decision),
      note_id: cleanText(metadata.noteId || metadata.note_id || decision.note_id)
    },
    created_at: cleanText(decision.created_at)
  };
}

export function suggestionTransitionToCanonicalAdoptionEvent(input = {}, suggestion = {}) {
  return {
    adoption_event_id: cleanText(input.id || input.transitionId || input.transition_id) || `${cleanText(suggestion.id)}:${cleanText(input.createdAt || input.created_at)}`,
    subject_kind: "suggestion",
    subject_id: cleanText(suggestion.id),
    event_type: cleanText(input.toStatus || input.to_status),
    actor_type: cleanText(input.actor) || "user",
    actor_id: cleanText(input.userId || input.user_id),
    target: {
      kind: cleanText(suggestion.target?.type),
      id: cleanText(suggestion.target?.id),
      field: cleanText(suggestion.target?.field)
    },
    comment: cleanText(input.comment),
    feedback: normalizeFeedback(input.feedback || {}),
    metadata: {
      from_status: cleanText(input.fromStatus || input.from_status),
      to_status: cleanText(input.toStatus || input.to_status),
      note_id: cleanText(input.noteId || input.note_id || suggestion.target?.id)
    },
    created_at: cleanText(input.createdAt || input.created_at)
  };
}
