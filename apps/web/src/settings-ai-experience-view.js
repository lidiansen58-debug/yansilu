import {
  buildSettingsAiExperienceBadges,
  buildSettingsAiSetupBadges
} from "./settings-ai-experience-model.js";

export function renderAiSettingsExperienceForRuntime(deps = {}) {
  const {
    $ = () => null,
    escapeHtml = (value = "") => String(value ?? ""),
    settingsState = { ai: {} },
    normalizeAiRuntimeMode = (value = "auto") => String(value || "auto"),
    currentOllamaSetupGuide = () => null,
    primaryRecommendedOllamaModelName = () => "qwen3:4b",
    currentAiProviderId = () => "",
    isAiLocalFlowActive = () => false,
    preferredLocalProviderPresetForSelection = () => "ollama_local_gateway",
    defaultProviderEndpointUrl = () => "",
    OLLAMA_CHAT_ENDPOINT_URL = "",
    defaultProviderHealthEndpointUrl = () => "",
    OLLAMA_HEALTH_ENDPOINT_URL = "",
    isLocalModelPack = () => false,
    ollamaRuntimeStateLabel = () => "",
    installedLocalModelReady = () => false,
    ollamaRecommendationHintText = () => ""
  } = deps;
  const title = $("settingsAiSetupTitle");
  const body = $("settingsAiSetupBody");
  const badges = $("settingsAiSetupBadges");
  const quickstartStatus = $("settingsAiQuickstartStatus");
  const localHomeSteps = $("settingsAiLocalHomeSteps");
  const stepsEl = $("settingsAiSetupSteps");
  const localHint = $("settingsAiLocalHint");
  const advancedBadge = $("settingsAiAdvancedBadge");
  const labBadge = $("settingsAiLabBadge");
  if (!badges || !localHint || !advancedBadge || !labBadge) return;

  const runtimeMode = normalizeAiRuntimeMode(settingsState.ai.runtimeMode);
  const localMode = runtimeMode === "local_only" || runtimeMode === "hybrid";
  const localStatus = String(settingsState.ai.localRuntimeStatus || "unknown").trim() || "unknown";
  const models = Array.isArray(settingsState.ai.localRuntimeModels) ? settingsState.ai.localRuntimeModels : [];
  const setupGuide = currentOllamaSetupGuide();
  const guideAction = String(setupGuide?.nextAction || "").trim();
  const guideSteps = Array.isArray(setupGuide?.steps) ? setupGuide.steps : [];
  const guideRecommendedModel = primaryRecommendedOllamaModelName();
  const localModel = String(settingsState.ai.localModel || "").trim();
  const modelPack = String(settingsState.ai.modelPack || "").trim();
  const providerId = currentAiProviderId();
  const providerDisplayName = String(settingsState.ai.routePreview?.provider?.displayName || "").trim();
  const localFlowActive = isAiLocalFlowActive({
    runtimeMode,
    modelPack,
    providerId
  });
  const localDefaultsProviderId = localFlowActive ? preferredLocalProviderPresetForSelection() : providerId;
  const providerLabel = providerId === "platform_managed_openai"
    ? "平台托管 OpenAI"
    : providerDisplayName === "Ollama Local"
      ? "本地 AI"
      : providerDisplayName || providerId || "未选择服务";
  const routeModelRef = String(settingsState.ai.routePreview?.route?.modelRef || "").trim();
  const endpointOverride = String(settingsState.ai.providerEndpointUrl || "").trim();
  const healthOverride = String(settingsState.ai.providerHealthEndpointUrl || "").trim();
  const defaultEndpoint = defaultProviderEndpointUrl(localDefaultsProviderId) || (localFlowActive ? OLLAMA_CHAT_ENDPOINT_URL : "");
  const defaultHealthEndpoint =
    defaultProviderHealthEndpointUrl(localDefaultsProviderId, endpointOverride || defaultEndpoint) ||
    (localFlowActive ? OLLAMA_HEALTH_ENDPOINT_URL : "");
  const implicitLocalModelRef =
    localModel && (runtimeMode === "local_only" || isLocalModelPack(modelPack))
      ? `${preferredLocalProviderPresetForSelection()}:${localModel}`
      : "";
  const implicitLocalAdvancedOverride =
    Boolean(settingsState.ai.routePreview?.route?.advancedOverride) &&
    Boolean(implicitLocalModelRef) &&
    routeModelRef === implicitLocalModelRef;
  const advancedFields = [
    String(settingsState.ai.advancedModelRef || "").trim() !== implicitLocalModelRef
      ? String(settingsState.ai.advancedModelRef || "").trim()
      : "",
    String(settingsState.ai.secretRef || "").trim(),
    endpointOverride && endpointOverride !== defaultEndpoint ? endpointOverride : "",
    healthOverride && healthOverride !== defaultHealthEndpoint ? healthOverride : ""
  ].filter(Boolean).length;
  const hasMeaningfulAdvancedOverride = Boolean(settingsState.ai.routePreview?.route?.advancedOverride) && !implicitLocalAdvancedOverride;

  const localRuntimeLabel = ollamaRuntimeStateLabel();
  const badgeItems = buildSettingsAiSetupBadges({
    runtimeMode,
    localFlowActive,
    localStatus,
    localRuntimeLabel,
    localModel,
    models,
    providerId,
    providerLabel
  });
  badges.innerHTML = badgeItems
    .map((item) => `<span class="settings-stat-badge ${item.tone ? escapeHtml(item.tone) : ""}">${escapeHtml(item.text)}</span>`)
    .join("");

  let setupTitle = "当前适合日常研究任务";
  let setupBody = "默认设置会自动选择合适的服务，适合阅读、摘要、整理和一般写作辅助。需要处理敏感材料时，请切到“只用本地模型”。";
  let quickstartLabel = "自动推荐";
  let helperText = "只有需要本地模型时，才需要安装并检测本地 AI；日常研究可以先保持自动。";
  let steps = [
    { state: "complete", title: "默认方案已可使用", note: "不需要先理解模型参数，也不需要安装本地环境。" },
    { state: "current", title: "需要私密处理时再切换", note: "把 AI 使用方式改为“只用本地模型”，再按提示检测本地模型。" },
    { state: "pending", title: "用一句短句试运行", note: "保存设置后，发一句不含敏感内容的测试语确认连接。" }
  ];
  let homeSteps = [
    { state: "current", title: "安装并启动本地 AI" },
    { state: "pending", title: `安装推荐模型 ${guideRecommendedModel}` },
    { state: "pending", title: "试运行一句短句" }
  ];

  if (localFlowActive) {
    helperText = "本地模式下，推荐顺序是：检测本地 AI，下载或选择模型，最后用一句短句试运行。";
    if (settingsState.ai.localRuntimeChecking) {
      setupTitle = "正在检测本地模型环境";
      setupBody = "研思录正在检查这台电脑上的本地 AI 服务和已安装模型，通常几秒内会返回状态。";
      quickstartLabel = "检测中";
      steps = [
        { state: "complete", title: "已进入本地模型流程", note: `${runtimeMode === "hybrid" ? "当前是本地优先模式" : "当前只使用本地模型"}。` },
        { state: "current", title: "正在检测本地 AI", note: "如果等待过久，先确认本地 AI 应用是否已经启动。" },
        { state: "pending", title: "检测完成后选择或下载模型", note: `建议优先从 ${guideRecommendedModel} 开始。` }
      ];
    } else if (localStatus !== "available") {
      const installedNotRunning = settingsState.ai.localRuntimeReadinessStatus === "installed_not_running";
      setupTitle = "先让本地 AI 在这台电脑上启动";
      setupBody = installedNotRunning
        ? "已检测到本地 AI 运行环境，但服务还没有运行。可以在这里启动本地 AI，或先手动打开本地 AI 应用。"
        : "当前还没有连上本地 AI。先安装并启动本地 AI，再回来点“检测本地 AI”。";
      quickstartLabel = installedNotRunning ? "等待启动" : "等待本地 AI";
      steps = [
        { state: "complete", title: "已进入本地模型流程", note: `${runtimeMode === "hybrid" ? "本地优先已启用，敏感资料仍建议切到只用本地模型。" : "AI 任务会尽量留在这台电脑上。"} ` },
        { state: "current", title: installedNotRunning ? "启动本地 AI" : "下载并启动本地 AI", note: installedNotRunning ? "点击“启动本地 AI”，或手动打开本地 AI 应用。" : "如果还没安装，点“下载本地 AI 运行环境”；安装后保持它在后台运行。" },
        { state: "pending", title: "回到研思录，点“检测本地 AI”", note: "检测成功后，研思录会自动列出可选的本地模型。" }
      ];
      if (guideAction === "install_or_start_ollama" && guideSteps.length) {
        steps = [
          { state: "complete", title: "已切到本地模型流程", note: runtimeMode === "hybrid" ? "本地优先已启用，敏感资料仍建议切到只用本地模型。" : "已切到只用本地模型，本地模型就绪前不会默认使用远程服务。" },
          { state: "current", title: "下载并启动本地 AI", note: "安装后保持本地 AI 在后台运行。" },
          { state: "pending", title: guideSteps[2] || "回到研思录重新检测", note: "检测成功后会显示本地模型列表。" }
        ];
      }
      helperText = installedNotRunning
        ? "启动只会尝试运行已安装的本地 AI，不会安装系统软件。"
        : "如果刚装好本地 AI 但仍显示未连接，先确认本地 AI 应用已经启动。";
      homeSteps = [
        { state: "current", title: "安装并启动本地 AI" },
        { state: "pending", title: `安装推荐模型 ${guideRecommendedModel}` },
        { state: "pending", title: "试运行一句短句" }
      ];
    } else if (!models.length) {
      setupTitle = "本地 AI 已连上，还差一个本地模型";
      setupBody = `本地 AI 已经可用，但这台电脑里还没有可运行的模型。直接点“下载 ${guideRecommendedModel}”即可开始。`;
      quickstartLabel = "等待模型";
      steps = [
        { state: "complete", title: "本地 AI 已连接", note: "研思录已经能访问这台电脑上的本地模型服务。" },
        { state: "current", title: "下载第一个本地模型", note: `推荐先从 ${guideRecommendedModel} 开始，兼顾效果和资源占用。` },
        { state: "pending", title: "下载后回来选择它并测试", note: "模型下载完成后，下面的本地模型下拉框会自动出现选项。" }
      ];
      if (guideAction === "pull_recommended_model" && guideSteps.length) {
        steps = [
          { state: "complete", title: "本地 AI 已连接", note: "本地推理服务在线。" },
          { state: "current", title: guideSteps[0] || `下载推荐模型 ${guideRecommendedModel}`, note: guideSteps[1] || "下载完成后会自动设为本地模型。" },
          { state: "pending", title: guideSteps[2] || "运行一次测试聊天", note: "测试通过后即可开始使用本地模型。" }
        ];
      }
      homeSteps = [
        { state: "complete", title: "本地 AI 已启动" },
        { state: "current", title: `安装推荐模型 ${guideRecommendedModel}` },
        { state: "pending", title: "试运行一句短句" }
      ];
    } else if (!installedLocalModelReady(localModel)) {
      setupTitle = "本地模型已经可选，再选一个就能开始";
      setupBody = localModel
        ? `当前选择的 ${localModel} 没有在本地模型列表里检测到。请重新检测，或从下拉框里选一个已安装模型。`
        : "本地 AI 和模型都已经准备好了。现在从“本地模型”里选一个即可。";
      quickstartLabel = "选择模型";
      steps = [
        { state: "complete", title: "本地 AI 已连接", note: "本地推理服务在线。" },
        { state: "complete", title: "至少有一个本地模型可用", note: `当前检测到 ${models.length} 个模型。` },
        { state: "current", title: localModel ? "重新选择已安装模型" : "从下拉框里选一个模型", note: "选中后建议试运行一次，确认当前确实走本地。" }
      ];
      if (guideAction === "select_or_test_model" && guideSteps.length) {
        steps = [
          { state: "complete", title: "本地 AI 已连接", note: "本地推理服务在线。" },
          { state: "current", title: guideSteps[0] || "选择一个本地模型", note: guideSteps[1] || "选择后会保存当前服务配置。" },
          { state: "pending", title: guideSteps[2] || "运行一次测试聊天", note: "确认返回来自当前模型。" }
        ];
      }
      homeSteps = [
        { state: "complete", title: "本地 AI 已启动" },
        { state: "complete", title: "本地模型已安装" },
        { state: "current", title: "选择模型并试运行" }
      ];
    } else {
      setupTitle = "本地模型已经就绪";
      setupBody = runtimeMode === "hybrid"
        ? `当前已选中 ${localModel}。本地优先是高级模式，部分任务仍可能使用远程；敏感资料请切换到“只用本地模型”。`
        : `当前已选中 ${localModel}。AI 任务会尽量留在这台电脑上，不再默认依赖远程服务。`;
      quickstartLabel = "本地已就绪";
      steps = [
        { state: "complete", title: "已切到本地模型流程", note: `${runtimeMode === "hybrid" ? "当前是本地优先模式" : "当前只使用本地模型"}。` },
        { state: "complete", title: "本地 AI 和模型都已准备好", note: `当前使用 ${localModel}。` },
        { state: settingsState.ai.testOutput ? "complete" : "current", title: "试运行一次确认连接", note: settingsState.ai.testOutput ? "最近一次测试已经返回结果。" : "现在适合试运行一次，确认内容从本地模型返回。" }
      ];
      homeSteps = [
        { state: "complete", title: "本地 AI 已启动" },
        { state: "complete", title: `本地模型 ${localModel}` },
        { state: settingsState.ai.testOutput ? "complete" : "current", title: "试运行一句短句" }
      ];
    }
  }

  if (title) title.textContent = setupTitle;
  if (body) body.textContent = setupBody;
  if (quickstartStatus) {
    quickstartStatus.textContent = quickstartLabel;
    quickstartStatus.classList.toggle("ok", quickstartLabel === "本地已就绪");
    quickstartStatus.classList.toggle("warn", ["等待本地 AI", "等待启动", "等待模型", "选择模型", "检测中"].includes(quickstartLabel));
    quickstartStatus.classList.toggle("muted", quickstartLabel === "自动推荐");
  }
  if (localHomeSteps) {
    localHomeSteps.innerHTML = homeSteps
      .map((step) => `<span class="settings-ai-local-home-step ${escapeHtml(step.state === "complete" ? "is-complete" : step.state === "current" ? "is-current" : "")}">${escapeHtml(step.title)}</span>`)
      .join("");
  }
  const localGuide = $("settingsAiLocalGuide");
  const localGuideBadge = $("settingsAiLocalGuideBadge");
  const localGuideTitle = $("settingsAiLocalGuideTitle");
  const localGuideBody = $("settingsAiLocalGuideBody");
  const localGuideHint = $("settingsAiLocalGuideHint");
  let localGuideState = "idle";
  let localGuideBadgeText = "第 1 步";
  let localGuideTone = "muted";
  let localGuideTitleText = "先启用本地大模型";
  let localGuideBodyText = "点击“使用本地大模型”，然后检测这台电脑的本地 AI 环境是否已经安装并运行。";
  let localGuideHintText = "没有安装时，会在这里给出官方下载入口。";
  if (localFlowActive) {
    if (settingsState.ai.localRuntimeChecking) {
      localGuideState = "checking";
      localGuideBadgeText = "正在检测";
      localGuideTone = "warn";
      localGuideTitleText = "正在检查本地 AI 是否可用";
      localGuideBodyText = "研思录正在检查这台电脑上的本地 AI 服务和已安装模型。";
      localGuideHintText = "如果长时间没有结果，先确认本地 AI 应用是否已经启动。";
    } else if (localStatus !== "available") {
      const installedNotRunning = settingsState.ai.localRuntimeReadinessStatus === "installed_not_running";
      localGuideState = "blocked";
      localGuideBadgeText = installedNotRunning ? "需要启动" : "需要安装";
      localGuideTone = "warn";
      localGuideTitleText = installedNotRunning ? "本地 AI 已安装，但还没有运行" : "还没有检测到本地 AI";
      localGuideBodyText = installedNotRunning
        ? "可以点击“启动本地 AI”，也可以手动打开本地 AI 应用。研思录不会静默安装系统软件。"
        : "先下载并安装本地 AI 运行环境，安装后保持它在后台运行，再回到这里点“检测本地 AI”。";
      localGuideHintText = installedNotRunning
        ? "启动失败时，请手动打开本地 AI 应用后重新检测。"
        : `下载地址：${String(setupGuide?.installUrl || "https://ollama.com/download").trim() || "https://ollama.com/download"}`;
    } else if (!models.length) {
      localGuideState = "blocked";
      localGuideBadgeText = "需要模型";
      localGuideTone = "warn";
      localGuideTitleText = "本地 AI 已启动，还缺一个本地模型";
      localGuideBodyText = `点击“下载 ${guideRecommendedModel}”，研思录会把推荐模型下载到这台电脑。`;
      localGuideHintText = `推荐顺序：${ollamaRecommendationHintText()}。下载可能需要几分钟。`;
    } else if (!installedLocalModelReady(localModel)) {
      localGuideState = "idle";
      localGuideBadgeText = "选择模型";
      localGuideTone = "warn";
      localGuideTitleText = localModel ? "当前选择的模型没有检测到" : "本地 AI 已可用，选择一个本地模型";
      localGuideBodyText = localModel
        ? `${localModel} 不在当前本地模型列表里。请重新检测，或从下面选择一个已安装模型。`
        : `当前检测到 ${models.length} 个模型。从下面的“本地模型”下拉框里选一个即可。`;
      localGuideHintText = "选中后建议打开“试运行”，确认返回确实来自本地模型。";
    } else {
      localGuideState = "ready";
      localGuideBadgeText = "已就绪";
      localGuideTone = "ok";
      localGuideTitleText = `已可用：${localModel}`;
      localGuideBodyText = "适合本机处理研究笔记、摘要和整理。需要更换时直接在下方选择模型。";
      localGuideHintText = "";
    }
  }
  const localSetupReady = localFlowActive && installedLocalModelReady(localModel);
  if (localHomeSteps) localHomeSteps.classList.toggle("hidden", localSetupReady);
  if (localGuide) localGuide.dataset.state = localGuideState;
  if (localGuideBadge) {
    localGuideBadge.textContent = localGuideBadgeText;
    localGuideBadge.classList.toggle("ok", localGuideTone === "ok");
    localGuideBadge.classList.toggle("warn", localGuideTone === "warn");
    localGuideBadge.classList.toggle("muted", localGuideTone === "muted");
  }
  if (localGuideTitle) localGuideTitle.textContent = localGuideTitleText;
  if (localGuideBody) localGuideBody.textContent = localGuideBodyText;
  if (localGuideHint) localGuideHint.textContent = localGuideHintText;
  if (stepsEl) {
    stepsEl.classList.toggle("hidden", localSetupReady);
    stepsEl.innerHTML = steps
      .map((step, index) => `
        <div class="settings-ai-step ${escapeHtml(step.state === "complete" ? "is-complete" : step.state === "current" ? "is-current" : "")}">
          <span class="settings-ai-step-index">${step.state === "complete" ? "✓" : index + 1}</span>
          <div>
            <span class="settings-ai-step-title">${escapeHtml(step.title)}</span>
            <span class="settings-ai-step-note">${escapeHtml(step.note)}</span>
          </div>
        </div>
      `)
      .join("");
  }
  localHint.textContent = helperText;
  localHint.classList.toggle("hidden", localSetupReady);

  const experienceBadges = buildSettingsAiExperienceBadges({
    advancedFields,
    hasMeaningfulAdvancedOverride,
    testRunning: settingsState.ai.testRunning,
    testOutput: settingsState.ai.testOutput,
    runtimeMode
  });
  advancedBadge.textContent = experienceBadges.advancedBadge.text;
  advancedBadge.classList.toggle("warn", experienceBadges.advancedBadge.warn);
  advancedBadge.classList.toggle("muted", experienceBadges.advancedBadge.muted);

  labBadge.textContent = experienceBadges.labBadge.text;
  labBadge.classList.toggle("warn", experienceBadges.labBadge.warn);
  labBadge.classList.toggle("ok", experienceBadges.labBadge.ok);
  labBadge.classList.toggle("muted", experienceBadges.labBadge.muted);

  const hybridToggle = $("settingsAiHybridToggle");
  if (hybridToggle) {
    hybridToggle.textContent = experienceBadges.hybridToggle.text;
    hybridToggle.classList.toggle("primary", experienceBadges.hybridToggle.primary);
    hybridToggle.classList.toggle("is-subtle", experienceBadges.hybridToggle.subtle);
  }
}
