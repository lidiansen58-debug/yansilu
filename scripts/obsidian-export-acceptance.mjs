import fs from "node:fs";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { exportMarkdown } from "../packages/export-engine/src/index.mjs";
import { parseMarkdownWithFrontmatter } from "../packages/domain/src/frontmatter.mjs";
import { parseWikilinks } from "../packages/markdown-engine/src/markdown-importer.mjs";

const REPO_ROOT = path.resolve(import.meta.dirname, "..");
const DEFAULT_DIRECTORY_ID = "dir_original_default";
const INTERNAL_FRONTMATTER_KEYS = new Set([
  "id",
  "note_type",
  "status",
  "created_at",
  "updated_at",
  "originality_status",
  "authorship",
  "distillation_status",
  "connector",
  "candidate_only",
  "from_literature_note_ids",
  "source_id",
  "source_type",
  "quote_text",
  "paraphrase_text",
  "imported_from",
  "url_or_path",
  "wikilinks",
  "parsed_wikilinks",
  "wikilink_targets",
  "original_frontmatter"
]);

function cleanText(value) {
  return String(value || "").trim();
}

function usage() {
  return [
    "Usage:",
    "  node scripts/obsidian-export-acceptance.mjs [options]",
    "",
    "Options:",
    "  --vault <path>        Vault path. Defaults to VAULT_PATH from .env.worktree.",
    "  --target <path>       Export destination. Defaults to tmp/obsidian-acceptance/<timestamp>.",
    `  --directoryId <id>    Directory scope. Defaults to ${DEFAULT_DIRECTORY_ID}.`,
    "  --all                 Export all markdown notes instead of one directory scope.",
    "  --obsidian <path>     Obsidian executable path override.",
    "  --skip-checks         Skip post-export acceptance checks.",
    "  --no-open             Export only; do not launch Obsidian.",
    "  --help, -h            Show this help."
  ].join("\n");
}

