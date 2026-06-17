import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { initVault, createNoteInDirectory } from "../../packages/domain/src/index.mjs";
import { createSqliteScheduledAgentTaskStore } from "../../packages/ai-orchestrator/src/index.mjs";
import { initVaultWithRetry, runScheduledWorkerCycle } from "../../apps/worker/src/worker.mjs";

async function makeTempVault() {
  return fs.mkdtemp(path.join(os.tmpdir(), "yansilu-worker-scheduled-vault-"));
}

test("worker cycle runs due scheduled tasks through sqlite stores and core note tools", async (t) => {
  const vaultPath = await makeTempVault();
  await initVault(vaultPath);
  const note = await createNoteInDirectory(vaultPath, {
    directoryId: "dir_original_default",
    body: "# Worker scheduled reflection\n\nWorker cycles should turn scoped notes into reviewable AI artifacts."
  });

  let scheduledTaskStore = await createSqliteScheduledAgentTaskStore({ vaultPath });
  t.after(() => scheduledTaskStore?.close?.());
  scheduledTaskStore.upsertScheduledTask({
    scheduledTaskId: "sched_worker_reflection",
    status: "active",
    taskType: "reflection_prompt",
    agentId: "reflection_agent",
    schedule: { type: "interval", intervalMinutes: 30 },
    scope: { noteIds: [note.id] },
    model: { userMode: "Auto", maxTier: "standard" },
    budget: { maxRunsPerPeriod: 2, maxEstimatedCostPerRun: 1, maxEstimatedCostPerPeriod: 2 },
    nextRunAt: "2026-05-11T08:00:00.000Z"
  });
  scheduledTaskStore.close();
  scheduledTaskStore = null;

  const result = await runScheduledWorkerCycle({
    vaultPath,
    now: "2026-05-11T09:00:00.000Z"
  });

  assert.equal(result.status, "succeeded");
  assert.equal(result.summary.total, 1);
  assert.equal(result.summary.succeeded, 1);
  assert.equal(result.summary.runs[0].result.contextPack.items[0].sourceId, note.id);

  scheduledTaskStore = await createSqliteScheduledAgentTaskStore({ vaultPath });
  const task = scheduledTaskStore.getScheduledTask("sched_worker_reflection");
  assert.equal(task.lastRunStatus, "succeeded");
  assert.equal(task.lastRunAt, "2026-05-11T09:00:00.000Z");
});

test("worker vault initialization retries transient sqlite lock errors", async () => {
  let attempts = 0;
  const result = await initVaultWithRetry("retry-vault", {
    retries: 3,
    delayMs: 1,
    initVault: async (vaultPath) => {
      attempts += 1;
      if (attempts < 3) {
        const error = new Error("database is locked");
        error.code = "SQLITE_BUSY";
        throw error;
      }
      return { vaultPath };
    }
  });

  assert.equal(attempts, 3);
  assert.deepEqual(result, { vaultPath: "retry-vault" });
});
