ALTER TABLE permanent_note_meta ADD COLUMN thesis TEXT;
ALTER TABLE permanent_note_meta ADD COLUMN three_line_summary_json TEXT;
ALTER TABLE permanent_note_meta ADD COLUMN distillation_status TEXT;

ALTER TABLE index_cards ADD COLUMN thesis TEXT;
ALTER TABLE index_cards ADD COLUMN three_line_summary_json TEXT;
ALTER TABLE index_cards ADD COLUMN central_question TEXT;

ALTER TABLE writing_projects ADD COLUMN intent TEXT;
ALTER TABLE writing_projects ADD COLUMN desired_reader_takeaway TEXT;
