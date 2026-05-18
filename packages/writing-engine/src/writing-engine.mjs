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

function mapProjectRow(row, basketNoteIds = []) {
  const project = {
    id: row.id,
    title: row.title,
    goal: row.goal || "",
    audience: row.audience || "",
    tone: row.tone || "",
    intent: row.intent || "",
    desired_reader_takeaway: row.desired_reader_takeaway || "",
    knowledge_work_id: row.knowledge_work_id || "",
    related_index_ids: parseJsonStringArray(row.related_index_ids_json),
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
  const project = {
    id: row.id,
    title: row.title,
    goal: row.goal || "",
    audience: row.audience || "",
    tone: row.tone || "",
    intent: row.intent || "",
    desired_reader_takeaway: row.desired_reader_takeaway || "",
    knowledge_work_id: row.knowledge_work_id || "",
    related_index_ids: parseJsonStringArray(row.related_index_ids_json),
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

async function loadBasketNotes(vaultPath, noteIds) {
  const notes = [];
  for (const noteId of noteIds) {
    const note = await getNoteById(vaultPath, noteId);
    if (note.noteType !== "permanent") {
      throw new Error(`writing basket only accepts permanent notes: ${noteId}`);
    }
    notes.push({
      id: note.id,
      title: note.title,
      note_type: note.noteType,
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
    knowledge_work_id: cleanText(input.knowledgeWorkId || input.knowledge_work_id),
    related_index_ids: relatedIndexIds,
    status: cleanText(input.status) || "draft",
    created_at: now,
    updated_at: now
  };

  const DatabaseSync = await loadDatabaseSync();
  const db = new DatabaseSync(catalogDbPath(vaultPath));
  try {
    db.exec("BEGIN IMMEDIATE;");
    try {
      db.prepare(
        `INSERT INTO writing_projects
          (id, title, goal, audience, tone, intent, desired_reader_takeaway, knowledge_work_id, related_index_ids_json, status, scaffold_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?)`
      ).run(
        project.id,
        project.title,
        project.goal,
        project.audience,
        project.tone,
        project.intent,
        project.desired_reader_takeaway,
        project.knowledge_work_id,
        JSON.stringify(project.related_index_ids),
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
  return excerpt ? `Use this note to support the claim: ${excerpt}` : "Use this note as evidence for the argument.";
}

function noteLabel(note) {
  return cleanText(note?.title) || cleanText(note?.id) || "this note";
}

function gapPromptFromNote(note) {
  return `What evidence, example, or transition is still missing before "${noteLabel(note)}" can carry a full paragraph?`;
}

function counterpointPromptFromNote(note) {
  const boundary = boundarySummary(note);
  return boundary
    ? `Address this counterpoint or boundary in "${noteLabel(note)}": ${boundary}`
    : `What counterpoint, limit, or exception should "${noteLabel(note)}" acknowledge?`;
}

function conceptShiftPromptFromBasket(basketNotes) {
  const titledNotes = basketNotes.map((note) => noteLabel(note)).slice(0, 3);
  if (!titledNotes.length) return "Where do similar concepts in this basket need sharper separation?";
  return `Where do apparently similar concepts around ${titledNotes.join(", ")} need sharper separation?`;
}

function scaffoldOpenQuestionsFromBasket(basketNotes) {
  const questions = [
    "What evidence is missing?",
    "What counterpoint should be handled before drafting?",
    conceptShiftPromptFromBasket(basketNotes)
  ];
  const noteWithBoundary = basketNotes.find((note) => boundarySummary(note));
  if (noteWithBoundary) {
    questions.push(`Which boundary matters most for the overall argument: ${noteLabel(noteWithBoundary)}?`);
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
      "Permanent-note basket",
      basketCount >= 2 ? "pass" : "warning",
      basketCount >= 2
        ? `${basketCount} permanent notes are ready to be organized into a scaffold.`
        : "Add at least two permanent notes before treating this as a real argument.",
      { count: basketCount, targetType: "writing_project", targetId: project.id }
    ),
    preflightCheck(
      "writing_intent",
      "Writing intent",
      cleanText(project.intent) ? "pass" : "warning",
      cleanText(project.intent)
        ? "The project has a clear writing intent."
        : "Clarify what this piece is trying to explain before trusting the scaffold.",
      { targetType: "writing_project", targetId: project.id }
    ),
    preflightCheck(
      "reader_takeaway",
      "Reader takeaway",
      cleanText(project.desired_reader_takeaway) ? "pass" : "warning",
      cleanText(project.desired_reader_takeaway)
        ? "The desired reader takeaway is explicit."
        : "Add the reader takeaway so the scaffold has a target judgment.",
      { targetType: "writing_project", targetId: project.id }
    ),
    preflightCheck(
      "confirmed_distillation",
      "Confirmed distillation",
      confirmedNotes.length === basketCount && basketCount > 0 ? "pass" : "warning",
      confirmedNotes.length === basketCount && basketCount > 0
        ? "Every basket note has confirmed thesis and three-line distillation."
        : `${Math.max(0, basketCount - confirmedNotes.length)} basket notes still need confirmed thesis and three-line distillation.`,
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
      "Distillation quality",
      distillationQualityWarnings.length ? "warning" : "pass",
      distillationQualityWarnings.length
        ? `${affectedQualityNotes.length} basket notes still look rough. ${qualitySample}`
        : "Basket notes do not show obvious short, repetitive, or boundary-missing distillation issues.",
      {
        count: distillationQualityWarnings.length,
        targetNoteIds: affectedQualityNotes,
        warningIds: distillationQualityWarnings.map((item) => item.id)
      }
    ),
    preflightCheck(
      "topic_entry",
      "Theme entry",
      Array.isArray(project.related_index_ids) && project.related_index_ids.length ? "pass" : "warning",
      Array.isArray(project.related_index_ids) && project.related_index_ids.length
        ? "The project is tied to a theme/index entry."
        : "Link a theme/index card so this scaffold has a reusable question context.",
      { targetType: "writing_project", targetId: project.id }
    ),
    preflightCheck(
      "counterpoint_boundary",
      "Counterpoint boundary",
      notesWithBoundary.length ? "pass" : "warning",
      notesWithBoundary.length
        ? `${notesWithBoundary.length} basket notes carry boundaries or counterpoints.`
        : "Add at least one boundary or counterpoint before drafting, or the argument may become too smooth.",
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
      heading: "Opening frame",
      purpose: project.goal || `Introduce ${project.title}.`,
      evidence_note_ids: basketNotes.slice(0, 1).map((note) => note.id),
      gaps: ["Need a sharper opening tension, scene, or question before drafting prose."],
      counterpoints: ["What reader assumption or opposing frame should the opening acknowledge?"],
      open_questions: [
        "What tension or question makes this piece necessary?",
        ...(noteWithBoundary ? [`Which disagreement or limit from "${noteLabel(noteWithBoundary)}" should surface early?`] : [])
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
        "How does this note connect to the broader line of argument instead of standing alone?",
        "Which boundary, counterexample, or opposing use-case should this section make explicit?"
      ],
      order: index + 2
    });
  });

  sections.push({
    heading: "Synthesis and next step",
    purpose: "Connect the selected notes into a final implication without drafting the full article.",
    evidence_note_ids: basketNotes.map((note) => note.id),
    gaps: ["What connective move is still missing to turn the selected notes into one argument?"],
    counterpoints: ["Which tension between the selected notes should be made explicit instead of smoothed over?"],
    open_questions: ["Which claim still needs stronger evidence before drafting?"],
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
    "## Writing Brief",
    `- Goal: ${project.goal || "TBD"}`,
    `- Audience: ${project.audience || "TBD"}`,
    `- Tone: ${project.tone || "TBD"}`,
    `- Intent: ${project.intent || "TBD"}`,
    `- Reader takeaway: ${project.desired_reader_takeaway || "TBD"}`,
    "",
    "## Readiness Check",
    `- Status: ${readiness.status}`,
    ...(
      readiness.checks.length
        ? readiness.checks.map((item) => `- ${item.field}: ${item.message}`)
        : ["- No blocking gaps detected for scaffold generation."]
    ),
    ""
  ];

  if (preflight?.checks?.length) {
    lines.push(
      "## Scaffold Readiness Check",
      `- Status: ${preflight.status}`,
      `- Passing checks: ${preflight.passCount}/${preflight.checks.length}`,
      `- Warnings: ${preflight.warningCount}`,
      ""
    );
    for (const check of preflight.checks) {
      lines.push(`- ${check.status === "pass" ? "PASS" : "WARN"} ${check.label}: ${check.message}`);
    }
    lines.push("");
  }

  lines.push("## Draft Scaffold");

  for (const section of scaffold.sections) {
    lines.push("", `### ${section.order}. ${section.heading}`, "", section.purpose || "");
    if (section.evidence_note_ids?.length) {
      lines.push("", "Evidence:");
      for (const noteId of section.evidence_note_ids) {
        const note = noteById.get(noteId);
        lines.push(`- ${note?.title || noteId} (${noteId})`);
      }
    }
    if (section.gaps?.length) {
      lines.push("", "Gaps:");
      for (const gap of section.gaps) lines.push(`- ${gap}`);
    }
    if (section.counterpoints?.length) {
      lines.push("", "Counterpoints:");
      for (const counterpoint of section.counterpoints) lines.push(`- ${counterpoint}`);
    }
    if (section.open_questions?.length) {
      lines.push("", "Open questions:");
      for (const question of section.open_questions) lines.push(`- ${question}`);
    }
  }

  if (scaffold.open_questions?.length) {
    lines.push("", "## Draft-level tensions", "");
    for (const question of scaffold.open_questions) lines.push(`- ${question}`);
  }

  lines.push("", "## Paragraph-Evidence Map", "", "| Section | Evidence notes | Gaps | Counterpoints | Open questions |", "|---|---|---|---|---|");
  for (const section of scaffold.sections) {
    const evidence = (section.evidence_note_ids || [])
      .map((noteId) => noteById.get(noteId)?.title || noteId)
      .join(", ");
    const gaps = (section.gaps || []).join(" / ");
    const counterpoints = (section.counterpoints || []).join(" / ");
    const questions = (section.open_questions || []).join(" / ");
    lines.push(`| ${section.heading} | ${evidence || "TBD"} | ${gaps || "TBD"} | ${counterpoints || "TBD"} | ${questions || "TBD"} |`);
  }

  return `${lines.join("\n")}\n`;
}

export async function createDraftScaffold(vaultPath, input = {}) {
  if (!vaultPath) throw new Error("vaultPath is required");
  const project = await loadProject(vaultPath, input.writingProjectId || input.writing_project_id);
  if (!project.basket_note_ids.length) throw new Error("writing project basket is empty");

  const basketNotes = await loadBasketNotes(vaultPath, project.basket_note_ids);
  const relatedIndexCards = await loadRelatedIndexCards(vaultPath, project.related_index_ids);
  const readiness = buildWritingProjectReadiness(project, basketNotes, { indexCards: relatedIndexCards });
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
    indexCards: relatedIndexCards,
    preflight
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
    readiness,
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
    const relatedIndexCards = await loadRelatedIndexCards(vaultPath, project.related_index_ids);
    return {
      ...scaffold,
      preflight: buildScaffoldPreflight(project, basketNotes),
      readiness: buildWritingProjectReadiness(project, basketNotes, { indexCards: relatedIndexCards })
    };
  } finally {
    db.close();
  }
}
