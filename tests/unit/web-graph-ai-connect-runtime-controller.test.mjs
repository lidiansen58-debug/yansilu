import assert from "node:assert/strict";
import test from "node:test";

import { createGraphAiConnectRuntimeController } from "../../apps/web/src/graph-ai-connect-runtime-controller.js";

for (const change of ["selection", "graph", "analysis", "directory", "module"]) {
  test(`candidate refinement aborts after ${change} changes without presenting an error`, async () => {
    const graphState = { item: {}, aiAnalysis: {}, selection: { kind: "node", nodeId: "a" } };
    const state = { module: "graph" };
    let directory = "original", signal;
    const calls = [];
    const controller = createGraphAiConnectRuntimeController(() => ({ graphState, state,
      graphScopeDirectoryId: () => directory,
      refinePotentialRelationCandidate: (_payload, options) => {
        signal = options.signal;
        return new Promise((_, reject) => signal.addEventListener("abort", () => reject(new Error("Cancelled")), { once: true }));
      },
      mergePotentialRelationCandidateIntoGraphAnalysis: () => calls.push("merge"),
      renderGraphPanel: () => calls.push("render"), setStatus: () => calls.push("status") }));
    const running = controller.refineGraphPotentialRelationCandidate("a", { targetNoteId: "b" });
    controller.cancelStaleRefinements();
    assert.equal(signal.aborted, false);
    if (change === "selection") graphState.selection = { kind: "node", nodeId: "b" };
    if (change === "graph") graphState.item = {};
    if (change === "analysis") graphState.aiAnalysis = {};
    if (change === "directory") directory = "other";
    if (change === "module") state.module = "notes";
    controller.cancelStaleRefinements();
    assert.equal(signal.aborted, true);
    assert.equal((await running).stale, true);
    assert.deepEqual(calls, []);
    controller.cancelStaleRefinements();
  });
  for (const fail of [false, true]) {
    test(`candidate refinement ignores ${fail ? "failure" : "success"} after ${change} changes`, async () => {
      const graphState = { item: {}, aiAnalysis: {}, selection: { kind: "node", nodeId: "a" } };
      const state = { module: "graph" };
      let directory = "original", release, reject;
      const held = new Promise((done, failed) => { release = done; reject = failed; });
      const calls = [];
      const controller = createGraphAiConnectRuntimeController(() => ({ graphState, state,
        graphScopeDirectoryId: () => directory, refinePotentialRelationCandidate: () => held,
        mergePotentialRelationCandidateIntoGraphAnalysis: () => calls.push("merge"),
        removePotentialRelationCandidateFromGraphAnalysis: () => calls.push("remove"),
        renderGraphPanel: () => calls.push("render"), setStatus: () => calls.push("status") }));
      const running = controller.refineGraphPotentialRelationCandidate("a", { targetNoteId: "b" });
      if (change === "selection") graphState.selection = { kind: "node", nodeId: "b" };
      if (change === "graph") graphState.item = {};
      if (change === "analysis") graphState.aiAnalysis = {};
      if (change === "directory") directory = "other";
      if (change === "module") state.module = "notes";
      if (fail) reject(Object.assign(new Error("missing"), { code: "POTENTIAL_RELATION_CANDIDATE_NOT_FOUND" }));
      else release({ aiRationale: "old response" });
      assert.equal((await running).stale, true);
      assert.deepEqual(calls, []);
    });
  }
}

test("a newer refinement for the same candidate owns its result", async () => {
  let release;
  const held = new Promise(done => { release = done; });
  const merged = [];
  let count = 0, oldSignal;
  const controller = createGraphAiConnectRuntimeController(() => ({
    refinePotentialRelationCandidate: (_payload, options) => {
      if (++count === 1) { oldSignal = options.signal; return held; }
      return Promise.resolve({ aiRationale: "new" });
    },
    mergePotentialRelationCandidateIntoGraphAnalysis: candidate => { merged.push(candidate.aiRationale); return true; } }));
  const old = controller.refineGraphPotentialRelationCandidate("a", { targetNoteId: "b" });
  assert.equal((await controller.refineGraphPotentialRelationCandidate("a", { target_note_id: "b" })).ok, true);
  assert.equal(oldSignal.aborted, true);
  release({ aiRationale: "old" });
  assert.equal((await old).stale, true);
  assert.deepEqual(merged, ["new"]);
});

test("batch refinement stops sending requests when the graph scope changes", async () => {
  let directory = "original", release;
  const held = new Promise(done => { release = done; });
  let calls = 0, statuses = 0;
  const controller = createGraphAiConnectRuntimeController(() => ({ graphScopeDirectoryId: () => directory,
    refinePotentialRelationCandidate: () => { calls++; return held; }, setStatus: () => { statuses++; } }));
  const running = controller.refineGraphPotentialRelationsForNote("a", [{ targetNoteId: "b" }, { targetNoteId: "c" }]);
  directory = "other";
  release({ aiRationale: "old" });
  await running;
  assert.equal(calls, 1);
  assert.equal(statuses, 0);
});

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
