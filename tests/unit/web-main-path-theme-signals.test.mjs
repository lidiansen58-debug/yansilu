import test from "node:test";
import assert from "node:assert/strict";

import { EditorPane } from "../../apps/web/src/components-editor-pane.js";
import { createInitialState } from "../../apps/web/src/prototype-store.js";

function createPane() {
  return Object.create(EditorPane.prototype);
}

test("theme signal summary prefers explicit relations over weaker signals", () => {
  const pane = createPane();
  const result = pane.noteThemeSignalSummaryV2(
    {},
    {
      relationState: "loaded",
      explicitRelationCount: 2,
      wikilinkCount: 1,
      tagRelatedCount: 1,
      themeSignalCount: 3
    }
  );

  assert.match(result.status, /已连入/);
});

test("theme signal summary distinguishes link-only signals", () => {
  const pane = createPane();
  const result = pane.noteThemeSignalSummaryV2(
    {},
    {
      relationState: "loaded",
      explicitRelationCount: 0,
      wikilinkCount: 2,
      tagRelatedCount: 0,
      themeSignalCount: 2
    }
  );

  assert.match(result.status, /正文链接/);
});

test("theme signal summary distinguishes tag-only signals", () => {
  const pane = createPane();
  const result = pane.noteThemeSignalSummaryV2(
    {},
    {
      relationState: "loaded",
      explicitRelationCount: 0,
      wikilinkCount: 0,
      tagRelatedCount: 3,
      themeSignalCount: 3
    }
  );

  assert.match(result.status, /同标签/);
});

test("theme signal summary distinguishes mixed weak signals from single-source hints", () => {
  const pane = createPane();
  const result = pane.noteThemeSignalSummaryV2(
    {},
    {
      relationState: "loaded",
      explicitRelationCount: 0,
      wikilinkCount: 1,
      tagRelatedCount: 2,
      themeSignalCount: 3
    }
  );

  assert.match(result.status, /正文链接和同标签/);
  assert.doesNotMatch(result.status, /主题线索/);
});

test("main-path local relation signals fall back to parsing body tags on neighboring notes", () => {
  const pane = createPane();
  const state = createInitialState();
  state.notes = [
    {
      id: "n-source",
      folderId: "dir_original_default",
      body: "# Source\n\n#product-judgment",
      tags: []
    },
    {
      id: "n-neighbor",
      folderId: "dir_original_default",
      body: "# Neighbor\n\n#product-judgment",
      tags: []
    }
  ];
  pane.state = state;

  const signals = pane.buildLocalRelationSignals(
    { id: "n-source", folderId: "dir_original_default" },
    { body: "# Source\n\n#product-judgment" }
  );

  assert.deepEqual(
    signals.tagRelated.map((note) => note.id),
    ["n-neighbor"]
  );
});
