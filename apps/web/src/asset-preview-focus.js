export function createAssetPreviewFocus({ getModal, getCloseButton, getReturnFocus, close, eventTarget = globalThis.window }) {
  let returnFocus = null;

  const isOpen = () => {
    const modal = getModal();
    return modal && !modal.classList.contains("hidden");
  };
  function handleKeydown(event) {
    if (!isOpen() || event.defaultPrevented || event.isComposing) return;
    // Keep app-wide editing and navigation shortcuts behind the preview.
    event.stopImmediatePropagation();
    if ((event.ctrlKey || event.metaKey || event.altKey) && ["s", "arrowleft", "arrowright", "1", "2"].includes(String(event.key).toLowerCase())) {
      event.preventDefault();
    }
    if (event.key === "Escape") {
      event.preventDefault();
      close();
      return;
    }
    if (event.key !== "Tab" || event.ctrlKey || event.altKey || event.metaKey) return;
    const modal = getModal();
    const items = [...modal.querySelectorAll('button:not([disabled]), a[href], [tabindex="0"]')]
      .filter(node => node.getClientRects().length);
    const index = items.indexOf(modal.ownerDocument.activeElement);
    if (!items.length) return;
    if (index < 0 || (event.shiftKey ? index === 0 : index === items.length - 1)) {
      event.preventDefault();
      (event.shiftKey ? items.at(-1) : items[0]).focus();
    }
  }
  eventTarget?.addEventListener("keydown", handleKeydown, true);

  return {
    open() {
      returnFocus = getReturnFocus();
      getCloseButton()?.focus();
    },
    close() {
      if (!returnFocus) return;
      const target = returnFocus.isConnected && returnFocus.getClientRects().length ? returnFocus : getReturnFocus();
      returnFocus = null;
      if (target?.getClientRects().length) target.focus();
    }
  };
}
