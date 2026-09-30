import { completeSmartNotesDemoStep, SMART_NOTES_DEMO_WALKTHROUGH_STEPS, SMART_NOTES_SHORT_PRACTICE_STEPS, smartNotesDemoJudgmentStep } from "./beginner-onboarding-flow.js";

const sessions = new WeakMap();
const allowedSteps = new Set([...SMART_NOTES_DEMO_WALKTHROUGH_STEPS, ...SMART_NOTES_SHORT_PRACTICE_STEPS].map((step) => step.key));

export function smartNotesDemoPendingJudgment(state, noteId) {
  return Object.values(state.smartNotesDemoPendingSteps || {}).find((item) => item.noteId === noteId && smartNotesDemoJudgmentStep(item.key));
}

export function smartNotesDemoPendingDraft(state, projectId) {
  return Object.values(state.smartNotesDemoPendingSteps || {}).find((item) => item.projectId === projectId && ["write-from-notes", "practice-draft"].includes(item.key));
}

function normalizePath(value) {
  const path = String(value || "").trim().replaceAll("\\", "/").replace(/\/+$/, "");
  return /^[a-z]:\//i.test(path) ? path.toLowerCase() : path;
}

export function configureSmartNotesDemoProgress(state, { getVaultPath = () => "", getStorage = () => null } = {}) {
  sessions.set(state, { getVaultPath, getStorage, path: "" });
}

function synchronize(state) {
  const session = sessions.get(state);
  if (!session || state.noteMoveVaultSwitching || state.noteMoveVaultUncertain) return;
  const path = normalizePath(session.getVaultPath());
  if (!path) {
    session.path = "";
    state.smartNotesDemoCompletedSteps = [];
    state.smartNotesDemoPendingSteps = {};
    state.smartNotesDemoProgressScope = null;
    return;
  }
  if (path === session.path && sameScope(state, state.smartNotesDemoProgressScope)) return;
  session.path = path;
  let completed = [];
  try {
    const saved = JSON.parse(session.getStorage()?.getItem(`yansilu.demo-practice.v1:${encodeURIComponent(path)}`) || "[]");
    if (Array.isArray(saved)) completed = [...new Set(saved.filter((key) => allowedSteps.has(key)))];
  } catch { /* Restricted or damaged browser storage must not block the practice. */ }
  state.smartNotesDemoCompletedSteps = completed;
  state.smartNotesDemoPendingSteps = {};
  state.smartNotesDemoProgressScope = scope(state);
}

function persist(state) {
  const session = sessions.get(state);
  if (!session?.path || normalizePath(session.getVaultPath()) !== session.path) return;
  try {
    session.getStorage()?.setItem(`yansilu.demo-practice.v1:${encodeURIComponent(session.path)}`, JSON.stringify(state.smartNotesDemoCompletedSteps));
  } catch { /* Keep the current session usable if persistence is unavailable. */ }
}

function scope(state) {
  return [state.noteMoveVaultScope, state.vaultScopeKey];
}

function sameScope(state, recorded) {
  return Array.isArray(recorded) && scope(state).every((value, index) => value === recorded[index])
    && !state.noteMoveVaultSwitching && !state.noteMoveVaultUncertain;
}

function clean(value) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

export function smartNotesDemoCompletedStepsForState(state = {}) {
  synchronize(state);
  return sameScope(state, state.smartNotesDemoProgressScope) ? state.smartNotesDemoCompletedSteps || [] : [];
}

export function beginSmartNotesDemoPractice(state = {}, { key, noteId = "", projectId = "", baseline = "" } = {}) {
  synchronize(state);
  if (!sameScope(state, state.smartNotesDemoProgressScope)) {
    state.smartNotesDemoCompletedSteps = [];
    state.smartNotesDemoPendingSteps = {};
  }
  state.smartNotesDemoProgressScope = scope(state);
  const pending = { key, noteId, projectId, baseline, scope: scope(state) };
  state.smartNotesDemoPendingSteps ||= {};
  // Reopening the same task must not reset the original comparison text.
  const existing = state.smartNotesDemoPendingSteps[key];
  if (existing && sameScope(state, existing.scope) && existing.noteId === noteId && existing.projectId === projectId) return existing;
  state.smartNotesDemoPendingSteps[key] = pending;
  return pending;
}

function finish(state, pending) {
  synchronize(state);
  if (!pending || state.smartNotesDemoPendingSteps?.[pending.key] !== pending || !sameScope(state, pending.scope)) return false;
  state.smartNotesDemoCompletedSteps = completeSmartNotesDemoStep(smartNotesDemoCompletedStepsForState(state), pending.key);
  delete state.smartNotesDemoPendingSteps[pending.key];
  persist(state);
  return true;
}

export function completeSmartNotesDemoSavedJudgment(state, saved, pending) {
  const thesis = clean(saved?.thesis);
  const status = saved?.distillationStatus || saved?.distillation_status;
  if (!smartNotesDemoJudgmentStep(pending?.key) || saved?.id !== pending.noteId || status !== "confirmed"
    || !thesis || thesis === clean(pending.baseline)) return false;
  return finish(state, pending);
}

export function completeSmartNotesDemoSavedRelation(state, sourceNoteId, relation, requestedRationale) {
  const pending = Object.values(state.smartNotesDemoPendingSteps || {}).find((item) => item.noteId === sourceNoteId && ["first-relation", "practice-relation"].includes(item.key));
  if (!relation?.id || !clean(requestedRationale) || clean(relation.rationale) !== clean(requestedRationale)) return false;
  return pending?.noteId === sourceNoteId && finish(state, pending);
}

function articleText(body) {
  return clean(String(body || "").replace(/^\s*#\s+[^\n]*(?:\n|$)/, ""));
}

export function completeSmartNotesDemoSavedDraft(state, projectId, body, pending) {
  const content = articleText(body);
  if (!["write-from-notes", "practice-draft"].includes(pending?.key) || pending.projectId !== projectId
    || !content || content === articleText(pending.baseline)) return false;
  return finish(state, pending);
}

export function completeSmartNotesDemoExport(state, projectId, result, pending) {
  if (pending?.key !== "practice-export" || pending.projectId !== projectId || result?.status !== "completed" || !result.articlePath) return false;
  return finish(state, pending);
}
