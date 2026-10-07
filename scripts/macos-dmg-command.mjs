import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";

export function executeHdiutil(args, spawn = spawnSync) {
  const logRoot = fs.mkdtempSync(path.join(os.tmpdir(), "yansilu-hdiutil-"));
  const logPath = path.join(logRoot, "command.log");
  let logFd;
  try {
    // A file avoids waiting on output pipes inherited by diskimages-helper.
    logFd = fs.openSync(logPath, "w");
    const result = spawn("hdiutil", args, {
      stdio: ["ignore", logFd, logFd],
      shell: false,
      timeout: 240_000,
      killSignal: "SIGKILL"
    });
    fs.closeSync(logFd);
    logFd = undefined;
    return { ...result, output: fs.readFileSync(logPath, "utf8") };
  } finally {
    if (logFd !== undefined) fs.closeSync(logFd);
    fs.rmSync(logRoot, { recursive: true, force: true });
  }
}

export async function runHdiutil(args, {
  execute = executeHdiutil,
  wait = delay,
  write = (output) => process.stdout.write(output),
  warn = (message) => console.warn(message)
} = {}) {
  const operation = args[0];
  const busyExitCode = operation === "create" ? 1 : operation === "detach" ? 16 : null;
  const maxAttempts = 5;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const result = execute(args);
    const output = String(result.output || "");
    if (output) write(output);
    if (!result.error && result.status === 0) return;

    const retryable = !result.error && !result.signal && busyExitCode !== null
      && result.status === busyExitCode && /resource busy/i.test(output);
    if (!retryable || attempt === maxAttempts) {
      const reason = result.error?.message || (result.signal
        ? `terminated by ${result.signal}` : `exited with code ${result.status ?? "unknown"}`);
      throw new Error(
        `hdiutil ${operation} ${reason} (attempt ${attempt}/${maxAttempts}).${output ? `\n${output.trim()}` : ""}`,
        { cause: result.error }
      );
    }

    const waitMs = 2 ** attempt * 1000;
    warn(`hdiutil ${operation}: Resource busy; retry ${attempt + 1}/${maxAttempts} in ${waitMs / 1000}s.`);
    await wait(waitMs);
  }
}
