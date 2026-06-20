export const DEFAULT_LOCAL_AI_MODEL = "qwen3:8b";
export const DEFAULT_LOCAL_AI_MODEL_DOWNLOAD_COMMAND = `ollama pull ${DEFAULT_LOCAL_AI_MODEL}`;

export const LOCAL_AI_MODEL_TIERS = [
  {
    tier: "lightweight",
    name: "qwen2.5:7b",
    label: "轻量",
    scenario: "快、省资源",
    note: "适合快速摘要、低成本候选筛选和日常轻量任务。",
    sizeHint: "约 4-5GB",
    downloadCommand: "ollama pull qwen2.5:7b"
  },
  {
    tier: "default",
    name: DEFAULT_LOCAL_AI_MODEL,
    label: "推荐",
    scenario: "观点提纯、潜在关联、AI 建议",
    note: "适合作为本地默认推理模型，兼顾质量和速度。",
    sizeHint: "约 5-6GB",
    capabilityTags: [
      "适合观点提纯",
      "适合潜在关联",
      "JSON 输出较稳定",
      "速度中等"
    ],
    downloadCommand: DEFAULT_LOCAL_AI_MODEL_DOWNLOAD_COMMAND
  },
  {
    tier: "high_quality",
    name: "qwen3.5:9b",
    label: "高质量",
    scenario: "深度分析",
    note: "适合更慢但更细致的深度分析和复杂材料整理。",
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
