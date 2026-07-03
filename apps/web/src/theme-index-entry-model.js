import { uniqueStrings } from "./prototype-collection-utils.js";

export const THEME_INDEX_MIN_NOTE_COUNT = 3;

function cleanText(value = "") {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function noteTitle(note = null, fallback = "") {
  return cleanText(note?.title || note?.id || fallback);
}

function noteJudgment(note = null) {
  const summary = Array.isArray(note?.threeLineSummary)
    ? note.threeLineSummary
    : Array.isArray(note?.three_line_summary)
      ? note.three_line_summary
      : [];
  return cleanText(note?.thesis || summary[0] || note?.summary || note?.body);
}

function shortText(value = "", limit = 72) {
  const text = cleanText(value);
  if (!text) return "";
  return text.length > limit ? `${text.slice(0, limit)}...` : text;
}

function questionFromTitle(title = "") {
  const cleanTitle = cleanText(title);
  if (!cleanTitle) return "这些永久笔记共同在回答什么问题？";
  if (/[?？]$/.test(cleanTitle)) return cleanTitle;
  return `这些永久笔记共同在回答什么问题：${cleanTitle}？`;
}

function nextWritingStep({ centralQuestion = "", titles = [] } = {}) {
  const firstTitle = cleanText(titles[0]);
  const question = cleanText(centralQuestion) || "这个主题问题";
  return firstTitle
    ? `下一步可以写：先写一段，说明“${firstTitle}”如何帮助回答“${question}”。`
    : `下一步可以写：先围绕“${question}”列出一个可论证的小提纲。`;
}

export function buildThemeIndexSuggestionFromRelationCluster({
  noteIds = [],
  title = "",
  relationCount = 0,
  noteById = () => null
} = {}) {
  const cleanNoteIds = uniqueStrings(noteIds);
  const notes = cleanNoteIds.map((id) => noteById(id) || { id });
  const titles = notes.map((note, index) => noteTitle(note, cleanNoteIds[index])).filter(Boolean);
  const resolvedTitle = cleanText(title) || (titles.length ? `${titles[0]} 等 ${titles.length} 条笔记的可写主题` : "新的可写主题");
  const centralQuestion = questionFromTitle(resolvedTitle);
  const importantItems = cleanNoteIds.map((noteId, index) => {
    const note = notes[index] || { id: noteId };
    const titleText = noteTitle(note, noteId);
    const judgment = shortText(noteJudgment(note));
    return {
      noteId,
      shortLabel: titleText,
      rationale: judgment
        ? `为什么重要：它提供了回答主题问题的关键判断：${judgment}`
        : `为什么重要：它是这组关系聚集中的关键永久笔记，需要在可写主题里说明作用。`,
      order: index + 1
    };
  });
  const nextStep = nextWritingStep({ centralQuestion, titles });
  const relationLabel = relationCount > 0 ? `${relationCount} 条关系` : "多条关系";
  return {
    canCreate: cleanNoteIds.length >= THEME_INDEX_MIN_NOTE_COUNT,
    noteIds: cleanNoteIds,
    title: resolvedTitle,
    centralQuestion,
    summary: `主题问题：${centralQuestion} 关键永久笔记：${titles.slice(0, 5).join("、") || "待补充"}。${nextStep}`,
    thesis: `这组永久笔记已经通过${relationLabel}聚集，适合先整理成可写主题，再进入写作中心。`,
    threeLineSummary: [
      `主题问题：${centralQuestion}`,
      `关键永久笔记：${titles.slice(0, 5).join("、") || cleanNoteIds.join("、")}`,
      nextStep
    ],
    nextStep,
    items: importantItems
  };
}

export function buildThemeIndexCreatePayload({
  directoryId = "",
  noteIds = [],
  title = "",
  relationCount = 0,
  noteById = () => null
} = {}) {
  const suggestion = buildThemeIndexSuggestionFromRelationCluster({
    noteIds,
    title,
    relationCount,
    noteById
  });
  return {
    directoryId: cleanText(directoryId),
    indexType: "topic",
    orderingStrategy: "clustered",
    title: suggestion.title,
    summary: suggestion.summary,
    thesis: suggestion.thesis,
    threeLineSummary: suggestion.threeLineSummary,
    centralQuestion: suggestion.centralQuestion,
    noteIds: suggestion.noteIds,
    items: suggestion.items
  };
}
