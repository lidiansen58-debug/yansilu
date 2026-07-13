import {
  localAiSetupStatusMessage
} from "./local-ai-setup-view.js";

const FEATURE_ACTIONS = Object.freeze({
  graph_analysis: "graph_analysis",
  graph_connect: "graph_connect",
  theme_index: "graph_analysis",
  note_analysis: "note_analysis",
  distill_material: "ai_summary",
  writing_check: "writing_check",
  ai_summary: "ai_summary"
});

function cleanText(value = "") {
  return String(value || "").trim();
}

async function activateLocalSetup(deps = {}) {
  const {
    activateLocalAiSetupFlow = () => {},
    restoreOnFailure = true
  } = deps;
  try {
    return await activateLocalAiSetupFlow({ restoreOnFailure }) !== false;
  } catch {
    return false;
  }
}

export function createLocalAiSetupController(depsProvider = () => ({})) {
  const deps = () => depsProvider() || {};

  async function ensureReadyForAiFeature(options = {}) {
    const {
      localOllamaSetupActive = () => false,
      shouldUseOllamaLocalRuntime = () => false,
      previewOllamaLocalAiBootstrapFromUi = async () => null,
      localAiPreviewOptionsForAction = () => ({}),
      primaryRecommendedOllamaModelName = () => "",
      ollamaBootstrapStatusText = () => "",
      ollamaRecommendationForModel = () => null,
      currentOllamaModelTiers = () => [],
      localAiFeatureReady = () => false,
      shouldGuideLocalAiSetupForFeature = () => false,
      localAiSetupSyncPending = () => false,
      activateModule = () => {},
      activateLocalAiSetupFlow = () => {},
      setSettingsItem = () => {},
      renderSettingsPanel = () => {},
      setStatus = () => {}
    } = deps();
    if (localAiFeatureReady() && !localAiSetupSyncPending()) {
      return { ready: true, skipped: true, reason: "local_ai_ready" };
    }
    if (!localOllamaSetupActive() && !shouldGuideLocalAiSetupForFeature(options)) {
      return { ready: true, skipped: true, reason: "not_local_ai_setup_flow" };
    }
    if (localOllamaSetupActive() && !shouldUseOllamaLocalRuntime()) {
      return { ready: true, skipped: true, reason: "not_local_ollama" };
    }

    const feature = cleanText(options.feature);
    const model = cleanText(options.model || primaryRecommendedOllamaModelName());
    const action = FEATURE_ACTIONS[feature] || feature || "ai_feature";
    const localSetupPreview = !localOllamaSetupActive() && shouldGuideLocalAiSetupForFeature(options);
    const result = await previewOllamaLocalAiBootstrapFromUi({
      ...localAiPreviewOptionsForAction(action),
      model,
      ...(localSetupPreview ? { allowLocalSetupPreview: true } : {})
    });
    if (result?.ready === true) {
      if ((localSetupPreview || localAiSetupSyncPending()) && !await activateLocalSetup({ activateLocalAiSetupFlow })) {
        const message = "本地 AI 已可用，但保存为当前 AI 设置失败。请打开 AI 设置重试；不影响继续写笔记、手工整理关系和进入写作中心。";
        setStatus(message, "warn", { priority: 3, holdMs: 8000 });
        return { ready: false, result, message, reason: "local_ai_setup_save_failed" };
      }
      if (!localAiFeatureReady()) {
        const message = "请先完成 AI 设置并测试通过，再回来使用 AI 推荐。";
        if (options.openSettings !== false) {
          setStatus(message, "warn", { priority: 3, holdMs: 8000 });
          activateModule("settings");
          setSettingsItem("ai-settings", { render: false });
          renderSettingsPanel();
        }
        if (options.openSettings === false) setStatus(message, "warn", { priority: 3, holdMs: 8000 });
        return { ready: false, result, message, reason: "local_ai_needs_test" };
      }
      return { ready: true, result };
    }

    if (options.openSettings !== false) {
      if (localSetupPreview) await activateLocalSetup({ activateLocalAiSetupFlow, restoreOnFailure: false });
      activateModule("settings");
      setSettingsItem("ai-settings", { render: false });
      renderSettingsPanel();
    }

    const readyModel = cleanText(result?.model || model);
    const message = localAiSetupStatusMessage({
      feature,
      result,
      model: readyModel,
      modelProfile: ollamaRecommendationForModel(readyModel, currentOllamaModelTiers()),
      statusText: ollamaBootstrapStatusText(result)
    });
    const setupMessage = options.openSettings !== false
      ? `请先完成 AI 设置并测试通过，再回来使用 AI 推荐。${message ? ` ${message}` : ""}`
      : message;
    setStatus(setupMessage, "warn", { priority: 3, holdMs: 8000 });
    return { ready: false, result, message: setupMessage };
  }

  return {
    ensureReadyForAiFeature
  };
}
