import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import fs from "node:fs/promises";
import os from "node:os";
import net from "node:net";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..", "..");

async function makeTempDir(prefix) {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

async function findFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.on("error", reject);
    server.listen(0, () => {
      const address = server.address();
      const port = typeof address === "object" ? address.port : 0;
      server.close(() => resolve(port));
    });
  });
}

async function waitForHealth(baseUrl) {
  const deadline = Date.now() + 5000;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${baseUrl}/health`);
      if (res.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 80));
  }
  throw new Error("API server did not become healthy");
}

async function getJson(baseUrl, pathname) {
  const res = await fetch(`${baseUrl}${pathname}`);
  const json = await res.json();
  return { status: res.status, json };
}

async function postJson(baseUrl, pathname, body) {
  const res = await fetch(`${baseUrl}${pathname}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const json = await res.json();
  return { status: res.status, json };
}

async function patchJson(baseUrl, pathname, body) {
  const res = await fetch(`${baseUrl}${pathname}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const json = await res.json();
  return { status: res.status, json };
}

function sortedKeys(value) {
  return Object.keys(value || {}).sort();
}

test("AI canonical contracts keep inbox detail, suggestion detail, and review action response shapes stable", async (t) => {
  const vaultPath = await makeTempDir("yansilu-ai-canonical-contract-vault-");
  const port = await findFreePort();
  const baseUrl = `http://127.0.0.1:${port}`;

  const child = spawn(process.execPath, ["apps/api/src/server.mjs"], {
    cwd: REPO_ROOT,
    env: {
      ...process.env,
      API_PORT: String(port),
      VAULT_PATH: vaultPath
    },
    stdio: ["ignore", "pipe", "pipe"]
  });

  t.after(() => child.kill());
  await waitForHealth(baseUrl);

  const note = await postJson(baseUrl, "/api/v1/notes", {
    directoryId: "dir_original_default",
    title: "Canonical contract target",
    noteType: "permanent",
    body: "# Canonical contract target\n\nThis note should generate a reviewable field suggestion."
  });
  assert.equal(note.status, 201, JSON.stringify(note.json));

  const analysis = await postJson(baseUrl, `/api/v1/notes/${encodeURIComponent(note.json.item.id)}/ai-analysis`, {});
  assert.equal(analysis.status, 200, JSON.stringify(analysis.json));

  const suggestionId = analysis.json.item.reviewItems.storedSuggestionIds[0];
  assert.ok(suggestionId);
  const artifact = analysis.json.item.reviewItems.artifacts.find(
    (item) => item.type === "InsightCard" && (item.payload?.fieldSuggestionId === suggestionId || item.payload?.fieldSuggestion?.id === suggestionId)
  );
  assert.ok(artifact, "expected a persisted field suggestion artifact");

  const inboxList = await getJson(baseUrl, "/api/v1/ai/inbox?canonical=true");
  assert.equal(inboxList.status, 200, JSON.stringify(inboxList.json));
  const listedArtifact = inboxList.json.canonical.items.find((item) => item.artifact_id === artifact.id);
  assert.ok(listedArtifact, "expected the linked artifact in the canonical inbox list");
  assert.equal(listedArtifact.suggestion_id, suggestionId);

  const inboxDetail = await getJson(
    baseUrl,
    `/api/v1/ai/inbox/${encodeURIComponent(artifact.id)}?canonical=true`
  );
  assert.equal(inboxDetail.status, 200, JSON.stringify(inboxDetail.json));
  assert.deepEqual(sortedKeys(inboxDetail.json.canonical), [
    "artifact",
    "item",
    "latest_suggestion_review_event",
    "suggestion",
    "suggestion_review_events",
    "trace"
  ]);
  assert.deepEqual(sortedKeys(inboxDetail.json.canonical.suggestion), [
    "content",
    "created_at",
    "history",
    "id",
    "model",
    "origin",
    "provenance",
    "scope",
    "source_artifact_id",
    "status",
    "target",
    "updated_at"
  ]);
  assert.deepEqual(sortedKeys(inboxDetail.json.canonical.trace), [
    "primary_source_note_id",
    "source_artifact_id",
    "source_note_ids",
    "suggestion_id",
    "suggestion_status",
    "target_field",
    "target_note_id"
  ]);
  assert.deepEqual(inboxDetail.json.canonical.suggestion_review_events, []);
  assert.equal(inboxDetail.json.canonical.latest_suggestion_review_event, null);

  const rejected = await patchJson(
    baseUrl,
    `/api/v1/ai-suggestions/${encodeURIComponent(suggestionId)}?canonical=true`,
    {
      status: "rejected",
      action: "reject",
      actor: "user",
      userId: "user_1",
      comment: "Snapshot the review action response."
    }
  );
  assert.equal(rejected.status, 200, JSON.stringify(rejected.json));
  assert.deepEqual(sortedKeys(rejected.json.canonical), [
    "artifact",
    "item",
    "latest_review_event",
    "review_events",
    "trace"
  ]);
  assert.deepEqual(sortedKeys(rejected.json.canonical.artifact), [
    "agent_run_id",
    "body",
    "confidence",
    "context_pack_id",
    "created_at",
    "field_suggestion_id",
    "id",
    "model",
    "origin",
    "payload",
    "privacy",
    "provenance",
    "sources",
    "status",
    "summary",
    "title",
    "type",
    "updated_at",
    "user_decisions"
  ]);
  assert.deepEqual(sortedKeys(rejected.json.canonical.latest_review_event.metadata), [
    "from_status",
    "note_id",
    "to_status"
  ]);

  const suggestionDetail = await getJson(
    baseUrl,
    `/api/v1/ai-suggestions/${encodeURIComponent(suggestionId)}?canonical=true`
  );
  assert.equal(suggestionDetail.status, 200, JSON.stringify(suggestionDetail.json));
  assert.deepEqual(sortedKeys(suggestionDetail.json.canonical), [
    "artifact",
    "item",
    "latest_review_event",
    "review_events",
    "trace"
  ]);
  assert.equal(suggestionDetail.json.artifact.id, artifact.id);
  assert.equal(suggestionDetail.json.canonical.artifact.id, artifact.id);
  assert.deepEqual(sortedKeys(suggestionDetail.json.canonical.item.history[0]), [
    "action",
    "actor",
    "comment",
    "created_at",
    "from_status",
    "to_status",
    "user_id"
  ]);
  assert.deepEqual(sortedKeys(suggestionDetail.json.canonical.review_events[0]), [
    "actor_id",
    "actor_type",
    "adoption_event_id",
    "comment",
    "created_at",
    "event_type",
    "feedback",
    "metadata",
    "subject_id",
    "subject_kind",
    "target"
  ]);
  assert.equal(suggestionDetail.json.canonical.item.status, "rejected");
  assert.equal(suggestionDetail.json.canonical.trace.suggestion_status, "rejected");

  const rejectedInboxDetail = await getJson(
    baseUrl,
    `/api/v1/ai/inbox/${encodeURIComponent(artifact.id)}?canonical=true`
  );
  assert.equal(rejectedInboxDetail.status, 200, JSON.stringify(rejectedInboxDetail.json));
  assert.deepEqual(sortedKeys(rejectedInboxDetail.json.canonical.latest_suggestion_review_event), [
    "actor_id",
    "actor_type",
    "adoption_event_id",
    "comment",
    "created_at",
    "event_type",
    "feedback",
    "metadata",
    "subject_id",
    "subject_kind",
    "target"
  ]);
  assert.deepEqual(sortedKeys(rejectedInboxDetail.json.canonical.latest_suggestion_review_event.metadata), [
    "from_status",
    "note_id",
    "to_status"
  ]);
  assert.equal(rejectedInboxDetail.json.canonical.suggestion_review_events.length, 1);

  const db = await import("node:sqlite");
  const localDb = new db.DatabaseSync(path.join(vaultPath, ".yansilu", "ai-agent.db"));
  try {
    localDb.prepare("DELETE FROM ai_suggestions WHERE id = ?").run(suggestionId);
  } finally {
    localDb.close();
  }

  const degradedRejectedInboxDetail = await getJson(
    baseUrl,
    `/api/v1/ai/inbox/${encodeURIComponent(artifact.id)}?canonical=true`
  );
  assert.equal(degradedRejectedInboxDetail.status, 200, JSON.stringify(degradedRejectedInboxDetail.json));
  assert.equal(degradedRejectedInboxDetail.json.suggestion.status, "rejected");
  assert.equal(degradedRejectedInboxDetail.json.suggestion.sourceArtifactId, artifact.id);
  assert.equal(degradedRejectedInboxDetail.json.canonical.suggestion.status, "rejected");
  assert.equal(degradedRejectedInboxDetail.json.canonical.suggestion.source_artifact_id, artifact.id);
  assert.equal(degradedRejectedInboxDetail.json.artifact.payload.fieldSuggestion.status, "rejected");
  assert.equal(degradedRejectedInboxDetail.json.artifact.payload.fieldSuggestion.history.length, 1);
  assert.equal(degradedRejectedInboxDetail.json.artifact.payload.fieldSuggestion.history[0].toStatus, "rejected");
  assert.equal(degradedRejectedInboxDetail.json.suggestionReviewEvents.length, 1);
  assert.equal(degradedRejectedInboxDetail.json.suggestionReviewEvents[0].eventType, "rejected");
  assert.deepEqual(
    degradedRejectedInboxDetail.json.latestSuggestionReviewEvent,
    degradedRejectedInboxDetail.json.suggestionReviewEvents[0]
  );
  assert.equal(degradedRejectedInboxDetail.json.canonical.suggestion_review_events.length, 1);
  assert.equal(degradedRejectedInboxDetail.json.canonical.suggestion_review_events[0].event_type, "rejected");
  assert.deepEqual(
    degradedRejectedInboxDetail.json.canonical.latest_suggestion_review_event,
    degradedRejectedInboxDetail.json.canonical.suggestion_review_events[0]
  );
});

