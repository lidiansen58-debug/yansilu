import test from "node:test";
import assert from "node:assert/strict";

import { createGraphRelationComposerEntry } from "../../apps/web/src/graph-relation-composer-entry.js";

test("graph relation composer entry preserves graph source and return context", () => {
  const calls = [];
  const graphState = { selection: { kind: "node", nodeId: "source-note" } };
  const open = createGraphRelationComposerEntry({
    graphState,
    editor: {
      openPermanentRelationWorkspace: (route) => {
        calls.push(route);
        return true;
      }
    }
  });

  const action = {
    dataset: {
      relationEntryNote: "source-note",
      relationEntryTarget: "target-note",
      relationEntrySource: "graph"
    },
    getAttribute(name) {
      return {
        "data-relation-entry-note": "source-note",
        "data-relation-entry-target": "target-note",
        "data-relation-entry-source": "graph"
      }[name] || "";
    }
  };

  assert.equal(open(action), true);
  assert.equal(calls[0].noteId, "source-note");
  assert.equal(calls[0].targetNoteId, "target-note");
  assert.equal(calls[0].source, "graph-node");
  assert.equal(calls[0].returnTo, "graph");
  assert.equal(calls[0].mode, "manual");
  assert.equal(graphState.selection, null);
});

test("graph relation composer entry keeps selection when composer does not open", () => {
  const graphState = { selection: { kind: "node", nodeId: "source-note" } };
  const open = createGraphRelationComposerEntry({
    graphState,
    editor: {
      openPermanentRelationWorkspace: () => false
    }
  });

  assert.equal(open({}), false);
  assert.deepEqual(graphState.selection, { kind: "node", nodeId: "source-note" });
});
