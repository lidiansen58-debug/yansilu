import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { SQLITE_DB_FILES } from "./sqlite-migrations.mjs";
import { writeMarkdownIfAbsent } from "./vault.mjs";
import { parseMarkdownWithFrontmatter, serializeMarkdownWithFrontmatter } from "./frontmatter.mjs";
import { relativeMarkdownLinkPath } from "./markdown-asset-links.mjs";
import { rewriteAssetLinksInMarkdownFile } from "./note-file-rewrite.mjs";
import { deriveNoteThinkingStatus } from "./thinking-status.mjs";
import { originalityGuard } from "../../originality-guard/src/index.mjs";

function catalogDbPath(vaultPath) {
  return path.join(path.resolve(vaultPath), ".yansilu", SQLITE_DB_FILES.catalog);
}

async function loadDatabaseSync() {
  try {
    const mod = await import("node:sqlite");
    return mod.DatabaseSync;
  } catch {
    throw new Error("Note catalog store requires node:sqlite (Node.js 22+).");
  }
}

function sanitizeFileName(input) {
  const text = String(input || "").trim();
  const clean = text.replace(/[<>:"/\\|?*\x00-\x1f]/g, "_").replace(/\s+/g, " ").trim();
  return clean || "note";
}

const MIME_EXTENSION_MAP = new Map([
  ["image/png", ".png"],
  ["image/jpeg", ".jpg"],
  ["image/jpg", ".jpg"],
  ["image/gif", ".gif"],
  ["image/webp", ".webp"],
  ["image/svg+xml", ".svg"],
  ["image/bmp", ".bmp"],
  ["image/x-icon", ".ico"],
  ["application/pdf", ".pdf"],
  ["text/plain", ".txt"],
  ["text/markdown", ".md"]
]);

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function toTitleLine(raw) {
  return String(raw || "").replace(/^#+\s*/, "").replace(/\r?\n/g, " ").trim();
}

function fileStemFromTitle(title, fallbackStem = "note") {
  return sanitizeFileName(toTitleLine(title) || fallbackStem);
}

async function resolveUniqueMarkdownPath(directoryPath, title, options = {}) {
  const root = path.resolve(directoryPath);
  const fallbackStem = String(options.fallbackStem || "note").trim() || "note";
  const stem = fileStemFromTitle(title, fallbackStem);
  const excludePath = options.excludePath ? path.resolve(options.excludePath) : null;
  for (let index = 0; index < 10000; index += 1) {
    const suffix = index === 0 ? "" : ` ${index + 1}`;
    const candidate = path.join(root, `${stem}${suffix}.md`);
    if (excludePath && path.resolve(candidate) === excludePath) return candidate;
    if (!(await fileExists(candidate))) return candidate;
  }
  throw new Error(`Unable to allocate markdown file path for title: ${title}`);
}

async function createUniqueMarkdownFile(directoryPath, title, content, options = {}) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const candidate = await resolveUniqueMarkdownPath(directoryPath, title, options);
    const result = await writeMarkdownIfAbsent(candidate, content);
    if (result.written) return candidate;
  }
  throw new Error(`Unable to create markdown file for title: ${title}`);
}

function extensionFromAsset(fileName, mimeType, assetKind = "file") {
  const existing = path.extname(String(fileName || "").trim());
  if (existing) return existing.toLowerCase();
  const normalizedMime = String(mimeType || "").trim().toLowerCase();
  if (MIME_EXTENSION_MAP.has(normalizedMime)) return MIME_EXTENSION_MAP.get(normalizedMime);
  if (normalizedMime.startsWith("image/")) {
    const suffix = normalizedMime.slice("image/".length).replace(/[^a-z0-9]+/g, "");
    return `.${suffix || "img"}`;
  }
  return assetKind === "image" ? ".png" : ".bin";
}

function normalizeAssetKind(inputKind, fileName, mimeType) {
  const explicit = String(inputKind || "").trim().toLowerCase();
  if (explicit === "image" || explicit === "file") return explicit;
  if (String(mimeType || "").trim().toLowerCase().startsWith("image/")) return "image";
  const ext = path.extname(String(fileName || "").trim()).toLowerCase();
  if ([".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".bmp", ".ico"].includes(ext)) return "image";
  return "file";
}

function normalizeAssetFileName(fileName, mimeType, assetKind = "file") {
  const rawName = String(fileName || "").trim();
  const ext = extensionFromAsset(rawName, mimeType, assetKind);
  const withoutExt = rawName ? rawName.slice(0, rawName.length - path.extname(rawName).length) : "";
  const fallbackStem = assetKind === "image" ? "image" : "attachment";
  return `${sanitizeFileName(withoutExt || fallbackStem)}${ext}`;
}

async function resolveUniqueAssetPath(directoryPath, fileName) {
  const root = path.resolve(directoryPath);
  const baseName = String(fileName || "").trim() || "asset.bin";
  const ext = path.extname(baseName);
  const stem = baseName.slice(0, baseName.length - ext.length) || "asset";
  for (let index = 0; index < 10000; index += 1) {
    const suffix = index === 0 ? "" : ` ${index + 1}`;
    const candidate = path.join(root, `${stem}${suffix}${ext}`);
    if (!(await fileExists(candidate))) return candidate;
  }
  throw new Error(`Unable to allocate asset file path for: ${fileName}`);
}

function normalizeMarkdown(inputTitle, inputBody) {
  const body = String(inputBody || "").replace(/\r\n/g, "\n").trim();
  const fallback = toTitleLine(inputTitle) || "Untitled note";
  if (!body) return { title: fallback, markdownBody: `# ${fallback}\n` };

  const lines = body.split("\n");
  const first = String(lines[0] || "").trim();
  const headingMatch = first.match(/^#{1,6}\s+(.+)$/);
  if (headingMatch) {
    return { title: toTitleLine(headingMatch[1]) || fallback, markdownBody: body.endsWith("\n") ? body : `${body}\n` };
  }

  const title = toTitleLine(first) || fallback;
  const rest = lines.slice(1).join("\n").replace(/^\n+/, "");
  const markdownBody = rest ? `# ${title}\n\n${rest}\n` : `# ${title}\n`;
  return { title, markdownBody };
}

function extractLiteratureSection(markdownBody, sectionLabels = []) {
  const labels = new Set(sectionLabels.map((label) => String(label || "").trim().toLowerCase()).filter(Boolean));
  if (labels.size === 0) return "";

  const lines = String(markdownBody || "").replace(/\r\n/g, "\n").split("\n");
  const collected = [];
  let inSection = false;

  for (const line of lines) {
    const headingMatch = line.match(/^#{2,6}\s+(.+?)\s*$/);
    if (headingMatch) {
      const heading = headingMatch[1].trim().toLowerCase();
      if (labels.has(heading)) {
        inSection = true;
        collected.length = 0;
        continue;
      }
      if (inSection) break;
    }
    if (inSection) collected.push(line);
  }

  return collected.join("\n").trim();
}

function literatureHasParaphrase(markdownBody) {
  const paraphrase = extractLiteratureSection(markdownBody, ["转述", "paraphrase"]);
  return normalizeOptionalText(paraphrase).length > 0;
}

function extractCoreClaimFromMarkdown(markdownBody) {
  const lines = String(markdownBody || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.replace(/^#+\s*/, "").trim())
    .filter(Boolean);
  return lines.join(" ").slice(0, 4000);
}

function noteValidationError(code, message, details = undefined) {
  const error = new Error(message);
  error.code = code;
  if (details) error.details = details;
  return error;
}

function assertLiteratureCompletionAllowed(noteType, status, markdownBody) {
  if (noteType !== "literature") return;
  if (String(status || "").trim().toLowerCase() !== "active") return;
  if (literatureHasParaphrase(markdownBody)) return;
  throw noteValidationError(
    "LITERATURE_PARAPHRASE_REQUIRED",
    "Literature notes require a paraphrase before they can be marked active.",
    {
      noteType,
      requestedStatus: String(status || "").trim().toLowerCase() || "draft",
      requirement: "paraphrase"
    }
  );
}

function normalizeOptionalText(value) {
  return String(value ?? "").trim();
}

function normalizeOptionalNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function boundaryValueFromInput(input = {}, fallback = "") {
  if (input.boundaryOrCounterpoint !== undefined) return normalizeOptionalText(input.boundaryOrCounterpoint);
  if (input.boundary_or_counterpoint !== undefined) return normalizeOptionalText(input.boundary_or_counterpoint);
  return normalizeOptionalText(fallback);
}

function normalizeOriginalityStatus(value, fallback = "warning") {
  const allowed = new Set(["pass", "warning", "blocked"]);
  const normalized = String(value || "").trim().toLowerCase();
  if (allowed.has(normalized)) return normalized;
  const fallbackValue = String(fallback || "").trim().toLowerCase();
  return allowed.has(fallbackValue) ? fallbackValue : "warning";
}

function normalizeBooleanFlag(value, fallback = false) {
  if (typeof value === "boolean") return value;
  const normalized = String(value ?? "").trim().toLowerCase();
  if (normalized === "true") return true;
  if (normalized === "false") return false;
  return Boolean(fallback);
}

function parseInlineJsonObject(value) {
  if (value && typeof value === "object" && !Array.isArray(value)) return value;
  const text = String(value || "").trim();
  if (!text.startsWith("{") || !text.endsWith("}")) return null;
  try {
    const parsed = JSON.parse(text);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function parseInlineJsonArray(value) {
  if (Array.isArray(value)) return value;
  const text = String(value || "").trim();
  if (!text.startsWith("[") || !text.endsWith("]")) return null;
  try {
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function normalizeAuthorshipInput(input, fallback = {}) {
  const source = (input && typeof input === "object" && !Array.isArray(input)) ? input : parseInlineJsonObject(input) || {};
  return {
    user_confirmed: normalizeBooleanFlag(source.user_confirmed, fallback.user_confirmed),
    ai_assisted: normalizeBooleanFlag(source.ai_assisted, fallback.ai_assisted)
  };
}

function normalizeStringArray(items, { exactLength = null } = {}) {
  const values = (Array.isArray(items) ? items : [])
    .map((item) => normalizeOptionalText(item))
    .filter(Boolean);
  if (exactLength !== null && values.length > 0 && values.length !== exactLength) {
    throw new Error(`Expected exactly ${exactLength} non-empty items.`);
  }
  return values;
}

function normalizeDistillationStatus(value, fallback = "missing") {
  const allowed = new Set(["missing", "draft", "confirmed"]);
  const normalized = String(value || "").trim().toLowerCase();
  if (allowed.has(normalized)) return normalized;
  const fallbackValue = String(fallback || "").trim().toLowerCase();
  return allowed.has(fallbackValue) ? fallbackValue : "missing";
}

function distillationFieldsFromFrontmatter(frontmatter = {}) {
  const thesis = normalizeOptionalText(frontmatter.thesis);
  const summaryInput = frontmatter.three_line_summary ?? frontmatter.threeLineSummary ?? parseInlineJsonArray(frontmatter.three_line_summary);
  const threeLineSummary = normalizeStringArray(summaryInput, { exactLength: 3 });
  const fallbackStatus = thesis || threeLineSummary.length ? "draft" : "missing";
  return {
    thesis,
    threeLineSummary,
    distillationStatus: normalizeDistillationStatus(frontmatter.distillation_status, fallbackStatus)
  };
}

function distillationFieldsFromInput(input = {}, fallbackFrontmatter = {}) {
  const fallback = distillationFieldsFromFrontmatter(fallbackFrontmatter);
  const thesisExplicit = input.thesis !== undefined;
  const summaryExplicit = input.threeLineSummary !== undefined || input.three_line_summary !== undefined;
  const statusExplicit = input.distillationStatus !== undefined || input.distillation_status !== undefined;
  const thesis = thesisExplicit ? normalizeOptionalText(input.thesis) : fallback.thesis;
  const summaryInput = summaryExplicit
    ? input.threeLineSummary ?? input.three_line_summary ?? parseInlineJsonArray(input.threeLineSummary)
    : fallback.threeLineSummary;
  const threeLineSummary = normalizeStringArray(summaryInput, { exactLength: 3 });
  const fallbackStatus = thesis || threeLineSummary.length ? "draft" : "missing";
  const distillationStatus = statusExplicit
    ? normalizeDistillationStatus(input.distillationStatus ?? input.distillation_status, fallbackStatus)
    : normalizeDistillationStatus(fallback.distillationStatus, fallbackStatus);
  return {
    thesis,
    threeLineSummary,
    distillationStatus
  };
}

function inputRequestsConfirmedDistillation(input = {}) {
  const explicitValue = input.distillationStatus ?? input.distillation_status;
  return explicitValue !== undefined && normalizeDistillationStatus(explicitValue) === "confirmed";
}

function assertConfirmedDistillationAllowed(noteType, input = {}, permanentMeta = null) {
  if (noteType !== "permanent") return;
  if (!inputRequestsConfirmedDistillation(input)) return;
  if (permanentMeta?.authorship?.user_confirmed === true) return;
  throw noteValidationError(
    "PERMANENT_DISTILLATION_CONFIRMATION_REQUIRED",
    "Confirmed permanent-note distillation requires explicit user authorship confirmation.",
    {
      noteType,
      requestedDistillationStatus: "confirmed",
      requirement: "authorshipConfirmed"
    }
  );
}

function permanentMetadataFromFrontmatter(frontmatter = {}) {
  const authorship = normalizeAuthorshipInput(frontmatter.authorship, {
    user_confirmed: frontmatter.user_confirmed,
    ai_assisted: frontmatter.ai_assisted
  });
  const distillation = distillationFieldsFromFrontmatter(frontmatter);
  return {
    originalityStatus: normalizeOriginalityStatus(frontmatter.originality_status, "warning"),
    originalitySimilarity: normalizeOptionalNumber(frontmatter.originality_similarity),
    authorship,
    ...distillation
  };
}

function permanentMetadataFromInput(input = {}, fallbackFrontmatter = {}) {
  const fallbackMeta = permanentMetadataFromFrontmatter(fallbackFrontmatter);
  const distillation = distillationFieldsFromInput(input, fallbackFrontmatter);
  return {
    originalityStatus: normalizeOriginalityStatus(
      input.originalityStatus ?? input.originality_status,
      fallbackMeta.originalityStatus
    ),
    originalitySimilarity:
      input.originalitySimilarity === undefined && input.originality_similarity === undefined
        ? fallbackMeta.originalitySimilarity
        : normalizeOptionalNumber(input.originalitySimilarity ?? input.originality_similarity),
    authorship: normalizeAuthorshipInput(input.authorship, {
      user_confirmed: input.authorshipConfirmed ?? fallbackMeta.authorship.user_confirmed,
      ai_assisted: input.authorshipAiAssisted ?? fallbackMeta.authorship.ai_assisted
    }),
    ...distillation
  };
}

function noteTypeFromDirectoryType(directoryType) {
  if (directoryType === "fleeting_default") return "fleeting";
  if (directoryType === "literature_default") return "literature";
  return "permanent";
}

function makeNoteId(noteType) {
  const prefix = noteType === "fleeting" ? "fn" : noteType === "literature" ? "ln" : "pn";
  return `${prefix}_${randomUUID().slice(0, 8)}`;
}

function defaultDirectoryIdForNoteType(noteType) {
  if (noteType === "fleeting") return "dir_fleeting_default";
  if (noteType === "literature") return "dir_literature_default";
  return "dir_original_default";
}

function normalizeTagName(input) {
  return String(input || "").trim().replace(/^#/, "");
}

function extractMarkdownTags(text) {
  const tags = new Set();
  const source = String(text || "");
  for (const match of source.matchAll(/(^|[\s([{])#([^\s#,[\]()`'"，。！？、；：.!?;:]+)/gu)) {
    const tag = normalizeTagName(match[2]);
    if (tag) tags.add(tag);
  }
  return [...tags];
}

function parseMarkdownWikilinkTargets(text) {
  const targets = new Set();
  const source = String(text || "");
  for (const match of source.matchAll(/(!)?\[\[([^\]]+)\]\]/g)) {
    const raw = String(match[2] || "").trim();
    if (!raw) continue;
    const [targetPart] = raw.split("|");
    const [pathAndHeading] = String(targetPart || "").split("^");
    const [targetRaw] = String(pathAndHeading || "").split("#");
    const target = String(targetRaw || "").trim();
    if (target) targets.add(target);
  }
  return [...targets];
}

function titleCandidatesForWikilinkTarget(target) {
  const normalized = String(target || "").trim().replaceAll("\\", "/");
  const baseName = path.basename(normalized);
  const withoutMarkdown = baseName.replace(/\.md$/i, "");
  return [...new Set([normalized, baseName, withoutMarkdown].filter(Boolean))];
}

function mapNoteRow(row) {
  return {
    id: row.id,
    noteType: row.note_type,
    title: row.title,
    status: row.status,
    markdownPath: row.markdown_path,
    directoryId: row.directory_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function attachNoteThinkingStatus(note) {
  return {
    ...note,
    thinkingStatus: deriveNoteThinkingStatus(note)
  };
}

async function mapNoteRowsWithThinkingStatus(vaultPath, rows = []) {
  const root = path.resolve(vaultPath);
  return Promise.all(
    rows.map(async (row) => {
      const note = mapNoteRow(row);
      if (!["permanent", "literature"].includes(note.noteType)) return attachNoteThinkingStatus(note);
      try {
        const markdown = await fs.readFile(path.join(root, row.markdown_path), "utf8");
        const parsed = parseMarkdownWithFrontmatter(markdown);
        const boundaryOrCounterpoint = boundaryValueFromInput(parsed.frontmatter || {});
        const permanentMeta = row.note_type === "permanent" ? permanentMetadataFromFrontmatter(parsed.frontmatter || {}) : null;
        return attachNoteThinkingStatus({
          ...note,
          body: parsed.body,
          ...(permanentMeta
            ? {
                thesis: permanentMeta.thesis,
                threeLineSummary: permanentMeta.threeLineSummary,
                distillationStatus: permanentMeta.distillationStatus,
                authorship: permanentMeta.authorship
              }
            : {}),
          ...(boundaryOrCounterpoint ? { boundaryOrCounterpoint } : {})
        });
      } catch {
        return attachNoteThinkingStatus(note);
      }
    })
  );
}

const NOTE_SEARCH_RANKING_PRIORITY = [
  "exact_title",
  "exact_id",
  "title_prefix",
  "id_prefix",
  "title_contains",
  "path_prefix",
  "id_contains",
  "path_contains",
  "recent"
];

function noteSearchMatchKind(row, query) {
  const q = String(query || "").trim().toLowerCase();
  if (!q) return "recent";
  const title = String(row?.title || "").trim().toLowerCase();
  const id = String(row?.id || "").trim().toLowerCase();
  const markdownPath = String(row?.markdown_path || row?.markdownPath || "").trim().toLowerCase();
  if (title === q) return "exact_title";
  if (id === q) return "exact_id";
  if (title.startsWith(q)) return "title_prefix";
  if (id.startsWith(q)) return "id_prefix";
  if (title.includes(q)) return "title_contains";
  if (markdownPath.startsWith(q)) return "path_prefix";
  if (id.includes(q)) return "id_contains";
  if (markdownPath.includes(q)) return "path_contains";
  return "recent";
}

function mapNoteSearchRow(row, query) {
  const item = mapNoteRow(row);
  const matchKind = noteSearchMatchKind(row, query);
  return {
    ...item,
    matchKind,
    rank: NOTE_SEARCH_RANKING_PRIORITY.indexOf(matchKind)
  };
}

function mapRelationLinkRow(row) {
  return {
    id: row.id,
    fromNoteId: row.from_note_id,
    toNoteId: row.to_note_id,
    relationType: row.relation_type,
    rationale: row.rationale,
    insightQuestion: row.insight_question || null,
    rationaleQualityScore: Number(row.rationale_quality_score || 0),
    rationaleQualityLevel: row.rationale_quality_level || "empty",
    createdBy: row.created_by,
    confidence: row.confidence,
    createdAt: row.created_at,
    status: row.status || "confirmed",
    updatedAt: row.updated_at || row.created_at,
    target: row.target_id
      ? {
          id: row.target_id,
          noteType: row.target_note_type,
          title: row.target_title,
          status: row.target_status,
          markdownPath: row.target_markdown_path
        }
      : null,
    source: row.source_id
      ? {
          id: row.source_id,
          noteType: row.source_note_type,
          title: row.source_title,
          status: row.source_status,
          markdownPath: row.source_markdown_path
        }
      : null
  };
}

function mapGraphEdgeRow(row) {
  return {
    id: row.id,
    fromNoteId: row.from_note_id,
    toNoteId: row.to_note_id,
    fromTitle: row.from_title,
    toTitle: row.to_title,
    relationType: row.relation_type,
    rationale: row.rationale,
    insightQuestion: row.insight_question || null,
    rationaleQualityScore: Number(row.rationale_quality_score || 0),
    rationaleQualityLevel: row.rationale_quality_level || "empty",
    createdBy: row.created_by,
    confidence: row.confidence,
    createdAt: row.created_at,
    status: row.status || "confirmed",
    updatedAt: row.updated_at || row.created_at
  };
}

const EXPLICIT_SUPPORT_RELATION_TYPES = new Set(["supports"]);
const EXPLICIT_CONFLICT_RELATION_TYPES = new Set(["contradicts"]);
const LINK_RELATION_TYPES = new Set([
  "supports",
  "related",
  "asks",
  "complements",
  "contrasts",
  "contradicts",
  "duplicates",
  "cites",
  "extends",
  "precedes",
  "follows",
  "qualifies",
  "example_of",
  "counterexample_to",
  "same_topic",
  "unexpected_connection",
  "bridges",
  "restates",
  "reframes",
  "appears_in_draft",
  "belongs_to_topic",
  "associated_with",
  "free_link"
]);
const LINK_CREATED_BY = new Set(["user", "ai_suggestion", "import"]);
const LINK_STATUSES = new Set(["suggested", "draft", "confirmed", "dismissed", "archived"]);
const RELATION_RATIONALE_QUALITY_LEVELS = new Set(["empty", "basic", "good", "strong"]);
const RELATION_RATIONALE_ACTION_PATTERN =
  /support|contradict|qualif|extend|bridge|reframe|example|counterexample|because|therefore|however|evidence|boundary|tension|conflict|支持|反驳|限定|补充|推进|前提|后续|例子|反例|桥接|重述|改写|因为|所以|但是|然而|边界|证据|张力|冲突/i;

function evaluateRelationRationaleQuality(rationale = "", insightQuestion = "") {
  const reason = String(rationale || "").trim();
  const question = String(insightQuestion || "").trim();
  const hasReason = reason.length >= 12;
  const namesRelationAction = RELATION_RATIONALE_ACTION_PATTERN.test(reason);
  const hasQuestion = question.length >= 8 && /[?？]/.test(question);
  const signalCount = [hasReason, namesRelationAction, hasQuestion].filter(Boolean).length;
  const score = Math.round((signalCount / 3) * 100) / 100;
  const level = signalCount >= 3 ? "strong" : signalCount === 2 ? "good" : signalCount === 1 ? "basic" : "empty";
  return { score, level };
}

function normalizeRelationType(value) {
  const relationType = String(value || "").trim().toLowerCase();
  if (!relationType) {
    throw noteValidationError("RELATION_TYPE_REQUIRED", "relationType is required.");
  }
  if (!LINK_RELATION_TYPES.has(relationType)) {
    throw noteValidationError("RELATION_TYPE_UNSUPPORTED", `Unsupported relationType: ${relationType}`, {
      relationType,
      supportedRelationTypes: [...LINK_RELATION_TYPES]
    });
  }
  return relationType;
}

function normalizeRelationStatus(value, createdBy = "user") {
  const status = String(value || (createdBy === "ai_suggestion" ? "suggested" : "confirmed")).trim().toLowerCase();
  if (!LINK_STATUSES.has(status)) {
    throw noteValidationError("RELATION_STATUS_UNSUPPORTED", `Unsupported relation status: ${status}`, {
      status,
      supportedStatuses: [...LINK_STATUSES]
    });
  }
  return status;
}

function normalizeRelationQualityLevels(value, fallback = ["empty", "basic"]) {
  const rawLevels = Array.isArray(value)
    ? value
    : String(value || "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
  const levels = rawLevels.length ? rawLevels : fallback;
  const normalized = [...new Set(levels.map((level) => String(level || "").trim().toLowerCase()).filter(Boolean))];
  const unsupported = normalized.filter((level) => !RELATION_RATIONALE_QUALITY_LEVELS.has(level));
  if (unsupported.length) {
    throw noteValidationError("RELATION_QUALITY_LEVEL_UNSUPPORTED", `Unsupported relation quality level: ${unsupported[0]}`, {
      qualityLevel: unsupported[0],
      supportedQualityLevels: [...RELATION_RATIONALE_QUALITY_LEVELS]
    });
  }
  return normalized.length ? normalized : fallback;
}

function normalizeRelationCreatedBy(value) {
  const createdBy = String(value || "user").trim().toLowerCase();
  if (!LINK_CREATED_BY.has(createdBy)) {
    throw noteValidationError("RELATION_CREATED_BY_UNSUPPORTED", `Unsupported relation createdBy: ${createdBy}`, {
      createdBy,
      supportedCreatedBy: [...LINK_CREATED_BY]
    });
  }
  return createdBy;
}

function normalizeRelationPayload(input = {}, options = {}) {
  const createdBy = normalizeRelationCreatedBy(input.createdBy ?? input.created_by);
  const status = normalizeRelationStatus(input.status, createdBy);
  if (createdBy === "ai_suggestion" && status === "confirmed") {
    throw noteValidationError(
      "RELATION_AI_CONFIRMATION_FORBIDDEN",
      "AI-suggested relations cannot be created as confirmed."
    );
  }

  const fromNoteId = String(options.fromNoteId || input.fromNoteId || input.from_note_id || "").trim();
  const toNoteId = String(input.toNoteId || input.to_note_id || "").trim();
  const relationType = normalizeRelationType(input.relationType ?? input.relation_type);
  const rationale = String(input.rationale || "").trim();
  const insightQuestion = String(input.insightQuestion ?? input.insight_question ?? "").trim();
  const confidenceInput = input.confidence;
  const confidence =
    confidenceInput === undefined || confidenceInput === null || confidenceInput === ""
      ? null
      : Math.max(0, Math.min(1, Number(confidenceInput)));

  if (!fromNoteId) throw noteValidationError("RELATION_FROM_NOTE_REQUIRED", "fromNoteId is required.");
  if (!toNoteId) throw noteValidationError("RELATION_TO_NOTE_REQUIRED", "toNoteId is required.");
  if (fromNoteId === toNoteId) {
    throw noteValidationError("RELATION_SELF_LINK_FORBIDDEN", "A note cannot relate to itself.", { fromNoteId, toNoteId });
  }
  if (!rationale) throw noteValidationError("RELATION_RATIONALE_REQUIRED", "rationale is required.");
  if (confidence !== null && !Number.isFinite(confidence)) {
    throw noteValidationError("RELATION_CONFIDENCE_INVALID", "confidence must be a number between 0 and 1.");
  }

  return {
    fromNoteId,
    toNoteId,
    relationType,
    rationale,
    insightQuestion: insightQuestion || null,
    createdBy,
    status,
    confidence,
    rationaleQuality: evaluateRelationRationaleQuality(rationale, insightQuestion)
  };
}

function getRelationByIdRow(db, relationId) {
  return db
    .prepare(
      `SELECT l.*, to_note.id AS target_id, to_note.note_type AS target_note_type, to_note.title AS target_title,
              to_note.status AS target_status, to_note.markdown_path AS target_markdown_path,
              from_note.id AS source_id, from_note.note_type AS source_note_type, from_note.title AS source_title,
              from_note.status AS source_status, from_note.markdown_path AS source_markdown_path
       FROM links l
       JOIN notes from_note ON from_note.id = l.from_note_id
       JOIN notes to_note ON to_note.id = l.to_note_id
       WHERE l.id = ? AND from_note.deleted_at IS NULL AND to_note.deleted_at IS NULL
       LIMIT 1`
    )
    .get(relationId);
}

function assertNoteExistsForRelation(db, noteId, label) {
  const row = db.prepare("SELECT id FROM notes WHERE id = ? AND deleted_at IS NULL LIMIT 1").get(noteId);
  if (!row) throw noteValidationError("RELATION_NOTE_NOT_FOUND", `${label} not found: ${noteId}`, { noteId, label });
}

function buildGraphInsights(nodes, edges) {
  const nodeById = new Map((nodes || []).map((node) => [node.id, node]));
  const supportingRelations = [];
  const conflictingRelations = [];
  const untypedRelations = [];

  for (const edge of edges || []) {
    const relationType = String(edge.relationType || "associated_with").trim().toLowerCase();
    const rationale = String(edge.rationale || "").trim().toLowerCase();

    if (EXPLICIT_SUPPORT_RELATION_TYPES.has(relationType)) {
      supportingRelations.push(edge);
      continue;
    }

    if (EXPLICIT_CONFLICT_RELATION_TYPES.has(relationType)) {
      conflictingRelations.push(edge);
      continue;
    }

    if (relationType === "associated_with" || (relationType === "free_link" && (!rationale || rationale === "markdown_wikilink"))) {
      untypedRelations.push(edge);
    }
  }

  const adjacency = new Map((nodes || []).map((node) => [node.id, new Set()]));
  for (const edge of edges || []) {
    if (!adjacency.has(edge.fromNoteId) || !adjacency.has(edge.toNoteId)) continue;
    adjacency.get(edge.fromNoteId).add(edge.toNoteId);
    adjacency.get(edge.toNoteId).add(edge.fromNoteId);
  }

  const visited = new Set();
  const components = [];
  for (const node of nodes || []) {
    if (!node?.id || visited.has(node.id)) continue;
    const queue = [node.id];
    const noteIds = [];
    visited.add(node.id);
    while (queue.length) {
      const currentId = queue.shift();
      noteIds.push(currentId);
      for (const neighborId of adjacency.get(currentId) || []) {
        if (visited.has(neighborId)) continue;
        visited.add(neighborId);
        queue.push(neighborId);
      }
    }
    components.push({
      noteIds,
      noteTitles: noteIds.map((id) => nodeById.get(id)?.title || id).filter(Boolean),
      size: noteIds.length
    });
  }

  components.sort((a, b) => b.size - a.size || a.noteTitles.join(" ").localeCompare(b.noteTitles.join(" ")));

  const bridgeGaps = [];
  const primaryComponent = components[0] || null;
  const totalNodes = (nodes || []).length;

  components.forEach((component, index) => {
    if (!component.noteIds.length) return;
    if (component.size === 1) {
      if (totalNodes <= 1) return;
      const onlyId = component.noteIds[0];
      const onlyTitle = component.noteTitles[0] || onlyId;
      bridgeGaps.push({
        id: `bridge_gap_isolated_${onlyId}`,
        gapType: "isolated_note",
        noteIds: [onlyId],
        noteTitles: [onlyTitle],
        rationale: "This note is isolated from the rest of the current directory graph.",
        suggestedAction: "Add an intermediate note or an explicit relation that explains how it connects to an existing argument."
      });
      return;
    }

    if (index > 0 && primaryComponent) {
      bridgeGaps.push({
        id: `bridge_gap_cluster_${index + 1}`,
        gapType: "disconnected_cluster",
        noteIds: component.noteIds,
        noteTitles: component.noteTitles,
        rationale: "This cluster is disconnected from the main note cluster in the current directory.",
        suggestedAction: "Add a bridge note or an explicit relation that connects this cluster back to the main structure.",
        targetNoteIds: primaryComponent.noteIds,
        targetNoteTitles: primaryComponent.noteTitles
      });
    }
  });

  return {
    supportingRelations,
    conflictingRelations,
    untypedRelations,
    bridgeGaps,
    connectedComponentCount: components.length
  };
}

function ensureSingleDirectoryMembership(db, noteId, directoryId) {
  const existing = db
    .prepare("SELECT id FROM note_directory_membership WHERE note_id = ? AND directory_id = ? LIMIT 1")
    .get(noteId, directoryId);
  if (existing) {
    db.prepare("DELETE FROM note_directory_membership WHERE note_id = ? AND directory_id != ?").run(noteId, directoryId);
    return;
  }
  db.prepare("DELETE FROM note_directory_membership WHERE note_id = ?").run(noteId);
  db.prepare(`INSERT INTO note_directory_membership (id, note_id, directory_id, created_at) VALUES (?, ?, ?, ?)`).run(
    `ndm_${randomUUID().slice(0, 8)}`,
    noteId,
    directoryId,
    new Date().toISOString()
  );
}

function directoryScopeClause(scopeTable = "directory_scope") {
  return `WITH RECURSIVE ${scopeTable}(id) AS (
            SELECT id FROM directories WHERE id = ?
            UNION ALL
            SELECT d.id
            FROM directories d
            JOIN ${scopeTable} s ON d.parent_directory_id = s.id
          )`;
}

function findNoteByWikilinkTarget(db, target, excludeNoteId) {
  for (const title of titleCandidatesForWikilinkTarget(target)) {
    const row = db
      .prepare(
        `SELECT id, note_type, title, markdown_path
         FROM notes
         WHERE title = ? AND id != ? AND deleted_at IS NULL
         ORDER BY updated_at DESC
         LIMIT 1`
      )
      .get(title, excludeNoteId);
    if (row) return row;
  }
  return null;
}

async function evaluatePermanentOriginality(db, vaultPath, noteId, markdownBody) {
  const wikilinkTargets = parseMarkdownWikilinkTargets(markdownBody);
  const linkedLiterature = [];
  const seenNoteIds = new Set();
  for (const target of wikilinkTargets) {
    const linked = findNoteByWikilinkTarget(db, target, noteId || "");
    if (!linked || linked.note_type !== "literature" || seenNoteIds.has(linked.id)) continue;
    seenNoteIds.add(linked.id);
    linkedLiterature.push(linked);
  }

  if (!linkedLiterature.length) return null;

  const literature = [];
  for (const note of linkedLiterature) {
    const absMarkdownPath = path.join(path.resolve(vaultPath), String(note.markdown_path || "").replaceAll("/", path.sep));
    const markdown = await fs.readFile(absMarkdownPath, "utf8");
    const parsed = parseMarkdownWithFrontmatter(markdown);
    literature.push({
      id: note.id,
      source_id: `src_from_${note.id}`,
      quote_text: normalizeOptionalText(extractLiteratureSection(parsed.body, ["原文", "original text", "originalText"]) || parsed.body || "")
    });
  }

  const result = originalityGuard(
    {
      literature,
      permanent: [
        {
          id: noteId || "pending_permanent_note",
          core_claim: extractCoreClaimFromMarkdown(markdownBody),
          citations: linkedLiterature.map((note) => ({ source_id: `src_from_${note.id}` }))
        }
      ]
    },
    { requireCitationLocator: false }
  );
  const evaluation = result?.evaluations?.[0] || null;
  return evaluation
    ? {
        status: evaluation.status,
        similarity: Number(evaluation.similarity || 0),
        reasons: Array.isArray(evaluation.reasons) ? evaluation.reasons : []
      }
    : null;
}

function resolvePermanentSaveStatus(requestedStatus, originality, authorship) {
  const wantsActive = String(requestedStatus || "").trim().toLowerCase() === "active";
  if (!wantsActive) return String(requestedStatus || "draft").trim() || "draft";
  if (originality?.status !== "pass") return "draft";
  if (!authorship?.user_confirmed) return "draft";
  return "active";
}

function syncMarkdownRelations(db, noteId, markdownBody) {
  const now = new Date().toISOString();
  const tags = extractMarkdownTags(markdownBody);
  const wikilinkTargets = parseMarkdownWikilinkTargets(markdownBody);

  db.prepare("DELETE FROM note_tags WHERE note_id = ? AND source = 'markdown_body'").run(noteId);
  for (const tagName of tags) {
    db.prepare("INSERT OR IGNORE INTO tags (id, name, created_at) VALUES (?, ?, ?)").run(
      `tag_${randomUUID().slice(0, 8)}`,
      tagName,
      now
    );
    const tag = db.prepare("SELECT id FROM tags WHERE name = ? LIMIT 1").get(tagName);
    db.prepare(
      `INSERT OR IGNORE INTO note_tags (id, note_id, tag_id, source, created_at)
       VALUES (?, ?, ?, 'markdown_body', ?)`
    ).run(`nt_${randomUUID().slice(0, 8)}`, noteId, tag.id, now);
  }

  db.prepare(
    "DELETE FROM links WHERE from_note_id = ? AND created_by = 'user' AND rationale = 'markdown_wikilink'"
  ).run(noteId);
  const unresolved = [];
  for (const target of wikilinkTargets) {
    const linkedNote = findNoteByWikilinkTarget(db, target, noteId);
    if (!linkedNote) {
      unresolved.push(target);
      continue;
    }
    db.prepare(
      `INSERT OR IGNORE INTO links
       (id, from_note_id, to_note_id, relation_type, rationale, created_by, confidence, created_at, status, updated_at)
       VALUES (?, ?, ?, 'associated_with', 'markdown_wikilink', 'user', 1, ?, 'confirmed', ?)`
    ).run(`lnk_${randomUUID().slice(0, 8)}`, noteId, linkedNote.id, now, now);
  }

  return { tags, wikilinkTargets, unresolvedWikilinks: unresolved };
}

export async function createNoteInDirectory(vaultPath, input = {}) {
  if (!vaultPath) throw new Error("vaultPath is required");
  const directoryId = String(input.directoryId || "").trim();
  if (!directoryId) throw new Error("directoryId is required");

  const requestedStatus = String(input.status || "draft").trim() || "draft";
  const now = new Date().toISOString();
  const DatabaseSync = await loadDatabaseSync();
  const db = new DatabaseSync(catalogDbPath(vaultPath));
  try {
    const dir = db
      .prepare("SELECT id, directory_type, fs_path FROM directories WHERE id = ? LIMIT 1")
      .get(directoryId);
    if (!dir) throw new Error(`directoryId not found: ${directoryId}`);

    const noteType = noteTypeFromDirectoryType(dir.directory_type);
    const normalized = normalizeMarkdown(input.title, input.body);
    assertLiteratureCompletionAllowed(noteType, requestedStatus, normalized.markdownBody);
    const noteId = String(input.id || makeNoteId(noteType));
    const boundaryOrCounterpoint = noteType === "permanent" ? boundaryValueFromInput(input) : "";
    const permanentMeta = noteType === "permanent" ? permanentMetadataFromInput(input, {}) : null;
    assertConfirmedDistillationAllowed(noteType, input, permanentMeta);
    let status = requestedStatus;
    if (noteType === "permanent") {
      const originality = await evaluatePermanentOriginality(db, vaultPath, noteId, normalized.markdownBody);
      if (originality) {
        permanentMeta.originalityStatus = originality.status;
        permanentMeta.originalitySimilarity = originality.similarity;
        if (originality.status === "blocked") {
          throw noteValidationError(
            "PERMANENT_ORIGINALITY_BLOCKED",
            "Permanent note save blocked: rewrite this note in your own words before saving.",
            {
              noteType,
              requestedStatus,
              originality
            }
          );
        }
      }
      status = resolvePermanentSaveStatus(
        status,
        originality || { status: permanentMeta.originalityStatus, similarity: permanentMeta.originalitySimilarity },
        permanentMeta.authorship
      );
    }
    const frontmatter = {
      id: noteId,
      note_type: noteType,
      title: normalized.title,
      status,
      created_at: now,
      updated_at: now
    };
    if (noteType === "permanent") {
      if (boundaryOrCounterpoint) frontmatter.boundary_or_counterpoint = boundaryOrCounterpoint;
      frontmatter.originality_status = permanentMeta.originalityStatus;
      if (permanentMeta.originalitySimilarity !== null) frontmatter.originality_similarity = permanentMeta.originalitySimilarity;
      frontmatter.authorship = permanentMeta.authorship;
      if (permanentMeta.thesis) frontmatter.thesis = permanentMeta.thesis;
      if (permanentMeta.threeLineSummary.length) frontmatter.three_line_summary = permanentMeta.threeLineSummary;
      if (permanentMeta.distillationStatus !== "missing" || permanentMeta.thesis || permanentMeta.threeLineSummary.length) {
        frontmatter.distillation_status = permanentMeta.distillationStatus;
      }
    }
    const markdown = serializeMarkdownWithFrontmatter(frontmatter, normalized.markdownBody);
    const absMarkdownPath = await createUniqueMarkdownFile(dir.fs_path, normalized.title, markdown, {
      fallbackStem: noteId
    });

    const relPath = path.relative(path.resolve(vaultPath), absMarkdownPath).replaceAll("\\", "/");
    db.exec("BEGIN IMMEDIATE;");
    try {
      db.prepare(
        `INSERT INTO notes (id, note_type, title, status, markdown_path, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      ).run(noteId, noteType, normalized.title, status, relPath, now, now);
      db.prepare(
        `INSERT INTO note_directory_membership (id, note_id, directory_id, created_at)
         VALUES (?, ?, ?, ?)`
      ).run(`ndm_${randomUUID().slice(0, 8)}`, noteId, directoryId, now);
      syncMarkdownRelations(db, noteId, normalized.markdownBody);
      db.exec("COMMIT;");
    } catch (error) {
      db.exec("ROLLBACK;");
      throw error;
    }

    return attachNoteThinkingStatus({
      id: noteId,
      noteType,
      title: normalized.title,
      status,
      directoryId,
      markdownPath: relPath,
      body: normalized.markdownBody,
      markdown,
      ...(noteType === "permanent"
        ? {
            thesis: permanentMeta.thesis,
            threeLineSummary: permanentMeta.threeLineSummary,
            distillationStatus: permanentMeta.distillationStatus,
            originalityStatus: permanentMeta.originalityStatus,
            ...(permanentMeta.originalitySimilarity !== null
              ? { originalitySimilarity: permanentMeta.originalitySimilarity }
              : {}),
            authorship: permanentMeta.authorship
          }
        : {}),
      ...(boundaryOrCounterpoint ? { boundaryOrCounterpoint } : {}),
      createdAt: now,
      updatedAt: now
    });
  } finally {
    db.close();
  }
}

export async function registerMarkdownNoteInCatalog(vaultPath, input = {}) {
  if (!vaultPath) throw new Error("vaultPath is required");
  const noteId = String(input.noteId || "").trim();
  if (!noteId) throw new Error("noteId is required");
  const noteType = String(input.noteType || "permanent").trim();
  const title = String(input.title || noteId).trim() || noteId;
  const status = String(input.status || "draft").trim() || "draft";
  const markdownPath = String(input.markdownPath || "").replaceAll("\\", "/").trim();
  if (!markdownPath) throw new Error("markdownPath is required");
  const directoryId = String(input.directoryId || defaultDirectoryIdForNoteType(noteType)).trim();
  const now = new Date().toISOString();

  const DatabaseSync = await loadDatabaseSync();
  const db = new DatabaseSync(catalogDbPath(vaultPath));
  try {
    const directory = db.prepare("SELECT id FROM directories WHERE id = ? LIMIT 1").get(directoryId);
    if (!directory) throw new Error(`directoryId not found: ${directoryId}`);

    db.exec("BEGIN IMMEDIATE;");
    try {
      db.prepare(
        `INSERT INTO notes (id, note_type, title, status, markdown_path, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           note_type = excluded.note_type,
           title = excluded.title,
           status = excluded.status,
           markdown_path = excluded.markdown_path,
           updated_at = excluded.updated_at,
           deleted_at = NULL`
      ).run(noteId, noteType, title, status, markdownPath, now, now);
      ensureSingleDirectoryMembership(db, noteId, directoryId);
      const absMarkdownPath = path.join(path.resolve(vaultPath), markdownPath);
      const markdown = await fs.readFile(absMarkdownPath, "utf8");
      const parsed = parseMarkdownWithFrontmatter(markdown);
      syncMarkdownRelations(db, noteId, parsed.body);
      db.exec("COMMIT;");
    } catch (error) {
      db.exec("ROLLBACK;");
      throw error;
    }

    const row = db
      .prepare(
        `SELECT n.id, n.note_type, n.title, n.status, n.markdown_path, n.created_at, n.updated_at, ndm.directory_id
         FROM notes n
         LEFT JOIN note_directory_membership ndm ON ndm.note_id = n.id
         WHERE n.id = ?
         LIMIT 1`
      )
      .get(noteId);
    return mapNoteRow(row);
  } finally {
    db.close();
  }
}

export async function listNotesInDirectory(vaultPath, directoryId) {
  if (!vaultPath) throw new Error("vaultPath is required");
  const id = String(directoryId || "").trim();
  if (!id) throw new Error("directoryId is required");
  const DatabaseSync = await loadDatabaseSync();
  const db = new DatabaseSync(catalogDbPath(vaultPath));
  try {
    const rows = db
      .prepare(
        `SELECT n.id, n.note_type, n.title, n.status, n.markdown_path, n.created_at, n.updated_at, ndm.directory_id
         FROM note_directory_membership ndm
         JOIN notes n ON n.id = ndm.note_id
         WHERE ndm.directory_id = ? AND n.deleted_at IS NULL
         ORDER BY n.updated_at DESC`
      )
      .all(id);
    return mapNoteRowsWithThinkingStatus(vaultPath, rows);
  } finally {
    db.close();
  }
}

export async function listNotesInDirectoryScope(vaultPath, directoryId, options = {}) {
  if (!vaultPath) throw new Error("vaultPath is required");
  const id = String(directoryId || "").trim();
  if (!id) throw new Error("directoryId is required");
  const includeDescendants = options.includeDescendants !== false;
  const DatabaseSync = await loadDatabaseSync();
  const db = new DatabaseSync(catalogDbPath(vaultPath));
  try {
    const directory = db.prepare("SELECT id FROM directories WHERE id = ? LIMIT 1").get(id);
    if (!directory) throw new Error(`directoryId not found: ${id}`);

    const rows = includeDescendants
      ? db
          .prepare(
            `${directoryScopeClause("scope")}
             SELECT n.id, n.note_type, n.title, n.status, n.markdown_path, n.created_at, n.updated_at, ndm.directory_id
             FROM note_directory_membership ndm
             JOIN scope ON scope.id = ndm.directory_id
             JOIN notes n ON n.id = ndm.note_id
             WHERE n.deleted_at IS NULL
             ORDER BY lower(n.title), n.updated_at DESC`
          )
          .all(id)
      : db
          .prepare(
            `SELECT n.id, n.note_type, n.title, n.status, n.markdown_path, n.created_at, n.updated_at, ndm.directory_id
             FROM note_directory_membership ndm
             JOIN notes n ON n.id = ndm.note_id
             WHERE ndm.directory_id = ? AND n.deleted_at IS NULL
             ORDER BY lower(n.title), n.updated_at DESC`
          )
          .all(id);
    return mapNoteRowsWithThinkingStatus(vaultPath, rows);
  } finally {
    db.close();
  }
}

export async function searchNotes(vaultPath, options = {}) {
  if (!vaultPath) throw new Error("vaultPath is required");
  const query = String(options.q || options.query || "").trim().toLowerCase();
  const rootDirectoryId = String(options.rootDirectoryId || options.directoryId || "").trim();
  const excludeNoteId = String(options.excludeNoteId || "").trim();
  const limit = Math.max(1, Math.min(100, Number(options.limit || 20) || 20));

  const DatabaseSync = await loadDatabaseSync();
  const db = new DatabaseSync(catalogDbPath(vaultPath));
  try {
    if (rootDirectoryId) {
      const directory = db.prepare("SELECT id FROM directories WHERE id = ? LIMIT 1").get(rootDirectoryId);
      if (!directory) throw new Error(`rootDirectoryId not found: ${rootDirectoryId}`);
    }

    const matchClause =
      "(? = '' OR LOWER(n.title) LIKE '%' || ? || '%' OR LOWER(n.id) LIKE '%' || ? || '%' OR LOWER(n.markdown_path) LIKE '%' || ? || '%')";
    const orderClause = `CASE
        WHEN ? = '' THEN 8
        WHEN LOWER(n.title) = ? THEN 0
        WHEN LOWER(n.id) = ? THEN 1
        WHEN LOWER(n.title) LIKE ? || '%' THEN 2
        WHEN LOWER(n.id) LIKE ? || '%' THEN 3
        WHEN LOWER(n.title) LIKE '%' || ? || '%' THEN 4
        WHEN LOWER(n.markdown_path) LIKE ? || '%' THEN 5
        WHEN LOWER(n.id) LIKE '%' || ? || '%' THEN 6
        WHEN LOWER(n.markdown_path) LIKE '%' || ? || '%' THEN 7
        ELSE 8
      END,
      n.updated_at DESC,
      LOWER(n.title) ASC`;
    const queryArgs = [query, query, query, query, query, query, query, query, query, query, query, query, query];

    const rows = rootDirectoryId
      ? db
          .prepare(
            `${directoryScopeClause("scope")}
             SELECT n.id, n.note_type, n.title, n.status, n.markdown_path,
                    n.created_at, n.updated_at, ndm.directory_id
             FROM note_directory_membership ndm
             JOIN scope ON scope.id = ndm.directory_id
             JOIN notes n ON n.id = ndm.note_id
             WHERE n.deleted_at IS NULL
               AND (? = '' OR n.id != ?)
               AND ${matchClause}
             ORDER BY ${orderClause}
             LIMIT ?`
          )
          .all(rootDirectoryId, excludeNoteId, excludeNoteId, ...queryArgs, limit)
      : db
          .prepare(
            `SELECT n.id, n.note_type, n.title, n.status, n.markdown_path,
                    n.created_at, n.updated_at, ndm.directory_id
             FROM notes n
             LEFT JOIN note_directory_membership ndm ON ndm.note_id = n.id
             WHERE n.deleted_at IS NULL
               AND (? = '' OR n.id != ?)
               AND ${matchClause}
             ORDER BY ${orderClause}
             LIMIT ?`
          )
          .all(excludeNoteId, excludeNoteId, ...queryArgs, limit);

    const items = rows.map((row) => mapNoteSearchRow(row, query));
    return {
      rootDirectoryId: rootDirectoryId || null,
      query,
      ranking: {
        method: "sqlite_catalog_note_search_v1",
        priority: NOTE_SEARCH_RANKING_PRIORITY
      },
      items,
      total: items.length
    };
  } finally {
    db.close();
  }
}

export async function getDirectoryGraph(vaultPath, directoryId, options = {}) {
  if (!vaultPath) throw new Error("vaultPath is required");
  const id = String(directoryId || "").trim();
  if (!id) throw new Error("directoryId is required");
  const includeDescendants = options.includeDescendants === true || String(options.includeDescendants || "") === "true";

  const DatabaseSync = await loadDatabaseSync();
  const db = new DatabaseSync(catalogDbPath(vaultPath));
  try {
    const directory = db.prepare("SELECT id, title FROM directories WHERE id = ? LIMIT 1").get(id);
    if (!directory) throw new Error(`directoryId not found: ${id}`);

    const nodes = includeDescendants
      ? db
          .prepare(
            `${directoryScopeClause("graph_scope")}
             SELECT n.id, n.note_type, n.title, n.status, n.markdown_path, n.created_at, n.updated_at, ndm.directory_id
             FROM note_directory_membership ndm
             JOIN graph_scope ON graph_scope.id = ndm.directory_id
             JOIN notes n ON n.id = ndm.note_id
             WHERE n.deleted_at IS NULL
             ORDER BY n.title ASC, n.updated_at DESC`
          )
          .all(id)
          .map(mapNoteRow)
      : db
          .prepare(
            `SELECT n.id, n.note_type, n.title, n.status, n.markdown_path, n.created_at, n.updated_at, ndm.directory_id
             FROM note_directory_membership ndm
             JOIN notes n ON n.id = ndm.note_id
             WHERE ndm.directory_id = ? AND n.deleted_at IS NULL
             ORDER BY n.title ASC, n.updated_at DESC`
          )
          .all(id)
          .map(mapNoteRow);

    const edges = includeDescendants
      ? db
          .prepare(
            `${directoryScopeClause("graph_scope")}
             SELECT l.id, l.from_note_id, l.to_note_id, l.relation_type, l.rationale, l.created_by,
                    l.insight_question, l.rationale_quality_score, l.rationale_quality_level,
                    l.confidence, l.status, l.created_at, l.updated_at,
                    from_note.title AS from_title,
                    to_note.title AS to_title
             FROM links l
             JOIN note_directory_membership from_member ON from_member.note_id = l.from_note_id
             JOIN note_directory_membership to_member ON to_member.note_id = l.to_note_id
             JOIN graph_scope from_scope ON from_scope.id = from_member.directory_id
             JOIN graph_scope to_scope ON to_scope.id = to_member.directory_id
             JOIN notes from_note ON from_note.id = l.from_note_id
             JOIN notes to_note ON to_note.id = l.to_note_id
             WHERE from_note.deleted_at IS NULL
               AND to_note.deleted_at IS NULL
               AND COALESCE(l.status, 'confirmed') NOT IN ('dismissed', 'archived')
             ORDER BY l.created_at DESC`
          )
          .all(id)
          .map(mapGraphEdgeRow)
      : db
          .prepare(
            `SELECT l.id, l.from_note_id, l.to_note_id, l.relation_type, l.rationale, l.created_by,
                    l.insight_question, l.rationale_quality_score, l.rationale_quality_level,
                    l.confidence, l.status, l.created_at, l.updated_at,
                    from_note.title AS from_title,
                    to_note.title AS to_title
             FROM links l
             JOIN note_directory_membership from_member ON from_member.note_id = l.from_note_id
             JOIN note_directory_membership to_member ON to_member.note_id = l.to_note_id
             JOIN notes from_note ON from_note.id = l.from_note_id
             JOIN notes to_note ON to_note.id = l.to_note_id
             WHERE from_member.directory_id = ?
               AND to_member.directory_id = ?
               AND from_note.deleted_at IS NULL
               AND to_note.deleted_at IS NULL
               AND COALESCE(l.status, 'confirmed') NOT IN ('dismissed', 'archived')
             ORDER BY l.created_at DESC`
          )
          .all(id, id)
          .map(mapGraphEdgeRow);

    return {
      directoryId: id,
      directoryTitle: directory.title,
      includeDescendants,
      scope: includeDescendants ? "directory_tree" : "directory",
      nodes,
      edges,
      insights: buildGraphInsights(nodes, edges),
      totalNodes: nodes.length,
      totalEdges: edges.length
    };
  } finally {
    db.close();
  }
}

function relationReviewReason(relation) {
  const level = String(relation?.rationaleQualityLevel || "empty").trim().toLowerCase();
  if (level === "empty") return "missing_rationale";
  if (level === "basic") return "thin_rationale";
  return "needs_review";
}

function summarizeRelationReviewQueue(items) {
  const byQualityLevel = {};
  const byStatus = {};
  const byRelationType = {};
  for (const item of items) {
    const qualityLevel = String(item.rationaleQualityLevel || "empty").trim().toLowerCase();
    const status = String(item.status || "confirmed").trim().toLowerCase();
    const relationType = String(item.relationType || "associated_with").trim().toLowerCase();
    byQualityLevel[qualityLevel] = (byQualityLevel[qualityLevel] || 0) + 1;
    byStatus[status] = (byStatus[status] || 0) + 1;
    byRelationType[relationType] = (byRelationType[relationType] || 0) + 1;
  }
  return { byQualityLevel, byStatus, byRelationType };
}

export async function listRelationReviewQueue(vaultPath, options = {}) {
  if (!vaultPath) throw new Error("vaultPath is required");
  const directoryId = String(options.directoryId || "").trim();
  if (!directoryId) throw new Error("directoryId is required");
  const includeDescendants = options.includeDescendants === true || String(options.includeDescendants || "") === "true";
  const qualityLevels = normalizeRelationQualityLevels(options.qualityLevels ?? options.qualityLevel);
  const relationTypeInput = String(options.relationType || "all").trim().toLowerCase();
  const relationType = relationTypeInput && relationTypeInput !== "all" ? normalizeRelationType(relationTypeInput) : "all";
  const statusInput = String(options.status || "all").trim().toLowerCase();
  const status = statusInput && statusInput !== "all" ? normalizeRelationStatus(statusInput, "user") : "all";
  const limit = Math.max(1, Math.min(100, Number(options.limit || 20) || 20));

  const DatabaseSync = await loadDatabaseSync();
  const db = new DatabaseSync(catalogDbPath(vaultPath));
  try {
    const directory = db.prepare("SELECT id, title FROM directories WHERE id = ? LIMIT 1").get(directoryId);
    if (!directory) throw new Error(`directoryId not found: ${directoryId}`);

    const scopeClause = includeDescendants
      ? directoryScopeClause("scope")
      : "WITH scope(id) AS (SELECT id FROM directories WHERE id = ?)";
    const qualityPlaceholders = qualityLevels.map(() => "?").join(", ");
    const statusClause =
      status === "all" ? "AND COALESCE(l.status, 'confirmed') NOT IN ('dismissed', 'archived')" : "AND COALESCE(l.status, 'confirmed') = ?";
    const relationTypeClause = relationType === "all" ? "" : "AND l.relation_type = ?";
    const args = [directoryId, ...qualityLevels];
    if (status !== "all") args.push(status);
    if (relationType !== "all") args.push(relationType);
    args.push(limit);

    const rows = db
      .prepare(
        `${scopeClause}
         SELECT l.*,
                to_note.id AS target_id, to_note.note_type AS target_note_type, to_note.title AS target_title,
                to_note.status AS target_status, to_note.markdown_path AS target_markdown_path,
                from_note.id AS source_id, from_note.note_type AS source_note_type, from_note.title AS source_title,
                from_note.status AS source_status, from_note.markdown_path AS source_markdown_path
         FROM links l
         JOIN notes from_note ON from_note.id = l.from_note_id
         JOIN notes to_note ON to_note.id = l.to_note_id
         WHERE from_note.deleted_at IS NULL
           AND to_note.deleted_at IS NULL
           AND COALESCE(l.rationale_quality_level, 'empty') IN (${qualityPlaceholders})
           ${statusClause}
           ${relationTypeClause}
           AND (
             EXISTS (
               SELECT 1
               FROM note_directory_membership from_member
               JOIN scope ON scope.id = from_member.directory_id
               WHERE from_member.note_id = l.from_note_id
             )
             OR EXISTS (
               SELECT 1
               FROM note_directory_membership to_member
               JOIN scope ON scope.id = to_member.directory_id
               WHERE to_member.note_id = l.to_note_id
             )
           )
         ORDER BY
           CASE COALESCE(l.rationale_quality_level, 'empty')
             WHEN 'empty' THEN 0
             WHEN 'basic' THEN 1
             WHEN 'good' THEN 2
             WHEN 'strong' THEN 3
             ELSE 4
           END ASC,
           CASE COALESCE(l.status, 'confirmed')
             WHEN 'suggested' THEN 0
             WHEN 'draft' THEN 1
             WHEN 'confirmed' THEN 2
             ELSE 3
           END ASC,
           COALESCE(l.updated_at, l.created_at) ASC
         LIMIT ?`
      )
      .all(...args);

    const items = rows.map((row) => {
      const relation = mapRelationLinkRow(row);
      const reviewReason = relationReviewReason(relation);
      return {
        ...relation,
        reviewReason,
        reviewPriority: reviewReason === "missing_rationale" ? 0 : reviewReason === "thin_rationale" ? 1 : 2
      };
    });

    return {
      directoryId,
      directoryTitle: directory.title,
      includeDescendants,
      qualityLevels,
      relationType,
      status,
      limit,
      total: items.length,
      items,
      summary: summarizeRelationReviewQueue(items)
    };
  } finally {
    db.close();
  }
}

export async function findNotePath(vaultPath, input = {}) {
  if (!vaultPath) throw new Error("vaultPath is required");
  const fromNoteId = String(input.fromNoteId || "").trim();
  const toNoteId = String(input.toNoteId || "").trim();
  if (!fromNoteId) throw new Error("fromNoteId is required");
  if (!toNoteId) throw new Error("toNoteId is required");
  const maxDepth = Math.max(1, Math.min(8, Number(input.maxDepth || 4)));
  const direction = String(input.direction || "outgoing").trim() === "any" ? "any" : "outgoing";
  const directoryId = String(input.directoryId || "").trim();

  const DatabaseSync = await loadDatabaseSync();
  const db = new DatabaseSync(catalogDbPath(vaultPath));
  try {
    const endpoints = db
      .prepare(
        `SELECT id, note_type, title, status, markdown_path, created_at, updated_at, NULL AS directory_id
         FROM notes
         WHERE id IN (?, ?) AND deleted_at IS NULL`
      )
      .all(fromNoteId, toNoteId)
      .map(mapNoteRow);
    if (!endpoints.find((note) => note.id === fromNoteId)) throw new Error(`fromNoteId not found: ${fromNoteId}`);
    if (!endpoints.find((note) => note.id === toNoteId)) throw new Error(`toNoteId not found: ${toNoteId}`);

    const edgeRows = directoryId
      ? db
          .prepare(
            `${directoryScopeClause("scope")}
             SELECT l.id, l.from_note_id, l.to_note_id, l.relation_type, l.rationale, l.created_by,
                    l.insight_question, l.rationale_quality_score, l.rationale_quality_level,
                    l.confidence, l.status, l.created_at, l.updated_at,
                    from_note.title AS from_title,
                    to_note.title AS to_title
             FROM links l
             JOIN notes from_note ON from_note.id = l.from_note_id
             JOIN notes to_note ON to_note.id = l.to_note_id
             JOIN note_directory_membership from_member ON from_member.note_id = l.from_note_id
             JOIN note_directory_membership to_member ON to_member.note_id = l.to_note_id
             JOIN scope from_scope ON from_scope.id = from_member.directory_id
             JOIN scope to_scope ON to_scope.id = to_member.directory_id
             WHERE from_note.deleted_at IS NULL AND to_note.deleted_at IS NULL
               AND COALESCE(l.status, 'confirmed') NOT IN ('dismissed', 'archived')`
          )
          .all(directoryId)
      : db
          .prepare(
            `SELECT l.id, l.from_note_id, l.to_note_id, l.relation_type, l.rationale, l.created_by,
                    l.insight_question, l.rationale_quality_score, l.rationale_quality_level,
                    l.confidence, l.status, l.created_at, l.updated_at,
                    from_note.title AS from_title,
                    to_note.title AS to_title
             FROM links l
             JOIN notes from_note ON from_note.id = l.from_note_id
             JOIN notes to_note ON to_note.id = l.to_note_id
             WHERE from_note.deleted_at IS NULL AND to_note.deleted_at IS NULL
               AND COALESCE(l.status, 'confirmed') NOT IN ('dismissed', 'archived')`
          )
          .all();

    const edges = edgeRows.map(mapGraphEdgeRow);
    const adjacency = new Map();
    for (const edge of edges) {
      if (!adjacency.has(edge.fromNoteId)) adjacency.set(edge.fromNoteId, []);
      adjacency.get(edge.fromNoteId).push(edge);
      if (direction === "any") {
        if (!adjacency.has(edge.toNoteId)) adjacency.set(edge.toNoteId, []);
        adjacency.get(edge.toNoteId).push({ ...edge, fromNoteId: edge.toNoteId, toNoteId: edge.fromNoteId, reversed: true });
      }
    }

    const queue = [{ noteId: fromNoteId, pathEdges: [] }];
    const visited = new Set([fromNoteId]);
    let foundEdges = null;
    while (queue.length) {
      const current = queue.shift();
      if (current.noteId === toNoteId) {
        foundEdges = current.pathEdges;
        break;
      }
      if (current.pathEdges.length >= maxDepth) continue;
      for (const edge of adjacency.get(current.noteId) || []) {
        if (visited.has(edge.toNoteId)) continue;
        visited.add(edge.toNoteId);
        queue.push({ noteId: edge.toNoteId, pathEdges: [...current.pathEdges, edge] });
      }
    }

    const pathNoteIds = foundEdges
      ? [fromNoteId, ...foundEdges.map((edge) => edge.toNoteId)]
      : [];
    const pathNodes = pathNoteIds.length
      ? db
          .prepare(
            `SELECT n.id, n.note_type, n.title, n.status, n.markdown_path, n.created_at, n.updated_at, ndm.directory_id
             FROM notes n
             LEFT JOIN note_directory_membership ndm ON ndm.note_id = n.id
             WHERE n.id IN (${pathNoteIds.map(() => "?").join(",")}) AND n.deleted_at IS NULL`
          )
          .all(...pathNoteIds)
          .map(mapNoteRow)
      : [];
    const nodeById = new Map(pathNodes.map((node) => [node.id, node]));

    return {
      fromNoteId,
      toNoteId,
      directoryId: directoryId || null,
      direction,
      maxDepth,
      found: Boolean(foundEdges),
      hops: foundEdges ? foundEdges.length : null,
      path: pathNoteIds,
      nodes: pathNoteIds.map((id) => nodeById.get(id)).filter(Boolean),
      edges: foundEdges || []
    };
  } finally {
    db.close();
  }
}

export async function detectGraphConflicts(vaultPath, input = {}) {
  if (!vaultPath) throw new Error("vaultPath is required");
  const directoryId = String(input.directoryId || "").trim();
  if (!directoryId) throw new Error("directoryId is required");
  const includeDescendants = input.includeDescendants !== false;

  const DatabaseSync = await loadDatabaseSync();
  const db = new DatabaseSync(catalogDbPath(vaultPath));
  try {
    const directory = db.prepare("SELECT id, title FROM directories WHERE id = ? LIMIT 1").get(directoryId);
    if (!directory) throw new Error(`directoryId not found: ${directoryId}`);

    const rows = includeDescendants
      ? db
          .prepare(
            `${directoryScopeClause("scope")}
             SELECT n.id, n.note_type, n.title, n.status, n.markdown_path,
                    n.created_at, n.updated_at, ndm.directory_id
             FROM note_directory_membership ndm
             JOIN scope ON scope.id = ndm.directory_id
             JOIN notes n ON n.id = ndm.note_id
             WHERE n.deleted_at IS NULL
             ORDER BY lower(n.title), n.updated_at DESC`
          )
          .all(directoryId)
      : db
          .prepare(
            `SELECT n.id, n.note_type, n.title, n.status, n.markdown_path,
                    n.created_at, n.updated_at, ndm.directory_id
             FROM note_directory_membership ndm
             JOIN notes n ON n.id = ndm.note_id
             WHERE ndm.directory_id = ? AND n.deleted_at IS NULL
             ORDER BY lower(n.title), n.updated_at DESC`
          )
          .all(directoryId);

    const groups = new Map();
    for (const row of rows) {
      const key = String(row.title || "").trim().toLowerCase();
      if (!key) continue;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(mapNoteRow(row));
    }

    const conflicts = [...groups.entries()]
      .filter(([, notes]) => notes.length > 1)
      .map(([key, notes]) => ({
        id: `conflict_duplicate_title_${key.replace(/[^a-z0-9_-]+/gi, "_").slice(0, 48)}`,
        conflictType: "duplicate_title",
        severity: "warning",
        title: `Duplicate note title: ${notes[0].title}`,
        rationale: "Multiple active notes in this graph scope use the same title, which can make wikilinks ambiguous.",
        noteIds: notes.map((note) => note.id),
        notes
      }));

    return {
      scope: includeDescendants ? "directory_tree" : "directory",
      directoryId,
      directoryTitle: directory.title,
      conflicts,
      total: conflicts.length
    };
  } finally {
    db.close();
  }
}

export async function listNotesByTag(vaultPath, tagName, options = {}) {
  if (!vaultPath) throw new Error("vaultPath is required");
  const name = normalizeTagName(tagName);
  if (!name) throw new Error("tagName is required");
  const rootDirectoryId = String(options.rootDirectoryId || "").trim();

  const DatabaseSync = await loadDatabaseSync();
  const db = new DatabaseSync(catalogDbPath(vaultPath));
  try {
    const tag = db.prepare("SELECT id, name FROM tags WHERE name = ? LIMIT 1").get(name);
    if (!tag) {
      return {
        tag: name,
        rootDirectoryId: rootDirectoryId || null,
        items: [],
        total: 0
      };
    }

    const rows = rootDirectoryId
      ? db
          .prepare(
            `WITH RECURSIVE directory_scope(id) AS (
               SELECT id FROM directories WHERE id = ?
               UNION ALL
               SELECT d.id
               FROM directories d
               JOIN directory_scope s ON d.parent_directory_id = s.id
             )
             SELECT DISTINCT n.id, n.note_type, n.title, n.status, n.markdown_path,
                    n.created_at, n.updated_at, ndm.directory_id
             FROM note_tags nt
             JOIN notes n ON n.id = nt.note_id
             JOIN note_directory_membership ndm ON ndm.note_id = n.id
             JOIN directory_scope scope ON scope.id = ndm.directory_id
             WHERE nt.tag_id = ? AND n.deleted_at IS NULL
             ORDER BY n.updated_at DESC`
          )
          .all(rootDirectoryId, tag.id)
      : db
          .prepare(
            `SELECT DISTINCT n.id, n.note_type, n.title, n.status, n.markdown_path,
                    n.created_at, n.updated_at, ndm.directory_id
             FROM note_tags nt
             JOIN notes n ON n.id = nt.note_id
             LEFT JOIN note_directory_membership ndm ON ndm.note_id = n.id
             WHERE nt.tag_id = ? AND n.deleted_at IS NULL
             ORDER BY n.updated_at DESC`
          )
          .all(tag.id);

    const items = rows.map(mapNoteRow);
    return {
      tag: tag.name,
      rootDirectoryId: rootDirectoryId || null,
      items,
      total: items.length
    };
  } finally {
    db.close();
  }
}

export async function listTags(vaultPath, options = {}) {
  if (!vaultPath) throw new Error("vaultPath is required");
  const rootDirectoryId = String(options.rootDirectoryId || "").trim();
  const query = normalizeTagName(options.query || "").toLowerCase();
  const limit = Math.max(1, Math.min(100, Number(options.limit || 20) || 20));

  const DatabaseSync = await loadDatabaseSync();
  const db = new DatabaseSync(catalogDbPath(vaultPath));
  try {
    const scopedRows = rootDirectoryId
      ? db
          .prepare(
            `WITH RECURSIVE directory_scope(id) AS (
               SELECT id FROM directories WHERE id = ?
               UNION ALL
               SELECT d.id
               FROM directories d
               JOIN directory_scope s ON d.parent_directory_id = s.id
             )
             SELECT t.id, t.name, COUNT(DISTINCT n.id) AS note_count, MAX(n.updated_at) AS last_used_at
             FROM tags t
             JOIN note_tags nt ON nt.tag_id = t.id
             JOIN notes n ON n.id = nt.note_id
             JOIN note_directory_membership ndm ON ndm.note_id = n.id
             JOIN directory_scope scope ON scope.id = ndm.directory_id
             WHERE n.deleted_at IS NULL
               AND (? = '' OR LOWER(t.name) LIKE '%' || ? || '%')
             GROUP BY t.id, t.name
             ORDER BY note_count DESC, last_used_at DESC, t.name ASC
             LIMIT ?`
          )
          .all(rootDirectoryId, query, query, limit)
      : db
          .prepare(
            `SELECT t.id, t.name, COUNT(DISTINCT n.id) AS note_count, MAX(n.updated_at) AS last_used_at
             FROM tags t
             JOIN note_tags nt ON nt.tag_id = t.id
             JOIN notes n ON n.id = nt.note_id
             WHERE n.deleted_at IS NULL
               AND (? = '' OR LOWER(t.name) LIKE '%' || ? || '%')
             GROUP BY t.id, t.name
             ORDER BY note_count DESC, last_used_at DESC, t.name ASC
             LIMIT ?`
          )
          .all(query, query, limit);

    const items = scopedRows.map((row) => ({
      id: row.id,
      name: row.name,
      noteCount: Number(row.note_count || 0),
      lastUsedAt: row.last_used_at || null
    }));

    return {
      rootDirectoryId: rootDirectoryId || null,
      query: query || "",
      items,
      total: items.length
    };
  } finally {
    db.close();
  }
}

export async function getNoteById(vaultPath, noteId) {
  if (!vaultPath) throw new Error("vaultPath is required");
  const id = String(noteId || "").trim();
  if (!id) throw new Error("noteId is required");
  const DatabaseSync = await loadDatabaseSync();
  const db = new DatabaseSync(catalogDbPath(vaultPath));
  try {
    const row = db
      .prepare(
        `SELECT n.id, n.note_type, n.title, n.status, n.markdown_path, n.created_at, n.updated_at,
                ndm.directory_id, d.fs_path AS directory_fs_path
         FROM notes n
         LEFT JOIN note_directory_membership ndm ON ndm.note_id = n.id
         LEFT JOIN directories d ON d.id = ndm.directory_id
         WHERE n.id = ? AND n.deleted_at IS NULL
         LIMIT 1`
      )
      .get(id);
    if (!row) throw new Error(`noteId not found: ${id}`);

    const markdownFullPath = path.join(path.resolve(vaultPath), row.markdown_path);
    const markdown = await fs.readFile(markdownFullPath, "utf8");
    const parsed = parseMarkdownWithFrontmatter(markdown);
    const boundaryOrCounterpoint = boundaryValueFromInput(parsed.frontmatter || {});
    const permanentMeta = row.note_type === "permanent" ? permanentMetadataFromFrontmatter(parsed.frontmatter || {}) : null;
    return attachNoteThinkingStatus({
      ...mapNoteRow(row),
      body: parsed.body,
      markdown,
      ...(permanentMeta
        ? {
            thesis: permanentMeta.thesis,
            threeLineSummary: permanentMeta.threeLineSummary,
            distillationStatus: permanentMeta.distillationStatus,
            originalityStatus: permanentMeta.originalityStatus,
            ...(permanentMeta.originalitySimilarity !== null
              ? { originalitySimilarity: permanentMeta.originalitySimilarity }
              : {}),
            authorship: permanentMeta.authorship
          }
        : {}),
      ...(boundaryOrCounterpoint ? { boundaryOrCounterpoint } : {})
    });
  } finally {
    db.close();
  }
}

export async function saveNoteAsset(vaultPath, noteId, input = {}) {
  if (!vaultPath) throw new Error("vaultPath is required");
  const id = String(noteId || "").trim();
  if (!id) throw new Error("noteId is required");

  const contentBase64 = String(input.contentBase64 || input.base64 || "").trim();
  if (!contentBase64) throw new Error("contentBase64 is required");

  const assetKind = normalizeAssetKind(input.kind, input.fileName, input.mimeType);
  const mimeType = String(input.mimeType || "").trim().toLowerCase() || "application/octet-stream";
  const normalizedFileName = normalizeAssetFileName(input.fileName, mimeType, assetKind);
  const buffer = Buffer.from(contentBase64, "base64");
  if (!buffer.length) throw new Error("asset content is empty");

  const root = path.resolve(vaultPath);
  const DatabaseSync = await loadDatabaseSync();
  const db = new DatabaseSync(catalogDbPath(vaultPath));
  try {
    const row = db
      .prepare(
        `SELECT markdown_path
         FROM notes
         WHERE id = ? AND deleted_at IS NULL
         LIMIT 1`
      )
      .get(id);
    if (!row) throw new Error(`noteId not found: ${id}`);

    const bucket = assetKind === "image" ? "images" : "files";
    const assetDirectory = path.join(root, "assets", bucket, id);
    await fs.mkdir(assetDirectory, { recursive: true });
    const assetAbsolutePath = await resolveUniqueAssetPath(assetDirectory, normalizedFileName);
    await fs.writeFile(assetAbsolutePath, buffer);

    const assetPath = path.relative(root, assetAbsolutePath).replaceAll("\\", "/");
    const markdownLinkPath = relativeMarkdownLinkPath(row.markdown_path, assetPath);
    return {
      noteId: id,
      assetKind,
      mimeType,
      fileName: path.basename(assetAbsolutePath),
      assetPath,
      markdownLinkPath,
      size: buffer.length,
      createdAt: new Date().toISOString()
    };
  } finally {
    db.close();
  }
}

export async function createNoteRelation(vaultPath, fromNoteIdOrInput, input = {}) {
  if (!vaultPath) throw new Error("vaultPath is required");
  const relationInput =
    fromNoteIdOrInput && typeof fromNoteIdOrInput === "object" && !Array.isArray(fromNoteIdOrInput)
      ? fromNoteIdOrInput
      : input;
  const fromNoteId =
    fromNoteIdOrInput && typeof fromNoteIdOrInput === "object" && !Array.isArray(fromNoteIdOrInput)
      ? relationInput.fromNoteId ?? relationInput.from_note_id
      : fromNoteIdOrInput;
  const payload = normalizeRelationPayload(relationInput, { fromNoteId });
  const now = new Date().toISOString();
  const relationId = String(input.id || `lnk_${randomUUID().slice(0, 8)}`).trim();

  const DatabaseSync = await loadDatabaseSync();
  const db = new DatabaseSync(catalogDbPath(vaultPath));
  try {
    assertNoteExistsForRelation(db, payload.fromNoteId, "fromNoteId");
    assertNoteExistsForRelation(db, payload.toNoteId, "toNoteId");

    const duplicate = db
      .prepare(
        `SELECT id FROM links
         WHERE from_note_id = ? AND to_note_id = ? AND relation_type = ?
         LIMIT 1`
      )
      .get(payload.fromNoteId, payload.toNoteId, payload.relationType);
    if (duplicate) {
      return {
        ...mapRelationLinkRow(getRelationByIdRow(db, duplicate.id)),
        created: false
      };
    }

    db.prepare(
      `INSERT INTO links
       (id, from_note_id, to_note_id, relation_type, rationale, insight_question, rationale_quality_score,
        rationale_quality_level, created_by, confidence, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      relationId,
      payload.fromNoteId,
      payload.toNoteId,
      payload.relationType,
      payload.rationale,
      payload.insightQuestion,
      payload.rationaleQuality.score,
      payload.rationaleQuality.level,
      payload.createdBy,
      payload.confidence,
      payload.status,
      now,
      now
    );

    return {
      ...mapRelationLinkRow(getRelationByIdRow(db, relationId)),
      created: true
    };
  } finally {
    db.close();
  }
}

export async function updateNoteRelation(vaultPath, relationId, input = {}) {
  if (!vaultPath) throw new Error("vaultPath is required");
  const id = String(relationId || "").trim();
  if (!id) throw new Error("relationId is required");

  const DatabaseSync = await loadDatabaseSync();
  const db = new DatabaseSync(catalogDbPath(vaultPath));
  try {
    const existing = getRelationByIdRow(db, id);
    if (!existing) throw noteValidationError("RELATION_NOT_FOUND", `relationId not found: ${id}`, { relationId: id });

    const relationType =
      input.relationType !== undefined || input.relation_type !== undefined
        ? normalizeRelationType(input.relationType ?? input.relation_type)
        : existing.relation_type;
    const rationale =
      input.rationale !== undefined ? String(input.rationale || "").trim() : String(existing.rationale || "").trim();
    const insightQuestion =
      input.insightQuestion !== undefined || input.insight_question !== undefined
        ? String(input.insightQuestion ?? input.insight_question ?? "").trim() || null
        : existing.insight_question || null;
    const status = input.status !== undefined ? normalizeRelationStatus(input.status, existing.created_by) : existing.status || "confirmed";
    const confidence =
      input.confidence === undefined
        ? existing.confidence
        : input.confidence === null || input.confidence === ""
          ? null
          : Math.max(0, Math.min(1, Number(input.confidence)));

    if (!rationale) throw noteValidationError("RELATION_RATIONALE_REQUIRED", "rationale is required.");
    if (confidence !== null && !Number.isFinite(confidence)) {
      throw noteValidationError("RELATION_CONFIDENCE_INVALID", "confidence must be a number between 0 and 1.");
    }
    const rationaleQuality = evaluateRelationRationaleQuality(rationale, insightQuestion);

    if (relationType !== existing.relation_type) {
      const duplicate = db
        .prepare(
          `SELECT id FROM links
           WHERE from_note_id = ? AND to_note_id = ? AND relation_type = ? AND id != ?
           LIMIT 1`
        )
        .get(existing.from_note_id, existing.to_note_id, relationType, id);
      if (duplicate) {
        throw noteValidationError("RELATION_DUPLICATE", "A relation of this type already exists between these notes.", {
          relationId: duplicate.id,
          fromNoteId: existing.from_note_id,
          toNoteId: existing.to_note_id,
          relationType
        });
      }
    }

    const now = new Date().toISOString();
    db.prepare(
      `UPDATE links
       SET relation_type = ?, rationale = ?, insight_question = ?, rationale_quality_score = ?,
           rationale_quality_level = ?, status = ?, confidence = ?, updated_at = ?
       WHERE id = ?`
    ).run(relationType, rationale, insightQuestion, rationaleQuality.score, rationaleQuality.level, status, confidence, now, id);

    return mapRelationLinkRow(getRelationByIdRow(db, id));
  } finally {
    db.close();
  }
}

export async function deleteNoteRelation(vaultPath, relationId) {
  if (!vaultPath) throw new Error("vaultPath is required");
  const id = String(relationId || "").trim();
  if (!id) throw new Error("relationId is required");

  const DatabaseSync = await loadDatabaseSync();
  const db = new DatabaseSync(catalogDbPath(vaultPath));
  try {
    const existing = getRelationByIdRow(db, id);
    if (!existing) throw noteValidationError("RELATION_NOT_FOUND", `relationId not found: ${id}`, { relationId: id });
    db.prepare("DELETE FROM links WHERE id = ?").run(id);
    return { ok: true, deleted: true, relationId: id, item: mapRelationLinkRow(existing) };
  } finally {
    db.close();
  }
}

export async function listNoteRelations(vaultPath, noteId) {
  if (!vaultPath) throw new Error("vaultPath is required");
  const id = String(noteId || "").trim();
  if (!id) throw new Error("noteId is required");

  const DatabaseSync = await loadDatabaseSync();
  const db = new DatabaseSync(catalogDbPath(vaultPath));
  try {
    const note = db.prepare("SELECT id FROM notes WHERE id = ? AND deleted_at IS NULL LIMIT 1").get(id);
    if (!note) throw new Error(`noteId not found: ${id}`);

    const tags = db
      .prepare(
        `SELECT t.id, t.name, nt.source, nt.created_at
         FROM note_tags nt
         JOIN tags t ON t.id = nt.tag_id
         WHERE nt.note_id = ?
         ORDER BY t.name ASC`
      )
      .all(id)
      .map((row) => ({
        id: row.id,
        name: row.name,
        source: row.source,
        createdAt: row.created_at
      }));

    const outgoingLinks = db
      .prepare(
        `SELECT l.*, n.id AS target_id, n.note_type AS target_note_type, n.title AS target_title,
                n.status AS target_status, n.markdown_path AS target_markdown_path,
                NULL AS source_id, NULL AS source_note_type, NULL AS source_title,
                NULL AS source_status, NULL AS source_markdown_path
         FROM links l
         JOIN notes n ON n.id = l.to_note_id
         WHERE l.from_note_id = ? AND n.deleted_at IS NULL
         ORDER BY l.created_at DESC`
      )
      .all(id)
      .map(mapRelationLinkRow);

    const backlinks = db
      .prepare(
        `SELECT l.*, NULL AS target_id, NULL AS target_note_type, NULL AS target_title,
                NULL AS target_status, NULL AS target_markdown_path,
                n.id AS source_id, n.note_type AS source_note_type, n.title AS source_title,
                n.status AS source_status, n.markdown_path AS source_markdown_path
         FROM links l
         JOIN notes n ON n.id = l.from_note_id
         WHERE l.to_note_id = ? AND n.deleted_at IS NULL
         ORDER BY l.created_at DESC`
      )
      .all(id)
      .map(mapRelationLinkRow);

    return {
      noteId: id,
      tags,
      outgoingLinks,
      backlinks
    };
  } finally {
    db.close();
  }
}

export async function updateNoteContent(vaultPath, noteId, input = {}) {
  if (!vaultPath) throw new Error("vaultPath is required");
  const id = String(noteId || "").trim();
  if (!id) throw new Error("noteId is required");
  const DatabaseSync = await loadDatabaseSync();
  const db = new DatabaseSync(catalogDbPath(vaultPath));
  try {
    const row = db
      .prepare(
        `SELECT n.id, n.note_type, n.title, n.status, n.markdown_path, n.created_at, n.updated_at,
                ndm.directory_id, d.fs_path AS directory_fs_path
         FROM notes n
         LEFT JOIN note_directory_membership ndm ON ndm.note_id = n.id
         LEFT JOIN directories d ON d.id = ndm.directory_id
         WHERE n.id = ? AND n.deleted_at IS NULL
         LIMIT 1`
      )
      .get(id);
    if (!row) throw new Error(`noteId not found: ${id}`);

    const currentMarkdownPath = path.join(path.resolve(vaultPath), row.markdown_path);
    const currentMarkdown = await fs.readFile(currentMarkdownPath, "utf8");
    const currentParsed = parseMarkdownWithFrontmatter(currentMarkdown);
    const preservedFrontmatter = currentParsed.frontmatter && typeof currentParsed.frontmatter === "object" ? { ...currentParsed.frontmatter } : {};
    const requestedStatus = String(input.status || row.status || "draft");
    const normalized = normalizeMarkdown(
      input.title === undefined ? row.title : input.title,
      input.body === undefined ? currentParsed.body : input.body
    );
    assertLiteratureCompletionAllowed(row.note_type, requestedStatus, normalized.markdownBody);
    const now = new Date().toISOString();
    const permanentMeta = row.note_type === "permanent" ? permanentMetadataFromInput(input, preservedFrontmatter) : null;
    assertConfirmedDistillationAllowed(row.note_type, input, permanentMeta);
    let status = requestedStatus;
    if (row.note_type === "permanent") {
      const originality = await evaluatePermanentOriginality(db, vaultPath, row.id, normalized.markdownBody);
      if (originality) {
        permanentMeta.originalityStatus = originality.status;
        permanentMeta.originalitySimilarity = originality.similarity;
        if (originality.status === "blocked") {
          throw noteValidationError(
            "PERMANENT_ORIGINALITY_BLOCKED",
            "Permanent note save blocked: rewrite this note in your own words before saving.",
            {
              noteType: row.note_type,
              requestedStatus,
              originality
            }
          );
        }
      }
      status = resolvePermanentSaveStatus(
        status,
        originality || { status: permanentMeta.originalityStatus, similarity: permanentMeta.originalitySimilarity },
        permanentMeta.authorship
      );
    }
    const nextFrontmatter = {
      ...preservedFrontmatter,
      id: row.id,
      note_type: row.note_type,
      title: normalized.title,
      status,
      created_at: row.created_at,
      updated_at: now
    };
    delete nextFrontmatter.boundaryOrCounterpoint;
    delete nextFrontmatter.threeLineSummary;
    delete nextFrontmatter.distillationStatus;
    if (row.note_type === "permanent") {
      const boundaryOrCounterpoint = boundaryValueFromInput(input, preservedFrontmatter.boundary_or_counterpoint || preservedFrontmatter.boundaryOrCounterpoint);
      if (boundaryOrCounterpoint) nextFrontmatter.boundary_or_counterpoint = boundaryOrCounterpoint;
      else delete nextFrontmatter.boundary_or_counterpoint;
      nextFrontmatter.originality_status = permanentMeta.originalityStatus;
      if (permanentMeta.originalitySimilarity !== null) nextFrontmatter.originality_similarity = permanentMeta.originalitySimilarity;
      else delete nextFrontmatter.originality_similarity;
      nextFrontmatter.authorship = permanentMeta.authorship;
      if (permanentMeta.thesis) nextFrontmatter.thesis = permanentMeta.thesis;
      else delete nextFrontmatter.thesis;
      if (permanentMeta.threeLineSummary.length) nextFrontmatter.three_line_summary = permanentMeta.threeLineSummary;
      else delete nextFrontmatter.three_line_summary;
      if (permanentMeta.distillationStatus !== "missing" || permanentMeta.thesis || permanentMeta.threeLineSummary.length) {
        nextFrontmatter.distillation_status = permanentMeta.distillationStatus;
      } else {
        delete nextFrontmatter.distillation_status;
      }
    } else {
      delete nextFrontmatter.boundary_or_counterpoint;
    }
    const markdown = serializeMarkdownWithFrontmatter(nextFrontmatter, normalized.markdownBody);
    const nextMarkdownPath = await resolveUniqueMarkdownPath(row.directory_fs_path, normalized.title, {
      fallbackStem: row.id,
      excludePath: currentMarkdownPath
    });
    const hasRenamedFile = path.resolve(nextMarkdownPath) !== path.resolve(currentMarkdownPath);
    let activeMarkdownPath = currentMarkdownPath;
    try {
      if (hasRenamedFile) {
        await fs.mkdir(path.dirname(nextMarkdownPath), { recursive: true });
        await fs.rename(currentMarkdownPath, nextMarkdownPath);
        activeMarkdownPath = nextMarkdownPath;
      }
      await fs.writeFile(activeMarkdownPath, markdown, "utf8");
    } catch (error) {
      if (hasRenamedFile) {
        try {
          if (await fileExists(activeMarkdownPath)) await fs.rename(activeMarkdownPath, currentMarkdownPath);
        } catch {}
      } else {
        try {
          await fs.writeFile(currentMarkdownPath, currentMarkdown, "utf8");
        } catch {}
      }
      throw error;
    }
    const nextRelPath = path.relative(path.resolve(vaultPath), activeMarkdownPath).replaceAll("\\", "/");
    db.exec("BEGIN IMMEDIATE;");
    try {
      db.prepare("UPDATE notes SET title = ?, status = ?, markdown_path = ?, updated_at = ? WHERE id = ?").run(
        normalized.title,
        status,
        nextRelPath,
        now,
        row.id
      );
      ensureSingleDirectoryMembership(db, row.id, row.directory_id);
      syncMarkdownRelations(db, row.id, normalized.markdownBody);
      db.exec("COMMIT;");
    } catch (error) {
      db.exec("ROLLBACK;");
      try {
        await fs.writeFile(activeMarkdownPath, currentMarkdown, "utf8");
        if (hasRenamedFile && (await fileExists(activeMarkdownPath))) {
          await fs.rename(activeMarkdownPath, currentMarkdownPath);
        }
      } catch {}
      throw error;
    }

    const refreshed = db
      .prepare(
        `SELECT n.id, n.note_type, n.title, n.status, n.markdown_path, n.created_at, n.updated_at,
                ndm.directory_id, d.fs_path AS directory_fs_path
         FROM notes n
         LEFT JOIN note_directory_membership ndm ON ndm.note_id = n.id
         LEFT JOIN directories d ON d.id = ndm.directory_id
         WHERE n.id = ?
         LIMIT 1`
      )
      .get(row.id);
    return attachNoteThinkingStatus({
      ...mapNoteRow(refreshed),
      body: normalized.markdownBody,
      markdown,
      ...(row.note_type === "permanent"
        ? {
            thesis: permanentMeta.thesis,
            threeLineSummary: permanentMeta.threeLineSummary,
            distillationStatus: permanentMeta.distillationStatus,
            originalityStatus: permanentMeta.originalityStatus,
            ...(permanentMeta.originalitySimilarity !== null
              ? { originalitySimilarity: permanentMeta.originalitySimilarity }
              : {}),
            authorship: permanentMeta.authorship
          }
        : {}),
      ...(nextFrontmatter.boundary_or_counterpoint ? { boundaryOrCounterpoint: nextFrontmatter.boundary_or_counterpoint } : {})
    });
  } finally {
    db.close();
  }
}

export async function moveNoteToDirectory(vaultPath, noteId, directoryId) {
  if (!vaultPath) throw new Error("vaultPath is required");
  const id = String(noteId || "").trim();
  const targetDirectoryId = String(directoryId || "").trim();
  if (!id) throw new Error("noteId is required");
  if (!targetDirectoryId) throw new Error("directoryId is required");

  const DatabaseSync = await loadDatabaseSync();
  const db = new DatabaseSync(catalogDbPath(vaultPath));
  try {
    const row = db
      .prepare(
        `SELECT n.id, n.note_type, n.title, n.status, n.markdown_path, n.created_at, n.updated_at, ndm.directory_id
         FROM notes n
         LEFT JOIN note_directory_membership ndm ON ndm.note_id = n.id
         WHERE n.id = ? AND n.deleted_at IS NULL
         LIMIT 1`
      )
      .get(id);
    if (!row) throw new Error(`noteId not found: ${id}`);

    const targetDir = db
      .prepare("SELECT id, fs_path FROM directories WHERE id = ? LIMIT 1")
      .get(targetDirectoryId);
    if (!targetDir) throw new Error(`directoryId not found: ${targetDirectoryId}`);

    if (row.directory_id === targetDirectoryId) {
      return mapNoteRow({ ...row, directory_id: targetDirectoryId });
    }

    const oldAbsPath = path.join(path.resolve(vaultPath), row.markdown_path);
    const newAbsPath = await resolveUniqueMarkdownPath(targetDir.fs_path, row.title, {
      fallbackStem: row.id
    });
    await fs.mkdir(path.dirname(newAbsPath), { recursive: true });
    await fs.rename(oldAbsPath, newAbsPath);
    const relPath = path.relative(path.resolve(vaultPath), newAbsPath).replaceAll("\\", "/");
    const now = new Date().toISOString();

    db.exec("BEGIN IMMEDIATE;");
    try {
      await rewriteAssetLinksInMarkdownFile(newAbsPath, row.markdown_path, relPath, now);
      db.prepare("UPDATE notes SET markdown_path = ?, updated_at = ? WHERE id = ?").run(relPath, now, id);
      ensureSingleDirectoryMembership(db, id, targetDirectoryId);
      db.exec("COMMIT;");
    } catch (error) {
      db.exec("ROLLBACK;");
      try {
        await fs.rename(newAbsPath, oldAbsPath);
      } catch {}
      throw error;
    }

    const refreshed = db
      .prepare(
        `SELECT n.id, n.note_type, n.title, n.status, n.markdown_path, n.created_at, n.updated_at, ndm.directory_id
         FROM notes n
         LEFT JOIN note_directory_membership ndm ON ndm.note_id = n.id
         WHERE n.id = ? AND n.deleted_at IS NULL
         LIMIT 1`
      )
      .get(id);
    return mapNoteRow(refreshed);
  } finally {
    db.close();
  }
}

export async function deleteNoteById(vaultPath, noteId) {
  if (!vaultPath) throw new Error("vaultPath is required");
  const id = String(noteId || "").trim();
  if (!id) throw new Error("noteId is required");

  const DatabaseSync = await loadDatabaseSync();
  const db = new DatabaseSync(catalogDbPath(vaultPath));
  try {
    const row = db
      .prepare("SELECT id, markdown_path, deleted_at FROM notes WHERE id = ? LIMIT 1")
      .get(id);
    if (!row) throw new Error(`noteId not found: ${id}`);
    if (row.deleted_at) return { id, deleted: true };

    const absPath = path.join(path.resolve(vaultPath), row.markdown_path);
    try {
      await fs.unlink(absPath);
    } catch {}
    const now = new Date().toISOString();
    db.prepare("UPDATE notes SET deleted_at = ?, updated_at = ? WHERE id = ?").run(now, now, id);
    db.prepare("DELETE FROM note_directory_membership WHERE note_id = ?").run(id);
    return { id, deleted: true };
  } finally {
    db.close();
  }
}
