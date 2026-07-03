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

export function normalizeWritingDraftTitle(title = "") {
  const cleanTitle = String(title || "").trim();
  const baseTitle = cleanTitle || "未命名主题";
  const withoutDraftSuffix = baseTitle.replace(/\s*草稿$/u, "").trim();
  const projectTitle = withoutDraftSuffix
    .replace(/\s+Project$/i, " 主题")
    .replace(/Project\s*$/i, "主题")
    .replace(/\s*写作项目$/u, " 主题")
    .replace(/\s*项目$/u, " 主题")
    .trim();
  return `${projectTitle}${/主题$/.test(projectTitle) ? "" : " 主题"} 草稿`;
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
  add("btnWritingDiscoverThemes", "click", async () => {
    await handleWritingDiscoverThemeSuggestions(deps());
  });
  add("btnWritingSaveThemeIndex", "click", async () => {
    await handleWritingSaveThemeIndex(deps());
  });
  add("writingThemeIndexList", "click", async (event) => {
    await handleWritingThemeIndexListClick(event, deps());
  });
  add("writingThemeDiscoverySuggestions", "click", async (event) => {
    await handleWritingThemeDiscoveryClick(event, deps());
  });

  return registrations;
}

function themeDiscoveryDraftFromCard(card = null) {
  const value = (name) => String(card?.querySelector?.(`[data-theme-discovery-field="${name}"]`)?.value || "").trim();
  const itemTextareas = Array.from(card?.querySelectorAll?.("[data-theme-discovery-field='item-rationale']") || []);
  return {
    title: value("title"),
    centralQuestion: value("centralQuestion"),
    membershipReason: value("membershipReason"),
    items: itemTextareas.map((textarea) => ({
      noteId: String(textarea.getAttribute("data-theme-discovery-note-id") || "").trim(),
      rationale: String(textarea.value || "").trim()
    }))
  };
}

export async function handleWritingDiscoverThemeSuggestions(deps = {}) {
  const {
    refreshWritableThemeDiscoverySuggestions = () => [],
    setStatus = () => {}
  } = deps;
  try {
    return await refreshWritableThemeDiscoverySuggestions();
  } catch (error) {
    setStatus(`发现可写主题建议失败：${String(error?.message || error)}`, "bad");
    return [];
  }
}

export async function handleWritingThemeDiscoveryClick(event, deps = {}) {
  const button = event?.target?.closest?.("[data-theme-discovery-action]");
  if (!button) return null;
  const card = button.closest?.("[data-theme-discovery-suggestion-id]");
  const suggestionId = String(card?.getAttribute?.("data-theme-discovery-suggestion-id") || "").trim();
  if (!suggestionId) return null;
  const action = String(button.getAttribute("data-theme-discovery-action") || "").trim();
  const {
    ignoreWritableThemeDiscoverySuggestion = () => false,
    saveWritableThemeDiscoverySuggestion = async () => null,
    setStatus = () => {}
  } = deps;
  if (action === "ignore") {
    return ignoreWritableThemeDiscoverySuggestion(suggestionId);
  }
  if (action === "save") {
    const previousDisabled = Boolean(button.disabled);
    button.disabled = true;
    try {
      return await saveWritableThemeDiscoverySuggestion(suggestionId, themeDiscoveryDraftFromCard(card));
    } catch (error) {
      setStatus(`保存可写主题建议失败：${String(error?.message || error)}`, "bad");
      return null;
    } finally {
      button.disabled = previousDisabled;
    }
  }
  return null;
}

export function installWritingThemeDetailEventHandlers(options = {}) {
  const { $ = () => null, depsProvider = () => ({}) } = options;
  const element = $("writingThemeDetail");
  const handler = async (event) => {
    await handleWritingThemeDetailClick(event, depsProvider());
  };
  element?.addEventListener?.("click", handler);
  return [{ id: "writingThemeDetail", eventName: "click", handler, installed: !!element }];
}

export function installWritingProjectListEventHandlers(options = {}) {
  const { $ = () => null, depsProvider = () => ({}) } = options;
  const element = $("writingProjectsList");
  const handler = async (event) => {
    await handleWritingProjectsListClick(event, depsProvider());
  };
  element?.addEventListener?.("click", handler);
  return [{ id: "writingProjectsList", eventName: "click", handler, installed: !!element }];
}

