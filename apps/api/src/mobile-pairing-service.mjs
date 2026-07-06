import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createHash, randomBytes, randomInt, randomUUID } from "node:crypto";
import QRCode from "qrcode";

const PAIR_CODE_TTL_MS = 5 * 60 * 1000;
const PAIR_REQUEST_TTL_MS = 5 * 60 * 1000;
const TOKEN_BYTES = 24;

const pairingSessionsByVault = new Map();
const pendingRequestsByVault = new Map();

function cleanText(value = "") {
  return String(value || "").trim();
}

function nowIso(now = Date.now()) {
  return new Date(now).toISOString();
}

function sha256(value = "") {
  return createHash("sha256").update(String(value || ""), "utf8").digest("hex");
}

function mobileStatePath(vaultPath = "") {
  return path.join(path.resolve(vaultPath), ".yansilu", "mobile-access.json");
}

async function readMobileState(vaultPath) {
  try {
    const raw = await fs.readFile(mobileStatePath(vaultPath), "utf8");
    const parsed = JSON.parse(raw);
    return {
      devices: Array.isArray(parsed.devices) ? parsed.devices : []
    };
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
    return { devices: [] };
  }
}

async function writeMobileState(vaultPath, state = {}) {
  const target = mobileStatePath(vaultPath);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(
    target,
    JSON.stringify(
      {
        devices: Array.isArray(state.devices) ? state.devices : []
      },
      null,
      2
    ),
    "utf8"
  );
}

function vaultKey(vaultPath = "") {
  return path.resolve(vaultPath);
}

function makePairCode() {
  return String(randomInt(0, 1000000)).padStart(6, "0");
}

function makeToken() {
  return `ym_${randomBytes(TOKEN_BYTES).toString("base64url")}`;
}

function makeSecret() {
  return `pr_${randomBytes(18).toString("base64url")}`;
}

function ipv4Parts(address = "") {
  const parts = String(address || "").split(".").map((part) => Number(part));
  return parts.length === 4 && parts.every((part) => Number.isInteger(part) && part >= 0 && part <= 255) ? parts : null;
}

function isPrivateLanIpv4(address = "") {
  const parts = ipv4Parts(address);
  if (!parts) return false;
  const [a, b] = parts;
  if (a === 10) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  return false;
}

function isAutoMobileAccessCandidate(entry = {}) {
  const address = cleanText(entry.address);
  if (!entry || entry.family !== "IPv4" || entry.internal || !address) return false;
  return isPrivateLanIpv4(address);
}

function mobileInterfaceScore(name = "", address = "") {
  const label = String(name || "").toLowerCase();
  let score = 0;
  if (label.includes("wi-fi") || label.includes("wifi") || label.includes("wlan")) score += 40;
  if (label.includes("ethernet") || label.includes("以太网")) score += 30;
  if (label.includes("wireless") || label.includes("无线")) score += 25;
  if (label.includes("vethernet") || label.includes("virtual") || label.includes("vmware") || label.includes("hyper-v")) score -= 40;
  if (label.includes("mihomo") || label.includes("clash") || label.includes("tailscale") || label.includes("zerotier")) score -= 80;
  if (String(address || "").startsWith("192.168.")) score += 10;
  return score;
}

export function resolveLanIpv4FromInterfaces(interfaces = {}) {
  const candidates = [];
  for (const [name, entries] of Object.entries(interfaces || {})) {
    for (const entry of entries || []) {
      if (!isAutoMobileAccessCandidate(entry)) continue;
      candidates.push({
        address: entry.address,
        score: mobileInterfaceScore(name, entry.address)
      });
    }
  }
  candidates.sort((a, b) => b.score - a.score || a.address.localeCompare(b.address));
  return candidates[0]?.address || "127.0.0.1";
}

function firstLanIpv4() {
  return resolveLanIpv4FromInterfaces(os.networkInterfaces());
}

export function resolveMobileAccessUrl(env = process.env) {
  const explicit = cleanText(env.MOBILE_ACCESS_URL);
  if (explicit) return explicit.replace(/\/+$/, "");
  const port = Number(env.WEB_PORT || 5173) || 5173;
  return `http://${firstLanIpv4()}:${port}/mobile`;
}

function pendingMapForVault(vaultPath) {
  const key = vaultKey(vaultPath);
  if (!pendingRequestsByVault.has(key)) pendingRequestsByVault.set(key, new Map());
  return pendingRequestsByVault.get(key);
}

