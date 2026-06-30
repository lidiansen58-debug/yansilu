export function graphWorkflowSelectionForNote(noteId = "", route = {}, edges = []) {
  const cleanNoteId = String(noteId || "").trim();
  if (!cleanNoteId) return null;
  const requestedKind = String(route.graphSelectionKind || route.selectionKind || "").trim().toLowerCase();
  const directEdges = Array.isArray(edges) ? edges : [];
  const hasDirectEdge = directEdges.some(
    (edge) => String(edge?.fromNoteId || "").trim() === cleanNoteId || String(edge?.toNoteId || "").trim() === cleanNoteId
  );
  if (requestedKind === "isolated" && !hasDirectEdge) return { kind: "isolated", noteId: cleanNoteId };
  if (requestedKind === "node" || hasDirectEdge) return { kind: "node", nodeId: cleanNoteId };
  return { kind: "isolated", noteId: cleanNoteId };
}

export function normalizeSystemMessageNoteTitle(value = "") {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

export function systemMessageWorkflowNoteTitles(message = {}, { notes = [], systemMessageSubjectText = () => "" } = {}) {
  const titles = [];
  const pushTitle = (value = "") => {
    const title = normalizeSystemMessageNoteTitle(value);
    if (title && !titles.includes(title)) titles.push(title);
  };
  pushTitle(String(message.body || "").match(/“([^”]+)”/)?.[1] || "");
  pushTitle(systemMessageSubjectText(message, notes));
  const title = String(message.title || "").trim();
  pushTitle(
    title.replace(
      /\s*(还没有进入图谱|还没关联|发现了潜在关联|找到可能关系|产生了待确认建议|有待确认建议|适合生成永久笔记|可以继续整理成主题|需要处理|待关联|待确认)\s*$/u,
      ""
    )
  );
  return titles;
}

export function createRecordPermanentWorkflowOpener(deps = {}) {
  const {
    getRecordPermanentButton = () => null,
    setStatus = () => {},
    setTimeout = (callback, delay) => globalThis.setTimeout?.(callback, delay),
    now = () => Date.now()
  } = deps && typeof deps === "object" ? deps : {};

  return async function openRecordPermanentWorkflowFromCurrentNote(options = {}) {
    const timeoutMs = Number.isFinite(options.timeoutMs) ? Math.max(0, options.timeoutMs) : 600;
    const intervalMs = Number.isFinite(options.intervalMs) ? Math.max(10, options.intervalMs) : 50;
    const startedAt = now();
    while (now() - startedAt <= timeoutMs) {
      const button = getRecordPermanentButton();
      if (button && !button.disabled) {
        button.click?.();
        return true;
      }
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
    setStatus("当前笔记暂时不能创建永久笔记", "warn", { requireModule: "explorer" });
    return false;
  };
}

export function createSystemMessageWorkflowOpener(deps = {}) {
  const {
    getNotes = () => [],
    setNotes = () => {},
    ensureNotesLoaded = async () => {},
    searchNotes = null,
    mapNoteItem = (item) => item,
    systemMessageSubjectText = () => "",
    closeSystemMessages = () => {},
    selectWritingThemeIndex = async () => null,
    isWritingEligibleNote = () => false,
    writingKnownNoteById = () => null,
    continueWritingEntry = () => {},
    suggestedWritingProjectTitle = () => "",
    openWritingModule = async () => false,
    setStatus = () => {},
    handleStateChange = async () => false,
    getGraphEdges = () => [],
    setGraphSelection = () => {},
    renderGraphPanel = () => {},
    openNoteRelationEditor = () => false,
    openGraphFollowupNote = () => false,
    activateModule = () => {},
    openNoteById = () => false,
    openRecordPermanentWorkflowFromCurrentNote = async () => false
  } = deps && typeof deps === "object" ? deps : {};

  const currentNotes = () => {
    const notes = getNotes();
    return Array.isArray(notes) ? notes : [];
  };

  const resolveSystemMessageWorkflowNoteId = async (message = {}) => {
    const requestedIds = [
      message.noteId,
      message.sourceNoteId,
      message.targetNoteId
    ].map((id) => String(id || "").trim()).filter(Boolean);
    for (const noteId of requestedIds) {
      if (!currentNotes().some((note) => note.id === noteId)) await ensureNotesLoaded([noteId]);
      if (currentNotes().some((note) => note.id === noteId)) return noteId;
    }

    const titleCandidates = systemMessageWorkflowNoteTitles(message, {
      notes: currentNotes(),
      systemMessageSubjectText
    });
    for (const title of titleCandidates) {
      const loaded = currentNotes().find((note) => normalizeSystemMessageNoteTitle(note?.title) === title);
      if (loaded?.id) return String(loaded.id);
    }

    if (typeof searchNotes !== "function") return "";
    for (const title of titleCandidates) {
      try {
        const result = await searchNotes({ query: title, limit: 8 });
        const items = Array.isArray(result?.items) ? result.items : [];
        const match = items.find((item) => normalizeSystemMessageNoteTitle(item?.title) === title) || items[0] || null;
        const noteId = String(match?.id || "").trim();
        if (!noteId) continue;
        const mapped = typeof mapNoteItem === "function" ? mapNoteItem(match) : match;
        if (mapped?.id) setNotes([mapped, ...currentNotes().filter((note) => note.id !== mapped.id)]);
        await ensureNotesLoaded([noteId]);
        if (currentNotes().some((note) => note.id === noteId)) return noteId;
      } catch {}
    }
    return "";
  };

  return async function openSystemMessageWorkflow(message = {}) {
    const route = message.workflowRoute && typeof message.workflowRoute === "object" ? message.workflowRoute : {};
    const focus = String(route.focus || "").trim();
    if (focus === "writing") {
      closeSystemMessages();
      const indexCardId = String(route.indexCardId || "").trim();
      const basketNoteIds = String(route.basketNoteIds || "")
        .split(",")
        .map((id) => String(id || "").trim())
        .filter(Boolean);
      if (!indexCardId && !basketNoteIds.length) return false;
      try {
        if (indexCardId) {
          const selected = await selectWritingThemeIndex(indexCardId);
          if (!selected?.id) throw new Error("theme index not found");
        } else if (basketNoteIds.length) {
          await ensureNotesLoaded(basketNoteIds);
          const writingEligibleIds = basketNoteIds.filter((id) => isWritingEligibleNote(writingKnownNoteById(id)));
          if (writingEligibleIds.length >= 2) {
            continueWritingEntry(writingEligibleIds, {
              title: suggestedWritingProjectTitle(writingEligibleIds),
              source: route.source || "system-message-theme"
            });
          }
        }
        await openWritingModule({ statusMessage: "已打开主题笔记入口", preserveFocusedCandidateScope: true });
        if (indexCardId) {
          const selected = await selectWritingThemeIndex(indexCardId);
          if (!selected?.id) throw new Error("theme index not found");
        }
        return true;
      } catch (error) {
        setStatus(`打开主题笔记失败：${String(error?.message || error)}`, "warn");
        return false;
      }
    }
    const noteId = await resolveSystemMessageWorkflowNoteId(message);
    if (!noteId) return false;
    if (focus === "graph") {
      closeSystemMessages();
      const opened = await handleStateChange("open-note-main-route", {
        noteId,
        action: "graph"
      });
      if (opened) {
        setGraphSelection(graphWorkflowSelectionForNote(noteId, route, getGraphEdges()));
        renderGraphPanel();
      }
      return Boolean(opened);
    }
    if (focus === "relations") {
      closeSystemMessages();
      return openNoteRelationEditor(noteId, { source: route.source || "system-message" });
    }
    if (focus === "boundary") {
      closeSystemMessages();
      return openGraphFollowupNote(noteId, "isolate-hold", { source: route.source || "system-message" });
    }
    if (focus === "distillation") {
      closeSystemMessages();
      const opened = await handleStateChange("open-note-main-route", {
        noteId,
        action: "writing",
        mode: route.mode || "distillation"
      });
      return Boolean(opened);
    }
    closeSystemMessages();
    activateModule("explorer");
    const opened = openNoteById(noteId, { preferTitleSelection: false });
    if (!opened) return false;
    if (focus === "record-permanent") {
      return openRecordPermanentWorkflowFromCurrentNote();
    }
    return true;
  };
}