export function installWritingProjectHistoryEventHandlers(options = {}) {
  const { $ = () => null, depsProvider = () => ({}) } = options;
  const deps = () => depsProvider();
  const registrations = [];
  const add = (id, eventName, handler) => {
    const element = $(id);
    element?.addEventListener?.(eventName, handler);
    registrations.push({ id, eventName, handler, installed: !!element });
  };

  add("writingScaffoldVersionsList", "click", async (event) => {
    await handleWritingScaffoldVersionsListClick(event, deps());
  });
  add("writingDraftVersionsList", "click", async (event) => {
    await handleWritingDraftVersionsListClick(event, deps());
  });
  add("btnWritingRefreshProjects", "click", async () => {
    await handleWritingRefreshProjects(deps());
  });
  add("writingProjectsSearch", "input", async () => {
    await handleWritingProjectsFilterChange(deps());
  });
  add("writingProjectsStatusFilter", "change", async () => {
    await handleWritingProjectsFilterChange(deps());
  });
  add("writingProjectsDraftFilter", "change", async () => {
    await handleWritingProjectsFilterChange(deps());
  });
  add("btnWritingRefreshScaffolds", "click", async () => {
    await handleWritingRefreshScaffolds(deps());
  });
  add("btnWritingRefreshDraftVersions", "click", async () => {
    await handleWritingRefreshDraftVersions(deps());
  });

  return registrations;
}

export function installWritingDraftActionEventHandlers(options = {}) {
  const { $ = () => null, depsProvider = () => ({}) } = options;
  const deps = () => depsProvider();
  const registrations = [];
  const add = (id, eventName, handler) => {
    const element = $(id);
    element?.addEventListener?.(eventName, handler);
    registrations.push({ id, eventName, handler, installed: !!element });
  };

  add("btnWritingCreateProject", "click", async () => {
    await handleWritingCreateProjectClick(deps());
  });
  add("btnWritingCreateScaffold", "click", async () => {
    await handleWritingCreateScaffoldClick(deps());
  });
  add("btnWritingCopyScaffold", "click", async () => {
    await handleWritingCopyScaffoldClick(deps());
  });
  add("btnWritingExportScaffold", "click", async () => {
    await handleWritingExportScaffoldClick(deps());
  });
  add("btnWritingSaveDraft", "click", async () => {
    await handleWritingSaveDraftClick(deps());
  });
  add("btnWritingOpenDraft", "click", async () => {
    await handleWritingOpenDraftClick(deps());
  });

  return registrations;
}

export async function handleWritingProjectsListClick(event, deps = {}) {
  const {
    writingState = {},
    continueWritingProjectEntry = async () => {},
    openWritingProject = async () => {},
    copyWritingScaffold = async () => ({}),
    exportWritingScaffold = async () => ({}),
    setStatus = () => {}
  } = deps;
  const button = event?.target?.closest?.("[data-writing-project-action]");
  if (!button) return;
  const action = String(button.getAttribute("data-writing-project-action") || "");
  const projectId = String(button.getAttribute("data-writing-project-id") || "");
  if (!projectId) return;
  if (action === "open-draft" || action === "resume-project" || action === "resume-scaffold") {
    try {
      await continueWritingProjectEntry(projectId, {
        openDraft: action === "open-draft",
        statusMessage:
          action === "open-draft"
            ? `已从最近写作打开当前草稿：${projectId}`
            : action === "resume-scaffold"
              ? `已从最近写作回到文章提纲：${projectId}`
              : action === "resume-project"
                ? `已从最近写作继续这个主题：${projectId}`
                : ""
      });
    } catch (error) {
      setStatus(
        `${action === "open-draft" ? "从最近写作打开当前草稿" : action === "resume-scaffold" ? "从最近写作回到文章提纲" : "从最近写作继续这个主题"}失败：${String(error?.message || error)}`,
        "bad"
      );
    }
    return;
  }
  if (action === "open") {
    try {
      await openWritingProject(projectId);
      setStatus(`已恢复可写主题：${projectId}`, "ok");
    } catch (error) {
      setStatus(`打开可写主题失败：${String(error?.message || error)}`, "bad");
    }
    return;
  }

  const project = (writingState.projects || []).find((item) => item.id === projectId) || { id: projectId };
  if (action === "copy-scaffold") {
    try {
      const result = await copyWritingScaffold(project);
      setStatus(`已复制文章提纲 Markdown：${result.fileName}`, "ok");
    } catch (error) {
      setStatus(`复制文章提纲失败：${String(error?.message || error)}`, "bad");
    }
    return;
  }
  if (action === "export-scaffold") {
    try {
      const result = await exportWritingScaffold(project);
      setStatus(`已导出文章提纲 Markdown：${result.fileName}`, "ok");
    } catch (error) {
      setStatus(`导出文章提纲失败：${String(error?.message || error)}`, "bad");
    }
  }
}

