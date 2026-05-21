import test from "node:test";
import assert from "node:assert/strict";

import {
  createInMemoryArtifactStore,
  promoteNoteAndRecordArtifactDecisionAtomically
} from "../../packages/ai-orchestrator/src/index.mjs";

function createPromotionArtifactFixture() {
  const artifactStore = createInMemoryArtifactStore();
  const artifact = artifactStore.createArtifact(
    {
      id: "artifact_promote_runtime_1",
      type: "QuestionCard",
      title: "Draft this question",
      summary: "Turn the question into a small draft note.",
      body: "Where does the system fail under pressure?",
      agentRunId: "run_promote_runtime_1",
      status: "pending_review",
      sources: { noteIds: ["note_source"], sourceDocIds: [], artifactIds: [], externalUrls: [] },
      payload: {
        question: "Where does the system fail under pressure?"
      }
    },
    { now: "2026-05-22T09:00:00.000Z" }
  );
  return { artifactStore, artifact };
}

test("promote-note helper records promoted_to_note after creating a draft note", async () => {
  const { artifactStore, artifact } = createPromotionArtifactFixture();
  const note = {
    id: "fn_promote_runtime_1",
    noteType: "fleeting",
    status: "draft",
    title: "Draft this question"
  };

  const result = await promoteNoteAndRecordArtifactDecisionAtomically({
    artifactStore,
    artifactId: artifact.id,
    body: {
      userId: "user_1",
      comment: "Keep this as a draft question note."
    },
    createDraftNote: async () => note,
    deleteDraftNote: async () => {
      throw new Error("delete should not run");
    }
  });

  assert.equal(result.note.id, note.id);
  assert.equal(result.artifact.status, "promoted_to_note");
  assert.equal(result.artifact.userDecisions.at(-1).decision, "promoted_to_note");
  assert.equal(result.artifact.userDecisions.at(-1).noteId, note.id);
});

test("promote-note helper deletes a newly created draft note when artifact decision recording fails", async () => {
  const { artifactStore, artifact } = createPromotionArtifactFixture();
  const note = {
    id: "fn_promote_runtime_rollback",
    noteType: "fleeting",
    status: "draft",
    title: "Draft this question"
  };
  const deleted = [];
  const injectedError = new Error("decision write failed");
  const wrappedArtifactStore = {
    getArtifact: (...args) => artifactStore.getArtifact(...args),
    replaceArtifact: (...args) => artifactStore.replaceArtifact(...args),
    recordDecision: (...args) => {
      artifactStore.recordDecision(...args);
      throw injectedError;
    }
  };

  await assert.rejects(
    () =>
      promoteNoteAndRecordArtifactDecisionAtomically({
        artifactStore: wrappedArtifactStore,
        artifactId: artifact.id,
        body: {
          userId: "user_1",
          comment: "Keep this as a draft question note."
        },
        createDraftNote: async () => note,
        deleteDraftNote: async (noteId) => {
          deleted.push(noteId);
          return { deleted: true };
        }
      }),
    injectedError
  );

  assert.deepEqual(deleted, [note.id]);
  const rolledBackArtifact = artifactStore.getArtifact(artifact.id);
  assert.equal(rolledBackArtifact.status, "pending_review");
  assert.deepEqual(rolledBackArtifact.userDecisions, []);
});
