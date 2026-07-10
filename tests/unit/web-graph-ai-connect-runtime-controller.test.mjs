import assert from "node:assert/strict";
import test from "node:test";

import { createGraphAiConnectRuntimeController } from "../../apps/web/src/graph-ai-connect-runtime-controller.js";

test("graph AI connect opens the shared relation composer for the first candidate", async () => {
  const graphState = {
    item: {
      nodes: [{ id: "note-a", title: "Note A" }, { id: "note-b", title: "Note B" }],
      edges: []
    },
    selection: { kind: "isolated", noteId: "note-a" }
  };
  const calls = [];
  const controller = createGraphAiConnectRuntimeController(() => ({
    addSystemMessage: (message) => calls.push(["message", message.workflowRoute]),
    analyzeDirectoryGraph: async () => ({ reviewItems: { summary: { artifactCount: 1 } } }),
    ensureGraphLocalAiReadyForAnalysis: async () => true,
    graphAiRelationCandidatesForNote: () => [{
      targetNoteId: "note-b",
      targetTitle: "Note B",
      relationType: "supports",
      rationale: "A supports B"
    }],
    graphNodeTitle: (_map, id, fallback) => fallback || id,
    graphRelationWorkflowController: {
      startAiConnectForNote: (noteId) => calls.push(["start", noteId]),
      applyAiConnectRoute: () => ({ graphSelectionKind: "isolated" })
    },
    graphScopeDirectoryId: () => "dir-a",
    graphState,
    openRelationComposerFromGraphAction: (payload) => {
      calls.push(["composer", payload]);
      return true;
    },
    renderGraphPanel: () => calls.push(["render"]),
    setGraphIsolatedWorkflowActiveTab: (noteId, tab) => calls.push(["tab", noteId, tab]),
    setStatus: (message, tone) => calls.push(["status", tone, message]),
    state: { notes: [{ id: "note-a", title: "Note A" }] }
  }));

  const result = await controller.runGraphAiConnectForNote("note-a");

  assert.equal(result, true);
  assert.notEqual(graphState.selection?.kind, "relationForm");
  assert.deepEqual(calls.find((call) => call[0] === "composer"), ["composer", {
    noteId: "note-a",
    targetNoteId: "note-b",
    relationType: "supports",
    rationale: "A supports B",
    source: "graph",
    candidateSource: "graph-ai-connect",
    returnTo: "graph"
  }]);
});
