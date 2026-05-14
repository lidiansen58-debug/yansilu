import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { getDirectoryGraph } from "../../packages/domain/src/note-catalog-store.mjs";
import { SQLITE_DB_FILES } from "../../packages/domain/src/sqlite-migrations.mjs";
import { getDraftScaffold, getWritingProject } from "../../packages/writing-engine/src/writing-engine.mjs";
import { seedYijingRichAcceptance } from "../../scripts/seed-yijing-rich-acceptance.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturePath = path.resolve(__dirname, "..", "fixtures", "acceptance", "yijing-rich-acceptance.json");
const fixture = JSON.parse(await fs.readFile(fixturePath, "utf8"));

async function loadDatabaseSync() {
  const mod = await import("node:sqlite");
  return mod.DatabaseSync;
}

async function withCatalogDb(vaultPath, callback) {
  const DatabaseSync = await loadDatabaseSync();
  const db = new DatabaseSync(path.join(vaultPath, ".yansilu", SQLITE_DB_FILES.catalog));
  try {
    return callback(db);
  } finally {
    db.close();
  }
}

test("Yijing rich acceptance seed materializes the fixture into a vault idempotently", async (t) => {
  const vaultPath = await fs.mkdtemp(path.join(os.tmpdir(), "yansilu-yijing-rich-seed-test-"));
  t.after(() => fs.rm(vaultPath, { recursive: true, force: true }));

  const first = await seedYijingRichAcceptance(vaultPath);
  assert.equal(first.kind, "yijing_rich_acceptance_seed");
  assert.deepEqual(first.counts, fixture.counts);
  assert.deepEqual(first.summary, {
    createdNotes: 55,
    updatedNotes: 0,
    createdRelations: 80,
    updatedRelations: 0,
    createdIndexCards: 5,
    updatedIndexCards: 0,
    createdWritingProjects: 2,
    updatedWritingProjects: 0,
    createdDraftScaffolds: 2,
    updatedDraftScaffolds: 0
  });

  const second = await seedYijingRichAcceptance(vaultPath);
  assert.deepEqual(second.summary, {
    createdNotes: 0,
    updatedNotes: 55,
    createdRelations: 0,
    updatedRelations: 80,
    createdIndexCards: 0,
    updatedIndexCards: 5,
    createdWritingProjects: 0,
    updatedWritingProjects: 2,
    createdDraftScaffolds: 0,
    updatedDraftScaffolds: 2
  });

  await withCatalogDb(vaultPath, (db) => {
    assert.equal(db.prepare("SELECT COUNT(*) AS value FROM notes").get().value, 55);
    assert.equal(db.prepare("SELECT COUNT(*) AS value FROM notes WHERE note_type = 'fleeting'").get().value, 2);
    assert.equal(db.prepare("SELECT COUNT(*) AS value FROM notes WHERE note_type = 'literature'").get().value, 3);
    assert.equal(db.prepare("SELECT COUNT(*) AS value FROM notes WHERE note_type = 'permanent'").get().value, 50);
    assert.equal(db.prepare("SELECT COUNT(*) AS value FROM links").get().value, 80);
    assert.equal(db.prepare("SELECT COUNT(*) AS value FROM index_cards WHERE id LIKE 'idx_yj_%'").get().value, 5);
    assert.equal(db.prepare("SELECT COUNT(*) AS value FROM writing_projects WHERE id LIKE 'wp_yj_%'").get().value, 2);
    assert.equal(db.prepare("SELECT COUNT(*) AS value FROM draft_scaffolds WHERE id LIKE 'ds_wp_yj_%'").get().value, 2);
  });

  const graph = await getDirectoryGraph(vaultPath, "dir_yijing_rich_acceptance_original");
  assert.equal(graph.totalNodes, 50);
  assert.equal(graph.totalEdges, 80);

  const project = await getWritingProject(vaultPath, "wp_yj_answer_machine");
  assert.equal(project.title, "为什么《易经》不是答案机器");
  assert.equal(project.basket_note_ids.length, fixture.writing_projects[0].basketNoteIds.length);
  assert.equal(project.scaffold_id, "ds_wp_yj_answer_machine");

  const scaffold = await getDraftScaffold(vaultPath, "ds_wp_yj_answer_machine");
  assert.equal(scaffold.sections.length, fixture.writing_projects[0].outline.length);
  assert.ok(scaffold.sections.every((section) => section.evidence_note_ids.length > 0));
  assert.ok(scaffold.sections.every((section) => section.source_trace_ids.length > 0));
  assert.match(scaffold.markdown, /这是一份写作方案和脚手架，不是完成稿/);
});
