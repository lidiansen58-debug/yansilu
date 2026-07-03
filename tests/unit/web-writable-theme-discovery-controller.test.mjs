import test from "node:test";
import assert from "node:assert/strict";

import { createWritableThemeDiscoveryController } from "../../apps/web/src/writable-theme-discovery-controller.js";

const notes = [
  { id: "n1", title: "建议发现", tags: ["主题"], thesis: "发现只是建议。" },
  { id: "n2", title: "用户确认", tags: ["主题"], thesis: "保存需要用户确认。" },
  { id: "n3", title: "写作中心", tags: ["主题"], thesis: "确认后进入写作中心。" }
];

test("writable theme discovery controller ignores suggestions without saving", () => {
  const calls = [];
  const writingState = {};
  const controller = createWritableThemeDiscoveryController(() => ({
    writingState,
    candidateNotes: () => notes,
    relations: () => [],
    existingThemeIndexes: () => [],
    parseTags: () => [],
    renderWritingPanel: () => calls.push(["render"]),
    setStatus: (message, tone) => calls.push(["status", message, tone])
  }));

  const suggestions = controller.refreshSuggestions();
  assert.equal(suggestions.length, 1);
  assert.equal(controller.ignoreSuggestion(suggestions[0].id), true);

  assert.deepEqual(writingState.themeDiscoverySuggestions, []);
  assert.deepEqual(writingState.ignoredThemeDiscoverySuggestionKeys, [suggestions[0].key]);
  assert.equal(calls.some((call) => call[0] === "status" && /没有保存/.test(call[1])), true);
});

test("writable theme discovery controller saves only after explicit confirmation", async () => {
  const calls = [];
  const writingState = {};
  const controller = createWritableThemeDiscoveryController(() => ({
    writingState,
    candidateNotes: () => notes,
    relations: () => [
      { fromNoteId: "n1", toNoteId: "n2", relationType: "supports" },
      { fromNoteId: "n2", toNoteId: "n3", relationType: "extends" }
    ],
    existingThemeIndexes: () => [],
    parseTags: () => [],
    noteById: (id) => notes.find((note) => note.id === id),
    createIndexCard: async (payload) => {
      calls.push(["create", payload]);
      return { id: "idx-1", ...payload };
    },
    writingThemeIndexScopeDirectoryId: () => "dir-theme",
    upsertWritingThemeIndex: (card) => calls.push(["upsert", card.id]),
    setWritingSourceIndexIds: (ids) => calls.push(["source", ids]),
    setSelectedWritingThemeIndex: (id) => calls.push(["selected", id]),
    useThemeIndexAsWritingEntry: async (id, options) => calls.push(["entry", id, options]),
    openWritingModule: async (options) => calls.push(["open", options]),
    renderWritingPanel: () => calls.push(["render"]),
    setStatus: (message, tone) => calls.push(["status", message, tone])
  }));

  const [suggestion] = controller.refreshSuggestions();
  assert.equal(calls.some((call) => call[0] === "create"), false);

  const card = await controller.saveSuggestion(suggestion.id, {
    title: "确认后的主题",
    centralQuestion: "为什么建议必须确认？",
    membershipReason: "这些笔记共同说明用户确认边界。"
  });

  assert.equal(card.id, "idx-1");
  assert.equal(calls.find((call) => call[0] === "create")[1].title, "确认后的主题");
  assert.deepEqual(calls.find((call) => call[0] === "source"), ["source", ["idx-1"]]);
  assert.deepEqual(calls.find((call) => call[0] === "selected"), ["selected", "idx-1"]);
  assert.equal(calls.some((call) => call[0] === "entry" && call[2].source === "writable_theme_discovery"), true);
  assert.equal(calls.some((call) => call[0] === "open" && /可写主题建议/.test(call[1].entrySourceLabel)), true);
  assert.deepEqual(writingState.themeDiscoverySuggestions, []);
});
