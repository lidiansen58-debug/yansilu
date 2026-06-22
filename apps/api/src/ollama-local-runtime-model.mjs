import {
  DEFAULT_LOCAL_AI_MODEL,
  LOCAL_AI_MODEL_TIERS
} from "../../../packages/ai-orchestrator/src/index.mjs";

function cleanText(value) {
  return String(value ?? "").trim();
}

export const OLLAMA_RECOMMENDED_MODEL = DEFAULT_LOCAL_AI_MODEL;
export const OLLAMA_CATALOG_MODEL_NAMES = new Set(
  LOCAL_AI_MODEL_TIERS.map((model) => String(model.name || "").trim().toLowerCase()).filter(Boolean)
);
export const LOCAL_MODEL_TIERS = ["router_fast", "cheap_fast", "standard", "strong_reasoning", "guardrail", "local_private"];
export const OLLAMA_INSTALL_URL = "https://ollama.com/download";

export function normalizeOllamaPullModelName(value = "") {
  const model = cleanText(value).toLowerCase();
  if (!model) return "";
  if (!/^[a-z0-9][a-z0-9._:-]{0,80}$/.test(model)) return "";
  return model;
}

export function assertAllowedOllamaCatalogModel(modelName = "") {
  const model = normalizeOllamaPullModelName(modelName);
  if (model && OLLAMA_CATALOG_MODEL_NAMES.has(model)) return model;
  const error = new Error("Ollama model must be one of Yansilu's built-in local model catalog entries.");
  error.code = "OLLAMA_MODEL_NOT_ALLOWED";
  error.status = 400;
  error.details = {
    allowedModels: [...OLLAMA_CATALOG_MODEL_NAMES],
    requestedModel: cleanText(modelName)
  };
  throw error;
}

export function currentPlatformName(platform = process.platform) {
  if (platform === "win32") return "windows";
  if (platform === "darwin") return "macos";
  if (platform === "linux") return "linux";
  return cleanText(platform) || "unknown";
}

export function ollamaInstallGuide(platform = process.platform) {
  const osName = currentPlatformName(platform);
  const guides = {
    windows: {
      mode: "guided",
      installUrl: OLLAMA_INSTALL_URL,
      commands: [
        "winget install --id Ollama.Ollama -e --accept-package-agreements --accept-source-agreements"
      ],
      steps: [
        "Download Ollama for Windows, or install it with winget.",
        "Launch Ollama after installation and keep it running in the background.",
        "Return to Yansilu and run the local AI bootstrap check again."
      ]
    },
    macos: {
      mode: "guided",
      installUrl: OLLAMA_INSTALL_URL,
      commands: [
        "brew install ollama"
      ],
      steps: [
        "Download Ollama for macOS, or install it with Homebrew.",
        "Start Ollama from the app or run `ollama serve`.",
        "Return to Yansilu and run the local AI bootstrap check again."
      ]
    },
    linux: {
      mode: "guided",
      installUrl: OLLAMA_INSTALL_URL,
      commands: [
        "curl -fsSL https://ollama.com/install.sh | sh"
      ],
      steps: [
        "Install Ollama with the official Linux install command.",
        "Start the Ollama service or run `ollama serve`.",
        "Return to Yansilu and run the local AI bootstrap check again."
      ]
    }
  };
  return {
    platform: osName,
    autoInstallSupported: false,
    ...(guides[osName] || {
      mode: "guided",
      installUrl: OLLAMA_INSTALL_URL,
      commands: [],
      steps: [
        "Install Ollama from the official download page.",
        "Start Ollama and keep it running in the background.",
        "Return to Yansilu and run the local AI bootstrap check again."
      ]
    })
  };
}

export function normalizeLocalRuntimeMode(value = "") {
  const mode = cleanText(value).toLowerCase().replace(/[\s/-]+/g, "_");
  if (mode === "hybrid" || mode === "mixed" || mode === "local_cloud") return "hybrid";
  return "local_only";
}

export function hasOllamaModel(runtime = {}, modelName = "") {
  const target = cleanText(modelName).toLowerCase();
  if (!target) return false;
  return (Array.isArray(runtime.models) ? runtime.models : []).some((model) => {
    const name = cleanText(model?.name || model?.model || model).toLowerCase();
    return name === target;
  });
}

export function ollamaReadinessStatus({ responseOk = false, installation = {}, models = [], error = null } = {}) {
  const installedByCli = installation?.installed === true;
  const apiReachable = responseOk === true;
  const defaultModelInstalled = hasOllamaModel({ models }, OLLAMA_RECOMMENDED_MODEL);
  if (error) {
    if (!installedByCli && !apiReachable) return "not_installed";
    return "check_failed";
  }
  if (apiReachable && defaultModelInstalled) return "ready";
  if (apiReachable) return "running_missing_model";
  if (installedByCli) return "installed_not_running";
  return "not_installed";
}

export function configuredLocalModel(providerConfig = null, providerId = "ollama_local_gateway", modelName = "") {
  if (!providerConfig || cleanText(providerConfig.status) !== "enabled") return false;
  const model = cleanText(modelName);
  if (!model) return false;
  const runtimeModelMap = providerConfig.runtimeModelMap || providerConfig.runtime_model_map || {};
  return LOCAL_MODEL_TIERS.every((tier) => cleanText(runtimeModelMap[`${providerId}:${tier}`]) === model);
}

export function localAiBootstrapStatus({ runtime = {}, providerConfig = null, health = null, modelName = OLLAMA_RECOMMENDED_MODEL, runtimeMode = "local_only" } = {}) {
  const model = assertAllowedOllamaCatalogModel(modelName || OLLAMA_RECOMMENDED_MODEL);
  const mode = normalizeLocalRuntimeMode(runtimeMode);
  const providerId = mode === "hybrid" ? "local_private_gateway" : "ollama_local_gateway";
  const runtimeAvailable = runtime.status === "available";
  const installed = runtime.installation?.installed === true || runtimeAvailable;
  const modelReady = hasOllamaModel(runtime, model);
  const configReady = configuredLocalModel(providerConfig, providerId, model);
  const healthStatus = cleanText(health?.status) || "unknown";
  const healthReady = healthStatus === "healthy";
  let status = "ready";
  let nextAction = "none";
  let message = `Local AI is ready with ${model}.`;

  if (!installed) {
    status = "needs_install";
    nextAction = "install_ollama";
    message = "Ollama is not installed or cannot be found on this computer.";
  } else if (!runtimeAvailable) {
    status = "needs_start";
    nextAction = "start_ollama";
    message = "Ollama is installed, but the local runtime is not reachable.";
  } else if (!modelReady) {
    status = "needs_model";
    nextAction = "pull_model";
    message = `${model} is not installed in Ollama yet.`;
  } else if (!configReady) {
    status = "needs_config";
    nextAction = "save_local_ai_config";
    message = `${model} is installed; save it as the local AI provider model.`;
  } else if (!healthReady) {
    status = "needs_health_check";
    nextAction = "run_health_check";
    message = "Local AI config is saved; run a provider health check to confirm readiness.";
  }

  return {
    status,
    ready: status === "ready",
    nextAction,
    message,
    runtimeId: "ollama",
    providerId,
    model,
    runtimeMode: mode,
    checks: {
      installed,
      runtimeAvailable,
      modelReady,
      configReady,
      healthReady
    }
  };
}
