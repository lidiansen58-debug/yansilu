import net from "node:net";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { commandVersion, hasCommand, withCargoBin } from "./rust-env.mjs";

function logResult(label, ok, detail = "") {
  const status = ok ? "PASS" : "FAIL";
  const suffix = detail ? ` - ${detail}` : "";
  console.log(`[${status}] ${label}${suffix}`);
}

async function canConnect(port) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host: "127.0.0.1", port });
    socket.once("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.once("error", () => resolve(false));
    socket.setTimeout(1000, () => {
      socket.destroy();
      resolve(false);
    });
  });
}

function npmExecTauriVersion(env) {
  const npmBin = process.platform === "win32" ? "npm.cmd" : "npm";
  const result = spawnSync(npmBin, ["exec", "tauri", "--", "--version"], {
    env,
    encoding: "utf8",
    shell: false
  });
  if (result.status === 0) return String(result.stdout || result.stderr || "").trim();
  return "";
}

function localTauriShim() {
  const candidates =
    process.platform === "win32"
      ? ["node_modules/.bin/tauri.cmd", "node_modules/.bin/tauri"]
      : ["node_modules/.bin/tauri"];
  const match = candidates
    .map((entry) => path.resolve(process.cwd(), entry))
    .find((entry) => fs.existsSync(entry));
  return match || "";
}

const env = withCargoBin({ ...process.env });
const cargoOk = hasCommand("cargo", env);
const rustcOk = hasCommand("rustc", env);
const tauriVersion = commandVersion("tauri", env) || npmExecTauriVersion(env);
const tauriShim = localTauriShim();
const tauriOk = Boolean(tauriVersion || tauriShim);

logResult("cargo", cargoOk, cargoOk ? commandVersion("cargo", env) : "~/.cargo/bin not detected in PATH");
logResult("rustc", rustcOk, rustcOk ? commandVersion("rustc", env) : "~/.cargo/bin not detected in PATH");
logResult(
  "tauri CLI",
  tauriOk,
  tauriVersion || (tauriShim ? `local shim found at ${tauriShim}` : "npm devDependency exists but CLI is not runnable in current shell")
);

const webUp = await canConnect(5173);
const apiUp = await canConnect(3000);
logResult("web dev server :5173", webUp, webUp ? "reachable" : "not running");
logResult("api server :3000", apiUp, apiUp ? "reachable" : "not running");

if (!cargoOk || !rustcOk || !tauriOk) {
  process.exit(1);
}
