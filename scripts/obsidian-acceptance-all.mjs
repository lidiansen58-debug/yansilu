import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const REPO_ROOT = path.resolve(import.meta.dirname, "..");
const DEFAULT_SOURCE_PATH = path.join(REPO_ROOT, "tests", "fixtures", "imports", "obsidian-realistic-vault");

function cleanText(value) {
  return String(value || "").trim();
}

function usage() {
  return [
    "Usage:",
    "  node scripts/obsidian-acceptance-all.mjs [options]",
    "",
    "Options:",
    `  --source <path>         Source Obsidian vault. Defaults to ${DEFAULT_SOURCE_PATH}.`,
    "  --workspace <path>      Round-trip workspace root. Defaults to tmp/obsidian-acceptance-all/<timestamp>.",
    "  --directoryId <id>      Optional import target directory id.",
    "  --no-override           Keep originality blocking on during import.",
    "  --open                  Open the final exported folder in Obsidian.",
    "  --help, -h              Show this help."
  ].join("\n");
}

function parseArgs(argv = process.argv.slice(2)) {
  const options = {
    overrideOriginality: true,
    openAfterExport: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--source") {
      options.sourcePath = argv[index + 1];
      index += 1;
      continue;
    }
    if (arg === "--workspace") {
      options.workspaceRoot = argv[index + 1];
      index += 1;
      continue;
    }
    if (arg === "--directoryId") {
      options.directoryId = argv[index + 1];
      index += 1;
      continue;
    }
    if (arg === "--no-override") {
      options.overrideOriginality = false;
      continue;
    }
    if (arg === "--open") {
      options.openAfterExport = true;
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

function timestampLabel(now = new Date()) {
  const pad = (value) => String(value).padStart(2, "0");
  return [
    now.getFullYear(),
    pad(now.getMonth() + 1),
    pad(now.getDate())
  ].join("") + "-" + [pad(now.getHours()), pad(now.getMinutes()), pad(now.getSeconds())].join("");
}

function resolveDefaultWorkspaceRoot() {
  return path.join(REPO_ROOT, "tmp", "obsidian-acceptance-all", timestampLabel());
}

function existingDirectory(dirPath) {
  try {
    return fs.statSync(dirPath).isDirectory();
  } catch {
    return false;
  }
}

function runNodeScript(scriptRelativePath, args) {
  const result = spawnSync(process.execPath, [scriptRelativePath, ...args], {
    cwd: REPO_ROOT,
    stdio: "inherit",
    shell: false
  });
  if (result.error) throw result.error;
  if ((result.status ?? 1) !== 0) {
    const error = new Error(`Command failed: node ${scriptRelativePath} ${args.join(" ")}`.trim());
    error.exitCode = result.status ?? 1;
    throw error;
  }
}

function statusLine(report) {
  const counts = report?.severityCounts || { error: 0, warning: 0 };
  if (counts.error > 0) return "失败";
  if (counts.warning > 0) return "通过（有警告）";
  return "通过";
}

function roundTripStatus(importReport, exportReport) {
  if (statusLine(importReport) === "失败" || statusLine(exportReport) === "失败") return "失败";
  if (statusLine(importReport) !== "通过" || statusLine(exportReport) !== "通过") return "通过（有警告）";
  return "通过";
}

function renderMarkdownReport(report) {
  const lines = [
    "# Obsidian 往返验收报告",
    "",
    `- 结论: ${report.status}`,
    `- 生成时间: ${report.generatedAt}`,
    `- 导入源目录: \`${report.sourcePath}\``,
    `- 工作区目录: \`${report.workspaceRoot}\``,
    `- 导入目标 vault: \`${report.importVaultPath}\``,
    `- 导出目标目录: \`${report.exportTargetPath}\``,
    "",
    "## 导入验收",
    "",
    `- 结果: ${statusLine(report.importReport)}`,
    `- Report JSON: \`${report.importReportPath}\``,
    `- Report Markdown: \`${report.importMarkdownReportPath}\``,
    `- Preview: source ${report.importReport.preview.summary.sources} / literature ${report.importReport.preview.summary.literatureNotes} / permanent ${report.importReport.preview.summary.permanentNotes} / warnings ${report.importReport.preview.summary.warnings}`,
    `- Confirm: source ${report.importReport.confirm.created.sources} / literature ${report.importReport.confirm.created.literatureNotes} / permanent ${report.importReport.confirm.created.permanentNotes}`,
    "",
    "## 导出验收",
    "",
    `- 结果: ${statusLine(report.exportReport)}`,
    `- Report JSON: \`${report.exportReportPath}\``,
    `- Report Markdown: \`${report.exportMarkdownReportPath}\``,
    `- 导出文件: ${report.exportReport.copiedBreakdown.markdownFiles} 篇 Markdown，${report.exportReport.copiedBreakdown.assetFiles} 个附件，共 ${report.exportReport.copiedBreakdown.totalFiles} 个文件`,
    `- 检查结果: ${report.exportReport.severityCounts.error} 个错误，${report.exportReport.severityCounts.warning} 个警告`,
    ""
  ];

  if (report.status === "通过") {
    lines.push("## 结果", "", "- 导入和导出两段验收都已通过。", "");
  } else {
    lines.push("## 结果", "");
    if (report.importReport.issues?.length) {
      lines.push("- 导入侧存在问题，请看导入报告。");
    }
    if (report.exportReport.issues?.length) {
      lines.push("- 导出侧存在问题，请看导出报告。");
    }
    lines.push("");
  }

  return `${lines.join("\n")}\n`;
}

async function main() {
  const options = parseArgs();
  if (options.help) {
    console.log(usage());
    return;
  }

  const sourcePath = path.resolve(cleanText(options.sourcePath) || DEFAULT_SOURCE_PATH);
  if (!existingDirectory(sourcePath)) {
    throw new Error(`Source Obsidian vault not found: ${sourcePath}`);
  }

  const workspaceRoot = path.resolve(cleanText(options.workspaceRoot) || resolveDefaultWorkspaceRoot());
  const importVaultPath = path.join(workspaceRoot, "import-vault");
  const exportTargetPath = path.join(workspaceRoot, "exported-vault");
  fs.mkdirSync(workspaceRoot, { recursive: true });

  const importArgs = ["./scripts/obsidian-import-acceptance.mjs", "--source", sourcePath, "--vault", importVaultPath];
  if (cleanText(options.directoryId)) {
    importArgs.push("--directoryId", cleanText(options.directoryId));
  }
  if (!options.overrideOriginality) {
    importArgs.push("--no-override");
  }

  const exportArgs = ["./scripts/obsidian-export-acceptance.mjs", "--vault", importVaultPath, "--target", exportTargetPath, "--all"];
  if (!options.openAfterExport) {
    exportArgs.push("--no-open");
  }

  runNodeScript(importArgs[0], importArgs.slice(1));
  runNodeScript(exportArgs[0], exportArgs.slice(1));

  const importReportPath = path.join(importVaultPath, "obsidian-import-acceptance-report.json");
  const importMarkdownReportPath = path.join(importVaultPath, "obsidian-import-acceptance-report.md");
  const exportReportPath = path.join(exportTargetPath, "acceptance-report.json");
  const exportMarkdownReportPath = path.join(exportTargetPath, "acceptance-report.md");

  const importReport = JSON.parse(fs.readFileSync(importReportPath, "utf8"));
  const exportReport = JSON.parse(fs.readFileSync(exportReportPath, "utf8"));

  const overallReport = {
    generatedAt: new Date().toISOString(),
    sourcePath,
    workspaceRoot,
    importVaultPath,
    exportTargetPath,
    importReportPath,
    importMarkdownReportPath,
    exportReportPath,
    exportMarkdownReportPath,
    importReport,
    exportReport,
    status: roundTripStatus(importReport, exportReport)
  };

  const overallJsonPath = path.join(workspaceRoot, "obsidian-acceptance-all-report.json");
  const overallMarkdownPath = path.join(workspaceRoot, "obsidian-acceptance-all-report.md");
  fs.writeFileSync(overallJsonPath, `${JSON.stringify(overallReport, null, 2)}\n`, "utf8");
  fs.writeFileSync(overallMarkdownPath, renderMarkdownReport(overallReport), "utf8");

  console.log(`Workspace: ${workspaceRoot}`);
  console.log(`Round-trip status: ${overallReport.status}`);
  console.log(`Overall JSON report: ${overallJsonPath}`);
  console.log(`Overall Markdown report: ${overallMarkdownPath}`);
}

main().catch((error) => {
  console.error(error?.stack || error?.message || String(error));
  process.exit(error?.exitCode || 1);
});
