import test from "node:test";
import assert from "node:assert/strict";

import { describeWritingDraftStepState } from "../../apps/web/src/writing-center-flow.js";
import { readPrototypeAppSource } from "./copy-source-helpers.mjs";

test("writing draft step stays on project clarification before saving a draft", () => {
  const step = describeWritingDraftStepState({
    hasDraft: false,
    hasScaffold: true,
    projectPreflightLevel: "needs_clarification",
    projectPreflightHint: "Clarify what this project is trying to say before saving a draft."
  });

  assert.equal(step.title, "先澄清项目问题");
  assert.match(step.note, /Clarify what this project is trying to say before saving a draft/);
});

test("writing draft step stays on project gaps before saving a draft", () => {
  const step = describeWritingDraftStepState({
    hasDraft: false,
    hasScaffold: true,
    projectPreflightLevel: "has_gaps",
    projectPreflightHint: "Add a clearer central question before saving a draft."
  });

  assert.equal(step.title, "先补项目缺口");
  assert.match(step.note, /Add a clearer central question before saving a draft/);
});

test("writing flow passes project preflight guidance into the draft step helper", async () => {
  const source = await readPrototypeAppSource();

  assert.match(source, /projectPreflightLevel: hasProject \? projectPreflightSummary\.level : ""/);
  assert.match(source, /projectPreflightHint: hasProject \? projectPreflightSummary\.hint : ""/);
});
