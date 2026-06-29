import test from "node:test";
import assert from "node:assert/strict";
import { createEditorPaneHostDeps } from "../../apps/web/src/editor-host-deps.js";

test("editor host deps collect editor elements and callbacks outside prototype shell", () => {
  const calls = [];
  const elements = new Map();
  const state = { activeTabId: "tab-1" };
  const markdownWrap = { id: "editor-wrap" };

  function node(id) {
    if (!elements.has(id)) {
      elements.set(id, {
        id,
        closest: (selector) => {
          calls.push(["closest", id, selector]);
          return markdownWrap;
        }
      });
    }
    return elements.get(id);
  }

  const deps = createEditorPaneHostDeps({
    $: node,
    state,
    desktopCommands: {
      openExternalUrl: (...args) => calls.push(["external", ...args])
    },
    editorSelectionAiActionElements: ($) => ({
      selectionAction: $("selectionAction")
    }),
    setStatus: (...args) => calls.push(["status", ...args]),
    handleStateChange: (...args) => calls.push(["state", ...args]),
    openNoteById: (...args) => calls.push(["open", ...args]),
    noteMainPathWritingContinuationEntry: (...args) => {
      calls.push(["continuation", ...args]);
      return { noteId: args[0] };
    },
    syncRelationNetworkSystemMessageForNote: (...args) => calls.push(["reminder", ...args]),
    selectPermanentDirectory: async () => "dir-1",
    currentLiteratureTemplateSectionLabels: () => ({ claim: "claim" }),
    literatureTemplateSectionLabelCandidates: () => ["claim"],
    renderStatusMeta: () => calls.push(["status-meta"]),
    renderWorkspaceStatusHint: () => calls.push(["workspace-hint"])
  });

  assert.equal(deps.state, state);
  assert.equal(deps.elements.tabs.id, "tabs");
  assert.equal(deps.elements.editorWrap, markdownWrap);
  assert.equal(deps.elements.selectionAction.id, "selectionAction");
  assert.equal(deps.elements.openExternalUrl, deps.elements.openExternalUrl);
  assert.deepEqual(deps.resolveNoteWritingContinuation({ id: "note-1" }), { noteId: "note-1" });

  deps.notifyWorkflowReminder({ kind: "relation-network", note: { id: "note-1" }, overview: { relationCount: 1 } });
  deps.notifyWorkflowReminder({ kind: "other", note: { id: "note-2" } });
  deps.onChromeChange();

  assert.deepEqual(calls.filter((call) => ["continuation", "reminder", "status-meta", "workspace-hint"].includes(call[0])), [
    ["continuation", "note-1", "当前笔记"],
    ["reminder", { id: "note-1" }, { relationCount: 1 }],
    ["status-meta"],
    ["workspace-hint"]
  ]);
});
