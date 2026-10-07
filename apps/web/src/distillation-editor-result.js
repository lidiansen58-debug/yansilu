export function distillationPanelHasFocus(host) {
  const panel = host.els?.relatedPanel;
  return panel?.contains?.(panel.ownerDocument.activeElement) === true;
}

export function syncDistillationEditorResult(host, saved, previousBody, options = {}) {
  if (!saved || typeof saved.body !== "string") return;
  const panelFocused = options.panelFocused ?? distillationPanelHasFocus(host);
  const currentBody = host.getEditorValue?.();
  if (typeof previousBody === "string" && currentBody !== previousBody && currentBody !== saved.body) {
    host.updateActiveTabFromEditor?.();
    host.onStatus?.("观点已保存；正文还有新的修改，核对后再保存。", "warn");
    return;
  }
  host.fillEditorFromTab?.();
  if (panelFocused && !distillationPanelHasFocus(host)) host.permanentNoteWorkspace?.().focusWorkspace?.();
}
