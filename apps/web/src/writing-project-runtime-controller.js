import {
  currentBasketWritingProjectPlan,
  importedPermanentNotesWritingProjectPlan,
  writingProjectFormInput,
  writingStrongModelAnalysisPlan
} from "./writing-project-action-model.js";
import {
  planImportedPermanentNotesWritingEntry
} from "./writing-center-flow.js";
import {
  createdNoteIdsByTypeFromImportPayload
} from "./prototype-import-result-helpers.js";
import {
  uniqueStrings
} from "./prototype-collection-utils.js";
import { createContextualAiActionController } from "./contextual-ai-action-controller.js";

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
      if (deps.writingState) deps.writingState.contextualAiActionState = actionState;
      deps.renderWritingPanel?.();
    },
    onIgnore: async ({ status } = {}) => {
      const deps = runtimeDeps();
      if (deps.writingState) {
        deps.writingState.strongModelResult = null;
        deps.writingState.strongModelError = "";
        deps.writingState.strongModelLoading = false;
      }
      deps.setStatus?.(status === "needs_remote_confirmation" ? "已取消检查。" : "已关闭检查结果。", "ok");
      return { clear: true };
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

  async function createWritingProjectFromCurrentBasket() {
    const {
      $: selectById = () => null,
      createWritingProject = async () => null,
      currentWritingBookStructure = () => null,
      loadWritingDraftVersions = async () => {},
      loadWritingProjectsList = async () => {},
      loadWritingScaffoldVersions = async () => {},
      parseWritingBasketIds = () => [],
      renderWritingPanel = () => {},
      setStatus = () => {},
      showWritingResult = () => {},
      syncWritingLocalBookIdeasFromProject = () => {},
      writingKnownNoteById = () => null,
      writingState = {}
    } = runtimeDeps();
    const form = writingProjectFormInput({
      title: formValue(selectById, "writingTitle"),
      goal: formValue(selectById, "writingGoal"),
      audience: formValue(selectById, "writingAudience"),
      tone: formValue(selectById, "writingTone")
    });
    const basketNoteIds = parseWritingBasketIds();
    const relatedIndexIds = uniqueStrings(writingState.sourceIndexIds);
    const actionPlan = currentBasketWritingProjectPlan({
      form,
      basketNoteIds,
      relatedIndexIds,
      existingProject: writingState.project
    });
    if (actionPlan.reason === "existing_project") {
      setStatus(`当前主题已确定：${writingState.project.id}。下一步生成文章提纲或打开当前草稿。`, "warn");
      return writingState.project;
    }
    if (actionPlan.reason === "missing_title") {
      setStatus("请先填写主题标题", "warn");
      return null;
    }
    if (actionPlan.reason === "missing_basket") {
      setStatus("请先加入至少一条永久笔记", "warn");
      return null;
    }
    try {
      const bookStructure = currentWritingBookStructure({
        notes: basketNoteIds.map((noteId) => writingKnownNoteById(noteId) || { id: noteId, title: noteId }),
        includeLocalIdeas: true
      });
      const project = await createWritingProject({ ...actionPlan.payload, bookStructure });
      writingState.project = project;
      syncWritingLocalBookIdeasFromProject(project);
      writingState.scaffold = null;
      writingState.scaffoldMarkdown = "";
      writingState.draftMarkdown = "";
      writingState.draftSaveState = "idle";
      showWritingResult({
        stage: "writing_project",
        writingProjectId: project?.id,
        title: project?.title,
        relatedIndexIds: project?.related_index_ids,
        basketNoteIds: project?.basket_note_ids,
        basketNotes: project?.basket_notes
      });
      await loadWritingProjectsList();
      await loadWritingScaffoldVersions();
      await loadWritingDraftVersions();
      renderWritingPanel();
      setStatus(`可写主题已确定：${project?.id}`, "ok");
      return project;
    } catch (error) {
      showWritingResult({
        stage: "writing_project_error",
        message: String(error?.message || error),
        code: error?.code || null,
        details: error?.details || null
      });
      setStatus(`确定可写主题失败：${String(error?.message || error)}`, "bad");
      return null;
    }
  }

  async function createWritingProjectFromImportedPermanentNotes() {
    const {
      $: selectById = () => null,
      beginWritingEntry = () => {},
      createWritingProject = async () => null,
      ensureNotesLoaded = async () => {},
      importState = {},
      openWritingModule = async () => {},
      populateWritingFormFromProject = () => {},
      setStatus = () => {},
      showWritingResult = () => {},
      suggestedWritingProjectTitle = () => "",
      syncWritingLocalBookIdeasFromProject = () => {},
      writingState = {}
    } = runtimeDeps();
    const noteIds = createdNoteIdsByTypeFromImportPayload(importState.lastResultPayload || {}, "permanent");
    if (!noteIds.length) {
      setStatus("当前导入结果里没有可形成主题的永久笔记", "warn");
      return false;
    }
    await ensureNotesLoaded(noteIds);
    const title = suggestedWritingProjectTitle(noteIds);
    const entryPlan = planImportedPermanentNotesWritingEntry({ noteIds, title });
    const form = writingProjectFormInput({
      goal: formValue(selectById, "writingGoal"),
      audience: formValue(selectById, "writingAudience"),
      tone: formValue(selectById, "writingTone")
    });
    const actionPlan = importedPermanentNotesWritingProjectPlan({
      noteIds,
      title,
      form,
      entryPlan
    });
    if (entryPlan.shouldBeginEntry) {
      beginWritingEntry(entryPlan.noteIds, {
        title: entryPlan.title,
        source: entryPlan.source
      });
    }
    try {
      const project = await createWritingProject(actionPlan.payload);
      writingState.project = project;
      syncWritingLocalBookIdeasFromProject(project);
      populateWritingFormFromProject(project);
      showWritingResult({
        stage: "writing_project",
        writingProjectId: project?.id,
        title: project?.title,
        basketNoteIds: project?.basket_note_ids,
        basketNotes: project?.basket_notes
      });
      await openWritingModule({ statusMessage: `已从导入结果确定可写主题：${project?.id}` });
      return true;
    } catch (error) {
      showWritingResult({
        stage: "writing_project_error",
        message: String(error?.message || error),
        code: error?.code || null,
        details: error?.details || null
      });
      setStatus(`从导入结果确定可写主题失败：${String(error?.message || error)}`, "bad");
      return false;
    }
  }

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
    const requestRevision = writingState.strongModelRevision + 1;
    writingState.strongModelRevision = requestRevision;
    writingState.strongModelLoading = true;
    writingState.strongModelResult = null;
    writingState.strongModelError = "";
    renderWritingPanel();
    try {
      const contextualState = await contextualAiController.run(
        "check_outline",
        { noteIds, remoteConfirmed: options.remoteConfirmed === true, returnContext: { view: "writing", projectId: writingState.project?.id || "" } },
        () => analyzeWritingWithStrongModel(analysisRequest)
      );
      if (contextualState.status === "needs_setup" || contextualState.status === "needs_remote_confirmation") return;
      if (contextualState.status === "failed") throw new Error(contextualState.error || "写作检查失败");
      const result = contextualState.result?.raw || null;
      if (writingState.strongModelRevision !== requestRevision) return;
      writingState.strongModelResult = result;
      setStatus("写作检查已完成，请确认结果后再修改提纲", "ok");
    } catch (error) {
      if (writingState.strongModelRevision !== requestRevision) return;
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
