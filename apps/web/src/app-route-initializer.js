import {
  desktopServiceStatusMessage,
  readDesktopServiceStatus
} from "./desktop-service-status.js";

export async function initializeAppRouteForRuntime(deps = {}) {
  const {
    refreshVaultSettings = async () => {},
    syncDirectoriesFromApi = async () => {},
    syncNotesForDirectoryTree = async () => {},
    state = {},
    getApiBase = () => "",
    isApiConnectionError = () => false, apiConnectionErrorMessage = (error) => String(error?.message || error),
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
    if (isApiConnectionError(error)) {
      setUsingLocalFallbackData(false);
      const status = error?.serviceStatus || await readDesktopServiceStatus(windowRef);
      setStatus(desktopServiceStatusMessage(status, error, error?.apiBase || getApiBase()) || apiConnectionErrorMessage(error), "bad");
      return { connected: false, usingLocalFallbackData: false, error };
    }
    const tauri = typeof windowRef !== "undefined" ? windowRef.__TAURI__ : null;
    if (tauri) {
      setStatus(`API 连接失败：${String(error?.message || error)}`, "bad");
      try {
        const status = await readDesktopApiStatus(tauri);
        const message = desktopApiFailureMessage({ apiBase: getApiBase(), error, status });
        if (typeof tauri?.dialog?.message === "function") {
          await tauri.dialog.message(message, { title: "本地服务启动失败", kind: "error" });
        } else if (typeof tauri?.core?.invoke === "function") {
          await tauri.core.invoke("plugin:dialog|message", {
            message,
            options: { title: "本地服务启动失败", kind: "error" }
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

async function readDesktopApiStatus(tauri) {
  const status = await readDesktopServiceStatus({ __TAURI__: tauri });
  if (status) return status;
  if (typeof tauri?.core?.invoke !== "function") return null;
  try { return await tauri.core.invoke("get_desktop_api_status"); } catch { return null; }
}

function desktopApiFailureMessage({ apiBase = "", error, status = null } = {}) {
  const serviceMessage = desktopServiceStatusMessage(status?.serviceStatus || status, error, apiBase);
  const launchError = String(status?.launchError || status?.services?.api?.lastError || "").trim();
  const lines = [
    "研思录的本地服务没有启动完成，所以当前还不能读取笔记库。",
    "",
    serviceMessage || "这通常不是你的笔记出了问题。请先完全关闭研思录，再重新打开一次。",
    ""
  ];
  if (apiBase) lines.push(`当前尝试连接：${apiBase}`);
  if (launchError) lines.push(`启动诊断：${launchError}`);
  else lines.push(`连接诊断：${String(error?.message || error || "未知错误")}`);
  lines.push("", "如果重启后仍然出现，请把这段提示和 api.log 发给开发者。");
  return lines.join("\n");
}
