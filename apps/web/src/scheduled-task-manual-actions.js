import { scheduledTaskPayloadFromForm, scheduledTaskFromCanonical, scheduledTaskFormFromTask } from "./scheduled-tasks-model.js";
import { captureActionConfirmationContext, confirmCurrentAction } from "./action-confirmation-context.js";
function cleanText(value) { return String(value || "").trim(); }

function scheduledTaskPayloadHasScope(payload = {}) {
  const scope = payload.scope || {};
  return ["noteIds", "directoryIds", "tags", "keywords"].some((key) => Array.isArray(scope[key]) && scope[key].length);
}
export function createScheduledTaskManualActions(runtimeDeps, { formFromUi, refreshTasks }) {
  const contextFor = ai => captureActionConfirmationContext(runtimeDeps, current => current.settingsState?.ai === ai);
  const activationPrompt = task => `没有限制整理范围，这条规则将处理${task.scope?.includePrivateNotes ? "所有笔记（包括私密笔记）" : "所有非私密笔记"}。确认启用吗？`;
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
    if (settingsState.ai.scheduledTaskActionLoading) return null;
    settingsState.ai.scheduledTaskForm = form;
    settingsState.ai.scheduledTaskFormOpen = true;
    settingsState.ai.scheduledTaskFormError = "";
    const payload = scheduledTaskPayloadFromForm(form);
    const ai = settingsState.ai, currentContext = contextFor(ai), before = JSON.stringify(form);
    if (!currentContext()) return null;
    if (payload.status === "active" && !scheduledTaskPayloadHasScope(payload)) {
      if (!await confirmCurrentAction(ai, {
        confirm: window?.confirm?.bind(window), message: activationPrompt(payload),
        isCurrent: () => currentContext() && !ai.scheduledTaskActionLoading && ai.scheduledTaskFormOpen && JSON.stringify(formFromUi()) === before,
        onError: error => { ai.scheduledTaskFormError = `确认未完成：${String(error?.message || error)}`; render({ preserveForm: true }); }
      })) return null;
    }

    settingsState.ai.scheduledTaskActionLoading = true;
    render();
    try {
      const item = await saveAiScheduledTask({ ...payload, canonical: true });
      if (!currentContext()) return null;
      rememberAiDebugSnapshot("scheduledTaskAction", item);
      if (JSON.stringify(formFromUi()) !== before) {
        ai.scheduledTaskForm = formFromUi();
        setStatus("原规则已保存，当前新增的输入已保留。请核对后再保存。", "warn");
        return item;
      }
      const canonicalTask = item?.canonical?.item ? scheduledTaskFromCanonical(item.canonical.item) : null;
      settingsState.ai.scheduledTaskForm = scheduledTaskFormFromTask(canonicalTask || item);
      settingsState.ai.scheduledTaskFormOpen = false;
      await refreshScheduledTasks({ silent: true });
      if (!currentContext()) return null;
      setStatus(`整理规则已保存：${item?.name || ""}`, "ok");
      return item;
    } catch (error) {
      if (!currentContext()) return null;
      settingsState.ai.scheduledTaskFormError = `保存失败：${String(error?.message || error)}`;
      setStatus(settingsState.ai.scheduledTaskFormError, "bad");
      return null;
    } finally {
      ai.scheduledTaskActionLoading = false;
      if (currentContext()) render();
    }
  }

  async function setTaskStatus(scheduledTaskId, status) {
    const {
      refreshScheduledTasks = refreshTasks,
      rememberAiDebugSnapshot = () => {},
      render = () => {},
      setStatus = () => {},
      settingsState = {},
      updateAiScheduledTaskStatusWithOptions = async () => null,
      window = globalThis.window
    } = runtimeDeps();
    const cleanScheduledTaskId = cleanText(scheduledTaskId);
    const cleanStatus = cleanText(status);
    if (!cleanScheduledTaskId || !cleanStatus) return null;
    if (settingsState.ai.scheduledTaskActionLoading) return null;
    const ai = settingsState.ai, currentContext = contextFor(ai);
    if (!currentContext()) return null;
    if (cleanStatus === "active") {
      const task = ai.scheduledTasks.find(item => cleanText(item.scheduledTaskId) === cleanScheduledTaskId);
      if (!task) { setStatus("这条整理规则已不在列表中，请刷新后重试。", "warn"); return null; }
      const before = JSON.stringify(task);
      if (!scheduledTaskPayloadHasScope(task) && !await confirmCurrentAction(ai, {
        confirm: window?.confirm?.bind(window), message: activationPrompt(task),
        isCurrent: () => currentContext() && !ai.scheduledTaskActionLoading && JSON.stringify(ai.scheduledTasks.find(item => cleanText(item.scheduledTaskId) === cleanScheduledTaskId)) === before,
        onError: error => setStatus(`确认未完成：${String(error?.message || error)}`, "warn")
      })) return null;
    }
    settingsState.ai.scheduledTaskActionLoading = true;
    settingsState.ai.scheduledTaskActionError = "";
    render();
    try {
      const item = await updateAiScheduledTaskStatusWithOptions(cleanScheduledTaskId, cleanStatus, { canonical: true });
      if (!currentContext()) return null;
      rememberAiDebugSnapshot("scheduledTaskAction", item);
      const canonicalTask = item?.canonical?.item ? scheduledTaskFromCanonical(item.canonical.item) : null;
      const nextTask = canonicalTask || item;
      settingsState.ai.scheduledTasks = settingsState.ai.scheduledTasks.map((task) =>
        cleanText(task.scheduledTaskId) === cleanScheduledTaskId ? nextTask : task
      );
      await refreshScheduledTasks({ silent: true });
      if (!currentContext()) return null;
      setStatus(cleanStatus === "active" ? "整理规则已启用" : "整理规则已暂停", "ok");
      return item;
    } catch (error) {
      if (!currentContext()) return null;
      settingsState.ai.scheduledTaskActionError = `修改规则状态失败：${String(error?.message || error)}`;
      setStatus(settingsState.ai.scheduledTaskActionError, "bad");
      return null;
    } finally {
      ai.scheduledTaskActionLoading = false;
      if (currentContext()) render();
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
      scheduledTaskSystemMessageForArtifacts = () => null,
      setStatus = () => {},
      settingsState = {},
      window = globalThis.window
    } = runtimeDeps();
    if (settingsState.ai.scheduledTaskActionLoading) return null;
    const ai = settingsState.ai, currentContext = contextFor(ai);
    const selection = () => JSON.stringify([ai.scheduledTaskFilters, ai.runtimeMode, ai.localModel, ai.remoteRuntimeModel, ai.advancedModelRef, ai.providerEndpointUrl]);
    const before = selection();
    if (!await confirmCurrentAction(ai, {
      confirm: window?.confirm?.bind(window),
      message: "现在整理到期内容吗？结果会先进入待处理，确认后才写入笔记。使用远程模型可能产生第三方费用。",
      isCurrent: () => currentContext() && !ai.scheduledTaskActionLoading && selection() === before,
      onError: error => setStatus(`确认未完成：${String(error?.message || error)}`, "warn")
    })) return null;
    settingsState.ai.scheduledTaskActionLoading = true;
    settingsState.ai.scheduledTaskActionError = "";
    settingsState.ai.scheduledTasksError = "";
    render();
    try {
      const summary = await runDueAiScheduledTasks({ limit: settingsState.ai.scheduledTaskFilters.limit || 50 });
      if (!currentContext()) return null;
      settingsState.ai.scheduledTaskRunSummary = summary;
      await Promise.all([
        refreshScheduledTasks({ silent: true }),
        refreshAiInbox({ silent: true, preserveDetail: true }),
        refreshAiInboxEvaluationSummary({ silent: true })
      ]);
      if (!currentContext()) return null;
      const artifactCount = scheduledTaskReviewArtifactCount(summary);
      if (artifactCount > 0) {
        aiInboxState.filters = normalizeAiInboxFilters({
          ...globalPendingAiInboxFilters(),
          type: aiInboxState.filters?.type || "all"
        });
        aiInboxState.detail = null;
        aiInboxState.selectedArtifactId = "";
        const systemMessage = scheduledTaskSystemMessageForArtifacts(artifactCount);
        if (systemMessage) addSystemMessage(systemMessage, { interrupt: true });
      }
      setStatus(`整理完成：${summary?.succeeded || 0} 条成功，${summary?.skipped || 0} 条跳过，${summary?.failed || 0} 条失败`, summary?.failed ? "warn" : "ok");
      return summary;
    } catch (error) {
      if (!currentContext()) return null;
      settingsState.ai.scheduledTaskActionError = `整理失败：${String(error?.message || error)}`;
      setStatus(settingsState.ai.scheduledTaskActionError, "bad");
      return null;
    } finally {
      ai.scheduledTaskActionLoading = false;
      if (currentContext()) render();
    }
  }

  return { saveFromUi, setTaskStatus, runDueFromUi };
}
