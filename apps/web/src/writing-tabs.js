const WRITING_TABS = new Set(["write", "notes", "themes", "tools"]);

export function applyWritingTab(tab = "write", { root = null, documentRef = typeof document !== "undefined" ? document : null } = {}) {
  const activeTab = WRITING_TABS.has(String(tab || "")) ? String(tab) : "write";
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
  applyWritingTab(shell.dataset.writingActiveTab || "write", { root: shell, documentRef });
  const handler = (event) => {
    const button = event.target?.closest?.("[data-writing-tab]");
    if (!button || !shell.contains(button)) return;
    applyWritingTab(button.dataset.writingTab || "write", { root: shell, documentRef });
  };
  shell.addEventListener("click", handler);
  return { installed: true, handler };
}
