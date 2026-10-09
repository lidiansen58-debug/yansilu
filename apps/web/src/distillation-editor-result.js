import { reconcileDistillationEditorResult } from "./distillation-editor-reconcile.js";

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
    if (reconcileDistillationEditorResult(host, saved, currentBody, tab, baseline)
      && panelFocused && !distillationPanelHasFocus(host)) host.permanentNoteWorkspace?.().focusWorkspace?.();
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
