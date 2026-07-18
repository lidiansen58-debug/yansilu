import net from "node:net";
import os from "node:os";
import { isLoopbackRemoteAddress } from "./local-runtime-control.mjs";

export { isLoopbackRemoteAddress };

const MOBILE_LAN_STATIC_PATHS = new Set([
  "/mobile",
  "/app/mobile",
  "/mobile.js",
  "/mobile.css"
]);

function normalizeRemoteAddress(value = "") {
  return String(value || "").trim().toLowerCase().split("%")[0];
}

export function isPrivateLanRemoteAddress(value = "") {
  let address = normalizeRemoteAddress(value);
  if (address.startsWith("::ffff:")) address = address.slice("::ffff:".length);
  if (net.isIP(address) === 4) {
    const [a, b] = address.split(".").map(Number);
    return a === 10
      || (a === 172 && b >= 16 && b <= 31)
      || (a === 192 && b === 168);
  }
  if (net.isIP(address) !== 6) return false;
  const firstGroup = Number.parseInt(address.split(":")[0] || "0", 16);
  return (firstGroup & 0xfe00) === 0xfc00 || (firstGroup & 0xffc0) === 0xfe80;
}

function addressFamily(value = "") {
  return net.isIP(normalizeRemoteAddress(value).replace(/^::ffff:/, ""));
}

function cidrPrefix(entry = {}) {
  const prefix = Number.parseInt(String(entry.cidr || "").split("/").at(-1), 10);
  const family = addressFamily(entry.address);
  const maximum = family === 4 ? 32 : 128;
  return Number.isInteger(prefix) && prefix >= 0 && prefix <= maximum ? prefix : null;
}

export function isDirectLanRemoteAddress(value = "", interfaces = os.networkInterfaces()) {
  let remoteAddress = normalizeRemoteAddress(value);
  if (remoteAddress.startsWith("::ffff:")) remoteAddress = remoteAddress.slice("::ffff:".length);
  const family = net.isIP(remoteAddress);
  if (!family || !isPrivateLanRemoteAddress(remoteAddress)) return false;

  for (const entries of Object.values(interfaces || {})) {
    for (const entry of entries || []) {
      if (entry?.internal) continue;
      let localAddress = normalizeRemoteAddress(entry?.address);
      if (localAddress.startsWith("::ffff:")) localAddress = localAddress.slice("::ffff:".length);
      if (net.isIP(localAddress) !== family) continue;
      const prefix = cidrPrefix(entry);
      if (prefix === null) continue;
      try {
        const blockList = new net.BlockList();
        const type = family === 4 ? "ipv4" : "ipv6";
        blockList.addSubnet(localAddress, prefix, type);
        if (blockList.check(remoteAddress, type)) return true;
      } catch {
        // Ignore malformed platform adapter records and inspect the next adapter.
      }
    }
  }
  return false;
}

export function isMobileLanPath(pathname = "") {
  const path = String(pathname || "").trim();
  return MOBILE_LAN_STATIC_PATHS.has(path) || path.startsWith("/api/v1/mobile/");
}

export function requestMayAccessLan(req, pathname = "", options = {}) {
  const remoteAddress = req?.socket?.remoteAddress;
  return isLoopbackRemoteAddress(remoteAddress)
    || (isMobileLanPath(pathname)
      && isDirectLanRemoteAddress(remoteAddress, options.networkInterfaces || os.networkInterfaces()));
}
