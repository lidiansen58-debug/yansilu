ALTER TABLE writing_projects ADD COLUMN draft_note_id TEXT REFERENCES notes(id);
