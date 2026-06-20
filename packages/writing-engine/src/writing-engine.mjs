import path from "node:path";
import { randomUUID } from "node:crypto";
import { SQLITE_DB_FILES } from "../../domain/src/sqlite-migrations.mjs";
import { collectDistillationQualityWarnings } from "../../domain/src/distillation-quality.mjs";
import { getNoteById } from "../../domain/src/index.mjs";
import { getIndexCard } from "../../domain/src/index-card-store.mjs";
import { deriveWritingProjectThinkingStatus } from "../../domain/src/thinking-status.mjs";
import { analyzeWritingProjectReadiness } from "../../domain/src/quality-checks.mjs";

const GENERATED_BY = "writing-engine:v1";

function catalogDbPath(vaultPath) {
  return path.join(path.resolve(vaultPath), ".yansilu", SQLITE_DB_FILES.catalog);
}

async function loadDatabaseSync() {
  try {
    const mod = await import("node:sqlite");
    return mod.DatabaseSync;
  } catch {
    throw new Error("Writing engine requires node:sqlite (Node.js 22+).");
  }
}

function cleanText(input) {
  return String(input || "").trim();
}

function uniqueIds(ids) {
  return [...new Set((Array.isArray(ids) ? ids : []).map((id) => cleanText(id)).filter(Boolean))];
}

function parseJsonStringArray(value) {
  try {
    const parsed = JSON.parse(String(value || "[]"));
    return uniqueIds(parsed);
  } catch {
    return [];
  }
}

function parseJsonObject(value, fallback = {}) {
  try {
    const parsed = JSON.parse(String(value || ""));
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed;
  } catch {}
  return fallback;
}

function mapProjectRow(row, basketNoteIds = []) {
  const bookStructure = normalizeBookStructure(parseJsonObject(row.book_structure_json, {}));
  const project = {
    id: row.id,
    title: row.title,
    goal: row.goal || "",
    audience: row.audience || "",
    tone: row.tone || "",
    intent: row.intent || "",
    desired_reader_takeaway: row.desired_reader_takeaway || "",
    related_index_ids: parseJsonStringArray(row.related_index_ids_json),
    book_structure: bookStructure,
    basket_note_ids: basketNoteIds,
    scaffold_id: row.scaffold_id || null,
    draft_note_id: row.draft_note_id || null,
    status: row.status,
    created_at: row.created_at,
    updated_at: row.updated_at
  };
  return {
    ...project,
    thinkingStatus: deriveWritingProjectThinkingStatus(project)
  };
}

