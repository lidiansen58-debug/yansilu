import test from "node:test";
import assert from "node:assert/strict";

import {
  createAgentRegistry,
  createAiHarness,
  createContextPack,
  createMockProviderAdapter
} from "../../packages/ai-orchestrator/src/index.mjs";

test("mock harness creates a reflection artifact and run log without note mutation", async () => {
  const harness = createAiHarness();

  const result = await harness.runTask({
    taskId: "task_reflect",
    currentNote: {
      id: "note_1",
      title: "A draft idea",
      body: "I keep returning to the difference between collecting notes and forming judgment."
    }
  });

  assert.equal(result.run.status, "succeeded");
  assert.equal(result.artifacts.length, 1);
  assert.equal(result.artifacts[0].type, "ReflectionPrompt");
  assert.equal(result.artifacts[0].status, "pending_review");
  assert.equal(result.artifacts[0].sources.noteIds[0], "note_1");
  assert.deepEqual(result.run.artifactIds, [result.artifacts[0].id]);
  assert.ok(result.run.events.some((event) => event.eventType === "model_call"));
  assert.ok(result.run.events.some((event) => event.eventType === "artifact_created"));
});

test("local_only context blocks cloud mock provider before model call", async () => {
  const provider = createMockProviderAdapter({ localExecution: false });
  const harness = createAiHarness({ providerAdapter: provider });
  const contextPack = createContextPack({
    taskId: "task_private",
    privacyMode: "local_only",
    items: [
      {
        kind: "note",
        sourceId: "note_private",
        title: "Private note",
        content: "Sensitive local-only content."
      }
    ]
  });

  const result = await harness.runTask({
    taskId: "task_private",
    contextPack
  });

  assert.equal(result.run.status, "failed");
  assert.equal(provider.callCount, 0);
  assert.equal(result.run.error.errorType, "AI_PRIVACY_CLOUD_PROVIDER_BLOCKED");
  assert.deepEqual(result.artifacts, []);
});

test("invalid provider artifact output fails safely", async () => {
  const provider = createMockProviderAdapter({
    responses: [
      {
        status: "succeeded",
        providerId: "mock_provider",
        modelRef: "mock_provider:bad-output",
        output: {
          type: "json",
          json: {
            artifacts: [{ type: "UnknownArtifact", title: "Bad artifact" }]
          }
        }
      }
    ]
  });
  const harness = createAiHarness({ providerAdapter: provider });

  const result = await harness.runTask({
    taskId: "task_bad_artifact",
    currentNote: { id: "note_1", title: "Note", body: "Body" }
  });

  assert.equal(result.run.status, "failed");
  assert.equal(result.run.error.errorType, "AI_ARTIFACT_TYPE_INVALID");
  assert.deepEqual(result.artifacts, []);
});

test("agent registry rejects write_human_note in MVP", () => {
  assert.throws(
    () =>
      createAgentRegistry([
        {
          agentId: "unsafe_agent",
          allowedTools: ["write_human_note"],
          canWriteHumanNote: true
        }
      ]),
    { code: "AI_AGENT_WRITE_HUMAN_NOTE_FORBIDDEN" }
  );
});
