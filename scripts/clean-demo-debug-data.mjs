import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { SQLITE_DB_FILES } from "../packages/domain/src/index.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const DEFAULT_VAULT = path.join(REPO_ROOT, "vault-example", "yansilu-vault");

const DEBUG_PATTERNS = [
  /debug/i,
  /验收图谱调试/,
  /真实验证(?:-|$)/,
  /real-use-\d+/i,
  /regression-\d+/i,
  /Picker Position/i,
  /Tag Peer/i,
  /Token Source/i,
  /AI Review Source/i,
  /AI Review Target/i,
  /Scope Debug/i,
  /Graph Debug/i
];

function matchesDebugText(value = "") {
  const text = String(value || "").trim();
  return DEBUG_PATTERNS.some((pattern) => pattern.test(text));
}

async function loadDatabaseSync() {
  const mod = await import("node:sqlite");
  return mod.DatabaseSync;
}

async function removeFileIfInsideVault(vaultPath, markdownPath = "") {
  const cleanPath = String(markdownPath || "").replaceAll("\\", "/").trim();
  if (!cleanPath) return false;
  const absPath = path.resolve(vaultPath, cleanPath);
  const rel = path.relative(path.resolve(vaultPath), absPath);
  if (rel.startsWith("..") || path.isAbsolute(rel)) return false;
  try {
    await fs.unlink(absPath);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const vaultPath = path.resolve(process.argv[2] || DEFAULT_VAULT);
  const dbPath = path.join(vaultPath, ".yansilu", SQLITE_DB_FILES.catalog);
  const DatabaseSync = await loadDatabaseSync();
  const db = new DatabaseSync(dbPath);
  const removed = { notes: 0, directories: 0, files: 0 };
  try {
    const debugDirectories = db
      .prepare("SELECT id, title FROM directories")
      .all()
      .filter((row) => matchesDebugText(row.title))
      .map((row) => row.id);
    const debugDirectorySet = new Set(debugDirectories);
    const notes = db
      .prepare(
        `SELECT n.id, n.title, n.markdown_path, ndm.directory_id
         FROM notes n
         LEFT JOIN note_directory_membership ndm ON ndm.note_id = n.id
         WHERE n.deleted_at IS NULL`
      )
      .all()
      .filter((row) => matchesDebugText(row.title) || debugDirectorySet.has(row.directory_id));

    db.exec("BEGIN IMMEDIATE;");
    try {
      for (const note of notes) {
        db.prepare("DELETE FROM links WHERE from_note_id = ? OR to_note_id = ?").run(note.id, note.id);
        db.prepare("DELETE FROM note_tags WHERE note_id = ?").run(note.id);
        db.prepare("DELETE FROM permanent_note_meta WHERE note_id = ?").run(note.id);
        db.prepare("DELETE FROM literature_note_meta WHERE note_id = ?").run(note.id);
        db.prepare("DELETE FROM fleeting_note_meta WHERE note_id = ?").run(note.id);
        db.prepare("DELETE FROM note_directory_membership WHERE note_id = ?").run(note.id);
        db.prepare("DELETE FROM notes WHERE id = ?").run(note.id);
        removed.notes += 1;
      }
      for (const directoryId of debugDirectories) {
        db.prepare("DELETE FROM directories WHERE id = ?").run(directoryId);
        removed.directories += 1;
      }
      db.exec("COMMIT;");
    } catch (error) {
      db.exec("ROLLBACK;");
      throw error;
    }

    for (const note of notes) {
      if (await removeFileIfInsideVault(vaultPath, note.markdown_path)) removed.files += 1;
    }
  } finally {
    db.close();
  }
  console.log(JSON.stringify({ vaultPath, removed }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
