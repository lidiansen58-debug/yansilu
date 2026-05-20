import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { createSqliteArtifactStore } from "../../packages/ai-orchestrator/src/index.mjs";

async function makeTempDir(prefix) {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

test("sqlite artifact store normalizes legacy revised rows back into the review-first contract", async () => {
  const vaultPath = await makeTempDir("yansilu-artifact-legacy-vault-");
  await fs.mkdir(path.join(vaultPath, ".yansilu"), { recursive: true });

  let store = await createSqliteArtifactStore({ vaultPath });
  const artifact = store.createArtifact({
    id: "artifact_legacy_1",
    type: "ReflectionPrompt",
    title: "Legacy revised artifact",
    summary: "Old data used revised as a summary status.",
    body: "Review-first contracts should not expose revised anymore.",
    agentRunId: "run_legacy_1",
    sources: { noteIds: ["pn_legacy"], sourceDocIds: [], artifactIds: [], externalUrls: [] }
  });
  const dbPath = store.dbPath;
  store.close();

  const { DatabaseSync } = await import("node:sqlite");
  const db = new DatabaseSync(dbPath);
  db.exec("BEGIN IMMEDIATE;");
  try {
    db.prepare("UPDATE ai_artifacts SET status = ? WHERE id = ?").run("revised", artifact.id);
    db.prepare(
      `INSERT INTO ai_artifact_decisions
        (id, artifact_id, user_id, decision, note_id, comment, feedback_json, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      "decision_legacy_revised",
      artifact.id,
      "user_1",
      "revised",
      "pn_legacy",
      "[AI Summary]\nprovider=legacy\nmodel=legacy\n\nOld summary",
      "{}",
      "2026-05-18T12:00:00.000Z"
    );
    db.exec("COMMIT;");
  } catch (error) {
    db.exec("ROLLBACK;");
    throw error;
  } finally {
    db.close();
  }

  store = await createSqliteArtifactStore({ vaultPath });
  const hydrated = store.getArtifact(artifact.id);
  assert.equal(hydrated.status, "pending_review");
  assert.deepEqual(hydrated.userDecisions, []);
  assert.equal(store.countArtifacts({ status: "pending_review" }), 1);
  assert.deepEqual(store.listArtifacts({ status: "pending_review" }).map((item) => item.id), [artifact.id]);
  store.close();
});
