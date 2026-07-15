export function desktopTauriCore(windowRef = typeof window !== "undefined" ? window : undefined) {
  return windowRef?.__TAURI__?.core || null;
}

export async function readDesktopServiceStatus(windowRef = typeof window !== "undefined" ? window : undefined) {
  const core = desktopTauriCore(windowRef);
  if (typeof core?.invoke !== "function") return null;
  try {
    return await core.invoke("get_desktop_service_status");
  } catch {
    try {
      const legacy = await core.invoke("get_desktop_api_status");
      return legacy?.serviceStatus || {
        overall: legacy?.running ? "healthy" : "blocked",
        services: {
          api: {
            status: legacy?.running ? "healthy" : "blocked",
            baseUrl: legacy?.baseUrl || "",
            lastError: legacy?.launchError || ""
          }
        }
      };
    } catch {
      return null;
    }
  }
}

export async function readDesktopServiceLog(windowRef = typeof window !== "undefined" ? window : undefined) {
  const core = desktopTauriCore(windowRef);
  if (typeof core?.invoke !== "function") return null;
  try {
    return await core.invoke("get_desktop_service_log");
  } catch {
    return null;
  }
}

export function apiServiceFromStatus(status = null) {
  return status?.services?.api || null;
}

export function apiBaseFromDesktopServiceStatus(status = null) {
  return String(apiServiceFromStatus(status)?.baseUrl || "").trim().replace(/\/+$/u, "");
}

export function desktopServiceStatusMessage(status = null, error = null, apiBase = "") {
  const overall = String(status?.overall || "").trim();
  const api = apiServiceFromStatus(status);
  const apiStatus = String(api?.status || "").trim();
  const lastError = String(api?.lastError || "").trim();
  const currentBase = String(apiBase || api?.baseUrl || "").trim();
  if (overall === "recovering" || apiStatus === "recovering" || apiStatus === "starting") {
    return "本地服务正在恢复，稍等几秒后会自动重试。";
  }
  if (overall === "blocked" || apiStatus === "blocked") {
    return `本地服务连续启动失败，请完全关闭研思录后重新打开。${lastError ? ` 诊断：${lastError}` : ""}`;
  }
  if (apiStatus === "healthy") {
    return currentBase ? `本地服务已连接：${currentBase}` : "本地服务已连接。";
  }
  if (lastError) return `本地服务暂时不可用。诊断：${lastError}`;
  const detail = String(error?.message || error || "").trim();
  if (currentBase) return `API 未连接，当前尝试地址：${currentBase}。${detail}`;
  return detail || "API 未连接，本地服务还没有准备好。";
}
