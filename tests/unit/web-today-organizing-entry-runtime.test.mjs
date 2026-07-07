import test from "node:test";
import assert from "node:assert/strict";

import { createTodayOrganizingEntryRuntime } from "../../apps/web/src/today-organizing-entry-runtime.js";

function createPanel() {
  let clickHandler = null;
  return {
    get clickHandler() {
      return clickHandler;
    },
    addEventListener(type, handler) {
      if (type === "click") clickHandler = handler;
    },
    innerHTML: "",
    classList: { contains: () => false }
  };
}

test("today organizing entry runtime derives state through prototype deps", () => {
  const panel = createPanel();
  const entry = createTodayOrganizingEntryRuntime(() => ({
    $: (id) => (id === "todayOrganizingPanel" ? panel : null),
    state: {
      notes: [{ id: "pn_1", title: "Isolated", noteType: "permanent" }],
      graphConnectivityReady: true
    },
    graphState: { item: { edges: [] } },
    writingState: { themeIndexes: [], loadingThemeIndexes: false },
    importState: {},
    currentVaultPath: () => "vault",
    loadWritingThemeIndexes: async () => [],
    typeFromFolder: () => "permanent",
    relationNetworkStatusForNote: () => "isolated"
  }));

  const state = entry.runtime.currentState();

  assert.equal(state.firstIsolated.id, "pn_1");
  assert.equal(state.isolatedCount, 1);
});

test("today organizing entry runtime wires isolated relation entry route", async () => {
  const panel = createPanel();
  const calls = [];
  const entry = createTodayOrganizingEntryRuntime(() => ({
    $: (id) => (id === "todayOrganizingPanel" ? panel : null),
    state: {
      notes: [{ id: "pn_1", title: "Isolated", noteType: "permanent" }],
      graphConnectivityReady: true
    },
    graphState: { item: { edges: [] } },
    writingState: { themeIndexes: [], loadingThemeIndexes: false },
    importState: {},
    currentVaultPath: () => "vault",
    loadWritingThemeIndexes: async () => [],
    typeFromFolder: () => "permanent",
    relationNetworkStatusForNote: () => "isolated",
    activateModule: (moduleName) => calls.push(["activate", moduleName]),
    handleStateChange: async (reason, payload) => calls.push(["state", reason, payload])
  }));
  entry.installEvents();

  await panel.clickHandler({
    preventDefault() {},
    target: {
      closest: (selector) => selector === "[data-today-action]"
        ? {
            disabled: false,
            dataset: {},
            getAttribute: (name) => (name === "data-today-action" ? "connect-first-isolated" : "")
          }
        : null
    }
  });

  assert.deepEqual(calls, [
    ["activate", "graph"],
    ["state", "graph-associate-note", { noteId: "pn_1", source: "today-organizing" }]
  ]);
});
