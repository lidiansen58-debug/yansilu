export function settingsAiRuntimeModeLabel(runtimeMode = "auto") {
  if (runtimeMode === "local_only") return "只用本地模型";
  if (runtimeMode === "hybrid") return "本地优先";
  if (runtimeMode === "cloud_only") return "只用远程模型";
  return "自动选择";
}

export function buildSettingsAiSetupBadges(input = {}) {
  const runtimeMode = String(input.runtimeMode || "auto").trim() || "auto";
  const localFlowActive = Boolean(input.localFlowActive);
  const localStatus = String(input.localStatus || "unknown").trim() || "unknown";
  const localRuntimeLabel = String(input.localRuntimeLabel || "").trim();
  const localModel = String(input.localModel || "").trim();
  const providerId = String(input.providerId || "").trim();
  const providerLabel = String(input.providerLabel || "").trim() || providerId || "未选择服务";
  const models = Array.isArray(input.models) ? input.models : [];
  const primaryRuntimeModeLabel = runtimeMode === "hybrid"
    ? "自动选择"
    : settingsAiRuntimeModeLabel(runtimeMode);
  const items = [
    { tone: localFlowActive ? "ok" : "muted", text: `使用方式 ${primaryRuntimeModeLabel}` }
  ];

  if (localFlowActive) {
    items.push({
      tone: localStatus === "available" ? "ok" : localStatus === "unavailable" ? "warn" : "muted",
      text: localRuntimeLabel
    });
    if (localModel) {
      items.push({ tone: "ok", text: `本地模型 ${localModel}` });
    } else if (models.length) {
      items.push({ tone: "muted", text: `${models.length} 个本地模型` });
    }
    return items;
  }

  items.push({ tone: providerId.includes("local") ? "ok" : "", text: providerLabel });
  return items;
}

export function buildSettingsAiExperienceBadges(input = {}) {
  const advancedFields = Number(input.advancedFields || 0);
  const hasMeaningfulAdvancedOverride = Boolean(input.hasMeaningfulAdvancedOverride);
  const testRunning = Boolean(input.testRunning);
  const testOutput = input.testOutput;
  const hybridActive = String(input.runtimeMode || "auto").trim() === "hybrid";
  const advancedActive = advancedFields > 0 || hasMeaningfulAdvancedOverride;

  return {
    advancedBadge: {
      text: advancedFields
        ? `${advancedFields} 项已填写`
        : hasMeaningfulAdvancedOverride
          ? "已手动指定"
          : "保持默认",
      warn: advancedActive,
      muted: !advancedActive
    },
    labBadge: {
      text: testRunning ? "运行中" : testOutput ? "已有结果" : "等待运行",
      warn: testRunning,
      ok: Boolean(testOutput) && !testRunning,
      muted: !testRunning && !testOutput
    },
    hybridToggle: {
      text: hybridActive ? "退出本地优先" : "启用本地优先",
      primary: hybridActive,
      subtle: !hybridActive
    }
  };
}
