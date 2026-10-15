const SOURCE_HEADING_TOKENS = new Set(["证据来源", "来源线索"]);

// Source headings were historically aliases for relatedClues. Keep that fallback
// for old notes, but preserve their separate role when a relation section exists.
export function createPermanentSectionRoleResolver(headings, { normalizeHeading, sectionKeyFromHeading }) {
  const isSourceHeading = (heading) => SOURCE_HEADING_TOKENS.has(normalizeHeading(heading));
  const hasRelatedSection = headings.some((heading) =>
    sectionKeyFromHeading(heading) === "relatedClues" && !isSourceHeading(heading)
  );
  return (heading) => hasRelatedSection && isSourceHeading(heading)
    ? ""
    : sectionKeyFromHeading(heading);
}
