export function beginNoteMoveInteraction(documentRef = globalThis.document) {
  if (!documentRef?.body) return () => {};
  const previousFocus = documentRef.activeElement;
  const dialog = documentRef.createElement("dialog");
  dialog.className = "note-move-progress";
  dialog.dataset.noteMoveProgress = "";
  dialog.tabIndex = -1;
  dialog.setAttribute("aria-label", "正在移动笔记");
  dialog.setAttribute("aria-busy", "true");
  dialog.textContent = "正在移动笔记，请稍候...";
  dialog.addEventListener("cancel", event => event.preventDefault());
  const blockKeys = event => {
    event.preventDefault();
    event.stopImmediatePropagation();
  };
  documentRef.body.append(dialog);
  try { dialog.showModal(); }
  catch (error) { dialog.remove(); throw error; }
  documentRef.defaultView?.addEventListener("keydown", blockKeys, true);
  return () => {
    documentRef.defaultView?.removeEventListener("keydown", blockKeys, true);
    dialog.close();
    dialog.remove();
    if (previousFocus?.isConnected) previousFocus.focus();
  };
}
