import {
  isLocalProviderId,
  normalizeAiRuntimeMode
} from "./ai-settings-state.js";

export const OLLAMA_CHAT_ENDPOINT_URL = "http://127.0.0.1:11434/v1/chat/completions";
export const OLLAMA_HEALTH_ENDPOINT_URL = "http://127.0.0.1:11434/api/tags";
export const OLLAMA_RECOMMENDED_MODEL = "qwen3:8b";
export const OLLAMA_MODEL_RECOMMENDATIONS = [
  {
    name: "qwen2.5:7b",
    label: "轻量",
    note: "快、省资源，适合快速摘要和低成本推荐筛选。",
    role: "轻量快速",
    resource: "资源占用较低",
    sizeHint: "约 4-5GB",
    downloadCommand: "ollama pull qwen2.5:7b"
  },
  {
    name: "qwen3:8b",
    label: "推荐",
    note: "适合观点提纯、潜在关联和 AI 建议，质量与速度更均衡。",
    role: "默认推荐",
    resource: "质量与速度均衡",
    sizeHint: "约 5-6GB",
    downloadCommand: "ollama pull qwen3:8b"
  },
  {
    name: "qwen3.5:9b",
    label: "高质量",
    note: "适合深度分析和复杂材料整理，响应会更慢。",
    role: "高质量较慢",
    resource: "更占资源",
    sizeHint: "约 6-7GB",
    downloadCommand: "ollama pull qwen3.5:9b"
  }
];
export const AI_LOCAL_MODEL_TIERS = ["router_fast", "cheap_fast", "standard", "strong_reasoning", "guardrail", "local_private"];
export const AI_REMOTE_MODEL_TIERS = ["router_fast", "cheap_fast", "standard", "strong_reasoning", "guardrail"];

export function defaultProviderEndpointUrl(providerId = "") {
  const id = String(providerId || "").trim();
  if (id === "ollama_local_gateway") return OLLAMA_CHAT_ENDPOINT_URL;
  return "";
}

export function defaultProviderHealthEndpointUrl(providerId = "", endpointUrl = "") {
  const id = String(providerId || "").trim();
  if (id === "ollama_local_gateway") return OLLAMA_HEALTH_ENDPOINT_URL;
  return "";
}

export function isRemoteConfigurableProviderId(providerId = "") {
  const id = String(providerId || "").trim();
  return Boolean(id && id !== "platform_managed_openai" && !isLocalProviderId(id));
}

export function runtimeModelMapForRemoteModel(providerId = "", modelName = "") {
  const id = String(providerId || "").trim();
  const model = String(modelName || "").trim();
  if (!id || !model || !isRemoteConfigurableProviderId(id)) return {};
  return Object.fromEntries(AI_REMOTE_MODEL_TIERS.map((tier) => [`${id}:${tier}`, model]));
}

export function remoteRuntimeModelFromMap(providerId = "", runtimeModelMap = {}) {
  const id = String(providerId || "").trim();
  const map = runtimeModelMap && typeof runtimeModelMap === "object" && !Array.isArray(runtimeModelMap) ? runtimeModelMap : {};
  const preferredKeys = AI_REMOTE_MODEL_TIERS.map((tier) => `${id}:${tier}`);
  for (const key of preferredKeys) {
    const model = String(map[key] || "").trim();
    if (model) return model;
  }
  const first = Object.entries(map).find(([key, value]) => String(key || "").startsWith(`${id}:`) && String(value || "").trim());
  return first ? String(first[1] || "").trim() : "";
}

export function enabledProviderHealthEndpointUrl(config = null) {
  const healthCheck = config?.healthCheck || config?.health_check || {};
  const enabled = healthCheck.enabled === true || healthCheck.enabled === "true";
  if (!enabled) return "";
  return String(healthCheck.endpointUrl || healthCheck.endpoint_url || "").trim();
}

export function aiPrivacyPolicyForRuntimeMode(runtimeMode = "auto") {
  const mode = normalizeAiRuntimeMode(runtimeMode);
  if (mode === "local_only") return { defaultMode: "local_only", allowCloud: false, localPreferred: true };
  if (mode === "hybrid") return { defaultMode: "normal", allowCloud: true, localPreferred: true };
  if (mode === "cloud_only") return { defaultMode: "normal", allowCloud: true, localPreferred: false };
  return {};
}

export function aiFallbackPolicyForRuntimeMode(runtimeMode = "auto") {
  const mode = normalizeAiRuntimeMode(runtimeMode);
  if (mode === "local_only") {
    return {
      allowSameProviderFallback: true,
      allowCrossProviderFallback: false,
      allowCloudFallback: false,
      requiresConfirmationForCloud: true
    };
  }
  if (mode === "hybrid") {
    return {
      allowSameProviderFallback: true,
      allowCrossProviderFallback: true,
      allowCloudFallback: true,
      requiresConfirmationForCloud: false,
      localPreferred: true
    };
  }
  return {};
}

export function aiDefaultsForRuntimeMode(runtimeMode = "auto") {
  const mode = normalizeAiRuntimeMode(runtimeMode);
  if (mode === "local_only") return { modelPack: "Privacy First", userMode: "Local / Private" };
  if (mode === "cloud_only") return { modelPack: "Starter Auto", userMode: "Balanced" };
  if (mode === "hybrid") return { modelPack: "Starter Auto", userMode: "Auto" };
  return { modelPack: "Starter Auto", userMode: "Auto" };
}

