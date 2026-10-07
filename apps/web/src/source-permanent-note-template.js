import { noteUsesPlaceholderTitle, parseLiteratureWorkspace } from "./editor-template-workspace.js";
import { sourceNoteReference, stripGeneratedOriginalMarker } from "./note-persistence-policy.js";
import { composePermanentTemplateDraft } from "./prototype-note-templates.js";

function citationSummaryLines(citation = {}) {
  return [
    citation.sourceTitle ? `- 文献标题：${citation.sourceTitle}` : "",
    citation.authors ? `- 作者：${citation.authors}` : "",
    citation.year ? `- 年份：${citation.year}` : "",
    citation.container ? `- 容器：${citation.container}` : "",
    citation.publisher ? `- 出版社 / 来源：${citation.publisher}` : "",
    citation.locator ? `- 页码 / 定位：${citation.locator}` : "",
    citation.identifier ? `- DOI / ISBN / arXiv / URL / PDF：${citation.identifier}` : ""
  ].filter(Boolean);
}

export function originalDraftBodyFromSource(payload = {}, deps = {}) {
  const titleFromSeedText = deps.titleFromSeedText || ((text, fallback) => String(text || "").trim().slice(0, 60) || fallback);
  const compose = (fields) => composePermanentTemplateDraft(fields, deps);
  if (String(payload.sourceType || "").trim().toLowerCase() === "literature") {
    const parsed = parseLiteratureWorkspace(payload.sourceBody || payload.body || "", {
      sectionLabelCandidates: deps.sectionLabelCandidates
    });
    const sourceTitle = String(payload.sourceTitle || "").trim() || "未命名文献笔记";
    const claim = String(payload.paraphrase || parsed.paraphrase || "").trim();
    const whyKeep = String(payload.whyKeep || parsed.whyKeep || "").trim();
    const seed = String(payload.supportsJudgment || parsed.supportsJudgment || "").trim();
    const question = String(payload.question || parsed.question || "").trim();
    const boundary = String(payload.boundary || parsed.boundary || "").trim();
    const originalText = String(payload.originalText || parsed.originalText || "").trim();
    const citation = payload.citation && typeof payload.citation === "object" ? payload.citation : parsed.citation;
    return compose({
      title: sourceTitle === "未命名文献笔记"
        ? titleFromSeedText(citation?.sourceTitle || seed || question || claim || originalText, "未命名永久笔记")
        : sourceTitle,
      coreClaim: "用自己的话写出一个判断，不直接照抄来源。",
      whyTrue: "写清理由，以及支持它的证据或观察。",
      boundary: boundary || "它在哪些条件下不成立？",
      relatedClues: [`- 来源：${sourceNoteReference(sourceTitle, payload.sourceNoteId)}`, ...citationSummaryLines(citation)].join("\n"),
      supplement: [
        seed ? `- 来源中的判断：${seed}` : "",
        question ? `- 待回答：${question}` : "",
        whyKeep ? `- 保留原因：${whyKeep}` : ""
      ].filter(Boolean).join("\n")
    });
  }
  const sourceTitle = String(payload.sourceTitle || "").trim() || "未命名随笔笔记";
  const sourceBody = stripGeneratedOriginalMarker(String(payload.sourceBody || payload.body || "").trim());
  const excerpt = sourceBody.replace(/^#\s+[^\n]*\n?/m, "").trim();
  const titledSource = sourceTitle !== "未命名随笔笔记" && !noteUsesPlaceholderTitle(sourceTitle);
  return compose({
    title: titleFromSeedText(titledSource ? sourceTitle : excerpt, "未命名永久笔记"),
    coreClaim: "用自己的话，把这个想法写成一个清楚的判断。",
    whyTrue: "写清理由，以及支持它的观察或经验。",
    boundary: "它在哪些条件下不成立？还有什么需要验证？",
    relatedClues: `- 来源：${sourceNoteReference(sourceTitle, payload.sourceNoteId)}`,
    supplement: excerpt ? `原始记录：\n\n${excerpt}` : ""
  });
}
