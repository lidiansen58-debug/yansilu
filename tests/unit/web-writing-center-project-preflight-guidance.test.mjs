import test from "node:test";
import assert from "node:assert/strict";

import {
  describeWritingNextActionFromState,
  describeWritingProjectStepState
} from "../../apps/web/src/writing-center-flow.js";

test("writing center next action stays on project clarification before scaffold generation", () => {
  const action = describeWritingNextActionFromState({
    basketCount: 2,
    hasProject: true,
    hasScaffold: false,
    hasDraft: false,
    projectPreflightLevel: "needs_clarification",
    projectPreflightHint: "Clarify what this project is trying to say before generating a scaffold."
  });

  assert.match(action.note, /Clarify what this project is trying to say before generating a scaffold/);
});

test("writing center project step keeps showing project preflight gaps after the project already exists", () => {
  const step = describeWritingProjectStepState({
    basketCount: 2,
    hasProject: true,
    projectId: "project_alpha",
    projectPreflightLevel: "has_gaps",
    projectPreflightHint: "Add a clearer central question before generating the scaffold."
  });

  assert.match(step.note, /Add a clearer central question before generating the scaffold/);
});
