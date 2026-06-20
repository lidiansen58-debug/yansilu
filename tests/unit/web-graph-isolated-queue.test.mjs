import assert from "node:assert/strict";
import test from "node:test";

import {
  graphComputedIsolatedNotesForGraph,
  graphIsolatedQueueItemsForGraph,
  graphIsolatedSelectionKeyForItem,
  graphMarkIsolatedNodesForGraph,
  graphNextIsolatedQueueItem,
  graphNoteIdFromIsolatedItem
} from "../../apps/web/src/graph-isolated-queue.js";

test("graph isolated notes exclude nodes connected by network-counting relations", () => {
  const isolated = graphComputedIsolatedNotesForGraph(
    [
      { id: "a", title: "A" },
      { id: "b", title: "B" },
      { id: "c", title: "C" }
    ],
    [
      { fromNoteId: "a", toNoteId: "b", status: "confirmed" },
      { fromNoteId: "b", toNoteId: "c", status: "archived" }
    ],
    [{ noteId: "c", thesis: "AI meta survives." }],
    { relationStatusCountsAsNetworkEdge: (status) => status !== "archived" }
  );

  assert.deepEqual(isolated.map((note) => [note.noteId, note.title, note.thesis]), [
    ["c", "C", "AI meta survives."]
  ]);
});

test("graph isolated nodes are marked with stable selection keys and decision tone", () => {
  const nodes = graphMarkIsolatedNodesForGraph(
    [{ id: "a", title: "A" }, { id: "b", title: "B" }],
    [{ noteId: "b", title: "B isolated" }],
    {
      decisionMeta: () => ({ tone: "bridge" })
    }
  );

  assert.equal(nodes[0].graphVisualState, undefined);
  assert.equal(nodes[1].graphVisualState, "isolated");
  assert.equal(nodes[1].isolatedKey, "b");
  assert.equal(nodes[1].isolatedDecisionTone, "bridge");
});

test("graph isolated queue prioritizes candidates and keeps current item visible", () => {
  const nodeMap = new Map([
    ["plain", { id: "plain", title: "Plain" }],
    ["local", { id: "local", title: "Local" }],
    ["ai", { id: "ai", title: "AI" }],
    ["current", { id: "current", title: "Current" }]
  ]);
  const items = graphIsolatedQueueItemsForGraph({
    isolatedNotes: [
      { noteId: "plain" },
      { noteId: "local" },
      { noteId: "ai" },
      { noteId: "current" }
    ],
    nodeMap,
    currentNoteId: "current",
    limit: 2,
    fullNoteById: (id, map) => map.get(id),
    decisionMeta: (item) => ({ tone: item.noteId === "current" ? "rewrite" : "" }),
    aiRelationCandidatesForNote: (id) => (id === "ai" ? [{ targetTitle: "Target" }] : []),
    localRelationCandidatesForNote: (id) => (id === "local" ? [{ targetTitle: "Target" }] : [])
  });

  assert.deepEqual(items.map((item) => item.noteId), ["ai", "current"]);
  assert.equal(items[0].aiCount, 1);
  assert.equal(items[1].current, true);
});

test("graph isolated queue removes notes with saved dispositions", () => {
  const items = graphIsolatedQueueItemsForGraph({
    isolatedNotes: [{ noteId: "skip" }, { noteId: "keep" }],
    nodeMap: new Map([
      ["skip", { id: "skip", saved: true }],
      ["keep", { id: "keep" }]
    ]),
    fullNoteById: (id, map) => map.get(id),
    noteHasSavedIsolationDisposition: (note) => note.saved === true
  });

  assert.deepEqual(items.map((item) => item.noteId), ["keep"]);
});

test("graph isolated queue next item wraps after the current note", () => {
  const queue = [{ noteId: "a" }, { noteId: "b" }];
  assert.deepEqual(graphNextIsolatedQueueItem(queue, "a"), { noteId: "b" });
  assert.deepEqual(graphNextIsolatedQueueItem(queue, "b"), { noteId: "a" });
  assert.deepEqual(graphNextIsolatedQueueItem(queue, "missing"), { noteId: "a" });
  assert.equal(graphNextIsolatedQueueItem([], "a"), null);
});

test("graph isolated note id and selection key helpers normalize common shapes", () => {
  assert.equal(graphNoteIdFromIsolatedItem({ id: " note-a " }), "note-a");
  assert.equal(graphIsolatedSelectionKeyForItem({ title: "Only title" }, 3), "Only title");
  assert.equal(graphIsolatedSelectionKeyForItem({}, 3), "3");
});
