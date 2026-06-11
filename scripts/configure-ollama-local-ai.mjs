const API_BASE = String(process.env.API_BASE || "http://localhost:3000").replace(/\/+$/, "");
const OLLAMA_BASE_URL = String(process.env.OLLAMA_BASE_URL || "http://localhost:11434").replace(/\/+$/, "");
const OLLAMA_MODEL = String(process.env.OLLAMA_MODEL || "qwen3:4b").trim();

const providerId = "ollama_local_gateway";
const logicalRefs = [
  "router_fast",
  "cheap_fast",
  "standard",
  "strong_reasoning",
  "guardrail",
  "local_private"
].map((tier) => `${providerId}:${tier}`);

function runtimeModelMap() {
  return Object.fromEntries(logicalRefs.map((ref) => [ref, OLLAMA_MODEL]));
}

async function postJson(pathname, payload = {}) {
  const response = await fetch(`${API_BASE}${pathname}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = json?.error?.message || json?.message || `HTTP ${response.status}`;
    const error = new Error(message);
    error.response = json;
    throw error;
  }
  return json;
}

async function main() {
  if (!OLLAMA_MODEL) throw new Error("OLLAMA_MODEL must not be empty.");

  await postJson("/api/v1/ai/preferences", {
    modelPack: "Ollama Local",
    userMode: "Local / Private"
  });

  await postJson("/api/v1/ai/provider-configs", {
    providerId,
    displayName: "Ollama Local",
    adapterType: "local_gateway",
    status: "enabled",
    authMode: "local_no_key",
    endpointUrl: `${OLLAMA_BASE_URL}/v1/chat/completions`,
    runtimeModelMap: runtimeModelMap(),
    healthCheck: {
      enabled: true,
      endpointUrl: `${OLLAMA_BASE_URL}/api/tags`,
      method: "GET",
      timeoutMs: 5000,
      expectedStatus: 200,
      intervalSeconds: 300
    }
  });

  let health = null;
  try {
    health = await postJson(`/api/v1/ai/provider-configs/${encodeURIComponent(providerId)}/health-check`, {
      networkEnabled: true
    });
  } catch (error) {
    health = { error: error.message, response: error.response };
  }

  console.log(JSON.stringify({
    ok: !health?.error,
    apiBase: API_BASE,
    providerId,
    model: OLLAMA_MODEL,
    endpointUrl: `${OLLAMA_BASE_URL}/v1/chat/completions`,
    health: health?.item || health
  }, null, 2));
}

main().catch((error) => {
  console.error(JSON.stringify({
    ok: false,
    apiBase: API_BASE,
    message: error.message,
    response: error.response
  }, null, 2));
  process.exitCode = 1;
});
