import { createAiInbox } from "./artifact-inbox.mjs";
import { createSqliteAiPreferencesStore } from "./sqlite-ai-preferences-store.mjs";
import { createSqliteAiProviderConfigStore } from "./sqlite-ai-provider-config-store.mjs";
import { createSqliteArtifactStore } from "./sqlite-artifact-store.mjs";
import { createSqliteContextPackStore } from "./sqlite-context-pack-store.mjs";
import { createSqliteProviderHealthStore } from "./sqlite-provider-health-store.mjs";
import { createSqliteRunLog } from "./sqlite-run-log.mjs";
import { createSqliteScheduledAgentTaskStore } from "./sqlite-scheduled-agent-task-store.mjs";

export async function createSqliteAiStores(options = {}) {
  const opened = [];

  try {
    const runLog = await createSqliteRunLog(options);
    opened.push(runLog);

    const artifactStore = await createSqliteArtifactStore({ ...options, dbPath: runLog.dbPath });
    opened.push(artifactStore);

    const contextPackStore = await createSqliteContextPackStore({ ...options, dbPath: runLog.dbPath });
    opened.push(contextPackStore);

    const aiPreferencesStore = await createSqliteAiPreferencesStore({ ...options, dbPath: runLog.dbPath });
    opened.push(aiPreferencesStore);

    const providerConfigStore = await createSqliteAiProviderConfigStore({ ...options, dbPath: runLog.dbPath });
    opened.push(providerConfigStore);

    const providerHealthStore = await createSqliteProviderHealthStore({ ...options, dbPath: runLog.dbPath });
    opened.push(providerHealthStore);

    const scheduledTaskStore = await createSqliteScheduledAgentTaskStore({ ...options, dbPath: runLog.dbPath });
    opened.push(scheduledTaskStore);

    const artifactInbox = createAiInbox({ artifactStore });

    return {
      storageMode: "sqlite",
      dbPath: runLog.dbPath,
      runLog,
      artifactStore,
      artifactInbox,
      contextPackStore,
      aiPreferencesStore,
      providerConfigStore,
      providerHealthStore,
      scheduledTaskStore,
      close() {
        for (const store of [scheduledTaskStore, providerHealthStore, providerConfigStore, aiPreferencesStore, contextPackStore, artifactStore, runLog]) {
          if (typeof store.close === "function") store.close();
        }
      }
    };
  } catch (error) {
    for (const store of opened.reverse()) {
      if (typeof store.close === "function") store.close();
    }
    throw error;
  }
}
