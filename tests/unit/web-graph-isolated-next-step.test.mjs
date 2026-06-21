import assert from "node:assert/strict";
import test from "node:test";

import {
  graphDirectNetworkEdgesForNote,
  renderGraphIsolatedNextStepActionsHtml
} from "../../apps/web/src/graph-isolated-next-step.js";

test("graph isolated next step filters direct network edges for a note", () => {
  const edges = [
    { fromNoteId: "a", toNoteId: "b", status: "confirmed" },
    { fromNoteId: "c", toNoteId: "a", status: "suggested" },
    { fromNoteId: "a", toNoteId: "d", status: "dismissed" }
  ];

  assert.deepEqual(
    graphDirectNetworkEdgesForNote("a", edges, { relationStatusCountsAsNetworkEdge: (status) => status !== "dismissed" }),
    edges.slice(0, 2)
  );
});

test("graph isolated next step renders queue and theme actions after a saved relation", () => {
  const html = renderGraphIsolatedNextStepActionsHtml(
    "a",
    {
      isolatedNotes: [{ noteId: "next" }],
      nodeMap: new Map(),
      edges: [{ fromNoteId: "a", toNoteId: "b", status: "confirmed" }]
    },
    {
      relationStatusCountsAsNetworkEdge: (status) => status === "confirmed",
      isolatedQueueItems: () => [{ noteId: "next", isolatedKey: "next-key", title: "Next Note" }],
      nextIsolatedQueueItem: (items) => items[0],
      themeCandidateNoteIdsForNode: () => ["a", "b", "c"],
      suggestThemeIndexTitle: () => "Theme Title"
    }
  );

  assert.match(html, /data-graph-select-isolated="next-key"/);
  assert.match(html, /data-graph-isolated-note="next"/);
  assert.match(html, /data-graph-theme-note-ids="a,b,c"/);
  assert.match(html, /data-graph-theme-title="Theme Title"/);
  assert.doesNotMatch(html, /disabled/);
});

test("graph isolated next step stays empty before the note has a saved network edge", () => {
  const html = renderGraphIsolatedNextStepActionsHtml("a", {
    edges: [{ fromNoteId: "a", toNoteId: "b", status: "dismissed" }]
  }, {
    relationStatusCountsAsNetworkEdge: () => false
  });

  assert.equal(html, "");
});

