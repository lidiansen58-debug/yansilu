export async function initializeStartupConnection(deps = {}, initialize = async () => ({})) {
  const delays = deps.startupRetryDelaysMs || [500, 1000, 2000];
  const wait = deps.waitForStartupRetry || ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
  const setStatus = deps.setStatus || (() => {});
  const windowRef = deps.windowRef || (typeof window !== "undefined" ? window : undefined);
  for (let attempt = 0; ; attempt += 1) {
    let statusArgs = null;
    const result = await initialize({ ...deps, setStatus: (...args) => { statusArgs = args; } });
    const retryable = windowRef?.__TAURI__ && result?.connected === false &&
      deps.isApiConnectionError?.(result.error) &&
      result.error?.serviceStatus?.startupWaitTimedOut !== true &&
      result.error?.serviceStatus?.services?.api?.status !== "blocked";
    if (!retryable || attempt >= delays.length) {
      if (retryable) {
        const reason = String(result.error?.serviceStatus?.services?.api?.lastError || result.error?.cause?.message || "").trim();
        setStatus(`暂时无法连接本地服务，请点击重新连接。${reason ? `原因：${reason}` : ""}`, "bad");
      } else if (statusArgs) {
        setStatus(...statusArgs);
      }
      return result;
    }
    setStatus("正在等待本地服务启动...", "busy");
    await wait(delays[attempt]);
    deps.resetDesktopServiceStatusCache?.();
  }
}
