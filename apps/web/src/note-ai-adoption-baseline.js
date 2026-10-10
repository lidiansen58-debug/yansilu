import { reconcileDistillationEditorResult } from "./distillation-editor-reconcile.js";

export function captureNoteAiAdoptionBaseline(host, note) {
  const tab = host.activeTab?.();
  if (!tab || !/^[a-f0-9]{64}$/.test(note.fileRevision || "") || tab.savedFileRevision !== note.fileRevision ||
    typeof tab.savedBody !== "string") throw new Error("笔记版本尚未核对，暂时不能采纳。请保留输入并重新打开笔记。");
  return { tab, note, noteRevision: note.fileRevision, scope: host.state?.noteMoveVaultScope, vaultPath: host.vaultScope?.(),
    baseline: tab && { body: tab.body, title: tab.title, savedBody: tab.savedBody,
      savedTitle: tab.savedTitle, savedFileRevision: tab.savedFileRevision, dirty: tab.dirty } };
}

export function applyNoteAiAdoptionBaseline(host, note, saved, context) {
  if (!context) { Object.assign(note, saved); return true; }
  const { tab, baseline } = context;
  if (host.state?.noteMoveVaultScope !== context.scope || host.vaultScope?.() !== context.vaultPath || host.activeNote?.() !== note || host.activeTab?.() !== tab ||
    note !== context.note || note.fileRevision !== context.noteRevision ||
    !tab || tab.savedFileRevision !== baseline.savedFileRevision || tab.savedBody !== baseline.savedBody ||
    tab.savedTitle !== baseline.savedTitle || context.noteRevision !== baseline.savedFileRevision) {
    host.onStatus?.("AI 草稿已处理，但编辑上下文已变化。请保留当前输入并重新打开笔记核对。", "warn");
    return false;
  }
  Object.assign(note, saved);
  const currentBody = host.getEditorValue?.() ?? tab.body;
  return reconcileDistillationEditorResult(host, saved, currentBody, tab, baseline);
}
