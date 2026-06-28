import test from "node:test";
import assert from "node:assert/strict";
import { yijingRichDemoPostImportPlan } from "../../apps/web/src/graph-demo-presentation-state.js";

test("Yijing rich demo startup lands in the graph after seeding", () => {
  assert.deepEqual(yijingRichDemoPostImportPlan({ startup: true }), {
    resetGraphPresentationState: true,
    refreshDirectoryGraph: true,
    activateModule: "graph",
    renderAll: false
  });
});

test("Yijing rich demo manual import stays in the current shell context", () => {
  assert.deepEqual(yijingRichDemoPostImportPlan({ startup: false }), {
    resetGraphPresentationState: false,
    refreshDirectoryGraph: true,
    activateModule: "",
    renderAll: true
  });
});