function mapScaffoldRow(row) {
  return {
    id: row.id,
    writing_project_id: row.writing_project_id,
    sections: JSON.parse(row.sections_json || "[]"),
    open_questions: JSON.parse(row.open_questions_json || "[]"),
    generated_by: row.generated_by,
    version_note: row.version_note || "",
    markdown: row.markdown || "",
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}

function mapScaffoldListRow(row) {
  return {
    id: row.id,
    writing_project_id: row.writing_project_id,
    generated_by: row.generated_by,
    version_note: row.version_note || "",
    section_count: Number(row.section_count || 0),
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}

function mapProjectListRow(row) {
  const bookStructure = normalizeBookStructure(parseJsonObject(row.book_structure_json, {}));
  const project = {
    id: row.id,
    title: row.title,
    goal: row.goal || "",
    audience: row.audience || "",
    tone: row.tone || "",
    intent: row.intent || "",
    desired_reader_takeaway: row.desired_reader_takeaway || "",
    related_index_ids: parseJsonStringArray(row.related_index_ids_json),
    book_structure_summary: summarizeBookStructure(bookStructure),
    scaffold_id: row.scaffold_id || null,
    draft_note_id: row.draft_note_id || null,
    status: row.status,
    basket_count: Number(row.basket_count || 0),
    created_at: row.created_at,
    updated_at: row.updated_at
  };
  return {
    ...project,
    thinkingStatus: deriveWritingProjectThinkingStatus(project)
  };
}

function mapDraftVersionRow(row, currentDraftNoteId = "") {
  return {
    id: row.id,
    writing_project_id: row.writing_project_id,
    draft_note_id: row.draft_note_id,
    source_scaffold_id: row.source_scaffold_id || null,
    version_note: row.version_note || "",
    version_no: Number(row.version_no || 0),
    created_at: row.created_at,
    is_current: cleanText(currentDraftNoteId) === cleanText(row.draft_note_id)
  };
}

function noteExcerpt(note) {
  return cleanText(note.thesis || note.body)
    .replace(/^#+\s+/gm, "")
    .replace(/\s+/g, " ")
    .slice(0, 220);
}

function boundarySummary(note) {
  return cleanText(note.boundaryOrCounterpoint)
    .replace(/\s+/g, " ")
    .slice(0, 180);
}

function shortText(value, limit = 72) {
  const text = cleanText(value).replace(/\s+/g, " ");
  return text.length > limit ? `${text.slice(0, limit)}...` : text;
}

function textMatchesAny(text, keywords = []) {
  const haystack = cleanText(text).toLowerCase();
  return keywords.some((keyword) => haystack.includes(cleanText(keyword).toLowerCase()));
}

function notePlainText(note) {
  return [
    note?.title,
    note?.thesis,
    ...(Array.isArray(note?.threeLineSummary) ? note.threeLineSummary : []),
    note?.boundaryOrCounterpoint,
    note?.body
  ]
    .map((item) => cleanText(item))
    .filter(Boolean)
    .join("\n");
}

function normalizeBookStructure(input = {}) {
  const value = input && typeof input === "object" && !Array.isArray(input) ? input : {};
  const parts = Array.isArray(value.parts)
    ? value.parts.map((part, partIndex) => ({
        id: cleanText(part.id) || `part_${partIndex + 1}`,
        label: cleanText(part.label) || `第${partIndex + 1}部`,
        title: cleanText(part.title) || `第${partIndex + 1}部`,
        purpose: cleanText(part.purpose),
        chapters: (Array.isArray(part.chapters) ? part.chapters : []).map((chapter, chapterIndex) => ({
          id: cleanText(chapter.id) || `chapter_${partIndex + 1}_${chapterIndex + 1}`,
          title: cleanText(chapter.title) || `第${chapterIndex + 1}章`,
          purpose: cleanText(chapter.purpose),
          sections: (Array.isArray(chapter.sections) ? chapter.sections : []).map((section, sectionIndex) => ({
            id: cleanText(section.id) || `section_${partIndex + 1}_${chapterIndex + 1}_${sectionIndex + 1}`,
            title: cleanText(section.title) || `第${sectionIndex + 1}节`,
            purpose: cleanText(section.purpose),
            evidence_note_ids: uniqueIds(section.evidence_note_ids || section.evidenceNoteIds || section.noteIds),
            role: cleanText(section.role)
          })),
          evidence_note_ids: uniqueIds(chapter.evidence_note_ids || chapter.evidenceNoteIds || chapter.noteIds)
        }))
      }))
    : [];
  const pools = value.pools && typeof value.pools === "object" && !Array.isArray(value.pools) ? value.pools : {};
  return {
    schema_version: Number(value.schema_version || value.schemaVersion || 1) || 1,
    generated_by: cleanText(value.generated_by || value.generatedBy) || GENERATED_BY,
    generated_at: cleanText(value.generated_at || value.generatedAt),
    mainline: cleanText(value.mainline),
    reader: cleanText(value.reader),
    parts,
    pools: {
      cases: (Array.isArray(pools.cases) ? pools.cases : []).map((item) => ({
        title: cleanText(item?.title || item),
        note_ids: uniqueIds(item?.note_ids || item?.noteIds),
        role: cleanText(item?.role)
      })).filter((item) => item.title || item.note_ids.length),
      counterarguments: (Array.isArray(pools.counterarguments || pools.counters) ? pools.counterarguments || pools.counters : []).map((item) => ({
        title: cleanText(item?.title || item),
        note_ids: uniqueIds(item?.note_ids || item?.noteIds),
        role: cleanText(item?.role)
      })).filter((item) => item.title || item.note_ids.length),
      open_questions: (Array.isArray(pools.open_questions || pools.questions) ? pools.open_questions || pools.questions : []).map((item) => cleanText(item?.title || item)).filter(Boolean)
    },
    direction_ideas: (Array.isArray(value.direction_ideas || value.directionIdeas) ? value.direction_ideas || value.directionIdeas : []).map((idea, index) => ({
      id: cleanText(idea.id) || `idea_${index + 1}`,
      title: cleanText(idea.title),
      reader: cleanText(idea.reader),
      promise: cleanText(idea.promise),
      risk: cleanText(idea.risk),
      note_ids: uniqueIds(idea.note_ids || idea.noteIds)
    })).filter((idea) => idea.title)
  };
}

function summarizeBookStructure(bookStructure = {}) {
  const normalized = normalizeBookStructure(bookStructure);
  return {
    mainline: normalized.mainline,
    part_count: normalized.parts.length,
    chapter_count: normalized.parts.reduce((sum, part) => sum + part.chapters.length, 0),
    section_count: normalized.parts.reduce(
      (sum, part) => sum + part.chapters.reduce((chapterSum, chapter) => chapterSum + chapter.sections.length, 0),
      0
    ),
    case_count: normalized.pools.cases.length,
    counterargument_count: normalized.pools.counterarguments.length,
    open_question_count: normalized.pools.open_questions.length,
    direction_idea_count: normalized.direction_ideas.length
  };
}

function defaultSectionFromNote(note, fallbackTitle = "", sectionIndex = 0) {
  const title = shortText(note?.thesis || (Array.isArray(note?.threeLineSummary) ? note.threeLineSummary[0] : "") || note?.title || fallbackTitle, 40);
  const boundary = shortText(
    note?.boundaryOrCounterpoint || (Array.isArray(note?.threeLineSummary) ? note.threeLineSummary[1] : "") || "补充证据、场景与边界",
    52
  );
  return [
    {
      id: `section_${sectionIndex + 1}_claim`,
      title: `节一：${title || "核心判断"}`,
      purpose: "把这一章的核心判断讲清楚。",
      evidence_note_ids: note?.id ? [note.id] : [],
      role: "claim"
    },
    {
      id: `section_${sectionIndex + 1}_boundary`,
      title: `节二：${boundary}`,
      purpose: "补足案例、反方或适用边界。",
      evidence_note_ids: note?.id ? [note.id] : [],
      role: "boundary"
    }
  ];
}

function defaultBookMainline(project = {}) {
  const goal = cleanText(project.goal);
  if (goal) return goal;
  const title = cleanText(project.title);
  return title.includes("易经")
    ? "把易经从神秘答案转译为AI时代的变化判断、行动复盘和人生选择方法。"
    : `围绕「${title || "当前写作项目"}」建立一条可以被案例、反方和章节持续推进的书稿主线。`;
}

function buildDefaultBookStructure(project = {}, basketNotes = [], options = {}) {
  const mainline = defaultBookMainline(project);
  const specs = [
    {
      id: "part_reframe",
      label: "第一部",
      title: "重新理解：从答案到变化语言",
      keywords: ["易经", "卦", "象", "占", "神秘", "误用", "答案", "变化", "经典"],
      fallbackChapters: ["核心问题从哪里开始", "不要把材料当成答案"]
    },
    {
      id: "part_judgment",
      label: "第二部",
      title: "判断训练：时位、关系与行动",
      keywords: ["AI", "模型", "时代", "人生", "判断", "选择", "行动", "关系", "工作", "学习"],
      fallbackChapters: ["当环境改变，人还需要什么判断", "把判断变成可复盘的行动"]
    },
    {
      id: "part_practice",
      label: "第三部",
      title: "落地修正：案例、反方与长期方法",
      keywords: ["案例", "复盘", "反方", "边界", "失败", "实践", "方法", "长期", "修正"],
      fallbackChapters: ["用案例训练变化感", "反方池：这套方法在哪里会失效"]
    }
  ];
  const assigned = specs.map(() => []);
  const usedIds = new Set();
  for (const note of basketNotes) {
    const index = specs.findIndex((spec) => textMatchesAny(notePlainText(note), spec.keywords));
    if (index >= 0) {
      assigned[index].push(note);
      usedIds.add(note.id);
    }
  }
  basketNotes.filter((note) => !usedIds.has(note.id)).forEach((note, index) => {
    assigned[index % specs.length].push(note);
  });
  if (basketNotes.length) {
    assigned.forEach((group, index) => {
      if (!group.length) group.push(basketNotes[index % basketNotes.length]);
    });
  }
  const parts = specs.map((spec, partIndex) => {
    const notes = assigned[partIndex].slice(0, 4);
    const chapters = (notes.length ? notes : spec.fallbackChapters.map((title) => ({ id: "", title }))).map((note, chapterIndex) => ({
      id: `chapter_${partIndex + 1}_${chapterIndex + 1}`,
      title: `第${chapterIndex + 1}章 ${cleanText(note.title) || spec.fallbackChapters[chapterIndex % spec.fallbackChapters.length]}`,
      purpose: note?.id ? purposeFromNote(note) : "补充章节判断、证据与读者路径。",
      evidence_note_ids: note?.id ? [note.id] : [],
      sections: defaultSectionFromNote(note, note.title, chapterIndex)
    }));
    return {
      id: spec.id,
      label: spec.label,
      title: spec.title,
      purpose: partIndex === 0 ? "建立读者入口和概念框架。" : partIndex === 1 ? "推进核心判断和行动方法。" : "处理案例、反方和长期修正。",
      chapters
    };
  });
  const caseItems = basketNotes
    .filter((note) => textMatchesAny(notePlainText(note), ["案例", "例子", "AI", "模型", "人生", "决策", "复盘", "工作", "关系", "学习"]))
    .slice(0, 8)
    .map((note) => ({ title: note.title, note_ids: [note.id], role: "case" }));
  const counterItems = basketNotes
    .filter((note) => boundarySummary(note) || textMatchesAny(notePlainText(note), ["反方", "边界", "误用", "失败", "风险", "局限"]))
    .slice(0, 8)
    .map((note) => ({ title: boundarySummary(note) || note.title, note_ids: [note.id], role: "counterargument" }));
  return normalizeBookStructure({
    schema_version: 1,
    generated_by: GENERATED_BY,
    generated_at: new Date().toISOString(),
    mainline,
    reader: cleanText(project.audience),
    parts,
    pools: {
      cases: caseItems.length ? caseItems : basketNotes.slice(0, 4).map((note) => ({ title: note.title, note_ids: [note.id], role: "case" })),
      counterarguments: counterItems.length
        ? counterItems
        : [{ title: "还需要主动补充反方：这套主线在哪里可能失效？", note_ids: [], role: "counterargument" }],
      open_questions: [
        cleanText(project.audience) ? `这本书对${project.audience}的第一章入口是什么？` : "目标读者最容易误解这组材料的哪一点？",
        "哪些案例、反方和开放问题必须补齐，才像完整书稿而不是长文大纲？",
        "哪些材料只适合放入案例池或反方池，不应该进入主线？"
      ]
    },
    direction_ideas: Array.isArray(options.directionIdeas) ? options.directionIdeas : []
  });
}

async function loadBasketNotes(vaultPath, noteIds) {
  const notes = [];
  for (const noteId of noteIds) {
    const note = await getNoteById(vaultPath, noteId);
    const noteType = cleanText(note.noteType);
    if (noteType !== "permanent" && noteType !== "original") {
      throw new Error(`writing basket only accepts permanent notes: ${noteId}`);
    }
    notes.push({
      id: note.id,
      title: note.title,
      note_type: noteType,
      status: note.status,
      markdown_path: note.markdownPath,
      excerpt: noteExcerpt(note),
      thesis: cleanText(note.thesis),
      threeLineSummary: Array.isArray(note.threeLineSummary) ? note.threeLineSummary : [],
      distillationStatus: cleanText(note.distillationStatus),
      authorship: note.authorship || { user_confirmed: false, ai_assisted: false },
      body: note.body,
      boundaryOrCounterpoint: cleanText(note.boundaryOrCounterpoint)
    });
  }
  return notes;
}

async function loadRelatedIndexCards(vaultPath, indexIds = []) {
  const cards = [];
  for (const indexId of uniqueIds(indexIds)) {
    try {
      cards.push(await getIndexCard(vaultPath, indexId));
    } catch {}
  }
  return cards;
}

export function buildWritingProjectReadiness(project = {}, basketNotes = [], options = {}) {
  return analyzeWritingProjectReadiness(
    {
      ...project,
      basket_note_ids: project.basket_note_ids || project.basketNoteIds || basketNotes.map((note) => note.id)
    },
    {
      notes: basketNotes,
      indexCards: Array.isArray(options.indexCards) ? options.indexCards : []
    }
  );
}

async function loadProjectDraftNote(vaultPath, draftNoteId) {
  const id = cleanText(draftNoteId);
  if (!id) return null;
  try {
    const note = await getNoteById(vaultPath, id);
    return {
      id: note.id,
      title: note.title,
      note_type: note.noteType,
      status: note.status,
      markdown_path: note.markdownPath
    };
  } catch {
    return {
      id,
      title: "",
      note_type: "",
      status: "missing",
      markdown_path: ""
    };
  }
}

async function loadDraftVersionNote(vaultPath, draftNoteId) {
  return loadProjectDraftNote(vaultPath, draftNoteId);
}

async function loadProject(vaultPath, writingProjectId) {
  const id = cleanText(writingProjectId);
  if (!id) throw new Error("writingProjectId is required");

  const DatabaseSync = await loadDatabaseSync();
  const db = new DatabaseSync(catalogDbPath(vaultPath));
  try {
    const row = db.prepare("SELECT * FROM writing_projects WHERE id = ? LIMIT 1").get(id);
    if (!row) throw new Error(`writingProjectId not found: ${id}`);
    const basketRows = db
      .prepare("SELECT note_id FROM writing_basket_items WHERE project_id = ? ORDER BY order_no ASC")
      .all(id);
    const project = mapProjectRow(
      row,
      basketRows.map((item) => item.note_id)
    );
    project.draft_note = await loadProjectDraftNote(vaultPath, row.draft_note_id);
    return project;
  } finally {
    db.close();
  }
}

export async function createWritingProject(vaultPath, input = {}) {
  if (!vaultPath) throw new Error("vaultPath is required");
  const title = cleanText(input.title);
  if (!title) throw new Error("title is required");

  const basketNoteIds = uniqueIds(input.basketNoteIds || input.basket_note_ids);
  if (!basketNoteIds.length) throw new Error("basketNoteIds is required");
  const relatedIndexIds = uniqueIds(input.relatedIndexIds || input.related_index_ids);
  const basketNotes = await loadBasketNotes(vaultPath, basketNoteIds);
  const relatedIndexCards = await loadRelatedIndexCards(vaultPath, relatedIndexIds);

  const now = new Date().toISOString();
  const id = cleanText(input.id) || `wp_${randomUUID().slice(0, 8)}`;
  const project = {
    id,
    title,
    goal: cleanText(input.goal),
    audience: cleanText(input.audience),
    tone: cleanText(input.tone),
    intent: cleanText(input.intent),
    desired_reader_takeaway: cleanText(input.desiredReaderTakeaway || input.desired_reader_takeaway),
    related_index_ids: relatedIndexIds,
    status: cleanText(input.status) || "draft",
    created_at: now,
    updated_at: now
  };
  const providedBookStructure = input.bookStructure !== undefined ? input.bookStructure : input.book_structure;
  const normalizedProvidedBookStructure = providedBookStructure === undefined ? null : normalizeBookStructure(providedBookStructure);
  const bookStructure = normalizedProvidedBookStructure?.parts?.length
    ? normalizedProvidedBookStructure
    : buildDefaultBookStructure(project, basketNotes);

  const DatabaseSync = await loadDatabaseSync();
  const db = new DatabaseSync(catalogDbPath(vaultPath));
  try {
    db.exec("BEGIN IMMEDIATE;");
    try {
      db.prepare(
        `INSERT INTO writing_projects
          (id, title, goal, audience, tone, intent, desired_reader_takeaway, related_index_ids_json, book_structure_json, status, scaffold_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?)`
      ).run(
        project.id,
        project.title,
        project.goal,
        project.audience,
        project.tone,
        project.intent,
        project.desired_reader_takeaway,
        JSON.stringify(project.related_index_ids),
        JSON.stringify(bookStructure),
        project.status,
        now,
        now
      );

      basketNoteIds.forEach((noteId, index) => {
        db.prepare(
          `INSERT INTO writing_basket_items (id, project_id, note_id, order_no)
           VALUES (?, ?, ?, ?)`
        ).run(`wbi_${randomUUID().slice(0, 8)}`, project.id, noteId, index + 1);
      });
      db.exec("COMMIT;");
    } catch (error) {
      db.exec("ROLLBACK;");
      throw error;
    }
  } finally {
    db.close();
  }

  const result = {
    ...project,
    book_structure: bookStructure,
    basket_note_ids: basketNoteIds,
    scaffold_id: null,
    draft_note_id: null,
    draft_note: null,
    preflight: buildWritingProjectReadiness(project, basketNotes, { indexCards: relatedIndexCards }),
    basket_notes: basketNotes.map(({ body, ...note }) => note)
  };
  return {
    ...result,
    thinkingStatus: deriveWritingProjectThinkingStatus(result)
  };
}

function purposeFromNote(note) {
  const excerpt = noteExcerpt(note);
  return excerpt ? `用这条笔记支撑这个判断：${excerpt}` : "用这条笔记为论证提供证据。";
}

function noteLabel(note) {
  return cleanText(note?.title) || cleanText(note?.id) || "this note";
}

function renderWritingMarkdownField(field = "") {
  const normalized = cleanText(field).toLowerCase();
  const labels = {
    intent: "写作意图",
    desired_reader_takeaway: "读者收获"
  };
  return labels[normalized] || cleanText(field) || "字段";
}

function renderWritingMarkdownStatus(status = "") {
  const normalized = cleanText(status).toLowerCase();
  const labels = {
    needs_clarification: "待澄清",
    needs_attention: "仍有提醒",
    has_gaps: "仍有缺口",
    ready: "已就绪"
  };
  return labels[normalized] || cleanText(status) || "未知";
}

function gapPromptFromNote(note) {
  return `在「${noteLabel(note)}」能独立撑起一整段之前，还缺哪条证据、例子或过渡？`;
}

function counterpointPromptFromNote(note) {
  const boundary = boundarySummary(note);
  return boundary
    ? `在「${noteLabel(note)}」这一段里，要正面处理哪条反方或边界：${boundary}`
    : `「${noteLabel(note)}」这一段还应该补出哪条反方、限制或例外？`;
}

function conceptShiftPromptFromBasket(basketNotes) {
  const titledNotes = basketNotes.map((note) => noteLabel(note)).slice(0, 3);
  if (!titledNotes.length) return "这组写作篮里有哪些相近概念还需要进一步区分？";
  return `围绕 ${titledNotes.join(", ")} 的相近概念，哪些地方还需要进一步区分？`;
}

function scaffoldOpenQuestionsFromBasket(basketNotes) {
  const questions = [
    "还缺哪部分证据？",
    "正式起草前还要处理哪条反方？",
    conceptShiftPromptFromBasket(basketNotes)
  ];
  const noteWithBoundary = basketNotes.find((note) => boundarySummary(note));
  if (noteWithBoundary) {
    questions.push(`对整体论证来说，${noteLabel(noteWithBoundary)} 的哪条边界最关键？`);
  }
  return questions;
}

function preflightCheck(id, label, status, message, details = {}) {
  return {
    id,
    label,
    status,
    message,
    ...details
  };
}

function buildScaffoldPreflight(project, basketNotes) {
  const basketCount = basketNotes.length;
  const confirmedNotes = basketNotes.filter(
    (note) =>
      cleanText(note.thesis) &&
      Array.isArray(note.threeLineSummary) &&
      note.threeLineSummary.length === 3 &&
      note.distillationStatus === "confirmed" &&
      note.authorship?.user_confirmed === true
  );
  const notesWithBoundary = basketNotes.filter((note) => boundarySummary(note));
  const distillationQualityWarnings = basketNotes.flatMap((note) =>
    collectDistillationQualityWarnings(note).map((item) => ({
      ...item,
      noteId: note.id,
      noteTitle: noteLabel(note)
    }))
  );
  const affectedQualityNotes = [...new Set(distillationQualityWarnings.map((item) => item.noteId))];
  const qualitySample = distillationQualityWarnings
    .slice(0, 3)
    .map((item) => `${item.noteTitle}: ${item.message}`)
    .join(" ");
  const checks = [
    preflightCheck(
      "basket_size",
      "永久笔记篮",
      basketCount >= 2 ? "pass" : "warning",
      basketCount >= 2
        ? `${basketCount} 条永久笔记已经可以组织成草稿骨架。`
        : "至少先放入两条永久笔记，再把这次组织当成一条真正的论证。",
      { count: basketCount, targetType: "writing_project", targetId: project.id }
    ),
    preflightCheck(
      "writing_intent",
      "写作意图",
      cleanText(project.intent) ? "pass" : "warning",
      cleanText(project.intent)
        ? "项目已经有清晰的写作意图。"
        : "先说清这篇内容到底要解释什么，再继续推进草稿骨架。",
      { targetType: "writing_project", targetId: project.id }
    ),
    preflightCheck(
      "reader_takeaway",
      "读者收获",
      cleanText(project.desired_reader_takeaway) ? "pass" : "warning",
      cleanText(project.desired_reader_takeaway)
        ? "读者最后应带走的判断已经明确。"
        : "补上读者应该带走的判断，让草稿骨架有明确目标。",
      { targetType: "writing_project", targetId: project.id }
    ),
    preflightCheck(
      "confirmed_distillation",
      "已确认提纯",
      confirmedNotes.length === basketCount && basketCount > 0 ? "pass" : "warning",
      confirmedNotes.length === basketCount && basketCount > 0
        ? "写作篮里的每条笔记都已经完成一句话判断与三句话提纯确认。"
        : `还有 ${Math.max(0, basketCount - confirmedNotes.length)} 条写作篮笔记需要补齐一句话判断与三句话提纯确认。`,
      {
        count: confirmedNotes.length,
        total: basketCount,
        targetNoteIds: basketNotes
          .filter((note) => !confirmedNotes.some((confirmed) => confirmed.id === note.id))
          .map((note) => note.id)
      }
    ),
    preflightCheck(
      "distillation_quality",
      "提纯质量",
      distillationQualityWarnings.length ? "warning" : "pass",
      distillationQualityWarnings.length
        ? `${affectedQualityNotes.length} 条写作篮笔记的提纯还比较粗糙。${qualitySample}`
        : "写作篮笔记里没有明显的提纯过短、重复或缺边界问题。",
      {
        count: distillationQualityWarnings.length,
        targetNoteIds: affectedQualityNotes,
        warningIds: distillationQualityWarnings.map((item) => item.id)
      }
    ),
    preflightCheck(
      "topic_entry",
      "主题入口",
      Array.isArray(project.related_index_ids) && project.related_index_ids.length ? "pass" : "warning",
      Array.isArray(project.related_index_ids) && project.related_index_ids.length
        ? "这个项目已经挂到主题或索引入口上。"
        : "补一张主题或索引卡，让草稿骨架有可复用的问题上下文。",
      { targetType: "writing_project", targetId: project.id }
    ),
    preflightCheck(
      "counterpoint_boundary",
      "反方与边界",
      notesWithBoundary.length ? "pass" : "warning",
      notesWithBoundary.length
        ? `${notesWithBoundary.length} 条写作篮笔记已经带有反方或边界。`
        : "正式起草前，至少先补一条反方或边界，不然论证会太顺。",
      { count: notesWithBoundary.length, targetNoteIds: notesWithBoundary.map((note) => note.id) }
    )
  ];
  const warningCount = checks.filter((check) => check.status !== "pass").length;
  return {
    status: warningCount ? "needs_attention" : "ready",
    warningCount,
    passCount: checks.length - warningCount,
    checks
  };
}

function buildSections(project, basketNotes) {
  const noteWithBoundary = basketNotes.find((note) => boundarySummary(note));
  const sections = [
    {
      heading: "开篇框架",
      purpose: project.goal || `介绍 ${project.title}。`,
      evidence_note_ids: basketNotes.slice(0, 1).map((note) => note.id),
      gaps: ["正式起草前，还需要更鲜明的开场张力、场景或问题。"],
      counterpoints: ["开头应该先承认哪种读者预设或对立框架？"],
      open_questions: [
        "是什么张力或问题让这篇内容有必要存在？",
        ...(noteWithBoundary ? [`应该尽早亮出来自「${noteLabel(noteWithBoundary)}」的哪条分歧、反例或边界？`] : [])
      ],
      order: 1
    }
  ];

  basketNotes.forEach((note, index) => {
    sections.push({
      heading: note.title,
      purpose: purposeFromNote(note),
      evidence_note_ids: [note.id],
      gaps: [gapPromptFromNote(note)],
      counterpoints: [counterpointPromptFromNote(note)],
      open_questions: [
        "这条笔记怎样接进更大的论证，而不只是单独站着？",
        "这一段应该明确亮出哪条边界、反例或对立用例？"
      ],
      order: index + 2
    });
  });

  sections.push({
    heading: "综合与下一步",
    purpose: "把选中的笔记串成一个最终含义，但先不展开成完整文章。",
    evidence_note_ids: basketNotes.map((note) => note.id),
    gaps: ["还缺哪一步连接动作，才能把选中的笔记串成一个完整论证？"],
    counterpoints: ["这组笔记之间的哪条张力应该被明确说出来，而不是被抹平？"],
    open_questions: ["正式起草前，哪条判断还需要更强的证据？"],
    order: sections.length + 1
  });

  return sections;
}

function renderMarkdown(project, scaffold, basketNotes, options = {}) {
  const noteById = new Map(basketNotes.map((note) => [note.id, note]));
  const preflight = options?.preflight || null;
  const readiness = buildWritingProjectReadiness(project, basketNotes, {
    indexCards: Array.isArray(options.indexCards) ? options.indexCards : []
  });
  const lines = [
    `# ${project.title}`,
    "",
    "## 写作简述",
    `- 目标: ${project.goal || "待补充"}`,
    `- 读者: ${project.audience || "待补充"}`,
    `- 语气: ${project.tone || "待补充"}`,
    `- 意图: ${project.intent || "待补充"}`,
    `- 读者收获: ${project.desired_reader_takeaway || "待补充"}`,
    "",
    "## 就绪检查",
    `- 状态: ${renderWritingMarkdownStatus(readiness.status)}`,
    ...(
      readiness.checks.length
        ? readiness.checks.map((item) => `- ${renderWritingMarkdownField(item.field)}: ${item.message}`)
        : ["- 当前没有阻塞项，可以继续生成草稿骨架。"]
    ),
    "",
    "## 草稿骨架"
  ];

  if (preflight?.checks?.length) {
    lines.push(
      "## 草稿骨架预检",
      `- 状态: ${renderWritingMarkdownStatus(preflight.status)}`,
      `- 通过项: ${preflight.passCount}/${preflight.checks.length}`,
      `- 提醒项: ${preflight.warningCount}`,
      ""
    );
    for (const check of preflight.checks) {
      lines.push(`- ${check.status === "pass" ? "通过" : "提醒"} ${check.label}: ${check.message}`);
    }
    lines.push("");
  }

  lines.push("## 草稿骨架");

  for (const section of scaffold.sections) {
    lines.push("", `### ${section.order}. ${section.heading}`, "", section.purpose || "");
    if (section.evidence_note_ids?.length) {
      lines.push("", "证据:");
      for (const noteId of section.evidence_note_ids) {
        const note = noteById.get(noteId);
        lines.push(`- ${note?.title || noteId} (${noteId})`);
      }
    }
    if (section.gaps?.length) {
      lines.push("", "待补缺口:");
      for (const gap of section.gaps) lines.push(`- ${gap}`);
    }
    if (section.counterpoints?.length) {
      lines.push("", "反方与边界:");
      for (const counterpoint of section.counterpoints) lines.push(`- ${counterpoint}`);
    }
    if (section.open_questions?.length) {
      lines.push("", "待回答问题:");
      for (const question of section.open_questions) lines.push(`- ${question}`);
    }
  }

  if (scaffold.open_questions?.length) {
    lines.push("", "## 待处理的反方与漏洞", "");
    for (const question of scaffold.open_questions) lines.push(`- ${question}`);
  }

  lines.push("", "## 段落-证据对照表", "", "| 章节 | 证据笔记 | 缺口 | 反方与边界 | 待回答问题 |", "|---|---|---|---|---|");
  for (const section of scaffold.sections) {
    const evidence = (section.evidence_note_ids || [])
      .map((noteId) => noteById.get(noteId)?.title || noteId)
      .join(", ");
    const gaps = (section.gaps || []).join(" / ");
    const counterpoints = (section.counterpoints || []).join(" / ");
    const questions = (section.open_questions || []).join(" / ");
    lines.push(`| ${section.heading} | ${evidence || "待补充"} | ${gaps || "待补充"} | ${counterpoints || "待补充"} | ${questions || "待补充"} |`);
  }

  return `${lines.join("\n")}\n`;
}
export async function createDraftScaffold(vaultPath, input = {}) {
  if (!vaultPath) throw new Error("vaultPath is required");
  const project = await loadProject(vaultPath, input.writingProjectId || input.writing_project_id);
  if (!project.basket_note_ids.length) throw new Error("writing project basket is empty");

  const basketNotes = await loadBasketNotes(vaultPath, project.basket_note_ids);
  const relatedIndexCards = await loadRelatedIndexCards(vaultPath, project.related_index_ids);
  const now = new Date().toISOString();
  const scaffold = {
    id: cleanText(input.id) || `ds_${randomUUID().slice(0, 8)}`,
    writing_project_id: project.id,
    sections: buildSections(project, basketNotes),
    open_questions: scaffoldOpenQuestionsFromBasket(basketNotes),
    generated_by: GENERATED_BY,
    version_note: cleanText(input.versionNote || input.version_note),
    created_at: now,
    updated_at: now
  };
  const preflight = buildScaffoldPreflight(project, basketNotes);
  const markdown = renderMarkdown(project, scaffold, basketNotes, {
    preflight,
    indexCards: relatedIndexCards
  });

  const DatabaseSync = await loadDatabaseSync();
  const db = new DatabaseSync(catalogDbPath(vaultPath));
  try {
    db.exec("BEGIN IMMEDIATE;");
    try {
      db.prepare(
        `INSERT INTO draft_scaffolds
          (id, writing_project_id, sections_json, open_questions_json, generated_by, version_note, markdown, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        scaffold.id,
        scaffold.writing_project_id,
        JSON.stringify(scaffold.sections),
        JSON.stringify(scaffold.open_questions),
        scaffold.generated_by,
        scaffold.version_note,
        markdown,
        now,
        now
      );
      db.prepare("UPDATE writing_projects SET scaffold_id = ?, updated_at = ? WHERE id = ?").run(scaffold.id, now, project.id);
      db.exec("COMMIT;");
    } catch (error) {
      db.exec("ROLLBACK;");
      throw error;
    }
  } finally {
    db.close();
  }

  return {
    ...scaffold,
    markdown,
    preflight,
    writing_project: {
      ...project,
      scaffold_id: scaffold.id,
      thinkingStatus: deriveWritingProjectThinkingStatus({ ...project, scaffold_id: scaffold.id })
    },
    basket_notes: basketNotes.map(({ body, ...note }) => note)
  };
}

export async function getWritingProject(vaultPath, writingProjectId) {
  if (!vaultPath) throw new Error("vaultPath is required");
  const project = await loadProject(vaultPath, writingProjectId);
  const basketNotes = await loadBasketNotes(vaultPath, project.basket_note_ids);
  const relatedIndexCards = await loadRelatedIndexCards(vaultPath, project.related_index_ids);
  return {
    ...project,
    preflight: buildWritingProjectReadiness(project, basketNotes, { indexCards: relatedIndexCards }),
    basket_notes: basketNotes.map(({ body, ...note }) => note)
  };
}

export async function updateWritingProjectIntent(vaultPath, writingProjectId, input = {}) {
  if (!vaultPath) throw new Error("vaultPath is required");
  const id = cleanText(writingProjectId);
  if (!id) throw new Error("writingProjectId is required");

  const DatabaseSync = await loadDatabaseSync();
  const db = new DatabaseSync(catalogDbPath(vaultPath));
  try {
    const existing = db.prepare("SELECT intent, desired_reader_takeaway FROM writing_projects WHERE id = ? LIMIT 1").get(id);
    if (!existing) throw new Error(`writingProjectId not found: ${id}`);
    const intent = input.intent === undefined ? existing.intent || "" : cleanText(input.intent);
    const desiredReaderTakeaway =
      input.desiredReaderTakeaway === undefined && input.desired_reader_takeaway === undefined
        ? existing.desired_reader_takeaway || ""
        : cleanText(input.desiredReaderTakeaway || input.desired_reader_takeaway);
    const now = new Date().toISOString();
    db.prepare(
      `UPDATE writing_projects
       SET intent = ?, desired_reader_takeaway = ?, updated_at = ?
       WHERE id = ?`
    ).run(intent, desiredReaderTakeaway, now, id);
  } finally {
    db.close();
  }

  return getWritingProject(vaultPath, id);
}

export async function updateWritingProjectBookStructure(vaultPath, writingProjectId, input = {}) {
  if (!vaultPath) throw new Error("vaultPath is required");
  const id = cleanText(writingProjectId);
  if (!id) throw new Error("writingProjectId is required");

  const existingProject = await getWritingProject(vaultPath, id);
  const basketNotes = await loadBasketNotes(vaultPath, existingProject.basket_note_ids);
  const shouldRegenerate = Boolean(input.regenerate);
  const providedBookStructure = input.bookStructure !== undefined ? input.bookStructure : input.book_structure;
  if (!shouldRegenerate && providedBookStructure === undefined) {
    throw new Error("bookStructure or regenerate is required");
  }
  const bookStructure = shouldRegenerate
    ? buildDefaultBookStructure(existingProject, basketNotes)
    : normalizeBookStructure(providedBookStructure);
  if (!bookStructure.parts.length) {
    throw new Error("bookStructure.parts is required");
  }
  const now = new Date().toISOString();

  const DatabaseSync = await loadDatabaseSync();
  const db = new DatabaseSync(catalogDbPath(vaultPath));
  try {
    const exists = db.prepare("SELECT id FROM writing_projects WHERE id = ? LIMIT 1").get(id);
    if (!exists) throw new Error(`writingProjectId not found: ${id}`);
    db.prepare(
      `UPDATE writing_projects
       SET book_structure_json = ?, updated_at = ?
       WHERE id = ?`
    ).run(JSON.stringify(bookStructure), now, id);
  } finally {
    db.close();
  }

  return getWritingProject(vaultPath, id);
}

export async function syncWritingProject(vaultPath, writingProjectId, input = {}) {
  if (!vaultPath) throw new Error("vaultPath is required");
  const id = cleanText(writingProjectId);
  if (!id) throw new Error("writingProjectId is required");

  const existingProject = await getWritingProject(vaultPath, id);
  const title = cleanText(input.title) || existingProject.title || "";
  if (!title) throw new Error("title is required");

  const basketNoteIds = uniqueIds(input.basketNoteIds || input.basket_note_ids || existingProject.basket_note_ids || []);
  if (!basketNoteIds.length) throw new Error("basketNoteIds is required");
  const relatedIndexIds = uniqueIds(input.relatedIndexIds || input.related_index_ids || existingProject.related_index_ids || []);
  const basketNotes = await loadBasketNotes(vaultPath, basketNoteIds);
  const relatedIndexCards = await loadRelatedIndexCards(vaultPath, relatedIndexIds);

  const goal = input.goal === undefined ? existingProject.goal || "" : cleanText(input.goal);
  const audience = input.audience === undefined ? existingProject.audience || "" : cleanText(input.audience);
  const tone = input.tone === undefined ? existingProject.tone || "" : cleanText(input.tone);
  const intent = input.intent === undefined ? existingProject.intent || "" : cleanText(input.intent);
  const desiredReaderTakeaway =
    input.desiredReaderTakeaway === undefined && input.desired_reader_takeaway === undefined
      ? existingProject.desired_reader_takeaway || ""
      : cleanText(input.desiredReaderTakeaway || input.desired_reader_takeaway);
  const status = input.status === undefined ? existingProject.status || "draft" : cleanText(input.status) || "draft";
  const explicitBookStructure = input.bookStructure !== undefined || input.book_structure !== undefined;
  const providedBookStructure = input.bookStructure !== undefined ? input.bookStructure : input.book_structure;
  const basketChanged = uniqueIds(existingProject.basket_note_ids).join("\u0000") !== basketNoteIds.join("\u0000");
  const existingBookStructure = normalizeBookStructure(existingProject.book_structure);
  const titleChanged = title !== (existingProject.title || "");
  const goalChanged = goal !== (existingProject.goal || "");
  const audienceChanged = audience !== (existingProject.audience || "");
  const bookStructure = explicitBookStructure
    ? normalizeBookStructure(providedBookStructure)
    : basketChanged || !existingBookStructure.parts.length
      ? buildDefaultBookStructure({ ...existingProject, title, goal, audience, tone, intent, desired_reader_takeaway: desiredReaderTakeaway }, basketNotes)
      : normalizeBookStructure({
          ...existingBookStructure,
          mainline: titleChanged || goalChanged ? defaultBookMainline({ title, goal }) : existingBookStructure.mainline,
          reader: audienceChanged ? audience : existingBookStructure.reader
        });
  if (explicitBookStructure && !bookStructure.parts.length) {
    throw new Error("bookStructure.parts is required");
  }
  const now = new Date().toISOString();

  const DatabaseSync = await loadDatabaseSync();
  const db = new DatabaseSync(catalogDbPath(vaultPath));
  try {
    db.exec("BEGIN IMMEDIATE;");
    try {
      db.prepare(
        `UPDATE writing_projects
         SET title = ?, goal = ?, audience = ?, tone = ?, intent = ?, desired_reader_takeaway = ?, related_index_ids_json = ?, book_structure_json = ?, status = ?, updated_at = ?
         WHERE id = ?`
      ).run(title, goal, audience, tone, intent, desiredReaderTakeaway, JSON.stringify(relatedIndexIds), JSON.stringify(bookStructure), status, now, id);

      db.prepare("DELETE FROM writing_basket_items WHERE project_id = ?").run(id);
      basketNoteIds.forEach((noteId, index) => {
        db.prepare(
          `INSERT INTO writing_basket_items (id, project_id, note_id, order_no)
           VALUES (?, ?, ?, ?)`
        ).run(`wbi_${randomUUID().slice(0, 8)}`, id, noteId, index + 1);
      });

      db.exec("COMMIT;");
    } catch (error) {
      db.exec("ROLLBACK;");
      throw error;
    }
  } finally {
    db.close();
  }

  const refreshedProject = await getWritingProject(vaultPath, id);
  return {
    ...refreshedProject,
    preflight: buildWritingProjectReadiness(refreshedProject, basketNotes, { indexCards: relatedIndexCards }),
    thinkingStatus: deriveWritingProjectThinkingStatus(refreshedProject)
  };
}

export async function listWritingProjects(vaultPath, input = {}) {
  if (!vaultPath) throw new Error("vaultPath is required");
  const limit = Math.max(1, Math.min(50, Number(input.limit || 8) || 8));
  const query = cleanText(input.q).toLowerCase();
  const status = cleanText(input.status).toLowerCase();
  const hasDraft = cleanText(input.hasDraft || input.has_draft).toLowerCase();
  const filters = [];
  const params = [];
  if (query) {
    const like = `%${query}%`;
    filters.push("(LOWER(wp.title) LIKE ? OR LOWER(COALESCE(wp.goal, '')) LIKE ? OR LOWER(wp.id) LIKE ?)");
    params.push(like, like, like);
  }
  if (status && status !== "all") {
    filters.push("LOWER(COALESCE(wp.status, '')) = ?");
    params.push(status);
  }
  if (hasDraft === "true") {
    filters.push("wp.draft_note_id IS NOT NULL AND TRIM(wp.draft_note_id) <> ''");
  } else if (hasDraft === "false") {
    filters.push("(wp.draft_note_id IS NULL OR TRIM(wp.draft_note_id) = '')");
  }
  const whereClause = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
  const DatabaseSync = await loadDatabaseSync();
  const db = new DatabaseSync(catalogDbPath(vaultPath));
  try {
    const rows = db
      .prepare(
        `SELECT
           wp.*,
           COUNT(wbi.id) AS basket_count
         FROM writing_projects wp
         LEFT JOIN writing_basket_items wbi ON wbi.project_id = wp.id
         ${whereClause}
         GROUP BY wp.id
         ORDER BY datetime(wp.updated_at) DESC, wp.id DESC
         LIMIT ?`
      )
      .all(...params, limit);
    const projects = [];
    for (const row of rows) {
      projects.push({
        ...mapProjectListRow(row),
        draft_note: await loadProjectDraftNote(vaultPath, row.draft_note_id)
      });
    }
    return projects;
  } finally {
    db.close();
  }
}

export async function listProjectScaffolds(vaultPath, writingProjectId, input = {}) {
  if (!vaultPath) throw new Error("vaultPath is required");
  const projectId = cleanText(writingProjectId);
  if (!projectId) throw new Error("writingProjectId is required");
  const limit = Math.max(1, Math.min(50, Number(input.limit || 12) || 12));
  const DatabaseSync = await loadDatabaseSync();
  const db = new DatabaseSync(catalogDbPath(vaultPath));
  try {
    const exists = db.prepare("SELECT id FROM writing_projects WHERE id = ? LIMIT 1").get(projectId);
    if (!exists) throw new Error(`writingProjectId not found: ${projectId}`);
    const rows = db
      .prepare(
        `SELECT
           ds.*,
           json_array_length(ds.sections_json) AS section_count
         FROM draft_scaffolds ds
         WHERE ds.writing_project_id = ?
         ORDER BY ds.created_at DESC, ds.id DESC
         LIMIT ?`
      )
      .all(projectId, limit);
    return rows.map(mapScaffoldListRow);
  } finally {
    db.close();
  }
}

export async function listProjectDraftVersions(vaultPath, writingProjectId, input = {}) {
  if (!vaultPath) throw new Error("vaultPath is required");
  const projectId = cleanText(writingProjectId);
  if (!projectId) throw new Error("writingProjectId is required");
  const limit = Math.max(1, Math.min(50, Number(input.limit || 12) || 12));
  const DatabaseSync = await loadDatabaseSync();
  const db = new DatabaseSync(catalogDbPath(vaultPath));
  try {
    const project = db.prepare("SELECT draft_note_id FROM writing_projects WHERE id = ? LIMIT 1").get(projectId);
    if (!project) throw new Error(`writingProjectId not found: ${projectId}`);
    const rows = db
      .prepare(
        `SELECT
           dnv.*
         FROM draft_note_versions dnv
         WHERE dnv.writing_project_id = ?
         ORDER BY dnv.version_no DESC, datetime(dnv.created_at) DESC, dnv.id DESC
         LIMIT ?`
      )
      .all(projectId, limit);
    const versions = [];
    for (const row of rows) {
      versions.push({
        ...mapDraftVersionRow(row, project.draft_note_id),
        note: await loadDraftVersionNote(vaultPath, row.draft_note_id)
      });
    }
    return versions;
  } finally {
    db.close();
  }
}

export async function bindDraftNoteToProject(vaultPath, input = {}) {
  if (!vaultPath) throw new Error("vaultPath is required");
  const writingProjectId = cleanText(input.writingProjectId || input.writing_project_id);
  if (!writingProjectId) throw new Error("writingProjectId is required");
  const draftNoteId = cleanText(input.draftNoteId || input.draft_note_id);
  if (!draftNoteId) throw new Error("draftNoteId is required");
  const sourceScaffoldId = cleanText(input.sourceScaffoldId || input.source_scaffold_id) || null;
  const versionNote = cleanText(input.versionNote || input.version_note);

  const note = await getNoteById(vaultPath, draftNoteId);
  if (note.noteType !== "permanent") {
    throw new Error(`draft note must be a permanent note: ${draftNoteId}`);
  }

  const now = new Date().toISOString();
  const DatabaseSync = await loadDatabaseSync();
  const db = new DatabaseSync(catalogDbPath(vaultPath));
  try {
    const exists = db.prepare("SELECT id FROM writing_projects WHERE id = ? LIMIT 1").get(writingProjectId);
    if (!exists) throw new Error(`writingProjectId not found: ${writingProjectId}`);
    const nextVersionNo = Number(
      db.prepare("SELECT COALESCE(MAX(version_no), 0) AS value FROM draft_note_versions WHERE writing_project_id = ?").get(writingProjectId)?.value || 0
    ) + 1;
    db.prepare(
      `INSERT INTO draft_note_versions
        (id, writing_project_id, draft_note_id, source_scaffold_id, version_no, version_note, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(`dnv_${randomUUID().slice(0, 8)}`, writingProjectId, draftNoteId, sourceScaffoldId, nextVersionNo, versionNote, now);
    db.prepare("UPDATE writing_projects SET draft_note_id = ?, updated_at = ? WHERE id = ?").run(draftNoteId, now, writingProjectId);
  } finally {
    db.close();
  }

  return getWritingProject(vaultPath, writingProjectId);
}

export async function setCurrentDraftNote(vaultPath, input = {}) {
  if (!vaultPath) throw new Error("vaultPath is required");
  const writingProjectId = cleanText(input.writingProjectId || input.writing_project_id);
  if (!writingProjectId) throw new Error("writingProjectId is required");
  const draftNoteId = cleanText(input.draftNoteId || input.draft_note_id);
  if (!draftNoteId) throw new Error("draftNoteId is required");

  const DatabaseSync = await loadDatabaseSync();
  const db = new DatabaseSync(catalogDbPath(vaultPath));
  try {
    const exists = db.prepare("SELECT id FROM writing_projects WHERE id = ? LIMIT 1").get(writingProjectId);
    if (!exists) throw new Error(`writingProjectId not found: ${writingProjectId}`);
    const draftVersion = db
      .prepare(
        `SELECT id
         FROM draft_note_versions
         WHERE writing_project_id = ? AND draft_note_id = ?
         ORDER BY version_no DESC, datetime(created_at) DESC, id DESC
         LIMIT 1`
      )
      .get(writingProjectId, draftNoteId);
    if (!draftVersion) {
      throw new Error(`draftNoteId is not a saved version for writing project: ${draftNoteId}`);
    }
    const now = new Date().toISOString();
    db.prepare("UPDATE writing_projects SET draft_note_id = ?, updated_at = ? WHERE id = ?").run(draftNoteId, now, writingProjectId);
  } finally {
    db.close();
  }

  return getWritingProject(vaultPath, writingProjectId);
}

export async function updateDraftScaffoldVersionNote(vaultPath, draftScaffoldId, input = {}) {
  if (!vaultPath) throw new Error("vaultPath is required");
  const id = cleanText(draftScaffoldId);
  if (!id) throw new Error("draftScaffoldId is required");
  const versionNote = cleanText(input.versionNote || input.version_note);

  const DatabaseSync = await loadDatabaseSync();
  const db = new DatabaseSync(catalogDbPath(vaultPath));
  try {
    const exists = db.prepare("SELECT id FROM draft_scaffolds WHERE id = ? LIMIT 1").get(id);
    if (!exists) throw new Error(`draftScaffoldId not found: ${id}`);
    const now = new Date().toISOString();
    db.prepare("UPDATE draft_scaffolds SET version_note = ?, updated_at = ? WHERE id = ?").run(versionNote, now, id);
  } finally {
    db.close();
  }

  return getDraftScaffold(vaultPath, id);
}

export async function updateDraftNoteVersionNote(vaultPath, draftVersionId, input = {}) {
  if (!vaultPath) throw new Error("vaultPath is required");
  const id = cleanText(draftVersionId);
  if (!id) throw new Error("draftVersionId is required");
  const versionNote = cleanText(input.versionNote || input.version_note);

  const DatabaseSync = await loadDatabaseSync();
  const db = new DatabaseSync(catalogDbPath(vaultPath));
  try {
    const row = db
      .prepare(
        `SELECT
           dnv.*,
           wp.draft_note_id AS current_draft_note_id
         FROM draft_note_versions dnv
         JOIN writing_projects wp ON wp.id = dnv.writing_project_id
         WHERE dnv.id = ?
         LIMIT 1`
      )
      .get(id);
    if (!row) throw new Error(`draftVersionId not found: ${id}`);
    db.prepare("UPDATE draft_note_versions SET version_note = ? WHERE id = ?").run(versionNote, id);
    return {
      ...mapDraftVersionRow({ ...row, version_note: versionNote }, row.current_draft_note_id),
      note: await loadDraftVersionNote(vaultPath, row.draft_note_id)
    };
  } finally {
    db.close();
  }
}

export async function getDraftScaffold(vaultPath, draftScaffoldId) {
  const id = cleanText(draftScaffoldId);
  if (!id) throw new Error("draftScaffoldId is required");

  const DatabaseSync = await loadDatabaseSync();
  const db = new DatabaseSync(catalogDbPath(vaultPath));
  try {
    const row = db.prepare("SELECT * FROM draft_scaffolds WHERE id = ? LIMIT 1").get(id);
    if (!row) throw new Error(`draftScaffoldId not found: ${id}`);
    const scaffold = mapScaffoldRow(row);
    const project = await loadProject(vaultPath, scaffold.writing_project_id);
    const basketNotes = await loadBasketNotes(vaultPath, project.basket_note_ids);
    return {
      ...scaffold,
      preflight: buildScaffoldPreflight(project, basketNotes)
    };
  } finally {
    db.close();
  }
}
