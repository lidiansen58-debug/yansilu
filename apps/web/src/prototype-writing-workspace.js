import { uniqueStrings } from "./prototype-collection-utils.js";

export function normalizeWritingProjectTitleSeed(title = "") {
  const cleanTitle = String(title || "").trim();
  if (!cleanTitle) return "未命名项目";
  if (cleanTitle.endsWith("写作项目")) return `${cleanTitle.slice(0, -"写作项目".length).trim()} 项目`.trim();
  if (cleanTitle.endsWith("项目")) return cleanTitle;
  return `${cleanTitle} 项目`;
}

export function suggestedWritingProjectTitle(noteIds = [], { noteById = () => null } = {}) {
  const notes = noteIds.map((id) => noteById(id)).filter(Boolean);
  if (notes.length === 1) return normalizeWritingProjectTitleSeed(notes[0].title || notes[0].id);
  const first = notes[0];
  if (first?.title) return normalizeWritingProjectTitleSeed(`${first.title} 等 ${notes.length} 条笔记`);
  return `导入笔记项目 ${noteIds.length}`;
}

export function writingThemeLabels(notes = [], { parseTags = () => [] } = {}) {
  const tags = [...new Set(
    notes
      .flatMap((note) => {
        if (Array.isArray(note.tags) && note.tags.length) return note.tags;
        return parseTags(String(note.body || ""));
      })
      .map((tag) => String(tag || "").trim())
      .filter(Boolean)
  )];
  if (tags.length) return tags;
  return [...new Set(notes.map((note) => String(note.title || "").trim()).filter(Boolean))];
}

export function writingThemeSummary(notes = [], deps = {}) {
  const labels = writingThemeLabels(notes, deps);
  if (!labels.length) return "\u8fd8\u6ca1\u6709\u6d6e\u73b0\u51fa\u53ef\u8fdb\u5165\u5199\u4f5c\u7684\u4e3b\u9898";
  const preview = labels.slice(0, 3).join("、");
  return `\u53ef\u8fdb\u5165\u5199\u4f5c\u7684\u4e3b\u9898\u7ea6 ${labels.length} \u4e2a${preview ? `\uff1a${preview}${labels.length > 3 ? " \u7b49" : ""}` : ""}`;
}

export function writingSourceIndexSummary(sourceIndexIds = [], { themeIndexById = () => null } = {}) {
  const sourceIds = uniqueStrings(sourceIndexIds);
  if (!sourceIds.length) return "";
  const titles = sourceIds.map((id) => themeIndexById(id)?.title || id).filter(Boolean);
  const preview = titles.slice(0, 2).join("、");
  return `主题入口：${preview}${titles.length > 2 ? " 等" : ""}`;
}

export function suggestedThemeIndexTitle(noteIds = [], { noteById = () => null, parseTags = () => [] } = {}) {
  const notes = noteIds.map((id) => noteById(id)).filter(Boolean);
  const labels = writingThemeLabels(notes, { parseTags });
  if (labels.length) return `${labels[0]} 主题索引`;
  const first = notes[0];
  if (first?.title) return `${first.title} 主题索引`;
  return "新的主题索引";
}

export function writingBookPlainText(note) {
  return uniqueStrings([
    note?.title,
    note?.thesis,
    ...(Array.isArray(note?.threeLineSummary) ? note.threeLineSummary : []),
    note?.boundaryOrCounterpoint,
    note?.boundary_or_counterpoint,
    note?.body
  ]).join("\n");
}

export function writingBookShortText(value, limit = 36) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (!text) return "";
  return text.length > limit ? `${text.slice(0, limit)}...` : text;
}

export function writingBookMatchesAny(text, keywords = []) {
  const haystack = String(text || "").toLowerCase();
  return keywords.some((keyword) => haystack.includes(String(keyword || "").toLowerCase()));
}

