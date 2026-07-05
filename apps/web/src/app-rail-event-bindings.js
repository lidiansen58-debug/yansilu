export function installAppRailEventBindings(deps = {}) {
  const {
    documentRef = globalThis.document,
    state = {},
    getGraphModuleActivationGuardUntil = () => 0,
    setGraphModuleActivationGuardUntil = () => {},
    activateModule = () => {},
    previewOllamaLocalAiBootstrapFromUi = async () => {},
    localAiPreviewOptionsForAction = () => ({}),
    refreshDirectoryGraph = async () => {},
    openAiInboxModule = async () => {},
    refreshVaultSettings = async () => {},
    openWritingModule = async () => {},
    openDistillationModule = async () => {},
    dismissSafeOverlaysForNavigation = () => ({ ok: true }),
    setStatus = () => {},
    now = () => Date.now()
  } = deps;

  documentRef?.querySelectorAll?.(".rail-btn[data-module]")?.forEach((btn) => {
    btn.addEventListener("click", async (event) => {
      event.preventDefault();
      event.stopPropagation();
      const targetModule = btn.dataset.module;
      const overlayResult = dismissSafeOverlaysForNavigation({ targetModule });
      if (overlayResult && overlayResult.ok === false) return;
      if (targetModule === "graph") setGraphModuleActivationGuardUntil(now() + 1800);
      activateModule(targetModule);
      if (targetModule === "graph" && state.module === "graph") {
        await previewOllamaLocalAiBootstrapFromUi(localAiPreviewOptionsForAction("graph_module_open"));
        await refreshDirectoryGraph();
        if (state.module !== "graph" && now() < getGraphModuleActivationGuardUntil()) {
          activateModule("graph");
        }
        if (state.module === "graph") setStatus("已打开永久笔记关系图谱", "ok");
      }
      if (targetModule === "aiInbox" && state.module === "aiInbox") {
        await openAiInboxModule();
        if (state.module === "aiInbox") setStatus("已打开 AI 建议", "ok");
      }
      if (targetModule === "settings" && state.module === "settings") {
        try {
          await refreshVaultSettings();
          if (state.module === "settings") setStatus("已打开设置", "ok");
        } catch (error) {
          if (state.module === "settings") setStatus(`设置刷新失败：${String(error?.message || error)}`, "warn");
        }
      }
      if (targetModule === "writing" && state.module === "writing") {
        await openWritingModule({
          activeTab: "themes",
          entrySourceLabel: "侧栏",
          entryReason: "直接进入写作中心时，先看可写主题和已有写作项目，再决定是否继续起草。",
          statusMessage: "已打开写作中心，可先从主题库或示例写作项目继续"
        });
      }
      if (targetModule === "distillation" && state.module === "distillation") {
        await openDistillationModule();
      }
    });
  });
}
