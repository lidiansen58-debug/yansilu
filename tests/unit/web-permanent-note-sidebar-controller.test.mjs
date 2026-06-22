import assert from "node:assert/strict";
import test from "node:test";

import {
  PermanentNoteSidebarController,
  permanentRelationWorkspaceFocusSelector
} from "../../apps/web/src/permanent-note-sidebar-controller.js";
import { defaultPermanentRelationWorkspaceState } from "../../apps/web/src/permanent-relation-workspace-model.js";
import { RELATION_ENTRY_SOURCES } from "../../apps/web/src/relation-entry-route.js";

function host(overrides = {}) {
  const note = overrides.note || { id: "note-a", title: "A", noteType: "permanent" };
  const app = {
    currentSemanticRelations: overrides.currentSemanticRelations || { outgoingLinks: [], backlinks: [] },
    permanentRelationWorkspaceState: defaultPermanentRelationWorkspaceState(note.id),
    activeNote: () => note,
    setInspectorVisible: (visible) => {
      app.visible = visible;
    },
    activatePermanentWorkspaceTab: (tab) => {
      app.tab = tab;
    },
    permanentRelationWorkspaceAiCandidates: () => overrides.aiCandidates || [],
    relationCreateDefaultType: () => "supports",
    syncPermanentRelationWorkspaceOverlay: () => {
      app.synced = true;
    },
    renderRelated: (message) => {
      app.renderedMessage = message;
    },
    onStatus: (message, tone) => {
      app.statusMessage = message;
      app.statusTone = tone;
    },
    permanentRelationWorkspaceElement: () => ({
      querySelector: () => ({ focus: () => { app.focused = true; } })
    }),
    upsertApiNotes: (items) => {
      app.upserted = items;
    },
    ...overrides
  };
  return app;
}

test("permanent note sidebar controller chooses stable focus targets", () => {
  assert.equal(permanentRelationWorkspaceFocusSelector({ selectedTargetNoteId: "note-b", mode: "manual" }), '[data-permanent-relation-field="rationale"]');
  assert.equal(permanentRelationWorkspaceFocusSelector({ selectedTargetNoteId: "", mode: "manual" }), "[data-permanent-relation-target-search]");
  assert.equal(permanentRelationWorkspaceFocusSelector({ selectedTargetNoteId: "", mode: "ai" }), "[data-permanent-relation-ai-select]");
});

test("permanent note sidebar controller opens relation workspace through a route", () => {
  const originalWindow = globalThis.window;
  globalThis.window = { setTimeout: (callback) => callback() };
  try {
    const app = host();
    const controller = new PermanentNoteSidebarController(app);
    assert.equal(controller.openRelationWorkspace({ mode: "manual", targetNoteId: "note-b" }), true);

    assert.equal(app.permanentRelationWorkspaceState.open, true);
    assert.equal(app.permanentRelationWorkspaceState.mode, "manual");
    assert.equal(app.permanentRelationWorkspaceState.selectedTargetNoteId, "note-b");
    assert.equal(app.permanentRelationWorkspaceState.entryRoute.returnTo, "right-sidebar");
    assert.equal(app.permanentRelationWorkspaceState.entryRoute.source, RELATION_ENTRY_SOURCES.RIGHT_SIDEBAR);
    assert.equal(app.visible, true);
    assert.equal(app.tab, "relations");
    assert.equal(app.synced, true);
    assert.equal(app.focused, true);
  } finally {
    globalThis.window = originalWindow;
  }
});

test("permanent note sidebar controller continuation preserves the original return context", () => {
  const app = host({
    aiCandidates: [
      {
        targetNoteId: "note-c",
        relationType: "contrasts",
        rationaleDraft: "reason",
        insightQuestionDraft: "question"
      }
    ]
  });
  app.permanentRelationWorkspaceState = {
    ...defaultPermanentRelationWorkspaceState("note-a"),
    entryRoute: {
      source: RELATION_ENTRY_SOURCES.GRAPH_NODE,
      noteId: "note-a",
      targetNoteId: "old",
      relationType: "supports",
      rationaleDraft: "old",
      insightQuestionDraft: "old",
      returnTo: "graph",
      entryHint: "",
      mode: "ai",
      isolatedKey: "",
      graphSelectionKind: "isolated"
    },
    result: { targetNoteId: "old" }
  };

  new PermanentNoteSidebarController(app).continueRelationWorkspace();

  assert.equal(app.permanentRelationWorkspaceState.open, true);
  assert.equal(app.permanentRelationWorkspaceState.selectedTargetNoteId, "note-c");
  assert.equal(app.permanentRelationWorkspaceState.entryRoute.returnTo, "graph");
  assert.equal(app.permanentRelationWorkspaceState.entryRoute.graphSelectionKind, "isolated");
});

test("permanent note sidebar controller commits saved relation results in place", () => {
  const app = host();
  new PermanentNoteSidebarController(app).commitSavedRelationWorkspaceResult({
    noteId: "note-a",
    state: {
      ...defaultPermanentRelationWorkspaceState("note-a"),
      selectedTargetNoteId: "note-b",
      relationType: "supports",
      rationale: "reason"
    },
    result: {
      targetNoteId: "note-b",
      relationType: "supports",
      created: true
    },
    successMessage: "saved"
  });

  assert.equal(app.permanentRelationWorkspaceState.open, true);
  assert.equal(app.permanentRelationWorkspaceState.saveState, "saved");
  assert.equal(app.permanentRelationWorkspaceState.result.targetNoteId, "note-b");
  assert.equal(app.renderedMessage, "saved");
  assert.equal(app.statusMessage, "saved");
  assert.equal(app.statusTone, "ok");
  assert.equal(app.synced, true);
});
