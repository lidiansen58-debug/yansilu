import { escapeHtml } from "./editor-render-utils.js";
const UNTITLED_NOTE_TITLE = "未命名笔记";

function escapeRegExp(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function titleFromBody(body) {
  const lines = String(body || "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (!lines.length) return UNTITLED_NOTE_TITLE;
  return lines[0].replace(/^#+\s*/, "").slice(0, 60) || UNTITLED_NOTE_TITLE;
}

export function selectionDistillationDraft(text = "") {
  return String(text || "")
    .replace(/^\s*[-*>\d.)]+\s*/gm, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
}

export function normalizePlaceholderTitleBody(body = "") {
  const text = String(body || "").replace(/\r\n/g, "\n");
  return text.replace(new RegExp(`^#\\s*${escapeRegExp(UNTITLED_NOTE_TITLE)}(?=\\S)`), "# ");
}

export function normalizedNoteTitleText(title = "") {
  return String(title || "").trim() || UNTITLED_NOTE_TITLE;
}

export function noteUsesPlaceholderTitle(title = "") {
  return normalizedNoteTitleText(title) === UNTITLED_NOTE_TITLE;
}

export function normalizedBodyTextForDirtyCheck(body = "") {
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

const LITERATURE_SECTION_ORDER = [
  "citation",
  "originalText",
  "paraphrase",
  "supportsJudgment",
  "question",
  "boundary",
  "whyKeep"
];

const PERMANENT_SECTION_LABELS = {
  coreClaim: "核心观点",
  whyTrue: "为什么成立",
  boundary: "边界 / 反例",
  relatedClues: "关联线索",
  supplement: "补充内容"
};

const PERMANENT_SECTION_ALIASES = {
  coreClaim: ["核心判断", "中心观点", "一句话判断", "论点"],
  whyTrue: ["成立理由", "理由", "论证", "为什么它成立"],
  boundary: ["边界/反例", "边界与反例", "反例", "适用边界", "适用条件"],
  relatedClues: ["来源线索", "证据来源", "关联", "相关线索", "延伸线索"],
  supplement: ["附加内容", "补充说明", "备注"]
};

export function normalizeLooseText(value = "") {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s.,;:!?'"“”‘’()\[\]{}<>/\\|`~@#$%^&*_+=-]+/g, "");
}

export function countIdeaUnits(value = "") {
  const matches = String(value || "").trim().match(/[\u4e00-\u9fff]|[A-Za-z0-9]+/g);
  return Array.isArray(matches) ? matches.length : 0;
}

export function noteHasBoundarySignal(note = {}) {
  if (String(note?.boundaryOrCounterpoint || note?.boundary_or_counterpoint || "").trim()) return true;
  const body = String(note?.body || note?.markdown || "");
  return /边界|反例|不成立|适用条件|反方|counterpoint|boundary|counterexample/i.test(body);
}

export function collectDistillationWarnings(note = {}) {
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

export function distillationDraftFromForm(form, note = {}) {
  return {
    title: note?.title || "",
    body: note?.body || "",
    thesis: String(form?.querySelector?.('[name="thesis"]')?.value || note?.thesis || "").trim(),
    threeLineSummary: [1, 2, 3].map((idx) => String(form?.querySelector?.(`[name="summary${idx}"]`)?.value || "").trim()),
    boundaryOrCounterpoint: String(form?.querySelector?.('[name="boundaryOrCounterpoint"]')?.value || note?.boundaryOrCounterpoint || "").trim()
  };
}

export function renderDistillationQualityContent(note = {}) {
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

export function renderDistillationReadinessList({
  thesis = "",
  summaryLines = [],
  boundaryOrCounterpoint = "",
  statusValue = "",
  qualityWarnings = []
} = {}) {
  const summaryCount = (Array.isArray(summaryLines) ? summaryLines : []).filter(Boolean).length;
  const items = [
    {
      label: "一句话判断",
      done: Boolean(String(thesis || "").trim()),
      detail: "说明这条笔记到底主张什么"
    },
    {
      label: "三句话压缩",
      done: summaryCount === 3,
      detail: summaryCount === 3 ? "观点、理由、用途都已写出" : `还差 ${Math.max(0, 3 - summaryCount)} 句`
    },
    {
      label: "边界或反方",
      done: Boolean(String(boundaryOrCounterpoint || "").trim()),
      detail: "写清楚它在哪里不成立"
    },
    {
      label: "用户确认",
      done: String(statusValue || "").trim() === "confirmed",
      detail: "确认后再进入关系和写作"
    }
  ];
  const doneCount = items.filter((item) => item.done).length;
  const warningText = Array.isArray(qualityWarnings) && qualityWarnings.length
    ? `还有 ${qualityWarnings.length} 项需要打磨`
    : "质量提示通过";
  return `
    <div class="distillation-readiness" data-note-distillation-readiness>
      <div class="semantic-relation-group-head">
        <strong>完成条件</strong>
        <span>${doneCount}/${items.length} · ${escapeHtml(warningText)}</span>
      </div>
      <div class="distillation-readiness-list">
        ${items
          .map(
            (item) => `
              <div class="distillation-readiness-item ${item.done ? "is-done" : ""}">
                <span>${escapeHtml(item.done ? "完成" : "待补")}</span>
                <strong>${escapeHtml(item.label)}</strong>
                <small>${escapeHtml(item.detail)}</small>
              </div>
            `
          )
          .join("")}
      </div>
    </div>
  `;
}

export function distillationStatusText(status = "") {
  const key = String(status || "").trim().toLowerCase();
  if (key === "confirmed") return "已确认";
  if (key === "draft") return "待确认";
  if (key === "missing") return "待提纯";
  return key || "待提纯";
}

export function distillationNextStepGuide(note = {}) {
  const thesis = String(note?.thesis || "").trim();
  const summary = [0, 1, 2].map((idx) => String((note?.threeLineSummary || [])[idx] || "").trim());
  const boundary = String(note?.boundaryOrCounterpoint || note?.boundary_or_counterpoint || "").trim();
  const status = String(note?.distillationStatus || "").trim().toLowerCase();

  if (!thesis) {
    return {
      key: "thesis",
      title: "先把这条笔记变成一句判断",
      body: "不要急着建关系。先写出一个可以被反驳、可以被复用的主张，图谱和写作才知道这条笔记在表达什么。",
      actionLabel: "写一句判断"
    };
  }
  if (summary.some((line) => !line)) {
    return {
      key: `summary${Math.max(1, summary.findIndex((line) => !line) + 1)}`,
      title: "把判断压成三句话",
      body: "三句话分别回答：它说什么、为什么成立或重要、服务于哪个问题或写作方向。",
      actionLabel: "补三句话"
    };
  }
  if (!boundary) {
    return {
      key: "boundary",
      title: "补边界或反例",
      body: "一条能写作的观点需要知道自己在哪里不成立。先补适用条件、反方或最容易误用的地方。",
      actionLabel: "补边界/反例"
    };
  }
  if (status !== "confirmed") {
    return {
      key: "confirm",
      title: "确认这条观点",
      body: "判断、三句话和边界已经具备。确认后，它就可以更稳定地进入图谱关系、主题索引和写作篮。",
      actionLabel: "确认观点"
    };
  }
  return {
    key: "relations",
    title: "观点已确认，继续看关系",
    body: "下一步在图谱或关系区里判断它应该连接到谁。连接理由写清楚后，写作中心会更容易复用。",
    actionLabel: "去看关系"
  };
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
export function normalizeFieldText(value = "") {
  return String(value || "").replace(/\r\n/g, "\n").trim();
}

function stripMarkdownTitle(body = "") {
  const text = String(body || "").replace(/\r\n/g, "\n");
  const lines = text.split("\n");
  if (!lines.length) return "";
  return lines.slice(1).join("\n").replace(/^\n+/, "");
}

function splitMarkdownLevelTwoSections(body = "") {
  const text = String(body || "").replace(/\r\n/g, "\n").replace(/^\n+|\n+$/g, "");
  if (!text) return { preface: "", sections: [] };
  const lines = text.split("\n");
  const sections = [];
  const prefaceLines = [];
  let currentHeading = "";
  let currentLines = [];
  for (const line of lines) {
    const headingMatch = /^##\s+(.+?)\s*$/.exec(line);
    if (headingMatch) {
      if (currentHeading) {
        sections.push({
          heading: currentHeading,
          body: currentLines.join("\n").replace(/^\n+|\n+$/g, "")
        });
      } else {
        prefaceLines.push(...currentLines);
      }
      currentHeading = String(headingMatch[1] || "").trim();
      currentLines = [];
      continue;
    }
    currentLines.push(line);
  }
  if (currentHeading) {
    sections.push({
      heading: currentHeading,
      body: currentLines.join("\n").replace(/^\n+|\n+$/g, "")
    });
  } else {
    prefaceLines.push(...currentLines);
  }
  return {
    preface: prefaceLines.join("\n").replace(/^\n+|\n+$/g, ""),
    sections
  };
}

export function normalizedLiteratureSectionLabels(sectionLabels = {}) {
  const normalized = {};
  for (const key of LITERATURE_SECTION_ORDER) {
    const label = LITERATURE_SECTION_LABELS[key];
    normalized[key] = normalizeFieldText(sectionLabels?.[key] || "") || label;
  }
  return normalized;
}

export function deriveLiteratureSectionLabelsFromTemplate(templateSource = "") {
  const normalized = normalizedLiteratureSectionLabels();
  const { sections } = splitMarkdownLevelTwoSections(stripMarkdownTitle(templateSource));
  const remainingKeys = new Set(LITERATURE_SECTION_ORDER);
  const explicitMatches = new Map();

  for (const section of sections) {
    const heading = normalizeFieldText(section?.heading || "");
    if (!heading) continue;
    const headingToken = normalizeLooseText(heading);
    const matchedKey = LITERATURE_SECTION_ORDER.find((key) =>
      literatureSectionLabelsFor(key).some((label) => normalizeLooseText(label) === headingToken)
    );
    if (!matchedKey || explicitMatches.has(matchedKey)) continue;
    explicitMatches.set(matchedKey, heading);
    remainingKeys.delete(matchedKey);
  }

  for (const [key, heading] of explicitMatches.entries()) normalized[key] = heading;
  const fallbackQueue = LITERATURE_SECTION_ORDER.filter((key) => remainingKeys.has(key));
  let fallbackEnabled = true;
  for (let index = 0; index < sections.length; index += 1) {
    const heading = normalizeFieldText(sections[index]?.heading || "");
    if (!heading) continue;
    const isExplicit = Array.from(explicitMatches.values()).some(
      (mappedHeading) => normalizeLooseText(mappedHeading) === normalizeLooseText(heading)
    );
    if (isExplicit) continue;
    if (!fallbackEnabled || !fallbackQueue.length) break;
    const remainingHeadings = sections
      .slice(index)
      .map((section) => normalizeFieldText(section?.heading || ""))
      .filter(
        (item) =>
          item &&
          !Array.from(explicitMatches.values()).some((mappedHeading) => normalizeLooseText(mappedHeading) === normalizeLooseText(item))
      );
    if (remainingHeadings.length > fallbackQueue.length) {
      fallbackEnabled = false;
      continue;
    }
    const key = fallbackQueue.shift();
    if (!key) break;
    normalized[key] = heading;
  }

  return normalized;
}

export function validateLiteratureTemplateSource(templateSource = "") {
  const content = stripMarkdownTitle(templateSource);
  const { sections } = splitMarkdownLevelTwoSections(content);
  if (sections.length > LITERATURE_SECTION_ORDER.length) {
    return {
      ok: false,
      message: `文献模板当前只支持 ${LITERATURE_SECTION_ORDER.length} 个以内的顶层 section；请把额外说明放进已有 section，或改成三级标题。`
    };
  }

  const usedKeys = new Set();
  let unresolvedCount = 0;
  let permanentHeadingCount = 0;
  for (const section of sections) {
    const heading = normalizeFieldText(section?.heading || "");
    if (!heading) continue;
    const headingToken = normalizeLooseText(heading);
    const matchedKey = LITERATURE_SECTION_ORDER.find(
      (key) =>
        !usedKeys.has(key) &&
        literatureSectionLabelsFor(key).some((label) => normalizeLooseText(label) === headingToken)
    );
    if (matchedKey) {
      usedKeys.add(matchedKey);
      continue;
    }
    if (Object.keys(PERMANENT_SECTION_LABELS).some((key) => permanentSectionLabelsFor(key).some((label) => normalizeLooseText(label) === headingToken))) {
      permanentHeadingCount += 1;
    }
    unresolvedCount += 1;
  }

  const remainingSlots = LITERATURE_SECTION_ORDER.length - usedKeys.size;
  if (sections.length > 0 && sections.length < LITERATURE_SECTION_ORDER.length && usedKeys.size < 3 && permanentHeadingCount > 0) {
    return {
      ok: false,
      message: `文献模板至少要能看出“来源 / 原文 / 转述”这类骨架；如果要整体改名，请至少保留 3 个顶层 section，并保留完整的 ${LITERATURE_SECTION_ORDER.length} 个顶层 section。`
    };
  }
  if (sections.length === LITERATURE_SECTION_ORDER.length && unresolvedCount > 0 && usedKeys.size > 0) {
    return {
      ok: false,
      message: "文献模板当前不支持在完整顶层骨架里混用默认字段名和自定义 section。请要么整体改名，要么只保留现有字段，不要用自定义二级标题替换其中一格。"
    };
  }
  if (unresolvedCount > remainingSlots) {
    return {
      ok: false,
      message: "文献模板里有无法识别的顶层 section。请只保留现有字段的改名，不要新增额外的二级标题。"
    };
  }
  return { ok: true, message: "" };
}

export function normalizeLiteratureSectionLabelCandidates(candidates = [], fallback = {}) {
  const normalized = [];
  const seen = new Set();
  for (const candidate of [...(Array.isArray(candidates) ? candidates : []), fallback]) {
    const labels = normalizedLiteratureSectionLabels(candidate || {});
    const signature = JSON.stringify(labels);
    if (seen.has(signature)) continue;
    seen.add(signature);
    normalized.push(labels);
  }
  return normalized.length ? normalized : [normalizedLiteratureSectionLabels()];
}

function literatureSectionLabelsFor(key = "", options = {}) {
  const labels = normalizedLiteratureSectionLabels(options?.sectionLabels || options);
  const primary = labels[key] || LITERATURE_SECTION_LABELS[key];
  return [...new Set([primary, LITERATURE_SECTION_LABELS[key], ...(LITERATURE_SECTION_ALIASES[key] || [])].filter(Boolean))];
}

function allLiteratureSectionLabels(options = {}) {
  return LITERATURE_SECTION_ORDER.flatMap((key) => literatureSectionLabelsFor(key, options));
}

function permanentSectionLabelsFor(key = "") {
  const primary = PERMANENT_SECTION_LABELS[key];
  return [...new Set([primary, ...(PERMANENT_SECTION_ALIASES[key] || [])].filter(Boolean))];
}

function allPermanentSectionLabels() {
  return Object.keys(PERMANENT_SECTION_LABELS).flatMap((key) => permanentSectionLabelsFor(key));
}

function normalizePermanentExtraSections(sections = []) {
  return (Array.isArray(sections) ? sections : [])
    .map((section) => ({
      heading: String(section?.heading || "").trim(),
      body: normalizeFieldText(section?.body || "")
    }))
    .filter((section) => section.heading);
}

function normalizePermanentSectionLayout(layout = []) {
  const normalized = [];
  const seenKnown = new Set();
  for (const item of Array.isArray(layout) ? layout : []) {
    const kind = String(item?.kind || "").trim().toLowerCase();
    if (kind === "known") {
      const key = String(item?.key || "").trim();
      if (!PERMANENT_SECTION_LABELS[key] || seenKnown.has(key)) continue;
      seenKnown.add(key);
      normalized.push({ kind: "known", key });
      continue;
    }
    if (kind === "duplicate_known") {
      const index = Number(item?.index);
      if (!Number.isInteger(index) || index < 0) continue;
      normalized.push({ kind: "duplicate_known", index });
      continue;
    }
    if (kind === "unknown") {
      const index = Number(item?.index);
      if (!Number.isInteger(index) || index < 0) continue;
      normalized.push({ kind: "unknown", index });
    }
  }
  return normalized;
}

function defaultPermanentSectionLayout() {
  return Object.keys(PERMANENT_SECTION_LABELS).map((key) => ({ kind: "known", key }));
}

function normalizeRepeatedKnownPermanentSections(sections = []) {
  return (Array.isArray(sections) ? sections : [])
    .map((section) => ({
      key: String(section?.key || "").trim(),
      heading: String(section?.heading || "").trim(),
      body: normalizeFieldText(section?.body || "")
    }))
    .filter((section) => PERMANENT_SECTION_LABELS[section.key] && section.heading);
}

function permanentSectionKeyFromHeading(heading = "") {
  const normalizedHeading = normalizeLooseText(heading);
  for (const key of Object.keys(PERMANENT_SECTION_LABELS)) {
    if (permanentSectionLabelsFor(key).some((label) => normalizeLooseText(label) === normalizedHeading)) {
      return key;
    }
  }
  return "";
}

function inferLegacyPermanentFields(content = "") {
  const text = normalizeFieldText(content);
  if (!text) {
    return {
      preface: "",
      coreClaim: "",
      whyTrue: "",
      boundary: "",
      relatedClues: "",
      supplement: "",
      extraSections: [],
      repeatedKnownSections: [],
      sectionLayout: []
    };
  }
  const paragraphs = text
    .split(/\n{2,}/)
    .map((item) => normalizeFieldText(item))
    .filter(Boolean);
  const firstParagraph = paragraphs[0] || "";
  const rest = paragraphs.slice(1).join("\n\n");
  const canUseFirstParagraphAsClaim =
    firstParagraph &&
    firstParagraph.length <= 180 &&
    !/^[#>*\-]/.test(firstParagraph) &&
    countIdeaUnits(firstParagraph) >= 4;
  if (!canUseFirstParagraphAsClaim) {
    return {
      preface: "",
      coreClaim: "",
      whyTrue: "",
      boundary: "",
      relatedClues: "",
      supplement: text,
      extraSections: [],
      repeatedKnownSections: [],
      sectionLayout: []
    };
  }
  return {
    preface: "",
    coreClaim: firstParagraph,
    whyTrue: "",
    boundary: "",
    relatedClues: "",
    supplement: rest,
    extraSections: [],
    repeatedKnownSections: [],
    sectionLayout: []
  };
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

export function literatureCitationState(citation = {}) {
  const fields = normalizeLiteratureCitationFields(citation);
  const missingKeys = REQUIRED_LITERATURE_CITATION_FIELDS.filter((key) => !fields[key]);
  return {
    fields,
    complete: missingKeys.length === 0,
    missingKeys,
    missingLabels: missingKeys.map((key) => LITERATURE_CITATION_FIELD_LABELS[key])
  };
}

export function parseLiteratureWorkspace(body = "", options = {}) {
  const title = titleFromBody(body);
  const content = stripMarkdownTitle(body);
  const candidates = normalizeLiteratureSectionLabelCandidates(options?.sectionLabelCandidates, options?.sectionLabels || options);
  let bestParsed = null;
  let bestScore = Number.NEGATIVE_INFINITY;

  for (const sectionLabels of candidates) {
    const structured = allLiteratureSectionLabels({ sectionLabels }).some((label) =>
      new RegExp(`(^|\\n)##\\s+${escapeRegExp(label)}\\s*(\\n|$)`, "m").test(content)
    );
    const citation = structured
      ? parseLiteratureCitationFields(extractLiteratureSection(content, literatureSectionLabelsFor("citation", { sectionLabels })))
      : emptyLiteratureCitationFields();
    const originalText = structured ? extractLiteratureSection(content, literatureSectionLabelsFor("originalText", { sectionLabels })) : content.trim();
    const parsed = {
      title,
      citation,
      originalText,
      paraphrase: structured ? extractLiteratureSection(content, literatureSectionLabelsFor("paraphrase", { sectionLabels })) : "",
      whyKeep: structured ? extractLiteratureSection(content, literatureSectionLabelsFor("whyKeep", { sectionLabels })) : "",
      supportsJudgment: structured ? extractLiteratureSection(content, literatureSectionLabelsFor("supportsJudgment", { sectionLabels })) : "",
      question: structured ? extractLiteratureSection(content, literatureSectionLabelsFor("question", { sectionLabels })) : "",
      boundary: structured ? extractLiteratureSection(content, literatureSectionLabelsFor("boundary", { sectionLabels })) : "",
      sectionLabels
    };
    const score =
      (structured ? 100 : 0) +
      LITERATURE_SECTION_ORDER.reduce((total, key) => {
        if (key === "citation") {
          return total + (Object.values(parsed.citation || {}).some(Boolean) ? 20 : 0);
        }
        return total + (normalizeFieldText(parsed[key] || "") ? 20 : 0);
      }, 0);
    if (score > bestScore) {
      bestScore = score;
      bestParsed = parsed;
    }
  }

  return bestParsed || {
    title,
    citation: emptyLiteratureCitationFields(),
    originalText: content.trim(),
    paraphrase: "",
    whyKeep: "",
    supportsJudgment: "",
    question: "",
    boundary: "",
    sectionLabels: normalizedLiteratureSectionLabels()
  };
}

export function composeLiteratureWorkspace(fields = {}, options = {}) {
  const title = String(fields.title || "未命名笔记").trim() || "未命名笔记";
  const sectionLabels = normalizedLiteratureSectionLabels(options?.sectionLabels || options);
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
    `## ${sectionLabels.citation}`,
    "",
    ...composeLiteratureCitationLines(citation),
    "",
    `## ${sectionLabels.originalText}`,
    "",
    originalText,
    "",
    `## ${sectionLabels.paraphrase}`,
    "",
    paraphrase,
    ""
  ];
  if (supportsJudgment) lines.push(`## ${sectionLabels.supportsJudgment}`, "", supportsJudgment, "");
  if (question) lines.push(`## ${sectionLabels.question}`, "", question, "");
  if (boundary) lines.push(`## ${sectionLabels.boundary}`, "", boundary, "");
  if (whyKeep) lines.push(`## ${sectionLabels.whyKeep}`, "", whyKeep, "");
  return lines.join("\n");
}

export function literatureTemplateBody(title = "未命名笔记") {
  return composeLiteratureWorkspace({ title });
}

export function parsePermanentWorkspace(body = "") {
  const title = titleFromBody(body);
  const content = stripMarkdownTitle(body);
  const { preface, sections } = splitMarkdownLevelTwoSections(content);
  const structured = allPermanentSectionLabels().some((label) =>
    new RegExp(`(^|\\n)##\\s+${escapeRegExp(label)}\\s*(\\n|$)`, "m").test(content)
  );
  const parsed = {
    title,
    preface: "",
    coreClaim: "",
    whyTrue: "",
    boundary: "",
    relatedClues: "",
    supplement: "",
    extraSections: [],
    repeatedKnownSections: [],
    sectionLayout: [],
    structured
  };

  if (!structured) {
    if (sections.length) {
      return {
        ...parsed,
        preface: normalizeFieldText(preface),
        extraSections: normalizePermanentExtraSections(sections),
        repeatedKnownSections: [],
        sectionLayout: normalizePermanentSectionLayout(
          sections.map((_, index) => ({ kind: "unknown", index }))
        )
      };
    }
    return {
      ...parsed,
      ...inferLegacyPermanentFields(content)
    };
  }

  parsed.preface = normalizeFieldText(preface);
  const supplementParts = [];
  const unknownSections = [];
  const repeatedKnownSections = [];
  const sectionLayout = [];
  const seenKnown = new Set();
  for (const section of sections) {
    const key = permanentSectionKeyFromHeading(section.heading);
    const sectionBody = normalizeFieldText(section.body);
    if (!key) {
      unknownSections.push(section);
      sectionLayout.push({ kind: "unknown", index: unknownSections.length - 1 });
      continue;
    }
    if (seenKnown.has(key)) {
      repeatedKnownSections.push({
        key,
        heading: String(section.heading || "").trim() || PERMANENT_SECTION_LABELS[key],
        body: sectionBody
      });
      sectionLayout.push({ kind: "duplicate_known", index: repeatedKnownSections.length - 1 });
      continue;
    }
    if (!seenKnown.has(key)) {
      sectionLayout.push({ kind: "known", key });
      seenKnown.add(key);
    }
    if (key === "supplement") {
      if (sectionBody) supplementParts.push(sectionBody);
      continue;
    }
    parsed[key] = parsed[key] ? `${parsed[key]}\n\n${sectionBody}` : sectionBody;
  }
  parsed.supplement = normalizeFieldText(supplementParts.join("\n\n"));
  parsed.extraSections = normalizePermanentExtraSections(unknownSections);
  parsed.repeatedKnownSections = normalizeRepeatedKnownPermanentSections(repeatedKnownSections);
  parsed.sectionLayout = normalizePermanentSectionLayout(sectionLayout);
  return parsed;
}

export function composePermanentWorkspace(fields = {}, options = {}) {
  const title = String(fields.title || "未命名笔记").trim() || "未命名笔记";
  const includeEmptySections = options?.includeEmptySections === true;
  const appendRemainingKnown = options?.appendRemainingKnown !== false;
  const preface = normalizeFieldText(fields.preface || options?.preface);
  const normalized = {
    coreClaim: normalizeFieldText(fields.coreClaim),
    whyTrue: normalizeFieldText(fields.whyTrue),
    boundary: normalizeFieldText(fields.boundary),
    relatedClues: normalizeFieldText(fields.relatedClues),
    supplement: normalizeFieldText(fields.supplement)
  };
  const extraSections = normalizePermanentExtraSections(options?.extraSections);
  const repeatedKnownSections = normalizeRepeatedKnownPermanentSections(options?.repeatedKnownSections);
  const sectionLayout = normalizePermanentSectionLayout(options?.sectionLayout);
  const lines = [`# ${title}`, ""];
  if (preface) lines.push(preface, "");
  const sectionOrder = [
    ["coreClaim", PERMANENT_SECTION_LABELS.coreClaim],
    ["whyTrue", PERMANENT_SECTION_LABELS.whyTrue],
    ["boundary", PERMANENT_SECTION_LABELS.boundary],
    ["relatedClues", PERMANENT_SECTION_LABELS.relatedClues],
    ["supplement", PERMANENT_SECTION_LABELS.supplement]
  ];
  const labelByKey = Object.fromEntries(sectionOrder);
  const emittedKnown = new Set();
  const emittedUnknown = new Set();
  const resolvedLayout = sectionLayout.length ? sectionLayout : defaultPermanentSectionLayout();

  const appendKnownSection = (key = "") => {
    const value = normalized[key];
    if (emittedKnown.has(key)) return;
    if (!includeEmptySections && !value) return;
    const label = labelByKey[key];
    if (!label) return;
    lines.push(`## ${label}`, "", value, "");
    emittedKnown.add(key);
  };

  const appendUnknownSection = (index = -1) => {
    if (emittedUnknown.has(index)) return;
    const section = extraSections[index];
    if (!section) return;
    lines.push(`## ${section.heading}`, "", section.body, "");
    emittedUnknown.add(index);
  };

  const emittedDuplicateKnown = new Set();
  const appendDuplicateKnownSection = (index = -1) => {
    if (emittedDuplicateKnown.has(index)) return;
    const section = repeatedKnownSections[index];
    if (!section) return;
    lines.push(`## ${section.heading || PERMANENT_SECTION_LABELS[section.key]}`, "", section.body, "");
    emittedDuplicateKnown.add(index);
  };

  for (const item of resolvedLayout) {
    if (item.kind === "known") appendKnownSection(item.key);
    if (item.kind === "duplicate_known") appendDuplicateKnownSection(item.index);
    if (item.kind === "unknown") appendUnknownSection(item.index);
  }
  if (appendRemainingKnown) {
    for (const [key] of sectionOrder) {
      appendKnownSection(key);
    }
  }
  for (let index = 0; index < repeatedKnownSections.length; index += 1) {
    appendDuplicateKnownSection(index);
  }
  for (let index = 0; index < extraSections.length; index += 1) {
    appendUnknownSection(index);
  }
  return lines.join("\n").replace(/\n+$/g, "\n");
}

export function reflectionQuestionsHint(prefix = "") {
  const head = String(prefix || "").trim();
  return `${head ? `${head} ` : ""}${REFLECTION_QUESTIONS.join("  ")}`.trim();
}

export function authorshipSeedFromBody(body = "") {
  const lines = String(body || "")
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines[0]?.startsWith("#")) lines.shift();
  return lines.join(" ").slice(0, 180).trim();
}
