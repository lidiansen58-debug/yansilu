import test from "node:test";
import assert from "node:assert/strict";

import {
  graphAiConnectAnalysisOptions,
  graphAiConnectArtifactCount,
  graphAiConnectCandidateTitles,
  graphAiConnectPreviewTargetId
} from "../../apps/web/src/graph-ai-connect-model.js";

test("graph AI connect analysis options scope analysis to the current note", () => {
  assert.deepEqual(graphAiConnectAnalysisOptions(" note-a "), {
    includeDescendants: true,
    minScore: 0.05,
    relationLimit: 24,
    focusNoteId: "note-a",
    currentNoteId: "note-a",
    persistArtifacts: true
  });
});

test("graph AI connect preview target prefers counterpart id", () => {
  assert.equal(graphAiConnectPreviewTargetId([{ counterpartNoteId: " target-a ", targetNoteId: "target-b" }]), "target-a");
  assert.equal(graphAiConnectPreviewTargetId([{ targetNoteId: " target-b " }]), "target-b");
  assert.equal(graphAiConnectPreviewTargetId([]), "");
});

test("graph AI connect candidate titles use counterpart target and id fallbacks", () => {
  assert.deepEqual(
    graphAiConnectCandidateTitles([
      { counterpartTitle: " A " },
      { targetTitle: "B" },
      { targetNoteId: "C" },
      { targetNoteId: "D" }
    ]),
    ["A", "B", "C"]
  );
});

test("graph AI connect artifact count normalizes missing summary", () => {
  assert.equal(graphAiConnectArtifactCount({ reviewItems: { summary: { artifactCount: 3 } } }), 3);
  assert.equal(graphAiConnectArtifactCount({}), 0);
});
