import net from "node:net";

export function hostWithoutPort(value = "") {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw) return "";
  if (raw.startsWith("[")) return raw.slice(1, raw.indexOf("]") >= 0 ? raw.indexOf("]") : undefined);
  return raw.split(":")[0] || raw;
}

export function isLoopbackHost(value = "") {
  const host = hostWithoutPort(value);
  if (host === "localhost" || host.endsWith(".localhost") || host === "::1") return true;
  if (host.startsWith("::ffff:")) return isLoopbackHost(host.slice("::ffff:".length));
  return net.isIP(host) === 4 && host.startsWith("127.");
}

export function isLoopbackRemoteAddress(value = "") {
  const address = String(value || "").trim().toLowerCase();
  return address === "::1" || address.startsWith("127.") || address.startsWith("::ffff:127.");
}

export function isAllowedLocalOrigin(origin = "") {
  const raw = String(origin || "").trim();
  if (!raw) return true;
  if (raw === "null") return false;
  try {
    const parsed = new URL(raw);
    return isLoopbackHost(parsed.hostname);
  } catch {
    return false;
  }
}

export function localRuntimeControlAllowedPorts(env = process.env) {
  return new Set(
    String(env?.YANSILU_LOCAL_APP_PORTS || "3000,5173,5174,5175,5176,5177,5178,5179")
      .split(",")
      .map((port) => port.trim())
      .filter(Boolean)
  );
}

export function isPackagedDesktopAppOrigin(parsedUrl = null) {
  const protocol = String(parsedUrl?.protocol || "").trim().toLowerCase();
  const hostname = String(parsedUrl?.hostname || "").trim().toLowerCase();
  const port = String(parsedUrl?.port || "").trim();
  if (port) return false;
  if (protocol === "tauri:" && isLoopbackHost(hostname)) return true;
  return protocol === "http:" && hostname === "tauri.localhost";
}

export function isAllowedLocalRuntimeControlOrigin(origin = "", host = "", env = process.env) {
  const raw = String(origin || "").trim();
  if (!raw) return true;
  if (!isAllowedLocalOrigin(raw)) return false;
  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    return false;
  }
  const requestHost = String(host || "").trim().toLowerCase();
  const originHost = parsed.host.toLowerCase();
  if (requestHost && originHost === requestHost) return true;
  if (isPackagedDesktopAppOrigin(parsed)) return true;
  return localRuntimeControlAllowedPorts(env).has(parsed.port || (parsed.protocol === "https:" ? "443" : "80"));
}

export function assertLocalRuntimeControlAllowed(req, env = process.env) {
  if (!isLoopbackRemoteAddress(req?.socket?.remoteAddress || "")) {
    const error = new Error("local runtime controls only accept requests from this computer");
    error.status = 403;
    throw error;
  }
  if (!isAllowedLocalRuntimeControlOrigin(req?.headers?.origin || "", req?.headers?.host || "", env)) {
    const error = new Error("local runtime controls only accept the Yansilu local app origin");
    error.status = 403;
    throw error;
  }
  if (String(req?.headers?.["x-yansilu-local-runtime-control"] || "").trim() !== "1") {
    const error = new Error("local runtime controls require an explicit Yansilu runtime-control header");
    error.status = 403;
    throw error;
  }
}
