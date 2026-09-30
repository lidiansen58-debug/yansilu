CREATE TABLE note_link_aliases (
  note_id TEXT NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  reference TEXT NOT NULL,
  reference_key TEXT NOT NULL,
  PRIMARY KEY (note_id, reference_key)
);
CREATE INDEX idx_note_link_aliases_reference ON note_link_aliases(reference_key);
