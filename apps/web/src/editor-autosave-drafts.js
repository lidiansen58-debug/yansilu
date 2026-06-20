export const AUTO_SAVE_IDLE_MS = 15000;
export const AUTO_SAVE_INTERVAL_MS = 15000;

export function editorDraftKey(noteId) {
  return `yansilu:draft:${noteId}`;
}

export function editorTemplatePreferenceKey(kind = "") {
  const cleanKind = String(kind || "").trim().toLowerCase();
  return `yansilu:template-variant:${cleanKind || "default"}`;
}

export function createEditorDraftPayload(tab, authorshipState = {}, updatedAt = new Date().toISOString()) {
  return {
    noteId: tab?.noteId,
    title: tab?.title,
    body: tab?.body,
    savedTitle: tab?.savedTitle,
    savedBody: tab?.savedBody,
    authorshipClaim: authorshipState?.claim,
    authorshipConfirmed: authorshipState?.confirmed,
    authorshipConfirmedBody: authorshipState?.confirmedBody,
    updatedAt
  };
}

export function parseEditorDraft(raw = "") {
  try {
    const draft = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!draft || typeof draft.body !== "string") return null;
    return draft;
  } catch {
    return null;
  }
}
