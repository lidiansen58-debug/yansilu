import test from "node:test";
import assert from "node:assert/strict";

import {
  graphAssociateNoteRoute,
  graphFollowupActionRoute,
  noteBrowserStateChangeRoute,
  noteMainPathRoute
} from "../../apps/web/src/note-browser-action-router.js";

test("note browser graph associate route chooses graph relation form for connected context-menu notes", () => {
  assert.deepEqual(
    graphAssociateNoteRoute({
      noteId: "pn_1",
      source: "graph-context-menu",
      module: "graph",
      needsRelationWorkflow: false
    }),
    {
      kind: "graph-open-relation-form",
      handled: true,
      noteId: "pn_1",
      relationType: "associated_with"
    }
  );
});

test("note browser graph associate route opens isolated workflow in graph and relation editor outside graph", () => {
  assert.deepEqual(
    graphAssociateNoteRoute({
      noteId: "pn_2",
      source: "graph-sidebar-associate",
      module: "graph",
      needsRelationWorkflow: true
    }),
    {
      kind: "graph-open-isolated-workflow",
      handled: true,
      noteId: "pn_2",
      activeTab: "candidates"
    }
  );

  assert.deepEqual(
    graphAssociateNoteRoute({ noteId: "pn_2", source: "explorer-browser", module: "explorer" }),
    {
      kind: "open-note-relations",
      handled: true,
      noteId: "pn_2",
      source: "explorer-browser"
    }
  );
});

test("note browser state change route describes select folder and note mutation side effects", () => {
  assert.deepEqual(noteBrowserStateChangeRoute("select-folder", {}, { module: "graph" }), {
    kind: "select-folder",
    graphMode: true,
    syncDirectory: true,
    refreshGraph: true,
    expandCurrentEditorNotePath: false
  });
  assert.equal(noteBrowserStateChangeRoute("save-note").syncExplorerBeforeRender, true);
  assert.equal(noteBrowserStateChangeRoute("note-move").updateClientState, true);
  assert.equal(noteBrowserStateChangeRoute("note-delete").remoteWhenAvailable, true);
});

test("note main path and graph followup routes classify cross-module actions", () => {
  assert.deepEqual(noteMainPathRoute({ action: "graph" }), { kind: "graph", refreshGraph: true });
  assert.equal(noteMainPathRoute({ action: "writing", mode: "distillation" }).focusDistillation, true);
  assert.equal(noteMainPathRoute({ action: "writing", mode: "project" }).createProjectWhenNeeded, true);
  assert.deepEqual(graphFollowupActionRoute("writing"), { kind: "writing", handled: true });
  assert.equal(graphFollowupActionRoute("isolate-hold").kind, "boundary-draft");
  assert.equal(graphFollowupActionRoute("strengthen").kind, "edit-relation");
});
