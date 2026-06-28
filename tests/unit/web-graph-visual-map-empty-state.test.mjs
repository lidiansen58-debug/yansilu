import test from "node:test";
import assert from "node:assert/strict";

import {
  graphVisualMapEmptyCopy
} from "../../apps/web/src/graph-visual-map-empty-state.js";

test("graph visual map empty state copy distinguishes focused structure and relation modes", () => {
  const focused = graphVisualMapEmptyCopy({ filterActive: true });
  assert.ok(focused.title);
  assert.ok(focused.message);

  const structure = graphVisualMapEmptyCopy({
    modeLabel: "Structure",
    relationType: "index",
    graphViewModeForRelationType: () => "structure"
  });
  assert.match(structure.title, /^Structure/);
  assert.notEqual(structure.message, focused.message);

  const relation = graphVisualMapEmptyCopy({
    modeLabel: "Argument",
    relationType: "meaningful",
    graphViewModeForRelationType: () => "argument"
  });
  assert.match(relation.title, /^Argument/);
  assert.notEqual(relation.message, structure.message);
});
