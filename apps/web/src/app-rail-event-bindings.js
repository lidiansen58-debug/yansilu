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
    setStatus = () => {},
    now = () => Date.now()
  } = deps;

  documentRef?.querySelectorAll?.(".rail-btn[data-module]")?.forEach((btn) => {
    btn.addEventListener("click", async (event) => {
      event.preventDefault();
      event.stopPropagation();
      const targetModule = btn.dataset.module;
      if (targetModule === "graph") setGraphModuleActivationGuardUntil(now() + 1800);
      activateModule(targetModule);
      if (targetModule === "graph" && state.module === "graph") {
        await previewOllamaLocalAiBootstrapFromUi(localAiPreviewOptionsForAction("graph_module_open"));
        await refreshDirectoryGraph();
        if (state.module !== "graph" && now() < getGraphModuleActivationGuardUntil()) {
          activateModule("graph");
        }
        if (state.module === "graph") setStatus("宸叉墦寮€姘镐箙绗旇鍏崇郴鍥捐氨", "ok");
      }
      if (targetModule === "aiInbox" && state.module === "aiInbox") {
        await openAiInboxModule();
        if (state.module === "aiInbox") setStatus("宸叉墦寮€ AI 寤鸿澶嶆牳", "ok");
      }
      if (targetModule === "settings" && state.module === "settings") {
        try {
          await refreshVaultSettings();
          if (state.module === "settings") setStatus("宸叉墦寮€璁剧疆", "ok");
        } catch (error) {
          if (state.module === "settings") setStatus(`璁剧疆鍔犺浇澶辫触锛?{String(error?.message || error)}`, "warn");
        }
      }
      if (targetModule === "writing" && state.module === "writing") {
        await openWritingModule();
      }
      if (targetModule === "distillation" && state.module === "distillation") {
        await openDistillationModule();
      }
    });
  });
}
