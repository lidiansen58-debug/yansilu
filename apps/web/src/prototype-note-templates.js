import {
  composePermanentWorkspace,
  normalizeFieldText,
  parsePermanentWorkspace,
  validateLiteratureTemplateSource
} from "./components-editor-pane.js";
import { defaultLiteratureTemplateSource, legacyLiteratureTemplateSource } from "./literature-note-template.js";
export { defaultLiteratureTemplateSource };

export const PERMANENT_TEMPLATE_SETTINGS_FIELDS = [
  { key: "coreClaim", label: "核心观点", note: "核心字段，不建议隐藏" },
  { key: "whyTrue", label: "为什么成立", note: "核心字段，不建议隐藏" },
  { key: "boundary", label: "边界 / 反例", note: "核心字段，不建议隐藏" },
  { key: "relatedClues", label: "相关笔记", note: "核心字段，不建议隐藏" },
  { key: "supplement", label: "补充内容", note: "可选增强字段" }
];

export const LITERATURE_TEMPLATE_SETTINGS_FIELDS = [
  { key: "citation", label: "出处", note: "标题及页码、章节或链接" },
  { key: "originalText", label: "原文", note: "保留可核对的摘录或原文片段" },
  { key: "paraphrase", label: "我的理解", note: "用自己的话说明原文的意思" },
  { key: "supportsJudgment", label: "我的想法", note: "可选字段，旧模板仍支持" },
  { key: "question", label: "追问", note: "可选增强字段" },
  { key: "boundary", label: "边界 / 反例", note: "可选增强字段" },
  { key: "whyKeep", label: "保留原因", note: "可选增强字段" }
];

export const NOTE_TEMPLATE_STORAGE_KEYS = {
  permanent: "yansilu:settings:note-template:permanent",
  literature: "yansilu:settings:note-template:literature"
};

export const NOTE_TEMPLATE_HISTORY_LIMIT = 8;

export const PERMANENT_TEMPLATE_FALLBACK_HINT_LABELS = {
  coreClaim: "核心观点",
  whyTrue: "为什么成立",
  boundary: "边界 / 反例",
  relatedClues: "相关笔记",
  supplement: "补充内容"
};

function normalizeTemplateKind(kind = "") {
  return String(kind || "").trim().toLowerCase() === "literature" ? "literature" : "permanent";
}

export function defaultPermanentTemplateSource(title = "{{title}}") {
  return [
    `# ${String(title || "{{title}}").trim() || "{{title}}"}`,
    "",
    "## 核心观点",
    "",
    "写成一句可被反驳、可被引用、值得保留的判断。",
    "## 为什么成立",
    "",
    "说明这条判断依赖的理由、证据或经验。",
    "## 证据 / 来源",
    "",
    "来自哪条文献笔记、经验、案例或观察？",
    "",
    "## 相关笔记",
    "",
    "它接下来适合连接到哪些已有笔记、可写主题或写作方向？",
    "",
    "## 边界 / 反例",
    "",
    "这条判断在什么条件下不成立？",
    ""
  ].join("\n");
}

export function legacyPermanentTemplateSource(title = "{{title}}") {
  return [
    `# ${String(title || "{{title}}").trim() || "{{title}}"}`,
    "",
    "## 核心观点",
    "",
    "> 写成一句可被反驳、可被引用、值得保留的判断。",
    "## 为什么成立",
    "",
    "> 说明这条判断依赖的理由、证据或经验。",
    "## 证据 / 来源",
    "",
    "- 来自哪条文献笔记、经验、案例或观察？",
    "",
    "## 关联线索",
    "",
    "- 它连接到哪些已有笔记、主题或写作方向？",
    "",
    "## 边界 / 反例",
    "",
    "- 这条判断在什么条件下不成立？",
    ""
  ].join("\n");
}

export function defaultTemplateSourceForKind(kind = "") {
  return normalizeTemplateKind(kind) === "literature"
    ? defaultLiteratureTemplateSource()
    : defaultPermanentTemplateSource();
}

export function normalizeNoteTemplateSource(text = "", kind = "") {
  const normalized = String(text || "").replace(/\r\n/g, "\n").trim();
  return normalized || defaultTemplateSourceForKind(kind);
}

export function normalizeStoredNoteTemplateSource(text = "", kind = "") {
  const cleanKind = normalizeTemplateKind(kind);
  const normalized = normalizeNoteTemplateSource(text, cleanKind);
  if (cleanKind === "literature") {
    return normalized === legacyLiteratureTemplateSource().trim() ? defaultLiteratureTemplateSource() : normalized;
  }
  return normalized.replace(/\r\n/g, "\n").trim() === legacyPermanentTemplateSource().replace(/\r\n/g, "\n").trim()
    ? defaultTemplateSourceForKind(cleanKind)
    : normalized;
}

export function normalizeNoteTemplateHistory(items = [], kind = "") {
  const cleanKind = normalizeTemplateKind(kind);
  const normalized = [];
  const seen = new Set();
  for (const item of Array.isArray(items) ? items : []) {
    const text = normalizeNoteTemplateSource(item, cleanKind);
    if (cleanKind === "literature" && !validateLiteratureTemplateSource(text).ok) continue;
    if (!text || seen.has(text)) continue;
    seen.add(text);
    normalized.push(text);
    if (normalized.length >= NOTE_TEMPLATE_HISTORY_LIMIT) break;
  }
  return normalized;
}

