export async function initializeAppRouteForRuntime(deps = {}) {
  const {
    refreshVaultSettings = async () => {},
    syncDirectoriesFromApi = async () => {},
    syncNotesForDirectoryTree = async () => {},
    state = {},
    getApiBase = () => "",
    setStatus = () => {},
    setUsingLocalFallbackData = () => {},
    windowRef = typeof window !== "undefined" ? window : undefined
  } = deps;
  try {
    await refreshVaultSettings();
    await syncDirectoriesFromApi();
    await syncNotesForDirectoryTree(state.browserRootId);
    setStatus(`已连接 API：${getApiBase()}`, "ok");
    return { connected: true, usingLocalFallbackData: false };
  } catch (error) {
    const tauri = typeof windowRef !== "undefined" ? windowRef.__TAURI__ : null;
    if (tauri) {
      setStatus(`API 连接失败：${String(error?.message || error)}`, "bad");
      try {
        const message =
          `无法连接到本地 API（${getApiBase()}）。\n\n` +
          "当前桌面版需要本地 API 服务在后台运行。\n\n" +
          "解决办法：\n" +
          "1) 在项目目录运行：npm run dev:api\n" +
          "2) 保持窗口打开，然后重启桌面应用\n\n" +
          "如果你是安装包用户，请联系开发者获取“内置 API”的版本。";
        if (typeof tauri?.dialog?.message === "function") {
          await tauri.dialog.message(message, { title: "API 未启动", kind: "error" });
        } else if (typeof tauri?.core?.invoke === "function") {
          await tauri.core.invoke("plugin:dialog|message", {
            message,
            options: { title: "API 未启动", kind: "error" }
          });
        }
      } catch {}
      return { connected: false, usingLocalFallbackData: false, error };
    }
    setUsingLocalFallbackData(true);
    setStatus(`API 连接失败，已回退到本地示例数据：${String(error?.message || error)}`, "warn");
    return { connected: false, usingLocalFallbackData: true, error };
  }
}
