import { initializeAppRouteForRuntime } from "./app-route-initializer.js";
import { openInitialStartupRouteForRuntime } from "./app-startup-seed.js";
import { initializeStartupConnection } from "./app-startup-connection.js";

export function createAppStartupRetryController(deps = {}) {
  const {
    state = {},
    initializeAppRoute = initializeAppRouteForRuntime,
    openInitialStartupRoute = openInitialStartupRouteForRuntime,
    getUsingLocalFallbackData = () => false,
    setUsingLocalFallbackData = () => {},
    activateModule = () => {},
    renderAll = () => {},
    updateController = null,
    setStatus = () => {}
  } = deps;
  let connecting = null;
  let updateScheduled = false;
  async function connect() {
    state.appStartupPending = true;
    state.appStartupError = "";
    deps.resetDesktopServiceStatusCache?.();
    renderAll();
    try {
      const connection = await initializeStartupConnection(deps, initializeAppRoute);
      state.appStartupPending = false;
      if (connection?.connected === false && !connection?.usingLocalFallbackData) {
        state.appStartupError = connection.error?.serviceStatus?.startupWaitTimedOut
          ? "本地服务准备超时，请重新连接。"
          : String(connection.error?.message || "本地服务尚未就绪，请重新连接。");
        activateModule("today");
        renderAll();
        return false;
      }
      renderAll();
      await openInitialStartupRoute({ ...deps, usingLocalFallbackData: getUsingLocalFallbackData() });
      if (updateController && !updateScheduled) {
        updateScheduled = true;
        setTimeout(async () => {
          await updateController.refreshAppVersionInfo();
          await updateController.runAppUpdateCheck({ manual: false });
        }, 1200);
      }
      return true;
    } catch (error) {
      state.appStartupPending = false;
      state.appStartupError = String(error?.message || error);
      setUsingLocalFallbackData(false);
      activateModule("today");
      renderAll();
      setStatus(`启动未完成：${state.appStartupError}。请点击重新连接。`, "bad", { force: true, holdMs: 10000, priority: 5 });
      return false;
    }
  }
  return function retryStartupConnection() {
    if (!connecting) connecting = connect().finally(() => { connecting = null; });
    return connecting;
  };
}
