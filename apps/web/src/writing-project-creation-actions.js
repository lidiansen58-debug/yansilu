import { currentBasketWritingProjectPlan, importedPermanentNotesWritingProjectPlan, writingProjectFormInput } from "./writing-project-action-model.js";
import { planImportedPermanentNotesWritingEntry } from "./writing-center-flow.js";
import { createdNoteIdsByTypeFromImportPayload } from "./prototype-import-result-helpers.js";
import { uniqueStrings } from "./prototype-collection-utils.js";
import { captureWritingProjectCreationContext } from "./writing-project-creation-context.js";
import { createWritingProjectKeepingForm } from "./writing-project-form-sync.js";

export function createWritingProjectCreationActions(depsProvider = () => ({})) {
  const formValue = (selectById, id) => String(selectById(id)?.value || "");
  async function createWritingProjectFromCurrentBasket() {
    const deps = depsProvider() || {};
    const context = captureWritingProjectCreationContext(deps);
    const {
      $: selectById = () => null,
      loadWritingDraftVersions = async () => {},
      loadWritingProjectsList = async () => {},
      loadWritingScaffoldVersions = async () => {},
      parseWritingBasketIds = () => [],
      renderWritingPanel = () => {},
      setStatus = () => {},
      showWritingResult = () => {},
      syncWritingLocalBookIdeasFromProject = () => {},
      writingState = {}
    } = deps;
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
      // Article themes start with an empty chapter directory. Suggested book
      // designs become persisted chapters only through an explicit book action.
      const project = await createWritingProjectKeepingForm(deps, context, { ...actionPlan.payload, bookStructure: { schema_version: 1, parts: [] } });
      context.assertCurrent();
      writingState.project = project;
      context.acceptLocalChanges();
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
      context.assertCurrent();
      await loadWritingScaffoldVersions();
      context.assertCurrent();
      await loadWritingDraftVersions();
      context.assertCurrent();
      renderWritingPanel();
      setStatus(`可写主题已确定：${project?.id}`, "ok");
      return project;
    } catch (error) {
      if (!context.isCurrent()) return null;
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
    const deps = depsProvider() || {};
    const context = captureWritingProjectCreationContext(deps);
    const {
      $: selectById = () => null,
      beginWritingEntry = () => {},
      ensureNotesLoaded = async () => {},
      importState = {},
      openWritingModule = async () => {},
      setStatus = () => {},
      showWritingResult = () => {},
      suggestedWritingProjectTitle = () => "",
      syncWritingLocalBookIdeasFromProject = () => {},
      writingState = {}
    } = deps;
    const noteIds = createdNoteIdsByTypeFromImportPayload(importState.lastResultPayload || {}, "permanent");
    if (!noteIds.length) {
      setStatus("当前导入结果里没有可形成主题的永久笔记", "warn");
      return false;
    }
    try { await ensureNotesLoaded(noteIds); }
    catch (error) { context.assertCurrent(); throw error; }
    context.assertCurrent();
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
    context.acceptLocalChanges();
    try {
      const project = await createWritingProjectKeepingForm(deps, context, actionPlan.payload);
      context.assertCurrent();
      writingState.project = project;
      context.acceptLocalChanges();
      syncWritingLocalBookIdeasFromProject(project);
      showWritingResult({
        stage: "writing_project",
        writingProjectId: project?.id,
        title: project?.title,
        basketNoteIds: project?.basket_note_ids,
        basketNotes: project?.basket_notes
      });
      await openWritingModule({ statusMessage: `已从导入结果确定可写主题：${project?.id}` });
      context.assertCurrent();
      return true;
    } catch (error) {
      if (!context.isCurrent()) return false;
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

  return { createWritingProjectFromCurrentBasket, createWritingProjectFromImportedPermanentNotes };
}
