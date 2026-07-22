import fs from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

function parseArgs(argv = []) {
  const options = { required: false, filePath: "" };
  for (const value of argv) {
    if (value === "--required") options.required = true;
    else if (!options.filePath) options.filePath = value;
    else throw new Error(`Unexpected argument: ${value}`);
  }
  if (!options.filePath) throw new Error("Usage: node scripts/sign-tauri-artifact.mjs [--required] <file>");
  return options;
}

function signingKeyConfigured() {
  return Boolean(
    String(process.env.TAURI_SIGNING_PRIVATE_KEY || "").trim()
    || String(process.env.TAURI_SIGNING_PRIVATE_KEY_PATH || "").trim()
  );
}

export async function signTauriArtifact({ filePath = "", required = false } = {}) {
  const target = path.resolve(filePath);
  await fs.access(target);
  if (!signingKeyConfigured()) {
    if (required) throw new Error("Tauri signing key is required for this release artifact.");
    console.log(`Tauri signing key not configured; skipped signature for ${target}`);
    return { signed: false, signaturePath: `${target}.sig` };
  }

  await fs.rm(`${target}.sig`, { force: true });
  const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
  const result = spawnSync(npmCommand, ["exec", "tauri", "signer", "sign", "--", target], {
    cwd: process.cwd(),
    env: process.env,
    stdio: "inherit",
    shell: false
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`Tauri signer exited with code ${result.status ?? 1}.`);
  await fs.access(`${target}.sig`);
  console.log(`Tauri signature created: ${target}.sig`);
  return { signed: true, signaturePath: `${target}.sig` };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  signTauriArtifact(parseArgs(process.argv.slice(2))).catch((error) => {
    console.error(error?.message || error);
    process.exit(1);
  });
}
