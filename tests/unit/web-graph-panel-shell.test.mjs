import test from "node:test";
import assert from "node:assert/strict";

import {
  renderGraphPanelShell
} from "../../apps/web/src/graph-panel-shell.js";

function elementStub() {
  return {
    innerHTML: "",
    textContent: ""
  };
}

test("graph panel shell builds panel state, syncs app graph visibility, and delegates rendering", () => {
  const summary = elementStub();
  const canvas = elementStub();
  const backButton = elementStub();
  const appState = {};
  const graphState = { selection: null };
  const connectedNoteIds = new Set(["a", "b"]);
  const visibleNoteIds = new Set(["a", "b", "c"]);
  const calls = [];

  const result = renderGraphPanelShell({
    appState,
    graphState,
    dom: { summary, canvas, backButton },
    folder: { id: "permanent", name: "Permanent" },
    scopeDirectoryId: "scope-1",
    canReuseScopedGraph: true
  }, {
    syncGraphDisclosureState: (target) => calls.push(["disclosure", target === canvas]),
    syncAllNoteRelationNetworkStatuses: (payload) => calls.push(["sync", payload.connectivityReady, payload.connectedIds]),
    buildGraphPanelState: (payload, deps) => {
      calls.push(["build", payload.scopeDirectoryId, payload.canReuseScopedGraph, deps.marker]);
      return {
        kind: "ready",
        connectivityReady: true,
        connectedNoteIds,
        visibleNoteIds,
        visibleNoteIdsReady: true
      };
    },
    renderGraphPanelForRuntime: (payload, deps) => {
      calls.push(["render", payload.summary === summary, payload.canvas === canvas, payload.backButton === backButton, deps.graphState === graphState, deps.escapeHtml("x")]);
      return "rendered";
    },
    stateBuilderDeps: { marker: "state-deps" },
    rendererDeps: { escapeHtml: (value) => `safe:${value}` }
  });

  assert.equal(result, "rendered");
  assert.equal(appState.graphConnectivityReady, true);
  assert.equal(appState.graphConnectedNoteIds, connectedNoteIds);
  assert.equal(appState.graphVisibleNoteIds, visibleNoteIds);
  assert.equal(appState.graphVisibleNoteIdsReady, true);
  assert.deepEqual(calls, [
    ["disclosure", true],
    ["build", "scope-1", true, "state-deps"],
    ["sync", true, connectedNoteIds],
    ["render", true, true, true, true, "safe:x"]
  ]);
});

test("graph panel shell skips rendering when required dom is missing", () => {
  const calls = [];

  assert.equal(renderGraphPanelShell({
    appState: {},
    graphState: {},
    dom: { summary: null, canvas: elementStub() }
  }, {
    syncGraphDisclosureState: () => calls.push("disclosure"),
    buildGraphPanelState: () => calls.push("build"),
    renderGraphPanelForRuntime: () => calls.push("render")
  }), false);

  assert.deepEqual(calls, []);
});

test("graph panel shell clears connected ids when connectivity is not ready", () => {
  const appState = {};
  const syncCalls = [];

  renderGraphPanelShell({
    appState,
    graphState: {},
    dom: { summary: elementStub(), canvas: elementStub() }
  }, {
    buildGraphPanelState: () => ({
      kind: "loading",
      connectivityReady: false,
      connectedNoteIds: new Set(["stale"]),
      visibleNoteIdsReady: false
    }),
    syncAllNoteRelationNetworkStatuses: (payload) => syncCalls.push(payload),
    renderGraphPanelForRuntime: () => true
  });

  assert.equal(appState.graphConnectivityReady, false);
  assert.deepEqual([...appState.graphConnectedNoteIds], ["stale"]);
  assert.equal(appState.graphVisibleNoteIdsReady, false);
  assert.deepEqual(syncCalls, [{ connectivityReady: false, connectedIds: null }]);
});
