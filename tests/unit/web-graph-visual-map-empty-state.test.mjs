import test from "node:test";
import assert from "node:assert/strict";

import {
  graphVisualMapEmptyCopy
} from "../../apps/web/src/graph-visual-map-empty-state.js";

test("graph visual map empty state copy distinguishes focused structure and relation modes", () => {
  const focused = graphVisualMapEmptyCopy({ filterActive: true });
  assert.equal(focused.title, "这条笔记周围暂时没有可见关系");
  assert.match(focused.message, /全部关系/);

  const structure = graphVisualMapEmptyCopy({
    modeLabel: "主题分布",
    relationType: "index",
    graphViewModeForRelationType: () => "structure"
  });
  assert.match(structure.title, /^主题分布/);
  assert.match(structure.message, /关系图/);
  assert.notEqual(structure.message, focused.message);

  const relation = graphVisualMapEmptyCopy({
    modeLabel: "关系图",
    relationType: "meaningful",
    graphViewModeForRelationType: () => "argument"
  });
  assert.match(relation.title, /^关系图/);
  assert.match(relation.message, /待关联笔记/);
  assert.notEqual(relation.message, structure.message);
});
