import path from "node:path";
import fs from "node:fs/promises";
import { createHash } from "node:crypto";
import { listMarkdownFiles, parseMarkdownWithFrontmatter } from "../../domain/src/index.mjs";
import { extractTags, parseWikilinks } from "./markdown-importer.mjs";

const UTF8_DECODER = new TextDecoder("utf-8", { fatal: true });
const GB18030_DECODER = new TextDecoder("gb18030");

function stableId(prefix, input) {
  const hash = createHash("sha1").update(String(input)).digest("hex").slice(0, 12);
  return `${prefix}_${hash}`;
}

function toArray(value) {
  if (Array.isArray(value)) return value.map((x) => String(x).trim().replace(/^["']|["']$/g, "")).filter(Boolean);
  if (typeof value === "string") {
    return value
      .split(",")
      .map((x) => x.trim().replace(/^["']|["']$/g, ""))
      .filter(Boolean);
  }
  return [];
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function normalizeTag(value) {
  return String(value || "").trim().replace(/^#+/, "").trim();
}

function normalizeTags(values = []) {
  return unique((Array.isArray(values) ? values : []).map(normalizeTag));
}

function normalizeSectionText(value = "") {
  return String(value || "")
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function stripListMarker(value = "") {
  return String(value || "")
    .replace(/^\s*[-*+]\s+/, "")
    .replace(/^\s*\d+[.)、]\s+/, "")
    .trim();
}

function splitMarkdownSections(markdown = "") {
  const sections = [];
  let current = { heading: "", content: [] };
  for (const line of String(markdown || "").replace(/\r\n/g, "\n").split("\n")) {
    const heading = line.match(/^#{2,4}\s+(.+?)\s*$/);
    if (heading) {
      if (current.heading || current.content.length) sections.push(current);
      current = { heading: heading[1].trim(), content: [] };
      continue;
    }
    current.content.push(line);
  }
  if (current.heading || current.content.length) sections.push(current);
  return sections;
}

function findSection(sections = [], patterns = []) {
  return sections.find((section) => patterns.some((pattern) => pattern.test(String(section.heading || "")))) || null;
}

function firstContentLine(section = null) {
  if (!section) return "";
  return stripListMarker((section.content || []).find((line) => String(line || "").trim()) || "");
}

function sectionLines(section = null, limit = 3) {
  if (!section) return [];
  return (section.content || [])
    .map(stripListMarker)
    .filter(Boolean)
    .slice(0, limit);
}

function parsePermanentDistillationFields(markdown = "", frontmatter = {}) {
  const sections = splitMarkdownSections(markdown);
  const thesisSection = findSection(sections, [/一句话论点/, /中心判断/, /核心观点/, /主张/]);
  const summarySection = findSection(sections, [/三句话(压缩|摘要)/, /摘要/]);
  const boundarySection = findSection(sections, [/边界/, /反例/, /限制/]);
  const sourceSection = findSection(sections, [/来源追溯/, /来源/, /出处/]);
  const thesis = String(frontmatter.thesis || firstContentLine(thesisSection) || "").trim();
  const summaryLines = Array.isArray(frontmatter.three_line_summary)
    ? frontmatter.three_line_summary.map((item) => String(item || "").trim()).filter(Boolean).slice(0, 3)
    : sectionLines(summarySection, 3);
  const threeLineSummary = summaryLines.length === 3 ? summaryLines : [];
  const boundaryOrCounterpoint = String(frontmatter.boundary_or_counterpoint || firstContentLine(boundarySection) || "").trim();
  const sourceTrace = normalizeSectionText(sourceSection ? sourceSection.content.join("\n") : "");
  const explicitStatus = String(frontmatter.distillation_status || "").trim().toLowerCase();
  const distillationStatus = explicitStatus === "confirmed"
    ? "confirmed"
    : thesis || summaryLines.length || boundaryOrCounterpoint || sourceTrace
      ? "draft"
      : "missing";
  return {
    thesis,
    threeLineSummary,
    boundaryOrCounterpoint,
    sourceTrace,
    distillationStatus
  };
}

function extractRawFrontmatter(markdown) {
  const normalized = String(markdown ?? "").replace(/^\uFEFF/, "");
  const opening = normalized.match(/^---\r?\n/);
  if (!opening) return "";
  const closing = normalized.indexOf("\n---", opening[0].length);
  if (closing < 0) return "";
  return normalized.slice(opening[0].length, closing).trim();
}

function frontmatterWarning(markdown, file) {
  const normalized = String(markdown ?? "").replace(/^\uFEFF/, "");
  const opening = normalized.match(/^---\r?\n/);
  if (!opening) return null;

  const afterOpening = normalized.slice(opening[0].length);
  if (!/\r?\n---(?:\r?\n|$)/.test(afterOpening)) {
    return {
      code: "IMPORT_MALFORMED_FRONTMATTER",
      message: "Markdown frontmatter starts with --- but has no closing boundary.",
      count: 1,
      path: file
    };
  }
  return null;
}

function extractFrontmatterList(rawFrontmatter, key) {
  const lines = String(rawFrontmatter || "").split(/\r?\n/);
  const values = [];

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const match = line.match(new RegExp(`^\\s*${key}\\s*:\\s*(.*)$`, "i"));
    if (!match) continue;

    const inlineValue = match[1].trim();
    if (inlineValue) return toArray(inlineValue.replace(/^\[|\]$/g, ""));

    for (let j = i + 1; j < lines.length; j += 1) {
      const item = lines[j].match(/^\s*-\s*(.+?)\s*$/);
      if (item) {
        values.push(item[1].replace(/^["']|["']$/g, "").trim());
        continue;
      }
      if (lines[j].trim()) break;
    }
    break;
  }

  return values.filter(Boolean);
}

function extractAliases(frontmatter, rawFrontmatter) {
  return unique([
    ...toArray(frontmatter.aliases),
    ...toArray(frontmatter.alias),
    ...extractFrontmatterList(rawFrontmatter, "aliases"),
    ...extractFrontmatterList(rawFrontmatter, "alias")
  ]);
}

async function collectMarkdownFiles(inputPath, cwd) {
  const abs = path.isAbsolute(inputPath) ? inputPath : path.resolve(cwd, inputPath);
  return listMarkdownFiles(abs);
}

function warningFromError(code, message, error, details = {}) {
  return {
    code,
    message,
    count: 1,
    ...details,
    reason: String(error?.message || error)
  };
}

function hasHanText(value = "") {
  return /[\p{Script=Han}]/u.test(String(value || ""));
}

function looksStructuredMarkdown(value = "") {
  return /(^---\r?\n|(^|\n)(title|tags|aliases|alias|type)\s*:|(^|\n)#\s|\[\[)/m.test(String(value || ""));
}

function hasSuspiciousControlText(value = "") {
  return /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(String(value || ""));
}

function decodeMarkdownBuffer(buffer) {
  const bytes = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer || "");
  try {
    return {
      text: UTF8_DECODER.decode(bytes),
      encoding: "utf8"
    };
  } catch {
    const gb18030Text = GB18030_DECODER.decode(bytes);
    // GB18030 fallback is only trusted for notes that clearly contain CJK text.
    // Requiring frontmatter/heading structure drops valid plain-body notes.
    if (hasHanText(gb18030Text) && !hasSuspiciousControlText(gb18030Text)) {
      return {
        text: gb18030Text,
        encoding: "gb18030"
      };
    }
    return {
      text: "",
      encoding: "unsupported",
      attemptedEncoding: "gb18030"
    };
  }
}

function normalizeImportedTitle(value, fallback = "") {
  const raw = String(value || fallback || "").replace(/^\uFEFF/, "");
  const normalized = raw
    .replace(/\\r\\n|\\n|\\r/g, " ")
    .replace(/[\r\n]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return {
    raw,
    value: normalized || String(fallback || "").trim()
  };
}

function firstMarkdownHeading(markdown = "") {
  const match = String(markdown || "").match(/^\s*#\s+(.+?)\s*$/m);
  return match ? match[1].trim() : "";
}

function titleNormalizationWarning(file, rawTitle, normalizedTitle) {
  if (!rawTitle || rawTitle === normalizedTitle) return null;
  return {
    code: "IMPORT_TITLE_NORMALIZED",
    message: "Imported markdown title was normalized to a single line before preview.",
    count: 1,
    path: file,
    rawTitle,
    normalizedTitle
  };
}

function decodeFallbackWarning(file, encoding) {
  if (encoding === "utf8") return null;
  if (encoding === "unsupported") {
    return {
      code: "IMPORT_MARKDOWN_ENCODING_UNSUPPORTED",
      message: "Markdown file is not valid UTF-8 and could not be safely decoded as GB18030, so it was skipped to avoid corrupt import.",
      count: 1,
      path: file,
      encoding
    };
  }
  return {
    code: "IMPORT_NON_UTF8_MARKDOWN_DECODED",
    message: "Markdown file was decoded as GB18030 instead of UTF-8. Please confirm imported Chinese text in preview.",
    count: 1,
    path: file,
    encoding
  };
}

function suspiciousCorruptionWarning(file, { title = "", body = "" } = {}) {
  const sample = `${String(title || "")}\n${String(body || "")}`;
  const replacementCount = (sample.match(/\uFFFD/g) || []).length;
  const questionRunCount = (sample.match(/\?{4,}/g) || []).length;
  if (!replacementCount && !questionRunCount) return null;
  return {
    code: "IMPORT_TEXT_SUSPECT_CORRUPTION",
    message: "Imported markdown text looks corrupted. Please verify the source file encoding or content before confirming import.",
    count: 1,
    path: file,
    replacementCount,
    questionRunCount
  };
}

export async function buildMarkdownCandidates({ connector, payload = {}, options = {}, cwd = process.cwd() }) {
  if (connector !== "markdown" && connector !== "obsidian") {
    throw new Error("connector must be markdown/obsidian");
  }

  const inputPath = String(payload.path || "").trim();
  if (!inputPath) throw new Error("payload.path is required for markdown/obsidian");

  const sources = [];
  const literature = [];
  const permanent = [];
  const warnings = [];
  let files = [];

  try {
    files = await collectMarkdownFiles(inputPath, cwd);
  } catch (error) {
    warnings.push(
      warningFromError("IMPORT_SOURCE_UNREADABLE", "Markdown import path could not be read.", error, {
        path: inputPath
      })
    );
    return { sources, literature, permanent, warnings };
  }

  for (const file of files) {
    let raw;
    let decoded;
    try {
      raw = await fs.readFile(file);
      decoded = decodeMarkdownBuffer(raw);
    } catch (error) {
      warnings.push(
        warningFromError("IMPORT_MARKDOWN_FILE_UNREADABLE", "Markdown file could not be read and was skipped.", error, {
          path: file
        })
      );
      continue;
    }

    if (decoded?.encoding) {
      const decodeWarning = decodeFallbackWarning(file, decoded.encoding);
      if (decodeWarning) warnings.push(decodeWarning);
    }
    if (decoded?.encoding === "unsupported") continue;

    const rawText = decoded?.text || "";
    const fmWarning = frontmatterWarning(rawText, file);
    if (fmWarning) warnings.push(fmWarning);

    const { frontmatter, body } = parseMarkdownWithFrontmatter(rawText);
    const rawFrontmatter = extractRawFrontmatter(rawText);
    const titleFallback = firstMarkdownHeading(body) || path.basename(file, ".md");
    const normalizedTitle = normalizeImportedTitle(frontmatter.title, titleFallback);
    const title = normalizedTitle.value;
    const titleWarning = titleNormalizationWarning(file, normalizedTitle.raw, normalizedTitle.value);
    if (titleWarning) warnings.push(titleWarning);
    const corruptionWarning = suspiciousCorruptionWarning(file, { title, body });
    if (corruptionWarning) warnings.push(corruptionWarning);
    const sourceId = stableId("src", `${connector}:${file}`);
    const literatureId = stableId("ln", `${connector}:${file}`);
    const permanentId = stableId("pn", `${connector}:${file}`);
    const tags = normalizeTags([...toArray(frontmatter.tags), ...extractTags(body)]);
    const aliases = extractAliases(frontmatter, rawFrontmatter);
    const parsedWikilinks = options.detectWikilinks === false ? [] : parseWikilinks(body);
    const wikilinkTargets = unique(parsedWikilinks.map((link) => link.target));
    const now = new Date().toISOString();

    sources.push({
      id: sourceId,
      source_type: "markdown",
      title,
      description: "",
      tags,
      url_or_path: file,
      imported_from: connector === "obsidian" ? "obsidian" : "local",
      created_at: now,
      updated_at: now,
      connector,
      aliases,
      original_frontmatter: frontmatter
    });

    literature.push({
      id: literatureId,
      source_id: sourceId,
      title,
      quote_text: body.trim(),
      paraphrase_text: "",
      status: "draft",
      tags,
      imported_from: connector === "obsidian" ? "obsidian" : "local",
      created_at: now,
      updated_at: now,
      connector,
      aliases,
      wikilinks: parsedWikilinks.map((link) => link.raw),
      parsed_wikilinks: parsedWikilinks,
      wikilink_targets: wikilinkTargets,
      original_frontmatter: frontmatter
    });

    const isPermanent = String(frontmatter.type || "").toLowerCase() === "permanent" || tags.includes("permanent");
    if (isPermanent) {
      const distillation = parsePermanentDistillationFields(body, frontmatter);
      const sourceTrace = distillation.sourceTrace || file;
      permanent.push({
        id: permanentId,
        title,
        core_claim: body.trim(),
        rationale: "",
        from_literature_note_ids: [literatureId],
        authorship: { user_confirmed: false, ai_assisted: false },
        originality_status: "warning",
        status: "draft",
        tags,
        citations: [{ source_id: sourceId }],
        ...(distillation.thesis ? { thesis: distillation.thesis } : {}),
        ...(distillation.threeLineSummary.length ? { three_line_summary: distillation.threeLineSummary } : {}),
        ...(distillation.boundaryOrCounterpoint ? { boundary_or_counterpoint: distillation.boundaryOrCounterpoint } : {}),
        ...(sourceTrace ? { source_trace: sourceTrace } : {}),
        distillation_status: distillation.distillationStatus,
        created_at: now,
        updated_at: now,
        connector,
        candidate_only: true
      });
    }
  }

  if (!files.length) {
    warnings.push({ code: "IMPORT_NO_MARKDOWN_FILE", message: "No markdown files found", count: 1 });
  }
  return { sources, literature, permanent, warnings };
}