function activePairingSession(vaultPath, now = Date.now()) {
  const key = vaultKey(vaultPath);
  const current = pairingSessionsByVault.get(key);
  if (current && current.expiresAtMs > now) return current;
  const next = {
    pairCode: makePairCode(),
    createdAtMs: now,
    expiresAtMs: now + PAIR_CODE_TTL_MS
  };
  pairingSessionsByVault.set(key, next);
  return next;
}

export function rotatePairingSession(vaultPath, now = Date.now()) {
  const key = vaultKey(vaultPath);
  const next = {
    pairCode: makePairCode(),
    createdAtMs: now,
    expiresAtMs: now + PAIR_CODE_TTL_MS
  };
  pairingSessionsByVault.set(key, next);
  return publicPairingSession(next);
}

function publicPairingSession(session) {
  return {
    pairCode: session.pairCode,
    expiresAt: nowIso(session.expiresAtMs),
    ttlSeconds: Math.max(0, Math.floor((session.expiresAtMs - Date.now()) / 1000))
  };
}

function publicDevice(device = {}) {
  return {
    id: device.id,
    name: device.name || "未命名手机",
    createdAt: device.createdAt || "",
    lastSeenAt: device.lastSeenAt || "",
    revokedAt: device.revokedAt || "",
    status: device.revokedAt ? "revoked" : "active"
  };
}

function publicPairRequest(request = {}) {
  return {
    id: request.id,
    deviceName: request.deviceName || "手机浏览器",
    status: request.status || "pending",
    createdAt: nowIso(request.createdAtMs),
    expiresAt: nowIso(request.expiresAtMs),
    deviceId: request.deviceId || "",
    clientHint: request.clientHint || ""
  };
}

function purgeExpiredPairRequests(vaultPath, now = Date.now()) {
  const pending = pendingMapForVault(vaultPath);
  for (const [id, request] of pending.entries()) {
    if (request.expiresAtMs <= now) {
      request.status = request.status === "confirmed" ? "confirmed" : "expired";
      if (request.status !== "confirmed") pending.delete(id);
    }
  }
}

function assertPairCodeValid(vaultPath, pairCode = "", now = Date.now()) {
  const session = activePairingSession(vaultPath, now);
  if (session.expiresAtMs <= now || cleanText(pairCode) !== session.pairCode) {
    const error = new Error("配对码无效或已过期。请在电脑端刷新二维码后重试。");
    error.code = "MOBILE_PAIR_CODE_INVALID";
    error.status = 401;
    throw error;
  }
  return session;
}

export async function buildDesktopMobileAccessStatus(vaultPath, options = {}) {
  const now = Date.now();
  purgeExpiredPairRequests(vaultPath, now);
  const session = activePairingSession(vaultPath, now);
  const accessUrl = resolveMobileAccessUrl(options.env || process.env);
  const pairUrl = `${accessUrl}?pairCode=${encodeURIComponent(session.pairCode)}`;
  const qrSvg = await QRCode.toString(pairUrl, {
    type: "svg",
    margin: 1,
    width: 220,
    color: {
      dark: "#0f172a",
      light: "#ffffff"
    }
  });
  const state = await readMobileState(vaultPath);
  const pending = [...pendingMapForVault(vaultPath).values()]
    .filter((request) => request.status === "pending" && request.expiresAtMs > now)
    .map(publicPairRequest);
  return {
    mode: "desktop-confirmed-pairing",
    accessUrl,
    pairUrl,
    pairing: publicPairingSession(session),
    qrSvg,
    pendingRequests: pending,
    devices: state.devices.map(publicDevice),
    guidance: "二维码只包含手机访问地址和一次性配对码，不包含长期 token。手机请求连接后，需要在这台电脑上确认。"
  };
}

export async function createPairRequest(vaultPath, input = {}, meta = {}) {
  const now = Date.now();
  purgeExpiredPairRequests(vaultPath, now);
  assertPairCodeValid(vaultPath, input.pairCode || input.pair_code, now);
  const id = `mpr_${randomUUID().slice(0, 12)}`;
  const requestSecret = makeSecret();
  const request = {
    id,
    requestSecretHash: sha256(requestSecret),
    pairCode: cleanText(input.pairCode || input.pair_code),
    deviceName: cleanText(input.deviceName || input.device_name) || "手机浏览器",
    clientHint: cleanText(meta.clientHint || input.clientHint || input.client_hint),
    createdAtMs: now,
    expiresAtMs: now + PAIR_REQUEST_TTL_MS,
    status: "pending",
    token: "",
    deviceId: ""
  };
  pendingMapForVault(vaultPath).set(id, request);
  return {
    request: publicPairRequest(request),
    requestSecret
  };
}