export async function handleWritingScaffoldVersionsListClick(event, deps = {}) {
  const {
    writingState = {},
    openScaffoldVersion = async () => {},
    copyWritingScaffold = async () => ({}),
    exportWritingScaffold = async () => ({}),
    promptVersionNoteEdit = () => null,
    updateDraftScaffoldVersionNote = async () => ({}),
    renderWritingPanel = () => {},
    setStatus = () => {}
  } = deps;
  const button = event?.target?.closest?.("[data-writing-scaffold-action]");
  if (!button) return;
  const action = String(button.getAttribute("data-writing-scaffold-action") || "");
  const scaffoldId = String(button.getAttribute("data-writing-scaffold-id") || "");
  if (!scaffoldId) return;
  const version = (writingState.scaffoldVersions || []).find((item) => item.id === scaffoldId) || {
    id: scaffoldId,
    writing_project_id: writingState.project?.id
  };

  if (action === "open") {
    try {
      await openScaffoldVersion(scaffoldId);
      setStatus(`已切换到文章提纲版本：${scaffoldId}`, "ok");
    } catch (error) {
      setStatus(`打开文章提纲版本失败：${String(error?.message || error)}`, "bad");
    }
    return;
  }

  const projectLike = {
    ...(writingState.project || {}),
    id: writingState.project?.id || version.writing_project_id,
    scaffold_id: scaffoldId
  };
  if (action === "copy") {
    try {
      const result = await copyWritingScaffold(projectLike);
      setStatus(`已复制文章提纲 Markdown：${result.fileName}`, "ok");
    } catch (error) {
      setStatus(`复制文章提纲失败：${String(error?.message || error)}`, "bad");
    }
    return;
  }
  if (action === "export") {
    try {
      const result = await exportWritingScaffold(projectLike);
      setStatus(`已导出文章提纲 Markdown：${result.fileName}`, "ok");
    } catch (error) {
      setStatus(`导出文章提纲失败：${String(error?.message || error)}`, "bad");
    }
    return;
  }
  if (action === "edit-note") {
    const nextNote = promptVersionNoteEdit(version?.version_note || "", "文章提纲版本");
    if (nextNote === null) return;
    try {
      const updated = await updateDraftScaffoldVersionNote(scaffoldId, nextNote);
      writingState.scaffoldVersions = (writingState.scaffoldVersions || []).map((item) =>
        item.id === scaffoldId ? { ...item, version_note: updated?.version_note || "" } : item
      );
      if (writingState.scaffold?.id === scaffoldId) {
        writingState.scaffold = {
          ...writingState.scaffold,
          version_note: updated?.version_note || ""
        };
      }
      renderWritingPanel();
      setStatus(`已更新文章提纲版本说明：${scaffoldId}`, "ok");
    } catch (error) {
      setStatus(`更新文章提纲版本说明失败：${String(error?.message || error)}`, "bad");
    }
  }
}

