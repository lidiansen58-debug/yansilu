import test from "node:test";
import assert from "node:assert/strict";

import {
  buildThemeIndexCreatePayload,
  buildThemeIndexSuggestionFromRelationCluster,
  THEME_INDEX_MIN_NOTE_COUNT
} from "../../apps/web/src/theme-index-entry-model.js";

const notes = new Map([
  ["n1", { id: "n1", title: "关系理由", thesis: "关系理由让后续写作可追溯。" }],
  ["n2", { id: "n2", title: "边界条件", threeLineSummary: ["边界条件避免主题过顺。"] }],
  ["n3", { id: "n3", title: "写作入口", summary: "主题索引把笔记转成写作入口。" }]
]);

test("theme index suggestion captures the required topic-index fields from a relation cluster", () => {
  const suggestion = buildThemeIndexSuggestionFromRelationCluster({
    noteIds: ["n1", "n2", "n1", "n3"],
    title: "关系如何变成写作入口",
    relationCount: 3,
    noteById: (id) => notes.get(id)
  });

  assert.equal(suggestion.canCreate, true);
  assert.deepEqual(suggestion.noteIds, ["n1", "n2", "n3"]);
  assert.match(suggestion.centralQuestion, /关系如何变成写作入口/);
  assert.match(suggestion.summary, /主题问题/);
  assert.match(suggestion.summary, /下一步可以写/);
  assert.equal(suggestion.items.length, 3);
  assert.deepEqual(suggestion.items.map((item) => item.noteId), ["n1", "n2", "n3"]);
  assert.ok(suggestion.items.every((item) => /为什么重要/.test(item.rationale)));
});

test("theme index create payload is ready for index-card persistence", () => {
  const payload = buildThemeIndexCreatePayload({
    directoryId: "dir-theme",
    noteIds: ["n1", "n2", "n3"],
    title: "关系如何变成写作入口",
    noteById: (id) => notes.get(id)
  });

  assert.equal(payload.directoryId, "dir-theme");
  assert.equal(payload.indexType, "topic");
  assert.equal(payload.orderingStrategy, "clustered");
  assert.equal(payload.threeLineSummary.length, 3);
  assert.match(payload.threeLineSummary[0], /主题问题/);
  assert.match(payload.threeLineSummary[1], /关键永久笔记/);
  assert.match(payload.threeLineSummary[2], /下一步可以写/);
  assert.deepEqual(payload.noteIds, ["n1", "n2", "n3"]);
});

test("theme index suggestion requires at least three permanent notes", () => {
  const suggestion = buildThemeIndexSuggestionFromRelationCluster({
    noteIds: ["n1", "n2"],
    title: "关系如何变成写作入口",
    noteById: (id) => notes.get(id)
  });

  assert.equal(THEME_INDEX_MIN_NOTE_COUNT, 3);
  assert.equal(suggestion.canCreate, false);
});
