import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createImportExportService } from "../apps/api/src/import-export-service.mjs";
import { findVaultAssetLinks } from "../packages/domain/src/markdown-asset-links.mjs";
import {
  deleteNoteById,
  initVault,
  listNoteCatalogEntriesByType,
  listNotesInDirectoryScope,
  readNote,
  registerMarkdownNoteInCatalog,
  writeLiteratureNoteIfAbsent,
  writePermanentNoteIfAbsent,
  writeSourceIfAbsent
} from "../packages/domain/src/index.mjs";

const REPO_ROOT = path.resolve(import.meta.dirname, "..");
const DEFAULT_SOURCE_PATH = path.join(REPO_ROOT, "tests", "fixtures", "imports", "obsidian-realistic-vault");

function cleanText(value) {
  return String(value || "").trim();
}

function usage() {
  return [
    "Usage:",
    "  node scripts/obsidian-import-acceptance.mjs [options]",
    "",
    "Options:",
    `  --source <path>       Source Obsidian vault. Defaults to ${DEFAULT_SOURCE_PATH}.`,
    "  --vault <path>        Destination Yansilu vault. Defaults to tmp/obsidian-import-acceptance/<timestamp>/vault.",
    "  --directoryId <id>    Optional target directory id. Defaults to automatic routing.",
    "  --no-override         Keep originality blocking on; do not auto-override flagged permanent notes.",
    "  --help, -h            Show this help."
  ].join("\n");
}

