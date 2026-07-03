import assert from "node:assert/strict";
import test from "node:test";

import {
  dismissSafeOverlaysForEscape,
  dismissSafeOverlaysForNavigation
} from "../../apps/web/src/app-overlay-dismissal-controller.js";
import {
  installAppRailEventBindings
} from "../../apps/web/src/app-rail-event-bindings.js";

test("navigation closes system messages and safe graph overlays before switching modules", () => {
  const graphState = { selection: { kind: "node" }, workbenchPanelOpen: true };
  let closedSystemMessages = false;
  let rendered = false;

  const result = dismissSafeOverlaysForNavigation({
    graphState,
    isSystemMessageModalOpen: () => true,
    closeSystemMessages: () => {
      closedSystemMessages = true;
    },
    renderGraphPanel: () => {
      rendered = true;
    }
  });

  assert.equal(result.ok, true);
  assert.equal(closedSystemMessages, true);
  assert.equal(graphState.selection, null);
  assert.equal(graphState.workbenchPanelOpen, false);
  assert.equal(rendered, true);
});

test("navigation keeps unsaved graph relation input unless the user confirms", () => {
  const graphState = {
    selection: { kind: "isolated", noteId: "note-1" },
    isolatedRelationDraftByNoteId: {
      "note-1": { rationale: "This relation is still being written." }
    }
  };
  let status = "";

  const result = dismissSafeOverlaysForNavigation({
    graphState,
    confirm: () => false,
    setStatus: (message) => {
      status = message;
    }
  });

  assert.equal(result.ok, false);
  assert.equal(result.reason, "graph-unsaved-input");
  assert.deepEqual(graphState.selection, { kind: "isolated", noteId: "note-1" });
  assert.match(status, /保留建联输入/);
});

test("navigation closes empty permanent relation workspace", () => {
  const permanentRelationWorkspaceState = { open: true, rationale: "", insightQuestion: "", manualQuery: "" };
  let closed = false;

  const result = dismissSafeOverlaysForNavigation({
    permanentRelationWorkspaceState,
    closePermanentRelationWorkspace: () => {
      closed = true;
      permanentRelationWorkspaceState.open = false;
    }
  });

  assert.equal(result.ok, true);
  assert.equal(closed, true);
  assert.equal(permanentRelationWorkspaceState.open, false);
});

test("navigation closes prefilled permanent relation suggestions before the user edits them", () => {
  const permanentRelationWorkspaceState = {
    open: true,
    dirty: false,
    mode: "ai",
    selectedTargetNoteId: "note-2",
    rationale: "Suggested rationale from a candidate.",
    insightQuestion: ""
  };
  let closed = false;

  const result = dismissSafeOverlaysForNavigation({
    permanentRelationWorkspaceState,
    closePermanentRelationWorkspace: () => {
      closed = true;
      permanentRelationWorkspaceState.open = false;
    },
    confirm: () => {
      throw new Error("prefilled suggestions should not ask for confirmation");
    }
  });

  assert.equal(result.ok, true);
  assert.equal(closed, true);
  assert.equal(permanentRelationWorkspaceState.open, false);
});

test("navigation keeps unsaved permanent relation workspace input unless confirmed", () => {
  const permanentRelationWorkspaceState = {
    open: true,
    dirty: true,
    mode: "manual",
    rationale: "Still drafting this relation.",
    insightQuestion: "",
    manualQuery: "",
    selectedTargetNoteId: ""
  };
  let closed = false;
  let status = "";

  const result = dismissSafeOverlaysForNavigation({
    permanentRelationWorkspaceState,
    closePermanentRelationWorkspace: () => {
      closed = true;
    },
    confirm: () => false,
    setStatus: (message) => {
      status = message;
    }
  });

  assert.equal(result.ok, false);
  assert.equal(result.reason, "permanent-relation-unsaved-input");
  assert.equal(closed, false);
  assert.equal(permanentRelationWorkspaceState.open, true);
  assert.match(status, /保留关系工作台输入/);
});

test("navigation discards unsaved permanent relation input after explicit confirmation", () => {
  const permanentRelationWorkspaceState = {
    open: true,
    dirty: true,
    mode: "manual",
    rationale: "Discard this draft.",
    insightQuestion: "",
    manualQuery: "",
    selectedTargetNoteId: ""
  };
  let closed = false;
  let prompt = "";

  const result = dismissSafeOverlaysForNavigation({
    permanentRelationWorkspaceState,
    closePermanentRelationWorkspace: () => {
      closed = true;
      permanentRelationWorkspaceState.open = false;
      permanentRelationWorkspaceState.rationale = "";
      permanentRelationWorkspaceState.dirty = false;
    },
    confirm: (message) => {
      prompt = message;
      return true;
    }
  });

  assert.equal(result.ok, true);
  assert.equal(closed, true);
  assert.equal(permanentRelationWorkspaceState.open, false);
  assert.equal(permanentRelationWorkspaceState.rationale, "");
  assert.doesNotMatch(prompt, /保留/);
  assert.match(prompt, /放弃这些未保存输入/);
});

test("rail navigation does not activate a target module when overlay dismissal is blocked", async () => {
  let listener = null;
  const button = {
    dataset: { module: "writing" },
    addEventListener(_eventName, handler) {
      listener = handler;
    }
  };
  let activated = "";

  installAppRailEventBindings({
    documentRef: {
      querySelectorAll(selector) {
        return selector === ".rail-btn[data-module]" ? [button] : [];
      }
    },
    dismissSafeOverlaysForNavigation: () => ({ ok: false }),
    activateModule: (module) => {
      activated = module;
    }
  });

  await listener({ preventDefault() {}, stopPropagation() {} });

  assert.equal(activated, "");
});

test("escape uses the same overlay dismissal path", () => {
  const event = { prevented: false, preventDefault() { this.prevented = true; } };
  const graphState = { selection: { kind: "node" } };

  const result = dismissSafeOverlaysForEscape(event, {
    graphState,
    renderGraphPanel: () => {}
  });

  assert.equal(result.ok, true);
  assert.equal(event.prevented, true);
  assert.equal(graphState.selection, null);
});
