import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import fs from "node:fs/promises";
import os from "node:os";
import net from "node:net";
import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

import { createSqliteArtifactStore } from "../../packages/ai-orchestrator/src/index.mjs";

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

test("AI inbox APIs continue to load legacy revised sqlite rows without a data repair script", async (t) => {
  const vaultPath = await makeTempDir("yansilu-ai-legacy-revised-vault-");
  const artifactStore = await createSqliteArtifactStore({ vaultPath });
  const artifact = artifactStore.createArtifact({
    id: "artifact_legacy_revised_1",
    type: "LinkSuggestion",
    title: "Legacy revised artifact",
    summary: "This row simulates a pre-review-first AI summary decision.",
    body: "A legacy revised artifact should still be readable.",
    agentRunId: "run_legacy_revised_1",
    status: "pending_review",
    sources: { noteIds: ["note_legacy"], sourceDocIds: [], artifactIds: [], externalUrls: [] },
    payload: {
      from: { kind: "note", id: "note_legacy" },
      to: { kind: "note", id: "note_target" },
      relationType: "related"
    }
  });

  const { DatabaseSync } = await import("node:sqlite");
  const db = new DatabaseSync(artifactStore.dbPath);
  db.exec("PRAGMA foreign_keys = ON;");
  db.prepare("UPDATE ai_artifacts SET status = ? WHERE id = ?").run("revised", artifact.id);
  db.prepare(
    `INSERT INTO ai_artifact_decisions
      (id, artifact_id, user_id, decision, note_id, comment, feedback_json, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    `decision_${randomUUID().slice(0, 8)}`,
    artifact.id,
    "user_legacy",
    "revised",
    "",
    "[AI Summary]\nprovider=legacy_local\nmodel=legacy_local:3b\nrecommendedAction=accept_link\n\nLegacy summary body.",
    JSON.stringify({
      useful: false,
      noisy: false,
      wrong: false,
      alreadyKnown: false,
      privacyConcern: false
    }),
    "2026-05-20T10:00:00.000Z"
  );
  db.close();
  artifactStore.close();

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

  const detail = await getJson(baseUrl, `/api/v1/ai/inbox/${encodeURIComponent(artifact.id)}?canonical=true`);
  assert.equal(detail.status, 200, JSON.stringify(detail.json));
  assert.equal(detail.json.item.status, "revised");
  assert.equal(detail.json.item.latestDecision.decision, "revised");
  assert.equal(detail.json.canonical.item.latest_decision.decision, "revised");
  assert.equal(detail.json.canonical.artifact.status, "revised");

  const reviewedList = await getJson(baseUrl, "/api/v1/ai/inbox?canonical=true&view=reviewed");
  assert.equal(reviewedList.status, 200, JSON.stringify(reviewedList.json));
  assert.ok(reviewedList.json.items.some((item) => item.artifactId === artifact.id && item.status === "revised"));
  assert.ok(reviewedList.json.canonical.items.some((item) => item.artifact_id === artifact.id && item.status === "revised"));
});
