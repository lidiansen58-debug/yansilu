import { createLocalDraftNote as createLocalDraftNoteModel } from "./prototype-note-state-helpers.js";

export function createNotePlaceholderRuntime(depsProvider = () => ({})) {
  const deps = () => depsProvider() || {};
  const untitledTitle = () => String(deps().untitledNoteTitle || "未命名笔记");

  function isUntitledTitle(title = "") {
    return String(title || "").trim() === untitledTitle();
  }

  function createLocalDraftNote({ folderId, body }) {
    const current = deps();
    return createLocalDraftNoteModel({ folderId, body }, {
      ensureEditableNoteBody: current.ensureEditableNoteBody,
      generatedOriginalNoteIdFromBody: current.generatedOriginalNoteIdFromBody,
      relationNetworkStatusForNote: current.relationNetworkStatusForNote,
      state: current.state,
      typeFromFolder: current.typeFromFolder,
      uid: current.uid
    });
  }

  function normalizedDefaultUntitledBody(folderId = "") {
    const current = deps();
    return current.ensureEditableNoteBody(current.initialBodyForFolder(folderId)).replace(/\r\n/g, "\n").trim();
  }

  function historicalUntitledTemplateBodies(folderId = "") {
    const current = deps();
    const noteType = String(current.typeFromFolder(current.state, folderId) || "").trim().toLowerCase();
    const kind = noteType === "literature" ? "literature" : noteType === "original" || noteType === "permanent" ? "permanent" : "";
    if (!kind) return [];
    const candidates = current.normalizeNoteTemplateHistory(current.settingsState.noteTemplates[kind]?.history, kind).map((template) =>
      current.applyTitleToNoteTemplate(template, untitledTitle(), kind).replace(/\r\n/g, "\n").trim()
    );
    if (kind === "literature") {
      const rawSavedSource = current.normalizeNoteTemplateSource(current.settingsState.noteTemplates[kind]?.text, kind);
      if (!current.validateLiteratureTemplateSource(rawSavedSource).ok) {
        const rawBody = current.applyTitleToNoteTemplate(rawSavedSource, untitledTitle(), kind).replace(/\r\n/g, "\n").trim();
        if (rawBody && !candidates.includes(rawBody)) candidates.unshift(rawBody);
      }
    }
    return candidates;
  }

  function isEmptyUntitledMarkdown(body = "", folderId = "") {
    const text = String(body || "").replace(/\r\n/g, "\n").trim();
    if (!text) return true;
    const titlePattern = new RegExp(`^#{1,6}\\s*${untitledTitle().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*`, "u");
    if (!text.replace(titlePattern, "").trim()) return true;
    const candidates = [normalizedDefaultUntitledBody(folderId), ...historicalUntitledTemplateBodies(folderId)];
    return candidates.some((candidate) => candidate === text);
  }

  function isUntitledPlaceholderNote(note) {
    const current = deps();
    if (!note) return false;
    const tab = current.noteTabFor(note.id);
    if (tab?.dirty) return false;
    if (!tab && !note.bodyLoaded && !current.isLocalOnlyNote(note)) return false;
    const title = tab?.title || note.title;
    const body = typeof tab?.body === "string" ? tab.body : note.body;
    return isUntitledTitle(title) && isEmptyUntitledMarkdown(body, note.folderId);
  }

  async function ensureNoteLoadedForPlaceholderCheck(note) {
    const current = deps();
    if (!note || note.bodyLoaded || current.isLocalOnlyNote(note)) return note;
    try {
      const full = await current.fetchNote(note.id);
      if (!full) return note;
      Object.assign(note, current.mapNoteItem(full), { bodyLoaded: typeof full.body === "string" });
    } catch {}
    return note;
  }

  async function cleanupDuplicateUntitledPlaceholders(folderId) {
    const current = deps();
    const candidates = current.state.notes.filter((item) => item.folderId === folderId && isUntitledTitle(item.title));
    for (const note of candidates) {
      await ensureNoteLoadedForPlaceholderCheck(note);
    }
    const placeholders = candidates.filter(isUntitledPlaceholderNote);
    if (placeholders.length <= 1) {
      return { kept: placeholders[0] || null, removed: 0 };
    }

    const [kept, ...duplicates] = placeholders;
    const duplicateIds = new Set(duplicates.map((item) => item.id));
    for (const note of duplicates) {
      if (current.isLocalOnlyNote(note)) continue;
      try {
        await current.deleteNote(note.id);
      } catch {}
    }
    current.state.notes = current.state.notes.filter((item) => !duplicateIds.has(item.id));
    current.state.tabs = current.state.tabs.filter((item) => !duplicateIds.has(item.noteId));
    if (current.state.activeTabId && !current.state.tabs.some((item) => item.id === current.state.activeTabId)) {
      current.state.activeTabId = current.state.tabs[0]?.id || null;
    }
    if (duplicateIds.has(current.state.selectedFileId)) {
      current.state.selectedFileId = kept?.id || null;
    }
    return { kept, removed: duplicateIds.size };
  }

  function replaceLocalNoteIdentity(previousNoteId, savedItem) {
    const current = deps();
    const note = current.state.notes.find((item) => item.id === previousNoteId);
    if (!note) return null;
    const mapped = current.mapNoteItem(savedItem);
    Object.assign(note, mapped, { bodyLoaded: true, isLocalOnly: false });

    const previousTabId = `tab_${previousNoteId}`;
    const tab = current.state.tabs.find((item) => item.noteId === previousNoteId);
    if (tab) {
      tab.noteId = note.id;
      tab.id = `tab_${note.id}`;
    }
    if (current.state.activeTabId === previousTabId && tab) {
      current.state.activeTabId = tab.id;
    }
    if (current.state.selectedFileId === previousNoteId) {
      current.state.selectedFileId = note.id;
    }
    if (Array.isArray(current.state.literatureQueueFocusNoteIds) && current.state.literatureQueueFocusNoteIds.length) {
      current.state.literatureQueueFocusNoteIds = current.state.literatureQueueFocusNoteIds.map((item) =>
        item === previousNoteId ? note.id : item
      );
    }
    const basketIds = current.parseWritingBasketIds();
    if (basketIds.includes(previousNoteId)) {
      current.setWritingBasketIds(basketIds.map((item) => (item === previousNoteId ? note.id : item)));
    }
    return note;
  }

  return {
    cleanupDuplicateUntitledPlaceholders,
    createLocalDraftNote,
    ensureNoteLoadedForPlaceholderCheck,
    historicalUntitledTemplateBodies,
    isEmptyUntitledMarkdown,
    isUntitledPlaceholderNote,
    isUntitledTitle,
    normalizedDefaultUntitledBody,
    replaceLocalNoteIdentity
  };
}
