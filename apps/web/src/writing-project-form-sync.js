import { captureWritingProjectCreationContext } from "./writing-project-creation-context.js";

const fields = [["writingTitle", "title"], ["writingGoal", "goal"], ["writingAudience", "audience"], ["writingTone", "tone"]];
const formSnapshot = (deps, project = {}) => fields.map(([id, key]) => {
  const input = deps.$?.(id);
  return { input, key, value: String(input?.value ?? project[key] ?? ""), start: input?.selectionStart, end: input?.selectionEnd };
});
const formPayload = snapshot => Object.fromEntries(snapshot.map(({ key, value }) => [key, value.trim()]));
const restoreSelection = ({ input, start, end }) => {
  if (Number.isInteger(start) && Number.isInteger(end)) input?.setSelectionRange?.(start, end);
};

export async function syncWritingProjectForm(deps = {}, { force = false } = {}) {
  const writingState = deps.writingState || {};
  if (!writingState.project?.id || typeof deps.syncWritingProject !== "function") return writingState.project || null;
  const existing = writingState.projectFormSync;
  if (existing?.context.isCurrent()) return existing.promise.catch(error => { existing.context.assertCurrent(); throw error; });
  const context = captureWritingProjectCreationContext(deps);
  const job = { context };
  job.promise = (async () => {
    while (true) {
      context.assertCurrent();
      const project = writingState.project, form = formPayload(formSnapshot(deps, project));
      if (!form.title) throw new Error("请填写文章题目，当前输入已保留。");
      if (!force && Object.entries(form).every(([key, value]) => value === String(project[key] || ""))) return project;
      force = false;
      const saved = await deps.syncWritingProject(project.id, context.bindPayload({ ...form,
        basketNoteIds: deps.parseWritingBasketIds?.() || project.basket_note_ids || [] }));
      context.assertCurrent();
      if (!saved?.id || saved.id !== project.id) throw new Error("未能确认题目和问题已保存，请重试；当前输入已保留。");
      writingState.project = saved;
    }
  })();
  writingState.projectFormSync = job;
  try { return await job.promise; }
  catch (error) { context.assertCurrent(); throw error; }
  finally { if (writingState.projectFormSync === job) delete writingState.projectFormSync; }
}

export async function createWritingProjectKeepingForm(deps, context, payload) {
  const writingState = deps.writingState || {}, token = {};
  const before = formSnapshot(deps);
  writingState.projectCreationPending = token;
  try {
    const project = await deps.createWritingProject(context.bindPayload(payload));
    context.assertCurrent();
    writingState.project = project;
    context.acceptLocalChanges();
    const live = formSnapshot(deps, project);
    for (const [index, item] of live.entries()) {
      if (item.input && item.value === before[index].value && project[item.key] !== undefined) {
        item.input.value = project[item.key] || "";
        restoreSelection(item);
      }
    }
    const saved = await syncWritingProjectForm(deps);
    context.assertCurrent();
    const latest = formSnapshot(deps, saved);
    deps.populateWritingFormFromProject?.(saved);
    for (const { input, value, start, end } of latest) {
      if (!input) continue;
      input.value = value;
      restoreSelection({ input, start, end });
    }
    context.acceptLocalChanges();
    return saved;
  } finally {
    if (writingState.projectCreationPending === token) delete writingState.projectCreationPending;
  }
}
