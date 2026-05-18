UPDATE links
SET status = 'implicit'
WHERE relation_type = 'associated_with'
  AND rationale = 'markdown_wikilink'
  AND created_by = 'user'
  AND status = 'confirmed'
  AND COALESCE(rationale_quality_level, 'empty') = 'empty'
  AND COALESCE(updated_at, created_at) = created_at;