function parseArgs(argv = process.argv.slice(2)) {
  const options = {
    overrideOriginality: true
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--source") {
      options.sourcePath = argv[index + 1];
      index += 1;
      continue;
    }
    if (arg === "--vault") {
      options.vaultPath = argv[index + 1];
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

function resolveDefaultVaultPath() {
  return path.join(REPO_ROOT, "tmp", "obsidian-import-acceptance", timestampLabel(), "vault");
}

function existingDirectory(dirPath) {
  try {
    return fs.statSync(dirPath).isDirectory();
  } catch {
    return false;
  }
}

function titleForCatalogNote(candidate) {
  const explicit = cleanText(candidate?.title);
  if (explicit) return explicit;
  const firstLine = String(candidate?.core_claim || candidate?.quote_text || "")
    .trim()
    .split(/\r?\n/)[0]
    ?.trim();
  return firstLine || cleanText(candidate?.id) || "imported-note";
}

function defaultDirectoryIdForImportNoteType(noteType) {
  if (noteType === "source") return "dir_source_default";
  if (noteType === "literature") return "dir_literature_default";
  return "dir_original_default";
}

async function registerImportCatalogNote(vaultPath, candidate, noteType, writeResult, directoryId = "") {
  if (!writeResult?.written) return null;
  return registerMarkdownNoteInCatalog(vaultPath, {
    noteId: candidate.id,
    noteType,
    title: titleForCatalogNote(candidate),
    status: candidate.status || "draft",
    markdownPath: path.relative(path.resolve(vaultPath), writeResult.path).replaceAll("\\", "/"),
    directoryId: cleanText(directoryId) || defaultDirectoryIdForImportNoteType(noteType)
  });
}

function createService(vaultPath) {
  const importRecords = new Map();
  return createImportExportService({
    getVaultPath: () => vaultPath,
    getCwd: () => REPO_ROOT,
    importRecords,
    initVault,
    writeSourceIfAbsent,
    writeLiteratureNoteIfAbsent,
    writePermanentNoteIfAbsent,
    deleteNoteById,
    registerImportCatalogNote: (candidate, noteType, writeResult, directoryId) =>
      registerImportCatalogNote(vaultPath, candidate, noteType, writeResult, directoryId)
  });
}

async function countCatalogEntries(vaultPath) {
  const [sources, literature, permanent] = await Promise.all([
    listNoteCatalogEntriesByType(vaultPath, "source"),
    listNoteCatalogEntriesByType(vaultPath, "literature"),
    listNoteCatalogEntriesByType(vaultPath, "permanent")
  ]);
  return {
    sources,
    literature,
    permanent
  };
}

function countSummary(entriesByType) {
  return {
    sources: entriesByType.sources.length,
    literatureNotes: entriesByType.literature.length,
    permanentNotes: entriesByType.permanent.length
  };
}

function diffCounts(afterCounts, beforeCounts) {
  return {
    sources: afterCounts.sources - beforeCounts.sources,
    literatureNotes: afterCounts.literatureNotes - beforeCounts.literatureNotes,
    permanentNotes: afterCounts.permanentNotes - beforeCounts.permanentNotes
  };
}

export function catalogDeltaMatchesCreated(deltaCounts = {}, createdCounts = {}) {
  return (
    Number(deltaCounts.sources || 0) === Number(createdCounts.sources || 0) &&
    Number(deltaCounts.literatureNotes || 0) === Number(createdCounts.literatureNotes || 0) &&
    Number(deltaCounts.permanentNotes || 0) === Number(createdCounts.permanentNotes || 0)
  );
}

export function sourceEntriesUseSourceDirectory(entries = []) {
  return (Array.isArray(entries) ? entries : []).every((entry) => cleanText(entry?.directoryId) === "dir_source_default");
}

export function sourceNotesExcludedFromOriginalScope(sourceEntries = [], originalScopeNotes = []) {
  const sourceIds = new Set((Array.isArray(sourceEntries) ? sourceEntries : []).map((entry) => cleanText(entry?.id)).filter(Boolean));
  return (Array.isArray(originalScopeNotes) ? originalScopeNotes : []).every((note) => !sourceIds.has(cleanText(note?.id)));
}

function markCheck(report, id, ok, detail, severity = "error") {
  report.checks.push({ id, ok, detail, severity });
  if (!ok) {
    report.issues.push({ id, detail, severity });
    if (severity === "error") report.severityCounts.error += 1;
    if (severity === "warning") report.severityCounts.warning += 1;
  }
}

export function assertNoAcceptanceErrors(report, label = "Acceptance checks") {
  const errorCount = Number(report?.severityCounts?.error || 0);
  if (errorCount <= 0) return report;
  const error = new Error(`${label} failed with ${errorCount} error${errorCount === 1 ? "" : "s"}.`);
  error.code = "ACCEPTANCE_FAILED";
  error.report = report;
  throw error;
}

async function createdFilesExist(vaultPath, createdFiles = []) {
  for (const entry of createdFiles) {
    try {
      await fs.promises.access(path.join(vaultPath, entry.path));
    } catch {
      return false;
    }
  }
  return true;
}

export function inspectImportedAssetLinks(notes = []) {
  const referencedAssetPaths = [];
  const invalidReferences = [];
  for (const note of notes) {
    const markdown = String(note?.markdown || "");
    const markdownPath = cleanText(note?.markdownPath);
    if (!markdown || !markdownPath) continue;
    for (const assetPath of findVaultAssetLinks(markdown, markdownPath)) {
      referencedAssetPaths.push(assetPath);
      if (!assetPath.startsWith("assets/imports/")) {
        invalidReferences.push({
          markdownPath,
          assetPath
        });
      }
    }
  }
  return {
    referencedAssetPaths,
    invalidReferences
  };
}

async function inspectImportedAssetLinksInVault(vaultPath, entriesByType) {
  const notes = [];
  for (const entry of entriesByType.literature) {
    const note = await readNote(vaultPath, "literature", entry.id);
    notes.push({
      markdown: note?.markdown,
      markdownPath: entry.markdownPath
    });
  }
  for (const entry of entriesByType.permanent) {
    const note = await readNote(vaultPath, "permanent", entry.id);
    notes.push({
      markdown: note?.markdown,
      markdownPath: entry.markdownPath
    });
  }
  return inspectImportedAssetLinks(notes);
}

function markdownStatusLine(report) {
  if (report.severityCounts.error > 0) return "失败";
  if (report.severityCounts.warning > 0) return "通过（有警告）";
  return "通过";
}

function renderMarkdownReport(report) {
  const lines = [
    "# Obsidian 导入验收报告",
    "",
    `- 结论: ${markdownStatusLine(report)}`,
    `- 生成时间: ${report.generatedAt}`,
    `- 导入源目录: \`${report.sourcePath}\``,
    `- 目标 vault: \`${report.vaultPath}\``,
    `- Preview 摘要: source ${report.preview.summary.sources} / literature ${report.preview.summary.literatureNotes} / permanent ${report.preview.summary.permanentNotes} / warnings ${report.preview.summary.warnings}`,
    `- Confirm 创建: source ${report.confirm.created.sources} / literature ${report.confirm.created.literatureNotes} / permanent ${report.confirm.created.permanentNotes}`,
    `- 检查结果: ${report.severityCounts.error} 个错误，${report.severityCounts.warning} 个警告`,
    "",
    "## 检查项",
    "",
    "- preview 是否识别出候选内容",
    "- confirm 创建数量是否与 preview 一致",
    "- literature / permanent catalog 增量是否与导入创建数量一致",
    "- createdFiles 是否都真实落盘",
    "- 含附件的导入是否把链接改写到 `assets/imports/...`",
    ""
  ];

  if (!report.issues.length) {
    lines.push("## 结果", "", "- 未发现错误或警告。", "");
    return `${lines.join("\n")}\n`;
  }

  lines.push("## 问题", "");
  for (const issue of report.issues) {
    lines.push(`- [${issue.severity}] \`${issue.id}\` ${issue.detail}`);
  }
  lines.push("");
  return `${lines.join("\n")}\n`;
}

export async function main() {
  const options = parseArgs();
  if (options.help) {
    console.log(usage());
    return;
  }

  const sourcePath = path.resolve(cleanText(options.sourcePath) || DEFAULT_SOURCE_PATH);
  if (!existingDirectory(sourcePath)) {
    throw new Error(`Source Obsidian vault not found: ${sourcePath}`);
  }

  const vaultPath = path.resolve(cleanText(options.vaultPath) || resolveDefaultVaultPath());
  await fs.promises.mkdir(vaultPath, { recursive: true });
  await initVault(vaultPath);

  const beforeEntries = await countCatalogEntries(vaultPath);
  const beforeCounts = countSummary(beforeEntries);

  const service = createService(vaultPath);
  const preview = await service.createPreview(
    "obsidian",
    { path: sourcePath },
    { detectWikilinks: true },
    "obsidian_import_acceptance_preview"
  );
  const record = await service.getImportRecord(preview.importRecordId);
  const confirm = await service.confirmImport(
    record,
    {
      confirm: true,
      directoryId: cleanText(options.directoryId) || undefined,
      overrideOriginality: options.overrideOriginality
    },
    "obsidian_import_acceptance_confirm"
  );

  const afterEntries = await countCatalogEntries(vaultPath);
  const afterCounts = countSummary(afterEntries);
  const deltaCounts = diffCounts(afterCounts, beforeCounts);
  const createdFilesOk = await createdFilesExist(vaultPath, confirm.result.createdFiles);
  const hasImportedAssetFiles = confirm.result.createdFiles.some((item) => item.noteType === "asset");
  const importedAssetLinkReport = await inspectImportedAssetLinksInVault(vaultPath, afterEntries);
  const importedAssetLinksOk =
    !hasImportedAssetFiles ||
    (importedAssetLinkReport.referencedAssetPaths.length > 0 && importedAssetLinkReport.invalidReferences.length === 0);
  const originalScopeNotes = await listNotesInDirectoryScope(vaultPath, "dir_original_default", { includeDescendants: true });
  const sourceDirectoryPlacementOk = sourceEntriesUseSourceDirectory(afterEntries.sources);
  const sourceExcludedFromOriginalScopeOk = sourceNotesExcludedFromOriginalScope(afterEntries.sources, originalScopeNotes);

  const report = {
    generatedAt: new Date().toISOString(),
    sourcePath,
    vaultPath,
    preview: {
      importRecordId: preview.importRecordId,
      summary: preview.summary,
      warnings: preview.warnings,
      candidateSelection: preview.candidateSelection
    },
    confirm: {
      created: confirm.result.created,
      skipped: confirm.result.skipped,
      targetDirectories: confirm.result.targetDirectories,
      writtenPaths: confirm.result.writtenPaths,
      createdFiles: confirm.result.createdFiles
    },
    catalog: {
      before: beforeCounts,
      after: afterCounts,
      delta: deltaCounts
    },
    severityCounts: {
      error: 0,
      warning: 0
    },
    checks: [],
    issues: []
  };

  const previewTotal =
    Number(preview.summary.sources || 0) +
    Number(preview.summary.literatureNotes || 0) +
    Number(preview.summary.permanentNotes || 0);
  markCheck(report, "preview_has_candidates", previewTotal > 0, `Preview total candidates: ${previewTotal}`);
  markCheck(
    report,
    "confirm_matches_preview",
    confirm.result.created.sources === preview.summary.sources &&
      confirm.result.created.literatureNotes === preview.summary.literatureNotes &&
      confirm.result.created.permanentNotes === preview.summary.permanentNotes,
    `Preview ${JSON.stringify(preview.summary)} vs created ${JSON.stringify(confirm.result.created)}`
  );
  markCheck(
    report,
    "catalog_delta_matches_created",
    catalogDeltaMatchesCreated(deltaCounts, confirm.result.created),
    `Catalog delta ${JSON.stringify({
      sources: deltaCounts.sources,
      literatureNotes: deltaCounts.literatureNotes,
      permanentNotes: deltaCounts.permanentNotes
    })} vs created ${JSON.stringify({
      sources: confirm.result.created.sources,
      literatureNotes: confirm.result.created.literatureNotes,
      permanentNotes: confirm.result.created.permanentNotes
    })}`
  );
  markCheck(
    report,
    "created_files_exist",
    createdFilesOk,
    `Created files checked: ${confirm.result.createdFiles.length}`
  );
  markCheck(
    report,
    "asset_links_rewritten",
    importedAssetLinksOk,
    hasImportedAssetFiles
      ? importedAssetLinkReport.invalidReferences.length > 0
        ? `Found non-import asset links: ${importedAssetLinkReport.invalidReferences
          .slice(0, 3)
          .map((item) => `${item.markdownPath} -> ${item.assetPath}`)
          .join(", ")}`
        : importedAssetLinkReport.referencedAssetPaths.length > 0
          ? `Imported markdown references ${importedAssetLinkReport.referencedAssetPaths.length} rewritten asset links.`
          : "Imported asset files were created, but no markdown references rewritten assets/imports/ links."
      : "No imported asset files were created.",
    hasImportedAssetFiles ? "error" : "warning"
  );
  markCheck(
    report,
    "source_entries_use_source_directory",
    sourceDirectoryPlacementOk,
    `Source directories: ${JSON.stringify([...new Set(afterEntries.sources.map((entry) => cleanText(entry?.directoryId)).filter(Boolean))])}`
  );
  markCheck(
    report,
    "source_notes_excluded_from_original_scope",
    sourceExcludedFromOriginalScopeOk,
    `Original scope note ids: ${JSON.stringify(originalScopeNotes.map((note) => cleanText(note?.id)).filter(Boolean))}`
  );

  const jsonReportPath = path.join(vaultPath, "obsidian-import-acceptance-report.json");
  const markdownReportPath = path.join(vaultPath, "obsidian-import-acceptance-report.md");
  await fs.promises.writeFile(jsonReportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  await fs.promises.writeFile(markdownReportPath, renderMarkdownReport(report), "utf8");

  console.log(`Source vault: ${sourcePath}`);
  console.log(`Destination vault: ${vaultPath}`);
  console.log(
    `Preview: ${preview.summary.sources} sources, ${preview.summary.literatureNotes} literature, ${preview.summary.permanentNotes} permanent, ${preview.summary.warnings} warnings`
  );
  console.log(
    `Created: ${confirm.result.created.sources} sources, ${confirm.result.created.literatureNotes} literature, ${confirm.result.created.permanentNotes} permanent`
  );
  console.log(`Checks: ${report.severityCounts.error} errors, ${report.severityCounts.warning} warnings`);
  console.log(`JSON report: ${jsonReportPath}`);
  console.log(`Markdown report: ${markdownReportPath}`);
  if (report.issues.length) {
    for (const issue of report.issues) {
      console.log(`  [${issue.severity}] ${issue.id}: ${issue.detail}`);
    }
  }
  assertNoAcceptanceErrors(report);
}

const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectRun) {
  main().catch((error) => {
    console.error(error?.stack || error?.message || String(error));
    process.exit(1);
  });
}
