import { hideWritingTopicPicker, showWritingTopicPicker } from "./writing-sidebar-actions.js";

const WRITING_TABS = new Set(["theme", "outline", "draft"]);
const WRITING_TAB_ALIASES = {
  write: "theme",
  notes: "theme",
  themes: "theme",
  tools: "theme",
  scaffold: "outline"
};

export function applyWritingTab(tab = "theme", { root = null, documentRef = typeof document !== "undefined" ? document : null } = {}) {
  const requestedTab = String(tab || "");
  const normalizedTab = WRITING_TAB_ALIASES[requestedTab] || requestedTab;
  const activeTab = WRITING_TABS.has(normalizedTab) ? normalizedTab : "theme";
  const shell = root || documentRef?.querySelector?.(".writing-shell");
  if (!shell) return activeTab;
  shell.dataset.writingActiveTab = activeTab;
  shell.querySelectorAll?.("[data-writing-tab]").forEach((button) => {
    const selected = button.dataset.writingTab === activeTab;
    button.classList.toggle("is-active", selected);
    button.setAttribute("aria-selected", selected ? "true" : "false");
  });
  return activeTab;
}

export function installWritingTabEvents({ root = null, documentRef = typeof document !== "undefined" ? document : null } = {}) {
  const shell = root || documentRef?.querySelector?.(".writing-shell");
  if (!shell) return { installed: false };
  applyWritingTab(shell.dataset.writingActiveTab || "theme", { root: shell, documentRef });
  const handler = (event) => {
    const helpToggle = event.target?.closest?.("[data-writing-help-toggle]");
    if (helpToggle && shell.contains(helpToggle)) {
      const popover = shell.querySelector?.("#writingHelpPopover");
      if (popover) popover.hidden = !popover.hidden;
      return;
    }
    const topicPicker = event.target?.closest?.("[data-writing-topic-picker]");
    if (topicPicker && shell.contains(topicPicker)) {
      showWritingTopicPicker({ documentRef, applyWritingTab: (tab) => applyWritingTab(tab, { root: shell, documentRef }) });
      return;
    }
    const jump = event.target?.closest?.("[data-writing-tab-jump]");
    if (jump && shell.contains(jump)) {
      applyWritingTab(jump.dataset.writingTabJump || "theme", { root: shell, documentRef });
      return;
    }
    const themeAction = event.target?.closest?.("[data-writing-index-action]");
    const themeActionName = themeAction?.dataset?.writingIndexAction || themeAction?.getAttribute?.("data-writing-index-action");
    if (themeActionName === "use") {
      hideWritingTopicPicker({ root: shell, documentRef });
      applyWritingTab("theme", { root: shell, documentRef });
    }
    const button = event.target?.closest?.("[data-writing-tab]");
    if (!button || !shell.contains(button)) return;
    applyWritingTab(button.dataset.writingTab || "theme", { root: shell, documentRef });
  };
  shell.addEventListener("click", handler);
  return { installed: true, handler };
}
