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

test("AI inbox and scheduled task APIs expose optional canonical payloads", async (t) => {
  const vaultPath = await makeTempDir("yansilu-ai-canonical-api-vault-");
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
    body: "# Canonical source\n\nThis note exists so scheduled AI can point somewhere real."
  });
  assert.equal(note.status, 201, JSON.stringify(note.json));

  const createdTask = await postJson(baseUrl, "/api/v1/ai/scheduled-tasks?canonical=true", {
    templateId: "reflection_reminder",
    scheduledTaskId: "sched_canonical_reflection",
    name: "Canonical reflection reminder",
    status: "active",
    schedule: { type: "interval", intervalMinutes: 30 },
    scope: { noteIds: [note.json.item.id] },
    nextRunAt: "2026-05-18T08:00:00.000Z"
  });
  assert.equal(createdTask.status, 201, JSON.stringify(createdTask.json));
  assert.equal(createdTask.json.item.scheduledTaskId, "sched_canonical_reflection");
  assert.equal(createdTask.json.canonical.item.scheduled_task_id, "sched_canonical_reflection");
  assert.equal(createdTask.json.canonical.item.scope.note_ids[0], note.json.item.id);
  assert.equal(createdTask.json.canonical.item.output.destination, "ai_inbox");

  const listedTasks = await getJson(baseUrl, "/api/v1/ai/scheduled-tasks?canonical=true");
  assert.equal(listedTasks.status, 200, JSON.stringify(listedTasks.json));
  assert.equal(listedTasks.json.items[0].scheduledTaskId, "sched_canonical_reflection");
  assert.equal(listedTasks.json.canonical.items[0].scheduled_task_id, "sched_canonical_reflection");

  const updatedTask = await postJson(baseUrl, "/api/v1/ai/scheduled-tasks/sched_canonical_reflection/status?canonical=true", {
    status: "paused"
  });
  assert.equal(updatedTask.status, 200, JSON.stringify(updatedTask.json));
  assert.equal(updatedTask.json.item.status, "paused");
  assert.equal(updatedTask.json.canonical.item.status, "paused");

  const resumedTask = await postJson(baseUrl, "/api/v1/ai/scheduled-tasks/sched_canonical_reflection/status?canonical=true", {
    status: "active"
  });
  assert.equal(resumedTask.status, 200, JSON.stringify(resumedTask.json));
  assert.equal(resumedTask.json.item.status, "active");
  assert.equal(resumedTask.json.canonical.item.status, "active");

  const due = await postJson(baseUrl, "/api/v1/ai/scheduled-tasks/run-due", {
    now: "2026-05-18T09:00:00.000Z"
  });
  assert.equal(due.status, 200, JSON.stringify(due.json));

  const inbox = await getJson(baseUrl, `/api/v1/ai/inbox?view=all&canonical=true&sourceNoteId=${encodeURIComponent(note.json.item.id)}`);
  assert.equal(inbox.status, 200, JSON.stringify(inbox.json));
  assert.equal(Array.isArray(inbox.json.items), true);
  assert.equal(Array.isArray(inbox.json.canonical.items), true);

  if (inbox.json.items.length > 0) {
    const firstRuntime = inbox.json.items[0];
    const firstCanonical = inbox.json.canonical.items[0];
    assert.equal(firstRuntime.artifactId, firstCanonical.artifact_id);

    const accepted = await postJson(baseUrl, `/api/v1/ai/inbox/${encodeURIComponent(firstRuntime.artifactId)}/decision?canonical=true`, {
      action: "accept",
      comment: "keep this",
      feedback: { useful: true }
    });
    assert.equal(accepted.status, 200, JSON.stringify(accepted.json));
    assert.equal(accepted.json.canonical.item.artifact_id, firstRuntime.artifactId);
    assert.equal(accepted.json.canonical.artifact.id, firstRuntime.artifactId);
    assert.equal(accepted.json.canonical.latestDecision.subject_kind, "artifact");
    assert.equal(accepted.json.canonical.latestDecision.metadata.from_status, "pending_review");

    const acceptedAgain = await postJson(baseUrl, `/api/v1/ai/inbox/${encodeURIComponent(firstRuntime.artifactId)}/decision?canonical=true`, {
      action: "accept"
    });
    assert.equal(acceptedAgain.status, 200, JSON.stringify(acceptedAgain.json));
    assert.equal(acceptedAgain.json.canonical.item.artifact_id, firstRuntime.artifactId);
    assert.equal(acceptedAgain.json.item.decisionCount, accepted.json.item.decisionCount);
    assert.equal(acceptedAgain.json.artifact.userDecisions.length, accepted.json.artifact.userDecisions.length);
    assert.equal(acceptedAgain.json.canonical.latestDecision.event_type, "accepted");
    assert.equal(acceptedAgain.json.canonical.latestDecision.metadata.from_status, "pending_review");

    const conflicting = await postJson(baseUrl, `/api/v1/ai/inbox/${encodeURIComponent(firstRuntime.artifactId)}/decision?canonical=true`, {
      action: "archive"
    });
    assert.equal(conflicting.status, 409, JSON.stringify(conflicting.json));
    assert.equal(conflicting.json.error.code, "AI_INBOX_DECISION_CONFLICT");
    assert.equal(conflicting.json.error.details.currentStatus, "accepted");
    assert.equal(conflicting.json.error.details.latestDecision, "accepted");
    assert.equal(conflicting.json.error.details.requestedDecision, "archived");

    const detail = await getJson(baseUrl, `/api/v1/ai/inbox/${encodeURIComponent(firstRuntime.artifactId)}?canonical=true`);
    assert.equal(detail.status, 200, JSON.stringify(detail.json));
    assert.equal(detail.json.canonical.item.artifact_id, firstRuntime.artifactId);
    assert.equal(detail.json.canonical.artifact.id, firstRuntime.artifactId);
  }
});
