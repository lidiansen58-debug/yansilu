import test from "node:test";
import assert from "node:assert/strict";

import {
  aiInboxFiltersForSystemMessage,
  normalizeSystemMessage,
  systemMessageActionLabel,
  systemMessageDisplayTitle,
  systemMessagePreviewText,
  systemMessageSubjectText
} from "../../apps/web/src/prototype-system-messages.js";

test("normalizes system message routing metadata and AI review filters", () => {
  const message = normalizeSystemMessage({
    id: "sys_1",
    created_at: "2026-01-01T00:00:00.000Z",
    category: " relation-network ",
    source_note_id: " note-a ",
    target_note_id: " note-b ",
    dedupe_key: " relation:note-a ",
    resolved_at: "  ",
    artifactCount: 2,
    aiInboxFilters: { view: "accepted", type: "relation", sourceNoteId: "note-x" },
    workflowRoute: {
      focus: "graph",
      graph_selection_kind: "node",
      index_card_id: "idx_1"
    }
  });

  assert.equal(message.id, "sys_1");
  assert.equal(message.category, "relation-network");
  assert.equal(message.sourceNoteId, "note-a");
  assert.equal(message.targetNoteId, "note-b");
  assert.equal(message.dedupeKey, "relation:note-a");
  assert.equal(message.artifactCount, 2);
  assert.equal(message.aiInboxFilters.view, "pending");
  assert.equal(message.aiInboxFilters.sourceNoteId, "note-x");
  assert.equal(message.workflowRoute.focus, "graph");
  assert.equal(message.workflowRoute.graphSelectionKind, "node");
  assert.equal(message.workflowRoute.indexCardId, "idx_1");
});

test("system message display helpers stay pure and accept notes explicitly", () => {
  const notes = [{ id: "note-1", title: "Local note title" }];
  const message = {
    action: "open-ai-inbox",
    noteId: "note-1",
    title: "",
    body: "One\nTwo",
    artifactCount: 3
  };

  assert.equal(systemMessageSubjectText(message, notes), "Local note title");
  assert.equal(systemMessageDisplayTitle(message, notes), "Local note title");
  assert.equal(systemMessagePreviewText(message), "One Two");
  assert.ok(systemMessageActionLabel(message).length > 0);
  assert.equal(systemMessageActionLabel({ ...message, resolvedAt: "2026-01-01T00:00:00.000Z" }), "");
});

test("system message AI review filters default to pending global review", () => {
  assert.deepEqual(aiInboxFiltersForSystemMessage({}), {
    view: "pending",
    type: "all",
    privacyMode: "",
    sourceNoteId: "",
    limit: 50
  });

  assert.equal(
    aiInboxFiltersForSystemMessage({
      noteId: "note-1",
      aiInboxFilters: { view: "accepted", type: "writing", privacyMode: "local-only" }
    }).sourceNoteId,
    "note-1"
  );
});
