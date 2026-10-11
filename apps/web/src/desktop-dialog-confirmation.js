export function installDesktopDialogConfirmation(windowRef) {
  if (!windowRef) return false;
  const dialog = [windowRef.__TAURI__?.dialog, windowRef.__TAURI_PLUGIN_DIALOG__]
    .find((candidate) => typeof candidate?.confirm === "function");
  const options = { title: "研思录", okLabel: "确认", cancelLabel: "取消" };
  if (dialog) {
    windowRef.confirm = async (message) =>
      await dialog.confirm(String(message), options) === true;
    return true;
  }
  const core = windowRef.__TAURI__?.core;
  if (typeof core?.invoke !== "function") return false;
  // The dialog plugin's window.confirm polyfill still invokes the removed
  // `confirm` command. The current protocol implements confirmation via message.
  windowRef.confirm = async (message) => await core.invoke("plugin:dialog|message", {
    message: String(message),
    title: options.title,
    buttons: { ok: options.okLabel, cancel: options.cancelLabel }
  }) === options.okLabel;
  return true;
}
