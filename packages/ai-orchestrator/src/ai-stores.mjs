import { createAiInbox } from "./artifact-inbox.mjs";
import { createInMemoryArtifactStore } from "./artifact-store.mjs";
import { createInMemoryContextPackStore } from "./context-pack-store.mjs";
import { createInMemoryAiPreferencesStore } from "./ai-preferences.mjs";
import { createInMemoryAiProviderConfigStore } from "./ai-provider-configs.mjs";
import { createInMemoryProviderHealthStore } from "./provider-health-store.mjs";
import { createInMemoryScheduledAgentTaskStore } from "./scheduled-agent-tasks.mjs";
import { createInMemorySuggestionStore } from "./suggestion-store.mjs";
import { createAiHarness } from "./harness.mjs";
import { createInMemoryRunLog } from "./run-log.mjs";
import { createSqliteAiStores } from "./sqlite-ai-stores.mjs";

function cleanText(value) {
  return String(value || "").trim();
}

function normalizeStorageMode(value) {
  const mode = cleanText(value) || "memory";
  if (!["memory", "sqlite"].includes(mode)) {
    const error = new Error(`Unsupported AI storage mode: ${mode}`);
    error.code = "AI_STORAGE_MODE_INVALID";
    throw error;
  }
  return mode;
}

export function createMemoryAiStores(options = {}) {
  const runLog = options.runLog || createInMemoryRunLog();
  const artifactStore = options.artifactStore || createInMemoryArtifactStore();
  const contextPackStore = options.contextPackStore || createInMemoryContextPackStore();
  const aiPreferencesStore = options.aiPreferencesStore || createInMemoryAiPreferencesStore(options.aiPreferences || {});
  const providerConfigStore = options.providerConfigStore || createInMemoryAiProviderConfigStore(options.providerConfigs || {});
  const providerHealthStore = options.providerHealthStore || createInMemoryProviderHealthStore(options.providerHealth || {});
  const scheduledTaskStore = options.scheduledTaskStore || createInMemoryScheduledAgentTaskStore(options.scheduledTasks || {});
  const suggestionStore = options.suggestionStore || createInMemorySuggestionStore(options.suggestions || []);
  const artifactInbox = options.artifactInbox || createAiInbox({ artifactStore });

  return {
    storageMode: "memory",
    runLog,
    artifactStore,
    artifactInbox,
    contextPackStore,
    aiPreferencesStore,
    providerConfigStore,
    providerHealthStore,
    scheduledTaskStore,
    suggestionStore,
    close() {
      for (const store of [suggestionStore, scheduledTaskStore, providerHealthStore, providerConfigStore, aiPreferencesStore, contextPackStore, artifactStore, runLog]) {
        if (typeof store.close === "function") store.close();
      }
    }
  };
}

export async function createAiStores(options = {}) {
  const storageMode = normalizeStorageMode(options.storageMode || options.storage_mode);
  if (storageMode === "sqlite") return createSqliteAiStores(options);
  return createMemoryAiStores(options);
}

export async function createAiHarnessRuntime(options = {}) {
  const stores = await createAiStores(options);
  const harness = createAiHarness({ ...options, ...stores });
  let closed = false;

  return {
    ...harness,
    storageMode: stores.storageMode,
    stores,
    close() {
      if (closed) return;
      closed = true;
      if (typeof stores.close === "function") stores.close();
    }
  };
}

export function aiStorageModes() {
  return ["memory", "sqlite"];
}
