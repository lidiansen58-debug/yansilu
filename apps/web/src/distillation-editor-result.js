import { reconcileDistillationTab } from "./distillation-body-merge.js";

export function distillationPanelHasFocus(host) {
  const panel = host.els?.relatedPanel;
  return panel?.contains?.(panel.ownerDocument.activeElement) === true;
}

export function syncDistillationEditorResult(host, saved, previousBody, options = {}) {
  if (!saved || typeof saved.body !== "string") return;
  const panelFocused = options.panelFocused ?? distillationPanelHasFocus(host);
  const currentBody = host.getEditorValue?.();
  const tab = host.activeTab?.();
  const baseline = saved.distillationEditorBaseline;
  if (tab && baseline && typeof currentBody === "string") {
    const matchesOriginal = tab.savedFileRevision === baseline.savedFileRevision
      && tab.savedBody === baseline.savedBody && tab.savedTitle === baseline.savedTitle;
    const matchesResult = tab.savedFileRevision === saved.fileRevision && tab.savedBody === saved.body
      && tab.savedTitle === (saved.title || baseline.title);
    if (!matchesOriginal && !matchesResult) return;
    if (matchesResult && currentBody === tab.body) {
      if (tab.dirty) host.writeDraft?.(tab);
      if (panelFocused && !distillationPanelHasFocus(host)) host.permanentNoteWorkspace?.().focusWorkspace?.();
      return;
    }
    if (!reconcileDistillationTab(tab, saved, baseline, currentBody)) {
      host.writeDraft?.(tab);
      host.onStatus?.("观点已保存；正文修改与它冲突，未覆盖任何输入。请保留修改后重新打开核对。", "warn");
      return;
    }
    host.fillEditorFromTab?.();
    if (tab.dirty) host.writeDraft?.(tab);
    if (panelFocused && !distillationPanelHasFocus(host)) host.permanentNoteWorkspace?.().focusWorkspace?.();
    return;
  }
  const hasUnsavedBody = host.activeTab?.()?.dirty === true && currentBody !== saved.body;
  if (hasUnsavedBody || (typeof previousBody === "string" && currentBody !== previousBody && currentBody !== saved.body)) {
    host.updateActiveTabFromEditor?.();
    host.onStatus?.("观点已保存；正文还有新的修改，核对后再保存。", "warn");
    return;
  }
  host.fillEditorFromTab?.();
  if (panelFocused && !distillationPanelHasFocus(host)) host.permanentNoteWorkspace?.().focusWorkspace?.();
}
