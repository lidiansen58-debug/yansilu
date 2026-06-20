import { escapeHtml } from "./editor-render-utils.js";
import {
  isHiddenSemanticRelation,
  isMarkdownWikilinkSemanticRelation
} from "./writing-readiness.js";

export function noteTypeGlyph(type) {
  if (type === "fleeting") return "随";
  if (type === "literature") return "文";
  return "原";
}

export function noteTypeText(type) {
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
  associated_with: "相关",
  free_link: "自由链接"
};

const RELATION_STATUS_LABELS = {
  suggested: "建议",
  draft: "草稿",
  confirmed: "已确认",
  dismissed: "已忽略",
  archived: "已归档"
};

export const RELATION_CREATE_TYPES = [
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
  "associated_with",
  "unexpected_connection",
  "bridges",
  "restates",
  "reframes",
  "appears_in_draft"
];

export const INLINE_LINK_RELATION_TYPES = [
  "associated_with",
  "supports",
  "complements",
  "qualifies",
  "contradicts",
  "bridges"
];

export function relationCreateTypeOptionsMarkup(selected = "supports") {
  const normalized = String(selected || "supports").trim().toLowerCase() || "supports";
  return RELATION_CREATE_TYPES.map((type) => {
    const isSelected = type === normalized;
    return `<option value="${escapeHtml(type)}"${isSelected ? " selected" : ""}>${escapeHtml(relationTypeLabel(type))}</option>`;
  }).join("");
}

export function inlineLinkRelationTypeOptionsMarkup(selected = "associated_with") {
  const normalized = String(selected || "associated_with").trim().toLowerCase() || "associated_with";
  return INLINE_LINK_RELATION_TYPES.map((type) => {
    const isSelected = type === normalized;
    return `<option value="${escapeHtml(type)}"${isSelected ? " selected" : ""}>${escapeHtml(relationTypeLabel(type))}</option>`;
  }).join("");
}

const RELATION_EDIT_STATUSES = ["confirmed", "draft", "suggested", "dismissed", "archived"];

const RELATION_TENSION_TYPES = new Set(["contradicts", "counterexample_to", "contrasts", "qualifies"]);
const RELATION_BRIDGE_TYPES = new Set(["bridges", "reframes", "unexpected_connection", "extends"]);

export function relationTypeLabel(type) {
  const key = String(type || "").trim().toLowerCase();
  return RELATION_TYPE_LABELS[key] || key || "关联";
}

export function relationStatusLabel(status) {
  const key = String(status || "").trim().toLowerCase();
  return RELATION_STATUS_LABELS[key] || key || "已确认";
}

export function isHiddenRelation(link) {
  return isHiddenSemanticRelation(link);
}

export function isMarkdownWikilinkRelation(link) {
  return isMarkdownWikilinkSemanticRelation(link);
}

export function relationTone(link) {
  const type = String(link?.relationType || "").trim().toLowerCase();
  if (RELATION_TENSION_TYPES.has(type)) return "tension";
  if (RELATION_BRIDGE_TYPES.has(type)) return "bridge";
  if (type === "supports" || type === "example_of") return "support";
  return "neutral";
}

export function relationQualityEvaluation(rationale = "", insightQuestion = "") {
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

export function relationQualityLabel(level = "") {
  const key = String(level || "").trim().toLowerCase();
  if (key === "strong") return "质量 可复用";
  if (key === "good") return "质量 较清楚";
  if (key === "basic") return "质量 可保存";
  return "质量 待补充";
}

export function relationSourceLabel(value = "") {
  const key = String(value || "").trim().toLowerCase();
  if (key === "ai" || key === "ai_suggestion") return "AI";
  if (key === "team") return "团队";
  if (key === "import") return "导入";
  return "自己";
}

export function parseInlineRelationAnnotations(body = "") {
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

export function normalizeRelationTemplateVariants(variants = [], selectedKey = "") {
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

export function renderRelationTemplateVariantSwitcher(variants = [], selectedKey = "", rememberedLabel = "") {
  const normalized = normalizeRelationTemplateVariants(variants, selectedKey);
  if (normalized.items.length < 2) return "";
  const cleanRemembered = String(rememberedLabel || "").trim();
  return `
    <div class="semantic-relation-template-picker" data-relation-template-picker>
      <div class="semantic-relation-template-head">
        <strong>理由模板</strong>
        <small>可选。只帮你起草理由，不会自动保存关系。</small>
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

export function normalizeDistillationTemplateVariants(variants = [], selectedKey = "") {
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

export function renderDistillationTemplateVariantSwitcher(variants = [], selectedKey = "", rememberedLabel = "") {
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

export function renderRelationQualityMeter(rationale = "", insightQuestion = "") {
  const quality = relationQualityEvaluation(rationale, insightQuestion);
  return `
    <div class="semantic-relation-quality-meter" data-relation-quality data-quality-level="${escapeHtml(quality.level)}">
      <strong>理由质量：${escapeHtml(quality.label)}</strong>
      <small>${escapeHtml(quality.message)}</small>
    </div>
  `;
}

export function relationFollowupSuggestionForDraft({
  noteId = "",
  relationId = "",
  relationType = "",
  rationale = "",
  insightQuestion = "",
  targetTitle = ""
} = {}) {
  const cleanNoteId = String(noteId || "").trim();
  const cleanRelationId = String(relationId || "").trim();
  if (!cleanNoteId || !cleanRelationId) return null;
  const cleanType = String(relationType || "").trim().toLowerCase();
  const quality = relationQualityEvaluation(rationale, insightQuestion);
  if (quality.level === "strong") return null;

  const missingQuestion = !String(insightQuestion || "").trim();
  const thinReason = quality.level === "empty" || quality.level === "basic";
  const bridgeLike = RELATION_BRIDGE_TYPES.has(cleanType);
  const target = String(targetTitle || "").trim();
  const targetSuffix = target ? `：${target}` : "";
  const text = bridgeLike
    ? `这条桥接关系建议补一个边界${targetSuffix}`
    : missingQuestion
      ? `这条关系还可以补一个后续问题${targetSuffix}`
      : thinReason
        ? `这条关系理由还需要再具体一点${targetSuffix}`
        : `这条关系可以再补证据或边界${targetSuffix}`;

  return {
    noteId: cleanNoteId,
    relationId: cleanRelationId,
    text,
    actionLabel: "补理由",
    laterLabel: "稍后",
    focusSelector: '[data-edit-relation-form] textarea[name="rationale"]',
    qualityLevel: quality.level
  };
}

export function excerptFromBody(body = "", fallbackTitle = "") {
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
