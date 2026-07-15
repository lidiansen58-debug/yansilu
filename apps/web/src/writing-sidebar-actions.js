import { setWritingRelatedPanelOpen } from "./writing-related-notes-panel.js";

export function syncWritingTopicPickerAction(open = false, { documentRef = typeof document !== "undefined" ? document : null } = {}) {
  const button = documentRef?.querySelector?.("[data-writing-sidebar-action=\"topics\"]");
  if (!button) return false;
  button.classList.toggle("is-active", Boolean(open));
  button.setAttribute("aria-pressed", open ? "true" : "false");
  return true;
}

export function showWritingTopicPicker({ documentRef = typeof document !== "undefined" ? document : null, applyWritingTab = () => {} } = {}) {
  const shell = documentRef?.querySelector?.(".writing-shell");
  if (!shell) return false;
  shell.dataset.writingView = "topic-picker";
  syncWritingTopicPickerAction(true, { documentRef });
  applyWritingTab("theme");
  return true;
}

export function hideWritingTopicPicker({ root = null, documentRef = typeof document !== "undefined" ? document : null } = {}) {
  const shell = root || documentRef?.querySelector?.(".writing-shell");
  if (!shell) return false;
  delete shell.dataset.writingView;
  syncWritingTopicPickerAction(false, { documentRef });
  return true;
}

export function installWritingSidebarActionEvents({ root = null, documentRef = typeof document !== "undefined" ? document : null, applyWritingTab = () => {} } = {}) {
  if (!root) return { installed: false };
  const handler = (event) => {
    const action = event.target?.closest?.("[data-writing-sidebar-action]")?.dataset?.writingSidebarAction;
    if (!action || !root.contains?.(event.target)) return;
    if (action === "topics") {
      showWritingTopicPicker({ documentRef, applyWritingTab });
      return;
    }
    if (action === "related") {
      setWritingRelatedPanelOpen(true, { documentRef });
    }
  };
  root.addEventListener("click", handler);
  return { installed: true, handler };
}
