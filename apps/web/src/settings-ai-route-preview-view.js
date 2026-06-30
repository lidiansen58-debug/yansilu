import { settingsAiRuntimeModeLabel } from "./settings-ai-experience-model.js";

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

  const ai = settingsState.ai || {};
  const runtimeMode = normalizeAiRuntimeMode(ai.runtimeMode);
  const localModel = String(ai.localModel || "").trim();
  const localReady = ["local_only", "hybrid"].includes(runtimeMode)
    && installedLocalModelReady(localModel);

  if (ai.routePreviewLoading) {
    stats.innerHTML = `<span class="settings-stat-badge warn">正在确认</span>`;
    detail.textContent = "正在判断当前会使用本地模型还是远程模型。";
    return;
  }

  if (ai.routePreviewError) {
    renderSimplePreview({
      stats,
      detail,
      escapeHtml,
      modeText: localReady ? settingsAiRuntimeModeLabel(runtimeMode) : "需要确认设置",
      ready: localReady,
      title: localReady ? "本地模型可用" : "还不能确认 AI 是否可用",
      summary: localReady
        ? "当前会使用这台电脑上的本地模型，隐私更好，速度取决于电脑。"
        : "先选择本地或远程模型，再用一句普通话测试是否能回复。",
      facts: localReady
        ? [["使用方式", "本地模型"], ["当前状态", "可用"], ["下一步", "测试一句话"]]
        : [["当前状态", "待设置"], ["下一步", "完成设置后测试一句话"]],
      actionText: localReady ? "用一句普通话确认 AI 能正常回复。" : "如果要处理私密材料，优先使用本地模型。"
    });
    return;
  }

  const preview = ai.routePreview;
  if (!preview) {
    renderSimplePreview({
      stats,
      detail,
      escapeHtml,
      modeText: "未测试",
      ready: false,
      title: "还没有测试 AI 设置",
      summary: "选择本地模型或远程模型后，先测试一句话，确认当前设置可用。",
      facts: [["当前状态", "未测试"], ["下一步", "测试一句话"]],
      actionText: "测试内容不要包含敏感信息。"
    });
    return;
  }

  const route = preview.route || {};
  const access = preview.access || {};
  const provider = preview.provider || {};
  const providerId = String(provider.providerId || currentAiProviderId()).trim();
  const providerConfig = activeAiProviderConfig();
  const remoteConfigurable = isRemoteConfigurableProviderId(providerId);
  const draftTouched = ai.providerDraftTouched || {};
  const remoteRuntimeModel = remoteConfigurable
    ? String(draftTouched.remoteRuntimeModel
      ? ai.remoteRuntimeModel
      : ai.remoteRuntimeModel || remoteRuntimeModelFromMap(providerId, providerConfig?.runtimeModelMap || providerConfig?.runtime_model_map || {}) || "").trim()
    : "";
  const remoteEndpointUrl = remoteConfigurable
    ? String(draftTouched.providerEndpointUrl
      ? ai.providerEndpointUrl
      : ai.providerEndpointUrl || providerConfig?.endpointUrl || providerConfig?.endpoint_url || "").trim()
    : "";
  const remoteSecretRef = remoteConfigurable
    ? String(draftTouched.secretRef
      ? ai.secretRef
      : ai.secretRef || providerConfig?.secretRef || providerConfig?.secret_ref || "").trim()
    : "";
  const remoteSecretReady = !remoteConfigurable
    || Boolean(remoteSecretRef)
    || (access.ready === true && draftTouched.secretRef !== true);
  const usingLocal = Boolean(route.localOnly);
  const ready = usingLocal
    ? installedLocalModelReady(localModel)
    : access.ready === true && (!remoteConfigurable || Boolean(remoteEndpointUrl && remoteRuntimeModel && remoteSecretReady));
  const modeText = usingLocal ? "使用本地模型" : "使用远程模型";
  const statusText = ready ? "可用" : "不可用";
  const title = `${modeText}${ready ? "已就绪" : "还不能用"}`;
  const summary = usingLocal
    ? ready
      ? "内容会在这台电脑上处理，隐私更好；速度取决于电脑性能。"
      : "先检测本地 AI，并选择或下载一个可用模型。"
    : ready
      ? `内容会发送到远程模型，效果可能更好；需要${remoteConfigurable ? "网络和密钥" : "网络"}。`
      : remoteConfigurable
        ? "先填写远程模型的服务信息和密钥，再测试一句话。"
        : "先确认网络可用，再测试一句话。";
  const facts = usingLocal
    ? [
        ["使用方式", "本地模型"],
        ["当前状态", statusText],
        ["隐私", "内容留在本机"]
      ]
    : [
        ["使用方式", "远程模型"],
        ["当前状态", statusText],
        ["需要", remoteConfigurable ? "网络和密钥" : "网络"]
      ];
  renderSimplePreview({
    stats,
    detail,
    escapeHtml,
    modeText,
    ready,
    title,
    summary,
    facts,
    actionText: ready ? "下一步：测试一句话，确认能正常回复。" : "下一步：补齐设置后再测试一句话。"
  });
}

function renderSimplePreview({
  stats,
  detail,
  escapeHtml,
  modeText,
  ready,
  title,
  summary,
  facts,
  actionText
}) {
  stats.innerHTML = [
    `<span class="settings-stat-badge ${ready ? "ok" : "warn"}">${escapeHtml(modeText)}</span>`,
    `<span class="settings-stat-badge ${ready ? "ok" : "muted"}">${escapeHtml(ready ? "可用" : "待测试")}</span>`
  ].join("");
  detail.innerHTML = `
    <div class="settings-route-preview-title">${escapeHtml(title)}</div>
    <div class="settings-route-preview-copy">${escapeHtml(summary)}</div>
    <div class="settings-route-preview-facts">
      ${facts.map(([label, value]) => `
        <div class="settings-route-preview-fact">
          <span>${escapeHtml(label)}</span>
          <strong>${escapeHtml(value)}</strong>
        </div>
      `).join("")}
    </div>
    <div class="settings-route-preview-action">${escapeHtml(actionText)}</div>
  `;
}
