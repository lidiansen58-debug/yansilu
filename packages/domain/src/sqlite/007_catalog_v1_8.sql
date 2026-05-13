ALTER TABLE links ADD COLUMN insight_question TEXT;
ALTER TABLE links ADD COLUMN status TEXT NOT NULL DEFAULT 'confirmed';
ALTER TABLE links ADD COLUMN updated_at TEXT;

UPDATE links
SET updated_at = created_at
WHERE updated_at IS NULL;
