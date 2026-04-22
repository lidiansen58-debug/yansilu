import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { SQLITE_DB_FILES } from "./sqlite-migrations.mjs";

const DEFAULT_DIRECTORY_SPECS = [
  { id: "dir_fleeting_default", type: "fleeting_default", title: "随笔目录", relPath: path.join("notes", "fleeting") },
  { id: "dir_literature_default", type: "literature_default", title: "书摘目录", relPath: path.join("notes", "literature") },
  { id: "dir_original_default", type: "original_default", title: "原创目录", relPath: path.join("notes", "original") }
];

async function loadDatabaseSync() {
  try {
    const mod = await import("node:sqlite");
    return mod.DatabaseSync;
  } catch {
    throw new Error("Catalog store requires node:sqlite (Node.js 22+).");
  }
}

function mapDirectoryRow(row) {
  return {
    id: row.id,
    parentDirectoryId: row.parent_directory_id || null,
    directoryType: row.directory_type,
    title: row.title,
    fsPath: row.fs_path,
    isDefault: row.is_default === 1,
    isHidden: row.is_hidden === 1,
    maxNotes: Number(row.max_notes || 500),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function catalogDbPath(vaultPath) {
  return path.join(path.resolve(vaultPath), ".yansilu", SQLITE_DB_FILES.catalog);
}

function validateFsPath(fsPath) {
  const normalized = String(fsPath || "").trim();
  if (!normalized) throw new Error("fsPath is required");
  return path.resolve(normalized);
}

function validateDirectoryType(input) {
  const value = String(input || "custom").trim();
  const allowed = new Set(["fleeting_default", "literature_default", "original_default", "custom"]);
  if (!allowed.has(value)) throw new Error(`directoryType invalid: ${value}`);
  return value;
}

export async function ensureDefaultDirectories(vaultPath) {
  if (!vaultPath) throw new Error("vaultPath is required");
  const root = path.resolve(vaultPath);
  const DatabaseSync = await loadDatabaseSync();
  const db = new DatabaseSync(catalogDbPath(root));
  const now = new Date().toISOString();
  try {
    for (const spec of DEFAULT_DIRECTORY_SPECS) {
      const fsPath = path.join(root, spec.relPath);
      await fs.mkdir(fsPath, { recursive: true });
      db.prepare(
        `INSERT INTO directories
          (id, parent_directory_id, directory_type, title, fs_path, is_default, is_hidden, max_notes, created_at, updated_at)
         VALUES (?, NULL, ?, ?, ?, 1, 0, 500, ?, ?)
         ON CONFLICT(id) DO NOTHING`
      ).run(spec.id, spec.type, spec.title, fsPath, now, now);
    }
  } finally {
    db.close();
  }
}

export async function listDirectories(vaultPath, options = {}) {
  if (!vaultPath) throw new Error("vaultPath is required");
  const includeHidden = options.includeHidden === true;
  const DatabaseSync = await loadDatabaseSync();
  const db = new DatabaseSync(catalogDbPath(vaultPath));
  try {
    const rows = db
      .prepare(
        `SELECT id, parent_directory_id, directory_type, title, fs_path, is_default, is_hidden, max_notes, created_at, updated_at
         FROM directories
         ${includeHidden ? "" : "WHERE is_hidden = 0"}
         ORDER BY is_default DESC, title ASC`
      )
      .all();
    return rows.map(mapDirectoryRow);
  } finally {
    db.close();
  }
}

export async function createDirectory(vaultPath, input = {}) {
  if (!vaultPath) throw new Error("vaultPath is required");
  const id = String(input.id || `dir_${randomUUID().slice(0, 8)}`).trim();
  const title = String(input.title || "").trim();
  if (!title) throw new Error("title is required");
  const parentDirectoryId = input.parentDirectoryId ? String(input.parentDirectoryId).trim() : null;
  const directoryType = validateDirectoryType(input.directoryType || "custom");
  const fsPath = validateFsPath(input.fsPath);
  const maxNotesRaw = Number(input.maxNotes);
  const maxNotes = Number.isFinite(maxNotesRaw) && maxNotesRaw > 0 ? Math.floor(maxNotesRaw) : 500;
  const isDefault = input.isDefault === true;
  const isHidden = input.isHidden === true;
  const now = new Date().toISOString();

  const DatabaseSync = await loadDatabaseSync();
  const db = new DatabaseSync(catalogDbPath(vaultPath));
  try {
    if (parentDirectoryId) {
      const parent = db
        .prepare("SELECT id FROM directories WHERE id = ? LIMIT 1")
        .get(parentDirectoryId);
      if (!parent) throw new Error(`parentDirectoryId not found: ${parentDirectoryId}`);
    }

    await fs.mkdir(fsPath, { recursive: true });
    db.prepare(
      `INSERT INTO directories
        (id, parent_directory_id, directory_type, title, fs_path, is_default, is_hidden, max_notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(id, parentDirectoryId, directoryType, title, fsPath, isDefault ? 1 : 0, isHidden ? 1 : 0, maxNotes, now, now);

    const row = db
      .prepare(
        `SELECT id, parent_directory_id, directory_type, title, fs_path, is_default, is_hidden, max_notes, created_at, updated_at
         FROM directories
         WHERE id = ?
         LIMIT 1`
      )
      .get(id);
    return mapDirectoryRow(row);
  } finally {
    db.close();
  }
}

export async function updateDirectory(vaultPath, directoryId, input = {}) {
  if (!vaultPath) throw new Error("vaultPath is required");
  const id = String(directoryId || "").trim();
  if (!id) throw new Error("directoryId is required");

  const DatabaseSync = await loadDatabaseSync();
  const db = new DatabaseSync(catalogDbPath(vaultPath));
  const now = new Date().toISOString();
  try {
    const current = db
      .prepare(
        `SELECT id, parent_directory_id, directory_type, title, fs_path, is_default, is_hidden, max_notes, created_at, updated_at
         FROM directories
         WHERE id = ?
         LIMIT 1`
      )
      .get(id);
    if (!current) throw new Error(`directoryId not found: ${id}`);

    const parentDirectoryId =
      input.parentDirectoryId === undefined ? current.parent_directory_id : input.parentDirectoryId ? String(input.parentDirectoryId) : null;
    if (parentDirectoryId) {
      if (parentDirectoryId === id) throw new Error("directory cannot be parent of itself");
      const parentExists = db.prepare("SELECT id FROM directories WHERE id = ? LIMIT 1").get(parentDirectoryId);
      if (!parentExists) throw new Error(`parentDirectoryId not found: ${parentDirectoryId}`);
    }

    const title = input.title === undefined ? current.title : String(input.title || "").trim();
    if (!title) throw new Error("title is required");
    const fsPath = input.fsPath === undefined ? current.fs_path : validateFsPath(input.fsPath);
    const isHidden = input.isHidden === undefined ? current.is_hidden === 1 : input.isHidden === true;
    const maxNotes =
      input.maxNotes === undefined
        ? Number(current.max_notes || 500)
        : Number.isFinite(Number(input.maxNotes)) && Number(input.maxNotes) > 0
          ? Math.floor(Number(input.maxNotes))
          : 500;

    await fs.mkdir(fsPath, { recursive: true });
    db.prepare(
      `UPDATE directories
         SET parent_directory_id = ?, title = ?, fs_path = ?, is_hidden = ?, max_notes = ?, updated_at = ?
       WHERE id = ?`
    ).run(parentDirectoryId, title, fsPath, isHidden ? 1 : 0, maxNotes, now, id);

    const updated = db
      .prepare(
        `SELECT id, parent_directory_id, directory_type, title, fs_path, is_default, is_hidden, max_notes, created_at, updated_at
         FROM directories
         WHERE id = ?
         LIMIT 1`
      )
      .get(id);
    return mapDirectoryRow(updated);
  } finally {
    db.close();
  }
}

export async function deleteDirectory(vaultPath, directoryId) {
  if (!vaultPath) throw new Error("vaultPath is required");
  const id = String(directoryId || "").trim();
  if (!id) throw new Error("directoryId is required");

  const DatabaseSync = await loadDatabaseSync();
  const db = new DatabaseSync(catalogDbPath(vaultPath));
  try {
    const current = db
      .prepare(
        `SELECT id, is_default
         FROM directories
         WHERE id = ?
         LIMIT 1`
      )
      .get(id);
    if (!current) throw new Error(`directoryId not found: ${id}`);
    if (current.is_default === 1) throw new Error("default directory cannot be deleted");

    const child = db.prepare("SELECT id FROM directories WHERE parent_directory_id = ? LIMIT 1").get(id);
    if (child) throw new Error("directory has child directories");

    const hasNotes = db.prepare("SELECT id FROM note_directory_membership WHERE directory_id = ? LIMIT 1").get(id);
    if (hasNotes) throw new Error("directory has notes");

    db.prepare("DELETE FROM directories WHERE id = ?").run(id);
    return { id, deleted: true };
  } finally {
    db.close();
  }
}