function assertPairRequestSecret(request, requestSecret = "") {
  if (!request || sha256(requestSecret) !== request.requestSecretHash) {
    const error = new Error("配对请求不存在或校验失败。");
    error.code = "MOBILE_PAIR_REQUEST_UNAUTHORIZED";
    error.status = 401;
    throw error;
  }
}

export function getPairRequestStatus(vaultPath, requestId = "", requestSecret = "") {
  const now = Date.now();
  purgeExpiredPairRequests(vaultPath, now);
  const request = pendingMapForVault(vaultPath).get(cleanText(requestId));
  assertPairRequestSecret(request, requestSecret);
  if (request.expiresAtMs <= now && request.status === "pending") request.status = "expired";
  return {
    request: publicPairRequest(request),
    token: request.status === "confirmed" ? request.token : ""
  };
}

export async function confirmPairRequest(vaultPath, requestId = "") {
  const now = Date.now();
  purgeExpiredPairRequests(vaultPath, now);
  const request = pendingMapForVault(vaultPath).get(cleanText(requestId));
  if (!request || request.status !== "pending" || request.expiresAtMs <= now) {
    const error = new Error("配对请求不存在或已过期。");
    error.code = "MOBILE_PAIR_REQUEST_NOT_CONFIRMABLE";
    error.status = 404;
    throw error;
  }
  const token = makeToken();
  const device = {
    id: `mdev_${randomUUID().slice(0, 12)}`,
    name: request.deviceName || "手机浏览器",
    tokenHash: sha256(token),
    createdAt: nowIso(now),
    lastSeenAt: "",
    revokedAt: ""
  };
  const state = await readMobileState(vaultPath);
  state.devices = [device, ...state.devices.filter((item) => item.id !== device.id)];
  await writeMobileState(vaultPath, state);
  request.status = "confirmed";
  request.deviceId = device.id;
  request.token = token;
  return {
    request: publicPairRequest(request),
    device: publicDevice(device)
  };
}

export async function revokeMobileDevice(vaultPath, deviceId = "") {
  const state = await readMobileState(vaultPath);
  const id = cleanText(deviceId);
  let found = false;
  state.devices = state.devices.map((device) => {
    if (device.id !== id) return device;
    found = true;
    return { ...device, revokedAt: device.revokedAt || nowIso() };
  });
  if (!found) {
    const error = new Error("找不到这台已配对设备。");
    error.code = "MOBILE_DEVICE_NOT_FOUND";
    error.status = 404;
    throw error;
  }
  await writeMobileState(vaultPath, state);
  return { devices: state.devices.map(publicDevice) };
}

export async function assertMobileTokenAllowed(vaultPath, token = "") {
  const cleanToken = cleanText(token);
  if (!cleanToken) {
    const error = new Error("手机访问需要先完成电脑端确认配对。");
    error.code = "MOBILE_ACCESS_UNAUTHORIZED";
    error.status = 401;
    throw error;
  }
  const state = await readMobileState(vaultPath);
  const tokenHash = sha256(cleanToken);
  const index = state.devices.findIndex((device) => !device.revokedAt && device.tokenHash === tokenHash);
  if (index < 0) {
    const error = new Error("手机访问已失效，请重新扫码配对。");
    error.code = "MOBILE_ACCESS_UNAUTHORIZED";
    error.status = 401;
    throw error;
  }
  state.devices[index] = {
    ...state.devices[index],
    lastSeenAt: nowIso()
  };
  await writeMobileState(vaultPath, state);
  return publicDevice(state.devices[index]);
}

export async function listMobileDevices(vaultPath) {
  const state = await readMobileState(vaultPath);
  return state.devices.map(publicDevice);
}

export const MOBILE_PAIRING_TESTING = {
  PAIR_CODE_TTL_MS,
  PAIR_REQUEST_TTL_MS,
  sha256,
  readMobileState,
  writeMobileState,
  pairingSessionsByVault,
  pendingRequestsByVault
};
