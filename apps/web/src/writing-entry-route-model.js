import {
  planWritingBasketEntry,
  resolveWritingEntryTitle,
  resolveWritingSelectedThemeIndexId,
  resolveWritingSourceIndexIds
} from "./writing-center-flow.js";

export function writingBasketContinuationPlan({
  existingNoteIds = [],
  incomingNoteIds = [],
  requestedTitle = "",
  existingTitle = "",
  existingSourceIndexIds = [],
  incomingSourceIndexIds = [],
  preserveSourceIndexIds = true,
  currentSelectedThemeIndexId = ""
} = {}) {
  const basketPlan = planWritingBasketEntry({
    existingNoteIds,
    incomingNoteIds
  });
  if (!basketPlan.basketNoteIds.length) return null;
  const nextSourceIndexIds = resolveWritingSourceIndexIds({
    existingSourceIndexIds,
    incomingSourceIndexIds,
    preserveExisting: preserveSourceIndexIds
  });
  return {
    ...basketPlan,
    resolvedTitle: resolveWritingEntryTitle({
      entryMode: basketPlan.entryMode,
      requestedTitle,
      existingTitle
    }),
    nextSourceIndexIds,
    selectedThemeIndexId: resolveWritingSelectedThemeIndexId({
      currentSelectedThemeIndexId,
      nextSourceIndexIds
    })
  };
}

export function writingProjectContinuationRoute({
  projectId = "",
  project = null,
  openDraft = false,
  statusMessage = ""
} = {}) {
  const cleanProjectId = String(projectId || project?.id || "").trim();
  const cleanStatusMessage = String(statusMessage || "").trim();
  if (!cleanProjectId) {
    return {
      kind: "invalid-project",
      handled: false,
      projectId: "",
      errorMessage: "writing project id is required"
    };
  }
  if (openDraft) {
    const draftNoteId = String(project?.draft_note_id || "").trim();
    if (!draftNoteId) {
      return {
        kind: "missing-draft",
        handled: false,
        projectId: cleanProjectId,
        draftNoteId: "",
        errorMessage: "current project has no draft note"
      };
    }
    return {
      kind: "open-draft",
      handled: true,
      projectId: cleanProjectId,
      draftNoteId,
      statusMessage: cleanStatusMessage || `已打开当前草稿：${draftNoteId}`
    };
  }
  return {
    kind: "resume-project",
    handled: true,
    projectId: cleanProjectId,
    draftNoteId: "",
    statusMessage: cleanStatusMessage || `已继续当前主题：${cleanProjectId}`
  };
}
