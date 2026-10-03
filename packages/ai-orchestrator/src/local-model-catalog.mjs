export const DEFAULT_LOCAL_AI_MODEL = "qwen3:8b";
export const DEFAULT_LOCAL_AI_MODEL_DOWNLOAD_COMMAND = `ollama pull ${DEFAULT_LOCAL_AI_MODEL}`;

export const LOCAL_AI_MODEL_TIERS = [
  {
    tier: "lightweight",
    name: "qwen2.5:7b",
    label: "轻量",
    scenario: "短文本摘要、候选筛选",
    note: "资源需求较低；复杂判断仍需核对。",
    sizeHint: "约 4-5GB",
    downloadCommand: "ollama pull qwen2.5:7b"
  },
  {
    tier: "default",
    name: DEFAULT_LOCAL_AI_MODEL,
    label: "推荐",
    scenario: "观点提纯、潜在关联、AI 建议",
    note: "用于观点整理和关联建议；仅用 CPU 运行可能较慢。",
    sizeHint: "约 5-6GB",
    capabilityTags: [
      "观点整理",
      "关联候选",
      "结果需核对",
      "CPU 运行可能较慢"
    ],
    downloadCommand: DEFAULT_LOCAL_AI_MODEL_DOWNLOAD_COMMAND
  },
  {
    tier: "high_quality",
    name: "qwen3.5:9b",
    label: "较大",
    scenario: "复杂材料整理",
    note: "资源需求较高；模型更大不保证诊断更准确。",
    sizeHint: "约 6-7GB",
    downloadCommand: "ollama pull qwen3.5:9b"
  }
];

export const LOCAL_AI_RECOMMENDED_MODELS = [
  DEFAULT_LOCAL_AI_MODEL,
  ...LOCAL_AI_MODEL_TIERS.map((model) => model.name).filter((name) => name !== DEFAULT_LOCAL_AI_MODEL)
];

export function localModelProfile(modelName = DEFAULT_LOCAL_AI_MODEL) {
  const cleanName = String(modelName || "").trim().toLowerCase();
  return LOCAL_AI_MODEL_TIERS.find((model) => model.name.toLowerCase() === cleanName) || null;
}
