import { escapeHtml } from "./editor-render-utils.js";
import {
  highlightMatch,
  linkCandidateRank,
  normalizeText,
  wikilinkLabelFromRaw
} from "./editor-link-picker.js";
import { RELATION_ENTRY_SOURCES } from "./relation-entry-route.js";

export function editorRelationLinkCandidates({
  query = "",
  candidates = [],
  preferredId = "",
  pinnedId = "",
  displayTitle = (note) => note?.title || ""
} = {}) {
  const q = normalizeText(query);
  const all = Array.isArray(candidates) ? candidates.filter(Boolean) : [];
  const computed = q
    ? all
        .filter((note) => normalizeText(note?.title || "").includes(q))
        .sort((a, b) => linkCandidateRank(a, q) - linkCandidateRank(b, q) || String(a?.title || "").localeCompare(String(b?.title || ""), "zh-CN"))
    : [...all].sort((a, b) => String(a?.title || "").localeCompare(String(b?.title || ""), "zh-CN"));
  const list = q ? computed.slice(0, 50) : [];
  const selectedId = String(preferredId || pinnedId || "").trim();
  const selectedIndex = Math.max(0, selectedId ? list.findIndex((note) => note?.id === selectedId) : 0);
  return {
    query: q,
    list,
    selectedId,
    selectedIndex: selectedIndex >= 0 ? selectedIndex : 0,
    html: renderEditorRelationLinkCandidateList({
      list,
      query: q,
      selectedId,
      selectedIndex: selectedIndex >= 0 ? selectedIndex : 0,
      displayTitle
    })
  };
}

export function renderEditorRelationLinkCandidateList({
  list = [],
  query = "",
  selectedId = "",
  selectedIndex = 0,
  displayTitle = (note) => note?.title || ""
} = {}) {
  const items = Array.isArray(list) ? list : [];
  if (!items.length) return query ? `<div class="picker-empty">没有匹配笔记</div>` : "";
  return items
    .map((note, idx) => {
      const selected = idx === selectedIndex;
      const pinned = selectedId && note?.id === selectedId;
      return `<button class="link-picker-item ${selected ? "active" : ""} ${pinned ? "picked" : ""}" data-link-note-id="${escapeHtml(note?.id || "")}" data-link-index="${idx}" aria-selected="${
        selected ? "true" : "false"
      }"><strong>${highlightMatch(displayTitle(note), query)}</strong></button>`;
    })
    .join("");
}

export function selectedEditorRelationLinkCandidate({
  pinnedId = "",
  candidates = [],
  selectedIndex = 0,
  notes = []
} = {}) {
  const selectedId = String(pinnedId || "").trim();
  const candidateList = Array.isArray(candidates) ? candidates : [];
  const noteList = Array.isArray(notes) ? notes : [];
  if (selectedId) return candidateList.find((item) => item?.id === selectedId) || noteList.find((item) => item?.id === selectedId) || null;
  return candidateList[selectedIndex] || candidateList[0] || null;
}

export function editorRelationLinkConfirmState({
  isSubmitting = false,
  selectedNote = null,
  reason = ""
} = {}) {
  const hasReason = Boolean(String(reason || "").trim());
  if (isSubmitting) return { disabled: true, label: "保存中..." };
  if (!selectedNote) return { disabled: true, label: "选择笔记" };
  if (!hasReason) return { disabled: true, label: "写一句理由" };
  return { disabled: false, label: "保存关联" };
}

export function normalizeEditorRelationLinkInput({
  relationType = "associated_with",
  reason = ""
} = {}) {
  return {
    relationType: String(relationType || "associated_with").trim() || "associated_with",
    reason: String(reason || "")
      .replace(/\s+/g, " ")
      .replace(/--/g, "- -")
      .slice(0, 280)
      .trim()
  };
}

export function editorRelationLinkEntrySource(inlineInsert = false) {
  return inlineInsert ? RELATION_ENTRY_SOURCES.INLINE_WIKILINK : RELATION_ENTRY_SOURCES.TOOLBAR_RELATION;
}

export function editorRelationLinkCandidatePreviewText(note) {
  const thesis = String(note?.thesis || "").trim();
  if (thesis) return thesis.slice(0, 96);
  const lines = String(note?.body || "")
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) =>
      String(line || "")
        .replace(/\[\[([^[\]]+)\]\]/g, (_, rawLink) => wikilinkLabelFromRaw(rawLink))
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

export function editorRelationLinkInsertOutcome(bodyAlreadyLinked, reusedRelation) {
  if (bodyAlreadyLinked && reusedRelation) return "body-and-relation-existed";
  if (bodyAlreadyLinked) return "body-only-existed";
  if (reusedRelation) return "relation-only-existed";
  return "created";
}

export function editorRelationLinkInsertFeedback(target, outcome) {
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

export function nextEditorRelationLinkIndex(currentIndex = 0, length = 0, step = 0, maxItems = 50) {
  const max = Math.min(Number(length) || 0, maxItems);
  if (!max) return 0;
  return (Number(currentIndex || 0) + Number(step || 0) + max) % max;
}
