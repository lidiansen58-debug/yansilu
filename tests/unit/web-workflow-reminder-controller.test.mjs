import test from "node:test";
import assert from "node:assert/strict";

import {
  createWorkflowReminderController
} from "../../apps/web/src/workflow-reminder-controller.js";

function reminderHarness(overrides = {}) {
  const calls = [];
  const state = {
    notes: [{ id: "source-1", folderId: "lit" }]
  };
  const controller = createWorkflowReminderController(() => ({
    isOriginalRecordableSource: (note) => note?.folderId === "lit",
    noteHasGeneratedOriginal: (note) => Boolean(note?.generatedOriginalNoteId),
    state,
    typeFromFolder: () => "literature",
    distillationStatusOf: () => "confirmed",
    isPermanentLikeNote: (note) => note?.noteType === "permanent",
    resolveSystemMessageByDedupeKey: (key) => {
      calls.push(["resolve", key]);
      return { id: "resolved", dedupeKey: key };
    },
    upsertSystemMessage: (message) => {
      calls.push(["upsert", message.category, message.dedupeKey]);
      return message;
    },
    ...overrides
  }));
  return { calls, state, controller };
}

test("workflow reminder controller upserts source promotion reminders", () => {
  const { calls, controller } = reminderHarness();

  const message = controller.syncSourcePromotionSystemMessageForNote(
    { id: "source-1", title: "Source", body: "body", folderId: "lit" },
    { text: "can become permanent" }
  );

  assert.equal(message.category, "source-promotion");
  assert.equal(message.action, "open-note-workflow");
  assert.deepEqual(calls[0], ["upsert", "source-promotion", message.dedupeKey]);
});

test("workflow reminder controller resolves completed source promotion reminders", () => {
  const { calls, controller } = reminderHarness();

  const result = controller.syncSourcePromotionSystemMessageForNote(
    { id: "source-1", title: "Source", body: "body", folderId: "lit", generatedOriginalNoteId: "note-1" },
    null
  );

  assert.equal(result.id, "resolved");
  assert.equal(calls[0][0], "resolve");
  assert.match(calls[0][1], /source-promotion/);
});

test("workflow reminder controller upserts and resolves relation reminders", () => {
  const { calls, controller } = reminderHarness();
  const note = { id: "note-1", title: "Permanent", noteType: "permanent" };

  const actionable = controller.syncRelationNetworkSystemMessageForNote(note, {
    relationState: "loaded",
    explicitRelationCount: 0
  });
  assert.equal(actionable.category, "relation-network");
  assert.deepEqual(calls.at(-1), ["upsert", "relation-network", actionable.dedupeKey]);

  const resolved = controller.syncRelationNetworkSystemMessageForNote(note, {
    relationState: "loaded",
    explicitRelationCount: 2
  });
  assert.equal(resolved.id, "resolved");
  assert.equal(calls.at(-1)[0], "resolve");
});
