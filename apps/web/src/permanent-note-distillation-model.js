import { normalizeDistillationTemplateVariants } from "./editor-relation-helpers.js";

export function emptyPermanentNoteDistillationPrefill(noteId = "") {
  return {
    noteId: String(noteId || "").trim(),
    boundaryDraft: "",
    draftVariants: [],
    selectedTemplateVariant: "",
    rememberedTemplateVariantLabel: ""
  };
}

export function normalizePermanentNoteDistillationPrefill(noteId = "", options = {}, deps = {}) {
  const cleanNoteId = String(noteId || "").trim();
  if (!cleanNoteId) return emptyPermanentNoteDistillationPrefill("");

  const normalized = normalizeDistillationTemplateVariants(
    options?.draftVariants || [],
    deps.preferredTemplateVariant || options?.selectedTemplateVariant || ""
  );
  const rememberedTemplateVariant = deps.rememberedTemplateVariant || { key: "", label: "" };

  return {
    noteId: cleanNoteId,
    boundaryDraft: String(options?.boundaryDraft || "").trim(),
    draftVariants: normalized.items,
    selectedTemplateVariant: normalized.selectedKey,
    rememberedTemplateVariantLabel:
      rememberedTemplateVariant.key && rememberedTemplateVariant.key === normalized.selectedKey
        ? rememberedTemplateVariant.label
        : ""
  };
}

export function currentPermanentNoteDistillationPrefill(state = null, noteId = "") {
  const cleanNoteId = String(noteId || "").trim();
  if (!cleanNoteId || !state || state.noteId !== cleanNoteId) {
    return emptyPermanentNoteDistillationPrefill(cleanNoteId);
  }
  return state;
}

export function permanentNoteDistillationStatus(selectedStatus = "", values = {}) {
  const cleanStatus = String(selectedStatus || "").trim();
  if (["missing", "draft", "confirmed"].includes(cleanStatus)) return cleanStatus;
  return values.thesis || values.threeLineSummary?.length ? "draft" : "missing";
}

export function permanentNoteDistillationFormValues(form) {
  const thesis = String(form?.querySelector?.('[name="thesis"]')?.value || "").trim();
  const threeLineSummary = [1, 2, 3]
    .map((idx) => String(form?.querySelector?.(`[name="summary${idx}"]`)?.value || "").trim())
    .filter(Boolean);
  const boundaryOrCounterpoint = String(form?.querySelector?.('[name="boundaryOrCounterpoint"]')?.value || "").trim();
  const selectedStatus = String(form?.querySelector?.('[name="distillationStatus"]')?.value || "").trim();

  return {
    thesis,
    threeLineSummary,
    boundaryOrCounterpoint,
    distillationStatus: permanentNoteDistillationStatus(selectedStatus, {
      thesis,
      threeLineSummary
    })
  };
}

export function applyPermanentNoteDistillationToNote(note, values = {}, options = {}) {
  if (!note) return;
  note.thesis = String(values.thesis || "").trim();
  note.threeLineSummary = Array.isArray(values.threeLineSummary) ? values.threeLineSummary : [];
  note.boundaryOrCounterpoint = String(values.boundaryOrCounterpoint || "").trim();
  if (values.distillationStatus) note.distillationStatus = values.distillationStatus;
  if (options.confirmAuthorship) {
    note.authorship = {
      ...(note.authorship || {}),
      user_confirmed: true,
      ai_assisted: Boolean(note.authorship?.ai_assisted)
    };
  }
}
