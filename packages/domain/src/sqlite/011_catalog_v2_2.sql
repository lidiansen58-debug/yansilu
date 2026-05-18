UPDATE links
SET status = 'implicit'
WHERE relation_type = 'associated_with'
  AND rationale = 'markdown_wikilink'
  AND created_by = 'user'
  AND status = 'confirmed';
