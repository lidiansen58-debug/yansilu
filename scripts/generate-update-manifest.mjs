import fs from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

import {
  buildUpdateManifestFromBundleManifest,
  parseGithubRepositoryFromRemote
} from "../packages/app-update/src/release-manifest.mjs";

const execFileAsync = promisify(execFile);
const repoRoot = process.cwd();

function printUsage() {
  console.log(`Usage:
  npm run release:update-manifest -- [options]

Options:
  --bundle-manifest <path>          Source bundle manifest JSON.
  --out <path>                      Output update manifest path.
  --repo <owner/repo>               GitHub repository. Defaults to GITHUB_REPOSITORY or origin remote.
  --tag <tag>                       GitHub release tag. Defaults to v<package.json version>.
  --channel <channel>               Release channel. Defaults from version prerelease label.
  --changelog <text>                Add one changelog entry. Can be repeated.
  --changelog-file <path>           Read changelog entries from a text/markdown file.
  --minimum-supported-version <ver> Minimum supported app version.
  --critical                        Mark the update as critical.
  --file <bundle item path>         Choose a specific bundle item from bundle-manifest.json.
  --github-base-url <url>           GitHub base URL. Defaults to https://github.com.
  --help                            Show this help.
`);
}

function parseArgs(argv) {
  const options = {
    changelog: [],
    critical: false
  };
  const valueOptions = new Set([
    "bundle-manifest",
    "out",
    "repo",
    "tag",
    "channel",
    "changelog",
    "changelog-file",
    "minimum-supported-version",
    "file",
    "github-base-url"
  ]);

  for (let index = 0; index < argv.length; index += 1) {
    const raw = argv[index];
    if (raw === "--help" || raw === "-h") {
      options.help = true;
      continue;
    }
    if (raw === "--critical") {
      options.critical = true;
      continue;
    }
    if (!raw.startsWith("--")) {
      throw new Error(`Unexpected argument: ${raw}`);
    }

    const option = raw.slice(2);
    if (!valueOptions.has(option)) {
      throw new Error(`Unknown option: ${raw}`);
    }
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`Option ${raw} requires a value.`);
    }
    index += 1;

    if (option === "changelog") options.changelog.push(value);
    else options[option.replaceAll("-", "_")] = value;
  }

  return options;
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

async function readChangelogFile(filePath) {
  const content = await fs.readFile(filePath, "utf8");
  return content
    .split(/\r?\n/)
    .map((line) => line.trim().replace(/^[-*]\s+/, ""))
    .filter((line) => line && !line.startsWith("#"));
}

async function resolveRepository(explicitRepository = "") {
  if (explicitRepository) return explicitRepository;
  if (process.env.GITHUB_REPOSITORY) return process.env.GITHUB_REPOSITORY;

  try {
    const { stdout } = await execFileAsync("git", ["remote", "get-url", "origin"], {
      cwd: repoRoot,
      windowsHide: true
    });
    const repository = parseGithubRepositoryFromRemote(stdout);
    if (repository) return repository;
  } catch {
    // Fall through to the explicit error below.
  }

  throw new Error("GitHub repository is required. Pass --repo owner/repo or set GITHUB_REPOSITORY.");
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printUsage();
    return;
  }

  const packageJson = await readJson(path.join(repoRoot, "package.json"));
  const bundleManifestPath = path.resolve(
    repoRoot,
    options.bundle_manifest ||
      path.join("apps", "desktop", "src-tauri", "target", "release", "bundle", "bundle-manifest.json")
  );
  const outputPath = path.resolve(repoRoot, options.out || path.join("release-artifacts", "update-manifest.json"));
  const changelog = [
    ...options.changelog,
    ...(options.changelog_file ? await readChangelogFile(path.resolve(repoRoot, options.changelog_file)) : [])
  ];

  const bundleManifest = await readJson(bundleManifestPath);
  const repository = await resolveRepository(options.repo);
  const manifest = buildUpdateManifestFromBundleManifest({
    bundleManifest,
    packageVersion: packageJson.version,
    repository,
    tag: options.tag || `v${packageJson.version}`,
    channel: options.channel,
    changelog,
    minimumSupportedVersion: options.minimum_supported_version,
    critical: options.critical,
    file: options.file,
    githubBaseUrl: options.github_base_url
  });

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

  console.log(`Update manifest written: ${outputPath}`);
  console.log(`Version: ${manifest.version}`);
  console.log(`Download URL: ${manifest.downloadUrl}`);
}

main().catch((error) => {
  console.error(error?.message || error);
  process.exit(1);
});
