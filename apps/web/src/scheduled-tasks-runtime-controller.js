import {
  normalizeScheduledTaskFilters,
  scheduledTaskFormDefaults,
  scheduledTaskFormFromTask,
  scheduledTaskFromCanonical,
  scheduledTaskPayloadFromForm
} from "./scheduled-tasks-model.js";

function cleanText(value) {
  return String(value || "").trim();
}

function scheduledTaskPayloadHasScope(payload = {}) {
  const scope = payload.scope || {};
  return ["noteIds", "directoryIds", "tags", "keywords"].some((key) => Array.isArray(scope[key]) && scope[key].length);
}

export function createScheduledTasksRuntimeController(depsProvider = () => ({})) {
  const runtimeDeps = () => depsProvider() || {};

  function filtersFromUi() {
    const {
      getElement = () => null,
      settingsState = {}
    } = runtimeDeps();
    return normalizeScheduledTaskFilters({
      ...settingsState.ai.scheduledTaskFilters,
      status: getElement("scheduledTaskStatusFilter")?.value || settingsState.ai.scheduledTaskFilters.status,
      taskType: getElement("scheduledTaskTypeFilter")?.value || settingsState.ai.scheduledTaskFilters.taskType
    });
  }

  function templateById(templateId = "") {
    const { settingsState = {} } = runtimeDeps();
    const id = cleanText(templateId);
    return settingsState.ai.scheduledTaskTemplates.find((template) => cleanText(template.templateId) === id) || null;
  }

  function formFromUi() {
    const {
      getElement = () => null,
      settingsState = {}
    } = runtimeDeps();
    return {
      ...settingsState.ai.scheduledTaskForm,
      templateId: getElement("scheduledTaskTemplateSelect")?.value || settingsState.ai.scheduledTaskForm.templateId,
      name: getElement("scheduledTaskNameInput")?.value || "",
      status: getElement("scheduledTaskStatusSelect")?.value || "paused",
      scheduleType: getElement("scheduledTaskScheduleTypeSelect")?.value || "weekly",
      dayOfWeek: getElement("scheduledTaskDaySelect")?.value || "monday",
      time: getElement("scheduledTaskTimeInput")?.value || "09:00",
      intervalMinutes: getElement("scheduledTaskIntervalInput")?.value || 30,
      noteIdsText: getElement("scheduledTaskNoteIdsInput")?.value || "",
      directoryIdsText: getElement("scheduledTaskDirectoryIdsInput")?.value || "",
      tagsText: getElement("scheduledTaskTagsInput")?.value || "",
      keywordsText: getElement("scheduledTaskKeywordsInput")?.value || "",
      includePrivateNotes: getElement("scheduledTaskIncludePrivateInput")?.checked === true
    };
  }

  function resetForm(overrides = {}) {
    const {
      render = () => {},
      settingsState = {},
      state = {}
    } = runtimeDeps();
    const { formOpen = false, ...formOverrides } = overrides || {};
    settingsState.ai.scheduledTaskForm = {
      ...scheduledTaskFormDefaults({
        templates: settingsState.ai.scheduledTaskTemplates,
        currentNoteId: state.selectedFileId || state.activeTabId || "",
        currentDirectoryId: state.selectedFolderId || ""
      }),
      ...formOverrides
    };
    settingsState.ai.scheduledTaskFormOpen = Boolean(formOpen);
    render();
  }

  function applyTemplateToForm(templateId = "") {
    const {
      render = () => {},
      settingsState = {}
    } = runtimeDeps();
    const template = templateById(templateId);
    if (!template) return;
    const task = template.task || {};
    const schedule = task.schedule || {};
    settingsState.ai.scheduledTaskForm = {
      ...settingsState.ai.scheduledTaskForm,
      templateId: template.templateId,
      name: template.name || settingsState.ai.scheduledTaskForm.name,
      scheduleType: schedule.type || settingsState.ai.scheduledTaskForm.scheduleType,
      dayOfWeek: schedule.dayOfWeek || schedule.day_of_week || settingsState.ai.scheduledTaskForm.dayOfWeek,
      time: schedule.time || settingsState.ai.scheduledTaskForm.time
    };
    settingsState.ai.scheduledTaskFormOpen = true;
    render();
  }

  async function refreshTemplates(options = {}) {
    const {
      fetchAiScheduledTaskTemplates = async () => ({ items: [] }),
      render = () => {},
      setStatus = () => {},
      settingsState = {}
    } = runtimeDeps();
    if (!options.silent) {
      settingsState.ai.scheduledTaskTemplatesLoading = true;
      settingsState.ai.scheduledTaskTemplatesError = "";
      render();
    }
    try {
      const result = await fetchAiScheduledTaskTemplates({ implementationReady: true });
      settingsState.ai.scheduledTaskTemplates = result.items;
      settingsState.ai.scheduledTaskTemplatesError = "";
      if (!cleanText(settingsState.ai.scheduledTaskForm.templateId)) resetForm();
      return result;
    } catch (error) {
      settingsState.ai.scheduledTaskTemplatesError = String(error?.message || error);
      setStatus(`计划任务模板加载失败：${settingsState.ai.scheduledTaskTemplatesError}`, "warn");
      return null;
    } finally {
      settingsState.ai.scheduledTaskTemplatesLoading = false;
      render();
    }
  }

  async function refreshTasks(options = {}) {
    const {
      fetchAiScheduledTasks = async () => ({ items: [], total: 0 }),
      rememberAiDebugSnapshot = () => {},
      render = () => {},
      setStatus = () => {},
      settingsState = {}
    } = runtimeDeps();
    settingsState.ai.scheduledTaskFilters = normalizeScheduledTaskFilters(settingsState.ai.scheduledTaskFilters);
    if (!options.silent) {
      settingsState.ai.scheduledTasksLoading = true;
      settingsState.ai.scheduledTasksError = "";
      render();
    }
    try {
      const result = await fetchAiScheduledTasks({ ...settingsState.ai.scheduledTaskFilters, canonical: true });
      settingsState.ai.scheduledTasks = Array.isArray(result?.canonical?.items) && result.canonical.items.length
        ? result.canonical.items.map((item) => scheduledTaskFromCanonical(item))
        : result.items;
      settingsState.ai.scheduledTasksTotal = result.total;
      rememberAiDebugSnapshot("scheduledTasksList", result);
      settingsState.ai.scheduledTasksError = "";
      return result;
    } catch (error) {
      settingsState.ai.scheduledTasksError = String(error?.message || error);
      setStatus(`Scheduled task load failed: ${settingsState.ai.scheduledTasksError}`, "warn");
      return null;
    } finally {
      settingsState.ai.scheduledTasksLoading = false;
      render();
    }
  }

  async function saveFromUi() {
    const {
      refreshScheduledTasks = refreshTasks,
      rememberAiDebugSnapshot = () => {},
      render = () => {},
      saveAiScheduledTask = async () => null,
      setStatus = () => {},
      settingsState = {},
      window = globalThis.window
    } = runtimeDeps();
    const form = formFromUi();
    settingsState.ai.scheduledTaskForm = form;
    settingsState.ai.scheduledTaskFormOpen = true;
    const payload = scheduledTaskPayloadFromForm(form);
    if (payload.status === "active" && !scheduledTaskPayloadHasScope(payload)) {
      const confirmed = typeof window?.confirm === "function"
        ? window.confirm("Create an active scheduled task without a note, directory, tag, or keyword scope?")
        : true;
      if (!confirmed) return null;
    }

    settingsState.ai.scheduledTaskActionLoading = true;
    render();
    try {
      const item = await saveAiScheduledTask({ ...payload, canonical: true });
      rememberAiDebugSnapshot("scheduledTaskAction", item);
      const canonicalTask = item?.canonical?.item ? scheduledTaskFromCanonical(item.canonical.item) : null;
      settingsState.ai.scheduledTaskForm = scheduledTaskFormFromTask(canonicalTask || item);
      settingsState.ai.scheduledTaskFormOpen = false;
      await refreshScheduledTasks({ silent: true });
      setStatus(`Scheduled task saved: ${item?.name || item?.scheduledTaskId || ""}`, "ok");
      return item;
    } catch (error) {
      setStatus(`Scheduled task save failed: ${String(error?.message || error)}`, "bad");
      return null;
    } finally {
      settingsState.ai.scheduledTaskActionLoading = false;
      render();
    }
  }

  function editFromList(scheduledTaskId = "") {
    const {
      render = () => {},
      setStatus = () => {},
      settingsState = {}
    } = runtimeDeps();
    const id = cleanText(scheduledTaskId);
    const task = settingsState.ai.scheduledTasks.find((item) => cleanText(item.scheduledTaskId) === id);
    if (!task) return setStatus("Scheduled task not found in the current list", "warn");
    settingsState.ai.scheduledTaskForm = scheduledTaskFormFromTask(task);
    settingsState.ai.scheduledTaskFormOpen = true;
    render();
    setStatus(`Editing scheduled task: ${task.name || id}`, "ok");
  }

  async function setTaskStatus(scheduledTaskId, status) {
    const {
      refreshScheduledTasks = refreshTasks,
      rememberAiDebugSnapshot = () => {},
      render = () => {},
      setStatus = () => {},
      settingsState = {},
      updateAiScheduledTaskStatusWithOptions = async () => null
    } = runtimeDeps();
    const cleanScheduledTaskId = cleanText(scheduledTaskId);
    const cleanStatus = cleanText(status);
    if (!cleanScheduledTaskId || !cleanStatus) return null;
    settingsState.ai.scheduledTaskActionLoading = true;
    render();
    try {
      const item = await updateAiScheduledTaskStatusWithOptions(cleanScheduledTaskId, cleanStatus, { canonical: true });
      rememberAiDebugSnapshot("scheduledTaskAction", item);
      const canonicalTask = item?.canonical?.item ? scheduledTaskFromCanonical(item.canonical.item) : null;
      const nextTask = canonicalTask || item;
      settingsState.ai.scheduledTasks = settingsState.ai.scheduledTasks.map((task) =>
        cleanText(task.scheduledTaskId) === cleanScheduledTaskId ? nextTask : task
      );
      await refreshScheduledTasks({ silent: true });
      setStatus(`Scheduled task ${cleanStatus}: ${cleanScheduledTaskId}`, "ok");
      return item;
    } catch (error) {
      setStatus(`Scheduled task status failed: ${String(error?.message || error)}`, "bad");
      return null;
    } finally {
      settingsState.ai.scheduledTaskActionLoading = false;
      render();
    }
  }

  async function runDueFromUi() {
    const {
      addSystemMessage = () => {},
      aiInboxState = {},
      globalPendingAiInboxFilters = () => ({}),
      normalizeAiInboxFilters = (value) => value,
      refreshAiInbox = async () => null,
      refreshAiInboxEvaluationSummary = async () => null,
      refreshScheduledTasks = refreshTasks,
      render = () => {},
      runDueAiScheduledTasks = async () => null,
      scheduledTaskReviewArtifactCount = () => 0,
      scheduledTaskSystemMessageForArtifacts = () => ({}),
      setStatus = () => {},
      settingsState = {},
      window = globalThis.window
    } = runtimeDeps();
    const confirmed = typeof window?.confirm === "function"
      ? window.confirm("现在运行到期的 AI 任务吗？新的输出会先进入系统消息，等待你确认。")
      : true;
    if (!confirmed) return null;
    settingsState.ai.scheduledTaskActionLoading = true;
    settingsState.ai.scheduledTasksError = "";
    render();
    try {
      const summary = await runDueAiScheduledTasks({ limit: settingsState.ai.scheduledTaskFilters.limit || 50 });
      settingsState.ai.scheduledTaskRunSummary = summary;
      await Promise.all([
        refreshScheduledTasks({ silent: true }),
        refreshAiInbox({ silent: true, preserveDetail: true }),
        refreshAiInboxEvaluationSummary({ silent: true })
      ]);
      const artifactCount = scheduledTaskReviewArtifactCount(summary);
      if (artifactCount > 0) {
        aiInboxState.filters = normalizeAiInboxFilters({
          ...globalPendingAiInboxFilters(),
          type: aiInboxState.filters?.type || "all"
        });
        aiInboxState.detail = null;
        aiInboxState.selectedArtifactId = "";
        addSystemMessage(scheduledTaskSystemMessageForArtifacts(artifactCount), { interrupt: true });
      }
      setStatus(`Scheduled tasks run: ${summary?.succeeded || 0} succeeded, ${summary?.skipped || 0} skipped, ${summary?.failed || 0} failed`, "ok");
      return summary;
    } catch (error) {
      setStatus(`Run due scheduled tasks failed: ${String(error?.message || error)}`, "bad");
      return null;
    } finally {
      settingsState.ai.scheduledTaskActionLoading = false;
      render();
    }
  }

  return {
    applyTemplateToForm,
    editFromList,
    filtersFromUi,
    formFromUi,
    refreshTasks,
    refreshTemplates,
    resetForm,
    runDueFromUi,
    saveFromUi,
    setTaskStatus,
    templateById
  };
}
