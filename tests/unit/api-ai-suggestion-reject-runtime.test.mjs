import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  createInMemoryArtifactStore,
  createInMemorySuggestionStore,
  transitionSuggestionStatus
} from "../../packages/ai-orchestrator/src/index.mjs";

function extractFunctionSource(source, signature) {
  const start = source.indexOf(signature);
  assert.ok(start >= 0, `expected ${signature} to exist`);
  const parenStart = source.indexOf("(", start);
  let parenDepth = 0;
  let bodyStart = -1;
  for (let index = parenStart; index < source.length; index += 1) {
    const char = source[index];
    if (char === "(") parenDepth += 1;
    if (char === ")") {
      parenDepth -= 1;
      if (parenDepth === 0) {
        bodyStart = source.indexOf("{", index);
        break;
      }
    }
  }
  assert.ok(bodyStart >= 0, `expected ${signature} body to exist`);
  let depth = 0;
  for (let index = bodyStart; index < source.length; index += 1) {
    const char = source[index];
    if (char === "{") depth += 1;
    if (char === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(start, index + 1);
    }
  }
  throw new Error(`could not extract ${signature}`);
}

function loadRejectHelper() {
  const currentFile = fileURLToPath(import.meta.url);
  const repoRoot = path.resolve(path.dirname(currentFile), "../..");
  const source = fs.readFileSync(path.join(repoRoot, "apps/web/../api/src/server.mjs"), "utf8");
  const cleanTextSource = extractFunctionSource(source, "function cleanText(");
  const payloadSource = extractFunctionSource(source, "function payloadWithRejectedFieldSuggestion(");
  const helperSource = extractFunctionSource(source, "async function rejectSuggestionAndLinkedArtifactAtomically(");
  return new Function(`${cleanTextSource}\n${payloadSource}\n${helperSource}\nreturn rejectSuggestionAndLinkedArtifactAtomically;`)();
}

function createRejectFixture() {
  const suggestionStore = createInMemorySuggestionStore();
  const artifactStore = createInMemoryArtifactStore();
  const suggestion = suggestionStore.create(
    {
      id: "suggestion_reject_runtime_1",
      target: { type: "permanent_note", id: "pn_1", field: "thesis" },
      scope: "permanent_note_distillation",
      content: { thesis: "A rejectable AI draft." },
      sourceArtifactId: "artifact_reject_runtime_1"
    },
    { now: "2026-05-20T09:00:00.000Z" }
  );
  const artifact = artifactStore.createArtifact(
    {
      id: "artifact_reject_runtime_1",
      type: "InsightCard",
      title: "Field suggestion runtime reject",
      summary: "A linked field suggestion should reject consistently across stores.",
      body: "A rejectable AI draft.",
      agentRunId: "run_reject_runtime_1",
      status: "pending_review",
      payload: {
        fieldSuggestionId: suggestion.id,
        fieldSuggestion: {
          id: suggestion.id,
          target: { type: "permanent_note", id: "pn_1", field: "thesis" },
          content: { thesis: "A rejectable AI draft." },
          status: "suggested",
          provenance: { humanConfirmed: false, humanEdited: false }
        },
        field_suggestion: {
          id: suggestion.id,
          target: { type: "permanent_note", id: "pn_1", field: "thesis" },
          content: { thesis: "A rejectable AI draft." },
          status: "suggested",
          provenance: { humanConfirmed: false, humanEdited: false }
        }
      }
    },
    { now: "2026-05-20T09:00:00.000Z" }
  );
  const nextSuggestion = transitionSuggestionStatus(suggestion, "rejected", {
    action: "reject",
    actor: "user",
    userId: "user_1",
    comment: "Not useful enough.",
    createdAt: "2026-05-20T09:05:00.000Z"
  });
  return { suggestionStore, artifactStore, suggestion, artifact, nextSuggestion };
}

test("non-sqlite reject helper keeps suggestion and linked artifact semantics aligned", async () => {
  const rejectSuggestionAndLinkedArtifactAtomically = loadRejectHelper();
  const { suggestionStore, artifactStore, suggestion, artifact, nextSuggestion } = createRejectFixture();

  const result = await rejectSuggestionAndLinkedArtifactAtomically({
    suggestionStore,
    artifactStore,
    suggestion,
    nextSuggestion,
    sourceArtifact: artifact,
    body: {
      userId: "user_1",
      comment: "Not useful enough."
    }
  });

  assert.equal(result.item.status, "rejected");
  assert.equal(result.artifact.status, "ignored");
  assert.equal(result.artifact.payload.fieldSuggestion.status, "rejected");
  assert.equal(result.artifact.payload.field_suggestion.status, "rejected");
  assert.equal(result.artifact.userDecisions.at(-1).decision, "ignored");
  assert.equal(suggestionStore.get(suggestion.id).status, "rejected");
  assert.equal(artifactStore.getArtifact(artifact.id).status, "ignored");
});

test("non-sqlite reject helper rolls back both suggestion and artifact when decision recording fails", async () => {
  const rejectSuggestionAndLinkedArtifactAtomically = loadRejectHelper();
  const { suggestionStore, artifactStore, suggestion, artifact, nextSuggestion } = createRejectFixture();

  const injectedError = new Error("decision write failed");
  const wrappedArtifactStore = {
    getArtifact: (...args) => artifactStore.getArtifact(...args),
    updateArtifact: (...args) => artifactStore.updateArtifact(...args),
    replaceArtifact: (...args) => artifactStore.replaceArtifact(...args),
    recordDecision: (...args) => {
      artifactStore.recordDecision(...args);
      throw injectedError;
    }
  };

  await assert.rejects(
    () =>
      rejectSuggestionAndLinkedArtifactAtomically({
        suggestionStore,
        artifactStore: wrappedArtifactStore,
        suggestion,
        nextSuggestion,
        sourceArtifact: artifact,
        body: {
          userId: "user_1",
          comment: "Not useful enough."
        }
      }),
    injectedError
  );

  const rolledBackSuggestion = suggestionStore.get(suggestion.id);
  const rolledBackArtifact = artifactStore.getArtifact(artifact.id);
  assert.equal(rolledBackSuggestion.status, "suggested");
  assert.deepEqual(rolledBackSuggestion.history, []);
  assert.equal(rolledBackArtifact.status, "pending_review");
  assert.equal(rolledBackArtifact.payload.fieldSuggestion.status, "suggested");
  assert.equal(rolledBackArtifact.payload.field_suggestion.status, "suggested");
  assert.deepEqual(rolledBackArtifact.userDecisions, []);
});
