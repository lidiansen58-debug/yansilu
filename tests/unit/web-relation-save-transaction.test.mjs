import assert from "node:assert/strict";
import test from "node:test";

import {
  QUICK_WIKILINK_ASSOCIATION_MARKER,
  normalizeRelationSaveTransactionInput,
  relationPayloadFromTransactionInput,
  saveOrUpgradeWikilinkRelationTransaction,
  saveRelationTransaction,
  validateRelationSaveTransactionInput
} from "../../apps/web/src/relation-save-transaction.js";

const confirmableRelationTypes = new Set(["supports", "qualifies", "same_topic", "associated_with"]);
const rationaleIsActionable = (value = "") => String(value || "").trim().length >= 6;

test("relation save transaction normalizes input and validates common failures", () => {
  assert.deepEqual(normalizeRelationSaveTransactionInput({
    noteId: " source ",
    targetNoteId: " target ",
    relationType: " Supports ",
    rationale: " because ",
    insightQuestion: " next ",
    confidence: "1"
  }), {
    noteId: "source",
    targetNoteId: "target",
    relationType: "supports",
    rationale: "because",
    insightQuestion: "next",
    createdBy: "user",
    confidence: 1,
    status: "confirmed"
  });

  assert.equal(validateRelationSaveTransactionInput({ noteId: "a", targetNoteId: "a", rationale: "reason" }).reason, "self_relation");
  assert.equal(validateRelationSaveTransactionInput(
    { noteId: "a", targetNoteId: "b", relationType: "no_relation", rationale: "reason" },
    { confirmableRelationTypes, rationaleIsActionable }
  ).reason, "unsupported_type");
  assert.equal(validateRelationSaveTransactionInput(
    { noteId: "a", targetNoteId: "b", relationType: "supports", rationale: "短" },
    { confirmableRelationTypes, rationaleIsActionable }
  ).reason, "missing_rationale");
});

test("relation save transaction creates confirmed relation payload and standard result", async () => {
  let saved = null;
  const transaction = await saveRelationTransaction(
    {
      noteId: "source",
      targetNoteId: "target",
      relationType: "supports",
      rationale: "这是一句清楚理由。",
      insightQuestion: "下一步？"
    },
    {
      confirmableRelationTypes,
      rationaleIsActionable,
      createNoteRelation: async (noteId, payload) => {
        saved = { noteId, payload };
        return { id: "rel-1", created: true };
      },
      targetTitle: "Target",
      relationLabel: "支持",
      savedAt: "2026-01-01T00:00:00.000Z"
    }
  );

  assert.equal(transaction.ok, true);
  assert.deepEqual(saved, {
    noteId: "source",
    payload: {
      toNoteId: "target",
      relationType: "supports",
      rationale: "这是一句清楚理由。",
      insightQuestion: "下一步？",
      status: "confirmed",
      createdBy: "user"
    }
  });
  assert.deepEqual(transaction.result, {
    targetNoteId: "target",
    targetTitle: "Target",
    relationType: "supports",
    relationLabel: "支持",
    created: true,
    savedAt: "2026-01-01T00:00:00.000Z"
  });
});

test("relation save transaction returns validation failures before persistence", async () => {
  const calls = [];
  const transaction = await saveRelationTransaction(
    {
      noteId: "source",
      targetNoteId: "source",
      relationType: "supports",
      rationale: "clear reason"
    },
    {
      confirmableRelationTypes,
      rationaleIsActionable,
      createNoteRelation: async () => {
        calls.push("create");
        return { id: "rel-1" };
      }
    }
  );

  assert.equal(transaction.ok, false);
  assert.equal(transaction.reason, "self_relation");
  assert.deepEqual(calls, []);
});

test("relation payload keeps confidence only when provided", () => {
  assert.deepEqual(relationPayloadFromTransactionInput({
    targetNoteId: "target",
    relationType: "same_topic",
    rationale: "reason",
    insightQuestion: "",
    status: "confirmed",
    createdBy: "user",
    confidence: null
  }), {
    toNoteId: "target",
    relationType: "same_topic",
    rationale: "reason",
    insightQuestion: "",
    status: "confirmed",
    createdBy: "user"
  });
});

test("wikilink transaction upgrades existing markdown relation instead of creating a duplicate", async () => {
  const calls = [];
  const transaction = await saveOrUpgradeWikilinkRelationTransaction(
    {
      noteId: "source",
      targetNoteId: "target",
      relationType: "associated_with",
      rationale: "这是一句清楚理由。"
    },
    {
      confirmableRelationTypes,
      rationaleIsActionable,
      fetchNoteRelations: async () => ({
        outgoingLinks: [{ id: "wiki-1", toNoteId: "target", rationale: "markdown_wikilink" }]
      }),
      updateNoteRelation: async (relationId, payload) => {
        calls.push(["update", relationId, payload]);
        return { id: relationId, created: false, ...payload };
      },
      createNoteRelation: async () => {
        calls.push(["create"]);
        return { id: "new" };
      }
    }
  );

  assert.equal(transaction.ok, true);
  assert.equal(transaction.upgradedWikilink, true);
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], "update");
  assert.equal(calls[0][1], "wiki-1");
  assert.equal(calls[0][2].insightQuestion, QUICK_WIKILINK_ASSOCIATION_MARKER);
  assert.equal(calls[0][2].confidence, 1);
});

test("wikilink transaction upgrades reused markdown relation returned from create", async () => {
  const calls = [];
  const transaction = await saveOrUpgradeWikilinkRelationTransaction(
    {
      noteId: "source",
      targetNoteId: "target",
      relationType: "same_topic",
      rationale: "这是一句清楚理由。"
    },
    {
      confirmableRelationTypes,
      rationaleIsActionable,
      fetchNoteRelations: async () => ({ outgoingLinks: [] }),
      createNoteRelation: async (_noteId, payload) => {
        calls.push(["create", payload]);
        return { id: "wiki-1", created: false, rationale: "markdown_wikilink" };
      },
      updateNoteRelation: async (relationId, payload) => {
        calls.push(["update", relationId, payload]);
        return { id: relationId, created: false, ...payload };
      }
    }
  );

  assert.equal(transaction.ok, true);
  assert.equal(transaction.upgradedWikilink, true);
  assert.deepEqual(calls.map((call) => call[0]), ["create", "update"]);
});
