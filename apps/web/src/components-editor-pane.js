import { parseLinks, parseTags, rootBoxIdFromFolder, typeFromFolder } from "./prototype-store.js";
import {
  countExplicitSemanticRelations,
  deriveNoteWritingReadiness,
  isHiddenSemanticRelation,
  isMarkdownWikilinkSemanticRelation
} from "./writing-readiness.js";
import {
  assetPreviewUrl,
  checkOriginality,
  createNoteRelation,
  deleteNoteRelation,
  adoptAiInboxFieldSuggestion,
  fetchNote,
  fetchAiSuggestion,
  fetchAiSuggestions,
  fetchNoteRelations,
  fetchNotesByTag,
  listTags,
  searchNotes,
  updateAiSuggestion,
  updateNoteRelation,
  uploadNoteAsset
} from "./prototype-api.js";
import {
  noteSuggestionReviewContent,
  renderNoteEmbeddedAiWorkspace
} from "./note-embedded-ai-workspace.js";
import { aiSuggestionStatusLabel } from "./ai-suggestions-model.js";

const UNTITLED_NOTE_TITLE = "未命名笔记";

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
  if (!lines.length) return UNTITLED_NOTE_TITLE;
  return lines[0].replace(/^#+\s*/, "").slice(0, 60) || UNTITLED_NOTE_TITLE;
}

function normalizePlaceholderTitleBody(body = "") {
  const text = String(body || "").replace(/\r\n/g, "\n");
  return text.replace(new RegExp(`^#\\s*${escapeRegExp(UNTITLED_NOTE_TITLE)}(?=\\S)`), "# ");
}

function normalizedNoteTitleText(title = "") {
  return String(title || "").trim() || UNTITLED_NOTE_TITLE;
}

function noteUsesPlaceholderTitle(title = "") {
  return normalizedNoteTitleText(title) === UNTITLED_NOTE_TITLE;
}

function normalizedBodyTextForDirtyCheck(body = "") {
  return String(body || "")
    .replace(/\r\n/g, "\n")
    .replace(/\n+$/g, "");
}

const LITERATURE_SECTION_LABELS = {
  citation: "引用信息",
  originalText: "原文",
  paraphrase: "转述",
  whyKeep: "保留原因",
  supportsJudgment: "判断种子",
  question: "追问",
  boundary: "边界 / 反例"
};

function normalizeLooseText(value = "") {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s.,;:!?'"“”‘’()\[\]{}<>/\\|`~@#$%^&*_+=-]+/g, "");
}

function countIdeaUnits(value = "") {
  const matches = String(value || "").trim().match(/[\u4e00-\u9fff]|[A-Za-z0-9]+/g);
  return Array.isArray(matches) ? matches.length : 0;
}

function noteHasBoundarySignal(note = {}) {
  if (String(note?.boundaryOrCounterpoint || note?.boundary_or_counterpoint || "").trim()) return true;
  const body = String(note?.body || note?.markdown || "");
  return /边界|反例|不成立|适用条件|反方|counterpoint|boundary|counterexample/i.test(body);
}

