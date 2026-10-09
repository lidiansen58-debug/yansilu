import { mapDistillationSelection as mapTextSelection } from "./distillation-body-merge.js";

function withoutFinalNewlines(value) {
  return String(value).replace(/\r\n/g, "\n").replace(/\n+$/, "");
}

/** A save's final newline must not replace the document, caret or undo history. */
export function reconcileWritingDocumentValue(editor, host, before, after) {
  if (withoutFinalNewlines(before) === withoutFinalNewlines(after)) return;
  const focused = host.contains(host.ownerDocument?.activeElement);
  const previous = editor.getValue();
  const selection = focused ? editor.selection() : null;
  const scroll = [host, ...host.querySelectorAll('.toastui-editor-main, .toastui-editor-ww-container, .ProseMirror')]
    .map(node => ({ node, top: node.scrollTop, left: node.scrollLeft }));
  editor.setValue(after);
  const mapped = mapTextSelection(previous, editor.getValue(), selection);
  if (mapped) editor.setSelectionRange(mapped.from, mapped.to, { focus: false });
  for (const { node, top, left } of scroll) { node.scrollTop = top; node.scrollLeft = left; }
}
