import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { initVault, createDirectory, createNoteInDirectory } from "../../packages/domain/src/index.mjs";
import { createIndexCard, listIndexCards } from "../../packages/domain/src/index-card-store.mjs";
import { SQLITE_DB_FILES } from "../../packages/domain/src/sqlite-migrations.mjs";

test("theme pages preserve directory filters and stable ordering beyond fifty tied rows", async t => {
  const vault = await fs.mkdtemp(path.join(os.tmpdir(), "yansilu-theme-pagination-"));
  t.after(async () => {
    assert.equal(path.dirname(vault), path.resolve(os.tmpdir()));
    assert.equal(path.basename(vault).startsWith("yansilu-theme-pagination-"), true);
    await fs.rm(vault, { recursive: true, force: true });
  });
  await initVault(vault);
  const child = await createDirectory(vault, { title: "Writing topics", parentDirectoryId: "dir_original_default", fsPath: path.join(vault, "notes", "topic-scope") });
  const source = await createNoteInDirectory(vault, { directoryId: "dir_original_default", body: "# Source\n\nOwn claim." });
  const expected = Array.from({ length: 52 }, (_, i) => `idx_page_${String(i).padStart(3, "0")}`);
  for (const id of [...expected].reverse()) await createIndexCard(vault, { id, directoryId: child.id, indexType: "topic", title: "Same topic title", noteIds: [source.id] });
  await createIndexCard(vault, { id: "idx_other_folder", directoryId: "dir_original_default", title: "Other scope", noteIds: [source.id] });
  await createIndexCard(vault, { id: "idx_other_type", directoryId: child.id, indexType: "sequence", title: "Other type", noteIds: [source.id] });
  const db = new DatabaseSync(path.join(vault, ".yansilu", SQLITE_DB_FILES.catalog));
  try { db.prepare("UPDATE index_cards SET updated_at = ?").run("2026-01-01T00:00:00.000Z"); }
  finally { db.close(); }
  const query = { directoryId: child.id, indexType: "topic", limit: 50 };
  const pages = await Promise.all([listIndexCards(vault, query), listIndexCards(vault, { ...query, offset: 50 })]);
  assert.deepEqual(pages.flat().map(item => item.id), expected);
  assert.equal(new Set(pages.flat().map(item => item.id)).size, 52);
  assert.deepEqual(await listIndexCards(vault, { ...query, offset: 100 }), []);
  assert.deepEqual((await listIndexCards(vault, { ...query, offset: -1 })).map(item => item.id), expected.slice(0, 50));
  assert.equal((await listIndexCards(vault, { directoryId: child.id, indexType: "topic" })).length, 12);
  assert.equal((await listIndexCards(vault, { ...query, limit: 1000 })).length, 50);
  assert.deepEqual((await listIndexCards(vault, { directoryId: "dir_original_default", includeDescendants: false, indexType: "topic", limit: 50 })).map(item => item.id), ["idx_other_folder"]);
});