export async function handleWritingDraftVersionsListClick(event, deps = {}) {
  const {
    state = {},
    writingState = {},
    promptVersionNoteEdit = () => null,
    updateDraftNoteVersionNote = async () => ({}),
    setWritingCurrentDraftNote = async () => ({}),
    loadWritingProjectsList = async () => {},
    loadWritingDraftVersions = async () => {},
    renderWritingPanel = () => {},
    writingNoteById = () => null,
    fetchNote = async () => null,
    mapNoteItem = (item) => item,
    activateModule = () => {},
    openNoteById = () => {},
    setStatus = () => {}
  } = deps;
  const button = event?.target?.closest?.("[data-writing-draft-action]");
  if (!button) return;
  const action = String(button.getAttribute("data-writing-draft-action") || "");
  const draftNoteId = String(button.getAttribute("data-writing-draft-note-id") || "");
  const draftVersionId = String(button.getAttribute("data-writing-draft-version-id") || "");
  if (!draftNoteId) return;
  if (action === "edit-note") {
    const version = (writingState.draftVersions || []).find((item) => item.id === draftVersionId) || null;
    const nextNote = promptVersionNoteEdit(version?.version_note || "", "草稿版本");
    if (nextNote === null) return;
    try {
      const updated = await updateDraftNoteVersionNote(draftVersionId, nextNote);
      writingState.draftVersions = (writingState.draftVersions || []).map((item) =>
        item.id === draftVersionId ? { ...item, version_note: updated?.version_note || "" } : item
      );
      renderWritingPanel();
      setStatus(`已更新草稿版本说明：${draftVersionId}`, "ok");
    } catch (error) {
      setStatus(`更新草稿版本说明失败：${String(error?.message || error)}`, "bad");
    }
    return;
  }
  if (action === "set-current") {
    try {
      const project = await setWritingCurrentDraftNote(writingState.project?.id, draftNoteId);
      writingState.project = project;
      await loadWritingProjectsList();
      await loadWritingDraftVersions();
      renderWritingPanel();
      setStatus(`已将草稿版本设为当前：${draftNoteId}`, "ok");
    } catch (error) {
      setStatus(`设为当前版本失败：${String(error?.message || error)}`, "bad");
    }
    return;
  }
  if (action === "open") {
    try {
      if (!writingNoteById(draftNoteId)) {
        const fetched = await fetchNote(draftNoteId);
        if (fetched) state.notes = [mapNoteItem(fetched), ...(state.notes || []).filter((item) => item.id !== draftNoteId)];
      }
      activateModule("explorer");
      openNoteById(draftNoteId);
      setStatus(`已打开草稿版本：${draftNoteId}`, "ok");
    } catch (error) {
      setStatus(`打开草稿版本失败：${String(error?.message || error)}`, "bad");
    }
  }
}

export async function handleWritingRefreshProjects(deps = {}) {
  const {
    syncWritingProjectFiltersFromUi = () => {},
    loadWritingProjectsList = async () => {},
    setStatus = () => {}
  } = deps;
  try {
    syncWritingProjectFiltersFromUi();
    await loadWritingProjectsList();
    setStatus("已刷新最近写作", "ok");
  } catch (error) {
    setStatus(`刷新最近写作失败：${String(error?.message || error)}`, "bad");
  }
}

export async function handleWritingProjectsFilterChange(deps = {}) {
  const {
    syncWritingProjectFiltersFromUi = () => {},
    loadWritingProjectsList = async () => {}
  } = deps;
  try {
    syncWritingProjectFiltersFromUi();
    await loadWritingProjectsList();
  } catch {}
}

export async function handleWritingRefreshScaffolds(deps = {}) {
  const {
    loadWritingScaffoldVersions = async () => {},
    setStatus = () => {}
  } = deps;
  try {
    await loadWritingScaffoldVersions();
    setStatus("已刷新文章提纲版本", "ok");
  } catch (error) {
    setStatus(`刷新文章提纲版本失败：${String(error?.message || error)}`, "bad");
  }
}

export async function handleWritingRefreshDraftVersions(deps = {}) {
  const {
    loadWritingDraftVersions = async () => {},
    setStatus = () => {}
  } = deps;
  try {
    await loadWritingDraftVersions();
    setStatus("已刷新草稿版本", "ok");
  } catch (error) {
    setStatus(`刷新草稿版本失败：${String(error?.message || error)}`, "bad");
  }
}

export async function handleWritingCreateProjectClick(deps = {}) {
  const {
    createWritingProjectFromCurrentBasket = async () => {},
    setStatus = () => {}
  } = deps;
  try {
    await createWritingProjectFromCurrentBasket();
  } catch (error) {
    setStatus(`从写作中心确定可写主题失败：${String(error?.message || error)}`, "bad");
  }
}

