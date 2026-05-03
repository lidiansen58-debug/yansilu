import path from "node:path";
import { randomUUID } from "node:crypto";
import { SQLITE_DB_FILES } from "../../domain/src/sqlite-migrations.mjs";
import { getNoteById } from "../../domain/src/index.mjs";

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

function mapProjectRow(row, basketNoteIds = []) {
  return {
    id: row.id,
    title: row.title,
    goal: row.goal || "",
    audience: row.audience || "",
    tone: row.tone || "",
    basket_note_ids: basketNoteIds,
    scaffold_id: row.scaffold_id || null,
    draft_note_id: row.draft_note_id || null,
    status: row.status,
    created_at: row.created_at,
    updated_at: row.updated_at
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
  return {
    id: row.id,
    title: row.title,
    goal: row.goal || "",
    audience: row.audience || "",
    tone: row.tone || "",
    scaffold_id: row.scaffold_id || null,
    draft_note_id: row.draft_note_id || null,
    status: row.status,
    basket_count: Number(row.basket_count || 0),
    created_at: row.created_at,
    updated_at: row.updated_at
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
  return cleanText(note.body)
    .replace(/^#+\s+/gm, "")
    .replace(/\s+/g, " ")
    .slice(0, 220);
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
      body: note.body
    });
  }
  return notes;
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
  const basketNotes = await loadBasketNotes(vaultPath, basketNoteIds);

  const now = new Date().toISOString();
  const id = cleanText(input.id) || `wp_${randomUUID().slice(0, 8)}`;
  const project = {
    id,
    title,
    goal: cleanText(input.goal),
    audience: cleanText(input.audience),
    tone: cleanText(input.tone),
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
          (id, title, goal, audience, tone, status, scaffold_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, NULL, ?, ?)`
      ).run(project.id, project.title, project.goal, project.audience, project.tone, project.status, now, now);

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

  return {
    ...project,
    basket_note_ids: basketNoteIds,
    scaffold_id: null,
    draft_note_id: null,
    draft_note: null,
    basket_notes: basketNotes.map(({ body, ...note }) => note)
  };
}

function purposeFromNote(note) {
  const excerpt = noteExcerpt(note);
  return excerpt ? `Use this note to support the claim: ${excerpt}` : "Use this note as evidence for the argument.";
}

function buildSections(project, basketNotes) {
  const sections = [
    {
      heading: "Opening frame",
      purpose: project.goal || `Introduce ${project.title}.`,
      evidence_note_ids: basketNotes.slice(0, 1).map((note) => note.id),
      open_questions: ["What tension or question makes this piece necessary?"],
      order: 1
    }
  ];

  basketNotes.forEach((note, index) => {
    sections.push({
      heading: note.title,
      purpose: purposeFromNote(note),
      evidence_note_ids: [note.id],
      open_questions: [],
      order: index + 2
    });
  });

  sections.push({
    heading: "Synthesis and next step",
    purpose: "Connect the selected notes into a final implication without drafting the full article.",
    evidence_note_ids: basketNotes.map((note) => note.id),
    open_questions: ["Which claim still needs stronger evidence before drafting?"],
    order: sections.length + 1
  });

  return sections;
}

function renderMarkdown(project, scaffold, basketNotes) {
  const noteById = new Map(basketNotes.map((note) => [note.id, note]));
  const lines = [
    `# ${project.title}`,
    "",
    "## Writing Brief",
    `- Goal: ${project.goal || "TBD"}`,
    `- Audience: ${project.audience || "TBD"}`,
    `- Tone: ${project.tone || "TBD"}`,
    "",
    "## Draft Scaffold"
  ];

  for (const section of scaffold.sections) {
    lines.push("", `### ${section.order}. ${section.heading}`, "", section.purpose || "");
    if (section.evidence_note_ids?.length) {
      lines.push("", "Evidence:");
      for (const noteId of section.evidence_note_ids) {
        const note = noteById.get(noteId);
        lines.push(`- ${note?.title || noteId} (${noteId})`);
      }
    }
    if (section.open_questions?.length) {
      lines.push("", "Open questions:");
      for (const question of section.open_questions) lines.push(`- ${question}`);
    }
  }

  lines.push("", "## Paragraph-Evidence Map", "", "| Section | Evidence notes |", "|---|---|");
  for (const section of scaffold.sections) {
    const evidence = (section.evidence_note_ids || [])
      .map((noteId) => noteById.get(noteId)?.title || noteId)
      .join(", ");
    lines.push(`| ${section.heading} | ${evidence || "TBD"} |`);
  }

  return `${lines.join("\n")}\n`;
}

export async function createDraftScaffold(vaultPath, input = {}) {
  if (!vaultPath) throw new Error("vaultPath is required");
  const project = await loadProject(vaultPath, input.writingProjectId || input.writing_project_id);
  if (!project.basket_note_ids.length) throw new Error("writing project basket is empty");

  const basketNotes = await loadBasketNotes(vaultPath, project.basket_note_ids);
  const now = new Date().toISOString();
  const scaffold = {
    id: cleanText(input.id) || `ds_${randomUUID().slice(0, 8)}`,
    writing_project_id: project.id,
    sections: buildSections(project, basketNotes),
    open_questions: ["What evidence is missing?", "What counterpoint should be handled before drafting?"],
    generated_by: GENERATED_BY,
    version_note: cleanText(input.versionNote || input.version_note),
    created_at: now,
    updated_at: now
  };
  const markdown = renderMarkdown(project, scaffold, basketNotes);

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
    writing_project: {
      ...project,
      scaffold_id: scaffold.id
    },
    basket_notes: basketNotes.map(({ body, ...note }) => note)
  };
}

export async function getWritingProject(vaultPath, writingProjectId) {
  if (!vaultPath) throw new Error("vaultPath is required");
  const project = await loadProject(vaultPath, writingProjectId);
  const basketNotes = await loadBasketNotes(vaultPath, project.basket_note_ids);
  return {
    ...project,
    basket_notes: basketNotes.map(({ body, ...note }) => note)
  };
}

export async function listWritingProjects(vaultPath, input = {}) {
  if (!vaultPath) throw new Error("vaultPath is required");
  const limit = Math.max(1, Math.min(50, Number(input.limit || 8) || 8));
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
         GROUP BY wp.id
         ORDER BY datetime(wp.updated_at) DESC, wp.id DESC
         LIMIT ?`
      )
      .all(limit);
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
    throw new Error(`draft note must be a permanent/original note: ${draftNoteId}`);
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

export async function getDraftScaffold(vaultPath, draftScaffoldId) {
  const id = cleanText(draftScaffoldId);
  if (!id) throw new Error("draftScaffoldId is required");

  const DatabaseSync = await loadDatabaseSync();
  const db = new DatabaseSync(catalogDbPath(vaultPath));
  try {
    const row = db.prepare("SELECT * FROM draft_scaffolds WHERE id = ? LIMIT 1").get(id);
    if (!row) throw new Error(`draftScaffoldId not found: ${id}`);
    return mapScaffoldRow(row);
  } finally {
    db.close();
  }
}
