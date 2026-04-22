import path from "node:path";
import fs from "node:fs/promises";
import { createHash } from "node:crypto";
import { listMarkdownFiles, parseMarkdownWithFrontmatter } from "../../domain/src/index.mjs";
import { extractTags, parseWikilinks } from "./markdown-importer.mjs";

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
    try {
      raw = await fs.readFile(file, "utf8");
    } catch (error) {
      warnings.push(
        warningFromError("IMPORT_MARKDOWN_FILE_UNREADABLE", "Markdown file could not be read and was skipped.", error, {
          path: file
        })
      );
      continue;
    }

    const fmWarning = frontmatterWarning(raw, file);
    if (fmWarning) warnings.push(fmWarning);

    const { frontmatter, body } = parseMarkdownWithFrontmatter(raw);
    const rawFrontmatter = extractRawFrontmatter(raw);
    const title = String(frontmatter.title || path.basename(file, ".md")).trim();
    const sourceId = stableId("src", `${connector}:${file}`);
    const literatureId = stableId("ln", `${connector}:${file}`);
    const permanentId = stableId("pn", `${connector}:${file}`);
    const tags = unique([...toArray(frontmatter.tags), ...extractTags(body)]);
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
