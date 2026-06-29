import {
  currentBasketWritingProjectPlan,
  importedPermanentNotesWritingProjectPlan,
  writingProjectFormInput,
  writingStrongModelAnalysisPlan,
  writingStrongModelResultMeta
} from "./writing-project-action-model.js";
import {
  planImportedPermanentNotesWritingEntry
} from "./writing-center-flow.js";
import {
  createdNoteIdsByTypeFromImportPayload
} from "./prototype-import-result-helpers.js";
import {
  writingAnalysisSystemMessageDeliveryOptions,
  writingAnalysisSystemMessageForResult
} from "./prototype-system-messages.js";
import {
  uniqueStrings
} from "./prototype-collection-utils.js";

export function createWritingProjectRuntimeController(depsProvider = () => ({})) {
  const runtimeDeps = () => depsProvider() || {};
  const formValue = (selectById, id) => String(selectById(id)?.value || "");

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
      setStatus(`当前项目已创建：${writingState.project.id}。下一步生成草稿骨架或打开当前项目。`, "warn");
      return writingState.project;
    }
    if (actionPlan.reason === "missing_title") {
      setStatus("请先填写项目标题", "warn");
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
      setStatus(`项目已创建：${project?.id}`, "ok");
      return project;
    } catch (error) {
      showWritingResult({
        stage: "writing_project_error",
        message: String(error?.message || error),
        code: error?.code || null,
        details: error?.details || null
      });
      setStatus(`项目创建失败：${String(error?.message || error)}`, "bad");
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
      setStatus("当前导入结果里没有可创建项目的 PermanentNote", "warn");
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
      await openWritingModule({ statusMessage: `已从导入结果创建项目：${project?.id}` });
      return true;
    } catch (error) {
      showWritingResult({
        stage: "writing_project_error",
        message: String(error?.message || error),
        code: error?.code || null,
        details: error?.details || null
      });
      setStatus(`从导入结果创建项目失败：${String(error?.message || error)}`, "bad");
      return false;
    }
  }

  async function prepareWritingStrongModelAnalysis() {
    const {
      $: selectById = () => null,
      addSystemMessage = () => {},
      analyzeWritingWithStrongModel = async () => null,
      parseWritingBasketIds = () => [],
      renderWritingPanel = () => {},
      setStatus = () => {},
      window = globalThis.window,
      writingState = {}
    } = runtimeDeps();
    const noteIds = parseWritingBasketIds();
    const preflightPlan = writingStrongModelAnalysisPlan({
      noteIds,
      project: writingState.project,
      confirmed: true
    });
    if (preflightPlan.reason === "missing_basket") {
      setStatus("先把永久笔记加入写作篮，再准备强模型分析", "warn");
      return;
    }
    if (preflightPlan.reason === "missing_project") {
      setStatus("先创建写作项目，再准备强模型分析", "warn");
      return;
    }
    const confirmed =
      typeof window === "undefined" ||
      window.confirm("这会为远程强模型准备写作分析请求。当前实现不会直接调用模型，但请求包包含写作篮笔记摘要。继续？");
    const actionPlan = writingStrongModelAnalysisPlan({
      noteIds,
      project: writingState.project,
      form: {
        goal: formValue(selectById, "writingGoal"),
        audience: formValue(selectById, "writingAudience")
      },
      confirmed
    });
    if (!actionPlan.ok) return;
    const requestRevision = writingState.strongModelRevision + 1;
    writingState.strongModelRevision = requestRevision;
    writingState.strongModelLoading = true;
    writingState.strongModelResult = null;
    writingState.strongModelError = "";
    renderWritingPanel();
    try {
      const result = await analyzeWritingWithStrongModel(actionPlan.request);
      if (writingState.strongModelRevision !== requestRevision) return;
      writingState.strongModelResult = result;
      const { model, artifactCount } = writingStrongModelResultMeta(result);
      const systemMessage = writingAnalysisSystemMessageForResult({
        projectId: writingState.project?.id || "",
        noteIds,
        model,
        artifactCount
      });
      addSystemMessage(systemMessage, writingAnalysisSystemMessageDeliveryOptions({ artifactCount }));
      setStatus(`已准备 ${model} 写作分析请求包，尚未直接调用远程模型`, "ok");
    } catch (error) {
      if (writingState.strongModelRevision !== requestRevision) return;
      writingState.strongModelError = String(error?.message || error);
      setStatus(`强模型写作分析准备失败：${writingState.strongModelError}`, "warn");
    } finally {
      if (writingState.strongModelRevision !== requestRevision) return;
      writingState.strongModelLoading = false;
      renderWritingPanel();
    }
  }

  return {
    createWritingProjectFromCurrentBasket,
    createWritingProjectFromImportedPermanentNotes,
    prepareWritingStrongModelAnalysis
  };
}
