import test from "node:test";
import assert from "node:assert/strict";

import {
  buildGraphVisualMapBackdropMarkup
} from "../../apps/web/src/graph-visual-map-backdrop.js";

test("graph visual map backdrop preserves meaningful groups without decorative visual fields", () => {
  const calls = [];
  const result = buildGraphVisualMapBackdropMarkup({
    graphState: { lastLoadedAt: "loaded" },
    relationType: "index",
    runtimeState: {
      activeSelection: { kind: "theme", noteIds: ["n1", "n2"], title: "Theme" },
      zoom: { key: "read" },
      layout: {
        nodes: [{ id: "n1" }, { id: "n2" }],
        width: 800,
        height: 400,
        clusterMeta: [{ id: "cluster-1" }]
      }
    }
  }, {
    graphThemeBoundaryMeta: (input) => {
      calls.push(["meta", input.noteIds, input.layoutWidth, input.layoutHeight]);
      return { title: input.title, count: input.noteIds.length };
    },
    renderGraphThemeBoundary: (meta) => `<theme title="${meta.title}" count="${meta.count}" />`,
    renderGraphStarfield: () => assert.fail("Decorative stars should not be generated"),
    renderGraphNebulaField: () => assert.fail("Decorative nebulae should not be generated"),
    renderGraphClusterGlow: (clusters) => `<clusters count="${clusters.length}" />`
  });

  assert.equal(result.themeBoundaryMarkup, '<theme title="Theme" count="2" />');
  assert.equal(result.starfieldMarkup, "");
  assert.equal(result.nebulaMarkup, "");
  assert.equal(result.clusterGlowMarkup, '<clusters count="1" />');
  assert.deepEqual(calls, [["meta", ["n1", "n2"], 800, 400]]);
});

test("graph visual map backdrop skips theme boundary without theme selection", () => {
  const result = buildGraphVisualMapBackdropMarkup({
    runtimeState: {
      activeSelection: { kind: "node", nodeId: "n1" },
      layout: { nodes: [], width: 0, height: 0, clusterMeta: [] }
    }
  }, {
    renderGraphThemeBoundary: (meta) => meta ? "<theme />" : ""
  });

  assert.equal(result.themeBoundaryMarkup, "");
});
