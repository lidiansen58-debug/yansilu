import test from "node:test";
import assert from "node:assert/strict";
import { remapImportedViewpointReferences } from "../../packages/markdown-engine/src/index.mjs";

const revision = { previousThesis: "Before", thesis: "After", reason: "Observed exception", changedAt: "2026-01-02", sourceNoteIds: ["old-evidence", "unknown"] };
const target = { id: "new-evidence", original_frontmatter: { id: "old-evidence" }, citations: [{ source_id: "src-evidence" }] };

test("viewpoint reference mapping normalizes object/JSON formats and preserves unknown fields without mutation", () => {
  const candidates = { permanent: [{ id: "new-claim", original_frontmatter: { id: "old-claim" },
    viewpointHistory: JSON.stringify([revision]), viewpoint_history: [revision, JSON.stringify({ ...revision, source_note_ids: ["old-evidence"] }), "broken"],
    pendingViewpointRevision: { ...revision, custom: "old-evidence" }, pending_viewpoint_revision: "broken",
    body: "[[old-evidence]]", citations: [{ source_id: "old-evidence" }] }, target], literature: [], warnings: [] };
  const original = structuredClone(candidates);
  const result = remapImportedViewpointReferences(candidates);
  const claim = result.permanent[0];
  const expected = { ...revision, sourceNoteIds: ["new-evidence", "unknown"] };
  assert.deepEqual(claim.viewpointHistory.map(JSON.parse), [expected]);
  assert.deepEqual(JSON.parse(claim.viewpoint_history[0]), expected);
  assert.deepEqual(JSON.parse(claim.viewpoint_history[1]), { ...expected, source_note_ids: ["new-evidence"] });
  assert.equal(claim.viewpoint_history[2], "broken");
  assert.deepEqual(claim.pendingViewpointRevision, { ...expected, custom: "old-evidence" });
  assert.equal(claim.pending_viewpoint_revision, "broken");
  assert.equal(claim.body, original.permanent[0].body);
  assert.deepEqual(claim.citations, original.permanent[0].citations);
  assert.deepEqual(candidates, original);
  assert.deepEqual(remapImportedViewpointReferences(result), result);
});

test("duplicate old IDs never pick an arbitrary evidence note and warn once per affected note", () => {
  const candidates = { permanent: [{ id: "claim", viewpointHistory: [revision], pendingViewpointRevision: revision },
    target, { ...target, id: "another-evidence", citations: [{ source_id: "src-another" }] }, { ...target, id: "third-evidence" }], literature: [], warnings: [] };
  const result = remapImportedViewpointReferences(candidates);
  assert.deepEqual(JSON.parse(result.permanent[0].viewpointHistory[0]).sourceNoteIds, revision.sourceNoteIds);
  assert.deepEqual(result.permanent[0].pendingViewpointRevision.sourceNoteIds, revision.sourceNoteIds);
  assert.equal(result.warnings.length, 1);
  assert.equal(result.warnings[0].code, "IMPORT_VIEWPOINT_REFERENCE_AMBIGUOUS");
  assert.equal(result.warnings[0].noteId, "claim");
  assert.equal(result.warnings[0].referenceId, "old-evidence");
  assert.deepEqual(remapImportedViewpointReferences(result), result);
});

test("a quotation from a permanent note does not replace the permanent evidence identity", () => {
  const candidates = { permanent: [{ id: "claim", viewpoint_history: [JSON.stringify(revision)] }, target],
    literature: [{ id: "quote-copy", source_id: "src-evidence", original_frontmatter: { id: "old-evidence" } }] };
  const result = remapImportedViewpointReferences(candidates);
  assert.deepEqual(JSON.parse(result.permanent[0].viewpoint_history[0]).sourceNoteIds, [target.id, "unknown"]);
  assert.deepEqual(result.warnings, []);
});

test("canonical imported IDs remain stable even when another old ID collides with one", () => {
  const candidates = { permanent: [{ id: "claim", viewpointHistory: [{ ...revision, sourceNoteIds: ["new-evidence"] }] }, target,
    { id: "other", original_frontmatter: { id: "new-evidence" } }] };
  const result = remapImportedViewpointReferences(candidates);
  assert.deepEqual(JSON.parse(result.permanent[0].viewpointHistory[0]).sourceNoteIds, ["new-evidence"]);
  assert.equal(result.warnings[0].referenceId, "new-evidence");
  assert.deepEqual(remapImportedViewpointReferences(result), result);
});

test("unsupported scalar and malformed history formats are retained exactly", () => {
  for (const value of ["broken", "123", '"a scalar"', "null", '{"unexpected":"old-evidence"}']) {
    const candidates = { permanent: [{ id: "claim", viewpointHistory: value, pendingViewpointRevision: value }, target] };
    const claim = remapImportedViewpointReferences(candidates).permanent[0];
    assert.equal(claim.viewpointHistory, value);
    if (value.startsWith("{")) assert.deepEqual(claim.pendingViewpointRevision, { unexpected: "old-evidence" });
    else assert.equal(claim.pendingViewpointRevision, value);
  }
});

test("exported identity aliases remap only unambiguous references when the old id field is absent", () => {
  const exportedTarget = { id: "new-evidence", original_frontmatter: { yansilu_link_aliases: ["old-evidence", "first-import-id"] } };
  const candidates = { permanent: [{ id: "claim", viewpointHistory: [{ ...revision, sourceNoteIds: ["first-import-id", "unknown"] }] }, exportedTarget] };
  const result = remapImportedViewpointReferences(candidates);
  assert.deepEqual(JSON.parse(result.permanent[0].viewpointHistory[0]).sourceNoteIds, ["new-evidence", "unknown"]);
  const ambiguous = remapImportedViewpointReferences({ ...candidates, permanent: [...candidates.permanent,
    { id: "other-evidence", original_frontmatter: { yansilu_link_aliases: ["first-import-id"] } }] });
  assert.deepEqual(JSON.parse(ambiguous.permanent[0].viewpointHistory[0]).sourceNoteIds, ["first-import-id", "unknown"]);
  assert.equal(ambiguous.warnings[0].referenceId, "first-import-id");
});
