import { saveWritingInput, readWritingInput, clearWritingInput } from "./writing-input-recovery.js";
import { normalizeWritingOutlineSections } from "./writing-workbench-model.js";

const contexts = new WeakMap();
const valid = item => Array.isArray(item?.sections) && item.sections.every(section => section && typeof section.heading === "string")
  && Array.isArray(item.openQuestions);
const data = item => ({ sections: structuredClone(item.sections || []), openQuestions: structuredClone(item.open_questions || item.openQuestions || []) });
const token = item => JSON.stringify([normalizeWritingOutlineSections(item).map(section => [section.heading, section.purpose,
  section.evidence_note_ids, section.gaps || [], section.counterpoints || [], section.open_questions || []]), item.open_questions || item.openQuestions || []]);

function context(deps, id = deps.writingState?.scaffold?.id, projectId = deps.writingState?.project?.id) {
  if (!id || !projectId || deps.state?.noteMoveVaultSwitching || deps.state?.noteMoveVaultUncertain) return null;
  const writing = deps.writingState;
  const records = contexts.get(writing) || new Map();
  contexts.set(writing, records);
  const name = JSON.stringify(["outline", projectId, id]), key = JSON.stringify([deps.getVaultPath?.() || "", name]);
  const entry = records.get(key) || {};
  records.set(key, entry);
  return { entry, name, id };
}

export function beginWritingOutlineEdit(deps) {
  const current = context(deps);
  if (current && !current.entry.baseline) current.entry.baseline = data(deps.writingState.scaffold);
}

export function checkpointWritingOutline(deps) {
  const current = context(deps);
  if (!current) return;
  beginWritingOutlineEdit(deps);
  saveWritingInput(deps, current.name, { noteId: current.id, markdown: String(deps.writingState.scaffoldMarkdown || ""),
    ...data(deps.writingState.scaffold), baseline: current.entry.baseline, submitted: current.entry.submitted || null });
}

export function prepareWritingOutlineSave(deps, id, projectId, submitted) {
  const current = context(deps, id, projectId);
  if (!current) return {};
  current.entry.baseline ||= data(submitted);
  current.entry.submitted = data(submitted);
  const cached = readWritingInput(deps, current.name);
  if (cached) saveWritingInput(deps, current.name, { ...cached, baseline: current.entry.baseline, submitted: current.entry.submitted });
  return { expectedOutline: structuredClone(current.entry.baseline) };
}

export function acknowledgeWritingOutlineSave(deps, updated, projectId) {
  const current = context(deps, updated.id, projectId);
  if (!current) return;
  current.entry.baseline = data(updated);
  current.entry.submitted = null;
  const cached = readWritingInput(deps, current.name);
  if (!cached) return;
  if (token(cached) === token(updated)) clearWritingInput(deps, current.name);
  else saveWritingInput(deps, current.name, { ...cached, baseline: current.entry.baseline, submitted: null });
}

export function acceptSavedWritingOutline(deps, projectId, server) {
  const current = context(deps, server.id, projectId);
  if (!current) throw new Error("笔记库正在切换，未替换当前提纲。");
  clearWritingInput(deps, current.name);
  current.entry.baseline = data(server);
  current.entry.submitted = null;
}

export function restoreWritingOutline(deps, projectId, server) {
  if (!server?.id) return { item: server, restored: false };
  const current = context(deps, server.id, projectId);
  if (!current) return { item: server, restored: false };
  const cached = readWritingInput(deps, current.name);
  current.entry.baseline = data(server);
  current.entry.submitted = null;
  if (!cached) return { item: server, restored: false };
  if (cached.noteId !== server.id || !valid(cached) || !valid(cached.baseline) || (cached.submitted && !valid(cached.submitted))) {
    throw new Error("本机提纲恢复记录不完整，原记录仍保留，请先核对。");
  }
  if (token(cached) === token(server)) { clearWritingInput(deps, current.name); return { item: server, restored: false }; }
  const conflict = token(server) !== token(cached.baseline) && (!cached.submitted || token(server) !== token(cached.submitted));
  if (conflict) current.entry.baseline = cached.baseline;
  saveWritingInput(deps, current.name, { ...cached, baseline: current.entry.baseline, submitted: null });
  return { item: { ...server, sections: structuredClone(cached.sections), open_questions: structuredClone(cached.openQuestions),
    markdown: cached.markdown }, restored: true, conflict };
}
