import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

export function hasCommand(command, env = process.env) {
  const candidates =
    process.platform === "win32" ? [`${command}.exe`, `${command}.cmd`, command] : [command];
  return candidates.some((candidate) => {
    const result = spawnSync(candidate, ["--version"], {
      env,
      stdio: "ignore",
      shell: false
    });
    return result.status === 0;
  });
}

export function withCargoBin(env = process.env) {
  if (hasCommand("cargo", env) && hasCommand("rustc", env)) return env;

  const cargoBin = path.join(os.homedir(), ".cargo", "bin");
  if (!fs.existsSync(cargoBin)) return env;

  const separator = process.platform === "win32" ? ";" : ":";
  const currentPath = String(env.PATH || env.Path || "");
  const nextPath = currentPath
    .split(separator)
    .filter(Boolean);

  if (!nextPath.includes(cargoBin)) nextPath.unshift(cargoBin);

  return {
    ...env,
    PATH: nextPath.join(separator)
  };
}

export function commandVersion(command, env = process.env) {
  const candidates =
    process.platform === "win32" ? [`${command}.exe`, `${command}.cmd`, command] : [command];
  for (const candidate of candidates) {
    const result = spawnSync(candidate, ["--version"], {
      env,
      encoding: "utf8",
      shell: false
    });
    if (result.status === 0) {
      return String(result.stdout || result.stderr || "").trim();
    }
  }
  return "";
}
