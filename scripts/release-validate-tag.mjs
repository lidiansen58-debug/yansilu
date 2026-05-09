import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const tagName = String(process.argv[2] || process.env.GITHUB_REF_NAME || "").trim();

function fail(message) {
  console.error(message);
  process.exit(1);
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(repoRoot, relativePath), "utf8"));
}

function readCargoPackageVersion(relativePath) {
  const content = fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
  let inPackage = false;
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed === "[package]") {
      inPackage = true;
      continue;
    }
    if (inPackage && trimmed.startsWith("[") && trimmed.endsWith("]")) break;
    if (!inPackage) continue;

    const match = trimmed.match(/^version\s*=\s*"(?<version>[^"]+)"/);
    if (match) return match.groups.version;
  }
  return "";
}

if (!tagName) fail("Release tag is required.");

const version = tagName.startsWith("v") ? tagName.slice(1) : tagName;
if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(version)) {
  fail(`Release tag must look like v1.2.3 or v1.2.3-beta.1. Received: ${tagName}`);
}

const packageVersion = readJson("package.json").version;
const tauriVersion = readJson("apps/desktop/src-tauri/tauri.conf.json").version;
const cargoVersion = readCargoPackageVersion("apps/desktop/src-tauri/Cargo.toml");

const mismatches = [
  ["package.json", packageVersion],
  ["apps/desktop/src-tauri/tauri.conf.json", tauriVersion],
  ["apps/desktop/src-tauri/Cargo.toml", cargoVersion]
].filter(([, value]) => value !== version);

if (mismatches.length) {
  const details = mismatches.map(([file, value]) => `${file}: ${value || "(missing)"}`).join("\n");
  fail(`Release tag ${tagName} does not match project version ${version}.\n${details}`);
}

console.log(`Release tag ${tagName} matches project version ${version}.`);

