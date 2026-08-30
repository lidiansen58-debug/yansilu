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

  async function findUntitledPlaceholder(folderId, { isCurrent = () => true, signal } = {}) {
    const current = deps();
    const candidates = current.state.notes.filter(note => note.folderId === folderId && isUntitledTitle(note.title));
    for (const candidate of candidates) {
      if (!isCurrent()) return null;
      const expectedBody = candidate.body, expectedTitle = candidate.title, expectedUpdatedAt = candidate.updatedAt;
      const initialTab = current.noteTabFor(candidate.id);
      if (initialTab?.dirty) continue;
      const expectedTabBody = initialTab?.body, expectedTabTitle = initialTab?.title;
      let note = candidate;
      if (!current.isLocalOnlyNote(note)) {
        try {
          const full = await current.fetchNote(note.id, { signal });
          if (!isCurrent()) return null;
          if (!full) continue;
          note = { ...current.mapNoteItem(full), bodyLoaded: typeof full.body === "string" };
        } catch { continue; }
      }
      const latest = current.state.notes.find(item => item.id === candidate.id);
      if (!latest || latest !== candidate || latest.folderId !== folderId || latest.body !== expectedBody || latest.title !== expectedTitle || latest.updatedAt !== expectedUpdatedAt) continue;
      const tab = current.noteTabFor(candidate.id);
      if (tab?.dirty || (initialTab && (tab !== initialTab || tab.body !== expectedTabBody || tab.title !== expectedTabTitle))) continue;
      if (tab?.title && !isUntitledTitle(tab.title)) continue;
      // Reuse only the authoritative body matching today's template, never a stale tab or template history.
      if (isCurrent() && note.folderId === folderId && isUntitledTitle(note.title) && typeof note.body === "string"
        && (note.bodyLoaded || current.isLocalOnlyNote(note))
        && note.body.replace(/\r\n/g, "\n").trim() === normalizedDefaultUntitledBody(folderId)) return note;
    }
    return null;
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
    findUntitledPlaceholder,
    createLocalDraftNote,
    historicalUntitledTemplateBodies,
    isEmptyUntitledMarkdown,
    isUntitledPlaceholderNote,
    isUntitledTitle,
    normalizedDefaultUntitledBody,
    replaceLocalNoteIdentity
  };
}