export function preferredLocalModelName(models = []) {
  const names = (Array.isArray(models) ? models : []).map((model) => String(model?.name || model || "").trim()).filter(Boolean);
  return names.find((name) => name.toLowerCase() === OLLAMA_RECOMMENDED_MODEL.toLowerCase()) || "";
}

export function isBuiltInOllamaModel(modelName = "", modelTiers = []) {
  return Boolean(ollamaRecommendationForModel(modelName, modelTiers));
}

export function modelNameExistsInList(modelName = "", models = []) {
  const target = String(modelName || "").trim().toLowerCase();
  if (!target) return false;
  return (Array.isArray(models) ? models : []).some(
    (model) => String(model?.name || model || "").trim().toLowerCase() === target
  );
}

export function selectedLocalModelNameForInstalledModels(currentModel = "", models = [], modelTiers = []) {
  const current = String(currentModel || "").trim();
  if (isBuiltInOllamaModel(current, modelTiers) && modelNameExistsInList(current, models)) return current;
  return preferredLocalModelName(models);
}

export function normalizeOllamaSetupGuide(guide = null) {
  if (!guide || typeof guide !== "object" || Array.isArray(guide)) return null;
  const nextAction = String(guide.nextAction || guide.next_action || "").trim();
  const steps = Array.isArray(guide.steps)
    ? guide.steps.map((step) => String(step || "").trim()).filter(Boolean)
    : [];
  const install = guide.install && typeof guide.install === "object" ? guide.install : {};
  const commands = [
    ...(Array.isArray(guide.commands) ? guide.commands : []),
    ...(Array.isArray(install.commands) ? install.commands : [])
  ].map((command) => String(command || "").trim()).filter(Boolean);
  return {
    nextAction,
    installUrl: String(guide.installUrl || guide.install_url || "https://ollama.com/download").trim() || "https://ollama.com/download",
    recommendedModel: String(guide.recommendedModel || guide.recommended_model || "").trim(),
    commands,
    steps
  };
}

export function ollamaRecommendationForModel(modelName = "", modelTiers = []) {
  const target = String(modelName || "").trim().toLowerCase();
  if (!target) return null;
  return ollamaModelRecommendationProfiles(modelTiers).find((item) => item.name.toLowerCase() === target) || null;
}

export function ollamaModelRecommendationProfiles(modelTiers = []) {
  const tiers = Array.isArray(modelTiers) ? modelTiers : [];
  const fromRuntime = tiers
    .map((item) => {
      const name = String(item?.name || "").trim();
      if (!name) return null;
      const label = String(item.label || "").trim();
      const scenario = String(item.scenario || "").trim();
      const tier = String(item.tier || "").trim();
      return {
        name,
        label: label || tier || "推荐",
        role:
          tier === "default"
            ? "默认推荐"
            : tier === "lightweight"
              ? "轻量快速"
              : tier === "high_quality"
                ? "高质量较慢"
                : label || "推荐模型",
        note: String(item.note || scenario || "适合本地 AI 运行。").trim(),
        resource: String(item.resource || item.resourceHint || item.resource_hint || item.sizeHint || item.size_hint || scenario || "").trim(),
        sizeHint: String(item.sizeHint || item.size_hint || "").trim(),
        hardwareHint: String(item.hardwareHint || item.hardware_hint || item.machineHint || item.machine_hint || "").trim(),
        downloadCommand: String(item.downloadCommand || item.download_command || `ollama pull ${name}`).trim(),
        tier
      };
    })
    .filter(Boolean);
  return fromRuntime.length ? fromRuntime : OLLAMA_MODEL_RECOMMENDATIONS;
}

export function localModelDisplayProfile(modelName = "", modelTiers = []) {
  const name = String(modelName || "").trim();
  const recommendation = ollamaRecommendationForModel(name, modelTiers);
  if (recommendation) {
    return {
      name,
      label: recommendation.label,
      role: recommendation.role || recommendation.label,
      note: recommendation.note,
      resource: recommendation.resource || "",
      sizeHint: recommendation.sizeHint || "",
      hardwareHint: recommendation.hardwareHint || "",
      downloadCommand: recommendation.downloadCommand || `ollama pull ${name}`,
      verified: true
    };
  }
  return {
    name,
    label: "已安装",
    role: "本地模型",
    note: "这个模型已在本地 AI 中检测到，但还没有进入研思录默认推荐列表。建议先用一句短句试运行。",
    resource: "未验证",
    sizeHint: "",
    hardwareHint: "",
    downloadCommand: `ollama pull ${name}`,
    verified: false
  };
}

export function ollamaBootstrapStatusText(result = null) {
  const status = String(result?.status || "").trim();
  const model = String(result?.model || OLLAMA_RECOMMENDED_MODEL).trim();
  if (result?.ready === true || status === "ready") return `本地 AI 已就绪：${model}`;
  if (status === "needs_install") return "请先安装本地 AI 运行环境，然后重新运行引导";
  if (status === "needs_start") return "本地 AI 已安装，但服务还没有启动";
  if (status === "needs_model") return `请先下载本地模型：ollama pull ${model}`;
  if (status === "needs_config") return `已检测到 ${model}，还需要保存为本地 AI 模型`;
  if (status === "needs_health_check") return "本地 AI 配置已保存，还需要通过健康检查";
  return String(result?.message || "本地 AI 引导尚未完成").trim();
}
