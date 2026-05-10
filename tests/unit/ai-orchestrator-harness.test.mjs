import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  createAgentRegistry,
  createAiHarness,
  createAiInbox,
  createCoreNoteTools,
  createInMemoryArtifactStore,
  createContextPack,
  createMockProviderAdapter,
  createSqliteArtifactStore,
  createToolRegistry
} from "../../packages/ai-orchestrator/src/index.mjs";
import {
  createNoteInDirectory,
  initVault,
  listDirectories
} from "../../packages/domain/src/index.mjs";

async function hasNodeSqlite() {
  try {
    await import("node:sqlite");
    return true;
  } catch {
    return false;
  }
}

async function makeTempVault() {
  return fs.mkdtemp(path.join(os.tmpdir(), "yansilu-ai-orchestrator-"));
}

async function createOriginalNote(vaultPath, input = {}) {
  const directories = await listDirectories(vaultPath);
  const originalDirectory = directories.find((item) => item.directoryType === "original_default");
  return createNoteInDirectory(vaultPath, {
    directoryId: originalDirectory.id,
    ...input
  });
}

test("mock harness creates a reflection artifact and run log without note mutation", async () => {
  const provider = createMockProviderAdapter();
  const harness = createAiHarness({ providerAdapter: provider });

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
  assert.ok(result.run.events.some((event) => event.eventType === "prompt_prepared"));
  assert.ok(result.run.events.some((event) => event.eventType === "artifact_created"));
  assert.ok(result.run.events.some((event) => event.eventType === "artifacts_stored"));
  assert.equal(harness.artifactStore.getArtifact(result.artifacts[0].id).id, result.artifacts[0].id);
  assert.equal(harness.artifactStore.listArtifacts({ agentRunId: result.run.agentRunId }).length, 1);
  assert.equal(harness.artifactStore.listArtifacts({ sourceNoteId: "note_1" }).length, 1);
  assert.equal(harness.artifactInbox.listItems({ view: "pending" }).length, 1);
  assert.equal(harness.artifactInbox.listItems({ view: "pending" })[0].artifactId, result.artifacts[0].id);
  assert.equal(provider.lastRequest.messages.length, 3);
  assert.match(provider.lastRequest.messages[0].content, /Human-authored notes are the user's source of truth/);
});

test("artifact store records review decisions without mutating source notes", () => {
  const store = createInMemoryArtifactStore();
  const artifact = store.createArtifact({
    type: "ReflectionPrompt",
    title: "Reviewable question",
    agentRunId: "run_review",
    contextPackId: "ctx_review",
    sources: {
      noteIds: ["note_review"],
      sourceDocIds: [],
      artifactIds: [],
      externalUrls: []
    }
  });

  const updated = store.recordDecision(artifact.id, {
    decision: "accepted",
    userId: "user_1",
    noteId: "note_review",
    comment: "Useful prompt."
  });

  assert.equal(updated.status, "accepted");
  assert.equal(updated.provenance.humanAccepted, true);
  assert.equal(updated.userDecisions.length, 1);
  assert.deepEqual(updated.sources.noteIds, ["note_review"]);
  assert.equal(store.listArtifacts({ status: "accepted" }).length, 1);
});

test("AI inbox groups artifacts into pending reviewed and archived views", () => {
  const store = createInMemoryArtifactStore();
  const pending = store.createArtifact({
    type: "ReflectionPrompt",
    title: "Pending prompt",
    agentRunId: "run_inbox",
    sources: { noteIds: ["note_a"], sourceDocIds: [], artifactIds: [], externalUrls: [] }
  });
  const reviewed = store.createArtifact({
    type: "LinkSuggestion",
    title: "Reviewed link",
    agentRunId: "run_inbox",
    sources: { noteIds: ["note_b"], sourceDocIds: [], artifactIds: [], externalUrls: [] }
  });
  const archived = store.createArtifact({
    type: "QuestionCard",
    title: "Archived question",
    agentRunId: "run_inbox",
    sources: { noteIds: ["note_a"], sourceDocIds: [], artifactIds: [], externalUrls: [] }
  });
  store.recordDecision(reviewed.id, { decision: "accepted", userId: "user_1" });
  store.recordDecision(archived.id, { decision: "archived", userId: "user_1" });
  const inbox = createAiInbox({ artifactStore: store });

  assert.deepEqual(inbox.listItems({ view: "pending" }).map((item) => item.artifactId), [pending.id]);
  assert.deepEqual(inbox.listItems({ view: "reviewed" }).map((item) => item.artifactId), [reviewed.id]);
  assert.deepEqual(inbox.listItems({ view: "archived" }).map((item) => item.artifactId), [archived.id]);
  assert.equal(inbox.listItems({ view: "all", sourceNoteId: "note_a" }).length, 2);
  assert.deepEqual(inbox.counts(), { pending: 1, reviewed: 1, archived: 1, all: 3 });
  assert.equal(inbox.getItem(reviewed.id).latestDecision.decision, "accepted");
});

test("sqlite artifact store persists artifacts decisions and inbox views", async (t) => {
  if (!(await hasNodeSqlite())) {
    t.skip("node:sqlite is not available in current runtime");
    return;
  }

  const vaultPath = await makeTempVault();
  let store = await createSqliteArtifactStore({ vaultPath });
  const artifact = store.createArtifact({
    id: "artifact_sqlite_1",
    type: "ReflectionPrompt",
    title: "Persistent prompt",
    summary: "Stored outside human-authored notes.",
    agentRunId: "run_sqlite",
    contextPackId: "ctx_sqlite",
    sources: { noteIds: ["note_sqlite"], sourceDocIds: [], artifactIds: [], externalUrls: [] },
    payload: { prompt: "What should be tested next?" }
  });
  const updated = store.recordDecision(artifact.id, {
    decision: "accepted",
    userId: "user_1",
    noteId: "note_sqlite",
    comment: "Keep this."
  });
  const inbox = createAiInbox({ artifactStore: store });

  assert.equal(updated.status, "accepted");
  assert.equal(inbox.counts().reviewed, 1);
  assert.equal(inbox.listItems({ view: "reviewed", sourceNoteId: "note_sqlite" })[0].artifactId, artifact.id);

  store.close();
  store = await createSqliteArtifactStore({ vaultPath });
  const persisted = store.getArtifact(artifact.id);

  assert.equal(persisted.status, "accepted");
  assert.equal(persisted.payload.prompt, "What should be tested next?");
  assert.equal(persisted.userDecisions.length, 1);
  assert.equal(persisted.userDecisions[0].decision, "accepted");
  assert.equal(store.listArtifacts({ sourceNoteId: "note_sqlite" }).length, 1);
  store.close();
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

test("tool registry blocks network tools for local_only privacy", async () => {
  const registry = createToolRegistry([
    {
      name: "fetch_external_source",
      permissionLevel: "read_source",
      dataBoundary: "external",
      requiresNetwork: true,
      async handler() {
        return { ok: true };
      }
    }
  ]);

  const result = await registry.call("fetch_external_source", {}, { privacyMode: "local_only" });

  assert.equal(result.status, "failed");
  assert.equal(result.error.errorType, "AI_TOOL_PRIVACY_BLOCKED");
});

test("harness can build context through read_note core tool", async (t) => {
  if (!(await hasNodeSqlite())) {
    t.skip("node:sqlite is not available in current runtime");
    return;
  }

  const vaultPath = await makeTempVault();
  await initVault(vaultPath);
  const directories = await listDirectories(vaultPath);
  const originalDirectory = directories.find((item) => item.directoryType === "original_default");
  const note = await createNoteInDirectory(vaultPath, {
    directoryId: originalDirectory.id,
    title: "Tool context note",
    body: "Tool context note\n\nThis note should be read through the AI tool boundary."
  });

  const harness = createAiHarness({
    tools: createCoreNoteTools({ vaultPath })
  });

  const result = await harness.runTask({
    taskId: "task_tool_context",
    noteId: note.id
  });

  assert.equal(result.run.status, "succeeded");
  assert.equal(result.contextPack.items[0].sourceId, note.id);
  assert.equal(result.artifacts[0].sources.noteIds[0], note.id);
  assert.ok(result.run.events.some((event) => event.eventType === "tool_call"));
});

test("background sensitive run cannot read full note through tool boundary", async (t) => {
  if (!(await hasNodeSqlite())) {
    t.skip("node:sqlite is not available in current runtime");
    return;
  }

  const vaultPath = await makeTempVault();
  await initVault(vaultPath);
  const directories = await listDirectories(vaultPath);
  const originalDirectory = directories.find((item) => item.directoryType === "original_default");
  const note = await createNoteInDirectory(vaultPath, {
    directoryId: originalDirectory.id,
    title: "Private background note",
    body: "Private background note\n\nThis note should require foreground approval."
  });
  const provider = createMockProviderAdapter();
  const harness = createAiHarness({
    providerAdapter: provider,
    tools: createCoreNoteTools({ vaultPath })
  });

  const result = await harness.runTask({
    taskId: "task_background_sensitive",
    trigger: "scheduled",
    privacyMode: "private_project",
    noteId: note.id
  });

  assert.equal(result.run.status, "failed");
  assert.equal(result.run.error.errorType, "AI_TOOL_BACKGROUND_READ_NOTE_BLOCKED");
  assert.equal(provider.callCount, 0);
});

test("search_notes core tool finds note content without mutating notes", async (t) => {
  if (!(await hasNodeSqlite())) {
    t.skip("node:sqlite is not available in current runtime");
    return;
  }

  const vaultPath = await makeTempVault();
  await initVault(vaultPath);
  const directories = await listDirectories(vaultPath);
  const originalDirectory = directories.find((item) => item.directoryType === "original_default");
  const target = await createNoteInDirectory(vaultPath, {
    directoryId: originalDirectory.id,
    title: "Retrieval target",
    body: "Retrieval target\n\nThis note contains the bridge concept for agent retrieval."
  });
  await createNoteInDirectory(vaultPath, {
    directoryId: originalDirectory.id,
    title: "Unrelated note",
    body: "Unrelated note\n\nThis one should not be returned for the query."
  });
  const registry = createToolRegistry(createCoreNoteTools({ vaultPath }));

  const result = await registry.call("search_notes", { query: "bridge concept", limit: 5 }, { privacyMode: "normal" });

  assert.equal(result.status, "succeeded");
  assert.equal(result.output.total, 1);
  assert.equal(result.output.results[0].noteId, target.id);
  assert.equal(result.output.results[0].matchedReason, "body");
});

test("harness builds bounded context pack from selected note ids", async (t) => {
  if (!(await hasNodeSqlite())) {
    t.skip("node:sqlite is not available in current runtime");
    return;
  }

  const vaultPath = await makeTempVault();
  await initVault(vaultPath);
  const first = await createOriginalNote(vaultPath, {
    title: "Selected context one",
    body: "Selected context one\n\nThe first selected note is included."
  });
  const second = await createOriginalNote(vaultPath, {
    title: "Selected context two",
    body: "Selected context two\n\nThe second selected note is included."
  });
  const omitted = await createOriginalNote(vaultPath, {
    title: "Selected context three",
    body: "Selected context three\n\nThis note should be omitted by the max context limit."
  });
  const harness = createAiHarness({
    tools: createCoreNoteTools({ vaultPath })
  });

  const result = await harness.runTask({
    taskId: "task_selected_notes",
    noteIds: [first.id, second.id, omitted.id],
    maxContextNotes: 2
  });

  assert.equal(result.run.status, "succeeded");
  assert.deepEqual(
    result.contextPack.items.map((item) => item.sourceId).sort(),
    [first.id, second.id].sort()
  );
  assert.equal(result.contextPack.omitted.length, 1);
  assert.equal(result.contextPack.omitted[0].sourceId, omitted.id);
  assert.equal(result.run.events.filter((event) => event.eventType === "tool_call").length, 2);
});

test("harness builds connection context through search_notes then read_note", async (t) => {
  if (!(await hasNodeSqlite())) {
    t.skip("node:sqlite is not available in current runtime");
    return;
  }

  const vaultPath = await makeTempVault();
  await initVault(vaultPath);
  const first = await createOriginalNote(vaultPath, {
    title: "Bridge concept alpha",
    body: "Bridge concept alpha\n\nThis note mentions the bridge concept for relation discovery."
  });
  const second = await createOriginalNote(vaultPath, {
    title: "Bridge concept beta",
    body: "Bridge concept beta\n\nAnother note uses the bridge concept from a different angle."
  });
  await createOriginalNote(vaultPath, {
    title: "Unmatched context",
    body: "Unmatched context\n\nThis one should not join the connection context."
  });
  const provider = createMockProviderAdapter();
  const harness = createAiHarness({
    providerAdapter: provider,
    tools: createCoreNoteTools({ vaultPath })
  });

  const result = await harness.runTask({
    taskId: "task_search_context",
    agentId: "connection_agent",
    searchNotes: { query: "bridge concept", limit: 10 },
    maxContextNotes: 2
  });

  assert.equal(result.run.status, "succeeded");
  assert.equal(result.artifacts[0].type, "LinkSuggestion");
  assert.deepEqual(
    result.contextPack.items.map((item) => item.sourceId).sort(),
    [first.id, second.id].sort()
  );
  assert.deepEqual(result.artifacts[0].sources.noteIds.sort(), [first.id, second.id].sort());
  assert.deepEqual([result.artifacts[0].payload.from.id, result.artifacts[0].payload.to.id].sort(), [first.id, second.id].sort());
  assert.match(provider.lastRequest.messages[1].content, /"expectedArtifactType": "LinkSuggestion"/);
  assert.match(provider.lastRequest.messages[2].content, /find candidate relationships/);
  assert.ok(result.run.events.some((event) => event.eventType === "tool_call" && event.summary.toolName === "search_notes"));
  assert.equal(result.run.events.filter((event) => event.eventType === "tool_call" && event.summary.toolName === "read_note").length, 2);
});
