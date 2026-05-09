import { parseLinks, parseTags, rootBoxIdFromFolder, typeFromFolder } from "./prototype-store.js";
import { assetPreviewUrl, checkOriginality, fetchNotesByTag, listTags, uploadNoteAsset } from "./prototype-api.js";

function saveIconMarkup(kind = "idle") {
  if (kind === "saving") {
    return `
      <svg class="tb-svg" viewBox="0 0 16 16" aria-hidden="true">
        <circle cx="8" cy="8" r="1.1" fill="currentColor"/>
        <circle cx="3.75" cy="8" r="1.1" fill="currentColor" opacity=".72"/>
        <circle cx="12.25" cy="8" r="1.1" fill="currentColor" opacity=".72"/>
      </svg>
    `;
  }
  if (kind === "error") {
    return `
      <svg class="tb-svg" viewBox="0 0 16 16" aria-hidden="true">
        <path d="M8 3.1v5.3M8 11.45h.01" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
        <circle cx="8" cy="8" r="5.6" fill="none" stroke="currentColor" stroke-width="1.2"/>
      </svg>
    `;
  }
  if (kind === "blocked") {
    return `
      <svg class="tb-svg" viewBox="0 0 16 16" aria-hidden="true">
        <circle cx="8" cy="8" r="5.6" fill="none" stroke="currentColor" stroke-width="1.2"/>
        <path d="M4.3 11.7l7.4-7.4" fill="none" stroke="currentColor" stroke-width="1.25" stroke-linecap="round"/>
      </svg>
    `;
  }
  if (kind === "saved") {
    return `
      <svg class="tb-svg" viewBox="0 0 16 16" aria-hidden="true">
        <path d="M3.3 8.35l2.55 2.55 6.1-6.1" fill="none" stroke="currentColor" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    `;
  }
  return `
    <svg class="tb-svg" viewBox="0 0 16 16" aria-hidden="true">
      <path d="M8 2.75v7.15M5.25 7.3L8 10.05 10.75 7.3M3.25 12.25h9.5" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  `;
}

