import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import fs from "node:fs/promises";
import os from "node:os";
import net from "node:net";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";

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

test("AI suggestions API exposes optional canonical payloads", async (t) => {
  const vaultPath = await makeTempDir("yansilu-ai-suggestions-canonical-vault-");
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

  const created = await postJson(baseUrl, "/api/v1/ai-suggestions?canonical=true", {
    id: "suggestion_canonical_1",
    target: { type: "permanent_note", id: "pn_1", field: "thesis" },
    scope: "note_field",
    content: "A reviewable claim starts life as a draft."
  });
  assert.equal(created.status, 201, JSON.stringify(created.json));
  assert.equal(created.json.item.id, "suggestion_canonical_1");
  assert.equal(created.json.canonical.item.id, "suggestion_canonical_1");
  assert.equal(created.json.canonical.item.target.field, "thesis");

  const listed = await getJson(baseUrl, "/api/v1/ai-suggestions?canonical=true&targetType=permanent_note&targetId=pn_1");
  assert.equal(listed.status, 200, JSON.stringify(listed.json));
  assert.equal(listed.json.items[0].id, "suggestion_canonical_1");
  assert.equal(listed.json.canonical.items[0].target.id, "pn_1");

  const adopted = await patchJson(baseUrl, "/api/v1/ai-suggestions/suggestion_canonical_1?canonical=true", {
    status: "adopted_as_draft",
    action: "adopt_as_draft",
    actor: "user",
    userId: "user_1"
  });
  assert.equal(adopted.status, 200, JSON.stringify(adopted.json));
  assert.equal(adopted.json.item.status, "adopted_as_draft");
  assert.equal(adopted.json.canonical.item.status, "adopted_as_draft");
  assert.equal(adopted.json.item.provenance?.humanEdited, false);
  assert.equal(adopted.json.item.provenance?.humanConfirmed, false);
  assert.equal(adopted.json.canonical.item.provenance.human_edited, false);
  assert.equal(adopted.json.canonical.item.provenance.human_confirmed, false);

  const edited = await patchJson(baseUrl, "/api/v1/ai-suggestions/suggestion_canonical_1?canonical=true", {
    status: "edited",
    action: "edit",
    actor: "user",
    userId: "user_1"
  });
  assert.equal(edited.status, 200, JSON.stringify(edited.json));
  assert.equal(edited.json.item.status, "edited");
  assert.equal(edited.json.canonical.item.status, "edited");
  assert.equal(edited.json.item.provenance?.humanEdited, true);
  assert.equal(edited.json.item.provenance?.humanConfirmed, false);
  assert.equal(edited.json.canonical.item.provenance.human_edited, true);
  assert.equal(edited.json.canonical.item.provenance.human_confirmed, false);

  const confirmed = await patchJson(baseUrl, "/api/v1/ai-suggestions/suggestion_canonical_1?canonical=true", {
    status: "confirmed",
    action: "confirm",
    actor: "user",
    userId: "user_1",
    userConfirmed: true
  });
  assert.equal(confirmed.status, 200, JSON.stringify(confirmed.json));
  assert.equal(confirmed.json.item.status, "confirmed");
  assert.equal(confirmed.json.canonical.item.status, "confirmed");
  assert.equal(confirmed.json.item.provenance?.humanEdited, true);
  assert.equal(confirmed.json.item.provenance?.humanConfirmed, true);
  assert.equal(confirmed.json.canonical.item.provenance.human_edited, true);
  assert.equal(confirmed.json.canonical.item.provenance.human_confirmed, true);

  const fetched = await getJson(baseUrl, "/api/v1/ai-suggestions/suggestion_canonical_1?canonical=true");
  assert.equal(fetched.status, 200, JSON.stringify(fetched.json));
  assert.equal(fetched.json.item.status, "confirmed");
  assert.equal(fetched.json.canonical.item.history[0].to_status, "adopted_as_draft");
  assert.equal(fetched.json.canonical.item.history[1].to_status, "edited");
  assert.equal(fetched.json.canonical.item.history[2].to_status, "confirmed");
});

