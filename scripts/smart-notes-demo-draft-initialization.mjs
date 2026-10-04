import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { getNoteById, SQLITE_DB_FILES } from "../packages/domain/src/index.mjs";

function markerPath(vaultPath, projectId) {
  return path.join(vaultPath, ".yansilu", "demo-initialization", `draft-${encodeURIComponent(projectId)}.json`);
}

// Write before creating the project so an interrupted import remains recoverable.
// Existing projects never acquire a marker merely by being reimported.
export async function beginDemoDraftInitialization(vaultPath, projectId, draftNoteId) {
  if (!draftNoteId) return;
  const marker = markerPath(vaultPath, projectId);
  await fs.mkdir(path.dirname(marker), { recursive: true });
  const temporary = `${marker}.${randomUUID()}.tmp`;
  try {
    await fs.writeFile(temporary, JSON.stringify({ projectId, draftNoteId }), { encoding: "utf8", flag: "wx", flush: true });
    await fs.rename(temporary, marker);
  } finally {
    await fs.rm(temporary, { force: true });
  }
}

export async function finishDemoDraftInitialization(vaultPath, projectId, draftNoteId, scaffoldId) {
  if (!draftNoteId) return;
  const marker = markerPath(vaultPath, projectId);
  let pending;
  try { pending = JSON.parse(await fs.readFile(marker, "utf8")); }
  catch (error) {
    if (error.code === "ENOENT") return;
    // A damaged legacy marker cannot prove ownership of an existing project.
    // Discard it without changing the project or blocking further imports.
    if (error instanceof SyntaxError) {
      await fs.rm(marker, { force: true });
      return;
    }
    throw error;
  }
  if (!pending || typeof pending.projectId !== "string" || typeof pending.draftNoteId !== "string") {
    await fs.rm(marker, { force: true });
    return;
  }
  if (pending.projectId !== projectId || pending.draftNoteId !== draftNoteId) {
    throw new Error(`Demo draft initialization does not match project: ${projectId}`);
  }
  // Validate the note before the transaction; re-read project eligibility inside it.
  const note = await getNoteById(vaultPath, draftNoteId);
  if (note.noteType !== "permanent") throw new Error(`draft note must be a permanent note: ${draftNoteId}`);
  const { DatabaseSync } = await import("node:sqlite");
  const db = new DatabaseSync(path.join(vaultPath, ".yansilu", SQLITE_DB_FILES.catalog));
  try {
    db.exec("BEGIN IMMEDIATE");
    try {
      const project = db.prepare("SELECT draft_note_id FROM writing_projects WHERE id = ?").get(projectId);
      if (!project) throw new Error(`writingProjectId not found: ${projectId}`);
      const versions = db.prepare("SELECT draft_note_id FROM draft_note_versions WHERE writing_project_id = ?").all(projectId);
      if (!project.draft_note_id && (!versions.length || (versions.length === 1 && versions[0].draft_note_id === draftNoteId))) {
        const now = new Date().toISOString();
        if (!versions.length) {
          db.prepare(`INSERT INTO draft_note_versions
            (id, writing_project_id, draft_note_id, source_scaffold_id, version_no, version_note, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)`).run(`dnv_${randomUUID().slice(0, 8)}`, projectId, draftNoteId, scaffoldId || null, 1,
            "从示例笔记、关系和主题组织的使用说明正文，可继续编辑。", now);
        }
        db.prepare("UPDATE writing_projects SET draft_note_id = ?, updated_at = ? WHERE id = ?").run(draftNoteId, now, projectId);
      }
      db.exec("COMMIT");
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
  } finally {
    db.close();
  }
  await fs.rm(marker, { force: true });
}
