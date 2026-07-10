import test from "node:test";
import assert from "node:assert/strict";

import {
  editorRelatedNotesSummary,
  renderEditorBodyRelationActions,
  renderEditorRelatedNotesPanel
} from "../../apps/web/src/editor-related-notes-panel.js";

const notes = [
  { id: "current", title: "当前笔记" },
  { id: "target", title: "目标笔记" },
  { id: "source", title: "反向来源" },
  { id: "body-link", title: "正文提到的笔记" },
  { id: "backlink", title: "提到当前的笔记" }
];

test("editor related notes summary separates saved relations and body links", () => {
  const summary = editorRelatedNotesSummary({
    relationState: "loaded",
    notes,
    relations: {
      outgoingLinks: [
        {
          id: "rel-out",
          fromNoteId: "current",
          toNoteId: "target",
          relationType: "supports",
          rationale: "目标笔记支持当前判断。"
        },
        {
          id: "wiki-only",
          fromNoteId: "current",
          toNoteId: "body-link",
          relationType: "associated_with",
          rationale: "markdown_wikilink"
        }
      ],
      backlinks: [
        {
          id: "rel-in",
          fromNoteId: "source",
          toNoteId: "current",
          relationType: "qualifies",
          rationale: "反向来源限定当前判断。"
        }
      ]
    },
    forward: [notes[3]],
    backward: [notes[4]]
  });

  assert.equal(summary.savedCount, 2);
  assert.equal(summary.bodyLinkCount, 1);
  assert.equal(summary.linkedBodyCount, 0);
  assert.equal(summary.externalRelationCount, 2);
  assert.equal(summary.bodyRelationCount, 1);
  assert.equal(summary.totalRelationCount, 3);
  assert.deepEqual(
    summary.outgoing.map((item) => item.id),
    ["rel-out"]
  );
  assert.deepEqual(
    summary.incoming.map((item) => item.id),
    ["rel-in"]
  );
});

test("editor related notes summary does not repeat body links that already have saved relations", () => {
  const summary = editorRelatedNotesSummary({
    relationState: "loaded",
    notes,
    relations: {
      outgoingLinks: [
        {
          id: "rel-out",
          fromNoteId: "current",
          toNoteId: "body-link",
          relationType: "supports",
          rationale: "这条正文链接已经保存为关系。"
        }
      ],
      backlinks: []
    },
    forward: [notes[3]],
    backward: [notes[4]]
  });

  assert.equal(summary.savedCount, 1);
  assert.equal(summary.bodyLinkCount, 1);
  assert.equal(summary.linkedBodyCount, 1);
  assert.equal(summary.externalRelationCount, 1);
  assert.equal(summary.bodyRelationCount, 0);
  assert.equal(summary.totalRelationCount, 1);
  assert.deepEqual(summary.bodyLinks.map((note) => note.id), ["body-link"]);
  assert.equal(summary.relationMap.get("body-link").length, 1);
});

test("editor related notes panel renders body links with clear status actions", () => {
  const html = renderEditorRelatedNotesPanel({
    note: notes[0],
    relationState: "loaded",
    notes,
    relations: {
      outgoingLinks: [
        {
          id: "rel-out",
          fromNoteId: "current",
          toNoteId: "target",
          relationType: "supports",
          rationale: "目标笔记支持当前判断。"
        },
        {
          id: "wiki-only",
          fromNoteId: "current",
          toNoteId: "body-link",
          relationType: "associated_with",
          rationale: "markdown_wikilink"
        }
      ],
      backlinks: []
    },
    forward: [notes[1], notes[3]],
    backward: []
  });

  assert.match(html, /正文中提到/);
  assert.doesNotMatch(html, /已保存的关系/);
  assert.doesNotMatch(html, /已有关联/);
  assert.doesNotMatch(html, /data-editor-related-existing="target"/);
  assert.match(html, /data-permanent-relation-action="open"/);
  assert.match(html, /data-permanent-relation-target-note="body-link"/);
  assert.match(html, /目标笔记/);
  assert.match(html, /正文提到的笔记/);
});

test("editor body relation actions render existing body-link relations outside sidebar", () => {
  const html = renderEditorBodyRelationActions({
    note: notes[0],
    relationState: "loaded",
    notes,
    relations: {
      outgoingLinks: [
        {
          id: "rel-out",
          fromNoteId: "current",
          toNoteId: "target",
          relationType: "supports",
          rationale: "目标笔记支持当前判断。"
        },
        {
          id: "wiki-only",
          fromNoteId: "current",
          toNoteId: "body-link",
          relationType: "associated_with",
          rationale: "markdown_wikilink"
        }
      ],
      backlinks: []
    },
    forward: [notes[1], notes[3]],
    backward: []
  });

  assert.match(html, /data-note-main-route-action="relations"/);
  assert.match(html, /关联 2/);
  assert.doesNotMatch(html, /data-editor-related-popover-for="editor-body-related"/);
  assert.doesNotMatch(html, /data-relation-action="open-edit"/);
});

test("editor body relation action count includes body links and external relations", () => {
  const html = renderEditorBodyRelationActions({
    note: notes[0],
    relationState: "loaded",
    notes,
    relations: {
      outgoingLinks: [
        {
          id: "rel-out",
          fromNoteId: "current",
          toNoteId: "target",
          relationType: "supports",
          rationale: "目标笔记支持当前判断。"
        },
        {
          id: "wiki-only",
          fromNoteId: "current",
          toNoteId: "body-link",
          relationType: "associated_with",
          rationale: "markdown_wikilink"
        }
      ],
      backlinks: []
    },
    forward: [notes[1], notes[3]],
    backward: []
  });

  assert.match(html, /关联 2/);
});

test("editor body relation actions include incoming saved relations", () => {
  const html = renderEditorBodyRelationActions({
    note: notes[0],
    relationState: "loaded",
    notes,
    relations: {
      outgoingLinks: [],
      backlinks: [
        {
          id: "rel-in",
          fromNoteId: "source",
          toNoteId: "current",
          relationType: "qualifies",
          rationale: "反向来源限定当前判断。"
        }
      ]
    },
    forward: [],
    backward: [notes[2]]
  });

  assert.match(html, /data-note-main-route-action="relations"/);
  assert.match(html, /关联 1/);
  assert.doesNotMatch(html, /data-editor-related-popover-for="editor-body-related"/);
});

test("editor body relation action count includes body backlinks", () => {
  const summary = editorRelatedNotesSummary({
    relationState: "loaded",
    notes,
    relations: {
      outgoingLinks: [],
      backlinks: []
    },
    forward: [],
    backward: [notes[4]]
  });
  const html = renderEditorBodyRelationActions({
    note: notes[0],
    relationState: "loaded",
    notes,
    relations: {
      outgoingLinks: [],
      backlinks: []
    },
    forward: [],
    backward: [notes[4]]
  });

  assert.equal(summary.bodyLinkCount, 0);
  assert.equal(summary.allBodyLinkCount, 1);
  assert.equal(summary.bodyRelationCount, 0);
  assert.equal(summary.externalRelationCount, 0);
  assert.equal(summary.totalRelationCount, 0);
  assert.equal(html, "");
});
