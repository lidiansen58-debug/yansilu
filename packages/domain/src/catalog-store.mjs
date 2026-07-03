import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { SQLITE_DB_FILES } from "./sqlite-migrations.mjs";
import { rewriteAssetLinksInMarkdownFile } from "./note-file-rewrite.mjs";

const DEFAULT_DIRECTORY_SPECS = [
  { id: "dir_source_default", type: "source_default", title: "Source Vault", relPath: path.join("notes", "sources"), isHidden: true },
  { id: "dir_fleeting_default", type: "fleeting_default", title: "随笔目录", relPath: path.join("notes", "fleeting") },
  { id: "dir_literature_default", type: "literature_default", title: "书摘目录", relPath: path.join("notes", "literature") },
  { id: "dir_original_default", type: "original_default", title: "永久笔记", relPath: path.join("notes", "original") }
];

const DEFAULT_DIRECTORY_SPEC_BY_ID = new Map(DEFAULT_DIRECTORY_SPECS.map((spec) => [spec.id, spec]));
const DEFAULT_DIRECTORY_SPEC_BY_TYPE = new Map(DEFAULT_DIRECTORY_SPECS.map((spec) => [spec.type, spec]));

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

function validateFsPath(vaultPath, fsPath) {
  const root = path.resolve(vaultPath);
  const normalized = String(fsPath || "").trim();
  if (!normalized) throw new Error("fsPath is required");
  const resolved = path.resolve(normalized);
  const rel = path.relative(root, resolved);
  if (rel.startsWith("..") || path.isAbsolute(rel)) {
    throw new Error("fsPath must stay inside vault");
  }
  return resolved;
}

function validateDirectoryType(input) {
  const value = String(input || "custom").trim();
  const allowed = new Set(["fleeting_default", "literature_default", "original_default", "source_default", "custom"]);
  if (!allowed.has(value)) throw new Error(`directoryType invalid: ${value}`);
  return value;
}

function normalizeRelativePath(relativePath) {
  return String(relativePath || "").replaceAll("\\", "/");
}

function normalizePortablePathForMatch(input = "") {
  return String(input || "")
    .trim()
    .replaceAll("\\", "/")
    .replace(/\/+/g, "/")
    .replace(/\/$/g, "");
}

function splitPortableRelativePath(input = "") {
  return normalizePortablePathForMatch(input)
    .split("/")
    .filter(Boolean);
}

function defaultDirectorySpecForRow(row = {}) {
  return DEFAULT_DIRECTORY_SPEC_BY_ID.get(String(row?.id || "")) ||
    DEFAULT_DIRECTORY_SPEC_BY_TYPE.get(String(row?.directory_type || ""));
}

function inferOldVaultRootsFromDefaultDirectories(rows = []) {
  const roots = [];
  const seen = new Set();
  for (const row of rows) {
    const spec = defaultDirectorySpecForRow(row);
    if (!spec) continue;
    const currentPath = normalizePortablePathForMatch(row.fs_path);
    const relPath = normalizePortablePathForMatch(spec.relPath);
    if (!currentPath || !relPath) continue;
    const suffix = `/${relPath}`;
    const root = currentPath.endsWith(suffix) ? currentPath.slice(0, -suffix.length) : "";
    if (!root || seen.has(root)) continue;
    seen.add(root);
    roots.push(root);
  }
  return roots.sort((a, b) => b.length - a.length);
}

function relativePathFromOldVaultRoots(fsPath = "", oldVaultRoots = []) {
  const portablePath = normalizePortablePathForMatch(fsPath);
  if (!portablePath) return "";
  for (const oldRoot of oldVaultRoots) {
    if (portablePath === oldRoot) return "";
    const prefix = `${oldRoot}/`;
    if (portablePath.startsWith(prefix)) return portablePath.slice(prefix.length);
  }
  return "";
}

function directoryPathInsideCurrentVault(vaultPath, fsPath = "") {
  const root = path.resolve(vaultPath);
  const candidate = path.resolve(String(fsPath || ""));
  const rel = path.relative(root, candidate);
  return rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel));
}

function healedDirectoryPathForRow(vaultPath, row = {}, oldVaultRoots = []) {
  if (directoryPathInsideCurrentVault(vaultPath, row.fs_path)) return "";
  const spec = defaultDirectorySpecForRow(row);
  if (spec) return path.join(path.resolve(vaultPath), spec.relPath);

  const oldRelativePath = relativePathFromOldVaultRoots(row.fs_path, oldVaultRoots);
  if (!oldRelativePath) return "";
  return path.join(path.resolve(vaultPath), ...splitPortableRelativePath(oldRelativePath));
}

function isSameOrChildPath(parentPath, candidatePath) {
  const rel = path.relative(path.resolve(parentPath), path.resolve(candidatePath));
  return rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel));
}

