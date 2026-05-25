import test from "node:test";
import assert from "node:assert/strict";

import {
  describeWritingDraftStepState,
  isWritingScaffoldReadyForDraft
} from "../../apps/web/src/writing-center-flow.js";

test("writing scaffold readiness only turns done once blocking gaps are cleared", () => {
  assert.equal(
    isWritingScaffoldReadyForDraft({
      hasScaffold: true,
      blockingCount: 0
    }),
    true
  );
  assert.equal(
    isWritingScaffoldReadyForDraft({
      hasScaffold: true,
      blockingCount: 2
    }),
    false
  );
  assert.equal(
    isWritingScaffoldReadyForDraft({
      hasScaffold: false,
      blockingCount: 0
    }),
    false
  );
});

test("writing draft step points to opening the current draft once one already exists", () => {
  const step = describeWritingDraftStepState({
    hasDraft: true,
    hasScaffold: true
  });

  assert.equal(step.title, "打开当前草稿");
  assert.match(step.note, /打开当前草稿|继续写作/);
});
