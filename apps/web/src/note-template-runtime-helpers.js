import { NOTE_TEMPLATE_STORAGE_KEYS } from "./prototype-note-templates.js";

export function loadNoteTemplateSettingsFromStorageForRuntime(deps = {}) {
  const {
    settingsState = {},
    noteTemplateStorageScope = () => "global",
    noteTemplateStorageKey = () => "",
    readStoredText = () => "",
    writeStoredText = () => {},
    normalizeStoredNoteTemplateSource = (value) => String(value || ""),
    normalizeDraftBuffer = (value) => String(value || ""),
    normalizeNoteTemplateHistory = (value) => Array.isArray(value) ? value : []
  } = deps;
  const scope = noteTemplateStorageScope();
  for (const kind of ["permanent", "literature"]) {
    const entry = settingsState.noteTemplates?.[kind] || {};
    const savedTextBeforeLoad = normalizeStoredNoteTemplateSource(entry.text, kind);
    const rawDraftTextBeforeLoad = normalizeDraftBuffer(entry.draftText || "");
    const draftTextBeforeLoad = rawDraftTextBeforeLoad.trim()
      ? normalizeStoredNoteTemplateSource(rawDraftTextBeforeLoad, kind)
      : rawDraftTextBeforeLoad;
    const hasUnsavedDraft =
      String(entry.scope || "") === scope &&
      entry.draftActive === true &&
      draftTextBeforeLoad !== normalizeDraftBuffer(savedTextBeforeLoad);
    const scopedKey = noteTemplateStorageKey(kind);
    const scopedHistoryKey = noteTemplateStorageKey(kind, { suffix: "history" });
    const legacyKey = NOTE_TEMPLATE_STORAGE_KEYS[kind];
    const legacyHistoryKey = `${legacyKey}:history`;
    const scopedText = readStoredText(scopedKey, "");
    const legacyText = readStoredText(legacyKey, "");
    const scopedHistory = readStoredText(scopedHistoryKey, "");
    const legacyHistory = readStoredText(legacyHistoryKey, "");
    const shouldMigrateLegacy = scope !== "global" && !String(scopedText || "").trim() && String(legacyText || "").trim();
    const resolvedText = shouldMigrateLegacy ? legacyText : scopedText || (scope === "global" ? legacyText : "");
    const resolvedHistory = shouldMigrateLegacy ? legacyHistory : scopedHistory || (scope === "global" ? legacyHistory : "");
    const normalizedText = normalizeStoredNoteTemplateSource(resolvedText, kind);
    settingsState.noteTemplates[kind].text = normalizedText;
    settingsState.noteTemplates[kind].scope = scope;
    if (!hasUnsavedDraft) {
      settingsState.noteTemplates[kind].draftText = normalizedText;
      settingsState.noteTemplates[kind].draftActive = false;
    }
    let parsedHistory = [];
    try {
      parsedHistory = resolvedHistory ? JSON.parse(resolvedHistory) : [];
    } catch {}
    settingsState.noteTemplates[kind].history = normalizeNoteTemplateHistory(parsedHistory, kind);
    if (shouldMigrateLegacy) {
      writeStoredText(scopedKey, normalizedText);
      writeStoredText(scopedHistoryKey, JSON.stringify(settingsState.noteTemplates[kind].history));
    }
  }
  return settingsState.noteTemplates;
}

export function untitledPlaceholderRefreshPlan(note = null, deps = {}) {
  const {
    noteTabFor = () => null,
    isUntitledTitle = () => false,
    normalizedDefaultUntitledBody = () => "",
    ensureEditableNoteBody = (value) => String(value || ""),
    isEmptyUntitledMarkdown = () => false,
    initialBodyForFolder = () => ""
  } = deps;
  if (!note || !isUntitledTitle(note.title)) return { shouldRefresh: false, note };
  const tab = noteTabFor(note.id);
  const currentBody = normalizedDefaultUntitledBody(note.folderId);
  const existingBody = ensureEditableNoteBody(typeof tab?.body === "string" ? tab.body : note.body).replace(/\r\n/g, "\n").trim();
  if (!existingBody || existingBody === currentBody || !isEmptyUntitledMarkdown(existingBody, note.folderId)) {
    return { shouldRefresh: false, note };
  }
  return {
    shouldRefresh: true,
    note,
    tab,
    nextBody: ensureEditableNoteBody(initialBodyForFolder(note.folderId))
  };
}

export function applyLocalUntitledPlaceholderRefresh(note = {}, tab = null, nextBody = "", deps = {}) {
  const {
    parseTags = () => [],
    parseLinks = () => []
  } = deps;
  note.body = nextBody;
  note.bodyLoaded = true;
  note.tags = parseTags(nextBody);
  note.links = parseLinks(nextBody);
  note.updatedAt = new Date().toISOString();
  if (tab) {
    tab.body = nextBody;
    tab.savedBody = nextBody;
    tab.dirty = false;
  }
  return note;
}

export async function refreshUntitledPlaceholderForRuntime(note = null, deps = {}) {
  const {
    isLocalOnlyNote = () => false,
    updateNote = async () => null,
    mapNoteItem = (value) => value,
    setStatus = () => {}
  } = deps;
  const plan = untitledPlaceholderRefreshPlan(note, deps);
  if (!plan.shouldRefresh) return note;
  if (isLocalOnlyNote(note)) {
    return applyLocalUntitledPlaceholderRefresh(note, plan.tab, plan.nextBody, deps);
  }
  try {
    const updated = await updateNote(note.id, {
      title: note.title,
      body: plan.nextBody,
      status: note.status || "draft",
      generatedOriginalNoteId: note.generatedOriginalNoteId || undefined,
      originalityStatus: note.originalityStatus || undefined,
      originalitySimilarity: note.originalitySimilarity ?? undefined
    });
    if (updated) {
      Object.assign(note, mapNoteItem(updated), { bodyLoaded: true });
      if (plan.tab) {
        plan.tab.body = note.body;
        plan.tab.savedBody = note.body;
        plan.tab.title = note.title;
        plan.tab.savedTitle = note.title;
        plan.tab.dirty = false;
      }
    }
  } catch (error) {
    setStatus(`未命名占位模板刷新失败，仍打开旧内容：${String(error?.message || error)}`, "warn");
  }
  return note;
}