function parseArgs(argv = process.argv.slice(2)) {
  const options = {
    openAfterExport: true
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--vault") {
      options.vaultPath = argv[index + 1];
      index += 1;
      continue;
    }
    if (arg === "--target") {
      options.targetPath = argv[index + 1];
      index += 1;
      continue;
    }
    if (arg === "--directoryId") {
      options.directoryId = argv[index + 1];
      index += 1;
      continue;
    }
    if (arg === "--obsidian") {
      options.obsidianPath = argv[index + 1];
      index += 1;
      continue;
    }
    if (arg === "--all") {
      options.exportAll = true;
      continue;
    }
    if (arg === "--skip-checks") {
      options.skipChecks = true;
      continue;
    }
    if (arg === "--no-open") {
      options.openAfterExport = false;
      continue;
    }
    if (arg === "--help" || arg === "-h") {
      options.help = true;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

function loadSimpleEnvFile(filePath) {
  try {
    const text = fs.readFileSync(filePath, "utf8");
    const out = {};
    for (const line of text.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const separator = trimmed.indexOf("=");
      if (separator <= 0) continue;
      const key = trimmed.slice(0, separator).trim();
      const rawValue = trimmed.slice(separator + 1).trim();
      out[key] = rawValue.replace(/^["']|["']$/g, "");
    }
    return out;
  } catch {
    return {};
  }
}

function timestampLabel(now = new Date()) {
  const pad = (value) => String(value).padStart(2, "0");
  return [
    now.getFullYear(),
    pad(now.getMonth() + 1),
    pad(now.getDate())
  ].join("") + "-" + [pad(now.getHours()), pad(now.getMinutes()), pad(now.getSeconds())].join("");
}

function resolveDefaultTargetPath() {
  return path.join(REPO_ROOT, "tmp", "obsidian-acceptance", timestampLabel());
}

function existingFile(filePath) {
  try {
    return fs.statSync(filePath).isFile();
  } catch {
    return false;
  }
}

function existingDirectory(dirPath) {
  try {
    return fs.statSync(dirPath).isDirectory();
  } catch {
    return false;
  }
}

function windowsObsidianCandidates() {
  const localAppData = cleanText(process.env.LOCALAPPDATA);
  const programFiles = cleanText(process.env.ProgramFiles);
  const programFilesX86 = cleanText(process.env["ProgramFiles(x86)"]);
  return [
    localAppData ? path.join(localAppData, "Programs", "Obsidian", "Obsidian.exe") : "",
    programFiles ? path.join(programFiles, "Obsidian", "Obsidian.exe") : "",
    programFilesX86 ? path.join(programFilesX86, "Obsidian", "Obsidian.exe") : ""
  ].filter(Boolean);
}

function windowsPowerShellValue(command) {
  if (process.platform !== "win32") return "";
  const result = spawnSync(
    "powershell",
    ["-NoProfile", "-NonInteractive", "-Command", command],
    {
      cwd: REPO_ROOT,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      shell: false
    }
  );
  if ((result.status ?? 1) !== 0) return "";
  return cleanText(result.stdout);
}

function runningObsidianExecutable() {
  return windowsPowerShellValue(
    "(Get-Process | Where-Object { $_.ProcessName -eq 'Obsidian' -and $_.Path } | Select-Object -First 1 -ExpandProperty Path)"
  );
}

function registryObsidianExecutable() {
  const raw = windowsPowerShellValue(
    "(Get-ItemProperty 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*' | Where-Object { $_.DisplayName -like 'Obsidian*' -and $_.DisplayIcon } | Select-Object -First 1 -ExpandProperty DisplayIcon)"
  );
  return raw.replace(/,\d+$/, "");
}

function findObsidianExecutable(explicitPath = "") {
  const candidates = [
    cleanText(explicitPath),
    cleanText(process.env.OBSIDIAN_EXE),
    runningObsidianExecutable(),
    registryObsidianExecutable(),
    ...windowsObsidianCandidates()
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (existingFile(candidate)) return candidate;
  }
  return "";
}

function launchObsidian(obsidianPath, targetPath) {
  const child = spawn(obsidianPath, [targetPath], {
    detached: true,
    stdio: "ignore",
    shell: false
  });
  child.unref();
}

function toPortablePath(filePath) {
  return String(filePath || "").replaceAll("\\", "/");
}

function listFilesRecursive(rootDir, filter) {
  const out = [];
  if (!existingDirectory(rootDir)) return out;
  const pending = [rootDir];
  while (pending.length) {
    const current = pending.pop();
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        pending.push(fullPath);
        continue;
      }
      if (entry.isFile() && (!filter || filter(fullPath))) out.push(fullPath);
    }
  }
  return out.sort((a, b) => a.localeCompare(b));
}

function frontmatterAliasCandidates(frontmatter = {}) {
  const raw = frontmatter.aliases ?? frontmatter.alias ?? frontmatter.Alias ?? frontmatter.Aliases;
  if (Array.isArray(raw)) return raw.map((item) => cleanText(item)).filter(Boolean);
  if (raw === null || raw === undefined) return [];
  const single = cleanText(raw);
  return single ? [single] : [];
}

function normalizeLocalMarkdownTarget(rawTarget) {
  const normalized = cleanText(rawTarget);
  if (!normalized || /^(https?:|data:|mailto:|file:)/i.test(normalized)) return "";
  const hashIndex = normalized.indexOf("#");
  return cleanText(hashIndex >= 0 ? normalized.slice(0, hashIndex) : normalized);
}

export function assertNoAcceptanceErrors(report, label = "Acceptance checks") {
  const errorCount = Number(report?.severityCounts?.error || 0);
  if (errorCount <= 0) return report;
  const error = new Error(`${label} failed with ${errorCount} error${errorCount === 1 ? "" : "s"}.`);
  error.code = "ACCEPTANCE_FAILED";
  error.report = report;
  throw error;
}

export function localMarkdownTargets(markdownBody) {
  const targets = [];
  const body = String(markdownBody || "");
  for (const match of body.matchAll(/(!?\[[^\]]*?\]\()(<[^>]+>|[^)]+)(\))/g)) {
    const rawTarget = cleanText(match[2]);
    const unwrapped = rawTarget.startsWith("<") && rawTarget.endsWith(">") ? rawTarget.slice(1, -1).trim() : rawTarget;
    const normalizedTarget = normalizeLocalMarkdownTarget(unwrapped);
    if (!normalizedTarget) continue;
    targets.push(normalizedTarget);
  }
  return targets;
}

