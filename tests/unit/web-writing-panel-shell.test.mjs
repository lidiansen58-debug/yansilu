import test from "node:test";
import assert from "node:assert/strict";

import {
  createWritingPanelDomDeps
} from "../../apps/web/src/writing-panel-shell.js";

test("writing panel shell keeps host deps and injects panel runtime helpers", () => {
  const host = {
    $: () => null,
    state: { module: "writing" },
    writingState: { project: null },
    writingCandidateNotes: () => [],
    escapeHtml: (value) => String(value ?? "")
  };

  const deps = createWritingPanelDomDeps(host);

  assert.equal(deps.$, host.$);
  assert.equal(deps.state, host.state);
  assert.equal(deps.writingState, host.writingState);
  assert.equal(deps.writingCandidateNotes, host.writingCandidateNotes);
  assert.equal(typeof deps.buildWritingPanelState, "function");
  assert.equal(typeof deps.planWritingCandidateFocus, "function");
  assert.equal(typeof deps.deriveBasketWritingReadiness, "function");
  assert.equal(typeof deps.describeWritingProjectEntryState, "function");
  assert.equal(typeof deps.writingOpenDraftButtonState, "function");
  assert.equal(typeof deps.writingStrongModelButtonState, "function");
});
