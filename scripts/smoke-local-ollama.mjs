import {
  createAiHarness,
  createInMemoryAiPreferencesStore,
  createInMemoryAiProviderConfigStore
} from "../packages/ai-orchestrator/src/index.mjs";

const OLLAMA_BASE_URL = String(process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434").replace(/\/+$/, "");
const OLLAMA_MODEL = String(process.env.OLLAMA_MODEL || "").trim();
const REQUEST_TIMEOUT_MS = Number(process.env.OLLAMA_TIMEOUT_MS || 120000);

function withTimeoutFetch(timeoutMs = REQUEST_TIMEOUT_MS) {
  return async function fetchWithTimeout(url, init = {}) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(url, { ...init, signal: controller.signal });
    } finally {
      clearTimeout(timeout);
    }
  };
}

async function fetchJson(pathname) {
  const response = await withTimeoutFetch(10000)(`${OLLAMA_BASE_URL}${pathname}`);
  const json = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`Ollama ${pathname} returned HTTP ${response.status}`);
  return json;
}

function preferredModelName(models = []) {
  const names = models.map((model) => String(model?.name || model?.model || "").trim()).filter(Boolean);
  if (OLLAMA_MODEL) return OLLAMA_MODEL;
  for (const pattern of [/qwen2\.5.*7b/i, /qwen.*7b/i, /qwen2\.5.*3b/i, /llama3\.1.*8b/i, /phi.*3\.5/i, /gemma2.*2b/i]) {
    const match = names.find((name) => pattern.test(name));
    if (match) return match;
  }
  return names[0] || "";
}

function printResult(result, modelName) {
  const providerEvent = result.run.events.find((event) => event.eventType === "provider_adapter_selected");
  const routeEvent = result.run.events.find((event) => event.eventType === "model_route_selected");
  const modelCall = result.run.events.find((event) => event.eventType === "model_call");
  console.log(JSON.stringify({
    ok: result.run.status === "succeeded",
    status: result.run.status,
    providerId: providerEvent?.summary?.providerId || "",
    hybridRoutingReason: providerEvent?.summary?.hybridRoutingReason || "",
    modelRef: routeEvent?.summary?.modelRef || "",
    selectedTier: routeEvent?.summary?.selectedTier || "",
    modelCallStatus: modelCall?.status || "",
    ollamaModel: modelName,
    artifactCount: result.artifacts.length,
    artifactTypes: result.artifacts.map((artifact) => artifact.type)
  }, null, 2));
}

async function main() {
  let tags;
  try {
    tags = await fetchJson("/api/tags");
  } catch (error) {
    console.error(`Ollama is not reachable at ${OLLAMA_BASE_URL}. Start Ollama, then rerun this script.`);
    console.error(String(error?.message || error));
    process.exitCode = 2;
    return;
  }

  const modelName = preferredModelName(Array.isArray(tags.models) ? tags.models : []);
  if (!modelName) {
    console.error("Ollama is reachable, but no models are installed.");
    console.error("Suggested small models: qwen2.5:7b, qwen2.5:3b, llama3.1:8b, phi3.5:latest, gemma2:2b.");
    process.exitCode = 2;
    return;
  }

  const aiPreferencesStore = createInMemoryAiPreferencesStore();
  aiPreferencesStore.setUserPreferences({
    workspaceId: "local_workspace",
    userId: "local_user",
    userMode: "Auto",
    modelPack: "Starter Auto",
    privacy: { defaultMode: "normal", allowCloud: true, localPreferred: true },
    advancedSettings: {
      runtimeMode: "hybrid",
      localModel: modelName
    }
  });

  const providerConfigStore = createInMemoryAiProviderConfigStore();
  providerConfigStore.setProviderConfig({
    providerId: "local_private_gateway",
    authMode: "local_no_key",
    endpointUrl: `${OLLAMA_BASE_URL}/v1/chat/completions`,
    healthCheck: {
      enabled: true,
      endpointUrl: `${OLLAMA_BASE_URL}/api/tags`,
      method: "GET",
      timeoutMs: 5000,
      expectedStatus: 200,
      intervalSeconds: 300
    }
  });

  const harness = createAiHarness({
    aiPreferencesStore,
    providerConfigStore,
    useOpenAiCompatibleAdapter: true,
    networkEnabled: true,
    fetchImpl: withTimeoutFetch()
  });

  const result = await harness.runTask({
    taskId: "smoke_ollama_connection_agent",
    agentId: "connection_agent",
    taskType: "relation_scan",
    currentNote: {
      id: "note_smoke_ollama",
      title: "Local model smoke note",
      body: "Local model smoke note\n\nThis note is only used to verify that the hybrid AI runtime can call an Ollama local model for a lightweight relation scan."
    }
  });

  printResult(result, modelName);
  if (result.run.status !== "succeeded") process.exitCode = 1;
}

main().catch((error) => {
  console.error(String(error?.stack || error?.message || error));
  process.exitCode = 1;
});