async function pathExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function moveDirectoryOnDisk(oldFsPath, newFsPath) {
  const from = path.resolve(oldFsPath);
  const to = path.resolve(newFsPath);
  if (from === to) {
    await fs.mkdir(to, { recursive: true });
    return;
  }
  if (isSameOrChildPath(from, to)) {
    throw new Error("directory cannot move into itself");
  }

  const sourceExists = await pathExists(from);
  if (!sourceExists) {
    await fs.mkdir(to, { recursive: true });
    return;
  }

  await fs.mkdir(path.dirname(to), { recursive: true });
  try {
    await fs.rename(from, to);
    return;
  } catch (error) {
    if (error?.code !== "EXDEV") throw error;
  }

  await fs.cp(from, to, { recursive: true, errorOnExist: true, force: false });
  await fs.rm(from, { recursive: true, force: true });
}

function directoryScopeRows(db, directoryId) {
  return db
    .prepare(
      `WITH RECURSIVE directory_scope(id, parent_directory_id, fs_path, is_hidden) AS (
         SELECT id, parent_directory_id, fs_path, is_hidden
         FROM directories
         WHERE id = ?
         UNION ALL
         SELECT d.id, d.parent_directory_id, d.fs_path, d.is_hidden
         FROM directories d
         JOIN directory_scope scope ON d.parent_directory_id = scope.id
       )
       SELECT id, parent_directory_id, fs_path, is_hidden
       FROM directory_scope`
    )
    .all(directoryId);
}

function hasHiddenAncestor(db, directoryId) {
  if (!directoryId) return false;
  const rows = db
    .prepare(
      `WITH RECURSIVE directory_ancestry(id, parent_directory_id, is_hidden) AS (
         SELECT id, parent_directory_id, is_hidden
         FROM directories
         WHERE id = ?
         UNION ALL
         SELECT d.id, d.parent_directory_id, d.is_hidden
         FROM directories d
         JOIN directory_ancestry ancestry ON ancestry.parent_directory_id = d.id
       )
       SELECT is_hidden
       FROM directory_ancestry`
    )
    .all(directoryId);
  return rows.some((row) => Number(row?.is_hidden || 0) === 1);
}

function assertVisibleDirectoryAllowed(db, parentDirectoryId, isHidden) {
  if (isHidden || !parentDirectoryId) return;
  if (hasHiddenAncestor(db, parentDirectoryId)) {
    throw new Error("visible directories cannot be created under a hidden parent");
  }
}

