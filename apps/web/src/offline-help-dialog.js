export function installOfflineHelpDialog({ $ = () => null } = {}) {
  const trigger = $("settingsOpenOfflineHelp");
  const dialog = $("offlineHelpDialog");
  const frame = $("offlineHelpFrame");
  const closeButton = $("offlineHelpClose");
  if (!trigger || !frame || !closeButton || typeof dialog?.showModal !== "function") return;
  if (trigger.dataset.offlineHelpBound) return;
  trigger.dataset.offlineHelpBound = "true";

  trigger.addEventListener("click", () => {
    if (!frame.getAttribute("src")) frame.src = "./help/quick-start.html";
    if (!dialog.open) dialog.showModal();
    closeButton.focus();
  });
  closeButton.addEventListener("click", () => dialog.close());
  dialog.addEventListener("close", () => trigger.focus());
  frame.addEventListener("load", () => {
    // Escape inside an iframe does not reach the containing dialog.
    frame.contentDocument?.addEventListener("keydown", event => {
      if (event.key !== "Escape" || !dialog.open) return;
      event.preventDefault();
      dialog.close();
    });
  });
}
