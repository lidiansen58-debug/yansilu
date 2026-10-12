// Browser navigation can update the DOM caret before ProseMirror receives
// selectionchange. Editing commands must use that newer selection.
export function syncToastuiKeyboardSelection(editor, event) {
  if (!['Enter', 'Backspace', 'Delete'].includes(event?.key)) return false;
  if (event.isComposing || event.keyCode === 229 || !editor?.isWysiwygMode?.()) return false;
  const view = editor.wwEditor?.view;
  if (!view?.dom || view.composing || typeof editor.setSelection !== 'function') return false;
  if (event.target && !view.dom.contains(event.target)) return false;
  const control = event.target?.closest?.('button,input,textarea,select,[contenteditable="false"]');
  if (control && view.dom.contains(control)) return false;
  const selection = view.dom.ownerDocument?.getSelection?.();
  if (!selection?.rangeCount || !view.dom.contains(selection.anchorNode) || !view.dom.contains(selection.focusNode)) return false;

  try {
    const anchor = view.posAtDOM(selection.anchorNode, selection.anchorOffset);
    const head = view.posAtDOM(selection.focusNode, selection.focusOffset);
    const { doc } = view.state;
    if (![anchor, head].every(position => Number.isInteger(position) && position >= 0 && position <= doc.content.size)) return false;
    // Keep native node/boundary selections with the editor. The stale navigation
    // caret we need to reconcile has text-block endpoints.
    if (!doc.resolve(anchor).parent.isTextblock || !doc.resolve(head).parent.isTextblock) return false;
    if (view.state.selection.anchor === anchor && view.state.selection.head === head) return false;
    editor.setSelection(anchor, head);
    return true;
  } catch {
    // Detached DOM positions cannot be applied to the current document.
    return false;
  }
}
