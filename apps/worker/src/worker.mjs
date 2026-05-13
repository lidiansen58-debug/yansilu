import path from "node:path";
import { fileURLToPath } from "node:url";

import { initVault } from "../../../packages/domain/src/index.mjs";
import {
  createAiHarnessRuntime,
  createCoreNoteTools,
  runDueScheduledAgentTasks
} from "../../../packages/ai-orchestrator/src/index.mjs";

const CWD = process.cwd();
const DEFAULT_VAULT_PATH = path.resolve(process.env.VAULT_PATH || path.join(CWD, "vault-example", "yansilu-vault"));
const DEFAULT_INTERVAL_MS = 15000;

function cleanText(value) {
  return String(value || "").trim();
}

function positiveInteger(value, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return fallback;
  return Math.floor(number);
}

function resolveVaultPath(input = {}) {
  return path.resolve(cleanText(input.vaultPath || input.vault_path || process.env.VAULT_PATH) || DEFAULT_VAULT_PATH);
}

function summaryLine(result = {}) {
  const summary = result.summary || {};
  return `scheduled tasks total=${summary.total || 0} succeeded=${summary.succeeded || 0} skipped=${summary.skipped || 0} failed=${summary.failed || 0}`;
}

export async function runScheduledWorkerCycle(input = {}) {
  const vaultPath = resolveVaultPath(input);
  const now = cleanText(input.now || input.nowAt || input.now_at) || new Date().toISOString();
  let runtime = null;

  await initVault(vaultPath);
  try {
    runtime = await createAiHarnessRuntime({
      ...input,
      storageMode: "sqlite",
      vaultPath,
      tools: createCoreNoteTools({ vaultPath })
    });
    const summary = await runDueScheduledAgentTasks({
      harness: runtime,
      scheduledTaskStore: runtime.stores.scheduledTaskStore,
      providerConfigStore: runtime.stores.providerConfigStore,
      providerHealthStore: runtime.stores.providerHealthStore,
      now,
      workspaceId: input.workspaceId || input.workspace_id || "local_workspace",
      userId: input.userId || input.user_id || "local_user",
      limit: input.limit
    });

    return {
      status: "succeeded",
      now,
      vaultPath,
      summary
    };
  } finally {
    if (runtime && typeof runtime.close === "function") runtime.close();
  }
}

export function startWorker(input = {}) {
  const intervalMs = positiveInteger(input.intervalMs || input.interval_ms || process.env.WORKER_INTERVAL_MS, DEFAULT_INTERVAL_MS);
  const vaultPath = resolveVaultPath(input);
  const logger = input.logger || console;
  let running = false;

  async function tick(reason = "interval") {
    if (running) {
      const skipped = {
        status: "skipped",
        reason: "worker_cycle_already_running",
        now: new Date().toISOString(),
        vaultPath
      };
      logger.log(`[${skipped.now}] worker skipped: ${skipped.reason}`);
      return skipped;
    }

    running = true;
    const startedAt = Date.now();
    try {
      const result = await runScheduledWorkerCycle({ ...input, vaultPath });
      logger.log(`[${result.now}] worker ${reason}: ${summaryLine(result)} durationMs=${Date.now() - startedAt}`);
      return result;
    } catch (error) {
      const now = new Date().toISOString();
      const failed = {
        status: "failed",
        now,
        vaultPath,
        error: {
          errorType: error?.code || "WORKER_SCHEDULED_TASK_CYCLE_FAILED",
          message: String(error?.message || error)
        }
      };
      logger.error(`[${now}] worker ${reason} failed: ${failed.error.message}`);
      return failed;
    } finally {
      running = false;
    }
  }

  logger.log(`Worker started (interval=${intervalMs}ms, vault=${vaultPath})`);
  const timer = setInterval(() => {
    void tick("interval");
  }, intervalMs);

  if (input.runOnStart !== false && process.env.WORKER_RUN_ON_START !== "false") {
    void tick("startup");
  }

  return {
    intervalMs,
    vaultPath,
    tick,
    stop() {
      clearInterval(timer);
    }
  };
}

function isMainModule() {
  const entry = process.argv[1] ? path.resolve(process.argv[1]) : "";
  return entry && path.resolve(fileURLToPath(import.meta.url)) === entry;
}

if (isMainModule()) {
  startWorker();
}
