import { uniqueStrings } from "./prototype-collection-utils.js";
import { deriveWritingProjectIntent, deriveWritingProjectTakeaway } from "./prototype-note-state-helpers.js";

export function writingProjectFormInput({
  title = "",
  goal = "",
  audience = "",
  tone = ""
} = {}) {
  return { title: String(title || "").trim(), goal: String(goal || "").trim(), audience: String(audience || "").trim(), tone: String(tone || "").trim() };
}

export function currentBasketWritingProjectPlan({
  form = {},
  basketNoteIds = [],
  relatedIndexIds = [],
  existingProject = null,
  bookStructure = null
} = {}) {
  const input = writingProjectFormInput(form);
  const cleanBasketNoteIds = uniqueStrings(basketNoteIds);
  if (existingProject?.id) {
    return { ok: false, reason: "existing_project", project: existingProject };
  }
  if (!input.title) {
    return { ok: false, reason: "missing_title" };
  }
  if (!cleanBasketNoteIds.length) {
    return { ok: false, reason: "missing_basket" };
  }
  return {
    ok: true,
    payload: {
      title: input.title,
      goal: input.goal,
      audience: input.audience,
      tone: input.tone,
      intent: deriveWritingProjectIntent({ title: input.title, goal: input.goal }),
      desiredReaderTakeaway: deriveWritingProjectTakeaway({
        title: input.title,
        goal: input.goal,
        audience: input.audience
      }),
      basketNoteIds: cleanBasketNoteIds,
      relatedIndexIds: uniqueStrings(relatedIndexIds),
      bookStructure
    }
  };
}

export function importedPermanentNotesWritingProjectPlan({
  noteIds = [],
  title = "",
  form = {},
  entryPlan = null
} = {}) {
  const cleanNoteIds = uniqueStrings(noteIds);
  if (!cleanNoteIds.length) {
    return { ok: false, reason: "missing_imported_permanent_notes" };
  }
  const input = writingProjectFormInput({ ...form, title });
  return {
    ok: true,
    entryPlan,
    payload: {
      title: input.title,
      goal: input.goal,
      audience: input.audience,
      tone: input.tone,
      intent: deriveWritingProjectIntent({ title: input.title, goal: input.goal }),
      desiredReaderTakeaway: deriveWritingProjectTakeaway({
        title: input.title,
        goal: input.goal,
        audience: input.audience
      }),
      basketNoteIds: cleanNoteIds
    }
  };
}

export function writingStrongModelAnalysisPlan({
  noteIds = [],
  project = null,
  form = {},
  confirmed = true
} = {}) {
  const cleanNoteIds = uniqueStrings(noteIds);
  if (!cleanNoteIds.length) {
    return { ok: false, reason: "missing_basket" };
  }
  if (!project?.id) {
    return { ok: false, reason: "missing_project" };
  }
  if (!confirmed) {
    return { ok: false, reason: "cancelled" };
  }
  const input = writingProjectFormInput({
    goal: form.goal || project.goal || "",
    audience: form.audience || project.audience || ""
  });
  return {
    ok: true,
    request: {
      userConfirmedRemoteModel: true,
      projectId: String(project.id || "").trim(),
      writingGoal: input.goal,
      audience: input.audience,
      noteIds: cleanNoteIds,
      persistArtifacts: true
    }
  };
}

export function writingStrongModelResultMeta(result = null) {
  return {
    model: result?.request?.model?.model || "strong_model",
    artifactCount: Number(
      result?.result?.storedArtifactIds?.length ||
        result?.result?.summary?.artifactCount ||
        result?.result?.artifacts?.length ||
        0
    )
  };
}