export async function handleWritingCreateScaffoldClick(deps = {}) {
  const {
    $ = () => null,
    writingState = {},
    describeWritingProjectPreflight = () => ({ level: "ready" }),
    currentWritingContinuationEntry = () => null,
    continueWritingProjectEntry = async () => {},
    writingCenterContinuationStatusMessage = () => "",
    writingCenterContinuationFailureMessage = (_continuation, error) => String(error?.message || error),
    writingScaffoldPreflightWarning = () => "",
    createDraftScaffold = async () => ({}),
    currentWritingVersionNote = () => "",
    showWritingResult = () => {},
    loadWritingProjectsList = async () => {},
    loadWritingScaffoldVersions = async () => {},
    loadWritingDraftVersions = async () => {},
    renderWritingPanel = () => {},
    setStatus = () => {}
  } = deps;
  const writingProjectId = writingState.project?.id;
  const projectPreflightSummary = describeWritingProjectPreflight(writingState.project?.preflight || null);
  const continuation = !writingProjectId ? currentWritingContinuationEntry("当前相关笔记") : null;
  const missingProjectLabel = String($("btnWritingCreateScaffold")?.textContent || "").trim();
  if (!writingProjectId && continuation?.projectId) {
    try {
      await continueWritingProjectEntry(continuation.projectId, {
        openDraft: continuation.action === "open-draft",
        statusMessage: writingCenterContinuationStatusMessage(continuation)
      });
    } catch (error) {
      setStatus(writingCenterContinuationFailureMessage(continuation, error), "bad");
    }
    return;
  }
  if (!writingProjectId) return setStatus(missingProjectLabel || "先补写作材料", "warn");
  if (projectPreflightSummary.level !== "ready") {
    return setStatus(writingScaffoldPreflightWarning(projectPreflightSummary), "warn");
  }
  try {
    const result = await createDraftScaffold(writingProjectId, currentWritingVersionNote());
    writingState.scaffold = result.item || null;
    writingState.scaffoldMarkdown = result.export?.markdown || "";
    if (writingState.project) {
      const returnedProject = result.item?.writing_project || null;
      writingState.project = {
        ...writingState.project,
        ...(returnedProject || {}),
        scaffold_id: returnedProject?.scaffold_id || result.item?.id || null
      };
    }
    showWritingResult({
      stage: "draft_scaffold",
      writingProjectId,
      draftScaffoldId: result.item?.id,
      sections: result.item?.sections,
      markdown: result.export?.markdown,
      versionNote: result.item?.version_note || ""
    });
    await loadWritingProjectsList();
    await loadWritingScaffoldVersions();
    await loadWritingDraftVersions();
    renderWritingPanel();
    setStatus(`文章提纲已生成：${result.item?.id}`, "ok");
  } catch (error) {
    showWritingResult({
      stage: "draft_scaffold_error",
      writingProjectId,
      message: String(error?.message || error),
      code: error?.code || null,
      details: error?.details || null
    });
    setStatus(`文章提纲生成失败：${String(error?.message || error)}`, "bad");
  }
}

export async function handleWritingCopyScaffoldClick(deps = {}) {
  const {
    writingState = {},
    copyWritingScaffold = async () => ({}),
    showWritingResult = () => {},
    setStatus = () => {}
  } = deps;
  try {
    const result = await copyWritingScaffold();
    setStatus(`已复制文章提纲 Markdown：${result.fileName}`, "ok");
  } catch (error) {
    showWritingResult({
      stage: "writing_copy_scaffold_error",
      writingProjectId: writingState.project?.id,
      draftScaffoldId: writingState.scaffold?.id,
      message: String(error?.message || error),
      code: error?.code || null
    });
    setStatus(`复制文章提纲失败：${String(error?.message || error)}`, "bad");
  }
}

export async function handleWritingExportScaffoldClick(deps = {}) {
  const {
    writingState = {},
    exportWritingScaffold = async () => ({}),
    showWritingResult = () => {},
    setStatus = () => {}
  } = deps;
  try {
    const result = await exportWritingScaffold();
    setStatus(`已导出文章提纲 Markdown：${result.fileName}`, "ok");
  } catch (error) {
    showWritingResult({
      stage: "writing_export_scaffold_error",
      writingProjectId: writingState.project?.id,
      draftScaffoldId: writingState.scaffold?.id,
      message: String(error?.message || error),
      code: error?.code || null
    });
    setStatus(`导出文章提纲失败：${String(error?.message || error)}`, "bad");
  }
}

