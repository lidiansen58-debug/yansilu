export function installGraphEntryEventBindings(deps = {}) {
  const {
    $ = () => null,
    state = {},
    explorer = null,
    graphState = {},
    refreshDirectoryGraph = async () => false,
    renderAll = () => {},
    setStatus = () => {}
  } = deps;

  $("graphRefresh")?.addEventListener("click", async () => {
    const refreshed = await refreshDirectoryGraph();
    setStatus(
      refreshed ? "永久笔记关系图谱已刷新" : `图谱刷新失败：${graphState.error || "请重试"}`,
      refreshed ? "ok" : "warn"
    );
  });

  $("graphBackToDirectory")?.addEventListener("click", () => {
    state.selectedFileId = null;
    explorer?.restoreAutoCollapsedDisconnectedGroups?.();
    renderAll();
    setStatus("已返回目录关系视图", "ok");
  });

}
