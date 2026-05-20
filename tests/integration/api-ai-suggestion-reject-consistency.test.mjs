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

test("AI suggestion reject keeps linked artifact semantics aligned in sqlite-backed API flows", async (t) => {
  const vaultPath = await makeTempDir("yansilu-ai-suggestion-reject-vault-");
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

  const created = await postJson(baseUrl, "/api/v1/notes", {
    directoryId: "dir_original_default",
    title: "Reject consistency target",
    noteType: "permanent",
    body: "# Reject consistency target\n\nThis note should exercise linked suggestion rejection."
  });
  assert.equal(created.status, 201, JSON.stringify(created.json));

  const analysis = await postJson(baseUrl, `/api/v1/notes/${encodeURIComponent(created.json.item.id)}/ai-analysis`, {});
  assert.equal(analysis.status, 200, JSON.stringify(analysis.json));
  const suggestionId = analysis.json.item.reviewItems.storedSuggestionIds[0];
  assert.ok(suggestionId);
  const artifact = analysis.json.item.reviewItems.artifacts.find(
    (item) => item.type === "InsightCard" && (item.payload?.fieldSuggestionId === suggestionId || item.payload?.fieldSuggestion?.id === suggestionId)
  );
  assert.ok(artifact, "expected a persisted field suggestion artifact for rejection");

  const rejected = await patchJson(
    baseUrl,
    `/api/v1/ai-suggestions/${encodeURIComponent(suggestionId)}?canonical=true`,
    {
      status: "rejected",
      action: "reject",
      actor: "user",
      userId: "user_1",
      comment: "Not useful enough for drafting."
    }
  );
  assert.equal(rejected.status, 200, JSON.stringify(rejected.json));
  assert.equal(rejected.json.item.status, "rejected");
  assert.equal(rejected.json.canonical.item.status, "rejected");
  assert.equal(rejected.json.canonical.artifact.status, "ignored");
  assert.equal(rejected.json.canonical.artifact.payload.fieldSuggestion.status, "rejected");
  assert.equal(rejected.json.canonical.latest_review_event.event_type, "rejected");

  const inboxDetail = await getJson(
    baseUrl,
    `/api/v1/ai/inbox/${encodeURIComponent(artifact.id)}?canonical=true`
  );
  assert.equal(inboxDetail.status, 200, JSON.stringify(inboxDetail.json));
  assert.equal(inboxDetail.json.item.status, "ignored");
  assert.equal(inboxDetail.json.canonical.artifact.status, "ignored");
  assert.equal(inboxDetail.json.canonical.artifact.payload.fieldSuggestion.status, "rejected");
  assert.equal(inboxDetail.json.canonical.suggestion.status, "rejected");

  const reviewedList = await getJson(
    baseUrl,
    `/api/v1/ai/inbox?canonical=true&view=reviewed&sourceNoteId=${encodeURIComponent(created.json.item.id)}`
  );
  assert.equal(reviewedList.status, 200, JSON.stringify(reviewedList.json));
  assert.ok(reviewedList.json.items.some((entry) => entry.artifactId === artifact.id && entry.status === "ignored"));
  assert.ok(reviewedList.json.canonical.items.some((entry) => entry.artifact_id === artifact.id && entry.status === "ignored"));
});
