import { CONTEXTUAL_AI_ACTION_STATUS, contextualAiActionMeta } from "./contextual-ai-action-model.js";

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const FIELD_LABELS = Object.freeze({
  title: "标题",
  name: "名称",
  content: "内容",
  text: "内容",
  summary: "摘要",
  coreArgument: "核心观点",
  centralQuestion: "中心问题",
  membershipReason: "归为一组的原因",
  reason: "原因",
  questions: "待确认问题",
  sections: "提纲",
  outline: "提纲",
  evidenceGap: "证据缺口",
  contradiction: "矛盾",
  transitionGap: "过渡缺失"
});

function textValue(value) {
  if (Array.isArray(value)) return value.map((item) => textValue(item)).filter(Boolean).join("\n");
  if (value && typeof value === "object") {
    return Object.entries(value)
      .map(([key, item]) => {
        const text = textValue(item);
        return text ? `${FIELD_LABELS[key] || key}：${text}` : "";
      })
      .filter(Boolean)
      .join("\n");
  }
  return String(value ?? "").trim();
}

function objectRows(value, preferredKeys = []) {
  if (!value) return [];
  if (typeof value !== "object") return [{ title: "内容", value: textValue(value), editable: true }];
  const keys = preferredKeys.length ? preferredKeys : Object.keys(value);
  return keys
    .filter((key) => value[key] !== undefined && value[key] !== null && textValue(value[key]))
    .map((key) => ({ key, title: FIELD_LABELS[key] || key, value: textValue(value[key]), editable: true }));
}

function resultRows(result = {}) {
  if (result.kind === "recommendations") {
    if (result.recommendations?.length) return result.recommendations.map((item) => ({ ...item, editable: false }));
    if (result.summary) return [{ title: "结果", value: result.summary, editable: false }];
    return [];
  }
  if (result.suggestions?.length) return result.suggestions;
  if (result.draft) return objectRows(result.draft, ["title", "coreArgument", "content", "questions"]);
  if (result.theme) return objectRows(result.theme, ["title", "name", "centralQuestion", "reason", "membershipReason", "notes"]);
  if (result.outline) return objectRows(result.outline, ["title", "sections", "content"]);
  if (result.gap) return objectRows(result.gap, ["title", "text", "reason", "evidenceGap", "contradiction", "transitionGap"]);
  if (result.recommendations?.length) return result.recommendations.map((item) => ({ ...item, editable: false }));
  if (result.summary) return [{ title: "结果", value: result.summary, editable: result.kind !== "recommendations" }];
  return [];
}

function primaryActionLabel(actionId = "", result = {}) {
  if (actionId === "distill_material") return "创建永久笔记";
  if (actionId === "suggest_theme") return "创建主题";
  if (actionId === "generate_outline") return "使用提纲";
  if (result.kind === "draft") return "创建";
  if (result.kind === "theme") return "创建";
  if (result.kind === "outline") return "使用";
  return "保留";
}

function isConfirmableResult(actionId = "", result = {}, rows = []) {
  if (actionId === "check_note" || actionId === "check_outline") return false;
  if (actionId === "recommend_relation" || actionId === "find_gap") return false;
  if (result.kind === "recommendations" || result.kind === "gap") return false;
  return rows.length > 0;
}

export function contextualAiResultInputValues(root = null) {
  return Array.from(root?.querySelectorAll?.("[data-contextual-ai-value]") || [])
    .map((input) => ({
      index: Number(input.getAttribute?.("data-contextual-ai-value") || 0),
      field: String(input.getAttribute?.("data-contextual-ai-field") || "").trim(),
      value: String(input.value || "").trim()
    }));
}

export function contextualAiActionIdFromElement(element = null, fallback = "") {
  return String(
    element?.closest?.("[data-contextual-ai-action-id]")?.getAttribute?.("data-contextual-ai-action-id") ||
      fallback ||
      ""
  ).trim();
}

