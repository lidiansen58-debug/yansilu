export function normalizeNoteTemplateSettingsKind(kind = "") {
  return String(kind || "").trim().toLowerCase() === "literature" ? "literature" : "permanent";
}

export function noteTemplateSettingsCapitalizedKind(kind = "") {
  return normalizeNoteTemplateSettingsKind(kind) === "literature" ? "Literature" : "Permanent";
}

export function buildNoteTemplateSettingsCardModel(kind = "", deps = {}) {
  const cleanKind = normalizeNoteTemplateSettingsKind(kind);
  const {
    stateEntry = null,
    defaultTemplateSourceForKind = () => "",
    noteTemplateCardCopy = () => ({
      stats: [],
      summaryOpen: "",
      statusClosed: ""
    }),
    normalizeStoredNoteTemplateSource = (value = "") => String(value || ""),
    normalizeDraftBuffer = (value = "") => String(value || ""),
    normalizeNoteTemplateSource = (value = "") => String(value || ""),
    noteTemplateDraftValidation = () => ({ ok: true, message: "" })
  } = deps;
  const resolvedEntry = stateEntry || {
    text: defaultTemplateSourceForKind(cleanKind),
    draftText: defaultTemplateSourceForKind(cleanKind),
    draftActive: false,
    feedbackTone: "",
    feedbackText: ""
  };
  const copy = noteTemplateCardCopy(cleanKind);
  const savedSource = normalizeStoredNoteTemplateSource(resolvedEntry.text, cleanKind);
  const draftSource = normalizeDraftBuffer(resolvedEntry.draftText || "");
  const visibleSource = resolvedEntry.draftActive === true ? draftSource : savedSource;
  const validation = noteTemplateDraftValidation(cleanKind, normalizeNoteTemplateSource(visibleSource, cleanKind));
  const draftBadgeText = !validation.ok
    ? "当前草稿不可保存"
    : resolvedEntry.draftActive
      ? copy.statusClosed
      : "已保存";
  const feedbackText = String(resolvedEntry.feedbackText || "").trim();

  return {
    cleanKind,
    capitalizedKind: noteTemplateSettingsCapitalizedKind(cleanKind),
    visibleSource,
    saveDisabled: !validation.ok,
    saveTitle: validation.ok ? "" : validation.message,
    statsBadges: [
      { text: copy.stats?.[0] || "", tone: "ok" },
      { text: copy.stats?.[1] || "", tone: "" },
      { text: draftBadgeText, tone: validation.ok ? (resolvedEntry.draftActive ? "warn" : "ok") : "warn" }
    ],
    summaryText: validation.ok
      ? copy.summaryOpen
      : `${copy.summaryOpen} 当前草稿还不能保存：${validation.message}`,
    feedback: {
      visible: Boolean(feedbackText),
      ok: resolvedEntry.feedbackTone === "ok",
      warn: resolvedEntry.feedbackTone === "warn",
      text: feedbackText
    }
  };
}
