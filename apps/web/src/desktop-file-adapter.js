function normalizePath(value) {
  return String(value || "").trim();
}

function tauriGlobal() {
  return typeof window !== "undefined" ? window.__TAURI__ : null;
}

async function openByTauri(targetPath) {
  const tauri = tauriGlobal();
  if (!tauri || !targetPath) return false;

  // Prefer a custom command to open local paths in Explorer.
  // tauri_plugin_opener.openPath has been observed to hang on some CJK paths on Windows.
  if (typeof tauri?.core?.invoke === "function") {
    try {
      await tauri.core.invoke("open_in_explorer", { path: targetPath });
      return true;
    } catch {}
  }

  if (typeof tauri?.opener?.revealItemInDir === "function") {
    await tauri.opener.revealItemInDir(targetPath);
    return true;
  }

  if (typeof tauri?.opener?.openPath === "function") {
    await tauri.opener.openPath(targetPath);
    return true;
  }

  if (typeof tauri?.shell?.open === "function") {
    await tauri.shell.open(targetPath);
    return true;
  }

  if (typeof tauri?.core?.invoke === "function") {
    try {
      await tauri.core.invoke("plugin:opener|reveal_item_in_dir", { path: targetPath });
      return true;
    } catch {}
    try {
      await tauri.core.invoke("plugin:opener|open_path", { path: targetPath });
      return true;
    } catch {}
    try {
      await tauri.core.invoke("plugin:shell|open", { path: targetPath });
      return true;
    } catch {}
  }

  return false;
}

async function openUrlByTauri(targetUrl) {
  const tauri = tauriGlobal();
  if (!tauri || !targetUrl) return false;

  if (typeof tauri?.opener?.openUrl === "function") {
    await tauri.opener.openUrl(targetUrl);
    return true;
  }

  if (typeof tauri?.shell?.open === "function") {
    await tauri.shell.open(targetUrl);
    return true;
  }

  if (typeof tauri?.core?.invoke === "function") {
    try {
      await tauri.core.invoke("plugin:opener|open_url", { url: targetUrl });
      return true;
    } catch {}
    try {
      await tauri.core.invoke("plugin:shell|open", { path: targetUrl });
      return true;
    } catch {}
  }

  return false;
}

async function copyPathFallback(targetPath) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(targetPath);
      return true;
    } catch {}
  }
  return false;
}

export function joinLocalPath(basePath, relativePath) {
  const base = normalizePath(basePath);
  const rel = normalizePath(relativePath).replace(/^[/\\]+/, "");
  if (!base) return rel;
  if (!rel) return base;
  const separator = base.includes("\\") ? "\\" : "/";
  const normalizedRel = rel.replaceAll("/", separator).replaceAll("\\", separator);
  return `${base.replace(/[\\/]+$/, "")}${separator}${normalizedRel}`;
}

export function dirnameLocalPath(filePath) {
  const value = normalizePath(filePath);
  if (!value) return "";
  const index = Math.max(value.lastIndexOf("\\"), value.lastIndexOf("/"));
  return index > 0 ? value.slice(0, index) : value;
}

export function basenameLocalPath(filePath) {
  const value = normalizePath(filePath).replace(/[\\/]+$/, "");
  if (!value) return "";
  const index = Math.max(value.lastIndexOf("\\"), value.lastIndexOf("/"));
  return index >= 0 ? value.slice(index + 1) : value;
}

export async function revealPath(targetPath) {
  const path = normalizePath(targetPath);
  if (!path) return { ok: false, source: "none", message: "路径为空" };

  if (await openByTauri(path)) {
    return { ok: true, source: "tauri", path };
  }

  const copied = await copyPathFallback(path);
  return {
    ok: false,
    source: "browser",
    path,
    message: copied ? "浏览器环境无法打开本机路径，已复制路径" : "浏览器环境无法打开本机路径"
  };
}

export async function openPath(targetPath) {
  return revealPath(targetPath);
}

export async function openExternalUrl(targetUrl) {
  const url = normalizePath(targetUrl);
  if (!url) return { ok: false, source: "none", message: "链接为空" };

  if (await openUrlByTauri(url)) {
    return { ok: true, source: "tauri", url };
  }

  if (typeof window !== "undefined" && typeof window.open === "function") {
    try {
      const opened = window.open(url, "_blank", "noopener,noreferrer");
      if (opened) return { ok: true, source: "browser", url };
    } catch {}
  }

  return {
    ok: false,
    source: "browser",
    url,
    message: "没有成功打开外部链接"
  };
}
