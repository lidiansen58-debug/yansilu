import { writingStrongModelAnalysisPlan } from "./writing-project-action-model.js";
import { createWritingProjectCreationActions } from "./writing-project-creation-actions.js";
import { createContextualAiActionController } from "./contextual-ai-action-controller.js";
import { aiErrorMessage } from "./ai-error-message.js";

function isRemoteAiRuntimeMode(mode = "") {
  return ["remote", "cloud_only", "cloud"].includes(String(mode || "").toLowerCase());
}

function defaultAiRequestOptions(mode = "") {
  if (isRemoteAiRuntimeMode(mode)) {
    return {
      userConfirmedRemoteModel: true,
      privacyMode: "remote_after_confirmation",
      modelTier: "strong_reasoning"
    };
  }
  return {
    userConfirmedRemoteModel: false,
    privacyMode: "local_only",
    modelTier: "local_private"
  };
}

export function createWritingProjectRuntimeController(depsProvider = () => ({})) {
  const runtimeDeps = () => depsProvider() || {};
  const formValue = (selectById, id) => String(selectById(id)?.value || "");
  const contextualAiController = createContextualAiActionController({
    onChange: (actionState) => {
      const deps = runtimeDeps();
      const context = actionState.returnContext;
      if (context?.projectId && context.projectId !== deps.writingState?.project?.id) return;
      if (context?.requestRevision != null && context.requestRevision !== deps.writingState?.strongModelRevision) return;
      if (deps.writingState) deps.writingState.contextualAiActionState = { ...actionState };
      deps.renderWritingPanel?.();
    },
    onIgnore: async ({ status } = {}) => {
      const deps = runtimeDeps();
      if (deps.writingState) {
        deps.writingState.strongModelRevision = (deps.writingState.strongModelRevision || 0) + 1;
        deps.writingState.strongModelResult = null;
        deps.writingState.strongModelError = "";
        deps.writingState.strongModelLoading = false;
      }
      deps.setStatus?.(["needs_remote_confirmation", "checking", "running"].includes(status) ? "已取消检查。" : "已关闭检查结果。", "ok");
      return { clear: true, message: ["needs_remote_confirmation", "checking", "running"].includes(status) ? "已取消检查。" : "" };
    },
    ensureAvailable: async ({ context }) => {
      const deps = runtimeDeps();
      if (isRemoteAiRuntimeMode(deps.aiRuntimeMode)) return { ready: deps.aiAvailable !== false, mode: "remote" };
      return { ...(await deps.ensureLocalAiReadyForFeature?.({ feature: "writing_check", openSettings: true })), mode: "local" };
    },
    openEnableFlow: async () => {
      const deps = runtimeDeps();
      if (deps.writingState) {
        deps.writingState.pendingContextualAiAction = {
          actionId: "check_outline",
          projectId: String(deps.writingState.project?.id || "").trim()
        };
      }
      deps.activateModule?.("settings");
      deps.setSettingsItem?.("ai-settings", { render: false });
      deps.renderSettingsPanel?.();
      deps.setStatus?.("请先完成 AI 设置，完成后回到写作检查。", "warn", { priority: 3, holdMs: 8000 });
    },
    confirmRemoteContent: async ({ context }) => context?.remoteConfirmed === true
  });

  const { createWritingProjectFromCurrentBasket, createWritingProjectFromImportedPermanentNotes } =
    createWritingProjectCreationActions(runtimeDeps);

  async function prepareWritingStrongModelAnalysis(options = {}) {
    const {
      $: selectById = () => null,
      aiFeatureRequestOptions = null,
      aiRuntimeMode = "local",
      analyzeWritingWithStrongModel = async () => null,
      ensureLocalAiReadyForFeature = async () => ({ ready: true }),
      parseWritingBasketIds = () => [],
      renderWritingPanel = () => {},
      setStatus = () => {},
      writingState = {}
    } = runtimeDeps();
    if (writingState.strongModelLoading) return;
    const noteIds = parseWritingBasketIds();
    const preflightPlan = writingStrongModelAnalysisPlan({
      noteIds,
      project: writingState.project,
      confirmed: true
    });
    if (preflightPlan.reason === "missing_basket") {
      setStatus("先选择相关笔记，再准备 AI 写作检查", "warn");
      return;
    }
    if (preflightPlan.reason === "missing_project") {
      setStatus("先确定可写主题，再准备 AI 写作检查", "warn");
      return;
    }
    const actionPlan = writingStrongModelAnalysisPlan({
      noteIds,
      project: writingState.project,
      scaffold: writingState.scaffold,
      form: {
        goal: formValue(selectById, "writingGoal"),
        audience: formValue(selectById, "writingAudience")
      },
      confirmed: true
    });
    if (!actionPlan.ok) return;
    const requestOptions = typeof aiFeatureRequestOptions === "function"
      ? aiFeatureRequestOptions({ actionId: "check_outline", remoteConfirmed: options.remoteConfirmed === true })
      : defaultAiRequestOptions(aiRuntimeMode);
    const analysisRequest = { ...actionPlan.request, ...requestOptions };
    const projectId = writingState.project?.id;
    const requestRevision = (writingState.strongModelRevision || 0) + 1;
    const isCurrentRequest = () => writingState.strongModelRevision === requestRevision && writingState.project?.id === projectId;
    writingState.strongModelRevision = requestRevision;
    writingState.strongModelLoading = true;
    writingState.strongModelError = "";
    renderWritingPanel();
    try {
      const contextualState = await contextualAiController.run(
        "check_outline",
        { noteIds, cancellable: true, noteTitles: Object.fromEntries(noteIds.map((id) => [id, runtimeDeps().writingKnownNoteById?.(id)?.title || id])),
          remoteConfirmed: options.remoteConfirmed === true, returnContext: { view: "writing", projectId, requestRevision } },
        async ({ signal }) => {
          try {
            const response = await analyzeWritingWithStrongModel(analysisRequest, { signal });
            if (!response || typeof response !== "object") throw new Error("AI 未返回写作检查结果，请重试。");
            const currentOutline = writingStrongModelAnalysisPlan({ noteIds, project: writingState.project, scaffold: writingState.scaffold }).request?.currentOutline;
            if (JSON.stringify(currentOutline) !== JSON.stringify(analysisRequest.currentOutline)) {
              return { ...response, summary: "提纲已改变，以下建议基于检查前的版本。需要时请重新检查。" };
            }
            return response;
          } catch (error) {
            throw new Error(aiErrorMessage(error));
          }
        }
      );
      if (contextualState.status === "needs_setup" || contextualState.status === "needs_remote_confirmation") return;
      if (contextualState.status === "failed") throw new Error(contextualState.error || "写作检查失败");
      const result = contextualState.result?.raw || null;
      if (!isCurrentRequest()) return;
      if (!result || typeof result !== "object") throw new Error("AI 未返回写作检查结果，请重试。");
      writingState.strongModelResult = result;
      setStatus("写作检查已完成，请确认结果后再修改提纲", "ok");
    } catch (error) {
      if (!isCurrentRequest()) return;
      writingState.strongModelError = String(error?.message || error);
      setStatus(`检查提纲失败：${writingState.strongModelError}`, "warn");
    } finally {
      if (writingState.strongModelRevision !== requestRevision) return;
      writingState.strongModelLoading = false;
      renderWritingPanel();
    }
  }

  async function resumePendingContextualAiAction() {
    let deps = runtimeDeps();
    const pending = deps.writingState?.pendingContextualAiAction || null;
    if (pending?.actionId !== "check_outline") return false;
    const pendingProjectId = String(pending.projectId || "").trim();
    const currentProjectId = String(deps.writingState?.project?.id || "").trim();
    if (pendingProjectId && pendingProjectId !== currentProjectId) {
      deps.writingState.pendingContextualAiAction = null;
      deps.setStatus?.("写作主题已变化，已取消刚才的提纲检查。", "warn");
      return false;
    }
    await deps.refreshAiRoutePreview?.({ render: false });
    deps = runtimeDeps();
    if (isRemoteAiRuntimeMode(deps.aiRuntimeMode) && deps.aiAvailable === false) return false;
    if (!isRemoteAiRuntimeMode(deps.aiRuntimeMode)) {
      const localReady = await deps.ensureLocalAiReadyForFeature?.({ feature: "writing_check", openSettings: false });
      if (localReady?.ready === false) return false;
    }
    if (deps.writingState) deps.writingState.pendingContextualAiAction = null;
    deps.activateModule?.("writing");
    deps.setStatus?.("AI 已可用，继续检查提纲。", "ok");
    await prepareWritingStrongModelAnalysis();
    return true;
  }

  return {
    createWritingProjectFromCurrentBasket,
    createWritingProjectFromImportedPermanentNotes,
    prepareWritingStrongModelAnalysis,
    resumePendingContextualAiAction,
    contextualAiController
  };
}
