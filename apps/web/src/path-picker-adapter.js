function normalizePickedPath(result) {
  if (!result) return "";
  if (typeof result === "string") return result.trim();
  if (Array.isArray(result)) {
    const first = result.find((x) => typeof x === "string" && x.trim());
    return first ? first.trim() : "";
  }
  return "";
}

async function pickByTauri(defaultPath = "") {
  const tauri = typeof window !== "undefined" ? window.__TAURI__ : null;
  if (!tauri) return "";

  if (typeof tauri?.dialog?.open === "function") {
    const result = await tauri.dialog.open({
      directory: true,
      multiple: false,
      defaultPath: defaultPath || undefined
    });
    return normalizePickedPath(result);
  }

  if (typeof tauri?.core?.invoke === "function") {
    const result = await tauri.core.invoke("plugin:dialog|open", {
      options: {
        directory: true,
        multiple: false,
        defaultPath: defaultPath || undefined
      }
    });
    return normalizePickedPath(result);
  }

  return "";
}

async function pickByBrowser(defaultPath = "") {
  if (typeof window === "undefined") return "";

  if ("showDirectoryPicker" in window) {
    try {
      const dir = await window.showDirectoryPicker();
      if (dir?.name) return String(dir.name).trim();
    } catch {
      // Fall through to prompt-based fallback in browser test/prototype environments.
    }
  }

  const selected = window.prompt("请输入目录路径（浏览器降级模式）", defaultPath || "");
  return selected ? String(selected).trim() : "";
}

export async function pickDirectoryPath({ defaultPath = "" } = {}) {
  const fromTauri = await pickByTauri(defaultPath);
  if (fromTauri) return { path: fromTauri, source: "tauri" };

  const fromBrowser = await pickByBrowser(defaultPath);
  if (fromBrowser) return { path: fromBrowser, source: "browser" };

  return { path: "", source: "none" };
}
