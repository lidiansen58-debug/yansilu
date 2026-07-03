import test from "node:test";
import assert from "node:assert/strict";

import {
  discoverWritableThemeSuggestions,
  themeDiscoverySuggestionToCreatePayload
} from "../../apps/web/src/writable-theme-discovery-model.js";

const notes = [
  { id: "n1", title: "主题发现入口", noteType: "permanent", tags: ["写作"], thesis: "可写主题需要先被建议出来。" },
  { id: "n2", title: "主题确认", noteType: "permanent", tags: ["写作"], thesis: "建议必须由用户确认后才能保存。" },
  { id: "n3", title: "主题保存", noteType: "permanent", tags: ["写作"], thesis: "确认后的建议保存为主题索引笔记。" },
  { id: "n4", title: "无关笔记", noteType: "permanent", tags: ["其他"], thesis: "这条笔记不属于同一组。" }
];

const relations = [
  { fromNoteId: "n1", toNoteId: "n2", relationType: "supports", status: "confirmed" },
  { fromNoteId: "n2", toNoteId: "n3", relationType: "extends", status: "confirmed" },
  { fromNoteId: "n1", toNoteId: "n3", relationType: "wikilink", status: "confirmed" }
];

test("writable theme discovery clusters related permanent notes as editable suggestions", () => {
  const suggestions = discoverWritableThemeSuggestions({
    notes,
    relations,
    noteById: (id) => notes.find((note) => note.id === id),
    parseTags: () => []
  });

  assert.equal(suggestions.length, 1);
  assert.deepEqual(suggestions[0].noteIds, ["n1", "n2", "n3"]);
  assert.match(suggestions[0].title, /可写主题/);
  assert.match(suggestions[0].centralQuestion, /这些永久笔记共同在回答什么问题/);
  assert.match(suggestions[0].membershipReason, /本地关系|共享/);
  assert.equal(suggestions[0].items.length, 3);
  assert.ok(suggestions[0].items.every((item) => item.rationale));
});

test("writable theme discovery dedupes existing and ignored theme suggestions", () => {
  const first = discoverWritableThemeSuggestions({
    notes,
    relations,
    existingThemeIndexes: [{ id: "idx-1", item_note_ids: ["n1", "n2", "n3"] }],
    noteById: (id) => notes.find((note) => note.id === id),
    parseTags: () => []
  });
  assert.deepEqual(first, []);

  const ignoredKey = ["n1", "n2", "n3"].join("|");
  const second = discoverWritableThemeSuggestions({
    notes,
    relations,
    ignoredSuggestionKeys: [ignoredKey],
    noteById: (id) => notes.find((note) => note.id === id),
    parseTags: () => []
  });
  assert.deepEqual(second, []);
});

test("writable theme discovery uses AI topic candidates only as title and question supplement", () => {
  const suggestions = discoverWritableThemeSuggestions({
    notes,
    relations,
    aiTopicCandidates: [{
      title: "用户确认如何保护主题质量",
      centralQuestion: "为什么自动发现只能给出建议？",
      noteIds: ["n1", "n2", "n3"],
      rationale: "AI 只补充命名和中心问题，保存仍由用户确认。"
    }],
    noteById: (id) => notes.find((note) => note.id === id),
    parseTags: () => []
  });

  assert.equal(suggestions[0].aiSupplemented, true);
  assert.equal(suggestions[0].title, "用户确认如何保护主题质量");
  assert.equal(suggestions[0].centralQuestion, "为什么自动发现只能给出建议？");
  assert.match(suggestions[0].membershipReason, /AI 只补充/);
});

test("writable theme discovery keeps local rules fast for 200 permanent notes", () => {
  const manyNotes = Array.from({ length: 200 }, (_, index) => ({
    id: `n${index}`,
    title: `Local Theme ${index}`,
    tags: [index < 4 ? "fast-theme" : `tag-${index}`],
    thesis: `Claim ${index}`
  }));
  const start = performance.now();
  const suggestions = discoverWritableThemeSuggestions({
    notes: manyNotes,
    relations: [],
    parseTags: () => []
  });
  const elapsed = performance.now() - start;

  assert.ok(elapsed < 50, `expected local discovery under 50ms, got ${elapsed}`);
  assert.equal(suggestions[0].noteIds.length, 4);
});

test("writable theme discovery create payload preserves user edits before save", () => {
  const [suggestion] = discoverWritableThemeSuggestions({
    notes,
    relations,
    noteById: (id) => notes.find((note) => note.id === id),
    parseTags: () => []
  });
  const payload = themeDiscoverySuggestionToCreatePayload(suggestion, {
    title: "Edited theme",
    centralQuestion: "Edited question?",
    membershipReason: "Edited reason.",
    items: [{ noteId: "n2", rationale: "Edited n2 reason." }]
  }, {
    directoryId: "dir-theme"
  });

  assert.equal(payload.directoryId, "dir-theme");
  assert.equal(payload.orderingStrategy, "clustered");
  assert.equal(payload.title, "Edited theme");
  assert.equal(payload.centralQuestion, "Edited question?");
  assert.match(payload.summary, /Edited reason/);
  assert.equal(payload.items.find((item) => item.noteId === "n2").rationale, "Edited n2 reason.");
});
