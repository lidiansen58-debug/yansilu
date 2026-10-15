import {
  normalizeScheduledTaskFilters,
  scheduledTaskFormDefaults,
  scheduledTaskFormFromTask,
  scheduledTaskFromCanonical
} from "./scheduled-tasks-model.js";
import { createScheduledTaskManualActions } from "./scheduled-task-manual-actions.js";
import { captureActionConfirmationContext } from "./action-confirmation-context.js";

function cleanText(value) {
  return String(value || "").trim();
}

export function createScheduledTasksRuntimeController(depsProvider = () => ({})) {
  const runtimeDeps = () => depsProvider() || {};
  const { saveFromUi, setTaskStatus, runDueFromUi } = createScheduledTaskManualActions(runtimeDeps, { formFromUi, refreshTasks });

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
      scheduleType: getElement("scheduledTaskScheduleTypeSelect")?.value || "daily",
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
    settingsState.ai.scheduledTaskFormError = "";
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
    settingsState.ai.scheduledTaskFormError = "";
    render();
  }

  async function refreshTemplates(options = {}) {
    const {
      fetchAiScheduledTaskTemplates = async () => ({ items: [] }),
      render = () => {},
      setStatus = () => {},
      settingsState = {}
    } = runtimeDeps();
    const ai = settingsState.ai;
    const currentContext = captureActionConfirmationContext(runtimeDeps, current => current.settingsState?.ai === ai);
    if (!options.silent) {
      settingsState.ai.scheduledTaskTemplatesLoading = true;
      settingsState.ai.scheduledTaskTemplatesError = "";
      render({ preserveForm: true });
    }
    try {
      const result = await fetchAiScheduledTaskTemplates({ implementationReady: true });
      if (!currentContext()) return null;
      settingsState.ai.scheduledTaskTemplates = result.items;
      settingsState.ai.scheduledTaskTemplatesError = "";
      if (!cleanText(settingsState.ai.scheduledTaskForm.templateId)) {
        if (settingsState.ai.scheduledTaskFormOpen) {
          settingsState.ai.scheduledTaskForm.templateId = scheduledTaskFormDefaults({ templates: result.items }).templateId;
        } else resetForm();
      }
      return result;
    } catch (error) {
      if (!currentContext()) return null;
      settingsState.ai.scheduledTaskTemplatesError = String(error?.message || error);
      setStatus(`整理类型加载失败：${settingsState.ai.scheduledTaskTemplatesError}`, "warn");
      return null;
    } finally {
      ai.scheduledTaskTemplatesLoading = false;
      if (currentContext()) render({ preserveForm: true });
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
    const ai = settingsState.ai;
    const currentContext = captureActionConfirmationContext(runtimeDeps, current => current.settingsState?.ai === ai);
    settingsState.ai.scheduledTaskFilters = normalizeScheduledTaskFilters(settingsState.ai.scheduledTaskFilters);
    if (!options.silent) {
      settingsState.ai.scheduledTasksLoading = true;
      settingsState.ai.scheduledTasksError = "";
      render({ preserveForm: true });
    }
    try {
      const result = await fetchAiScheduledTasks({ ...settingsState.ai.scheduledTaskFilters, canonical: true });
      if (!currentContext()) return null;
      settingsState.ai.scheduledTasks = Array.isArray(result?.canonical?.items) && result.canonical.items.length
        ? result.canonical.items.map((item) => scheduledTaskFromCanonical(item))
        : result.items;
      settingsState.ai.scheduledTasksTotal = result.total;
      rememberAiDebugSnapshot("scheduledTasksList", result);
      settingsState.ai.scheduledTasksError = "";
      return result;
    } catch (error) {
      if (!currentContext()) return null;
      settingsState.ai.scheduledTasksError = String(error?.message || error);
      setStatus(`整理规则加载失败：${settingsState.ai.scheduledTasksError}`, "warn");
      return null;
    } finally {
      ai.scheduledTasksLoading = false;
      if (currentContext()) render({ preserveForm: true });
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
    if (!task) return setStatus("这条整理规则已不在列表中，请刷新后重试。", "warn");
    settingsState.ai.scheduledTaskForm = scheduledTaskFormFromTask(task);
    settingsState.ai.scheduledTaskFormOpen = true;
    settingsState.ai.scheduledTaskFormError = "";
    render();
    setStatus(`正在编辑：${task.name || "整理规则"}`, "ok");
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