export async function handleWritingSaveDraftClick(deps = {}) {
  const {
    $ = () => null,
    state = {},
    writingState = {},
    showWritingResult = () => {},
    describeWritingProjectPreflight = () => ({ level: "ready" }),
    writingDraftDirectoryId = () => "",
    writingDraftTitle = () => "",
    writingDraftBody = () => "",
    createNote = async () => ({}),
    bindWritingDraftNote = async () => ({}),
    currentWritingVersionNote = () => "",
    mapNoteItem = (item) => item,
    loadWritingProjectsList = async () => {},
    loadWritingScaffoldVersions = async () => {},
    loadWritingDraftVersions = async () => {},
    renderWritingPanel = () => {},
    setStatus = () => {}
  } = deps;
  const missingScaffoldLabel = String($("btnWritingSaveDraft")?.textContent || "").trim();
  if (!writingState.scaffold || !String(writingState.scaffoldMarkdown || "").trim()) {
    showWritingResult({
      stage: "writing_draft_note_error",
      message: "scaffold is required before creating a draft note",
      code: "WRITING_DRAFT_INVALID"
    });
    return setStatus(missingScaffoldLabel || "先生成文章提纲", "warn");
  }
  const projectPreflightSummary = describeWritingProjectPreflight(writingState.project?.preflight || null);
  if (writingState.project?.id && projectPreflightSummary.level !== "ready") {
    return setStatus(
      projectPreflightSummary.hint ||
        (projectPreflightSummary.level === "needs_clarification"
          ? "先澄清主题关键问题，再开始草稿。"
          : projectPreflightSummary.level === "has_gaps"
            ? "先补主题缺口，再开始草稿。"
            : "先检查主题条件，再开始草稿。"),
      "warn"
    );
  }

  const directoryId = writingDraftDirectoryId();
  const title = normalizeWritingDraftTitle(writingDraftTitle() || writingState.project?.title || "");
  const body = String(writingDraftBody() || "").replace(/^#\s+.*$/m, `# ${title}`);
  try {
    const created = await createNote({
      directoryId,
      title,
      status: "draft",
      body
    });
    const project = await bindWritingDraftNote(
      writingState.project?.id,
      created?.id,
      writingState.scaffold?.id,
      currentWritingVersionNote()
    );
    writingState.project = project;
    const note = mapNoteItem({
      ...created,
      body: typeof created?.body === "string" ? created.body : body
    });
    state.notes = [note, ...(state.notes || []).filter((item) => item.id !== note.id)];
    showWritingResult({
      stage: "writing_draft_note",
      writingProjectId: project?.id || writingState.project?.id,
      draftScaffoldId: writingState.scaffold?.id,
      noteId: note.id,
      directoryId,
      title: note.title
    });
    await loadWritingProjectsList();
    await loadWritingScaffoldVersions();
    await loadWritingDraftVersions();
    renderWritingPanel();
    setStatus(`已创建草稿笔记：${note.title}。你可以继续留在写作中心检查版本，或直接打开当前草稿。`, "ok");
  } catch (error) {
    showWritingResult({
      stage: "writing_draft_note_error",
      writingProjectId: writingState.project?.id,
      draftScaffoldId: writingState.scaffold?.id,
      message: String(error?.message || error),
      code: error?.code || null,
      details: error?.details || null
    });
    setStatus(`草稿笔记创建失败：${String(error?.message || error)}`, "bad");
  }
}

export async function handleWritingOpenDraftClick(deps = {}) {
  const {
    writingState = {},
    currentWritingContinuationEntry = () => null,
    continueWritingProjectEntry = async () => {},
    writingCenterContinuationStatusMessage = () => "",
    writingCenterContinuationFailureMessage = (_continuation, error) => String(error?.message || error),
    openWritingDraftNoteById = async () => {},
    setStatus = () => {}
  } = deps;
  const draftNoteId = String(writingState.project?.draft_note_id || "").trim();
  const continuation = !draftNoteId ? currentWritingContinuationEntry("当前相关笔记") : null;
  if (!draftNoteId && continuation?.projectId) {
    try {
      await continueWritingProjectEntry(continuation.projectId, {
        openDraft: continuation.action === "open-draft",
        statusMessage: writingCenterContinuationStatusMessage(continuation)
      });
    } catch (error) {
      setStatus(writingCenterContinuationFailureMessage(continuation, error), "bad");
    }
    return;
  }
  if (!draftNoteId) return setStatus("当前主题还没有绑定草稿笔记", "warn");
  try {
    await openWritingDraftNoteById(draftNoteId);
    setStatus(`已打开草稿笔记：${draftNoteId}`, "ok");
  } catch (error) {
    setStatus(`打开草稿失败：${String(error?.message || error)}`, "bad");
  }
}

export async function handleWritingThemeDetailClick(event, deps = {}) {
  const {
    saveSelectedThemeIndexDetail = async () => ({}),
    useThemeIndexAsWritingEntry = async () => ({ indexCard: {}, noteIds: [], addedCount: 0 }),
    continueWritingProjectEntry = async () => {},
    writingThemeIndexById = () => null,
    fetchIndexCard = async () => null,
    findExistingWritingProjectForTheme = () => null,
    writingThemeIndexNoteIds = () => [],
    createWritingProjectFromThemeIndex = async () => null,
    syncSelectedThemeIndexWithBasket = async () => ({}),
    activateModule = () => {},
    openNoteById = () => {},
    removeNoteFromSelectedThemeIndex = async () => ({}),
    setStatus = () => {}
  } = deps;
  const actionButton = event?.target?.closest?.("[data-writing-theme-action]");
  if (!actionButton) return;
  const action = String(actionButton.getAttribute("data-writing-theme-action") || "");
  const indexId = String(actionButton.getAttribute("data-writing-theme-id") || "");
  const noteId = String(actionButton.getAttribute("data-writing-note-id") || "");
  const projectId = String(actionButton.getAttribute("data-writing-project-id") || "");
  try {
    if (action === "save") {
      const item = await saveSelectedThemeIndexDetail();
      setStatus(`已保存主题：${item.title || item.id}`, "ok");
      return;
    }
    if (action === "use") {
      const { indexCard, noteIds, addedCount } = await useThemeIndexAsWritingEntry(indexId, {
        replaceBasket: false,
        resetContext: false,
        source: "writing_theme_detail"
      });
      setStatus(
        addedCount > 0
          ? `已从主题选择相关笔记：${indexCard.title || indexId}（新增 ${addedCount} 条，共 ${noteIds.length} 条）`
          : `主题已在相关笔记中：${indexCard.title || indexId}`,
        "ok"
      );
      return;
    }
    if (action === "open-draft" && projectId) {
      await continueWritingProjectEntry(projectId, {
        openDraft: true,
        statusMessage: `已从主题打开当前草稿：${projectId}`
      });
      return;
    }
    if ((action === "resume-project" || action === "resume-scaffold") && projectId) {
      await continueWritingProjectEntry(projectId, {
        statusMessage: action === "resume-scaffold"
          ? `已从主题回到文章提纲：${projectId}`
          : `已从主题继续这个主题：${projectId}`
      });
      return;
    }
    if (action === "create-project") {
      const selectedTheme = writingThemeIndexById(indexId) || (await fetchIndexCard(indexId));
      const existingProject = findExistingWritingProjectForTheme(selectedTheme, writingThemeIndexNoteIds(selectedTheme));
      if (existingProject?.id) {
        await continueWritingProjectEntry(existingProject.id, {
          openDraft: Boolean(existingProject.draft_note_id),
          statusMessage: existingProject.draft_note_id
            ? `已从主题打开当前草稿：${existingProject.id}`
            : existingProject.scaffold_id
              ? `已从主题回到文章提纲：${existingProject.id}`
              : `已从主题继续这个主题：${existingProject.id}`
        });
        return;
      }
      const project = await createWritingProjectFromThemeIndex(indexId);
      setStatus(`已从主题确定可写主题：${project?.id}`, "ok");
      return;
    }
    if (action === "replace-from-basket") {
      const item = await syncSelectedThemeIndexWithBasket("replace");
      setStatus(`已用当前相关笔记覆盖主题：${item.title || item.id}`, "ok");
      return;
    }
    if (action === "append-from-basket") {
      const item = await syncSelectedThemeIndexWithBasket("append");
      setStatus(`已把当前相关笔记加入主题：${item.title || item.id}`, "ok");
      return;
    }
    if (action === "open-note" && noteId) {
      activateModule("explorer");
      openNoteById(noteId);
      setStatus(`已打开主题中的永久笔记：${noteId}`, "ok");
      return;
    }
    if (action === "remove-note" && noteId) {
      const item = await removeNoteFromSelectedThemeIndex(noteId);
      setStatus(`已从主题移出笔记：${noteId}：${item.title || item.id}`, "ok");
    }
  } catch (error) {
    if (action === "open-draft" || action === "resume-project" || action === "resume-scaffold") {
      setStatus(
        `${action === "open-draft" ? "从主题打开当前草稿" : action === "resume-scaffold" ? "从主题回到文章提纲" : "从主题继续这个主题"}失败：${String(error?.message || error)}`,
        "bad"
      );
      return;
    }
    setStatus(`主题操作失败：${String(error?.message || error)}`, "bad");
  }
}

export async function handleWritingRefreshThemeIndexes(deps = {}) {
  const {
    loadWritingThemeIndexes = async () => {},
    setStatus = () => {}
  } = deps;
  try {
    await loadWritingThemeIndexes();
    setStatus("已刷新可写主题", "ok");
  } catch (error) {
    setStatus(`刷新可写主题失败：${String(error?.message || error)}`, "bad");
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
    setStatus(`已保存可写主题：${card.title}`, "ok");
  } catch (error) {
    setStatus(`保存可写主题失败：${String(error?.message || error)}`, "bad");
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
      setStatus(`已查看可写主题：${cardId}`, "ok");
    } catch (error) {
      setStatus(`打开可写主题失败：${String(error?.message || error)}`, "bad");
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
          ? `已从可写主题选择相关笔记：${indexCard.title || indexId}（新增 ${addedCount} 条，共 ${noteIds.length} 条）`
          : `可写主题已在相关笔记中：${indexCard.title || indexId}`,
        "ok"
      );
    } catch (error) {
      setStatus(`使用可写主题失败：${String(error?.message || error)}`, "bad");
    }
    return;
  }
  if (action === "open") {
    try {
      await selectWritingThemeIndex(indexId);
      setStatus(`已查看可写主题：${indexId}`, "ok");
    } catch (error) {
      setStatus(`打开可写主题失败：${String(error?.message || error)}`, "bad");
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
        ? "相关笔记只接受永久笔记，请先切到永久笔记目录选择笔记"
        : eligibility.message;
    return setStatus(message, "warn");
  }
  const plan = continueWritingEntry([note.id], {
    title: normalizeWritingProjectTitleSeed(note.title || "新的主题"),
    source: "writing_panel_current_note"
  });
  const addedCount = Number(plan?.addedNoteIds?.length || 0);
  return setStatus(addedCount > 0 ? `已加入相关笔记：${note.title}` : `相关笔记已包含：${note.title}`, "ok");
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
    focusedScopeLabel: writingState.focusedCandidateScopeLabel || "当前图谱范围"
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
  showWritingResult("已清空相关笔记。");
  setStatus("已清空相关笔记", "ok");
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
    setStatus("先选择相关笔记，再生成书稿方向建议", "warn");
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
      setStatus(`书稿方向已在本地生成，但保存到当前主题失败：${String(error?.message || error)}`, "warn");
      renderWritingPanel();
      return;
    }
  }
  renderWritingPanel();
  setStatus(
    writingState.project?.id
      ? "已生成 3 个书稿方向，并保存到当前主题结构"
      : "已在本地生成 3 个书稿方向建议；不会上传材料，也不会自动写入当前主题",
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
    setStatus(addedCount > 0 ? `已加入相关笔记：${noteLabel}` : `相关笔记已包含：${noteLabel}`, "ok");
    return;
  }
  if (action === "remove") {
    resetWritingStrongModelState();
    clearWritingSourceIndexIds();
    removeWritingBasketId(noteId);
    renderWritingPanel();
    setStatus(`已移出相关笔记：${noteLabel}`, "ok");
    return;
  }
  if (action === "open") {
    openNoteById(noteId);
    setStatus(`已打开永久笔记：${noteLabel}`, "ok");
  }
}
