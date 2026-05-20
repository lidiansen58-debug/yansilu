import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { createSqliteArtifactStore } from "../../packages/ai-orchestrator/src/index.mjs";

async function makeTempDir(prefix) {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

test("sqlite artifact store updateArtifact enforces review-first status guards", async () => {
  const vaultPath = await makeTempDir("yansilu-artifact-update-guard-vault-");
  await fs.mkdir(path.join(vaultPath, ".yansilu"), { recursive: true });

  const store = await createSqliteArtifactStore({ vaultPath });
  store.createArtifact({
    id: "artifact_sqlite_guard_1",
    type: "LinkSuggestion",
    title: "SQLite guard",
    summary: "",
    body: {},
    agentRunId: "run_sqlite_guard",
    sources: { noteIds: ["pn_1"], sourceDocIds: [], artifactIds: [], externalUrls: [] }
  });

  assert.throws(
    () => store.updateArtifact("artifact_sqlite_guard_1", { status: "accepted" }),
    (error) => error?.code === "AI_ARTIFACT_REVIEW_DECISION_REQUIRED"
  );

  store.recordDecision("artifact_sqlite_guard_1", {
    decision: "ignored",
    userId: "user_1",
    createdAt: "2026-05-18T12:00:00.000Z"
  });

  assert.throws(
    () => store.updateArtifact("artifact_sqlite_guard_1", { status: "accepted" }),
    (error) => error?.code === "AI_ARTIFACT_DECISION_STATUS_MISMATCH"
  );

  const updated = store.updateArtifact("artifact_sqlite_guard_1", {
    status: "ignored",
    payload: { preserved: true }
  });
  assert.equal(updated.status, "ignored");
  assert.equal(updated.userDecisions.at(-1)?.decision, "ignored");
  assert.equal(updated.payload.preserved, true);

  store.close();
});
