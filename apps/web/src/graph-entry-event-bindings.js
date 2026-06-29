export function installGraphEntryEventBindings(deps = {}) {
  const {
    $ = () => null,
    state = {},
    explorer = null,
    graphState = {},
    refreshDirectoryGraph = async () => false,
    importYijingKnowledgeNetworkDemo = async () => {},
    importYijingRichAcceptanceDemo = async () => {},
    renderAll = () => {},
    setStatus = () => {}
  } = deps;

  $("graphRefresh")?.addEventListener("click", async () => {
    const refreshed = await refreshDirectoryGraph();
    setStatus(
      refreshed ? "姘镐箙绗旇鍏崇郴鍥捐氨宸插埛鏂?" : `鍥捐氨鍒锋柊澶辫触锛?{graphState.error || "璇烽噸璇?"}`,
      refreshed ? "ok" : "warn"
    );
  });

  $("graphBackToDirectory")?.addEventListener("click", () => {
    state.selectedFileId = null;
    explorer?.restoreAutoCollapsedDisconnectedGroups?.();
    renderAll();
    setStatus("宸茶繑鍥炵洰褰曞叧绯昏鍥?", "ok");
  });

  $("graphSeedYijing")?.addEventListener("click", async () => {
    await importYijingKnowledgeNetworkDemo();
  });

  $("graphSeedYijingRich")?.addEventListener("click", async () => {
    await importYijingRichAcceptanceDemo();
  });
}