function titleFromBody(body) {
  const lines = String(body || "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (!lines.length) return "未命名笔记";
  return lines[0].replace(/^#+\s*/, "").slice(0, 60) || "未命名笔记";
}

function normalizePlaceholderTitleBody(body = "") {
  const text = String(body || "").replace(/\r\n/g, "\n");
  return text
    .replace(/^#\s*未命名笔记(?=\S)/, "# ")
    .replace(/\n{2,}(?:<br>\n)+/g, "\n\n");
}

const LITERATURE_SECTION_LABELS = {
  citation: "引用信息",
  originalText: "原文",
  paraphrase: "转述",
  whyKeep: "保留原因",
  supportsJudgment: "支持判断"
};

const LITERATURE_CITATION_FIELD_LABELS = {
  sourceTitle: "标题",
  authors: "作者",
  year: "年份",
  container: "容器",
  publisher: "出版社 / 来源",
  locator: "页码 / 定位",
  version: "版本",
  contributors: "译者 / 编者",
  identifier: "DOI / ISBN / arXiv / URL / PDF"
};

const REQUIRED_LITERATURE_CITATION_FIELDS = ["sourceTitle", "authors", "year", "locator", "identifier"];

const REFLECTION_QUESTIONS = [
  "这段材料你真正理解成什么？",
  "你为什么要保留它？",
  "它会支持什么判断？"
];
const AUTO_SAVE_IDLE_MS = 12000;

function escapeRegExp(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function formatMarkdownLinkDestination(value = "") {
  const target = String(value || "").trim();
  if (!target) return "";
  if (target.startsWith("<") && target.endsWith(">")) return target;
  return /\s|[()]/.test(target) ? `<${target}>` : target;
}

export function assetMarkdownSnippet(asset = {}) {
  const rawLabel = String(asset.fileName || "asset").trim();
  const textLabel = rawLabel.replace(/\.[^.]+$/, "").replace(/[[\]]/g, "").trim() || "asset";
  const destination = formatMarkdownLinkDestination(asset.markdownLinkPath);
  if (String(asset.assetKind || "") === "image") {
    return `![${textLabel}](${destination})`;
  }
  return `[${rawLabel || textLabel}](${destination})`;
}

export function normalizeFieldText(value = "") {
  return String(value || "").replace(/\r\n/g, "\n").trim();
}

function stripMarkdownTitle(body = "") {
  const text = String(body || "").replace(/\r\n/g, "\n");
  const lines = text.split("\n");
  if (!lines.length) return "";
  return lines.slice(1).join("\n").replace(/^\n+/, "");
}

function extractLiteratureSection(body = "", label = "") {
  const text = String(body || "").replace(/\r\n/g, "\n");
  const headingRegex = new RegExp(`(^|\\n)##\\s+${escapeRegExp(label)}\\s*\\n`, "m");
  const match = headingRegex.exec(text);
  if (!match) return "";
  const start = match.index + match[0].length;
  const rest = text.slice(start);
  const nextHeading = /\n##\s+[^\n]+\s*\n/m.exec(rest);
  const section = nextHeading ? rest.slice(0, nextHeading.index) : rest;
  return section.replace(/^\n+|\n+$/g, "");
}

function emptyLiteratureCitationFields() {
  return Object.fromEntries(Object.keys(LITERATURE_CITATION_FIELD_LABELS).map((key) => [key, ""]));
}

function parseLiteratureCitationFields(section = "") {
  const text = String(section || "").replace(/\r\n/g, "\n");
  const fields = emptyLiteratureCitationFields();
  for (const [key, label] of Object.entries(LITERATURE_CITATION_FIELD_LABELS)) {
    const pattern = new RegExp(`^[^\\S\\r\\n]*(?:[-*+][^\\S\\r\\n]*)?${escapeRegExp(label)}[^\\S\\r\\n]*[：:][^\\S\\r\\n]*(.*)$`, "m");
    fields[key] = normalizeFieldText(pattern.exec(text)?.[1] || "");
  }
  return fields;
}

function normalizeLiteratureCitationFields(fields = {}) {
  const normalized = emptyLiteratureCitationFields();
  for (const key of Object.keys(normalized)) normalized[key] = normalizeFieldText(fields?.[key] || "");
  return normalized;
}

function composeLiteratureCitationLines(citation = {}) {
  const fields = normalizeLiteratureCitationFields(citation);
  return Object.entries(LITERATURE_CITATION_FIELD_LABELS).map(([key, label]) => `- ${label}：${fields[key] || ""}`);
}

function literatureCitationState(citation = {}) {
  const fields = normalizeLiteratureCitationFields(citation);
  const missingKeys = REQUIRED_LITERATURE_CITATION_FIELDS.filter((key) => !fields[key]);
  return {
    fields,
    complete: missingKeys.length === 0,
    missingKeys,
    missingLabels: missingKeys.map((key) => LITERATURE_CITATION_FIELD_LABELS[key])
  };
}

export function parseLiteratureWorkspace(body = "") {
  const title = titleFromBody(body);
  const content = stripMarkdownTitle(body);
  const structured = Object.values(LITERATURE_SECTION_LABELS).some((label) =>
    new RegExp(`(^|\\n)##\\s+${escapeRegExp(label)}\\s*(\\n|$)`, "m").test(content)
  );
  const citation = structured
    ? parseLiteratureCitationFields(extractLiteratureSection(content, LITERATURE_SECTION_LABELS.citation))
    : emptyLiteratureCitationFields();
  const originalText = structured ? extractLiteratureSection(content, LITERATURE_SECTION_LABELS.originalText) : content.trim();
  return {
    title,
    citation,
    originalText,
    paraphrase: structured ? extractLiteratureSection(content, LITERATURE_SECTION_LABELS.paraphrase) : "",
    whyKeep: structured ? extractLiteratureSection(content, LITERATURE_SECTION_LABELS.whyKeep) : "",
    supportsJudgment: structured ? extractLiteratureSection(content, LITERATURE_SECTION_LABELS.supportsJudgment) : ""
  };
}

function composeLiteratureWorkspace(fields = {}) {
  const title = String(fields.title || "未命名笔记").trim() || "未命名笔记";
  const citation = normalizeLiteratureCitationFields(fields.citation || {});
  const originalText = normalizeFieldText(fields.originalText);
  const paraphrase = normalizeFieldText(fields.paraphrase);
  const whyKeep = normalizeFieldText(fields.whyKeep);
  const supportsJudgment = normalizeFieldText(fields.supportsJudgment);
  return [
    `# ${title}`,
    "",
    `## ${LITERATURE_SECTION_LABELS.citation}`,
    "",
    ...composeLiteratureCitationLines(citation),
    "",
    `## ${LITERATURE_SECTION_LABELS.originalText}`,
    "",
    originalText,
    "",
    `## ${LITERATURE_SECTION_LABELS.paraphrase}`,
    "",
    paraphrase,
    "",
    `## ${LITERATURE_SECTION_LABELS.whyKeep}`,
    "",
    whyKeep,
    "",
    `## ${LITERATURE_SECTION_LABELS.supportsJudgment}`,
    "",
    supportsJudgment,
    ""
  ].join("\n");
}

function literatureTemplateBody(title = "未命名笔记") {
  return composeLiteratureWorkspace({ title });
}

function reflectionQuestionsHint(prefix = "") {
  const head = String(prefix || "").trim();
  return `${head ? `${head} ` : ""}${REFLECTION_QUESTIONS.join("  ")}`.trim();
}

function authorshipSeedFromBody(body = "") {
  const lines = String(body || "")
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines[0]?.startsWith("#")) lines.shift();
  return lines.join(" ").slice(0, 180).trim();
}

function tokenAtCursor(text, cursor) {
  const startChars = [" ", "\n", "\t", "，", "。", ",", ":", "：", "(", ")", "[", "]"];
  let s = cursor;
  let e = cursor;
  while (s > 0 && !startChars.includes(text[s - 1])) s--;
  while (e < text.length && !startChars.includes(text[e])) e++;
  return text.slice(s, e).trim();
}

function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizeClickedTag(token) {
  return String(token || "")
    .replace(/^#/, "")
    .replace(/[，。！？、；：.!?;:,]+$/u, "")
    .trim();
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function normalizePosixPath(input) {
  const parts = [];
  for (const chunk of String(input || "").replaceAll("\\", "/").split("/")) {
    if (!chunk || chunk === ".") continue;
    if (chunk === "..") {
      if (parts.length) parts.pop();
      continue;
    }
    parts.push(chunk);
  }
  return parts.join("/");
}

function resolveAssetPathForNote(rawPath, noteMarkdownPath = "") {
  const target = String(rawPath || "").trim();
  if (!target) return "";
  if (/^(https?:|data:)/i.test(target)) return target;
  if (target.startsWith("assets/")) return normalizePosixPath(target);
  const normalizedNotePath = String(noteMarkdownPath || "").replaceAll("\\", "/");
  const slash = normalizedNotePath.lastIndexOf("/");
  const noteDir = slash >= 0 ? normalizedNotePath.slice(0, slash) : "";
  return normalizePosixPath(`${noteDir}/${target}`);
}

function previewAssetUrl(rawPath, noteMarkdownPath = "") {
  const assetPath = resolveAssetPathForNote(rawPath, noteMarkdownPath);
  if (!assetPath || /^(https?:|data:)/i.test(assetPath)) return assetPath;
  if (!assetPath.startsWith("assets/")) return "";
  return assetPreviewUrl(assetPath);
}

function resolvePreviewableAsset(rawPath, noteMarkdownPath = "") {
  const assetPath = resolveAssetPathForNote(rawPath, noteMarkdownPath);
  if (!assetPath) return { assetPath: "", previewUrl: "", isVaultAsset: false };
  if (/^(https?:|data:)/i.test(assetPath)) {
    return {
      assetPath,
      previewUrl: assetPath,
      isVaultAsset: false
    };
  }
  if (!assetPath.startsWith("assets/")) {
    return {
      assetPath,
      previewUrl: "",
      isVaultAsset: false
    };
  }
  return {
    assetPath,
    previewUrl: assetPreviewUrl(assetPath),
    isVaultAsset: true
  };
}

function isPreviewImageUrl(url = "") {
  const value = String(url || "").trim();
  return /^data:image\//i.test(value) || /\.(png|jpe?g|gif|webp|svg|bmp|ico|avif)(\?|$)/i.test(value);
}

function isPreviewPdfUrl(url = "") {
  return /\.pdf(\?|$)/i.test(String(url || "").trim());
}

function attachmentLabelFromPath(rawPath) {
  const normalized = String(rawPath || "").replaceAll("\\", "/");
  const parts = normalized.split("/").filter(Boolean);
  return parts[parts.length - 1] || normalized || "附件";
}

function isMarkdownCodeFenceLine(line = "") {
  return /^\s*```/.test(String(line || ""));
}

function isHorizontalRuleLine(line = "") {
  return /^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/.test(String(line || ""));
}

function isMarkdownChecklistLine(line = "") {
  return /^\s*[-*+]\s\[(?: |x|X)\]\s/.test(String(line || ""));
}

function isMarkdownBulletLine(line = "") {
  return /^\s*[-*+]\s/.test(String(line || "")) && !isMarkdownChecklistLine(line);
}

function isMarkdownImageLine(line = "") {
  return /^!\[([^\]]*)\]\(([^)]+)\)\s*$/.test(String(line || ""));
}

function isMarkdownAttachmentLine(line = "") {
  return /^\[([^\]]+)\]\(([^)]+)\)\s*$/.test(String(line || ""));
}

function isMarkdownTableSeparator(line = "") {
  const trimmed = String(line || "").trim();
  if (!trimmed.includes("-")) return false;
  const normalized = trimmed.replace(/^\|/, "").replace(/\|$/, "");
  const cells = normalized.split("|").map((cell) => cell.trim());
  return cells.length >= 2 && cells.every((cell) => /^:?-{3,}:?$/.test(cell));
}

function isMarkdownTableRow(line = "") {
  const trimmed = String(line || "").trim();
  if (!trimmed.includes("|")) return false;
  const normalized = trimmed.replace(/^\|/, "").replace(/\|$/, "");
  const cells = normalized.split("|");
  return cells.length >= 2;
}

function isMarkdownTableStart(lines = [], index = 0) {
  return isMarkdownTableRow(lines[index]) && isMarkdownTableSeparator(lines[index + 1] || "");
}

function isMarkdownOrderedListLine(line = "") {
  return /^\s*\d+[.)]\s/.test(String(line || ""));
}

function isMarkdownQuoteLine(line = "") {
  return /^\s*>\s?/.test(String(line || ""));
}

function isMarkdownListLikeLine(line = "") {
  return isMarkdownChecklistLine(line) || isMarkdownBulletLine(line) || isMarkdownOrderedListLine(line);
}

function isMarkdownIndentedContinuation(line = "") {
  return /^\s{2,}\S/.test(String(line || "")) && !isMarkdownListLikeLine(line);
}

function shouldKeepTightWysiwygLineBreak(lines = [], index = 0, options = {}) {
  if (options.inCodeFence) return true;
  const current = String(lines[index] || "");
  const next = String(lines[index + 1] || "");
  if (!current.trim() || !next.trim()) return true;
  if (isMarkdownTableRow(current) && (isMarkdownTableRow(next) || isMarkdownTableSeparator(next))) return true;
  if (isMarkdownTableSeparator(current) && isMarkdownTableRow(next)) return true;
  if (isMarkdownQuoteLine(current) && isMarkdownQuoteLine(next)) return true;
  if (isMarkdownListLikeLine(current) && (isMarkdownListLikeLine(next) || isMarkdownIndentedContinuation(next))) return true;
  if (isMarkdownIndentedContinuation(current) && (isMarkdownIndentedContinuation(next) || isMarkdownListLikeLine(next))) return true;
  return false;
}

function normalizeWysiwygMarkdownValue(markdown = "", offsets = []) {
  const source = String(markdown || "").replace(/\r\n/g, "\n");
  const mappedOffsets = offsets.map((offset) => Math.max(0, Math.min(source.length, Number(offset) || 0)));
  const lines = source.split("\n");
  let value = "";
  let sourceOffset = 0;
  let inCodeFence = false;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] || "";
    value += line;
    sourceOffset += line.length;

    if (index >= lines.length - 1) continue;

    const boundaryInCodeFence = inCodeFence || isMarkdownCodeFenceLine(line);
    if (isMarkdownCodeFenceLine(line)) inCodeFence = !inCodeFence;

    value += "\n";
    sourceOffset += 1;

    if (!shouldKeepTightWysiwygLineBreak(lines, index, { inCodeFence: boundaryInCodeFence })) {
      value += "\n";
      for (let offsetIndex = 0; offsetIndex < mappedOffsets.length; offsetIndex += 1) {
        if (mappedOffsets[offsetIndex] >= sourceOffset) mappedOffsets[offsetIndex] += 1;
      }
    }
  }

  return { value, offsets: mappedOffsets };
}

function parseMarkdownTableRow(line = "") {
  const trimmed = String(line || "").trim().replace(/^\|/, "").replace(/\|$/, "");
  return trimmed.split("|").map((cell) => cell.trim());
}

function formatMarkdownTableRow(cells = [], width = cells.length || 2) {
  const normalized = Array.from({ length: width }, (_, index) => String(cells[index] || "").trim());
  return `| ${normalized.join(" | ")} |`;
}

function formatMarkdownTableSeparator(width = 2) {
  return `| ${Array.from({ length: Math.max(2, width) }, () => "---").join(" | ")} |`;
}

function normalizeCodeLanguage(language = "") {
  const value = String(language || "").trim().toLowerCase();
  if (!value) return "";
  if (["js", "jsx", "javascript", "node"].includes(value)) return "javascript";
  if (["ts", "tsx", "typescript"].includes(value)) return "typescript";
  if (["json", "jsonc"].includes(value)) return "json";
  if (["sh", "bash", "zsh", "shell", "powershell", "ps1"].includes(value)) return "shell";
  if (["md", "markdown"].includes(value)) return "markdown";
  return value;
}

function inferCodeLanguage(code = "") {
  const source = String(code || "").trim();
  if (!source) return "text";
  if ((source.startsWith("{") || source.startsWith("[")) && /":\s*/.test(source)) return "json";
  if (/^\s*(npm|pnpm|yarn|git|cd|ls|mkdir|cp|mv|rm|cat|echo|node|python|cargo)\b/m.test(source) || /^\s*\$\s+/m.test(source)) return "shell";
  if (/\b(interface|type|implements|enum)\b/.test(source)) return "typescript";
  if (/\b(const|let|var|function|return|import|export|class|async|await|=>)\b/.test(source)) return "javascript";
  if (/^(#{1,6}\s|>\s|[-*]\s|\[[^\]]+\]\([^)]+\))/m.test(source)) return "markdown";
  return "text";
}

const CODE_BLOCK_LANGUAGE_OPTIONS = [
  { value: "text", label: "纯文本" },
  { value: "javascript", label: "JavaScript" },
  { value: "typescript", label: "TypeScript" },
  { value: "json", label: "JSON" },
  { value: "shell", label: "Shell" },
  { value: "markdown", label: "Markdown" }
];

function collectHighlightMatches(source = "", definitions = []) {
  const text = String(source || "");
  const matches = [];
  for (const definition of definitions) {
    const regex = new RegExp(definition.regex.source, definition.regex.flags.includes("g") ? definition.regex.flags : `${definition.regex.flags}g`);
    let match;
    while ((match = regex.exec(text))) {
      const value = String(match[0] || "");
      if (!value) {
        regex.lastIndex += 1;
        continue;
      }
      matches.push({
        start: match.index,
        end: match.index + value.length,
        cls: definition.cls,
        priority: Number(definition.priority || 0)
      });
      if (match.index === regex.lastIndex) regex.lastIndex += 1;
    }
  }
  matches.sort((a, b) => a.start - b.start || b.priority - a.priority || b.end - a.end);
  return matches;
}

function renderHighlightedText(source = "", definitions = []) {
  const text = String(source || "");
  const matches = collectHighlightMatches(text, definitions);
  if (!matches.length) return escapeHtml(text);
  let html = "";
  let cursor = 0;
  for (const match of matches) {
    if (match.start < cursor) continue;
    html += escapeHtml(text.slice(cursor, match.start));
    html += `<span class="${escapeHtml(match.cls)}">${escapeHtml(text.slice(match.start, match.end))}</span>`;
    cursor = match.end;
  }
  html += escapeHtml(text.slice(cursor));
  return html;
}

function renderHighlightedCode(code = "", rawLanguage = "") {
  const language = normalizeCodeLanguage(rawLanguage) || inferCodeLanguage(code);
  const patterns = {
    javascript: [
      { regex: /\/\/.*$/gm, cls: "code-token-comment", priority: 4 },
      { regex: /\/\*[\s\S]*?\*\//g, cls: "code-token-comment", priority: 4 },
      { regex: /`(?:\\.|[^`])*`|"(?:\\.|[^"])*"|'(?:\\.|[^'])*'/g, cls: "code-token-string", priority: 3 },
      { regex: /\b(?:const|let|var|function|return|if|else|for|while|switch|case|break|continue|import|from|export|default|async|await|new|class|extends|try|catch|throw)\b/g, cls: "code-token-keyword", priority: 2 },
      { regex: /\b(?:true|false|null|undefined|this)\b/g, cls: "code-token-atom", priority: 2 },
      { regex: /\b\d+(?:\.\d+)?\b/g, cls: "code-token-number", priority: 1 }
    ],
    typescript: [
      { regex: /\/\/.*$/gm, cls: "code-token-comment", priority: 4 },
      { regex: /\/\*[\s\S]*?\*\//g, cls: "code-token-comment", priority: 4 },
      { regex: /`(?:\\.|[^`])*`|"(?:\\.|[^"])*"|'(?:\\.|[^'])*'/g, cls: "code-token-string", priority: 3 },
      { regex: /\b(?:const|let|var|function|return|if|else|for|while|switch|case|break|continue|import|from|export|default|async|await|new|class|extends|try|catch|throw|interface|type|implements|enum|readonly|public|private|protected)\b/g, cls: "code-token-keyword", priority: 2 },
      { regex: /\b(?:true|false|null|undefined|this)\b/g, cls: "code-token-atom", priority: 2 },
      { regex: /\b\d+(?:\.\d+)?\b/g, cls: "code-token-number", priority: 1 }
    ],
    json: [
      { regex: /"(?:\\.|[^"])*"(?=\s*:)/g, cls: "code-token-key", priority: 4 },
      { regex: /"(?:\\.|[^"])*"/g, cls: "code-token-string", priority: 3 },
      { regex: /\b(?:true|false|null)\b/g, cls: "code-token-atom", priority: 2 },
      { regex: /-?\b\d+(?:\.\d+)?\b/g, cls: "code-token-number", priority: 1 }
    ],
    shell: [
      { regex: /#.*$/gm, cls: "code-token-comment", priority: 4 },
      { regex: /"(?:\\.|[^"])*"|'(?:\\.|[^'])*'/g, cls: "code-token-string", priority: 3 },
      { regex: /\$\{?[A-Za-z_][A-Za-z0-9_]*\}?/g, cls: "code-token-variable", priority: 2 },
      { regex: /^\s*(?:\$ ?)?(?:npm|pnpm|yarn|git|cd|ls|mkdir|cp|mv|rm|cat|echo|node|python|cargo)\b/gm, cls: "code-token-keyword", priority: 1 }
    ],
    markdown: [
      { regex: /^#{1,6}\s.*$/gm, cls: "code-token-keyword", priority: 3 },
      { regex: /^\s*>\s.*$/gm, cls: "code-token-comment", priority: 3 },
      { regex: /^\s*(?:[-*+]|\d+[.)])\s.*$/gm, cls: "code-token-atom", priority: 2 },
      { regex: /\[\[[^\]]+\]\]|\[[^\]]+\]\([^)]+\)/g, cls: "code-token-string", priority: 2 },
      { regex: /#[A-Za-z0-9_\-\u4e00-\u9fff]+/gu, cls: "code-token-variable", priority: 1 }
    ]
  };
  return {
    language,
    html: renderHighlightedText(code, patterns[language] || [])
  };
}

function encodePreviewPayload(value = "") {
  return encodeURIComponent(String(value || ""));
}

function decodePreviewPayload(value = "") {
  try {
    return decodeURIComponent(String(value || ""));
  } catch {
    return String(value || "");
  }
}

function isMarkdownBlockBoundary(lines = [], index = 0) {
  const line = String(lines[index] || "");
  if (!line.trim()) return false;
  return (
    line.startsWith("# ") ||
    line.startsWith("## ") ||
    line.startsWith("> ") ||
    isMarkdownCodeFenceLine(line) ||
    isHorizontalRuleLine(line) ||
    isMarkdownImageLine(line) ||
    isMarkdownAttachmentLine(line) ||
    isMarkdownChecklistLine(line) ||
    isMarkdownBulletLine(line) ||
    isMarkdownTableStart(lines, index)
  );
}

function renderInlinePreview(text, options = {}) {
  const source = String(text || "");
  const noteMarkdownPath = String(options.noteMarkdownPath || "");
  let html = "";
  let index = 0;

  while (index < source.length) {
    if (source.startsWith("[[", index)) {
      const close = source.indexOf("]]", index + 2);
      if (close > index + 2) {
        const label = source.slice(index + 2, close).trim();
        html += `<button class="preview-wikilink" type="button" data-preview-link="${escapeHtml(label)}">${escapeHtml(label)}</button>`;
        index = close + 2;
        continue;
      }
    }

    if (source.startsWith("**", index)) {
      const close = source.indexOf("**", index + 2);
      if (close > index + 2) {
        html += `<strong>${renderInlinePreview(source.slice(index + 2, close))}</strong>`;
        index = close + 2;
        continue;
      }
    }

    if (source[index] === "*") {
      const close = source.indexOf("*", index + 1);
      if (close > index + 1) {
        html += `<em>${renderInlinePreview(source.slice(index + 1, close))}</em>`;
        index = close + 1;
        continue;
      }
    }

    if (source[index] === "`") {
      const close = source.indexOf("`", index + 1);
      if (close > index + 1) {
        html += `<code>${escapeHtml(source.slice(index + 1, close))}</code>`;
        index = close + 1;
        continue;
      }
    }

    const markdownLink = source.slice(index).match(/^\[([^\]]+)\]\(([^)]+)\)/);
    if (markdownLink) {
      const [, label, href] = markdownLink;
      const url = previewAssetUrl(href, noteMarkdownPath);
      const textLabel = label || attachmentLabelFromPath(href);
      if (!url) {
        html += `<a class="preview-link" href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(textLabel)}</a>`;
      } else {
        html += `<button class="preview-attachment inline" type="button" data-preview-asset-url="${escapeHtml(url)}" data-preview-asset-label="${escapeHtml(textLabel)}">${escapeHtml(textLabel)}</button>`;
      }
      index += markdownLink[0].length;
      continue;
    }

    const tagMatch = source.slice(index).match(/^#([A-Za-z0-9_\-\u4e00-\u9fff]+)/u);
    const prev = index > 0 ? source[index - 1] : "";
    if (tagMatch && (!prev || /[\s([{"'，。；：！？、,.!?;:]/u.test(prev))) {
      const token = tagMatch[1];
      html += `<button class="preview-tag" type="button" data-preview-tag="${escapeHtml(token)}">#${escapeHtml(token)}</button>`;
      index += tagMatch[0].length;
      continue;
    }

    if (source[index] === "\n") {
      html += "<br>";
      index += 1;
      continue;
    }

    html += escapeHtml(source[index]);
    index += 1;
  }

  return html;
}

function renderMarkdownPreview(markdown, options = {}) {
  const text = String(markdown || "").replace(/\r\n/g, "\n");
  const lines = text.split("\n");
  const blocks = [];
  const noteMarkdownPath = String(options.noteMarkdownPath || "");
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    if (!line.trim()) {
      index += 1;
      continue;
    }

    if (isMarkdownCodeFenceLine(line)) {
      const language = line.replace(/^\s*```/, "").trim();
      const codeLines = [];
      index += 1;
      while (index < lines.length && !isMarkdownCodeFenceLine(lines[index])) {
        codeLines.push(lines[index]);
        index += 1;
      }
      if (index < lines.length && isMarkdownCodeFenceLine(lines[index])) index += 1;
      const codeSource = codeLines.join("\n");
      const highlighted = renderHighlightedCode(codeSource, language);
      const languageLabel = normalizeCodeLanguage(language) || highlighted.language || "text";
      blocks.push(`
        <div class="preview-code-block">
          <div class="preview-code-head">
            <span>${escapeHtml(languageLabel)}</span>
            <button class="preview-code-copy" type="button" data-preview-copy-code="${escapeHtml(encodePreviewPayload(codeSource))}">复制代码</button>
          </div>
          <pre><code>${highlighted.html}</code></pre>
        </div>
      `);
      continue;
    }

    if (isHorizontalRuleLine(line)) {
      blocks.push(`<hr class="preview-rule">`);
      index += 1;
      continue;
    }

    if (line.startsWith("# ")) {
      blocks.push(`<h1>${renderInlinePreview(line.slice(2), options)}</h1>`);
      index += 1;
      continue;
    }

    if (line.startsWith("## ")) {
      blocks.push(`<h2>${renderInlinePreview(line.slice(3), options)}</h2>`);
      index += 1;
      continue;
    }

    if (line.startsWith("> ")) {
      const quoteLines = [];
      while (index < lines.length && lines[index].startsWith("> ")) {
        quoteLines.push(lines[index].slice(2));
        index += 1;
      }
      blocks.push(`<blockquote><p>${renderInlinePreview(quoteLines.join("\n"), options)}</p></blockquote>`);
      continue;
    }

    if (isMarkdownTableStart(lines, index)) {
      const headerCells = parseMarkdownTableRow(lines[index]);
      const columnCount = Math.max(2, headerCells.length);
      const rows = [];
      index += 2;
      while (index < lines.length && isMarkdownTableRow(lines[index]) && !isMarkdownTableSeparator(lines[index])) {
        rows.push(parseMarkdownTableRow(lines[index]));
        index += 1;
      }
      blocks.push(`
        <div class="preview-table-wrap">
          <table class="preview-table">
            <thead>
              <tr>${Array.from({ length: columnCount }, (_, cellIndex) => `<th>${renderInlinePreview(headerCells[cellIndex] || "", options)}</th>`).join("")}</tr>
            </thead>
            <tbody>
              ${rows
                .map(
                  (row) =>
                    `<tr>${Array.from({ length: columnCount }, (_, cellIndex) => `<td>${renderInlinePreview(row[cellIndex] || "", options)}</td>`).join("")}</tr>`
                )
                .join("")}
            </tbody>
          </table>
        </div>
      `);
      continue;
    }

    const imageMatch = line.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if (imageMatch) {
      const [, alt, href] = imageMatch;
      const url = previewAssetUrl(href, noteMarkdownPath);
      const label = alt || attachmentLabelFromPath(href);
      if (!url) {
        blocks.push(`<div class="preview-attachment-block"><button class="preview-attachment" type="button"><span class="preview-attachment-name">${escapeHtml(label)}</span><span class="preview-attachment-path">${escapeHtml(href)}</span></button></div>`);
        index += 1;
        continue;
      }
      blocks.push(`
        <figure class="preview-figure">
          <img class="preview-image-asset" src="${escapeHtml(url)}" alt="${escapeHtml(label)}" data-preview-asset-url="${escapeHtml(url)}" data-preview-asset-label="${escapeHtml(label)}">
          <figcaption>${escapeHtml(label)}</figcaption>
        </figure>
      `);
      index += 1;
      continue;
    }

    if (/^\s*[-*+]\s\[(?: |x|X)\]\s/.test(line)) {
      const items = [];
      while (index < lines.length && /^\s*[-*+]\s\[(?: |x|X)\]\s/.test(lines[index])) {
        const match = lines[index].match(/^\s*[-*+]\s\[((?: |x|X))\]\s?(.*)$/);
        const checked = /x/i.test(match?.[1] || "");
        items.push(`<li class="task-item"><input type="checkbox" disabled ${checked ? "checked" : ""}><span>${renderInlinePreview(match?.[2] || "", options)}</span></li>`);
        index += 1;
      }
      blocks.push(`<ul class="task-list">${items.join("")}</ul>`);
      continue;
    }

    if (line.startsWith("- ")) {
      const items = [];
      while (index < lines.length && lines[index].startsWith("- ")) {
        items.push(`<li>${renderInlinePreview(lines[index].slice(2), options)}</li>`);
        index += 1;
      }
      blocks.push(`<ul>${items.join("")}</ul>`);
      continue;
    }

    const attachmentMatch = line.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (attachmentMatch) {
      const [, label, href] = attachmentMatch;
      const url = previewAssetUrl(href, noteMarkdownPath);
      const textLabel = label || attachmentLabelFromPath(href);
      if (!url) {
        blocks.push(`
          <div class="preview-attachment-block">
            <a class="preview-attachment" href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">
              <span class="preview-attachment-name">${escapeHtml(textLabel)}</span>
              <span class="preview-attachment-path">${escapeHtml(href)}</span>
            </a>
          </div>
        `);
      } else {
        blocks.push(`
          <div class="preview-attachment-block">
            <button class="preview-attachment" type="button" data-preview-asset-url="${escapeHtml(url)}" data-preview-asset-label="${escapeHtml(textLabel)}">
              <span class="preview-attachment-name">${escapeHtml(textLabel)}</span>
              <span class="preview-attachment-path">${escapeHtml(href)}</span>
            </button>
          </div>
        `);
      }
      index += 1;
      continue;
    }

    const paragraphLines = [];
    while (index < lines.length && lines[index].trim()) {
      if (isMarkdownBlockBoundary(lines, index)) break;
      paragraphLines.push(lines[index]);
      index += 1;
    }
    blocks.push(`<p>${renderInlinePreview(paragraphLines.join("\n"), options)}</p>`);
  }

  return blocks.length
    ? blocks.join("")
    : `<div class="markdown-preview-empty">打开或新建一条笔记后，这里显示 Markdown 预览。</div>`;
}

function highlightMatch(text, query) {
  const source = String(text || "");
  const q = String(query || "").trim();
  if (!q) return escapeHtml(source);
  const lowerSource = source.toLowerCase();
  const lowerQuery = q.toLowerCase();
  const index = lowerSource.indexOf(lowerQuery);
  if (index < 0) return escapeHtml(source);
  const before = source.slice(0, index);
  const match = source.slice(index, index + q.length);
  const after = source.slice(index + q.length);
  return `${escapeHtml(before)}<mark class="picker-mark">${escapeHtml(match)}</mark>${escapeHtml(after)}`;
}

function linkCandidateRank(note, query) {
  const q = normalizeText(query);
  if (!q) return 0;
  const title = normalizeText(note.title);
  const id = normalizeText(note.id);
  if (title === q) return 0;
  if (title.startsWith(q)) return 1;
  if (id.startsWith(q)) return 2;
  if (title.includes(q)) return 3;
  if (id.includes(q)) return 4;
  return 9;
}

function linkCandidateBadge(note, query) {
  const q = normalizeText(query);
  if (!q) return "";
  const title = normalizeText(note.title);
  const id = normalizeText(note.id);
  if (title === q) return "标题精确";
  if (title.startsWith(q)) return "标题前缀";
  if (id.startsWith(q)) return "ID 前缀";
  if (title.includes(q)) return "标题包含";
  if (id.includes(q)) return "ID 包含";
  return "";
}

function tagCandidateRank(item, query) {
  const q = normalizeText(query);
  if (!q) return 0;
  const name = normalizeText(item?.name);
  if (name === q) return 0;
  if (name.startsWith(q)) return 1;
  if (name.includes(q)) return 2;
  return 9;
}

function tagCandidateBadge(item, query) {
  const q = normalizeText(query);
  if (!q) return "";
  const name = normalizeText(item?.name);
  if (name === q) return "标签精确";
  if (name.startsWith(q)) return "标签前缀";
  if (name.includes(q)) return "标签包含";
  return "";
}

function linkCandidateGroupLabel(note, query) {
  const q = normalizeText(query);
  if (!q) return "同目录笔记";
  const rank = linkCandidateRank(note, q);
  if (rank <= 1) return "最匹配";
  if (rank <= 3) return "其他匹配";
  return "按 ID 匹配";
}

function tagCandidateGroupLabel(item, query) {
  const q = normalizeText(query);
  if (!q) return "已有标签";
  const rank = tagCandidateRank(item, q);
  if (rank <= 1) return "最匹配";
  return "相关标签";
}

function renderPickerSections(items = [], groupLabelForItem, renderItem) {
  const groups = [];
  for (const item of items) {
    const label = String(groupLabelForItem(item) || "结果");
    let group = groups.find((entry) => entry.label === label);
    if (!group) {
      group = { label, items: [] };
      groups.push(group);
    }
    group.items.push(item);
  }
  return groups
    .map(
      (group) => `
        <section class="picker-section">
          <div class="picker-section-label">${escapeHtml(group.label)}<span>${group.items.length}</span></div>
          ${group.items.map((item) => renderItem(item)).join("")}
        </section>
      `
    )
    .join("");
}

function noteTypeGlyph(type) {
  if (type === "fleeting") return "随";
  if (type === "literature") return "文";
  return "原";
}

function noteTypeText(type) {
  if (type === "fleeting") return "随笔笔记";
  if (type === "literature") return "文献笔记";
  return "原创笔记";
}

function excerptFromBody(body = "", fallbackTitle = "") {
  const lines = String(body || "")
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.replace(/^#+\s*/, "").trim())
    .filter(Boolean);
  const content = lines.filter((line) => line !== String(fallbackTitle || "").trim())[0] || "";
  return content.slice(0, 120);
}

export class EditorPane {
  constructor({ state, elements, onStatus, onStateChange, onOpenNote, onChromeChange }) {
    this.state = state;
    this.els = elements;
    this.onStatus = onStatus;
    this.onStateChange = onStateChange;
    this.onOpenNote = onOpenNote;
    this.onChromeChange = typeof onChromeChange === "function" ? onChromeChange : () => {};
    this.currentLinkCandidates = [];
    this.currentLinkIndex = 0;
    this.currentLinkContext = null;
    this.currentTagCandidates = [];
    this.currentTagIndex = 0;
    this.currentTagContext = null;
    this.richEditor = null;
    this.markdownEditor = null;
    this.lastInlinePickerAnchor = 0;
    this.suppressEditorChange = false;
    this.suppressRichEditorChange = false;
    this.suppressSourceEditorChange = false;
    this.suppressLiteratureWorkspaceChange = false;
    this.savingPromise = null;
    this.autoSaveTimer = null;
    this.saveUiState = { mode: "idle", message: "" };
    this.markdownSelectionOverride = null;
    this.pendingEditorFocus = null;
    this.pendingEditorSelection = null;
    this.bind();
    this.renderPreviewVisibility();
    this.initRichEditor();
    this.initMarkdownEditor();
  }

  activeTab() {
    return this.state.tabs.find((t) => t.id === this.state.activeTabId) || null;
  }

  activeNote() {
    const t = this.activeTab();
    if (!t) return null;
    return this.state.notes.find((n) => n.id === t.noteId) || null;
  }

  isLiteratureNote(note = this.activeNote()) {
    return String(note?.noteType || "").trim() === "literature";
  }

  isOriginalNote(note = this.activeNote()) {
    return String(note?.noteType || "").trim() === "original";
  }

  isOriginalRecordableSource(note = this.activeNote()) {
    const noteType = String(note?.noteType || "").trim().toLowerCase();
    return noteType === "fleeting" || noteType === "literature";
  }

  generatedOriginalNoteId(note = this.activeNote()) {
    return String(note?.generatedOriginalNoteId || note?.generated_original_note_id || "").trim();
  }

  hasGeneratedOriginal(note = this.activeNote()) {
    return Boolean(this.generatedOriginalNoteId(note));
  }

  isLiteratureWorkspaceActive(note = this.activeNote()) {
    return false;
  }

  defaultAuthorshipState(note = null) {
    return {
      claim: "",
      confirmed: true,
      confirmedBody: ""
    };
  }

  ensureTabAuthorshipState(tab, note = null) {
    if (!tab) return this.defaultAuthorshipState(note);
    if (!tab.authorshipState || typeof tab.authorshipState !== "object") {
      tab.authorshipState = this.defaultAuthorshipState(note);
    }
    if (!this.isOriginalNote(note)) {
      tab.authorshipState = this.defaultAuthorshipState(null);
    }
    return tab.authorshipState;
  }

  activeAuthorshipState() {
    const tab = this.activeTab();
    const note = this.activeNote();
    return this.ensureTabAuthorshipState(tab, note);
  }

  resetActiveSaveUiState() {
    const tab = this.activeTab();
    if (!tab) return;
    tab.saveUiState = this.defaultSaveUiState(tab);
  }

  authorshipBlockMessage(note = this.activeNote()) {
    return "";
  }

  literatureFieldsFromInputs() {
    const currentCitation = parseLiteratureWorkspace(this.els.body?.value || "").citation;
    return {
      title: this.els.literatureTitle?.value || "未命名笔记",
      citation: currentCitation,
      originalText: this.els.literatureOriginal?.value || "",
      paraphrase: this.els.literatureParaphrase?.value || "",
      whyKeep: this.els.literatureWhyKeep?.value || "",
      supportsJudgment: this.els.literatureSupportsJudgment?.value || ""
    };
  }

  literatureCompletionState(note = this.activeNote()) {
    const fields = this.isLiteratureWorkspaceActive(note) ? this.literatureFieldsFromInputs() : parseLiteratureWorkspace(note?.body || "");
    const hasParaphrase = Boolean(normalizeFieldText(fields.paraphrase));
    const citation = literatureCitationState(fields.citation);
    const ready = hasParaphrase && citation.complete;
    const status = ready && String(note?.status || "").trim() === "active" ? "active" : "draft";
    const missingCitationText = citation.missingLabels.length ? `缺少引用信息：${citation.missingLabels.join("、")}` : "";
    return {
      status,
      hasParaphrase,
      hasCitationMetadata: citation.complete,
      missingCitationFields: citation.missingLabels,
      label: ready && status === "active" ? "已完成" : "待完成",
      hint: ready
        ? status === "active"
          ? "原文与转述已配对整理。"
          : "已写转述，点击完成即可将文献笔记标为已完成。"
        : hasParaphrase
          ? `${missingCitationText}。补齐后才能用于参考引用。`
          : "先写出你自己的转述，并补齐引用信息。"
    };
  }

  literatureQueueScopeDirectoryIds(note = this.activeNote()) {
    const startId = String(note?.folderId || this.state.selectedFolderId || "").trim();
    if (!startId) return new Set();
    const directoryIds = new Set();
    const queue = [startId];
    while (queue.length) {
      const currentId = queue.shift();
      if (!currentId || directoryIds.has(currentId)) continue;
      directoryIds.add(currentId);
      for (const folder of this.state.folders) {
        if (folder.parentId === currentId) queue.push(folder.id);
      }
    }
    return directoryIds;
  }

  literatureQueueRecord(note) {
    const fields = parseLiteratureWorkspace(note?.body || "");
    const hasParaphrase = Boolean(normalizeFieldText(fields.paraphrase));
    const hasWhyKeep = Boolean(normalizeFieldText(fields.whyKeep));
    const hasSupportsJudgment = Boolean(normalizeFieldText(fields.supportsJudgment));
    let lane = "ready";
    let label = "可转原创";
    let tone = "active";
    let noteText = "转述、保留理由和支持判断都已具备，可以继续提炼为原创笔记。";
    if (!hasParaphrase) {
      lane = "pending";
      label = "待转述";
      tone = "draft";
      noteText = "先把原文改写成你自己的判断表达，再决定它是否值得留下。";
    } else if (!hasWhyKeep || !hasSupportsJudgment) {
      lane = "refine";
      label = "待提炼";
      tone = "refine";
      noteText = "已经有转述，但还需要说明为什么保留它，以及它未来支持什么判断。";
    }
    const excerpt = normalizeFieldText(fields.paraphrase || fields.originalText || "");
    return {
      note,
      fields,
      lane,
      label,
      tone,
      noteText,
          excerpt: excerpt ? excerpt.slice(0, 96) : "这条文献笔记还没有写入任何内容。"
    };
  }

  literatureQueueRecords(note = this.activeNote()) {
    const scopeDirectoryIds = this.literatureQueueScopeDirectoryIds(note);
    const currentId = String(note?.id || "").trim();
    const focusedIds = new Set(
      (Array.isArray(this.state.literatureQueueFocusNoteIds) ? this.state.literatureQueueFocusNoteIds : [])
        .map((item) => String(item || "").trim())
        .filter(Boolean)
    );
    const priority = { pending: 0, refine: 1, ready: 2 };
    return this.state.notes
      .filter(
        (item) =>
          String(item?.noteType || "").trim() === "literature" &&
          scopeDirectoryIds.has(item.folderId) &&
          (!focusedIds.size || focusedIds.has(String(item.id || "").trim()))
      )
      .map((item) => ({
        ...this.literatureQueueRecord(item),
        isCurrent: String(item.id || "").trim() === currentId
      }))
      .sort((a, b) => {
        if (a.isCurrent !== b.isCurrent) return a.isCurrent ? -1 : 1;
        const laneDiff = (priority[a.lane] ?? 99) - (priority[b.lane] ?? 99);
        if (laneDiff) return laneDiff;
        const aTime = Date.parse(a.note?.updatedAt || 0) || 0;
        const bTime = Date.parse(b.note?.updatedAt || 0) || 0;
        if (bTime !== aTime) return bTime - aTime;
        return String(a.note?.title || a.note?.id || "").localeCompare(String(b.note?.title || b.note?.id || ""), "zh-CN");
      });
  }

  renderLiteratureQueue(note = this.activeNote()) {
    const summary = this.els.literatureQueueSummary;
    const list = this.els.literatureQueueList;
    const queueNote = this.els.literatureQueueNote;
    const nextButton = this.els.literatureOpenNext;
    const isLiterature = this.isLiteratureWorkspaceActive(note);
    if (!summary || !list || !queueNote || !nextButton) return;
    if (!isLiterature) {
      summary.innerHTML = "";
      list.innerHTML = "";
      queueNote.textContent = "";
      nextButton.disabled = true;
      return;
    }
    const records = this.literatureQueueRecords(note);
    const pendingCount = records.filter((item) => item.lane === "pending").length;
    const refineCount = records.filter((item) => item.lane === "refine").length;
    const readyCount = records.filter((item) => item.lane === "ready").length;
    const nextRecord = records.find((item) => !item.isCurrent && item.lane === "pending") || records.find((item) => !item.isCurrent && item.lane === "refine");
    const scopeFolder = this.state.folders.find((folder) => folder.id === note?.folderId);
    const focusCount = Array.isArray(this.state.literatureQueueFocusNoteIds) ? this.state.literatureQueueFocusNoteIds.length : 0;
    const focusLabel = String(this.state.literatureQueueFocusLabel || "").trim();
    const paraphraseDoneCount = focusCount ? focusCount - pendingCount : 0;
    const remainingCount = pendingCount + refineCount;
    queueNote.textContent = focusCount
      ? `当前范围：${scopeFolder?.name || "当前目录"}。当前只显示${focusLabel || "本次导入"}的 ${focusCount} 条文献笔记；已完成转述 ${paraphraseDoneCount}/${focusCount}，已可转原创 ${readyCount}/${focusCount}，剩余待处理 ${remainingCount} 条。`
      : `当前范围：${scopeFolder?.name || "当前目录"}。先清空待转述，再补齐待提炼，最后再把成熟材料送去原创笔记。`;
    summary.innerHTML = `
      <div class="literature-queue-metric"><strong>${pendingCount}</strong><span>待转述</span></div>
      <div class="literature-queue-metric"><strong>${refineCount}</strong><span>待提炼</span></div>
      <div class="literature-queue-metric"><strong>${readyCount}</strong><span>可转原创</span></div>
    `;
    nextButton.disabled = !nextRecord;
    nextButton.textContent = nextRecord ? `打开下一条${nextRecord.label}` : "当前范围没有待处理条目";
    list.innerHTML = records.length
      ? records
          .map(
            (item) => `
              <article class="literature-queue-item ${item.isCurrent ? "is-current" : ""}">
                <div class="literature-queue-item-head">
                  <div>
                    <div class="literature-queue-item-title">${escapeHtml(item.note.title || item.note.id)}</div>
                    <div class="literature-queue-item-meta">${escapeHtml(item.note.id)}${item.isCurrent ? " · 当前打开" : ""}</div>
                  </div>
                  <span class="literature-status-badge" data-tone="${escapeHtml(item.tone)}">${escapeHtml(item.label)}</span>
                </div>
                <div class="literature-queue-item-note">${escapeHtml(item.noteText)}</div>
                <div class="literature-queue-item-meta">${escapeHtml(item.excerpt)}</div>
                <div class="literature-queue-item-actions">
                  <button class="mini-btn" type="button" data-open-literature-note="${escapeHtml(item.note.id)}">${item.isCurrent ? "继续编辑当前条目" : "打开条目"}</button>
                  ${
                    this.hasGeneratedOriginal(item.note)
                      ? `<span class="item-badge">已生成原创</span>`
                      : item.lane === "ready"
                        ? `<button class="mini-btn" type="button" data-create-original-from-literature="${escapeHtml(item.note.id)}">记录原创笔记</button>`
                      : ""
                  }
                </div>
              </article>
            `
          )
          .join("")
      : `<div class="literature-queue-item"><div class="literature-queue-item-note">当前目录还没有文献笔记。先创建一条，再把它放进待转述流程。</div></div>`;
  }

  isSourceMode() {
    return String(this.state.previewMode || "wysiwyg") === "source";
  }

  isWysiwygMode() {
    return !this.isSourceMode();
  }

  currentEditor() {
    if (this.isSourceMode() && this.markdownEditor) return this.markdownEditor;
    if (this.richEditor) return this.richEditor;
    return this.markdownEditor;
  }

  setMarkdownSelectionOverride(from = 0, to = from) {
    this.markdownSelectionOverride = {
      from: Math.max(0, Number(from) || 0),
      to: Math.max(0, Number(to) || 0)
    };
  }

  clearMarkdownSelectionOverride() {
    this.markdownSelectionOverride = null;
  }

  setUnderlyingEditorValue(value) {
    const text = String(value || "");
    this.els.body.value = text;
    if (this.markdownEditor && this.markdownEditor.getValue() !== text) {
      this.suppressEditorChange = true;
      try {
        this.suppressSourceEditorChange = true;
        this.markdownEditor.setValue(text);
      } finally {
        this.suppressSourceEditorChange = false;
        this.suppressEditorChange = false;
      }
    }
    if (this.richEditor && this.richEditor.getValue() !== text) {
      this.suppressEditorChange = true;
      try {
        this.suppressRichEditorChange = true;
        this.richEditor.setValue(text);
      } finally {
        this.suppressRichEditorChange = false;
        this.suppressEditorChange = false;
      }
    }
    this.scheduleRichAssetRefresh();
  }

  syncLiteratureWorkspaceFromBody(body = "") {
    if (!this.els.literatureWorkspace) return;
    const parsed = parseLiteratureWorkspace(body || "");
    this.suppressLiteratureWorkspaceChange = true;
    try {
      if (this.els.literatureTitle) this.els.literatureTitle.value = parsed.title || "未命名笔记";
      if (this.els.literatureOriginal) this.els.literatureOriginal.value = parsed.originalText || "";
      if (this.els.literatureParaphrase) this.els.literatureParaphrase.value = parsed.paraphrase || "";
      if (this.els.literatureWhyKeep) this.els.literatureWhyKeep.value = parsed.whyKeep || "";
      if (this.els.literatureSupportsJudgment) this.els.literatureSupportsJudgment.value = parsed.supportsJudgment || "";
    } finally {
      this.suppressLiteratureWorkspaceChange = false;
    }
  }

  syncLiteratureWorkspaceToEditor() {
    if (this.suppressLiteratureWorkspaceChange || !this.isLiteratureWorkspaceActive()) return;
    this.setUnderlyingEditorValue(composeLiteratureWorkspace(this.literatureFieldsFromInputs()));
  }

  currentSelectionRect() {
    if (this.isSourceMode() && this.markdownEditor?.view?.coordsAtPos) {
      const selection = this.editorSelection();
      const coords = this.markdownEditor.view.coordsAtPos(Math.max(0, Number(selection.to || selection.from || 0)));
      if (coords) return coords;
    }
    const rect = this.richEditor?.selectionRect?.();
    if (rect) return rect;
    const host = (this.isSourceMode() ? this.els.editorHost : this.els.wysiwygHost) || this.els.body;
    return host?.getBoundingClientRect?.() || null;
  }

  defaultSaveUiState(tab = null) {
    if (!tab) return { mode: "idle", message: "" };
    return {
      mode: tab.dirty ? "dirty" : "saved",
      message: tab.dirty ? "" : ""
    };
  }

  ensureTabSaveUiState(tab) {
    if (!tab) return this.defaultSaveUiState();
    if (!tab.saveUiState || typeof tab.saveUiState !== "object") {
      tab.saveUiState = this.defaultSaveUiState(tab);
    }
    return tab.saveUiState;
  }

  activeSaveUiState() {
    const tab = this.activeTab();
    if (!tab) return this.saveUiState || this.defaultSaveUiState();
    return this.ensureTabSaveUiState(tab);
  }

  dirtyTabs() {
    return this.state.tabs.filter((t) => t.dirty);
  }

  hasDirtyTabs() {
    return this.dirtyTabs().length > 0;
  }

  confirmDiscardTab(tab) {
    if (!tab?.dirty) return true;
    return window.confirm(`“${tab.title || "未命名笔记"}”还有未同步的修改，关闭后会丢失这些更改。是否继续？`);
  }

  confirmDiscardDirtyTabs(message = "") {
    const dirty = this.dirtyTabs();
    if (!dirty.length) return true;
    const text =
      message ||
        `还有 ${dirty.length} 个打开的笔记带着未同步的修改，继续操作会丢失这些更改。是否继续？`;
    return window.confirm(text);
  }

  draftKey(noteId) {
    return `yansilu:draft:${noteId}`;
  }

  readDraft(noteId) {
    try {
      const raw = window.localStorage?.getItem(this.draftKey(noteId));
      if (!raw) return null;
      const draft = JSON.parse(raw);
      if (!draft || typeof draft.body !== "string") return null;
      return draft;
    } catch {
      return null;
    }
  }

  writeDraft(tab) {
    if (!tab?.noteId || !tab.dirty) return;
    const note = this.state.notes.find((item) => item.id === tab.noteId) || null;
    const authorshipState = this.ensureTabAuthorshipState(tab, note);
    try {
      window.localStorage?.setItem(
        this.draftKey(tab.noteId),
        JSON.stringify({
          noteId: tab.noteId,
          title: tab.title,
          body: tab.body,
          savedTitle: tab.savedTitle,
          savedBody: tab.savedBody,
          authorshipClaim: authorshipState.claim,
          authorshipConfirmed: authorshipState.confirmed,
          authorshipConfirmedBody: authorshipState.confirmedBody,
          updatedAt: new Date().toISOString()
        })
      );
    } catch {}
  }

  clearDraft(noteId) {
    if (!noteId) return;
    try {
      window.localStorage?.removeItem(this.draftKey(noteId));
    } catch {}
  }

  clearAutoSaveTimer() {
    if (!this.autoSaveTimer) return;
    clearTimeout(this.autoSaveTimer);
    this.autoSaveTimer = null;
  }

  scheduleAutoSave() {
    this.clearAutoSaveTimer();
    const tab = this.activeTab();
    if (!tab?.dirty) return;
    this.autoSaveTimer = setTimeout(() => {
      this.autoSaveTimer = null;
      void this.autoSaveActiveNote("idle");
    }, AUTO_SAVE_IDLE_MS);
  }

  async autoSaveActiveNote(trigger = "idle") {
    const tab = this.updateActiveTabFromEditor();
    if (!tab?.dirty) return true;
    if (this.savingPromise) return false;
    try {
      await this.saveActiveNote({ autoSave: true, trigger });
      return true;
    } catch {
      return false;
    }
  }

  maybeRestoreDraft(tab, note) {
    if (!tab || !note || tab.dirty) return;
    const draft = this.readDraft(note.id);
    if (!draft || draft.body === note.body) {
      this.clearDraft(note.id);
      return;
    }
    const updatedAt = draft.updatedAt ? `（${new Date(draft.updatedAt).toLocaleString()}）` : "";
    const shouldRestore = window.confirm(`检测到“${note.title || "未命名笔记"}”有上次未完成的编辑内容${updatedAt}，是否恢复？`);
    if (!shouldRestore) {
      this.clearDraft(note.id);
      return;
    }
    tab.body = draft.body;
    tab.title = titleFromBody(draft.body);
    tab.savedBody = note.body || "";
    tab.savedTitle = note.title || "未命名笔记";
    tab.dirty = true;
    tab.authorshipState = {
      claim: String(draft.authorshipClaim || authorshipSeedFromBody(draft.body)),
      confirmed: Boolean(draft.authorshipConfirmed),
      confirmedBody: String(draft.authorshipConfirmedBody || "")
    };
    tab.saveUiState = this.defaultSaveUiState(tab);
    this.onStatus("已恢复上次未完成的编辑内容", "warn");
  }

  syncTabMetadataFromNote(noteId) {
    const tab = this.state.tabs.find((item) => item.noteId === noteId);
    const note = this.state.notes.find((item) => item.id === noteId);
    if (!tab || !note || tab.dirty) return;
    tab.authorshipState = this.defaultAuthorshipState(note);
    tab.saveUiState = this.defaultSaveUiState(tab);
  }

  openNoteTab(noteId, options = {}) {
    const n = this.state.notes.find((x) => x.id === noteId);
    if (!n) return;
    const tabId = `tab_${noteId}`;
    let t = this.state.tabs.find((x) => x.id === tabId);
    if (!t) {
      t = {
        id: tabId,
        noteId: n.id,
        title: n.title,
        body: n.body,
        savedTitle: n.title,
        savedBody: n.body,
        dirty: false,
        authorshipState: this.defaultAuthorshipState(n),
        saveUiState: this.defaultSaveUiState({ dirty: false }),
        placeholderTitleArmed: n.title === "未命名笔记"
      };
      this.state.tabs.push(t);
      this.maybeRestoreDraft(t, n);
    }
    if (typeof t.savedBody !== "string") t.savedBody = t.body || "";
    if (typeof t.savedTitle !== "string") t.savedTitle = t.title || "未命名笔记";
    if (typeof t.dirty !== "boolean") t.dirty = false;
    this.ensureTabSaveUiState(t);
    this.pendingEditorFocus = options.preferTitleSelection ? "select-placeholder-title" : "focus-editor";
    this.state.activeTabId = tabId;
    this.fillEditorFromTab();
  }

  closeTab(tabId) {
    const idx = this.state.tabs.findIndex((t) => t.id === tabId);
    if (idx < 0) return;
    const tab = this.state.tabs[idx];
    this.clearAutoSaveTimer();
    if (!this.confirmDiscardTab(tab)) return false;
    this.clearDraft(tab.noteId);
    this.state.tabs.splice(idx, 1);
    if (this.state.activeTabId === tabId) {
      this.state.activeTabId = this.state.tabs[idx]?.id || this.state.tabs[idx - 1]?.id || null;
    }
    this.fillEditorFromTab();
    this.onStateChange("switch-tab");
    return true;
  }

  closeAllTabs() {
    this.clearAutoSaveTimer();
    if (!this.confirmDiscardDirtyTabs()) return false;
    for (const tab of this.dirtyTabs()) this.clearDraft(tab.noteId);
    this.state.tabs = [];
    this.state.activeTabId = null;
    this.fillEditorFromTab();
    this.onStateChange("switch-tab");
    return true;
  }

  renderTabs() {
    const activeNote = this.activeNote();
    const dirtyCount = this.state.tabs.filter((tab) => tab.dirty).length;
    const tabsHtml = this.state.tabs
      .map((t) => {
        const note = this.state.notes.find((n) => n.id === t.noteId);
        const noteType = note?.noteType || typeFromFolder(this.state, note?.folderId || "");
        return `
      <div class="tab ${t.id === this.state.activeTabId ? "active" : ""} ${t.dirty ? "dirty" : ""}" data-tab="${t.id}" title="${t.title}">
        <span class="tab-main">
          <span class="tab-kind" aria-hidden="true">${noteTypeGlyph(noteType)}</span>
          <span class="tab-dirty" aria-hidden="true">${t.dirty ? "●" : ""}</span>
          <span class="tab-title">${t.title}</span>
        </span>
        <button class="tab-close" data-close-tab="${t.id}" aria-label="关闭">×</button>
      </div>
    `;
      })
      .join("");

    const menuItems = this.state.tabs.length
      ? this.state.tabs
          .map(
            (t) => {
              const note = this.state.notes.find((n) => n.id === t.noteId);
              const noteType = note?.noteType || typeFromFolder(this.state, note?.folderId || "");
              return `<button class="tab-menu-item ${t.id === this.state.activeTabId ? "active" : ""}" data-switch-tab="${t.id}">
                <span class="tab-menu-item-shell">
                  <span class="tab-menu-item-main">
                    <span class="tab-menu-kind" aria-hidden="true">${noteTypeGlyph(noteType)}</span>
                    <span class="tab-menu-item-title">${t.title}</span>
                  </span>
                  <span>
                    ${t.dirty ? `<span class="tab-menu-item-note">编辑中</span>` : ""}
                    ${t.id === this.state.activeTabId ? `<span class="tab-menu-item-check">当前</span>` : ""}
                  </span>
                </span>
              </button>`;
            }
          )
          .join("")
      : `<div class="tab-menu-empty">未打开笔记</div>`;

    this.els.tabs.innerHTML = `
      <div class="tabs-shell">
        <div class="tabs-list">${tabsHtml || `<div class="tab active" data-tab="welcome"><span class="tab-title">未打开笔记</span></div>`}</div>
        <div class="tabs-meta">
          <span class="tabs-meta-pill"><strong>${this.state.tabs.length}</strong> 打开中</span>
          ${dirtyCount ? `<span class="tabs-meta-pill warn"><strong>${dirtyCount}</strong> 编辑中</span>` : ""}
          ${activeNote ? `<span class="tabs-meta-pill"><strong>${noteTypeText(activeNote.noteType)}</strong></span>` : `<span class="tabs-meta-pill">未打开笔记</span>`}
        </div>
        <div class="tabs-actions">
          <button class="tab-act" data-tabs-action="new" title="新建笔记">+</button>
          <button class="tab-act" data-tabs-action="toggle-menu" title="标签页菜单">▾</button>
        </div>
      </div>
      <div class="tab-menu hidden" data-tab-menu>
        <button class="tab-menu-item" data-tabs-action="close-all">全部关闭</button>
        <div class="tab-menu-sep"></div>
        ${menuItems}
      </div>
    `;
    this.onChromeChange();
  }

  fillEditorFromTab() {
    const t = this.activeTab();
    if (!t) {
      this.setEditorValue("");
      this.els.result.innerHTML = "打开一条笔记后，这里会显示能让观点继续生长的回链、同标签与关联判断。";
      this.setInspectorVisible(false);
      this.renderLiteratureWorkspace();
      this.renderPreview();
      this.renderPreviewVisibility();
      this.renderSaveHint();
      return;
    }
    this.ensureTabAuthorshipState(t, this.activeNote());
    this.setEditorValue(t.body || "");
    this.renderLiteratureWorkspace();
    this.renderRelated();
    this.renderPreview();
    this.renderPreviewVisibility();
    this.renderInspectorVisibility();
    this.renderSaveHint();
    this.updateToolbarFormattingState();
    this.applyPendingEditorFocus();
  }

  updateActiveTabFromEditor() {
    const t = this.activeTab();
    if (!t) return null;
    t.body = this.getEditorValue();
    t.title = titleFromBody(t.body);
    this.syncTabDirtyState(t);
    return t;
  }

  syncTabDirtyState(tab) {
    if (!tab) return;
    const savedBody = String(tab.savedBody || "");
    const savedTitle = String(tab.savedTitle || "");
    tab.dirty = savedBody !== String(tab.body || "") || savedTitle !== String(tab.title || "");
  }

  renderSaveHint() {
    const tab = this.activeTab();
    if (!tab) {
      if (this.els.statusHint) this.els.statusHint.textContent = "";
      this.renderSaveButton();
      this.renderCompleteButton();
      this.renderAuthorshipPanel();
      return;
    }
    const note = this.activeNote();
    const saveUiState = this.activeSaveUiState();
    if (this.isLiteratureWorkspaceActive(note)) {
      const completion = this.literatureCompletionState(note);
      if (this.els.statusHint) {
        this.els.statusHint.textContent = completion.hasParaphrase
          ? completion.status === "active"
            ? "文献笔记已完成。你保留的是被你理解过的材料，而不是孤立摘录。"
            : reflectionQuestionsHint("文献笔记已写转述。")
          : reflectionQuestionsHint("文献笔记待完成。");
      }
    } else if (this.isOriginalNote(note)) {
      if (this.els.statusHint && saveUiState?.mode === "blocked") {
        this.els.statusHint.textContent = reflectionQuestionsHint(saveUiState.message || "当前修改被拦下了。");
      } else if (this.els.statusHint) {
        this.els.statusHint.textContent = "";
      }
    } else if (this.els.statusHint && saveUiState?.mode === "blocked") {
      this.els.statusHint.textContent = reflectionQuestionsHint(saveUiState.message || "当前修改被拦下了。");
    } else if (this.els.statusHint) {
      this.els.statusHint.textContent = "";
    }
    this.renderSaveButton();
    this.renderCompleteButton();
    this.renderLiteratureWorkspace();
    this.renderAuthorshipPanel();
  }

  renderAuthorshipPanel() {
    return;
  }

  renderInspectorVisibility() {
    const visible = Boolean(this.state.inspectorVisible);
    this.els.editorWrap?.classList.toggle("inspector-closed", !visible);
    this.els.relatedPanel?.classList.toggle("hidden", !visible);
    if (this.els.showRelated) {
      this.els.showRelated.classList.toggle("active", visible);
      this.els.showRelated.dataset.tip = visible ? "收起关联侧栏" : "展开关联侧栏";
      this.els.showRelated.title = visible ? "收起关联侧栏" : "展开关联侧栏";
    }
    if (this.els.hideRelated) {
      this.els.hideRelated.classList.toggle("active", visible);
      this.els.hideRelated.textContent = visible ? "收起" : "展开";
      this.els.hideRelated.title = visible ? "收起关联侧栏" : "展开关联侧栏";
    }
  }

  setInspectorVisible(nextVisible) {
    this.state.inspectorVisible = Boolean(nextVisible);
    this.renderInspectorVisibility();
  }

  toggleInspector(forceValue = null) {
    const nextVisible = typeof forceValue === "boolean" ? forceValue : !this.state.inspectorVisible;
    this.setInspectorVisible(nextVisible);
    if (nextVisible) this.renderRelated("当前笔记关联总览");
  }

  setFocusMode(enabled) {
    if (enabled) {
      this.closeLinkPicker();
      this.closeTagPicker();
      this.setInspectorVisible(false);
    }
    this.renderInspectorVisibility();
    this.focusEditor();
  }

  renderSaveButton() {
    const button = this.els.save;
    if (!button) return;
    const tab = this.activeTab();
    const saveUiState = this.activeSaveUiState();
    const mode = saveUiState?.mode || "idle";

    button.classList.add("hidden");
    button.setAttribute("aria-hidden", "true");
    button.classList.remove("is-dirty", "is-saving", "is-saved", "is-error", "is-blocked");
    button.removeAttribute("aria-busy");

    const setIcon = (kind) => {
      button.innerHTML = saveIconMarkup(kind);
    };

    if (!tab) {
      button.disabled = true;
      setIcon("idle");
      button.dataset.tip = "请先打开一个笔记";
      button.title = "请先打开一个笔记";
      return;
    }

    button.disabled = mode === "saving";
    if (mode === "saving") {
      button.classList.add("is-saving");
      button.setAttribute("aria-busy", "true");
      setIcon("saving");
      button.dataset.tip = "正在同步到本地 Markdown...";
      button.title = "正在同步到本地 Markdown...";
      return;
    }

    if (mode === "error") {
      button.classList.add("is-error");
      setIcon("error");
      button.dataset.tip = saveUiState.message || "同步失败，请重试";
      button.title = saveUiState.message || "同步失败，请重试";
      return;
    }

    if (mode === "blocked") {
      button.classList.add("is-blocked");
      setIcon("blocked");
      button.dataset.tip = saveUiState.message || "原创性检测阻止同步";
      button.title = saveUiState.message || "原创性检测阻止同步";
      return;
    }

    if (tab.dirty) {
      button.classList.add("is-dirty");
      setIcon("idle");
      button.dataset.tip = "有未同步修改";
      button.title = "有未同步修改";
      return;
    }

    button.classList.add("is-saved");
    setIcon("saved");
    button.dataset.tip = "已自动同步";
    button.title = "已自动同步";
  }

  renderCompleteButton() {
    const button = this.els.completeNote;
    if (!button) return;
    button.classList.add("hidden");
    button.disabled = true;
    button.classList.remove("active");
    button.dataset.tip = "所有笔记现在都使用同一个编辑器";
    button.title = "所有笔记现在都使用同一个编辑器";
  }

  renderLiteratureWorkspace() {
    const note = this.activeNote();
    const isLiterature = false;
    this.els.literatureWorkspace?.classList.add("hidden");
    this.els.markdownSplit?.classList.remove("hidden");
    this.els.modeEdit?.classList.remove("hidden");
    this.els.modeSplit?.classList.toggle("hidden", true);
    if (!this.isOriginalNote(note)) this.hideOriginalityNotice();

    for (const el of [this.els.insertLink, this.els.insertImage, this.els.insertFile, this.els.insertTag, this.els.tableTools, this.els.codeTools, this.els.codeLanguage]) {
      el?.classList?.toggle?.("hidden", isLiterature);
    }
    document.querySelectorAll(".tb[data-md]").forEach((button) => button.classList.toggle("hidden", isLiterature));

    this.renderLiteratureQueue(note);
    this.renderOriginalActionButton(note);
  }

  setSaveUiState(mode, message = "") {
    const tab = this.activeTab();
    if (tab) tab.saveUiState = { mode, message };
    else this.saveUiState = { mode, message };
    this.renderSaveHint();
  }

  renderPreview() {
    if (!this.els.preview) return;
    const tab = this.activeTab();
    if (!tab) {
      this.els.preview.innerHTML = `<div class="markdown-preview-empty">打开或新建一条笔记后，这里显示 Markdown 预览。</div>`;
      return;
    }
    const note = this.activeNote();
    this.els.preview.innerHTML = renderMarkdownPreview(this.getEditorValue(), {
      noteMarkdownPath: note?.markdownPath || ""
    });
  }

  closeAssetPreview() {
    this.els.assetPreviewMask?.classList.add("hidden");
    if (this.els.assetPreviewBody) this.els.assetPreviewBody.innerHTML = "";
    if (this.els.assetPreviewTitle) this.els.assetPreviewTitle.textContent = "附件预览";
    if (this.els.assetPreviewOpenLink) this.els.assetPreviewOpenLink.href = "#";
  }

  openAssetPreview(url = "", label = "") {
    const cleanUrl = String(url || "").trim();
    if (!cleanUrl) {
      this.onStatus("这条附件当前没有可预览地址", "warn");
      return;
    }
    const previewLabel = String(label || "附件预览").trim() || "附件预览";
    if (!this.els.assetPreviewMask || !this.els.assetPreviewBody || !this.els.assetPreviewTitle) {
      window.open(cleanUrl, "_blank", "noopener,noreferrer");
      return;
    }
    this.els.assetPreviewTitle.textContent = previewLabel;
    if (this.els.assetPreviewOpenLink) this.els.assetPreviewOpenLink.href = cleanUrl;
    if (isPreviewImageUrl(cleanUrl)) {
      this.els.assetPreviewBody.innerHTML = `<img class="asset-preview-image" src="${escapeHtml(cleanUrl)}" alt="${escapeHtml(previewLabel)}">`;
    } else if (isPreviewPdfUrl(cleanUrl)) {
      this.els.assetPreviewBody.innerHTML = `<iframe class="asset-preview-frame" src="${escapeHtml(cleanUrl)}" title="${escapeHtml(previewLabel)}"></iframe>`;
    } else {
      this.els.assetPreviewBody.innerHTML = `
        <div class="asset-preview-empty">
          <div><strong>${escapeHtml(previewLabel)}</strong></div>
          <div>这类附件暂时不做站内内容渲染，但你可以直接在新窗口打开查看。</div>
        </div>
      `;
    }
    this.els.assetPreviewMask.classList.remove("hidden");
  }

  async copyText(text = "", successMessage = "已复制") {
    const value = String(text || "");
    if (!value) {
      this.onStatus("没有可复制的内容", "warn");
      return false;
    }
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
      } else {
        const temp = document.createElement("textarea");
        temp.value = value;
        temp.setAttribute("readonly", "readonly");
        temp.style.position = "fixed";
        temp.style.left = "-9999px";
        document.body.appendChild(temp);
        temp.select();
        document.execCommand("copy");
        temp.remove();
      }
      this.onStatus(successMessage, "ok");
      return true;
    } catch (error) {
      this.onStatus(`复制失败：${String(error?.message || error)}`, "bad");
      return false;
    }
  }

  currentTableBlockModel() {
    const block = this.currentBlockRange();
    const lines = String(block?.text || "").replace(/\r\n/g, "\n").split("\n");
    if (!isMarkdownTableStart(lines, 0)) return null;
    const header = parseMarkdownTableRow(lines[0]);
    const body = lines.slice(2).filter((line) => isMarkdownTableRow(line)).map((line) => parseMarkdownTableRow(line));
    const width = Math.max(2, header.length, ...body.map((row) => row.length));
    return { block, lines, header, body, width };
  }

  currentCodeBlockModel() {
    const block = this.currentBlockRange();
    const lines = String(block?.text || "").replace(/\r\n/g, "\n").split("\n");
    if (lines.length < 2 || !isMarkdownCodeFenceLine(lines[0])) return null;
    let closingIndex = lines.length - 1;
    if (!isMarkdownCodeFenceLine(lines[closingIndex] || "")) closingIndex = lines.length;
    const fenceLine = String(lines[0] || "");
    const language = normalizeCodeLanguage(fenceLine.replace(/^\s*```/, "").trim()) || "text";
    const content = lines.slice(1, closingIndex).join("\n");
    return {
      block,
      lines,
      language,
      content,
      hasClosingFence: closingIndex < lines.length
    };
  }

  setTableBlockModel(model, options = {}) {
    if (!model) return false;
    const width = Math.max(2, Number(model.width || 0));
    const headerRow = formatMarkdownTableRow(model.header || [], width);
    const separatorRow = formatMarkdownTableSeparator(width);
    const bodyRows = (model.body?.length ? model.body : [Array.from({ length: width }, (_, index) => (index === 0 ? "内容" : ""))]).map((row) => formatMarkdownTableRow(row, width));
    const next = [headerRow, separatorRow, ...bodyRows].join("\n");
    const selectionText = String(options.selectionText || "").trim();
    let selectionStart = model.block.from + next.length;
    let selectionEnd = selectionStart;
    if (selectionText) {
      const matchIndex = next.indexOf(selectionText);
      if (matchIndex >= 0) {
        selectionStart = model.block.from + matchIndex;
        selectionEnd = selectionStart + selectionText.length;
      }
    }
    this.replaceEditorRange(model.block.from, model.block.to, next, {
      selectionStart,
      selectionEnd
    });
    return true;
  }

  addTableRow() {
    const model = this.currentTableBlockModel();
    if (!model) {
      this.formatCurrentBlock("table");
      return;
    }
    const newRow = Array.from({ length: model.width }, (_, index) => (index === 0 ? "内容" : ""));
    model.body.push(newRow);
    this.setTableBlockModel(model, { selectionText: "内容" });
    this.onStatus("已在当前表格末尾新增一行", "ok");
  }

  addTableColumn() {
    const model = this.currentTableBlockModel();
    if (!model) {
      this.formatCurrentBlock("table");
      return;
    }
    const nextLabel = `列 ${model.width + 1}`;
    model.header = [...model.header, nextLabel];
    model.body = model.body.map((row, rowIndex) => [...row, rowIndex === 0 ? "内容" : ""]);
    model.width += 1;
    this.setTableBlockModel(model, { selectionText: nextLabel });
    this.onStatus("已为当前表格新增一列", "ok");
  }

  setCodeBlockLanguage(nextLanguage = "text") {
    const model = this.currentCodeBlockModel();
    if (!model) {
      this.formatCurrentBlock("code");
      return false;
    }
    const normalizedLanguage = normalizeCodeLanguage(nextLanguage) || "text";
    const supportedValues = new Set(CODE_BLOCK_LANGUAGE_OPTIONS.map((item) => item.value));
    const resolvedLanguage = supportedValues.has(normalizedLanguage) ? normalizedLanguage : "text";
    const currentSelection = this.editorSelection();
    const offsetFromBlockStart = Math.max(0, currentSelection.from - model.block.from);
    const currentFence = String(model.lines?.[0] || "").trim();
    const nextFence = resolvedLanguage === "text" ? "```" : `\`\`\`${resolvedLanguage}`;
    const next = `${nextFence}\n${model.content}\n\`\`\``;
    const delta = nextFence.length - currentFence.length;
    const nextSelection = offsetFromBlockStart <= currentFence.length ? nextFence.length + 1 : offsetFromBlockStart + delta;
    const anchor = model.block.from + Math.max(0, Math.min(nextSelection, next.length));
    this.replaceEditorRange(model.block.from, model.block.to, next, {
      selectionStart: anchor,
      selectionEnd: anchor
    });
    this.onStatus(`已将代码块语言切换为 ${resolvedLanguage}`, "ok");
    return true;
  }

  renderPreviewVisibility() {
    const mode = String(this.state.previewMode || "wysiwyg");
    const pendingSelection = this.pendingEditorSelection;
    this.pendingEditorSelection = null;
    const split = this.els.markdownSplit;
    if (split) {
      split.classList.remove("editor-mode-wysiwyg", "editor-mode-source");
      split.classList.add(mode === "source" ? "editor-mode-source" : "editor-mode-wysiwyg");
    }
    const showPreviewPanel = false;
    this.els.previewPanel?.classList.toggle("hidden", !showPreviewPanel);
    this.els.modeEdit?.classList.toggle("active", mode === "source");
    this.updateModeToggleButton(mode);
    this.els.modeSplit?.classList.add("hidden");
    if (this.richEditor && this.markdownEditor) {
      const content = this.isSourceMode() ? this.markdownEditor.getValue() : this.richEditor.getValue();
      this.setEditorValue(content);
      if (!this.isLiteratureWorkspaceActive()) {
        if (this.isSourceMode()) this.markdownEditor.focus();
        else this.richEditor.focus();
        if (
          pendingSelection &&
          Number.isFinite(pendingSelection.from) &&
          Number.isFinite(pendingSelection.to)
        ) {
          this.setEditorSelectionRange(pendingSelection.from, pendingSelection.to);
        }
      }
    }
    this.renderLiteratureWorkspace();
    this.renderContextualToolbarState();
  }

  updateModeToggleButton(mode = "wysiwyg") {
    const button = this.els.modeEdit;
    if (!button) return;
    if (mode === "source") {
      button.title = "切换到笔记模式 Ctrl/Cmd+1";
      button.dataset.tip = "切换到笔记模式 Ctrl/Cmd+1";
      button.setAttribute("aria-label", "切换到笔记模式");
      button.innerHTML = `<svg class="tb-svg" viewBox="0 0 16 16" aria-hidden="true"><path d="M2.25 3.2h11.5v9.6H2.25z" fill="none" stroke="currentColor" stroke-width="1.15"/><path d="M4.2 5.2h7.6M4.2 7.95h5.1M4.2 10.7h6.5" stroke="currentColor" stroke-width="1.05" stroke-linecap="round"/><path d="M11.3 9.05l1.15 1.15-2.15 2.15H9.15v-1.15z" fill="none" stroke="currentColor" stroke-width="1.05" stroke-linejoin="round"/></svg><span>笔记模式</span>`;
      return;
    }
    button.title = "切换到源码模式 Ctrl/Cmd+2";
    button.dataset.tip = "切换到源码模式 Ctrl/Cmd+2";
    button.setAttribute("aria-label", "切换到源码模式");
    button.innerHTML = `<svg class="tb-svg" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 3.2h10v9.6H3z" fill="none" stroke="currentColor" stroke-width="1.15"/><path d="M5 6.05l1.4 1.95L5 9.95M11 6.05L9.6 8 11 9.95M7.4 10.55l1.2-5.1" fill="none" stroke="currentColor" stroke-width="1.05" stroke-linecap="round" stroke-linejoin="round"/></svg><span>源码模式</span>`;
  }

  renderContextualToolbarState() {
    const active = this.detectActiveFormatting();
    const tableTools = this.els.tableTools;
    const codeTools = this.els.codeTools;
    if (tableTools) tableTools.classList.toggle("hidden", !this.isSourceMode() || !active.table);
    if (codeTools) codeTools.classList.toggle("hidden", !this.isSourceMode() || !active.code);
    if (this.els.headingLevel) {
      const value = Number(active.headingLevel || 0);
      this.els.headingLevel.value = value ? String(value) : this.activeTab() ? "p" : "";
    }
    this.renderOriginalActionButton();
  }

  renderOriginalActionButton(note = this.activeNote()) {
    const button = this.els.runGuard;
    if (!button) return;
    const isOriginal = this.isOriginalNote(note);
    const isSource = this.isOriginalRecordableSource(note);
    const hasGenerated = this.hasGeneratedOriginal(note);
    if (!note || (!isOriginal && !isSource)) {
      button.classList.add("hidden");
      button.disabled = true;
      return;
    }
    button.classList.remove("hidden");
    button.classList.remove("active");
    button.classList.remove("state-generated-original");
    if (isOriginal) {
      button.disabled = false;
      button.title = "原创性检测";
      button.dataset.tip = "原创性检测";
      button.setAttribute("aria-label", "原创性检测");
      button.innerHTML = `<svg class="tb-svg" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 1.9l4.5 1.6v3.95c0 2.7-1.55 4.77-4.5 6.65-2.95-1.88-4.5-3.95-4.5-6.65V3.5z" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/><path d="M6 7.95l1.3 1.3 2.75-2.75" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg><span>原创性检测</span>`;
      return;
    }
    if (hasGenerated) {
      button.disabled = true;
      button.classList.add("active");
      button.classList.add("state-generated-original");
      button.title = "这条笔记已经生成过原创笔记";
      button.dataset.tip = "已生成原创";
      button.setAttribute("aria-label", "已生成原创");
      button.innerHTML = `<svg class="tb-svg" viewBox="0 0 16 16" aria-hidden="true"><path d="M3.3 8.35l2.55 2.55 6.1-6.1" fill="none" stroke="currentColor" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round"/></svg><span>已生成原创</span>`;
      return;
    }
    button.disabled = false;
    button.title = this.isLiteratureNote(note) ? "把这条文献笔记记录成原创笔记" : "把这条随笔记录成原创笔记";
    button.dataset.tip = "记录原创笔记";
    button.setAttribute("aria-label", "记录原创笔记");
    button.innerHTML = `<svg class="tb-svg" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 2.35l1.55 3.15 3.48.5-2.52 2.45.6 3.45L8 10.25 4.9 11.9l.6-3.45L2.98 6l3.47-.5z" fill="none" stroke="currentColor" stroke-width="1.15" stroke-linejoin="round"/></svg><span>记录原创</span>`;
  }

  togglePreview(nextMode = null) {
    const current = String(this.state.previewMode || "wysiwyg");
    const fallbackOrder = ["wysiwyg", "source"];
    let resolved = String(nextMode || "").trim();
    if (!resolved) {
      const currentIndex = fallbackOrder.indexOf(current);
      resolved = fallbackOrder[(currentIndex + 1) % fallbackOrder.length] || "wysiwyg";
    }
    if (!["wysiwyg", "source"].includes(resolved)) resolved = "wysiwyg";
    if (resolved === current) {
      this.renderPreviewVisibility();
      return;
    }
    const latestValue = this.getEditorValue();
    this.pendingEditorSelection = this.isLiteratureWorkspaceActive() ? null : this.editorSelection();
    this.state.previewMode = resolved;
    this.setEditorValue(latestValue);
    this.renderPreviewVisibility();
  }

  async initRichEditor() {
    if (!this.els.wysiwygHost || this.richEditor) return;
    try {
      const { createWysiwygMarkdownEditor } = await import("/vendor/toastui-editor.bundle.js");
      this.richEditor = createWysiwygMarkdownEditor({
        parent: this.els.wysiwygHost,
        doc: this.els.body.value || "",
        initialMode: "wysiwyg",
        onChange: (value) => {
          if (this.suppressRichEditorChange || this.suppressEditorChange) return;
          const normalizedValue = normalizeWysiwygMarkdownValue(value).value;
          this.clearMarkdownSelectionOverride();
          this.els.body.value = normalizedValue;
          if (this.markdownEditor && this.markdownEditor.getValue() !== normalizedValue) {
            this.suppressSourceEditorChange = true;
            try {
              this.markdownEditor.setValue(normalizedValue);
            } finally {
              this.suppressSourceEditorChange = false;
            }
          }
          this.handleEditorInput();
          this.scheduleRichAssetRefresh();
        },
        onKeydown: (event) => this.handleEditorKeydown(event),
        onKeyup: () => this.updateToolbarFormattingState(),
        onClickToken: (token) => this.handleTokenAction(token)
      });
      this.els.wysiwygHost.addEventListener(
        "mousedown",
        (event) => {
          this.clearMarkdownSelectionOverride();
          if (this.extractRichAssetFromEvent(event)) {
            event.preventDefault();
            return;
          }
          if (!this.extractRichTokenFromEvent(event)) return;
          event.preventDefault();
        },
        true
      );
      this.els.wysiwygHost.addEventListener(
        "click",
        (event) => {
          const asset = this.extractRichAssetFromEvent(event);
          if (asset?.url) {
            event.preventDefault();
            event.stopPropagation();
            this.openAssetPreview(asset.url, asset.label);
            return;
          }
          const token = this.extractRichTokenFromEvent(event);
          if (!token) return;
          event.preventDefault();
          event.stopPropagation();
          this.handleTokenAction(token);
        },
        true
      );
      if (!this.richAssetObserver && typeof MutationObserver !== "undefined") {
        this.richAssetObserver = new MutationObserver(() => this.scheduleRichAssetRefresh());
        this.richAssetObserver.observe(this.els.wysiwygHost, {
          childList: true,
          subtree: true
        });
      }
      this.els.wysiwygHost.addEventListener("paste", (event) => {
        if (this.isSourceMode()) return;
        const files = [...(event.clipboardData?.files || [])].filter((file) => file.type);
        if (!files.length) return;
        event.preventDefault();
        void this.insertAssetFiles(files, { sourceLabel: "粘贴" });
      });
      this.els.wysiwygHost.addEventListener("dragover", (event) => {
        event.preventDefault();
        this.els.wysiwygHost?.classList.add("dragover");
      });
      this.els.wysiwygHost.addEventListener("dragleave", (event) => {
        if (event.relatedTarget && this.els.wysiwygHost?.contains(event.relatedTarget)) return;
        this.els.wysiwygHost?.classList.remove("dragover");
      });
      this.els.wysiwygHost.addEventListener("drop", (event) => {
        event.preventDefault();
        this.els.wysiwygHost?.classList.remove("dragover");
        const files = [...(event.dataTransfer?.files || [])];
        if (files.length) void this.insertAssetFiles(files, { sourceLabel: "拖入" });
      });
      this.setEditorValue(this.els.body.value || "");
      this.scheduleRichAssetRefresh();
    } catch (error) {
      this.onStatus(`所见即所得编辑器加载失败，暂时保留源代码模式：${String(error?.message || error)}`, "warn");
      this.state.previewMode = "source";
      this.renderPreviewVisibility();
    }
  }

  extractRichTokenFromEvent(event) {
    const target = event?.target?.closest?.("[data-wikilink],[data-tag-token]");
    if (!target) return "";
    if (target.dataset.wikilink) return `[[${target.dataset.wikilink}]]`;
    if (target.dataset.tagToken) return `#${target.dataset.tagToken}`;
    return "";
  }

  extractRichAssetFromEvent(event) {
    const target = event?.target?.closest?.("img[data-preview-asset-url], a[data-preview-asset-url]");
    if (!target?.dataset?.previewAssetUrl) return null;
    return {
      url: String(target.dataset.previewAssetUrl || "").trim(),
      label: String(target.dataset.previewAssetLabel || target.getAttribute?.("alt") || target.textContent || "").trim()
    };
  }

  scheduleRichAssetRefresh() {
    if (!this.els.wysiwygHost) return;
    if (this.richAssetRefreshTimer) return;
    const flush = () => {
      this.richAssetRefreshTimer = 0;
      this.refreshRichAssetBindings();
    };
    if (typeof requestAnimationFrame === "function") {
      this.richAssetRefreshTimer = requestAnimationFrame(flush);
      return;
    }
    this.richAssetRefreshTimer = window.setTimeout(flush, 0);
  }

  refreshRichAssetBindings() {
    const host = this.els.wysiwygHost;
    const noteMarkdownPath = this.activeNote()?.markdownPath || "";
    if (!host) return;

    host.querySelectorAll("img").forEach((node) => {
      const rawPath = String(node.dataset.assetSourcePath || node.getAttribute("src") || "").trim();
      if (!rawPath) return;
      const resolved = resolvePreviewableAsset(rawPath, noteMarkdownPath);
      const previewUrl = String(resolved.previewUrl || "").trim();
      if (!previewUrl) return;
      node.dataset.assetSourcePath = rawPath;
      node.dataset.previewAssetUrl = previewUrl;
      node.dataset.previewAssetLabel = String(node.getAttribute("alt") || attachmentLabelFromPath(rawPath)).trim() || "图片";
      if (node.getAttribute("src") !== previewUrl) node.setAttribute("src", previewUrl);
      node.setAttribute("loading", "lazy");
      node.setAttribute("decoding", "async");
      node.setAttribute("role", "button");
      node.setAttribute("tabindex", "0");
      node.classList.add("wysiwyg-inline-image", "wysiwyg-inline-asset");
    });

    host.querySelectorAll("a[href]").forEach((node) => {
      const rawPath = String(node.dataset.assetSourcePath || node.getAttribute("href") || "").trim();
      if (!rawPath) return;
      if (/^(#|mailto:|tel:|javascript:)/i.test(rawPath)) return;
      const resolved = resolvePreviewableAsset(rawPath, noteMarkdownPath);
      if (!resolved.isVaultAsset) return;
      const previewUrl = String(resolved.previewUrl || "").trim();
      if (!previewUrl) return;
      node.dataset.assetSourcePath = rawPath;
      node.dataset.previewAssetUrl = previewUrl;
      node.dataset.previewAssetLabel = String(node.textContent || attachmentLabelFromPath(rawPath)).trim() || "附件";
      node.setAttribute("href", previewUrl);
      node.setAttribute("target", "_blank");
      node.setAttribute("rel", "noopener noreferrer");
      node.classList.add("wysiwyg-inline-attachment", "wysiwyg-inline-asset");
    });
  }

  async initMarkdownEditor() {
    if (!this.els.editorHost || this.markdownEditor) return;
    try {
      const { createMarkdownEditor } = await import("/vendor/codemirror-editor.bundle.js");
      this.markdownEditor = createMarkdownEditor({
        parent: this.els.editorHost,
        doc: this.els.body.value || "",
        onChange: (value) => {
          if (this.suppressSourceEditorChange || this.suppressEditorChange) return;
          this.els.body.value = value;
          if (this.richEditor && this.richEditor.getValue() !== value) {
            this.suppressRichEditorChange = true;
            try {
              this.richEditor.setValue(value);
            } finally {
              this.suppressRichEditorChange = false;
            }
          }
          this.handleEditorInput();
        }
      });
      this.markdownEditor.indentSelection = (step = 1) => {
        this.indentSelection(step);
      };
      this.els.editorHost.addEventListener("click", (event) => {
        if (!event.ctrlKey && !event.metaKey) return;
        const position = this.markdownEditor?.view?.posAtCoords?.({ x: event.clientX, y: event.clientY });
        if (typeof position !== "number") return;
        const token = tokenAtCursor(this.getEditorValue(), position);
        this.handleTokenAction(token);
      });
      this.markdownEditor?.view?.contentDOM?.addEventListener(
        "keydown",
        (event) => {
          if (String(event.key || "") !== "Tab" || event.ctrlKey || event.metaKey || event.altKey || event.isComposing) {
            return;
          }
          event.preventDefault();
          event.stopPropagation();
          this.indentSelection(event.shiftKey ? -1 : 1);
        },
        true
      );
      this.els.editorHost.addEventListener("keydown", (event) => this.handleEditorKeydown(event), true);
      this.els.editorHost.addEventListener("keyup", () => this.updateToolbarFormattingState());
      this.els.editorHost.addEventListener("mouseup", () => this.updateToolbarFormattingState());
      this.els.editorHost.classList.add("ready");
      this.setEditorValue(this.els.body.value || "");
      this.updateToolbarFormattingState();
    } catch (error) {
      this.onStatus(`源代码编辑器加载失败，已降级为基础 textarea：${String(error?.message || error)}`, "warn");
      this.els.body.classList.remove("editor-sync-field");
    }
  }

  getEditorValue() {
    if (this.isLiteratureWorkspaceActive()) {
      return composeLiteratureWorkspace(this.literatureFieldsFromInputs());
    }
    if (this.isWysiwygMode()) {
      return String(this.els.body.value || "").replace(/\r\n/g, "\n");
    }
    const editor = this.currentEditor();
    if (editor?.getValue) return editor.getValue();
    return this.els.body.value;
  }

  setEditorValue(value) {
    const text = String(value || "");
    this.setUnderlyingEditorValue(text);
    this.syncLiteratureWorkspaceFromBody(text);
  }

  editorSelection() {
    if (this.isLiteratureWorkspaceActive()) {
      const active = document.activeElement;
      if (active instanceof HTMLTextAreaElement || active instanceof HTMLInputElement) {
        return {
          from: active.selectionStart || 0,
          to: active.selectionEnd || 0
        };
      }
      return { from: 0, to: 0 };
    }
    if (this.isWysiwygMode() && this.markdownSelectionOverride) {
      return this.markdownSelectionOverride;
    }
    if (this.isWysiwygMode() && this.richEditor?.selection) {
      const richValue = this.richEditor.getValue?.() || "";
      const selection = this.richEditor.selection();
      const normalized = normalizeWysiwygMarkdownValue(richValue, [selection.from, selection.to]);
      return {
        from: normalized.offsets[0],
        to: normalized.offsets[1]
      };
    }
    const editor = this.currentEditor();
    if (editor?.selection) return editor.selection();
    return { from: this.els.body.selectionStart || 0, to: this.els.body.selectionEnd || 0 };
  }

  focusEditor() {
    if (this.isLiteratureWorkspaceActive()) {
      this.els.literatureParaphrase?.focus();
      return;
    }
    const editor = this.currentEditor();
    if (editor?.focus) editor.focus();
    else this.els.body.focus();
  }

  setEditorSelectionRange(from, to) {
    if (this.isLiteratureWorkspaceActive()) {
      const target = this.els.literatureParaphrase || this.els.literatureOriginal || this.els.literatureTitle;
      target?.focus();
      target?.setSelectionRange?.(from, to);
      return;
    }
    const start = Math.max(0, Number(from) || 0);
    const end = Math.max(start, Number(to) || 0);
    this.focusEditor();
    const editor = this.currentEditor();
    if (editor?.setSelectionRange) {
      try {
        editor.setSelectionRange(start, end);
      } catch {
        editor.focus?.();
      }
      return;
    }
    this.els.body.setSelectionRange(start, end);
  }

  moveVisibleCaretToBlockStart() {
    return false;
  }

  moveCaretToBodyStart() {
    const value = String(this.getEditorValue() || "").replace(/\r\n/g, "\n");
    if (!value.startsWith("# ")) return false;
    const paragraphBreak = value.indexOf("\n\n");
    if (paragraphBreak >= 0) {
      this.setEditorSelectionRange(paragraphBreak + 2, paragraphBreak + 2);
      return true;
    }
    const lineEnd = value.indexOf("\n");
    if (lineEnd >= 0) {
      this.setEditorSelectionRange(lineEnd + 1, lineEnd + 1);
      return true;
    }
    return false;
  }

  moveCaretToInsertedStructure(kind) {
    const { from, to } = this.currentBlockRange();
    const blockText = String(this.getEditorValue() || "").slice(from, to);
    if (kind === "h2" && blockText.startsWith("## ")) {
      this.setEditorSelectionRange(from + 3, to);
      return true;
    }
    if (kind === "quote" && blockText.startsWith("> ")) {
      this.setEditorSelectionRange(from + 2, to);
      return true;
    }
    if (kind === "ul" && blockText.startsWith("- ")) {
      this.setEditorSelectionRange(from + 2, to);
      return true;
    }
    if (kind === "code" && blockText.startsWith("```")) {
      const firstLineEnd = blockText.indexOf("\n");
      const codeEnd = blockText.lastIndexOf("\n```");
      if (firstLineEnd >= 0 && codeEnd > firstLineEnd) {
        this.setEditorSelectionRange(from + firstLineEnd + 1, from + codeEnd);
        return true;
      }
    }
    if (kind === "table" && blockText.trimStart().startsWith("|")) {
      const visibleStart = blockText.indexOf("| ");
      const visibleEnd = blockText.indexOf(" |", Math.max(0, visibleStart + 2));
      if (visibleStart >= 0 && visibleEnd > visibleStart) {
        this.setEditorSelectionRange(from + visibleStart + 2, from + visibleEnd);
        return true;
      }
    }
    return false;
  }

  placeholderTitleRange(text) {
    const value = String(text || "");
    if (!value.startsWith("# ")) return null;
    const lineEnd = value.indexOf("\n");
    const end = lineEnd >= 0 ? lineEnd : value.length;
    const title = value.slice(2, end).trim();
    if (title !== "未命名笔记") return null;
    return { from: 2, to: end };
  }

  firstHeadingEntryContext() {
    const value = this.getEditorValue();
    if (!String(value || "").startsWith("# ")) return null;
    const lineEnd = value.indexOf("\n");
    const end = lineEnd >= 0 ? lineEnd : value.length;
    const selection = this.editorSelection();
    if (selection.from !== selection.to) return null;
    if (selection.from < 2 || selection.from > end) return null;
    return {
      value,
      headingEnd: end,
      cursor: selection.from
    };
  }

  isEditingTitleLine() {
    return Boolean(this.firstHeadingEntryContext());
  }

  enterBodyFromTitle() {
    const context = this.firstHeadingEntryContext();
    if (!context) return false;
    const { value, headingEnd } = context;
    const afterHeading = value.slice(headingEnd);
    if (afterHeading.startsWith("\n\n")) {
      this.setEditorSelectionRange(headingEnd + 2, headingEnd + 2);
      return true;
    }
    if (afterHeading.startsWith("\n")) {
      this.replaceEditorRange(headingEnd, headingEnd + 1, "\n\n", {
        selectionStart: headingEnd + 2,
        selectionEnd: headingEnd + 2
      });
      return true;
    }
    this.replaceEditorRange(headingEnd, headingEnd, "\n\n", {
      selectionStart: headingEnd + 2,
      selectionEnd: headingEnd + 2
    });
    return true;
  }

  applyPendingEditorFocus() {
    const mode = this.pendingEditorFocus;
    this.pendingEditorFocus = null;
    if (!mode) return;
    if (this.isLiteratureWorkspaceActive()) {
      if (mode === "select-placeholder-title") {
        const titleInput = this.els.literatureTitle;
        titleInput?.focus();
        titleInput?.select?.();
        return;
      }
      this.els.literatureParaphrase?.focus();
      return;
    }
    const applyPlaceholderSelection = () => {
      if (this.isWysiwygMode() && this.els.wysiwygHost) {
        const heading = this.els.wysiwygHost.querySelector(".toastui-editor-contents h1");
        const titleNode = heading?.firstChild;
        const titleText = String(heading?.textContent || "");
        if (!titleNode || !titleText) return false;
        this.richEditor?.focus?.();
        const selection = window.getSelection?.();
        if (!selection) return false;
        const range = document.createRange();
        range.setStart(titleNode, 0);
        range.setEnd(titleNode, titleText.length);
        selection.removeAllRanges();
        selection.addRange(range);
        return true;
      }
      const range = this.placeholderTitleRange(this.getEditorValue());
      if (!range) return false;
      this.setEditorSelectionRange(range.from, range.to);
      return true;
    };
    const apply = () => {
      if (mode === "select-placeholder-title") {
        if (applyPlaceholderSelection()) {
          if (typeof window !== "undefined" && typeof window.setTimeout === "function") {
            window.setTimeout(() => {
              applyPlaceholderSelection();
            }, 32);
            window.setTimeout(() => {
              applyPlaceholderSelection();
            }, 96);
          }
          return;
        }
      }
      this.focusEditor();
    };
    const scheduleApply = (attempt = 0) => {
      const run = () => {
        if (mode !== "select-placeholder-title") {
          apply();
          return;
        }
        if (applyPlaceholderSelection()) {
          if (typeof window !== "undefined" && typeof window.setTimeout === "function") {
            window.setTimeout(() => {
              applyPlaceholderSelection();
            }, 32);
            window.setTimeout(() => {
              applyPlaceholderSelection();
            }, 96);
          }
          return;
        }
        if (attempt >= 7) {
          this.focusEditor();
          return;
        }
        scheduleApply(attempt + 1);
      };
      if (typeof window !== "undefined" && typeof window.requestAnimationFrame === "function") {
        window.requestAnimationFrame(run);
        return;
      }
      setTimeout(run, 16);
    };
    scheduleApply();
  }

  insertAtCursor(text) {
    if (this.isWysiwygMode() && this.richEditor?.insertText) {
      this.richEditor.insertText(String(text || ""));
      this.els.body.value = this.richEditor.getValue();
      this.handleEditorInput();
      return;
    }
    const { from, to } = this.editorSelection();
    this.replaceEditorRange(from, to, text, { selectionStart: from + String(text || "").length });
  }

  wrapSelection(prefix, suffix = "") {
    if (this.isWysiwygMode() && this.richEditor) {
      if (prefix === "**" && suffix === "**") {
        this.richEditor.exec("bold");
        return;
      }
      if (prefix === "*" && suffix === "*") {
        this.richEditor.exec("italic");
        return;
      }
    }
    const value = this.getEditorValue();
    const { from, to } = this.editorSelection();
    let start = from;
    let end = to;
    if (start === end && prefix && suffix) {
      const tokenRange = this.currentWordRange(value, start);
      if (tokenRange) {
        start = tokenRange.from;
        end = tokenRange.to;
      }
    }
    const sel = value.slice(start, end);
    if (!sel && prefix && suffix) {
      const next = `${prefix}${suffix}`;
      this.replaceEditorRange(start, end, next, {
        selectionStart: start + prefix.length,
        selectionEnd: start + prefix.length
      });
      return;
    }
    const next = `${prefix}${sel}${suffix}`;
    this.replaceEditorRange(start, end, next, {
      selectionStart: start + prefix.length,
      selectionEnd: start + prefix.length + sel.length
    });
  }

  currentWordRange(value, cursor) {
    const text = String(value || "");
    const index = Math.max(0, Math.min(Number(cursor) || 0, text.length));
    if (!text) return null;
    const isTokenChar = (char) => /[\p{L}\p{N}_\-\u4e00-\u9fff]/u.test(char || "");
    let from = index;
    let to = index;
    while (from > 0 && isTokenChar(text[from - 1])) from -= 1;
    while (to < text.length && isTokenChar(text[to])) to += 1;
    if (from === to) return null;
    return { from, to };
  }

  replaceEditorRange(from, to, text, options = {}) {
    const insert = String(text || "");
    const selectionStart = Number.isFinite(options.selectionStart) ? Number(options.selectionStart) : from + insert.length;
    const selectionEnd = Number.isFinite(options.selectionEnd) ? Number(options.selectionEnd) : selectionStart;
    const editor = this.currentEditor();
    if (editor?.replaceRange) {
      editor.replaceRange(from, to, insert);
      this.els.body.value = editor.getValue();
      if (editor !== this.richEditor || this.isSourceMode()) {
        try {
          editor.setSelectionRange(selectionStart, selectionEnd);
        } catch {
          editor.focus?.();
        }
      }
      const syncValue = editor.getValue();
      if (editor !== this.markdownEditor && this.markdownEditor && this.markdownEditor.getValue() !== syncValue) {
        this.suppressSourceEditorChange = true;
        try {
          this.markdownEditor.setValue(syncValue);
        } finally {
          this.suppressSourceEditorChange = false;
        }
      }
      if (editor !== this.richEditor && this.richEditor && this.richEditor.getValue() !== syncValue) {
        this.suppressRichEditorChange = true;
        try {
          this.richEditor.setValue(syncValue);
        } finally {
          this.suppressRichEditorChange = false;
        }
      }
      this.handleEditorInput();
      return;
    }
    this.els.body.setRangeText(insert, from, to, "end");
    this.els.body.focus();
    this.els.body.setSelectionRange(selectionStart, selectionEnd);
    this.handleEditorInput();
  }

  replaceMarkdownWhileInWysiwyg(from, to, text, options = {}) {
    if (!this.isWysiwygMode() || !this.markdownEditor?.replaceRange) return false;
    const insert = String(text || "");
    const selectionStart = Number.isFinite(options.selectionStart) ? Number(options.selectionStart) : from + insert.length;
    const selectionEnd = Number.isFinite(options.selectionEnd) ? Number(options.selectionEnd) : selectionStart;
    this.markdownEditor.replaceRange(from, to, insert);
    const syncValue = this.markdownEditor.getValue();
    this.els.body.value = syncValue;
    if (this.richEditor && this.richEditor.getValue() !== syncValue) {
      this.suppressRichEditorChange = true;
      try {
        this.richEditor.setValue(syncValue);
      } finally {
        this.suppressRichEditorChange = false;
      }
    }
    this.setMarkdownSelectionOverride(selectionStart, selectionEnd);
    this.richEditor?.focus?.();
    this.handleEditorInput();
    return true;
  }

  async fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = String(reader.result || "");
        const [, base64 = ""] = result.split(",", 2);
        resolve(base64);
      };
      reader.onerror = () => reject(new Error(`读取文件失败：${file?.name || "unknown"}`));
      reader.readAsDataURL(file);
    });
  }

  assetMarkdownSnippet(asset = {}) {
    return assetMarkdownSnippet(asset);
  }

  normalizeAssetInsertText(assets = []) {
    const snippets = assets.map((item) => this.assetMarkdownSnippet(item)).filter(Boolean);
    if (!snippets.length) return "";
    const { from, to } = this.editorSelection();
    const value = this.getEditorValue();
    const beforeChar = from > 0 ? value[from - 1] : "";
    const afterChar = to < value.length ? value[to] : "";
    const prefix = beforeChar && beforeChar !== "\n" ? "\n\n" : beforeChar === "\n" ? "\n" : "";
    const suffix = afterChar && afterChar !== "\n" ? "\n\n" : afterChar === "\n" ? "\n" : "";
    return `${prefix}${snippets.join("\n\n")}${suffix}`;
  }

  async insertAssetFiles(filesLike, { sourceLabel = "插入" } = {}) {
    const note = this.activeNote();
    if (!note) {
      this.onStatus("请先打开一个笔记", "warn");
      return;
    }
    const files = [...(filesLike || [])].filter(Boolean);
    if (!files.length) return;
    this.onStatus(`${sourceLabel}文件处理中...`, "ok");
    try {
      const uploaded = [];
      for (const file of files) {
        const contentBase64 = await this.fileToBase64(file);
        const item = await uploadNoteAsset(note.id, {
          fileName: file.name,
          mimeType: file.type || "",
          contentBase64,
          kind: String(file.type || "").toLowerCase().startsWith("image/") ? "image" : "file"
        });
        if (item) uploaded.push(item);
      }
      if (!uploaded.length) throw new Error("未能写入任何附件");
      const insertText = this.normalizeAssetInsertText(uploaded);
      const { from, to } = this.editorSelection();
      const nextCursor = from + insertText.length;
      if (this.isWysiwygMode() && this.markdownEditor?.replaceRange) {
        this.markdownEditor.replaceRange(from, to, insertText);
        const syncValue = this.markdownEditor.getValue();
        this.els.body.value = syncValue;
        if (this.richEditor && this.richEditor.getValue() !== syncValue) {
          this.suppressRichEditorChange = true;
          try {
            this.richEditor.setValue(syncValue);
          } finally {
            this.suppressRichEditorChange = false;
          }
        }
        this.setMarkdownSelectionOverride(nextCursor, nextCursor);
        this.richEditor?.focus?.();
        this.handleEditorInput();
        this.scheduleRichAssetRefresh();
      } else {
        this.replaceEditorRange(from, to, insertText, {
          selectionStart: nextCursor,
          selectionEnd: nextCursor
        });
      }
      const imageCount = uploaded.filter((item) => item.assetKind === "image").length;
      const fileCount = uploaded.length - imageCount;
      const detail = [];
      if (imageCount) detail.push(`${imageCount} 张图片`);
      if (fileCount) detail.push(`${fileCount} 个附件`);
      this.onStatus(`已插入${detail.join("、")}`, "ok");
    } catch (error) {
      this.onStatus(`插入附件失败：${String(error?.message || error)}`, "bad");
    } finally {
      if (this.els.assetImageInput?.value) this.els.assetImageInput.value = "";
      if (this.els.assetFileInput?.value) this.els.assetFileInput.value = "";
      this.els.editorHost?.classList.remove("dragover");
    }
  }

  titleBlockBoundary(value = this.getEditorValue()) {
    const text = String(value || "").replace(/\r\n/g, "\n");
    if (!text.startsWith("# ")) return null;
    const titleEnd = text.indexOf("\n\n");
    if (titleEnd >= 0) return { from: 0, to: titleEnd };
    const lineEnd = text.indexOf("\n");
    return { from: 0, to: lineEnd >= 0 ? lineEnd : text.length };
  }

  currentBlockRange() {
    const value = String(this.getEditorValue() || "").replace(/\r\n/g, "\n");
    const { from, to } = this.editorSelection();
    const anchor = Math.max(0, Math.min(from, to));
    const seekStart = Math.max(0, anchor - 2);
    let blockStart = value.lastIndexOf("\n\n", seekStart);
    blockStart = blockStart < 0 ? 0 : blockStart + 2;
    let blockEnd = value.indexOf("\n\n", Math.max(anchor, to));
    blockEnd = blockEnd < 0 ? value.length : blockEnd;
    return {
      from: blockStart,
      to: blockEnd,
      text: value.slice(blockStart, blockEnd),
      value
    };
  }

  stripStructuralMarkdown(text) {
    return String(text || "")
      .split("\n")
      .map((line) => line.replace(/^\s*(#{1,6}\s+|>\s+|-+\s+|\d+[.)]\s+|```+\s*)/, ""))
      .join("\n");
  }

  defaultStructuredInsert(kind) {
    if (kind === "code") {
      return {
        text: "```\n代码块\n```",
        selectionStart: 4,
        selectionEnd: 7
      };
    }
    if (kind === "table") {
      const text = "| 列 1 | 列 2 |\n| --- | --- |\n| 内容 | 内容 |";
      return {
        text,
        selectionStart: 2,
        selectionEnd: 5
      };
    }
    if (kind === "hr") {
      return {
        text: "---",
        selectionStart: 3,
        selectionEnd: 3
      };
    }
    return null;
  }

  tableBlockFromText(seed = "") {
    const source = String(seed || "").replace(/\r\n/g, "\n").trim();
    if (!source) return "| 列 1 | 列 2 |\n| --- | --- |\n| 内容 | 内容 |";

    const rows = source
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    if (rows.length >= 2 && isMarkdownTableRow(rows[0]) && isMarkdownTableSeparator(rows[1])) {
      const parsedRows = [parseMarkdownTableRow(rows[0]), ...rows.slice(2).filter((line) => isMarkdownTableRow(line)).map((line) => parseMarkdownTableRow(line))];
      const width = Math.max(2, ...parsedRows.map((row) => row.length));
      return [formatMarkdownTableRow(parsedRows[0], width), formatMarkdownTableSeparator(width), ...parsedRows.slice(1).map((row) => formatMarkdownTableRow(row, width))].join("\n");
    }

    const firstRow = rows.find((line) => isMarkdownTableRow(line));
    if (firstRow) {
      const parsed = rows.filter((line) => isMarkdownTableRow(line)).map((line) => parseMarkdownTableRow(line));
      const width = Math.max(2, ...parsed.map((row) => row.length));
      const header = parsed[0];
      const body = parsed.slice(1);
      return [formatMarkdownTableRow(header, width), formatMarkdownTableSeparator(width), ...(body.length ? body : [Array.from({ length: width }, (_, index) => (index === 0 ? "内容" : ""))]).map((row) => formatMarkdownTableRow(row, width))].join("\n");
    }

    const summary = this.stripStructuralMarkdown(source).split(/\n+/).map((line) => line.trim()).filter(Boolean)[0] || "内容";
    return `| 主题 | 说明 |\n| --- | --- |\n| ${summary.replace(/\|/g, " ")} | 补充说明 |`;
  }

  formatCurrentBlock(kind) {
    const headingMatch = /^h([1-6])$/.exec(String(kind || ""));
    const headingLevel = headingMatch ? Number(headingMatch[1]) : 0;
    const active = this.detectActiveFormatting();
    if (this.isWysiwygMode() && this.richEditor) {
      if (headingLevel) {
        this.suppressInlinePickersOnce();
        this.richEditor.exec("heading", { level: headingLevel });
        return;
      }
      if (kind === "quote") {
        if (active.quote) {
          this.clearCurrentBlockStructure();
          return;
        }
        this.richEditor.exec("blockQuote");
        return;
      }
      if (kind === "ul") {
        if (active.ul) {
          this.clearCurrentBlockStructure();
          return;
        }
        this.richEditor.exec("bulletList");
        return;
      }
      if (kind === "checklist") {
        if (active.checklist) {
          this.clearCurrentBlockStructure();
          return;
        }
        this.richEditor.exec("taskList");
        return;
      }
      if (kind === "code") {
        this.richEditor.exec("codeBlock");
        return;
      }
      if (kind === "table") {
        this.richEditor.exec("table");
        return;
      }
      if (kind === "hr") {
        this.richEditor.exec("hr");
        return;
      }
    }
    const block = this.currentBlockRange();
    const titleBoundary = this.titleBlockBoundary(block.value);
    const selection = this.editorSelection();
    const selectionInTitle = Boolean(titleBoundary && selection.from <= titleBoundary.to);
    const hasExplicitSelection = selection.from !== selection.to;
    const blockHasContent = Boolean(block.text.trim());

    if (selectionInTitle) {
      const insertPos = titleBoundary ? titleBoundary.to : 0;
      const insertMap = {
        h1: { text: "\n\n# 标题", selectFrom: "\n\n# ".length, selectLength: "标题".length },
        h2: { text: "\n\n## 小标题", selectFrom: "\n\n## ".length, selectLength: "小标题".length },
        h3: { text: "\n\n### 小标题", selectFrom: "\n\n### ".length, selectLength: "小标题".length },
        h4: { text: "\n\n#### 小标题", selectFrom: "\n\n#### ".length, selectLength: "小标题".length },
        h5: { text: "\n\n##### 小标题", selectFrom: "\n\n##### ".length, selectLength: "小标题".length },
        h6: { text: "\n\n###### 小标题", selectFrom: "\n\n###### ".length, selectLength: "小标题".length },
        quote: { text: "\n\n> 引用内容", selectFrom: "\n\n> ".length, selectLength: "引用内容".length },
        ul: { text: "\n\n- 列表项", selectFrom: "\n\n- ".length, selectLength: "列表项".length },
        checklist: { text: "\n\n- [ ] 待办项", selectFrom: "\n\n- [ ] ".length, selectLength: "待办项".length },
        code: { text: "\n\n```\n代码块\n```\n\n", selectFrom: "\n\n```\n".length, selectLength: "代码块".length },
        table: { text: "\n\n| 列 1 | 列 2 |\n| --- | --- |\n| 内容 | 内容 |\n\n", selectFrom: "\n\n| ".length, selectLength: "列 1".length },
        hr: { text: "\n\n---\n\n", selectFrom: "\n\n---\n\n".length, selectLength: 0 }
      };
      const insert = insertMap[kind];
      if (!insert) return;
      if (headingLevel) this.suppressInlinePickersOnce();
      this.replaceEditorRange(insertPos, insertPos, insert.text, {
        selectionStart: insertPos + insert.selectFrom,
        selectionEnd: insertPos + insert.selectFrom + insert.selectLength
      });
      return;
    }

    if (!hasExplicitSelection && blockHasContent && ["code", "table", "hr"].includes(kind) && !active[kind]) {
      const insert = this.defaultStructuredInsert(kind);
      if (!insert) return;
      const prefix = block.to > 0 && !block.value.slice(Math.max(0, block.to - 2), block.to).includes("\n\n") ? "\n\n" : block.to === 0 ? "" : "";
      const suffix = "\n\n";
      const insertText = `${prefix}${insert.text}${suffix}`;
      const anchorBase = block.to + prefix.length;
      this.replaceEditorRange(block.to, block.to, insertText, {
        selectionStart: anchorBase + insert.selectionStart,
        selectionEnd: anchorBase + insert.selectionEnd
      });
      return;
    }

    const raw = block.text.trim() || (headingLevel ? "小标题" : kind === "quote" ? "引用内容" : "列表项");
    if (kind === "checklist") {
      const checklistSeed = block.text.trim() || "待办项";
      const lines = this.stripStructuralMarkdown(checklistSeed)
        .split(/\n+/)
        .map((line) => line.trim())
        .filter(Boolean);
      const next = (lines.length ? lines : ["待办项"]).map((line) => `- [ ] ${line}`).join("\n");
      this.replaceEditorRange(block.from, block.to, next, {
        selectionStart: block.from + 6,
        selectionEnd: block.from + next.length
      });
      return;
    }
    if (kind === "code") {
      const seed = block.text.trim() || "代码块";
      const content = seed.replace(/^```[\w-]*\n?/, "").replace(/\n?```$/, "") || "代码块";
      const inferredLanguage = inferCodeLanguage(content);
      const fence = inferredLanguage && inferredLanguage !== "text" ? `\`\`\`${inferredLanguage}` : "```";
      const next = `${fence}\n${content}\n\`\`\``;
      const selectionOffset = fence.length + 1;
      this.replaceEditorRange(block.from, block.to, next, {
        selectionStart: block.from + selectionOffset,
        selectionEnd: block.from + selectionOffset + content.length
      });
      return;
    }
    if (kind === "table") {
      const next = this.tableBlockFromText(block.text);
      const cellStart = next.indexOf("| ");
      const cellEnd = next.indexOf(" |", Math.max(0, cellStart + 2));
      this.replaceEditorRange(block.from, block.to, next, {
        selectionStart: block.from + (cellStart >= 0 ? cellStart + 2 : 0),
        selectionEnd: block.from + (cellEnd > cellStart ? cellEnd : next.length)
      });
      return;
    }
    if (kind === "hr") {
      const next = "---";
      this.replaceEditorRange(block.from, block.to, next, {
        selectionStart: block.from + next.length,
        selectionEnd: block.from + next.length
      });
      return;
    }
    const clean = this.stripStructuralMarkdown(raw).trim() || raw.trim();
    if (kind === "quote" && active.quote) {
      const next = clean.split(/\n+/).map((line) => line.trim()).filter(Boolean).join("\n") || "正文";
      this.replaceEditorRange(block.from, block.to, next, {
        selectionStart: block.from,
        selectionEnd: block.from + next.length
      });
      return;
    }
    if (kind === "ul" && active.ul) {
      const next = clean.split(/\n+/).map((line) => line.trim()).filter(Boolean).join("\n") || "正文";
      this.replaceEditorRange(block.from, block.to, next, {
        selectionStart: block.from,
        selectionEnd: block.from + next.length
      });
      return;
    }
    if (kind === "checklist" && active.checklist) {
      const next = clean.split(/\n+/).map((line) => line.trim()).filter(Boolean).join("\n") || "正文";
      this.replaceEditorRange(block.from, block.to, next, {
        selectionStart: block.from,
        selectionEnd: block.from + next.length
      });
      return;
    }
    let next = raw;
    if (headingLevel) next = `${"#".repeat(headingLevel)} ${clean.replace(/\s*\n+\s*/g, " ").trim()}`;
    if (kind === "quote") next = clean.split(/\n+/).map((line) => `> ${line.trim()}`).join("\n");
    if (kind === "ul") next = clean.split(/\n+/).map((line) => `- ${line.trim()}`).join("\n");
    const selectionStart = headingLevel ? block.from + headingLevel + 1 : block.from;
    const selectionEnd = block.from + next.length;
    if (headingLevel) this.suppressInlinePickersOnce();
    this.replaceEditorRange(block.from, block.to, next, {
      selectionStart,
      selectionEnd
    });
  }

  clearCurrentHeading() {
    const block = this.currentBlockRange();
    const text = String(block?.text || "");
    const match = text.match(/^(\s*)#{1,6}\s+/);
    if (!match) return;
    const next = `${match[1] || ""}${text.slice(match[0].length)}`;
    const selection = this.editorSelection();
    const removed = match[0].length - (match[1] || "").length;
    const nextStart = Math.max(block.from, selection.from - removed);
    const nextEnd = Math.max(nextStart, selection.to - removed);
    if (this.isWysiwygMode() && this.markdownEditor?.replaceRange) {
      this.suppressInlinePickersOnce();
      this.markdownEditor.replaceRange(block.from, block.to, next);
      const syncValue = this.markdownEditor.getValue();
      this.els.body.value = syncValue;
      if (this.richEditor && this.richEditor.getValue() !== syncValue) {
        this.suppressRichEditorChange = true;
        try {
          this.richEditor.setValue(syncValue);
        } finally {
          this.suppressRichEditorChange = false;
        }
      }
      this.richEditor?.setSelectionRange?.(nextStart, nextEnd);
      this.handleEditorInput();
      return;
    }
    this.suppressInlinePickersOnce();
    this.replaceEditorRange(block.from, block.to, next, {
      selectionStart: nextStart,
      selectionEnd: nextEnd
    });
  }

  clearCurrentBlockStructure(fallback = "正文") {
    const block = this.currentBlockRange();
    const text = String(block?.text || "");
    const clean = this.stripStructuralMarkdown(text)
      .split(/\n+/)
      .map((line) => line.trim())
      .filter(Boolean)
      .join("\n") || fallback;
    const selection = this.editorSelection();
    const nextStart = Math.max(block.from, Math.min(block.from + clean.length, selection.from));
    const nextEnd = Math.max(nextStart, Math.min(block.from + clean.length, selection.to));
    if (this.isWysiwygMode() && this.markdownEditor?.replaceRange) {
      this.suppressInlinePickersOnce();
      this.markdownEditor.replaceRange(block.from, block.to, clean);
      const syncValue = this.markdownEditor.getValue();
      this.els.body.value = syncValue;
      if (this.richEditor && this.richEditor.getValue() !== syncValue) {
        this.suppressRichEditorChange = true;
        try {
          this.richEditor.setValue(syncValue);
        } finally {
          this.suppressRichEditorChange = false;
        }
      }
      this.richEditor?.setSelectionRange?.(nextStart, nextEnd);
      this.handleEditorInput();
      return;
    }
    this.suppressInlinePickersOnce();
    this.replaceEditorRange(block.from, block.to, clean, {
      selectionStart: block.from,
      selectionEnd: block.from + clean.length
    });
  }

  indentSelection(step = 1) {
    if (this.isWysiwygMode() && this.richEditor) {
      this.richEditor.exec(step < 0 ? "outdent" : "indent");
      return;
    }
    const value = String(this.getEditorValue() || "").replace(/\r\n/g, "\n");
    const selection = this.editorSelection();
    const from = Math.max(0, Math.min(selection.from, selection.to));
    const to = Math.max(selection.from, selection.to);
    const lineStart = value.lastIndexOf("\n", Math.max(0, from - 1)) + 1;
    let lineEnd = value.indexOf("\n", to);
    if (lineEnd < 0) lineEnd = value.length;
    const block = value.slice(lineStart, lineEnd);
    const lines = block.split("\n");
    const isOutdent = step < 0;
    const nextLines = lines.map((line) => {
      if (isOutdent) {
        if (line.startsWith("  ")) return line.slice(2);
        if (line.startsWith("\t")) return line.slice(1);
        return line;
      }
      return `  ${line}`;
    });
    const nextText = nextLines.join("\n");
    const delta = nextText.length - block.length;
    const adjustedStart = isOutdent ? Math.max(lineStart, from - 2) : from + 2;
    const adjustedEnd = isOutdent ? Math.max(adjustedStart, to + delta) : to + (2 * lines.length);
    this.replaceEditorRange(lineStart, lineEnd, nextText, {
      selectionStart: adjustedStart,
      selectionEnd: adjustedEnd
    });
  }

  detectActiveFormatting() {
    const value = String(this.getEditorValue() || "").replace(/\r\n/g, "\n");
    const selection = this.editorSelection();
    const anchor = Math.max(0, Math.min(selection.from, selection.to));
    const block = this.currentBlockRange();
    const text = String(block?.text || "").trimStart();
    const inTitle = Boolean(this.titleBlockBoundary(value) && anchor <= this.titleBlockBoundary(value).to);
    const tableLines = String(block?.text || "").replace(/\r\n/g, "\n").split("\n");
    const headingLevel = inTitle ? 0 : Number((/^#{1,6}(?=\s)/.exec(text)?.[0] || "").length || 0);
    return {
      headingLevel,
      h1: headingLevel === 1,
      h2: headingLevel === 2,
      h3: headingLevel === 3,
      h4: headingLevel === 4,
      h5: headingLevel === 5,
      h6: headingLevel === 6,
      quote: !inTitle && /^>\s+/.test(text),
      ul: !inTitle && /^-\s+/.test(text) && !/^-\s\[(?: |x|X)\]\s/.test(text),
      checklist: !inTitle && /^-\s\[(?: |x|X)\]\s/.test(text),
      code: !inTitle && /^```/.test(text),
      table: !inTitle && isMarkdownTableStart(tableLines, 0),
      hr: !inTitle && isHorizontalRuleLine(text)
    };
  }

  currentLineContext() {
    const selection = this.editorSelection();
    if (selection.from !== selection.to) return null;
    const value = String(this.getEditorValue() || "").replace(/\r\n/g, "\n");
    const cursor = selection.from;
    const lineStart = value.lastIndexOf("\n", Math.max(0, cursor - 1)) + 1;
    let lineEnd = value.indexOf("\n", cursor);
    if (lineEnd < 0) lineEnd = value.length;
    return {
      value,
      cursor,
      lineStart,
      lineEnd,
      lineText: value.slice(lineStart, lineEnd)
    };
  }

  handleStructuredEnter() {
    const context = this.currentLineContext();
    if (!context) return false;
    const { cursor, lineStart, lineEnd, lineText } = context;
    if (cursor !== lineEnd) return false;

    const checklistMatch = lineText.match(/^(\s*[-*+]\s)\[(?: |x|X)\]\s?(.*)$/);
    if (checklistMatch) {
      const [, bulletPrefix, body] = checklistMatch;
      if (!String(body || "").trim()) {
        this.replaceEditorRange(lineStart, lineEnd, "", {
          selectionStart: lineStart,
          selectionEnd: lineStart
        });
        return true;
      }
      this.replaceEditorRange(cursor, cursor, `\n${bulletPrefix}[ ] `, {
        selectionStart: cursor + bulletPrefix.length + 6,
        selectionEnd: cursor + bulletPrefix.length + 6
      });
      return true;
    }

    const orderedMatch = lineText.match(/^(\s*)(\d+)([.)])\s(.*)$/);
    if (orderedMatch) {
      const [, indent, number, marker, body] = orderedMatch;
      if (!String(body || "").trim()) {
        this.replaceEditorRange(lineStart, lineEnd, "", {
          selectionStart: lineStart,
          selectionEnd: lineStart
        });
        return true;
      }
      const nextNumber = Number(number) + 1;
      const prefix = `${indent}${nextNumber}${marker} `;
      this.replaceEditorRange(cursor, cursor, `\n${prefix}`, {
        selectionStart: cursor + 1 + prefix.length,
        selectionEnd: cursor + 1 + prefix.length
      });
      return true;
    }

    const bulletMatch = lineText.match(/^(\s*[-*+]\s)(.*)$/);
    if (bulletMatch) {
      const [, prefix, body] = bulletMatch;
      if (!String(body || "").trim()) {
        this.replaceEditorRange(lineStart, lineEnd, "", {
          selectionStart: lineStart,
          selectionEnd: lineStart
        });
        return true;
      }
      this.replaceEditorRange(cursor, cursor, `\n${prefix}`, {
        selectionStart: cursor + 1 + prefix.length,
        selectionEnd: cursor + 1 + prefix.length
      });
      return true;
    }

    const quoteMatch = lineText.match(/^(\s*>\s?)(.*)$/);
    if (quoteMatch) {
      const [, prefix, body] = quoteMatch;
      if (!String(body || "").trim()) {
        this.replaceEditorRange(lineStart, lineEnd, "", {
          selectionStart: lineStart,
          selectionEnd: lineStart
        });
        return true;
      }
      this.replaceEditorRange(cursor, cursor, `\n${prefix}`, {
        selectionStart: cursor + 1 + prefix.length,
        selectionEnd: cursor + 1 + prefix.length
      });
      return true;
    }

    return false;
  }

  handlePlainParagraphEnter() {
    if (!this.isWysiwygMode()) return false;
    const context = this.currentLineContext();
    if (!context) return false;
    const { cursor, lineEnd, lineText } = context;
    if (cursor !== lineEnd) return false;
    if (/^\s*(#{1,6}\s|>\s?|[-*+]\s(?:\[(?: |x|X)\]\s?)?|\d+[.)]\s|\|)/.test(lineText)) return false;
    return this.replaceMarkdownWhileInWysiwyg(cursor, cursor, "\n\n", {
      selectionStart: cursor + 2,
      selectionEnd: cursor + 2
    });
  }

  handleStructuredBackspace() {
    const context = this.currentLineContext();
    if (!context) return false;
    const { cursor, lineStart, lineEnd, lineText } = context;
    if (cursor !== lineEnd || cursor !== lineStart + lineText.length) return false;

    const checklistMatch = lineText.match(/^(\s*[-*+]\s)\[(?: |x|X)\]\s?$/);
    if (checklistMatch) {
      this.replaceEditorRange(lineStart, lineEnd, "", {
        selectionStart: lineStart,
        selectionEnd: lineStart
      });
      return true;
    }

    const orderedMatch = lineText.match(/^(\s*)(\d+)([.)])\s$/);
    if (orderedMatch) {
      this.replaceEditorRange(lineStart, lineEnd, "", {
        selectionStart: lineStart,
        selectionEnd: lineStart
      });
      return true;
    }

    const bulletMatch = lineText.match(/^(\s*[-*+]\s)$/);
    if (bulletMatch) {
      this.replaceEditorRange(lineStart, lineEnd, "", {
        selectionStart: lineStart,
        selectionEnd: lineStart
      });
      return true;
    }

    const quoteMatch = lineText.match(/^(\s*>\s?)$/);
    if (quoteMatch) {
      this.replaceEditorRange(lineStart, lineEnd, "", {
        selectionStart: lineStart,
        selectionEnd: lineStart
      });
      return true;
    }

    return false;
  }

  updateToolbarFormattingState() {
    const active = this.detectActiveFormatting();
    document.querySelectorAll(".tb[data-md]").forEach((btn) => {
      const type = btn.dataset.md;
      if (!type || !(type in active)) return;
      btn.classList.toggle("active", Boolean(active[type]));
    });
    this.renderContextualToolbarState();
  }

  scopedLinkCandidates() {
    const note = this.activeNote();
    if (!note) return [];
    const rootId = rootBoxIdFromFolder(this.state, note.folderId);
    return this.state.notes.filter(
      (n) => rootBoxIdFromFolder(this.state, n.folderId) === rootId && n.id !== note.id
    );
  }

  folderLabel(folderId) {
    const folder = this.state.folders.find((f) => f.id === folderId);
    if (!folder) return "未知目录";
    const names = [folder.name];
    let cursor = folder;
    while (cursor?.parentId) {
      cursor = this.state.folders.find((f) => f.id === cursor.parentId) || null;
      if (cursor) names.unshift(cursor.name);
    }
    return names.join(" / ");
  }

  resolveLinkToken(token, scopedNotes = this.scopedLinkCandidates()) {
    const raw = String(token || "").trim();
    if (!raw) return null;

    const byId = scopedNotes.find((n) => normalizeText(n.id) === normalizeText(raw));
    if (byId) return { note: byId, ambiguous: false, mode: "id" };

    const exactTitle = scopedNotes.filter((n) => normalizeText(n.title) === normalizeText(raw));
    if (exactTitle.length === 1) return { note: exactTitle[0], ambiguous: false, mode: "title" };
    if (exactTitle.length > 1) return { note: exactTitle[0], ambiguous: true, mode: "title" };

    const fuzzy = scopedNotes.find(
      (n) => normalizeText(n.title).includes(normalizeText(raw)) || normalizeText(n.id).includes(normalizeText(raw))
    );
    if (fuzzy) return { note: fuzzy, ambiguous: false, mode: "fuzzy" };
    return null;
  }

  upsertApiNotes(items = []) {
    for (const item of items) {
      const existing = this.state.notes.find((n) => n.id === item.id);
      if (existing) {
        existing.title = item.title || existing.title;
        existing.folderId = item.directoryId || existing.folderId;
        existing.noteType = item.noteType || existing.noteType;
        existing.updatedAt = item.updatedAt || existing.updatedAt;
        continue;
      }
      this.state.notes.push({
        id: item.id,
        title: item.title || "未命名笔记",
        folderId: item.directoryId,
        noteType: item.noteType || "original",
        body: `# ${item.title || "未命名笔记"}\n`,
        tags: [],
        links: [],
        bodyLoaded: false,
        updatedAt: item.updatedAt || new Date().toISOString()
      });
    }
  }

  detectInlineLinkContext() {
    const selection = this.editorSelection();
    if (selection.from !== selection.to) return null;
    const text = this.getEditorValue();
    const cursor = selection.from || 0;
    const tryCursor = (candidateCursor) => {
      const left = text.slice(0, candidateCursor);
      const start = left.lastIndexOf("[[");
      if (start < 0) return null;
      const lastClose = left.lastIndexOf("]]");
      if (lastClose > start) return null;
      const query = left.slice(start + 2);
      if (query.includes("\n")) return null;
      return { start, end: candidateCursor, query };
    };
    const direct = tryCursor(cursor);
    if (direct) return direct;
    if (this.isWysiwygMode() && cursor < text.length) return tryCursor(cursor + 1);
    return null;
  }

  detectInlineTagContext() {
    const selection = this.editorSelection();
    if (selection.from !== selection.to) return null;
    const text = this.getEditorValue();
    const cursor = selection.from || 0;
    const tryCursor = (candidateCursor) => {
      const left = text.slice(0, candidateCursor);
      const match = left.match(/(^|[\s([{'"“‘>，。；：!?！？、])#([^\s#\]\[(){}"'“”‘’.,，。！？!?;:：]*)$/u);
      if (!match) return null;
      const hashOffset = match[0].lastIndexOf("#");
      const start = left.length - (match[0].length - hashOffset);
      const query = match[2] || "";
      return { start, end: candidateCursor, query };
    };
    const direct = tryCursor(cursor);
    if (direct) return direct;
    if (this.isWysiwygMode() && cursor < text.length) return tryCursor(cursor + 1);
    return null;
  }

  suppressInlinePickersOnce() {
    this.skipInlinePickersOnce = true;
  }

  renderLinkCandidates(query = "", preferredId = "") {
    const q = String(query || "").trim().toLowerCase();
    const all = this.scopedLinkCandidates();
    const list = (q
      ? all
          .filter((n) => n.id.toLowerCase().includes(q) || n.title.toLowerCase().includes(q))
          .sort((a, b) => linkCandidateRank(a, q) - linkCandidateRank(b, q) || a.title.localeCompare(b.title, "zh-CN"))
      : [...all].sort((a, b) => a.title.localeCompare(b.title, "zh-CN")));
    this.currentLinkCandidates = list;
    this.currentLinkIndex = 0;
    if (preferredId) {
      const idx = list.findIndex((n) => n.id === preferredId);
      if (idx >= 0) this.currentLinkIndex = idx;
    }
    this.els.linkSearchList.innerHTML = list.length
      ? renderPickerSections(
          list.slice(0, 50).map((n, idx) => ({ note: n, idx })),
          ({ note }) => linkCandidateGroupLabel(note, q),
          ({ note: n, idx }) => {
            const badge = linkCandidateBadge(n, q);
            return `<button class="link-picker-item ${idx === this.currentLinkIndex ? "active" : ""}" data-link-note-id="${n.id}" data-link-index="${idx}" aria-selected="${
              idx === this.currentLinkIndex ? "true" : "false"
            }"><span class="picker-headline"><strong>${highlightMatch(n.title, q)}</strong>${
              badge ? `<span class="picker-badge">${escapeHtml(badge)}</span>` : ""
            }</span><span class="picker-meta">${highlightMatch(n.id, q)} · ${escapeHtml(this.folderLabel(n.folderId))}</span></button>`;
          }
        )
      : `<div class="picker-empty">无匹配笔记</div>`;
    this.scrollActiveLinkCandidateIntoView();
  }

  scrollActiveLinkCandidateIntoView() {
    const active = this.els.linkSearchList.querySelector(".link-picker-item.active");
    if (!active) return;
    active.scrollIntoView({ block: "nearest" });
  }

  openLinkPicker(initialQuery = "", options = {}) {
    this.closeTagPicker();
    const inlineMode = Boolean(options.inlineContext);
    const anchorAtCursor = Boolean(options.anchorAtCursor);
    const focusInput = Boolean(options.focusInput);
    this.els.linkPicker.classList.remove("floating");
    this.els.linkPicker.classList.toggle("inline-picker", inlineMode);
    this.els.linkPicker.style.left = "";
    this.els.linkPicker.style.top = "";
    this.els.linkPicker.style.width = "";
    this.els.linkPicker.classList.remove("hidden");
    this.els.linkSearchInput.value = initialQuery;
    this.currentLinkContext = options.inlineContext || null;
    this.lastInlinePickerAnchor = this.currentLinkContext?.end || 0;
    this.renderLinkCandidates(initialQuery, options.preferredId || "");
    this.els.insertLink?.classList.add("active");
    if (inlineMode) {
      this.positionInlineLinkPicker();
      if (focusInput) {
        this.els.linkSearchInput.focus();
        this.els.linkSearchInput.select();
      } else {
        this.focusEditor();
      }
      return;
    }
    if (anchorAtCursor) {
      this.positionFloatingPicker(this.els.linkPicker, Math.min(420, Math.max(320, Math.floor(window.innerWidth * 0.34))));
    }
    this.els.linkSearchInput.focus();
    this.els.linkSearchInput.select();
  }

  closeLinkPicker() {
    this.els.linkPicker.classList.add("hidden");
    this.els.linkPicker.classList.remove("floating");
    this.els.linkPicker.classList.remove("inline-picker");
    this.els.linkPicker.style.left = "";
    this.els.linkPicker.style.top = "";
    this.els.linkPicker.style.width = "";
    this.currentLinkContext = null;
    this.lastInlinePickerAnchor = 0;
    this.els.insertLink?.classList.remove("active");
  }

  positionInlineLinkPicker() {
    if (!this.currentLinkContext) return;
    this.positionFloatingPicker(this.els.linkPicker, Math.min(420, Math.max(320, Math.floor(window.innerWidth * 0.34))));
  }

  insertSelectedLinkNote(noteId) {
    if (!noteId) return;
    const target = this.state.notes.find((n) => n.id === noteId);
    if (!target) return;
    if (this.currentLinkContext) {
      const { start, end } = this.currentLinkContext;
      this.replaceEditorRange(start, end, `[[${target.title}]]`);
    } else {
      this.insertAtCursor(`[[${target.title}]]`);
    }
    this.closeLinkPicker();
    this.onStatus(`已插入关联笔记：${target.title}`, "ok");
  }

  moveLinkCandidate(step) {
    if (!this.currentLinkCandidates.length) return;
    const max = Math.min(this.currentLinkCandidates.length, 50);
    this.currentLinkIndex = (this.currentLinkIndex + step + max) % max;
    const preferredId = this.currentLinkCandidates[this.currentLinkIndex]?.id || "";
    this.renderLinkCandidates(this.els.linkSearchInput.value, preferredId);
    if (this.currentLinkContext) this.positionInlineLinkPicker();
  }

  activeRootDirectoryId() {
    const note = this.activeNote();
    if (!note) return "";
    return rootBoxIdFromFolder(this.state, note.folderId);
  }

  async fetchTagCandidates(query = "") {
    const result = await listTags({
      rootDirectoryId: this.activeRootDirectoryId(),
      query,
      limit: 24
    });
    return Array.isArray(result.items) ? result.items : [];
  }

  renderTagCandidates(list = [], preferredName = "") {
    const sorted = [...list].sort((a, b) => {
      const query = this.els.tagSearchInput?.value || "";
      const rankDiff = tagCandidateRank(a, query) - tagCandidateRank(b, query);
      if (rankDiff) return rankDiff;
      const countDiff = Number(b?.noteCount || 0) - Number(a?.noteCount || 0);
      if (countDiff) return countDiff;
      return String(a?.name || "").localeCompare(String(b?.name || ""), "zh-CN");
    });
    this.currentTagCandidates = sorted;
    this.currentTagIndex = 0;
    if (preferredName) {
      const idx = sorted.findIndex((item) => String(item?.name || "") === preferredName);
      if (idx >= 0) this.currentTagIndex = idx;
    }
    const query = this.els.tagSearchInput?.value || "";
    this.els.tagSearchList.innerHTML = sorted.length
      ? renderPickerSections(
          sorted.map((item, idx) => ({ item, idx })),
          ({ item }) => tagCandidateGroupLabel(item, query),
          ({ item, idx }) => {
            const badge = tagCandidateBadge(item, query);
            return `<button class="link-picker-item ${idx === this.currentTagIndex ? "active" : ""}" data-tag-name="${escapeHtml(
              item.name
            )}" data-tag-index="${idx}" aria-selected="${idx === this.currentTagIndex ? "true" : "false"}"><span class="picker-headline"><strong>#${highlightMatch(
              item.name,
              query
            )}</strong>${badge ? `<span class="picker-badge">${escapeHtml(badge)}</span>` : ""}</span><span class="picker-meta">${Number(
              item.noteCount || 0
            )} 条笔记</span></button>`;
          }
        )
      : `<div class="picker-empty"><div style="margin-bottom:8px;">无匹配标签。</div><button class="link-picker-item active" type="button" data-insert-current-tag="1">直接插入 #${escapeHtml(query || "新标签")}</button></div>`;
    this.scrollActiveTagCandidateIntoView();
  }

  scrollActiveTagCandidateIntoView() {
    const active = this.els.tagSearchList.querySelector(".link-picker-item.active");
    if (!active) return;
    active.scrollIntoView({ block: "nearest" });
  }

  async openTagPicker(initialQuery = "", options = {}) {
    this.closeLinkPicker();
    const inlineMode = Boolean(options.inlineContext);
    const anchorAtCursor = Boolean(options.anchorAtCursor);
    const focusInput = Boolean(options.focusInput);
    this.els.tagPicker.classList.remove("floating");
    this.els.tagPicker.classList.toggle("inline-picker", inlineMode);
    this.els.tagPicker.style.left = "";
    this.els.tagPicker.style.top = "";
    this.els.tagPicker.style.width = "";
    this.els.tagPicker.classList.remove("hidden");
    this.els.tagSearchInput.value = initialQuery;
    this.currentTagContext = options.inlineContext || null;
    this.lastInlinePickerAnchor = this.currentTagContext?.end || 0;
    const list = await this.fetchTagCandidates(initialQuery);
    this.renderTagCandidates(list, options.preferredName || "");
    this.els.insertTag?.classList.add("active");
    if (inlineMode) {
      this.positionInlineTagPicker();
      if (focusInput) {
        this.els.tagSearchInput.focus();
        this.els.tagSearchInput.select();
      } else {
        this.focusEditor();
      }
      return;
    }
    if (anchorAtCursor) {
      this.positionFloatingPicker(this.els.tagPicker, Math.min(320, Math.max(260, Math.floor(window.innerWidth * 0.26))));
    }
    this.els.tagSearchInput.focus();
    this.els.tagSearchInput.select();
  }

  closeTagPicker() {
    this.els.tagPicker.classList.add("hidden");
    this.els.tagPicker.classList.remove("floating");
    this.els.tagPicker.classList.remove("inline-picker");
    this.els.tagPicker.style.left = "";
    this.els.tagPicker.style.top = "";
    this.els.tagPicker.style.width = "";
    this.currentTagContext = null;
    this.els.insertTag?.classList.remove("active");
  }

  positionInlineTagPicker() {
    if (!this.currentTagContext) return;
    this.positionFloatingPicker(this.els.tagPicker, Math.min(320, Math.max(260, Math.floor(window.innerWidth * 0.26))));
  }

  positionFloatingPicker(panel, width) {
    if (!panel) return;
    panel.classList.add("floating");

    let left = 180;
    let top = 90;
    const rect = this.currentSelectionRect();
    if (rect) {
      left = rect.left;
      top = rect.bottom + 8;
    }

    const maxLeft = Math.max(12, window.innerWidth - width - 12);
    const clampedLeft = Math.max(12, Math.min(left, maxLeft));
    const clampedTop = Math.max(12, Math.min(top, window.innerHeight - 240));
    panel.style.width = `${width}px`;
    panel.style.left = `${clampedLeft}px`;
    panel.style.top = `${clampedTop}px`;
  }

  insertSelectedTag(tagName = "") {
    const normalized = normalizeClickedTag(tagName);
    if (!normalized) return;
    const insertText = `#${normalized}`;
    if (this.currentTagContext) {
      const { start, end } = this.currentTagContext;
      this.replaceEditorRange(start, end, insertText);
    } else {
      this.insertAtCursor(insertText);
    }
    this.closeTagPicker();
    this.onStatus(`已插入标签：#${normalized}`, "ok");
  }

  async moveTagCandidate(step) {
    if (!this.currentTagCandidates.length) return;
    const max = this.currentTagCandidates.length;
    this.currentTagIndex = (this.currentTagIndex + step + max) % max;
    const preferredName = this.currentTagCandidates[this.currentTagIndex]?.name || "";
    const list = await this.fetchTagCandidates(this.els.tagSearchInput.value);
    this.renderTagCandidates(list, preferredName);
    if (this.currentTagContext) this.positionInlineTagPicker();
  }

  renderRelated(extraTitle = "") {
    const note = this.activeNote();
    const tab = this.activeTab();
    if (!note || !tab) {
      this.els.result.innerHTML = `<div class="related-empty">打开笔记后，这里会显示引用、回链和同标签结果。</div>`;
      return;
    }

    const links = parseLinks(tab.body || "");
    const tags = parseTags(tab.body || "");
    const rootId = rootBoxIdFromFolder(this.state, note.folderId);
    const scoped = this.state.notes.filter((n) => rootBoxIdFromFolder(this.state, n.folderId) === rootId && n.id !== note.id);

    const resolvedForwardIds = new Set(
      links
        .map((token) => this.resolveLinkToken(token, scoped))
        .filter((x) => x?.note?.id)
        .map((x) => x.note.id)
    );

    const forward = scoped.filter((n) => resolvedForwardIds.has(n.id));
    const backward = scoped.filter((n) => {
      const refs = parseLinks(n.body || "");
      return refs.some((token) => this.resolveLinkToken(token, scoped)?.note?.id === note.id);
    });

    const tagRelated = tags.length
      ? scoped.filter((n) => (n.tags || []).some((tg) => tags.includes(tg))).slice(0, 20)
      : [];

    const renderNoteItem = (n, badgeText = "") => `
      <button class="related-item" data-open-note="${n.id}">
        <span class="related-item-title">${escapeHtml(n.title)}</span>
        <span class="related-item-meta">${escapeHtml(noteTypeText(n.noteType || typeFromFolder(this.state, n.folderId)))} · ${escapeHtml(this.folderLabel(n.folderId))}</span>
        ${
          excerptFromBody(n.body || "", n.title)
            ? `<span class="related-item-preview">${escapeHtml(excerptFromBody(n.body || "", n.title))}</span>`
            : ""
        }
        <span class="related-item-badges">
          ${badgeText ? `<span class="related-item-badge">${escapeHtml(badgeText)}</span>` : ""}
          ${Array.isArray(n.tags) && n.tags.length ? `<span class="related-item-badge">#${escapeHtml(n.tags.slice(0, 2).join(" #"))}</span>` : ""}
        </span>
      </button>
    `;

    const block = (title, noteText, list, emptyText, badgeText = "") => `
      <section class="inspector-section">
        <div class="inspector-section-head">
          <div class="inspector-section-title">${title}</div>
          <div class="inspector-count">${list.length}</div>
        </div>
        ${noteText ? `<div class="inspector-section-note">${noteText}</div>` : ""}
        ${
          list.length
            ? `<div class="inspector-list">${list
                .map((n) => renderNoteItem(n, badgeText))
                .join("")}</div>`
            : `<div class="related-empty">${emptyText}</div>`
        }
      </section>
    `;

    this.els.result.innerHTML = `
      <div class="inspector-overview">
        <div class="inspector-overview-head">
          <div class="inspector-overview-title">${escapeHtml(note.title)}</div>
          <div class="inspector-overview-meta">${escapeHtml(noteTypeText(note.noteType || typeFromFolder(this.state, note.folderId)))} · ${escapeHtml(this.folderLabel(note.folderId))}</div>
        </div>
        <div class="inspector-overview-grid">
          <div class="inspector-overview-row">
            <span class="inspector-overview-label">标签</span>
            <span class="inspector-overview-value">${tags.length ? escapeHtml(tags.map((tag) => `#${tag}`).join(" ")) : "还没有标签"}</span>
          </div>
          <div class="inspector-overview-row">
            <span class="inspector-overview-label">出链 / 回链</span>
            <span class="inspector-overview-value">${forward.length} / ${backward.length}</span>
          </div>
        </div>
      </div>
      <div class="inspector-summary">
        <span class="inspector-chip">正向链接 ${forward.length}</span>
        <span class="inspector-chip">反向链接 ${backward.length}</span>
        <span class="inspector-chip">标签 ${tags.length}</span>
      </div>
      <div class="inspector-sections">
        ${extraTitle ? `<section class="inspector-section"><div class="related-empty">${escapeHtml(extraTitle)}</div></section>` : ""}
        ${block("引用", "", forward, "还没有引用。", "出链")}
        ${block("回链", "", backward, "还没有回链。", "回链")}
        ${block("同标签", "", tagRelated, tags.length ? "没有更多结果。" : "还没有标签。", "同标签")}
      </div>
    `;
  }

  async handleTokenAction(token) {
    if (!token) return;

    if (token.startsWith("#")) {
      const tag = normalizeClickedTag(token);
      const note = this.activeNote();
      if (!note) return;
      const rootId = rootBoxIdFromFolder(this.state, note.folderId);
      this.setInspectorVisible(true);
      this.els.result.innerHTML = `<div class="related-empty">正在从 SQLite 检索 #${escapeHtml(tag)}...</div>`;
      let list = [];
      try {
        const result = await fetchNotesByTag(tag, { rootDirectoryId: rootId });
        this.upsertApiNotes(result.items);
        list = result.items.filter((item) => item.id !== note.id);
      } catch (error) {
        list = this.state.notes.filter(
          (n) => n.id !== note.id && rootBoxIdFromFolder(this.state, n.folderId) === rootId && (n.tags || []).includes(tag)
        );
        this.onStatus(`标签 API 不可用，已降级本地检索：${String(error?.message || error)}`, "warn");
      }
      this.els.result.innerHTML = `
        <div class="inspector-overview">
          <div class="inspector-overview-head">
            <div class="inspector-overview-title">标签检索：#${escapeHtml(tag)}</div>
            <div class="inspector-overview-meta">当前目录范围</div>
          </div>
        </div>
        <div class="inspector-summary">
          <span class="inspector-chip">标签 #${escapeHtml(tag)}</span>
          <span class="inspector-chip">结果 ${list.length}</span>
        </div>
        ${
          list.length
            ? `<div class="inspector-sections"><section class="inspector-section"><div class="inspector-list">${list
                .map((n) => `
                  <button class="related-item" data-open-note="${n.id}">
                    <span class="related-item-title">${escapeHtml(n.title)}</span>
                    <span class="related-item-meta">${escapeHtml(noteTypeText(n.noteType || typeFromFolder(this.state, n.folderId)))} · ${escapeHtml(this.folderLabel(n.folderId))}</span>
                    ${
                      excerptFromBody(n.body || "", n.title)
                        ? `<span class="related-item-preview">${escapeHtml(excerptFromBody(n.body || "", n.title))}</span>`
                        : ""
                    }
                    <span class="related-item-badges"><span class="related-item-badge">#${escapeHtml(tag)}</span></span>
                  </button>
                `)
                .join("")}</div></section></div>`
            : `<div class="related-empty">当前目录下没有更多带 #${escapeHtml(tag)} 的笔记。</div>`
        }
      `;
      this.onStatus(`已从 SQLite 检索标签 #${tag}`, "ok");
      return;
    }

    const linkMatch = token.match(/^\[\[([^\]]+)\]\]$/);
    if (linkMatch) {
      const note = this.activeNote();
      if (!note) return;
      const tokenValue = linkMatch[1];
      const rootId = rootBoxIdFromFolder(this.state, note.folderId);
      const scoped = this.state.notes.filter(
        (n) => rootBoxIdFromFolder(this.state, n.folderId) === rootId && n.id !== note.id
      );
      const resolved = this.resolveLinkToken(tokenValue, scoped);
      if (resolved?.note) {
        this.setInspectorVisible(true);
        this.onOpenNote(resolved.note.id);
        this.onStatus(
          resolved.ambiguous ? `已打开关联笔记：${resolved.note.title}（存在重名）` : `已打开关联笔记：${resolved.note.title}`,
          resolved.ambiguous ? "warn" : "ok"
        );
      } else {
        this.onStatus(`未找到关联笔记：${tokenValue}`, "warn");
      }
    }
  }

  extractCoreClaimFromBody(body) {
    const lines = String(body || "")
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => l.replace(/^#+\s*/, "").trim())
      .filter(Boolean);
    return lines.join(" ").slice(0, 4000);
  }

  resolvePlanFromWindow() {
    const raw = typeof window !== "undefined" ? window.__ORIGINALITY_PLAN__ : null;
    if (!raw || typeof raw !== "object") return {};
    return {
      warnThreshold: Number(raw.warnThreshold),
      blockThreshold: Number(raw.blockThreshold),
      requireCitationLocator: raw.requireCitationLocator,
      allowDraftOnWarning: raw.allowDraftOnWarning,
      blockOnBlocked: raw.blockOnBlocked
    };
  }

  buildOriginalityPayload(note) {
    const currentBody = this.getEditorValue() || note.body || "";
    const links = parseLinks(currentBody);
    const scoped = this.scopedLinkCandidates();
    const linkedLiterature = links
      .map((token) => this.resolveLinkToken(token, scoped))
      .map((x) => x?.note)
      .filter((x) => x && x.noteType === "literature");

    const dedupLiterature = [];
    const seen = new Set();
    for (const ln of linkedLiterature) {
      if (seen.has(ln.id)) continue;
      seen.add(ln.id);
      dedupLiterature.push(ln);
    }

    const literature = dedupLiterature.map((ln) => ({
      source_id: `src_from_${ln.id}`,
      quote_text: normalizeFieldText(parseLiteratureWorkspace(ln.body || "").originalText || ln.body || "")
    }));

    const citations = dedupLiterature.map((ln) => ({
      source_id: `src_from_${ln.id}`
    }));

    return {
      originalityPlan: this.resolvePlanFromWindow(),
      literature,
      permanent: [
        {
          id: note.id,
          core_claim: this.extractCoreClaimFromBody(currentBody),
          citations
        }
      ]
    };
  }

  async runOriginalityCheck(note, { forSave = false } = {}) {
    const payload = this.buildOriginalityPayload(note);
    const result = await checkOriginality(payload);
    const evalItem = result?.originalityGuard?.evaluations?.[0] || null;
    if (!evalItem) {
      return {
        status: "warning",
        similarity: 0,
        reasons: ["missing_evaluation"],
        raw: result
      };
    }

    if (evalItem.status === "blocked") {
      const message = `blocked：原创性检查未通过（相似度 ${Math.round((Number(evalItem.similarity) || 0) * 100)}%）`;
      this.showOriginalityNotice("需要重写", "bad", message);
      this.onStatus(message, "bad");
      if (forSave) {
        this.setSaveUiState("blocked", reflectionQuestionsHint(message));
      }
      return { ...evalItem, raw: result };
    }

    if (evalItem.status === "warning") {
      const base = `warning：建议补充转述/引用定位（相似度 ${Math.round((Number(evalItem.similarity) || 0) * 100)}%）`;
      this.showOriginalityNotice("建议继续打磨", "warn", base);
      this.onStatus(forSave ? `${base}，将暂时保持草稿状态` : base, "warn");
      return { ...evalItem, raw: result };
    }

    this.showOriginalityNotice("原创性通过", "ok", `pass：原创性检测通过（相似度 ${Math.round((Number(evalItem.similarity) || 0) * 100)}%）`);
    this.onStatus(`pass：原创性检测通过（相似度 ${Math.round((Number(evalItem.similarity) || 0) * 100)}%）`, "ok");
    return { ...evalItem, raw: result };
  }

  showOriginalityNotice(title = "原创性提醒", tone = "", message = "") {
    const panel = this.els.originalityNotice;
    if (!panel) return;
    this.els.originalityNoticeTitle && (this.els.originalityNoticeTitle.textContent = title);
    this.els.originalityNoticeBody && (this.els.originalityNoticeBody.textContent = message);
    panel.classList.remove("hidden");
    panel.dataset.tone = String(tone || "");
  }

  hideOriginalityNotice() {
    this.els.originalityNotice?.classList.add("hidden");
  }
  bind() {
    this.els.tabs.addEventListener("click", async (e) => {
      const closeBtn = e.target.closest("button[data-close-tab]");
      if (closeBtn) {
        if (this.closeTab(closeBtn.dataset.closeTab)) {
          this.onStatus("已关闭标签页", "ok");
        }
        return;
      }

      const switchBtn = e.target.closest("button[data-switch-tab]");
      if (switchBtn) {
        const nextTabId = switchBtn.dataset.switchTab;
        if (nextTabId !== this.state.activeTabId) {
          await this.autoSaveActiveNote("switch-tab");
        }
        this.state.activeTabId = nextTabId;
        this.fillEditorFromTab();
        this.onStateChange("switch-tab");
        const menu = this.els.tabs.querySelector("[data-tab-menu]");
        if (menu) menu.classList.add("hidden");
        return;
      }

      const actBtn = e.target.closest("button[data-tabs-action]");
      if (actBtn) {
        const action = actBtn.dataset.tabsAction;
        if (action === "new") {
          this.onStateChange("create-note-in-selected-folder");
          return;
        }
        if (action === "toggle-menu") {
          const menu = this.els.tabs.querySelector("[data-tab-menu]");
          if (menu) menu.classList.toggle("hidden");
          return;
        }
        if (action === "close-all") {
          if (this.closeAllTabs()) {
            this.onStatus("已关闭全部标签页", "ok");
          }
          return;
        }
      }

      const tab = e.target.closest(".tab[data-tab]");
      if (!tab) return;
      if (tab.dataset.tab === "welcome") return;
      if (tab.dataset.tab !== this.state.activeTabId) {
        await this.autoSaveActiveNote("switch-tab");
      }
      this.state.activeTabId = tab.dataset.tab;
      this.fillEditorFromTab();
      this.onStateChange("switch-tab");
    });

    document.addEventListener("click", (e) => {
      if (!e.target.closest("#tabs")) {
        const menu = this.els.tabs.querySelector("[data-tab-menu]");
        if (menu) menu.classList.add("hidden");
      }
    });

    document.addEventListener(
      "keydown",
      (e) => {
        const linkInlineOpen = !this.els.linkPicker.classList.contains("hidden") && this.currentLinkContext;
        const tagInlineOpen = !this.els.tagPicker.classList.contains("hidden") && this.currentTagContext;
        if (!linkInlineOpen && !tagInlineOpen) return;
        if (e.target.closest("#linkSearchInput") || e.target.closest("#tagSearchInput")) return;
        if (!e.target.closest("#editorHost") && !e.target.closest("#wysiwygHost") && !e.target.closest("#editorBody")) return;

        if (e.key === "ArrowDown") {
          if (linkInlineOpen) this.moveLinkCandidate(1);
          else void this.moveTagCandidate(1);
          e.preventDefault();
          e.stopPropagation();
          return;
        }
        if (e.key === "ArrowUp") {
          if (linkInlineOpen) this.moveLinkCandidate(-1);
          else void this.moveTagCandidate(-1);
          e.preventDefault();
          e.stopPropagation();
          return;
        }
        if (e.key === "Enter") {
          if (linkInlineOpen) {
            const chosen = this.currentLinkCandidates[this.currentLinkIndex] || this.currentLinkCandidates[0];
            if (chosen) this.insertSelectedLinkNote(chosen.id);
          } else {
            const chosen = this.currentTagCandidates[this.currentTagIndex] || this.currentTagCandidates[0];
            this.insertSelectedTag(chosen?.name || this.els.tagSearchInput.value);
          }
          e.preventDefault();
          e.stopPropagation();
          return;
        }
        if (e.key === "Escape") {
          if (linkInlineOpen) this.closeLinkPicker();
          if (tagInlineOpen) this.closeTagPicker();
          e.preventDefault();
          e.stopPropagation();
        }
      },
      true
    );

    this.els.result.addEventListener("click", (e) => {
      const row = e.target.closest("[data-open-note]");
      if (!row) return;
      this.onOpenNote(row.dataset.openNote);
    });
    this.els.preview?.addEventListener("click", (e) => {
      const copy = e.target.closest("[data-preview-copy-code]");
      if (copy?.dataset.previewCopyCode) {
        void this.copyText(decodePreviewPayload(copy.dataset.previewCopyCode), "已复制代码块");
        return;
      }
      const link = e.target.closest("[data-preview-link]");
      if (link) {
        this.handleTokenAction(`[[${link.dataset.previewLink}]]`);
        return;
      }
      const tag = e.target.closest("[data-preview-tag]");
      if (tag) {
        this.handleTokenAction(`#${tag.dataset.previewTag}`);
        return;
      }
      const asset = e.target.closest("[data-preview-asset-url]");
      if (asset?.dataset.previewAssetUrl) {
        this.openAssetPreview(asset.dataset.previewAssetUrl, asset.dataset.previewAssetLabel || "");
      }
    });
    this.els.closeAssetPreview?.addEventListener("click", () => this.closeAssetPreview());
    this.els.assetPreviewMask?.addEventListener("click", (event) => {
      if (event.target === this.els.assetPreviewMask) this.closeAssetPreview();
    });

    document.querySelectorAll(".tb[data-md]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const t = btn.dataset.md;
        if (t === "bold") this.wrapSelection("**", "**");
        if (t === "italic") this.wrapSelection("*", "*");
        if (t === "h2") this.formatCurrentBlock("h2");
        if (t === "quote") this.formatCurrentBlock("quote");
        if (t === "ul") this.formatCurrentBlock("ul");
        if (t === "checklist") this.formatCurrentBlock("checklist");
        if (t === "code") this.formatCurrentBlock("code");
        if (t === "table") this.formatCurrentBlock("table");
        if (t === "hr") this.formatCurrentBlock("hr");
      });
    });
    this.els.headingLevel?.addEventListener("change", () => {
      const rawValue = String(this.els.headingLevel?.value || "").trim();
      if (rawValue === "p") {
        this.clearCurrentHeading();
        this.renderContextualToolbarState();
        return;
      }
      const level = Number(rawValue || 0);
      if (level >= 1 && level <= 6) this.formatCurrentBlock(`h${level}`);
      this.renderContextualToolbarState();
    });
    this.els.tableAddRow?.addEventListener("click", () => {
      this.addTableRow();
    });
    this.els.tableAddColumn?.addEventListener("click", () => {
      this.addTableColumn();
    });
    this.els.codeLanguage?.addEventListener("change", () => {
      this.setCodeBlockLanguage(this.els.codeLanguage?.value || "text");
    });

    this.els.insertLink.addEventListener("click", () => {
      const note = this.activeNote();
      if (!note) return this.onStatus("请先打开一个笔记", "warn");
      const candidates = this.scopedLinkCandidates();
      if (!candidates.length) return this.onStatus("当前目录下无可关联笔记", "warn");
      if (this.isWysiwygMode()) {
        this.openLinkPicker("", { anchorAtCursor: true });
        return;
      }
      this.insertAtCursor("[[");
      const inline = this.detectInlineLinkContext();
      if (inline) {
        this.openLinkPicker("", { inlineContext: inline, focusInput: true });
        return;
      }
      this.openLinkPicker("");
    });

    this.els.insertImage?.addEventListener("click", () => {
      const note = this.activeNote();
      if (!note) return this.onStatus("请先打开一个笔记", "warn");
      this.els.assetImageInput?.click();
    });
    this.els.insertFile?.addEventListener("click", () => {
      const note = this.activeNote();
      if (!note) return this.onStatus("请先打开一个笔记", "warn");
      try {
        this.els.assetFileInput?.click();
      } catch (error) {
        this.onStatus(`无法打开附件选择器：${String(error?.message || error)}`, "bad");
      }
    });
    this.els.assetImageInput?.addEventListener("change", async () => {
      const files = [...(this.els.assetImageInput?.files || [])];
      await this.insertAssetFiles(files, { sourceLabel: "选择图片" });
    });
    this.els.assetFileInput?.addEventListener("change", async () => {
      const files = [...(this.els.assetFileInput?.files || [])];
      await this.insertAssetFiles(files, { sourceLabel: "选择附件" });
    });

    const preserveInlinePickerFocus = (event) => {
      if (!event.target.closest("#linkPicker") && !event.target.closest("#tagPicker")) return;
      event.preventDefault();
    };
    this.els.linkPicker?.addEventListener("mousedown", preserveInlinePickerFocus);
    this.els.tagPicker?.addEventListener("mousedown", preserveInlinePickerFocus);

    this.els.closeLinkPicker.addEventListener("click", () => this.closeLinkPicker());
    this.els.linkSearchInput.addEventListener("input", () => {
      this.renderLinkCandidates(this.els.linkSearchInput.value);
      if (this.currentLinkContext) this.positionInlineLinkPicker();
    });
    this.els.linkSearchInput.addEventListener("keydown", (e) => {
      if (e.isComposing || e.keyCode === 229) return;
      if (e.key === "Escape") {
        this.closeLinkPicker();
        return;
      }
      if (e.key === "ArrowDown") {
        this.moveLinkCandidate(1);
        e.preventDefault();
        return;
      }
      if (e.key === "ArrowUp") {
        this.moveLinkCandidate(-1);
        e.preventDefault();
        return;
      }
      if (e.key === "Enter") {
        const chosen = this.currentLinkCandidates[this.currentLinkIndex] || this.currentLinkCandidates[0];
        if (chosen) this.insertSelectedLinkNote(chosen.id);
        e.preventDefault();
      }
    });
    this.els.linkSearchList.addEventListener("click", (e) => {
      const row = e.target.closest("[data-link-note-id]");
      if (!row) return;
      this.insertSelectedLinkNote(row.dataset.linkNoteId);
    });
    this.els.linkSearchList.addEventListener("mouseover", (e) => {
      const row = e.target.closest("[data-link-index]");
      if (!row) return;
      const next = Number(row.dataset.linkIndex);
      if (!Number.isInteger(next) || next === this.currentLinkIndex) return;
      this.currentLinkIndex = next;
      this.renderLinkCandidates(this.els.linkSearchInput.value, this.currentLinkCandidates[next]?.id || "");
    });

    this.els.insertTag.addEventListener("click", async () => {
      const note = this.activeNote();
      if (!note) return this.onStatus("请先打开一个笔记", "warn");
      if (this.isWysiwygMode()) {
        await this.openTagPicker("", { anchorAtCursor: true });
        return;
      }
      this.insertAtCursor("#");
      const inline = this.detectInlineTagContext();
      if (inline) {
        await this.openTagPicker("", { inlineContext: inline, focusInput: true });
        return;
      }
      await this.openTagPicker("");
    });
    this.els.modeEdit?.addEventListener("click", () => {
      this.togglePreview();
    });
    this.els.closeTagPicker.addEventListener("click", () => this.closeTagPicker());
    this.els.closeOriginalityNotice?.addEventListener("click", () => this.hideOriginalityNotice());
    this.els.tagSearchInput.addEventListener("input", async () => {
      const list = await this.fetchTagCandidates(this.els.tagSearchInput.value);
      this.renderTagCandidates(list);
    });
    this.els.tagSearchInput.addEventListener("keydown", async (e) => {
      if (e.isComposing || e.keyCode === 229) return;
      if (e.key === "Escape") {
        this.closeTagPicker();
        return;
      }
      if (e.key === "ArrowDown") {
        await this.moveTagCandidate(1);
        e.preventDefault();
        return;
      }
      if (e.key === "ArrowUp") {
        await this.moveTagCandidate(-1);
        e.preventDefault();
        return;
      }
      if (e.key === "Enter") {
        const chosen = this.currentTagCandidates[this.currentTagIndex] || this.currentTagCandidates[0];
        this.insertSelectedTag(chosen?.name || this.els.tagSearchInput.value);
        e.preventDefault();
      }
    });
    this.els.tagSearchList.addEventListener("click", (e) => {
      const insertCurrent = e.target.closest("[data-insert-current-tag]");
      if (insertCurrent) {
        this.insertSelectedTag(this.els.tagSearchInput.value);
        return;
      }
      const row = e.target.closest("[data-tag-name]");
      if (!row) return;
      this.insertSelectedTag(row.dataset.tagName);
    });
    this.els.tagSearchList.addEventListener("mouseover", (e) => {
      const row = e.target.closest("[data-tag-index]");
      if (!row) return;
      const next = Number(row.dataset.tagIndex);
      if (!Number.isInteger(next) || next === this.currentTagIndex) return;
      this.currentTagIndex = next;
      this.renderTagCandidates(this.currentTagCandidates, this.currentTagCandidates[next]?.name || "");
    });

    this.els.runGuard.addEventListener("click", async () => {
      const note = this.activeNote();
      if (!note) return this.onStatus("请先打开一个笔记", "warn");
      if (this.isOriginalNote(note)) {
        try {
          await this.runOriginalityCheck(note, { forSave: false });
        } catch (error) {
          this.onStatus(`检测失败：${String(error?.message || error)}`, "warn");
        }
        return;
      }
      if (!this.isOriginalRecordableSource(note)) {
        this.onStatus("当前笔记不支持记录原创", "warn");
        return;
      }
      if (this.hasGeneratedOriginal(note)) {
        this.onStatus("这条笔记已经生成过原创笔记", "ok");
        return;
      }
      const sourceBody = this.getEditorValue();
      const literatureFields = this.isLiteratureNote(note) ? parseLiteratureWorkspace(sourceBody) : null;
      if (literatureFields && !normalizeFieldText(literatureFields.paraphrase)) {
        this.onStatus("先写出自己的转述，再记录原创笔记", "warn");
        return;
      }
      if (literatureFields) {
        const citation = literatureCitationState(literatureFields.citation);
        if (!citation.complete) {
          this.onStatus(`先补齐引用信息：${citation.missingLabels.join("、")}`, "warn");
          return;
        }
      }
      void this.onStateChange("record-original-from-note", {
        sourceNoteId: note.id,
        sourceTitle: note.title || "",
        sourceType: note.noteType,
        sourceBody,
        ...(literatureFields
          ? {
              citation: literatureFields.citation,
              originalText: literatureFields.originalText,
              paraphrase: literatureFields.paraphrase,
              whyKeep: literatureFields.whyKeep,
              supportsJudgment: literatureFields.supportsJudgment
            }
          : {})
      });
    });

    this.els.save.addEventListener("click", async () => {
      await this.saveActiveNote();
    });

    this.els.completeNote?.addEventListener("click", async () => {
      await this.saveActiveNote({ markLiteratureComplete: true });
    });
    this.els.literatureOpenNext?.addEventListener("click", () => {
      const current = this.activeNote();
      const nextRecord =
        this.literatureQueueRecords(current).find((item) => !item.isCurrent && item.lane === "pending") ||
        this.literatureQueueRecords(current).find((item) => !item.isCurrent && item.lane === "refine");
      if (!nextRecord) {
        this.onStatus("当前范围没有待处理的文献条目", "ok");
        return;
      }
      this.onOpenNote(nextRecord.note.id);
      this.onStatus(`已打开下一条${nextRecord.label}：${nextRecord.note.title || nextRecord.note.id}`, "ok");
    });
    this.els.literatureQueueList?.addEventListener("click", (event) => {
      const createButton = event.target.closest("[data-create-original-from-literature]");
      if (createButton) {
        const noteId = String(createButton.getAttribute("data-create-original-from-literature") || "").trim();
        const record = this.literatureQueueRecords(this.activeNote()).find((item) => item.note.id === noteId);
        if (!record) {
          this.onStatus("没有找到要提炼的文献条目", "warn");
          return;
        }
        if (record.lane !== "ready") {
          this.onStatus("这条文献笔记还没准备好进入原创笔记，请先补齐转述、保留理由和支持判断", "warn");
          return;
        }
        void this.onStateChange("record-original-from-note", {
          sourceNoteId: record.note.id,
          sourceTitle: record.note.title || "",
          sourceType: record.note.noteType || "literature",
          sourceBody: record.note.body || "",
          originalText: record.fields.originalText || "",
          paraphrase: record.fields.paraphrase || "",
          whyKeep: record.fields.whyKeep || "",
          supportsJudgment: record.fields.supportsJudgment || ""
        });
        return;
      }
      const button = event.target.closest("[data-open-literature-note]");
      if (!button) return;
      const noteId = String(button.getAttribute("data-open-literature-note") || "").trim();
      if (!noteId) return;
      this.onOpenNote(noteId);
      const target = this.state.notes.find((item) => item.id === noteId);
      this.onStatus(`已打开文献条目：${target?.title || noteId}`, "ok");
    });

    for (const field of [
      this.els.literatureTitle,
      this.els.literatureOriginal,
      this.els.literatureParaphrase,
      this.els.literatureWhyKeep,
      this.els.literatureSupportsJudgment
    ]) {
      field?.addEventListener("input", () => {
        if (!this.isLiteratureWorkspaceActive()) return;
        this.syncLiteratureWorkspaceToEditor();
        this.handleEditorInput();
      });
    }

    this.els.body.addEventListener("input", () => this.handleEditorInput());

    this.els.editorHost?.addEventListener("paste", (event) => {
      const clipboardFiles = [...(event.clipboardData?.files || [])];
      if (!clipboardFiles.length) {
        const items = [...(event.clipboardData?.items || [])]
          .filter((item) => item.kind === "file")
          .map((item) => item.getAsFile())
          .filter(Boolean);
        if (!items.length) return;
        event.preventDefault();
        void this.insertAssetFiles(items, { sourceLabel: "粘贴" });
        return;
      }
      event.preventDefault();
      void this.insertAssetFiles(clipboardFiles, { sourceLabel: "粘贴" });
    });
    this.els.editorHost?.addEventListener("dragover", (event) => {
      const hasFiles = [...(event.dataTransfer?.types || [])].includes("Files");
      if (!hasFiles) return;
      event.preventDefault();
      this.els.editorHost?.classList.add("dragover");
    });
    this.els.editorHost?.addEventListener("dragleave", (event) => {
      if (event.relatedTarget && this.els.editorHost?.contains(event.relatedTarget)) return;
      this.els.editorHost?.classList.remove("dragover");
    });
    this.els.editorHost?.addEventListener("drop", (event) => {
      const files = [...(event.dataTransfer?.files || [])];
      this.els.editorHost?.classList.remove("dragover");
      if (!files.length) return;
      event.preventDefault();
      void this.insertAssetFiles(files, { sourceLabel: "拖拽" });
    });

    this.els.body.addEventListener("keydown", (e) => {
      this.handleEditorKeydown(e);
    });

    document.addEventListener(
      "keydown",
      (e) => {
        const mod = e.ctrlKey || e.metaKey;
        if (!mod || String(e.key || "").toLowerCase() !== "s" || e.isComposing) return;
        if (!this.activeTab()) return;
        e.preventDefault();
        e.stopPropagation();
        this.saveActiveNote();
      },
      true
    );

    this.els.body.addEventListener("click", (e) => {
      if (!e.ctrlKey && !e.metaKey) return;
      const value = this.els.body.value;
      const token = tokenAtCursor(value, this.els.body.selectionStart || 0);
      this.handleTokenAction(token);
    });

    this.els.body.addEventListener("keyup", () => this.updateToolbarFormattingState());
    this.els.body.addEventListener("mouseup", () => this.updateToolbarFormattingState());

    document.addEventListener("selectionchange", () => {
      const active = document.activeElement;
      if (
        active?.closest?.("#editorHost") ||
        active?.closest?.("#wysiwygHost") ||
        active === this.els.body ||
        document.getSelection()?.anchorNode?.parentElement?.closest?.("#editorHost") ||
        document.getSelection()?.anchorNode?.parentElement?.closest?.("#wysiwygHost")
      ) {
        this.updateToolbarFormattingState();
      }
    });

    this.els.showRelated.addEventListener("click", () => {
      this.toggleInspector();
    });

    this.els.hideRelated?.addEventListener("click", () => {
      this.toggleInspector(false);
    });
  }

  handleEditorInput() {
      if (this.suppressEditorChange) return;
      const tab = this.activeTab();
      if (!tab) return;
      tab.body = this.getEditorValue();
      if (!this.isLiteratureWorkspaceActive() && this.isWysiwygMode()) {
        const normalized = normalizePlaceholderTitleBody(tab.body);
        if (normalized !== tab.body) {
          tab.body = normalized;
          this.setEditorValue(normalized);
        }
      }
      if (!this.isLiteratureWorkspaceActive() && this.isWysiwygMode() && tab.placeholderTitleArmed) {
        if (titleFromBody(tab.body) !== "未命名笔记") tab.placeholderTitleArmed = false;
      }
      tab.title = titleFromBody(tab.body);
      this.syncTabDirtyState(tab);
      if (this.isOriginalNote()) {
        const authorship = this.activeAuthorshipState();
        if (authorship.confirmed && authorship.confirmedBody !== tab.body) {
          authorship.confirmed = false;
        }
      }
      tab.saveUiState = {
        mode: tab.dirty ? "dirty" : "saved",
        message: tab.dirty ? "" : "当前文件：已自动同步"
      };
      if (tab.dirty) this.writeDraft(tab);
      else this.clearDraft(tab.noteId);
      if (tab.dirty) this.scheduleAutoSave();
      else this.clearAutoSaveTimer();
      this.renderTabs();
      this.renderSaveHint();
      this.renderLiteratureWorkspace();
      this.renderPreview();
      this.updateToolbarFormattingState();

      if (this.isLiteratureWorkspaceActive()) return;
      if (this.isEditingTitleLine()) {
        if (!this.els.linkPicker.classList.contains("hidden") && this.currentLinkContext) this.closeLinkPicker();
        if (!this.els.tagPicker.classList.contains("hidden") && this.currentTagContext) this.closeTagPicker();
        return;
      }

      if (this.skipInlinePickersOnce) {
        this.skipInlinePickersOnce = false;
        if (!this.els.linkPicker.classList.contains("hidden") && this.currentLinkContext) this.closeLinkPicker();
        if (!this.els.tagPicker.classList.contains("hidden") && this.currentTagContext) this.closeTagPicker();
        return;
      }

      const inline = this.detectInlineLinkContext();
      if (inline) {
        void this.openLinkPicker(inline.query, { inlineContext: inline });
        this.lastInlinePickerAnchor = inline.end;
      } else if (!this.els.linkPicker.classList.contains("hidden") && this.currentLinkContext) {
        this.closeLinkPicker();
      }

      const tagInline = this.detectInlineTagContext();
      if (tagInline) {
        void this.openTagPicker(tagInline.query, { inlineContext: tagInline });
        this.lastInlinePickerAnchor = tagInline.end;
      } else if (!this.els.tagPicker.classList.contains("hidden") && this.currentTagContext) {
        this.closeTagPicker();
      }
  }

  handleEditorKeydown(e) {
    if (this.isWysiwygMode()) this.clearMarkdownSelectionOverride();
    if (e.isComposing || e.keyCode === 229) return;
    const mod = e.ctrlKey || e.metaKey;
    const key = String(e.key || "").toLowerCase();

    if (!mod && !e.shiftKey && e.key === "Enter" && this.enterBodyFromTitle()) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    if (mod && key === "s") {
      e.preventDefault();
      this.saveActiveNote();
      return;
    }
    if (mod && key === "1") {
      e.preventDefault();
      this.togglePreview("wysiwyg");
      return;
    }
    if (mod && key === "2") {
      e.preventDefault();
      this.togglePreview("source");
      return;
    }
    if (mod && key === "b") {
      e.preventDefault();
      this.wrapSelection("**", "**");
      return;
    }
    if (mod && key === "i") {
      e.preventDefault();
      this.wrapSelection("*", "*");
      return;
    }
    if (mod && e.shiftKey && key === "h") {
      e.preventDefault();
      this.formatCurrentBlock("h2");
      return;
    }
    if (mod && e.shiftKey && key === "7") {
      e.preventDefault();
      this.formatCurrentBlock("ul");
      return;
    }
    if (!mod && e.key === "Tab") {
      e.preventDefault();
      this.indentSelection(e.shiftKey ? -1 : 1);
      return;
    }

    const linkInlineOpen = !this.els.linkPicker.classList.contains("hidden") && this.currentLinkContext;
    const tagInlineOpen = !this.els.tagPicker.classList.contains("hidden") && this.currentTagContext;
    if (this.isWysiwygMode() && !linkInlineOpen && !tagInlineOpen && !mod && !e.shiftKey && e.key === "Enter" && this.handleStructuredEnter()) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    if (this.isWysiwygMode() && !linkInlineOpen && !tagInlineOpen && !mod && !e.shiftKey && e.key === "Enter" && this.handlePlainParagraphEnter()) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    if (!linkInlineOpen && !tagInlineOpen && !mod && e.key === "Backspace" && this.handleStructuredBackspace()) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    if (!linkInlineOpen && !tagInlineOpen) return;

    if (e.key === "ArrowDown") {
      if (linkInlineOpen) this.moveLinkCandidate(1);
      else void this.moveTagCandidate(1);
      e.preventDefault();
      return;
    }
    if (e.key === "ArrowUp") {
      if (linkInlineOpen) this.moveLinkCandidate(-1);
      else void this.moveTagCandidate(-1);
      e.preventDefault();
      return;
    }
    if (e.key === "Enter") {
      if (linkInlineOpen) {
        const chosen = this.currentLinkCandidates[this.currentLinkIndex] || this.currentLinkCandidates[0];
        if (chosen) this.insertSelectedLinkNote(chosen.id);
      } else {
        const chosen = this.currentTagCandidates[this.currentTagIndex] || this.currentTagCandidates[0];
        this.insertSelectedTag(chosen?.name || this.els.tagSearchInput.value);
      }
      e.preventDefault();
      return;
    }
    if (e.key === "Escape") {
      if (linkInlineOpen) this.closeLinkPicker();
      if (tagInlineOpen) this.closeTagPicker();
      e.preventDefault();
    }
  }

  async saveActiveNote(options = {}) {
    if (this.savingPromise) return this.savingPromise;
    this.clearAutoSaveTimer();
    this.closeLinkPicker();
    this.closeTagPicker();
    this.setSaveUiState("saving", "当前文件：正在自动同步...");
    this.savingPromise = this.performSaveActiveNote(options);
    try {
      return await this.savingPromise;
    } finally {
      this.savingPromise = null;
      if (this.activeTab()?.dirty) this.scheduleAutoSave();
    }
  }

  async performSaveActiveNote(options = {}) {
    const tab = this.updateActiveTabFromEditor();
    if (!tab) return this.onStatus("请先打开一个笔记", "warn");
    const note = this.state.notes.find((n) => n.id === tab.noteId);
    if (!note) return this.onStatus("找不到对应笔记", "bad");
    const markLiteratureComplete = options?.markLiteratureComplete === true;

    note.body = tab.body;
    note.title = titleFromBody(tab.body);
    note.noteType = typeFromFolder(this.state, note.folderId);
    note.tags = parseTags(note.body);
    note.links = parseLinks(note.body);
    note.updatedAt = new Date().toISOString();

    tab.title = note.title;

    let originality = null;
    let nextStatus = String(note.status || "draft").trim() || "draft";
    if (note.noteType === "literature") {
      const completion = this.literatureCompletionState(note);
      if (markLiteratureComplete && !completion.hasParaphrase) {
        const message = reflectionQuestionsHint("文献笔记还不能标记完成。");
        this.setSaveUiState("blocked", message);
        this.onStatus("文献笔记缺少转述，不能标记为已完成", "warn");
        return;
      }
      if (markLiteratureComplete && !completion.hasCitationMetadata) {
        const missing = completion.missingCitationFields.join("、");
        const message = `文献笔记还不能标记完成。缺少引用信息：${missing}`;
        this.setSaveUiState("blocked", message);
        this.onStatus(`文献笔记缺少引用信息：${missing}`, "warn");
        return;
      }
      if (!completion.hasParaphrase || !completion.hasCitationMetadata) {
        nextStatus = "draft";
      } else if (markLiteratureComplete || nextStatus === "active") {
        nextStatus = "active";
      } else {
        nextStatus = "draft";
      }
      note.status = nextStatus;
    }
    if (note.noteType === "original") {
      try {
        originality = await this.runOriginalityCheck(note, { forSave: true });
      } catch (error) {
        this.onStatus(`原创性检查不可用，当前先按草稿处理：${String(error?.message || error)}`, "warn");
        originality = { status: "warning", similarity: 0, reasons: ["check_unavailable"] };
      }
      if (originality?.status === "blocked") {
        this.setSaveUiState("blocked", reflectionQuestionsHint("当前文件：原创性检测阻止继续推进，请先重写。"));
        return;
      }
      note.originalityStatus = originality?.status || "warning";
      note.originalitySimilarity = Number(originality?.similarity || 0);
      nextStatus = note.originalityStatus === "pass" ? "active" : "draft";
      note.status = nextStatus;
    }

    if (note.noteType !== "original") {
      this.onStatus(
        note.noteType === "literature" && nextStatus === "active"
          ? "文献笔记已完成"
          : "当前修改已同步",
        "ok"
      );
    }
    this.renderRelated();
    const saved = await this.onStateChange("save-note", {
      status: nextStatus,
      originalityStatus: note.originalityStatus,
      originalitySimilarity: note.originalitySimilarity,
      authorshipConfirmed: true,
      authorshipClaim: ""
    });
    if (saved === false || (saved && typeof saved === "object" && saved.ok === false)) {
      tab.dirty = true;
      this.writeDraft(tab);
      this.setSaveUiState(
        String(saved?.saveMode || "error").trim() || "error",
        String(saved?.saveMessage || "当前文件：同步失败，修改仍保留在编辑器中。")
      );
      return;
    }
    tab.savedBody = tab.body;
    tab.savedTitle = tab.title;
    tab.dirty = false;
    this.clearDraft(tab.noteId);
    this.setSaveUiState("saved", "当前文件：已自动同步");
    this.setEditorValue(tab.body);
    if (note.noteType === "original") {
      this.onStatus(
        note.originalityStatus === "pass" ? "原创笔记已同步" : "原创笔记已同步，但仍建议继续打磨",
        note.originalityStatus === "pass" ? "ok" : "warn"
      );
    }
    this.renderTabs();
  }
}



