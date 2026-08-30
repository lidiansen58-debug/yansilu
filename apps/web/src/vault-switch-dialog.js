export function createVaultSwitchDialog(retry, documentRef = globalThis.document) {
  if (!documentRef?.body) return { waiting() {}, uncertain() {}, close() {} };
  const dialog = documentRef.createElement("dialog");
  dialog.className = "note-move-progress";
  dialog.dataset.vaultSwitchRecovery = "";
  dialog.setAttribute("aria-label", "切换笔记库");
  const message = documentRef.createElement("p");
  const button = documentRef.createElement("button");
  button.className = "mini-btn primary";
  button.type = "button";
  button.textContent = "重新核查";
  button.onclick = () => { void retry(); };
  dialog.append(message, button);
  dialog.addEventListener("cancel", event => event.preventDefault());
  const blockShortcuts = event => {
    event.stopImmediatePropagation();
    if (event.ctrlKey || event.metaKey || event.key === "Escape") event.preventDefault();
  };
  documentRef.body.append(dialog);
  dialog.showModal();
  documentRef.defaultView?.addEventListener("keydown", blockShortcuts, true);
  return {
    waiting() {
      message.textContent = "正在确认笔记库，请稍候...";
      button.disabled = true;
      dialog.setAttribute("aria-busy", "true");
    },
    uncertain() {
      message.textContent = "尚未确认当前笔记库，笔记操作已暂停。请检查本地服务后重新核查，不会重复发送切换请求。";
      button.disabled = false;
      dialog.setAttribute("aria-busy", "false");
      button.focus();
    },
    close() {
      documentRef.defaultView?.removeEventListener("keydown", blockShortcuts, true);
      dialog.close();
      dialog.remove();
    }
  };
}
