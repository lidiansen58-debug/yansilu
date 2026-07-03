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
const REPLACEMENT_CHAR_PATTERN = /\uFFFD/g;
const UTF8_AS_LATIN1_PATTERN = /(?:Ã.|Â.|â€|â€™|â€œ|â€\x9d|â€“|â€”|â€¦)/g; // mojibake-risk-allow
const UTF8_AS_CJK_PATTERN = /(?:æ[\u0080-\u00FF]|ç[\u0080-\u00FF]|é[\u0080-\u00FF]|ä[\u0080-\u00FF]|å[\u0080-\u00FF]|é€|é¢|æœ|åˆ|çš|ç¬|é”|é—|é¡|å¼|å…|å…³|å†|\u934f\u5d07|\u942e\u65c0|\u90f4\u5bb8|\u8e6d\u7e5a|\u701b\u6a38|\u6fc6\u7d8d|\u5bb8\u30e4|\u7d94\u9359|\u7ed7\u65c7|\u9286[\u3000-\u9fff]|\u951b[\u5c7d\u5c83\u5c93])/g; // mojibake-risk-allow
const SUSPICIOUS_PATTERN_GROUPS = [
  { key: "replacementCount", pattern: REPLACEMENT_CHAR_PATTERN },
  { key: "utf8AsLatin1Count", pattern: UTF8_AS_LATIN1_PATTERN },
  { key: "utf8AsCjkCount", pattern: UTF8_AS_CJK_PATTERN }
];

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
  const counts = {
    replacementCount: 0,
    utf8AsLatin1Count: 0,
    utf8AsCjkCount: 0,
    total: 0
  };

  for (const group of SUSPICIOUS_PATTERN_GROUPS) {
    counts[group.key] = countMatches(text, group.pattern);
    counts.total += counts[group.key];
  }

  return counts;
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
        acc.utf8AsLatin1Count += counts.utf8AsLatin1Count;
        acc.utf8AsCjkCount += counts.utf8AsCjkCount;
        acc.total += counts.total;
        return acc;
      },
      {
        replacementCount: 0,
        utf8AsLatin1Count: 0,
        utf8AsCjkCount: 0,
        total: 0
      }
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
      acc.utf8AsLatin1Count += item.utf8AsLatin1Count;
      acc.utf8AsCjkCount += item.utf8AsCjkCount;
      acc.total += item.total;
      return acc;
    },
    {
      files: 0,
      replacementCount: 0,
      utf8AsLatin1Count: 0,
      utf8AsCjkCount: 0,
      total: 0
    }
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
    `| Replacement character (U+FFFD) | ${report.totals.replacementCount} |`,
    `| UTF-8 shown as Latin-1 style markers | ${report.totals.utf8AsLatin1Count} |`,
    `| UTF-8 shown as CJK-garbled markers | ${report.totals.utf8AsCjkCount} |`,
    `| Total markers | ${report.totals.total} |`,
    "",
    "## Top Files",
    "",
    "| File | Replacement | Latin-1 style | CJK-garbled | Total |",
    "| --- | ---: | ---: | ---: | ---: |"
  ];
  for (const item of report.items.slice(0, 30)) {
    lines.push(`| ${item.path} | ${item.replacementCount} | ${item.utf8AsLatin1Count} | ${item.utf8AsCjkCount} | ${item.total} |`);
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
  const failOnRisk = args.includes("--fail-on-risk");
  const rootsArgIndex = args.indexOf("--roots");
  const roots = rootsArgIndex >= 0 && args[rootsArgIndex + 1]
    ? args[rootsArgIndex + 1].split(",").map((item) => item.trim()).filter(Boolean)
    : DEFAULT_ROOTS;
  const report = await collectMojibakeRiskReport({ rootDir: cwd, roots });
  stdout.write(json ? `${JSON.stringify(report, null, 2)}\n` : renderMarkdown(report));
  if (failOnRisk && report.totals.total > 0) process.exitCode = 1;
  return report;
}

const isMain = process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;
if (isMain) {
  await runCli();
}
