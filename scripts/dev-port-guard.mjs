import net from "node:net";

export function normalizePort(value, fallback) {
  const port = Number(value);
  if (Number.isInteger(port) && port > 0 && port < 65536) return port;
  return fallback;
}

export function normalizeBaseUrl(value) {
  return String(value || "").trim().replace(/\/+$/u, "");
}

export function baseUrlForPort(port, host = "127.0.0.1") {
  return `http://${host}:${port}`;
}

export function isPortListening(port, host = "127.0.0.1", timeoutMs = 500) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    const finish = (listening) => {
      socket.destroy();
      resolve(Boolean(listening));
    };

    socket.setTimeout(timeoutMs);
    socket.once("connect", () => finish(true));
    socket.once("timeout", () => finish(false));
    socket.once("error", () => finish(false));
    socket.connect(port, host);
  });
}

export async function fetchJsonHealth(baseUrl, options = {}) {
  const timeoutMs = Math.max(1, Number(options.timeoutMs || 800) || 800);
  const pathname = String(options.pathname || "/api/v1/health");
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  if (typeof fetchImpl !== "function") {
    throw new Error("fetch is not available for health probing");
  }
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(`${normalizeBaseUrl(baseUrl)}${pathname}`, {
      signal: controller.signal,
      headers: { Accept: "application/json" }
    });
    const json = await response.json().catch(() => ({}));
    return { ok: response.ok, status: response.status, json };
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function probeYansiluApiPort(port, options = {}) {
  const host = options.host || "127.0.0.1";
  const baseUrl = baseUrlForPort(port, host);
  const listening = await (options.isPortListeningImpl || isPortListening)(port, host, options.connectTimeoutMs);
  if (!listening) {
    return { port, baseUrl, listening: false, healthy: false, isYansilu: false, json: null, error: null };
  }

  try {
    const result = await fetchJsonHealth(baseUrl, {
      pathname: options.pathname || "/api/v1/health",
      timeoutMs: options.healthTimeoutMs,
      fetchImpl: options.fetchImpl
    });
    const isYansilu = result.ok && result.json?.app === "yansilu" && result.json?.ok === true;
    return {
      port,
      baseUrl,
      listening: true,
      healthy: Boolean(isYansilu),
      isYansilu,
      json: result.json,
      status: result.status,
      error: null
    };
  } catch (error) {
    return {
      port,
      baseUrl,
      listening: true,
      healthy: false,
      isYansilu: false,
      json: null,
      error
    };
  }
}

export async function resolveYansiluApiPort(options = {}) {
  const preferredPort = normalizePort(options.preferredPort, 3000);
  const maxAttempts = Math.max(1, Number(options.maxAttempts || 20) || 20);
  const logger = options.logger || null;

  for (let offset = 0; offset < maxAttempts; offset += 1) {
    const port = preferredPort + offset;
    const probe = await probeYansiluApiPort(port, options);
    if (!probe.listening) {
      return { action: "start", port, baseUrl: probe.baseUrl, probe };
    }
    if (probe.healthy && probe.isYansilu) {
      return { action: "reuse", port, baseUrl: probe.baseUrl, probe };
    }
    const reason = probe.error ? String(probe.error?.message || probe.error) : "not a healthy Yansilu API";
    logger?.(`[api] port ${port} is occupied but cannot be reused (${reason}); trying ${port + 1}`);
  }

  throw new Error(`No available API port found from ${preferredPort} within ${maxAttempts} attempts.`);
}

export async function waitForYansiluApiReady(port, options = {}) {
  const timeoutMs = Math.max(1, Number(options.timeoutMs || 15000) || 15000);
  const intervalMs = Math.max(50, Number(options.intervalMs || 250) || 250);
  const startedAt = Date.now();
  let lastProbe = null;

  while (Date.now() - startedAt <= timeoutMs) {
    lastProbe = await probeYansiluApiPort(port, {
      ...options,
      healthTimeoutMs: Math.min(Number(options.healthTimeoutMs || 800) || 800, intervalMs)
    });
    if (lastProbe.healthy && lastProbe.isYansilu) return lastProbe;
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  const reason = lastProbe?.error ? String(lastProbe.error?.message || lastProbe.error) : "health endpoint did not become ready";
  throw new Error(`Yansilu API did not become ready on port ${port} within ${timeoutMs}ms: ${reason}`);
}

export async function probeYansiluWebPort(port, options = {}) {
  const host = options.host || "127.0.0.1";
  const baseUrl = baseUrlForPort(port, host);
  const listening = await (options.isPortListeningImpl || isPortListening)(port, host, options.connectTimeoutMs);
  if (!listening) {
    return { port, baseUrl, listening: false, healthy: false, isYansilu: false, json: null, error: null };
  }
  try {
    const result = await fetchJsonHealth(baseUrl, {
      pathname: "/health",
      timeoutMs: options.healthTimeoutMs,
      fetchImpl: options.fetchImpl
    });
    const expectedApiBase = normalizeBaseUrl(options.apiBase || "");
    const actualApiBase = normalizeBaseUrl(result.json?.apiBase || "");
    const isYansilu =
      result.ok &&
      result.json?.app === "yansilu" &&
      result.json?.service === "web" &&
      (!expectedApiBase || actualApiBase === expectedApiBase);
    return {
      port,
      baseUrl,
      listening: true,
      healthy: Boolean(isYansilu),
      isYansilu,
      json: result.json,
      status: result.status,
      error: null
    };
  } catch (error) {
    return { port, baseUrl, listening: true, healthy: false, isYansilu: false, json: null, error };
  }
}

export async function resolveYansiluWebPort(options = {}) {
  const preferredPort = normalizePort(options.preferredPort, 5173);
  const maxAttempts = Math.max(1, Number(options.maxAttempts || 20) || 20);
  const logger = options.logger || null;

  for (let offset = 0; offset < maxAttempts; offset += 1) {
    const port = preferredPort + offset;
    const probe = await probeYansiluWebPort(port, options);
    if (!probe.listening) {
      return { action: "start", port, baseUrl: probe.baseUrl, probe };
    }
    if (probe.healthy && probe.isYansilu) {
      return { action: "reuse", port, baseUrl: probe.baseUrl, probe };
    }
    const reason = probe.error ? String(probe.error?.message || probe.error) : "not a matching Yansilu web server";
    logger?.(`[web] port ${port} is occupied but cannot be reused (${reason}); trying ${port + 1}`);
  }

  throw new Error(`No available web port found from ${preferredPort} within ${maxAttempts} attempts.`);
}
