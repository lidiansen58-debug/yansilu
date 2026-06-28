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

export function installWritingThemeIndexEventHandlers(options = {}) {
  const { $ = () => null, depsProvider = () => ({}) } = options;
  const deps = () => depsProvider();
  const registrations = [];
  const add = (id, eventName, handler) => {
    const element = $(id);
    element?.addEventListener?.(eventName, handler);
    registrations.push({ id, eventName, handler, installed: !!element });
  };

  add("btnWritingRefreshThemeIndexes", "click", async () => {
    await handleWritingRefreshThemeIndexes(deps());
  });
  add("btnWritingSaveThemeIndex", "click", async () => {
    await handleWritingSaveThemeIndex(deps());
  });
  add("writingThemeIndexList", "click", async (event) => {
    await handleWritingThemeIndexListClick(event, deps());
  });

  return registrations;
}

export async function handleWritingRefreshThemeIndexes(deps = {}) {
  const {
    loadWritingThemeIndexes = async () => {},
    setStatus = () => {}
  } = deps;
  try {
    await loadWritingThemeIndexes();
    setStatus("已刷新主题索引", "ok");
  } catch (error) {
    setStatus(`刷新主题索引失败：${String(error?.message || error)}`, "bad");
  }
}

export async function handleWritingSaveThemeIndex(deps = {}) {
  const {
    saveWritingBasketAsThemeIndex = async () => null,
    setStatus = () => {}
  } = deps;
  try {
    const card = await saveWritingBasketAsThemeIndex();
    if (!card) return;
    setStatus(`已保存主题索引：${card.title}`, "ok");
  } catch (error) {
    setStatus(`保存主题索引失败：${String(error?.message || error)}`, "bad");
  }
}

export async function handleWritingThemeIndexListClick(event, deps = {}) {
  const {
    selectWritingThemeIndex = async () => {},
    writingThemeIndexContinuationRoute = () => ({ kind: "" }),
    continueWritingProjectEntry = async () => {},
    useThemeIndexAsWritingEntry = async () => ({ indexCard: {}, noteIds: [], addedCount: 0 }),
    setStatus = () => {}
  } = deps;
  const card = event?.target?.closest?.("[data-writing-index-card-id]");
  const button = event?.target?.closest?.("[data-writing-index-action]");
  if (!button && card) {
    const cardId = String(card.getAttribute("data-writing-index-card-id") || "");
    if (!cardId) return;
    try {
      await selectWritingThemeIndex(cardId);
      setStatus(`已查看主题索引：${cardId}`, "ok");
    } catch (error) {
      setStatus(`打开主题索引失败：${String(error?.message || error)}`, "bad");
    }
    return;
  }
  if (!button) return;
  const action = String(button.getAttribute("data-writing-index-action") || "");
  const indexId = String(button.getAttribute("data-writing-index-id") || "");
  const projectId = String(button.getAttribute("data-writing-project-id") || "");
  const continuationRoute = writingThemeIndexContinuationRoute({ action, projectId });
  if (continuationRoute.kind === "continue-project") {
    try {
      await continueWritingProjectEntry(continuationRoute.projectId, {
        openDraft: continuationRoute.openDraft,
        statusMessage: continuationRoute.statusMessage
      });
    } catch (error) {
      setStatus(`${continuationRoute.failurePrefix}失败：${String(error?.message || error)}`, "bad");
    }
    return;
  }
  if (continuationRoute.kind === "missing-project") return;
  if (!indexId) return;
  if (action === "use") {
    try {
      const { indexCard, noteIds, addedCount } = await useThemeIndexAsWritingEntry(indexId, {
        replaceBasket: false,
        resetContext: false,
        source: "writing_theme_index_list"
      });
      setStatus(
        addedCount > 0
          ? `已从主题索引进入写作篮：${indexCard.title || indexId}（新增 ${addedCount} 条，共 ${noteIds.length} 条）`
          : `主题索引已在写作篮中：${indexCard.title || indexId}`,
        "ok"
      );
    } catch (error) {
      setStatus(`使用主题索引失败：${String(error?.message || error)}`, "bad");
    }
    return;
  }
  if (action === "open") {
    try {
      await selectWritingThemeIndex(indexId);
      setStatus(`已查看主题索引：${indexId}`, "ok");
    } catch (error) {
      setStatus(`打开主题索引失败：${String(error?.message || error)}`, "bad");
    }
  }
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
