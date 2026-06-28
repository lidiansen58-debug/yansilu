import test from "node:test";
import assert from "node:assert/strict";
import {
  relationNetworkWorkflowMessageForRuntime,
  sourcePromotionWorkflowMessageForRuntime,
  syncRelationNetworkSystemMessageForRuntime,
  syncSourcePromotionSystemMessageForRuntime
} from "../../apps/web/src/system-message-workflow-sync.js";

test("system message workflow sync builds source promotion messages from injected note policy", () => {
  const message = sourcePromotionWorkflowMessageForRuntime(
    { id: "source-1", title: "Source", folderId: "lit" },
    { text: "下一步提示" },
    {
      isOriginalRecordableSource: () => true,
      noteHasGeneratedOriginal: () => false,
      state: {},
      typeFromFolder: () => "literature"
    }
  );

  assert.equal(message.category, "source-promotion");
  assert.equal(message.workflowRoute.focus, "record-permanent");
  assert.match(message.body, /下一步提示/);
});

test("system message workflow sync resolves generated source promotion reminders", () => {
  const calls = [];
  const result = syncSourcePromotionSystemMessageForRuntime(
    { id: "source-1", title: "Source" },
    null,
    {
      isOriginalRecordableSource: () => true,
      noteHasGeneratedOriginal: () => true,
      state: {},
      typeFromFolder: () => "fleeting",
      resolveSystemMessageByDedupeKey: (dedupeKey) => {
        calls.push(["resolve", dedupeKey]);
        return { id: "resolved" };
      },
      upsertSystemMessage: () => assert.fail("generated source should resolve instead of upserting")
    }
  );

  assert.deepEqual(result, { id: "resolved" });
  assert.deepEqual(calls, [["resolve", "source-promotion:source-1:record-permanent"]]);
});

test("system message workflow sync upserts actionable source promotion reminders", () => {
  const calls = [];
  const result = syncSourcePromotionSystemMessageForRuntime(
    { id: "source-1", title: "Source" },
    { text: "hint" },
    {
      isOriginalRecordableSource: () => true,
      noteHasGeneratedOriginal: () => false,
      state: {},
      typeFromFolder: () => "fleeting",
      upsertSystemMessage: (message) => {
        calls.push(["upsert", message.category, message.workflowRoute.focus]);
        return message;
      }
    }
  );

  assert.equal(result.category, "source-promotion");
  assert.deepEqual(calls, [["upsert", "source-promotion", "record-permanent"]]);
});

test("system message workflow sync builds and resolves relation network reminders", () => {
  const actionable = relationNetworkWorkflowMessageForRuntime(
    { id: "note-1", title: "Permanent" },
    { relationState: "loaded", explicitRelationCount: 0 },
    {
      distillationStatusOf: () => "confirmed",
      isPermanentLikeNote: () => true
    }
  );
  const resolvedCalls = [];
  const resolved = syncRelationNetworkSystemMessageForRuntime(
    { id: "note-1", title: "Permanent" },
    { relationState: "loaded", explicitRelationCount: 2 },
    {
      distillationStatusOf: () => "confirmed",
      isPermanentLikeNote: () => true,
      resolveSystemMessageByDedupeKey: (dedupeKey) => {
        resolvedCalls.push(["resolve", dedupeKey]);
        return { id: "resolved" };
      },
      upsertSystemMessage: () => assert.fail("connected notes should resolve relation reminder")
    }
  );

  assert.equal(actionable.category, "relation-network");
  assert.equal(actionable.workflowRoute.focus, "relations");
  assert.deepEqual(resolved, { id: "resolved" });
  assert.deepEqual(resolvedCalls, [["resolve", "relation-network:note-1:relations"]]);
});

test("system message workflow sync ignores non-actionable relation reminders", () => {
  const result = syncRelationNetworkSystemMessageForRuntime(
    { id: "note-1", title: "Draft permanent" },
    { relationState: "loaded", explicitRelationCount: 0 },
    {
      distillationStatusOf: () => "draft",
      isPermanentLikeNote: () => true,
      upsertSystemMessage: () => assert.fail("draft distillation should not upsert relation reminder")
    }
  );

  assert.equal(result, null);
});
