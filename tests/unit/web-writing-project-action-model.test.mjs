import test from "node:test";
import assert from "node:assert/strict";

import {
  currentBasketWritingProjectPlan,
  importedPermanentNotesWritingProjectPlan,
  writingProjectFormInput,
  writingStrongModelAnalysisPlan,
  writingStrongModelResultMeta
} from "../../apps/web/src/writing-project-action-model.js";

test("writingProjectFormInput trims project fields", () => {
  assert.deepEqual(writingProjectFormInput({
    title: "  Title  ",
    goal: " Goal ",
    audience: " Reader ",
    tone: " Calm "
  }), {
    title: "Title",
    goal: "Goal",
    audience: "Reader",
    tone: "Calm"
  });
});

test("current basket writing project plan blocks existing project and incomplete input", () => {
  assert.deepEqual(currentBasketWritingProjectPlan({
    existingProject: { id: "p1" },
    form: { title: "T" },
    basketNoteIds: ["n1"]
  }), {
    ok: false,
    reason: "existing_project",
    project: { id: "p1" }
  });

  assert.equal(currentBasketWritingProjectPlan({
    form: { title: "" },
    basketNoteIds: ["n1"]
  }).reason, "missing_title");

  assert.equal(currentBasketWritingProjectPlan({
    form: { title: "T" },
    basketNoteIds: []
  }).reason, "missing_basket");
});

test("current basket writing project plan builds create project payload", () => {
  const plan = currentBasketWritingProjectPlan({
    form: {
      title: "  Theme  ",
      goal: "Explain it",
      audience: "Readers",
      tone: "direct"
    },
    basketNoteIds: ["n1", "n1", "n2"],
    relatedIndexIds: ["idx1", "idx1"],
    bookStructure: { chapters: [] }
  });

  assert.equal(plan.ok, true);
  assert.equal(plan.payload.title, "Theme");
  assert.equal(plan.payload.intent, "Explain it");
  assert.match(plan.payload.desiredReaderTakeaway, /Readers/);
  assert.deepEqual(plan.payload.basketNoteIds, ["n1", "n2"]);
  assert.deepEqual(plan.payload.relatedIndexIds, ["idx1"]);
  assert.deepEqual(plan.payload.bookStructure, { chapters: [] });
});

test("imported permanent notes project plan keeps entry plan and payload together", () => {
  const entryPlan = { shouldBeginEntry: true, noteIds: ["n1"], source: "import" };
  const plan = importedPermanentNotesWritingProjectPlan({
    noteIds: ["n1", "n1"],
    title: " Imported ",
    form: { goal: "Goal" },
    entryPlan
  });

  assert.equal(plan.ok, true);
  assert.equal(plan.entryPlan, entryPlan);
  assert.equal(plan.payload.title, "Imported");
  assert.equal(plan.payload.intent, "Goal");
  assert.deepEqual(plan.payload.basketNoteIds, ["n1"]);
  assert.equal(importedPermanentNotesWritingProjectPlan({ noteIds: [] }).reason, "missing_imported_permanent_notes");
});

test("writing strong model analysis plan separates preflight from request payload", () => {
  assert.equal(writingStrongModelAnalysisPlan({
    noteIds: [],
    project: { id: "p1" }
  }).reason, "missing_basket");
  assert.equal(writingStrongModelAnalysisPlan({
    noteIds: ["n1"],
    project: null
  }).reason, "missing_project");
  assert.equal(writingStrongModelAnalysisPlan({
    noteIds: ["n1"],
    project: { id: "p1" },
    confirmed: false
  }).reason, "cancelled");

  const plan = writingStrongModelAnalysisPlan({
    noteIds: ["n1", "n1"],
    project: { id: " p1 ", goal: "Project goal", audience: "Project audience" },
    form: { goal: " Form goal " },
    confirmed: true
  });

  assert.equal(plan.ok, true);
  assert.deepEqual(plan.request, {
    userConfirmedRemoteModel: true,
    projectId: "p1",
    writingGoal: "Form goal",
    audience: "Project audience",
    noteIds: ["n1"],
    persistArtifacts: true
  });
});

test("writing strong model result meta reads model and artifact count", () => {
  assert.deepEqual(writingStrongModelResultMeta({
    request: { model: { model: "gpt-x" } },
    result: { storedArtifactIds: ["a1", "a2"] }
  }), {
    model: "gpt-x",
    artifactCount: 2
  });

  assert.deepEqual(writingStrongModelResultMeta(null), {
    model: "strong_model",
    artifactCount: 0
  });
});