export function resolveLinkCandidatePaths(target, markdownFilePath, isEmbed) {
  const noteDir = path.posix.dirname(toPortablePath(markdownFilePath));
  const normalizedTarget = toPortablePath(target);
  const directPath = path.posix.normalize(path.posix.join(noteDir, normalizedTarget));
  const out = [directPath];
  const hasExtension = /\.[A-Za-z0-9]+$/.test(path.posix.basename(normalizedTarget));
  if (!hasExtension) out.push(`${directPath}.md`);
  return [...new Set(out)];
}

export function buildMarkdownPathIndex(markdownFiles = [], exportRoot) {
  const exactPaths = new Set();
  const basenameMap = new Map();
  const aliasMap = new Map();
  for (const markdownFilePath of markdownFiles) {
    const relativePath = toPortablePath(path.relative(exportRoot, markdownFilePath));
    const raw = fs.readFileSync(markdownFilePath, "utf8");
    const parsed = parseMarkdownWithFrontmatter(raw);
    exactPaths.add(relativePath);
    const basename = path.posix.basename(relativePath, path.posix.extname(relativePath));
    if (!basenameMap.has(basename)) basenameMap.set(basename, []);
    basenameMap.get(basename).push(relativePath);
    for (const alias of frontmatterAliasCandidates(parsed.frontmatter)) {
      if (!aliasMap.has(alias)) aliasMap.set(alias, []);
      aliasMap.get(alias).push(relativePath);
    }
  }
  return { exactPaths, basenameMap, aliasMap };
}

export function resolveWikilinkCandidatePaths(target, markdownIndex) {
  const normalizedTarget = toPortablePath(target).replace(/\.md$/i, "");
  if (!normalizedTarget) return [];
  if (normalizedTarget.includes("/")) {
    return [`${normalizedTarget}.md`];
  }
  const matches = [
    ...(markdownIndex.basenameMap.get(normalizedTarget) || []),
    ...(markdownIndex.aliasMap.get(normalizedTarget) || [])
  ].filter(Boolean);
  const uniqueMatches = [...new Set(matches)];
  if (uniqueMatches.length === 1) return uniqueMatches;
  if (uniqueMatches.length > 1) return uniqueMatches.map((item) => `${item}#ambiguous`);
  return [`${normalizedTarget}.md`];
}

