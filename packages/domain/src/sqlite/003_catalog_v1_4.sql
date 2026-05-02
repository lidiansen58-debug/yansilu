CREATE TABLE IF NOT EXISTS draft_note_versions (
  id TEXT PRIMARY KEY,
  writing_project_id TEXT NOT NULL REFERENCES writing_projects(id),
  draft_note_id TEXT NOT NULL REFERENCES notes(id),
  source_scaffold_id TEXT REFERENCES draft_scaffolds(id),
  version_no INTEGER NOT NULL,
  created_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_draft_note_versions_unique ON draft_note_versions(writing_project_id, version_no);
CREATE INDEX IF NOT EXISTS idx_draft_note_versions_project_created ON draft_note_versions(writing_project_id, created_at);
