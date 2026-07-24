import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

function normalizeArchitecture(value) {
  const architecture = String(value || "").trim();
  if (architecture === "x64") return "x86_64";
  return architecture;
}

export function parseLipoArchitectures(output) {
  const value = String(output || "").trim();
  const marker = value.match(/(?:are:|is architecture:)\s*(.+)$/u);
  const architectures = marker ? marker[1] : value;
  return architectures.trim().split(/\s+/u).filter(Boolean);
}

export function assertExpectedArchitecture({ filePath, architectures, expectedArchitecture }) {
  const expected = normalizeArchitecture(expectedArchitecture);
  const requiredArchitectures = expected === "universal" ? ["arm64", "x86_64"] : [expected];
  if (!requiredArchitectures.every((architecture) => architectures.includes(architecture))) {
    throw new Error(
      `Architecture mismatch for ${filePath}: expected ${requiredArchitectures.join(" + ")}, found ${architectures.join(", ") || "none"}.`
    );
  }
}

function parseArgs(argv) {
  const options = { appPath: "", expectedArchitecture: "" };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--app") options.appPath = argv[++index] || "";
    else if (argument === "--expected") options.expectedArchitecture = argv[++index] || "";
    else throw new Error(`Unexpected argument: ${argument}`);
  }
  if (!options.appPath || !options.expectedArchitecture) {
    throw new Error("Usage: node scripts/verify-macos-bundle-architecture.mjs --app <path> --expected <arm64|x86_64|universal>");
  }
  return options;
}

function lipoArchitectures(filePath) {
  const result = spawnSync("lipo", ["-archs", filePath], { encoding: "utf8", shell: false });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`Could not inspect ${filePath}: ${result.stderr || result.stdout}`.trim());
  }
  return parseLipoArchitectures(result.stdout);
}

export function verifyMacosBundleArchitecture({ appPath, expectedArchitecture }) {
  const app = path.resolve(appPath);
  const runtimeDir = path.join(app, "Contents", "Resources", "desktop-api-runtime");
  const files = [
    path.join(app, "Contents", "MacOS", "yansilu-desktop"),
    path.join(runtimeDir, "node", "node")
  ];
  const libraryDir = path.join(runtimeDir, "lib");
  const libnode = fs.readdirSync(libraryDir)
    .find((name) => /^libnode(?:\.\d+)*\.dylib$/u.test(name));
  if (!libnode) throw new Error(`Bundled libnode dylib was not found in ${libraryDir}.`);
  files.push(path.join(libraryDir, libnode));

  for (const filePath of files) {
    if (!fs.existsSync(filePath)) throw new Error(`Required macOS bundle file is missing: ${filePath}`);
    assertExpectedArchitecture({
      filePath,
      architectures: lipoArchitectures(filePath),
      expectedArchitecture
    });
  }

  const manifestPath = path.join(runtimeDir, "desktop-api-runtime.json");
  const runtimeManifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const normalizedExpectedArchitecture = normalizeArchitecture(expectedArchitecture);
  const expectedNodeArchitecture = normalizedExpectedArchitecture === "universal"
    ? "universal"
    : normalizedExpectedArchitecture === "x86_64"
      ? "x64"
      : "arm64";
  if (runtimeManifest.arch !== expectedNodeArchitecture) {
    throw new Error(
      `Bundled Node runtime manifest reports ${runtimeManifest.arch || "unknown"}; expected ${expectedNodeArchitecture}.`
    );
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const options = parseArgs(process.argv.slice(2));
    verifyMacosBundleArchitecture(options);
    console.log(`macOS bundle architecture verified: ${options.expectedArchitecture}`);
  } catch (error) {
    console.error(error?.message || error);
    process.exit(1);
  }
}
