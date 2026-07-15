export function setWritingRelatedPanelOpen(open = false, { root = null, documentRef = typeof document !== "undefined" ? document : null } = {}) {
  const shell = root || documentRef?.querySelector?.(".writing-shell");
  const overlay = shell?.querySelector?.("#writingRelatedOverlay");
  if (!overlay) return false;
  overlay.classList.toggle("is-open", Boolean(open));
  overlay.setAttribute("aria-hidden", open ? "false" : "true");
  const sidebarButton = documentRef?.querySelector?.("[data-writing-sidebar-action=\"related\"]");
  if (sidebarButton) {
    sidebarButton.classList.toggle("is-active", Boolean(open));
    sidebarButton.setAttribute("aria-pressed", open ? "true" : "false");
  }
  return true;
}

export function updateWritingRelatedNoteCounters(count = 0, { root = null, documentRef = typeof document !== "undefined" ? document : null } = {}) {
  const shell = root || documentRef?.querySelector?.(".writing-shell");
  if (!shell) return false;
  shell.querySelectorAll?.("#writingRelatedNotesCount, #writingRelatedNotesCountOutline, #writingRelatedNotesCountDraft").forEach((node) => {
    node.textContent = String(Number(count || 0));
  });
  const sidebarCounter = documentRef?.querySelector?.("#writingSidebarRelatedCount");
  if (sidebarCounter) sidebarCounter.textContent = String(Number(count || 0));
  return true;
}

export function installWritingRelatedPanelEvents({ root = null, documentRef = typeof document !== "undefined" ? document : null } = {}) {
  const shell = root || documentRef?.querySelector?.(".writing-shell");
  if (!shell) return { installed: false };
  const handler = (event) => {
    if (event.target?.closest?.("[data-writing-related-open]")) {
      setWritingRelatedPanelOpen(true, { root: shell, documentRef });
      return;
    }
    if (event.target?.closest?.("[data-writing-related-close]")) {
      setWritingRelatedPanelOpen(false, { root: shell, documentRef });
    }
  };
  shell.addEventListener("click", handler);
  return { installed: true, handler };
}
