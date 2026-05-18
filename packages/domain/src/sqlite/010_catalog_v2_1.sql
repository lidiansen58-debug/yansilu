CREATE TABLE IF NOT EXISTS knowledge_works (
  id TEXT PRIMARY KEY,
  work_type TEXT NOT NULL DEFAULT 'essay',
  title TEXT NOT NULL,
  central_question TEXT NOT NULL DEFAULT '',
  core_thesis TEXT NOT NULL DEFAULT '',
  audience TEXT NOT NULL DEFAULT '',
  intended_effect TEXT NOT NULL DEFAULT '',
  source_index_ids_json TEXT NOT NULL DEFAULT '[]',
  source_note_ids_json TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'seed',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

ALTER TABLE writing_projects ADD COLUMN knowledge_work_id TEXT;

CREATE INDEX IF NOT EXISTS idx_writing_projects_knowledge_work ON writing_projects(knowledge_work_id);
