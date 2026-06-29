import test from "node:test";
import assert from "node:assert/strict";

import {
  writingBasketContinuationPlan,
  writingProjectContinuationRoute
} from "../../apps/web/src/writing-entry-route-model.js";

test("writing basket continuation plan appends notes and preserves selected theme provenance", () => {
  const plan = writingBasketContinuationPlan({
    existingNoteIds: ["n1"],
    incomingNoteIds: ["n2", "n1"],
    requestedTitle: "Requested",
    existingTitle: "Existing title",
    existingSourceIndexIds: ["idx_existing"],
    incomingSourceIndexIds: ["idx_new"],
    preserveSourceIndexIds: true,
    currentSelectedThemeIndexId: "idx_existing"
  });

  assert.equal(plan.entryMode, "append");
  assert.deepEqual(plan.basketNoteIds, ["n1", "n2"]);
  assert.deepEqual(plan.addedNoteIds, ["n2"]);
  assert.equal(plan.resolvedTitle, "Existing title");
  assert.deepEqual(plan.nextSourceIndexIds, ["idx_existing", "idx_new"]);
  assert.equal(plan.selectedThemeIndexId, "idx_existing");
});

test("writing basket continuation plan starts a fresh entry and can replace provenance", () => {
  const plan = writingBasketContinuationPlan({
    existingNoteIds: [],
    incomingNoteIds: ["n1", "n2"],
    requestedTitle: "Fresh title",
    existingTitle: "",
    existingSourceIndexIds: ["idx_existing"],
    incomingSourceIndexIds: ["idx_new"],
    preserveSourceIndexIds: false,
    currentSelectedThemeIndexId: "idx_existing"
  });

  assert.equal(plan.entryMode, "replace");
  assert.equal(plan.resolvedTitle, "Fresh title");
  assert.deepEqual(plan.nextSourceIndexIds, ["idx_new"]);
  assert.equal(plan.selectedThemeIndexId, "idx_new");
});

test("writing basket continuation plan returns null without incoming or existing notes", () => {
  assert.equal(writingBasketContinuationPlan({ existingNoteIds: [], incomingNoteIds: [] }), null);
});

test("writing project continuation route resumes an existing project by default", () => {
  assert.deepEqual(writingProjectContinuationRoute({ projectId: " wp_1 " }), {
    kind: "resume-project",
    handled: true,
    projectId: "wp_1",
    draftNoteId: "",
    statusMessage: "已继续当前项目：wp_1"
  });
});

test("writing project continuation route opens the current draft when requested", () => {
  assert.deepEqual(
    writingProjectContinuationRoute({
      projectId: "wp_1",
      project: { id: "wp_1", draft_note_id: " draft_1 " },
      openDraft: true,
      statusMessage: "resume draft"
    }),
    {
      kind: "open-draft",
      handled: true,
      projectId: "wp_1",
      draftNoteId: "draft_1",
      statusMessage: "resume draft"
    }
  );
});

test("writing project continuation route reports missing project and draft preconditions", () => {
  assert.equal(writingProjectContinuationRoute({ projectId: "" }).kind, "invalid-project");
  assert.deepEqual(
    writingProjectContinuationRoute({
      projectId: "wp_1",
      project: { id: "wp_1" },
      openDraft: true
    }),
    {
      kind: "missing-draft",
      handled: false,
      projectId: "wp_1",
      draftNoteId: "",
      errorMessage: "current project has no draft note"
    }
  );
});
