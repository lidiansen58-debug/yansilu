export { uniqueStrings } from "./prototype-collection-utils.js";

export function normalizeAuthorshipItem(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return {
    user_confirmed: Boolean(value.user_confirmed),
    ai_assisted: Boolean(value.ai_assisted)
  };
}

export function normalizeThinkingStatusItem(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
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

export function thinkingStatusTone(thinkingStatus = null) {
  const severity = String(thinkingStatus?.severity || "").trim().toLowerCase();
  if (severity === "ready") return "ready";
  if (String(thinkingStatus?.status || "").startsWith("ready_")) return "ready";
  return "next";
}

export function renderThinkingStatusBadge(value, { className = "thinking-status-badge", escapeHtml = String } = {}) {
  const thinkingStatus = normalizeThinkingStatusItem(value);
  if (!thinkingStatus) return "";
  const title = thinkingStatus.nextAction
    ? `${thinkingStatus.label}：${thinkingStatus.nextAction}`
    : thinkingStatus.label;
  return `<span class="${escapeHtml(className)}" data-tone="${escapeHtml(thinkingStatusTone(thinkingStatus))}" title="${escapeHtml(title)}">${escapeHtml(thinkingStatus.label)}</span>`;
}
