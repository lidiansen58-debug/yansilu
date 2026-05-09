import { spawn } from "node:child_process";
import { hasCommand, withCargoBin } from "./rust-env.mjs";

const env = withCargoBin({ ...process.env });

if (!hasCommand("cargo", env) || !hasCommand("rustc", env)) {
  console.error("Rust toolchain not found. Expected cargo/rustc in PATH or ~/.cargo/bin.");
  process.exit(1);
}

const child =
  process.platform === "win32"
    ? spawn("cmd.exe", ["/d", "/s", "/c", "tauri.cmd dev --config ./apps/desktop/src-tauri/tauri.conf.json"], {
        cwd: process.cwd(),
        env,
        stdio: "inherit",
        shell: false
      })
    : spawn("tauri", ["dev", "--config", "./apps/desktop/src-tauri/tauri.conf.json"], {
        cwd: process.cwd(),
        env,
        stdio: "inherit",
        shell: false
      });

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 0);
});
