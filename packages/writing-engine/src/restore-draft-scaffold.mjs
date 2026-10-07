import { randomUUID } from "node:crypto";

const conflict = () => Object.assign(new Error("提纲或写作主题已在其他地方修改，本次未恢复。请重新打开历史记录后核对。"), { code: "WRITING_OUTLINE_CONFLICT" });

export async function restoreDraftScaffoldRecord(vaultPath, projectId, input, deps) {
  const { loadDatabaseSync, catalogDbPath, loadProject, mapScaffoldRow, loadBasketNotes,
    loadRelatedIndexCards, loadBasketNoteSummaries, buildScaffoldPreflight, renderMarkdown, deriveWritingProjectThinkingStatus } = deps;
  const sourceId = String(input.sourceScaffoldId || "").trim();
  if (!sourceId || !input.expectedScaffoldId || !input.expectedScaffoldUpdatedAt
    || !input.expectedProjectUpdatedAt || !input.expectedSourceUpdatedAt) throw new Error("恢复提纲需要完整的版本确认信息。");
  const id = String(input.restorationId || `ds_${randomUUID()}`).trim();
  if (!/^ds_[a-zA-Z0-9_-]{8,64}$/.test(id)) throw new Error("restorationId is invalid");
  const DatabaseSync = await loadDatabaseSync();
  const db = new DatabaseSync(catalogDbPath(vaultPath));
  try {
    db.exec("BEGIN IMMEDIATE");
    const project = await loadProject(vaultPath, projectId);
    const sourceRow = db.prepare("SELECT * FROM draft_scaffolds WHERE id = ? AND writing_project_id = ?").get(sourceId, projectId);
    if (!sourceRow) throw new Error("此历史提纲不属于当前写作主题，或已不存在。");
    const existing = db.prepare("SELECT * FROM draft_scaffolds WHERE id = ?").get(id);
    let scaffold;
    if (existing) {
      // A retry after a lost response must not create another version or replace a newer one.
      if (existing.writing_project_id !== projectId || existing.generated_by !== `restored:${sourceId}` || project.scaffold_id !== id) throw conflict();
      scaffold = mapScaffoldRow(existing);
    } else {
      const current = db.prepare("SELECT updated_at FROM draft_scaffolds WHERE id = ? AND writing_project_id = ?").get(project.scaffold_id, projectId);
      if (project.scaffold_id !== input.expectedScaffoldId || project.updated_at !== input.expectedProjectUpdatedAt
        || current?.updated_at !== input.expectedScaffoldUpdatedAt || sourceRow.updated_at !== input.expectedSourceUpdatedAt) throw conflict();
      const now = new Date().toISOString();
      const source = mapScaffoldRow(sourceRow);
      scaffold = { ...source, id, generated_by: `restored:${sourceId}`, version_note: "恢复历史提纲", created_at: now, updated_at: now };
      const noteIds = [...new Set([...project.basket_note_ids, ...source.sections.flatMap(section => section.evidence_note_ids || [])])];
      const notes = await loadBasketNotes(vaultPath, noteIds);
      const indexCards = await loadRelatedIndexCards(vaultPath, project.related_index_ids);
      scaffold.markdown = renderMarkdown(project, scaffold, notes, { preflight: buildScaffoldPreflight(project, notes), indexCards });
      db.prepare(`INSERT INTO draft_scaffolds
        (id, writing_project_id, sections_json, open_questions_json, generated_by, version_note, markdown, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .run(id, projectId, sourceRow.sections_json, sourceRow.open_questions_json, scaffold.generated_by, scaffold.version_note, scaffold.markdown, now, now);
      db.prepare("UPDATE writing_projects SET scaffold_id = ?, updated_at = ? WHERE id = ?").run(id, now, projectId);
      project.scaffold_id = id;
      project.updated_at = now;
      project.thinkingStatus = deriveWritingProjectThinkingStatus(project);
    }
    scaffold.evidence_notes = await loadBasketNoteSummaries(vaultPath, [...new Set(scaffold.sections.flatMap(section => section.evidence_note_ids || []))]);
    db.exec("COMMIT");
    return { ...scaffold, writing_project: project };
  } catch (error) {
    try { db.exec("ROLLBACK"); } catch {}
    throw error;
  } finally { db.close(); }
}
