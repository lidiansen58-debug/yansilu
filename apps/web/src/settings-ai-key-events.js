import { remoteApiKeySecretRef } from "./ai-settings-remote-config-model.js";

export function installSettingsAiKeyEvents(deps) {
  const { $, settingsState, markAiProviderDraftTouched, clearAiTestResultForSettingsChange,
    persistAiSettingsToStorage, renderSettingsPanel, setStatus } = deps;
  function editKey(event, showStatus = false) {
    const next = String(event?.target?.value || "").trim();
    const previous = String(settingsState.ai.remoteApiKey || "").trim();
    // Focusing an empty input must not remove the saved credential reference.
    if (!next && !previous && settingsState.ai.secretRef && !settingsState.ai.providerDraftTouched?.secretRef) return;
    markAiProviderDraftTouched("secretRef");
    settingsState.ai.remoteApiKey = next;
    settingsState.ai.secretRef = next ? remoteApiKeySecretRef() : "";
    settingsState.ai.providerConfigError = "";
    settingsState.ai.providerHealthResult = null;
    if (previous !== next) clearAiTestResultForSettingsChange();
    persistAiSettingsToStorage();
    renderSettingsPanel();
    if (showStatus) setStatus(next ? "API Key 已暂存；测试连接后再保存远程设置。" : "API Key 已清空。", next ? "warn" : "ok");
  }
  $("settingsAiSecretRef")?.addEventListener("input", event => editKey(event));
  $("settingsAiSecretRef")?.addEventListener("blur", event => editKey(event, true));
  $("settingsAiClearRemoteKey")?.addEventListener("click", () => {
    markAiProviderDraftTouched("secretRef");
    settingsState.ai.remoteApiKey = "";
    settingsState.ai.secretRef = "";
    settingsState.ai.providerConfigError = "";
    settingsState.ai.providerHealthResult = null;
    clearAiTestResultForSettingsChange();
    persistAiSettingsToStorage();
    renderSettingsPanel();
    setStatus("已暂存移除 Key；点击保存远程设置后生效。", "warn");
  });
}
