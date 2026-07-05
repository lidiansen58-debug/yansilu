export function settingsRailLabel(updateAvailable = false) {
  return updateAvailable ? "设置 · 有新版本" : "设置";
}

export function todayRailHasTasks(todayState = {}) {
  const reviewItems = Array.isArray(todayState?.reviewChecklist?.items)
    ? todayState.reviewChecklist.items
    : [];
  const maintenanceReviewItems = reviewItems.filter((item) => item?.type !== "writableTopic");
  return Boolean(
    todayState?.pendingMaterialCount ||
    todayState?.isolatedCount ||
    maintenanceReviewItems.length
  );
}

export function syncRailSelectionDom({
  document,
  currentQuickAction = "",
  currentModule = "",
  updateAvailable = false,
  todayHasTasks = false
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
    if (button.dataset.module === "today") {
      const label = todayHasTasks ? "首页 · 有待处理任务" : "首页";
      button.classList.toggle("has-unread", todayHasTasks);
      button.setAttribute("title", label);
      button.setAttribute("data-tip", label);
      button.setAttribute("aria-label", label);
    }
    if (button.dataset.module === "settings") {
      button.classList.toggle("has-update", updateAvailable);
      const label = settingsRailLabel(updateAvailable);
      button.setAttribute("title", label);
      button.setAttribute("data-tip", label);
      button.setAttribute("aria-label", label);
    }
  });
}