test("AI suggestions detail and review responses preserve linked artifact traceability when a suggestion comes from AI inbox artifacts", async (t) => {
  const vaultPath = await makeTempDir("yansilu-ai-suggestions-linked-artifact-vault-");
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

  const createdNote = await postJson(baseUrl, "/api/v1/notes", {
    directoryId: "dir_original_default",
    title: "Linked artifact traceability target",
    noteType: "permanent",
    body: "# Linked artifact traceability target\n\nThis note should produce a reviewable field suggestion."
  });
  assert.equal(createdNote.status, 201, JSON.stringify(createdNote.json));

  const analysis = await postJson(baseUrl, `/api/v1/notes/${encodeURIComponent(createdNote.json.item.id)}/ai-analysis`, {});
  assert.equal(analysis.status, 200, JSON.stringify(analysis.json));

  const suggestionId = analysis.json.item.reviewItems.storedSuggestionIds[0];
  assert.ok(suggestionId);
  const artifact = analysis.json.item.reviewItems.artifacts.find(
    (item) => item.type === "InsightCard" && (item.payload?.fieldSuggestionId === suggestionId || item.payload?.fieldSuggestion?.id === suggestionId)
  );
  assert.ok(artifact, "expected a persisted field suggestion artifact");

  const adopted = await patchJson(baseUrl, `/api/v1/ai-suggestions/${encodeURIComponent(suggestionId)}?canonical=true`, {
    status: "adopted_as_draft",
    action: "adopt_as_draft",
    actor: "user",
    userId: "user_1",
    comment: "Keep the linked artifact trace visible during review."
  });
  assert.equal(adopted.status, 200, JSON.stringify(adopted.json));
  assert.equal(adopted.json.item.status, "adopted_as_draft");
  assert.equal(adopted.json.artifact.id, artifact.id);
  assert.equal(adopted.json.artifact.status, "adopted_as_draft");
  assert.equal(adopted.json.artifact.payload.fieldSuggestion.status, "adopted_as_draft");
  assert.equal(adopted.json.artifact.payload.fieldSuggestion.provenance.humanEdited, false);
  assert.equal(adopted.json.artifact.payload.fieldSuggestion.provenance.humanConfirmed, false);
  assert.equal(adopted.json.artifact.payload.fieldSuggestion.history.length, 1);
  assert.equal(adopted.json.artifact.payload.fieldSuggestion.history[0].toStatus, "adopted_as_draft");
  assert.deepEqual(adopted.json.latestReviewEvent, adopted.json.reviewEvents[adopted.json.reviewEvents.length - 1]);
  assert.equal(adopted.json.canonical.artifact.id, artifact.id);
  assert.equal(adopted.json.canonical.artifact.status, "adopted_as_draft");
  assert.equal(adopted.json.canonical.artifact.payload.fieldSuggestion.status, "adopted_as_draft");
  assert.equal(adopted.json.canonical.artifact.payload.fieldSuggestion.history[0].toStatus, "adopted_as_draft");
  assert.deepEqual(
    adopted.json.canonical.latest_review_event,
    adopted.json.canonical.review_events[adopted.json.canonical.review_events.length - 1]
  );
  assert.deepEqual(adopted.json.canonical.trace, {
    suggestion_id: suggestionId,
    source_artifact_id: artifact.id,
    primary_source_note_id: createdNote.json.item.id,
    source_note_ids: [createdNote.json.item.id],
    target_note_id: createdNote.json.item.id,
    target_field: "thesis",
    suggestion_status: "adopted_as_draft"
  });

  const edited = await patchJson(baseUrl, `/api/v1/ai-suggestions/${encodeURIComponent(suggestionId)}?canonical=true`, {
    status: "edited",
    action: "edit",
    actor: "user",
    userId: "user_1",
    content: {
      thesis: "Linked artifact detail should keep the edited suggestion content in sync."
    }
  });
  assert.equal(edited.status, 200, JSON.stringify(edited.json));
  assert.equal(edited.json.item.status, "edited");
  assert.equal(edited.json.item.provenance?.humanEdited, true);
  assert.equal(edited.json.item.provenance?.humanConfirmed, false);
  assert.equal(edited.json.artifact.id, artifact.id);
  assert.equal(edited.json.artifact.status, "adopted_as_draft");
  assert.equal(edited.json.artifact.payload.fieldSuggestion.status, "edited");
  assert.equal(edited.json.artifact.payload.fieldSuggestion.provenance.humanEdited, true);
  assert.equal(edited.json.artifact.payload.fieldSuggestion.provenance.humanConfirmed, false);
  assert.equal(edited.json.artifact.payload.fieldSuggestion.history.length, 2);
  assert.equal(edited.json.artifact.payload.fieldSuggestion.history[1].toStatus, "edited");
  assert.deepEqual(edited.json.latestReviewEvent, edited.json.reviewEvents[edited.json.reviewEvents.length - 1]);
  assert.equal(
    edited.json.artifact.payload.fieldSuggestion.content.thesis,
    "Linked artifact detail should keep the edited suggestion content in sync."
  );
  assert.equal(edited.json.canonical.artifact.status, "adopted_as_draft");
  assert.equal(edited.json.canonical.artifact.payload.fieldSuggestion.status, "edited");
  assert.equal(edited.json.canonical.artifact.payload.fieldSuggestion.history[1].toStatus, "edited");
  assert.deepEqual(
    edited.json.canonical.latest_review_event,
    edited.json.canonical.review_events[edited.json.canonical.review_events.length - 1]
  );

  const confirmed = await patchJson(baseUrl, `/api/v1/ai-suggestions/${encodeURIComponent(suggestionId)}?canonical=true`, {
    status: "confirmed",
    action: "confirm",
    actor: "user",
    userId: "user_1",
    userConfirmed: true,
    content: {
      thesis: "Linked artifact detail should keep the edited suggestion content in sync."
    }
  });
  assert.equal(confirmed.status, 200, JSON.stringify(confirmed.json));
  assert.equal(confirmed.json.item.status, "confirmed");
  assert.equal(confirmed.json.item.provenance?.humanEdited, true);
  assert.equal(confirmed.json.item.provenance?.humanConfirmed, true);
  assert.equal(confirmed.json.artifact.id, artifact.id);
  assert.equal(confirmed.json.artifact.status, "adopted_as_draft");
  assert.equal(confirmed.json.artifact.payload.fieldSuggestion.status, "confirmed");
  assert.equal(confirmed.json.artifact.payload.fieldSuggestion.provenance.humanEdited, true);
  assert.equal(confirmed.json.artifact.payload.fieldSuggestion.provenance.humanConfirmed, true);
  assert.equal(confirmed.json.artifact.payload.fieldSuggestion.history.length, 3);
  assert.equal(confirmed.json.artifact.payload.fieldSuggestion.history[2].toStatus, "confirmed");
  assert.deepEqual(confirmed.json.latestReviewEvent, confirmed.json.reviewEvents[confirmed.json.reviewEvents.length - 1]);
  assert.equal(confirmed.json.canonical.artifact.status, "adopted_as_draft");
  assert.equal(confirmed.json.canonical.artifact.payload.fieldSuggestion.status, "confirmed");
  assert.equal(confirmed.json.canonical.artifact.payload.fieldSuggestion.history[2].toStatus, "confirmed");
  assert.deepEqual(
    confirmed.json.canonical.latest_review_event,
    confirmed.json.canonical.review_events[confirmed.json.canonical.review_events.length - 1]
  );

  const fetched = await getJson(baseUrl, `/api/v1/ai-suggestions/${encodeURIComponent(suggestionId)}?canonical=true`);
  assert.equal(fetched.status, 200, JSON.stringify(fetched.json));
  assert.equal(fetched.json.item.status, "confirmed");
  assert.equal(fetched.json.artifact.id, artifact.id);
  assert.equal(fetched.json.artifact.status, "adopted_as_draft");
  assert.equal(fetched.json.artifact.payload.fieldSuggestion.status, "confirmed");
  assert.equal(fetched.json.artifact.payload.fieldSuggestion.history.length, 3);
  assert.equal(fetched.json.artifact.payload.fieldSuggestion.history[2].toStatus, "confirmed");
  assert.equal(
    fetched.json.artifact.payload.fieldSuggestion.content.thesis,
    "Linked artifact detail should keep the edited suggestion content in sync."
  );
  assert.equal(fetched.json.canonical.artifact.id, artifact.id);
  assert.equal(fetched.json.canonical.artifact.status, "adopted_as_draft");
  assert.equal(fetched.json.canonical.artifact.payload.fieldSuggestion.status, "confirmed");
  assert.equal(fetched.json.canonical.artifact.payload.fieldSuggestion.history[2].toStatus, "confirmed");
  assert.deepEqual(fetched.json.canonical.trace, {
    suggestion_id: suggestionId,
    source_artifact_id: artifact.id,
    primary_source_note_id: createdNote.json.item.id,
    source_note_ids: [createdNote.json.item.id],
    target_note_id: createdNote.json.item.id,
    target_field: "thesis",
    suggestion_status: "confirmed"
  });

  const inboxDetail = await getJson(baseUrl, `/api/v1/ai/inbox/${encodeURIComponent(artifact.id)}?canonical=true`);
  assert.equal(inboxDetail.status, 200, JSON.stringify(inboxDetail.json));
  assert.equal(inboxDetail.json.artifact.payload.fieldSuggestion.status, "confirmed");
  assert.equal(inboxDetail.json.artifact.payload.fieldSuggestion.provenance.humanEdited, true);
  assert.equal(inboxDetail.json.artifact.payload.fieldSuggestion.provenance.humanConfirmed, true);
  assert.equal(inboxDetail.json.artifact.payload.fieldSuggestion.history.length, 3);
  assert.equal(inboxDetail.json.artifact.payload.fieldSuggestion.history[2].toStatus, "confirmed");
  assert.deepEqual(
    inboxDetail.json.latestSuggestionReviewEvent,
    inboxDetail.json.suggestionReviewEvents[inboxDetail.json.suggestionReviewEvents.length - 1]
  );
  assert.equal(inboxDetail.json.canonical.artifact.payload.fieldSuggestion.status, "confirmed");
  assert.equal(inboxDetail.json.canonical.artifact.payload.fieldSuggestion.history[2].toStatus, "confirmed");
  assert.deepEqual(
    inboxDetail.json.canonical.latest_suggestion_review_event,
    inboxDetail.json.canonical.suggestion_review_events[inboxDetail.json.canonical.suggestion_review_events.length - 1]
  );
  assert.deepEqual(adopted.json.canonical.trace, {
    ...inboxDetail.json.canonical.trace,
    suggestion_status: "adopted_as_draft"
  });
  assert.deepEqual(fetched.json.canonical.trace, inboxDetail.json.canonical.trace);

  const db = new DatabaseSync(path.join(vaultPath, ".yansilu", "ai-agent.db"));
  try {
    db.prepare("DELETE FROM ai_suggestions WHERE id = ?").run(suggestionId);
  } finally {
    db.close();
  }

  const degradedInboxDetail = await getJson(baseUrl, `/api/v1/ai/inbox/${encodeURIComponent(artifact.id)}?canonical=true`);
  assert.equal(degradedInboxDetail.status, 200, JSON.stringify(degradedInboxDetail.json));
  assert.equal(degradedInboxDetail.json.suggestion.status, "confirmed");
  assert.equal(degradedInboxDetail.json.suggestion.sourceArtifactId, artifact.id);
  assert.equal(degradedInboxDetail.json.canonical.suggestion.status, "confirmed");
  assert.equal(degradedInboxDetail.json.canonical.suggestion.source_artifact_id, artifact.id);
  assert.equal(
    degradedInboxDetail.json.canonical.suggestion.content.thesis,
    "Linked artifact detail should keep the edited suggestion content in sync."
  );
  assert.equal(degradedInboxDetail.json.artifact.payload.fieldSuggestion.status, "confirmed");
  assert.equal(degradedInboxDetail.json.artifact.payload.fieldSuggestion.provenance.humanEdited, true);
  assert.equal(degradedInboxDetail.json.artifact.payload.fieldSuggestion.provenance.humanConfirmed, true);
  assert.equal(degradedInboxDetail.json.artifact.payload.fieldSuggestion.history.length, 3);
  assert.equal(degradedInboxDetail.json.artifact.payload.fieldSuggestion.history[2].toStatus, "confirmed");
  assert.equal(degradedInboxDetail.json.suggestionReviewEvents.length, 3);
  assert.equal(
    degradedInboxDetail.json.suggestionReviewEvents[degradedInboxDetail.json.suggestionReviewEvents.length - 1].eventType,
    "confirmed"
  );
  assert.deepEqual(
    degradedInboxDetail.json.latestSuggestionReviewEvent,
    degradedInboxDetail.json.suggestionReviewEvents[degradedInboxDetail.json.suggestionReviewEvents.length - 1]
  );
  assert.equal(degradedInboxDetail.json.canonical.suggestion_review_events.length, 3);
  assert.equal(
    degradedInboxDetail.json.canonical.suggestion_review_events[degradedInboxDetail.json.canonical.suggestion_review_events.length - 1].event_type,
    "confirmed"
  );
  assert.deepEqual(
    degradedInboxDetail.json.canonical.latest_suggestion_review_event,
    degradedInboxDetail.json.canonical.suggestion_review_events[degradedInboxDetail.json.canonical.suggestion_review_events.length - 1]
  );
});

