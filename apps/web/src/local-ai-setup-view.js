export const LOCAL_AI_FEATURE_LABELS = Object.freeze({
  graph_analysis: "AI 关系图谱分析",
  graph_connect: "AI 建联推荐",
  theme_index: "AI 主题命名和中心问题建议",
  note_analysis: "当前笔记 AI 分析",
  writing_check: "AI 写作检查",
  ai_summary: "AI 摘要整理"
});

const MAIN_FLOW_HINT = "不影响继续写笔记、手工整理关系和进入写作中心。";

function cleanText(value = "") {
  return String(value || "").trim();
}

export function localAiFeatureLabel(feature = "") {
  return LOCAL_AI_FEATURE_LABELS[cleanText(feature)] || "这个 AI 功能";
}

export function localAiSetupActionLabel(result = null) {
  const status = cleanText(result?.status);
  if (status === "needs_install") return "先安装模型运行工具";
  if (status === "needs_start") return "先启动本地模型";
  if (status === "needs_model") return `先下载推荐模型 ${cleanText(result?.model) || "qwen3:8b"}`;
  if (status === "needs_config") return "保存为本地 AI 模型";
  if (status === "needs_health_check") return "测试 AI";
  return "打开 AI 设置完成本地 AI 准备";
}

export function localAiSetupModelHint(profile = null, modelName = "") {
  const name = cleanText(profile?.name) || cleanText(modelName);
  const parts = [
    cleanText(profile?.role || profile?.label),
    cleanText(profile?.note),
    cleanText(profile?.hardwareHint || profile?.resource || profile?.sizeHint)
  ].filter(Boolean);
  if (!name) return parts.join("；");
  return [name, ...parts].join("：");
}

export function localAiSetupStatusMessage(input = {}) {
  const feature = localAiFeatureLabel(input.feature);
  const result = input.result || null;
  const model = cleanText(result?.model || input.model);
  const action = localAiSetupActionLabel(result);
  const modelHint = localAiSetupModelHint(input.modelProfile, model);
  const reason = cleanText(input.statusText || result?.message);
  const reasonText = reason ? `${reason}；` : "";
  const modelText = modelHint ? `推荐模型：${modelHint}；` : "";
  return `${feature}需要本地 AI。${reasonText}${action}。${modelText}${MAIN_FLOW_HINT}`;
}
