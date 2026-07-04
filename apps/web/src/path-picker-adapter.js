function normalizePickedPath(result) {
  if (!result) return "";
  if (typeof result === "string") return result.trim();
  if (Array.isArray(result)) {
    const first = result.find((x) => typeof x === "string" && x.trim());
    return first ? first.trim() : "";
  }
  return "";
}

async function pickByTauri({ defaultPath = "", directory = true, filters } = {}) {
  const tauri = typeof window !== "undefined" ? window.__TAURI__ : null;
  if (!tauri) return "";

  const options = {
    directory,
    multiple: false,
    defaultPath: defaultPath || undefined
  };
  if (filters) options.filters = filters;

  if (typeof tauri?.dialog?.open === "function") {
    const result = await tauri.dialog.open(options);
    return normalizePickedPath(result);
  }

  if (typeof tauri?.core?.invoke === "function") {
    const result = await tauri.core.invoke("plugin:dialog|open", { options });
    return normalizePickedPath(result);
  }

  return "";
}

async function pickByBrowser({ defaultPath = "", promptMessage = "请输入目录路径（浏览器降级模式）" } = {}) {
  if (typeof window === "undefined") return "";

  // Browser directory handles do not expose a local absolute path, but vault switching
  // requires a concrete path string. Keep the browser fallback on the explicit prompt flow.

  const selected = window.prompt(promptMessage, defaultPath || "");
  return selected ? String(selected).trim() : "";
}

export async function pickDirectoryPath({ defaultPath = "" } = {}) {
  const fromTauri = await pickByTauri({ defaultPath, directory: true });
  if (fromTauri) return { path: fromTauri, source: "tauri" };

  const fromBrowser = await pickByBrowser({ defaultPath, promptMessage: "请输入目录路径（浏览器降级模式）" });
  if (fromBrowser) return { path: fromBrowser, source: "browser" };

  return { path: "", source: "none" };
}

export async function pickFilePath({ defaultPath = "", filters } = {}) {
  const fromTauri = await pickByTauri({ defaultPath, directory: false, filters });
  if (fromTauri) return { path: fromTauri, source: "tauri" };

  const fromBrowser = await pickByBrowser({ defaultPath, promptMessage: "请输入文件路径（浏览器降级模式）" });
  if (fromBrowser) return { path: fromBrowser, source: "browser" };

  return { path: "", source: "none" };
}
