export function settingsRailLabel(updateAvailable = false) {
  return updateAvailable ? "设置 · 有新版本" : "设置";
}

export function syncRailSelectionDom({
  document,
  currentQuickAction = "",
  currentModule = "",
  updateAvailable = false
} = {}) {
  const doc = document || globalThis.document;
  doc?.querySelectorAll?.(".quick-entry").forEach((entry) => {
    const isCurrentRoot = entry.dataset.action === currentQuickAction;
    const active = currentModule === "explorer" && isCurrentRoot;
    entry.classList.toggle("current-root", active);
    entry.classList.toggle("active", active);
  });
  doc?.querySelectorAll?.(".rail-btn[data-module]").forEach((button) => {
    button.classList.toggle("active", button.dataset.module === currentModule);
    if (button.dataset.module === "settings") {
      button.classList.toggle("has-update", updateAvailable);
      const label = settingsRailLabel(updateAvailable);
      button.setAttribute("title", label);
      button.setAttribute("data-tip", label);
      button.setAttribute("aria-label", label);
    }
  });
}
