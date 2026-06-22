import test from "node:test";
import assert from "node:assert/strict";

import { graphRelationWorkspaceRouteForFollowup } from "../../apps/web/src/graph-followup.js";

test("graph bridge followup opens the large relation workspace with target and type prefilled", () => {
  const route = graphRelationWorkspaceRouteForFollowup({
    targetNoteId: "note-b",
    relationType: "bridges",
    notice: "补桥接",
    relationDrafts: {
      rationaleDraft: "A is the missing bridge into B.",
      insightQuestionDraft: "What bridge should be made?",
      variants: [{ id: "bridge-rationale" }],
      selectedVariant: "bridge-rationale"
    }
  });

  assert.equal(route.mode, "ai");
  assert.equal(route.targetNoteId, "note-b");
  assert.equal(route.relationType, "bridges");
  assert.equal(route.rationaleDraft, "A is the missing bridge into B.");
  assert.equal(route.insightQuestionDraft, "What bridge should be made?");
  assert.deepEqual(route.draftVariants, [{ id: "bridge-rationale" }]);
  assert.equal(route.selectedTemplateVariant, "bridge-rationale");
});
