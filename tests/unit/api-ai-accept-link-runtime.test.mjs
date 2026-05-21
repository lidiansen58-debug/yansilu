import test from "node:test";
import assert from "node:assert/strict";

import {
  acceptLinkAndRecordArtifactDecisionAtomically,
  createInMemoryArtifactStore
} from "../../packages/ai-orchestrator/src/index.mjs";

function createLinkArtifactFixture() {
  const artifactStore = createInMemoryArtifactStore();
  const artifact = artifactStore.createArtifact(
    {
      id: "artifact_accept_link_runtime_1",
      type: "LinkSuggestion",
      title: "Useful bridge",
      summary: "Connect the two notes.",
      body: "The notes belong together.",
      agentRunId: "run_accept_link_runtime_1",
      status: "pending_review",
      sources: { noteIds: ["note_a", "note_b"], sourceDocIds: [], artifactIds: [], externalUrls: [] },
      payload: {
        from: { kind: "note", id: "note_a" },
        to: { kind: "note", id: "note_b" },
        relationType: "related"
      }
    },
    { now: "2026-05-21T10:00:00.000Z" }
  );
  return { artifactStore, artifact };
}

test("accept-link helper records linked_to_note after creating a relation", async () => {
  const { artifactStore, artifact } = createLinkArtifactFixture();
  const relation = {
    id: "rel_accept_runtime_1",
    created: true,
    relationType: "related",
    fromNoteId: "note_a",
    toNoteId: "note_b"
  };

  const result = await acceptLinkAndRecordArtifactDecisionAtomically({
    artifactStore,
    artifactId: artifact.id,
    body: {
      userId: "user_1",
      comment: "Useful bridge."
    },
    createRelation: async () => relation,
    deleteRelation: async () => {
      throw new Error("delete should not run");
    }
  });

  assert.equal(result.relation.id, relation.id);
  assert.equal(result.artifact.status, "linked_to_note");
  assert.equal(result.artifact.userDecisions.at(-1).decision, "linked_to_note");
  assert.equal(result.artifact.userDecisions.at(-1).noteId, "note_a");
});

test("accept-link helper deletes a newly created relation when artifact decision recording fails", async () => {
  const { artifactStore, artifact } = createLinkArtifactFixture();
  const relation = {
    id: "rel_accept_runtime_rollback",
    created: true,
    relationType: "related",
    fromNoteId: "note_a",
    toNoteId: "note_b"
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
      acceptLinkAndRecordArtifactDecisionAtomically({
        artifactStore: wrappedArtifactStore,
        artifactId: artifact.id,
        body: {
          userId: "user_1",
          comment: "Useful bridge."
        },
        createRelation: async () => relation,
        deleteRelation: async (relationId) => {
          deleted.push(relationId);
          return { ok: true };
        }
      }),
    injectedError
  );

  assert.deepEqual(deleted, [relation.id]);
  const rolledBackArtifact = artifactStore.getArtifact(artifact.id);
  assert.equal(rolledBackArtifact.status, "pending_review");
  assert.deepEqual(rolledBackArtifact.userDecisions, []);
});

test("accept-link helper does not delete a pre-existing relation when artifact decision recording fails", async () => {
  const { artifactStore, artifact } = createLinkArtifactFixture();
  const relation = {
    id: "rel_accept_runtime_existing",
    created: false,
    relationType: "related",
    fromNoteId: "note_a",
    toNoteId: "note_b"
  };
  const deleted = [];
  const wrappedArtifactStore = {
    getArtifact: (...args) => artifactStore.getArtifact(...args),
    replaceArtifact: (...args) => artifactStore.replaceArtifact(...args),
    recordDecision: () => {
      throw new Error("decision write failed");
    }
  };

  await assert.rejects(
    () =>
      acceptLinkAndRecordArtifactDecisionAtomically({
        artifactStore: wrappedArtifactStore,
        artifactId: artifact.id,
        body: {
          userId: "user_1"
        },
        createRelation: async () => relation,
        deleteRelation: async (relationId) => {
          deleted.push(relationId);
          return { ok: true };
        }
      }),
    /decision write failed/
  );

  assert.deepEqual(deleted, []);
});

test("accept-link helper is idempotent when the relation already exists and the latest decision is already linked_to_note", async () => {
  const { artifactStore, artifact } = createLinkArtifactFixture();
  artifactStore.recordDecision(artifact.id, {
    decision: "linked_to_note",
    userId: "user_1",
    noteId: "note_a",
    comment: "Useful bridge."
  });
  const before = artifactStore.getArtifact(artifact.id);
  const relation = {
    id: "rel_accept_runtime_existing_linked",
    created: false,
    relationType: "related",
    fromNoteId: "note_a",
    toNoteId: "note_b"
  };
  let recordAttempts = 0;

  const result = await acceptLinkAndRecordArtifactDecisionAtomically({
    artifactStore: {
      getArtifact: (...args) => artifactStore.getArtifact(...args),
      recordDecision: (...args) => {
        recordAttempts += 1;
        return artifactStore.recordDecision(...args);
      }
    },
    artifactId: artifact.id,
    body: {
      userId: "user_1"
    },
    createRelation: async () => relation,
    deleteRelation: async () => {
      throw new Error("delete should not run");
    }
  });

  const after = artifactStore.getArtifact(artifact.id);
  assert.equal(recordAttempts, 0);
  assert.equal(result.relation.id, relation.id);
  assert.equal(result.artifact.userDecisions.length, 1);
  assert.equal(after.userDecisions.length, 1);
  assert.deepEqual(after.userDecisions, before.userDecisions);
});

test("accept-link helper does not short-circuit when the caller explicitly overrides relation endpoints", async () => {
  const { artifactStore, artifact } = createLinkArtifactFixture();
  artifactStore.recordDecision(artifact.id, {
    decision: "linked_to_note",
    userId: "user_1",
    noteId: "note_a",
    comment: "Useful bridge."
  });
  const relation = {
    id: "rel_accept_runtime_override",
    created: false,
    relationType: "related",
    fromNoteId: "note_a",
    toNoteId: "note_c"
  };
  let recordAttempts = 0;

  const result = await acceptLinkAndRecordArtifactDecisionAtomically({
    artifactStore: {
      getArtifact: (...args) => artifactStore.getArtifact(...args),
      recordDecision: (...args) => {
        recordAttempts += 1;
        return artifactStore.recordDecision(...args);
      }
    },
    artifactId: artifact.id,
    body: {
      userId: "user_1",
      toNoteId: "note_c"
    },
    createRelation: async () => relation,
    deleteRelation: async () => {
      throw new Error("delete should not run");
    }
  });

  assert.equal(recordAttempts, 1);
  assert.equal(result.relation.id, relation.id);
  assert.equal(result.artifact.userDecisions.length, 2);
});
