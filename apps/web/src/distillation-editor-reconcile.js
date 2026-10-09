import { reconcileDistillationTab } from "./distillation-body-merge.js";
import { captureDistillationEditorPosition, restoreDistillationEditorPosition } from "./distillation-editor-position.js";

export function reconcileDistillationEditorResult(host, saved, currentBody, tab, baseline) {
  const matchesOriginal = tab.savedFileRevision === baseline.savedFileRevision
    && tab.savedBody === baseline.savedBody && tab.savedTitle === baseline.savedTitle;
  const matchesResult = tab.savedFileRevision === saved.fileRevision && tab.savedBody === saved.body
    && tab.savedTitle === (saved.title || baseline.title);
  if (!matchesOriginal && !matchesResult) return false;
  if (matchesResult && currentBody === tab.body) {
    if (tab.dirty) host.writeDraft?.(tab);
    return true;
  }
  const position = captureDistillationEditorPosition(host);
  if (!reconcileDistillationTab(tab, saved, baseline, currentBody)) {
    host.writeDraft?.(tab);
    host.onStatus?.("观点已保存；正文修改与它冲突，未覆盖任何输入。请保留修改后重新打开核对。", "warn");
    return false;
  }
  host.fillEditorFromTab?.();
  restoreDistillationEditorPosition(host, position, currentBody, tab.body);
  if (tab.dirty) host.writeDraft?.(tab);
  return true;
}