test("AI canonical inbox detail keeps degraded suggestion trace stable when the linked suggestion record is missing", async (t) => {
  const vaultPath = await makeTempDir("yansilu-ai-canonical-degraded-vault-");
  const port = await findFreePort();
  const baseUrl = `http://127.0.0.1:${port}`;

  const child = spawn(process.execPath, ["apps/api/src/server.mjs"], {
    cwd: REPO_ROOT,
    env: {
      ...process.env,
      API_PORT: String(port),
      VAULT_PATH: vaultPath
    },
    stdio: ["ignore", "pipe", "pipe"]
  });

  t.after(() => child.kill());
  await waitForHealth(baseUrl);

  const note = await postJson(baseUrl, "/api/v1/notes", {
    directoryId: "dir_original_default",
    title: "Canonical degraded target",
    noteType: "permanent",
    body: "# Canonical degraded target\n\nThis note should leave a degraded field suggestion trace."
  });
  assert.equal(note.status, 201, JSON.stringify(note.json));

  const analysis = await postJson(baseUrl, `/api/v1/notes/${encodeURIComponent(note.json.item.id)}/ai-analysis`, {});
  assert.equal(analysis.status, 200, JSON.stringify(analysis.json));

  const suggestionId = analysis.json.item.reviewItems.storedSuggestionIds[0];
  assert.ok(suggestionId);
  const artifact = analysis.json.item.reviewItems.artifacts.find(
    (item) => item.type === "InsightCard" && (item.payload?.fieldSuggestionId === suggestionId || item.payload?.fieldSuggestion?.id === suggestionId)
  );
  assert.ok(artifact, "expected a persisted field suggestion artifact");

  const db = await import("node:sqlite");
  const localDb = new db.DatabaseSync(path.join(vaultPath, ".yansilu", "ai-agent.db"));
  try {
    localDb.prepare("DELETE FROM ai_suggestions WHERE id = ?").run(suggestionId);
  } finally {
    localDb.close();
  }

  const degradedDetail = await getJson(
    baseUrl,
    `/api/v1/ai/inbox/${encodeURIComponent(artifact.id)}?canonical=true`
  );
  assert.equal(degradedDetail.status, 200, JSON.stringify(degradedDetail.json));
  assert.deepEqual(sortedKeys(degradedDetail.json.canonical), [
    "artifact",
    "item",
    "latest_suggestion_review_event",
    "suggestion",
    "suggestion_review_events",
    "trace"
  ]);
  assert.equal(degradedDetail.json.suggestion, null);
  assert.equal(degradedDetail.json.canonical.suggestion, null);
  assert.deepEqual(degradedDetail.json.canonical.suggestion_review_events, []);
  assert.equal(degradedDetail.json.canonical.latest_suggestion_review_event, null);
  assert.deepEqual(sortedKeys(degradedDetail.json.canonical.trace), [
    "primary_source_note_id",
    "source_artifact_id",
    "source_note_ids",
    "suggestion_id",
    "suggestion_status",
    "target_field",
    "target_note_id"
  ]);
  assert.equal(degradedDetail.json.canonical.trace.suggestion_id, suggestionId);
  assert.equal(degradedDetail.json.canonical.trace.suggestion_status, "missing");
  assert.equal(degradedDetail.json.canonical.trace.target_note_id, note.json.item.id);
  assert.equal(degradedDetail.json.canonical.trace.target_field, "thesis");
});
