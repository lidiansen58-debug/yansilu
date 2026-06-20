import assert from "node:assert/strict";
import test from "node:test";

import {
  graphConnectedNoteIdsForNote,
  graphFullNoteByIdFromSources,
  graphIsolatedPreviewTargetForNote,
  graphLocalRelationCandidatesForNote,
  graphManualRelationTargetsForNote,
  graphNotePreviewTextForLocalRelation,
  graphNoteTagsForLocalRelation,
  graphTitleCharacterOverlap
} from "../../apps/web/src/graph-local-relations.js";

const countsNetworkEdge = (status = "") => ["suggested", "draft", "confirmed"].includes(String(status || "confirmed").trim().toLowerCase());

test("graph local relations extract tags and title overlap", () => {
  assert.deepEqual(graphNoteTagsForLocalRelation({ tags: ["AI", "AI", "Graph"] }), ["AI", "Graph"]);
  assert.deepEqual(graphNoteTagsForLocalRelation({ body: "#AI text #Graph" }, { parseTags: () => ["AI", "Graph"] }), ["AI", "Graph"]);
  assert.equal(graphTitleCharacterOverlap("Graph AI", "AI Graph"), 1);
  assert.equal(graphTitleCharacterOverlap("", "AI"), 0);
});

test("graph local relation candidates rank shared tags and exclude existing edges", () => {
  const nodeMap = new Map([
    ["source", { id: "source", title: "AI graph", tags: ["AI", "Graph"] }],
    ["shared", { id: "shared", title: "Different title", tags: ["AI"] }],
    ["title", { id: "title", title: "AI graph note", tags: [] }],
    ["literature", { id: "literature", title: "AI graph literature", noteType: "literature", tags: ["AI", "Graph"] }],
    ["fleeting", { id: "fleeting", title: "AI graph fleeting", noteType: "fleeting", tags: ["AI", "Graph"] }],
    ["connected", { id: "connected", title: "AI graph connected", tags: ["AI"] }]
  ]);

  const candidates = graphLocalRelationCandidatesForNote(
    "source",
    {
      nodeMap,
      edges: [{ fromNoteId: "source", toNoteId: "connected", status: "confirmed" }],
      limit: 5
    },
    {
      relationStatusCountsAsNetworkEdge: countsNetworkEdge,
      noteTags: (note) => (Array.isArray(note.tags) ? note.tags : []),
      relationTypeLabel: (type) => (type === "same_topic" ? "同主题" : "相关")
    }
  );

  assert.deepEqual(candidates.map((candidate) => candidate.targetNoteId), ["shared", "title"]);
  assert.equal(candidates[0].relationType, "same_topic");
  assert.match(candidates[0].evidenceText, /#AI/);
});

test("graph manual relation targets include permanent-like notes and exclude connected targets", () => {
  const nodeMap = new Map([
    ["source", { id: "source", title: "Source", noteType: "permanent" }],
    ["outside", { id: "outside", title: "Outside Hub", noteType: "permanent" }],
    ["original", { id: "original", title: "Original Note", noteType: "original" }],
    ["literature", { id: "literature", title: "Literature Note", noteType: "literature" }],
    ["connected", { id: "connected", title: "Already Connected", noteType: "permanent" }]
  ]);

  const targets = graphManualRelationTargetsForNote(
    "source",
    {
      nodeMap,
      edges: [{ fromNoteId: "source", toNoteId: "connected", status: "confirmed" }]
    },
    { relationStatusCountsAsNetworkEdge: countsNetworkEdge }
  );

  assert.deepEqual(targets.map((item) => item.id).sort(), ["original", "outside"]);
});

test("graph local relation helpers merge graph nodes with loaded notes", () => {
  const full = graphFullNoteByIdFromSources("target", {
    nodeMap: new Map([["target", { id: "target", title: "Graph title", summary: "Graph summary" }]]),
    notes: [{ id: "target", title: "Loaded title", body: "Loaded body" }]
  });

  assert.equal(full.title, "Loaded title");
  assert.equal(full.summary, "Graph summary");
  assert.equal(full.body, "Loaded body");
  assert.equal(graphFullNoteByIdFromSources("missing", { nodeMap: new Map(), notes: [] }), null);
});

test("graph isolated preview target resolves preferred or remembered target", () => {
  const nodeMap = new Map([
    ["target", { id: "target", title: "Target", noteType: "permanent", tags: ["AI"], summary: "Preview summary" }]
  ]);

  const preview = graphIsolatedPreviewTargetForNote(
    "source",
    {
      nodeMap,
      previewTargetByNoteId: { source: "target" },
      notes: []
    },
    {
      nodeTitle: (map, noteId) => map.get(noteId)?.title || noteId,
      noteTypeLabel: () => "永久笔记",
      noteTags: (note) => note.tags || []
    }
  );

  assert.deepEqual(preview, {
    id: "target",
    title: "Target",
    type: "永久笔记",
    text: "Preview summary",
    tags: ["AI"]
  });
});

test("graph note preview text cleans markdown and truncates long notes", () => {
  assert.equal(graphNotePreviewTextForLocalRelation({}), "这条笔记还没有可预览的正文摘要。");
  assert.equal(graphNotePreviewTextForLocalRelation({ body: "## Title\n**Important**" }), "Title Important");
  assert.equal(graphNotePreviewTextForLocalRelation({ body: "x".repeat(140) }).length, 123);
});

test("graph connected note ids honor relation status policy", () => {
  const ids = graphConnectedNoteIdsForNote(
    "source",
    [
      { fromNoteId: "source", toNoteId: "draft", status: "draft" },
      { fromNoteId: "source", toNoteId: "archived", status: "archived" }
    ],
    { relationStatusCountsAsNetworkEdge: countsNetworkEdge }
  );

  assert.deepEqual([...ids], ["draft"]);
});
