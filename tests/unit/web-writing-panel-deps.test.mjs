import test from "node:test";
import assert from "node:assert/strict";
import {
  buildWritingPanelHostDeps
} from "../../apps/web/src/writing-panel-deps.js";

test("writing panel host deps preserves injected shell collaborators", () => {
  const state = { module: "writing" };
  const writingState = { basketNoteIds: ["n1"] };
  const marker = (name) => () => name;
  const deps = buildWritingPanelHostDeps({
    $: marker("$"),
    state,
    writingState,
    folderById: marker("folder"),
    writingCandidateNotes: marker("candidates"),
    writingBookProjectGoal: marker("goal"),
    writingBookProjectAudience: marker("audience"),
    escapeHtml: (value) => String(value ?? "")
  });

  assert.equal(deps.state, state);
  assert.equal(deps.writingState, writingState);
  assert.equal(deps.$(), "$");
  assert.equal(deps.folderById(), "folder");
  assert.equal(deps.writingCandidateNotes(), "candidates");
  assert.equal(deps.writingBookProjectGoal(), "goal");
  assert.equal(deps.writingBookProjectAudience(), "audience");
  assert.equal(deps.escapeHtml("<x>"), "<x>");
});

test("writing panel host deps supplies harmless defaults", () => {
  const deps = buildWritingPanelHostDeps();

  assert.deepEqual(deps.writingCandidateNotes(), []);
  assert.deepEqual(deps.writingBasketEntries(), []);
  assert.equal(deps.writingRelationCountsReady(), false);
  assert.equal(deps.writingRelationCountsErrored(), false);
  assert.equal(deps.escapeHtml(null), "");
});