export function uniqueWritingBookPoolItems(items = []) {
  const seen = new Set();
  return (Array.isArray(items) ? items : [])
    .map((item) => ({
      title: String(item?.title || "").trim(),
      note_ids: uniqueStrings(item?.note_ids || item?.noteIds || []),
      role: String(item?.role || "").trim()
    }))
    .filter((item) => item.title || item.note_ids.length)
    .filter((item) => {
      const key = `${item.title}\u0000${item.note_ids.join("\u0000")}\u0000${item.role}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

export function writingBookSectionFromNote(note, fallbackTitle = "") {
  const thesis = writingBookShortText(note?.thesis || (Array.isArray(note?.threeLineSummary) ? note.threeLineSummary[0] : "") || note?.title || fallbackTitle, 34);
  const boundary = writingBookShortText(note?.boundaryOrCounterpoint || note?.boundary_or_counterpoint || (Array.isArray(note?.threeLineSummary) ? note.threeLineSummary[1] : "") || "需要补一个边界、反例或现实场景", 34);
  return [
    {
      title: `节一：${thesis || "核心判断"}`,
      purpose: "把这一章的核心判断讲清楚。",
      evidence_note_ids: note?.id ? [note.id] : [],
      role: "claim"
    },
    {
      title: `节二：${boundary || "证据与边界"}`,
      purpose: "补足案例、反方或适用边界。",
      evidence_note_ids: note?.id ? [note.id] : [],
      role: "boundary"
    }
  ];
}

export function normalizeWritingBookStructure(value = {}) {
  const raw = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const parts = (Array.isArray(raw.parts) ? raw.parts : []).map((part, partIndex) => ({
    id: String(part.id || `part_${partIndex + 1}`).trim(),
    label: String(part.label || `第${partIndex + 1}部`).trim(),
    title: String(part.title || `第${partIndex + 1}部`).trim(),
    purpose: String(part.purpose || "").trim(),
    chapters: (Array.isArray(part.chapters) ? part.chapters : []).map((chapter, chapterIndex) => ({
      id: String(chapter.id || `chapter_${partIndex + 1}_${chapterIndex + 1}`).trim(),
      title: String(chapter.title || `第${chapterIndex + 1}章`).trim(),
      purpose: String(chapter.purpose || "").trim(),
      evidence_note_ids: uniqueStrings(chapter.evidence_note_ids || chapter.evidenceNoteIds || chapter.noteIds || []),
      sections: (Array.isArray(chapter.sections) ? chapter.sections : []).map((section, sectionIndex) => {
        if (typeof section === "string") {
          return {
            id: `section_${partIndex + 1}_${chapterIndex + 1}_${sectionIndex + 1}`,
            title: section,
            purpose: "",
            evidence_note_ids: uniqueStrings(chapter.evidence_note_ids || chapter.noteIds || []),
            role: ""
          };
        }
        return {
          id: String(section?.id || `section_${partIndex + 1}_${chapterIndex + 1}_${sectionIndex + 1}`).trim(),
          title: String(section?.title || `第${sectionIndex + 1}节`).trim(),
          purpose: String(section?.purpose || "").trim(),
          evidence_note_ids: uniqueStrings(section?.evidence_note_ids || section?.evidenceNoteIds || section?.noteIds || []),
          role: String(section?.role || "").trim()
        };
      })
    }))
  }));
  const pools = raw.pools && typeof raw.pools === "object" && !Array.isArray(raw.pools) ? raw.pools : {};
  const normalizePoolItems = (items) =>
    (Array.isArray(items) ? items : [])
      .map((item) =>
        typeof item === "string"
          ? { title: item, note_ids: [], role: "" }
          : {
              title: String(item?.title || "").trim(),
              note_ids: uniqueStrings(item?.note_ids || item?.noteIds || []),
              role: String(item?.role || "").trim()
            }
      )
      .filter((item) => item.title || item.note_ids.length);
  const directionIdeas = (Array.isArray(raw.direction_ideas || raw.directionIdeas) ? raw.direction_ideas || raw.directionIdeas : []).map((idea, index) => ({
    id: String(idea.id || `idea_${index + 1}`).trim(),
    title: String(idea.title || "").trim(),
    reader: String(idea.reader || "").trim(),
    promise: String(idea.promise || "").trim(),
    risk: String(idea.risk || "").trim(),
    note_ids: uniqueStrings(idea.note_ids || idea.noteIds || [])
  })).filter((idea) => idea.title);
  return {
    schema_version: Number(raw.schema_version || raw.schemaVersion || 1) || 1,
    generated_by: String(raw.generated_by || raw.generatedBy || "writing-center-ui").trim(),
    generated_at: String(raw.generated_at || raw.generatedAt || "").trim(),
    mainline: String(raw.mainline || "").trim(),
    reader: String(raw.reader || "").trim(),
    parts,
    pools: {
      cases: normalizePoolItems(pools.cases),
      counterarguments: normalizePoolItems(pools.counterarguments || pools.counters),
      open_questions: (Array.isArray(pools.open_questions || pools.questions) ? pools.open_questions || pools.questions : [])
        .map((item) => String(item?.title || item || "").trim())
        .filter(Boolean)
    },
    direction_ideas: directionIdeas
  };
}

export function writingBookStructureStats(bookStructure = {}) {
  const normalized = normalizeWritingBookStructure(bookStructure);
  return {
    partCount: normalized.parts.length,
    chapterCount: normalized.parts.reduce((sum, part) => sum + part.chapters.length, 0),
    sectionCount: normalized.parts.reduce((sum, part) => sum + part.chapters.reduce((chapterSum, chapter) => chapterSum + chapter.sections.length, 0), 0),
    caseCount: normalized.pools.cases.length,
    counterargumentCount: normalized.pools.counterarguments.length,
    questionCount: normalized.pools.open_questions.length
  };
}
