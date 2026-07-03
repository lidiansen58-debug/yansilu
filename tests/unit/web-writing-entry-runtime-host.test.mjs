import test from "node:test";
import assert from "node:assert/strict";

import {
  createWritingEntryRuntimeHost
} from "../../apps/web/src/writing-entry-runtime-host.js";

test("writing entry runtime host exposes the entry controller routes", () => {
  const calls = [];
  const writingState = {
    strongModelEpoch: 0,
    sourceIndexIds: ["idx_old"],
    selectedThemeIndexId: "idx_old"
  };
  const runtime = createWritingEntryRuntimeHost(() => ({
    $: (id) => ({ value: id === "writingGoal" ? "Goal" : "" }),
    clearWritingSourceIndexIds: () => calls.push(["clear-source"]),
    refreshWritingRelationCounts: async (ids) => calls.push(["relations", ids]),
    renderWritingPanel: () => calls.push(["render"]),
    resetWritingLocalBookIdeas: () => calls.push(["reset-book"]),
    resetWritingProjectContext: (context) => calls.push(["reset-project", context]),
    setSelectedWritingThemeIndex: (id) => calls.push(["theme", id]),
    setWritingBasketIds: (ids) => calls.push(["basket", ids]),
    showWritingResult: (payload) => calls.push(["result", payload]),
    writingState
  }));

  assert.equal(runtime.beginWritingEntry(["n1"], { title: "Draft" }), true);
  assert.deepEqual(calls.find((call) => call[0] === "basket"), ["basket", ["n1"]]);
  assert.deepEqual(calls.find((call) => call[0] === "reset-project"), ["reset-project", {
    title: "Draft",
    goal: "Goal",
    audience: "",
    tone: ""
  }]);
  assert.equal(typeof runtime.openWritingModule, "function");
  assert.equal(typeof runtime.continueWritingEntry, "function");
});
