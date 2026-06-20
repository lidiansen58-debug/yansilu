import { assetPreviewUrl } from "./prototype-api.js";
import { escapeHtml } from "./editor-render-utils.js";

export function formatMarkdownLinkDestination(value = "") {
  const target = String(value || "").trim();
  if (!target) return "";
  if (target.startsWith("<") && target.endsWith(">")) return target;
  return /\s|[()]/.test(target) ? `<${target}>` : target;
}

export function unformatMarkdownLinkDestination(value = "") {
  const target = String(value || "").trim();
  if (target.startsWith("<") && target.endsWith(">")) return target.slice(1, -1).trim();
  return target;
}

export function parseMarkdownLinkSyntax(source = "") {
  const text = String(source || "");
  const head = text.match(/^(!?)\[([^\]]*)\]\(/);
  if (!head) return null;

  const isImage = head[1] === "!";
  const label = head[2] || "";
  let cursor = head[0].length;
  let href = "";
  let closeParen = -1;

  if (text[cursor] === "<") {
    const closeAngle = text.indexOf(">", cursor + 1);
    if (closeAngle < 0 || text[closeAngle + 1] !== ")") return null;
    href = text.slice(cursor, closeAngle + 1);
    closeParen = closeAngle + 1;
  } else {
    closeParen = text.indexOf(")", cursor);
    if (closeParen < 0) return null;
    href = text.slice(cursor, closeParen);
  }

  const raw = text.slice(0, closeParen + 1);
  return {
    isImage,
    label,
    href,
    raw,
    length: raw.length
  };
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

export function normalizePosixPath(input) {
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

export function resolveAssetPathForNote(rawPath, noteMarkdownPath = "") {
  const target = unformatMarkdownLinkDestination(rawPath);
  if (!target) return "";
  if (/^(https?:|data:)/i.test(target)) return target;
  if (target.startsWith("assets/")) return normalizePosixPath(target);
  const normalizedNotePath = String(noteMarkdownPath || "").replaceAll("\\", "/");
  const slash = normalizedNotePath.lastIndexOf("/");
  const noteDir = slash >= 0 ? normalizedNotePath.slice(0, slash) : "";
  return normalizePosixPath(`${noteDir}/${target}`);
}

export function previewAssetUrl(rawPath, noteMarkdownPath = "") {
  const assetPath = resolveAssetPathForNote(rawPath, noteMarkdownPath);
  if (!assetPath || /^(https?:|data:)/i.test(assetPath)) return assetPath;
  if (!assetPath.startsWith("assets/")) return "";
  return assetPreviewUrl(assetPath);
}

export function isExternalLinkUrl(url = "") {
  return /^(https?:|mailto:|tel:)/i.test(String(url || "").trim());
}

export function resolvePreviewableAsset(rawPath, noteMarkdownPath = "") {
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

export function isPreviewImageUrl(url = "") {
  const value = String(url || "").trim();
  return /^data:image\//i.test(value) || /\.(png|jpe?g|gif|webp|svg|bmp|ico|avif)(\?|$)/i.test(value);
}

export function isPreviewPdfUrl(url = "") {
  return /\.pdf(\?|$)/i.test(decodePreviewUrl(url));
}

export function decodePreviewUrl(url = "") {
  const value = String(url || "").trim();
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function isPreviewDocumentUrl(url = "") {
  return /\.(pdf|txt|md|markdown|csv|json|log)(\?|$)/i.test(decodePreviewUrl(url));
}

export function attachmentLabelFromPath(rawPath) {
  const normalized = String(rawPath || "").replaceAll("\\", "/");
  const parts = normalized.split("/").filter(Boolean);
  return parts[parts.length - 1] || normalized || "附件";
}

const ALLOWED_ATTACHMENT_EXTENSIONS = new Set([".pdf", ".txt", ".md", ".markdown", ".csv", ".json", ".log"]);
const ALLOWED_ATTACHMENT_MIME_TYPES = new Set([
  "application/pdf",
  "application/json",
  "application/x-ndjson",
  "text/plain",
  "text/markdown",
  "text/csv",
  "application/csv"
]);

export function fileExtension(fileName = "") {
  const match = String(fileName || "").trim().toLowerCase().match(/(\.[^.\\/]+)$/);
  return match?.[1] || "";
}

export function isImageFile(file) {
  const mimeType = String(file?.type || "").trim().toLowerCase();
  return mimeType.startsWith("image/") || /\.(png|jpe?g|gif|webp|svg|bmp|ico|avif)$/i.test(String(file?.name || ""));
}

export function isAllowedAttachmentFile(file) {
  if (isImageFile(file)) return true;
  const mimeType = String(file?.type || "").trim().toLowerCase();
  const ext = fileExtension(file?.name || "");
  return ALLOWED_ATTACHMENT_MIME_TYPES.has(mimeType) || ALLOWED_ATTACHMENT_EXTENSIONS.has(ext);
}

export function isMarkdownCodeFenceLine(line = "") {
  return /^\s*```/.test(String(line || ""));
}

export function isHorizontalRuleLine(line = "") {
  return /^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/.test(String(line || ""));
}

export function isMarkdownChecklistLine(line = "") {
  return /^\s*[-*+]\s\[(?: |x|X)\]\s/.test(String(line || ""));
}

export function isMarkdownBulletLine(line = "") {
  return /^\s*[-*+]\s/.test(String(line || "")) && !isMarkdownChecklistLine(line);
}

export function isMarkdownImageLine(line = "") {
  const trimmed = String(line || "").trim();
  const link = parseMarkdownLinkSyntax(trimmed);
  return Boolean(link?.isImage && link.length === trimmed.length);
}

export function isMarkdownAttachmentLine(line = "") {
  const trimmed = String(line || "").trim();
  const link = parseMarkdownLinkSyntax(trimmed);
  return Boolean(link && !link.isImage && link.length === trimmed.length && link.label);
}

export function isMarkdownTableSeparator(line = "") {
  const trimmed = String(line || "").trim();
  if (!trimmed.includes("-")) return false;
  const normalized = trimmed.replace(/^\|/, "").replace(/\|$/, "");
  const cells = normalized.split("|").map((cell) => cell.trim());
  return cells.length >= 2 && cells.every((cell) => /^:?-{3,}:?$/.test(cell));
}

export function isMarkdownTableRow(line = "") {
  const trimmed = String(line || "").trim();
  if (!trimmed.includes("|")) return false;
  const normalized = trimmed.replace(/^\|/, "").replace(/\|$/, "");
  const cells = normalized.split("|");
  return cells.length >= 2;
}

export function isMarkdownTableStart(lines = [], index = 0) {
  return isMarkdownTableRow(lines[index]) && isMarkdownTableSeparator(lines[index + 1] || "");
}

export function isMarkdownOrderedListLine(line = "") {
  return /^\s*\d+[.)]\s/.test(String(line || ""));
}

export function isMarkdownQuoteLine(line = "") {
  return /^\s*>\s?/.test(String(line || ""));
}

export function isMarkdownListLikeLine(line = "") {
  return isMarkdownChecklistLine(line) || isMarkdownBulletLine(line) || isMarkdownOrderedListLine(line);
}

export function isMarkdownIndentedContinuation(line = "") {
  return /^\s{2,}\S/.test(String(line || "")) && !isMarkdownListLikeLine(line);
}

export function shouldKeepTightWysiwygLineBreak(lines = [], index = 0, options = {}) {
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

export function normalizeWysiwygMarkdownValue(markdown = "", offsets = []) {
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

export function parseMarkdownTableRow(line = "") {
  const trimmed = String(line || "").trim().replace(/^\|/, "").replace(/\|$/, "");
  return trimmed.split("|").map((cell) => cell.trim());
}

export function formatMarkdownTableRow(cells = [], width = cells.length || 2) {
  const normalized = Array.from({ length: width }, (_, index) => String(cells[index] || "").trim());
  return `| ${normalized.join(" | ")} |`;
}

export function formatMarkdownTableSeparator(width = 2) {
  return `| ${Array.from({ length: Math.max(2, width) }, () => "---").join(" | ")} |`;
}

export function normalizeCodeLanguage(language = "") {
  const value = String(language || "").trim().toLowerCase();
  if (!value) return "";
  if (["js", "jsx", "javascript", "node"].includes(value)) return "javascript";
  if (["ts", "tsx", "typescript"].includes(value)) return "typescript";
  if (["json", "jsonc"].includes(value)) return "json";
  if (["sh", "bash", "zsh", "shell", "powershell", "ps1"].includes(value)) return "shell";
  if (["md", "markdown"].includes(value)) return "markdown";
  return value;
}

export function inferCodeLanguage(code = "") {
  const source = String(code || "").trim();
  if (!source) return "text";
  if ((source.startsWith("{") || source.startsWith("[")) && /":\s*/.test(source)) return "json";
  if (/^\s*(npm|pnpm|yarn|git|cd|ls|mkdir|cp|mv|rm|cat|echo|node|python|cargo)\b/m.test(source) || /^\s*\$\s+/m.test(source)) return "shell";
  if (/\b(interface|type|implements|enum)\b/.test(source)) return "typescript";
  if (/\b(const|let|var|function|return|import|export|class|async|await|=>)\b/.test(source)) return "javascript";
  if (/^(#{1,6}\s|>\s|[-*]\s|\[[^\]]+\]\([^)]+\))/m.test(source)) return "markdown";
  return "text";
}

export const CODE_BLOCK_LANGUAGE_OPTIONS = [
  { value: "text", label: "纯文本" },
  { value: "javascript", label: "JavaScript" },
  { value: "typescript", label: "TypeScript" },
  { value: "json", label: "JSON" },
  { value: "shell", label: "Shell" },
  { value: "markdown", label: "Markdown" }
];

export function collectHighlightMatches(source = "", definitions = []) {
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

export function renderHighlightedText(source = "", definitions = []) {
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

export function renderHighlightedCode(code = "", rawLanguage = "") {
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

export function encodePreviewPayload(value = "") {
  return encodeURIComponent(String(value || ""));
}

export function decodePreviewPayload(value = "") {
  try {
    return decodeURIComponent(String(value || ""));
  } catch {
    return String(value || "");
  }
}

export function isMarkdownBlockBoundary(lines = [], index = 0) {
  const line = String(lines[index] || "");
  if (!line.trim()) return false;
  return (
    /^#{1,6}\s+/.test(line) ||
    line.startsWith("> ") ||
    isMarkdownCodeFenceLine(line) ||
    isHorizontalRuleLine(line) ||
    isMarkdownImageLine(line) ||
    isMarkdownAttachmentLine(line) ||
    isMarkdownChecklistLine(line) ||
    isMarkdownBulletLine(line) ||
    isMarkdownOrderedListLine(line) ||
    isMarkdownTableStart(lines, index)
  );
}
