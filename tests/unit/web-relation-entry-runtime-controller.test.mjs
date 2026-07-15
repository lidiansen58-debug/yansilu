import test from "node:test";
import assert from "node:assert/strict";

import { createRelationEntryRuntimeController } from "../../apps/web/src/relation-entry-runtime-controller.js";

test("relation entry runtime opens note relation workspace through editor shell", () => {
  const calls = [];
  const state = {};
  const editor = {
    setInspectorVisible: (visible) => calls.push(["inspector", visible]),
    renderRelated: () => calls.push(["renderRelated"]),
    openPermanentRelationWorkspace: (options) => calls.push(["workspace", options])
  };
  const controller = createRelationEntryRuntimeController(() => ({
    state,
    editor,
    activateModule: (moduleName) => calls.push(["module", moduleName]),
    openNoteById: (noteId, options) => {
      calls.push(["openNote", noteId, options]);
      return true;
    },
    windowRef: {
      setTimeout: (callback, delay) => {
        calls.push(["timeout", delay]);
        callback();
      }
    }
  }));

  const opened = controller.openNoteRelationEditor(" pn_1 ", {
    mode: "manual",
    targetNoteId: "pn_2",
    relationType: "supports",
    rationaleDraft: "Because",
    insightQuestionDraft: "Why?"
  });

  assert.equal(opened, true);
  assert.equal(state.inspectorVisible, true);
  assert.deepEqual(calls, [
    ["module", "explorer"],
    ["openNote", "pn_1", { preferTitleSelection: false }],
    ["inspector", true],
    ["renderRelated"],
    ["timeout", 60],
    [
      "workspace",
      {
        noteId: "pn_1",
        sourceNoteId: "pn_1",
        source: "explorer-browser",
        mode: "manual",
        targetNoteId: "pn_2",
        relationType: "supports",
        rationaleDraft: "Because",
        insightQuestionDraft: "Why?"
      }
    ]
  ]);
});

test("relation entry runtime does not open workspace for missing notes", () => {
  const calls = [];
  const controller = createRelationEntryRuntimeController(() => ({
    state: {},
    editor: {
      openPermanentRelationWorkspace: () => calls.push(["workspace"])
    },
    activateModule: (moduleName) => calls.push(["module", moduleName]),
    openNoteById: () => false,
    windowRef: {
      setTimeout: (callback) => callback()
    }
  }));

  assert.equal(controller.openNoteRelationEditor("missing"), false);
  assert.deepEqual(calls, [["module", "explorer"]]);
  assert.equal(controller.openNoteRelationEditor(""), false);
});
