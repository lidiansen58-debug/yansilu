export function installWritingPanelBasketEventHandlers(options = {}) {
  const { $ = () => null, depsProvider = () => ({}) } = options;
  const deps = () => depsProvider();
  const registrations = [];
  const add = (id, eventName, handler) => {
    const element = $(id);
    element?.addEventListener?.(eventName, handler);
    registrations.push({ id, eventName, handler, installed: !!element });
  };

  add("btnWritingUseCurrent", "click", () => handleWritingUseCurrent(deps()));
  add("btnWritingAddVisible", "click", () => handleWritingAddVisible(deps()));
  add("btnWritingClearBasket", "click", () => handleWritingClearBasket(deps()));
  add("writingBasketNoteIds", "input", (event) => deps().handleWritingBasketManualInput?.(event));
  add("btnWritingStrongModelAnalysis", "click", async () => {
    await deps().prepareWritingStrongModelAnalysis?.();
  });
  add("btnWritingLocalBookIdeas", "click", async () => {
    await handleWritingLocalBookIdeas(deps());
  });
  add("writingCandidateList", "click", (event) => {
    handleWritingNoteListClick(event, deps(), { source: "writing_candidate_list" });
  });
  add("writingBasketList", "click", (event) => {
    handleWritingNoteListClick(event, deps(), { source: "writing_basket_list" });
  });

  return registrations;
}

export function handleWritingUseCurrent(deps = {}) {
  const {
    state = {},
    setStatus = () => {},
    writingNoteEligibility = () => ({ ok: false, message: "" }),
    continueWritingEntry = () => ({}),
    normalizeWritingProjectTitleSeed = (value) => value
  } = deps;
  const note = (state.notes || []).find((item) => item.id === state.selectedFileId);
  if (!note) return setStatus("请先选择一条永久笔记", "warn");
  const eligibility = writingNoteEligibility(note);
  if (!eligibility.ok) {
    const message =
      eligibility.key === "type"
        ? "写作篮只接受永久笔记，请先切到永久笔记目录选择笔记"
        : eligibility.message;
    return setStatus(message, "warn");
  }
  const plan = continueWritingEntry([note.id], {
    title: normalizeWritingProjectTitleSeed(note.title || "新的项目"),
    source: "writing_panel_current_note"
  });
  const addedCount = Number(plan?.addedNoteIds?.length || 0);
  return setStatus(addedCount > 0 ? `已加入写作篮：${note.title}` : `写作篮已包含：${note.title}`, "ok");
}

export function handleWritingAddVisible(deps = {}) {
  const {
    writingCandidateNotes = () => [],
    writingState = {},
    uniqueStrings = (items) => [...new Set(items)],
    planWritingCandidateFocus = () => ({ noteIds: [], usingFocusedScope: false, scopeLabel: "" }),
    writingKnownNoteById = () => null,
    isWritingEligibleNote = () => false,
    suggestedWritingProjectTitle = () => "",
    continueWritingEntry = () => ({}),
    describeWritingBatchAppendStatus = () => "",
    setStatus = () => {}
  } = deps;
  const allCandidates = writingCandidateNotes();
  const candidateFocusSourceIds = uniqueStrings([
    ...allCandidates.map((note) => note.id),
    ...(writingState.focusedCandidateNoteIds || [])
  ]);
  const candidateFocusPlan = planWritingCandidateFocus({
    candidateNoteIds: candidateFocusSourceIds,
    focusedNoteIds: writingState.focusedCandidateNoteIds || [],
    focusedScopeLabel: writingState.focusedCandidateScopeLabel || "当前图谱切片"
  });
  const candidateById = new Map(allCandidates.map((note) => [note.id, note]));
  const candidates = candidateFocusPlan.usingFocusedScope
    ? candidateFocusPlan.noteIds
        .map((id) => writingKnownNoteById(id) || null)
        .filter((note) => Boolean(note) && isWritingEligibleNote(note))
    : candidateFocusPlan.noteIds.map((id) => candidateById.get(id) || null).filter(Boolean);
  if (!candidates.length) {
    return setStatus(
      candidateFocusPlan.usingFocusedScope ? `${candidateFocusPlan.scopeLabel}里没有可加入的永久笔记` : "当前目录没有可加入的永久笔记",
      "warn"
    );
  }
  const candidateIds = candidates.map((note) => note.id);
  const plan = continueWritingEntry(candidateIds, {
    title: suggestedWritingProjectTitle(candidateIds),
    source: "writing_panel_visible_notes"
  });
  const addedCount = Number(plan?.addedNoteIds?.length || 0);
  return setStatus(
    describeWritingBatchAppendStatus({
      scopeLabel: candidateFocusPlan.scopeLabel,
      addedCount,
      totalCount: candidates.length
    }),
    "ok"
  );
}