export function renderContextualAiResultPanel(state = {}) {
  const meta = contextualAiActionMeta(state.actionId);
  const label = meta?.label || "AI 建议";
  const actionAttr = `data-contextual-ai-action-id="${escapeHtml(state.actionId || "")}"`;
  if (state.status === CONTEXTUAL_AI_ACTION_STATUS.checking || state.status === CONTEXTUAL_AI_ACTION_STATUS.running) {
    return `<section class="contextual-ai-result" ${actionAttr} aria-live="polite"><strong>${escapeHtml(label)}</strong><p>正在处理…</p></section>`;
  }
  if (state.status === CONTEXTUAL_AI_ACTION_STATUS.needs_setup) {
    return `<section class="contextual-ai-result" ${actionAttr}><strong>需要启用 AI</strong><p>完成启用后会回到当前页面。</p></section>`;
  }
  if (state.status === CONTEXTUAL_AI_ACTION_STATUS.needs_remote_confirmation) {
    return `<section class="contextual-ai-result" ${actionAttr}><strong>需要确认</strong><p>在线 AI 会发送当前选中的笔记内容。</p><div class="contextual-ai-result-actions"><button class="mini-btn primary" type="button" data-contextual-ai-confirm-remote>继续</button><button class="mini-btn" type="button" data-contextual-ai-ignore>取消</button></div></section>`;
  }
  if (state.status === CONTEXTUAL_AI_ACTION_STATUS.failed) {
    return `<section class="contextual-ai-result is-error" ${actionAttr}><strong>${escapeHtml(label)}失败</strong><p>${escapeHtml(state.error)}</p></section>`;
  }
  if (state.status === CONTEXTUAL_AI_ACTION_STATUS.adopted) {
    return `<section class="contextual-ai-result" ${actionAttr}><strong>已采用</strong><p>内容已交回当前页面。</p></section>`;
  }
  if (state.status === CONTEXTUAL_AI_ACTION_STATUS.ignored) {
    return `<section class="contextual-ai-result" ${actionAttr}><strong>${state.actionId === "recommend_relation" ? "已关闭" : "已忽略"}</strong></section>`;
  }
  if (!state.result) return "";
  const resultItems = resultRows(state.result);
  const forceReadonly = state.actionId === "check_outline" || state.actionId === "check_note";
  const rows = resultItems.map((item, index) => `
    <div class="contextual-ai-result-row" data-contextual-ai-index="${index}">
      ${item.title ? `<strong>${escapeHtml(item.title)}</strong>` : ""}
      ${item.editable !== false && !forceReadonly ? `<textarea rows="3" data-contextual-ai-value="${index}" data-contextual-ai-field="${escapeHtml(item.key || "")}">${escapeHtml(item.value || item.text)}</textarea>` : `<p>${escapeHtml(item.text || item.value)}</p>`}
    </div>`).join("");
  const isRecommendationResult = state.result.kind === "recommendations";
  const summaryOnly = resultItems.length === 1 && resultItems[0]?.title === "结果" && resultItems[0]?.value === state.result.summary;
  const canConfirm = isConfirmableResult(state.actionId, state.result, resultItems);
  const actionButtons = isRecommendationResult || !canConfirm
    ? `<button class="mini-btn" type="button" data-contextual-ai-ignore>关闭</button>`
    : `<button class="mini-btn primary" type="button" data-contextual-ai-adopt>${escapeHtml(primaryActionLabel(state.actionId, state.result))}</button>
       <button class="mini-btn" type="button" data-contextual-ai-ignore>忽略</button>`;
  return `<section class="contextual-ai-result" data-contextual-ai-result ${actionAttr}>
    ${state.result.title ? `<h3>${escapeHtml(state.result.title)}</h3>` : `<h3>${escapeHtml(label)}</h3>`}
    ${state.result.summary ? `<p>${escapeHtml(state.result.summary)}</p>` : ""}
    ${summaryOnly ? "" : rows || `<p>没有生成可用建议。</p>`}
    <div class="contextual-ai-result-actions">
      ${actionButtons}
    </div>
  </section>`;
}
