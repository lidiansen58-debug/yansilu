CREATE TABLE IF NOT EXISTS directories (
  id TEXT PRIMARY KEY,
  parent_directory_id TEXT REFERENCES directories(id),
  directory_type TEXT NOT NULL,
  title TEXT NOT NULL,
  fs_path TEXT NOT NULL,
  is_default INTEGER NOT NULL,
  is_hidden INTEGER NOT NULL DEFAULT 0,
  max_notes INTEGER NOT NULL DEFAULT 500,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_directories_parent ON directories(parent_directory_id);
CREATE INDEX IF NOT EXISTS idx_directories_type ON directories(directory_type);

CREATE TABLE IF NOT EXISTS notes (
  id TEXT PRIMARY KEY,
  note_type TEXT NOT NULL,
  title TEXT,
  status TEXT NOT NULL,
  markdown_path TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_notes_type_status ON notes(note_type, status);

CREATE TABLE IF NOT EXISTS note_directory_membership (
  id TEXT PRIMARY KEY,
  note_id TEXT NOT NULL REFERENCES notes(id),
  directory_id TEXT NOT NULL REFERENCES directories(id),
  created_at TEXT NOT NULL,
  UNIQUE(note_id, directory_id)
);
CREATE INDEX IF NOT EXISTS idx_note_directory_dir ON note_directory_membership(directory_id, note_id);

CREATE TABLE IF NOT EXISTS fleeting_note_meta (
  note_id TEXT PRIMARY KEY REFERENCES notes(id),
  content_text TEXT,
  voice_asset_path TEXT,
  source_hint TEXT,
  is_new INTEGER NOT NULL DEFAULT 1,
  archived_at TEXT,
  converted_to_note_id TEXT
);

CREATE TABLE IF NOT EXISTS literature_note_meta (
  note_id TEXT PRIMARY KEY REFERENCES notes(id),
  author_name TEXT NOT NULL,
  publish_year TEXT NOT NULL,
  book_title TEXT NOT NULL,
  publisher TEXT NOT NULL,
  page_locator TEXT NOT NULL,
  edition_info TEXT,
  translator_or_editor TEXT,
  quote_text TEXT NOT NULL,
  paraphrase_text TEXT NOT NULL,
  user_question TEXT,
  topic_candidates_json TEXT,
  linked_permanent_note_ids_json TEXT
);

CREATE TABLE IF NOT EXISTS permanent_note_meta (
  note_id TEXT PRIMARY KEY REFERENCES notes(id),
  core_claim TEXT NOT NULL,
  rationale TEXT NOT NULL,
  boundary_or_counterpoint TEXT,
  originality_status TEXT NOT NULL,
  originality_similarity REAL,
  user_confirmed INTEGER NOT NULL,
  ai_assisted INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_perm_originality_status ON permanent_note_meta(originality_status);
CREATE INDEX IF NOT EXISTS idx_perm_originality_sim ON permanent_note_meta(originality_similarity);

CREATE TABLE IF NOT EXISTS links (
  id TEXT PRIMARY KEY,
  from_note_id TEXT NOT NULL REFERENCES notes(id),
  to_note_id TEXT NOT NULL REFERENCES notes(id),
  relation_type TEXT NOT NULL,
  rationale TEXT,
  created_by TEXT NOT NULL,
  confidence REAL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_links_from ON links(from_note_id);
CREATE INDEX IF NOT EXISTS idx_links_to ON links(to_note_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_links_unique ON links(from_note_id, to_note_id, relation_type);

CREATE TABLE IF NOT EXISTS tags (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS note_tags (
  id TEXT PRIMARY KEY,
  note_id TEXT NOT NULL REFERENCES notes(id),
  tag_id TEXT NOT NULL REFERENCES tags(id),
  source TEXT NOT NULL DEFAULT 'markdown_body',
  created_at TEXT NOT NULL,
  UNIQUE(note_id, tag_id)
);
CREATE INDEX IF NOT EXISTS idx_note_tags_note ON note_tags(note_id);
CREATE INDEX IF NOT EXISTS idx_note_tags_tag ON note_tags(tag_id);

CREATE TABLE IF NOT EXISTS index_cards (
  id TEXT PRIMARY KEY,
  directory_id TEXT NOT NULL REFERENCES directories(id),
  index_type TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT,
  ordering_strategy TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS index_items (
  id TEXT PRIMARY KEY,
  index_id TEXT NOT NULL REFERENCES index_cards(id),
  note_id TEXT NOT NULL REFERENCES notes(id),
  short_label TEXT,
  rationale TEXT,
  order_no INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_index_items_order ON index_items(index_id, order_no);

CREATE TABLE IF NOT EXISTS writing_projects (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  goal TEXT,
  audience TEXT,
  tone TEXT,
  status TEXT NOT NULL,
  scaffold_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS writing_basket_items (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES writing_projects(id),
  note_id TEXT NOT NULL REFERENCES notes(id),
  order_no INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_writing_basket_project_order ON writing_basket_items(project_id, order_no);

CREATE TABLE IF NOT EXISTS draft_scaffolds (
  id TEXT PRIMARY KEY,
  writing_project_id TEXT NOT NULL REFERENCES writing_projects(id),
  sections_json TEXT NOT NULL,
  open_questions_json TEXT NOT NULL,
  generated_by TEXT NOT NULL,
  markdown TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_draft_scaffolds_project ON draft_scaffolds(writing_project_id, created_at);

CREATE TABLE IF NOT EXISTS reminder_state (
  id TEXT PRIMARY KEY,
  directory_id TEXT NOT NULL REFERENCES directories(id),
  reminder_type TEXT NOT NULL,
  last_trigger_note_count INTEGER NOT NULL DEFAULT 0,
  last_triggered_at TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_reminder_unique ON reminder_state(directory_id, reminder_type);
