export function createTemplatePreviewFocus({ getModal, getCloseButton, close }) {
  let returnFocus = null;
  let returnSelector = "";
  let boundModal = null;

  function handleKeydown(event) {
    const modal = getModal();
    if (!modal?.classList.contains("is-open") || event.defaultPrevented || event.isComposing) return;
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopImmediatePropagation();
      close();
      return;
    }
    if (event.key !== "Tab" || event.ctrlKey || event.altKey || event.metaKey) return;
    const items = [...modal.querySelectorAll('button:not([disabled]), a[href], [tabindex="0"]')]
      .filter(node => node.getClientRects().length);
    const active = modal.ownerDocument.activeElement;
    if (!items.length) return;
    if (!modal.contains(active) || (event.shiftKey ? active === items[0] : active === items.at(-1))) {
      event.preventDefault();
      (event.shiftKey ? items.at(-1) : items[0]).focus();
    }
  }

  return {
    open() {
      const modal = getModal();
      returnFocus = modal?.ownerDocument.activeElement;
      const kind = returnFocus?.closest?.("[data-settings-template-kind]")?.dataset.settingsTemplateKind;
      const action = returnFocus?.dataset.settingsTemplateAction;
      returnSelector = ["permanent", "literature"].includes(kind) && action === "preview"
        ? `[data-settings-template-kind="${kind}"] [data-settings-template-action="preview"]` : "";
      if (modal && boundModal !== modal) {
        boundModal?.removeEventListener("keydown", handleKeydown, true);
        modal.addEventListener("keydown", handleKeydown, true);
        boundModal = modal;
      }
      getCloseButton()?.focus();
    },
    close() {
      const target = returnFocus?.isConnected ? returnFocus
        : returnSelector ? getModal()?.ownerDocument.querySelector(returnSelector) : null;
      if (target?.getClientRects().length) target.focus();
      returnFocus = null;
      returnSelector = "";
    }
  };
}
