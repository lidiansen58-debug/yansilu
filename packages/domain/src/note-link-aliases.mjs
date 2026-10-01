import path from "node:path";

export function linkReferenceKey(value) {
  return String(value || "").trim().replaceAll("\\", "/").replace(/^\.?\//, "").toLowerCase();
}

export function normalizeLinkAliases(values) {
  const aliases = new Map();
  for (const value of Array.isArray(values) ? values : []) {
    if (typeof value !== "string") continue;
    const reference = value.trim().replaceAll("\\", "/").replace(/^\.?\//, "");
    const key = linkReferenceKey(reference);
    if (key && !aliases.has(key)) aliases.set(key, reference);
  }
  return [...aliases.values()];
}

export function linkAliasMatchesReference(alias, reference) {
  const key = linkReferenceKey(reference);
  const aliasKey = linkReferenceKey(alias);
  const pathReference = key.includes("/") || /\.md$/i.test(key);
  return Boolean(key) && (aliasKey === key || (pathReference && aliasKey.endsWith(`/${key}`)));
}

export function renamedLinkAliases(frontmatter, previous) {
  const oldPath = String(previous.markdown_path || "").replaceAll("\\", "/");
  const filename = path.posix.basename(oldPath);
  return normalizeLinkAliases([
    ...(Array.isArray(frontmatter.yansilu_link_aliases) ? frontmatter.yansilu_link_aliases : []),
    previous.title, oldPath, filename, filename.replace(/\.md$/i, "")
  ]);
}

export function readLinkAliases(db, noteId) {
  return db.prepare("SELECT reference FROM note_link_aliases WHERE note_id = ? ORDER BY rowid").all(noteId).map(row => row.reference);
}

export function syncLinkAliases(db, noteId, frontmatter) {
  const aliases = normalizeLinkAliases(frontmatter?.yansilu_link_aliases);
  db.prepare("DELETE FROM note_link_aliases WHERE note_id = ?").run(noteId);
  const insert = db.prepare("INSERT INTO note_link_aliases (note_id, reference, reference_key) VALUES (?, ?, ?)");
  for (const reference of aliases) insert.run(noteId, reference, linkReferenceKey(reference));
  return aliases;
}

export function findLinkAliasRows(db, reference, excludeNoteId, noteType = "") {
  const key = linkReferenceKey(reference);
  const pathReference = key.includes("/") || /\.md$/i.test(key);
  const suffix = `%/${key.replace(/[\\%_]/g, char => `\\${char}`)}`;
  return db.prepare(`SELECT n.id, n.note_type, n.title, n.markdown_path
    FROM note_link_aliases a JOIN notes n ON n.id = a.note_id
    WHERE (a.reference_key = ? OR (? = 1 AND a.reference_key LIKE ? ESCAPE '\\'))
      AND n.id != ? AND n.deleted_at IS NULL
      AND (? = '' OR n.note_type = ?)`)
    .all(key, Number(pathReference), suffix, excludeNoteId, noteType, noteType);
}