function collectDistillationWarnings(note = {}) {
  const warnings = [];
  const title = String(note?.title || "").trim().replace(/^#+\s+/, "");
  const thesis = String(note?.thesis || "").trim();
  const summary = [0, 1, 2].map((idx) => String((note?.threeLineSummary || [])[idx] || "").trim());

  if (!thesis) {
    warnings.push("还没有写出一句话判断。");
  } else {
    const thesisUnits = countIdeaUnits(thesis);
    if (thesisUnits < 4) warnings.push("一句话判断过短，更像标签而不是判断。");
    if (thesisUnits > 32 || thesis.length > 90) warnings.push("一句话判断过长，建议压到一个可被反驳的判断。");
    if (title && normalizeLooseText(title) === normalizeLooseText(thesis)) warnings.push("一句话判断和标题几乎一样，还像标题而不是判断。");
  }

  if (summary.some((line) => !line)) {
    warnings.push("三句话压缩还不完整，需要恰好三句。");
  } else {
    const normalized = summary.map((line) => normalizeLooseText(line));
    if (new Set(normalized).size < normalized.length) warnings.push("三句话压缩里有重复句，理由和用途还没有拉开。");
    if (countIdeaUnits(summary[1]) < 4) warnings.push("第二句还不够像理由，建议补为什么它成立或重要。");
    if (countIdeaUnits(summary[2]) < 4) warnings.push("第三句还不够像用途，建议补它服务于哪个问题或写作方向。");
  }

  if (!noteHasBoundarySignal(note)) warnings.push("还缺边界、反例或反方，论证容易太顺。");
  return warnings;
}

function distillationDraftFromForm(form, note = {}) {
  return {
    title: note?.title || "",
    body: note?.body || "",
    thesis: String(form?.querySelector?.('[name="thesis"]')?.value || note?.thesis || "").trim(),
    threeLineSummary: [1, 2, 3].map((idx) => String(form?.querySelector?.(`[name="summary${idx}"]`)?.value || "").trim()),
    boundaryOrCounterpoint: String(form?.querySelector?.('[name="boundaryOrCounterpoint"]')?.value || note?.boundaryOrCounterpoint || "").trim()
  };
}

function renderDistillationQualityContent(note = {}) {
  const warnings = collectDistillationWarnings(note);
  if (!warnings.length) {
    return `<div class="related-empty">一句话判断、三句话压缩和边界提示都已具备，可以继续确认观点或加入写作篮。</div>`;
  }
  return `
    <div class="related-empty bad">当前还有 ${warnings.length} 项需要打磨。</div>
    <ul class="distillation-quality-list">
      ${warnings.map((item) => `<li>${item}</li>`).join("")}
    </ul>
  `;
}

const LITERATURE_SECTION_ALIASES = {
  supportsJudgment: ["支持判断"],
  boundary: ["边界/反例", "边界与反例", "不适用范围"]
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
const AUTO_SAVE_IDLE_MS = 15000;
const AUTO_SAVE_INTERVAL_MS = 15000;

function escapeRegExp(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function formatMarkdownLinkDestination(value = "") {
  const target = String(value || "").trim();
  if (!target) return "";
  if (target.startsWith("<") && target.endsWith(">")) return target;
  return /\s|[()]/.test(target) ? `<${target}>` : target;
}

function unformatMarkdownLinkDestination(value = "") {
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

export function normalizeFieldText(value = "") {
  return String(value || "").replace(/\r\n/g, "\n").trim();
}

function stripMarkdownTitle(body = "") {
  const text = String(body || "").replace(/\r\n/g, "\n");
  const lines = text.split("\n");
  if (!lines.length) return "";
  return lines.slice(1).join("\n").replace(/^\n+/, "");
}

function literatureSectionLabelsFor(key = "") {
  const primary = LITERATURE_SECTION_LABELS[key];
  return [...new Set([primary, ...(LITERATURE_SECTION_ALIASES[key] || [])].filter(Boolean))];
}

function allLiteratureSectionLabels() {
  return Object.keys(LITERATURE_SECTION_LABELS).flatMap((key) => literatureSectionLabelsFor(key));
}

function extractLiteratureSection(body = "", labels = "") {
  const text = String(body || "").replace(/\r\n/g, "\n");
  const candidates = Array.isArray(labels) ? labels : [labels];
  for (const label of candidates.filter(Boolean)) {
    const headingRegex = new RegExp(`(^|\\n)##\\s+${escapeRegExp(label)}\\s*\\n`, "m");
    const match = headingRegex.exec(text);
    if (!match) continue;
    const start = match.index + match[0].length;
    const rest = text.slice(start);
    const nextHeading = /\n##\s+[^\n]+\s*\n/m.exec(rest);
    const section = nextHeading ? rest.slice(0, nextHeading.index) : rest;
    return section.replace(/^\n+|\n+$/g, "");
  }
  return "";
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
  const structured = allLiteratureSectionLabels().some((label) =>
    new RegExp(`(^|\\n)##\\s+${escapeRegExp(label)}\\s*(\\n|$)`, "m").test(content)
  );
  const citation = structured
    ? parseLiteratureCitationFields(extractLiteratureSection(content, literatureSectionLabelsFor("citation")))
    : emptyLiteratureCitationFields();
  const originalText = structured ? extractLiteratureSection(content, literatureSectionLabelsFor("originalText")) : content.trim();
  return {
    title,
    citation,
    originalText,
    paraphrase: structured ? extractLiteratureSection(content, literatureSectionLabelsFor("paraphrase")) : "",
    whyKeep: structured ? extractLiteratureSection(content, literatureSectionLabelsFor("whyKeep")) : "",
    supportsJudgment: structured ? extractLiteratureSection(content, literatureSectionLabelsFor("supportsJudgment")) : "",
    question: structured ? extractLiteratureSection(content, literatureSectionLabelsFor("question")) : "",
    boundary: structured ? extractLiteratureSection(content, literatureSectionLabelsFor("boundary")) : ""
  };
}

function composeLiteratureWorkspace(fields = {}) {
  const title = String(fields.title || "未命名笔记").trim() || "未命名笔记";
  const citation = normalizeLiteratureCitationFields(fields.citation || {});
  const originalText = normalizeFieldText(fields.originalText);
  const paraphrase = normalizeFieldText(fields.paraphrase);
  const whyKeep = normalizeFieldText(fields.whyKeep);
  const supportsJudgment = normalizeFieldText(fields.supportsJudgment);
  const question = normalizeFieldText(fields.question);
  const boundary = normalizeFieldText(fields.boundary);
  const lines = [
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
    ""
  ];
  if (supportsJudgment) lines.push(`## ${LITERATURE_SECTION_LABELS.supportsJudgment}`, "", supportsJudgment, "");
  if (question) lines.push(`## ${LITERATURE_SECTION_LABELS.question}`, "", question, "");
  if (boundary) lines.push(`## ${LITERATURE_SECTION_LABELS.boundary}`, "", boundary, "");
  if (whyKeep) lines.push(`## ${LITERATURE_SECTION_LABELS.whyKeep}`, "", whyKeep, "");
  return lines.join("\n");
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

export function relationCreateDefaultTypeForNote(note = {}) {
  const body = String(note?.body || "").trim();
  if (/反例|counterexample/i.test(body)) return "counterexample_to";
  if (noteHasBoundarySignal(note)) return "qualifies";
  if (/例如|比如|for example|for instance/i.test(body)) return "example_of";
  const links = parseLinks(body);
  const tags = parseTags(body);
  if (links.length || tags.length) return "same_topic";
  return "supports";
}

function resolveRelationCandidateToken(token = "", candidates = []) {
  const raw = String(token || "").trim();
  if (!raw) return null;
  const byId = candidates.find((note) => normalizeText(note.id) === normalizeText(raw));
  if (byId) return byId;
  const exactTitle = candidates.find((note) => normalizeText(note.title) === normalizeText(raw));
  if (exactTitle) return exactTitle;
  const fuzzy = candidates.find(
    (note) => normalizeText(note.title).includes(normalizeText(raw)) || normalizeText(note.id).includes(normalizeText(raw))
  );
  return fuzzy || null;
}

export function sortRelationTargetCandidatesForNote(candidates = [], note = {}) {
  const current = note || {};
  const scoped = Array.isArray(candidates) ? candidates.slice() : [];
  const resolvedForwardIds = new Set(
    parseLinks(current.body || "")
      .map((token) => resolveRelationCandidateToken(token, scoped))
      .filter((item) => item?.id)
      .map((item) => item.id)
  );
  const currentTags = new Set(parseTags(current.body || "").map((tag) => normalizeText(tag)));
  return scoped.sort((a, b) => {
    const score = (candidate) => {
      let value = 0;
      if (resolvedForwardIds.has(candidate.id)) value += 100;
      const candidateTags = Array.isArray(candidate?.tags) ? candidate.tags : parseTags(candidate?.body || "");
      value += candidateTags.filter((tag) => currentTags.has(normalizeText(tag))).length * 10;
      if (candidate.folderId && candidate.folderId === current.folderId) value += 4;
      if (String(candidate.thesis || "").trim()) value += 2;
      return value;
    };
    const diff = score(b) - score(a);
    if (diff) return diff;
    return String(a.title || a.id || "").localeCompare(String(b.title || b.id || ""), "zh-CN");
  });
}

function normalizeClickedTag(token) {
  const value = String(token || "")
    .replace(/^#/, "")
    .replace(/[，。！？、；：.!?;:,]+$/u, "")
    .trim();
  const match = value.match(/^[A-Za-z0-9_\-\u4e00-\u9fff]+/u);
  return match ? match[0] : value;
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
  const target = unformatMarkdownLinkDestination(rawPath);
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

function isExternalLinkUrl(url = "") {
  return /^(https?:|mailto:|tel:)/i.test(String(url || "").trim());
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
  return /\.pdf(\?|$)/i.test(decodePreviewUrl(url));
}

function decodePreviewUrl(url = "") {
  const value = String(url || "").trim();
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function isPreviewDocumentUrl(url = "") {
  return /\.(pdf|txt|md|markdown|csv|json|log)(\?|$)/i.test(decodePreviewUrl(url));
}

function attachmentLabelFromPath(rawPath) {
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

function fileExtension(fileName = "") {
  const match = String(fileName || "").trim().toLowerCase().match(/(\.[^.\\/]+)$/);
  return match?.[1] || "";
}

function isImageFile(file) {
  const mimeType = String(file?.type || "").trim().toLowerCase();
  return mimeType.startsWith("image/") || /\.(png|jpe?g|gif|webp|svg|bmp|ico|avif)$/i.test(String(file?.name || ""));
}

function isAllowedAttachmentFile(file) {
  if (isImageFile(file)) return true;
  const mimeType = String(file?.type || "").trim().toLowerCase();
  const ext = fileExtension(file?.name || "");
  return ALLOWED_ATTACHMENT_MIME_TYPES.has(mimeType) || ALLOWED_ATTACHMENT_EXTENSIONS.has(ext);
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
  const trimmed = String(line || "").trim();
  const link = parseMarkdownLinkSyntax(trimmed);
  return Boolean(link?.isImage && link.length === trimmed.length);
}

function isMarkdownAttachmentLine(line = "") {
  const trimmed = String(line || "").trim();
  const link = parseMarkdownLinkSyntax(trimmed);
  return Boolean(link && !link.isImage && link.length === trimmed.length && link.label);
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

    const markdownLink = parseMarkdownLinkSyntax(source.slice(index));
    if (markdownLink && !markdownLink.isImage) {
      const { label, href } = markdownLink;
      if (isExternalLinkUrl(href)) {
        html += `<button class="preview-wikilink" type="button" data-preview-external-url="${escapeHtml(href)}">${escapeHtml(label || href)}</button>`;
        index += markdownLink.length;
        continue;
      }
      const url = previewAssetUrl(href, noteMarkdownPath);
      const textLabel = label || attachmentLabelFromPath(href);
      if (!url) {
        html += `<button class="preview-link" type="button" data-preview-missing-asset="${escapeHtml(href)}">${escapeHtml(textLabel)}</button>`;
      } else {
        html += `<button class="preview-attachment inline" type="button" data-preview-asset-url="${escapeHtml(url)}" data-preview-asset-label="${escapeHtml(textLabel)}">${escapeHtml(textLabel)}</button>`;
      }
      index += markdownLink.length;
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

export function renderMarkdownPreview(markdown, options = {}) {
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

    const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      blocks.push(`<h${level}>${renderInlinePreview(headingMatch[2], options)}</h${level}>`);
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

    const imageMatch = parseMarkdownLinkSyntax(line.trim());
    if (imageMatch?.isImage && imageMatch.length === line.trim().length) {
      const { label: alt, href } = imageMatch;
      const url = previewAssetUrl(href, noteMarkdownPath);
      const label = alt || attachmentLabelFromPath(href);
      if (!url) {
        blocks.push(`<div class="preview-attachment-block"><button class="preview-attachment" type="button" data-preview-missing-asset="${escapeHtml(href)}"><span class="preview-attachment-name">${escapeHtml(label)}</span><span class="preview-attachment-path">${escapeHtml(href)}</span></button></div>`);
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

    if (isMarkdownBulletLine(line)) {
      const items = [];
      while (index < lines.length && isMarkdownBulletLine(lines[index])) {
        const match = lines[index].match(/^\s*[-*+]\s?(.*)$/);
        items.push(`<li>${renderInlinePreview(match?.[1] || "", options)}</li>`);
        index += 1;
      }
      blocks.push(`<ul>${items.join("")}</ul>`);
      continue;
    }

    if (isMarkdownOrderedListLine(line)) {
      const firstNumber = Number(line.match(/^\s*(\d+)[.)]\s/)?.[1] || 1);
      const items = [];
      while (index < lines.length && isMarkdownOrderedListLine(lines[index])) {
        const match = lines[index].match(/^\s*\d+[.)]\s?(.*)$/);
        items.push(`<li>${renderInlinePreview(match?.[1] || "", options)}</li>`);
        index += 1;
      }
      const startAttr = firstNumber > 1 ? ` start="${firstNumber}"` : "";
      blocks.push(`<ol${startAttr}>${items.join("")}</ol>`);
      continue;
    }

    const attachmentMatch = parseMarkdownLinkSyntax(line.trim());
    if (attachmentMatch && !attachmentMatch.isImage && attachmentMatch.length === line.trim().length) {
      const { label, href } = attachmentMatch;
      const url = previewAssetUrl(href, noteMarkdownPath);
      const textLabel = label || attachmentLabelFromPath(href);
      if (!url) {
        blocks.push(`
          <div class="preview-attachment-block">
            <button class="preview-attachment" type="button" data-preview-missing-asset="${escapeHtml(href)}">
              <span class="preview-attachment-name">${escapeHtml(textLabel)}</span>
              <span class="preview-attachment-path">${escapeHtml(href)}</span>
            </button>
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
  return "永久笔记";
}

const RELATION_TYPE_LABELS = {
  supports: "支持",
  complements: "补充",
  contrasts: "对比",
  contradicts: "反驳",
  extends: "推进",
  precedes: "前提",
  follows: "后续",
  qualifies: "限定",
  example_of: "例子",
  counterexample_to: "反例",
  same_topic: "同主题",
  unexpected_connection: "意外相关",
  bridges: "桥接",
  restates: "重述",
  reframes: "改写问题",
  appears_in_draft: "进入草稿",
  asks: "追问",
  duplicates: "重复重叠",
  belongs_to_topic: "归属主题",
  associated_with: "链接线索",
  free_link: "自由链接"
};

const RELATION_STATUS_LABELS = {
  suggested: "建议",
  draft: "草稿",
  confirmed: "已确认",
  dismissed: "已忽略",
  archived: "已归档"
};

const RELATION_CREATE_TYPES = [
  "supports",
  "complements",
  "contrasts",
  "contradicts",
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
  "appears_in_draft"
];

function relationCreateTypeOptionsMarkup(selected = "supports") {
  const normalized = String(selected || "supports").trim().toLowerCase() || "supports";
  return RELATION_CREATE_TYPES.map((type) => {
    const isSelected = type === normalized;
    return `<option value="${escapeHtml(type)}"${isSelected ? " selected" : ""}>${escapeHtml(relationTypeLabel(type))}</option>`;
  }).join("");
}

const RELATION_EDIT_STATUSES = ["confirmed", "draft", "suggested", "dismissed", "archived"];

const RELATION_TENSION_TYPES = new Set(["contradicts", "counterexample_to", "contrasts", "qualifies"]);
const RELATION_BRIDGE_TYPES = new Set(["bridges", "reframes", "unexpected_connection", "extends"]);

function relationTypeLabel(type) {
  const key = String(type || "").trim().toLowerCase();
  return RELATION_TYPE_LABELS[key] || key || "关联";
}

function relationStatusLabel(status) {
  const key = String(status || "").trim().toLowerCase();
  return RELATION_STATUS_LABELS[key] || key || "已确认";
}

function isHiddenRelation(link) {
  return isHiddenSemanticRelation(link);
}

function isMarkdownWikilinkRelation(link) {
  return isMarkdownWikilinkSemanticRelation(link);
}

function relationTone(link) {
  const type = String(link?.relationType || "").trim().toLowerCase();
  if (RELATION_TENSION_TYPES.has(type)) return "tension";
  if (RELATION_BRIDGE_TYPES.has(type)) return "bridge";
  if (type === "supports" || type === "example_of") return "support";
  return "neutral";
}

function relationQualityEvaluation(rationale = "", insightQuestion = "") {
  const reason = String(rationale || "").trim();
  const question = String(insightQuestion || "").trim();
  const hasReason = reason.length >= 12;
  const namesRelation = /支持|反驳|限定|补充|推进|前提|后续|例子|反例|桥接|重述|改写|因为|所以|但是|然而|边界|证据|张力|冲突/.test(reason);
  const hasQuestion = question.length >= 8 && /[?？]/.test(question);
  const score = [hasReason, namesRelation, hasQuestion].filter(Boolean).length;
  if (score >= 3) {
    return { level: "strong", label: "可复用", message: "理由、关系动作和后续问题都比较清楚，可以进入网络继续生长。" };
  }
  if (score === 2) {
    return { level: "good", label: "较清楚", message: "已经能保存；再补一个边界、证据或后续问题会更适合长期复用。" };
  }
  if (score === 1) {
    return { level: "basic", label: "可保存", message: "可以先保存为草稿式关系，但最好写清它是在支持、限定、反驳还是桥接。" };
  }
  return { level: "empty", label: "待补充", message: "先写一句关系为什么成立，再补一个下一步要验证的问题。" };
}

function relationQualityLabel(level = "") {
  const key = String(level || "").trim().toLowerCase();
  if (key === "strong") return "质量 可复用";
  if (key === "good") return "质量 较清楚";
  if (key === "basic") return "质量 可保存";
  return "质量 待补充";
}

function relationSourceLabel(value = "") {
  const key = String(value || "").trim().toLowerCase();
  if (key === "ai" || key === "ai_suggestion") return "AI";
  if (key === "team") return "团队";
  if (key === "import") return "导入";
  return "自己";
}

function parseInlineRelationAnnotations(body = "") {
  const text = String(body || "");
  const pattern =
    /(?:\$\$widget\d+\s*)?\[\[([^[\]]+)\]\](?:\$\$)?\s*\\?<!--\s*rel:type=([a-z_]+)\s+manager=([a-z_]+)\s+reason=([\s\S]*?)\s*-->/gi;
  const results = [];
  for (const match of text.matchAll(pattern)) {
    results.push({
      raw: String(match[0] || ""),
      token: String(match[1] || "").trim(),
      relationType: String(match[2] || "associated_with").trim().toLowerCase(),
      manager: String(match[3] || "self").trim().toLowerCase(),
      rationale: String(match[4] || "").trim()
    });
  }
  return results;
}

export function relationTypeGuidance(type = "") {
  const key = String(type || "").trim().toLowerCase();
  if (key === "qualifies") {
    return {
      rationalePlaceholder: "这条关系成立，因为当前笔记补充了目标判断的边界、条件或例外。",
      rationaleHint: "写清楚它限制了哪条判断、在什么条件下成立或不成立。",
      questionPlaceholder: "这条限定关系还暴露了什么未验证的条件？",
      questionHint: "把问题写成下一步要验证的边界条件，而不是泛泛的追问。"
    };
  }
  if (key === "counterexample_to") {
    return {
      rationalePlaceholder: "这条关系成立，因为当前笔记提供了目标判断不成立的反例。",
      rationaleHint: "写清楚它反驳的是哪条判断，以及为什么它构成反例。",
      questionPlaceholder: "这个反例逼出了什么新的判断边界？",
      questionHint: "把问题写成下一步要澄清的边界，而不是只停在‘它不对’。"
    };
  }
  if (key === "example_of") {
    return {
      rationalePlaceholder: "这条关系成立，因为当前笔记给出了目标判断的一个具体例子。",
      rationaleHint: "写清楚这个例子具体说明了什么，而不是只说它‘相关’。",
      questionPlaceholder: "这个例子还支持扩展出什么更一般的判断？",
      questionHint: "把问题写成从例子回到更一般判断的下一步。"
    };
  }
  if (key === "same_topic") {
    return {
      rationalePlaceholder: "这条关系成立，因为两条笔记围绕同一个问题或主题张力展开。",
      rationaleHint: "写清楚它们共享的是哪个主题，而不只是标签相同。",
      questionPlaceholder: "这两条笔记共同指向的中心问题是什么？",
      questionHint: "把问题写成主题索引或写作可能继续推进的中心问题。"
    };
  }
  return {
    rationalePlaceholder: "这条关系成立，因为...",
    rationaleHint: "写成一句可检验的判断：当前笔记如何支持、限定或反驳目标；尽量点出证据、边界或张力，避免只写‘相关’。",
    questionPlaceholder: "这条连接提出了什么新问题？",
    questionHint: "把问题写成这条连接接下来最值得验证的疑问，而不是泛泛地追问“然后呢”。"
  };
}

function normalizeRelationTemplateVariants(variants = [], selectedKey = "") {
  const items = Array.isArray(variants)
    ? variants
        .map((variant) => ({
          key: String(variant?.key || "").trim(),
          label: String(variant?.label || "").trim(),
          rationaleDraft: String(variant?.rationaleDraft || "").trim(),
          insightQuestionDraft: String(variant?.insightQuestionDraft || "").trim()
        }))
        .filter((variant) => variant.key && variant.label)
    : [];
  if (!items.length) return { items: [], selectedKey: "" };
  const fallbackKey = items[0].key;
  const cleanSelected = String(selectedKey || "").trim();
  return {
    items,
    selectedKey: items.some((variant) => variant.key === cleanSelected) ? cleanSelected : fallbackKey
  };
}

function renderRelationTemplateVariantSwitcher(variants = [], selectedKey = "", rememberedLabel = "") {
  const normalized = normalizeRelationTemplateVariants(variants, selectedKey);
  if (normalized.items.length < 2) return "";
  const cleanRemembered = String(rememberedLabel || "").trim();
  return `
    <div class="semantic-relation-template-picker" data-relation-template-picker>
      <div class="semantic-relation-template-head">
        <strong>起手模板</strong>
        <small>按当前任务切换句式，再在草稿上继续改。</small>
      </div>
      ${
        cleanRemembered
          ? `<div class="semantic-template-memory" data-template-memory>
              <span>已记住你最近常用的：${escapeHtml(cleanRemembered)}</span>
              <button class="semantic-template-memory-action" type="button" data-template-preference-clear="relation">改回默认</button>
            </div>`
          : ""
      }
      <div class="semantic-relation-template-options">
        ${normalized.items
          .map((variant) => {
            const active = variant.key === normalized.selectedKey;
            return `<button class="semantic-relation-template-btn${active ? " is-active" : ""}" type="button" data-relation-template-variant="${escapeHtml(
              variant.key
            )}" data-rationale-draft="${escapeHtml(variant.rationaleDraft)}" data-insight-question-draft="${escapeHtml(
              variant.insightQuestionDraft
            )}" aria-pressed="${active}">${escapeHtml(variant.label)}</button>`;
          })
          .join("")}
      </div>
      <div class="semantic-template-merge-choice" data-relation-template-merge-choice hidden></div>
    </div>
  `;
}

function normalizeDistillationTemplateVariants(variants = [], selectedKey = "") {
  const items = Array.isArray(variants)
    ? variants
        .map((variant) => ({
          key: String(variant?.key || "").trim(),
          label: String(variant?.label || "").trim(),
          boundaryDraft: String(variant?.boundaryDraft || "").trim()
        }))
        .filter((variant) => variant.key && variant.label)
    : [];
  if (!items.length) return { items: [], selectedKey: "" };
  const fallbackKey = items[0].key;
  const cleanSelected = String(selectedKey || "").trim();
  return {
    items,
    selectedKey: items.some((variant) => variant.key === cleanSelected) ? cleanSelected : fallbackKey
  };
}

function renderDistillationTemplateVariantSwitcher(variants = [], selectedKey = "", rememberedLabel = "") {
  const normalized = normalizeDistillationTemplateVariants(variants, selectedKey);
  if (normalized.items.length < 2) return "";
  const cleanRemembered = String(rememberedLabel || "").trim();
  return `
    <div class="semantic-relation-template-picker" data-distillation-template-picker>
      <div class="semantic-relation-template-head">
        <strong>边界起手模板</strong>
        <small>先选当前视角，再在这段草稿上继续改写。</small>
      </div>
      ${
        cleanRemembered
          ? `<div class="semantic-template-memory" data-template-memory>
              <span>已记住你最近常用的：${escapeHtml(cleanRemembered)}</span>
              <button class="semantic-template-memory-action" type="button" data-template-preference-clear="distillation">改回默认</button>
            </div>`
          : ""
      }
      <div class="semantic-relation-template-options">
        ${normalized.items
          .map((variant) => {
            const active = variant.key === normalized.selectedKey;
            return `<button class="semantic-relation-template-btn${active ? " is-active" : ""}" type="button" data-distillation-template-variant="${escapeHtml(
              variant.key
            )}" data-boundary-draft="${escapeHtml(variant.boundaryDraft)}" aria-pressed="${active}">${escapeHtml(variant.label)}</button>`;
          })
          .join("")}
      </div>
      <div class="semantic-template-merge-choice" data-distillation-template-merge-choice hidden></div>
    </div>
  `;
}

function renderRelationQualityMeter(rationale = "", insightQuestion = "") {
  const quality = relationQualityEvaluation(rationale, insightQuestion);
  return `
    <div class="semantic-relation-quality-meter" data-relation-quality data-quality-level="${escapeHtml(quality.level)}">
      <strong>理由质量：${escapeHtml(quality.label)}</strong>
      <small>${escapeHtml(quality.message)}</small>
    </div>
  `;
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

function normalizedThinkingStatus(value = null) {
  if (!value || typeof value !== "object") return null;
  const label = String(value.label || "").trim();
  const nextAction = String(value.nextAction || "").trim();
  if (!label && !nextAction) return null;
  return {
    status: String(value.status || "").trim(),
    label,
    nextAction,
    targetField: String(value.targetField || "").trim(),
    severity: String(value.severity || "next").trim() || "next"
  };
}

function thinkingStatusTone(thinkingStatus = null) {
  const severity = String(thinkingStatus?.severity || "").trim().toLowerCase();
  if (severity === "ready") return "ready";
  if (String(thinkingStatus?.status || "").startsWith("ready_")) return "ready";
  return "next";
}

export class EditorPane {
  constructor({ state, elements, onStatus, onStateChange, onOpenNote, onChromeChange, resolveNoteWritingContinuation, selectPermanentDirectory }) {
    this.state = state;
    this.els = elements;
    this.onStatus = onStatus;
    this.onStateChange = onStateChange;
    this.onOpenNote = onOpenNote;
    this.onOpenExternalUrl = typeof elements?.openExternalUrl === "function" ? elements.openExternalUrl : null;
    this.onChromeChange = typeof onChromeChange === "function" ? onChromeChange : () => {};
    this.resolveNoteWritingContinuation =
      typeof resolveNoteWritingContinuation === "function" ? resolveNoteWritingContinuation : null;
    this.selectPermanentDirectory = typeof selectPermanentDirectory === "function" ? selectPermanentDirectory : null;
    this.currentLinkCandidates = [];
    this.currentLinkIndex = 0;
    this.currentPinnedLinkId = "";
    this.currentLinkContext = null;
    this.manualLinkReturnSelection = null;
    this.manualLinkReturnScrollState = null;
    this.isSubmittingLinkInsert = false;
    this.currentTagCandidates = [];
    this.currentTagIndex = 0;
    this.currentTagContext = null;
    this.richEditor = null;
    this.markdownEditor = null;
    this.lastInlinePickerAnchor = 0;
    this.lastEditorValue = "";
    this.lastLinkTriggerAt = 0;
    this.lastPlainEnterAt = 0;
    this.lastTagTriggerAt = 0;
    this.suppressEditorChange = false;
    this.suppressRichEditorChange = false;
    this.suppressSourceEditorChange = false;
    this.suppressLiteratureWorkspaceChange = false;
    this.savingPromise = null;
    this.autoSaveTimer = null;
    this.wasEditingTitleLine = false;
    this.lastTitleBlurSaveAt = 0;
    this.lastTitleInputAt = 0;
    this.saveUiState = { mode: "idle", message: "" };
    this.relationsRequestSerial = 0;
    this.currentSemanticRelations = null;
    this.semanticRelationsState = "idle";
    this.relationPanelState = {
      noteId: "",
      mode: "list",
      relationId: "",
      targetNoteId: "",
      relationType: "",
      entryHint: "",
      rationaleDraft: "",
      insightQuestionDraft: "",
      draftVariants: [],
      selectedTemplateVariant: "",
      rememberedTemplateVariantLabel: ""
    };
    this.relationTargetSearchSerial = 0;
    this.relationTargetSearchTimer = null;
    this.noteAiAnalysisByNoteId = new Map();
    this.noteAiSuggestionsState = {
      noteId: "",
      loading: false,
      error: "",
      items: [],
      actionLoading: false,
      actionSuggestionId: "",
      actionError: "",
      actionNotice: "",
      actionNoticeTone: "muted"
    };
    this.noteAiSuggestionsRequestSerial = 0;
    this.distillationPrefillState = {
      noteId: "",
      boundaryDraft: "",
      draftVariants: [],
      selectedTemplateVariant: "",
      rememberedTemplateVariantLabel: ""
    };
    this.markdownSelectionOverride = null;
    this.pendingEditorFocus = null;
    this.pendingEditorSelection = null;
    this.bind();
    this.renderPreviewVisibility();
    this.initRichEditor();
    this.initMarkdownEditor();
  }

  async autoSaveTabById(tabId, trigger = "idle") {
    const tab = this.state.tabs.find((t) => t.id === tabId) || null;
    if (!tab?.dirty) return true;
    if (this.savingPromise) return false;
    const note = this.state.notes.find((n) => n.id === tab.noteId) || null;
    if (!note) return false;

    const bodySnapshot = String(tab.body || "");
    const titleSnapshot = titleFromBody(bodySnapshot);
    const statusSnapshot = String(note.status || "draft").trim() || "draft";

    this.clearAutoSaveTimer();
    this.setSaveUiState("saving", "当前文件：正在自动同步...");

    this.savingPromise = (async () => {
      note.body = bodySnapshot;
      note.title = titleSnapshot;
      note.noteType = typeFromFolder(this.state, note.folderId);
      note.tags = parseTags(note.body);
      note.links = parseLinks(note.body);
      note.updatedAt = new Date().toISOString();

      tab.title = titleSnapshot;

      const saved = await this.onStateChange("save-note", {
        noteId: note.id,
        status: statusSnapshot,
        originalityStatus: note.originalityStatus,
        originalitySimilarity: note.originalitySimilarity,
        authorshipConfirmed: true,
        authorshipClaim: "",
        trigger
      });

      if (saved === false || (saved && typeof saved === "object" && saved.ok === false)) {
        tab.dirty = true;
        this.writeDraft(tab);
        this.setSaveUiState(
          String(saved?.saveMode || "error").trim() || "error",
          String(saved?.saveMessage || "当前文件：同步失败，修改仍保留在编辑器中。")
        );
        return false;
      }

      tab.savedBody = tab.body;
      tab.savedTitle = tab.title;
      this.syncPlaceholderTitleArmed(tab);
      tab.dirty = false;
      this.clearDraft(tab.noteId);
      this.setSaveUiState("saved", "当前文件：已自动同步");
      return true;
    })();

    try {
      return await this.savingPromise;
    } finally {
      this.savingPromise = null;
      if (this.activeTab()?.dirty) this.scheduleAutoSave();
    }
  }

  activeTab() {
    return this.state.tabs.find((t) => t.id === this.state.activeTabId) || null;
  }

  activeNote() {
    const t = this.activeTab();
    if (!t) return null;
    return this.state.notes.find((n) => n.id === t.noteId) || null;
  }

  resolvedNoteType(note = this.activeNote()) {
    const explicitType = String(note?.noteType || "").trim().toLowerCase();
    const safeState = this.state && Array.isArray(this.state.folders) ? this.state : { folders: [] };
    const folderType = note?.folderId ? String(typeFromFolder(safeState, note.folderId) || "").trim().toLowerCase() : "";
    const rootId = note?.folderId ? String(rootBoxIdFromFolder(safeState, note.folderId) || "").trim() : "";
    if (rootId === "dir_original_default" || rootId === "dir_fleeting_default" || rootId === "dir_literature_default") {
      if (folderType) return folderType;
      if (explicitType) return explicitType;
      return "";
    }
    if (explicitType) return explicitType;
    if (folderType) return folderType;
    return "";
  }

  isLiteratureNote(note = this.activeNote()) {
    return this.resolvedNoteType(note) === "literature";
  }

  isOriginalNote(note = this.activeNote()) {
    const noteType = this.resolvedNoteType(note);
    return noteType === "original" || noteType === "permanent";
  }

  isOriginalRecordableSource(note = this.activeNote()) {
    const noteType = this.resolvedNoteType(note);
    return noteType === "fleeting" || noteType === "literature";
  }

  sourceNotePromotionHint(note = this.activeNote()) {
    const noteType = this.resolvedNoteType(note);
    if (noteType === "literature") {
      return "先选一个永久笔记盒目录，再把这条文献笔记整理成一条可以独立阅读的判断。";
    }
    if (noteType === "fleeting") {
      return "先选一个永久笔记盒目录，再把这条随笔写成一条自己愿意长期保留的判断。";
    }
    return "先选一个永久笔记盒目录，再继续创建永久笔记。";
  }

  async pickPermanentDirectoryForNote(note = this.activeNote()) {
    if (!note || !this.isOriginalRecordableSource(note)) return "";
    if (!this.selectPermanentDirectory) {
      this.onStatus("当前环境还没有接入永久笔记目录选择器", "warn");
      return "";
    }
    return this.selectPermanentDirectory({
      sourceNoteId: note.id,
      sourceType: this.resolvedNoteType(note),
      sourceTitle: note.title || "",
      sourceHint: this.sourceNotePromotionHint(note)
    });
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
      supportsJudgment: this.els.literatureSupportsJudgment?.value || "",
      question: this.els.literatureQuestion?.value || "",
      boundary: this.els.literatureBoundary?.value || ""
    };
  }

  literatureCompletionState(note = this.activeNote()) {
    const fields = this.isLiteratureWorkspaceActive(note) ? this.literatureFieldsFromInputs() : parseLiteratureWorkspace(note?.body || "");
    const hasParaphrase = Boolean(normalizeFieldText(fields.paraphrase));
    const hasOriginalText = Boolean(normalizeFieldText(fields.originalText));
    const hasJudgmentSeed = Boolean(normalizeFieldText(fields.supportsJudgment));
    const hasQuestion = Boolean(normalizeFieldText(fields.question));
    const readyForOriginal = hasOriginalText && hasParaphrase && (hasJudgmentSeed || hasQuestion);
    const generatedOriginal = this.hasGeneratedOriginal(note);
    const citation = literatureCitationState(fields.citation);
    const ready = hasOriginalText && hasParaphrase && citation.complete;
    const status = ready && String(note?.status || "").trim() === "active" ? "active" : "draft";
    const missingCitationText = citation.missingLabels.length ? `缺少引用信息：${citation.missingLabels.join("、")}` : "";
    let label = "待转述";
    let tone = "draft";
    let hint = "先写出你自己的转述，再提炼它可能长出的原创判断。";
    if (generatedOriginal) {
      label = "已转永久笔记";
      tone = "active";
      hint = "这条文献已经作为证据长出永久笔记，可以回到永久笔记继续建立关联。";
    } else if (!citation.complete || !hasOriginalText) {
      label = "待补来源";
      tone = "draft";
      hint = missingCitationText || "先补齐来源信息和原文摘录，避免材料脱离证据链。";
    } else if (!hasParaphrase) {
      label = "待转述";
      tone = "draft";
      hint = "先用自己的话说明这段材料真正表达了什么。";
    } else if (!readyForOriginal) {
      label = "待提炼判断";
      tone = "refine";
      hint = "已经有转述，下一步写出判断种子或追问，让材料能进入永久笔记。";
    } else {
      label = "可转永久笔记";
      tone = "active";
      hint = "这条材料已经具备转为永久笔记的条件。";
    }
    return {
      status,
      hasParaphrase,
      hasOriginalText,
      hasJudgmentSeed,
      hasQuestion,
      readyForOriginal,
      hasCitationMetadata: citation.complete,
      missingCitationFields: citation.missingLabels,
      label,
      tone,
      hint
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
    const citation = literatureCitationState(fields.citation);
    const hasOriginalText = Boolean(normalizeFieldText(fields.originalText));
    const hasWhyKeep = Boolean(normalizeFieldText(fields.whyKeep));
    const hasSupportsJudgment = Boolean(normalizeFieldText(fields.supportsJudgment));
    const hasQuestion = Boolean(normalizeFieldText(fields.question));
    const hasGenerated = this.hasGeneratedOriginal(note);
    let lane = "ready";
    let label = "可转永久笔记";
    let tone = "active";
    let noteText = "转述和判断种子已经具备，可以继续转为永久笔记。";
    if (hasGenerated) {
      lane = "ready";
      label = "已转永久笔记";
      tone = "active";
      noteText = "这条文献已经长出永久笔记，现在作为证据保留。";
    } else if (!citation.complete || !hasOriginalText) {
      lane = "refine";
      label = "待补来源";
      tone = "draft";
      noteText = "先补齐来源信息和原文摘录，后续永久笔记才能保留证据链。";
    } else if (!hasParaphrase) {
      lane = "pending";
      label = "待转述";
      tone = "draft";
      noteText = "先把原文改写成你自己的判断表达，再决定它是否值得留下。";
    } else if (!hasSupportsJudgment && !hasQuestion) {
      lane = "refine";
      label = "待提炼判断";
      tone = "refine";
      noteText = "已经有转述，下一步写出判断种子或追问，让它能转为永久笔记。";
    } else if (!hasWhyKeep) {
      noteText = "已经可转永久笔记；补一句保留原因能帮助以后判断这条证据为什么重要。";
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
          this.resolvedNoteType(item) === "literature" &&
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
      ? `当前范围：${scopeFolder?.name || "当前目录"}。当前只显示${focusLabel || "本次导入"}的 ${focusCount} 条文献笔记；已完成转述 ${paraphraseDoneCount}/${focusCount}，已可转永久笔记 ${readyCount}/${focusCount}，剩余待处理 ${remainingCount} 条。`
      : `当前范围：${scopeFolder?.name || "当前目录"}。先清空待转述，再补齐待提炼，最后再把成熟材料送去永久笔记。`;
    summary.innerHTML = `
      <div class="literature-queue-metric"><strong>${pendingCount}</strong><span>待转述</span></div>
      <div class="literature-queue-metric"><strong>${refineCount}</strong><span>待提炼</span></div>
      <div class="literature-queue-metric"><strong>${readyCount}</strong><span>可转永久笔记</span></div>
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
                        ? `<span class="item-badge">已生成永久笔记</span>`
                        : item.lane === "ready"
                          ? `<button class="mini-btn primary create-original-cta" type="button" data-create-original-from-literature="${escapeHtml(item.note.id)}">选择目录并创建</button>`
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
    this.lastEditorValue = text;
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
      if (this.els.literatureQuestion) this.els.literatureQuestion.value = parsed.question || "";
      if (this.els.literatureBoundary) this.els.literatureBoundary.value = parsed.boundary || "";
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

  editorScrollNodes() {
    if (this.isLiteratureWorkspaceActive()) {
      return [this.els.literatureParaphrase || this.els.literatureOriginal || this.els.literatureTitle].filter(Boolean);
    }
    if (this.isSourceMode()) {
      return [this.markdownEditor?.view?.scrollDOM, this.els.editorHost, this.els.body].filter(Boolean);
    }
    return [
      this.els.wysiwygHost?.querySelector?.(".toastui-editor-main"),
      this.els.wysiwygHost?.querySelector?.(".toastui-editor-ww-container"),
      this.els.wysiwygHost
    ].filter(Boolean);
  }

  captureEditorScrollState() {
    return {
      mode: this.isSourceMode() ? "source" : this.isLiteratureWorkspaceActive() ? "literature" : "wysiwyg",
      nodes: this.editorScrollNodes().map((node, index) => ({
        index,
        top: Number(node?.scrollTop || 0),
        left: Number(node?.scrollLeft || 0)
      }))
    };
  }

  restoreEditorScrollState(state) {
    if (!state || !Array.isArray(state.nodes)) return false;
    const nodes = this.editorScrollNodes();
    let restored = false;
    for (const snapshot of state.nodes) {
      const node = nodes[snapshot.index];
      if (!node) continue;
      if (typeof snapshot.top === "number") node.scrollTop = snapshot.top;
      if (typeof snapshot.left === "number") node.scrollLeft = snapshot.left;
      restored = true;
    }
    return restored;
  }

  scheduleEditorScrollRestore(state) {
    if (!state) return;
    const restore = () => {
      this.restoreEditorScrollState(state);
      if (typeof window !== "undefined" && typeof window.setTimeout === "function") {
        window.setTimeout(() => this.restoreEditorScrollState(state), 32);
        window.setTimeout(() => this.restoreEditorScrollState(state), 96);
      }
    };
    if (typeof window !== "undefined" && typeof window.requestAnimationFrame === "function") {
      window.requestAnimationFrame(restore);
      return;
    }
    restore();
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

  templatePreferenceKey(kind = "") {
    const cleanKind = String(kind || "").trim().toLowerCase();
    return `yansilu:template-variant:${cleanKind || "default"}`;
  }

  readTemplateVariantPreference(kind = "", variants = [], fallback = "") {
    const normalized =
      kind === "distillation"
        ? normalizeDistillationTemplateVariants(variants, fallback)
        : normalizeRelationTemplateVariants(variants, fallback);
    if (!normalized.items.length) return "";
    const rawFallback = String(fallback || "").trim();
    try {
      const stored = String(window.localStorage?.getItem(this.templatePreferenceKey(kind)) || "").trim();
      if (stored && normalized.items.some((variant) => variant.key === stored)) return stored;
    } catch {}
    return normalized.items.some((variant) => variant.key === rawFallback) ? rawFallback : normalized.selectedKey;
  }

  writeTemplateVariantPreference(kind = "", key = "") {
    const cleanKind = String(kind || "").trim().toLowerCase();
    const cleanKey = String(key || "").trim();
    if (!cleanKind || !cleanKey) return;
    try {
      window.localStorage?.setItem(this.templatePreferenceKey(cleanKind), cleanKey);
    } catch {}
  }

  clearTemplateVariantPreference(kind = "") {
    const cleanKind = String(kind || "").trim().toLowerCase();
    if (!cleanKind) return;
    try {
      window.localStorage?.removeItem(this.templatePreferenceKey(cleanKind));
    } catch {}
  }

  templateVariantPreferenceMeta(kind = "", variants = []) {
    const cleanKind = String(kind || "").trim().toLowerCase();
    const items =
      cleanKind === "distillation"
        ? normalizeDistillationTemplateVariants(variants, "").items
        : normalizeRelationTemplateVariants(variants, "").items;
    if (!items.length) return { key: "", label: "" };
    try {
      const stored = String(window.localStorage?.getItem(this.templatePreferenceKey(cleanKind)) || "").trim();
      if (!stored) return { key: "", label: "" };
      const matched = items.find((variant) => variant.key === stored);
      return matched ? { key: matched.key, label: matched.label } : { key: "", label: "" };
    } catch {
      return { key: "", label: "" };
    }
  }

  applyTemplatePreferenceClear(kind = "", button = null) {
    const cleanKind = String(kind || "").trim().toLowerCase();
    if (!cleanKind) return;
    this.clearTemplateVariantPreference(cleanKind);
    const memory = button?.closest?.("[data-template-memory]");
    if (memory) memory.remove();
    if (cleanKind === "relation" && this.relationPanelState) {
      this.relationPanelState.rememberedTemplateVariantLabel = "";
    }
    if (cleanKind === "distillation" && this.distillationPrefillState) {
      this.distillationPrefillState.rememberedTemplateVariantLabel = "";
    }
    this.onStatus(`已清除${cleanKind === "distillation" ? "边界模板" : "关系模板"}偏好，下次会按任务默认视角打开`, "ok");
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
    clearInterval(this.autoSaveTimer);
    this.autoSaveTimer = null;
  }

  scheduleAutoSave() {
    this.clearAutoSaveTimer();
    const tab = this.activeTab();
    if (!tab?.dirty) return;
    const kickoff = () => {
      if (!this.activeTab()?.dirty) return;
      void this.autoSaveActiveNote("interval");
    };
    this.autoSaveTimer = setInterval(kickoff, AUTO_SAVE_INTERVAL_MS);
    setTimeout(kickoff, AUTO_SAVE_IDLE_MS);
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
    this.syncPlaceholderTitleArmed(tab);
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
    this.closeTransientPanels({ closeInspector: true });
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
        placeholderTitleArmed: noteUsesPlaceholderTitle(titleFromBody(n.body))
      };
      this.state.tabs.push(t);
      this.maybeRestoreDraft(t, n);
      this.syncPlaceholderTitleArmed(t);
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
    const newNoteLabel = this.currentNewNoteLabel();
    const tabsHtml = this.state.tabs
      .map((t) => {
        const note = this.state.notes.find((n) => n.id === t.noteId);
        const noteType = this.resolvedNoteType(note) || typeFromFolder(this.state, note?.folderId || "");
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
              const noteType = this.resolvedNoteType(note) || typeFromFolder(this.state, note?.folderId || "");
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
      : "";

    this.els.tabs.innerHTML = `
      <div class="tabs-shell">
        <div class="tabs-list">${tabsHtml || `<div class="tab active welcome-tab" data-tab="welcome"><span class="tab-title">${newNoteLabel}</span></div>`}</div>
        <div class="tabs-actions">
          <button class="tab-act" data-tabs-action="new" title="${newNoteLabel}" aria-label="${newNoteLabel}">+</button>
        </div>
      </div>
      <div class="tab-menu hidden" data-tab-menu>
        <button class="tab-menu-item" data-tabs-action="close-all">全部关闭</button>
        <div class="tab-menu-sep"></div>
        ${menuItems}
      </div>
    `;
    this.renderEmptyEditorState();
    this.onChromeChange();
  }

  currentNewNoteLabel() {
    const type = typeFromFolder(this.state, this.state.selectedFolderId || this.state.browserRootId || "");
    if (type === "literature") return "新建文摘笔记";
    if (type === "fleeting") return "新建随笔";
    return "新建永久笔记";
  }

  renderEmptyEditorState() {
    const empty = !this.activeTab();
    const panel = this.els.markdownSplit?.closest?.(".md-panel");
    panel?.classList.toggle("editor-empty", empty);
    this.els.emptyStart?.classList.add("hidden");
  }

  requestCreateNoteFromEmptyState() {
    if (this.activeTab() || this.creatingEmptyNote) return false;
    this.creatingEmptyNote = true;
    Promise.resolve(this.onStateChange("create-note-in-selected-folder")).finally(() => {
      this.creatingEmptyNote = false;
    });
    return true;
  }

  fillEditorFromTab() {
    const t = this.activeTab();
    if (!t) {
      this.setEditorValue("");
      this.renderEmptyEditorState();
      this.els.result.innerHTML = "";
      this.setInspectorVisible(false);
      this.renderLiteratureWorkspace();
      this.renderPreview();
      this.renderPreviewVisibility();
      this.renderSaveHint();
      return;
    }
    this.ensureTabAuthorshipState(t, this.activeNote());
    this.renderEmptyEditorState();
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
    this.syncPlaceholderTitleArmed(t);
    this.syncTabDirtyState(t);
    return t;
  }

  syncPlaceholderTitleArmed(tab) {
    if (!tab) return false;
    tab.placeholderTitleArmed = !this.isLiteratureWorkspaceActive() && noteUsesPlaceholderTitle(tab.title || titleFromBody(tab.body));
    return tab.placeholderTitleArmed;
  }

  syncTabDirtyState(tab) {
    if (!tab) return;
    const savedBody = normalizedBodyTextForDirtyCheck(tab.savedBody);
    const currentBody = normalizedBodyTextForDirtyCheck(tab.body);
    const savedTitle = normalizedNoteTitleText(tab.savedTitle);
    const currentTitle = normalizedNoteTitleText(tab.title);
    tab.dirty = savedBody !== currentBody || savedTitle !== currentTitle;
  }

  renderSaveHint() {
    this.renderThinkingStatus();
    const tab = this.activeTab();
    if (!tab) {
      if (this.els.statusHint) this.els.statusHint.textContent = "";
      this.renderSaveButton();
      this.renderCompleteButton();
      this.renderRecordPermanentButton();
      this.renderRelationToolbarButtons();
      this.renderAuthorshipPanel();
      return;
    }
    const note = this.activeNote();
    const saveUiState = this.activeSaveUiState();
    if (this.isOriginalNote(note)) {
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
    this.renderRecordPermanentButton();
    this.renderRelationToolbarButtons();
    this.renderLiteratureWorkspace();
    this.renderAuthorshipPanel();
  }

  renderThinkingStatus() {
    const el = this.els.editorThinkingStatus;
    if (!el) return;
    const thinkingStatus = normalizedThinkingStatus(this.activeNote()?.thinkingStatus);
    if (!thinkingStatus) {
      el.classList.add("hidden");
      el.innerHTML = "";
      el.dataset.tone = "";
      return;
    }
    el.classList.remove("hidden");
    el.dataset.tone = thinkingStatusTone(thinkingStatus);
    const title = thinkingStatus.nextAction
      ? `${thinkingStatus.label}：${thinkingStatus.nextAction}`
      : thinkingStatus.label;
    el.innerHTML = `
      <span class="thinking-status-chip" title="${escapeHtml(title)}">${escapeHtml(thinkingStatus.label)}</span>
      ${thinkingStatus.nextAction ? `<span class="thinking-status-next">${escapeHtml(thinkingStatus.nextAction)}</span>` : ""}
    `;
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

  renderRecordPermanentButton() {
    const button = this.els.recordPermanent;
    if (!button) return;
    const note = this.activeNote();
    const visible = Boolean(note && this.isOriginalRecordableSource(note) && !this.hasGeneratedOriginal(note));
    button.classList.toggle("hidden", !visible);
    button.disabled = !visible;
    button.dataset.sourceNoteId = visible ? note.id : "";
    button.title = visible ? "先选目录，再创建永久笔记" : "当前笔记不需要创建永久笔记";
    button.dataset.tip = visible ? "先选目录，再创建永久笔记" : "当前笔记不需要创建永久笔记";
    button.setAttribute("aria-label", visible ? "先选目录，再创建永久笔记" : "当前笔记不需要创建永久笔记");
  }

  renderRelationToolbarButtons() {
    const note = this.activeNote();
    const visible = Boolean(note && this.isOriginalNote(note));

    if (this.els.insertLink) {
      this.els.insertLink.classList.toggle("hidden", !visible);
      this.els.insertLink.disabled = !visible;
      this.els.insertLink.title = visible ? "关联笔记 [[" : "只有永久笔记才能关联其他笔记";
      this.els.insertLink.dataset.tip = visible ? "关联笔记 [[" : "只有永久笔记才能关联其他笔记";
      this.els.insertLink.setAttribute("aria-label", visible ? "关联笔记" : "只有永久笔记才能关联其他笔记");
    }

    if (this.els.showRelated) {
      this.els.showRelated.classList.toggle("hidden", !visible);
      this.els.showRelated.disabled = !visible;
    }

    if (!visible && this.state.inspectorVisible) {
      this.setInspectorVisible(false);
    }
  }

  renderSourceNoteFlowSection(note) {
    const noteType = this.resolvedNoteType(note);
    if (!note?.id || (noteType !== "fleeting" && noteType !== "literature")) return "";

    const generatedOriginalId = this.generatedOriginalNoteId(note);
    const generatedOriginal = generatedOriginalId
      ? this.state.notes.find((item) => item?.id === generatedOriginalId) || null
      : null;
    const hasGenerated = Boolean(generatedOriginalId);

    let statusLabel = hasGenerated ? "已转为永久笔记" : "待转永久";
    let hint = "先把这条材料沉淀成永久笔记，再继续扩展关联和写作。";
    let detail = "这里只保留下一步最需要做的动作。";
    let actionLabel = "选择目录并创建";

    if (noteType === "literature") {
      const completion = this.literatureCompletionState(note);
      statusLabel = hasGenerated ? "已转为永久笔记" : "文献待转";
      hint = hasGenerated
        ? "这条文献笔记已经对应到一条永久笔记，接下来去那条判断继续完善会更顺。"
        : completion.hint;
      detail = hasGenerated
        ? "文献笔记继续保留出处和转述，不需要在这里重复处理。"
        : "先选永久笔记盒目录，再把这条材料写成一条可以独立阅读的判断。";
    } else {
      hint = hasGenerated
        ? "这条随笔已经对应到一条永久笔记，接下来去那条判断继续完善会更顺。"
        : "随笔只负责抓住线索；当它值得保留时，再沉淀成永久笔记。";
      statusLabel = hasGenerated ? "已转为永久笔记" : "随笔待转";
      detail = hasGenerated
        ? "这条随笔会继续保留原始线索，不需要在这里重复整理。"
        : "先选永久笔记盒目录，再把这条想法写成一条自己愿意长期保留的判断。";
    }

    return `
      <section class="inspector-section semantic-relations-section" data-source-note-flow-section data-note-id="${escapeHtml(note.id)}">
        <div class="inspector-section-head">
          <div>
            <div class="inspector-section-title">创建永久笔记</div>
            <div class="inspector-section-note">${escapeHtml(hint)}</div>
          </div>
          <span class="inspector-chip">${escapeHtml(statusLabel)}</span>
        </div>
        <div class="related-empty">${escapeHtml(detail)}</div>
        <div class="semantic-relation-status">
          <span class="inspector-chip">${escapeHtml(noteTypeText(noteType))}</span>
          ${
            generatedOriginal?.title
              ? `<span class="inspector-chip">已生成：${escapeHtml(generatedOriginal.title)}</span>`
              : ""
          }
        </div>
        ${
          hasGenerated
            ? ""
            : `
              <div class="semantic-relation-card-actions">
                <button class="mini-btn primary create-original-cta" type="button" data-source-note-action="record-permanent">${escapeHtml(actionLabel)}</button>
              </div>
            `
        }
      </section>
    `;
  }

  renderLiteratureWorkspace() {
    this.els.literatureWorkspace?.classList.add("hidden");
    this.els.markdownSplit?.classList.remove("hidden");
    this.els.modeEdit?.classList.remove("hidden");
    this.els.modeSplit?.classList.add("hidden");
    if (!this.isOriginalNote(this.activeNote())) this.hideOriginalityNotice();
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

  closeTransientPanels({ closeInspector = false } = {}) {
    this.closeLinkPicker();
    this.closeTagPicker();
    this.closeAssetPreview();
    this.hideOriginalityNotice();
    if (closeInspector) this.setInspectorVisible(false);
  }

  closeAssetPreview() {
    this.els.assetPreviewMask?.classList.add("hidden");
    if (this.els.assetPreviewBody) this.els.assetPreviewBody.innerHTML = "";
    if (this.els.assetPreviewTitle) this.els.assetPreviewTitle.textContent = "附件预览";
    if (this.els.assetPreviewOpenLink) this.els.assetPreviewOpenLink.href = "#";
  }

  closeTokenPreview() {
    this.els.tokenPreviewMask?.classList.add("hidden");
    if (this.els.tokenPreviewBody) this.els.tokenPreviewBody.innerHTML = "";
    if (this.els.tokenPreviewTitle) this.els.tokenPreviewTitle.textContent = "内容预览";
  }

  openTokenPreview(title = "内容预览", html = "") {
    if (!this.els.tokenPreviewMask || !this.els.tokenPreviewBody || !this.els.tokenPreviewTitle) return;
    this.els.tokenPreviewTitle.textContent = String(title || "内容预览").trim() || "内容预览";
    this.els.tokenPreviewBody.innerHTML = html || `<div class="related-empty">没有可显示的内容。</div>`;
    this.els.tokenPreviewMask.classList.remove("hidden");
  }

  async ensurePreviewNoteLoaded(note) {
    if (!note?.id || (note.bodyLoaded && note.body)) return note;
    try {
      const full = await fetchNote(note.id);
      if (full) {
        note.title = full.title || note.title;
        note.body = typeof full.body === "string" ? full.body : note.body;
        note.markdownPath = full.markdownPath || note.markdownPath;
        note.folderId = full.directoryId || note.folderId;
        note.noteType = full.noteType || note.noteType;
        note.updatedAt = full.updatedAt || note.updatedAt;
        note.tags = parseTags(note.body || "");
        note.links = parseLinks(note.body || "");
        note.bodyLoaded = true;
      }
    } catch (error) {
      this.onStatus(`预览笔记加载失败：${String(error?.message || error)}`, "warn");
    }
    return note;
  }

  renderTokenNotePreview(note, badgeText = "关联笔记") {
    const body = note?.body || `# ${note?.title || "未命名笔记"}\n`;
    const preview = renderMarkdownPreview(body, { noteMarkdownPath: note?.markdownPath || "" });
    return `
      <div class="token-preview-note">
        <div class="token-preview-meta">
          <span>${escapeHtml(badgeText)}</span>
          <span>${escapeHtml(noteTypeText(this.resolvedNoteType(note) || typeFromFolder(this.state, note?.folderId || "")))}</span>
          <span>${escapeHtml(this.folderLabel(note?.folderId || ""))}</span>
        </div>
        <div class="markdown-preview token-preview-markdown">${preview}</div>
      </div>
    `;
  }

  renderTokenResultList(list = [], emptyText = "没有结果。") {
    const items = Array.isArray(list) ? list : [];
    if (!items.length) return `<div class="related-empty">${escapeHtml(emptyText)}</div>`;
    return `
      <div class="token-preview-list">
        ${items
          .map(
            (n) => `
              <article class="token-preview-item">
                <div class="token-preview-item-title">${escapeHtml(n.title || "未命名笔记")}</div>
                <div class="token-preview-item-meta">${escapeHtml(noteTypeText(n.noteType || typeFromFolder(this.state, n.folderId || "")))} · ${escapeHtml(this.folderLabel(n.folderId || ""))}</div>
                ${
                  excerptFromBody(n.body || "", n.title || "")
                    ? `<div class="token-preview-item-body">${escapeHtml(excerptFromBody(n.body || "", n.title || ""))}</div>`
                    : ""
                }
              </article>
            `
          )
          .join("")}
      </div>
    `;
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
    } else if (isPreviewPdfUrl(cleanUrl) || isPreviewDocumentUrl(cleanUrl)) {
      this.els.assetPreviewBody.innerHTML = `<iframe class="asset-preview-frame" src="${escapeHtml(cleanUrl)}" title="${escapeHtml(previewLabel)}"></iframe>`;
    } else {
      this.els.assetPreviewBody.innerHTML = `
        <div class="asset-preview-empty">
          <div><strong>${escapeHtml(previewLabel)}</strong></div>
          <div>这类附件不支持站内预览。请用浏览器打开后查看。</div>
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

  installToolbarCommandMenu() {
    const btn = this.els.toolbarCommandBtn;
    const menu = this.els.toolbarCommandMenu;
    const input = this.els.toolbarCommandSearchInput;
    const list = this.els.toolbarCommandList;
    if (!btn || !menu || !input || !list) return;

    const closeMenu = () => {
      menu.classList.add("hidden");
      btn.setAttribute("aria-expanded", "false");
    };

    const openMenu = () => {
      menu.classList.remove("hidden");
      btn.setAttribute("aria-expanded", "true");
      input.value = "";
      this.filterToolbarCommandMenu("");
    };

    btn.addEventListener("click", (e) => {
      e.preventDefault();
      if (menu.classList.contains("hidden")) openMenu();
      else closeMenu();
    });

    document.addEventListener("click", (e) => {
      if (menu.classList.contains("hidden")) return;
      if (e.target.closest("#toolbarCommandMenu")) return;
      if (e.target.closest("#btnToolbarCommandSearch")) return;
      closeMenu();
    });

    document.addEventListener("keydown", (e) => {
      if (menu.classList.contains("hidden")) return;
      if (e.key === "Escape") {
        closeMenu();
        btn.focus();
      }
    });

    input.addEventListener("input", () => {
      this.filterToolbarCommandMenu(input.value);
    });

    input.addEventListener("keydown", (e) => {
      if (e.isComposing || e.keyCode === 229) return;
      if (e.key === "Escape") {
        closeMenu();
        btn.focus();
      }
    });

    list.addEventListener("click", (e) => {
      const button = e.target.closest("[data-toolbar-command]");
      const command = String(button?.dataset.toolbarCommand || "").trim();
      if (!command) return;
      closeMenu();
      this.runToolbarCommand(command);
      this.renderContextualToolbarState();
      this.focusEditor();
    });
  }

  filterToolbarCommandMenu(query = "") {
    const list = this.els.toolbarCommandList;
    if (!list) return;
    const q = String(query || "").trim().toLowerCase();
    list.querySelectorAll("[data-toolbar-command]").forEach((button) => {
      const label = String(button.textContent || "").trim().toLowerCase();
      const key = String(button.dataset.toolbarCommand || "").trim().toLowerCase();
      const hit = !q || label.includes(q) || key.includes(q);
      button.classList.toggle("hidden", !hit);
    });
  }

  runToolbarCommand(command = "") {
    const cmd = String(command || "").trim();
    if (!cmd) return;
    if (cmd === "quote") this.formatCurrentBlock("quote");
    if (cmd === "checklist") this.formatCurrentBlock("checklist");
    if (cmd === "code") this.formatCurrentBlock("code");
    if (cmd === "table") this.formatCurrentBlock("table");
    if (cmd === "hr") this.formatCurrentBlock("hr");
    if (cmd === "table-row") this.addTableRow();
    if (cmd === "table-column") this.addTableColumn();
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
      const normalizedPendingSelection = this.normalizedSelectionRangeForValue(content, pendingSelection);
      this.setEditorValue(content);
      if (!this.isLiteratureWorkspaceActive()) {
        if (this.isSourceMode()) this.clearMarkdownSelectionOverride();
        else if (normalizedPendingSelection) this.setMarkdownSelectionOverride(normalizedPendingSelection.from, normalizedPendingSelection.to);
        if (this.isSourceMode()) this.markdownEditor.focus();
        else this.richEditor.focus();
        if (normalizedPendingSelection) {
          this.setEditorSelectionRange(normalizedPendingSelection.from, normalizedPendingSelection.to);
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
    if (this.els.headingLevel) {
      const value = Number(active.headingLevel || 0);
      this.els.headingLevel.value = value ? String(value) : this.activeTab() ? "p" : "";
    }
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
    this.pendingEditorSelection = this.isLiteratureWorkspaceActive()
      ? null
      : this.normalizedSelectionRangeForValue(latestValue, this.editorSelection());
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
          if (this.extractRichMissingAssetFromEvent(event)) {
            event.preventDefault();
            return;
          }
          if (this.extractRichExternalLinkFromEvent(event)) {
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
          const missingAsset = this.extractRichMissingAssetFromEvent(event);
          if (missingAsset?.path) {
            event.preventDefault();
            event.stopPropagation();
            this.onStatus(`附件路径不可预览：${missingAsset.path}`, "warn");
            return;
          }
          const externalLink = this.extractRichExternalLinkFromEvent(event);
          if (externalLink?.url) {
            event.preventDefault();
            event.stopPropagation();
            void this.openExternalUrl(externalLink.url);
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

  extractRichMissingAssetFromEvent(event) {
    const target = event?.target?.closest?.("[data-preview-missing-asset]");
    const path = String(target?.dataset?.previewMissingAsset || "").trim();
    return path ? { path } : null;
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
      if (!resolved.isVaultAsset) {
        if (!isExternalLinkUrl(rawPath)) {
          node.dataset.previewMissingAsset = rawPath;
          node.setAttribute("href", "#");
          node.setAttribute("role", "button");
          node.classList.add("wysiwyg-inline-attachment", "wysiwyg-inline-asset");
        }
        return;
      }
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
          if (!this.isSourceMode() && this.richEditor && this.richEditor.getValue() !== value) {
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

  normalizedSelectionRange(range) {
    if (!range || !Number.isFinite(range.from) || !Number.isFinite(range.to)) return null;
    const from = Math.max(0, Number(range.from) || 0);
    const to = Math.max(from, Number(range.to) || 0);
    return { from, to };
  }

  normalizedSelectionRangeForValue(value, range) {
    const normalized = this.normalizedSelectionRange(range);
    if (!normalized) return null;
    const limit = Math.max(0, String(value || "").length);
    const from = Math.max(0, Math.min(limit, normalized.from));
    const to = Math.max(from, Math.min(limit, normalized.to));
    return { from, to };
  }

  setEditorSelectionRange(from, to) {
    if (this.isLiteratureWorkspaceActive()) {
      const target = this.els.literatureParaphrase || this.els.literatureOriginal || this.els.literatureTitle;
      target?.focus();
      target?.setSelectionRange?.(from, to);
      return;
    }
    const normalized = this.normalizedSelectionRangeForValue(this.getEditorValue(), { from, to });
    const start = normalized?.from ?? 0;
    const end = normalized?.to ?? start;
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
    const title = normalizedNoteTitleText(value.slice(2, end));
    if (title !== UNTITLED_NOTE_TITLE) return null;
    return { from: 2, to: end };
  }

  placeholderTitleSelectionRange() {
    return this.placeholderTitleRange(this.getEditorValue());
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

  maybeSaveOnTitleBlur() {
    const tab = this.updateActiveTabFromEditor();
    if (!tab) return;
    const note = this.activeNote();
    if (!note) return;
    if (normalizedNoteTitleText(tab.title) === normalizedNoteTitleText(tab.savedTitle)) return;
    if (Date.now() - this.lastTitleInputAt > 8000) return;
    const now = Date.now();
    if (now - this.lastTitleBlurSaveAt < 450) return;
    this.lastTitleBlurSaveAt = now;

    note.title = tab.title;
    note.body = tab.body;
    note.updatedAt = new Date().toISOString();
    this.renderTabs();
    void this.saveActiveNote({ autoSave: true, trigger: "title-blur", skipOriginalityCheck: true });
  }

  enterBodyFromTitle() {
    const context = this.firstHeadingEntryContext();
    if (!context) return false;
    const { value, headingEnd } = context;
    const replaceHeadingBreak = (from, to, text, selectionStart) => {
      const options = {
        selectionStart,
        selectionEnd: selectionStart
      };
      if (this.isWysiwygMode()) return this.replaceMarkdownWhileInWysiwyg(from, to, text, options);
      this.replaceEditorRange(from, to, text, options);
      return true;
    };
    const afterHeading = value.slice(headingEnd);
    if (afterHeading.startsWith("\n\n")) {
      this.setEditorSelectionRange(headingEnd + 2, headingEnd + 2);
      return true;
    }
    if (afterHeading.startsWith("\n")) {
      return replaceHeadingBreak(headingEnd, headingEnd + 1, "\n\n", headingEnd + 2);
    }
    return replaceHeadingBreak(headingEnd, headingEnd, "\n\n", headingEnd + 2);
  }

  extractRichExternalLinkFromEvent(event) {
    const target = event?.target?.closest?.("a[href]");
    if (!target || target.dataset?.previewAssetUrl) return null;
    const url = String(target.getAttribute("href") || "").trim();
    if (!isExternalLinkUrl(url)) return null;
    return { url };
  }

  async openExternalUrl(url = "") {
    const cleanUrl = String(url || "").trim();
    if (!cleanUrl) return false;
    try {
      if (this.onOpenExternalUrl) {
        const result = await this.onOpenExternalUrl(cleanUrl);
        if (result !== false) {
          this.onStatus("已在外部浏览器打开链接", "ok");
          return true;
        }
      }
      const opened = window.open(cleanUrl, "_blank", "noopener,noreferrer");
      if (opened) {
        this.onStatus("已在新窗口打开链接", "ok");
        return true;
      }
    } catch (error) {
      this.onStatus(`打开链接失败：${String(error?.message || error)}`, "bad");
      return false;
    }
    this.onStatus("没有成功打开外部链接", "warn");
    return false;
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
      const markdownRange = this.placeholderTitleSelectionRange();
      if (!markdownRange) return false;
      this.setMarkdownSelectionOverride(markdownRange.from, markdownRange.to);
      if (this.isWysiwygMode() && this.els.wysiwygHost) {
        const heading = this.els.wysiwygHost.querySelector(".toastui-editor-contents h1");
        const titleNode = heading?.firstChild;
        const titleText = String(heading?.textContent || "").trim();
        if (!titleNode || !titleText || normalizedNoteTitleText(titleText) !== UNTITLED_NOTE_TITLE) return false;
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
      this.setEditorSelectionRange(markdownRange.from, markdownRange.to);
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
      if (editor !== this.richEditor && !this.isSourceMode() && this.richEditor && this.richEditor.getValue() !== syncValue) {
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

  normalizeAssetInsertText(assets = [], options = {}) {
    const snippets = assets.map((item) => this.assetMarkdownSnippet(item)).filter(Boolean);
    if (!snippets.length) return "";
    const selection = options.selection || this.editorSelection();
    const { from, to } = selection;
    const value = typeof options.value === "string" ? options.value : this.getEditorValue();
    const beforeChar = from > 0 ? value[from - 1] : "";
    const afterChar = to < value.length ? value[to] : "";
    const prefix = beforeChar && beforeChar !== "\n" ? "\n\n" : beforeChar === "\n" ? "\n" : "";
    const suffix = afterChar && afterChar !== "\n" ? "\n\n" : afterChar === "\n" ? "\n" : "";
    return `${prefix}${snippets.join("\n\n")}${suffix}`;
  }

  stableEditorSelectionForAsyncInsert() {
    const value = this.getEditorValue();
    const fallback = { from: value.length, to: value.length };
    try {
      const selection = this.editorSelection();
      const from = Math.max(0, Math.min(value.length, Number(selection?.from ?? fallback.from) || 0));
      const to = Math.max(from, Math.min(value.length, Number(selection?.to ?? from) || from));
      return { value, selection: { from, to } };
    } catch {
      return { value, selection: fallback };
    }
  }

  async insertAssetFiles(filesLike, { sourceLabel = "插入" } = {}) {
    const note = this.activeNote();
    if (!note) {
      this.onStatus("请先打开一个笔记", "warn");
      return;
    }
    const incomingFiles = [...(filesLike || [])].filter(Boolean);
    if (!incomingFiles.length) return;
    const files = incomingFiles.filter(isAllowedAttachmentFile);
    const skipped = incomingFiles.length - files.length;
    if (!files.length) {
      this.onStatus("附件只支持图片、PDF、Markdown、TXT、CSV、JSON 和日志文本", "warn");
      return;
    }
    const insertion = this.stableEditorSelectionForAsyncInsert();
    this.onStatus(`${sourceLabel}文件处理中...`, "ok");
    try {
      const uploaded = [];
      for (const file of files) {
        const contentBase64 = await this.fileToBase64(file);
        const item = await uploadNoteAsset(note.id, {
          fileName: file.name,
          mimeType: file.type || "",
          contentBase64,
          kind: isImageFile(file) ? "image" : "file"
        });
        if (item) uploaded.push(item);
      }
      if (!uploaded.length) throw new Error("未能写入任何附件");
      const currentValue = this.getEditorValue();
      const from = Math.max(0, Math.min(currentValue.length, insertion.selection.from));
      const to = Math.max(from, Math.min(currentValue.length, insertion.selection.to));
      const insertText = this.normalizeAssetInsertText(uploaded, {
        selection: { from, to },
        value: currentValue
      });
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
      this.onStatus(`已插入${detail.join("、")}${skipped ? `，已跳过 ${skipped} 个不支持的文件` : ""}`, skipped ? "warn" : "ok");
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
    const nextValue = `${value.slice(0, lineStart)}${nextText}${value.slice(lineEnd)}`;
    this.els.body.value = nextValue;
    if (this.markdownEditor && this.markdownEditor.getValue() !== nextValue) {
      this.suppressEditorChange = true;
      this.suppressSourceEditorChange = true;
      try {
        this.markdownEditor.setValue(nextValue);
      } finally {
        this.suppressSourceEditorChange = false;
        this.suppressEditorChange = false;
      }
    }
    this.markdownEditor?.setSelectionRange?.(adjustedStart, adjustedEnd);
    this.handleEditorInput();
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
    const selection = this.editorSelection();
    if (selection.from !== selection.to) return false;
    const value = String(this.getEditorValue() || "").replace(/\r\n/g, "\n");
    if (!value.endsWith("\n\n") || selection.from < value.length - 1) return false;
    const hasBodyParagraph = value
      .slice(0, -2)
      .split("\n")
      .map((line) => line.trim())
      .some((line) => line && !/^#{1,6}\s/.test(line) && line !== "<br>");
    if (!hasBodyParagraph) return false;
    const insert = "<br>\n\n";
    return this.replaceMarkdownWhileInWysiwyg(value.length, value.length, insert, {
      selectionStart: value.length + insert.length,
      selectionEnd: value.length + insert.length
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

  compactFolderLabel(folderId) {
    return this.folderLabel(folderId).replace(/\s*\/\s*/g, "/");
  }

  linkCandidateDisplayTitle(note) {
    const targetTitle = String(note?.title || note?.id || "未命名笔记").trim() || "未命名笔记";
    const activeNote = this.activeNote();
    if (!activeNote?.folderId || !note?.folderId || activeNote.folderId === note.folderId) return targetTitle;
    return `${this.compactFolderLabel(note.folderId)}/${targetTitle}`;
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

  hasResolvedLinkToNote(noteId, body = this.getEditorValue(), scopedNotes = this.scopedLinkCandidates()) {
    const targetId = String(noteId || "").trim();
    if (!targetId) return false;
    return parseLinks(body).some((token) => this.resolveLinkToken(token, scopedNotes)?.note?.id === targetId);
  }

  upsertApiNotes(items = []) {
    for (const item of items) {
      const existing = this.state.notes.find((n) => n.id === item.id);
      if (existing) {
        existing.title = item.title || existing.title;
        existing.folderId = item.directoryId || existing.folderId;
        existing.noteType = item.noteType || existing.noteType;
        existing.markdownPath = item.markdownPath || existing.markdownPath;
        if (Object.prototype.hasOwnProperty.call(item, "thinkingStatus")) {
          existing.thinkingStatus = item.thinkingStatus || null;
        }
        if (Object.prototype.hasOwnProperty.call(item, "thesis")) {
          existing.thesis = item.thesis || "";
        }
        if (Object.prototype.hasOwnProperty.call(item, "threeLineSummary")) {
          existing.threeLineSummary = Array.isArray(item.threeLineSummary) ? item.threeLineSummary : [];
        }
        if (Object.prototype.hasOwnProperty.call(item, "distillationStatus")) {
          existing.distillationStatus = item.distillationStatus || "";
        }
        if (typeof item.body === "string") {
          existing.body = item.body;
          existing.tags = parseTags(item.body);
          existing.links = parseLinks(item.body);
          existing.bodyLoaded = true;
        }
        existing.updatedAt = item.updatedAt || existing.updatedAt;
        continue;
      }
      const body = typeof item.body === "string" ? item.body : `# ${item.title || "未命名笔记"}\n`;
      this.state.notes.push({
        id: item.id,
        title: item.title || "未命名笔记",
        folderId: item.directoryId,
        noteType: item.noteType || "original",
        markdownPath: item.markdownPath || "",
        thesis: item.thesis || "",
        threeLineSummary: Array.isArray(item.threeLineSummary) ? item.threeLineSummary : [],
        distillationStatus: item.distillationStatus || "",
        thinkingStatus: item.thinkingStatus || null,
        body,
        tags: parseTags(body),
        links: parseLinks(body),
        bodyLoaded: typeof item.body === "string",
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
      const asciiStart = left.lastIndexOf("[[");
      const fullWidthStart = left.lastIndexOf("【【");
      const start = Math.max(asciiStart, fullWidthStart);
      if (start < 0) return null;
      const lastClose = Math.max(left.lastIndexOf("]]"), left.lastIndexOf("】】"));
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
    const q = normalizeText(query);
    const all = this.scopedLinkCandidates();
    const computed = (q
      ? all
          .filter((n) => normalizeText(n.title).includes(q))
          .sort((a, b) => linkCandidateRank(a, q) - linkCandidateRank(b, q) || a.title.localeCompare(b.title, "zh-CN"))
      : [...all].sort((a, b) => a.title.localeCompare(b.title, "zh-CN")));
    const list = q ? computed.slice(0, 50) : [];
    const selectedId = String(preferredId || this.currentPinnedLinkId || "").trim();
    this.currentLinkCandidates = list;
    this.currentLinkIndex = 0;
    if (selectedId) {
      const idx = list.findIndex((n) => n.id === selectedId);
      if (idx >= 0) this.currentLinkIndex = idx;
    }
    this.els.linkSearchList.innerHTML = list.length
      ? list
          .map((n, idx) => {
            const selected = idx === this.currentLinkIndex;
            const pinned = selectedId && n.id === selectedId;
            return `<button class="link-picker-item ${selected ? "active" : ""} ${pinned ? "picked" : ""}" data-link-note-id="${n.id}" data-link-index="${idx}" aria-selected="${
              selected ? "true" : "false"
            }"><strong>${highlightMatch(this.linkCandidateDisplayTitle(n), q)}</strong></button>`;
          })
          .join("")
      : q ? `<div class="picker-empty">没有匹配笔记</div>` : "";
    this.scrollActiveLinkCandidateIntoView();
    this.updateLinkPickerConfirmButton();
  }

  updateLinkPickerConfirmButton() {
    const button = this.els.confirmLinkInsert;
    if (!button) return;
    const selectedId = String(this.currentPinnedLinkId || "").trim();
    const selectedNote = selectedId
      ? this.currentLinkCandidates.find((item) => item.id === selectedId) || this.state.notes.find((item) => item.id === selectedId) || null
      : null;
    button.disabled = this.isSubmittingLinkInsert || !selectedNote;
    if (this.isSubmittingLinkInsert) {
      button.textContent = "关联中...";
      return;
    }
    button.textContent = "关联";
  }

  focusManualLinkReasonInput() {
    if (this.currentLinkContext || !this.els.linkReasonInput) return;
    this.els.linkReasonInput.focus();
    const value = String(this.els.linkReasonInput.value || "");
    this.els.linkReasonInput.setSelectionRange?.(value.length, value.length);
  }

  linkCandidatePreviewText(note) {
    const thesis = String(note?.thesis || "").trim();
    if (thesis) return thesis.slice(0, 96);
    const lines = String(note?.body || "")
      .replace(/\r\n/g, "\n")
      .split("\n")
      .map((line) =>
        String(line || "")
          .replace(/\[\[([^[\]]+)\]\]/g, "$1")
          .replace(/<!--[\s\S]*?-->/g, "")
          .replace(/^#{1,6}\s*/, "")
          .replace(/^>\s*/, "")
          .replace(/^[-*]\s+/, "")
          .trim()
      )
      .filter((line) => line && !/^#/.test(line) && !/^tag[:：]/i.test(line));
    const meaningful = lines.find((line) => normalizeText(line).length >= 6) || lines[0] || "";
    return meaningful ? meaningful.slice(0, 96) : "打开后可查看这条笔记的正文与关联。";
  }

  linkCandidateLocationText(note) {
    return `${noteTypeText(this.resolvedNoteType(note) || typeFromFolder(this.state, note?.folderId || ""))} · ${this.folderLabel(note?.folderId || "")}`;
  }

  syncRelationNetworkConnected(...noteIds) {
    const ids = noteIds.map((item) => String(item || "").trim()).filter(Boolean);
    if (!ids.length) return;
    const connectedIds = this.state.graphConnectedNoteIds instanceof Set ? this.state.graphConnectedNoteIds : new Set();
    this.state.graphConnectedNoteIds = connectedIds;
    for (const id of ids) {
      connectedIds.add(id);
      const note = this.state.notes.find((item) => item.id === id);
      if (note) note.relationNetworkStatus = "connected";
    }
  }

  setLinkInsertSubmitting(nextSubmitting) {
    this.isSubmittingLinkInsert = nextSubmitting === true;
    this.updateLinkPickerConfirmButton();
  }

  scrollActiveLinkCandidateIntoView() {
    const active = this.els.linkSearchList.querySelector(".link-picker-item.active");
    if (!active) return;
    active.scrollIntoView({ block: "nearest" });
  }

  openLinkPicker(initialQuery = "", options = {}) {
    this.closeTagPicker();
    this.hideOriginalityNotice();
    const inlineMode = Boolean(options.inlineContext);
    const anchorAtCursor = Boolean(options.anchorAtCursor);
    const focusInput = Boolean(options.focusInput);
    this.els.linkPicker.classList.remove("floating");
    this.els.linkPicker.classList.toggle("inline-picker", inlineMode);
    this.els.linkPicker.style.left = "";
    this.els.linkPicker.style.top = "";
    this.els.linkPicker.style.width = "";
    this.els.linkPicker.style.maxHeight = "";
    this.els.linkPicker.classList.remove("hidden");
    const linkPickerMeta = this.els.linkRelationTypeSelect?.closest?.(".link-picker-meta");
    if (linkPickerMeta) linkPickerMeta.hidden = true;
    const linkPickerGuidance = linkPickerMeta?.nextElementSibling;
    if (linkPickerGuidance?.classList?.contains("semantic-relation-quality-guidance")) linkPickerGuidance.hidden = true;
    const linkSearchSpacer = this.els.linkSearchInput?.nextElementSibling;
    if (linkSearchSpacer && linkSearchSpacer !== this.els.linkSearchList) {
      this.els.linkSearchInput.parentNode?.insertBefore(this.els.linkSearchList, linkSearchSpacer);
      if (linkSearchSpacer.tagName === "DIV" && !String(linkSearchSpacer.textContent || "").trim()) linkSearchSpacer.hidden = true;
    }
    this.els.linkSearchInput.placeholder = "输入笔记标题，实时检索...";
    this.els.linkSearchInput.value = initialQuery;
    this.currentPinnedLinkId = "";
    this.manualLinkReturnSelection = inlineMode ? null : this.normalizedSelectionRange(this.editorSelection());
    this.manualLinkReturnScrollState = inlineMode ? null : this.captureEditorScrollState();
    if (!inlineMode) {
      if (this.els.linkRelationTypeSelect) this.els.linkRelationTypeSelect.value = "supports";
      if (this.els.linkReasonInput) this.els.linkReasonInput.value = "";
    }
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

  resetToolbarTransientButtons() {
    [this.els.insertLink, this.els.insertTag, this.els.insertImage].forEach((button) => {
      if (!button) return;
      button.classList.remove("active");
      button.blur?.();
    });
  }

  closeLinkPicker() {
    this.els.linkPicker.classList.add("hidden");
    this.els.linkPicker.classList.remove("floating");
    this.els.linkPicker.classList.remove("inline-picker");
    this.els.linkPicker.style.left = "";
    this.els.linkPicker.style.top = "";
    this.els.linkPicker.style.width = "";
    this.els.linkPicker.style.maxHeight = "";
    this.currentLinkContext = null;
    this.lastInlinePickerAnchor = 0;
    this.currentPinnedLinkId = "";
    this.manualLinkReturnSelection = null;
    this.manualLinkReturnScrollState = null;
    this.isSubmittingLinkInsert = false;
    this.resetToolbarTransientButtons();
    if (this.els.linkReasonInput) this.els.linkReasonInput.value = "";
    this.updateLinkPickerConfirmButton();
  }

  positionInlineLinkPicker() {
    if (!this.currentLinkContext) return;
    this.positionFloatingPicker(this.els.linkPicker, Math.min(420, Math.max(320, Math.floor(window.innerWidth * 0.34))));
  }

  manualLinkInsertOutcome(bodyAlreadyLinked, reusedRelation) {
    if (bodyAlreadyLinked && reusedRelation) return "body-and-relation-existed";
    if (bodyAlreadyLinked) return "body-only-existed";
    if (reusedRelation) return "relation-only-existed";
    return "created";
  }

  manualLinkInsertFeedback(target, outcome) {
    const title = target?.title || target?.id || "这条笔记";
    switch (String(outcome || "")) {
      case "body-and-relation-existed":
        return {
          status: `正文已有链接，语义关系也已存在：${title}`,
          related: "正文链接与现有语义关系均已复用。"
        };
      case "body-only-existed":
        return {
          status: `正文已有链接，已补建语义关系：${title}`,
          related: "正文链接已保留，并补建语义关系。"
        };
      case "relation-only-existed":
        return {
          status: `已插入正文链接，现有语义关系已复用：${title}`,
          related: "正文链接已插入，现有语义关系已复用。"
        };
      default:
        return {
          status: `已按你的确认插入关联笔记：${title}`,
          related: "关联已插入。"
        };
    }
  }

  async insertSelectedLinkNote(noteId) {
    if (!noteId) return;
    if (this.isSubmittingLinkInsert) return;
    const target = this.state.notes.find((n) => n.id === noteId);
    if (!target) return;
    const inlineInsert = Boolean(this.currentLinkContext);
    const relationType = "supports";
    const rawReason = "手动确认关联。";
    const manualSelection = !inlineInsert
      ? this.normalizedSelectionRange(this.manualLinkReturnSelection) || this.normalizedSelectionRange(this.editorSelection())
      : null;
    const manualScrollState = !inlineInsert ? this.manualLinkReturnScrollState : null;
    const currentBody = this.getEditorValue();
    const bodyAlreadyLinked = !inlineInsert && this.hasResolvedLinkToNote(target.id, currentBody);
    const reason = rawReason
      .replace(/\s+/g, " ")
      .replace(/--/g, "- -")
      .slice(0, 280);
    const token = `[[${target.title}]]`;
    const restoreSelection =
      manualSelection && Number.isFinite(manualSelection.from)
        ? bodyAlreadyLinked
          ? { from: manualSelection.to, to: manualSelection.to }
          : { from: manualSelection.from + token.length, to: manualSelection.from + token.length }
        : null;
    this.setLinkInsertSubmitting(true);
    try {
      let relationCreateResult = null;
      if (inlineInsert) {
        const { start, end } = this.currentLinkContext;
        if (this.isWysiwygMode()) {
          this.replaceMarkdownWhileInWysiwyg(start, end, `[[${target.title}]]`);
        } else {
          this.replaceEditorRange(start, end, `[[${target.title}]]`);
        }
      } else if (bodyAlreadyLinked) {
        // Keep the existing wikilink in place and only ensure the semantic relation is tracked.
      } else if (manualSelection) {
        if (this.isWysiwygMode()) {
          this.replaceMarkdownWhileInWysiwyg(manualSelection.from, manualSelection.to, token, {
            selectionStart: restoreSelection?.from,
            selectionEnd: restoreSelection?.to
          });
        } else {
          this.replaceEditorRange(manualSelection.from, manualSelection.to, token, {
            selectionStart: restoreSelection?.from,
            selectionEnd: restoreSelection?.to
          });
        }
      } else {
        this.insertAtCursor(token);
      }
      this.handleEditorInput();
      this.closeLinkPicker();
      this.focusEditor();
      if (!inlineInsert) {
        try {
          relationCreateResult = await createNoteRelation(this.activeNote()?.id || "", {
            toNoteId: target.id,
            relationType,
            rationale: reason,
            insightQuestion: "",
            createdBy: "user",
            confidence: 1,
            status: "confirmed"
          });
          this.syncRelationNetworkConnected(this.activeNote()?.id || "", target.id);
        } catch (error) {
          this.onStatus(`关联已插入，但正式关系创建失败：${String(error?.message || error)}`, "warn");
        }
        await this.saveActiveNote({ autoSave: true, trigger: "link-insert", skipOriginalityCheck: true });
        if (restoreSelection) this.setEditorSelectionRange(restoreSelection.from, restoreSelection.to);
        this.scheduleEditorScrollRestore(manualScrollState);
        const reusedRelation = relationCreateResult?.created === false;
        const feedback = this.manualLinkInsertFeedback(target, this.manualLinkInsertOutcome(bodyAlreadyLinked, reusedRelation));
        this.onStatus(feedback.status, "ok");
        this.renderRelated(feedback.related);
      } else {
        this.onStatus(`已按你的确认插入关联笔记：${target.title}`, "ok");
      }
    } finally {
      this.setLinkInsertSubmitting(false);
    }
  }

  moveLinkCandidate(step) {
    if (!this.currentLinkCandidates.length) return;
    const max = Math.min(this.currentLinkCandidates.length, 50);
    this.currentLinkIndex = (this.currentLinkIndex + step + max) % max;
    const preferredId = this.currentLinkCandidates[this.currentLinkIndex]?.id || "";
    this.renderLinkCandidates(this.els.linkSearchInput.value, preferredId);
    if (this.currentLinkContext) this.positionInlineLinkPicker();
  }

  async confirmSelectedLinkCandidate() {
    const chosen = this.currentLinkCandidates[this.currentLinkIndex] || this.currentLinkCandidates[0];
    if (!chosen) return;
    this.currentPinnedLinkId = chosen.id;
    this.renderLinkCandidates(this.els.linkSearchInput.value, chosen.id);
    this.els.linkSearchInput.value = this.linkCandidateDisplayTitle(chosen);
    this.els.linkSearchList.innerHTML = "";
    this.updateLinkPickerConfirmButton();
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
    this.els.tagPicker.style.maxHeight = "";
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
    this.els.tagPicker.style.maxHeight = "";
    this.currentTagContext = null;
    this.resetToolbarTransientButtons();
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
    const estimatedHeight = Math.min(panel.scrollHeight || 360, window.innerHeight - 24);
    const maxTop = Math.max(12, window.innerHeight - estimatedHeight - 12);
    const clampedTop = Math.max(12, Math.min(top, maxTop));
    panel.style.width = `${width}px`;
    panel.style.left = `${clampedLeft}px`;
    panel.style.top = `${clampedTop}px`;
    panel.style.maxHeight = `calc(100dvh - ${Math.ceil(clampedTop + 12)}px)`;
  }

  insertSelectedTag(tagName = "") {
    const normalized = normalizeClickedTag(tagName);
    if (!normalized) return;
    const insertText = `#${normalized}`;
    if (this.currentTagContext) {
      const { start, end } = this.currentTagContext;
      if (this.isWysiwygMode()) {
        this.replaceMarkdownWhileInWysiwyg(start, end, insertText);
      } else {
        this.replaceEditorRange(start, end, insertText);
      }
    } else {
      this.insertAtCursor(insertText);
    }
    this.closeTagPicker();
    this.focusEditor();
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

  relationEndpoint(link, direction) {
    const endpointId = direction === "outgoing" ? link?.toNoteId : link?.fromNoteId;
    const apiNote = direction === "outgoing" ? link?.target : link?.source;
    const cached = this.state.notes.find((item) => item.id === endpointId) || null;
    return {
      id: endpointId || apiNote?.id || "",
      title: apiNote?.title || cached?.title || endpointId || "未命名笔记",
      noteType: apiNote?.noteType || cached?.noteType || "original",
      folderId: cached?.folderId || "",
      status: apiNote?.status || cached?.status || ""
    };
  }

  renderSemanticRelationItem(link, direction) {
    const endpoint = this.relationEndpoint(link, direction);
    const type = String(link?.relationType || "").trim().toLowerCase();
    const directionLabel = direction === "outgoing" ? "当前指向" : "指向当前";
    const createdBy = String(link?.createdBy || "user").trim();
    const createdByLabel = relationSourceLabel(createdBy);
    const confidence =
      link?.confidence === null || link?.confidence === undefined || link?.confidence === ""
        ? ""
        : `可信度 ${Math.round(Number(link.confidence) * 100)}%`;
    const qualityLabel = relationQualityLabel(link?.rationaleQualityLevel);
    const folderText = endpoint.folderId ? this.folderLabel(endpoint.folderId) : noteTypeText(endpoint.noteType);
    const insightQuestion = String(link?.insightQuestion || "").trim();
    const rationale = String(link?.rationale || "").trim();
    const preview = isMarkdownWikilinkRelation(link) ? "由 [[wikilink]] 建立的基础关联。" : rationale;

    return `
      <article class="related-item semantic-relation-item" data-relation-tone="${escapeHtml(relationTone(link))}" data-relation-id="${escapeHtml(link?.id || "")}">
        <button class="semantic-relation-open" type="button" data-preview-note="${escapeHtml(endpoint.id)}">
          <span class="related-item-title">${escapeHtml(endpoint.title)}</span>
          <span class="related-item-meta">${escapeHtml(directionLabel)} · ${escapeHtml(relationTypeLabel(type))} · ${escapeHtml(relationStatusLabel(link?.status))} · ${escapeHtml(folderText)}</span>
          ${preview ? `<span class="related-item-preview">${escapeHtml(preview)}</span>` : ""}
          ${insightQuestion ? `<span class="relation-question">${escapeHtml(insightQuestion)}</span>` : ""}
        </button>
        <div class="related-item-badges">
          <span class="related-item-badge">${escapeHtml(relationTypeLabel(type))}</span>
          <span class="related-item-badge">${escapeHtml(createdByLabel)}</span>
          <span class="related-item-badge">${escapeHtml(qualityLabel)}</span>
          ${confidence ? `<span class="related-item-badge">${escapeHtml(confidence)}</span>` : ""}
        </div>
        <div class="semantic-relation-card-actions">
          <button class="mini-btn is-ghost" type="button" data-relation-action="open-edit" data-relation-id="${escapeHtml(link?.id || "")}">编辑</button>
          <button class="mini-btn is-ghost" type="button" data-relation-action="delete" data-relation-id="${escapeHtml(link?.id || "")}">删除</button>
        </div>
      </article>
    `;
  }

  renderSemanticRelationsLoadingSection(noteId) {
    return `
      <section class="inspector-section semantic-relations-section" data-note-relations-section data-note-id="${escapeHtml(noteId)}">
        <div class="inspector-section-head">
          <div class="inspector-section-title">语义关系</div>
          <div class="semantic-relation-head-actions">
            <button class="mini-btn is-ghost" type="button" data-relation-action="open-create">建立关系</button>
            <div class="inspector-count">读取中</div>
          </div>
        </div>
        <div class="related-empty">正在读取带理由的关系。</div>
      </section>
    `;
  }

  renderInlineDraftRelationSection(note, tab) {
    const drafts = parseInlineRelationAnnotations(tab?.body || "");
    if (!drafts.length) return "";
    const scoped = this.scopedLinkCandidates();
    const items = drafts
      .map((draft, index) => {
        const resolved = this.resolveLinkToken(draft.token, scoped);
        const endpoint = resolved?.note || {
          id: draft.token,
          title: draft.token,
          noteType: "original",
          folderId: ""
        };
        const createdByLabel = relationSourceLabel(draft.manager);
        const quality = relationQualityEvaluation(draft.rationale, "");
        return `
          <article class="related-item semantic-relation-item" data-relation-tone="${escapeHtml(relationTone({ relationType: draft.relationType }))}" data-inline-relation-index="${index}">
            <button class="semantic-relation-open" type="button" data-preview-note="${escapeHtml(endpoint.id || "")}">
              <span class="related-item-title">${escapeHtml(endpoint.title || draft.token)}</span>
              <span class="related-item-meta">${escapeHtml("刚写入正文")} · ${escapeHtml(relationTypeLabel(draft.relationType))} · ${escapeHtml(endpoint.folderId ? this.folderLabel(endpoint.folderId) : noteTypeText(endpoint.noteType))}</span>
              ${draft.rationale ? `<span class="related-item-preview">${escapeHtml(draft.rationale)}</span>` : ""}
            </button>
        <div class="related-item-badges">
          <span class="related-item-badge">${escapeHtml(relationTypeLabel(draft.relationType))}</span>
          <span class="related-item-badge">${escapeHtml(createdByLabel)}</span>
          <span class="related-item-badge">${escapeHtml(relationQualityLabel(quality.level))}</span>
        </div>
        <div class="semantic-relation-card-actions">
          <button class="mini-btn primary" type="button" data-relation-action="promote-inline" data-inline-relation-index="${index}">升级为正式关系</button>
        </div>
      </article>
    `;
      })
      .join("");
    return `
      <section class="inspector-section semantic-relations-section">
        <div class="inspector-section-head">
          <div class="inspector-section-title">刚写入的关联</div>
          <div class="inspector-count">${drafts.length}</div>
        </div>
        <div class="inspector-section-note">这些关系已经写进当前笔记正文，并会在后续关系读取完成后进入正式语义关系区。</div>
        <div class="inspector-list">${items}</div>
      </section>
    `;
  }

  relationCreateDefaultType(note = this.activeNote()) {
    return relationCreateDefaultTypeForNote(note);
  }

  sortRelationTargetCandidates(candidates = [], note = this.activeNote()) {
    return sortRelationTargetCandidatesForNote(candidates, note);
  }

  renderRelationTargetOptions(candidates = [], selectedId = "") {
    const selected = String(selectedId || "").trim();
    const selectedNote = selected ? this.state.notes.find((item) => item?.id === selected) || null : null;
    const sorted = this.sortRelationTargetCandidates(candidates);
    const items = selected && !sorted.some((candidate) => candidate?.id === selected)
      ? [
          ...(selectedNote ? [selectedNote] : []),
          ...sorted
        ]
      : sorted;
    return items
      .filter(Boolean)
      .map((n) => {
        const meta = `${noteTypeText(n.noteType || typeFromFolder(this.state, n.folderId))} · ${this.folderLabel(n.folderId)}`;
        return `<option value="${escapeHtml(n.id)}"${n.id === selected ? " selected" : ""}>${escapeHtml(n.title || n.id)} · ${escapeHtml(meta)}</option>`;
      })
      .join("");
  }

  renderRelationTargetChoices(candidates = [], selectedId = "", query = "", activeId = "") {
    const selected = String(selectedId || "").trim();
    const active = String(activeId || "").trim();
    const selectedNote = selected ? this.state.notes.find((item) => item?.id === selected) || null : null;
    const q = String(query || "").trim().toLowerCase();
    const sorted = this.sortRelationTargetCandidates(candidates);
    const filtered = q
      ? sorted.filter((candidate) => {
          const title = String(candidate?.title || "").toLowerCase();
          return title.includes(q);
        })
      : sorted;
    const items = selected && !filtered.some((candidate) => candidate?.id === selected)
      ? [
          ...(selectedNote ? [selectedNote] : []),
          ...filtered
        ]
      : filtered;
    if (!items.length) return `<div class="picker-empty">没有匹配笔记</div>`;
    return items
      .slice(0, 10)
      .map((candidate) => {
        const isActive = candidate?.id === active;
        const resolvedType = noteTypeText(candidate?.noteType || typeFromFolder(this.state, candidate?.folderId || ""));
        const location = this.folderLabel(candidate?.folderId || "");
        return `
          <button
            class="link-picker-item ${isActive ? "active" : ""}"
            type="button"
            data-relation-target-choice
            data-note-id="${escapeHtml(candidate?.id || "")}"
            data-note-title="${escapeHtml(candidate?.title || candidate?.id || "")}"
            aria-selected="${isActive ? "true" : "false"}"
            title="${escapeHtml(`${candidate?.title || candidate?.id || ""} · ${resolvedType} · ${location}`)}"
          >
            <span class="picker-headline">
              <strong>${highlightMatch(candidate?.title || candidate?.id || "", q)}</strong>
            </span>
          </button>
        `;
      })
      .join("");
  }

  renderCreateRelationFormSection(noteId, prefill = {}) {
    const activeNote = this.activeNote();
    const candidates = this.scopedLinkCandidates();
    const defaultType = this.relationCreateDefaultType(activeNote);
    const selectedTargetId = String(prefill?.targetNoteId || "").trim();
    const selectedTarget = selectedTargetId ? this.state.notes.find((item) => item?.id === selectedTargetId) || null : null;
    const selectedRelationType = String(prefill?.relationType || "").trim().toLowerCase() || defaultType;
    const targetQuery = String(prefill?.targetQuery || selectedTarget?.title || "").trim();
    const entryHint = String(prefill?.entryHint || "").trim();
    const rationaleDraft = String(prefill?.rationaleDraft || "").trim();
    const insightQuestionDraft = String(prefill?.insightQuestionDraft || "").trim();
    const templateVariants = normalizeRelationTemplateVariants(prefill?.draftVariants || [], prefill?.selectedTemplateVariant || "");
    const rememberedTemplateVariantLabel = String(prefill?.rememberedTemplateVariantLabel || "").trim();
    const defaultGuidance = relationTypeGuidance(selectedRelationType);
    const scopeFolderLabel = activeNote?.folderId ? this.folderLabel(activeNote.folderId) : "当前目录";
    const typeOptions = RELATION_CREATE_TYPES.map(
      (type) => `<option value="${escapeHtml(type)}"${type === selectedRelationType ? " selected" : ""}>${escapeHtml(relationTypeLabel(type))}</option>`
    ).join("");
    const targetChoices = this.renderRelationTargetChoices(candidates, selectedTargetId, targetQuery, selectedTargetId);
    const targetStatus = selectedTarget
      ? `已选：${selectedTarget.title || selectedTarget.id}`
      : candidates.length
        ? "输入标题后选择一条笔记"
        : "当前范围没有可连接笔记";

    return `
      <section class="inspector-section semantic-relations-section" data-note-relations-section data-note-id="${escapeHtml(noteId)}">
        <div class="inspector-section-head">
          <div class="inspector-section-title">建立语义关系</div>
          <button class="mini-btn is-ghost" type="button" data-relation-action="cancel-create">取消</button>
        </div>
        <div class="semantic-relation-status">
          <span class="inspector-chip">范围 ${escapeHtml(scopeFolderLabel)}</span>
          <span class="inspector-chip">默认 ${escapeHtml(relationTypeLabel(selectedRelationType))}</span>
        </div>
        ${entryHint ? `<div class="inspector-section-note" data-relation-entry-hint>${escapeHtml(entryHint)}</div>` : ""}
        <form class="semantic-relation-form" data-create-relation-form data-note-id="${escapeHtml(noteId)}">
          ${renderRelationTemplateVariantSwitcher(templateVariants.items, templateVariants.selectedKey, rememberedTemplateVariantLabel)}
          <label>
            <span>目标笔记</span>
            <input id="targetQuery" class="semantic-relation-target-search" name="targetQuery" data-relation-target-search data-autofocus-relation-target autocomplete="off" placeholder="输入标题关键词" value="${escapeHtml(targetQuery)}" autofocus />
            <input type="hidden" name="toNoteId" data-relation-target-id value="${escapeHtml(selectedTargetId)}" />
            <div class="link-picker-list semantic-relation-target-list" data-relation-target-list hidden>${targetChoices}</div>
            <small class="semantic-relation-target-status" data-relation-target-status>${escapeHtml(targetStatus)}</small>
          </label>
          <label>
            <span>关系类型</span>
            <select name="relationType" required>${typeOptions}</select>
          </label>
          <label>
            <span>连接理由</span>
            <textarea name="rationale" required aria-describedby="relation-rationale-guidance-create" placeholder="${escapeHtml(defaultGuidance.rationalePlaceholder)}">${escapeHtml(rationaleDraft)}</textarea>
            <small class="semantic-relation-quality-guidance" id="relation-rationale-guidance-create">${escapeHtml(defaultGuidance.rationaleHint)}</small>
          </label>
          <label>
            <span>洞见问题</span>
            <textarea name="insightQuestion" aria-describedby="relation-question-guidance-create" placeholder="${escapeHtml(defaultGuidance.questionPlaceholder)}">${escapeHtml(insightQuestionDraft)}</textarea>
            <small class="semantic-relation-quality-guidance" id="relation-question-guidance-create">${escapeHtml(defaultGuidance.questionHint)}</small>
          </label>
          ${renderRelationQualityMeter(rationaleDraft, insightQuestionDraft)}
          <div class="semantic-relation-form-error" data-relation-form-error></div>
          <div class="semantic-relation-actions">
            <button class="mini-btn primary" type="submit" ${selectedTargetId ? "" : "disabled"}>确认建立</button>
          </div>
        </form>
      </section>
    `;
  }

  renderRelationTypeOptions(selectedType = "") {
    const selected = String(selectedType || "").trim().toLowerCase();
    return RELATION_CREATE_TYPES.map(
      (type) => `<option value="${escapeHtml(type)}"${type === selected ? " selected" : ""}>${escapeHtml(relationTypeLabel(type))}</option>`
    ).join("");
  }

  renderRelationStatusOptions(selectedStatus = "confirmed") {
    const selected = String(selectedStatus || "confirmed").trim().toLowerCase();
    return RELATION_EDIT_STATUSES.map(
      (status) => `<option value="${escapeHtml(status)}"${status === selected ? " selected" : ""}>${escapeHtml(relationStatusLabel(status))}</option>`
    ).join("");
  }

  renderEditRelationFormSection(noteId, link, context = {}) {
    const endpoint = this.relationEndpoint(link, link?.fromNoteId === noteId ? "outgoing" : "incoming");
    const defaultGuidance = relationTypeGuidance(link?.relationType || "supports");
    const entryHint = String(context?.entryHint || "").trim();
    const rationaleDraft = String(link?.rationale || "").trim() || String(context?.rationaleDraft || "").trim();
    const insightQuestionDraft = String(link?.insightQuestion || "").trim() || String(context?.insightQuestionDraft || "").trim();
    const templateVariants = normalizeRelationTemplateVariants(context?.draftVariants || [], context?.selectedTemplateVariant || "");
    const rememberedTemplateVariantLabel = String(context?.rememberedTemplateVariantLabel || "").trim();
    return `
      <section class="inspector-section semantic-relations-section" data-note-relations-section data-note-id="${escapeHtml(noteId)}">
        <div class="inspector-section-head">
          <div>
            <div class="inspector-section-title">编辑语义关系</div>
            <div class="inspector-section-note">${escapeHtml(endpoint.title || "未命名笔记")}</div>
          </div>
          <button class="mini-btn is-ghost" type="button" data-relation-action="cancel-edit">取消</button>
        </div>
        ${entryHint ? `<div class="inspector-section-note" data-relation-entry-hint>${escapeHtml(entryHint)}</div>` : ""}
        <form class="semantic-relation-form" data-edit-relation-form data-note-id="${escapeHtml(noteId)}" data-relation-id="${escapeHtml(link?.id || "")}">
          ${renderRelationTemplateVariantSwitcher(templateVariants.items, templateVariants.selectedKey, rememberedTemplateVariantLabel)}
          <label>
            <span>关系类型</span>
            <select name="relationType" required>${this.renderRelationTypeOptions(link?.relationType || "supports")}</select>
          </label>
          <label>
            <span>关系状态</span>
            <select name="status" required>${this.renderRelationStatusOptions(link?.status || "confirmed")}</select>
          </label>
          <label>
            <span>连接理由</span>
            <textarea name="rationale" required aria-describedby="relation-rationale-guidance-edit" placeholder="${escapeHtml(defaultGuidance.rationalePlaceholder)}">${escapeHtml(rationaleDraft)}</textarea>
            <small class="semantic-relation-quality-guidance" id="relation-rationale-guidance-edit">${escapeHtml(defaultGuidance.rationaleHint)}</small>
          </label>
          <label>
            <span>洞见问题</span>
            <textarea name="insightQuestion" aria-describedby="relation-question-guidance-edit" placeholder="${escapeHtml(defaultGuidance.questionPlaceholder)}">${escapeHtml(insightQuestionDraft)}</textarea>
            <small class="semantic-relation-quality-guidance" id="relation-question-guidance-edit">${escapeHtml(defaultGuidance.questionHint)}</small>
          </label>
          ${renderRelationQualityMeter(rationaleDraft, insightQuestionDraft)}
          <div class="semantic-relation-form-error" data-relation-form-error></div>
          <div class="semantic-relation-actions">
            <button class="mini-btn primary" type="submit">保存修改</button>
          </div>
        </form>
      </section>
    `;
  }

  renderSemanticRelationsSection(relations, noteId) {
    const outgoing = Array.isArray(relations?.outgoingLinks) ? relations.outgoingLinks.filter((link) => !isHiddenRelation(link)) : [];
    const backlinks = Array.isArray(relations?.backlinks) ? relations.backlinks.filter((link) => !isHiddenRelation(link)) : [];
    const visibleLinks = [...outgoing, ...backlinks];
    const explicitOutgoing = outgoing.filter((link) => !isMarkdownWikilinkRelation(link));
    const explicitBacklinks = backlinks.filter((link) => !isMarkdownWikilinkRelation(link));
    const explicitLinks = [...explicitOutgoing, ...explicitBacklinks];
    const markdownCount = visibleLinks.length - explicitLinks.length;
    const confirmedCount = explicitLinks.filter((link) => String(link?.status || "confirmed") === "confirmed").length;
    const tensionCount = explicitLinks.filter((link) => relationTone(link) === "tension").length;
    const bridgeCount = explicitLinks.filter((link) => relationTone(link) === "bridge").length;
    const networkState = confirmedCount ? "已接入" : explicitLinks.length ? "待确认" : "未安置";

    const group = (title, direction, list, emptyText) => `
      <div class="semantic-relation-group">
        <div class="semantic-relation-group-head">
          <span>${escapeHtml(title)}</span>
          <span>${list.length}</span>
        </div>
        ${
          list.length
            ? `<div class="inspector-list">${list.map((link) => this.renderSemanticRelationItem(link, direction)).join("")}</div>`
            : `<div class="related-empty">${escapeHtml(emptyText)}</div>`
        }
      </div>
    `;

    return `
      <section class="inspector-section semantic-relations-section" data-note-relations-section data-note-id="${escapeHtml(noteId)}">
        <div class="inspector-section-head">
          <div class="inspector-section-title">语义关系</div>
          <div class="semantic-relation-head-actions">
            <button class="mini-btn is-ghost" type="button" data-relation-action="open-create">建立关系</button>
            <div class="inspector-count">${explicitLinks.length}</div>
          </div>
        </div>
        <div class="semantic-relation-status">
          <span class="inspector-chip">${escapeHtml(networkState)}</span>
          <span class="inspector-chip">确认 ${confirmedCount}</span>
          <span class="inspector-chip">张力 ${tensionCount}</span>
          <span class="inspector-chip">桥接 ${bridgeCount}</span>
          ${markdownCount ? `<span class="inspector-chip">wikilink ${markdownCount}</span>` : ""}
        </div>
        ${
          explicitLinks.length
            ? `
              <div class="semantic-relation-groups">
                ${group("向外连接", "outgoing", explicitOutgoing, "当前笔记还没有向外建立带理由的关系。")}
                ${group("被它连接", "incoming", explicitBacklinks, "还没有其他笔记以带理由的关系指向当前笔记。")}
              </div>
            `
            : `<div class="related-empty">${markdownCount ? "已有 wikilink 基础关联，带理由的语义关系还没有建立。" : "还没有带理由的语义关系。"}</div>`
        }
      </section>
    `;
  }

  setRelationPanelState(mode = "list", options = {}) {
    const cleanMode = ["list", "create", "edit"].includes(String(mode || "").trim()) ? String(mode || "").trim() : "list";
    const noteId = String(options.noteId || this.activeNote()?.id || "").trim();
    const preferredTemplateVariant =
      cleanMode === "list"
        ? ""
        : this.readTemplateVariantPreference("relation", options.draftVariants || [], options.selectedTemplateVariant || "");
    const rememberedTemplateVariant = cleanMode === "list" ? { key: "", label: "" } : this.templateVariantPreferenceMeta("relation", options.draftVariants || []);
    const normalizedTemplates =
      cleanMode === "list"
        ? { items: [], selectedKey: "" }
        : normalizeRelationTemplateVariants(options.draftVariants || [], preferredTemplateVariant);
    this.relationPanelState = {
      noteId,
      mode: cleanMode,
      relationId: cleanMode === "edit" ? String(options.relationId || "").trim() : "",
      targetNoteId: cleanMode === "create" ? String(options.targetNoteId || "").trim() : "",
      relationType: cleanMode === "create" ? String(options.relationType || "").trim().toLowerCase() : "",
      entryHint: cleanMode === "list" ? "" : String(options.entryHint || "").trim(),
      rationaleDraft: cleanMode === "list" ? "" : String(options.rationaleDraft || "").trim(),
      insightQuestionDraft: cleanMode === "list" ? "" : String(options.insightQuestionDraft || "").trim(),
      draftVariants: normalizedTemplates.items,
      selectedTemplateVariant: normalizedTemplates.selectedKey,
      rememberedTemplateVariantLabel:
        rememberedTemplateVariant.key && rememberedTemplateVariant.key === normalizedTemplates.selectedKey ? rememberedTemplateVariant.label : ""
    };
  }

  resetRelationPanelState(noteId = this.activeNote()?.id || "") {
    this.setRelationPanelState("list", { noteId });
  }

  currentRelationPanelState(noteId = this.activeNote()?.id || "") {
    const cleanNoteId = String(noteId || "").trim();
    if (!cleanNoteId || this.relationPanelState.noteId !== cleanNoteId) {
      return {
        noteId: cleanNoteId,
        mode: "list",
        relationId: "",
        targetNoteId: "",
        relationType: "",
        entryHint: "",
        rationaleDraft: "",
        insightQuestionDraft: "",
        draftVariants: [],
        selectedTemplateVariant: "",
        rememberedTemplateVariantLabel: ""
      };
    }
    return this.relationPanelState;
  }

  renderSemanticRelationsErrorSection(noteId, error) {
    return `
      <section class="inspector-section semantic-relations-section" data-note-relations-section data-note-id="${escapeHtml(noteId)}">
        <div class="inspector-section-head">
          <div class="inspector-section-title">语义关系</div>
          <div class="inspector-count">不可用</div>
        </div>
        <div class="related-empty bad">关系读取失败：${escapeHtml(String(error?.message || error || "未知错误"))}</div>
      </section>
    `;
  }

  renderCurrentRelationSection(noteId, { relations = this.currentSemanticRelations, relationState = this.semanticRelationsState, error = null } = {}) {
    const panelState = this.currentRelationPanelState(noteId);
    if (panelState.mode === "create") {
      return this.renderCreateRelationFormSection(noteId, {
        targetNoteId: panelState.targetNoteId,
        relationType: panelState.relationType,
        entryHint: panelState.entryHint,
        rationaleDraft: panelState.rationaleDraft,
        insightQuestionDraft: panelState.insightQuestionDraft,
        draftVariants: panelState.draftVariants,
        selectedTemplateVariant: panelState.selectedTemplateVariant,
        rememberedTemplateVariantLabel: panelState.rememberedTemplateVariantLabel
      });
    }
    if (panelState.mode === "edit") {
      const link =
        relationState === "loaded" && relations
          ? [...(Array.isArray(relations?.outgoingLinks) ? relations.outgoingLinks : []), ...(Array.isArray(relations?.backlinks) ? relations.backlinks : [])].find(
              (item) => item?.id === panelState.relationId
            ) || null
          : this.findSemanticRelation(panelState.relationId);
      if (link) {
        return this.renderEditRelationFormSection(noteId, link, {
          entryHint: panelState.entryHint,
          rationaleDraft: panelState.rationaleDraft,
          insightQuestionDraft: panelState.insightQuestionDraft,
          draftVariants: panelState.draftVariants,
          selectedTemplateVariant: panelState.selectedTemplateVariant,
          rememberedTemplateVariantLabel: panelState.rememberedTemplateVariantLabel
        });
      }
    }
    if (relationState === "error") return this.renderSemanticRelationsErrorSection(noteId, error);
    if (relationState !== "loaded" || !relations) return this.renderSemanticRelationsLoadingSection(noteId);
    return this.renderSemanticRelationsSection(relations, noteId);
  }

  async refreshSemanticRelations(noteId, requestSerial) {
    try {
      const relations = await fetchNoteRelations(noteId);
      if (requestSerial !== this.relationsRequestSerial || this.activeNote()?.id !== noteId) return;
      this.currentSemanticRelations = relations;
      this.semanticRelationsState = "loaded";
      const note = this.activeNote();
      const tab = this.activeTab();
      if (note?.id === noteId && tab) {
        const { forward, backward, tagRelated } = this.buildLocalRelationSignals(note, tab);
        this.refreshMainPathSection(note, this.buildMainPathOverviewV2({ forward, backward, tagRelated, relations, relationState: "loaded" }));
        this.refreshInspectorLinkSummaryNote();
      }
      const section = this.els.result?.querySelector?.("[data-note-relations-section]");
      if (!section || section.getAttribute("data-note-id") !== noteId) return;
      section.outerHTML = this.renderCurrentRelationSection(noteId, {
        relations,
        relationState: "loaded"
      });

      if (this.els.editorRelationsBelow) {
        this.els.editorRelationsBelow.innerHTML = "";
        this.els.editorRelationsBelow.classList.add("hidden");
      }
    } catch (error) {
      if (requestSerial !== this.relationsRequestSerial || this.activeNote()?.id !== noteId) return;
      this.currentSemanticRelations = null;
      this.semanticRelationsState = "error";
      const note = this.activeNote();
      const tab = this.activeTab();
      if (note?.id === noteId && tab) {
        const { forward, backward, tagRelated } = this.buildLocalRelationSignals(note, tab);
        this.refreshMainPathSection(note, this.buildMainPathOverviewV2({ forward, backward, tagRelated, relations: null, relationState: "error" }));
        this.refreshInspectorLinkSummaryNote();
      }
      const section = this.els.result?.querySelector?.("[data-note-relations-section]");
      if (!section || section.getAttribute("data-note-id") !== noteId) return;
      section.outerHTML = this.renderCurrentRelationSection(noteId, {
        relations: null,
        relationState: "error",
        error
      });

      if (this.els.editorRelationsBelow) {
        this.els.editorRelationsBelow.innerHTML = "";
        this.els.editorRelationsBelow.classList.add("hidden");
      }
    }
  }

  findSemanticRelation(relationId) {
    const id = String(relationId || "").trim();
    if (!id) return null;
    const outgoing = Array.isArray(this.currentSemanticRelations?.outgoingLinks) ? this.currentSemanticRelations.outgoingLinks : [];
    const backlinks = Array.isArray(this.currentSemanticRelations?.backlinks) ? this.currentSemanticRelations.backlinks : [];
    return [...outgoing, ...backlinks].find((link) => link?.id === id) || null;
  }

  openCreateRelationForm(options = {}) {
    const note = this.activeNote();
    if (!note?.id) return;
    this.setRelationPanelState("create", {
      noteId: note.id,
      targetNoteId: options?.targetNoteId,
      relationType: options?.relationType,
      entryHint: options?.entryHint,
      rationaleDraft: options?.rationaleDraft,
      insightQuestionDraft: options?.insightQuestionDraft,
      draftVariants: options?.draftVariants,
      selectedTemplateVariant: options?.selectedTemplateVariant
    });
    const section = this.els.result?.querySelector?.("[data-note-relations-section]");
    if (!section) return;
    section.outerHTML = this.renderCurrentRelationSection(note.id, {
      relations: this.currentSemanticRelations,
      relationState: this.semanticRelationsState
    });
    void this.refreshRelationTargetSearch("");
  }

  currentExplicitRelationCount() {
    if (this.semanticRelationsState !== "loaded" || !this.currentSemanticRelations) return null;
    const outgoing = Array.isArray(this.currentSemanticRelations?.outgoingLinks)
      ? this.currentSemanticRelations.outgoingLinks.filter((link) => !isHiddenRelation(link) && !isMarkdownWikilinkRelation(link))
      : [];
    const backlinks = Array.isArray(this.currentSemanticRelations?.backlinks)
      ? this.currentSemanticRelations.backlinks.filter((link) => !isHiddenRelation(link) && !isMarkdownWikilinkRelation(link))
      : [];
    return outgoing.length + backlinks.length;
  }

  openEditRelationForm(relationId, options = {}) {
    const note = this.activeNote();
    if (!note?.id) return;
    const link = this.findSemanticRelation(relationId);
    if (!link) {
      this.onStatus("这条关系还没有加载完成", "warn");
      return;
    }
    const section = this.els.result?.querySelector?.("[data-note-relations-section]");
    if (!section) return;
    this.setRelationPanelState("edit", {
      noteId: note.id,
      relationId,
      entryHint: options?.entryHint,
      rationaleDraft: options?.rationaleDraft,
      insightQuestionDraft: options?.insightQuestionDraft,
      draftVariants: options?.draftVariants,
      selectedTemplateVariant: options?.selectedTemplateVariant
    });
    section.outerHTML = this.renderCurrentRelationSection(note.id, {
      relations: this.currentSemanticRelations,
      relationState: this.semanticRelationsState
    });
  }

  normalizeTemplateDraftValue(value = "") {
    return String(value || "")
      .replace(/\r\n/g, "\n")
      .trim();
  }

  templateDraftHasConflict(currentValue = "", activeDraft = "", nextDraft = "") {
    const cleanCurrent = this.normalizeTemplateDraftValue(currentValue);
    if (!cleanCurrent) return false;
    const cleanActive = this.normalizeTemplateDraftValue(activeDraft);
    const cleanNext = this.normalizeTemplateDraftValue(nextDraft);
    return cleanCurrent !== cleanActive && cleanCurrent !== cleanNext;
  }

  appendTemplateDraft(currentValue = "", nextDraft = "", label = "", title = "备选模板") {
    const base = String(currentValue || "").trimEnd();
    const draft = String(nextDraft || "").trim();
    if (!draft) return base;
    if (!base) return draft;
    if (this.normalizeTemplateDraftValue(base).includes(this.normalizeTemplateDraftValue(draft))) return base;
    const cleanLabel = String(label || "").trim();
    return `${base}\n\n---\n${title}${cleanLabel ? `（${cleanLabel}）` : ""}\n${draft}`;
  }

  toggleTemplateVariantButtons(buttons = [], activeButton = null) {
    buttons.forEach((item) => {
      const active = item === activeButton;
      item.classList.toggle("is-active", active);
      item.setAttribute("aria-pressed", active ? "true" : "false");
    });
  }

  clearTemplateMergeChoice(choiceBox) {
    if (!choiceBox) return;
    choiceBox.hidden = true;
    choiceBox.innerHTML = "";
    [
      "pendingVariantKey",
      "pendingVariantLabel",
      "pendingRationaleDraft",
      "pendingInsightQuestionDraft",
      "pendingBoundaryDraft"
    ].forEach((key) => {
      delete choiceBox.dataset[key];
    });
  }

  showRelationTemplateMergeChoice(picker, button) {
    const choiceBox = picker?.querySelector?.("[data-relation-template-merge-choice]");
    if (!choiceBox || !button) return;
    const label = String(button.textContent || "").trim();
    choiceBox.dataset.pendingVariantKey = String(button.dataset.relationTemplateVariant || "").trim();
    choiceBox.dataset.pendingVariantLabel = label;
    choiceBox.dataset.pendingRationaleDraft = String(button.dataset.rationaleDraft || "");
    choiceBox.dataset.pendingInsightQuestionDraft = String(button.dataset.insightQuestionDraft || "");
    choiceBox.hidden = false;
    choiceBox.innerHTML = `
      <p>你已经改过当前草稿了。切到“${escapeHtml(label)}”时，要直接替换，还是先追加成备选？</p>
      <div class="semantic-template-merge-actions">
        <button class="mini-btn primary" type="button" data-relation-template-merge-action="replace">替换当前草稿</button>
        <button class="mini-btn" type="button" data-relation-template-merge-action="append">追加为备选</button>
        <button class="mini-btn is-ghost" type="button" data-relation-template-merge-action="cancel">先不切</button>
      </div>
    `;
  }

  commitRelationTemplateVariant(choiceBox, action = "replace") {
    if (!choiceBox) return;
    if (action === "cancel") {
      this.clearTemplateMergeChoice(choiceBox);
      return;
    }
    const picker = choiceBox.closest("[data-relation-template-picker]");
    const form = picker?.closest?.("[data-create-relation-form], [data-edit-relation-form]");
    if (!picker || !form) return;
    const cleanKey = String(choiceBox.dataset.pendingVariantKey || "").trim();
    const label = String(choiceBox.dataset.pendingVariantLabel || "").trim();
    const rationaleDraft = String(choiceBox.dataset.pendingRationaleDraft || "");
    const insightDraft = String(choiceBox.dataset.pendingInsightQuestionDraft || "");
    const targetButton =
      Array.from(picker.querySelectorAll("[data-relation-template-variant]")).find(
        (item) => String(item.dataset.relationTemplateVariant || "").trim() === cleanKey
      ) || picker.querySelector("[data-relation-template-variant]");
    if (!targetButton) {
      this.clearTemplateMergeChoice(choiceBox);
      return;
    }
    const rationale = form.querySelector('textarea[name="rationale"]');
    const insight = form.querySelector('textarea[name="insightQuestion"]');
    if (action === "append") {
      if (rationale) rationale.value = this.appendTemplateDraft(rationale.value, rationaleDraft, label, "备选关系理由");
      if (insight) insight.value = this.appendTemplateDraft(insight.value, insightDraft, label, "备选追问");
    } else {
      if (rationale) rationale.value = rationaleDraft;
      if (insight) insight.value = insightDraft;
    }
    this.toggleTemplateVariantButtons(form.querySelectorAll("[data-relation-template-variant]"), targetButton);
    const noteId = String(form.dataset.noteId || this.activeNote()?.id || "").trim();
    if (noteId && this.relationPanelState.noteId === noteId) {
      this.relationPanelState.selectedTemplateVariant = cleanKey;
      this.relationPanelState.rationaleDraft = rationale?.value || "";
      this.relationPanelState.insightQuestionDraft = insight?.value || "";
    }
    this.writeTemplateVariantPreference("relation", cleanKey);
    this.clearTemplateMergeChoice(choiceBox);
    this.refreshRelationQualityMeter(form);
    rationale?.focus?.();
  }

  applyRelationTemplateVariant(button) {
    const cleanKey = String(button?.dataset?.relationTemplateVariant || "").trim();
    if (!cleanKey) return;
    const form = button.closest("[data-create-relation-form], [data-edit-relation-form]");
    if (!form) return;
    const picker = button.closest("[data-relation-template-picker]");
    const activeButton = form.querySelector("[data-relation-template-variant].is-active");
    if (activeButton === button) {
      this.clearTemplateMergeChoice(picker?.querySelector?.("[data-relation-template-merge-choice]"));
      return;
    }
    const rationale = form.querySelector('textarea[name="rationale"]');
    const insight = form.querySelector('textarea[name="insightQuestion"]');
    const shouldConfirm =
      this.templateDraftHasConflict(rationale?.value || "", activeButton?.dataset?.rationaleDraft || "", button.dataset.rationaleDraft || "") ||
      this.templateDraftHasConflict(insight?.value || "", activeButton?.dataset?.insightQuestionDraft || "", button.dataset.insightQuestionDraft || "");
    if (shouldConfirm) {
      this.showRelationTemplateMergeChoice(picker, button);
      return;
    }
    if (rationale) rationale.value = String(button.dataset.rationaleDraft || "");
    if (insight) insight.value = String(button.dataset.insightQuestionDraft || "");
    this.toggleTemplateVariantButtons(form.querySelectorAll("[data-relation-template-variant]"), button);
    const noteId = String(form.dataset.noteId || this.activeNote()?.id || "").trim();
    if (noteId && this.relationPanelState.noteId === noteId) {
      this.relationPanelState.selectedTemplateVariant = cleanKey;
      this.relationPanelState.rationaleDraft = rationale?.value || "";
      this.relationPanelState.insightQuestionDraft = insight?.value || "";
    }
    this.writeTemplateVariantPreference("relation", cleanKey);
    this.clearTemplateMergeChoice(picker?.querySelector?.("[data-relation-template-merge-choice]"));
    this.refreshRelationQualityMeter(form);
    rationale?.focus?.();
  }

  relationTargetSearchRootId(note = this.activeNote()) {
    return rootBoxIdFromFolder(this.state, note?.folderId);
  }

  relatedPermanentNoteIds(note = this.activeNote(), limit = 40) {
    if (!note?.id) return [];
    const rootId = rootBoxIdFromFolder(this.state, note.folderId);
    return this.state.notes
      .filter((item) => {
        if (!item?.id || item.id === note.id) return false;
        const noteType = this.resolvedNoteType(item);
        if (noteType !== "permanent" && noteType !== "original") return false;
        return rootBoxIdFromFolder(this.state, item.folderId) === rootId;
      })
      .slice(0, Math.max(0, Number(limit || 40) || 40))
      .map((item) => item.id);
  }

  async runPermanentNoteAnalysis() {
    const note = this.activeNote();
    const tab = this.activeTab();
    if (!note?.id || !tab) return;
    const noteType = this.resolvedNoteType(note);
    if (noteType !== "permanent" && noteType !== "original") {
      this.onStatus("AI 分析目前只面向永久笔记。", "warn");
      return;
    }
    if (tab.dirty) {
      this.onStatus("正在先同步当前笔记，再运行本地 AI 分析...", "warn");
      const saved = await this.saveActiveNote({ trigger: "ai-analysis" });
      if (saved === false || (saved && typeof saved === "object" && saved.ok === false)) return;
    }
    const result = await this.onStateChange("run-note-ai-analysis", {
      noteId: note.id,
      relatedNoteIds: this.relatedPermanentNoteIds(note),
      persistArtifacts: true
    });
    if (result) {
      this.noteAiAnalysisByNoteId.set(note.id, result);
      this.renderRelated();
    }
  }

  openPermanentNoteAiInbox() {
    const note = this.activeNote();
    if (!note?.id) return;
    void this.onStateChange("open-note-ai-inbox", { noteId: note.id });
  }

  renderPermanentNoteAiAnalysisSection(note) {
    const noteType = this.resolvedNoteType(note);
    if (!note?.id || !["permanent", "original"].includes(noteType)) return "";
    const result = this.noteAiAnalysisByNoteId.get(note.id) || null;
    const analysis = result?.analysis || null;
    const reviewItems = result?.reviewItems || null;
    const relationCount = Array.isArray(analysis?.relationCandidates) ? analysis.relationCandidates.length : 0;
    const topicCandidates = Array.isArray(analysis?.topicCandidates) ? analysis.topicCandidates : [];
    const warningChecks = Array.isArray(analysis?.principleChecks)
      ? analysis.principleChecks.filter((item) => String(item?.level || "").toLowerCase() !== "pass")
      : [];
    const originalStatus = String(analysis?.originality?.status || "").trim();
    const distillation = analysis?.distillation || {};
    const suggestedFields = Array.isArray(reviewItems?.fieldSuggestions) ? reviewItems.fieldSuggestions.length : 0;
    const storedCount = Array.isArray(reviewItems?.storedArtifactIds)
      ? reviewItems.storedArtifactIds.length
      : Array.isArray(reviewItems?.artifacts)
        ? reviewItems.artifacts.length
        : 0;
    const topTopics = topicCandidates
      .map((item) => String(item?.topic || item?.label || "").trim())
      .filter(Boolean)
      .slice(0, 3);
    const topWarnings = warningChecks
      .map((item) => String(item?.message || item?.label || item?.checkId || "").trim())
      .filter(Boolean)
      .slice(0, 3);
    const actions = Array.isArray(analysis?.recommendedActions)
      ? analysis.recommendedActions.map((item) => String(item || "").trim()).filter(Boolean).slice(0, 3)
      : [];

    return `
      <section class="inspector-section semantic-relations-section" data-note-ai-analysis-section data-note-id="${escapeHtml(note.id)}">
        <div class="inspector-section-head">
          <div>
            <div class="inspector-section-title">AI 初判</div>
            <div class="inspector-section-note">${analysis ? "本地规则分析结果，所有输出仍需人工审阅。" : "用本地规则先看关联、原创度和原则缺口。"}</div>
          </div>
          <div class="semantic-relation-head-actions">
            ${analysis ? `<button class="mini-btn is-ghost" type="button" data-note-ai-analysis-open-inbox>查看待审</button>` : ""}
            <button class="mini-btn is-ghost" type="button" data-note-ai-analysis>${analysis ? "重新分析" : "AI 分析"}</button>
          </div>
        </div>
        ${
          analysis
            ? `
              <div class="semantic-relation-status">
                <span class="inspector-chip">关联候选 ${relationCount}</span>
                <span class="inspector-chip">原则提醒 ${warningChecks.length}</span>
                <span class="inspector-chip">字段建议 ${suggestedFields}</span>
                <span class="inspector-chip">待审项 ${storedCount}</span>
                ${originalStatus ? `<span class="inspector-chip">原创度 ${escapeHtml(originalStatus)}</span>` : ""}
              </div>
              <div class="semantic-relation-groups">
                <div class="semantic-relation-group">
                  <div class="semantic-relation-group-head">
                    <strong>观点压缩</strong>
                    <span>${escapeHtml(distillation?.status || "pending")}</span>
                  </div>
                  <div class="related-empty">
                    ${distillation?.thesis ? escapeHtml(distillation.thesis) : "还没有稳定 thesis，建议先补一句自己的判断。"}
                  </div>
                  ${
                    Array.isArray(distillation?.threeLineSummary) && distillation.threeLineSummary.length
                      ? `<div class="related-empty">${escapeHtml(distillation.threeLineSummary.slice(0, 3).join(" / "))}</div>`
                      : ""
                  }
                </div>
                ${
                  topTopics.length
                    ? `<div class="semantic-relation-group"><div class="semantic-relation-group-head"><strong>主题候选</strong><span>${topTopics.length}</span></div><div class="related-empty">${escapeHtml(topTopics.join(" / "))}</div></div>`
                    : ""
                }
                ${
                  topWarnings.length
                    ? `<div class="semantic-relation-group"><div class="semantic-relation-group-head"><strong>优先处理</strong><span>${topWarnings.length}</span></div><div class="related-empty">${escapeHtml(topWarnings.join(" / "))}</div></div>`
                    : ""
                }
                ${
                  actions.length
                    ? `<div class="semantic-relation-group"><div class="semantic-relation-group-head"><strong>下一步</strong><span>${actions.length}</span></div><div class="related-empty">${escapeHtml(actions.join(" / "))}</div></div>`
                    : ""
                }
              </div>
            `
            : `<div class="related-empty">分析结果会进入 AI Inbox；这里先显示摘要，不会自动确认关系、主题或改写笔记。</div>`
        }
      </section>
    `;
  }

  legacyPermanentNoteMainPathSummary(note, overview = {}) {
    const thesis = String(note?.thesis || "").trim();
    const summary = Array.isArray(note?.threeLineSummary) ? note.threeLineSummary.filter((item) => String(item || "").trim()) : [];
    const confirmed = String(note?.distillationStatus || "").trim().toLowerCase() === "confirmed";
    const relationState = String(overview.relationState || "loaded").trim();
    const explicitRelationCount = Number(overview.explicitRelationCount || 0);
    const wikilinkCount = Number(overview.wikilinkCount || 0);
    const connectedCount = explicitRelationCount + wikilinkCount;

    if (!thesis) {
      return {
        nextStep: "先写一句判断",
        summary: "这条永久笔记还没有稳定的判断句，先把它从材料变成可复用的观点。"
      };
    }
    if (summary.length < 3) {
      return {
        nextStep: "补成三句话压缩",
        summary: "判断已经出现，但还没有压缩成清晰的三句话，后面的关系和写作会发虚。"
      };
    }
    if (!confirmed) {
      return {
        nextStep: "确认观点",
        summary: "观点已经成形，下一步是明确确认它，避免它一直停在半成品状态。"
      };
    }
    if (relationState === "loading") {
      return {
        nextStep: "绛夊叧绯诲姞杞藉畬鎴?",
        summary: "鏄剧ず鍏崇郴杩樺湪璇诲彇涓紝鍏堜笉瑕佹妸褰撳墠璁℃暟褰撴垚鏈€缁堢粨鏋溿€?"
      };
    }
    if (relationState === "error") {
      return {
        nextStep: "鎵嬪姩琛ュ叧绯绘垨绋嶅悗閲嶈瘯",
        summary: "鏄剧ず鍏崇郴鏆傛椂璇诲彇澶辫触锛屽鏋滀綘鐭ラ亾杩欐潯绗旇搴旇鏈夎繛鎺ワ紝鍙互鍏堟墜鍔ㄨˉ寤烘垨绋嶅悗閲嶈瘯銆?"
      };
    }
    if (connectedCount === 0) {
      return {
        nextStep: "补关系，不要让它孤立",
        summary: "这条笔记已经能成立，但还没有真正接入网络。下一步先补一条有理由的关系。"
      };
    }
    return {
      nextStep: "进入主题或写作准备",
      summary: "这条笔记已经具备判断和连接，可以继续放进主题索引或加入写作篮。"
    };
  }

  legacyNoteThemeSignalSummary(note, overview = {}) {
    const relationState = String(overview.relationState || "loaded").trim();
    const explicitRelationCount = Number(overview.explicitRelationCount || 0);
    const wikilinkCount = Number(overview.wikilinkCount || 0);
    const tagRelatedCount = Number(overview.tagRelatedCount || 0);
    const themeSignalCount = Number(overview.themeSignalCount || 0);

    if (relationState === "loading") {
      return {
        status: "璇诲彇涓?",
        hint: "鏄剧ず鍏崇郴杩樺湪璇诲彇涓紝涓婚绾跨储鏆傛椂涓嶅仛鏈€缁堝垽鏂€?",
        badge: null,
        badgeLabel: "璇诲彇涓?"
      };
    }
    if (relationState === "error") {
      return {
        status: "璇诲彇澶辫触",
        hint: "鏄剧ず鍏崇郴鏆傛椂璇诲彇涓嶅埌锛屽鏋滄湰鏉ュ簲璇ユ湁涓婚绾跨储锛屽彲浠ュ厛鎵嬪姩琛ュ叧绯绘垨绋嶅悗閲嶈瘯銆?",
        badge: null,
        badgeLabel: "璇诲彇澶辫触"
      };
    }

    if (explicitRelationCount > 0) {
      return {
        status: `已连入 ${themeSignalCount || explicitRelationCount}`,
        hint: "已经出现带理由的连接，可以开始判断它在服务哪个主题。",
        badge: themeSignalCount || explicitRelationCount,
        badgeLabel: String(themeSignalCount || explicitRelationCount)
      };
    }
    if (wikilinkCount > 0 && tagRelatedCount === 0) {
      return {
        status: `链接线索 ${themeSignalCount || wikilinkCount}`,
        hint: "已经有正文里的关联线索，下一步是把这条连接的理由写出来。",
        badge: themeSignalCount || wikilinkCount,
        badgeLabel: String(themeSignalCount || wikilinkCount)
      };
    }
    if (tagRelatedCount > 0 && wikilinkCount === 0) {
      return {
        status: `标签线索 ${themeSignalCount || tagRelatedCount}`,
        hint: "目前只有标签重合，还不足以直接当成主题。先补一条有理由的关系。",
        badge: themeSignalCount || tagRelatedCount,
        badgeLabel: String(themeSignalCount || tagRelatedCount)
      };
    }
    if (wikilinkCount > 0 || tagRelatedCount > 0) {
      return {
        status: `主题线索 ${themeSignalCount || wikilinkCount + tagRelatedCount}`,
        hint:
          wikilinkCount > 0 && tagRelatedCount > 0
            ? "已经同时有链接线索和标签接近，但还没形成显式关系。先把最关键的一条关系写清楚。"
            : "已经有基础线索，但还需要把“为什么相关”说清楚。",
        badge: themeSignalCount || wikilinkCount + tagRelatedCount,
        badgeLabel: String(themeSignalCount || wikilinkCount + tagRelatedCount)
      };
    }
    return {
      status: "待聚合",
      hint: "先让它和其他笔记形成真实连接，再谈主题入口。",
      badge: 0,
      badgeLabel: "0"
    };
  }

  legacyRenderPermanentNoteMainPathSection(note, overview = {}) {
    const noteType = this.resolvedNoteType(note);
    if (!note?.id || (noteType !== "permanent" && noteType !== "original")) return "";
    const thesis = String(note.thesis || "").trim();
    const summary = Array.isArray(note.threeLineSummary) ? note.threeLineSummary.filter((item) => String(item || "").trim()) : [];
    const confirmed = String(note.distillationStatus || "").trim().toLowerCase() === "confirmed";
    const relationState = String(overview.relationState || "loaded").trim();
    const explicitRelationCount = Number(overview.explicitRelationCount || 0);
    const wikilinkCount = Number(overview.wikilinkCount || 0);
    const themeInfo = this.legacyNoteThemeSignalSummary(note, overview);
    const { nextStep, summary: noteSummary } = this.legacyPermanentNoteMainPathSummary(note, overview);
    const relationCountLabel =
      relationState === "loading"
        ? "璇诲彇涓?"
        : relationState === "error"
          ? "璇诲彇澶辫触"
          : String(explicitRelationCount + wikilinkCount);
    const primaryAction =
      !thesis || summary.length < 3 || !confirmed
        ? "distillation"
        : relationState === "loading" || relationState === "error" || explicitRelationCount + wikilinkCount === 0
          ? "relations"
          : "writing";
    const steps = [
      {
        label: "观点提纯",
        status: !thesis ? "待开始" : summary.length < 3 ? "进行中" : confirmed ? "已确认" : "待确认",
        hint: !thesis ? "先写一句判断" : summary.length < 3 ? "补三句话压缩" : confirmed ? "继续往关系和主题走" : "确认这条观点",
        action: "distillation",
        actionLabel: "继续提纯"
      },
      {
        label: "关系连接",
        status: explicitRelationCount ? `已建 ${explicitRelationCount}` : wikilinkCount ? `wikilink ${wikilinkCount}` : "待建立",
        hint: explicitRelationCount ? "已经有带理由的关系" : wikilinkCount ? "有基础链接，值得补理由" : "先连出第一条关系",
        action: "relations",
        actionLabel: "处理关系"
      },
      {
        label: "主题索引",
        status: themeInfo.status,
        hint: themeInfo.hint,
        action: "graph",
        actionLabel: "看图谱"
      },
      {
        label: "写作中心",
        status: confirmed ? "可进入写作中心" : "未就绪",
        hint: confirmed ? "可加入写作篮继续推进" : "先确认观点，再进入写作中心",
        action: "writing",
        actionLabel: "进入写作"
      }
    ];

    return `
      <section class="inspector-section semantic-relations-section" data-note-main-path-section data-note-id="${escapeHtml(note.id)}">
        <div class="inspector-section-head">
          <div>
            <div class="inspector-section-title">主路径下一步</div>
            <div class="inspector-section-note">${escapeHtml(noteSummary)}</div>
          </div>
          <span class="inspector-chip">${escapeHtml(nextStep)}</span>
        </div>
        <div class="semantic-relation-status">
          <span class="inspector-chip">判断 ${escapeHtml(thesis ? "已有" : "缺失")}</span>
          <span class="inspector-chip">压缩 ${summary.length}/3</span>
          <span class="inspector-chip">关系 ${explicitRelationCount + wikilinkCount}</span>
          <span class="inspector-chip">主题线索 ${themeInfo.badge}</span>
        </div>
        <div class="semantic-relation-groups">
          ${steps
            .map(
              (step) => `
                <div class="semantic-relation-group">
                  <div class="semantic-relation-group-head">
                    <strong>${escapeHtml(step.label)}</strong>
                    <span>${escapeHtml(step.status)}${step.action === primaryAction ? " · 当前重点" : ""}</span>
                  </div>
                  <div class="related-empty">${escapeHtml(step.hint)}</div>
                  <div class="semantic-relation-actions">
                    <button class="mini-btn ${step.action === primaryAction ? "primary" : "is-ghost"}" type="button" data-note-main-route-action="${escapeHtml(step.action)}">${escapeHtml(step.actionLabel)}</button>
                  </div>
                </div>
              `
            )
            .join("")}
        </div>
      </section>
    `;
  }

  buildLocalRelationSignals(note, tab) {
    if (!note?.id || !tab) return { forward: [], backward: [], tagRelated: [] };
    const links = parseLinks(tab.body || "");
    const tags = parseTags(tab.body || "");
    const rootId = rootBoxIdFromFolder(this.state, note.folderId);
    const scoped = this.state.notes.filter((n) => rootBoxIdFromFolder(this.state, n.folderId) === rootId && n.id !== note.id);
    const backlinkCandidates = this.state.notes.filter((n) => rootBoxIdFromFolder(this.state, n.folderId) === rootId);
    const resolvedForwardIds = new Set(
      links
        .map((token) => this.resolveLinkToken(token, scoped))
        .filter((x) => x?.note?.id)
        .map((x) => x.note.id)
    );
    const forward = scoped.filter((n) => resolvedForwardIds.has(n.id));
    const backward = scoped.filter((n) => {
      const refs = parseLinks(n.body || "");
      return refs.some((token) => this.resolveLinkToken(token, backlinkCandidates)?.note?.id === note.id);
    });
    const tagRelated = tags.length
      ? scoped
          .filter((n) => {
            const noteTags = Array.isArray(n.tags) && n.tags.length ? n.tags : parseTags(String(n.body || ""));
            return noteTags.some((tg) => tags.includes(tg));
          })
          .slice(0, 20)
      : [];
    return { forward, backward, tagRelated };
  }

  buildMainPathOverviewV2({ forward = [], backward = [], tagRelated = [], relations = null, relationState = "loaded" } = {}) {
    const outgoing = Array.isArray(relations?.outgoingLinks)
      ? relations.outgoingLinks.filter((link) => !isHiddenRelation(link) && !isMarkdownWikilinkRelation(link))
      : [];
    const backlinks = Array.isArray(relations?.backlinks)
      ? relations.backlinks.filter((link) => !isHiddenRelation(link) && !isMarkdownWikilinkRelation(link))
      : [];
    const explicitRelations = [...outgoing, ...backlinks];
    return {
      relationState: String(relationState || "loaded").trim() || "loaded",
      explicitRelationCount: explicitRelations.length,
      thinExplicitRelationCount: explicitRelations.filter(
        (link) => String(link?.rationaleQualityLevel || "").trim().toLowerCase() === "basic"
      ).length,
      wikilinkCount: forward.length + backward.length,
      tagRelatedCount: tagRelated.length,
      themeSignalCount: new Set([
        ...forward.map((item) => item.id),
        ...backward.map((item) => item.id),
        ...tagRelated.map((item) => item.id)
      ]).size
    };
  }

  permanentNoteMainPathSummaryV2(note, overview = {}) {
    const thesis = String(note?.thesis || "").trim();
    const summary = Array.isArray(note?.threeLineSummary) ? note.threeLineSummary.filter((item) => String(item || "").trim()) : [];
    const confirmed = String(note?.distillationStatus || "").trim().toLowerCase() === "confirmed";
    const writingInfo = this.noteWritingReadinessV2(note, overview);
    const writingContinuation = this.noteWritingContinuationV2(note, overview);
    const relationState = String(overview.relationState || "loaded").trim();
    const explicitRelationCount = Number(overview.explicitRelationCount || 0);
    const thinExplicitRelationCount = Number(overview.thinExplicitRelationCount || 0);
    const wikilinkCount = Number(overview.wikilinkCount || 0);
    const connectedCount = explicitRelationCount;

    if (!thesis) {
      return {
        nextStep: "先写一句判断",
        summary: "先把这条笔记写成一句可复用的判断。"
      };
    }
    if (summary.length < 3) {
      return {
        nextStep: "补成三句话压缩",
        summary: "判断已经出现，但还缺三句话压缩。"
      };
    }
    if (!confirmed) {
      return {
        nextStep: "确认观点",
        summary: "观点已经成形，但还没进入 confirmed。"
      };
    }
    if (relationState === "loading") {
      return {
        nextStep: "等关系加载完成",
        summary: "关系还在读取，等结果稳定后再判断下一步。"
      };
    }
    if (relationState === "error") {
      return {
        nextStep: "手动补关系或稍后重试",
        summary: "关系读取失败，先手动补关系或稍后重试。"
      };
    }
    if (connectedCount > 0 && thinExplicitRelationCount > 0) {
      return {
        nextStep: "补关系理由",
        summary: `已经有 ${explicitRelationCount} 条显式关系，但其中还有 ${thinExplicitRelationCount} 条理由偏薄。先把“为什么成立”写具体，再继续推进主题或写作。`
      };
    }
    if (connectedCount === 0) {
      if (wikilinkCount > 0 && Number(overview.tagRelatedCount || 0) > 0) {
        return {
          nextStep: "把线索收成显式关系",
          summary: "已经同时出现正文里的 wikilink 和标签接近，但它们还只是线索，不是可复用的关系。先挑一条最关键的连接，把“为什么相关”写成显式关系。"
        };
      }
      if (wikilinkCount > 0) {
        return {
          nextStep: "补关系理由",
          summary: "已经有正文里的 wikilink 线索，下一步把“为什么相关”写成显式关系。"
        };
      }
      if (Number(overview.tagRelatedCount || 0) > 0) {
        return {
          nextStep: "别只停在标签重合",
          summary: "现在还只有标签上的接近，先挑一条最关键的关系写清楚，不要把标签重合直接当成网络连接。"
        };
      }
      return {
        nextStep: "补关系，不要让它孤立",
        summary: "这条笔记还没真正接入网络，先补第一条有理由的关系。"
      };
    }
    if (writingInfo.level === "project_ready") {
      if (writingContinuation?.projectId) {
        return {
          nextStep: writingContinuation.status,
          summary: writingContinuation.hint
        };
      }
      return {
        nextStep: "先创建项目",
        summary: "这条笔记已经到创建项目阶段；先创建项目，再继续推进后续结构和分析。"
      };
    }
    if (writingInfo.level === "strong_model_ready") {
      if (writingContinuation?.projectId) {
        return {
          nextStep: writingContinuation.status,
          summary: writingContinuation.hint
        };
      }
      return {
        nextStep: "先创建项目",
        summary: "这条笔记已经具备强模型分析前的材料质量；先创建项目，项目就绪后再做强模型分析。"
      };
    }
    if (writingInfo.level === "basket_ready") {
      return {
        nextStep: "补边界/反例",
        summary: "关系已经接上，但还缺适用边界或反例；先补这一格，再决定是否进入写作中心。"
      };
    }
    return {
      nextStep: writingInfo.status,
      summary: writingInfo.hint
    };
  }

  permanentNoteDistillationStepV2(note, overview = {}, writingInfo = null) {
    const thesis = String(note?.thesis || "").trim();
    const summary = Array.isArray(note?.threeLineSummary) ? note.threeLineSummary.filter((item) => String(item || "").trim()) : [];
    const confirmed = String(note?.distillationStatus || "").trim().toLowerCase() === "confirmed";
    const relationState = String(overview.relationState || "loaded").trim();
    const explicitRelationCount = Number(overview.explicitRelationCount || 0);
    const readiness = writingInfo || this.noteWritingReadinessV2(note, overview);

    if (!thesis) {
      return {
        status: "待开始",
        hint: "先写一句判断。",
        actionLabel: "继续提纯",
        focusTarget: "thesis"
      };
    }
    if (summary.length < 3) {
      return {
        status: "进行中",
        hint: "补齐三句话压缩。",
        actionLabel: "继续提纯",
        focusTarget: "thesis"
      };
    }
    if (!confirmed) {
      return {
        status: "待确认",
        hint: "把这条观点确认下来。",
        actionLabel: "继续提纯",
        focusTarget: "thesis"
      };
    }
    if (relationState === "loaded" && explicitRelationCount > 0 && readiness.level === "basket_ready") {
      return {
        status: "待补边界",
        hint: "关系已经接上，但还缺适用边界或反例。",
        actionLabel: "补边界/反例",
        focusTarget: "boundary"
      };
    }
    return {
      status: "已确认",
      hint: "可以往关系和主题推进。",
      actionLabel: "继续提纯",
      focusTarget: "thesis"
    };
  }

  permanentNoteWritingStepV2(note, overview = {}, writingInfo = null) {
    const readiness = writingInfo || this.noteWritingReadinessV2(note, overview);
    const writingContinuation = this.noteWritingContinuationV2(note, overview);
    const routeMode =
      readiness.level === "project_ready" || readiness.level === "strong_model_ready"
        ? "project"
        : readiness.level === "needs_distillation"
          ? "distillation"
          : readiness.level === "blocked_authorship" || readiness.level === "blocked_draft"
            ? "requirements"
            : "basket";

    if (routeMode === "project") {
      if (writingContinuation?.projectId) {
        return {
          status: writingContinuation.status,
          hint: writingContinuation.hint,
          actionLabel: writingContinuation.actionLabel,
          routeMode
        };
      }
      return {
        status: "先创建项目",
        hint:
          readiness.level === "strong_model_ready"
            ? "这条笔记已经具备强模型分析前的材料质量；先创建项目，项目就绪后再做强模型分析。"
            : "这条笔记已经到创建项目阶段；先创建项目，再继续推进后续结构和分析。",
        actionLabel: "创建项目",
        routeMode
      };
    }

    if (routeMode === "distillation") {
      return {
        status: readiness.status,
        hint: readiness.hint,
        actionLabel: readiness.actionLabel || "先确认观点/三句话",
        routeMode
      };
    }

    if (routeMode === "requirements") {
      return {
        status: readiness.status,
        hint: readiness.hint,
        actionLabel: readiness.actionLabel || readiness.status || "先完成写作要求",
        routeMode
      };
    }

    if (routeMode === "basket" && writingContinuation?.projectId) {
      return {
        status: writingContinuation.status,
        hint: writingContinuation.hint,
        actionLabel: writingContinuation.actionLabel,
        routeMode
      };
    }

    return {
      status: readiness.status,
      hint: readiness.hint,
      actionLabel: readiness.actionLabel,
      routeMode
    };
  }

  noteThemeSignalSummaryV2(note, overview = {}) {
    const relationState = String(overview.relationState || "loaded").trim();
    const explicitRelationCount = Number(overview.explicitRelationCount || 0);
    const wikilinkCount = Number(overview.wikilinkCount || 0);
    const tagRelatedCount = Number(overview.tagRelatedCount || 0);
    const themeSignalCount = Number(overview.themeSignalCount || 0);

    if (relationState === "loading") {
      return {
        status: "读取中",
        hint: "显式关系仍在读取中，主题线索暂时不做最终判断。",
        badge: null,
        badgeLabel: "读取中"
      };
    }
    if (relationState === "error") {
      return {
        status: "读取失败",
        hint: "显式关系暂时读不到；如果本来应该有主题线索，可以先手动补关系或稍后重试。",
        badge: null,
        badgeLabel: "读取失败"
      };
    }
    if (explicitRelationCount > 0) {
      return {
        status: `已连入 ${themeSignalCount || explicitRelationCount}`,
        hint: "已经出现带理由的连接，可以开始判断它在服务哪个主题。",
        badge: themeSignalCount || explicitRelationCount,
        badgeLabel: String(themeSignalCount || explicitRelationCount)
      };
    }
    if (wikilinkCount > 0 && tagRelatedCount === 0) {
      return {
        status: `链接线索 ${themeSignalCount || wikilinkCount}`,
        hint: "已经有正文链接线索，下一步是把这条连接的理由写出来。",
        badge: themeSignalCount || wikilinkCount,
        badgeLabel: String(themeSignalCount || wikilinkCount)
      };
    }
    if (tagRelatedCount > 0 && wikilinkCount === 0) {
      return {
        status: `标签线索 ${themeSignalCount || tagRelatedCount}`,
        hint: "目前只有标签重合，还不足以直接当成主题。先补一条有理由的关系。",
        badge: themeSignalCount || tagRelatedCount,
        badgeLabel: String(themeSignalCount || tagRelatedCount)
      };
    }
      if (wikilinkCount > 0 || tagRelatedCount > 0) {
        return {
          status: `混合线索 ${themeSignalCount || wikilinkCount + tagRelatedCount}`,
          hint: "已经同时有链接线索和标签接近，但还没形成显式关系。先把最关键的一条关系写清楚。",
          badge: themeSignalCount || wikilinkCount + tagRelatedCount,
          badgeLabel: String(themeSignalCount || wikilinkCount + tagRelatedCount)
        };
      }
    return {
      status: "待聚合",
      hint: "先让它和其他笔记形成真实连接，再谈主题入口。",
      badge: 0,
      badgeLabel: "0"
    };
  }

  noteWritingReadinessV2(note, overview = {}) {
    return deriveNoteWritingReadiness(note, overview);
  }

  noteWritingContinuationV2(note, overview = {}) {
    if (overview?.writingContinuation?.projectId) return overview.writingContinuation;
    return this.resolveNoteWritingContinuation?.(note, overview) || null;
  }

  renderPermanentNoteMainPathSectionV2(note, overview = {}) {
    const noteType = this.resolvedNoteType(note);
    if (!note?.id || (noteType !== "permanent" && noteType !== "original")) return "";
    const thesis = String(note.thesis || "").trim();
    const summary = Array.isArray(note.threeLineSummary) ? note.threeLineSummary.filter((item) => String(item || "").trim()) : [];
    const confirmed = String(note.distillationStatus || "").trim().toLowerCase() === "confirmed";
    const relationState = String(overview.relationState || "loaded").trim();
    const explicitRelationCount = Number(overview.explicitRelationCount || 0);
    const wikilinkCount = Number(overview.wikilinkCount || 0);
    const thinExplicitRelationCount = Number(overview.thinExplicitRelationCount || 0);
    const themeInfo = this.noteThemeSignalSummaryV2(note, overview);
    const writingInfo = this.noteWritingReadinessV2(note, overview);
    const distillationInfo = this.permanentNoteDistillationStepV2(note, overview, writingInfo);
    const writingStep = this.permanentNoteWritingStepV2(note, overview, writingInfo);
    const { nextStep, summary: noteSummary } = this.permanentNoteMainPathSummaryV2(note, overview);
    const relationCountLabel =
      relationState === "loading"
        ? "读取中"
        : relationState === "error"
          ? "读取失败"
          : String(explicitRelationCount);
    const primaryAction =
      !thesis || summary.length < 3 || !confirmed
        ? "distillation"
        : distillationInfo.focusTarget === "boundary"
          ? "distillation"
        : relationState === "loading" || relationState === "error" || explicitRelationCount === 0 || thinExplicitRelationCount > 0
          ? "relations"
          : "writing";
    const steps = [
      {
        label: "观点提纯",
        status: distillationInfo.status,
        hint: distillationInfo.hint,
        action: "distillation",
        actionLabel: distillationInfo.actionLabel,
        focusTarget: distillationInfo.focusTarget
      },
      {
        label: "关系连接",
        status:
          relationState === "loading"
            ? "读取中"
            : relationState === "error"
              ? "读取失败"
              : explicitRelationCount
                ? thinExplicitRelationCount > 0
                  ? `理由待补 ${thinExplicitRelationCount}`
                  : `已建 ${explicitRelationCount}`
                : wikilinkCount
                  ? Number(overview.tagRelatedCount || 0) > 0
                    ? `混合线索 ${themeInfo.badgeLabel || String(themeInfo.badge ?? wikilinkCount + Number(overview.tagRelatedCount || 0))}`
                    : `链接线索 ${wikilinkCount}`
                  : "待建立",
        hint:
          relationState === "loading"
            ? "先等显式关系读取完成。"
            : relationState === "error"
              ? "读取失败，但仍然可以手动补建。"
                : explicitRelationCount
                  ? thinExplicitRelationCount > 0
                    ? "已经连上关系，但还有理由偏薄的连接，先把它写具体。"
                    : "已经有带理由的关系。"
                  : wikilinkCount
                    ? Number(overview.tagRelatedCount || 0) > 0
                      ? "已经同时有链接线索和标签接近，但还没形成显式关系。先把最关键的关系写出来。"
                      : "已经有正文链接线索，下一步把关系为什么成立写清楚。"
                    : Number(overview.tagRelatedCount || 0) > 0
                      ? "现在只有标签上的接近，先挑一条最关键的关系写出来。"
                      : "先连出第一条关系。",
          action: "relations",
          actionLabel:
            thinExplicitRelationCount > 0
              ? "补关系理由"
              : wikilinkCount > 0
                ? Number(overview.tagRelatedCount || 0) > 0
                  ? "把线索收成显式关系"
                  : "补关系理由"
                : Number(overview.tagRelatedCount || 0) > 0
                  ? "从标签线索补关系"
                  : "补第一条关系"
        },
      {
        label: "主题索引",
        status: themeInfo.status,
        hint: themeInfo.hint,
        action: "graph",
        actionLabel: "看图谱"
      },
      {
        label: "写作中心",
        status: writingStep.status,
        hint: writingStep.hint,
        action: "writing",
        actionLabel: writingStep.actionLabel,
        routeMode: writingStep.routeMode
      }
    ];

    return `
      <section class="inspector-section semantic-relations-section" data-note-main-path-section data-note-id="${escapeHtml(note.id)}">
        <div class="inspector-section-head">
          <div>
            <div class="inspector-section-title">主路径下一步</div>
            <div class="inspector-section-note">${escapeHtml(noteSummary)}</div>
          </div>
          <span class="inspector-chip">${escapeHtml(nextStep)}</span>
        </div>
        <div class="semantic-relation-status">
          <span class="inspector-chip">判断 ${escapeHtml(thesis ? "已有" : "缺失")}</span>
          <span class="inspector-chip">压缩 ${summary.length}/3</span>
          <span class="inspector-chip">关系 ${escapeHtml(relationCountLabel)}</span>
          <span class="inspector-chip">${escapeHtml(
            themeInfo.status ||
              (Number(overview.tagRelatedCount || 0) > 0 && Number(overview.wikilinkCount || 0) > 0
                ? `混合线索 ${themeInfo.badgeLabel || String(themeInfo.badge ?? 0)}`
                : Number(overview.tagRelatedCount || 0) > 0
                  ? `标签线索 ${themeInfo.badgeLabel || String(themeInfo.badge ?? 0)}`
                  : `链接线索 ${themeInfo.badgeLabel || String(themeInfo.badge ?? 0)}`)
          )}</span>
        </div>
        <div class="semantic-relation-groups">
          ${steps
            .map(
              (step) => `
                <div class="semantic-relation-group">
                  <div class="semantic-relation-group-head">
                    <strong>${escapeHtml(step.label)}</strong>
                    <span>${escapeHtml(step.status)}${step.action === primaryAction ? " · 当前重点" : ""}</span>
                  </div>
                  <div class="related-empty">${escapeHtml(step.hint)}</div>
                  <div class="semantic-relation-actions">
                    <button class="mini-btn ${step.action === primaryAction ? "primary" : "is-ghost"}" type="button" data-note-main-route-action="${escapeHtml(step.action)}"${step.focusTarget ? ` data-note-main-route-focus="${escapeHtml(step.focusTarget)}"` : ""}${step.routeMode ? ` data-note-main-route-mode="${escapeHtml(step.routeMode)}"` : ""}>${escapeHtml(step.actionLabel)}</button>
                  </div>
                </div>
              `
            )
            .join("")}
        </div>
      </section>
    `;
  }

  legacyBuildMainPathOverview({ forward = [], backward = [], tagRelated = [], relations = null } = {}) {
    const outgoing = Array.isArray(relations?.outgoingLinks)
      ? relations.outgoingLinks.filter((link) => !isHiddenRelation(link) && !isMarkdownWikilinkRelation(link))
      : [];
    const backlinks = Array.isArray(relations?.backlinks)
      ? relations.backlinks.filter((link) => !isHiddenRelation(link) && !isMarkdownWikilinkRelation(link))
      : [];
    return {
      explicitRelationCount: outgoing.length + backlinks.length,
      wikilinkCount: forward.length + backward.length,
      tagRelatedCount: tagRelated.length,
      themeSignalCount: new Set([
        ...forward.map((item) => item.id),
        ...backward.map((item) => item.id),
        ...tagRelated.map((item) => item.id)
      ]).size
    };
  }

  refreshMainPathSection(note, overview = {}) {
    if (!note?.id) return;
    const section = this.els.result?.querySelector?.("[data-note-main-path-section]");
    if (!section || section.getAttribute("data-note-id") !== note.id) return;
    section.outerHTML = this.renderPermanentNoteMainPathSectionV2(note, overview);
  }

  renderInspectorLinkSummaryNote() {
    return `
      <div class="inspector-section-note" data-inspector-link-summary-note>
        ${
          this.semanticRelationsState === "error"
            ? "上面这组数字只统计正文里的本地链接；显式关系当前读取失败，请以主路径卡片和语义关系区的错误提示为准。"
            : this.semanticRelationsState === "loading"
              ? "上面这组数字只统计正文里的本地链接；显式关系仍在读取中，稍后会在主路径卡片和语义关系区里更新。"
              : "上面这组数字只统计正文里的本地链接；显式关系请结合主路径卡片和语义关系区一起判断。"
        }
      </div>
    `;
  }

  refreshInspectorLinkSummaryNote() {
    const mount = this.els.result?.querySelector?.("[data-inspector-link-summary-note]");
    if (!mount) return;
    mount.outerHTML = this.renderInspectorLinkSummaryNote();
  }

  setDistillationPrefill(noteId = "", options = {}) {
    const cleanNoteId = String(noteId || "").trim();
    const preferredTemplateVariant = cleanNoteId
      ? this.readTemplateVariantPreference("distillation", options?.draftVariants || [], options?.selectedTemplateVariant || "")
      : "";
    const rememberedTemplateVariant = cleanNoteId ? this.templateVariantPreferenceMeta("distillation", options?.draftVariants || []) : { key: "", label: "" };
    const normalized = normalizeDistillationTemplateVariants(options?.draftVariants || [], preferredTemplateVariant);
    this.distillationPrefillState = {
      noteId: cleanNoteId,
      boundaryDraft: cleanNoteId ? String(options?.boundaryDraft || "").trim() : "",
      draftVariants: cleanNoteId ? normalized.items : [],
      selectedTemplateVariant: cleanNoteId ? normalized.selectedKey : "",
      rememberedTemplateVariantLabel:
        cleanNoteId && rememberedTemplateVariant.key && rememberedTemplateVariant.key === normalized.selectedKey ? rememberedTemplateVariant.label : ""
    };
  }

  currentDistillationPrefill(noteId = "") {
    const cleanNoteId = String(noteId || "").trim();
    if (!cleanNoteId || this.distillationPrefillState.noteId !== cleanNoteId) {
      return {
        noteId: cleanNoteId,
        boundaryDraft: "",
        draftVariants: [],
        selectedTemplateVariant: "",
        rememberedTemplateVariantLabel: ""
      };
    }
    return this.distillationPrefillState;
  }

  showDistillationTemplateMergeChoice(picker, button) {
    const choiceBox = picker?.querySelector?.("[data-distillation-template-merge-choice]");
    if (!choiceBox || !button) return;
    const label = String(button.textContent || "").trim();
    choiceBox.dataset.pendingVariantKey = String(button.dataset.distillationTemplateVariant || "").trim();
    choiceBox.dataset.pendingVariantLabel = label;
    choiceBox.dataset.pendingBoundaryDraft = String(button.dataset.boundaryDraft || "");
    choiceBox.hidden = false;
    choiceBox.innerHTML = `
      <p>你已经改过这段边界草稿了。切到“${escapeHtml(label)}”时，要直接替换，还是先追加成备选？</p>
      <div class="semantic-template-merge-actions">
        <button class="mini-btn primary" type="button" data-distillation-template-merge-action="replace">替换当前草稿</button>
        <button class="mini-btn" type="button" data-distillation-template-merge-action="append">追加为备选</button>
        <button class="mini-btn is-ghost" type="button" data-distillation-template-merge-action="cancel">先不切</button>
      </div>
    `;
  }

  commitDistillationTemplateVariant(choiceBox, action = "replace") {
    if (!choiceBox) return;
    if (action === "cancel") {
      this.clearTemplateMergeChoice(choiceBox);
      return;
    }
    const picker = choiceBox.closest("[data-distillation-template-picker]");
    const form = picker?.closest?.("[data-note-distillation-form]");
    if (!picker || !form) return;
    const cleanKey = String(choiceBox.dataset.pendingVariantKey || "").trim();
    const label = String(choiceBox.dataset.pendingVariantLabel || "").trim();
    const boundaryDraft = String(choiceBox.dataset.pendingBoundaryDraft || "");
    const targetButton =
      Array.from(picker.querySelectorAll("[data-distillation-template-variant]")).find(
        (item) => String(item.dataset.distillationTemplateVariant || "").trim() === cleanKey
      ) || picker.querySelector("[data-distillation-template-variant]");
    if (!targetButton) {
      this.clearTemplateMergeChoice(choiceBox);
      return;
    }
    const boundary = form.querySelector('textarea[name="boundaryOrCounterpoint"]');
    if (boundary) {
      boundary.value =
        action === "append"
          ? this.appendTemplateDraft(boundary.value, boundaryDraft, label, "备选边界视角")
          : boundaryDraft;
    }
    this.toggleTemplateVariantButtons(form.querySelectorAll("[data-distillation-template-variant]"), targetButton);
    const noteId = String(form.closest("[data-note-distillation-section]")?.getAttribute("data-note-id") || this.activeNote()?.id || "").trim();
    if (noteId && this.distillationPrefillState.noteId === noteId) {
      this.distillationPrefillState.selectedTemplateVariant = cleanKey;
      this.distillationPrefillState.boundaryDraft = boundary?.value || "";
    }
    this.writeTemplateVariantPreference("distillation", cleanKey);
    this.clearTemplateMergeChoice(choiceBox);
    this.refreshDistillationQuality(form);
    boundary?.focus?.();
  }

  applyDistillationTemplateVariant(button) {
    const cleanKey = String(button?.dataset?.distillationTemplateVariant || "").trim();
    if (!cleanKey) return;
    const form = button.closest("[data-note-distillation-form]");
    if (!form) return;
    const picker = button.closest("[data-distillation-template-picker]");
    const activeButton = form.querySelector("[data-distillation-template-variant].is-active");
    if (activeButton === button) {
      this.clearTemplateMergeChoice(picker?.querySelector?.("[data-distillation-template-merge-choice]"));
      return;
    }
    const boundary = form.querySelector('textarea[name="boundaryOrCounterpoint"]');
    const shouldConfirm = this.templateDraftHasConflict(
      boundary?.value || "",
      activeButton?.dataset?.boundaryDraft || "",
      button.dataset.boundaryDraft || ""
    );
    if (shouldConfirm) {
      this.showDistillationTemplateMergeChoice(picker, button);
      return;
    }
    if (boundary) boundary.value = String(button.dataset.boundaryDraft || "");
    this.toggleTemplateVariantButtons(form.querySelectorAll("[data-distillation-template-variant]"), button);
    const noteId = String(form.closest("[data-note-distillation-section]")?.getAttribute("data-note-id") || this.activeNote()?.id || "").trim();
    if (noteId && this.distillationPrefillState.noteId === noteId) {
      this.distillationPrefillState.selectedTemplateVariant = cleanKey;
      this.distillationPrefillState.boundaryDraft = boundary?.value || "";
    }
    this.writeTemplateVariantPreference("distillation", cleanKey);
    this.clearTemplateMergeChoice(picker?.querySelector?.("[data-distillation-template-merge-choice]"));
    this.refreshDistillationQuality(form);
    boundary?.focus?.();
  }

  renderPermanentNoteDistillationSection(note) {
    const noteType = this.resolvedNoteType(note);
    if (!note?.id || (noteType !== "permanent" && noteType !== "original")) return "";
    const thesis = String(note.thesis || "").trim();
    const summary = Array.isArray(note.threeLineSummary) ? note.threeLineSummary : [];
    const summaryLines = [0, 1, 2].map((idx) => String(summary[idx] || "").trim());
    const distillationPrefill = this.currentDistillationPrefill(note.id);
    const distillationVariants = normalizeDistillationTemplateVariants(
      distillationPrefill.draftVariants || [],
      distillationPrefill.selectedTemplateVariant || ""
    );
    const rememberedTemplateVariantLabel = String(distillationPrefill.rememberedTemplateVariantLabel || "").trim();
    const boundaryOrCounterpoint = String(note.boundaryOrCounterpoint || "").trim() || String(distillationPrefill.boundaryDraft || "").trim();
    const qualityWarnings = collectDistillationWarnings({
      title: note.title,
      body: note.body,
      thesis,
      threeLineSummary: summaryLines,
      boundaryOrCounterpoint
    });
    const filledCount = (thesis ? 1 : 0) + summaryLines.filter(Boolean).length;
    const statusLabel = String(note.distillationStatus || "").trim() || (filledCount ? "draft" : "missing");
    const statusValue = ["missing", "draft", "confirmed"].includes(statusLabel) ? statusLabel : filledCount ? "draft" : "missing";
    const directEvidenceCount = parseLinks(note.body || "").length;
    const writingReady = statusValue === "confirmed" && !qualityWarnings.length;
    return `
      <section class="inspector-section semantic-relations-section" data-note-distillation-section data-note-id="${escapeHtml(note.id)}">
        <div class="inspector-section-head">
          <div>
            <div class="inspector-section-title">观点提纯</div>
            <div class="inspector-section-note">手写优先；AI 候选只作为待审建议，不会替你确认判断。</div>
          </div>
          <span class="inspector-chip">${escapeHtml(statusLabel)}</span>
        </div>
        <form class="semantic-relation-form" data-note-distillation-form>
          <div class="semantic-relation-group">
            <div class="semantic-relation-group-head"><strong>提纯工作区</strong><span>${escapeHtml(statusValue === "confirmed" ? "稳定" : "进行中")}</span></div>
            <div class="semantic-relation-grid">
              <div class="semantic-relation-card"><strong>一句话判断</strong><span>${escapeHtml(thesis ? "已有" : "缺失")}</span></div>
              <div class="semantic-relation-card"><strong>三句话压缩</strong><span>${escapeHtml(summaryLines.filter(Boolean).length === 3 ? "完整" : `${summaryLines.filter(Boolean).length}/3`)}</span></div>
              <div class="semantic-relation-card"><strong>证据 / 来源</strong><span>${escapeHtml(directEvidenceCount ? `${directEvidenceCount} 条正文链接` : "待补证据")}</span></div>
              <div class="semantic-relation-card"><strong>反证 / 边界</strong><span>${escapeHtml(boundaryOrCounterpoint ? "已有" : "缺失")}</span></div>
              <div class="semantic-relation-card"><strong>关联建议</strong><span data-note-ai-suggestions-count>${escapeHtml(this.noteAiSuggestionsSummaryLabel(note.id))}</span></div>
              <div class="semantic-relation-card"><strong>写作可用性</strong><span>${escapeHtml(writingReady ? "可进入稳定写作" : "仍需审阅确认")}</span></div>
            </div>
          </div>
          <label>
            一句话判断
            <textarea name="thesis" rows="3" placeholder="这条永久笔记到底主张什么？">${escapeHtml(thesis)}</textarea>
          </label>
          <label>
            三句话压缩
            <textarea name="summary1" rows="2" placeholder="1. 这条观点在说什么">${escapeHtml(summaryLines[0])}</textarea>
          </label>
          <label>
            <span class="sr-only">三句话压缩第二句</span>
            <textarea name="summary2" rows="2" placeholder="2. 为什么它成立或重要">${escapeHtml(summaryLines[1])}</textarea>
          </label>
          <label>
            <span class="sr-only">三句话压缩第三句</span>
            <textarea name="summary3" rows="2" placeholder="3. 它服务于哪个问题或写作方向">${escapeHtml(summaryLines[2])}</textarea>
          </label>
          ${renderDistillationTemplateVariantSwitcher(
            distillationVariants.items,
            distillationVariants.selectedKey,
            rememberedTemplateVariantLabel
          )}
          <label>
            边界 / 反方 / 不适用条件
            <textarea name="boundaryOrCounterpoint" rows="3" placeholder="这条判断在哪些条件下不成立？最需要防的反例或反方是什么？">${escapeHtml(boundaryOrCounterpoint)}</textarea>
          </label>
          <label>
            观点状态
            <select name="distillationStatus">
              <option value="missing"${statusValue === "missing" ? " selected" : ""}>待提纯</option>
              <option value="draft"${statusValue === "draft" ? " selected" : ""}>待确认</option>
              <option value="confirmed"${statusValue === "confirmed" ? " selected" : ""}>已确认</option>
            </select>
          </label>
          <div class="semantic-relation-actions">
            <button class="mini-btn primary" type="submit">保存观点</button>
            <button class="mini-btn" type="button" data-note-distillation-confirm>确认观点</button>
          </div>
          <div class="semantic-relation-group" data-note-distillation-quality>
            <div class="semantic-relation-group-head"><strong>质量提示</strong><span>${escapeHtml(qualityWarnings.length || "OK")}</span></div>
            ${renderDistillationQualityContent({
              title: note.title,
              body: note.body,
              thesis,
              threeLineSummary: summaryLines,
              boundaryOrCounterpoint
            })}
          </div>
          <div data-note-embedded-ai-workspace>
            ${renderNoteEmbeddedAiWorkspace(this.noteAiSuggestionsStateForNote(note.id))}
          </div>
        </form>
      </section>
    `;
  }

  noteAiSuggestionsStateForNote(noteId = "") {
    const cleanNoteId = String(noteId || "").trim();
    if (cleanNoteId && this.noteAiSuggestionsState.noteId === cleanNoteId) return this.noteAiSuggestionsState;
    return {
      noteId: cleanNoteId,
      loading: false,
      error: "",
      items: [],
      actionLoading: false,
      actionSuggestionId: "",
      actionError: "",
      actionNotice: "",
      actionNoticeTone: "muted"
    };
  }

  noteAiSuggestionsSummaryLabel(noteId = "") {
    const state = this.noteAiSuggestionsStateForNote(noteId);
    if (state.loading) return "读取中";
    if (state.error) return "加载失败";
    if (!state.items.length) return "0 条";
    const pendingCount = state.items.filter((item) => String(item?.status || "").trim() === "suggested").length;
    return pendingCount ? `${pendingCount} 条待审` : `${state.items.length} 条`;
  }

  currentNoteSuggestionReviewContent(note = this.activeNote(), suggestion = {}) {
    const form = this.els.result?.querySelector?.("[data-note-distillation-form]");
    if (form && note?.id) {
      const draft = distillationDraftFromForm(form, note);
      return noteSuggestionReviewContent(
        {
          ...note,
          thesis: draft.thesis,
          threeLineSummary: draft.threeLineSummary,
          boundaryOrCounterpoint: draft.boundaryOrCounterpoint
        },
        suggestion
      );
    }
    return noteSuggestionReviewContent(note, suggestion);
  }

  renderEmbeddedAiWorkspaceMount(noteId = "") {
    const mount = this.els.result?.querySelector?.("[data-note-embedded-ai-workspace]");
    if (!mount) return;
    mount.innerHTML = renderNoteEmbeddedAiWorkspace(this.noteAiSuggestionsStateForNote(noteId));
    const count = this.els.result?.querySelector?.("[data-note-ai-suggestions-count]");
    if (count) count.textContent = this.noteAiSuggestionsSummaryLabel(noteId);
  }

  async refreshNoteAiSuggestions(noteId = "") {
    const cleanNoteId = String(noteId || "").trim();
    if (!cleanNoteId) return;
    const requestSerial = ++this.noteAiSuggestionsRequestSerial;
    this.noteAiSuggestionsState = {
      noteId: cleanNoteId,
      loading: true,
      error: "",
      items: [],
      actionLoading: false,
      actionSuggestionId: "",
      actionError: "",
      actionNotice: "",
      actionNoticeTone: "muted"
    };
    this.renderEmbeddedAiWorkspaceMount(cleanNoteId);
    try {
      const result = await fetchAiSuggestions({
        canonical: true,
        targetType: "permanent_note",
        targetId: cleanNoteId,
        limit: 20
      });
      if (requestSerial !== this.noteAiSuggestionsRequestSerial) return;
      this.noteAiSuggestionsState = {
        ...this.noteAiSuggestionsState,
        loading: false,
        items: Array.isArray(result?.items) ? result.items : []
      };
    } catch (error) {
      if (requestSerial !== this.noteAiSuggestionsRequestSerial) return;
      this.noteAiSuggestionsState = {
        ...this.noteAiSuggestionsState,
        loading: false,
        error: String(error?.message || error)
      };
    }
    this.renderEmbeddedAiWorkspaceMount(cleanNoteId);
  }

  async applyNoteAiSuggestionAction(action = "", suggestionId = "", artifactId = "") {
    const note = this.activeNote();
    const cleanAction = String(action || "").trim();
    const cleanSuggestionId = String(suggestionId || "").trim();
    let cleanArtifactId = String(artifactId || "").trim();
    if (!note?.id || !cleanAction || !cleanSuggestionId) return;
    const currentState = this.noteAiSuggestionsStateForNote(note.id);
    const currentSuggestion = currentState.items.find((item) => String(item?.id || "").trim() === cleanSuggestionId);
    if (!currentSuggestion) {
      this.onStatus("没有找到这条 AI 建议，请先刷新。", "warn");
      return;
    }
    this.noteAiSuggestionsState = {
      ...currentState,
      actionLoading: true,
      actionSuggestionId: cleanSuggestionId,
      actionError: "",
      actionNotice: "",
      actionNoticeTone: "muted"
    };
    this.renderEmbeddedAiWorkspaceMount(note.id);
    try {
      let latest = null;
      if (!cleanArtifactId || cleanAction === "edited" || cleanAction === "confirmed") {
        latest = await fetchAiSuggestion(cleanSuggestionId, { canonical: true });
      }
      if (!cleanArtifactId) cleanArtifactId = String(latest?.sourceArtifactId || currentSuggestion?.sourceArtifactId || "").trim();
      if (cleanAction === "adopted_as_draft") {
        if (!cleanArtifactId) throw new Error("这条建议缺少 source artifact，暂时不能采纳为草稿。");
        await adoptAiInboxFieldSuggestion(cleanArtifactId, { confirm: true, canonical: true });
        const refreshed = await fetchNote(note.id);
        if (refreshed) Object.assign(note, refreshed);
      } else {
        const payload = {
          canonical: true,
          status: cleanAction,
          actor: "user",
          userId: "local_user",
          action: cleanAction === "edited" ? "edit" : cleanAction === "confirmed" ? "confirm" : cleanAction === "rejected" ? "reject" : cleanAction
        };
        if (cleanAction === "edited" || cleanAction === "confirmed") {
          payload.content = this.currentNoteSuggestionReviewContent(note, latest || currentSuggestion);
        }
        if (cleanAction === "confirmed") payload.userConfirmed = true;
        await updateAiSuggestion(cleanSuggestionId, payload);
      }
      this.noteAiSuggestionsState = {
        ...this.noteAiSuggestionsStateForNote(note.id),
        actionLoading: false,
        actionSuggestionId: cleanSuggestionId,
        actionError: "",
        actionNotice: cleanAction === "rejected" ? "这条建议已忽略。" : `这条建议已${cleanAction === "adopted_as_draft" ? "采纳为草稿" : aiSuggestionStatusLabel(cleanAction)}。`,
        actionNoticeTone: "ok"
      };
      await this.refreshNoteAiSuggestions(note.id);
      this.renderRelated();
      this.onStatus(
        cleanAction === "confirmed"
          ? "AI 建议已完成人工确认"
          : cleanAction === "edited"
            ? "AI 建议已标记为人工编辑"
            : cleanAction === "rejected"
              ? "AI 建议已忽略"
              : "AI 建议已采纳为草稿",
        "ok"
      );
    } catch (error) {
      this.noteAiSuggestionsState = {
        ...this.noteAiSuggestionsStateForNote(note.id),
        actionLoading: false,
        actionSuggestionId: cleanSuggestionId,
        actionError: String(error?.message || error)
      };
      this.renderEmbeddedAiWorkspaceMount(note.id);
      this.onStatus(`处理 AI 建议失败：${String(error?.message || error)}`, "warn");
    }
  }

  jumpToInspectorSection(sectionSelector, { focusSelector = "", focus = false } = {}) {
    const matched = document.querySelector(sectionSelector);
    const section = matched?.matches?.(".inspector-section") ? matched : matched?.closest?.(".inspector-section") || matched;
    if (!section) return;
    section.scrollIntoView({ block: "start", behavior: "smooth" });
    section.classList.remove("is-jump-target");
    // Restart the highlight animation on repeated clicks.
    void section.offsetWidth;
    section.classList.add("is-jump-target");
    window.setTimeout(() => section.classList.remove("is-jump-target"), 1800);
    if (focus && focusSelector) {
      window.setTimeout(() => document.querySelector(focusSelector)?.focus?.(), 220);
    }
  }

  refreshDistillationQuality(form) {
    const note = this.activeNote();
    const mount = form?.querySelector?.("[data-note-distillation-quality]");
    if (!note || !mount) return;
    const draft = distillationDraftFromForm(form, note);
    const warnings = collectDistillationWarnings(draft);
    mount.innerHTML = `
      <div class="semantic-relation-group-head"><strong>质量提示</strong><span>${escapeHtml(warnings.length || "OK")}</span></div>
      ${renderDistillationQualityContent(draft)}
    `;
  }

  async handleDistillationForm(form) {
    const note = this.activeNote();
    if (!note?.id) return;
    const noteType = this.resolvedNoteType(note);
    if (noteType !== "permanent" && noteType !== "original") {
      this.onStatus("观点提纯面板只支持永久笔记", "warn");
      return;
    }
    const thesis = String(form.querySelector('[name="thesis"]')?.value || "").trim();
    const threeLineSummary = [1, 2, 3]
      .map((idx) => String(form.querySelector(`[name="summary${idx}"]`)?.value || "").trim())
      .filter(Boolean);
    const boundaryOrCounterpoint = String(form.querySelector('[name="boundaryOrCounterpoint"]')?.value || "").trim();
    const selectedStatus = String(form.querySelector('[name="distillationStatus"]')?.value || "").trim();
    const distillationStatus = ["missing", "draft", "confirmed"].includes(selectedStatus)
      ? selectedStatus
      : thesis || threeLineSummary.length
        ? "draft"
        : "missing";
    const savedEditor = await this.autoSaveActiveNote("distillation");
    if (savedEditor === false) return;
    const saved = await this.onStateChange("save-note-distillation", {
      noteId: note.id,
      thesis,
      threeLineSummary,
      boundaryOrCounterpoint,
      distillationStatus,
      authorship: distillationStatus === "confirmed" ? { user_confirmed: true, ai_assisted: false } : undefined
    });
    if (!saved) return;
    note.thesis = thesis;
      note.threeLineSummary = threeLineSummary;
      note.boundaryOrCounterpoint = boundaryOrCounterpoint;
      note.distillationStatus = distillationStatus;
      this.setDistillationPrefill(note.id, { boundaryDraft: "" });
      if (distillationStatus === "confirmed") {
        note.authorship = { user_confirmed: true, ai_assisted: false };
      }
    this.renderThinkingStatus();
    this.renderRelated();
  }

  async confirmDistillation() {
    const note = this.activeNote();
    if (!note?.id) return;
    const noteType = this.resolvedNoteType(note);
    if (noteType !== "permanent" && noteType !== "original") {
      this.onStatus("观点提纯面板只支持永久笔记", "warn");
      return;
    }
    const form = this.els.result?.querySelector?.("[data-note-distillation-form]");
    if (form) {
      const thesis = String(form.querySelector('[name="thesis"]')?.value || "").trim();
      const threeLineSummary = [1, 2, 3]
        .map((idx) => String(form.querySelector(`[name="summary${idx}"]`)?.value || "").trim())
        .filter(Boolean);
      const boundaryOrCounterpoint = String(form.querySelector('[name="boundaryOrCounterpoint"]')?.value || "").trim();
      if (!thesis || threeLineSummary.length !== 3) {
        this.onStatus("确认前需要补全一句话判断和三句话压缩", "warn");
        return;
      }
      const savedEditor = await this.autoSaveActiveNote("distillation-confirm");
      if (savedEditor === false) return;
      const saved = await this.onStateChange("save-note-distillation", {
        noteId: note.id,
        thesis,
        threeLineSummary,
        boundaryOrCounterpoint,
        distillationStatus: "draft"
      });
      if (!saved) return;
      note.thesis = thesis;
      note.threeLineSummary = threeLineSummary;
      note.boundaryOrCounterpoint = boundaryOrCounterpoint;
      this.setDistillationPrefill(note.id, { boundaryDraft: "" });
    }
    const confirmed = await this.onStateChange("confirm-note-distillation", { noteId: note.id });
    if (!confirmed) return;
    note.distillationStatus = "confirmed";
    note.authorship = { ...(note.authorship || {}), user_confirmed: true };
    this.renderThinkingStatus();
    this.renderRelated();
  }

  async refreshRelationTargetSearch(query = "") {
    const note = this.activeNote();
    if (!note?.id) return;
    const form = this.els.result?.querySelector?.("[data-create-relation-form]");
    if (!form || form.dataset.noteId !== note.id) return;

    const serial = ++this.relationTargetSearchSerial;
    const searchInput = form.querySelector("[data-relation-target-search]");
    const hiddenTargetId = form.querySelector("[data-relation-target-id]");
    const list = form.querySelector("[data-relation-target-list]");
    const status = form.querySelector("[data-relation-target-status]");
    const submit = form.querySelector('button[type="submit"]');
    const selectedBefore = String(hiddenTargetId?.value || "").trim();
    const highlightBefore = String(form.dataset.relationTargetHighlightId || "").trim();
    if (status) status.textContent = "正在搜索 SQLite 笔记目录...";

    try {
      const result = await searchNotes({
        query,
        rootDirectoryId: this.relationTargetSearchRootId(note),
        excludeNoteId: note.id,
        limit: 30
      });
      if (serial !== this.relationTargetSearchSerial || this.activeNote()?.id !== note.id) return;
      const items = Array.isArray(result?.items) ? result.items : [];
      this.upsertApiNotes(items);
      if (!form.isConnected) return;
      const selectedNote = selectedBefore ? this.state.notes.find((item) => item?.id === selectedBefore) || null : null;
      const cleanQuery = String(query || "").trim();
      let nextHighlightId = highlightBefore && items.some((item) => item?.id === highlightBefore) ? highlightBefore : "";
      if (!nextHighlightId) {
        if (cleanQuery) nextHighlightId = items[0]?.id || "";
        else if (selectedBefore && items.some((item) => item?.id === selectedBefore)) nextHighlightId = selectedBefore;
        else nextHighlightId = items[0]?.id || "";
      }
      form.dataset.relationTargetHighlightId = nextHighlightId;
      if (list) list.innerHTML = this.renderRelationTargetChoices(items, selectedBefore, query, nextHighlightId);
      if (submit) submit.disabled = !selectedBefore;
      if (status) {
        status.textContent = selectedNote
          ? `已选：${selectedNote.title || selectedNote.id}`
          : items.length
            ? `${cleanQuery ? `已筛选 ${items.length} 条` : "输入关键词后选择一条笔记"}`
            : cleanQuery
              ? "没有匹配笔记"
              : "当前范围没有可连接笔记";
      }
      if (searchInput && selectedNote && !String(searchInput.value || "").trim()) {
        searchInput.value = selectedNote.title || selectedNote.id || "";
      }
    } catch (error) {
      if (serial !== this.relationTargetSearchSerial || this.activeNote()?.id !== note.id) return;
      if (status) status.textContent = `目标搜索失败：${String(error?.message || error)}`;
      if (submit && !String(hiddenTargetId?.value || "").trim()) submit.disabled = true;
    }
  }

  queueRelationTargetSearch(input) {
    const form = input?.closest?.("[data-create-relation-form]");
    const hiddenTargetId = form?.querySelector?.("[data-relation-target-id]");
    const selectedNote = hiddenTargetId?.value
      ? this.state.notes.find((item) => item?.id === String(hiddenTargetId.value || "").trim()) || null
      : null;
    if (hiddenTargetId && selectedNote && normalizeText(input?.value || "") !== normalizeText(selectedNote?.title || selectedNote?.id || "")) {
      hiddenTargetId.value = "";
      delete hiddenTargetId.dataset.targetTitle;
      const submit = form?.querySelector?.('button[type="submit"]');
      if (submit) submit.disabled = true;
    }
    if (form) form.dataset.relationTargetHighlightId = "";
    window.clearTimeout(this.relationTargetSearchTimer);
    this.relationTargetSearchTimer = window.setTimeout(() => {
      void this.refreshRelationTargetSearch(input?.value || "");
    }, 180);
  }

  openRelationTargetList(form) {
    const list = form?.querySelector?.("[data-relation-target-list]");
    if (list) list.hidden = false;
  }

  closeRelationTargetList(form) {
    const list = form?.querySelector?.("[data-relation-target-list]");
    if (list) list.hidden = true;
  }

  visibleRelationTargetChoices(form) {
    return Array.from(form?.querySelectorAll?.("[data-relation-target-choice]") || []).filter(Boolean);
  }

  moveRelationTargetChoice(form, step = 1) {
    const buttons = this.visibleRelationTargetChoices(form);
    if (!buttons.length) return;
    this.openRelationTargetList(form);
    const hiddenTargetId = form?.querySelector?.("[data-relation-target-id]");
    const currentId = String(form?.dataset?.relationTargetHighlightId || hiddenTargetId?.value || "").trim();
    let index = buttons.findIndex((button) => String(button.dataset.noteId || "").trim() === currentId);
    if (index < 0) index = step > 0 ? -1 : 0;
    const next = buttons[(index + step + buttons.length) % buttons.length];
    if (!next) return;
    form.dataset.relationTargetHighlightId = String(next.dataset.noteId || "").trim();
    buttons.forEach((button) => {
      const active = button === next;
      button.classList.toggle("active", active);
      button.setAttribute("aria-selected", active ? "true" : "false");
    });
    next.scrollIntoView?.({ block: "nearest" });
  }

  applyRelationTargetChoice(form, noteId = "", noteTitle = "", options = {}) {
    const cleanNoteId = String(noteId || "").trim();
    if (!form || !cleanNoteId) return;
    const hiddenTargetId = form.querySelector("[data-relation-target-id]");
    const searchInput = form.querySelector("[data-relation-target-search]");
    const status = form.querySelector("[data-relation-target-status]");
    const submit = form.querySelector('button[type="submit"]');
    if (hiddenTargetId) {
      hiddenTargetId.value = cleanNoteId;
      hiddenTargetId.dataset.targetTitle = String(noteTitle || "").trim();
    }
    form.dataset.relationTargetHighlightId = cleanNoteId;
    if (searchInput) searchInput.value = String(noteTitle || "").trim();
    if (submit) submit.disabled = false;
    if (status) status.textContent = `已选：${noteTitle || cleanNoteId}`;
    if (options.keepOpen) this.openRelationTargetList(form);
    else this.closeRelationTargetList(form);
    void this.refreshRelationTargetSearch(String(noteTitle || "").trim());
    if (options.focusReason !== false) {
      const rationale = form.querySelector('textarea[name="rationale"]');
      rationale?.focus?.();
    }
  }

  refreshRelationQualityMeter(form) {
    const meter = form?.querySelector?.("[data-relation-quality]");
    if (!meter) return;
    const rationale = form.querySelector('textarea[name="rationale"]')?.value || "";
    const insightQuestion = form.querySelector('textarea[name="insightQuestion"]')?.value || "";
    meter.outerHTML = renderRelationQualityMeter(rationale, insightQuestion);
  }

  async handleCreateRelationForm(form) {
    const note = this.activeNote();
    const formNoteId = String(form?.dataset?.noteId || "").trim();
    if (!note?.id || formNoteId !== note.id) return;

    const data = new FormData(form);
    const toNoteId = String(data.get("toNoteId") || "").trim();
    const relationType = String(data.get("relationType") || "").trim();
    const rationale = String(data.get("rationale") || "").trim();
    const insightQuestion = String(data.get("insightQuestion") || "").trim();
    const errorEl = form.querySelector("[data-relation-form-error]");
    const submit = form.querySelector('button[type="submit"]');

    if (!toNoteId || !relationType || !rationale) {
      if (errorEl) errorEl.textContent = "请选择目标笔记、关系类型，并写下一句连接理由。";
      return;
    }

    if (submit) submit.disabled = true;
    if (errorEl) errorEl.textContent = "";
    try {
      const relation = await createNoteRelation(note.id, {
        toNoteId,
        relationType,
        rationale,
        insightQuestion,
        confidence: 1,
        status: "confirmed"
      });
      const target = this.state.notes.find((item) => item.id === toNoteId);
      this.onStatus(
        relation?.created === false
          ? `关系已存在，已复用：${note.title || note.id} -> ${target?.title || toNoteId}`
          : `关系已建立：${note.title || note.id} -> ${target?.title || toNoteId}`,
        "ok"
      );
      this.resetRelationPanelState(note.id);
      this.renderRelated(relation?.created === false ? "关系已存在，已复用。" : "关系已建立。");
    } catch (error) {
      const message = String(error?.message || error);
      if (errorEl) errorEl.textContent = message;
      this.onStatus(`关系创建失败：${message}`, "warn");
    } finally {
      if (submit) submit.disabled = false;
    }
  }

  async promoteInlineDraftRelation(indexValue = "") {
    const note = this.activeNote();
    const tab = this.activeTab();
    if (!note?.id || !tab) return;
    const drafts = parseInlineRelationAnnotations(this.getEditorValue() || tab.body || "");
    const index = Number(indexValue);
    const draft = Number.isInteger(index) ? drafts[index] : null;
    if (!draft) {
      this.onStatus("没有找到这条临时关联", "warn");
      return;
    }
    const target = this.resolveLinkToken(draft.token)?.note;
    if (!target?.id) {
      this.onStatus(`没有找到关联目标：${draft.token}`, "warn");
      return;
    }
    try {
      await createNoteRelation(note.id, {
        toNoteId: target.id,
        relationType: draft.relationType,
        rationale: draft.rationale,
        insightQuestion: "",
        confidence: 1,
        status: "confirmed"
      });
      const currentBody = this.getEditorValue() || tab.body || "";
      const cleanedBody = currentBody.replace(draft.raw, `[[${draft.token}]]`);
      this.setEditorValue(cleanedBody);
      this.handleEditorInput();
      await this.saveActiveNote({ autoSave: true, trigger: "promote-inline-relation", skipOriginalityCheck: true });
      this.onStatus(`已升级为正式关系：${note.title || note.id} -> ${target.title || target.id}`, "ok");
      this.resetRelationPanelState(note.id);
      this.renderRelated("已升级为正式语义关系。");
    } catch (error) {
      this.onStatus(`正式关系创建失败：${String(error?.message || error)}`, "warn");
    }
  }

  async handleEditRelationForm(form) {
    const note = this.activeNote();
    const formNoteId = String(form?.dataset?.noteId || "").trim();
    const relationId = String(form?.dataset?.relationId || "").trim();
    if (!note?.id || formNoteId !== note.id || !relationId) return;

    const data = new FormData(form);
    const relationType = String(data.get("relationType") || "").trim();
    const status = String(data.get("status") || "").trim();
    const rationale = String(data.get("rationale") || "").trim();
    const insightQuestion = String(data.get("insightQuestion") || "").trim();
    const errorEl = form.querySelector("[data-relation-form-error]");
    const submit = form.querySelector('button[type="submit"]');

    if (!relationType || !status || !rationale) {
      if (errorEl) errorEl.textContent = "关系类型、状态和连接理由不能为空。";
      return;
    }

    if (submit) submit.disabled = true;
    if (errorEl) errorEl.textContent = "";
    try {
      await updateNoteRelation(relationId, {
        relationType,
        status,
        rationale,
        insightQuestion
      });
      this.onStatus("关系已更新", "ok");
      this.resetRelationPanelState(note.id);
      this.renderRelated("关系已更新。");
    } catch (error) {
      const message = String(error?.message || error);
      if (errorEl) errorEl.textContent = message;
      this.onStatus(`关系更新失败：${message}`, "warn");
    } finally {
      if (submit) submit.disabled = false;
    }
  }

  async deleteSemanticRelation(relationId) {
    const id = String(relationId || "").trim();
    if (!id) return;
    const link = this.findSemanticRelation(id);
    const endpoint = link ? this.relationEndpoint(link, link.fromNoteId === this.activeNote()?.id ? "outgoing" : "incoming") : null;
    const label = endpoint?.title || "这条关系";
    if (!window.confirm(`删除与“${label}”的这条关系？`)) return;
    try {
      await deleteNoteRelation(id);
      this.onStatus("关系已删除", "ok");
      this.resetRelationPanelState(this.activeNote()?.id || "");
      this.renderRelated("关系已删除。");
    } catch (error) {
      this.onStatus(`关系删除失败：${String(error?.message || error)}`, "warn");
    }
  }

  renderRelated(extraTitle = "") {
    const note = this.activeNote();
    const tab = this.activeTab();
    if (this.els.editorRelationsBelow) {
      this.els.editorRelationsBelow.innerHTML = "";
      this.els.editorRelationsBelow.classList.add("hidden");
    }
    if (!note || !tab) {
      this.relationsRequestSerial += 1;
      this.currentSemanticRelations = null;
      this.semanticRelationsState = "idle";
      this.resetRelationPanelState("");
      this.els.result.innerHTML = `<div class="related-empty">打开笔记后，这里会显示引用、回链和同标签结果。</div>`;
      return;
    }
    const relationRequestSerial = ++this.relationsRequestSerial;
    this.currentSemanticRelations = null;
    this.semanticRelationsState = "loading";

    const tags = parseTags(tab.body || "");
    const { forward, backward, tagRelated } = this.buildLocalRelationSignals(note, tab);
    const isPermanentNote = this.isOriginalNote(note);
    const isRecordableSource = this.isOriginalRecordableSource(note);

    const renderNoteItem = (n, badgeText = "") => `
      <button class="related-item" data-preview-note="${n.id}">
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
          <div class="inspector-overview-meta">${escapeHtml(noteTypeText(this.resolvedNoteType(note)))} · ${escapeHtml(this.folderLabel(note.folderId))}</div>
        </div>
      <div class="inspector-overview-grid">
        <div class="inspector-overview-row">
          <span class="inspector-overview-label">标签</span>
          <span class="inspector-overview-value">${tags.length ? escapeHtml(tags.map((tag) => `#${tag}`).join(" ")) : "还没有标签"}</span>
        </div>
      </div>
      </div>
      <div class="inspector-section-note" data-inspector-link-summary-note>
        ${
          !isPermanentNote
            ? "当前编辑的是来源笔记。只有永久笔记才会显示关联与主路径；这里优先显示创建永久笔记的下一步。"
            : this.semanticRelationsState === "error"
            ? "上面这组数字只统计正文里的本地链接；显式关系当前读取失败，请以主路径卡片和语义关系区的错误提示为准。"
            : this.semanticRelationsState === "loading"
              ? "上面这组数字只统计正文里的本地链接；显式关系仍在读取中，稍后会在主路径卡片和语义关系区里更新。"
              : "上面这组数字只统计正文里的本地链接；显式关系请结合主路径卡片和语义关系区一起判断。"
        }
      </div>
      <div class="inspector-sections">
        ${extraTitle ? `<section class="inspector-section"><div class="related-empty">${escapeHtml(extraTitle)}</div></section>` : ""}
        ${
          isPermanentNote
            ? `
              ${this.renderPermanentNoteMainPathSectionV2(
                note,
                this.buildMainPathOverviewV2({ forward, backward, tagRelated, relations: null, relationState: "loading" })
              )}
              ${this.renderPermanentNoteDistillationSection(note)}
              ${this.renderInlineDraftRelationSection(note, tab)}
              ${this.renderCurrentRelationSection(note.id, {
                relations: this.currentSemanticRelations,
                relationState: this.semanticRelationsState
              })}
            `
            : isRecordableSource
              ? this.renderSourceNoteFlowSection(note)
              : ""
        }
      </div>
    `;
    if (isPermanentNote) {
      void this.refreshSemanticRelations(note.id, relationRequestSerial);
      void this.refreshNoteAiSuggestions(note.id);
      return;
    }
    this.semanticRelationsState = "idle";
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
                  <button class="related-item" data-preview-note="${n.id}">
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
        await this.showNotePreviewInInspector(resolved.note.id, {
          eyebrow: "关联笔记",
          badge: resolved.ambiguous ? "重名匹配" : "已匹配"
        });
        this.onStatus(
          resolved.ambiguous ? `已显示关联笔记：${resolved.note.title}（存在重名）` : `已显示关联笔记：${resolved.note.title}`,
          resolved.ambiguous ? "warn" : "ok"
        );
      } else {
        this.onStatus(`未找到关联笔记：${tokenValue}`, "warn");
      }
    }
  }

  async loadNoteForPreview(noteId) {
    const cleanId = String(noteId || "").trim();
    if (!cleanId) return null;
    let note = this.state.notes.find((item) => item.id === cleanId) || null;
    if (note?.bodyLoaded && typeof note.body === "string") return note;
    try {
      const fetched = await fetchNote(cleanId);
      if (fetched) {
        this.upsertApiNotes([fetched]);
        note = this.state.notes.find((item) => item.id === cleanId) || note;
      }
    } catch (error) {
      this.onStatus(`预览笔记加载失败：${String(error?.message || error)}`, "warn");
    }
    return note;
  }

  async showNotePreviewInInspector(noteId, options = {}) {
    const note = await this.loadNoteForPreview(noteId);
    if (!note) {
      this.els.result.innerHTML = `<div class="related-empty bad">没有找到这条笔记。</div>`;
      return;
    }
    const body = typeof note.body === "string" && note.body.trim() ? note.body : `# ${note.title || "未命名笔记"}\n`;
    const tags = parseTags(body);
    const links = parseLinks(body);
    this.setInspectorVisible(true);
    this.els.result.innerHTML = `
      <div class="inspector-overview">
        <div class="inspector-overview-head">
          <div>
            <div class="inspector-overview-meta">${escapeHtml(options.eyebrow || "笔记预览")}</div>
            <div class="inspector-overview-title">${escapeHtml(note.title || "未命名笔记")}</div>
          </div>
          ${options.badge ? `<span class="inspector-chip">${escapeHtml(options.badge)}</span>` : ""}
        </div>
      </div>
      <div class="inspector-summary">
        <span class="inspector-chip">${escapeHtml(noteTypeText(this.resolvedNoteType(note)))}</span>
        <span class="inspector-chip">${escapeHtml(this.folderLabel(note.folderId))}</span>
        <span class="inspector-chip">关联 ${links.length}</span>
        <span class="inspector-chip">标签 ${tags.length}</span>
      </div>
      <section class="inspector-section note-peek-section">
        <div class="markdown-preview note-peek-preview">
          ${renderMarkdownPreview(body, { noteMarkdownPath: note.markdownPath || "" })}
        </div>
      </section>
    `;
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
      .filter((x) => x && this.resolvedNoteType(x) === "literature");

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
      const similarity = Math.round((Number(evalItem.similarity) || 0) * 100);
      const message = `这条永久笔记还太贴近材料原句（相似度 ${similarity}%），说明它还没有完全长成你自己的独立判断。请先改写成自己的判断，再保存。`;
      this.showOriginalityNotice("需要重写", "bad", message);
      this.onStatus(message, "bad");
      if (forSave) {
        this.setSaveUiState("blocked", reflectionQuestionsHint(message));
      }
      return { ...evalItem, raw: result };
    }

    if (evalItem.status === "warning") {
      return { ...evalItem, raw: result };
    }

    return { ...evalItem, raw: result };
  }

  showOriginalityNotice(title = "原创性提醒", tone = "", message = "") {
    const panel = this.els.originalityNotice;
    if (!panel) return;
    if (!this.isOriginalNote()) {
      this.hideOriginalityNotice();
      return;
    }
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
          this.closeTransientPanels({ closeInspector: true });
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
        this.closeTransientPanels({ closeInspector: true });
      }
      this.state.activeTabId = tab.dataset.tab;
      this.fillEditorFromTab();
      this.onStateChange("switch-tab");
    });

    const startEmptyNote = (event) => {
      if (!this.requestCreateNoteFromEmptyState()) return;
      event.preventDefault();
      event.stopPropagation();
    };
    this.els.emptyStart?.addEventListener("click", startEmptyNote);
    this.els.emptyStart?.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      startEmptyNote(event);
    });
    this.els.markdownSplit?.addEventListener("click", (event) => {
      if (!this.els.markdownSplit?.closest?.(".editor-empty")) return;
      if (event.target.closest("button, input, textarea, select, a")) return;
      startEmptyNote(event);
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
      const templatePreferenceClear = e.target.closest("[data-template-preference-clear]");
      if (templatePreferenceClear) {
        this.applyTemplatePreferenceClear(
          templatePreferenceClear.getAttribute("data-template-preference-clear") || "",
          templatePreferenceClear
        );
        return;
      }
      const distillationTemplateMergeAction = e.target.closest("[data-distillation-template-merge-action]");
      if (distillationTemplateMergeAction) {
        this.commitDistillationTemplateVariant(
          distillationTemplateMergeAction.closest("[data-distillation-template-merge-choice]"),
          distillationTemplateMergeAction.getAttribute("data-distillation-template-merge-action") || "replace"
        );
        return;
      }
      const relationTemplateMergeAction = e.target.closest("[data-relation-template-merge-action]");
      if (relationTemplateMergeAction) {
        this.commitRelationTemplateVariant(
          relationTemplateMergeAction.closest("[data-relation-template-merge-choice]"),
          relationTemplateMergeAction.getAttribute("data-relation-template-merge-action") || "replace"
        );
        return;
      }
      const distillationTemplateButton = e.target.closest("[data-distillation-template-variant]");
      if (distillationTemplateButton) {
        this.applyDistillationTemplateVariant(distillationTemplateButton);
        return;
      }
      const templateVariantButton = e.target.closest("[data-relation-template-variant]");
      if (templateVariantButton) {
        this.applyRelationTemplateVariant(templateVariantButton);
        return;
      }
      const relationTargetChoice = e.target.closest("[data-relation-target-choice]");
      if (relationTargetChoice) {
        const form = relationTargetChoice.closest("[data-create-relation-form]");
        this.applyRelationTargetChoice(
          form,
          relationTargetChoice.dataset.noteId || "",
          relationTargetChoice.dataset.noteTitle || ""
        );
        return;
      }
      const relationAction = e.target.closest("[data-relation-action]");
      if (relationAction) {
        const action = relationAction.dataset.relationAction;
        if (action === "open-create") this.openCreateRelationForm();
        if (action === "cancel-create") {
          this.resetRelationPanelState();
          this.renderRelated();
        }
        if (action === "open-edit") this.openEditRelationForm(relationAction.dataset.relationId);
        if (action === "cancel-edit") {
          this.resetRelationPanelState();
          this.renderRelated();
        }
        if (action === "delete") void this.deleteSemanticRelation(relationAction.dataset.relationId);
        if (action === "promote-inline") void this.promoteInlineDraftRelation(relationAction.dataset.inlineRelationIndex);
        return;
      }

      const aiAnalysisButton = e.target.closest("[data-note-ai-analysis]");
      if (aiAnalysisButton) {
        void this.runPermanentNoteAnalysis();
        return;
      }
      const aiAnalysisInboxButton = e.target.closest("[data-note-ai-analysis-open-inbox]");
      if (aiAnalysisInboxButton) {
        this.openPermanentNoteAiInbox();
        return;
      }

      const distillationConfirmButton = e.target.closest("[data-note-distillation-confirm]");
      if (distillationConfirmButton) {
        void this.confirmDistillation();
        return;
      }
      const noteAiSuggestionAction = e.target.closest("[data-note-ai-suggestion-action]");
      if (noteAiSuggestionAction) {
        void this.applyNoteAiSuggestionAction(
          noteAiSuggestionAction.getAttribute("data-note-ai-suggestion-action"),
          noteAiSuggestionAction.getAttribute("data-note-ai-suggestion-id"),
          noteAiSuggestionAction.getAttribute("data-note-ai-suggestion-artifact-id")
        );
        return;
      }
      const noteAiOpenInbox = e.target.closest("[data-note-ai-open-inbox]");
      if (noteAiOpenInbox) {
        void this.onStateChange("open-note-ai-inbox", {
          noteId: this.activeNote()?.id || "",
          artifactId: noteAiOpenInbox.getAttribute("data-note-ai-open-inbox") || ""
        });
        return;
      }

      const sourceNoteAction = e.target.closest("[data-source-note-action]");
      if (sourceNoteAction) {
        const action = String(sourceNoteAction.getAttribute("data-source-note-action") || "").trim();
        if (action === "record-permanent") {
          this.els.recordPermanent?.click?.();
        }
        return;
      }

      const mainRouteButton = e.target.closest("[data-note-main-route-action]");
      if (mainRouteButton) {
        const action = String(mainRouteButton.dataset.noteMainRouteAction || "").trim();
        if (action === "distillation") {
          this.jumpToInspectorSection("[data-note-distillation-section]", {
            focus: true,
            focusSelector:
              String(mainRouteButton.dataset.noteMainRouteFocus || "").trim() === "boundary"
                ? '[data-note-distillation-form] textarea[name="boundaryOrCounterpoint"]'
                : '[data-note-distillation-form] textarea[name="thesis"]'
          });
          return;
        }
        if (action === "relations") {
          if (this.semanticRelationsState === "loading") {
            this.jumpToInspectorSection("[data-note-relations-section]");
            this.onStatus("关系仍在加载中，先看当前关系区；加载完成后再决定是否新建关系。", "warn");
            return;
          }
          if (this.semanticRelationsState === "error") {
            this.openCreateRelationForm();
            window.setTimeout(() => {
              this.jumpToInspectorSection("[data-create-relation-form]", {
                focus: true,
                focusSelector: '[data-create-relation-form] [data-relation-target-search]'
              });
            }, 40);
            this.onStatus("关系读取失败，已切到手动新建关系，你仍然可以继续补这条连接。", "warn");
            return;
          }
          const explicitRelationCount = this.currentExplicitRelationCount();
          if (explicitRelationCount === null) {
            this.jumpToInspectorSection("[data-note-relations-section]");
            this.onStatus("关系仍在加载中，先看当前关系区；加载完成后再决定是否新建关系。", "warn");
            return;
          }
          if (explicitRelationCount === 0) {
            this.openCreateRelationForm();
            window.setTimeout(() => {
              this.jumpToInspectorSection("[data-create-relation-form]", {
                focus: true,
                focusSelector: '[data-create-relation-form] [data-relation-target-search]'
              });
            }, 40);
            return;
          }
          this.jumpToInspectorSection("[data-note-relations-section]");
          return;
        }
        if (action === "graph" || action === "writing") {
          void this.onStateChange("open-note-main-route", {
            noteId: this.activeNote()?.id || "",
            action,
            mode: String(mainRouteButton.dataset.noteMainRouteMode || "").trim()
          });
          return;
        }
      }

      const distillationSection = e.target.closest("[data-note-distillation-section]");
      if (distillationSection && e.target.closest("button, textarea, input, select")) return;

      const previewRow = e.target.closest("[data-preview-note]");
      if (previewRow) {
        void this.showNotePreviewInInspector(previewRow.dataset.previewNote, { eyebrow: "相关内容" });
        return;
      }
      const link = e.target.closest("[data-preview-link]");
      if (link) {
        void this.handleTokenAction(`[[${link.dataset.previewLink}]]`);
        return;
      }
      const tag = e.target.closest("[data-preview-tag]");
      if (tag) {
        void this.handleTokenAction(`#${tag.dataset.previewTag}`);
        return;
      }
      const asset = e.target.closest("[data-preview-asset-url]");
      if (asset?.dataset.previewAssetUrl) {
        this.openAssetPreview(asset.dataset.previewAssetUrl, asset.dataset.previewAssetLabel || "");
        return;
      }
      const missingAsset = e.target.closest("[data-preview-missing-asset]");
      if (missingAsset?.dataset.previewMissingAsset) {
        this.onStatus(`附件路径不可预览：${missingAsset.dataset.previewMissingAsset}`, "warn");
        return;
      }
      const row = e.target.closest("[data-open-note]");
      if (!row) return;
      void this.showNotePreviewInInspector(row.dataset.openNote, { eyebrow: "相关内容" });
    });
    this.els.result.addEventListener("input", (e) => {
      const distillationInput = e.target.closest("[data-note-distillation-form] textarea, [data-note-distillation-form] input, [data-note-distillation-form] select");
      if (distillationInput) {
        const form = distillationInput.closest("[data-note-distillation-form]");
        if (form) this.refreshDistillationQuality(form);
        return;
      }
      const targetSearch = e.target.closest("[data-relation-target-search]");
      if (targetSearch) {
        this.queueRelationTargetSearch(targetSearch);
        return;
      }
      const relationTextInput = e.target.closest('textarea[name="rationale"], textarea[name="insightQuestion"]');
      if (relationTextInput) {
        const form = relationTextInput.closest("[data-create-relation-form], [data-edit-relation-form]");
        if (form) this.refreshRelationQualityMeter(form);
      }
    });
    this.els.result.addEventListener("focusin", (e) => {
      const targetSearch = e.target.closest("[data-relation-target-search]");
      if (!targetSearch) return;
      const form = targetSearch.closest("[data-create-relation-form]");
      if (!form) return;
      this.openRelationTargetList(form);
    });
    this.els.result.addEventListener("keydown", (e) => {
      const targetSearch = e.target.closest("[data-relation-target-search]");
      if (!targetSearch) return;
      const form = targetSearch.closest("[data-create-relation-form]");
      if (!form) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        this.moveRelationTargetChoice(form, 1);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        this.moveRelationTargetChoice(form, -1);
        return;
      }
      if (e.key === "Enter") {
        const buttons = this.visibleRelationTargetChoices(form);
        if (!buttons.length) return;
        e.preventDefault();
        const hiddenTargetId = form.querySelector("[data-relation-target-id]");
        const current = buttons.find((button) => String(button.dataset.noteId || "").trim() === String(hiddenTargetId?.value || "").trim()) || buttons[0];
        if (current) {
          this.applyRelationTargetChoice(form, current.dataset.noteId || "", current.dataset.noteTitle || "");
        }
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        const hiddenTargetId = form.querySelector("[data-relation-target-id]");
        const selectedTitle = String(hiddenTargetId?.dataset?.targetTitle || "").trim();
        if (selectedTitle) targetSearch.value = selectedTitle;
        this.closeRelationTargetList(form);
      }
    });
    this.els.result.addEventListener("submit", (e) => {
      const distillationForm = e.target.closest("[data-note-distillation-form]");
      if (distillationForm) {
        e.preventDefault();
        void this.handleDistillationForm(distillationForm);
        return;
      }
      const form = e.target.closest("[data-create-relation-form], [data-edit-relation-form]");
      if (!form) return;
      e.preventDefault();
      if (form.matches("[data-create-relation-form]")) void this.handleCreateRelationForm(form);
      if (form.matches("[data-edit-relation-form]")) void this.handleEditRelationForm(form);
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
      const external = e.target.closest("[data-preview-external-url]");
      if (external?.dataset.previewExternalUrl) {
        void this.openExternalUrl(external.dataset.previewExternalUrl);
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
        return;
      }
      const missingAsset = e.target.closest("[data-preview-missing-asset]");
      if (missingAsset?.dataset.previewMissingAsset) {
        this.onStatus(`附件路径不可预览：${missingAsset.dataset.previewMissingAsset}`, "warn");
      }
    });
    this.els.closeAssetPreview?.addEventListener("click", () => this.closeAssetPreview());
    this.els.assetPreviewMask?.addEventListener("click", (event) => {
      if (event.target === this.els.assetPreviewMask) this.closeAssetPreview();
    });
    this.els.assetPreviewOpenLink?.addEventListener("click", (event) => {
      const url = String(this.els.assetPreviewOpenLink?.getAttribute("href") || "").trim();
      if (!url || url === "#") {
        event.preventDefault();
        return;
      }
      event.preventDefault();
      void this.openExternalUrl(url);
    });

    document.querySelectorAll(".tb[data-md]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const t = btn.dataset.md;
        if (t === "bold") this.wrapSelection("**", "**");
        if (t === "italic") this.wrapSelection("*", "*");
      });
    });

    this.installToolbarCommandMenu();
    this.els.headingLevel?.addEventListener("change", () => {
      const rawValue = String(this.els.headingLevel?.value || "").trim();
      if (rawValue === "p") {
        this.clearCurrentHeading();
        this.renderContextualToolbarState();
        this.focusEditor();
        return;
      }
      const level = Number(rawValue || 0);
      if (level >= 1 && level <= 6) this.formatCurrentBlock(`h${level}`);
      this.renderContextualToolbarState();
      this.focusEditor();
    });
    this.els.insertLink.addEventListener("click", () => {
      const note = this.activeNote();
      if (!note) return this.onStatus("请先打开一个笔记", "warn");
      const candidates = this.scopedLinkCandidates();
      if (!candidates.length) return this.onStatus("当前笔记盒里无可关联笔记", "warn");
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
      const interactiveControl = event.target.closest("select, textarea, input, button, option, label");
      if (interactiveControl && !this.currentLinkContext && !this.currentTagContext) return;
      event.preventDefault();
    };
    this.els.linkPicker?.addEventListener("mousedown", preserveInlinePickerFocus);
    this.els.tagPicker?.addEventListener("mousedown", preserveInlinePickerFocus);

    this.els.closeLinkPicker.addEventListener("click", () => this.closeLinkPicker());
    this.els.linkSearchInput.addEventListener("input", () => {
      this.currentPinnedLinkId = "";
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
        void this.confirmSelectedLinkCandidate();
        e.preventDefault();
      }
    });
    this.els.linkSearchList.addEventListener("click", (e) => {
      const row = e.target.closest("[data-link-note-id]");
      if (!row) return;
      const next = Number(row.dataset.linkIndex);
      if (Number.isInteger(next)) this.currentLinkIndex = next;
      this.currentPinnedLinkId = String(row.dataset.linkNoteId || "").trim();
      this.renderLinkCandidates(this.els.linkSearchInput.value, row.dataset.linkNoteId || "");
      this.els.linkSearchInput.value = row.textContent?.trim() || "";
      this.els.linkSearchList.innerHTML = "";
      this.updateLinkPickerConfirmButton();
    });
    this.els.linkSearchList.addEventListener("mouseover", (e) => {
      const row = e.target.closest("[data-link-index]");
      if (!row) return;
      const next = Number(row.dataset.linkIndex);
      if (!Number.isInteger(next) || next === this.currentLinkIndex) return;
      this.currentLinkIndex = next;
      this.renderLinkCandidates(this.els.linkSearchInput.value, this.currentLinkCandidates[next]?.id || "");
    });
    this.els.confirmLinkInsert?.addEventListener("click", () => {
      const selectedId = String(this.currentPinnedLinkId || "").trim();
      if (!selectedId) return;
      void this.insertSelectedLinkNote(selectedId);
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

    this.els.save.addEventListener("click", async () => {
      await this.saveActiveNote();
    });

    this.els.recordPermanent?.addEventListener("click", async () => {
      const note = this.activeNote();
      if (!note || !this.isOriginalRecordableSource(note)) {
        this.onStatus("随笔笔记和文献笔记才能创建永久笔记", "warn");
        return;
      }
      const directoryId = await this.pickPermanentDirectoryForNote(note);
      if (!directoryId) return;
      await this.onStateChange("record-original-from-note", {
        sourceNoteId: note.id,
        sourceType: this.resolvedNoteType(note),
        sourceTitle: note.title,
        sourceBody: this.getEditorValue(),
        directoryId
      });
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
    this.els.literatureQueueList?.addEventListener("click", async (event) => {
      const createButton = event.target.closest("[data-create-original-from-literature]");
      if (createButton) {
        const noteId = String(createButton.getAttribute("data-create-original-from-literature") || "").trim();
        const record = this.literatureQueueRecords(this.activeNote()).find((item) => item.note.id === noteId);
        if (!record) {
          this.onStatus("没有找到要提炼的文献条目", "warn");
          return;
        }
        if (record.lane !== "ready") {
          this.onStatus("这条文献笔记还没准备好进入永久笔记，请先补齐来源、转述、判断种子或追问", "warn");
          return;
        }
        const directoryId = await this.pickPermanentDirectoryForNote(record.note);
        if (!directoryId) return;
        void this.onStateChange("record-original-from-note", {
          sourceNoteId: record.note.id,
          sourceTitle: record.note.title || "",
          sourceType: this.resolvedNoteType(record.note) || "literature",
          sourceBody: record.note.body || "",
          directoryId,
          citation: record.fields.citation || {},
          originalText: record.fields.originalText || "",
          paraphrase: record.fields.paraphrase || "",
          whyKeep: record.fields.whyKeep || "",
          supportsJudgment: record.fields.supportsJudgment || "",
          question: record.fields.question || "",
          boundary: record.fields.boundary || ""
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
      this.els.literatureSupportsJudgment,
      this.els.literatureQuestion,
      this.els.literatureBoundary
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
        const editingTitleNow = this.isEditingTitleLine();
        const wasEditingTitle = this.wasEditingTitleLine;
        this.wasEditingTitleLine = editingTitleNow;
        if (wasEditingTitle && !editingTitleNow) this.maybeSaveOnTitleBlur();
        this.updateToolbarFormattingState();
      } else {
        this.wasEditingTitleLine = false;
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
      const previousValue = this.lastEditorValue || "";
      tab.body = this.getEditorValue();
      if (!this.isLiteratureWorkspaceActive() && this.isWysiwygMode()) {
        const normalized = normalizePlaceholderTitleBody(tab.body);
        if (normalized !== tab.body) {
          tab.body = normalized;
          this.setEditorValue(normalized);
        }
      }
      tab.title = titleFromBody(tab.body);
      this.syncPlaceholderTitleArmed(tab);
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

      if (this.isLiteratureWorkspaceActive()) {
        this.lastEditorValue = tab.body;
        return;
      }
      if (this.isEditingTitleLine()) {
        this.lastTitleInputAt = Date.now();
        if (!this.els.linkPicker.classList.contains("hidden") && this.currentLinkContext) this.closeLinkPicker();
        if (!this.els.tagPicker.classList.contains("hidden") && this.currentTagContext) this.closeTagPicker();
        this.lastEditorValue = tab.body;
        return;
      }

      if (this.skipInlinePickersOnce) {
        this.skipInlinePickersOnce = false;
        if (!this.els.linkPicker.classList.contains("hidden") && this.currentLinkContext) this.closeLinkPicker();
        if (!this.els.tagPicker.classList.contains("hidden") && this.currentTagContext) this.closeTagPicker();
        this.lastEditorValue = tab.body;
        return;
      }

      const inline = this.detectInlineLinkContext();
      const tagInline = this.detectInlineTagContext();
      const explicitEmptyLinkTrigger = inline && !inline.query;
      const explicitEmptyTagTrigger =
        tagInline &&
        !tagInline.query &&
        (Date.now() - this.lastTagTriggerAt < 900 || previousValue.slice(tagInline.start, tagInline.end) !== "#");
      const wantsInlinePicker = Boolean(
        (inline && (inline.query || explicitEmptyLinkTrigger)) ||
          (tagInline && (tagInline.query || explicitEmptyTagTrigger))
      );

      if (!wantsInlinePicker && Date.now() - this.lastPlainEnterAt < 260) {
        if (!this.els.linkPicker.classList.contains("hidden") && this.currentLinkContext) this.closeLinkPicker();
        if (!this.els.tagPicker.classList.contains("hidden") && this.currentTagContext) this.closeTagPicker();
        this.lastEditorValue = tab.body;
        return;
      }

      if (inline && (inline.query || explicitEmptyLinkTrigger)) {
        void this.openLinkPicker(inline.query, { inlineContext: inline });
        this.lastInlinePickerAnchor = inline.end;
      } else if (!this.els.linkPicker.classList.contains("hidden") && this.currentLinkContext) {
        this.closeLinkPicker();
      }

      if (tagInline && (tagInline.query || explicitEmptyTagTrigger)) {
        void this.openTagPicker(tagInline.query, { inlineContext: tagInline });
        this.lastInlinePickerAnchor = tagInline.end;
      } else if (!this.els.tagPicker.classList.contains("hidden") && this.currentTagContext) {
        this.closeTagPicker();
      }
      this.lastEditorValue = tab.body;
  }

  scheduleInlineLinkTriggerProbe() {
    setTimeout(() => {
      const inline = this.detectInlineLinkContext();
      if (!inline || inline.query) return;
      const body = this.getEditorValue();
      const trigger = String(body.slice(inline.start, inline.end) || "");
      if (!["[[", "【【"].includes(trigger)) return;
      void this.openLinkPicker("", { inlineContext: inline, focusInput: true });
      this.lastInlinePickerAnchor = inline.end;
    }, 0);
  }

  handleEditorKeydown(e) {
    if (this.isWysiwygMode()) this.clearMarkdownSelectionOverride();
    if (e.isComposing || e.keyCode === 229) return;
    const mod = e.ctrlKey || e.metaKey;
    const key = String(e.key || "").toLowerCase();
    const inlinePickerOpenBeforeEnter =
      (!this.els.linkPicker.classList.contains("hidden") && this.currentLinkContext) ||
      (!this.els.tagPicker.classList.contains("hidden") && this.currentTagContext);
    if (!mod && (e.key === "[" || e.key === "【")) {
      this.lastLinkTriggerAt = Date.now();
      this.scheduleInlineLinkTriggerProbe();
    }
    if (!mod && e.key === "#") this.lastTagTriggerAt = Date.now();
    if (!mod && !e.shiftKey && e.key === "Enter" && !inlinePickerOpenBeforeEnter) this.lastPlainEnterAt = Date.now();

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
        void this.confirmSelectedLinkCandidate();
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
    if (!options?.autoSave) {
      this.closeLinkPicker();
      this.closeTagPicker();
    }
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
    const skipOriginalityCheck = options?.skipOriginalityCheck === true;

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
      if (markLiteratureComplete && !completion.hasOriginalText) {
        const message = reflectionQuestionsHint("文献笔记还不能标记完成。");
        this.setSaveUiState("blocked", message);
        this.onStatus("文献笔记缺少原文摘录，不能标记为已完成", "warn");
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
    if (this.isOriginalNote(note)) {
      if (skipOriginalityCheck) {
        nextStatus = String(note.status || nextStatus || "draft").trim() || "draft";
      } else {
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
    }

    if (!this.isOriginalNote(note)) {
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
    if (saved && typeof saved === "object" && saved.id) {
      const savedBody = typeof saved.body === "string" ? saved.body : tab.body;
      note.title = saved.title || titleFromBody(savedBody);
      note.body = savedBody;
      note.markdownPath = saved.markdownPath || note.markdownPath;
      note.status = saved.status || note.status;
      note.thinkingStatus = saved.thinkingStatus || note.thinkingStatus || null;
      note.tags = parseTags(savedBody);
      note.links = parseLinks(savedBody);
      note.updatedAt = saved.updatedAt || note.updatedAt;
      note.bodyLoaded = true;
      tab.title = note.title;
      tab.body = savedBody;
    }
    tab.savedBody = tab.body;
    tab.savedTitle = tab.title;
    this.syncPlaceholderTitleArmed(tab);
    tab.dirty = false;
    this.clearDraft(tab.noteId);
    this.setSaveUiState("saved", "当前文件：已自动同步");
    this.setEditorValue(tab.body);
    if (this.isOriginalNote(note)) {
      this.onStatus(
        note.originalityStatus === "pass" ? "永久笔记已同步" : "永久笔记已同步，但仍建议继续打磨",
        note.originalityStatus === "pass" ? "ok" : "warn"
      );
    }
    this.renderTabs();
    this.renderThinkingStatus();
  }
}
