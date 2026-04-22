import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { SQLITE_DB_FILES } from "./sqlite-migrations.mjs";
import { writeMarkdownIfAbsent } from "./vault.mjs";
import { parseMarkdownWithFrontmatter, serializeMarkdownWithFrontmatter } from "./frontmatter.mjs";

function catalogDbPath(vaultPath) {
  return path.join(path.resolve(vaultPath), ".yansilu", SQLITE_DB_FILES.catalog);
}

async function loadDatabaseSync() {
  try {
    const mod = await import("node:sqlite");
    return mod.DatabaseSync;
  } catch {
    throw new Error("Note catalog store requires node:sqlite (Node.js 22+).");
  }
}

function sanitizeFileName(input) {
  const text = String(input || "").trim();
  const clean = text.replace(/[<>:"/\\|?*\x00-\x1f]/g, "_").replace(/\s+/g, " ").trim();
  return clean || "note";
}

function toTitleLine(raw) {
  return String(raw || "").replace(/^#+\s*/, "").replace(/\r?\n/g, " ").trim();
}

function normalizeMarkdown(inputTitle, inputBody) {
  const body = String(inputBody || "").replace(/\r\n/g, "\n").trim();
  const fallback = toTitleLine(inputTitle) || "未命名笔记";
  if (!body) return { title: fallback, markdownBody: `# ${fallback}\n` };

  const lines = body.split("\n");
  const first = String(lines[0] || "").trim();
  const headingMatch = first.match(/^#{1,6}\s+(.+)$/);
  if (headingMatch) {
    return { title: toTitleLine(headingMatch[1]) || fallback, markdownBody: body.endsWith("\n") ? body : `${body}\n` };
  }

  const title = toTitleLine(first) || fallback;
  const rest = lines.slice(1).join("\n").replace(/^\n+/, "");
  const markdownBody = rest ? `# ${title}\n\n${rest}\n` : `# ${title}\n`;
  return { title, markdownBody };
}

function noteTypeFromDirectoryType(directoryType) {
  if (directoryType === "fleeting_default") return "fleeting";
  if (directoryType === "literature_default") return "literature";
  return "permanent";
}

function makeNoteId(noteType) {
  const prefix = noteType === "fleeting" ? "fn" : noteType === "literature" ? "ln" : "pn";
  return `${prefix}_${randomUUID().slice(0, 8)}`;
}

function defaultDirectoryIdForNoteType(noteType) {
  if (noteType === "fleeting") return "dir_fleeting_default";
  if (noteType === "literature") return "dir_literature_default";
  return "dir_original_default";
}

function mapNoteRow(row) {
  return {
    id: row.id,
    noteType: row.note_type,
    title: row.title,
    status: row.status,
    markdownPath: row.markdown_path,
    directoryId: row.directory_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function ensureSingleDirectoryMembership(db, noteId, directoryId) {
  const existing = db
    .prepare("SELECT id FROM note_directory_membership WHERE note_id = ? AND directory_id = ? LIMIT 1")
    .get(noteId, directoryId);
  if (existing) {
    db.prepare("DELETE FROM note_directory_membership WHERE note_id = ? AND directory_id != ?").run(noteId, directoryId);
    return;
  }
  db.prepare("DELETE FROM note_directory_membership WHERE note_id = ?").run(noteId);
  db.prepare(`INSERT INTO note_directory_membership (id, note_id, directory_id, created_at) VALUES (?, ?, ?, ?)`).run(
    `ndm_${randomUUID().slice(0, 8)}`,
    noteId,
    directoryId,
    new Date().toISOString()
  );
}

export async function createNoteInDirectory(vaultPath, input = {}) {
  if (!vaultPath) throw new Error("vaultPath is required");
  const directoryId = String(input.directoryId || "").trim();
  if (!directoryId) throw new Error("directoryId is required");

  const status = String(input.status || "draft").trim() || "draft";
  const now = new Date().toISOString();
  const DatabaseSync = await loadDatabaseSync();
  const db = new DatabaseSync(catalogDbPath(vaultPath));
  try {
    const dir = db
      .prepare("SELECT id, directory_type, fs_path FROM directories WHERE id = ? LIMIT 1")
      .get(directoryId);
    if (!dir) throw new Error(`directoryId not found: ${directoryId}`);

    const noteType = noteTypeFromDirectoryType(dir.directory_type);
    const normalized = normalizeMarkdown(input.title, input.body);
    const noteId = String(input.id || makeNoteId(noteType));
    const fileName = sanitizeFileName(noteId);
    const absMarkdownPath = path.join(dir.fs_path, `${fileName}.md`);
    await fs.mkdir(path.dirname(absMarkdownPath), { recursive: true });

    const frontmatter = {
      id: noteId,
      note_type: noteType,
      title: normalized.title,
      status,
      created_at: now,
      updated_at: now
    };
    const markdown = serializeMarkdownWithFrontmatter(frontmatter, normalized.markdownBody);
    const writeResult = await writeMarkdownIfAbsent(absMarkdownPath, markdown);
    if (!writeResult.written) throw new Error(`note already exists: ${noteId}`);

    const relPath = path.relative(path.resolve(vaultPath), absMarkdownPath).replaceAll("\\", "/");
    db.exec("BEGIN IMMEDIATE;");
    try {
      db.prepare(
        `INSERT INTO notes (id, note_type, title, status, markdown_path, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      ).run(noteId, noteType, normalized.title, status, relPath, now, now);
      db.prepare(
        `INSERT INTO note_directory_membership (id, note_id, directory_id, created_at)
         VALUES (?, ?, ?, ?)`
      ).run(`ndm_${randomUUID().slice(0, 8)}`, noteId, directoryId, now);
      db.exec("COMMIT;");
    } catch (error) {
      db.exec("ROLLBACK;");
      throw error;
    }

    return {
      id: noteId,
      noteType,
      title: normalized.title,
      status,
      directoryId,
      markdownPath: relPath,
      createdAt: now,
      updatedAt: now
    };
  } finally {
    db.close();
  }
}

export async function registerMarkdownNoteInCatalog(vaultPath, input = {}) {
  if (!vaultPath) throw new Error("vaultPath is required");
  const noteId = String(input.noteId || "").trim();
  if (!noteId) throw new Error("noteId is required");
  const noteType = String(input.noteType || "permanent").trim();
  const title = String(input.title || noteId).trim() || noteId;
  const status = String(input.status || "draft").trim() || "draft";
  const markdownPath = String(input.markdownPath || "").replaceAll("\\", "/").trim();
  if (!markdownPath) throw new Error("markdownPath is required");
  const directoryId = String(input.directoryId || defaultDirectoryIdForNoteType(noteType)).trim();
  const now = new Date().toISOString();

  const DatabaseSync = await loadDatabaseSync();
  const db = new DatabaseSync(catalogDbPath(vaultPath));
  try {
    const directory = db.prepare("SELECT id FROM directories WHERE id = ? LIMIT 1").get(directoryId);
    if (!directory) throw new Error(`directoryId not found: ${directoryId}`);

    db.exec("BEGIN IMMEDIATE;");
    try {
      db.prepare(
        `INSERT INTO notes (id, note_type, title, status, markdown_path, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           note_type = excluded.note_type,
           title = excluded.title,
           status = excluded.status,
           markdown_path = excluded.markdown_path,
           updated_at = excluded.updated_at,
           deleted_at = NULL`
      ).run(noteId, noteType, title, status, markdownPath, now, now);
      ensureSingleDirectoryMembership(db, noteId, directoryId);
      db.exec("COMMIT;");
    } catch (error) {
      db.exec("ROLLBACK;");
      throw error;
    }

    const row = db
      .prepare(
        `SELECT n.id, n.note_type, n.title, n.status, n.markdown_path, n.created_at, n.updated_at, ndm.directory_id
         FROM notes n
         LEFT JOIN note_directory_membership ndm ON ndm.note_id = n.id
         WHERE n.id = ?
         LIMIT 1`
      )
      .get(noteId);
    return mapNoteRow(row);
  } finally {
    db.close();
  }
}

export async function listNotesInDirectory(vaultPath, directoryId) {
  if (!vaultPath) throw new Error("vaultPath is required");
  const id = String(directoryId || "").trim();
  if (!id) throw new Error("directoryId is required");
  const DatabaseSync = await loadDatabaseSync();
  const db = new DatabaseSync(catalogDbPath(vaultPath));
  try {
    const rows = db
      .prepare(
        `SELECT n.id, n.note_type, n.title, n.status, n.markdown_path, n.created_at, n.updated_at, ndm.directory_id
         FROM note_directory_membership ndm
         JOIN notes n ON n.id = ndm.note_id
         WHERE ndm.directory_id = ? AND n.deleted_at IS NULL
         ORDER BY n.updated_at DESC`
      )
      .all(id);
    return rows.map(mapNoteRow);
  } finally {
    db.close();
  }
}

export async function getNoteById(vaultPath, noteId) {
  if (!vaultPath) throw new Error("vaultPath is required");
  const id = String(noteId || "").trim();
  if (!id) throw new Error("noteId is required");
  const DatabaseSync = await loadDatabaseSync();
  const db = new DatabaseSync(catalogDbPath(vaultPath));
  try {
    const row = db
      .prepare(
        `SELECT n.id, n.note_type, n.title, n.status, n.markdown_path, n.created_at, n.updated_at, ndm.directory_id
         FROM notes n
         LEFT JOIN note_directory_membership ndm ON ndm.note_id = n.id
         WHERE n.id = ? AND n.deleted_at IS NULL
         LIMIT 1`
      )
      .get(id);
    if (!row) throw new Error(`noteId not found: ${id}`);

    const markdownFullPath = path.join(path.resolve(vaultPath), row.markdown_path);
    const markdown = await fs.readFile(markdownFullPath, "utf8");
    const parsed = parseMarkdownWithFrontmatter(markdown);
    return {
      ...mapNoteRow(row),
      body: parsed.body,
      markdown
    };
  } finally {
    db.close();
  }
}

export async function updateNoteContent(vaultPath, noteId, input = {}) {
  if (!vaultPath) throw new Error("vaultPath is required");
  const id = String(noteId || "").trim();
  if (!id) throw new Error("noteId is required");
  const DatabaseSync = await loadDatabaseSync();
  const db = new DatabaseSync(catalogDbPath(vaultPath));
  try {
    const row = db
      .prepare(
        `SELECT n.id, n.note_type, n.title, n.status, n.markdown_path, n.created_at, n.updated_at, ndm.directory_id
         FROM notes n
         LEFT JOIN note_directory_membership ndm ON ndm.note_id = n.id
         WHERE n.id = ? AND n.deleted_at IS NULL
         LIMIT 1`
      )
      .get(id);
    if (!row) throw new Error(`noteId not found: ${id}`);

    const currentMarkdownPath = path.join(path.resolve(vaultPath), row.markdown_path);
    const currentMarkdown = await fs.readFile(currentMarkdownPath, "utf8");
    const currentParsed = parseMarkdownWithFrontmatter(currentMarkdown);
    const status = String(input.status || row.status || "draft");
    const normalized = normalizeMarkdown(
      input.title === undefined ? row.title : input.title,
      input.body === undefined ? currentParsed.body : input.body
    );
    const now = new Date().toISOString();
    const nextFrontmatter = {
      id: row.id,
      note_type: row.note_type,
      title: normalized.title,
      status,
      created_at: row.created_at,
      updated_at: now
    };
    const markdown = serializeMarkdownWithFrontmatter(nextFrontmatter, normalized.markdownBody);
    await fs.writeFile(currentMarkdownPath, markdown, "utf8");
    db.prepare("UPDATE notes SET title = ?, status = ?, updated_at = ? WHERE id = ?").run(normalized.title, status, now, row.id);
    ensureSingleDirectoryMembership(db, row.id, row.directory_id);

    const refreshed = db
      .prepare(
        `SELECT n.id, n.note_type, n.title, n.status, n.markdown_path, n.created_at, n.updated_at, ndm.directory_id
         FROM notes n
         LEFT JOIN note_directory_membership ndm ON ndm.note_id = n.id
         WHERE n.id = ?
         LIMIT 1`
      )
      .get(row.id);
    return {
      ...mapNoteRow(refreshed),
      body: normalized.markdownBody,
      markdown
    };
  } finally {
    db.close();
  }
}

export async function moveNoteToDirectory(vaultPath, noteId, directoryId) {
  if (!vaultPath) throw new Error("vaultPath is required");
  const id = String(noteId || "").trim();
  const targetDirectoryId = String(directoryId || "").trim();
  if (!id) throw new Error("noteId is required");
  if (!targetDirectoryId) throw new Error("directoryId is required");

  const DatabaseSync = await loadDatabaseSync();
  const db = new DatabaseSync(catalogDbPath(vaultPath));
  try {
    const row = db
      .prepare(
        `SELECT n.id, n.note_type, n.title, n.status, n.markdown_path, n.created_at, n.updated_at, ndm.directory_id
         FROM notes n
         LEFT JOIN note_directory_membership ndm ON ndm.note_id = n.id
         WHERE n.id = ? AND n.deleted_at IS NULL
         LIMIT 1`
      )
      .get(id);
    if (!row) throw new Error(`noteId not found: ${id}`);

    const targetDir = db
      .prepare("SELECT id, fs_path FROM directories WHERE id = ? LIMIT 1")
      .get(targetDirectoryId);
    if (!targetDir) throw new Error(`directoryId not found: ${targetDirectoryId}`);

    if (row.directory_id === targetDirectoryId) {
      return mapNoteRow({ ...row, directory_id: targetDirectoryId });
    }

    const oldAbsPath = path.join(path.resolve(vaultPath), row.markdown_path);
    const baseName = path.basename(oldAbsPath);
    const newAbsPath = path.join(targetDir.fs_path, baseName);
    await fs.mkdir(path.dirname(newAbsPath), { recursive: true });
    await fs.rename(oldAbsPath, newAbsPath);
    const relPath = path.relative(path.resolve(vaultPath), newAbsPath).replaceAll("\\", "/");
    const now = new Date().toISOString();

    db.exec("BEGIN IMMEDIATE;");
    try {
      db.prepare("UPDATE notes SET markdown_path = ?, updated_at = ? WHERE id = ?").run(relPath, now, id);
      ensureSingleDirectoryMembership(db, id, targetDirectoryId);
      db.exec("COMMIT;");
    } catch (error) {
      db.exec("ROLLBACK;");
      throw error;
    }

    const refreshed = db
      .prepare(
        `SELECT n.id, n.note_type, n.title, n.status, n.markdown_path, n.created_at, n.updated_at, ndm.directory_id
         FROM notes n
         LEFT JOIN note_directory_membership ndm ON ndm.note_id = n.id
         WHERE n.id = ? AND n.deleted_at IS NULL
         LIMIT 1`
      )
      .get(id);
    return mapNoteRow(refreshed);
  } finally {
    db.close();
  }
}

export async function deleteNoteById(vaultPath, noteId) {
  if (!vaultPath) throw new Error("vaultPath is required");
  const id = String(noteId || "").trim();
  if (!id) throw new Error("noteId is required");

  const DatabaseSync = await loadDatabaseSync();
  const db = new DatabaseSync(catalogDbPath(vaultPath));
  try {
    const row = db
      .prepare("SELECT id, markdown_path, deleted_at FROM notes WHERE id = ? LIMIT 1")
      .get(id);
    if (!row) throw new Error(`noteId not found: ${id}`);
    if (row.deleted_at) return { id, deleted: true };

    const absPath = path.join(path.resolve(vaultPath), row.markdown_path);
    try {
      await fs.unlink(absPath);
    } catch {}
    const now = new Date().toISOString();
    db.prepare("UPDATE notes SET deleted_at = ?, updated_at = ? WHERE id = ?").run(now, now, id);
    db.prepare("DELETE FROM note_directory_membership WHERE note_id = ?").run(id);
    return { id, deleted: true };
  } finally {
    db.close();
  }
}