export function handleWritingClearBasket(deps = {}) {
  const {
    resetWritingStrongModelState = () => {},
    clearWritingBasket = () => {},
    clearWritingSourceIndexIds = () => {},
    resetWritingProjectContext = () => {},
    renderWritingPanel = () => {},
    showWritingResult = () => {},
    setStatus = () => {}
  } = deps;
  resetWritingStrongModelState();
  clearWritingBasket();
  clearWritingSourceIndexIds();
  resetWritingProjectContext();
  renderWritingPanel();
  showWritingResult("已清空写作篮。");
  setStatus("已清空写作篮", "ok");
}

export async function handleWritingLocalBookIdeas(deps = {}) {
  const {
    writingBasketEntries = () => [],
    writingState = {},
    deriveWritingLocalBookIdeas = () => [],
    currentWritingBookStructure = () => ({}),
    normalizeWritingBookStructure = (value) => value,
    updateWritingProjectBookStructure = async () => null,
    renderWritingPanel = () => {},
    setStatus = () => {}
  } = deps;
  const notes = writingBasketEntries();
  if (!notes.length) {
    setStatus("先把材料加入写作篮，再生成书稿方向建议", "warn");
    return;
  }
  writingState.localBookIdeas = deriveWritingLocalBookIdeas({ notes, project: writingState.project });
  writingState.localBookIdeasGeneratedAt = new Date().toISOString();
  if (writingState.project?.id) {
    try {
      writingState.project = await updateWritingProjectBookStructure(writingState.project.id, {
        bookStructure: currentWritingBookStructure({ notes, includeLocalIdeas: true })
      });
      writingState.localBookIdeas = normalizeWritingBookStructure(writingState.project?.book_structure || {}).direction_ideas;
    } catch (error) {
      setStatus(`书稿方向已在本地生成，但保存到项目失败：${String(error?.message || error)}`, "warn");
      renderWritingPanel();
      return;
    }
  }
  renderWritingPanel();
  setStatus(
    writingState.project?.id
      ? "已生成 3 个书稿方向，并保存到当前项目结构"
      : "已在本地生成 3 个书稿方向建议；不会上传材料，也不会自动写入项目",
    "ok"
  );
}

export function handleWritingNoteListClick(event, deps = {}, options = {}) {
  const {
    writingKnownNoteById = () => null,
    writingNoteById = () => null,
    continueWritingEntry = () => ({}),
    resetWritingStrongModelState = () => {},
    clearWritingSourceIndexIds = () => {},
    removeWritingBasketId = () => {},
    renderWritingPanel = () => {},
    openNoteById = () => {},
    setStatus = () => {}
  } = deps;
  const button = event?.target?.closest?.("[data-writing-action]");
  if (!button) return;
  const action = String(button.getAttribute("data-writing-action") || "");
  const noteId = String(button.getAttribute("data-writing-note-id") || "");
  if (!noteId) return;
  const noteLabel = writingKnownNoteById(noteId)?.title || noteId;
  if (action === "add") {
    const note = writingNoteById(noteId);
    const plan = continueWritingEntry([noteId], {
      title: note?.title || noteId,
      source: options.source || "writing_candidate_list"
    });
    const addedCount = Number(plan?.addedNoteIds?.length || 0);
    setStatus(addedCount > 0 ? `已加入写作篮：${noteLabel}` : `写作篮已包含：${noteLabel}`, "ok");
    return;
  }
  if (action === "remove") {
    resetWritingStrongModelState();
    clearWritingSourceIndexIds();
    removeWritingBasketId(noteId);
    renderWritingPanel();
    setStatus(`已移出写作篮：${noteLabel}`, "ok");
    return;
  }
  if (action === "open") {
    openNoteById(noteId);
    setStatus(`已打开永久笔记：${noteLabel}`, "ok");
  }
}
