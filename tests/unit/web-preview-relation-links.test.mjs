import test from "node:test";
import assert from "node:assert/strict";

import { EditorPane } from "../../apps/web/src/components-editor-pane.js";

function paneWithRelations(relations) {
  const pane = Object.create(EditorPane.prototype);
  pane.state = {
    notes: [
      { id: "note-a", title: "Note A" },
      { id: "note-b", title: "Note B" },
      { id: "note-c", title: "Note C" }
    ]
  };
  pane.semanticRelationsState = "loaded";
  pane.currentSemanticRelations = relations;
  pane.activeNote = () => ({ id: "note-a", title: "Note A" });
  return pane;
}

test("preview relation links render outgoing and incoming saved relations", () => {
  const pane = paneWithRelations({
    outgoingLinks: [
      {
        id: "rel-out",
        fromNoteId: "note-a",
        toNoteId: "note-b",
        relationType: "supports",
        rationale: "A supports B because the claim adds evidence."
      }
    ],
    backlinks: [
      {
        id: "rel-in",
        fromNoteId: "note-c",
        toNoteId: "note-a",
        relationType: "contradicts",
        rationale: "C challenges A from the other side."
      }
    ]
  });

  const html = pane.renderPreviewRelationLinks({ id: "note-a" });

  assert.match(html, /data-preview-relation-links/);
  assert.match(html, /关联到/);
  assert.match(html, /关联自/);
  assert.match(html, /Note B/);
  assert.match(html, /Note C/);
  assert.match(html, /data-open-linked-note="note-b"/);
  assert.match(html, /data-open-linked-note="note-c"/);
});

test("preview relation links skip markdown wikilink-only relations", () => {
  const pane = paneWithRelations({
    outgoingLinks: [
      {
        id: "wiki",
        fromNoteId: "note-a",
        toNoteId: "note-b",
        relationType: "associated_with",
        rationale: "markdown_wikilink"
      }
    ],
    backlinks: []
  });

  assert.equal(pane.renderPreviewRelationLinks({ id: "note-a" }), "");
});
