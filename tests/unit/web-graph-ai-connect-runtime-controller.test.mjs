import assert from "node:assert/strict";
import test from "node:test";

import { createGraphAiConnectRuntimeController } from "../../apps/web/src/graph-ai-connect-runtime-controller.js";

test("AI connect accepts a current response after render normalizes the selection", async () => {
  const graphState = { item: { nodes: [{ id: "a" }, { id: "b" }], edges: [] }, selection: { kind: "node", noteId: "a" } };
  let opened = 0;
  const render = () => { graphState.selection = { kind: "node", nodeId: "a", title: "refreshed title" }; };
  const controller = createGraphAiConnectRuntimeController(() => ({ graphState, state: { notes: [] },
    graphScopeDirectoryId: () => "directory", renderGraphPanel: render,
    ensureGraphLocalAiReadyForAnalysis: async () => { render(); return true; },
    analyzeDirectoryGraph: async () => ({ analysis: { relationCandidates: [] } }),
    graphAiRelationCandidatesForNote: () => [{ targetNoteId: "b" }],
    openRelationComposerFromGraphAction: () => { opened++; } }));
  assert.equal(await controller.runGraphAiConnectForNote("a"), true);
  assert.equal(opened, 1);
});

for (const phase of ["prepare", "analysis"]) {
  for (const change of ["selection", "graph", "directory", "module"]) {
    test(`AI connect ignores an old ${phase} response after ${change} changes`, async () => {
      const graphState = { item: { nodes: [{ id: "a" }, { id: "b" }], edges: [] }, selection: { kind: "node", noteId: "a" } };
      const state = { module: "graph", notes: [] };
      let directoryId = "original";
      let release, entered;
      const held = new Promise(resolve => { release = resolve; });
      const started = new Promise(resolve => { entered = resolve; });
      const pause = async () => { entered(); await held; };
      const calls = [];
      const controller = createGraphAiConnectRuntimeController(() => ({ graphState, state,
        graphScopeDirectoryId: () => directoryId,
        ensureGraphLocalAiReadyForAnalysis: async () => { if (phase === "prepare") await pause(); return true; },
        analyzeDirectoryGraph: async () => { calls.push("analyze"); if (phase === "analysis") await pause(); return { relationCandidates: ["old"] }; },
        graphAiRelationCandidatesForNote: () => [{ targetNoteId: "b" }],
        openRelationComposerFromGraphAction: () => calls.push("composer"),
        setStatus: () => calls.push("status") }));
      const running = controller.runGraphAiConnectForNote("a");
      await started;
      if (change === "selection") graphState.selection = { kind: "node", noteId: "b" };
      if (change === "graph") graphState.item = { nodes: [{ id: "new" }], edges: [] };
      if (change === "directory") directoryId = "other";
      if (change === "module") state.module = "notes";
      release();
      assert.equal(await running, false);
      assert.equal(graphState.aiAnalysis, undefined);
      assert.equal(graphState.aiAnalysisLoading, false);
      assert.ok(!calls.includes("composer"));
      assert.ok(!calls.includes("status"));
      if (phase === "prepare") assert.ok(!calls.includes("analyze"));
    });
  }
}

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
