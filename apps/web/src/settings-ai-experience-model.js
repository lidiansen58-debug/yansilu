export function settingsAiRuntimeModeLabel(runtimeMode = "auto") {
  if (runtimeMode === "local_only") return "本地 AI";
  if (runtimeMode === "hybrid") return "本地优先";
  if (runtimeMode === "cloud_only") return "远程 AI";
  if (runtimeMode === "off") return "已停用";
  return "未启用";
}

export function buildSettingsAiOnboardingView(input = {}) {
  const runtimeMode = String(input.runtimeMode || "auto").trim() || "auto";
  const localFlowActive = Boolean(input.localFlowActive);
  const localStatus = String(input.localStatus || "unknown").trim() || "unknown";
  const localReadinessStatus = String(input.localReadinessStatus || "").trim();
  const localModel = String(input.localModel || "").trim();
  const models = Array.isArray(input.models) ? input.models : [];
  const localReady = Boolean(input.localReady);
  const testSucceeded = input.testStatus === "success";
  const remoteConfigurable = Boolean(input.remoteConfigurable);
  const remoteConfigReady = Boolean(input.remoteConfigReady);
  const recommendedModel = String(input.primaryRecommendedModel || "qwen3:8b").trim() || "qwen3:8b";

  if (runtimeMode === "off") {
    return {
      title: "AI 已停用",
      body: "",
      status: "已停用",
      statusTone: "muted",
      mode: "已停用",
      primaryAction: "配置本地 AI",
      primaryActionKind: "local",
      helper: ""
    };
  }

  if (localFlowActive) {
    if (localReady) {
      return {
        title: "本地 AI 可用",
        body: "",
        status: "AI 可用",
        statusTone: "ok",
        mode: "本地 AI",
        primaryAction: testSucceeded ? "已完成" : "测试 AI",
        primaryActionKind: testSucceeded ? "done" : "test",
        secondaryAction: "",
        secondaryActionKind: "",
        helper: ""
      };
    }
    if (localStatus !== "available") {
      const notRunning = localReadinessStatus === "installed_not_running";
      const notInstalled = !notRunning;
      return {
        title: notRunning ? "Ollama 未运行" : "Ollama 未安装",
        body: "",
        status: notRunning ? "Ollama 未启动" : "未安装 Ollama",
        statusTone: "warn",
        mode: "本地 AI",
        primaryAction: notRunning ? "启动 Ollama" : "安装 Ollama",
        primaryActionKind: notRunning ? "start-local" : "install-ollama",
        secondaryAction: "重新检测",
        secondaryActionKind: "detect-local",
        helper: notInstalled ? "打开官方下载页" : ""
      };
    }
    if (!models.length) {
      return {
        title: "需要下载模型",
        body: recommendedModel,
        status: "模型未下载",
        statusTone: "warn",
        mode: "本地 AI",
        primaryAction: "下载模型",
        primaryActionKind: "download-local-model",
        secondaryAction: "重新检测",
        secondaryActionKind: "detect-local",
        helper: "下载前需确认"
      };
    }
    if (!localModel) {
      return {
        title: "选择本地模型",
        body: `${models.length} 个可用`,
        status: "需要选择模型",
        statusTone: "warn",
        mode: "本地 AI",
        primaryAction: "保存模型",
        primaryActionKind: "choose-local-model",
        secondaryAction: "重新检测",
        secondaryActionKind: "detect-local",
        helper: ""
      };
    }
    return {
      title: "模型不可用",
      body: localModel,
      status: "模型未下载",
      statusTone: "warn",
      mode: "本地 AI",
      primaryAction: "下载模型",
      primaryActionKind: "download-local-model",
      secondaryAction: "重新检测",
      secondaryActionKind: "detect-local",
      helper: ""
    };
  }

  if (runtimeMode === "cloud_only" || remoteConfigurable) {
    return {
      title: testSucceeded ? "远程 AI 已就绪" : remoteConfigReady ? "远程 AI 待验证" : "配置远程 AI",
      body: remoteConfigReady
        ? "会发送相关内容"
        : "",
      status: testSucceeded ? "已就绪" : remoteConfigReady ? "待验证" : "未配置",
      statusTone: testSucceeded ? "ok" : remoteConfigReady ? "warn" : "muted",
      mode: "远程 AI",
      primaryAction: testSucceeded ? "已完成" : remoteConfigReady ? "测试连接" : "配置远程 AI",
      primaryActionKind: testSucceeded ? "done" : remoteConfigReady ? "test-remote" : "remote",
      secondaryAction: remoteConfigReady ? "" : "配置本地 AI",
      secondaryActionKind: remoteConfigReady ? "" : "local",
      helper: remoteConfigReady ? "配置已填写，验证连接后保存。" : ""
    };
  }

  return {
    title: "AI 未配置",
    body: "",
    status: "未配置",
    statusTone: "muted",
    mode: "未启用",
    primaryAction: "配置本地 AI",
    primaryActionKind: "local",
    secondaryAction: "配置远程 AI",
    secondaryActionKind: "remote",
    helper: ""
  };
}

export function buildSettingsAiSetupBadges(input = {}) {
  const runtimeMode = String(input.runtimeMode || "auto").trim() || "auto";
  const localFlowActive = Boolean(input.localFlowActive);
  const localStatus = String(input.localStatus || "unknown").trim() || "unknown";
  const localModel = String(input.localModel || "").trim();
  const providerId = String(input.providerId || "").trim();
  const providerLabel = String(input.providerLabel || "").trim() || providerId || "远程模型";
  const models = Array.isArray(input.models) ? input.models : [];
  const modeText = runtimeMode === "hybrid" ? "本地优先" : settingsAiRuntimeModeLabel(runtimeMode);
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
