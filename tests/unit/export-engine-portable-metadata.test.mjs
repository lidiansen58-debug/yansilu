import test from "node:test";
import assert from "node:assert/strict";
import { portableNoteMetadata } from "../../packages/export-engine/src/portable-note-metadata.mjs";
import { parseMarkdownWithFrontmatter, serializeMarkdownWithFrontmatter } from "../../packages/domain/src/frontmatter.mjs";

test("portable identity extends existing aliases without exporting runtime status or author confirmation", () => {
  const original = { id: "pn_current", note_type: "permanent", yansilu_link_aliases: ["pn_older", "Legacy name"],
    status: "active", authorship: { user_confirmed: true }, distillation_status: "confirmed" };
  const cleaned = { thesis: "My judgment", yansilu_link_aliases: [...original.yansilu_link_aliases], custom: "Untouched" };
  const result = portableNoteMetadata(cleaned, original);
  assert.deepEqual(result, { ...cleaned, yansilu_link_aliases: ["pn_older", "Legacy name", "pn_current"], yansilu_note_type: "permanent" });
  assert.equal(result.id, undefined);
  assert.equal(result.status, undefined);
  assert.equal(result.authorship, undefined);
  assert.equal(result.distillation_status, undefined);
  assert.deepEqual(cleaned.yansilu_link_aliases, ["pn_older", "Legacy name"]);
  assert.deepEqual(portableNoteMetadata(result, original), result);
});

test("pending revision JSON survives actual Markdown serialization without double encoding", () => {
  const revision = { previousThesis: "Before", thesis: "After", reason: 'An observation said "check".', sourceNoteIds: ["pn_real"] };
  const result = portableNoteMetadata({ pending_viewpoint_revision: JSON.stringify(revision), pendingViewpointRevision: "broken" }, { id: "pn_current", note_type: "permanent" });
  const raw = serializeMarkdownWithFrontmatter(result, "# Current\n\nOriginal body.");
  const parsed = parseMarkdownWithFrontmatter(raw);
  assert.deepEqual(JSON.parse(parsed.frontmatter.pending_viewpoint_revision), revision);
  assert.equal(parsed.frontmatter.pendingViewpointRevision, "broken");
  assert.equal(parsed.body, "# Current\n\nOriginal body.");
});

test("singular old aliases and unsupported values are retained, with no invented identity", () => {
  assert.deepEqual(portableNoteMetadata({}, { id: "ln_current", yansilu_link_aliases: "ln_old" }).yansilu_link_aliases, ["ln_old", "ln_current"]);
  const cleaned = { pending_viewpoint_revision: "123", pendingViewpointRevision: "null", custom: "pn_old" };
  assert.deepEqual(portableNoteMetadata(cleaned), cleaned);
});

test("AI provenance is portable while authorship confirmation stays local", () => {
  for (const authorship of [{ user_confirmed: true, ai_assisted: true }, '{"user_confirmed":true,"ai_assisted":true}']) {
    const result = portableNoteMetadata({}, { authorship });
    assert.equal(result.ai_assisted, true);
    assert.equal(result.authorship, undefined);
    assert.equal(parseMarkdownWithFrontmatter(serializeMarkdownWithFrontmatter(result, "My judgment")).frontmatter.ai_assisted, true);
  }
  assert.equal(portableNoteMetadata({}, { ai_assisted: true }).ai_assisted, true);
  for (const authorship of [null, "broken", { ai_assisted: false }, { ai_assisted: "false" }]) {
    assert.equal(portableNoteMetadata({}, { authorship }).ai_assisted, undefined);
  }
});
