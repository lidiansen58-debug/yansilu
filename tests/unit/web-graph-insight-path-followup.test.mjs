import test from "node:test";
import assert from "node:assert/strict";

import {
  graphRelationWorkspaceRouteForFollowup,
  graphSelectEdgeActionAttrs
} from "../../apps/web/src/graph-followup.js";

test("graph insight path items select relations in place instead of jumping to followups", () => {
  const attrs = graphSelectEdgeActionAttrs({
    id: "rel-1",
    fromNoteId: "note-a",
    toNoteId: "note-b",
    relationType: "BRIDGES"
  });

  assert.match(attrs, /data-graph-select-edge="id:rel-1"/);
  assert.match(attrs, /data-graph-select-edge-id="rel-1"/);
  assert.match(attrs, /data-graph-select-edge-from="note-a"/);
  assert.match(attrs, /data-graph-select-edge-to="note-b"/);
  assert.match(attrs, /data-graph-select-edge-type="bridges"/);
  assert.doesNotMatch(attrs, /data-graph-followup-action/);
  assert.doesNotMatch(attrs, /data-open-note/);
});

test("graph relation followup continues to prefill target and relation type through the relation workspace", () => {
  const route = graphRelationWorkspaceRouteForFollowup({
    targetNoteId: "target-1",
    relationType: "BRIDGES",
    notice: "补桥接",
    relationDrafts: {
      rationaleDraft: "A explains why B matters.",
      insightQuestionDraft: "Why connect A and B?",
      variants: [{ id: "bridge" }],
      selectedVariant: "bridge"
    }
  });

  assert.deepEqual(route, {
    mode: "ai",
    targetNoteId: "target-1",
    relationType: "bridges",
    notice: "补桥接",
    rationaleDraft: "A explains why B matters.",
    insightQuestionDraft: "Why connect A and B?",
    draftVariants: [{ id: "bridge" }],
    selectedTemplateVariant: "bridge"
  });
});
