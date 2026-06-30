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

  const ai = settingsState.ai || {};
  const runtimeMode = normalizeAiRuntimeMode(ai.runtimeMode);
  const localStatus = String(ai.localRuntimeStatus || "unknown").trim() || "unknown";
  const models = Array.isArray(ai.localRuntimeModels) ? ai.localRuntimeModels : [];
  const localModel = String(ai.localModel || "").trim();
  const providerId = currentAiProviderId();
  const providerDisplayName = String(ai.routePreview?.provider?.displayName || "").trim();
  const providerLabel = providerId === "platform_managed_openai"
    ? "远程模型"
    : providerDisplayName === "Ollama Local"
      ? "本地模型"
      : providerDisplayName || providerId || "远程模型";
  const localFlowActive = isAiLocalFlowActive({
    runtimeMode,
    modelPack: ai.modelPack,
    providerId
  });
  const localReady = localFlowActive && installedLocalModelReady(localModel);

  const badgeItems = buildSettingsAiSetupBadges({
    runtimeMode,
    localFlowActive,
    localStatus,
    localModel,
    models,
    providerId,
    providerLabel
  });
  badges.innerHTML = badgeItems
    .map((item) => `<span class="settings-stat-badge ${item.tone ? escapeHtml(item.tone) : ""}">${escapeHtml(item.text)}</span>`)
    .join("");

  const view = buildCurrentView({
    ai,
    runtimeMode,
    localFlowActive,
    localStatus,
    models,
    localModel,
    localReady,
    primaryRecommendedModel: primaryRecommendedOllamaModelName(),
    setupGuide: currentOllamaSetupGuide(),
    recommendationHint: ollamaRecommendationHintText()
  });

  if (title) title.textContent = view.title;
  if (body) body.textContent = view.body;
  if (quickstartStatus) {
    quickstartStatus.textContent = view.status;
    quickstartStatus.classList.toggle("ok", view.statusTone === "ok");
    quickstartStatus.classList.toggle("warn", view.statusTone === "warn");
    quickstartStatus.classList.toggle("muted", view.statusTone === "muted");
  }
  if (localHomeSteps) {
    localHomeSteps.classList.toggle("hidden", localReady);
    localHomeSteps.innerHTML = view.homeSteps
      .map((step) => `<span class="settings-ai-local-home-step ${escapeHtml(step.state === "complete" ? "is-complete" : step.state === "current" ? "is-current" : "")}">${escapeHtml(step.title)}</span>`)
      .join("");
  }

  renderLocalGuide({ $, localFlowActive, localStatus, localReady, localModel, models, view });
  if (stepsEl) {
    stepsEl.classList.toggle("hidden", localReady);
    stepsEl.innerHTML = view.steps
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
  localHint.textContent = view.helper;
  localHint.classList.toggle("hidden", localReady);

  const advancedFields = [
    String(ai.advancedModelRef || "").trim(),
    String(ai.secretRef || "").trim(),
    String(ai.providerEndpointUrl || "").trim(),
    String(ai.providerHealthEndpointUrl || "").trim()
  ].filter(Boolean).length;
  const experienceBadges = buildSettingsAiExperienceBadges({
    advancedFields,
    hasMeaningfulAdvancedOverride: Boolean(ai.routePreview?.route?.advancedOverride),
    testRunning: ai.testRunning,
    testStatus: ai.testStatus,
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

function buildCurrentView({
  ai,
  runtimeMode,
  localFlowActive,
  localStatus,
  models,
  localModel,
  localReady,
  primaryRecommendedModel,
  setupGuide,
  recommendationHint
}) {
  const localNotRunning = ai.localRuntimeReadinessStatus === "installed_not_running";
  if (!localFlowActive) {
    return {
      title: ai.testStatus === "success" ? "远程模型可以使用" : "当前选择远程模型",
      body: "远程模型效果可能更好，需要网络；如果使用自己的服务，还需要密钥名称。处理私密材料时，可以切换到本地模型。",
      status: ai.testStatus === "success" ? "测试成功" : "未测试",
      statusTone: ai.testStatus === "success" ? "ok" : "muted",
      helper: "只需要确认两件事：当前是否可用，以及测试一句话是否成功。",
      homeSteps: [
        { state: "complete", title: "选择远程模型" },
        { state: "pending", title: "测试一句话" }
      ],
      steps: [
        { state: "complete", title: "已选择远程模型", note: "效果可能更好，需要网络；自定义服务需要密钥名称。" },
        { state: ai.testStatus === "success" ? "complete" : "current", title: "测试一句话", note: ai.testStatus === "success" ? "最近一次测试已成功。" : "用一句不含敏感内容的话确认能正常回复。" }
      ]
    };
  }
  if (ai.localRuntimeChecking) {
    return localView("正在检测本地模型", "正在确认这台电脑上的本地模型是否可用。", "检测中", "warn", [
      ["complete", "已选择本地模型", "隐私更好，速度取决于电脑。"],
      ["current", "正在检测", "通常几秒内会返回结果。"]
    ]);
  }
  if (localStatus !== "available") {
    return localView(
      localNotRunning ? "本地模型还没启动" : "还没有检测到本地模型",
      localNotRunning
        ? "本地模型已安装但没有运行。启动后再检测一次。"
        : "先安装并启动本地模型，再回到这里检测。",
      localNotRunning ? "需要启动" : "需要安装",
      "warn",
      [
        ["complete", "已选择本地模型", runtimeMode === "hybrid" ? "会优先在这台电脑上处理。" : "内容会尽量留在这台电脑上处理。"],
        ["current", localNotRunning ? "启动本地模型" : "安装并启动本地模型", setupGuide?.installUrl ? `下载地址：${setupGuide.installUrl}` : "安装后保持它在后台运行。"],
        ["pending", "检测可用性", "检测成功后再测试一句话。"]
      ]
    );
  }
  if (!models.length) {
    return localView("本地模型服务可用，还缺一个模型", `建议先下载 ${primaryRecommendedModel}，然后测试一句话。`, "需要模型", "warn", [
      ["complete", "本地服务已启动", "研思录可以连接到这台电脑上的模型服务。"],
      ["current", `下载 ${primaryRecommendedModel}`, recommendationHint || "下载可能需要几分钟。"],
      ["pending", "测试一句话", "确认模型能正常回复。"]
    ]);
  }
  if (!localReady) {
    return localView("选择一个本地模型", localModel ? `${localModel} 没有在本地检测到。请重新选择。` : "检测到本地模型后，先选一个作为默认模型。", "选择模型", "warn", [
      ["complete", "本地服务已启动", `检测到 ${models.length} 个模型。`],
      ["current", "选择本地模型", "选择后用一句普通话测试。"]
    ]);
  }
  return localView("本地模型已可用", `当前使用 ${localModel}。隐私更好，速度取决于电脑性能。`, ai.testStatus === "success" ? "测试成功" : "可用", "ok", [
    ["complete", "本地模型已启动", "内容会尽量留在这台电脑上处理。"],
    ["complete", `已选择 ${localModel}`, "后续 AI 功能会使用它。"],
    [ai.testStatus === "success" ? "complete" : "current", "测试一句话", ai.testStatus === "success" ? "最近一次测试已成功。" : "确认 AI 能正常回复。"]
  ], true);
}

function localView(title, body, status, statusTone, rawSteps, ready = false) {
  const steps = rawSteps.map(([state, titleText, note]) => ({ state, title: titleText, note }));
  return {
    title,
    body,
    status,
    statusTone,
    helper: ready ? "" : "本地模型隐私更好，速度取决于电脑；第一次使用需要安装、启动并选择模型。",
    homeSteps: [
      { state: "complete", title: "选择本地模型" },
      { state: ready ? "complete" : "current", title: "确认可用" },
      { state: ready ? "current" : "pending", title: "测试一句话" }
    ],
    steps
  };
}

function renderLocalGuide({ $, localFlowActive, localStatus, localReady, localModel, models, view }) {
  const localGuide = $("settingsAiLocalGuide");
  const localGuideBadge = $("settingsAiLocalGuideBadge");
  const localGuideTitle = $("settingsAiLocalGuideTitle");
  const localGuideBody = $("settingsAiLocalGuideBody");
  const localGuideHint = $("settingsAiLocalGuideHint");
  const tone = localReady ? "ok" : localFlowActive ? "warn" : "muted";
  if (localGuide) localGuide.dataset.state = localReady ? "ready" : localFlowActive ? "blocked" : "idle";
  if (localGuideBadge) {
    localGuideBadge.textContent = localReady ? "本地可用" : localFlowActive ? "待完成" : "可选";
    localGuideBadge.classList.toggle("ok", tone === "ok");
    localGuideBadge.classList.toggle("warn", tone === "warn");
    localGuideBadge.classList.toggle("muted", tone === "muted");
  }
  if (localGuideTitle) {
    localGuideTitle.textContent = localReady
      ? `已可用：${localModel}`
      : localFlowActive
        ? view.title
        : "需要私密处理时再启用本地模型";
  }
  if (localGuideBody) {
    localGuideBody.textContent = localReady
      ? "适合处理私密笔记、摘要和整理任务。"
      : localFlowActive
        ? view.body
        : "本地模型会在这台电脑上处理内容。";
  }
  if (localGuideHint) {
    localGuideHint.textContent = localReady
      ? ""
      : localStatus === "available" && models.length
        ? "选择模型后，建议测试一句话。"
        : view.helper;
  }
}
