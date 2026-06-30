export function settingsAiRuntimeModeLabel(runtimeMode = "auto") {
  if (runtimeMode === "local_only") return "使用本地模型";
  if (runtimeMode === "hybrid") return "优先使用本地模型";
  if (runtimeMode === "cloud_only") return "使用远程模型";
  return "自动选择";
}

export function buildSettingsAiSetupBadges(input = {}) {
  const runtimeMode = String(input.runtimeMode || "auto").trim() || "auto";
  const localFlowActive = Boolean(input.localFlowActive);
  const localStatus = String(input.localStatus || "unknown").trim() || "unknown";
  const localModel = String(input.localModel || "").trim();
  const providerId = String(input.providerId || "").trim();
  const providerLabel = String(input.providerLabel || "").trim() || providerId || "远程模型";
  const models = Array.isArray(input.models) ? input.models : [];
  const modeText = runtimeMode === "hybrid" ? "自动选择" : settingsAiRuntimeModeLabel(runtimeMode);
  const items = [{ tone: localFlowActive ? "ok" : "muted", text: modeText }];

  if (localFlowActive) {
    items.push({
      tone: localStatus === "available" ? "ok" : localStatus === "unavailable" ? "warn" : "muted",
      text: localStatus === "available" ? "本地可用" : "本地待检测"
    });
    if (localModel) items.push({ tone: "ok", text: `当前模型 ${localModel}` });
    else if (models.length) items.push({ tone: "muted", text: `${models.length} 个本地模型` });
    return items;
  }

  items.push({ tone: providerId.includes("local") ? "ok" : "", text: providerLabel });
  return items;
}

export function buildSettingsAiExperienceBadges(input = {}) {
  const advancedFields = Number(input.advancedFields || 0);
  const hasMeaningfulAdvancedOverride = Boolean(input.hasMeaningfulAdvancedOverride);
  const testRunning = Boolean(input.testRunning);
  const testSucceeded = input.testStatus === "success";
  const hybridActive = String(input.runtimeMode || "auto").trim() === "hybrid";
  const advancedActive = advancedFields > 0 || hasMeaningfulAdvancedOverride;

  return {
    advancedBadge: {
      text: advancedFields
        ? `已填写 ${advancedFields} 项`
        : hasMeaningfulAdvancedOverride
          ? "已手动指定"
          : "通常不用改",
      warn: advancedActive,
      muted: !advancedActive
    },
    labBadge: {
      text: testRunning ? "测试中" : testSucceeded ? "测试成功" : "未测试",
      warn: testRunning,
      ok: testSucceeded && !testRunning,
      muted: !testRunning && !testSucceeded
    },
    hybridToggle: {
      text: hybridActive ? "关闭本地优先" : "本地优先",
      primary: hybridActive,
      subtle: !hybridActive
    }
  };
}
