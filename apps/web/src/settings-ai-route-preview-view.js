export function renderAiRoutePreviewForRuntime(deps = {}) {
  const {
    $ = () => null,
    escapeHtml = (value = "") => String(value ?? ""),
    settingsState = { ai: {} },
    normalizeAiRuntimeMode = (value = "auto") => String(value || "auto"),
    installedLocalModelReady = () => false,
    currentAiProviderId = () => "",
    activeAiProviderConfig = () => null,
    isRemoteConfigurableProviderId = () => false,
    remoteRuntimeModelFromMap = () => ""
  } = deps;
  const stats = $("settingsAiRouteStats");
  const detail = $("settingsAiRoutePreview");
  if (!stats || !detail) return;

  if (settingsState.ai.routePreviewLoading) {
    stats.innerHTML = `<span class="settings-stat-badge warn">正在预览</span>`;
    detail.textContent = "正在根据当前选择判断会使用的服务和模型...";
    return;
  }

  if (settingsState.ai.routePreviewError) {
    const runtimeMode = normalizeAiRuntimeMode(settingsState.ai.runtimeMode);
    const localModel = String(settingsState.ai.localModel || "").trim();
    const localReady = ["local_only", "hybrid"].includes(runtimeMode)
      && installedLocalModelReady(localModel);
    if (localReady) {
      stats.innerHTML = [
        `<span class="settings-stat-badge ok">${runtimeMode === "hybrid" ? "自动选择" : "只用本地模型"}</span>`,
        `<span class="settings-stat-badge ok">本地模型已就绪</span>`,
        `<span class="settings-stat-badge muted">待试运行</span>`
      ].join("");
      detail.innerHTML = `
        <div class="settings-route-preview-title">本地 AI 已就绪</div>
        <div class="settings-route-preview-copy">研思录会使用你电脑上的本地 AI 运行模型。</div>
        <div class="settings-route-preview-facts">
          <div class="settings-route-preview-fact">
            <span>使用方式</span>
            <strong>${runtimeMode === "hybrid" ? "自动选择" : "只用本地模型"}</strong>
          </div>
          <div class="settings-route-preview-fact">
            <span>运行位置</span>
            <strong>本机</strong>
          </div>
          <div class="settings-route-preview-fact">
            <span>当前模型</span>
            <strong>${escapeHtml(localModel)}</strong>
          </div>
        </div>
        <div class="settings-route-preview-privacy">数据位置：本地运行，内容不会因为这一路线发送到远程模型服务。</div>
        <div class="settings-route-preview-action">下一步：输入一句普通测试话，确认 AI 能正常回复。</div>
      `;
      return;
    }
    stats.innerHTML = `<span class="settings-stat-badge warn">需要确认</span>`;
    detail.innerHTML = `
      <div class="settings-route-preview-title">当前设置还不能确认</div>
      <div class="settings-route-preview-copy">请先检查 AI 使用方式、模型入口和远程服务信息；保存后再试运行。</div>
    `;
    return;
  }

  const preview = settingsState.ai.routePreview;
  if (!preview) {
    stats.innerHTML = `<span class="settings-stat-badge warn">等待确认</span>`;
    detail.innerHTML = `
      <div class="settings-route-preview-title">还没有确认 AI 设置</div>
      <div class="settings-route-preview-copy">先完成本地或远程大模型设置，再用一句短句试运行。</div>
    `;
    return;
  }

  function localRuntimeSummaryText() {
    const status = String(settingsState.ai.localRuntimeStatus || "unknown").trim() || "unknown";
    const models = Array.isArray(settingsState.ai.localRuntimeModels) ? settingsState.ai.localRuntimeModels : [];
    const selectedModel = String(settingsState.ai.localModel || "").trim();
    if (status === "available" && selectedModel) return `本地 AI 可连接 / ${selectedModel}`;
    if (status === "available") return `本地 AI 可连接 / ${models.length} 个模型`;
    if (status === "unavailable") return "本地 AI 不可用";
    return "本地 AI 未检测";
  }

  const provider = preview.provider || {};
  const route = preview.route || {};
  const access = preview.access || {};
  const providerId = String(provider.providerId || currentAiProviderId()).trim();
  const providerConfig = activeAiProviderConfig();
  const draftTouched = settingsState.ai.providerDraftTouched || {};
  const remoteConfigurable = isRemoteConfigurableProviderId(providerId);
  const remoteRuntimeModel = remoteConfigurable
    ? String(draftTouched.remoteRuntimeModel
      ? settingsState.ai.remoteRuntimeModel
      : settingsState.ai.remoteRuntimeModel || remoteRuntimeModelFromMap(providerId, providerConfig?.runtimeModelMap || providerConfig?.runtime_model_map || {}) || "").trim()
    : "";
  const remoteEndpointUrl = remoteConfigurable
    ? String(draftTouched.providerEndpointUrl
      ? settingsState.ai.providerEndpointUrl
      : settingsState.ai.providerEndpointUrl || providerConfig?.endpointUrl || providerConfig?.endpoint_url || "").trim()
    : "";
  function providerDisplayLabel() {
    const displayName = String(provider.displayName || "").trim();
    if (providerId === "platform_managed_openai") return "平台托管 OpenAI";
    if (displayName === "Platform Managed OpenAI") return "平台托管 OpenAI";
    if (displayName === "Ollama Local") return "本地 AI";
    return displayName || providerId || "未知服务";
  }
  function modelPackDisplayLabel(value = "") {
    const key = String(value || "").trim();
    const labels = {
      "Starter Auto": "日常整理",
      "Low Cost Research": "低成本研究",
      "Deep Work": "深度工作",
      "China Optimized": "国内优化",
      "Global Optimized": "远程增强",
      "Privacy First": "本地私密",
      "Ollama Local": "本地 AI",
      "MiniCPM Local": "MiniCPM 本地",
      "MiniCPM Remote": "MiniCPM 远程"
    };
    return labels[key] || key || "日常整理";
  }
  function routeModelDisplayLabel(value = "") {
    const key = String(value || "").trim();
    const labels = {
      standard: "标准档",
      fast: "快速档",
      balanced: "均衡档",
      strong: "高质量档",
      premium: "高质量档"
    };
    return labels[key.toLowerCase()] || key || "自动选择";
  }
  const health = preview.health || {};
  const healthStatus = String(health.status || "unknown").trim() || "unknown";
  const healthLabels = {
    healthy: "已连通",
    degraded: "需检查",
    down: "不可用",
    unknown: "待试运行"
  };
  const runtimeMode = normalizeAiRuntimeMode(settingsState.ai.runtimeMode);
  const modelRef = String(route.modelRef || "").trim();
  const routeModelName = modelRef.includes(":")
    ? modelRef.slice(modelRef.lastIndexOf(":") + 1)
    : modelRef;
  const localModel = String(settingsState.ai.localModel || "").trim();
  const rawDisplayModel = route.localOnly
    ? String(localModel || "自动选择").trim()
    : String(remoteRuntimeModel || routeModelName || "自动选择").trim();
  const displayModel = routeModelDisplayLabel(rawDisplayModel);
  const modeLabel = runtimeMode === "local_only"
    ? "只用本地模型"
    : runtimeMode === "hybrid"
      ? "自动选择"
      : runtimeMode === "cloud_only"
        ? "只用远程模型"
        : "自动选择";
  const serviceLabel = route.localOnly ? "本地 AI" : providerDisplayLabel();
  const ready = route.localOnly
    ? installedLocalModelReady(localModel)
    : access.ready === true && (!remoteConfigurable || Boolean(remoteEndpointUrl && remoteRuntimeModel));
  const statusText = route.localOnly
    ? (ready ? "本地 AI 已就绪" : "本地 AI 待设置")
    : (ready ? "在线 AI 已就绪" : "在线 AI 待设置");
  const statusTone = ready ? "ok" : "warn";
  const actionText = ready
    ? "下一步：输入一句普通测试话，确认 AI 能正常回复。"
    : route.localOnly
      ? "下一步：在本地 AI 面板启动本地 AI，并选择或下载一个模型。"
      : "下一步：填写服务地址、模型名和密钥名称，然后保存。";
  const localRuntimeLine = ["local_only", "hybrid"].includes(runtimeMode)
    ? `<div class="settings-route-preview-meta">${escapeHtml(localRuntimeSummaryText())}</div>`
    : "";
  const routeTitle = statusText;
  const routeSummary = route.localOnly
    ? ready
      ? "研思录会使用你电脑上的本地 AI 运行模型，适合处理更私密的研究材料。"
      : "本地 AI 还没有准备好。安装、运行、下载和切换模型都在本地 AI 面板完成。"
    : ready
      ? "研思录会使用平台托管的在线 AI，不需要你自己填写密钥。"
      : "在线 AI 还没有准备好。请先保存远程服务信息，再做试运行。";
  const privacyText = route.localOnly
    ? "数据位置：本地运行，内容不会因为这一路线发送到远程模型服务。"
    : "数据位置：试运行内容会发送到在线 AI 服务；含隐私内容时建议切到本地 AI。";
  const factRows = route.localOnly
    ? [
        ["使用方式", modeLabel],
        ["运行位置", "本机"],
        ["当前模型", displayModel]
      ]
    : [
        ["使用方式", modeLabel],
        ["服务来源", serviceLabel],
        ["模型档位", displayModel]
      ];

  stats.innerHTML = [
    `<span class="settings-stat-badge ${route.localOnly ? "ok" : ""}">${escapeHtml(modeLabel)}</span>`,
    `<span class="settings-stat-badge ${statusTone}">${escapeHtml(statusText)}</span>`,
    `<span class="settings-stat-badge muted">${escapeHtml(healthLabels[healthStatus] || "待试运行")}</span>`
  ].join("");
  detail.innerHTML = `
    <div class="settings-route-preview-title">${escapeHtml(routeTitle)}</div>
    <div class="settings-route-preview-copy">${escapeHtml(routeSummary)}</div>
    <div class="settings-route-preview-facts">
      ${factRows.map(([label, value]) => `
        <div class="settings-route-preview-fact">
          <span>${escapeHtml(label)}</span>
          <strong>${escapeHtml(value)}</strong>
        </div>
      `).join("")}
    </div>
    <div class="settings-route-preview-meta">AI 方案：${escapeHtml(modelPackDisplayLabel(preview.modelPack || settingsState.ai.modelPack || "Starter Auto"))}</div>
    ${localRuntimeLine}
    <div class="settings-route-preview-privacy">${escapeHtml(privacyText)}</div>
    <div class="settings-route-preview-action">${escapeHtml(actionText)}</div>
  `;
}
