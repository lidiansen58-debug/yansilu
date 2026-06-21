import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const DEFAULT_ROOTS = ["apps", "packages", "tests", "scripts", "docs"];
const TEXT_EXTENSIONS = new Set([
  ".css",
  ".html",
  ".js",
  ".json",
  ".md",
  ".mjs",
  ".ts",
  ".tsx"
]);
const EXCLUDED_PARTS = new Set([
  ".git",
  "node_modules",
  "target",
  "dist",
  "build",
  "coverage",
  "vendor"
]);

const ALLOW_MARKER = "mojibake-risk-allow";
const REPLACEMENT_PATTERN = /锟|�/g; // mojibake-risk-allow detector marker
const UTF8_AS_GBK_PATTERN = /(?:[鎴鍏涓绗瑙鐩璇宸澶鏂寮瀹缃鑱姘鏍鐢鎶鐨椂鍙鏄杩][\u4e00-\u9fff]{1,}|锛|銆|€)/g; // mojibake-risk-allow detector marker

function normalizePath(value = "") {
  return String(value || "").replace(/\\/g, "/");
}

function shouldSkipPath(filePath = "") {
  return normalizePath(filePath)
    .split("/")
    .some((part) => EXCLUDED_PARTS.has(part));
}

async function listTextFiles(rootDir = process.cwd(), roots = DEFAULT_ROOTS) {
  const files = [];

  async function walk(currentPath) {
    if (shouldSkipPath(path.relative(rootDir, currentPath))) return;
    const stat = await fs.stat(currentPath).catch(() => null);
    if (!stat) return;
    if (stat.isDirectory()) {
      const entries = await fs.readdir(currentPath, { withFileTypes: true });
      for (const entry of entries) {
        await walk(path.join(currentPath, entry.name));
      }
      return;
    }
    if (!stat.isFile()) return;
    if (TEXT_EXTENSIONS.has(path.extname(currentPath).toLowerCase())) files.push(currentPath);
  }

  for (const root of roots) {
    await walk(path.resolve(rootDir, root));
  }
  return files.sort();
}

function countMatches(text = "", pattern) {
  return [...String(text || "").matchAll(pattern)].length;
}

export function classifyMojibakeText(text = "") {
  const replacementCount = countMatches(text, REPLACEMENT_PATTERN);
  const utf8AsGbkCount = countMatches(text, UTF8_AS_GBK_PATTERN);
  return {
    replacementCount,
    utf8AsGbkCount,
    total: replacementCount + utf8AsGbkCount
  };
}

function shouldIgnoreLine(line = "") {
  return String(line || "").includes(ALLOW_MARKER);
}

export function classifyMojibakeFileText(text = "") {
  return String(text || "")
    .split(/\r?\n/)
    .filter((line) => !shouldIgnoreLine(line))
    .reduce(
      (acc, line) => {
        const counts = classifyMojibakeText(line);
        acc.replacementCount += counts.replacementCount;
        acc.utf8AsGbkCount += counts.utf8AsGbkCount;
        acc.total += counts.total;
        return acc;
      },
      { replacementCount: 0, utf8AsGbkCount: 0, total: 0 }
    );
}

function sampleLines(text = "", maxSamples = 3) {
  const lines = String(text || "").split(/\r?\n/);
  const samples = [];
  for (let index = 0; index < lines.length && samples.length < maxSamples; index += 1) {
    const line = lines[index];
    if (shouldIgnoreLine(line)) continue;
    const counts = classifyMojibakeText(line);
    if (!counts.total) continue;
    samples.push({
      line: index + 1,
      text: line.trim().slice(0, 180)
    });
  }
  return samples;
}

export async function collectMojibakeRiskReport({
  rootDir = process.cwd(),
  roots = DEFAULT_ROOTS
} = {}) {
  const files = await listTextFiles(rootDir, roots);
  const items = [];
  for (const filePath of files) {
    const text = await fs.readFile(filePath, "utf8").catch(() => "");
    const counts = classifyMojibakeFileText(text);
    if (!counts.total) continue;
    items.push({
      path: normalizePath(path.relative(rootDir, filePath)),
      ...counts,
      samples: sampleLines(text)
    });
  }
  items.sort((left, right) => right.total - left.total || left.path.localeCompare(right.path));
  const totals = items.reduce(
    (acc, item) => {
      acc.files += 1;
      acc.replacementCount += item.replacementCount;
      acc.utf8AsGbkCount += item.utf8AsGbkCount;
      acc.total += item.total;
      return acc;
    },
    { files: 0, replacementCount: 0, utf8AsGbkCount: 0, total: 0 }
  );
  return {
    roots,
    totals,
    items
  };
}

function renderMarkdown(report) {
  const lines = [
    "# Mojibake Risk Report",
    "",
    `Scanned roots: ${report.roots.join(", ")}`,
    "",
    "| Metric | Count |",
    "| --- | ---: |",
    `| Files with risk markers | ${report.totals.files} |`,
    `| Replacement markers (锟 / �) | ${report.totals.replacementCount} |`, // mojibake-risk-allow report label
    `| UTF-8-as-GBK markers | ${report.totals.utf8AsGbkCount} |`,
    `| Total markers | ${report.totals.total} |`,
    "",
    "## Top Files",
    "",
    "| File | Replacement | UTF-8-as-GBK | Total |",
    "| --- | ---: | ---: | ---: |"
  ];
  for (const item of report.items.slice(0, 30)) {
    lines.push(`| ${item.path} | ${item.replacementCount} | ${item.utf8AsGbkCount} | ${item.total} |`);
  }
  lines.push("", "## Samples", "");
  for (const item of report.items.slice(0, 12)) {
    lines.push(`### ${item.path}`, "");
    for (const sample of item.samples) {
      lines.push(`- L${sample.line}: \`${sample.text.replaceAll("`", "'")}\``);
    }
    lines.push("");
  }
  return `${lines.join("\n").trim()}\n`;
}

export async function runCli(args = process.argv.slice(2), {
  cwd = process.cwd(),
  stdout = process.stdout
} = {}) {
  const json = args.includes("--json");
  const rootsArgIndex = args.indexOf("--roots");
  const roots = rootsArgIndex >= 0 && args[rootsArgIndex + 1]
    ? args[rootsArgIndex + 1].split(",").map((item) => item.trim()).filter(Boolean)
    : DEFAULT_ROOTS;
  const report = await collectMojibakeRiskReport({ rootDir: cwd, roots });
  stdout.write(json ? `${JSON.stringify(report, null, 2)}\n` : renderMarkdown(report));
  return report;
}

const isMain = process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;
if (isMain) {
  await runCli();
}