export function noteTemplateHistoryWithPrevious(history = [], previousText = "", kind = "") {
  const cleanPrevious = normalizeNoteTemplateSource(previousText, kind);
  if (!cleanPrevious) return normalizeNoteTemplateHistory(history, kind);
  return normalizeNoteTemplateHistory([cleanPrevious, ...(Array.isArray(history) ? history : [])], kind);
}

export function normalizeDraftBuffer(text = "") {
  return String(text || "").replace(/\r\n/g, "\n");
}

export function applyTitleToNoteTemplate(templateSource = "", title = "未命名笔记", kind = "", deps = {}) {
  const { ensureEditableNoteBody = (body = "") => String(body || "") } = deps;
  const cleanTitle = String(title || "未命名笔记").trim() || "未命名笔记";
  const fallbackSource = defaultTemplateSourceForKind(kind);
  const source = normalizeNoteTemplateSource(templateSource, kind) || fallbackSource;
  const replaced = source.replace(/\{\{\s*title\s*\}\}/gi, cleanTitle);
  if (/^\s*#\s+/m.test(replaced)) return ensureEditableNoteBody(replaced);
  return ensureEditableNoteBody(`# ${cleanTitle}\n\n${replaced}`);
}

export function mergeTemplateFieldText(base = "", addition = "") {
  const normalizedBase = normalizeFieldText(base);
  const normalizedAddition = normalizeFieldText(addition);
  if (!normalizedBase) return normalizedAddition;
  if (!normalizedAddition) return normalizedBase;
  if (normalizedBase === normalizedAddition) return normalizedAddition;
  return `${normalizedBase}\n\n${normalizedAddition}`;
}

export function composePermanentTemplateDraft(fields = {}, deps = {}) {
  const { permanentNoteTemplateBody = defaultPermanentTemplateSource } = deps;
  const title = String(fields.title || "未命名笔记").trim() || "未命名笔记";
  const templateBody = permanentNoteTemplateBody(title);
  if (normalizeDraftBuffer(templateBody).trim() === defaultPermanentTemplateSource(title).trim()) {
    return composePermanentWorkspace({ ...fields, title });
  }
  const parsedTemplate = parsePermanentWorkspace(templateBody);
  const hasTemplateStructure =
    parsedTemplate.structured === true ||
    Boolean(parsedTemplate.preface) ||
    (Array.isArray(parsedTemplate.sectionLayout) && parsedTemplate.sectionLayout.length > 0) ||
    (Array.isArray(parsedTemplate.extraSections) && parsedTemplate.extraSections.length > 0) ||
    (Array.isArray(parsedTemplate.repeatedKnownSections) && parsedTemplate.repeatedKnownSections.length > 0);

  if (!hasTemplateStructure) {
    return composePermanentWorkspace({
      ...fields,
      title
    });
  }

  const knownKeysInTemplate = new Set(
    (Array.isArray(parsedTemplate.sectionLayout) ? parsedTemplate.sectionLayout : [])
      .filter((item) => item?.kind === "known" && item?.key)
      .map((item) => item.key)
  );
  const fallbackFieldEntries = Object.entries({
    coreClaim: normalizeFieldText(fields.coreClaim),
    whyTrue: normalizeFieldText(fields.whyTrue),
    boundary: normalizeFieldText(fields.boundary),
    relatedClues: normalizeFieldText(fields.relatedClues),
    supplement: normalizeFieldText(fields.supplement)
  }).filter(([key, value]) => value && !knownKeysInTemplate.has(key));
  const extraSections = Array.isArray(parsedTemplate.extraSections) ? [...parsedTemplate.extraSections] : [];
  const sectionLayout = Array.isArray(parsedTemplate.sectionLayout) ? [...parsedTemplate.sectionLayout] : [];
  if (fallbackFieldEntries.length) {
    extraSections.push({
      heading: "来源生成提示",
      body: fallbackFieldEntries
        .map(([key, value]) => `### ${PERMANENT_TEMPLATE_FALLBACK_HINT_LABELS[key] || key}\n\n${value}`)
        .join("\n\n")
    });
    sectionLayout.push({ kind: "unknown", index: extraSections.length - 1 });
  }

  return composePermanentWorkspace(
    {
      title,
      coreClaim: mergeTemplateFieldText(parsedTemplate.coreClaim, fields.coreClaim),
      whyTrue: mergeTemplateFieldText(parsedTemplate.whyTrue, fields.whyTrue),
      boundary: mergeTemplateFieldText(parsedTemplate.boundary, fields.boundary),
      relatedClues: mergeTemplateFieldText(parsedTemplate.relatedClues, fields.relatedClues),
      supplement: mergeTemplateFieldText(parsedTemplate.supplement, fields.supplement)
    },
    {
      preface: parsedTemplate.preface,
      extraSections,
      repeatedKnownSections: parsedTemplate.repeatedKnownSections,
      sectionLayout,
      appendRemainingKnown: false
    }
  );
}