function validateExportedMarkdownFile(markdownFilePath, exportRoot, issues, markdownIndex) {
  const portableMarkdownPath = toPortablePath(path.relative(exportRoot, markdownFilePath));
  const raw = fs.readFileSync(markdownFilePath, "utf8");
  const parsed = parseMarkdownWithFrontmatter(raw);

  for (const key of Object.keys(parsed.frontmatter || {})) {
    if (!INTERNAL_FRONTMATTER_KEYS.has(key)) continue;
    issues.push({
      severity: "warning",
      type: "frontmatter_internal_key",
      file: portableMarkdownPath,
      key
    });
  }

  const fileName = path.posix.basename(portableMarkdownPath);
  if (/^(pn|ln|src|fn)_[a-z0-9]+(?: \d+)?\.md$/i.test(fileName)) {
    issues.push({
      severity: "warning",
      type: "internal_style_filename",
      file: portableMarkdownPath,
      fileName
    });
  }

  for (const link of parseWikilinks(parsed.body)) {
    if (!link.target) continue;
    if (link.embed) {
      const embedFileCandidates = resolveLinkCandidatePaths(link.target, portableMarkdownPath, true);
      const fileExists = embedFileCandidates.some((candidate) => existingFile(path.join(exportRoot, candidate)));
      if (fileExists) continue;
    }
    const targetCandidates = resolveWikilinkCandidatePaths(link.target, markdownIndex);
    const ambiguous = targetCandidates.some((candidate) => candidate.endsWith("#ambiguous"));
    const exactMatches = targetCandidates.map((candidate) => candidate.replace(/#ambiguous$/, ""));
    const exists = exactMatches.some((candidate) => markdownIndex.exactPaths.has(candidate));
    if (exists && !ambiguous) continue;
    if (exists && ambiguous) {
      issues.push({
        severity: "warning",
        type: "ambiguous_wikilink_target",
        file: portableMarkdownPath,
        target: link.target,
        checked: exactMatches
      });
      continue;
    }
    issues.push({
      severity: "error",
      type: link.embed ? "missing_embed_target" : "missing_wikilink_target",
      file: portableMarkdownPath,
      target: link.target,
      checked: exactMatches
    });
  }

  for (const target of localMarkdownTargets(parsed.body)) {
    const targetCandidates = resolveLinkCandidatePaths(target, portableMarkdownPath, false);
    const exists = targetCandidates.some((candidate) => existingFile(path.join(exportRoot, candidate)));
    if (exists) continue;
    issues.push({
      severity: "error",
      type: "missing_markdown_link_target",
      file: portableMarkdownPath,
      target,
      checked: targetCandidates
    });
  }
}

export function buildAcceptanceReport(targetPath, exportResult) {
  const markdownFiles = listFilesRecursive(targetPath, (filePath) => filePath.toLowerCase().endsWith(".md"));
  const assetFiles = listFilesRecursive(path.join(targetPath, "assets"));
  const issues = [];
  const markdownIndex = buildMarkdownPathIndex(markdownFiles, targetPath);

  for (const markdownFilePath of markdownFiles) {
    validateExportedMarkdownFile(markdownFilePath, targetPath, issues, markdownIndex);
  }

  const severityCounts = issues.reduce(
    (acc, item) => {
      acc[item.severity] = (acc[item.severity] || 0) + 1;
      return acc;
    },
    { error: 0, warning: 0 }
  );

  return {
    generatedAt: new Date().toISOString(),
    targetPath,
    exportRecordPath: exportResult.recordPath,
    copiedBreakdown: exportResult.copiedBreakdown,
    actualFiles: {
      markdownFiles: markdownFiles.length,
      assetFiles: assetFiles.length,
      totalFiles: markdownFiles.length + assetFiles.length
    },
    severityCounts,
    issues
  };
}

function writeAcceptanceReport(targetPath, report) {
  const reportPath = path.join(targetPath, "acceptance-report.json");
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  return reportPath;
}

function markdownStatusLine(report) {
  if (report.severityCounts.error > 0) return "FAILED";
  if (report.severityCounts.warning > 0) return "PASSED WITH WARNINGS";
  return "PASSED";
}

function issueMarkdownLine(issue) {
  const detail = issue.target
    ? `target: \`${issue.target}\``
    : issue.key
      ? `field: \`${issue.key}\``
      : issue.fileName
        ? `file name: \`${issue.fileName}\``
        : "";
  return `- [${issue.severity}] \`${issue.type}\` ${issue.file}${detail ? ` -> ${detail}` : ""}`;
}

function renderAcceptanceMarkdown(report) {
  const lines = [
    "# Obsidian Export Acceptance Report",
    "",
    `- Status: ${markdownStatusLine(report)}`,
    `- Generated at: ${report.generatedAt}`,
    `- Export target: \`${report.targetPath}\``,
    `- Export record: \`${report.exportRecordPath}\``,
    `- Exported files: ${report.copiedBreakdown.markdownFiles} markdown, ${report.copiedBreakdown.assetFiles} assets, ${report.copiedBreakdown.totalFiles} total`,
    `- Scanned files: ${report.actualFiles.markdownFiles} markdown, ${report.actualFiles.assetFiles} assets, ${report.actualFiles.totalFiles} total`,
    `- Check results: ${report.severityCounts.error} errors, ${report.severityCounts.warning} warnings`,
    "",
    "## Checks",
    "",
    "- No internal frontmatter keys leak into exported notes",
    "- Wikilinks, embeds, and local Markdown links resolve to existing files",
    "- Exported file names do not fall back to internal id-style names",
    ""
  ];

  if (!report.issues.length) {
    lines.push("## Summary", "", "- No errors or warnings were found.", "");
    return `${lines.join("\n")}\n`;
  }

  const errors = report.issues.filter((item) => item.severity === "error");
  const warnings = report.issues.filter((item) => item.severity === "warning");

  if (errors.length) {
    lines.push("## Errors", "", ...errors.map(issueMarkdownLine), "");
  }
  if (warnings.length) {
    lines.push("## Warnings", "", ...warnings.map(issueMarkdownLine), "");
  }

  return `${lines.join("\n")}\n`;
}

function writeAcceptanceMarkdownReport(targetPath, report) {
  const reportPath = path.join(targetPath, "acceptance-report.md");
  fs.writeFileSync(reportPath, renderAcceptanceMarkdown(report), "utf8");
  return reportPath;
}

export async function main() {
  const options = parseArgs();
  if (options.help) {
    console.log(usage());
    return;
  }

  const worktreeEnv = loadSimpleEnvFile(path.join(REPO_ROOT, ".env.worktree"));
  const rawVaultPath = cleanText(options.vaultPath) || cleanText(worktreeEnv.VAULT_PATH);
  if (!rawVaultPath) {
    throw new Error("A valid vault path is required. Pass --vault or set VAULT_PATH in .env.worktree.");
  }
  const vaultPath = path.resolve(rawVaultPath);
  if (!existingDirectory(vaultPath)) {
    throw new Error("A valid vault path is required. Pass --vault or set VAULT_PATH in .env.worktree.");
  }

  const targetPath = path.resolve(cleanText(options.targetPath) || resolveDefaultTargetPath());
  const directoryId = options.exportAll ? "" : cleanText(options.directoryId) || DEFAULT_DIRECTORY_ID;

  const exportInput = {
    vaultPath,
    targetPath,
    requestId: "obsidian_acceptance"
  };
  if (directoryId) {
    exportInput.directoryId = directoryId;
    exportInput.includeDescendants = true;
  }

  const result = await exportMarkdown(exportInput);

  console.log(`Vault: ${vaultPath}`);
  console.log(`Export target: ${targetPath}`);
  console.log(`Copied: ${result.copied} files (${result.copiedBreakdown.markdownFiles} markdown, ${result.copiedBreakdown.assetFiles} assets)`);
  if (directoryId) {
    console.log(`Directory scope: ${directoryId}`);
  } else {
    console.log("Directory scope: all notes");
  }
  console.log(`Record: ${result.recordPath}`);

  if (!options.skipChecks) {
    const report = buildAcceptanceReport(targetPath, result);
    const reportPath = writeAcceptanceReport(targetPath, report);
    const markdownReportPath = writeAcceptanceMarkdownReport(targetPath, report);
    console.log(`Acceptance checks: ${report.severityCounts.error} errors, ${report.severityCounts.warning} warnings`);
    console.log(`Acceptance report: ${reportPath}`);
    console.log(`Acceptance markdown: ${markdownReportPath}`);
    if (report.issues.length) {
      for (const issue of report.issues.slice(0, 8)) {
        const detail = issue.target ? issue.target : issue.key ? issue.key : issue.fileName || "";
        console.log(`  [${issue.severity}] ${issue.type} ${issue.file}${detail ? ` -> ${detail}` : ""}`);
      }
      if (report.issues.length > 8) {
        console.log(`  ... ${report.issues.length - 8} more issues`);
      }
    }
    assertNoAcceptanceErrors(report);
  } else {
    console.log("Acceptance checks: skipped (--skip-checks).");
  }

  if (!options.openAfterExport) {
    console.log("Skipped launching Obsidian (--no-open).");
    return;
  }

  const obsidianPath = findObsidianExecutable(options.obsidianPath);
  if (!obsidianPath) {
    console.log("Obsidian executable not found. Export completed, but the vault was not opened.");
    return;
  }

  launchObsidian(obsidianPath, targetPath);
  console.log(`Opened in Obsidian: ${obsidianPath}`);
}

const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectRun) {
  main().catch((error) => {
    console.error(error?.stack || error?.message || String(error));
    process.exit(1);
  });
}