function assertHideDoesNotOrphanVisibleDescendants(scopedDirectories, isHidden) {
  if (!isHidden) return;
  const descendants = Array.isArray(scopedDirectories) ? scopedDirectories.slice(1) : [];
  const hasVisibleDescendant = descendants.some((row) => Number(row?.is_hidden || 0) !== 1);
  if (hasVisibleDescendant) {
    throw new Error("hidden directories cannot keep visible descendant directories");
  }
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
         VALUES (?, NULL, ?, ?, ?, ?, ?, 500, ?, ?)
         ON CONFLICT(id) DO NOTHING`
      ).run(spec.id, spec.type, spec.title, fsPath, spec.isDefault === false ? 0 : 1, spec.isHidden === true ? 1 : 0, now, now);
    }
  } finally {
    db.close();
  }
}

export async function healDirectoryFsPathsForVault(vaultPath) {
  if (!vaultPath) throw new Error("vaultPath is required");
  const root = path.resolve(vaultPath);
  const DatabaseSync = await loadDatabaseSync();
  const db = new DatabaseSync(catalogDbPath(root));
  const now = new Date().toISOString();
  try {
    const rows = db
      .prepare("SELECT id, directory_type, fs_path FROM directories ORDER BY is_default DESC, id ASC")
      .all();
    const oldVaultRoots = inferOldVaultRootsFromDefaultDirectories(rows);
    const updates = [];
    for (const row of rows) {
      const nextPath = healedDirectoryPathForRow(root, row, oldVaultRoots);
      if (!nextPath || path.resolve(nextPath) === path.resolve(row.fs_path)) continue;
      updates.push({ id: row.id, fsPath: nextPath });
    }

    if (!updates.length) return { updated: 0, items: [] };

    for (const item of updates) {
      await fs.mkdir(item.fsPath, { recursive: true });
    }

    db.exec("BEGIN IMMEDIATE;");
    try {
      const update = db.prepare("UPDATE directories SET fs_path = ?, updated_at = ? WHERE id = ?");
      for (const item of updates) update.run(item.fsPath, now, item.id);
      db.exec("COMMIT;");
    } catch (error) {
      db.exec("ROLLBACK;");
      throw error;
    }
    return { updated: updates.length, items: updates };
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
  const fsPath = validateFsPath(vaultPath, input.fsPath);
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
    assertVisibleDirectoryAllowed(db, parentDirectoryId, isHidden);

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
    const scopedDirectories = directoryScopeRows(db, id);
    const scopedDirectoryIds = new Set(scopedDirectories.map((row) => row.id));
    if (parentDirectoryId) {
      if (parentDirectoryId === id) throw new Error("directory cannot be parent of itself");
      if (scopedDirectoryIds.has(parentDirectoryId)) throw new Error("directory cannot be moved into its child directory");
      const parentExists = db.prepare("SELECT id FROM directories WHERE id = ? LIMIT 1").get(parentDirectoryId);
      if (!parentExists) throw new Error(`parentDirectoryId not found: ${parentDirectoryId}`);
    }

    const title = input.title === undefined ? current.title : String(input.title || "").trim();
    if (!title) throw new Error("title is required");
    const fsPath = input.fsPath === undefined ? current.fs_path : validateFsPath(vaultPath, input.fsPath);
    const isHidden = input.isHidden === undefined ? current.is_hidden === 1 : input.isHidden === true;
    const maxNotes =
      input.maxNotes === undefined
        ? Number(current.max_notes || 500)
        : Number.isFinite(Number(input.maxNotes)) && Number(input.maxNotes) > 0
          ? Math.floor(Number(input.maxNotes))
          : 500;
    assertVisibleDirectoryAllowed(db, parentDirectoryId, isHidden);
    assertHideDoesNotOrphanVisibleDescendants(scopedDirectories, isHidden);

    const pathChanged = path.resolve(fsPath) !== path.resolve(current.fs_path);
    if (pathChanged) {
      await moveDirectoryOnDisk(current.fs_path, fsPath);
    } else {
      await fs.mkdir(fsPath, { recursive: true });
    }

    const scopedNotes = pathChanged
      ? db
          .prepare(
            `WITH RECURSIVE directory_scope(id) AS (
               SELECT id FROM directories WHERE id = ?
               UNION ALL
               SELECT d.id
               FROM directories d
               JOIN directory_scope scope ON d.parent_directory_id = scope.id
             )
             SELECT n.id, n.markdown_path
             FROM notes n
             JOIN note_directory_membership ndm ON ndm.note_id = n.id
             JOIN directory_scope scope ON scope.id = ndm.directory_id
             WHERE n.deleted_at IS NULL`
          )
          .all(id)
      : [];

    db.exec("BEGIN IMMEDIATE;");
    try {
      if (pathChanged) {
        for (const row of scopedDirectories) {
          const nextDirectoryPath =
            row.id === id
              ? fsPath
              : isSameOrChildPath(current.fs_path, row.fs_path)
                ? path.join(fsPath, path.relative(current.fs_path, row.fs_path))
                : row.fs_path;
          if (row.id === id) {
            db.prepare(
              `UPDATE directories
                 SET parent_directory_id = ?, title = ?, fs_path = ?, is_hidden = ?, max_notes = ?, updated_at = ?
               WHERE id = ?`
            ).run(parentDirectoryId, title, nextDirectoryPath, isHidden ? 1 : 0, maxNotes, now, id);
          } else {
            db.prepare("UPDATE directories SET fs_path = ?, updated_at = ? WHERE id = ?").run(nextDirectoryPath, now, row.id);
          }
        }

        for (const row of scopedNotes) {
          const oldAbsNotePath = path.join(path.resolve(vaultPath), row.markdown_path);
          const nextAbsNotePath = isSameOrChildPath(current.fs_path, oldAbsNotePath)
            ? path.join(fsPath, path.relative(current.fs_path, oldAbsNotePath))
            : oldAbsNotePath;
          const nextMarkdownPath = normalizeRelativePath(path.relative(path.resolve(vaultPath), nextAbsNotePath));
          await rewriteAssetLinksInMarkdownFile(nextAbsNotePath, row.markdown_path, nextMarkdownPath, now);
          db.prepare("UPDATE notes SET markdown_path = ?, updated_at = ? WHERE id = ?").run(nextMarkdownPath, now, row.id);
        }
      } else {
        db.prepare(
          `UPDATE directories
             SET parent_directory_id = ?, title = ?, fs_path = ?, is_hidden = ?, max_notes = ?, updated_at = ?
           WHERE id = ?`
        ).run(parentDirectoryId, title, fsPath, isHidden ? 1 : 0, maxNotes, now, id);
      }
      db.exec("COMMIT;");
    } catch (error) {
      db.exec("ROLLBACK;");
      throw error;
    }

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
                , fs_path
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

    try {
      await fs.rmdir(current.fs_path);
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
    db.prepare("DELETE FROM directories WHERE id = ?").run(id);
    return { id, deleted: true };
  } finally {
    db.close();
  }
}
