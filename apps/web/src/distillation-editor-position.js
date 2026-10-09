import { mapDistillationSelection } from "./distillation-body-merge.js";

export function captureDistillationEditorPosition(host) {
  const { editorHost, wysiwygHost, body } = host.els || {};
  const active = (editorHost || wysiwygHost || body)?.ownerDocument?.activeElement;
  if (!active || !(active === body || editorHost?.contains(active) || wysiwygHost?.contains(active))) return null;
  return { selection: host.editorSelection?.(), scroll: host.captureEditorScrollState?.() };
}

export function restoreDistillationEditorPosition(host, position, before, after) {
  if (!position) return;
  const selection = mapDistillationSelection(before, after, position.selection);
  if (selection) host.setEditorSelectionRange?.(selection.from, selection.to);
  host.restoreEditorScrollState?.(position.scroll);
}
