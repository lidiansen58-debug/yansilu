import test from "node:test";
import assert from "node:assert/strict";

import {
  createInMemoryArtifactStore,
  normalizeArtifact
} from "../../packages/ai-orchestrator/src/index.mjs";

function expectCode(fn, code) {
  assert.throws(fn, (error) => error?.code === code);
}

function createPendingArtifact(store, id = "artifact_pending_1") {
  return store.createArtifact({
    id,
    type: "LinkSuggestion",
    title: id,
    summary: "",
    body: {},
    agentRunId: "run_artifact_store_test",
    sources: { noteIds: ["pn_1"], sourceDocIds: [], artifactIds: [], externalUrls: [] }
  });
}

test("normalizeArtifact requires reviewed statuses to match the latest user decision", () => {
  expectCode(
    () =>
      normalizeArtifact({
        id: "artifact_invalid_mismatch",
        type: "LinkSuggestion",
        title: "invalid mismatch",
        status: "accepted",
        agentRunId: "run_invalid_mismatch",
        userDecisions: [{ decision: "ignored", userId: "user_1" }]
      }),
    "AI_ARTIFACT_DECISION_STATUS_MISMATCH"
  );
});

test("in-memory artifact store updateArtifact cannot forge a reviewed status without a decision", () => {
  const store = createInMemoryArtifactStore();
  createPendingArtifact(store);
  expectCode(
    () => store.updateArtifact("artifact_pending_1", { status: "accepted" }),
    "AI_ARTIFACT_REVIEW_DECISION_REQUIRED"
  );
});

test("in-memory artifact store updateArtifact cannot set a reviewed status that disagrees with the latest decision", () => {
  const store = createInMemoryArtifactStore();
  createPendingArtifact(store, "artifact_pending_2");
  store.recordDecision("artifact_pending_2", {
    decision: "ignored",
    userId: "user_1",
    createdAt: "2026-05-18T12:00:00.000Z"
  });
  expectCode(
    () => store.updateArtifact("artifact_pending_2", { status: "accepted" }),
    "AI_ARTIFACT_DECISION_STATUS_MISMATCH"
  );
});
