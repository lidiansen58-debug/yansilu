import {
  buildSettingsAiExperienceBadges,
  buildSettingsAiOnboardingView,
  buildSettingsAiSetupBadges
} from "./settings-ai-experience-model.js";

export function renderAiSettingsExperienceForRuntime(deps = {}) {
  const {
    $ = () => null,
    escapeHtml = (value = "") => String(value ?? ""),
    settingsState = { ai: {} },
    normalizeAiRuntimeMode = (value = "auto") => String(value || "auto"),
    primaryRecommendedOllamaModelName = () => "qwen3:4b",
    currentAiProviderId = () => "",
    isRemoteConfigurableProviderId = () => false,
    isAiLocalFlowActive = () => false,
    installedLocalModelReady = () => false
  } = deps;
  const title = $("settingsAiSetupTitle");
  const body = $("settingsAiSetupBody");
  const badges = $("settingsAiSetupBadges");
  const topStatus = $("settingsAiTopStatus");
  const topMode = $("settingsAiTopMode");
  const topAction = $("settingsAiTopAction");
  const secondaryAction = $("settingsAiSecondaryAction");
  const offAction = $("settingsAiOffAction");
  const topHint = $("settingsAiTopHint");
  const advancedBadge = $("settingsAiAdvancedBadge");
  const labBadge = $("settingsAiLabBadge");

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
  const remoteConfigurable = isRemoteConfigurableProviderId(providerId);
  const remoteConfigReady = Boolean(String(ai.providerEndpointUrl || "").trim() && String(ai.remoteRuntimeModel || "").trim() && String(ai.secretRef || "").trim());
  const onboarding = buildSettingsAiOnboardingView({
    runtimeMode,
    localFlowActive,
    localStatus,
    localReadinessStatus: ai.localRuntimeReadinessStatus,
    localModel,
    models,
    localReady,
    testStatus: ai.testStatus,
    remoteConfigurable,
    remoteConfigReady,
    providerId,
    primaryRecommendedModel: primaryRecommendedOllamaModelName()
  });

  const badgeItems = buildSettingsAiSetupBadges({
    runtimeMode,
    localFlowActive,
    localStatus,
    localModel,
    models,
    providerId,
    providerLabel
  });
  if (badges) {
    badges.innerHTML = badgeItems
      .map((item) => `<span class="settings-stat-badge ${item.tone ? escapeHtml(item.tone) : ""}">${escapeHtml(item.text)}</span>`)
      .join("");
  }

  if (title) title.textContent = onboarding.title;
  if (body) {
    const bodyText = onboarding.body || "";
    body.textContent = bodyText;
    body.classList.toggle("hidden", !bodyText);
  }
  if (topStatus) {
    topStatus.textContent = onboarding.status;
    topStatus.classList.toggle("ok", onboarding.statusTone === "ok");
    topStatus.classList.toggle("warn", onboarding.statusTone === "warn");
    topStatus.classList.toggle("muted", onboarding.statusTone === "muted");
  }
  if (topMode) topMode.textContent = onboarding.mode;
  if (topAction) {
    topAction.textContent = onboarding.primaryAction;
    topAction.dataset.settingsAiPrimaryAction = onboarding.primaryActionKind;
  }
  if (secondaryAction) {
    const hasSecondary = Boolean(onboarding.secondaryAction && onboarding.secondaryActionKind);
    secondaryAction.classList.toggle("hidden", !hasSecondary);
    secondaryAction.textContent = onboarding.secondaryAction || "";
    secondaryAction.dataset.settingsAiPrimaryAction = onboarding.secondaryActionKind || "";
  }
  if (offAction) {
    offAction.classList.toggle("hidden", runtimeMode === "off");
  }
  if (topHint) {
    topHint.textContent = onboarding.helper || "";
    topHint.classList.toggle("hidden", !onboarding.helper);
  }
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
  if (advancedBadge) {
    advancedBadge.textContent = experienceBadges.advancedBadge.text;
    advancedBadge.classList.toggle("warn", experienceBadges.advancedBadge.warn);
    advancedBadge.classList.toggle("muted", experienceBadges.advancedBadge.muted);
  }
  if (labBadge) {
    labBadge.textContent = experienceBadges.labBadge.text;
    labBadge.classList.toggle("warn", experienceBadges.labBadge.warn);
    labBadge.classList.toggle("ok", experienceBadges.labBadge.ok);
    labBadge.classList.toggle("muted", experienceBadges.labBadge.muted);
  }

  const hybridToggle = $("settingsAiHybridToggle");
  if (hybridToggle) {
    hybridToggle.textContent = experienceBadges.hybridToggle.text;
    hybridToggle.classList.toggle("primary", experienceBadges.hybridToggle.primary);
    hybridToggle.classList.toggle("is-subtle", experienceBadges.hybridToggle.subtle);
  }
}