test("AI suggestions canonical trace falls back to linked artifact payload when the stored target becomes incomplete", async (t) => {
  const vaultPath = await makeTempDir("yansilu-ai-suggestions-degraded-target-vault-");
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

  const createdNote = await postJson(baseUrl, "/api/v1/notes", {
    directoryId: "dir_original_default",
    title: "Degraded suggestion target fallback",
    noteType: "permanent",
    body: "# Degraded suggestion target fallback\n\nThis note should keep canonical trace stable even if the suggestion target record degrades."
  });
  assert.equal(createdNote.status, 201, JSON.stringify(createdNote.json));

  const analysis = await postJson(baseUrl, `/api/v1/notes/${encodeURIComponent(createdNote.json.item.id)}/ai-analysis`, {});
  assert.equal(analysis.status, 200, JSON.stringify(analysis.json));

  const suggestionId = analysis.json.item.reviewItems.storedSuggestionIds[0];
  assert.ok(suggestionId);
  const artifact = analysis.json.item.reviewItems.artifacts.find(
    (item) => item.type === "InsightCard" && (item.payload?.fieldSuggestionId === suggestionId || item.payload?.fieldSuggestion?.id === suggestionId)
  );
  assert.ok(artifact, "expected a persisted field suggestion artifact");

  const db = new DatabaseSync(path.join(vaultPath, ".yansilu", "ai-agent.db"));
  try {
    db.prepare("UPDATE ai_suggestions SET target_id = '', target_field = '', target_json = '{}' WHERE id = ?").run(suggestionId);
  } finally {
    db.close();
  }

  const suggestionDetail = await getJson(baseUrl, `/api/v1/ai-suggestions/${encodeURIComponent(suggestionId)}?canonical=true`);
  assert.equal(suggestionDetail.status, 200, JSON.stringify(suggestionDetail.json));
  assert.deepEqual(suggestionDetail.json.canonical.trace, {
    suggestion_id: suggestionId,
    source_artifact_id: artifact.id,
    primary_source_note_id: createdNote.json.item.id,
    source_note_ids: [createdNote.json.item.id],
    target_note_id: createdNote.json.item.id,
    target_field: "thesis",
    suggestion_status: "suggested"
  });

  const inboxDetail = await getJson(baseUrl, `/api/v1/ai/inbox/${encodeURIComponent(artifact.id)}?canonical=true`);
  assert.equal(inboxDetail.status, 200, JSON.stringify(inboxDetail.json));
  assert.deepEqual(inboxDetail.json.canonical.trace, suggestionDetail.json.canonical.trace);
});
