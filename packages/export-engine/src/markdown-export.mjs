import path from "node:path";
import fs from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { getNoteById, listMarkdownFiles, listNotesInDirectoryScope } from "../../domain/src/index.mjs";
import { parseMarkdownWithFrontmatter, serializeMarkdownWithFrontmatter } from "../../domain/src/frontmatter.mjs";
import { findVaultAssetLinks, rewriteVaultAssetLinks } from "../../domain/src/markdown-asset-links.mjs";

const INTERNAL_EXPORT_FRONTMATTER_KEYS = new Set([
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
  "from_literature_note_ids"
]);

async function listAllFiles(root) {
  const out = [];
  let entries = [];
  try {
    entries = await fs.readdir(root, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    const full = path.join(root, entry.name);
    if (entry.isDirectory()) {
      out.push(...(await listAllFiles(full)));
    } else if (entry.isFile()) {
      out.push(full);
    }
  }
  return out;
}

function toPortablePath(value) {
  return String(value || "").split(path.sep).join("/");
}

function isPathInsideOrEqual(parentPath, childPath) {
  const relative = path.relative(path.resolve(parentPath), path.resolve(childPath));
  return relative === "" || (!!relative && !relative.startsWith("..") && !path.isAbsolute(relative));
}

function exportTargetInsideVaultError() {
  const error = new Error("targetPath must be outside the active vault");
  error.code = "EXPORT_TARGET_INSIDE_VAULT";
  return error;
}

function exportScopeError(message) {
  const error = new Error(message);
  error.code = "EXPORT_SCOPE_INVALID";
  return error;
}

function uniqueNonEmptyStrings(values = []) {
  const seen = new Set();
  const out = [];
  for (const value of values) {
    const normalized = String(value || "").trim();
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    out.push(normalized);
  }
  return out;
}

function sanitizeFileName(input) {
  const text = String(input || "").trim();
  const clean = text.replace(/[<>:"/\\|?*\x00-\x1f]/g, "_").replace(/\s+/g, " ").trim();
  return clean || "note";
}

function toTitleLine(raw) {
  return String(raw || "").replace(/^#+\s*/, "").replace(/\r?\n/g, " ").trim();
}

function hasMeaningfulFrontmatterValue(value) {
  if (value === null || value === undefined) return false;
  if (Array.isArray(value)) return value.some((item) => String(item || "").trim());
  if (typeof value === "object") return Object.keys(value).length > 0;
  return String(value).trim() !== "";
}

function firstHeadingFromBody(body) {
  const firstLine = String(body || "").split(/\r?\n/, 1)[0] || "";
  const headingMatch = firstLine.match(/^#{1,6}\s+(.+)$/);
  return toTitleLine(headingMatch?.[1] || "");
}

function cleanExportFrontmatter(frontmatter, body) {
  const metadata = frontmatter && typeof frontmatter === "object" ? frontmatter : {};
  const bodyHeading = firstHeadingFromBody(body);
  const cleaned = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (INTERNAL_EXPORT_FRONTMATTER_KEYS.has(key)) continue;
    if (key === "title" && toTitleLine(value) === bodyHeading) continue;
    if (key === "citations" && Array.isArray(value) && value.every((item) => String(item || "").trim() === "[object Object]")) {
      continue;
    }
    if (!hasMeaningfulFrontmatterValue(value)) continue;
    cleaned[key] = value;
  }
  return cleaned;
}

function rewriteExportFrontmatter(markdown) {
  const parsed = parseMarkdownWithFrontmatter(markdown);
  const cleanedFrontmatter = cleanExportFrontmatter(parsed.frontmatter, parsed.body);
  if (!Object.keys(cleanedFrontmatter).length) return parsed.body;
  return serializeMarkdownWithFrontmatter(cleanedFrontmatter, parsed.body);
}

function exportStemFromMarkdown(markdown, fallbackStem = "note") {
  const parsed = parseMarkdownWithFrontmatter(markdown);
  const frontmatterTitle = toTitleLine(parsed.frontmatter?.title);
  if (frontmatterTitle) return sanitizeFileName(frontmatterTitle);
  const firstLine = String(parsed.body || "").split(/\r?\n/, 1)[0] || "";
  const headingMatch = firstLine.match(/^#{1,6}\s+(.+)$/);
  const headingTitle = toTitleLine(headingMatch?.[1] || firstLine);
  return sanitizeFileName(headingTitle || fallbackStem);
}

function aliasCandidatesFromFrontmatter(frontmatter = {}) {
  const raw = frontmatter.aliases ?? frontmatter.alias ?? frontmatter.Alias ?? frontmatter.Aliases;
  if (Array.isArray(raw)) return uniqueNonEmptyStrings(raw);
  if (raw === null || raw === undefined || raw === "") return [];
  return uniqueNonEmptyStrings([raw]);
}

function importedPathCandidatesFromFrontmatter(frontmatter = {}) {
  const rawPath = String(frontmatter.url_or_path ?? frontmatter.urlOrPath ?? "").trim();
  if (!rawPath) return [];
  const normalized = rawPath.replaceAll("\\", "/").replace(/^[A-Za-z]:\//, "/").replace(/^\/+/, "");
  const withoutExtension = normalized.replace(/\.md$/i, "");
  const segments = withoutExtension.split("/").filter(Boolean);
  if (!segments.length) return [];
  const basename = segments[segments.length - 1];
  const candidates = [basename];
  if (segments.length >= 2) {
    candidates.push(`${segments[segments.length - 2]}/${basename}`);
  }
  if (segments.length >= 3) {
    candidates.push(`${segments[segments.length - 3]}/${segments[segments.length - 2]}/${basename}`);
  }
  return uniqueNonEmptyStrings(candidates);
}

function noteLinkTargetCandidates(plan) {
  const sourcePath = String(plan?.sourcePath || "").replaceAll("\\", "/").trim();
  const targetPath = String(plan?.targetPath || "").replaceAll("\\", "/").trim();
  const parsed = parseMarkdownWithFrontmatter(plan?.markdown || "");
  const sourceWithoutPrefix = sourcePath.replace(/^notes\//, "");
  const sourceWithoutExt = sourceWithoutPrefix.replace(/\.md$/i, "");
  const sourceBase = path.posix.basename(sourceWithoutExt);
  const title = toTitleLine(parsed.frontmatter?.title);
  const noteType = String(parsed.frontmatter?.note_type || "").trim().toLowerCase();
  const titleCandidates = noteType === "source" ? [] : [title, ...aliasCandidatesFromFrontmatter(parsed.frontmatter)];
  return uniqueNonEmptyStrings([
    sourceWithoutExt,
    sourceBase,
    ...titleCandidates,
    ...importedPathCandidatesFromFrontmatter(parsed.frontmatter)
  ]).map((value) => ({
    key: value.replaceAll("\\", "/"),
    target: targetPath.replace(/\.md$/i, "")
  }));
}

function buildNoteLinkTargetMap(plans = []) {
  const targetSets = new Map();
  for (const plan of plans) {
    for (const candidate of noteLinkTargetCandidates(plan)) {
      if (!candidate.key || !candidate.target) continue;
      if (!targetSets.has(candidate.key)) targetSets.set(candidate.key, new Set());
      targetSets.get(candidate.key).add(candidate.target);
    }
  }
  const resolved = new Map();
  for (const [key, targets] of targetSets.entries()) {
    if (targets.size === 1) resolved.set(key, [...targets][0]);
  }
  return resolved;
}

function rewriteVaultNoteLinks(markdown, noteTargetMap) {
  const text = String(markdown || "");
  if (!text || !(noteTargetMap instanceof Map) || noteTargetMap.size === 0) return text;

  return text.replace(/(!)?\[\[([^\]]+)\]\]/g, (fullMatch, embed, rawInner) => {
    const inner = String(rawInner || "").trim();
    if (!inner) return fullMatch;

    const pipeIndex = inner.indexOf("|");
    const targetPart = pipeIndex >= 0 ? inner.slice(0, pipeIndex).trim() : inner;
    const aliasPart = pipeIndex >= 0 ? inner.slice(pipeIndex + 1) : "";
    const hashIndex = targetPart.search(/[#^]/);
    const baseTarget = (hashIndex >= 0 ? targetPart.slice(0, hashIndex) : targetPart).trim();
    const suffix = hashIndex >= 0 ? targetPart.slice(hashIndex) : "";
    if (!baseTarget) return fullMatch;

    const mappedTarget = noteTargetMap.get(baseTarget.replaceAll("\\", "/"));
    if (!mappedTarget) return fullMatch;
    const nextInner = pipeIndex >= 0 ? `${mappedTarget}${suffix}|${aliasPart}` : `${mappedTarget}${suffix}`;
    return `${embed ? "!" : ""}[[${nextInner}]]`;
  });
}

function uniqueTargetMarkdownPath(relativeDir, stem, usedPaths) {
  const dirPrefix = relativeDir && relativeDir !== "." ? relativeDir : "";
  for (let index = 0; index < 10000; index += 1) {
    const suffix = index === 0 ? "" : ` ${index + 1}`;
    const candidateName = `${stem}${suffix}.md`;
    const candidatePath = dirPrefix ? path.posix.join(dirPrefix, candidateName) : candidateName;
    if (usedPaths.has(candidatePath)) continue;
    usedPaths.add(candidatePath);
    return candidatePath;
  }
  return dirPrefix ? path.posix.join(dirPrefix, `${stem}-${Date.now()}.md`) : `${stem}-${Date.now()}.md`;
}

async function filterExistingMarkdownFiles(sourceRoot, files = []) {
  const existingFiles = [];
  const skippedFiles = [];
  for (const src of files) {
    try {
      const stat = await fs.stat(src);
      if (!stat.isFile()) {
        skippedFiles.push({
          kind: "markdown",
          sourcePath: toPortablePath(path.join("notes", path.relative(sourceRoot, src))),
          reason: "missing"
        });
        continue;
      }
      existingFiles.push(src);
    } catch (error) {
      if (String(error?.code || "").trim() !== "ENOENT") throw error;
      skippedFiles.push({
        kind: "markdown",
        sourcePath: toPortablePath(path.join("notes", path.relative(sourceRoot, src))),
        reason: "missing"
      });
    }
  }
  return { existingFiles, skippedFiles };
}

async function buildMarkdownExportPlans(sourceRoot, files = []) {
  const usedTargetPaths = new Set();
  const plans = [];
  for (const src of files) {
    const markdown = await fs.readFile(src, "utf8");
    const relativeFromSourceRoot = path.relative(sourceRoot, src).replaceAll("\\", "/");
    const relativeDir = path.posix.dirname(relativeFromSourceRoot);
    const fallbackStem = path.basename(src, path.extname(src));
    const stem = exportStemFromMarkdown(markdown, fallbackStem);
    const targetPath = uniqueTargetMarkdownPath(relativeDir, stem, usedTargetPaths);
    plans.push({
      src,
      markdown,
      sourcePath: toPortablePath(path.join("notes", path.relative(sourceRoot, src))),
      targetPath
    });
  }
  return plans;
}

function validateNotePath({ vaultPath, sourceRoot, note }) {
  const relPath = String(note.markdownPath || "").replaceAll("\\", "/").trim();
  const fullPath = path.resolve(vaultPath, relPath);
  if (!relPath || !isPathInsideOrEqual(sourceRoot, fullPath) || !fullPath.toLowerCase().endsWith(".md")) {
    throw exportScopeError(`noteId has invalid markdown path: ${note.id || ""}`.trim());
  }
  return fullPath;
}

async function resolveMarkdownFiles({ vaultPath, sourceRoot, noteIds, directoryId, includeDescendants = true }) {
  const requestedDirectoryId = String(directoryId || "").trim();
  if (noteIds !== undefined && requestedDirectoryId) {
    throw exportScopeError("noteIds and directoryId cannot be used together");
  }

  if (noteIds === undefined && !requestedDirectoryId) {
    const files = await listMarkdownFiles(sourceRoot).catch(() => []);
    return {
      files,
      scope: { type: "all" }
    };
  }

  if (requestedDirectoryId) {
    return resolveDirectoryMarkdownFiles({
      vaultPath,
      sourceRoot,
      directoryId: requestedDirectoryId,
      includeDescendants
    });
  }

  if (!Array.isArray(noteIds)) {
    throw exportScopeError("noteIds must be an array when provided");
  }

  const ids = uniqueNonEmptyStrings(noteIds);
  if (!ids.length) throw exportScopeError("noteIds must contain at least one note id");

  const files = [];
  for (const noteId of ids) {
    let note;
    try {
      note = await getNoteById(vaultPath, noteId);
    } catch {
      throw exportScopeError(`noteId not found: ${noteId}`);
    }

    files.push(validateNotePath({ vaultPath, sourceRoot, note }));
  }

  return {
    files,
    scope: { type: "noteIds", noteIds: ids }
  };
}

async function resolveDirectoryMarkdownFiles({ vaultPath, sourceRoot, directoryId, includeDescendants }) {
  let notes;
  try {
    notes = await listNotesInDirectoryScope(vaultPath, directoryId, { includeDescendants });
  } catch (error) {
    throw exportScopeError(String(error?.message || error));
  }

  return {
    files: notes.map((note) => validateNotePath({ vaultPath, sourceRoot, note })),
    scope: { type: "directory", directoryId, includeDescendants }
  };
}

async function resolveAssetFiles({ vaultPath, assetsRoot, sourceRoot, files, scope }) {
  if (scope.type === "all") return listAllFiles(assetsRoot);

  const assetPaths = new Set();
  for (const file of files) {
    const markdown = String(file?.markdown || "");
    const noteRelPath = String(file?.sourcePath || "");
    for (const assetRelPath of findVaultAssetLinks(markdown, noteRelPath)) {
      assetPaths.add(assetRelPath);
    }
  }

  const out = [];
  for (const assetRelPath of [...assetPaths].sort((a, b) => a.localeCompare(b))) {
    const fullPath = path.resolve(vaultPath, assetRelPath);
    if (!isPathInsideOrEqual(assetsRoot, fullPath)) continue;
    try {
      const stat = await fs.stat(fullPath);
      if (stat.isFile()) out.push(fullPath);
    } catch {}
  }
  return out;
}

export async function exportMarkdown({
  vaultPath,
  targetPath,
  noteIds,
  directoryId,
  includeDescendants = true,
  requestId = null,
  now = new Date()
}) {
  if (!vaultPath) throw new Error("vaultPath is required");
  if (!targetPath) throw new Error("targetPath is required");

  const resolvedVaultPath = path.resolve(vaultPath);
  const resolvedTargetPath = path.resolve(targetPath);
  if (isPathInsideOrEqual(resolvedVaultPath, resolvedTargetPath)) {
    throw exportTargetInsideVaultError();
  }

  const sourceRoot = path.join(resolvedVaultPath, "notes");
  const { files, scope } = await resolveMarkdownFiles({
    vaultPath: resolvedVaultPath,
    sourceRoot,
    noteIds,
    directoryId,
    includeDescendants
  });
  const { existingFiles: markdownFiles, skippedFiles } = await filterExistingMarkdownFiles(sourceRoot, files);
  const markdownPlans = await buildMarkdownExportPlans(sourceRoot, markdownFiles);
  const assetsRoot = path.join(resolvedVaultPath, "assets");
  const assetFiles = await resolveAssetFiles({
    vaultPath: resolvedVaultPath,
    assetsRoot,
    sourceRoot,
    files: markdownPlans,
    scope
  });
  const exportJobId = `exp_${Date.now()}_${randomUUID().slice(0, 8)}`;

  await fs.mkdir(resolvedTargetPath, { recursive: true });
  const exportedFiles = [];
  const noteLinkTargetMap = buildNoteLinkTargetMap(markdownPlans);
  for (const plan of markdownPlans) {
    const dest = path.join(resolvedTargetPath, plan.targetPath.replaceAll("/", path.sep));
    await fs.mkdir(path.dirname(dest), { recursive: true });
    let rewrittenMarkdown = rewriteVaultNoteLinks(plan.markdown, noteLinkTargetMap);
    if (plan.sourcePath !== plan.targetPath) {
      rewrittenMarkdown = rewriteVaultAssetLinks(rewrittenMarkdown, plan.sourcePath, plan.targetPath);
    }
    rewrittenMarkdown = rewriteExportFrontmatter(rewrittenMarkdown);
    await fs.writeFile(dest, rewrittenMarkdown, "utf8");
    exportedFiles.push({
      kind: "markdown",
      sourcePath: plan.sourcePath,
      targetPath: plan.targetPath
    });
  }

  if (assetFiles.length) {
    for (const src of assetFiles) {
      const rel = path.relative(assetsRoot, src);
      const dest = path.join(resolvedTargetPath, "assets", rel);
      await fs.mkdir(path.dirname(dest), { recursive: true });
      await fs.copyFile(src, dest);
      exportedFiles.push({
        kind: "asset",
        sourcePath: toPortablePath(path.join("assets", rel)),
        targetPath: toPortablePath(path.join("assets", rel))
      });
    }
  }

  const copiedBreakdown = {
    markdownFiles: markdownFiles.length,
    assetFiles: assetFiles.length,
    totalFiles: markdownFiles.length + assetFiles.length
  };

  const record = {
    exportJobId,
    copied: copiedBreakdown.totalFiles,
    copiedBreakdown,
    scope,
    targetPath: resolvedTargetPath,
    requestId,
    exportedFiles,
    skippedFiles,
    time: now.toISOString()
  };

  const exportDir = path.join(resolvedVaultPath, "exports");
  await fs.mkdir(exportDir, { recursive: true });
  const recordPath = path.join(exportDir, `${exportJobId}.json`);
  await fs.writeFile(recordPath, JSON.stringify(record, null, 2), "utf8");

  return {
    exportJobId,
    status: "queued",
    copied: record.copied,
    copiedBreakdown,
    scope,
    exportedFiles,
    skippedFiles,
    recordPath,
    record
  };
}
