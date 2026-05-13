ALTER TABLE links ADD COLUMN rationale_quality_score REAL NOT NULL DEFAULT 0;
ALTER TABLE links ADD COLUMN rationale_quality_level TEXT NOT NULL DEFAULT 'empty';
