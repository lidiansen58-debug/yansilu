import {
  childFolders,
  createInitialState,
  folderById,
  joinFsPath,
  parseLinks,
  notesInFolder,
  parseTags,
  rootBoxIdFromFolder,
  typeFromFolder,
  uid
} from "./prototype-store.js";
import { ContextMenu } from "./components-context-menu.js";
import { CreateBoxDialog } from "./components-create-box-dialog.js";
import { createDesktopFileCommandService } from "./desktop-file-command-service.js";
import { ExplorerPane, explorerNewNoteButtonCopy, resolveExplorerNewNoteFolderId } from "./components-explorer-pane.js";
import { EditorPane, normalizeFieldText, parseLiteratureWorkspace } from "./components-editor-pane.js";
import {
  renderImportHistoryMount
} from "./import-history-mount.js";
import {
  renderImportPageMount
} from "./import-page-mount.js";
import {
  importConfirmButtonState
} from "./import-toolbar-model.js";
import {
  createImportToolbarActions,
} from "./import-toolbar-actions.js";
import {
  renderImportToolbarMount
} from "./import-toolbar-mount.js";
import {
  renderImportResultMount
} from "./import-result-mount.js";
import {
  candidateIdsByOriginalityStatus,
  candidatePreviewItemIds,
  candidatePreviewItems,
  confirmSkipReasonMap,
  confirmSkippedCandidateIds,
  confirmableCandidateIds,
  riskyCandidateIds,
  safeCandidateIds,
  selectionSummary as summarizeCandidateSelection
} from "./import-candidate-preview-model.js";
import {
  renderCandidatePreview,
  renderConfirmSkipBreakdown
} from "./import-candidate-preview-panel.js";
import { basenameLocalPath, dirnameLocalPath, joinLocalPath } from "./desktop-file-adapter.js";
import {
  renderAiInboxPanel
} from "./ai-inbox-panel.js";
import {
  aiInboxActionLabel,
  normalizeAiInboxFilters
} from "./ai-inbox-model.js";
import {
  renderScheduledTasksPanel
} from "./scheduled-tasks-panel.js";
import {
  scheduledTaskFormDefaults,
  scheduledTaskFormFromTask,
  scheduledTaskPayloadFromForm,
  normalizeScheduledTaskFilters
} from "./scheduled-tasks-model.js";
import {
  analyzeDirectoryGraph,
  analyzePermanentNote,
  analyzeWritingWithStrongModel,
  bindWritingDraftNote,
  acceptAiInboxLink,
  cancelImport,
  checkAiProviderHealth,
  confirmPermanentNoteDistillation,
  confirmImport,
  createDirectory,
  createDraftScaffold,
  createIndexCard,
  createNote,
  createWritingProject,
  deleteDirectory,
  deleteNote,
  exportMarkdown,
  fetchDraftScaffold,
  fetchDirectories,
  fetchGraphConflicts,
  fetchDirectoryGraph,
  fetchAiInbox,
  fetchAiInboxEvaluationSummary,
  fetchAiInboxItem,
  fetchAiScheduledTasks,
  fetchAiScheduledTaskTemplates,
  fetchRelationReviewQueue,
  fetchIndexCard,
  fetchDirectoryNotes,
  fetchAiProviderConfigs,
  fetchImportRecord,
  fetchAiPreferences,
  fetchOllamaModels,
  pullOllamaModel,
  listImportRecords,
  listIndexCards,
  fetchNote,
  fetchWritingProject,
  listProjectDraftVersions,
  listProjectScaffolds,
  listWritingProjects,
  setWritingCurrentDraftNote,
  updateDraftNoteVersionNote,
  updateDraftScaffoldVersionNote,
  fetchVaultInfo,
  saveAiPreferences,
  saveAiProviderConfig,
  runAiTestChat,
  getApiBase,
  moveNote,
  previewAiRoute,
  previewImport,
  promoteAiInboxNote,
  recordAiInboxDecision,
  rollbackImport,
  summarizeAiInboxItem,
  seedYijingKnowledgeNetwork,
  seedYijingRichAcceptanceDemo,
  seedSmartNotesProductThinkingDemo,
  runDueAiScheduledTasks,
  saveAiScheduledTask,
  switchVault,
  updateDirectory,
  updateAiScheduledTaskStatus,
  updateNote,
  updatePermanentNoteDistillation
} from "./prototype-api.js";

const $ = (id) => document.getElementById(id);
const state = createInitialState();
state.literatureQueueFocusNoteIds = [];
state.literatureQueueFocusLabel = "";
const importState = {
  importRecordId: "",
  lastPreview: null,
  lastResultPayload: null,
  literatureBatchSummary: null,
  historyItems: [],
  historyTotal: 0,
  historyLoading: false,
  historyStatusFilter: "all",
  historyConnectorFilter: "all",
  historyRiskFilter: "all",
  selectionImportRecordId: "",
  selectedCandidateIds: new Set(),
  previewFilter: "all",
  resultFocusReason: ""
};
const graphState = {
  item: null,
  conflicts: null,
  reviewQueue: null,
  aiAnalysis: null,
  aiAnalysisLoading: false,
  aiAnalysisError: "",
  loading: false,
  error: "",
  filters: {
    relationType: "all",
    status: "all"
  }
};
const aiInboxState = {
  items: [],
  counts: { pending: 0, reviewed: 0, archived: 0, all: 0 },
  views: [],
  filters: {
    view: "pending",
    type: "all",
    sourceNoteId: "",
    privacyMode: "",
    limit: 50
  },
  selectedArtifactId: "",
  detail: null,
  loading: false,
  detailLoading: false,
  evaluationLoading: false,
  actionLoading: false,
  error: "",
  detailError: "",
  evaluationError: "",
  evaluationSummary: null
  ,
  aiSummary: "",
  aiSummaryMeta: "",
  aiSummaryRecommendedAction: "",
  aiSummaryLoading: false,
  aiSummaryError: ""
};
const settingsState = {
  vault: null,
  ai: {
    runtimeMode: "auto",
    userMode: "Auto",
    modelPack: "Starter Auto",
    advancedModelRef: "",
    secretRef: "",
    providerEndpointUrl: "",
    providerHealthEndpointUrl: "",
    localModel: "",
    localRuntimeStatus: "unknown",
    localRuntimeModels: [],
    localRuntimeChecking: false,
    localRuntimePulling: false,
    localRuntimeError: "",
    providerConfigs: [],
    providerConfigSaving: false,
    providerHealthChecking: false,
    providerHealthResult: null,
    providerConfigError: "",
    routePreview: null,
    routePreviewLoading: false,
    routePreviewError: "",
    testPrompt: "",
    testRunning: false,
    testMeta: "",
    testOutput: "",
    scheduledTasks: [],
    scheduledTasksTotal: 0,
    scheduledTaskTemplates: [],
    scheduledTaskTemplatesLoading: false,
    scheduledTaskTemplatesError: "",
    scheduledTaskForm: scheduledTaskFormDefaults(),
    scheduledTaskFilters: {
      status: "all",
      taskType: "all",
      limit: 50
    },
    scheduledTasksLoading: false,
    scheduledTaskActionLoading: false,
    scheduledTasksError: "",
    scheduledTaskRunSummary: null
  },
  error: ""
};
const writingState = {
  project: null,
  scaffold: null,
  scaffoldMarkdown: "",
  sourceIndexIds: [],
  themeIndexes: [],
  loadingThemeIndexes: false,
  projects: [],
  projectFilters: {
    q: "",
    status: "all",
    hasDraft: "all"
  },
  loadingProjects: false,
  scaffoldVersions: [],
  loadingScaffoldVersions: false,
  draftVersions: [],
  loadingDraftVersions: false,
  strongModelLoading: false,
  strongModelResult: null,
  strongModelError: ""
};
const desktopCommands = createDesktopFileCommandService({ switchVaultImpl: switchVault });
let statusRevision = 0;
let editorHelperDismissed = false;
const EDITOR_HELPER_MUTE_KEY = "yansilu:editor-helper-muted";
let editorHelperMuted = readStoredBoolean(EDITOR_HELPER_MUTE_KEY);
const GENERATED_ORIGINAL_MARKER_PATTERN = /<!--\s*yansilu:generated-original=([^\s>]+)\s*-->/i;
const FEEDBACK_REPOSITORY = "lidiansen58-debug/yansilu-feedback";
const FEEDBACK_REPOSITORY_READY =
  Boolean(String(FEEDBACK_REPOSITORY || "").trim()) && !FEEDBACK_REPOSITORY.includes("YOUR_GITHUB_");
const APP_VERSION = "0.1.0";
const AUTO_UPDATE_CHECK_KEY = "yansilu:auto-update:last-check";
const AI_RUNTIME_MODE_KEY = "yansilu:ai:runtime-mode";
const AI_USER_MODE_KEY = "yansilu:ai:user-mode";
const AI_MODEL_PACK_KEY = "yansilu:ai:model-pack";
const AI_ADVANCED_MODEL_REF_KEY = "yansilu:ai:advanced-model-ref";
const AI_SECRET_REF_KEY = "yansilu:ai:secret-ref";
const AI_PROVIDER_ENDPOINT_URL_KEY = "yansilu:ai:provider-endpoint-url";
const AI_PROVIDER_HEALTH_ENDPOINT_URL_KEY = "yansilu:ai:provider-health-endpoint-url";
const AI_LOCAL_MODEL_KEY = "yansilu:ai:local-model";
const GRAPH_ORIGINAL_SCOPE_DIRECTORY_ID = "dir_original_default";
const OLLAMA_CHAT_ENDPOINT_URL = "http://127.0.0.1:11434/v1/chat/completions";
const OLLAMA_HEALTH_ENDPOINT_URL = "http://127.0.0.1:11434/api/tags";
const OLLAMA_RECOMMENDED_MODEL = "qwen2.5:7b";
const AUTO_UPDATE_CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;
loadAiSettingsFromStorage();

function tauriGlobal() {
  return typeof window !== "undefined" ? window.__TAURI__ : null;
}

function shouldCheckForUpdatesNow() {
  const tauri = tauriGlobal();
  if (!tauri) return false;
  const last = Number(localStorage.getItem(AUTO_UPDATE_CHECK_KEY) || 0);
  return !last || Date.now() - last > AUTO_UPDATE_CHECK_INTERVAL_MS;
}

async function checkForDesktopUpdate(options = {}) {
  const tauri = tauriGlobal();
  if (!tauri) return { ok: false, skipped: true };
  if (!options.force && !shouldCheckForUpdatesNow()) return { ok: false, skipped: true };

  localStorage.setItem(AUTO_UPDATE_CHECK_KEY, String(Date.now()));

  const call = async (name, args) => {
    if (typeof tauri?.updater?.[name] === "function") return await tauri.updater[name](args);
    if (typeof tauri?.core?.invoke === "function") {
      const mapping = {
        check: "plugin:updater|check",
        downloadAndInstall: "plugin:updater|download_and_install"
      };
      const command = mapping[name];
      if (!command) return null;
      return await tauri.core.invoke(command, args || {});
    }
    return null;
  };

  try {
    const result = await call("check");
    const available = Boolean(result?.available ?? result?.shouldUpdate ?? result?.updateAvailable);
    if (!available) return { ok: true, available: false };

    const version = String(result?.version || result?.latestVersion || "").trim();
    const prompt = options.prompt !== false;
    if (prompt) {
      const confirmed = window.confirm(`发现新版本${version ? `：${version}` : ""}。现在下载安装并重启吗？`);
      if (!confirmed) return { ok: true, available: true, installed: false };
    }

    await call("downloadAndInstall");
    return { ok: true, available: true, installed: true };
  } catch (error) {
    return { ok: false, error: String(error?.message || error) };
  }
}

function feedbackBaseUrl() {
  return `https://github.com/${FEEDBACK_REPOSITORY}/issues/new`;
}

function activePrototypeUrl() {
  if (typeof window === "undefined") return "/app";
  return window.location.href || `${window.location.origin}/app`;
}

function buildFeedbackUrl(kind = "bug") {
  const issueType = kind === "feature" ? "feature_request" : "bug_report";
  const moduleName = moduleLabel(state.module);
  const note = state.notes.find((item) => item.id === state.selectedFileId);
  const titlePrefix = kind === "feature" ? "[建议]" : "[反馈]";
  const title = `${titlePrefix} ${moduleName}：`;
  const bodyLines = [
    "## 背景",
    "",
    "请描述你遇到的问题或建议改进的体验。",
    "",
    "## 当前环境",
    `- 版本：${APP_VERSION}`,
    `- 模块：${moduleName}`,
    `- 页面：${activePrototypeUrl()}`,
    `- 当前笔记：${note?.title || "未选中"}`,
    "",
    "## 补充信息",
    "- 预期发生什么：",
    "- 实际发生什么：",
    "- 复现步骤："
  ];
  const url = new URL(feedbackBaseUrl());
  url.searchParams.set("template", `${issueType}.md`);
  url.searchParams.set("title", title);
  url.searchParams.set("body", bodyLines.join("\n"));
  return url.toString();
}

function buildFeedbackDiagnosticText() {
  const note = state.notes.find((item) => item.id === state.selectedFileId);
  const folder = folderById(state, state.selectedFolderId);
  const lines = [
    "# Yansilu Feedback Diagnostics",
    `capturedAt: ${new Date().toISOString()}`,
    `repository: ${FEEDBACK_REPOSITORY}`,
    `appVersion: ${APP_VERSION}`,
    `module: ${moduleLabel(state.module)}`,
    `page: ${activePrototypeUrl()}`,
    `selectedFolder: ${folder?.name || state.selectedFolderId || "未选中"}`,
    `selectedNote: ${note?.title || "未选中"}`,
    `userAgent: ${typeof navigator !== "undefined" ? navigator.userAgent || "unknown" : "unknown"}`
  ];
  return lines.join("\n");
}

async function openFeedbackUrl(url = "") {
  const result = await desktopCommands.openExternalUrl(url);
  return Boolean(result?.ok);
}

function generatedOriginalNoteIdFromBody(body = "") {
  const match = String(body || "").match(GENERATED_ORIGINAL_MARKER_PATTERN);
  return String(match?.[1] || "").trim();
}

function stripGeneratedOriginalMarker(body = "") {
  return String(body || "")
    .replace(/\n?<!--\s*yansilu:generated-original=[^\s>]+\s*-->\s*\n?/gi, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trimEnd();
}

function withGeneratedOriginalMarker(body = "", originalNoteId = "") {
  const cleanId = String(originalNoteId || "").trim();
  const base = stripGeneratedOriginalMarker(body);
  if (!cleanId) return base;
  const separator = base.trim() ? "\n\n" : "";
  return `${base}${separator}<!-- yansilu:generated-original=${cleanId} -->`;
}

function withGeneratedOriginalReference(body = "", originalTitle = "") {
  const cleanTitle = String(originalTitle || "").trim();
  const base = stripGeneratedOriginalMarker(body);
  if (!cleanTitle) return base;
  const visibleLink = `[[${cleanTitle}]]`;
  const visibleLine = `关联永久笔记：${visibleLink}`;
  if (base.includes(visibleLine)) return base;
  const separator = base.trim() ? "\n\n" : "";
  return `${base}${separator}${visibleLine}`;
}

function noteGeneratedOriginalNoteId(note = null) {
  return String(
    note?.generatedOriginalNoteId ||
      note?.generated_original_note_id ||
      generatedOriginalNoteIdFromBody(note?.body || "")
  ).trim();
}

function noteHasGeneratedOriginal(note = null) {
  return Boolean(noteGeneratedOriginalNoteId(note));
}

function isOriginalRecordableSource(note = null) {
  const noteType = String(note?.noteType || "").trim().toLowerCase();
  return noteType === "fleeting" || noteType === "literature";
}

function setStatus(text, cls = "", options = {}) {
  const requiredRevision = Number(options?.skipIfStaleSince || 0);
  if (requiredRevision && statusRevision !== requiredRevision) return false;
  const requiredModule = String(options?.requireModule || "").trim();
  if (requiredModule && state.module !== requiredModule) return false;
  statusRevision += 1;
  $("statusText").className = `status-pill ${cls}`.trim();
  $("statusText").textContent = text;
  const statusBar = $("statusBar");
  if (statusBar) statusBar.dataset.tone = cls || "";
  return true;
}

function readStoredBoolean(key, fallback = false) {
  try {
    const raw = window.localStorage?.getItem(String(key || ""));
    if (raw === "1") return true;
    if (raw === "0") return false;
  } catch {}
  return fallback;
}

function writeStoredBoolean(key, value) {
  try {
    window.localStorage?.setItem(String(key || ""), value ? "1" : "0");
  } catch {}
}

function readStoredText(key, fallback = "") {
  try {
    const raw = window.localStorage?.getItem(String(key || ""));
    if (raw === null || raw === undefined) return fallback;
    return String(raw);
  } catch {}
  return fallback;
}

function writeStoredText(key, value) {
  try {
    const clean = String(value ?? "");
    if (!clean) window.localStorage?.removeItem(String(key || ""));
    else window.localStorage?.setItem(String(key || ""), clean);
  } catch {}
}

function loadAiSettingsFromStorage() {
  const storedRuntimeMode = String(readStoredText(AI_RUNTIME_MODE_KEY, "") || "").trim();
  const storedMode = String(readStoredText(AI_USER_MODE_KEY, "") || "").trim();
  const storedPack = String(readStoredText(AI_MODEL_PACK_KEY, "") || "").trim();
  const storedModelRef = String(readStoredText(AI_ADVANCED_MODEL_REF_KEY, "") || "").trim();
  const storedSecretRef = String(readStoredText(AI_SECRET_REF_KEY, "") || "").trim();
  const storedEndpointUrl = String(readStoredText(AI_PROVIDER_ENDPOINT_URL_KEY, "") || "").trim();
  const storedHealthEndpointUrl = String(readStoredText(AI_PROVIDER_HEALTH_ENDPOINT_URL_KEY, "") || "").trim();
  const storedLocalModel = String(readStoredText(AI_LOCAL_MODEL_KEY, "") || "").trim();
  if (storedRuntimeMode) settingsState.ai.runtimeMode = normalizeAiRuntimeMode(storedRuntimeMode);
  if (storedMode) settingsState.ai.userMode = storedMode;
  if (storedPack) settingsState.ai.modelPack = storedPack;
  settingsState.ai.advancedModelRef = storedModelRef;
  settingsState.ai.secretRef = storedSecretRef;
  settingsState.ai.providerEndpointUrl = storedEndpointUrl;
  settingsState.ai.providerHealthEndpointUrl = storedHealthEndpointUrl;
  settingsState.ai.localModel = storedLocalModel;
}

function persistAiSettingsToStorage() {
  writeStoredText(AI_RUNTIME_MODE_KEY, settingsState.ai.runtimeMode);
  writeStoredText(AI_USER_MODE_KEY, settingsState.ai.userMode);
  writeStoredText(AI_MODEL_PACK_KEY, settingsState.ai.modelPack);
  writeStoredText(AI_ADVANCED_MODEL_REF_KEY, settingsState.ai.advancedModelRef);
  writeStoredText(AI_SECRET_REF_KEY, settingsState.ai.secretRef);
  writeStoredText(AI_PROVIDER_ENDPOINT_URL_KEY, settingsState.ai.providerEndpointUrl);
  writeStoredText(AI_PROVIDER_HEALTH_ENDPOINT_URL_KEY, settingsState.ai.providerHealthEndpointUrl);
  writeStoredText(AI_LOCAL_MODEL_KEY, settingsState.ai.localModel);
}

function providerPresetForModelPack(modelPack = "") {
  const normalized = String(modelPack || "").trim().toLowerCase();
  if (normalized === "low cost research" || normalized === "global optimized") return "openai_compatible_gateway";
  if (normalized === "china optimized") return "china_optimized_gateway";
  if (normalized === "privacy first") return "local_private_gateway";
  if (normalized === "ollama local") return "ollama_local_gateway";
  if (normalized === "minicpm local") return "minicpm_local_gateway";
  if (normalized === "minicpm remote") return "minicpm_remote_gateway";
  return "platform_managed_openai";
}

function defaultProviderEndpointUrl(providerId = "") {
  const id = String(providerId || "").trim();
  if (id === "ollama_local_gateway") return OLLAMA_CHAT_ENDPOINT_URL;
  return "";
}

function defaultProviderHealthEndpointUrl(providerId = "", endpointUrl = "") {
  const id = String(providerId || "").trim();
  if (id === "ollama_local_gateway") return OLLAMA_HEALTH_ENDPOINT_URL;
  return String(endpointUrl || "").trim();
}

function normalizeAiRuntimeMode(value = "") {
  const mode = String(value || "").trim().toLowerCase().replace(/[\s/-]+/g, "_");
  if (["local", "local_only", "private"].includes(mode)) return "local_only";
  if (["cloud", "cloud_only", "remote"].includes(mode)) return "cloud_only";
  if (["hybrid", "mixed", "local_cloud"].includes(mode)) return "hybrid";
  return "auto";
}

function aiPrivacyPolicyForRuntimeMode(runtimeMode = "auto") {
  const mode = normalizeAiRuntimeMode(runtimeMode);
  if (mode === "local_only") return { defaultMode: "local_only", allowCloud: false, localPreferred: true };
  if (mode === "hybrid") return { defaultMode: "normal", allowCloud: true, localPreferred: true };
  if (mode === "cloud_only") return { defaultMode: "normal", allowCloud: true, localPreferred: false };
  return {};
}

function aiFallbackPolicyForRuntimeMode(runtimeMode = "auto") {
  const mode = normalizeAiRuntimeMode(runtimeMode);
  if (mode === "local_only") {
    return {
      allowSameProviderFallback: true,
      allowCrossProviderFallback: false,
      allowCloudFallback: false,
      requiresConfirmationForCloud: true
    };
  }
  if (mode === "hybrid") {
    return {
      allowSameProviderFallback: true,
      allowCrossProviderFallback: true,
      allowCloudFallback: true,
      requiresConfirmationForCloud: false,
      localPreferred: true
    };
  }
  return {};
}

function aiDefaultsForRuntimeMode(runtimeMode = "auto") {
  const mode = normalizeAiRuntimeMode(runtimeMode);
  if (mode === "local_only") return { modelPack: "Privacy First", userMode: "Local / Private" };
  if (mode === "cloud_only") return { modelPack: "Starter Auto", userMode: "Balanced" };
  if (mode === "hybrid") return { modelPack: "Starter Auto", userMode: "Auto" };
  return { modelPack: "Starter Auto", userMode: "Auto" };
}

function applyOllamaLocalModelDefaults() {
  if (!settingsState.ai.localModel) return;
  settingsState.ai.providerEndpointUrl = OLLAMA_CHAT_ENDPOINT_URL;
  settingsState.ai.providerHealthEndpointUrl = OLLAMA_HEALTH_ENDPOINT_URL;
  settingsState.ai.secretRef = "";
  if (normalizeAiRuntimeMode(settingsState.ai.runtimeMode) === "local_only") {
    settingsState.ai.advancedModelRef = `local_private_gateway:${settingsState.ai.localModel}`;
  } else if (settingsState.ai.advancedModelRef.startsWith("local_private_gateway:")) {
    settingsState.ai.advancedModelRef = "";
  }
}

function authModeForProvider(providerId = "", preview = null) {
  const authMode = String(preview?.access?.authMode || "").trim();
  if (authMode) return authMode;
  const id = String(providerId || "").trim();
  if (id === "platform_managed_openai") return "platform_managed";
  if (["local_private_gateway", "ollama_local_gateway", "minicpm_local_gateway"].includes(id)) {
    return settingsState.ai.secretRef ? "enterprise_secret" : "local_no_key";
  }
  return "workspace_managed";
}

function currentAiProviderId() {
  return String(settingsState.ai.routePreview?.provider?.providerId || providerPresetForModelPack(settingsState.ai.modelPack)).trim();
}

function activeAiProviderConfig() {
  const providerId = currentAiProviderId();
  return settingsState.ai.providerConfigs.find((config) => String(config?.providerId || config?.provider_id || "").trim() === providerId) || null;
}

function applyActiveAiProviderConfigToState() {
  const providerId = currentAiProviderId();
  const config = activeAiProviderConfig();
  if (!config) {
    const endpointUrl = defaultProviderEndpointUrl(providerId);
    const healthEndpointUrl = defaultProviderHealthEndpointUrl(providerId, endpointUrl);
    if (endpointUrl) settingsState.ai.providerEndpointUrl = endpointUrl;
    if (healthEndpointUrl) settingsState.ai.providerHealthEndpointUrl = healthEndpointUrl;
    return;
  }
  settingsState.ai.providerEndpointUrl = String(config.endpointUrl || config.endpoint_url || "").trim();
  settingsState.ai.providerHealthEndpointUrl = String(
    config.healthCheck?.endpointUrl ||
      config.health_check?.endpoint_url ||
      settingsState.ai.providerHealthEndpointUrl ||
      ""
  ).trim();
  settingsState.ai.secretRef = String(config.secretRef || config.secret_ref || settingsState.ai.secretRef || "").trim();
}

function aiSettingsPayload() {
  return {
    userMode: settingsState.ai.userMode,
    modelPack: settingsState.ai.modelPack,
    privacy: aiPrivacyPolicyForRuntimeMode(settingsState.ai.runtimeMode),
    fallbackPolicy: aiFallbackPolicyForRuntimeMode(settingsState.ai.runtimeMode),
    advancedSettings: {
      runtimeMode: settingsState.ai.runtimeMode,
      ...(settingsState.ai.localModel ? { localModel: settingsState.ai.localModel } : {}),
      ...(settingsState.ai.advancedModelRef ? { modelRef: settingsState.ai.advancedModelRef } : {}),
      ...(settingsState.ai.secretRef ? { secretRef: settingsState.ai.secretRef } : {})
    }
  };
}

function aiProviderConfigPayload(options = {}) {
  const providerId = String(options.providerId || currentAiProviderId()).trim();
  const endpointUrl = String(options.endpointUrl || settingsState.ai.providerEndpointUrl || defaultProviderEndpointUrl(providerId) || "").trim();
  const healthEndpointUrl = String(
    options.healthEndpointUrl || settingsState.ai.providerHealthEndpointUrl || defaultProviderHealthEndpointUrl(providerId, endpointUrl) || ""
  ).trim();
  const secretRef = String(options.secretRef || settingsState.ai.secretRef || "").trim();
  return {
    providerId,
    authMode: options.authMode || authModeForProvider(providerId, settingsState.ai.routePreview),
    status: "enabled",
    ...(secretRef ? { secretRef } : {}),
    ...(endpointUrl ? { endpointUrl } : {}),
    ...((healthEndpointUrl || endpointUrl)
      ? {
          healthCheck: {
            enabled: true,
            endpointUrl: healthEndpointUrl || endpointUrl,
            method: "GET",
            timeoutMs: 5000,
            expectedStatus: 200,
            intervalSeconds: 300
          }
        }
      : {})
  };
}

function upsertAiProviderConfig(config = null) {
  if (!config) return;
  const providerId = String(config.providerId || config.provider_id || "").trim();
  if (!providerId) return;
  settingsState.ai.providerConfigs = [
    ...settingsState.ai.providerConfigs.filter((item) => String(item?.providerId || item?.provider_id || "").trim() !== providerId),
    config
  ];
}

async function syncAiSettingsToApi() {
  try {
    await saveAiPreferences(aiSettingsPayload());
    return true;
  } catch {
    return false;
  }
}

async function saveLocalOllamaProviderConfig() {
  const saved = await saveAiProviderConfig(aiProviderConfigPayload({
    providerId: "local_private_gateway",
    authMode: "local_no_key"
  }));
  upsertAiProviderConfig(saved);
  return saved;
}

function preferredLocalModelName(models = []) {
  const names = (Array.isArray(models) ? models : []).map((model) => String(model?.name || model || "").trim()).filter(Boolean);
  const preferred = [
    /qwen2\.5.*7b/i,
    /qwen.*7b/i,
    /qwen2\.5.*3b/i,
    /llama3\.1.*8b/i,
    /phi.*3\.5/i,
    /gemma2.*2b/i
  ];
  for (const pattern of preferred) {
    const match = names.find((name) => pattern.test(name));
    if (match) return match;
  }
  return names[0] || "";
}

function hasLocalModel(modelName = "") {
  const target = String(modelName || "").trim().toLowerCase();
  if (!target) return false;
  return (Array.isArray(settingsState.ai.localRuntimeModels) ? settingsState.ai.localRuntimeModels : []).some(
    (model) => String(model?.name || model || "").trim().toLowerCase() === target
  );
}

function ollamaPullModelName() {
  if (!hasLocalModel(OLLAMA_RECOMMENDED_MODEL)) return OLLAMA_RECOMMENDED_MODEL;
  return String(settingsState.ai.localModel || preferredLocalModelName(settingsState.ai.localRuntimeModels) || OLLAMA_RECOMMENDED_MODEL).trim();
}

async function detectOllamaModels(options = {}) {
  settingsState.ai.localRuntimeChecking = true;
  settingsState.ai.localRuntimeError = "";
  if (options.render !== false) renderSettingsPanel();
  try {
    const runtime = await fetchOllamaModels();
    const models = Array.isArray(runtime?.models) ? runtime.models : [];
    settingsState.ai.localRuntimeStatus = String(runtime?.status || "unknown");
    settingsState.ai.localRuntimeModels = models;
    settingsState.ai.localRuntimeError = settingsState.ai.localRuntimeStatus === "available" ? "" : String(runtime?.message || "");
    if (!settingsState.ai.localModel) settingsState.ai.localModel = preferredLocalModelName(models);
    if (settingsState.ai.localModel) applyOllamaLocalModelDefaults();
    persistAiSettingsToStorage();
    if (settingsState.ai.localModel && ["local_only", "hybrid"].includes(normalizeAiRuntimeMode(settingsState.ai.runtimeMode))) {
      await syncAiSettingsToApi();
      await saveLocalOllamaProviderConfig();
      await refreshAiRoutePreview({ render: false });
    }
    if (options.silent !== true) {
      const count = models.length;
      if (settingsState.ai.localRuntimeStatus === "available") {
        setStatus(count ? `已检测到 ${count} 个 Ollama 本地模型。` : "Ollama 可连接，但还没有本地模型。", count ? "ok" : "warn");
      } else {
        const message = settingsState.ai.localRuntimeError || "Ollama 当前不可用。";
        setStatus(`Ollama 不可用：${message}`, "warn");
      }
    }
    return runtime;
  } catch (error) {
    settingsState.ai.localRuntimeStatus = "unavailable";
    settingsState.ai.localRuntimeModels = [];
    settingsState.ai.localRuntimeError = String(error?.message || error);
    if (options.silent !== true) setStatus(`Ollama 检测失败：${settingsState.ai.localRuntimeError}`, "warn");
    return null;
  } finally {
    settingsState.ai.localRuntimeChecking = false;
    if (options.render !== false) renderSettingsPanel();
  }
}

async function pullRecommendedOllamaModel() {
  const modelName = ollamaPullModelName();
  settingsState.ai.localRuntimePulling = true;
  settingsState.ai.localRuntimeError = "";
  renderSettingsPanel();
  setStatus(`正在下载本地模型：${modelName}。这可能需要几分钟。`, "warn");
  try {
    const result = await pullOllamaModel(modelName);
    const runtime = result?.runtime || await fetchOllamaModels();
    const models = Array.isArray(runtime?.models) ? runtime.models : [];
    settingsState.ai.localRuntimeStatus = String(runtime?.status || "available");
    settingsState.ai.localRuntimeModels = models;
    settingsState.ai.localModel = modelName;
    applyOllamaLocalModelDefaults();
    persistAiSettingsToStorage();
    if (["local_only", "hybrid"].includes(normalizeAiRuntimeMode(settingsState.ai.runtimeMode))) {
      await syncAiSettingsToApi();
      await saveLocalOllamaProviderConfig();
    }
    await refreshAiRoutePreview({ render: false });
    setStatus(`本地模型已就绪：${modelName}`, "ok");
    return result;
  } catch (error) {
    settingsState.ai.localRuntimeError = String(error?.message || error);
    setStatus(`本地模型下载失败：${settingsState.ai.localRuntimeError}`, "warn");
    return null;
  } finally {
    settingsState.ai.localRuntimePulling = false;
    renderSettingsPanel();
  }
}

async function refreshAiRoutePreview(options = {}) {
  settingsState.ai.routePreviewLoading = true;
  settingsState.ai.routePreviewError = "";
  if (options.render !== false) renderSettingsPanel();
  try {
    settingsState.ai.routePreview = await previewAiRoute(aiSettingsPayload());
    applyActiveAiProviderConfigToState();
  } catch (error) {
    settingsState.ai.routePreview = null;
    settingsState.ai.routePreviewError = String(error?.message || error);
  } finally {
    settingsState.ai.routePreviewLoading = false;
    if (options.render !== false) renderSettingsPanel();
  }
  return settingsState.ai.routePreview;
}

async function syncAiProviderConfigToApi() {
  const providerId = currentAiProviderId();
  if (!providerId) return false;
  settingsState.ai.providerConfigSaving = true;
  settingsState.ai.providerConfigError = "";
  renderSettingsPanel();
  try {
    const saved = await saveAiProviderConfig(aiProviderConfigPayload());
    upsertAiProviderConfig(saved);
    applyActiveAiProviderConfigToState();
    persistAiSettingsToStorage();
    await syncAiSettingsToApi();
    await refreshAiRoutePreview({ render: false });
    setStatus(`AI Provider 配置已保存：${providerId}`, "ok");
    return true;
  } catch (error) {
    settingsState.ai.providerConfigError = String(error?.message || error);
    setStatus(`AI Provider 配置保存失败：${settingsState.ai.providerConfigError}`, "bad");
    return false;
  } finally {
    settingsState.ai.providerConfigSaving = false;
    renderSettingsPanel();
  }
}

async function checkCurrentAiProviderHealth() {
  const providerId = currentAiProviderId();
  if (!providerId || providerId === "platform_managed_openai") return false;
  settingsState.ai.providerHealthChecking = true;
  settingsState.ai.providerConfigError = "";
  renderSettingsPanel();
  try {
    const saved = await saveAiProviderConfig(aiProviderConfigPayload());
    upsertAiProviderConfig(saved);
    applyActiveAiProviderConfigToState();
    const endpointUrl = String(settingsState.ai.providerEndpointUrl || defaultProviderEndpointUrl(providerId) || "").trim();
    const healthEndpointUrl = String(
      settingsState.ai.providerHealthEndpointUrl || defaultProviderHealthEndpointUrl(providerId, endpointUrl) || endpointUrl
    ).trim();
    const result = await checkAiProviderHealth(providerId, {
      networkEnabled: true,
      healthCheck: {
        enabled: true,
        endpointUrl: healthEndpointUrl,
        method: "GET",
        timeoutMs: 5000,
        expectedStatus: 200,
        intervalSeconds: 300
      }
    });
    settingsState.ai.providerHealthResult = result;
    const record = result?.record || {};
    const label = record.status === "healthy" ? "连接正常" : `连接状态：${record.status || "unknown"}`;
    setStatus(`AI Provider ${label}`, record.status === "healthy" ? "ok" : "warn");
    return true;
  } catch (error) {
    settingsState.ai.providerHealthResult = null;
    settingsState.ai.providerConfigError = String(error?.message || error);
    setStatus(`AI Provider 连接测试失败：${settingsState.ai.providerConfigError}`, "bad");
    return false;
  } finally {
    settingsState.ai.providerHealthChecking = false;
    renderSettingsPanel();
  }
}

function hideEditorHelper() {
  const helper = $("editorHelper");
  if (!helper) return;
  helper.classList.add("hidden");
  helper.hidden = true;
  helper.setAttribute("aria-hidden", "true");
  helper.style.pointerEvents = "none";
  const action = $("btnEditorHelperAction");
  if (action) {
    action.dataset.helperAction = "noop";
    action.dataset.targetNoteId = "";
  }
  if (typeof document !== "undefined" && helper.contains(document.activeElement)) {
    document.activeElement?.blur?.();
  }
}

function setImportRecordId(value) {
  importState.importRecordId = String(value || "").trim();
  const input = $("importRecordId");
  if (input) input.value = importState.importRecordId;
  renderImportHistory();
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function primitiveEntries(value = {}) {
  return Object.entries(value || {}).filter(([, item]) => item === null || ["string", "number", "boolean"].includes(typeof item));
}

function compactValue(value) {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "yes" : "no";
  return String(value);
}

function currentImportToolbarValues() {
  return {
    connector: String($("importConnector")?.value || "markdown").trim(),
    path: String($("importPath")?.value || "").trim(),
    payload: String($("importPayload")?.value || ""),
    options: String($("importOptions")?.value || ""),
    importRecordId: String($("importRecordId")?.value || importState.importRecordId || "").trim()
  };
}

function renderImportToolbar() {
  const el = $("importToolbarMount");
  if (!el) return;
  const values = currentImportToolbarValues();
  const preview = activeImportPreviewContext();
  const hasMatchingPreview = Boolean(preview?.candidatePreview && preview.importRecordId === values.importRecordId);
  const summary = hasMatchingPreview ? selectionSummary(preview.candidatePreview, values.importRecordId) : { selectedCount: 0, totalCount: 0 };
  const confirmButton = importConfirmButtonState({
    hasMatchingPreview,
    selectedCount: summary.selectedCount,
    totalCount: summary.totalCount
  });

  el.innerHTML = renderImportToolbarMount({
    ...values,
    confirmButton
  });
}

function renderImportPageShell() {
  const el = $("importPageMount");
  if (!el) return;
  el.innerHTML = renderImportPageMount({
    toolbar: currentImportToolbarValues(),
    history: {
      items: importState.historyItems,
      total: importState.historyTotal,
      loading: importState.historyLoading,
      activeImportRecordId: String(importState.importRecordId || "").trim(),
      filters: {
        status: importState.historyStatusFilter,
        connector: importState.historyConnectorFilter,
        risk: importState.historyRiskFilter
      }
    },
    result: importState.lastResultPayload
      ? {
          data: importState.lastResultPayload,
          raw: JSON.stringify(importState.lastResultPayload, null, 2)
        }
      : null
  });
}

function renderAiInboxWorkspace() {
  const el = $("aiInboxPanel");
  if (!el) return;
  el.innerHTML = renderAiInboxPanel(aiInboxState);
}

function recommendedAiInboxActionFromText(text = "") {
  const raw = String(text || "").toLowerCase();
  const match = raw.match(/(?:recommended\s+action|recommendedaction)\s*[=:：]\s*([a-z_ -]+)/i);
  const candidate = String(match?.[1] || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_")
    .replace(/[^a-z_].*$/, "");
  const aliases = {
    accept: "accept_link",
    accept_link: "accept_link",
    create_link: "accept_link",
    promote: "promote_note",
    promote_note: "promote_note",
    create_note: "promote_note",
    ignore: "ignore",
    ignored: "ignore",
    archive: "ignore",
    needs_more_context: "needs_more_context",
    more_context: "needs_more_context"
  };
  return aliases[candidate] || "";
}

function resetAiInboxSummaryState() {
  aiInboxState.aiSummary = "";
  aiInboxState.aiSummaryMeta = "";
  aiInboxState.aiSummaryRecommendedAction = "";
  aiInboxState.aiSummaryError = "";
}

function syncAiInboxSummaryFromDetail(detail = null) {
  const decisions = Array.isArray(detail?.artifact?.userDecisions || detail?.item?.userDecisions)
    ? detail?.artifact?.userDecisions || detail?.item?.userDecisions
    : [];
  const summaryDecision = decisions
    .slice()
    .reverse()
    .find((decision) => String(decision?.comment || "").includes("[AI Summary]"));
  if (!summaryDecision) {
    resetAiInboxSummaryState();
    return;
  }
  const comment = String(summaryDecision.comment || "").trim();
  const provider = comment.match(/^provider=(.+)$/m)?.[1]?.trim() || "";
  const model = comment.match(/^model=(.+)$/m)?.[1]?.trim() || "";
  const body = comment
    .replace(/^\[AI Summary]\s*/m, "")
    .replace(/^provider=.*$/m, "")
    .replace(/^model=.*$/m, "")
    .replace(/^recommendedAction=.*$/m, "")
    .trim();
  aiInboxState.aiSummary = body;
  aiInboxState.aiSummaryMeta = [provider, model].filter(Boolean).join(" / ") || "persisted";
  aiInboxState.aiSummaryRecommendedAction = recommendedAiInboxActionFromText(comment);
  aiInboxState.aiSummaryError = "";
}

async function runAiInboxSummary(artifactId) {
  const cleanArtifactId = String(artifactId || aiInboxState.selectedArtifactId || "").trim();
  if (!cleanArtifactId) return false;
  aiInboxState.aiSummaryLoading = true;
  aiInboxState.aiSummaryError = "";
  aiInboxState.aiSummaryMeta = "";
  aiInboxState.aiSummary = "";
  aiInboxState.aiSummaryRecommendedAction = "";
  renderAiInboxWorkspace();
  try {
    const result = await summarizeAiInboxItem(cleanArtifactId, {
      userMode: settingsState.ai.userMode,
      modelPack: settingsState.ai.modelPack,
      modelTier: "cheap_fast",
      privacyMode: settingsState.ai.routePreview?.privacy?.mode || ""
    });
    aiInboxState.aiSummaryMeta = `${result?.providerId || "provider"} / ${result?.modelRef || "model"}`;
    aiInboxState.aiSummary = String(result?.output?.content || "").trim();
    aiInboxState.aiSummaryRecommendedAction = String(result?.recommendedAction || "").trim() || recommendedAiInboxActionFromText(aiInboxState.aiSummary);
    if (result?.artifact) {
      aiInboxState.detail = { item: result.inboxItem || aiInboxState.detail?.item || null, artifact: result.artifact };
    } else {
      await loadAiInboxDetail(cleanArtifactId);
    }
    setStatus("AI 摘要已生成", "ok");
    return true;
  } catch (error) {
    aiInboxState.aiSummaryError = String(error?.message || error);
    setStatus(`AI 摘要失败：${aiInboxState.aiSummaryError}`, "bad");
    return false;
  } finally {
    aiInboxState.aiSummaryLoading = false;
    renderAiInboxWorkspace();
  }
}

function renderScheduledTasksWorkspace() {
  const el = $("settingsScheduledTasksPanel");
  if (!el) return;
  el.innerHTML = renderScheduledTasksPanel({
    items: settingsState.ai.scheduledTasks,
    total: settingsState.ai.scheduledTasksTotal,
    templates: settingsState.ai.scheduledTaskTemplates,
    templatesLoading: settingsState.ai.scheduledTaskTemplatesLoading,
    templatesError: settingsState.ai.scheduledTaskTemplatesError,
    form: settingsState.ai.scheduledTaskForm,
    currentNoteId: state.selectedFileId || state.activeTabId || "",
    currentDirectoryId: state.selectedFolderId || "",
    filters: settingsState.ai.scheduledTaskFilters,
    loading: settingsState.ai.scheduledTasksLoading,
    actionLoading: settingsState.ai.scheduledTaskActionLoading,
    error: settingsState.ai.scheduledTasksError,
    runSummary: settingsState.ai.scheduledTaskRunSummary
  });
}

function scheduledTaskFiltersFromUi() {
  return normalizeScheduledTaskFilters({
    ...settingsState.ai.scheduledTaskFilters,
    status: $("scheduledTaskStatusFilter")?.value || settingsState.ai.scheduledTaskFilters.status,
    taskType: $("scheduledTaskTypeFilter")?.value || settingsState.ai.scheduledTaskFilters.taskType
  });
}

function scheduledTaskTemplateById(templateId = "") {
  const id = String(templateId || "").trim();
  return settingsState.ai.scheduledTaskTemplates.find((template) => String(template.templateId || "").trim() === id) || null;
}

function scheduledTaskFormFromUi() {
  return {
    ...settingsState.ai.scheduledTaskForm,
    templateId: $("scheduledTaskTemplateSelect")?.value || settingsState.ai.scheduledTaskForm.templateId,
    name: $("scheduledTaskNameInput")?.value || "",
    status: $("scheduledTaskStatusSelect")?.value || "paused",
    scheduleType: $("scheduledTaskScheduleTypeSelect")?.value || "weekly",
    dayOfWeek: $("scheduledTaskDaySelect")?.value || "monday",
    time: $("scheduledTaskTimeInput")?.value || "09:00",
    intervalMinutes: $("scheduledTaskIntervalInput")?.value || 30,
    noteIdsText: $("scheduledTaskNoteIdsInput")?.value || "",
    directoryIdsText: $("scheduledTaskDirectoryIdsInput")?.value || "",
    tagsText: $("scheduledTaskTagsInput")?.value || "",
    keywordsText: $("scheduledTaskKeywordsInput")?.value || "",
    includePrivateNotes: $("scheduledTaskIncludePrivateInput")?.checked === true
  };
}

function resetScheduledTaskForm(overrides = {}) {
  settingsState.ai.scheduledTaskForm = {
    ...scheduledTaskFormDefaults({
      templates: settingsState.ai.scheduledTaskTemplates,
      currentNoteId: state.selectedFileId || state.activeTabId || "",
      currentDirectoryId: state.selectedFolderId || ""
    }),
    ...overrides
  };
  renderScheduledTasksWorkspace();
}

function applyScheduledTaskTemplateToForm(templateId = "") {
  const template = scheduledTaskTemplateById(templateId);
  if (!template) return;
  const task = template.task || {};
  const schedule = task.schedule || {};
  settingsState.ai.scheduledTaskForm = {
    ...settingsState.ai.scheduledTaskForm,
    templateId: template.templateId,
    name: template.name || settingsState.ai.scheduledTaskForm.name,
    scheduleType: schedule.type || settingsState.ai.scheduledTaskForm.scheduleType,
    dayOfWeek: schedule.dayOfWeek || schedule.day_of_week || settingsState.ai.scheduledTaskForm.dayOfWeek,
    time: schedule.time || settingsState.ai.scheduledTaskForm.time
  };
  renderScheduledTasksWorkspace();
}

async function refreshScheduledTaskTemplates(options = {}) {
  if (!options.silent) {
    settingsState.ai.scheduledTaskTemplatesLoading = true;
    settingsState.ai.scheduledTaskTemplatesError = "";
    renderScheduledTasksWorkspace();
  }
  try {
    const result = await fetchAiScheduledTaskTemplates({ implementationReady: true });
    settingsState.ai.scheduledTaskTemplates = result.items;
    settingsState.ai.scheduledTaskTemplatesError = "";
    if (!String(settingsState.ai.scheduledTaskForm.templateId || "").trim()) resetScheduledTaskForm();
    return result;
  } catch (error) {
    settingsState.ai.scheduledTaskTemplatesError = String(error?.message || error);
    setStatus(`Scheduled task templates failed: ${settingsState.ai.scheduledTaskTemplatesError}`, "warn");
    return null;
  } finally {
    settingsState.ai.scheduledTaskTemplatesLoading = false;
    renderScheduledTasksWorkspace();
  }
}

function scheduledTaskPayloadHasScope(payload = {}) {
  const scope = payload.scope || {};
  return ["noteIds", "directoryIds", "tags", "keywords"].some((key) => Array.isArray(scope[key]) && scope[key].length);
}

async function saveScheduledTaskFromUi() {
  const form = scheduledTaskFormFromUi();
  settingsState.ai.scheduledTaskForm = form;
  const payload = scheduledTaskPayloadFromForm(form);
  if (payload.status === "active" && !scheduledTaskPayloadHasScope(payload)) {
    const confirmed = window.confirm("Create an active scheduled task without a note, directory, tag, or keyword scope?");
    if (!confirmed) return null;
  }

  settingsState.ai.scheduledTaskActionLoading = true;
  renderScheduledTasksWorkspace();
  try {
    const item = await saveAiScheduledTask(payload);
    settingsState.ai.scheduledTaskForm = scheduledTaskFormFromTask(item);
    await refreshScheduledTasks({ silent: true });
    setStatus(`Scheduled task saved: ${item?.name || item?.scheduledTaskId || ""}`, "ok");
    return item;
  } catch (error) {
    setStatus(`Scheduled task save failed: ${String(error?.message || error)}`, "bad");
    return null;
  } finally {
    settingsState.ai.scheduledTaskActionLoading = false;
    renderScheduledTasksWorkspace();
  }
}

function editScheduledTaskFromList(scheduledTaskId = "") {
  const id = String(scheduledTaskId || "").trim();
  const task = settingsState.ai.scheduledTasks.find((item) => String(item.scheduledTaskId || "").trim() === id);
  if (!task) return setStatus("Scheduled task not found in the current list", "warn");
  settingsState.ai.scheduledTaskForm = scheduledTaskFormFromTask(task);
  renderScheduledTasksWorkspace();
  setStatus(`Editing scheduled task: ${task.name || id}`, "ok");
}

function aiInboxFiltersFromUi() {
  return normalizeAiInboxFilters({
    ...aiInboxState.filters,
    type: $("aiInboxTypeFilter")?.value || aiInboxState.filters.type,
    sourceNoteId: $("aiInboxSourceNoteFilter")?.value || "",
    privacyMode: $("aiInboxPrivacyFilter")?.value || ""
  });
}

function aiInboxFeedbackFromUi() {
  const feedback = {};
  document.querySelectorAll("[data-ai-inbox-feedback]").forEach((input) => {
    const key = String(input.getAttribute("data-ai-inbox-feedback") || "").trim();
    if (key) feedback[key] = Boolean(input.checked);
  });
  return feedback;
}

async function loadAiInboxDetail(artifactId) {
  const cleanArtifactId = String(artifactId || "").trim();
  if (!cleanArtifactId) {
    aiInboxState.selectedArtifactId = "";
    aiInboxState.detail = null;
    aiInboxState.detailError = "";
    resetAiInboxSummaryState();
    renderAiInboxWorkspace();
    return null;
  }
  aiInboxState.selectedArtifactId = cleanArtifactId;
  aiInboxState.detailLoading = true;
  aiInboxState.detailError = "";
  resetAiInboxSummaryState();
  renderAiInboxWorkspace();
  try {
    const detail = await fetchAiInboxItem(cleanArtifactId);
    aiInboxState.detail = detail;
    syncAiInboxSummaryFromDetail(detail);
    return detail;
  } catch (error) {
    aiInboxState.detail = null;
    aiInboxState.detailError = String(error?.message || error);
    setStatus(`AI 建议详情加载失败：${aiInboxState.detailError}`, "warn");
    return null;
  } finally {
    aiInboxState.detailLoading = false;
    renderAiInboxWorkspace();
  }
}

async function refreshAiInbox({ silent = false, preserveDetail = false } = {}) {
  aiInboxState.filters = normalizeAiInboxFilters(aiInboxState.filters);
  if (!silent) {
    aiInboxState.loading = true;
    aiInboxState.error = "";
    renderAiInboxWorkspace();
  }
  const previousSelectedId = String(aiInboxState.selectedArtifactId || "").trim();
  try {
    const result = await fetchAiInbox(aiInboxState.filters);
    aiInboxState.items = result.items;
    aiInboxState.counts = result.counts || aiInboxState.counts;
    aiInboxState.views = result.views || [];
    aiInboxState.error = "";
    const selectedStillVisible = result.items.some((item) => String(item.artifactId || "").trim() === previousSelectedId);
    if (!preserveDetail) {
      aiInboxState.selectedArtifactId = selectedStillVisible ? previousSelectedId : result.items[0]?.artifactId || "";
      if (!aiInboxState.selectedArtifactId) aiInboxState.detail = null;
    }
    return result;
  } catch (error) {
    aiInboxState.error = String(error?.message || error);
    setStatus(`AI 建议加载失败：${aiInboxState.error}`, "warn");
    return null;
  } finally {
    aiInboxState.loading = false;
    renderAiInboxWorkspace();
  }
}

async function refreshAiInboxEvaluationSummary({ silent = false } = {}) {
  aiInboxState.filters = normalizeAiInboxFilters(aiInboxState.filters);
  if (!silent) {
    aiInboxState.evaluationLoading = true;
    aiInboxState.evaluationError = "";
    renderAiInboxWorkspace();
  }
  try {
    aiInboxState.evaluationSummary = await fetchAiInboxEvaluationSummary({
      ...aiInboxState.filters,
      view: "all"
    });
    aiInboxState.evaluationError = "";
    return aiInboxState.evaluationSummary;
  } catch (error) {
    aiInboxState.evaluationSummary = null;
    aiInboxState.evaluationError = String(error?.message || error);
    setStatus(`AI 建议处理统计加载失败：${aiInboxState.evaluationError}`, "warn");
    return null;
  } finally {
    aiInboxState.evaluationLoading = false;
    renderAiInboxWorkspace();
  }
}

async function openAiInboxModule() {
  await Promise.all([
    refreshAiInbox(),
    refreshAiInboxEvaluationSummary()
  ]);
  if (aiInboxState.selectedArtifactId && !aiInboxState.detail) {
    await loadAiInboxDetail(aiInboxState.selectedArtifactId);
  }
}

async function applyAiInboxFiltersFromUi() {
  aiInboxState.filters = aiInboxFiltersFromUi();
  aiInboxState.detail = null;
  aiInboxState.selectedArtifactId = "";
  await openAiInboxModule();
  setStatus("AI 建议已刷新", "ok");
}

async function recordAiInboxReviewDecision(decision) {
  const artifactId = String(aiInboxState.selectedArtifactId || aiInboxState.detail?.item?.artifactId || "").trim();
  if (!artifactId) return setStatus("请先选择一条 AI 建议", "warn");
  aiInboxState.actionLoading = true;
  renderAiInboxWorkspace();
  try {
    const result = await recordAiInboxDecision(artifactId, {
      decision,
      comment: $("aiInboxDecisionComment")?.value || "",
      feedback: aiInboxFeedbackFromUi()
    });
    aiInboxState.detail = { item: result.item, artifact: result.artifact };
    aiInboxState.selectedArtifactId = artifactId;
    await Promise.all([
      refreshAiInbox({ silent: true, preserveDetail: true }),
      refreshAiInboxEvaluationSummary({ silent: true })
    ]);
    setStatus(`AI 建议已${aiInboxActionLabel(decision) || "处理"}`, "ok");
    return result;
  } catch (error) {
    setStatus(`AI 建议处理失败：${String(error?.message || error)}`, "bad");
    return null;
  } finally {
    aiInboxState.actionLoading = false;
    renderAiInboxWorkspace();
  }
}

async function applyAiInboxRecommendedAction(action = "") {
  const normalized = String(action || aiInboxState.aiSummaryRecommendedAction || "").trim();
  const artifactId = String(aiInboxState.selectedArtifactId || aiInboxState.detail?.item?.artifactId || "").trim();
  if (!artifactId || !normalized) return setStatus("No AI recommended action to apply", "warn");
  const labels = {
    accept_link: "create the suggested relation",
    promote_note: "create a draft note",
    ignore: "mark this item ignored",
    needs_more_context: "mark this item as needing more context"
  };
  const label = labels[normalized] || normalized;
  if (!window.confirm(`Apply AI recommended action: ${label}?`)) return false;

  if (normalized === "accept_link") return acceptAiInboxLinkSuggestion(artifactId);
  if (normalized === "promote_note") return promoteAiInboxArtifactToNote(artifactId);
  if (normalized === "ignore") return recordAiInboxReviewDecision("ignored");
  if (normalized === "needs_more_context") {
    const comment = `${$("aiInboxDecisionComment")?.value || ""}\n\nAI recommendation: needs_more_context`.trim();
    const commentEl = $("aiInboxDecisionComment");
    if (commentEl) commentEl.value = comment;
    return recordAiInboxReviewDecision("revised");
  }
  return setStatus(`Unsupported AI recommended action: ${normalized}`, "warn");
}

async function acceptAiInboxLinkSuggestion(artifactId) {
  const cleanArtifactId = String(artifactId || aiInboxState.selectedArtifactId || "").trim();
  if (!cleanArtifactId) return setStatus("请先选择一条关联建议", "warn");
  aiInboxState.actionLoading = true;
  renderAiInboxWorkspace();
  try {
    const result = await acceptAiInboxLink(cleanArtifactId, {
      comment: $("aiInboxDecisionComment")?.value || ""
    });
    aiInboxState.detail = { item: result.item, artifact: result.artifact };
    aiInboxState.selectedArtifactId = cleanArtifactId;
    await Promise.all([
      refreshAiInbox({ silent: true, preserveDetail: true }),
      refreshAiInboxEvaluationSummary({ silent: true })
    ]);
    if (state.module === "graph") await refreshDirectoryGraph();
    setStatus(result.relation?.created === false ? "关系已存在，建议已标记为已建立关系" : "已把关联建议建立为笔记关系", "ok");
    return result;
  } catch (error) {
    setStatus(`LinkSuggestion accept failed: ${String(error?.message || error)}`, "bad");
    return null;
  } finally {
    aiInboxState.actionLoading = false;
    renderAiInboxWorkspace();
  }
}

async function promoteAiInboxArtifactToNote(artifactId) {
  const cleanArtifactId = String(artifactId || aiInboxState.selectedArtifactId || "").trim();
  if (!cleanArtifactId) return setStatus("请先选择一条问题卡片或反思提示", "warn");
  aiInboxState.actionLoading = true;
  renderAiInboxWorkspace();
  try {
    const result = await promoteAiInboxNote(cleanArtifactId, {
      comment: $("aiInboxDecisionComment")?.value || ""
    });
    aiInboxState.detail = { item: result.item, artifact: result.artifact };
    aiInboxState.selectedArtifactId = cleanArtifactId;
    if (result.note?.id) {
      state.notes = [mapNoteItem(result.note), ...state.notes.filter((item) => item.id !== result.note.id)];
    }
    await Promise.all([
      refreshAiInbox({ silent: true, preserveDetail: true }),
      refreshAiInboxEvaluationSummary({ silent: true })
    ]);
    if (result.note?.id) {
      activateModule("explorer");
      openNoteById(result.note.id);
    }
    setStatus(result.note?.id ? `已从 AI 建议生成草稿笔记：${result.note.id}` : "AI 建议已生成草稿", "ok");
    return result;
  } catch (error) {
    setStatus(`AI note promotion failed: ${String(error?.message || error)}`, "bad");
    return null;
  } finally {
    aiInboxState.actionLoading = false;
    renderAiInboxWorkspace();
  }
}

async function refreshScheduledTasks(options = {}) {
  settingsState.ai.scheduledTaskFilters = normalizeScheduledTaskFilters(settingsState.ai.scheduledTaskFilters);
  if (!options.silent) {
    settingsState.ai.scheduledTasksLoading = true;
    settingsState.ai.scheduledTasksError = "";
    renderScheduledTasksWorkspace();
  }
  try {
    const result = await fetchAiScheduledTasks(settingsState.ai.scheduledTaskFilters);
    settingsState.ai.scheduledTasks = result.items;
    settingsState.ai.scheduledTasksTotal = result.total;
    settingsState.ai.scheduledTasksError = "";
    return result;
  } catch (error) {
    settingsState.ai.scheduledTasksError = String(error?.message || error);
    setStatus(`Scheduled task load failed: ${settingsState.ai.scheduledTasksError}`, "warn");
    return null;
  } finally {
    settingsState.ai.scheduledTasksLoading = false;
    renderScheduledTasksWorkspace();
  }
}

async function setScheduledTaskStatus(scheduledTaskId, status) {
  const cleanScheduledTaskId = String(scheduledTaskId || "").trim();
  const cleanStatus = String(status || "").trim();
  if (!cleanScheduledTaskId || !cleanStatus) return null;
  settingsState.ai.scheduledTaskActionLoading = true;
  renderScheduledTasksWorkspace();
  try {
    const item = await updateAiScheduledTaskStatus(cleanScheduledTaskId, cleanStatus);
    settingsState.ai.scheduledTasks = settingsState.ai.scheduledTasks.map((task) =>
      String(task.scheduledTaskId || "").trim() === cleanScheduledTaskId ? item : task
    );
    await refreshScheduledTasks({ silent: true });
    setStatus(`Scheduled task ${cleanStatus}: ${cleanScheduledTaskId}`, "ok");
    return item;
  } catch (error) {
    setStatus(`Scheduled task status failed: ${String(error?.message || error)}`, "bad");
    return null;
  } finally {
    settingsState.ai.scheduledTaskActionLoading = false;
    renderScheduledTasksWorkspace();
  }
}

async function runDueScheduledTasksFromUi() {
  const confirmed = window.confirm("现在运行到期的 AI 任务吗？新的输出会先进入 AI 建议待办，等待你确认。");
  if (!confirmed) return null;
  settingsState.ai.scheduledTaskActionLoading = true;
  settingsState.ai.scheduledTasksError = "";
  renderScheduledTasksWorkspace();
  try {
    const summary = await runDueAiScheduledTasks({ limit: settingsState.ai.scheduledTaskFilters.limit || 50 });
    settingsState.ai.scheduledTaskRunSummary = summary;
    await Promise.all([
      refreshScheduledTasks({ silent: true }),
      refreshAiInbox({ silent: true, preserveDetail: true }),
      refreshAiInboxEvaluationSummary({ silent: true })
    ]);
    setStatus(`Scheduled tasks run: ${summary?.succeeded || 0} succeeded, ${summary?.skipped || 0} skipped, ${summary?.failed || 0} failed`, "ok");
    return summary;
  } catch (error) {
    setStatus(`Run due scheduled tasks failed: ${String(error?.message || error)}`, "bad");
    return null;
  } finally {
    settingsState.ai.scheduledTaskActionLoading = false;
    renderScheduledTasksWorkspace();
  }
}

function normalizeOptionalNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

const NOTE_SAVE_REFLECTION_PROMPTS = [
  "这段材料你真正理解成什么？",
  "你为什么要保留它？",
  "它会支持什么判断？"
];

const ORIGINALITY_REASON_LABELS = {
  similarity_above_block_threshold: "它仍然过于贴近关联文献的原句",
  similarity_above_warn_threshold: "它还没有完全转成你自己的判断语言",
  citation_locator_missing: "它缺少可追溯的引用定位",
  core_claim_empty: "它的核心判断还不够清楚"
};

function noteSaveReflectionHint(prefix = "") {
  const head = String(prefix || "").trim();
  return `${head ? `${head} ` : ""}${NOTE_SAVE_REFLECTION_PROMPTS.join("  ")}`.trim();
}

function originalityReasonSummary(reasons = []) {
  const labels = [...new Set((reasons || []).map((reason) => ORIGINALITY_REASON_LABELS[String(reason || "").trim()] || "").filter(Boolean))];
  return labels.join("；");
}

function noteSaveFailureFeedback(error) {
  const code = String(error?.code || "").trim();
  if (code === "LITERATURE_PARAPHRASE_REQUIRED") {
    return {
      ok: false,
      saveMode: "blocked",
      saveMessage: noteSaveReflectionHint("当前文件：缺少转述，暂不能标记完成。"),
      statusTone: "warn",
      statusMessage: "保存被拦下：先写出你真正理解后的转述，再把文献笔记标记为已完成。"
    };
  }

  if (code === "PERMANENT_ORIGINALITY_BLOCKED") {
    const originality = error?.details?.originality || {};
    const similarity = Math.round((Number(originality.similarity) || 0) * 100);
    const reasons = originalityReasonSummary(originality.reasons);
    const reasonSuffix = reasons ? ` ${reasons}。` : "";
    return {
      ok: false,
      saveMode: "blocked",
      saveMessage: noteSaveReflectionHint(
        `当前文件：原创性检测阻止落盘。相似度约 ${similarity}%。先把外部语言改写成你自己的判断，再继续保存。`
      ),
      statusTone: "warn",
      statusMessage: `保存被拦下：这条永久笔记仍然过于贴近关联文献原文（相似度 ${similarity}%）。${reasonSuffix}`.trim()
    };
  }

  return {
    ok: false,
    saveMode: "error",
    saveMessage: "当前文件：保存失败，修改仍保留在编辑器中。",
    statusTone: "warn",
    statusMessage: `保存失败（仅本地暂存）：${String(error?.message || error)}`
  };
}

function normalizeAuthorshipItem(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return {
    user_confirmed: Boolean(value.user_confirmed),
    ai_assisted: Boolean(value.ai_assisted)
  };
}

function normalizeThinkingStatusItem(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const label = String(value.label || "").trim();
  const nextAction = String(value.nextAction || "").trim();
  if (!label && !nextAction) return null;
  return {
    status: String(value.status || "").trim(),
    label,
    nextAction,
    targetField: String(value.targetField || "").trim(),
    severity: String(value.severity || "next").trim() || "next"
  };
}

function thinkingStatusTone(thinkingStatus = null) {
  const severity = String(thinkingStatus?.severity || "").trim().toLowerCase();
  if (severity === "ready") return "ready";
  if (String(thinkingStatus?.status || "").startsWith("ready_")) return "ready";
  return "next";
}

function renderThinkingStatusBadge(value, className = "thinking-status-badge") {
  const thinkingStatus = normalizeThinkingStatusItem(value);
  if (!thinkingStatus) return "";
  const title = thinkingStatus.nextAction
    ? `${thinkingStatus.label}：${thinkingStatus.nextAction}`
    : thinkingStatus.label;
  return `<span class="${escapeHtml(className)}" data-tone="${escapeHtml(thinkingStatusTone(thinkingStatus))}" title="${escapeHtml(title)}">${escapeHtml(thinkingStatus.label)}</span>`;
}

function renderImportHistory() {
  const el = $("importHistoryMount");
  if (!el) return;
  el.innerHTML = renderImportHistoryMount({
    items: importState.historyItems,
    total: importState.historyTotal,
    loading: importState.historyLoading,
    activeImportRecordId: String(importState.importRecordId || $("importRecordId")?.value || "").trim(),
    filters: {
      status: importState.historyStatusFilter,
      connector: importState.historyConnectorFilter,
      risk: importState.historyRiskFilter
    }
  });
}

async function refreshImportHistory({ silent = false } = {}) {
  if (!silent) {
    importState.historyLoading = true;
    renderImportHistory();
  }
  try {
    const result = await listImportRecords(12);
    importState.historyItems = await enrichImportHistoryItemsWithLiteratureProgress(result.items);
    importState.historyTotal = result.total;
  } catch (error) {
    if (!silent) {
      setStatus(`读取导入历史失败：${String(error?.message || error)}`, "warn");
    }
  } finally {
    importState.historyLoading = false;
    renderImportHistory();
  }
}

async function loadImportRecordIntoUi(importRecordId, { statusPrefix = "已读取导入记录" } = {}) {
  const cleanImportRecordId = String(importRecordId || "").trim();
  if (!cleanImportRecordId) throw new Error("importRecordId is required");
  const importRecord = await fetchImportRecord(cleanImportRecordId);
  importState.lastPreview =
    importRecord?.status === "preview"
      ? {
          importRecordId: cleanImportRecordId,
          candidatePreview: importRecord.candidatePreview || null,
          originalityGuard: importRecord.originalityGuard || null
        }
      : null;
  importState.previewFilter = "all";
  syncImportSelection(cleanImportRecordId, importRecord?.candidatePreview, { preserve: true });
  setImportRecordId(cleanImportRecordId);
  showImportResult({
    stage: "record",
    importRecord
  });
  setStatus(`${statusPrefix}：${cleanImportRecordId}`, "ok");
  return importRecord;
}

async function rollbackImportIntoUi(importRecordId, { statusPrefix = "回滚完成" } = {}) {
  const cleanImportRecordId = String(importRecordId || "").trim();
  if (!cleanImportRecordId) throw new Error("importRecordId is required");
  const result = await rollbackImport(cleanImportRecordId);
  setImportRecordId(cleanImportRecordId);
  showImportResult({
    stage: "rollback",
    importRecordId: cleanImportRecordId,
    status: result.status,
    result: result.result
  });
  importState.lastPreview = null;
  await refreshImportHistory({ silent: true });
  await refreshImportedNotesView();
  setStatus(`${statusPrefix}：${cleanImportRecordId}`, "ok");
  return result;
}

function syncImportHistoryFiltersFromUi() {
  importState.historyStatusFilter = String($("importHistoryStatus")?.value || "all").trim();
  importState.historyConnectorFilter = String($("importHistoryConnector")?.value || "all").trim();
  importState.historyRiskFilter = String($("importHistoryRisk")?.value || "all").trim();
}

function uniqueStrings(items = []) {
  return [...new Set(items.map((item) => String(item || "").trim()).filter(Boolean))];
}

function candidatePreviewFromPayload(payload = {}) {
  return payload.candidatePreview || payload.importRecord?.candidatePreview || null;
}

function syncImportSelection(importRecordId, candidatePreview, { preserve = false } = {}) {
  const cleanRecordId = String(importRecordId || "").trim();
  const candidateIds = candidatePreviewItemIds(candidatePreview);
  const selected = new Set();
  if (preserve && importState.selectionImportRecordId === cleanRecordId) {
    for (const id of candidateIds) {
      if (importState.selectedCandidateIds.has(id)) selected.add(id);
    }
  } else {
    for (const id of candidateIds) selected.add(id);
  }
  importState.selectionImportRecordId = cleanRecordId;
  importState.selectedCandidateIds = selected;
}

function selectedCandidateIdsFor(candidatePreview, importRecordId, selection = null) {
  if (selection && Array.isArray(selection.candidateIds)) {
    return new Set(selection.candidateIds.map((item) => String(item || "").trim()).filter(Boolean));
  }
  if (importState.selectionImportRecordId === String(importRecordId || "").trim()) {
    return new Set(importState.selectedCandidateIds);
  }
  return new Set(candidatePreviewItemIds(candidatePreview));
}

function selectionSummary(candidatePreview, importRecordId, selection = null) {
  const selectedIds = selectedCandidateIdsFor(candidatePreview, importRecordId, selection);
  return summarizeCandidateSelection(candidatePreview, selectedIds);
}

function renderImportWritingActions(payload = {}) {
  const permanentNoteIds = createdNoteIdsByTypeFromImportPayload(payload, "permanent");
  const literatureNoteIds = createdNoteIdsByTypeFromImportPayload(payload, "literature");
  const literatureBatchSummary = literatureBatchSummaryForPayload(payload);
  if (!permanentNoteIds.length && !literatureNoteIds.length) return "";
  return `
    <div class="result-actions-inline">
      ${
        literatureNoteIds.length
          ? `
      ${
        literatureBatchSummary
          ? `
      <div class="result-metrics">
        <div class="result-metric"><span>待转述</span><strong>${literatureBatchSummary.pending}</strong></div>
        <div class="result-metric"><span>待提炼</span><strong>${literatureBatchSummary.refine}</strong></div>
        <div class="result-metric"><span>可转永久笔记</span><strong>${literatureBatchSummary.ready}</strong></div>
      </div>
      `
          : ""
      }
      <button class="mini-btn" type="button" data-import-writing-action="open-literature-queue">
        处理待转述队列 ${literatureNoteIds.length}
      </button>
      <div class="toolbar-note">${
        literatureBatchSummary
          ? `本批次预测：已完成转述 ${literatureBatchSummary.paraphraseDone}/${literatureBatchSummary.total}，剩余待处理 ${literatureBatchSummary.remaining} 条。`
          : `这 ${literatureNoteIds.length} 条文献笔记会先进入待转述队列，并默认只显示本次导入范围。`
      }</div>
      `
          : ""
      }
      ${
        permanentNoteIds.length
          ? `
      <button class="mini-btn" type="button" data-import-writing-action="add-permanent-notes">
        加入写作篮子 ${permanentNoteIds.length}
      </button>
      <button class="mini-btn" type="button" data-import-writing-action="add-permanent-notes-open-writing">
        加入并打开写作中心
      </button>
      <button class="mini-btn" type="button" data-import-writing-action="create-writing-project">
        直接创建写作项目
      </button>
      <div class="toolbar-note">把本次新写入的 PermanentNote 直接送进写作中心。</div>
      `
          : ""
      }
    </div>
  `;
}

function createdFilesFromImportPayload(payload = {}) {
  const stage = String(payload?.stage || "").trim();
  if (stage === "confirm") return Array.isArray(payload?.result?.createdFiles) ? payload.result.createdFiles : [];
  if (stage === "record") return Array.isArray(payload?.importRecord?.confirmResult?.createdFiles) ? payload.importRecord.confirmResult.createdFiles : [];
  return [];
}

function createdNoteIdsByTypeFromImportPayload(payload = {}, noteType = "") {
  const normalizedType = String(noteType || "").trim();
  if (!normalizedType) return [];
  return [
    ...new Set(
      createdFilesFromImportPayload(payload)
        .filter((item) => String(item?.noteType || "").trim() === normalizedType)
        .map((item) => String(item?.noteId || "").trim())
        .filter(Boolean)
    )
  ];
}

function createdNoteIdsByTypeFromImportRecord(record = {}, noteType = "") {
  const normalizedType = String(noteType || "").trim();
  if (!normalizedType) return [];
  return [
    ...new Set(
      (Array.isArray(record?.confirmResult?.createdFiles) ? record.confirmResult.createdFiles : [])
        .filter((item) => String(item?.noteType || "").trim() === normalizedType)
        .map((item) => String(item?.noteId || "").trim())
        .filter(Boolean)
    )
  ];
}

function importPayloadRecordId(payload = {}) {
  return String(payload?.importRecordId || payload?.importRecord?.importRecordId || "").trim();
}

function summarizeLiteratureBatchFromNotes(notes = []) {
  let pending = 0;
  let refine = 0;
  let ready = 0;
  const ranked = rankedLiteratureQueueNotes(notes);
  for (const item of ranked) {
    if (item.lane === "pending") pending += 1;
    else if (item.lane === "refine") refine += 1;
    else ready += 1;
  }
  const total = notes.length;
  const nextPending = ranked.find((item) => item.lane === "pending") || ranked.find((item) => item.lane === "refine") || null;
  const nextReady = ranked.find((item) => item.lane === "ready") || null;
  return {
    total,
    pending,
    refine,
    ready,
    paraphraseDone: total - pending,
    remaining: pending + refine,
    nextPendingNoteId: nextPending?.note?.id || "",
    nextPendingTitle: nextPending?.note?.title || nextPending?.note?.id || "",
    nextPendingLane: nextPending?.lane || "",
    nextReadyNoteId: nextReady?.note?.id || "",
    nextReadyTitle: nextReady?.note?.title || nextReady?.note?.id || ""
  };
}

function literatureBatchSummaryForPayload(payload = {}) {
  const summary = importState.literatureBatchSummary;
  if (!summary) return null;
  const recordId = importPayloadRecordId(payload);
  const noteIds = createdNoteIdsByTypeFromImportPayload(payload, "literature");
  const key = `${recordId}|${noteIds.join(",")}`;
  return summary.key === key ? summary : null;
}

function renderWritingResultDetails(data = {}) {
  const stage = String(data.stage || "");
  if (stage === "writing_project") {
    const notes = Array.isArray(data.basketNotes) ? data.basketNotes : [];
    return `
      <div class="writing-preview">
        <h4>写作篮快照</h4>
        ${
          notes.length
            ? `<ul>${notes
                .map((note) => `<li><strong>${escapeHtml(note.title || note.id)}</strong> ${escapeHtml(note.id || "")}</li>`)
                .join("")}</ul>`
            : `<div class="writing-empty">当前返回里没有篮子明细。</div>`
        }
      </div>
    `;
  }

  if (stage === "draft_scaffold") {
    const sections = Array.isArray(data.sections) ? data.sections : [];
    const markdown = String(data.markdown || "").trim();
    return `
      <div class="writing-preview">
        <h4>草稿骨架快照</h4>
        <div class="toolbar-note">这里只组织结构、证据与开放问题，不直接替你完成终稿。</div>
        ${
          sections.length
            ? `<ol>${sections
                .map((section) => `<li><strong>${escapeHtml(section.heading || `Section ${section.order || ""}`)}</strong> ${escapeHtml(section.purpose || "")}</li>`)
                .join("")}</ol>`
            : `<div class="writing-empty">当前返回里没有章节结构。</div>`
        }
        ${markdown ? `<pre>${escapeHtml(markdown)}</pre>` : ""}
      </div>
    `;
  }

  if (stage === "writing_draft_note") {
    return `
      <div class="writing-preview">
        <h4>草稿已落成笔记</h4>
        <ul>
          <li><strong>Note ID</strong> ${escapeHtml(data.noteId || "")}</li>
          <li><strong>目录</strong> ${escapeHtml(data.directoryId || "")}</li>
          <li><strong>标题</strong> ${escapeHtml(data.title || "")}</li>
        </ul>
      </div>
    `;
  }

  return "";
}

function renderResult(el, payload) {
  if (!el) return;
  if (typeof payload === "string") {
    el.textContent = payload;
    return;
  }
  const data = payload || {};
  const stage = String(data.stage || "");
  const candidatePreview = candidatePreviewFromPayload(data);
  const skippedCandidateIds = confirmSkippedCandidateIds(data, candidatePreview);
  const skipReasonMap = confirmSkipReasonMap(data, candidatePreview);
  const importRecordId = data.importRecordId || data.importRecord?.importRecordId || "";
  const interactivePreview = stage === "preview" || (stage === "record" && data.importRecord?.status === "preview");
  const selection = data.result?.selection || data.importRecord?.confirmResult?.selection || null;
  const previewSummary = selectionSummary(candidatePreview, importRecordId, selection);
  const showExcludedSummary = stage === "confirm" && Boolean(selection?.selectedCandidates < selection?.totalCandidates);
  const raw = JSON.stringify(data, null, 2);

  el.innerHTML = renderImportResultMount({
    data,
    writingActionsHtml: renderImportWritingActions(data),
    skipBreakdownHtml: renderConfirmSkipBreakdown(data, candidatePreview, { focusReason: importState.resultFocusReason }),
    candidatePreviewHtml: renderCandidatePreview(candidatePreview, {
      interactive: interactivePreview,
      summary: previewSummary,
      previewFilter: importState.previewFilter,
      showExcludedSummary,
      originalityGuard: data.originalityGuard || data.importRecord?.originalityGuard || null,
      focusReason: importState.resultFocusReason,
      focusCandidateIds: skippedCandidateIds[importState.resultFocusReason] || [],
      skipReasonMap
    }),
    writingDetailsHtml: renderWritingResultDetails(data),
    raw
  });
}

function showImportResult(payload) {
  importState.resultFocusReason = "";
  importState.lastResultPayload = payload;
  importState.literatureBatchSummary = null;
  renderResult($("importResult"), payload);
  void refreshImportLiteratureBatchSummary(payload);
  updateImportConfirmButton();
}

function showExportResult(payload) {
  renderResult($("exportResult"), payload);
}

function showWritingResult(payload) {
  if (payload?.stage === "draft_scaffold" && typeof payload.markdown === "string") {
    writingState.scaffoldMarkdown = payload.markdown;
  }
  renderResult($("writingResult"), payload);
  renderWritingScaffoldPreview();
}

async function ensureNotesLoaded(noteIds) {
  const uniqueIds = [...new Set((noteIds || []).map((item) => String(item || "").trim()).filter(Boolean))];
  for (const noteId of uniqueIds) {
    if (writingNoteById(noteId)) continue;
    try {
      const fetched = await fetchNote(noteId);
      if (!fetched) continue;
      const mapped = mapNoteItem(fetched);
      state.notes = [mapped, ...state.notes.filter((item) => item.id !== mapped.id)];
    } catch {}
  }
}

async function refreshImportLiteratureBatchSummary(payload = {}) {
  const noteIds = createdNoteIdsByTypeFromImportPayload(payload, "literature");
  if (!noteIds.length) return;
  const key = `${importPayloadRecordId(payload)}|${noteIds.join(",")}`;
  await ensureNotesLoaded(noteIds);
  const notes = noteIds.map((id) => writingNoteById(id)).filter(Boolean);
  if (!notes.length) return;
  if (importState.lastResultPayload !== payload) return;
  importState.literatureBatchSummary = {
    key,
    ...summarizeLiteratureBatchFromNotes(notes)
  };
  rerenderImportResult();
}

async function enrichImportHistoryItemsWithLiteratureProgress(items = []) {
  const records = Array.isArray(items) ? items : [];
  const literatureIdGroups = records.map((record) => createdNoteIdsByTypeFromImportRecord(record, "literature"));
  const allLiteratureIds = [...new Set(literatureIdGroups.flat().filter(Boolean))];
  if (!allLiteratureIds.length) return records;
  await ensureNotesLoaded(allLiteratureIds);
  return records.map((record, index) => {
    const noteIds = literatureIdGroups[index] || [];
    if (!noteIds.length) return record;
    const notes = noteIds.map((id) => writingNoteById(id)).filter(Boolean);
    if (!notes.length) return record;
    return {
      ...record,
      literatureBatchProgress: summarizeLiteratureBatchFromNotes(notes)
    };
  });
}

function importHistoryRecordById(importRecordId = "") {
  const id = String(importRecordId || "").trim();
  if (!id) return null;
  return importState.historyItems.find((item) => String(item?.importRecordId || "").trim() === id) || null;
}

const REQUIRED_LITERATURE_QUEUE_CITATION_FIELDS = ["sourceTitle", "authors", "year", "locator", "identifier"];

function hasRequiredLiteratureCitation(citation = {}) {
  return REQUIRED_LITERATURE_QUEUE_CITATION_FIELDS.every((key) => Boolean(normalizeFieldText(citation?.[key])));
}

function literatureQueueLaneForNote(note) {
  const fields = parseLiteratureWorkspace(note?.body || "");
  const hasParaphrase = Boolean(normalizeFieldText(fields.paraphrase));
  const hasOriginalText = Boolean(normalizeFieldText(fields.originalText));
  const hasJudgmentSeed = Boolean(normalizeFieldText(fields.supportsJudgment));
  const hasQuestion = Boolean(normalizeFieldText(fields.question));
  const hasSource = hasOriginalText && hasRequiredLiteratureCitation(fields.citation);
  if (!hasSource) return "refine";
  if (!hasParaphrase) return "pending";
  if (!hasJudgmentSeed && !hasQuestion) return "refine";
  return "ready";
}

function rankedLiteratureQueueNotes(notes = []) {
  const priority = { pending: 0, refine: 1, ready: 2 };
  return (Array.isArray(notes) ? notes : [])
    .map((note) => ({ note, lane: literatureQueueLaneForNote(note) }))
    .sort((a, b) => {
      const laneDiff = (priority[a.lane] ?? 99) - (priority[b.lane] ?? 99);
      if (laneDiff) return laneDiff;
      const aTime = Date.parse(a.note?.updatedAt || 0) || 0;
      const bTime = Date.parse(b.note?.updatedAt || 0) || 0;
      if (bTime !== aTime) return bTime - aTime;
      return String(a.note?.title || a.note?.id || "").localeCompare(String(b.note?.title || b.note?.id || ""), "zh-CN");
    });
}

function preferredLiteratureQueueNoteId(noteIds = [], { targetLane = "" } = {}) {
  const notes = noteIds.map((id) => writingNoteById(id)).filter(Boolean);
  const ranked = rankedLiteratureQueueNotes(notes);
  const match = targetLane ? ranked.find((item) => item.lane === targetLane) : ranked[0];
  return match?.note?.id || String(noteIds[0] || "").trim();
}

async function openLiteratureQueueForImportRecord(importRecordId, { preferNextPending = false, preferReadyForOriginal = false } = {}) {
  const cleanImportRecordId = String(importRecordId || "").trim();
  if (!cleanImportRecordId) throw new Error("importRecordId is required");
  let record = importHistoryRecordById(cleanImportRecordId);
  if (!record) {
    record = await fetchImportRecord(cleanImportRecordId);
  }
  const noteIds = createdNoteIdsByTypeFromImportRecord(record || {}, "literature");
  if (!noteIds.length) {
    setStatus("这条导入记录里没有可处理的 LiteratureNote", "warn");
    return false;
  }
  await ensureNotesLoaded(noteIds);
  setImportRecordId(cleanImportRecordId);
  setLiteratureQueueFocus(noteIds, `导入批次 ${cleanImportRecordId}`);
  activateModule("explorer");
  const targetNoteId = preferReadyForOriginal
    ? preferredLiteratureQueueNoteId(noteIds, { targetLane: "ready" })
    : preferNextPending
      ? preferredLiteratureQueueNoteId(noteIds)
      : noteIds[0];
  const opened = openNoteById(targetNoteId, { preferTitleSelection: false });
  if (!opened) return false;
  setStatus(
    preferReadyForOriginal
      ? `已从历史记录定位到可转永久笔记文献条目：${cleanImportRecordId}`
      : preferNextPending
        ? `已从历史记录继续下一条待处理文献条目：${cleanImportRecordId}`
        : `已从历史记录打开文献队列：${cleanImportRecordId}`,
    "ok",
    { requireModule: "explorer" }
  );
  return true;
}

function setLiteratureQueueFocus(noteIds = [], label = "") {
  state.literatureQueueFocusNoteIds = [...new Set((noteIds || []).map((item) => String(item || "").trim()).filter(Boolean))];
  state.literatureQueueFocusLabel = state.literatureQueueFocusNoteIds.length ? String(label || "").trim() : "";
}

function clearLiteratureQueueFocus() {
  setLiteratureQueueFocus([], "");
}

async function openImportedLiteratureQueue() {
  const noteIds = createdNoteIdsByTypeFromImportPayload(importState.lastResultPayload || {}, "literature");
  if (!noteIds.length) {
    setStatus("当前导入结果里没有可继续处理的 LiteratureNote", "warn");
    return false;
  }
  await ensureNotesLoaded(noteIds);
  const importRecordId = importPayloadRecordId(importState.lastResultPayload || {}) || importState.importRecordId || "";
  setLiteratureQueueFocus(noteIds, importRecordId ? `导入批次 ${importRecordId}` : "本次导入");
  activateModule("explorer");
  const opened = openNoteById(noteIds[0], { preferTitleSelection: false });
  if (!opened) return false;
  setStatus(`已打开 ${noteIds.length} 条导入文献中的第一条，并只显示本次导入的待转述队列`, "ok");
  return true;
}

async function openWritingModule({ statusMessage = "已打开写作中心" } = {}) {
  const statusRevisionAtStart = statusRevision;
  activateModule("writing");
  const writingProjectId = String(writingState.project?.id || "").trim();
  writingState.loadingProjects = true;
  writingState.loadingThemeIndexes = true;
  writingState.loadingScaffoldVersions = Boolean(writingProjectId);
  writingState.loadingDraftVersions = Boolean(writingProjectId);
  renderWritingPanel();
  try {
    const [projects, themeIndexes, project, scaffoldVersions, draftVersions] = await Promise.all([
      listWritingProjects({
        limit: 8,
        q: writingState.projectFilters.q,
        status: writingState.projectFilters.status,
        hasDraft: writingState.projectFilters.hasDraft
      }).catch(() => writingState.projects),
      listIndexCards({
        directoryId: writingThemeIndexScopeDirectoryId(),
        includeDescendants: true,
        indexType: "topic",
        limit: 12
      }).catch(() => writingState.themeIndexes),
      writingProjectId ? fetchWritingProject(writingProjectId).catch(() => writingState.project) : Promise.resolve(null),
      writingProjectId ? listProjectScaffolds(writingProjectId, 12).catch(() => writingState.scaffoldVersions) : Promise.resolve([]),
      writingProjectId ? listProjectDraftVersions(writingProjectId, 12).catch(() => writingState.draftVersions) : Promise.resolve([])
    ]);
    writingState.projects = Array.isArray(projects) ? projects : writingState.projects;
    writingState.themeIndexes = Array.isArray(themeIndexes) ? themeIndexes : writingState.themeIndexes;
    if (project) writingState.project = project;
    writingState.scaffoldVersions = Array.isArray(scaffoldVersions) ? scaffoldVersions : writingState.scaffoldVersions;
    writingState.draftVersions = Array.isArray(draftVersions) ? draftVersions : writingState.draftVersions;
  } finally {
    writingState.loadingProjects = false;
    writingState.loadingThemeIndexes = false;
    writingState.loadingScaffoldVersions = false;
    writingState.loadingDraftVersions = false;
    renderWritingPanel();
  }
  if (statusMessage) setStatus(statusMessage, "ok", { skipIfStaleSince: statusRevisionAtStart, requireModule: "writing" });
}

async function addImportedPermanentNotesToWritingBasket({ openWriting = false } = {}) {
  const noteIds = createdNoteIdsByTypeFromImportPayload(importState.lastResultPayload || {}, "permanent");
  if (!noteIds.length) {
    setStatus("当前导入结果里没有可加入写作篮子的 PermanentNote", "warn");
    return false;
  }
  await ensureNotesLoaded(noteIds);
  clearWritingSourceIndexIds();
  addWritingBasketIds(noteIds);
  if (!$("writingTitle")?.value.trim()) {
    const firstNote = noteIds.map((id) => writingNoteById(id)).find(Boolean);
    if (firstNote?.title) $("writingTitle").value = `${firstNote.title} 写作项目`;
  }
  renderWritingPanel();
  if (openWriting) {
    await openWritingModule({ statusMessage: `已把 ${noteIds.length} 条导入永久笔记加入写作篮子，并打开写作中心` });
  } else {
    setStatus(`已把 ${noteIds.length} 条导入永久笔记加入写作篮子`, "ok");
  }
  return true;
}

function suggestedWritingProjectTitle(noteIds = []) {
  const notes = noteIds.map((id) => writingNoteById(id)).filter(Boolean);
  if (notes.length === 1) return `${notes[0].title || notes[0].id} 写作项目`;
  const first = notes[0];
  if (first?.title) return `${first.title} 等 ${notes.length} 条笔记`;
  return `导入笔记写作项目 ${noteIds.length}`;
}

async function useThemeIndexAsWritingEntry(indexCardId, { replaceBasket = false } = {}) {
  const id = String(indexCardId || "").trim();
  if (!id) throw new Error("indexCardId is required");
  const indexCard = writingThemeIndexById(id) || (await fetchIndexCard(id));
  const noteIds = uniqueStrings(indexCard?.item_note_ids || indexCard?.items?.map((item) => item.note_id) || []);
  if (!noteIds.length) throw new Error("theme index is empty");
  await ensureNotesLoaded(noteIds);
  if (replaceBasket) setWritingBasketIds(noteIds);
  else addWritingBasketIds(noteIds);
  setWritingSourceIndexIds([id]);
  if (!$("writingTitle")?.value.trim()) $("writingTitle").value = `${indexCard.title || suggestedWritingProjectTitle(noteIds)} 写作项目`;
  renderWritingPanel();
  return { indexCard, noteIds };
}

async function saveWritingBasketAsThemeIndex() {
  const basketNoteIds = parseWritingBasketIds();
  if (!basketNoteIds.length) throw new Error("writing basket is empty");
  await ensureNotesLoaded(basketNoteIds);
  const suggestedTitle = suggestedThemeIndexTitle(basketNoteIds);
  const title = window.prompt("主题索引标题", suggestedTitle);
  if (title === null) return null;
  const cleanTitle = String(title || "").trim();
  if (!cleanTitle) throw new Error("title is required");
  const summarySeed = String($("writingGoal")?.value || "").trim() || "把这一组成熟永久笔记保留为后续写作入口。";
  const summary = window.prompt("主题索引说明", summarySeed);
  if (summary === null) return null;
  const notes = basketNoteIds.map((id) => writingNoteById(id)).filter(Boolean);
  const card = await createIndexCard({
    directoryId: writingThemeIndexScopeDirectoryId(),
    indexType: "topic",
    title: cleanTitle,
    summary: String(summary || "").trim(),
    noteIds: basketNoteIds,
    items: basketNoteIds.map((noteId, index) => ({
      noteId,
      shortLabel: notes[index]?.title || "",
      rationale: ""
    }))
  });
  setWritingSourceIndexIds([card.id]);
  await loadWritingThemeIndexes();
  renderWritingPanel();
  return card;
}

async function createWritingProjectFromImportedPermanentNotes() {
  const noteIds = createdNoteIdsByTypeFromImportPayload(importState.lastResultPayload || {}, "permanent");
  if (!noteIds.length) {
    setStatus("当前导入结果里没有可创建写作项目的 PermanentNote", "warn");
    return false;
  }
  await ensureNotesLoaded(noteIds);
  clearWritingSourceIndexIds();
  setWritingBasketIds(noteIds);
  const titleInput = $("writingTitle");
  if (titleInput && !String(titleInput.value || "").trim()) {
    titleInput.value = suggestedWritingProjectTitle(noteIds);
  }
  const title = String(titleInput?.value || "").trim() || suggestedWritingProjectTitle(noteIds);
  try {
    const project = await createWritingProject({
      title,
      goal: String($("writingGoal")?.value || "").trim(),
      audience: String($("writingAudience")?.value || "").trim(),
      tone: String($("writingTone")?.value || "").trim(),
      basketNoteIds: noteIds
    });
    writingState.project = project;
    writingState.scaffold = null;
    writingState.scaffoldMarkdown = "";
    writingState.scaffoldVersions = [];
    writingState.draftVersions = [];
    populateWritingFormFromProject(project);
    showWritingResult({
      stage: "writing_project",
      writingProjectId: project?.id,
      title: project?.title,
      basketNoteIds: project?.basket_note_ids,
      basketNotes: project?.basket_notes
    });
    await openWritingModule({ statusMessage: `已从导入结果创建写作项目：${project?.id}` });
    return true;
  } catch (error) {
    showWritingResult({
      stage: "writing_project_error",
      message: String(error?.message || error),
      code: error?.code || null,
      details: error?.details || null
    });
    setStatus(`从导入结果创建写作项目失败：${String(error?.message || error)}`, "bad");
    return false;
  }
}

async function refreshWritingProjectState() {
  const writingProjectId = String(writingState.project?.id || "").trim();
  if (!writingProjectId) return null;
  try {
    const project = await fetchWritingProject(writingProjectId);
    writingState.project = project;
    renderWritingPanel();
    return project;
  } catch {
    return writingState.project;
  }
}

function activeImportPreviewContext() {
  const directPreview = importState.lastPreview;
  const currentImportRecordId = String($("importRecordId")?.value || importState.importRecordId || "").trim();
  if (directPreview?.importRecordId && directPreview.importRecordId === currentImportRecordId) return directPreview;
  const recordPreview = importState.lastResultPayload?.stage === "record" ? importState.lastResultPayload.importRecord : null;
  if (recordPreview?.status === "preview" && String(recordPreview.importRecordId || "") === currentImportRecordId) {
    return {
      importRecordId: recordPreview.importRecordId,
      candidatePreview: recordPreview.candidatePreview || null,
      originalityGuard: recordPreview.originalityGuard || null
    };
  }
  return directPreview || null;
}

function updateImportConfirmButton() {
  const button = $("btnImportConfirm");
  if (!button) return;
  const preview = activeImportPreviewContext();
  const importRecordId = String($("importRecordId")?.value || importState.importRecordId || "").trim();
  const hasMatchingPreview = Boolean(preview?.candidatePreview && preview.importRecordId === importRecordId);
  const summary = hasMatchingPreview ? selectionSummary(preview.candidatePreview, importRecordId) : { selectedCount: 0, totalCount: 0 };
  const state = importConfirmButtonState({
    hasMatchingPreview,
    selectedCount: summary.selectedCount,
    totalCount: summary.totalCount
  });
  button.disabled = state.disabled;
  button.textContent = state.label;
}

function rerenderImportResult() {
  if (!importState.lastResultPayload) return;
  renderResult($("importResult"), importState.lastResultPayload);
  updateImportConfirmButton();
}

function setImportResultFocus(reason) {
  importState.resultFocusReason = String(reason || "").trim();
  rerenderImportResult();
}

function applyCandidateSelection(action) {
  const preview = activeImportPreviewContext();
  if (!preview?.candidatePreview) return;
  const importRecordId = String(preview.importRecordId || "").trim();
  const items = candidatePreviewItems(preview.candidatePreview);
  const next = new Set();
  if (action === "all") {
    for (const item of items) next.add(String(item.id));
  } else if (action === "confirmable") {
    for (const id of confirmableCandidateIds(preview.candidatePreview, preview.originalityGuard || null)) next.add(id);
  } else if (action === "safe") {
    for (const id of safeCandidateIds(preview.candidatePreview)) next.add(id);
  } else if (action === "exclude-risky") {
    const riskyIds = new Set(riskyCandidateIds(preview.candidatePreview));
    for (const item of items) {
      const candidateId = String(item.id);
      if (!riskyIds.has(candidateId)) next.add(candidateId);
    }
  } else if (action === "exclude-warning") {
    const warningIds = new Set(candidateIdsByOriginalityStatus(preview.candidatePreview, "warning"));
    for (const item of items) {
      const candidateId = String(item.id);
      if (!warningIds.has(candidateId)) next.add(candidateId);
    }
  } else if (action === "exclude-blocked") {
    const blockedIds = new Set(candidateIdsByOriginalityStatus(preview.candidatePreview, "blocked"));
    for (const item of items) {
      const candidateId = String(item.id);
      if (!blockedIds.has(candidateId)) next.add(candidateId);
    }
  } else if (action === "permanent") {
    for (const item of items) {
      if (item.candidateGroup === "PermanentNote") next.add(String(item.id));
    }
  }
  importState.selectionImportRecordId = importRecordId;
  importState.selectedCandidateIds = next;
  rerenderImportResult();
}

function setCandidateFilter(filter) {
  const normalized = ["all", "confirmable", "safe", "risky", "excluded", "warning", "blocked"].includes(String(filter || ""))
    ? String(filter)
    : "all";
  importState.previewFilter = normalized;
  rerenderImportResult();
}

async function refreshImportedNotesView() {
  try {
    await syncDirectoriesFromApi();
    await syncNotesForDirectory(state.selectedFolderId);
    renderAll();
  } catch {}
}

function mapDirectoryItem(item) {
  return {
    id: item.id,
    name: item.title,
    parentId: item.parentDirectoryId,
    isDefault: Boolean(item.isDefault),
    hidden: Boolean(item.isHidden),
    maxCards: Number(item.maxNotes || 500),
    fsPath: item.fsPath || ""
  };
}

function mapNoteItem(item) {
  const body = item.body || `# ${item.title || "未命名笔记"}\n`;
  return {
    id: item.id,
    title: item.title || "未命名笔记",
    folderId: item.directoryId,
    noteType: item.noteType || "original",
    status: item.status || "draft",
    markdownPath: item.markdownPath || "",
    body,
    originalityStatus: item.originalityStatus || item.originality_status || "",
    originalitySimilarity: normalizeOptionalNumber(item.originalitySimilarity ?? item.originality_similarity),
    authorship: normalizeAuthorshipItem(item.authorship),
    thesis: item.thesis || "",
    threeLineSummary: Array.isArray(item.threeLineSummary || item.three_line_summary)
      ? item.threeLineSummary || item.three_line_summary
      : [],
    distillationStatus: item.distillationStatus || item.distillation_status || "",
    thinkingStatus: normalizeThinkingStatusItem(item.thinkingStatus),
    generatedOriginalNoteId:
      String(item.generatedOriginalNoteId || item.generated_original_note_id || generatedOriginalNoteIdFromBody(body)).trim(),
    boundaryOrCounterpoint: item.boundaryOrCounterpoint || item.boundary_or_counterpoint || "",
    tags: [],
    links: [],
    bodyLoaded: Boolean(item.body),
    updatedAt: item.updatedAt || new Date().toISOString(),
    isLocalOnly: Boolean(item.isLocalOnly)
  };
}

function isLocalOnlyNote(note) {
  return Boolean(note?.isLocalOnly);
}

function createLocalDraftNote({ folderId, body }) {
  const nextBody = ensureEditableNoteBody(body);
  return {
    id: uid("local_note"),
    title: "未命名笔记",
    folderId,
    noteType: typeFromFolder(state, folderId),
    status: "draft",
    markdownPath: "",
    body: nextBody,
    originalityStatus: "",
    originalitySimilarity: null,
    authorship: null,
    thesis: "",
    threeLineSummary: [],
    distillationStatus: "",
    thinkingStatus: null,
    generatedOriginalNoteId: generatedOriginalNoteIdFromBody(nextBody),
    boundaryOrCounterpoint: "",
    tags: [],
    links: [],
    bodyLoaded: true,
    updatedAt: new Date().toISOString(),
    isLocalOnly: true
  };
}

const UNTITLED_NOTE_TITLE = "未命名笔记";
const STARTUP_NOTE_FOLDER_ID = "dir_original_default";

function isUntitledTitle(title = "") {
  return String(title || "").trim() === UNTITLED_NOTE_TITLE;
}

function isEmptyUntitledMarkdown(body = "") {
  const text = String(body || "").replace(/\r\n/g, "\n").trim();
  if (!text) return true;
  return !text.replace(/^#{1,6}\s*未命名笔记\s*/u, "").trim();
}

function noteTabFor(noteId = "") {
  return state.tabs.find((item) => item.noteId === noteId) || null;
}

function isUntitledPlaceholderNote(note) {
  if (!note) return false;
  const tab = noteTabFor(note.id);
  if (tab?.dirty) return false;
  if (!tab && !note.bodyLoaded && !isLocalOnlyNote(note)) return false;
  const title = tab?.title || note.title;
  const body = typeof tab?.body === "string" ? tab.body : note.body;
  return isUntitledTitle(title) && isEmptyUntitledMarkdown(body);
}

async function ensureNoteLoadedForPlaceholderCheck(note) {
  if (!note || note.bodyLoaded || isLocalOnlyNote(note)) return note;
  try {
    const full = await fetchNote(note.id);
    if (!full) return note;
    Object.assign(note, mapNoteItem(full), { bodyLoaded: typeof full.body === "string" });
  } catch {}
  return note;
}

async function cleanupDuplicateUntitledPlaceholders(folderId) {
  const candidates = state.notes.filter((item) => item.folderId === folderId && isUntitledTitle(item.title));
  for (const note of candidates) {
    await ensureNoteLoadedForPlaceholderCheck(note);
  }
  const placeholders = candidates.filter(isUntitledPlaceholderNote);
  if (placeholders.length <= 1) {
    return { kept: placeholders[0] || null, removed: 0 };
  }

  const [kept, ...duplicates] = placeholders;
  const duplicateIds = new Set(duplicates.map((item) => item.id));
  for (const note of duplicates) {
    if (isLocalOnlyNote(note)) continue;
    try {
      await deleteNote(note.id);
    } catch {}
  }
  state.notes = state.notes.filter((item) => !duplicateIds.has(item.id));
  state.tabs = state.tabs.filter((item) => !duplicateIds.has(item.noteId));
  if (state.activeTabId && !state.tabs.some((item) => item.id === state.activeTabId)) {
    state.activeTabId = state.tabs[0]?.id || null;
  }
  if (duplicateIds.has(state.selectedFileId)) {
    state.selectedFileId = kept?.id || null;
  }
  return { kept, removed: duplicateIds.size };
}

function replaceLocalNoteIdentity(previousNoteId, savedItem) {
  const note = state.notes.find((item) => item.id === previousNoteId);
  if (!note) return null;
  const mapped = mapNoteItem(savedItem);
  Object.assign(note, mapped, { bodyLoaded: true, isLocalOnly: false });

  const previousTabId = `tab_${previousNoteId}`;
  const tab = state.tabs.find((item) => item.noteId === previousNoteId);
  if (tab) {
    tab.noteId = note.id;
    tab.id = `tab_${note.id}`;
  }
  if (state.activeTabId === previousTabId && tab) {
    state.activeTabId = tab.id;
  }
  if (state.selectedFileId === previousNoteId) {
    state.selectedFileId = note.id;
  }
  if (Array.isArray(state.literatureQueueFocusNoteIds) && state.literatureQueueFocusNoteIds.length) {
    state.literatureQueueFocusNoteIds = state.literatureQueueFocusNoteIds.map((item) =>
      item === previousNoteId ? note.id : item
    );
  }
  const basketIds = parseWritingBasketIds();
  if (basketIds.includes(previousNoteId)) {
    setWritingBasketIds(basketIds.map((item) => (item === previousNoteId ? note.id : item)));
  }
  return note;
}

function upsertNotesForDirectory(folderId, mappedNotes) {
  const keep = state.notes.filter((n) => n.folderId !== folderId);
  const localOnly = state.notes.filter((n) => n.folderId === folderId && isLocalOnlyNote(n));
  state.notes = [...localOnly, ...mappedNotes, ...keep];
}

function upsertGraphNodeSummaries(nodes = []) {
  const mapped = nodes.map(mapNoteItem);
  const byId = new Map(state.notes.map((note) => [note.id, note]));
  for (const node of mapped) {
    const existing = byId.get(node.id);
    if (existing?.bodyLoaded) {
      Object.assign(existing, {
        title: node.title,
        folderId: node.folderId,
        noteType: node.noteType,
        status: node.status,
        markdownPath: node.markdownPath,
        updatedAt: node.updatedAt
      });
    } else {
      byId.set(node.id, { ...(existing || {}), ...node });
    }
  }
  state.notes = Array.from(byId.values());
}

function replaceFirstMarkdownTitle(body, title) {
  const cleanTitle = String(title || "未命名笔记").trim() || "未命名笔记";
  const lines = String(body || "").replace(/\r\n/g, "\n").split("\n");
  if (!lines.length || !String(lines[0] || "").trim()) return `# ${cleanTitle}\n`;
  if (/^#{1,6}\s+/.test(lines[0])) {
    lines[0] = `# ${cleanTitle}`;
    return lines.join("\n");
  }
  lines[0] = `# ${cleanTitle}`;
  return lines.join("\n");
}

function titleFromSeedText(text, fallback = "未命名笔记") {
  const clean = String(text || "")
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)[0] || "";
  const singleLine = clean.replace(/^#+\s*/, "").replace(/\s+/g, " ").trim();
  return (singleLine || String(fallback || "").trim() || "未命名笔记").slice(0, 48);
}

function citationSummaryLines(citation = {}) {
  const fields = citation && typeof citation === "object" ? citation : {};
  const lines = [
    fields.sourceTitle ? `- 文献标题：${fields.sourceTitle}` : "",
    fields.authors ? `- 作者：${fields.authors}` : "",
    fields.year ? `- 年份：${fields.year}` : "",
    fields.container ? `- 容器：${fields.container}` : "",
    fields.publisher ? `- 出版社 / 来源：${fields.publisher}` : "",
    fields.locator ? `- 页码 / 定位：${fields.locator}` : "",
    fields.identifier ? `- DOI / ISBN / arXiv / URL / PDF：${fields.identifier}` : ""
  ].filter(Boolean);
  return lines.length ? lines : ["- 引用信息：尚未补齐"];
}

function originalDraftBodyFromSource(payload = {}) {
  const sourceType = String(payload.sourceType || "").trim().toLowerCase();
  if (sourceType === "literature") {
    const parsed = parseLiteratureWorkspace(payload.sourceBody || payload.body || "");
    const sourceTitle = String(payload.sourceTitle || "").trim() || "未命名文献笔记";
    const claim = String(payload.paraphrase || parsed.paraphrase || "").trim();
    const whyKeep = String(payload.whyKeep || parsed.whyKeep || "").trim();
    const supportsJudgment = String(payload.supportsJudgment || parsed.supportsJudgment || "").trim();
    const question = String(payload.question || parsed.question || "").trim();
    const boundary = String(payload.boundary || parsed.boundary || "").trim();
    const originalText = String(payload.originalText || parsed.originalText || "").trim();
    const citation = payload.citation && typeof payload.citation === "object" ? payload.citation : parsed.citation;
    const titleSeed =
      sourceTitle === "未命名文献笔记"
        ? titleFromSeedText(citation?.sourceTitle || supportsJudgment || question || claim || originalText, "未命名永久笔记")
        : sourceTitle;
    return [
      `# ${titleSeed}`,
      "",
      "## 核心观点",
      "",
      supportsJudgment
        ? "从来源文献里的判断种子继续改写成一句你自己的原创判断，不要直接复述摘录或文献笔记原句。"
        : "把这条文献转述继续改写成一句你自己的原创判断，不要直接复述摘录或文献笔记原句。",
      "",
      "## 为什么成立",
      "",
      question
        ? "先回答来源文献里留下的追问，再说明这条判断为什么成立，以及它依赖哪些证据或观察。"
        : "用你自己的理由说明这条判断为什么成立，以及它依赖哪些证据或观察。",
      "",
      "## 边界 / 反例",
      "",
      boundary ? "把来源文献里的边界或反例改写成这条判断的适用条件，不要只复制原句。" : "",
      "## 证据来源",
      "",
      `- 来自文献笔记：[[${sourceTitle}]]`,
      payload.sourceNoteId ? `- 来源笔记 ID：${payload.sourceNoteId}` : "",
      ...citationSummaryLines(citation),
      claim ? "- 已有用户转述：见来源文献笔记，不在永久笔记草稿中直接复制。" : "",
      whyKeep || supportsJudgment || question || boundary || originalText ? "- 证据、判断种子、追问、边界与原文摘录请回到来源文献笔记核对。" : "",
      ""
    ]
      .filter((line, index, list) => line !== "" || (index > 0 && list[index - 1] !== ""))
      .join("\n");
  }
  const sourceTitle = String(payload.sourceTitle || "").trim() || "未命名随笔笔记";
  const sourceBody = stripGeneratedOriginalMarker(String(payload.sourceBody || payload.body || "").trim());
  const excerpt = sourceBody
    .replace(/^#\s+[^\n]*\n?/m, "")
    .trim();
  const titleSeed = titleFromSeedText(excerpt || sourceTitle, sourceTitle === "未命名随笔笔记" ? "未命名永久笔记" : sourceTitle);
  return [
    `# ${titleSeed}`,
    "",
    "## 核心观点",
    "",
    "把这条随笔里已经开始成形的判断，改写成一句更清楚、可复用的原创观点。",
    "",
    "## 为什么成立",
    "",
    "补上这条判断为什么值得成立、依赖了哪些观察或经验。",
    "",
    "## 边界 / 反例",
    "",
    "写出它在哪些条件下不成立，或还有哪些地方需要继续验证。",
    "",
    "## 来源线索",
    "",
    `- 来自随笔笔记：[[${sourceTitle}]]`,
    payload.sourceNoteId ? `- 来源笔记 ID：${payload.sourceNoteId}` : "",
    excerpt ? `- 原始线索摘录：${excerpt}` : "",
    ""
  ]
    .filter((line, index, list) => line !== "" || (index > 0 && list[index - 1] !== ""))
    .join("\n");
}

async function syncDirectoriesFromApi() {
  const items = await fetchDirectories(true);
  if (!items.length) return;
  state.folders = items.map(mapDirectoryItem);
  const selectedExists = state.folders.some((f) => f.id === state.selectedFolderId);
  if (!selectedExists) {
    state.selectedFolderId = state.browserRootId;
  }
}

async function syncNotesForDirectory(folderId) {
  if (!folderId) return;
  const items = await fetchDirectoryNotes(folderId);
  const mapped = items.map(mapNoteItem);
  upsertNotesForDirectory(folderId, mapped);
}

async function syncLoadedNotesForDirectories(directoryIds = []) {
  const ids = [...new Set(directoryIds.map((item) => String(item || "").trim()).filter(Boolean))];
  for (const directoryId of ids) {
    if (!state.notes.some((note) => note.folderId === directoryId)) continue;
    await syncNotesForDirectory(directoryId);
  }
}

function descendantDirectoryIds(directoryId) {
  const result = [];
  const queue = [directoryId];
  const seen = new Set();
  while (queue.length) {
    const currentId = queue.shift();
    if (!currentId || seen.has(currentId)) continue;
    seen.add(currentId);
    result.push(currentId);
    for (const folder of state.folders) {
      if (folder.parentId === currentId) queue.push(folder.id);
    }
  }
  return result;
}

function renamedDirectoryFsPath(folder, nextTitle) {
  if (!folder?.fsPath) return "";
  return joinLocalPath(dirnameLocalPath(folder.fsPath), nextTitle);
}

function movedDirectoryFsPath(folder, targetParentFolder) {
  if (!folder?.fsPath || !targetParentFolder?.fsPath) return "";
  const baseName = basenameLocalPath(folder.fsPath) || folder.name || "folder";
  return joinLocalPath(targetParentFolder.fsPath, baseName);
}

function ensureSelection() {
  const visible = state.folders.filter((f) => !f.hidden);
  const scoped = visible.filter((f) => rootBoxIdFromFolder(state, f.id) === state.browserRootId);
  const source = scoped.length ? scoped : visible;
  if (!folderById(state, state.selectedFolderId) || folderById(state, state.selectedFolderId)?.hidden) {
    state.selectedFolderId = source[0]?.id || state.browserRootId;
  }
  createBoxDialog.setOptions(source);
}

function notesUnderRoot(rootId = "") {
  const ids = new Set(descendantDirectoryIds(rootId));
  return state.notes.filter((note) => ids.has(note.folderId));
}

function noteHasNetworkSignal(note = null) {
  const bodyLinks = parseLinks(note?.body || "");
  const bodyTags = parseTags(note?.body || "");
  return bodyLinks.length > 0 || bodyTags.length > 0;
}

function renderExplorerSidebarFlow(rootId = state.browserRootId) {
  const el = $("sidebarFlow");
  if (!el) return;
  const isOriginal = rootId === "dir_original_default";
  const isFleeting = rootId === "dir_fleeting_default";
  const isLiterature = rootId === "dir_literature_default";
  const currentNotes = notesUnderRoot(rootId);
  const originalNotes = notesUnderRoot("dir_original_default");
  const linkedOriginalCount = originalNotes.filter(noteHasNetworkSignal).length;
  const generatedMaterialCount = currentNotes.filter(noteHasGeneratedOriginal).length;
  const pendingMaterialCount = Math.max(0, currentNotes.length - generatedMaterialCount);
  const title = isOriginal
    ? "永久笔记是默认主路"
    : isLiterature
      ? "文献是证据入口"
      : isFleeting
        ? "随笔是线索入口"
        : "当前目录接入主路";
  const note = isOriginal
    ? "新建、搜索和写作都优先围绕自己的判断展开；素材入口只负责把材料送到这里。"
    : isLiterature
      ? "先写转述，再记录永久笔记。来源字段保留追溯能力，但不让资料管理盖过判断形成。"
      : isFleeting
        ? "先捕捉还不成熟的问题和线索，等它出现判断，再单独沉淀为永久笔记。"
        : "这一级目录会被放回永久笔记、关系网络、主题索引和写作准备的路径里理解。";
  const steps = isOriginal
    ? [
        ["永久笔记", true],
        ["关系网络", linkedOriginalCount > 0],
        ["主题索引", false],
        ["写作准备", false]
      ]
    : [
        ["素材入口", true],
        ["记录永久笔记", generatedMaterialCount > 0],
        ["关系网络", linkedOriginalCount > 0],
        ["写作准备", false]
      ];
  const metrics = isOriginal
    ? [
        [originalNotes.length, "永久笔记"],
        [linkedOriginalCount, "已接入网络"],
        [originalNotes.filter((note) => String(note.status || "").trim() === "active").length, "已确认"]
      ]
    : [
        [currentNotes.length, "素材条目"],
        [generatedMaterialCount, "已生成永久笔记"],
        [pendingMaterialCount, "待处理"]
      ];

  el.classList.remove("hidden");
  el.innerHTML = `
    <div class="sidebar-flow-card">
      <div>
        <div class="sidebar-flow-kicker">${isOriginal ? "Main Route" : "Material Route"}</div>
        <div class="sidebar-flow-title">${escapeHtml(title)}</div>
        <div class="sidebar-flow-note">${escapeHtml(note)}</div>
      </div>
      <div class="sidebar-flow-steps" aria-label="当前工作路径">
        ${steps.map(([label, active]) => `<div class="sidebar-flow-step ${active ? "is-active" : ""}">${escapeHtml(label)}</div>`).join("")}
      </div>
      <div class="sidebar-flow-metrics">
        ${metrics
          .map(
            ([value, label]) => `
              <div class="sidebar-flow-metric">
                <strong>${Number(value) || 0}</strong>
                <span>${escapeHtml(label)}</span>
              </div>
            `
          )
          .join("")}
      </div>
    </div>
  `;
}

function newNoteLabelForRoot(rootId = state.browserRootId) {
  if (rootId === "dir_literature_default") return "新建文摘笔记";
  if (rootId === "dir_fleeting_default") return "新建随笔";
  return "新建永久笔记";
}

function newNoteShortLabelForRoot(rootId = state.browserRootId) {
  if (rootId === "dir_literature_default") return "文摘";
  if (rootId === "dir_fleeting_default") return "随笔";
  return "永久";
}

function syncNewNoteButtons() {
  const label = newNoteLabelForRoot();
  const shortLabel = newNoteShortLabelForRoot();
  const sidebarNew = $("btnNewNote");
  const mobileNew = $("btnMobileNewNote");
  for (const button of [sidebarNew, mobileNew].filter(Boolean)) {
    button.title = label;
    button.setAttribute("aria-label", label);
    button.dataset.tip = label;
  }
  const mobileLabel = mobileNew?.querySelector("span");
  if (mobileLabel) mobileLabel.textContent = shortLabel;
}

function renderSidebarTitle() {
  const root = folderById(state, state.browserRootId);
  const editorMode = state.module === "explorer";
  const sidebarPrimaryActions = $("sidebarPrimaryActions");
  const filter = $("searchBar");
  const moduleSidebar = $("moduleSidebar");
  const sidebarFlow = $("sidebarFlow");
  const listArea = $("listArea");
  const searchToggle = $("btnToggleSearch");
  const sidebarSubtitle = $("sidebarSubtitle");
  const sidebarFoot = $("sidebarFoot");

  if (editorMode) {
    $("sidebarTitle").textContent = root ? displayFolderName(root) : "目录";
    if (sidebarSubtitle) {
      sidebarSubtitle.textContent = "";
      sidebarSubtitle.classList.add("hidden");
    }
    const quickAction =
      state.browserRootId === "dir_fleeting_default"
        ? "quick-fleeting"
        : state.browserRootId === "dir_literature_default"
          ? "quick-literature"
          : "quick-original";
    document.querySelectorAll(".quick-entry").forEach((entry) => entry.classList.toggle("current-root", entry.dataset.action === quickAction));
    syncNewNoteButtons();
    $("explorerActions").classList.add("hidden");
    $("explorerActions").innerHTML = "";
    sidebarPrimaryActions?.classList.remove("hidden");
    const showSearch = Boolean(state.searchVisible || String(state.searchQuery || "").trim());
    filter?.classList.toggle("hidden", !showSearch);
    searchToggle?.classList.toggle("is-ghost", !showSearch);
    sidebarFlow?.classList.add("hidden");
    if (sidebarFlow) sidebarFlow.innerHTML = "";
    listArea?.classList.remove("hidden");
    moduleSidebar?.classList.remove("visible");
    if (moduleSidebar) moduleSidebar.innerHTML = "";
    if (sidebarFoot) {
      sidebarFoot.textContent = "";
      sidebarFoot.classList.add("hidden");
    }
    return;
  }

  const moduleUi = currentModuleUi();
  $("sidebarTitle").textContent = moduleUi.sidebarTitle;
  if (sidebarSubtitle) {
    sidebarSubtitle.classList.remove("hidden");
    sidebarSubtitle.textContent = moduleUi.sidebarSubtitle || "当前功能页。";
  }
  $("explorerActions").classList.add("hidden");
  $("explorerActions").innerHTML = "";
  sidebarPrimaryActions?.classList.add("hidden");
  filter?.classList.add("hidden");
  sidebarFlow?.classList.add("hidden");
  if (sidebarFlow) sidebarFlow.innerHTML = "";
  listArea?.classList.add("hidden");
  moduleSidebar?.classList.add("visible");
  if (moduleSidebar) moduleSidebar.innerHTML = moduleUi.sidebarHtml;
  if (sidebarFoot) {
    sidebarFoot.classList.remove("hidden");
    sidebarFoot.textContent = moduleUi.sidebarFoot;
  }
}

function currentModuleUi() {
  const root = folderById(state, state.browserRootId);
  const rootName = root?.name || "当前目录";
  const configs = {
    imports: {
      sidebarTitle: "导入中心",
      sidebarSubtitle: "先预览，再确认写入。",
      sidebarFoot: "导入是独立流程：选择来源、预览候选、确认写入，再按需回滚。",
      title: "导入与导出",
      summary: "\u628a\u5916\u90e8 Markdown\u3001Obsidian\u3001Zotero\u3001Readwise \u7b49\u5185\u5bb9\u5e26\u5165\u7814\u601d\u5f55\u65f6\uff0c\u8fd9\u91cc\u53ea\u670d\u52a1\u5bfc\u5165\u4e0e\u521d\u7b5b\uff0c\u4e0d\u628a\u8d44\u6599\u5165\u5e93\u91cf\u5305\u88c5\u6210\u8fdb\u5c55\u3002\u771f\u6b63\u7684\u8fdb\u5c55\u53d1\u751f\u5728\u540e\u7eed\u8f6c\u8ff0\u3001\u63d0\u70bc\u4e0e\u5199\u4f5c\u3002",
      sidebarHtml: `
        <div class="module-sidebar-card">
          <h3>当前目标</h3>
          <p>\u628a\u5916\u90e8\u8d44\u6599\u5b89\u5168\u5bfc\u5165\u5230 <strong>${escapeHtml(rootName)}</strong> \u4f53\u7cfb\u91cc\uff0c\u5148\u9884\u89c8\uff0c\u518d\u786e\u8ba4\uff0c\u5e76\u9001\u5165\u5f85\u8f6c\u8ff0\u6216\u5f85\u63d0\u70bc\u6d41\u7a0b\uff0c\u4e0d\u76f4\u63a5\u7834\u574f\u73b0\u6709\u7b14\u8bb0\u3002</p>
        </div>
        <div class="module-sidebar-card">
          <h3>推荐顺序</h3>
          <ol class="module-sidebar-list">
            <li>先选来源与路径</li>
            <li>先看候选预览，再决定是否写入</li>
            <li>\u5bfc\u5165\u540e\u8fdb\u5165\u5f85\u8f6c\u8ff0\u961f\u5217\uff0c\u518d\u7ee7\u7eed\u52a0\u5de5\u4e3a\u4e66\u6458\u6216\u539f\u521b\u7b14\u8bb0</li>
          </ol>
        </div>
      `
    },
    aiInbox: {
      sidebarTitle: "AI 建议待办",
      sidebarSubtitle: "AI 只给建议，是否落地由你确认。",
      sidebarFoot: "AI 建议默认不会改动笔记。只有你点击采纳、建立关系或生成草稿后，才会进入笔记系统。",
      title: "AI 建议待办",
      summary: "这里集中处理 AI 发现的关联、问题、冲突和写作线索。先看来源和理由，再决定采纳、忽略、归档，避免 AI 自动污染笔记。",
      sidebarHtml: `
        <div class="module-sidebar-card">
          <h3>它用来做什么</h3>
          <p>把 AI 的输出拦在“待确认”层：有价值的关系可以进入图谱，有价值的问题可以生成草稿，没用的建议直接忽略。</p>
        </div>
        <div class="module-sidebar-card">
          <h3>处理顺序</h3>
          <ol class="module-sidebar-list">
            <li>先看待判断建议</li>
            <li>核对来源笔记和关联理由</li>
            <li>确认后再建立关系或生成草稿</li>
          </ol>
        </div>
      `
    },
    graph: {
      sidebarTitle: "永久笔记关系图谱",
      sidebarSubtitle: "看永久笔记之间的观点结构。",
      sidebarFoot: "图谱固定展示永久笔记盒及其子目录，不需要导入案例或切换范围。",
      title: "永久笔记关系图谱",
      summary: "把所有永久笔记当作节点，把“支持、反驳、限定、桥接”等关系当作边，快速看出中心观点、孤立观点、冲突和缺失连接。",
      sidebarHtml: `
        <div class="module-sidebar-card">
          <h3>它用来做什么</h3>
          <p>检查 <strong>永久笔记盒</strong> 里的观点是否已经形成结构：哪些观点在支撑主题，哪里有反方，哪里还缺过渡。</p>
        </div>
        <div class="module-sidebar-card">
          <h3>读图顺序</h3>
          <ul class="module-sidebar-list">
            <li>先看概览，确认节点和关系数量</li>
            <li>再看支持、反驳、限定、桥接</li>
            <li>最后点回笔记补理由、证据或边界</li>
          </ul>
        </div>
      `
    },
    writing: {
      sidebarTitle: "写作中心",
      sidebarSubtitle: "从成熟笔记进入写作准备。",
      sidebarFoot: "写作中心应从成熟笔记出发，不替代笔记编辑器。",
      title: "写作中心",
      summary: "这里不是囤积观点卡的地方，而是把已经成熟的永久笔记组织成可写主题、写作项目和脚手架的地方。页面应围绕写作准备展开，也要逼你处理反方、边界和概念错位，而不只是堆叠相近观点。",
      sidebarHtml: `
        <div class="module-sidebar-card">
          <h3>写作原则</h3>
          <p>先判断哪些主题已经值得写，再挑选支撑该主题的永久笔记进入写作篮。这里帮助组织结构，也会提醒你补反方、边界和漏洞，但不直接代替你完成最终写作。</p>
        </div>
        <div class="module-sidebar-card">
          <h3>建议路径</h3>
          <ol class="module-sidebar-list">
            <li>先确认一个可推进的主题</li>
            <li>把相关永久笔记加入写作篮</li>
            <li>生成并迭代 scaffold，优先处理冲突与缺口</li>
          </ol>
        </div>
      `
    },
    settings: {
      sidebarTitle: "设置",
      sidebarSubtitle: "系统配置不应打断写作流程。",
      sidebarFoot: "设置页只处理系统与卡片盒配置，不打断正在写的笔记流程。",
      title: "设置",
      summary: "这里处理 Vault 路径、初始化状态和桌面文件能力。它应该像应用设置页，而不是混进笔记编辑视图。",
      sidebarHtml: `
        <div class="module-sidebar-card">
          <h3>当前重点</h3>
          <p>切换卡片盒根目录、检查当前 Vault 状态，并确保本地 Markdown 依然是主内容源。</p>
        </div>
        <div class="module-sidebar-card">
          <h3>注意事项</h3>
          <ul class="module-sidebar-list">
            <li>切换 Vault 会关闭当前标签页</li>
            <li>缓存可以重建，Markdown 主内容不能丢</li>
          </ul>
        </div>
      `
    }
  };
  return configs[state.module] || {
    sidebarTitle: "功能页",
    sidebarSubtitle: "当前功能页。",
    sidebarFoot: "当前功能页。",
    title: "功能页",
    summary: "当前模块说明。",
    sidebarHtml: ""
  };
}

function renderModuleWorkspaceHeader() {
  // module header actions are rendered dynamically
  const moduleTitle = $("moduleTitle");
  const moduleSummary = $("moduleSummary");
  const moduleHeaderActions = $("moduleHeaderActions");
  if (!moduleTitle || !moduleSummary || !moduleHeaderActions) return;
  if (state.module === "explorer") {
    moduleHeaderActions.innerHTML = "";
    return;
  }
  const moduleUi = currentModuleUi();
  moduleTitle.textContent = moduleUi.title;
  moduleSummary.textContent = moduleUi.summary;
  const settingsPackSelect = $("settingsAiModelPack");
  const packOptionsHtml = settingsPackSelect
    ? [...settingsPackSelect.querySelectorAll("option")]
        .map((option) => `<option value="${escapeHtml(option.value)}">${escapeHtml(option.textContent || option.value)}</option>`)
        .join("")
    : `
      <option value="Starter Auto">Starter Auto</option>
      <option value="Privacy First">Privacy First</option>
      <option value="Ollama Local">Ollama Local</option>
    `;

  const preview = settingsState.ai.routePreview;
  const providerId = String(preview?.provider?.providerId || currentAiProviderId() || "").trim();
  const modelRef = String(preview?.route?.modelRef || "").trim();
  const localOnly = Boolean(preview?.route?.localOnly);
  const healthStatus = String(preview?.health?.status || "").trim();
  const statusTone = healthStatus === "healthy" ? "ok" : healthStatus ? "warn" : "";
  const statusLabel = localOnly ? "Local" : "Cloud";
  const statusDetail = providerId
    ? `${providerId}${modelRef ? ` / ${modelRef}` : ""}`
    : modelRef
      ? modelRef
      : "AI route unavailable";
  moduleHeaderActions.innerHTML = `
    <button class="mini-btn" id="moduleBackToNotes">回到笔记</button>
    <span class="settings-stat-badge ${localOnly ? "ok" : ""}">${escapeHtml(statusLabel)}</span>
    <span class="settings-stat-badge ${statusTone}">${escapeHtml(healthStatus || "unknown")}</span>
    <span class="settings-stat-badge">${escapeHtml(statusDetail)}</span>
    <span class="module-ai-pack">
      <strong>AI</strong>
      <select id="moduleAiModelPack" aria-label="AI model pack">
        ${packOptionsHtml}
      </select>
    </span>
    <button class="mini-btn" id="moduleAiRefreshRoute" type="button">Refresh</button>
  `;
  $("moduleBackToNotes")?.addEventListener("click", () => activateModule("explorer"));

  const modulePack = $("moduleAiModelPack");
  if (modulePack) {
    const stored = String(settingsState.ai.modelPack || "Starter Auto").trim() || "Starter Auto";
    if (modulePack.value !== stored) modulePack.value = stored;
    modulePack.addEventListener("change", (event) => {
      const next = String(event?.target?.value || "Starter Auto").trim() || "Starter Auto";
      applyAiModelPackChange(next, { source: "module" });
    });
  }

  $("moduleAiRefreshRoute")?.addEventListener("click", async () => {
    await refreshAiRoutePreview({ render: false });
    renderModuleWorkspaceHeader();
    renderSettingsPanel();
    setStatus("AI route refreshed", "ok");
  });
}

function moduleLabel(moduleName = "") {
  const labels = {
    explorer: "笔记编辑",
    imports: "导入导出",
    aiInbox: "AI 建议",
    graph: "关系图谱",
    writing: "写作中心",
    settings: "设置"
  };
  return labels[String(moduleName || "").trim()] || "工作台";
}

function noteTypeLabel(noteType = "") {
  const labels = {
    fleeting: "随笔记",
    literature: "文献笔记",
    original: "永久笔记",
    permanent: "永久笔记"
  };
  return labels[String(noteType || "").trim().toLowerCase()] || "笔记";
}

function displayFolderName(folder) {
  if (!folder) return "目录";
  if (folder.id === "dir_original_default") return "永久笔记盒";
  if (folder.id === "dir_fleeting_default") return "随笔卡片盒";
  if (folder.id === "dir_literature_default") return "文献卡片盒";
  if (!folder.parentId && String(folder.name || "").trim() === "永久笔记目录") return "永久笔记盒";
  return folder.name || "目录";
}

function directoryPathLabel(directoryId) {
  const folder = folderById(state, directoryId);
  if (!folder) return "未选择目录";
  const names = [displayFolderName(folder)];
  let cursor = folder;
  while (cursor?.parentId) {
    cursor = folderById(state, cursor.parentId);
    if (cursor) names.unshift(displayFolderName(cursor));
  }
  return names.join(" / ");
}

function activeEditorNote() {
  const activeTab = state.tabs.find((tab) => tab.id === state.activeTabId);
  if (!activeTab) return null;
  return state.notes.find((note) => note.id === activeTab.noteId) || null;
}

function activeEditorBody() {
  const activeTab = state.tabs.find((tab) => tab.id === state.activeTabId);
  return String(activeTab?.body || activeEditorNote()?.body || "");
}

function noteMatchesSearchQuery(note = null, query = "") {
  const normalized = String(query || "").trim().toLowerCase();
  if (!normalized) return true;
  const target = `${note?.title || ""}\n${note?.body || ""}\n${(note?.tags || []).join(" ")}`.toLowerCase();
  return target.includes(normalized);
}

function syncExplorerContextToNote(note = null) {
  if (!note?.id) return false;
  const folder = folderById(state, note.folderId);
  if (!folder) return false;
  state.selectedFileId = note.id;
  state.selectedFolderId = folder.id;
  state.browserRootId = rootBoxIdFromFolder(state, folder.id);
  if (!noteMatchesSearchQuery(note, state.searchQuery)) {
    state.searchQuery = "";
    const searchInput = $("searchInput");
    if (searchInput) searchInput.value = "";
  }
  explorer.expandFolderPath(folder.id);
  return true;
}

function syncExplorerContextToActiveTab() {
  const activeTab = state.tabs.find((tab) => tab.id === state.activeTabId);
  if (!activeTab?.noteId) return false;
  const note = state.notes.find((item) => item.id === activeTab.noteId) || null;
  return syncExplorerContextToNote(note);
}

function noteGrowthStage(note, body = "") {
  const noteType = String(note?.noteType || typeFromFolder(state, note?.folderId || "")).toLowerCase();
  const text = String(body || note?.body || "");
  const tagCount = parseTags(text).length;
  const linkCount = parseLinks(text).length;
  const bodyLength = text.replace(/\s+/g, "").length;

  if (noteType === "fleeting") return "捕捉中";
  if (noteType === "literature") return "转述中";
  if (linkCount >= 2 || (linkCount >= 1 && tagCount >= 2)) return "已串联";
  if (bodyLength >= 140 || tagCount >= 2) return "正在成形";
  return "提炼中";
}

function renderStatusMeta() {
  return;
}

function renderWorkspaceStatusHint() {
  const helper = $("editorHelper");
  if (!helper) return;
  if (editorHelperDismissed || editorHelperMuted || state.module !== "explorer") {
    hideEditorHelper();
    return;
  }
  const activeNote = activeEditorNote();
  const activeBody = activeEditorBody();
  const kicker = $("editorHelperKicker");
  const title = $("editorHelperTitle");
  const body = $("editorHelperBody");
  const action = $("btnEditorHelperAction");
  const noteType = String(activeNote?.noteType || "").trim();
  if (!activeNote) {
    if (action) {
      action.dataset.helperAction = "noop";
      action.dataset.targetNoteId = "";
    }
    helper.hidden = false;
    helper.setAttribute("aria-hidden", "false");
    helper.style.pointerEvents = "";
    helper.classList.remove("hidden");
    kicker.textContent = "下一步推荐";
    title.textContent = "先打开一条笔记";
    body.textContent = "从随笔、文献或永久笔记里任选一条开始。后续会根据当前上下文提示相关任务和推荐下一步。";
    action.textContent = "知道了";
    return;
  }
  if (activeNote && !state.focusMode) {
    hideEditorHelper();
    return;
  }
  if (action) {
    action.dataset.helperAction = "noop";
    action.dataset.targetNoteId = "";
  }
  helper.hidden = false;
  helper.setAttribute("aria-hidden", "false");
  helper.style.pointerEvents = "";
  helper.classList.remove("hidden");

  if (state.focusMode) {
    kicker.textContent = "专注模式";
    title.textContent = "现在只保留当前笔记";
    body.textContent = activeNote
      ? `专注模式会收起左侧导航和回链，只留下正文与关键按钮。先把${noteGrowthStage(activeNote, activeBody) === "提炼中" ? "核心判断" : "关键判断与边界"}写清楚，再决定是否补连接与标签。`
      : "专注模式会收起左侧导航和回链，只留下正文与关键按钮。打开一条笔记后再开始提炼。";
    action.textContent = "保持专注";
    return;
  }
  if (noteType === "literature") {
    kicker.textContent = "文献笔记";
    if (noteHasGeneratedOriginal(activeNote)) {
      const targetNoteId = noteGeneratedOriginalNoteId(activeNote);
      title.textContent = "这条文献已经长出永久笔记";
      body.textContent = "你可以继续补文献里的证据与边界，也可以直接跳到那条永久笔记里继续提炼自己的判断。";
      action.textContent = "打开永久笔记";
      if (action) {
        action.dataset.helperAction = "open-generated-original";
        action.dataset.targetNoteId = targetNoteId;
      }
    } else {
      title.textContent = "先把原文转成你的判断";
      body.textContent = "文献笔记现在和其它笔记共用同一个编辑器。等你觉得材料已经能支撑一个明确判断时，再点“记录永久笔记”。";
      action.textContent = "继续整理";
    }
    return;
  }
  if (noteType === "original") {
    kicker.textContent = "永久笔记";
    title.textContent = `当前在${noteGrowthStage(activeNote, activeBody)}`;
    body.textContent = "先把观点写清楚，再决定是否补连接、标签和证据。原创性检测现在会以浮窗方式提醒，不再把确认操作压在编辑器底部。";
    action.textContent = "继续提炼";
    return;
  }
  kicker.textContent = "随笔笔记";
  if (noteHasGeneratedOriginal(activeNote)) {
    const targetNoteId = noteGeneratedOriginalNoteId(activeNote);
    title.textContent = "这条随笔已经沉淀为永久笔记";
    body.textContent = "原始线索还可以继续补，但它已经对应到一条永久笔记。你可以直接跳过去继续完善核心判断。";
    action.textContent = "打开永久笔记";
    if (action) {
      action.dataset.helperAction = "open-generated-original";
      action.dataset.targetNoteId = targetNoteId;
    }
  } else {
    title.textContent = "把这条随笔推进成可复用判断";
    body.textContent = "随笔更适合捕捉线索。等它开始出现明确观点时，再点“记录永久笔记”，把判断单独沉淀出来。";
    action.textContent = "继续记录";
  }
}

function applyFocusModeChrome() {
  const focusActive = state.module === "explorer" && Boolean(state.focusMode);
  document.querySelector(".app")?.setAttribute("data-focus-mode", focusActive ? "true" : "false");
  if (focusActive) editor?.setInspectorVisible?.(false);
  const focusButton = $("btnFocusMode");
  if (focusButton) {
    focusButton.classList.toggle("active", focusActive);
    focusButton.setAttribute("aria-pressed", focusActive ? "true" : "false");
    focusButton.title = focusActive ? "退出专注模式" : "专注模式：收起导航和关联，只保留当前笔记";
    focusButton.dataset.tip = focusActive ? "退出专注模式" : "专注模式：收起导航和关联，只保留当前笔记";
    const label = focusButton.querySelector("span");
    if (label) label.textContent = focusActive ? "退出专注" : "专注模式";
  }
  const intentNote = $("editorIntentNote");
  if (intentNote) {
    intentNote.textContent = focusActive
      ? "你现在处在低干扰视图里，先把核心判断写清楚，再决定是否补连接与标签。"
      : "这里不强调更快完成，而强调更清楚地形成观点、边界与连接。";
  }
}

function renderAll() {
  ensureSelection();
  renderSidebarTitle();
  renderModulePanels();
  renderAiInboxWorkspace();
  renderGraphPanel();
  renderSettingsPanel();
  renderWritingPanel();
  editor.renderTabs();
  applyFocusModeChrome();
  renderStatusMeta();
  renderWorkspaceStatusHint();
  if (state.module === "explorer") {
    explorer.render();
  }
}

function currentVaultPath() {
  return settingsState.vault?.vaultPath || "";
}

function resolveNotePath(note) {
  if (!note) return "";
  if (note.markdownPath && currentVaultPath()) return joinLocalPath(currentVaultPath(), note.markdownPath);
  const folder = folderById(state, note.folderId);
  if (!folder?.fsPath) return "";
  const fileName = `${note.id}.md`;
  return joinLocalPath(folder.fsPath, fileName);
}

function standaloneEditorUrl(noteId = "") {
  const baseUrl = `${window.location.origin}/app/editor`;
  const id = String(noteId || "").trim();
  return id ? `${baseUrl}?note=${encodeURIComponent(id)}` : baseUrl;
}

function openStandaloneEditorWindow(noteId = "") {
  const url = standaloneEditorUrl(noteId);
  window.open(url, "_blank", "noopener,noreferrer");
  return url;
}

function ensureEditableNoteBody(body = "") {
  const value = String(body || "").replace(/\r\n/g, "\n");
  if (!value.trim()) return "# 未命名笔记\n\n";
  return /\n\s*\n\s*$/.test(value) ? value : `${value}\n\n`;
}

function literatureNoteTemplateBody(title = "未命名笔记") {
  return [
    `# ${String(title || "未命名笔记").trim() || "未命名笔记"}`,
    "",
    "## 引用信息",
    "",
    "- 标题：",
    "- 作者：",
    "- 年份：",
    "- 容器：",
    "- 出版社 / 来源：",
    "- 页码 / 定位：",
    "- 版本：",
    "- 译者 / 编者：",
    "- DOI / ISBN / arXiv / URL / PDF：",
    "",
    "## 原文",
    "",
    "",
    "## 转述",
    "",
    "",
    "## 判断种子",
    "",
    "",
    "## 追问",
    "",
    "",
    "## 边界 / 反例",
    "",
    "",
    "## 保留原因",
    "",
    ""
  ].join("\n");
}

function initialBodyForFolder(folderId = "") {
  return typeFromFolder(state, folderId) === "literature" ? literatureNoteTemplateBody() : "# 未命名笔记\n\n";
}

async function createNoteInSelectedFolder(options = {}) {
  const folderId = state.selectedFolderId;
  const preferTitleSelection = options.preferTitleSelection !== false;
  const openInStandalone = options.openInStandalone === true;
  const reuseUntitled = options.reuseUntitled !== false;
  try {
    const cleanup = await cleanupDuplicateUntitledPlaceholders(folderId);
    if (reuseUntitled && cleanup.kept) {
      if (openInStandalone) {
        openStandaloneEditorWindow(cleanup.kept.id);
      } else {
        openNoteById(cleanup.kept.id, { preferTitleSelection });
      }
      return { note: cleanup.kept, remote: !isLocalOnlyNote(cleanup.kept), reused: true, cleanedCount: cleanup.removed };
    }
    const initialBody = initialBodyForFolder(folderId);
    const created = await createNote({
      directoryId: folderId,
      body: initialBody
    });
    if (!created) throw new Error("创建笔记失败");
    const note = mapNoteItem({
      ...created,
      body: ensureEditableNoteBody(typeof created?.body === "string" ? created.body : initialBody)
    });
    state.notes.unshift(note);
    if (openInStandalone) {
      openStandaloneEditorWindow(note.id);
    } else {
      openNoteById(note.id, { preferTitleSelection });
    }
    return { note, remote: true, cleanedCount: cleanup.removed };
  } catch (error) {
    const fallback = {
      id: uid("pn"),
      title: "未命名笔记",
      folderId,
      noteType: typeFromFolder(state, folderId),
      status: "draft",
      body: ensureEditableNoteBody(initialBodyForFolder(folderId)),
      tags: [],
      links: [],
      updatedAt: new Date().toISOString(),
      bodyLoaded: true,
      isLocalOnly: true
    };
    state.notes.unshift(fallback);
    if (openInStandalone) {
      openStandaloneEditorWindow(fallback.id);
    } else {
      openNoteById(fallback.id, { preferTitleSelection });
    }
    return { note: fallback, remote: false, error };
  }
}

async function createPrimaryOriginalNote(options = {}) {
  const previousRootId = state.browserRootId;
  const previousFolderId = state.selectedFolderId;
  const originalRootId = "dir_original_default";
  const currentRootId = rootBoxIdFromFolder(state, state.selectedFolderId);
  const switchedToOriginal = currentRootId !== originalRootId;

  if (folderById(state, originalRootId) && switchedToOriginal) {
    state.browserRootId = originalRootId;
    state.selectedFolderId = originalRootId;
    state.selectedFileId = null;
  } else if (folderById(state, originalRootId) && !folderById(state, state.selectedFolderId)) {
    state.browserRootId = originalRootId;
    state.selectedFolderId = originalRootId;
  }

  try {
    const result = await createNoteInSelectedFolder(options);
    return { ...result, switchedToOriginal, previousRootId, previousFolderId };
  } catch (error) {
    state.browserRootId = previousRootId;
    state.selectedFolderId = previousFolderId;
    throw error;
  }
}

async function openStartupUntitledNote() {
  if (folderById(state, STARTUP_NOTE_FOLDER_ID)) {
    state.browserRootId = rootBoxIdFromFolder(state, STARTUP_NOTE_FOLDER_ID);
    state.selectedFolderId = STARTUP_NOTE_FOLDER_ID;
  }
  const result = await createNoteInSelectedFolder({ preferTitleSelection: true });
  if (result.reused) {
    setStatus(
      result.cleanedCount
        ? `已打开未命名笔记，并清理 ${result.cleanedCount} 条空白占位`
        : "已打开未命名笔记",
      result.cleanedCount ? "warn" : "ok"
    );
  } else if (result.remote) {
    setStatus("已打开新的未命名笔记", "ok");
  } else {
    setStatus(`API 不可用，已打开本地未命名笔记：${String(result.error?.message || result.error)}`, "warn");
  }
  return result;
}

function applyAiModelPackChange(nextPack = "Starter Auto", options = {}) {
  const next = String(nextPack || "Starter Auto").trim() || "Starter Auto";
  settingsState.ai.modelPack = next;
  settingsState.ai.routePreview = null;
  settingsState.ai.providerEndpointUrl = "";
  settingsState.ai.providerHealthEndpointUrl = "";
  settingsState.ai.secretRef = "";
  settingsState.ai.providerConfigError = "";
  settingsState.ai.providerHealthResult = null;
  applyActiveAiProviderConfigToState();
  persistAiSettingsToStorage();
  syncAiSettingsToApi();
  refreshAiRoutePreview({ render: false });

  const settingsPack = $("settingsAiModelPack");
  if (settingsPack && settingsPack.value !== next) settingsPack.value = next;
  const modulePack = $("moduleAiModelPack");
  if (modulePack && modulePack.value !== next) modulePack.value = next;

  renderModuleWorkspaceHeader();
  renderSettingsPanel();

  const source = String(options.source || "").trim();
  setStatus(`AI model pack switched: ${next}${source ? ` (${source})` : ""}`, "ok");
}

function syncMobileNewNoteButton() {
  const button = $("btnMobileNewNote");
  if (!button) return;
  const copy = explorerNewNoteButtonCopy(state);
  button.title = copy.title;
  const folderId = resolveExplorerNewNoteFolderId(state);
  const noteType = typeFromFolder(state, folderId);
  const permanentLike = noteType === "permanent" || noteType === "original";
  button.setAttribute("aria-label", noteType === "literature" ? `${copy.ariaLabel}（文摘）` : permanentLike ? `${copy.ariaLabel}（永久）` : copy.ariaLabel);
  const label = button.querySelector("span");
  if (label) label.textContent = permanentLike ? "永久" : noteType === "literature" ? "文摘" : copy.label.replace(/^新建/, "");
}

function renderModulePanels() {
  const graphMode = state.module === "graph";
  const aiInboxMode = state.module === "aiInbox";
  const settingsMode = state.module === "settings";
  const writingMode = state.module === "writing";
  const importsMode = state.module === "imports";
  const editorMode = !graphMode && !aiInboxMode && !settingsMode && !writingMode && !importsMode;
  $("editorWorkspace")?.classList.toggle("hidden", !editorMode);
  $("moduleWorkspace")?.classList.toggle("hidden", editorMode);
  $("aiInboxPanel")?.classList.toggle("hidden", !aiInboxMode);
  $("graphPanel")?.classList.toggle("hidden", !graphMode);
  $("settingsPanel")?.classList.toggle("hidden", !settingsMode);
  $("writingPanel")?.classList.toggle("hidden", !writingMode);
  $("importPanel")?.classList.toggle("hidden", !importsMode);
  $("markdownPanel")?.classList.toggle("hidden", !editorMode);
  $("relatedPanel")?.classList.toggle("hidden", !editorMode || !state.inspectorVisible);
  $("btnMobileNewNote")?.classList.toggle("hidden", !editorMode);
  syncMobileNewNoteButton();
  renderModuleWorkspaceHeader();
}

function renderAiRoutePreview() {
  const stats = $("settingsAiRouteStats");
  const detail = $("settingsAiRoutePreview");
  if (!stats || !detail) return;

  if (settingsState.ai.routePreviewLoading) {
    stats.innerHTML = `<span class="settings-stat-badge warn">正在预览</span>`;
    detail.textContent = "正在根据当前模式计算模型路由...";
    return;
  }

  if (settingsState.ai.routePreviewError) {
    stats.innerHTML = `<span class="settings-stat-badge warn">预览不可用</span>`;
    detail.textContent = settingsState.ai.routePreviewError;
    return;
  }

  const preview = settingsState.ai.routePreview;
  if (!preview) {
    stats.innerHTML = `<span class="settings-stat-badge warn">等待同步</span>`;
    detail.textContent = "刷新当前 Vault 后会显示这套模式实际使用的模型路由。";
    return;
  }

  function localRuntimeSummaryText() {
    const status = String(settingsState.ai.localRuntimeStatus || "unknown").trim() || "unknown";
    const models = Array.isArray(settingsState.ai.localRuntimeModels) ? settingsState.ai.localRuntimeModels : [];
    const selectedModel = String(settingsState.ai.localModel || "").trim();
    if (status === "available" && selectedModel) return `Ollama 可连接 / ${selectedModel}`;
    if (status === "available") return `Ollama 可连接 / ${models.length} 个模型`;
    if (status === "unavailable") return "Ollama 不可用";
    return "Ollama 未检测";
  }

  const provider = preview.provider || {};
  const route = preview.route || {};
  const access = preview.access || {};
  const health = preview.health || {};
  const healthStatus = String(health.status || "unknown").trim() || "unknown";
  const healthLabels = {
    healthy: "健康",
    degraded: "降级",
    down: "不可用",
    unknown: "未检测"
  };
  const healthTone = healthStatus === "healthy" ? "ok" : healthStatus === "unknown" ? "" : "warn";
  const healthDetail = healthStatus === "unknown"
    ? "Provider 健康：尚未测试连接"
    : `Provider 健康：${healthLabels[healthStatus] || healthStatus}${health.latencyMs ? ` / ${health.latencyMs}ms` : ""}`;
  stats.innerHTML = [
    `<span class="settings-stat-badge ${route.localOnly ? "ok" : ""}">${route.localOnly ? "本地/私密" : "云端可用"}</span>`,
    `<span class="settings-stat-badge ${access.ready ? "ok" : "warn"}">${access.ready ? "可直接使用" : "需要配置 Key"}</span>`,
    `<span class="settings-stat-badge ${healthTone}">${healthLabels[healthStatus] || healthStatus}</span>`,
    route.advancedOverride ? `<span class="settings-stat-badge warn">高级覆盖</span>` : `<span class="settings-stat-badge">自动路由</span>`
  ].join("");
  const runtimeMode = normalizeAiRuntimeMode(settingsState.ai.runtimeMode);
  const localRuntimeLine = ["local_only", "hybrid"].includes(runtimeMode)
    ? `<div>本地：${escapeHtml(localRuntimeSummaryText())}</div>`
    : "";
  const hybridLine = runtimeMode === "hybrid"
    ? `<div>混合：本地模型已为隐私/快速任务准备；深度任务仍保留云端路由。</div>`
    : "";
  detail.innerHTML = `
    <div><strong>${escapeHtml(provider.displayName || provider.providerId || "未知 Provider")}</strong></div>
    <div>模型包：${escapeHtml(preview.modelPack || settingsState.ai.modelPack || "Starter Auto")}</div>
    <div>档位：${escapeHtml(route.selectedTier || "standard")} / 模型：${escapeHtml(route.modelRef || "自动选择")}</div>
    <div>Provider：${escapeHtml(provider.providerId || "unknown")} / 授权：${escapeHtml(access.keyMode || "unknown")}</div>
    ${localRuntimeLine}
    ${hybridLine}
    <div>${escapeHtml(healthDetail)}</div>
    <div>${escapeHtml(access.message || "")}</div>
  `;
}

function renderAiLocalModelControls() {
  const runtimeMode = normalizeAiRuntimeMode(settingsState.ai.runtimeMode);
  const runtimeSelect = $("settingsAiRuntimeMode");
  if (runtimeSelect && runtimeSelect.value !== runtimeMode) runtimeSelect.value = runtimeMode;

  const modelSelect = $("settingsAiLocalModel");
  const modelLabel = $("settingsAiLocalModelLabel");
  const showLocalModel = runtimeMode === "local_only" || runtimeMode === "hybrid";
  modelSelect?.classList.toggle("hidden", !showLocalModel);
  modelLabel?.classList.toggle("hidden", !showLocalModel);
  if (modelSelect) {
    const models = Array.isArray(settingsState.ai.localRuntimeModels) ? settingsState.ai.localRuntimeModels : [];
    const selectedModel = String(settingsState.ai.localModel || "").trim();
    const names = models.map((model) => String(model?.name || "").trim()).filter(Boolean);
    const optionNames = selectedModel && !names.includes(selectedModel) ? [selectedModel, ...names] : names;
    if (settingsState.ai.localRuntimeChecking) {
      modelSelect.innerHTML = `<option value="">正在检测 Ollama...</option>`;
    } else if (optionNames.length) {
      modelSelect.innerHTML = [
        `<option value="">自动选择本地模型</option>`,
        ...optionNames.map((name) => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`)
      ].join("");
      modelSelect.value = selectedModel;
    } else {
      modelSelect.innerHTML = `<option value="">未检测到 Ollama 模型</option>`;
    }
    modelSelect.disabled = !showLocalModel || settingsState.ai.localRuntimeChecking;
  }

  const detectButton = $("settingsAiDetectOllama");
  if (detectButton) {
    detectButton.disabled = settingsState.ai.localRuntimeChecking || settingsState.ai.localRuntimePulling;
    detectButton.textContent = settingsState.ai.localRuntimeChecking ? "正在检测 Ollama..." : "检测 Ollama";
  }

  $("settingsAiDownloadOllama")?.classList.toggle("hidden", !showLocalModel);

  const pullButton = $("settingsAiPullOllamaModel");
  if (pullButton) {
    const modelName = ollamaPullModelName();
    const installed = hasLocalModel(modelName);
    pullButton.classList.toggle("hidden", !showLocalModel);
    pullButton.disabled = !showLocalModel || settingsState.ai.localRuntimeChecking || settingsState.ai.localRuntimePulling || installed;
    pullButton.textContent = settingsState.ai.localRuntimePulling
      ? `正在下载 ${modelName}...`
      : installed
        ? `已安装 ${modelName}`
        : `下载 ${modelName}`;
  }
}

function renderAiProviderConfigControls() {
  const endpointInput = $("settingsAiProviderEndpointUrl");
  if (endpointInput) {
    const stored = String(settingsState.ai.providerEndpointUrl || "").trim();
    if (String(endpointInput.value || "") !== stored) endpointInput.value = stored;
  }
  const healthEndpointInput = $("settingsAiProviderHealthEndpointUrl");
  if (healthEndpointInput) {
    const stored = String(settingsState.ai.providerHealthEndpointUrl || "").trim();
    if (String(healthEndpointInput.value || "") !== stored) healthEndpointInput.value = stored;
  }

  const providerId = currentAiProviderId();
  const config = activeAiProviderConfig();
  const healthRecord = settingsState.ai.providerHealthResult?.record || null;
  const badge = $("settingsAiProviderConfigBadge");
  if (badge) {
    badge.classList.toggle("ok", Boolean(config));
    badge.classList.toggle("warn", !config && providerId !== "platform_managed_openai");
    if (healthRecord) {
      badge.classList.toggle("ok", healthRecord.status === "healthy");
      badge.classList.toggle("warn", healthRecord.status !== "healthy");
    }
    const endpointReady = Boolean(String(config?.endpointUrl || config?.endpoint_url || settingsState.ai.providerEndpointUrl || "").trim());
    const secretReady = Boolean(String(config?.secretRef || config?.secret_ref || settingsState.ai.secretRef || "").trim());
    if (settingsState.ai.providerHealthChecking) badge.textContent = "测试中";
    else if (healthRecord?.status === "healthy") badge.textContent = `健康 ${healthRecord.latencyMs || 0}ms`;
    else if (healthRecord) badge.textContent = `状态 ${healthRecord.status || "unknown"}`;
    else if (settingsState.ai.providerConfigSaving) badge.textContent = "保存中";
    else if (settingsState.ai.providerConfigError) badge.textContent = "配置失败";
    else if (providerId === "platform_managed_openai") badge.textContent = "平台托管";
    else if (config) badge.textContent = endpointReady || secretReady ? "已配置" : "已保存";
    else badge.textContent = "未配置";
  }

  const saveButton = $("settingsAiSaveProviderConfig");
  if (saveButton) {
    const platformManaged = providerId === "platform_managed_openai";
    saveButton.disabled = settingsState.ai.providerConfigSaving || settingsState.ai.providerHealthChecking || !providerId || platformManaged;
    saveButton.textContent = settingsState.ai.providerConfigSaving
      ? "保存中..."
      : platformManaged
        ? "平台托管无需配置"
        : "保存当前 Provider 配置";
  }

  const checkButton = $("settingsAiCheckProviderHealth");
  if (checkButton) {
    const platformManaged = providerId === "platform_managed_openai";
    checkButton.disabled =
      settingsState.ai.providerConfigSaving ||
      settingsState.ai.providerHealthChecking ||
      !providerId ||
      platformManaged ||
      !String(settingsState.ai.providerHealthEndpointUrl || settingsState.ai.providerEndpointUrl || "").trim();
    checkButton.textContent = settingsState.ai.providerHealthChecking
      ? "测试中..."
      : platformManaged
        ? "平台托管"
        : "测试连接";
  }
}

function activateModule(moduleName) {
  const normalizedModule = moduleName === "search" ? "imports" : moduleName;
  state.module = normalizedModule;
  document.querySelectorAll(".rail-btn[data-module]").forEach((button) => {
    button.classList.toggle("active", button.dataset.module === normalizedModule);
  });
  renderAll();
}

function renderSettingsPanel() {
  const current = $("settingsCurrentVault");
  const input = $("settingsVaultPath");
  const detail = $("settingsVaultDetail");
  const stats = $("settingsVaultStats");
  if (!current || !input || !detail || !stats) return;
  const vault = settingsState.vault;
  current.textContent = vault?.vaultPath || "尚未读取";
  if (vault?.vaultPath && !String(input.value || "").trim()) input.value = vault.vaultPath;
  if (vault) {
    const initialized = Boolean(vault.initialized);
    const usingDefault = vault.vaultPath && vault.defaultVaultPath && String(vault.vaultPath) === String(vault.defaultVaultPath);
    stats.innerHTML = `
      <span class="settings-stat-badge ${initialized ? "ok" : "warn"}">${initialized ? "已初始化" : "待初始化"}</span>
      <span class="settings-stat-badge">${usingDefault ? "默认工作区" : "自定义工作区"}</span>
      <span class="settings-stat-badge">Markdown 主内容</span>
    `;
    detail.textContent = `默认路径：${vault.defaultVaultPath || "未知"}；当前切换目标会在确认后替换整套目录树与缓存上下文。`;
  } else {
    stats.innerHTML = `<span class="settings-stat-badge warn">等待读取</span>`;
    detail.textContent = settingsState.error || "点击“刷新当前 Vault”读取 API 状态。";
  }

  const feedbackBadge = $("settingsFeedbackRepoBadge");
  const feedbackDetail = $("settingsFeedbackDetail");
  const feedbackLink = $("settingsFeedbackLink");
  if (feedbackBadge) {
    feedbackBadge.textContent = FEEDBACK_REPOSITORY_READY ? FEEDBACK_REPOSITORY : "待绑定仓库";
    feedbackBadge.classList.toggle("ok", FEEDBACK_REPOSITORY_READY);
    feedbackBadge.classList.toggle("warn", !FEEDBACK_REPOSITORY_READY);
  }
  if (feedbackDetail) {
    feedbackDetail.textContent = FEEDBACK_REPOSITORY_READY
      ? `当前会跳到 ${FEEDBACK_REPOSITORY} 的 GitHub Issue，新问题和建议会自动带上版本与模块上下文。`
      : "仓库名已经建议为 yansilu-feedback。把 prototype-app.js 里的 GitHub owner 补上后即可启用。";
  }
  if (feedbackLink) {
    const href = FEEDBACK_REPOSITORY_READY ? feedbackBaseUrl() : "#";
    feedbackLink.href = href;
    feedbackLink.textContent = FEEDBACK_REPOSITORY_READY ? href : "等待填写真实 GitHub 仓库";
    feedbackLink.setAttribute("aria-disabled", FEEDBACK_REPOSITORY_READY ? "false" : "true");
  }

  renderAiLocalModelControls();

  const aiMode = $("settingsAiUserMode");
  if (aiMode) {
    const stored = String(settingsState.ai.userMode || "Auto").trim() || "Auto";
    if (aiMode.value !== stored) aiMode.value = stored;
  }
  const aiPack = $("settingsAiModelPack");
  if (aiPack) {
    const stored = String(settingsState.ai.modelPack || "Starter Auto").trim() || "Starter Auto";
    if (aiPack.value !== stored) aiPack.value = stored;
  }
  const aiRef = $("settingsAiAdvancedModelRef");
  if (aiRef) {
    const stored = String(settingsState.ai.advancedModelRef || "").trim();
    if (String(aiRef.value || "") !== stored) aiRef.value = stored;
  }
  const aiSecretRef = $("settingsAiSecretRef");
  if (aiSecretRef) {
    const stored = String(settingsState.ai.secretRef || "").trim();
    if (String(aiSecretRef.value || "") !== stored) aiSecretRef.value = stored;
  }
  renderAiProviderConfigControls();
  renderAiRoutePreview();
  renderScheduledTasksWorkspace();

  const testPrompt = $("settingsAiTestPrompt");
  if (testPrompt) {
    const stored = String(settingsState.ai.testPrompt || "").trim();
    if (String(testPrompt.value || "") !== stored) testPrompt.value = stored;
  }
  const testMeta = $("settingsAiTestChatMeta");
  if (testMeta) {
    const meta = settingsState.ai.testRunning ? "运行中..." : settingsState.ai.testMeta || "等待运行";
    testMeta.textContent = meta;
    testMeta.classList.toggle("warn", settingsState.ai.testRunning);
  }
  const testOutput = $("settingsAiTestChatOutput");
  if (testOutput) {
    testOutput.textContent = settingsState.ai.testOutput || "（空）";
  }
}

function isWritingEligibleNote(note) {
  if (!note) return false;
  const noteType = String(note.noteType || "").trim().toLowerCase();
  if (noteType === "permanent") return true;
  return rootBoxIdFromFolder(state, note.folderId) === "dir_original_default";
}

function writingScopeDirectoryIds() {
  const anchorId = state.selectedFolderId || state.browserRootId || "dir_original_default";
  return descendantDirectoryIds(anchorId);
}

function writingCandidateNotes() {
  const scopedDirectoryIds = new Set(writingScopeDirectoryIds());
  return state.notes
    .filter((note) => scopedDirectoryIds.has(note.folderId) && isWritingEligibleNote(note))
    .sort((a, b) => {
      const aTime = Date.parse(a.updatedAt || 0) || 0;
      const bTime = Date.parse(b.updatedAt || 0) || 0;
      if (bTime !== aTime) return bTime - aTime;
      return String(a.title || a.id).localeCompare(String(b.title || b.id), "zh-CN");
    });
}

function writingThemeLabels(notes) {
  const tags = [...new Set(
    notes
      .flatMap((note) => {
        if (Array.isArray(note.tags) && note.tags.length) return note.tags;
        return parseTags(String(note.body || ""));
      })
      .map((tag) => String(tag || "").trim())
      .filter(Boolean)
  )];
  if (tags.length) return tags;
  return [...new Set(notes.map((note) => String(note.title || "").trim()).filter(Boolean))];
}

function writingThemeSummary(notes) {
  const labels = writingThemeLabels(notes);
  if (!labels.length) return "\u8fd8\u6ca1\u6709\u6d6e\u73b0\u51fa\u53ef\u8fdb\u5165\u5199\u4f5c\u7684\u4e3b\u9898";
  const preview = labels.slice(0, 3).join("、");
  return `\u53ef\u8fdb\u5165\u5199\u4f5c\u7684\u4e3b\u9898\u7ea6 ${labels.length} \u4e2a${preview ? `\uff1a${preview}${labels.length > 3 ? " \u7b49" : ""}` : ""}`;
}

function writingThemeIndexById(indexId) {
  return writingState.themeIndexes.find((item) => item.id === indexId) || null;
}

function writingSourceIndexSummary() {
  const sourceIds = uniqueStrings(writingState.sourceIndexIds);
  if (!sourceIds.length) return "";
  const titles = sourceIds.map((id) => writingThemeIndexById(id)?.title || id).filter(Boolean);
  const preview = titles.slice(0, 2).join("、");
  return `主题入口：${preview}${titles.length > 2 ? " 等" : ""}`;
}

function suggestedThemeIndexTitle(noteIds = []) {
  const notes = noteIds.map((id) => writingNoteById(id)).filter(Boolean);
  const labels = writingThemeLabels(notes);
  if (labels.length) return `${labels[0]} 主题索引`;
  const first = notes[0];
  if (first?.title) return `${first.title} 主题索引`;
  return "新的主题索引";
}

function clearWritingSourceIndexIds() {
  writingState.sourceIndexIds = [];
}

function setWritingSourceIndexIds(indexIds = []) {
  writingState.sourceIndexIds = uniqueStrings(indexIds);
}

function writingNoteById(noteId) {
  return state.notes.find((item) => item.id === noteId) || null;
}

function writingCachedNoteById(noteId) {
  return (writingState.project?.basket_notes || []).find((item) => item?.id === noteId) || null;
}

function isDirectoryUnderOriginalRoot(directoryId) {
  return rootBoxIdFromFolder(state, directoryId) === "dir_original_default";
}

function writingNoteEligibility(note) {
  if (!note) {
    return {
      ok: false,
      key: "missing",
      message: "还没能读取到这条永久笔记的完整信息。"
    };
  }
  const noteType = String(note.noteType || note.note_type || "").trim().toLowerCase();
  const inOriginalRoot = noteType === "permanent" || isDirectoryUnderOriginalRoot(note.folderId);
  if (!inOriginalRoot) {
    return {
      ok: false,
      key: "type",
      message: "写作篮只接受永久笔记。"
    };
  }
  const authorship = normalizeAuthorshipItem(note.authorship) || { user_confirmed: false, ai_assisted: false };
  if (!authorship.user_confirmed) {
    return {
      ok: false,
      key: "authorship",
      message: "这条永久笔记还没完成作者确认。"
    };
  }
  if (String(note.status || "").trim().toLowerCase() !== "active") {
    return {
      ok: false,
      key: "draft",
      message: "这条永久笔记仍是 draft，先完成原创性检查后再进入写作。"
    };
  }
  return { ok: true, key: "ok", message: "" };
}

function parseWritingBasketIds() {
  const raw = String($("writingBasketNoteIds")?.value || "");
  return [...new Set(raw.split(/[\s,，]+/).map((item) => item.trim()).filter(Boolean))];
}

function setWritingBasketIds(noteIds) {
  const input = $("writingBasketNoteIds");
  if (!input) return;
  input.value = [...new Set(noteIds.filter(Boolean))].join("\n");
}

function addWritingBasketIds(noteIds) {
  setWritingBasketIds([...parseWritingBasketIds(), ...noteIds]);
}

function removeWritingBasketId(noteId) {
  setWritingBasketIds(parseWritingBasketIds().filter((item) => item !== noteId));
}

function clearWritingBasket() {
  setWritingBasketIds([]);
}

function writingKnownNoteById(noteId) {
  return writingNoteById(noteId) || writingCachedNoteById(noteId) || null;
}

function partitionWritingEligibleNoteIds(noteIds = [], { noteLookup = writingKnownNoteById } = {}) {
  const eligibleIds = [];
  const ineligible = [];
  for (const noteId of uniqueStrings(noteIds)) {
    const note = noteLookup(noteId);
    const eligibility = writingNoteEligibility(note || { id: noteId });
    if (eligibility.ok) eligibleIds.push(noteId);
    else {
      ineligible.push({
        id: noteId,
        note,
        ...eligibility
      });
    }
  }
  return { eligibleIds, ineligible };
}

function writingIneligibleSummary(items = []) {
  const counts = items.reduce(
    (acc, item) => {
      const key = ["authorship", "draft", "type", "missing"].includes(item?.key) ? item.key : "other";
      acc[key] += 1;
      return acc;
    },
    { authorship: 0, draft: 0, type: 0, missing: 0, other: 0 }
  );
  return uniqueStrings([
    counts.authorship ? `${counts.authorship} 条未完成作者确认` : "",
    counts.draft ? `${counts.draft} 条仍是 draft` : "",
    counts.type ? `${counts.type} 条不属于永久笔记` : "",
    counts.missing ? `${counts.missing} 条暂未读取完整信息` : "",
    counts.other ? `${counts.other} 条暂不可进入写作` : ""
  ]).join("，");
}

function currentWritingBasketEligibility() {
  return partitionWritingEligibleNoteIds(parseWritingBasketIds());
}

function writingBasketEntries() {
  return parseWritingBasketIds().map((noteId) => writingKnownNoteById(noteId) || { id: noteId, title: noteId, folderId: "", noteType: "permanent", body: "" });
}

function writingDraftDirectoryId() {
  if (state.selectedFolderId && isDirectoryUnderOriginalRoot(state.selectedFolderId)) return state.selectedFolderId;
  const basketDirectoryId = writingBasketEntries().find((note) => note?.folderId && isDirectoryUnderOriginalRoot(note.folderId))?.folderId;
  return basketDirectoryId || "dir_original_default";
}

function writingDraftTitle() {
  const projectTitle = String(writingState.project?.title || $("writingTitle")?.value || "").trim() || "未命名写作项目";
  return `${projectTitle} 草稿`;
}

function rewriteMarkdownHeading(markdown, title) {
  const cleanTitle = String(title || "").trim() || "未命名草稿";
  const text = String(markdown || "").replace(/\r\n/g, "\n").trim();
  if (!text) return `# ${cleanTitle}\n`;
  if (/^#\s+/.test(text)) return text.replace(/^#\s+.*$/m, `# ${cleanTitle}`);
  return `# ${cleanTitle}\n\n${text}\n`;
}

function writingDraftBody() {
  const headingTitle = writingDraftTitle();
  const scaffoldMarkdown = rewriteMarkdownHeading(writingState.scaffoldMarkdown, headingTitle).trimEnd();
  const projectId = writingState.project?.id || "";
  const scaffoldId = writingState.scaffold?.id || "";
  const references = uniqueStrings([
    projectId ? `WritingProject: ${projectId}` : "",
    scaffoldId ? `DraftScaffold: ${scaffoldId}` : ""
  ]);
  const tail = references.length ? `\n\n---\n${references.join("\n")}\n` : "\n";
  return `${scaffoldMarkdown}${tail}`;
}

function writingScaffoldFileName(title = "") {
  const base = String(title || "writing-project")
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return `${base || "writing-project"}_scaffold.md`;
}

async function copyTextToClipboard(text) {
  const value = String(text || "");
  if (navigator?.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }
  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "readonly");
  textarea.style.position = "fixed";
  textarea.style.left = "-10000px";
  textarea.style.top = "0";
  document.body.appendChild(textarea);
  textarea.select();
  const success = document.execCommand("copy");
  document.body.removeChild(textarea);
  if (!success) throw new Error("clipboard unavailable");
}

function downloadTextFile(fileName, text) {
  const blob = new Blob([String(text || "")], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
  window.__lastWritingExport__ = {
    fileName,
    bytes: blob.size,
    downloadedAt: new Date().toISOString()
  };
  return blob.size;
}

function writingNoteExcerpt(note) {
  const text = String(note?.body || "")
    .replace(/\r\n/g, "\n")
    .replace(/^#.*$/m, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return "这条永久笔记还没有正文摘要。";
  return text.length > 120 ? `${text.slice(0, 120)}...` : text;
}

function writingNoteMeta(note) {
  const folder = folderById(state, note?.folderId);
  return uniqueStrings([
    note?.id,
    folder?.name,
    note?.noteType === "permanent" || rootBoxIdFromFolder(state, note?.folderId) === "dir_original_default" ? "永久笔记" : note?.noteType
  ]).join(" · ");
}

function renderWritingNoteCard(note, { selected = false, action = "add", actionLabel = "加入篮子" } = {}) {
  const thinkingBadge = renderThinkingStatusBadge(note?.thinkingStatus, "thinking-status-badge writing-thinking-status");
  return `
    <article class="writing-note-card ${selected ? "selected" : ""}" data-writing-note-id="${escapeHtml(note.id)}">
      <div class="writing-note-card-head">
        <div>
          <div class="writing-note-title">${escapeHtml(note.title || note.id)}</div>
          <div class="writing-note-meta">${escapeHtml(writingNoteMeta(note))}</div>
        </div>
        ${thinkingBadge}
      </div>
      <div class="writing-note-meta">${escapeHtml(writingNoteExcerpt(note))}</div>
      <div class="writing-note-actions">
        <button class="mini-btn" type="button" data-writing-action="${escapeHtml(action)}" data-writing-note-id="${escapeHtml(note.id)}">${escapeHtml(actionLabel)}</button>
        <button class="mini-btn" type="button" data-writing-action="open" data-writing-note-id="${escapeHtml(note.id)}">打开笔记</button>
      </div>
    </article>
  `;
}

function writingThemeIndexScopeDirectoryId() {
  if (state.selectedFolderId && isDirectoryUnderOriginalRoot(state.selectedFolderId)) return state.selectedFolderId;
  return writingDraftDirectoryId();
}

async function loadWritingThemeIndexes() {
  const directoryId = writingThemeIndexScopeDirectoryId();
  writingState.loadingThemeIndexes = true;
  renderWritingPanel();
  try {
    writingState.themeIndexes = await listIndexCards({
      directoryId,
      includeDescendants: true,
      indexType: "topic",
      limit: 12
    });
    return writingState.themeIndexes;
  } finally {
    writingState.loadingThemeIndexes = false;
    renderWritingPanel();
  }
}

function renderWritingThemeIndexCard(indexCard) {
  const itemTitles = (Array.isArray(indexCard?.items) ? indexCard.items : [])
    .map((item) => item?.note?.title || item?.short_label || item?.note_id)
    .filter(Boolean)
    .slice(0, 3);
  const preview = itemTitles.join("、");
  const noteCount = Number(indexCard?.note_count || indexCard?.items?.length || 0);
  const directoryLabel = indexCard?.directory_title || indexCard?.directory_id || "";
  const thinkingBadge = renderThinkingStatusBadge(indexCard?.thinkingStatus, "thinking-status-badge writing-thinking-status");
  return `
    <article class="writing-note-card ${writingState.sourceIndexIds.includes(indexCard.id) ? "selected" : ""}" data-writing-index-card-id="${escapeHtml(indexCard.id)}">
      <div class="writing-note-card-head">
        <div>
          <div class="writing-note-title">${escapeHtml(indexCard.title || indexCard.id)}</div>
          <div class="writing-note-meta">${escapeHtml(indexCard.id)} · ${escapeHtml(indexCard.index_type || "topic")} · 条目 ${escapeHtml(noteCount)}</div>
        </div>
        ${thinkingBadge}
      </div>
      <div class="writing-note-meta">${escapeHtml(indexCard.summary || "把一组成熟永久笔记当成后续写作入口。")}</div>
      <div class="writing-note-meta">${escapeHtml(directoryLabel)}${preview ? ` · 例如：${escapeHtml(preview)}${noteCount > itemTitles.length ? " 等" : ""}` : ""}</div>
      <div class="writing-note-actions">
        <button class="mini-btn" type="button" data-writing-index-action="use" data-writing-index-id="${escapeHtml(indexCard.id)}">把整组加入写作篮</button>
      </div>
    </article>
  `;
}

function populateWritingFormFromProject(project) {
  if (!project) return;
  if ($("writingTitle")) $("writingTitle").value = project.title || "";
  if ($("writingGoal")) $("writingGoal").value = project.goal || "";
  if ($("writingAudience")) $("writingAudience").value = project.audience || "";
  if ($("writingTone")) $("writingTone").value = project.tone || "";
  setWritingSourceIndexIds(project.related_index_ids || []);
  setWritingBasketIds(project.basket_note_ids || []);
}

function currentWritingVersionNote() {
  return String($("writingVersionNote")?.value || "").trim();
}

function promptVersionNoteEdit(currentValue, label) {
  const next = window.prompt(`${label}说明`, String(currentValue || ""));
  if (next === null) return null;
  return String(next).trim();
}

function renderWritingProjectCard(project) {
  const draftLabel = project?.draft_note?.title || project?.draft_note_id || "未绑定草稿";
  const scaffoldLabel = project?.scaffold_id || "未生成";
  const hasScaffold = Boolean(project?.scaffold_id);
  const sourceCount = Array.isArray(project?.related_index_ids) ? project.related_index_ids.length : 0;
  const thinkingBadge = renderThinkingStatusBadge(project?.thinkingStatus, "thinking-status-badge writing-thinking-status");
  return `
    <article class="writing-note-card" data-writing-project-id="${escapeHtml(project.id)}">
      <div class="writing-note-card-head">
        <div>
          <div class="writing-note-title">${escapeHtml(project.title || project.id)}</div>
          <div class="writing-note-meta">${escapeHtml(project.id)} · ${escapeHtml(project.status || "draft")} · 篮子 ${escapeHtml(project.basket_count || 0)}</div>
        </div>
        ${thinkingBadge}
      </div>
      <div class="writing-note-meta">Scaffold：${escapeHtml(scaffoldLabel)}；草稿：${escapeHtml(draftLabel)}；主题入口 ${escapeHtml(sourceCount)}</div>
      <div class="writing-note-meta">${escapeHtml(project.goal || "暂无写作目标说明。")}</div>
      <div class="writing-note-actions">
        <button class="mini-btn" type="button" data-writing-project-action="open" data-writing-project-id="${escapeHtml(project.id)}">打开项目</button>
        <button class="mini-btn" type="button" data-writing-project-action="copy-scaffold" data-writing-project-id="${escapeHtml(project.id)}" ${hasScaffold ? "" : "disabled"}>复制 Scaffold</button>
        <button class="mini-btn" type="button" data-writing-project-action="export-scaffold" data-writing-project-id="${escapeHtml(project.id)}" ${hasScaffold ? "" : "disabled"}>导出 .md</button>
      </div>
    </article>
  `;
}

function renderScaffoldVersionCard(version) {
  const isActive = writingState.scaffold?.id === version.id;
  const versionNote = String(version?.version_note || "").trim();
  return `
    <article class="writing-note-card ${isActive ? "selected" : ""}" data-writing-scaffold-id="${escapeHtml(version.id)}">
      <div class="writing-note-card-head">
        <div>
          <div class="writing-note-title">${escapeHtml(version.id)}</div>
          <div class="writing-note-meta">${escapeHtml(version.generated_by || "writing-engine")} · 章节 ${escapeHtml(version.section_count || 0)}</div>
        </div>
      </div>
      <div class="writing-note-meta">生成于：${escapeHtml(version.created_at || version.updated_at || "")}${isActive ? " · 当前预览中" : ""}</div>
      <div class="writing-note-meta">说明：${escapeHtml(versionNote || "自动生成的 scaffold 版本")}</div>
        <div class="writing-note-actions">
          <button class="mini-btn" type="button" data-writing-scaffold-action="open" data-writing-scaffold-id="${escapeHtml(version.id)}">打开版本</button>
          <button class="mini-btn" type="button" data-writing-scaffold-action="copy" data-writing-scaffold-id="${escapeHtml(version.id)}">复制</button>
          <button class="mini-btn" type="button" data-writing-scaffold-action="export" data-writing-scaffold-id="${escapeHtml(version.id)}">导出</button>
          <button class="mini-btn" type="button" data-writing-scaffold-action="edit-note" data-writing-scaffold-id="${escapeHtml(version.id)}">编辑说明</button>
        </div>
    </article>
  `;
}

function renderDraftVersionCard(version) {
  const noteTitle = version?.note?.title || version?.draft_note_id || "未命名草稿";
  const noteStatus = version?.note?.status || "draft";
  const sourceScaffold = version?.source_scaffold_id || "未记录";
  const versionNote = String(version?.version_note || "").trim();
  return `
    <article class="writing-note-card ${version?.is_current ? "selected" : ""}" data-writing-draft-version-id="${escapeHtml(version.id)}">
      <div class="writing-note-card-head">
        <div>
          <div class="writing-note-title">v${escapeHtml(version.version_no || 0)} · ${escapeHtml(noteTitle)}</div>
          <div class="writing-note-meta">${escapeHtml(version.draft_note_id)} · ${escapeHtml(noteStatus)}${version?.is_current ? " · 当前草稿" : ""}</div>
        </div>
      </div>
      <div class="writing-note-meta">来源 Scaffold：${escapeHtml(sourceScaffold)}</div>
      <div class="writing-note-meta">说明：${escapeHtml(versionNote || "从当前 scaffold 保存的草稿版本")}</div>
      <div class="writing-note-meta">创建时间：${escapeHtml(version.created_at || "")}</div>
        <div class="writing-note-actions">
          <button class="mini-btn" type="button" data-writing-draft-action="open" data-writing-draft-note-id="${escapeHtml(version.draft_note_id)}">打开草稿</button>
          <button class="mini-btn" type="button" data-writing-draft-action="edit-note" data-writing-draft-version-id="${escapeHtml(version.id)}" data-writing-draft-note-id="${escapeHtml(version.draft_note_id)}">编辑说明</button>
          ${
            version?.is_current
              ? `<button class="mini-btn" type="button" disabled>当前草稿</button>`
            : `<button class="mini-btn" type="button" data-writing-draft-action="set-current" data-writing-draft-note-id="${escapeHtml(version.draft_note_id)}">设为当前草稿</button>`
        }
      </div>
    </article>
  `;
}

async function loadWritingProjectsList() {
  writingState.loadingProjects = true;
  renderWritingPanel();
  try {
    writingState.projects = await listWritingProjects({
      limit: 8,
      q: writingState.projectFilters.q,
      status: writingState.projectFilters.status,
      hasDraft: writingState.projectFilters.hasDraft
    });
  } finally {
    writingState.loadingProjects = false;
    renderWritingPanel();
  }
}

function syncWritingProjectFiltersFromUi() {
  writingState.projectFilters.q = String($("writingProjectsSearch")?.value || "").trim();
  writingState.projectFilters.status = String($("writingProjectsStatusFilter")?.value || "all").trim() || "all";
  writingState.projectFilters.hasDraft = String($("writingProjectsDraftFilter")?.value || "all").trim() || "all";
}

async function loadWritingScaffoldVersions() {
  const writingProjectId = String(writingState.project?.id || "").trim();
  if (!writingProjectId) {
    writingState.scaffoldVersions = [];
    renderWritingPanel();
    return [];
  }
  writingState.loadingScaffoldVersions = true;
  renderWritingPanel();
  try {
    writingState.scaffoldVersions = await listProjectScaffolds(writingProjectId, 12);
    return writingState.scaffoldVersions;
  } finally {
    writingState.loadingScaffoldVersions = false;
    renderWritingPanel();
  }
}

async function loadWritingDraftVersions() {
  const writingProjectId = String(writingState.project?.id || "").trim();
  if (!writingProjectId) {
    writingState.draftVersions = [];
    renderWritingPanel();
    return [];
  }
  writingState.loadingDraftVersions = true;
  renderWritingPanel();
  try {
    writingState.draftVersions = await listProjectDraftVersions(writingProjectId, 12);
    return writingState.draftVersions;
  } finally {
    writingState.loadingDraftVersions = false;
    renderWritingPanel();
  }
}

async function openWritingProject(projectId) {
  const project = await fetchWritingProject(projectId);
  writingState.project = project;
  populateWritingFormFromProject(project);
  if (project?.scaffold_id) {
    try {
      const scaffold = await fetchDraftScaffold(project.scaffold_id);
      writingState.scaffold = scaffold.item || null;
      writingState.scaffoldMarkdown = scaffold.export?.markdown || scaffold.item?.markdown || "";
    } catch {
      writingState.scaffold = null;
      writingState.scaffoldMarkdown = "";
    }
  } else {
    writingState.scaffold = null;
    writingState.scaffoldMarkdown = "";
  }
  await refreshWritingProjectState();
  await loadWritingScaffoldVersions();
  await loadWritingDraftVersions();
  renderWritingPanel();
  return project;
}

async function prepareWritingStrongModelAnalysis() {
  const noteIds = parseWritingBasketIds();
  if (!noteIds.length) {
    setStatus("先把永久笔记加入写作篮，再准备强模型分析", "warn");
    return;
  }
  const confirmed =
    typeof window === "undefined" ||
    window.confirm("这会为远程强模型准备写作分析请求。当前实现不会直接调用模型，但请求包包含写作篮笔记摘要。继续？");
  if (!confirmed) return;
  writingState.strongModelLoading = true;
  writingState.strongModelError = "";
  renderWritingPanel();
  try {
    const result = await analyzeWritingWithStrongModel({
      userConfirmedRemoteModel: true,
      projectId: writingState.project?.id || "",
      writingGoal: String($("writingGoal")?.value || writingState.project?.goal || "").trim(),
      audience: String($("writingAudience")?.value || writingState.project?.audience || "").trim(),
      noteIds,
      persistArtifacts: false
    });
    writingState.strongModelResult = result;
    const model = result?.request?.model?.model || "strong_model";
    setStatus(`已准备 ${model} 写作分析请求包，尚未直接调用远程模型`, "ok");
  } catch (error) {
    writingState.strongModelError = String(error?.message || error);
    setStatus(`强模型写作分析准备失败：${writingState.strongModelError}`, "warn");
  } finally {
    writingState.strongModelLoading = false;
    renderWritingPanel();
  }
}

async function scaffoldBundleForProject(projectLike = null) {
  const project = projectLike || writingState.project;
  if (!project?.id) throw new Error("writingProjectId is required");
  if (!project?.scaffold_id) throw new Error("scaffold is not available for this project");
  if (writingState.project?.id === project.id && writingState.scaffold?.id === project.scaffold_id && String(writingState.scaffoldMarkdown || "").trim()) {
    return {
      project: writingState.project,
      scaffold: writingState.scaffold,
      markdown: writingState.scaffoldMarkdown
    };
  }
  const fetchedProject = writingState.project?.id === project.id ? writingState.project : await fetchWritingProject(project.id);
  const scaffold = await fetchDraftScaffold(project.scaffold_id);
  if (writingState.project?.id === project.id) {
    writingState.project = fetchedProject;
    writingState.scaffold = scaffold.item || null;
    writingState.scaffoldMarkdown = scaffold.export?.markdown || scaffold.item?.markdown || "";
    renderWritingPanel();
  }
  return {
    project: fetchedProject,
    scaffold: scaffold.item || null,
    markdown: scaffold.export?.markdown || scaffold.item?.markdown || ""
  };
}

async function openScaffoldVersion(scaffoldId) {
  const id = String(scaffoldId || "").trim();
  if (!id) throw new Error("draftScaffoldId is required");
  const scaffold = await fetchDraftScaffold(id);
  writingState.scaffold = scaffold.item || null;
  writingState.scaffoldMarkdown = scaffold.export?.markdown || scaffold.item?.markdown || "";
  renderWritingPanel();
  return scaffold;
}

async function copyWritingScaffold(projectLike = null) {
  const bundle = await scaffoldBundleForProject(projectLike);
  const markdown = String(bundle.markdown || "").trim();
  if (!markdown) throw new Error("scaffold markdown is empty");
  await copyTextToClipboard(markdown);
  const fileName = writingScaffoldFileName(bundle.project?.title);
  showWritingResult({
    stage: "writing_copy_scaffold",
    writingProjectId: bundle.project?.id,
    draftScaffoldId: bundle.scaffold?.id,
    fileName,
    characters: markdown.length
  });
  return { ...bundle, fileName, characters: markdown.length };
}

async function exportWritingScaffold(projectLike = null) {
  const bundle = await scaffoldBundleForProject(projectLike);
  const markdown = String(bundle.markdown || "").trim();
  if (!markdown) throw new Error("scaffold markdown is empty");
  const fileName = writingScaffoldFileName(bundle.project?.title);
  const bytes = downloadTextFile(fileName, `${markdown}\n`);
  showWritingResult({
    stage: "writing_export_scaffold",
    writingProjectId: bundle.project?.id,
    draftScaffoldId: bundle.scaffold?.id,
    fileName,
    characters: markdown.length,
    bytes
  });
  return { ...bundle, fileName, characters: markdown.length, bytes };
}

function renderWritingStatusCard(label, value, note, tone = "") {
  return `
    <div class="writing-status-card" data-tone="${escapeHtml(tone)}">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
      <small>${escapeHtml(note)}</small>
    </div>
  `;
}

function renderWritingStatusStrip() {
  const el = $("writingStatusStrip");
  if (!el) return;
  const basketIds = parseWritingBasketIds();
  const eligibility = currentWritingBasketEligibility();
  const hasProject = Boolean(writingState.project?.id);
  const hasScaffold = Boolean(writingState.scaffold?.id || writingState.project?.scaffold_id);
  const hasDraft = Boolean(writingState.project?.draft_note_id);
  const basketTone = eligibility.ineligible.length ? "warn" : basketIds.length ? "good" : "warn";
  const basketNote = eligibility.ineligible.length
    ? writingIneligibleSummary(eligibility.ineligible)
    : basketIds.length
      ? "材料已进入写作篮"
      : "从永久笔记开始";
  el.innerHTML = [
    renderWritingStatusCard("材料", `${basketIds.length} 条`, basketNote, basketTone),
    renderWritingStatusCard("项目", hasProject ? "已创建" : "待创建", hasProject ? writingState.project.id : "先明确题目和读者", hasProject ? "good" : "warn"),
    renderWritingStatusCard("骨架", hasScaffold ? "可预览" : "待生成", hasScaffold ? "章节、证据、缺口已返回" : "创建项目后生成", hasScaffold ? "good" : ""),
    renderWritingStatusCard("草稿", hasDraft ? "已绑定" : "未保存", hasDraft ? writingState.project?.draft_note?.title || writingState.project.draft_note_id : "检查骨架后再保存", hasDraft ? "good" : "")
  ].join("");
}

function renderWritingFlowSteps() {
  const el = $("writingFlowSteps");
  if (!el) return;
  const basketCount = parseWritingBasketIds().length;
  const hasProject = Boolean(writingState.project?.id);
  const hasScaffold = Boolean(writingState.scaffold?.id || writingState.project?.scaffold_id);
  const hasDraft = Boolean(writingState.project?.draft_note_id);
  const steps = [
    {
      done: basketCount > 0,
      title: "选材料",
      note: basketCount ? `${basketCount} 条永久笔记` : "加入 2-5 条永久笔记"
    },
    {
      done: hasProject,
      title: "建项目",
      note: hasProject ? writingState.project.id : "明确题目和读者"
    },
    {
      done: hasScaffold,
      title: "生成骨架",
      note: hasScaffold ? "可预览/导出" : "检查证据和缺口"
    },
    {
      done: hasDraft,
      title: "保存草稿",
      note: hasDraft ? "回到编辑器继续写" : "生成后再保存"
    }
  ];
  const firstOpenIndex = steps.findIndex((step) => !step.done);
  const activeIndex = firstOpenIndex >= 0 ? firstOpenIndex : steps.length - 1;
  el.innerHTML = steps
    .map((step, index) => {
      const stateClass = step.done ? "is-done" : index === activeIndex ? "is-active" : "";
      return `
        <div class="writing-flow-step ${stateClass}">
          <span>${escapeHtml(index + 1)}</span>
          <strong>${escapeHtml(step.title)}</strong>
          <small>${escapeHtml(step.note)}</small>
        </div>
      `;
    })
    .join("");
}

function renderWritingScaffoldPreview() {
  const el = $("writingScaffoldPreview");
  if (!el) return;
  if (!writingState.scaffold) {
    el.innerHTML = `
      <h4>骨架预览</h4>
      <div class="writing-empty">先选材料并创建项目，再生成草稿骨架；这里会显示章节、证据和开放问题。</div>
    `;
    return;
  }

  const sections = Array.isArray(writingState.scaffold.sections) ? writingState.scaffold.sections : [];
  const questions = Array.isArray(writingState.scaffold.open_questions) ? writingState.scaffold.open_questions : [];
  const markdown = String(writingState.scaffoldMarkdown || "").trim();
  const targetDirectoryId = writingDraftDirectoryId();
  const targetFolder = folderById(state, targetDirectoryId);
  el.innerHTML = `
    <h4>骨架预览</h4>
    <div class="writing-summary">
      Scaffold：${escapeHtml(writingState.scaffold.id || "未命名")}；章节 ${escapeHtml(sections.length || 0)} 个；开放问题 ${escapeHtml(questions.length || 0)} 个。
    </div>
    <div class="writing-summary">
      保存草稿时会写入：${escapeHtml(targetFolder?.name || targetDirectoryId)}。
    </div>
    <div>
      <h4>章节结构</h4>
      ${
        sections.length
          ? `<ol>${sections
              .map((section) => {
                const gaps = Array.isArray(section.gaps) ? section.gaps : [];
                const counterpoints = Array.isArray(section.counterpoints) ? section.counterpoints : [];
                const sectionQuestions = Array.isArray(section.open_questions) ? section.open_questions : [];
                return `
                  <li>
                    <strong>${escapeHtml(section.heading || `Section ${section.order || ""}`)}</strong> ${escapeHtml(section.purpose || "")}
                    ${
                      gaps.length
                        ? `<div class="writing-summary">待补缺口：${escapeHtml(gaps.join(" / "))}</div>`
                        : ""
                    }
                    ${
                      counterpoints.length
                        ? `<div class="writing-summary">反方/边界：${escapeHtml(counterpoints.join(" / "))}</div>`
                        : ""
                    }
                    ${
                      sectionQuestions.length
                        ? `<div class="writing-summary">待回答问题：${escapeHtml(sectionQuestions.join(" / "))}</div>`
                        : ""
                    }
                  </li>
                `;
              })
              .join("")}</ol>`
          : `<div class="writing-empty">当前 scaffold 还没有章节。</div>`
      }
    </div>
    <div>
      <h4>待处理的反方与漏洞</h4>
      ${
        questions.length
          ? `<ul>${questions.map((question) => `<li>${escapeHtml(question)}</li>`).join("")}</ul>`
          : `<div class="writing-empty">当前 scaffold 还没有开放问题。</div>`
      }
    </div>
    <div>
      <h4>Markdown 预览</h4>
      ${markdown ? `<pre>${escapeHtml(markdown)}</pre>` : `<div class="writing-empty">本次返回里还没有 Markdown 内容。</div>`}
    </div>
  `;
}

function renderWritingPanel() {
  const current = $("writingCurrentNote");
  const scopeHint = $("writingScopeHint");
  const themeIndexesHint = $("writingThemeIndexesHint");
  const themeIndexList = $("writingThemeIndexList");
  const basketSummary = $("writingBasketSummary");
  const basketList = $("writingBasketList");
  const candidateSummary = $("writingCandidateSummary");
  const candidateList = $("writingCandidateList");
  const createProjectButton = $("btnWritingCreateProject");
  const createScaffoldButton = $("btnWritingCreateScaffold");
  const openDraftButton = $("btnWritingOpenDraft");
  const copyScaffoldButton = $("btnWritingCopyScaffold");
  const exportScaffoldButton = $("btnWritingExportScaffold");
  const saveDraftButton = $("btnWritingSaveDraft");
  const strongModelButton = $("btnWritingStrongModelAnalysis");
  const strongModelSummary = $("writingStrongModelSummary");
  const projectsHint = $("writingProjectsHint");
  const projectsList = $("writingProjectsList");
  const scaffoldVersionsHint = $("writingScaffoldVersionsHint");
  const scaffoldVersionsList = $("writingScaffoldVersionsList");
  const draftVersionsHint = $("writingDraftVersionsHint");
  const draftVersionsList = $("writingDraftVersionsList");
  if (!current) return;
  const note = state.notes.find((item) => item.id === state.selectedFileId);
  current.textContent = note ? `${note.title} (${note.id})` : "尚未选择";

  const scopeFolder = folderById(state, state.selectedFolderId);
  const scopeRoot = folderById(state, rootBoxIdFromFolder(state, state.selectedFolderId));
  if (scopeHint) {
    scopeHint.textContent = `当前作用范围：${scopeRoot?.name || "永久笔记"} / ${scopeFolder?.name || "当前目录"}。这里只显示当前目录及其子目录里已经转化出的永久笔记，不展示原始导入资料；写作入口默认从已有观点开始。`;
  }
  renderWritingStatusStrip();

  const sourceIndexSummary = writingSourceIndexSummary();
  if (themeIndexesHint) {
    if (writingState.loadingThemeIndexes && writingState.themeIndexes.length) {
      themeIndexesHint.textContent = `正在刷新主题索引... 当前显示 ${writingState.themeIndexes.length} 个。`;
    } else if (writingState.loadingThemeIndexes) {
      themeIndexesHint.textContent = "正在读取主题索引...";
    } else if (writingState.themeIndexes.length) {
      themeIndexesHint.textContent = `${sourceIndexSummary ? `${sourceIndexSummary}；` : ""}当前范围内有 ${writingState.themeIndexes.length} 个主题索引可作为写作入口。`;
    } else {
      themeIndexesHint.textContent = "当前范围还没有主题索引。先把一组成熟永久笔记组织进写作篮，再保存为主题索引。";
    }
  }
  if (themeIndexList) {
    if (writingState.loadingThemeIndexes) {
      themeIndexList.innerHTML = writingState.themeIndexes.length
        ? writingState.themeIndexes.map(renderWritingThemeIndexCard).join("")
        : `<div class="writing-empty">正在加载主题索引...</div>`;
    } else if (writingState.themeIndexes.length) {
      themeIndexList.innerHTML = writingState.themeIndexes.map(renderWritingThemeIndexCard).join("");
    } else {
      themeIndexList.innerHTML = `<div class="writing-empty">还没有主题索引。用当前写作篮里的成熟永久笔记保存一个，后续就能从这里直接开始写作。</div>`;
    }
  }

  const basketEntries = writingBasketEntries();
  if (basketSummary) {
    const projectPart = writingState.project?.id ? `当前项目：${writingState.project.id}` : "尚未创建项目";
    const scaffoldPart = writingState.scaffold?.id ? `Scaffold：${writingState.scaffold.id}` : "尚未生成 scaffold";
    const draftPart = writingState.project?.draft_note_id
      ? `草稿：${writingState.project?.draft_note?.title || writingState.project.draft_note_id}`
      : "尚未绑定草稿";
    const sourcePart = sourceIndexSummary || "尚未记录主题入口";
    basketSummary.textContent = basketEntries.length
      ? `写作篮里已有 ${basketEntries.length} 条永久笔记，正在为当前主题组织论点与证据。${sourcePart}；${projectPart}；${scaffoldPart}；${draftPart}。`
      : `写作篮还没有笔记。先确认一个值得推进的主题，再挑选 2-5 条能支撑论证的永久笔记。${sourcePart}；${projectPart}；${scaffoldPart}；${draftPart}。`;
  }
  if (basketList) {
    basketList.innerHTML = basketEntries.length
      ? basketEntries.map((entry) => renderWritingNoteCard(entry, { selected: true, action: "remove", actionLabel: "移出篮子" })).join("")
      : `<div class="writing-empty">\u5148\u5728\u5de6\u4fa7\u6253\u5f00\u4e00\u6761\u539f\u521b\u7b14\u8bb0\u70b9\u51fb“\u52a0\u5165\u5f53\u524d\u7b14\u8bb0”\uff0c\u6216\u5148\u770b\u4e0b\u9762\u54ea\u4e9b\u4e3b\u9898\u5df2\u7ecf\u6210\u5f62\uff0c\u518d\u628a\u76f8\u5173\u7b14\u8bb0\u6279\u91cf\u52a0\u5165\u5199\u4f5c\u7bee\u3002</div>`;
  }

  const candidates = writingCandidateNotes();
  const basketIds = new Set(parseWritingBasketIds());
  if (candidateSummary) {
    candidateSummary.textContent = candidates.length
      ? `当前目录内有 ${candidates.length} 条永久笔记，${writingThemeSummary(candidates)}。先确认自己的判断，再决定哪些笔记进入写作篮。`
    : "当前目录里还没有已加载的永久笔记。可以先回到永久笔记目录形成几条自己的观点，再来组织可写主题。";
  }
  if (candidateList) {
    candidateList.innerHTML = candidates.length
      ? candidates
          .map((entry) =>
            renderWritingNoteCard(entry, {
              selected: basketIds.has(entry.id),
              action: basketIds.has(entry.id) ? "remove" : "add",
              actionLabel: basketIds.has(entry.id) ? "移出篮子" : "加入篮子"
            })
          )
          .join("")
      : `<div class="writing-empty">当前目录还没有可用的永久笔记候选。</div>`;
  }

  if (openDraftButton) {
    const hasDraft = Boolean(writingState.project?.draft_note_id);
    openDraftButton.disabled = !hasDraft;
    openDraftButton.textContent = hasDraft ? "打开当前草稿" : "暂无草稿";
  }
  if (createProjectButton) createProjectButton.disabled = false;
  if (createScaffoldButton) {
    createScaffoldButton.disabled = !writingState.project?.id;
    createScaffoldButton.textContent = writingState.project?.id ? "生成草稿骨架" : "先创建项目";
  }
  if (copyScaffoldButton) copyScaffoldButton.disabled = !writingState.project?.scaffold_id;
  if (exportScaffoldButton) exportScaffoldButton.disabled = !writingState.project?.scaffold_id;
  if (saveDraftButton) saveDraftButton.disabled = !writingState.scaffold?.id;
  if (strongModelButton) {
    const strongModelBasketIds = parseWritingBasketIds();
    strongModelButton.disabled = writingState.strongModelLoading || strongModelBasketIds.length === 0;
    strongModelButton.textContent = writingState.strongModelLoading
      ? "准备中..."
      : strongModelBasketIds.length
        ? "准备强模型分析"
        : "先加入笔记";
  }
  if (strongModelSummary) {
    const result = writingState.strongModelResult;
    const request = result?.request;
    const artifactCount = Number(result?.result?.summary?.artifactCount || result?.result?.artifacts?.length || 0);
    if (writingState.strongModelError) {
      strongModelSummary.textContent = `强模型分析准备失败：${writingState.strongModelError}`;
    } else if (writingState.strongModelLoading) {
      strongModelSummary.textContent = "正在准备强模型分析请求...";
    } else if (request) {
      strongModelSummary.textContent = result?.result
        ? `已归一化 ${artifactCount} 条写作待审建议，全部进入 AI Inbox 后再决定是否采用。`
        : `已准备 ${request.model?.model || "strong_model"} 请求包；当前没有直接调用远程模型。`;
    } else {
      strongModelSummary.textContent = "尚未准备强模型分析。需要你确认后，才会把写作篮发送给远程强模型。";
    }
  }

  if (projectsHint) {
    const filterSummary = [
      writingState.projectFilters.q ? `搜索“${writingState.projectFilters.q}”` : "",
      writingState.projectFilters.status !== "all" ? `状态 ${writingState.projectFilters.status}` : "",
      writingState.projectFilters.hasDraft === "true" ? "仅看有草稿" : "",
      writingState.projectFilters.hasDraft === "false" ? "仅看无草稿" : ""
    ]
      .filter(Boolean)
      .join("，");
    if (writingState.loadingProjects && writingState.projects.length) projectsHint.textContent = `正在刷新最近项目... 当前显示 ${writingState.projects.length} 个项目。`;
    else if (writingState.loadingProjects) projectsHint.textContent = "正在读取最近项目...";
    else if (writingState.projects.length) projectsHint.textContent = `${filterSummary ? `${filterSummary}，` : ""}共找到 ${writingState.projects.length} 个项目。`;
    else if (filterSummary) projectsHint.textContent = `${filterSummary}，但暂时没有匹配项目。`;
    else projectsHint.textContent = "还没有写作项目，创建后会出现在这里。";
  }
  if (projectsList) {
    if (writingState.loadingProjects) {
      projectsList.innerHTML = writingState.projects.length
        ? writingState.projects.map(renderWritingProjectCard).join("")
        : `<div class="writing-empty">正在加载最近项目...</div>`;
    } else if (writingState.projects.length) {
      projectsList.innerHTML = writingState.projects.map(renderWritingProjectCard).join("");
    } else {
      projectsList.innerHTML = `<div class="writing-empty">还没有写作项目。先从永久笔记创建一个项目，这里就会出现可恢复入口。</div>`;
    }
  }

  if (scaffoldVersionsHint) {
    if (!writingState.project?.id) scaffoldVersionsHint.textContent = "先创建或打开一个写作项目，这里才会显示版本。";
    else if (writingState.loadingScaffoldVersions && writingState.scaffoldVersions.length) {
      scaffoldVersionsHint.textContent = `正在刷新 scaffold 版本... 当前显示 ${writingState.scaffoldVersions.length} 个版本。`;
    } else if (writingState.loadingScaffoldVersions) scaffoldVersionsHint.textContent = "正在读取 scaffold 版本...";
    else if (writingState.scaffoldVersions.length) scaffoldVersionsHint.textContent = `当前项目共有 ${writingState.scaffoldVersions.length} 个 scaffold 版本。`;
    else scaffoldVersionsHint.textContent = "当前项目还没有 scaffold 版本。";
  }
  if (scaffoldVersionsList) {
    if (!writingState.project?.id) {
      scaffoldVersionsList.innerHTML = `<div class="writing-empty">创建或打开项目后，这里会显示历史 scaffold 版本。</div>`;
    } else if (writingState.loadingScaffoldVersions) {
      scaffoldVersionsList.innerHTML = writingState.scaffoldVersions.length
        ? writingState.scaffoldVersions.map(renderScaffoldVersionCard).join("")
        : `<div class="writing-empty">正在加载 scaffold 版本...</div>`;
    } else if (writingState.scaffoldVersions.length) {
      scaffoldVersionsList.innerHTML = writingState.scaffoldVersions.map(renderScaffoldVersionCard).join("");
    } else {
      scaffoldVersionsList.innerHTML = `<div class="writing-empty">还没有 scaffold 版本。点击“生成草稿骨架”后会开始累积版本。</div>`;
    }
  }

  if (draftVersionsHint) {
    if (!writingState.project?.id) draftVersionsHint.textContent = "先创建或打开一个写作项目，这里才会显示草稿版本。";
    else if (writingState.loadingDraftVersions && writingState.draftVersions.length) {
      draftVersionsHint.textContent = `正在刷新草稿版本... 当前显示 ${writingState.draftVersions.length} 个版本。`;
    } else if (writingState.loadingDraftVersions) draftVersionsHint.textContent = "正在读取草稿版本...";
    else if (writingState.draftVersions.length) draftVersionsHint.textContent = `当前项目共有 ${writingState.draftVersions.length} 个草稿版本。`;
    else draftVersionsHint.textContent = "当前项目还没有草稿版本。";
  }
  if (draftVersionsList) {
    if (!writingState.project?.id) {
      draftVersionsList.innerHTML = `<div class="writing-empty">创建或打开项目后，这里会显示草稿版本。</div>`;
    } else if (writingState.loadingDraftVersions) {
      draftVersionsList.innerHTML = writingState.draftVersions.length
        ? writingState.draftVersions.map(renderDraftVersionCard).join("")
        : `<div class="writing-empty">正在加载草稿版本...</div>`;
    } else if (writingState.draftVersions.length) {
      draftVersionsList.innerHTML = writingState.draftVersions.map(renderDraftVersionCard).join("");
    } else {
      draftVersionsList.innerHTML = `<div class="writing-empty">还没有草稿版本。点击“保存为草稿笔记”后会开始累积版本。</div>`;
    }
  }

  renderWritingFlowSteps();
  renderWritingScaffoldPreview();
}

async function refreshVaultSettings() {
  try {
    settingsState.vault = await fetchVaultInfo();
    const prefs = await fetchAiPreferences().catch(() => null);
    if (prefs) {
      const userMode = String(prefs.userMode || prefs.user_mode || "").trim();
      if (userMode) settingsState.ai.userMode = userMode;
      const modelPack = String(prefs.modelPack || prefs.model_pack || "").trim();
      if (modelPack) settingsState.ai.modelPack = modelPack;
      const advancedSettings = prefs.advancedSettings || prefs.advanced_settings || {};
      const runtimeMode = String(advancedSettings.runtimeMode || advancedSettings.runtime_mode || "").trim();
      if (runtimeMode) settingsState.ai.runtimeMode = normalizeAiRuntimeMode(runtimeMode);
      const localModel = String(advancedSettings.localModel || advancedSettings.local_model || "").trim();
      if (localModel) settingsState.ai.localModel = localModel;
      const advancedRef = String(prefs.advancedSettings?.modelRef || prefs.advanced_settings?.model_ref || "").trim();
      settingsState.ai.advancedModelRef = advancedRef;
      const secretRef = String(prefs.advancedSettings?.secretRef || prefs.advanced_settings?.secret_ref || "").trim();
      settingsState.ai.secretRef = secretRef;
      persistAiSettingsToStorage();
    }
    settingsState.ai.providerConfigs = await fetchAiProviderConfigs().catch(() => []);
    applyActiveAiProviderConfigToState();
    if (["local_only", "hybrid"].includes(normalizeAiRuntimeMode(settingsState.ai.runtimeMode))) {
      await detectOllamaModels({ silent: true, render: false });
    }
    await refreshAiRoutePreview({ render: false });
    await refreshScheduledTaskTemplates({ silent: true });
    await refreshScheduledTasks({ silent: true });
    settingsState.error = "";
    renderSettingsPanel();
    return settingsState.vault;
  } catch (error) {
    settingsState.error = String(error?.message || error);
    renderSettingsPanel();
    throw error;
  }
}

const GRAPH_RELATION_TYPE_LABELS = {
  associated_with: "基础关联",
  supports: "支持",
  complements: "补充",
  contrasts: "对比",
  contradicts: "反驳",
  extends: "推进",
  precedes: "前提",
  follows: "后续",
  qualifies: "限定",
  example_of: "例子",
  counterexample_to: "反例",
  same_topic: "同主题",
  unexpected_connection: "意外相关",
  bridges: "桥接",
  restates: "重述",
  reframes: "改写问题",
  appears_in_draft: "进入写作"
};

const GRAPH_RELATION_STATUS_LABELS = {
  confirmed: "已确认",
  draft: "草稿",
  suggested: "建议",
  dismissed: "已忽略",
  archived: "已归档"
};

const GRAPH_CONFLICT_RELATION_TYPES = new Set(["contradicts", "counterexample_to", "contrasts", "qualifies"]);

function graphRelationTypeLabel(type) {
  const key = String(type || "associated_with").trim().toLowerCase();
  return GRAPH_RELATION_TYPE_LABELS[key] || key || "关联";
}

function graphRelationStatusLabel(status) {
  const key = String(status || "confirmed").trim().toLowerCase();
  return GRAPH_RELATION_STATUS_LABELS[key] || key || "已确认";
}

const GRAPH_RELATION_QUALITY_LABELS = {
  empty: "缺说明",
  basic: "待补强",
  good: "较清楚",
  strong: "清楚"
};

const GRAPH_RELATION_REVIEW_REASON_LABELS = {
  missing_rationale: "补关系说明",
  thin_rationale: "补证据或边界",
  needs_review: "复查关系"
};

const GRAPH_RELATION_VISUALS = {
  associated_with: { key: "neutral", className: "is-neutral" },
  same_topic: { key: "neutral", className: "is-neutral" },
  supports: { key: "support", className: "is-support" },
  complements: { key: "support", className: "is-support" },
  extends: { key: "support", className: "is-support" },
  example_of: { key: "support", className: "is-support" },
  follows: { key: "flow", className: "is-flow" },
  precedes: { key: "flow", className: "is-flow" },
  appears_in_draft: { key: "flow", className: "is-flow" },
  contradicts: { key: "conflict", className: "is-conflict" },
  counterexample_to: { key: "conflict", className: "is-conflict" },
  contrasts: { key: "conflict", className: "is-conflict" },
  qualifies: { key: "boundary", className: "is-boundary" },
  bridges: { key: "bridge", className: "is-bridge" },
  unexpected_connection: { key: "bridge", className: "is-bridge" },
  restates: { key: "neutral", className: "is-neutral" },
  reframes: { key: "bridge", className: "is-bridge" }
};

const GRAPH_RELATION_MARKER_COLORS = {
  neutral: "#8fa0b3",
  support: "#35b779",
  flow: "#38a3c9",
  conflict: "#ef6f6c",
  boundary: "#d59c2a",
  bridge: "#a88be8"
};

function graphRelationQualityLabel(level) {
  const key = String(level || "empty").trim().toLowerCase();
  return GRAPH_RELATION_QUALITY_LABELS[key] || key || "待整理";
}

function graphRelationReviewReasonLabel(reason) {
  const key = String(reason || "needs_review").trim().toLowerCase();
  return GRAPH_RELATION_REVIEW_REASON_LABELS[key] || key || "复查关系";
}

function renderGraphOrientation({ nodes = [], edges = [], supportingCount = 0, conflictCount = 0, bridgeGapCount = 0 } = {}) {
  return `
    <section class="graph-orientation" aria-label="图谱读法">
      <div class="graph-orientation-main">
        <strong>先把它当作“永久笔记的论证地图”来读</strong>
        <span>节点是永久笔记，边是关系；重点不是线多不多，而是这组笔记能不能支撑一个清楚主题。</span>
      </div>
      <div class="graph-read-steps">
        <span>1 看中心观点</span>
        <span>2 看支持和反驳</span>
        <span>3 看桥接缺口</span>
        <span>4 回笔记补理由</span>
      </div>
      <div class="graph-relation-legend" aria-label="关系类型说明">
        <span><strong>支持</strong> 提供理由或证据</span>
        <span><strong>反驳</strong> 标记冲突观点</span>
        <span><strong>限定</strong> 写清边界条件</span>
        <span><strong>桥接</strong> 连接两段还没接上的思路</span>
      </div>
      <div class="graph-orientation-metrics">
        <span>${Number(nodes.length || 0)} 个节点</span>
        <span>${Number(edges.length || 0)} 条关系</span>
        <span>${Number(supportingCount || 0)} 条支持</span>
        <span>${Number(conflictCount || 0)} 条冲突</span>
        <span>${Number(bridgeGapCount || 0)} 个缺口</span>
      </div>
    </section>
  `;
}

function graphFilterOptions(edges, field, selected, allLabel, labelFn) {
  const counts = edges.reduce((acc, edge) => {
    const fallback = field === "status" ? "confirmed" : "associated_with";
    const key = String(edge?.[field] || fallback).trim().toLowerCase();
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const options = Object.entries(counts)
    .sort((a, b) => b[1] - a[1] || labelFn(a[0]).localeCompare(labelFn(b[0]), "zh-Hans-CN"))
    .map(([value, count]) => {
      const selectedAttr = value === selected ? " selected" : "";
      return `<option value="${escapeHtml(value)}"${selectedAttr}>${escapeHtml(labelFn(value))} (${count})</option>`;
    })
    .join("");
  return `<option value="all"${selected === "all" ? " selected" : ""}>${escapeHtml(allLabel)} (${edges.length})</option>${options}`;
}

function graphEdgeMatchesFilters(edge, filters = {}) {
  const type = String(edge?.relationType || "associated_with").trim().toLowerCase();
  const status = String(edge?.status || "confirmed").trim().toLowerCase();
  const filterType = String(filters.relationType || "all").trim().toLowerCase();
  const filterStatus = String(filters.status || "all").trim().toLowerCase();
  return (filterType === "all" || type === filterType) && (filterStatus === "all" || status === filterStatus);
}

function graphRelationVisual(type) {
  const key = String(type || "associated_with").trim().toLowerCase();
  return GRAPH_RELATION_VISUALS[key] || GRAPH_RELATION_VISUALS.associated_with;
}

function graphHash(value = "") {
  return String(value || "").split("").reduce((acc, char) => (acc * 31 + char.charCodeAt(0)) % 100000, 7);
}

function graphShortTitle(value = "", maxLength = 14) {
  const text = String(value || "").trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, Math.max(2, maxLength - 1))}…`;
}

function graphBuildVisualLayout(nodes = [], edges = []) {
  const width = 1080;
  const height = 560;
  const centerX = width / 2;
  const centerY = height / 2;
  const nodeMap = new Map();

  nodes.forEach((node) => {
    const id = String(node?.id || "").trim();
    if (!id) return;
    nodeMap.set(id, {
      ...node,
      id,
      title: String(node?.title || id).trim() || id,
      noteType: String(node?.noteType || node?.note_type || "note").trim() || "note",
      degree: 0,
      inDegree: 0,
      outDegree: 0
    });
  });

  edges.forEach((edge) => {
    const fromId = String(edge?.fromNoteId || "").trim();
    const toId = String(edge?.toNoteId || "").trim();
    if (fromId && !nodeMap.has(fromId)) {
      nodeMap.set(fromId, {
        id: fromId,
        title: String(edge?.fromTitle || fromId).trim() || fromId,
        noteType: "note",
        degree: 0,
        inDegree: 0,
        outDegree: 0
      });
    }
    if (toId && !nodeMap.has(toId)) {
      nodeMap.set(toId, {
        id: toId,
        title: String(edge?.toTitle || toId).trim() || toId,
        noteType: "note",
        degree: 0,
        inDegree: 0,
        outDegree: 0
      });
    }
    const from = nodeMap.get(fromId);
    const to = nodeMap.get(toId);
    if (from) {
      from.degree += 1;
      from.outDegree += 1;
    }
    if (to) {
      to.degree += 1;
      to.inDegree += 1;
    }
  });

  const layoutNodes = [...nodeMap.values()].sort(
    (a, b) => b.degree - a.degree || String(a.title).localeCompare(String(b.title), "zh-Hans-CN") || a.id.localeCompare(b.id)
  );
  const outerCount = Math.max(0, layoutNodes.length - 1);
  const innerCount = outerCount > 12 ? Math.ceil(outerCount * 0.58) : outerCount;
  const outerRingCount = Math.max(1, outerCount - innerCount);

  layoutNodes.forEach((node, index) => {
    const isHub = index === 0 && node.degree > 0;
    const degreeBoost = Math.min(8, Number(node.degree || 0) * 1.6);
    node.radius = Math.round(18 + degreeBoost + (isHub ? 8 : 0));
    node.isHub = isHub;

    if (!outerCount || isHub) {
      node.x = centerX;
      node.y = centerY;
      return;
    }

    const ringIndex = index - 1;
    const useOuterRing = outerCount > 12 && ringIndex >= innerCount;
    const ringPosition = useOuterRing ? ringIndex - innerCount : ringIndex;
    const ringTotal = useOuterRing ? outerRingCount : Math.max(1, innerCount);
    const angle = -Math.PI / 2 + (Math.PI * 2 * ringPosition) / ringTotal;
    const jitter = graphHash(node.id) % 17;
    const radiusX = useOuterRing ? 455 : outerCount > 7 ? 315 : 285;
    const radiusY = useOuterRing ? 215 : outerCount > 7 ? 150 : 170;
    node.x = Math.round(centerX + Math.cos(angle) * (radiusX + jitter * 0.6));
    node.y = Math.round(centerY + Math.sin(angle) * (radiusY + jitter * 0.35));
  });

  return { width, height, nodes: layoutNodes, nodeMap };
}

function graphEdgePath(edge, nodeMap) {
  const from = nodeMap.get(String(edge?.fromNoteId || "").trim());
  const to = nodeMap.get(String(edge?.toNoteId || "").trim());
  if (!from || !to) return null;

  if (from.id === to.id) {
    const loopRadius = from.radius + 18;
    return {
      d: `M ${from.x} ${from.y - from.radius - 3} C ${from.x + loopRadius} ${from.y - loopRadius * 2}, ${from.x + loopRadius * 2} ${from.y}, ${from.x + from.radius + 5} ${from.y}`,
      labelX: from.x + loopRadius + 4,
      labelY: from.y - loopRadius,
      titleX: from.x,
      titleY: from.y
    };
  }

  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.max(1, Math.sqrt(dx * dx + dy * dy));
  const unitX = dx / length;
  const unitY = dy / length;
  const startX = from.x + unitX * (from.radius + 5);
  const startY = from.y + unitY * (from.radius + 5);
  const endX = to.x - unitX * (to.radius + 8);
  const endY = to.y - unitY * (to.radius + 8);
  const curve = ((graphHash(`${edge.fromNoteId}:${edge.toNoteId}:${edge.relationType}`) % 7) - 3) * 9;
  const midX = (startX + endX) / 2;
  const midY = (startY + endY) / 2;
  const controlX = midX + -unitY * curve;
  const controlY = midY + unitX * curve;
  return {
    d: `M ${startX.toFixed(1)} ${startY.toFixed(1)} Q ${controlX.toFixed(1)} ${controlY.toFixed(1)} ${endX.toFixed(1)} ${endY.toFixed(1)}`,
    labelX: Math.round(controlX),
    labelY: Math.round(controlY - 7),
    titleX: Math.round(midX),
    titleY: Math.round(midY)
  };
}

function graphNodeClass(noteType = "") {
  const type = String(noteType || "").trim().toLowerCase();
  if (type === "literature") return "is-literature";
  if (type === "fleeting") return "is-fleeting";
  if (type === "original" || type === "permanent") return "is-original";
  return "is-note";
}

function renderGraphVisualMap({ nodes = [], edges = [], filterActive = false } = {}) {
  const layout = graphBuildVisualLayout(nodes, edges);
  const visibleEdges = edges
    .map((edge) => ({ edge, path: graphEdgePath(edge, layout.nodeMap), visual: graphRelationVisual(edge?.relationType) }))
    .filter((item) => item.path);
  const markers = Object.entries(GRAPH_RELATION_MARKER_COLORS)
    .map(
      ([key, color]) => `
        <marker id="graph-arrow-${escapeHtml(key)}" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto" markerUnits="strokeWidth">
          <path d="M 0 0 L 8 3 L 0 6 z" fill="${escapeHtml(color)}"></path>
        </marker>
      `
    )
    .join("");
  const edgeLabelsEnabled = visibleEdges.length <= 28;
  const nodeMarkup = layout.nodes
    .map((node) => {
      const typeClass = graphNodeClass(node.noteType);
      const title = node.title || node.id;
      const label = graphShortTitle(title, node.isHub ? 18 : 12);
      const labelY = node.y + node.radius + 17;
      const metaY = labelY + 14;
      return `
        <g class="graph-map-node ${typeClass} ${node.isHub ? "is-hub" : ""}" data-open-note="${escapeHtml(node.id)}" role="button" tabindex="0" aria-label="打开笔记 ${escapeHtml(title)}">
          <title>${escapeHtml(title)}；${escapeHtml(noteTypeLabel(node.noteType))}；连接 ${Number(node.degree || 0)} 条</title>
          <circle cx="${node.x}" cy="${node.y}" r="${node.radius}"></circle>
          <text class="graph-map-node-label" x="${node.x}" y="${labelY}" text-anchor="middle">${escapeHtml(label)}</text>
          <text class="graph-map-node-meta" x="${node.x}" y="${metaY}" text-anchor="middle">${escapeHtml(noteTypeLabel(node.noteType))} · ${Number(node.degree || 0)}</text>
        </g>
      `;
    })
    .join("");
  const rosterMarkup = layout.nodes
    .map((node) => {
      const relationHint = `${Number(node.degree || 0)} 条关系`;
      return `
        <button class="graph-map-roster-item" type="button" data-open-note="${escapeHtml(node.id)}">
          <span class="graph-map-roster-title">${escapeHtml(node.title || node.id)}</span>
          <span class="graph-map-roster-meta">${escapeHtml(noteTypeLabel(node.noteType))} · ${escapeHtml(relationHint)}</span>
        </button>
      `;
    })
    .join("");
  const edgeMarkup = visibleEdges
    .map(({ edge, path, visual }) => {
      const sourceTitle = edge.fromTitle || edge.fromNoteId || "源笔记";
      const targetTitle = edge.toTitle || edge.toNoteId || "目标笔记";
      const relationLabel = graphRelationTypeLabel(edge.relationType);
      const rationale = String(edge.rationale || "").trim();
      return `
        <g class="graph-map-edge-group" data-open-note="${escapeHtml(edge.fromNoteId || "")}" aria-label="${escapeHtml(sourceTitle)} 到 ${escapeHtml(targetTitle)}">
          <title>${escapeHtml(sourceTitle)} → ${escapeHtml(targetTitle)}；${escapeHtml(relationLabel)}${rationale ? `；${escapeHtml(rationale)}` : ""}</title>
          <path class="graph-map-edge ${escapeHtml(visual.className)}" d="${path.d}" marker-end="url(#graph-arrow-${escapeHtml(visual.key)})"></path>
          ${
            edgeLabelsEnabled
              ? `<text class="graph-map-edge-label ${escapeHtml(visual.className)}" x="${path.labelX}" y="${path.labelY}" text-anchor="middle">${escapeHtml(relationLabel)}</text>`
              : `<circle class="graph-map-edge-pin ${escapeHtml(visual.className)}" cx="${path.titleX}" cy="${path.titleY}" r="3"></circle>`
          }
        </g>
      `;
    })
    .join("");

  return `
    <section class="graph-map-panel" aria-label="图形化笔记关系图谱">
      <div class="graph-map-head">
        <div>
          <div class="graph-section-title">图形关系视图</div>
          <div class="graph-section-note">点是笔记，线是关系；连接越多的笔记越靠中心，关系类型用颜色区分。</div>
        </div>
        <div class="graph-map-badges">
          <span>${layout.nodes.length} 点</span>
          <span>${visibleEdges.length} 线</span>
          <span>${filterActive ? "已筛选" : "永久笔记范围"}</span>
        </div>
      </div>
      <div class="graph-map-stage">
        ${
          layout.nodes.length
            ? `
              <div class="graph-map-body">
                <svg class="graph-map-svg" viewBox="0 0 ${layout.width} ${layout.height}" role="img" aria-label="永久笔记关系图">
                  <defs>${markers}</defs>
                  <rect class="graph-map-backdrop" x="0" y="0" width="${layout.width}" height="${layout.height}" rx="28"></rect>
                  <g class="graph-map-edges">${edgeMarkup}</g>
                  <g class="graph-map-nodes">${nodeMarkup}</g>
                </svg>
                <aside class="graph-map-roster" aria-label="当前图谱笔记清单">
                  <div class="graph-map-roster-head">
                    <strong>当前图谱笔记</strong>
                    <span>${layout.nodes.length} 条</span>
                  </div>
                  <div class="graph-map-roster-list">${rosterMarkup}</div>
                </aside>
              </div>
            `
            : `<div class="graph-empty">当前视图没有可绘制的节点。调整筛选条件，或先在笔记中建立关联。</div>`
        }
      </div>
      <div class="graph-map-legend" aria-label="关系颜色图例">
        <span><i class="is-support"></i>支持/补充</span>
        <span><i class="is-conflict"></i>反驳/对比</span>
        <span><i class="is-boundary"></i>限定</span>
        <span><i class="is-bridge"></i>桥接</span>
        <span><i class="is-flow"></i>前后推进</span>
        <span><i class="is-neutral"></i>基础关联</span>
      </div>
    </section>
  `;
}

function renderRelationReviewQueueSection(reviewQueue) {
  const items = Array.isArray(reviewQueue?.items) ? reviewQueue.items : [];
  const total = Number(reviewQueue?.total || items.length || 0);
  const error = String(reviewQueue?.error || "").trim();
  const summary = reviewQueue?.summary && typeof reviewQueue.summary === "object" ? reviewQueue.summary : {};
  const byQuality = summary.byQualityLevel && typeof summary.byQualityLevel === "object" ? summary.byQualityLevel : {};
  const emptyCount = Number(byQuality.empty || 0);
  const basicCount = Number(byQuality.basic || 0);
  return `
      <section class="graph-section graph-review-section">
        <div class="graph-section-head">
          <div>
            <div class="graph-section-title">待补关系说明</div>
            <div class="graph-section-note">这里列出“线已经连上，但为什么连还没说清楚”的关系。优先补这些，图谱才有解释力。</div>
          </div>
        </div>
        ${
          error
            ? `<div class="graph-empty bad">整理队列加载失败：${escapeHtml(error)}</div>`
            : items.length
              ? `
                <div class="graph-review-summary">
                  <strong>${total} 条待整理关系</strong>
                  <small>缺说明 ${emptyCount} 条；待补强 ${basicCount} 条。点击卡片会回到源笔记，再补关系类型、关联理由或追问。</small>
                </div>
                <div class="graph-list">
                  ${items
                    .map((item) => {
                      const source = item.source || {};
                      const target = item.target || {};
                      const sourceTitle = source.title || item.fromNoteId || "源笔记";
                      const targetTitle = target.title || item.toNoteId || "目标笔记";
                      const rationale = String(item.rationale || "").trim();
                      return `
                        <button class="graph-review-card" type="button" data-open-note="${escapeHtml(item.fromNoteId || source.id || "")}">
                          <span class="graph-review-main">
                            <span class="graph-review-title">${escapeHtml(sourceTitle)} → ${escapeHtml(targetTitle)}</span>
                            <span class="graph-review-meta">${escapeHtml(graphRelationReviewReasonLabel(item.reviewReason))} · ${escapeHtml(
                              graphRelationQualityLabel(item.rationaleQualityLevel)
                            )} · ${escapeHtml(graphRelationTypeLabel(item.relationType))} · ${escapeHtml(graphRelationStatusLabel(item.status))}</span>
                            <small>${escapeHtml(rationale && rationale !== "markdown_wikilink" ? rationale : "尚未写清这条关系为什么成立。")}</small>
                          </span>
                        </button>
                      `;
                    })
                    .join("")}
                </div>
              `
              : `<div class="graph-empty">永久笔记范围内没有缺说明或理由偏薄的关系。可以切换关系类型，查看完整结构是否合理。</div>`
        }
      </section>
  `;
}

function renderGraphMetricCard(label, value, note, tone = "") {
  return `
    <div class="graph-metric-card" data-tone="${escapeHtml(tone)}">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
      <small>${escapeHtml(note)}</small>
    </div>
  `;
}

function renderGraphMapPreview(nodes = [], edges = [], linkedNodeIds = new Set()) {
  if (!nodes.length) {
    return `
      <div class="graph-map-card">
        <div class="graph-map-head">
          <strong>结构预览</strong>
          <small>当前范围暂无节点</small>
        </div>
        <div class="graph-empty">先建立几条永久笔记，再用关系把它们串成局部图谱。</div>
      </div>
    `;
  }

  const edgeRows = edges.slice(0, 5).map((edge) => {
    const fromNode = nodes.find((node) => node.id === edge.fromNoteId);
    const toNode = nodes.find((node) => node.id === edge.toNoteId);
    return {
      from: fromNode?.title || edge.fromTitle || edge.fromNoteId || "源笔记",
      to: toNode?.title || edge.toTitle || edge.toNoteId || "目标笔记",
      relation: graphRelationTypeLabel(edge.relationType),
      fromState: linkedNodeIds.has(edge.fromNoteId) ? "linked" : "",
      toState: linkedNodeIds.has(edge.toNoteId) ? "linked" : ""
    };
  });
  const isolatedRows = edgeRows.length
    ? []
    : nodes.slice(0, 4).map((node) => ({
        from: node.title || node.id,
        to: "等待连接",
        relation: "未连接",
        isolated: true
      }));
  const rows = edgeRows.length ? edgeRows : isolatedRows;
  return `
    <div class="graph-map-card">
      <div class="graph-map-head">
        <strong>结构预览</strong>
        <small>${escapeHtml(edges.length ? `展示前 ${Math.min(edges.length, 5)} 条关系` : "当前主要是孤立节点")}</small>
      </div>
      <div class="graph-map" aria-label="当前图谱结构预览">
        ${rows
          .map(
            (row) => `
              <div class="graph-map-node-row">
                <span class="graph-map-node" data-state="${escapeHtml(row.isolated ? "isolated" : row.fromState || "")}">${escapeHtml(row.from)}</span>
                <span class="graph-map-link">${escapeHtml(row.relation)}</span>
                <span class="graph-map-node" data-state="${escapeHtml(row.isolated ? "isolated" : row.toState || "")}">${escapeHtml(row.to)}</span>
              </div>
            `
          )
          .join("")}
      </div>
      ${
        edges.length > 5
          ? `<div class="graph-map-more">还有 ${escapeHtml(edges.length - 5)} 条关系在下方列表中。</div>`
          : ""
      }
    </div>
  `;
}

function renderGraphAiAnalysisCard() {
  const analysis = graphState.aiAnalysis?.analysis || null;
  const summary = graphState.aiAnalysis?.reviewItems?.summary || {};
  const loading = graphState.aiAnalysisLoading;
  const error = graphState.aiAnalysisError;
  const pendingCount = Number(summary.artifactCount || 0);
  const topicCount = Number(summary.topicCandidateCount || analysis?.topicCandidates?.length || 0);
  const relationCount = Number(summary.relationCandidateCount || analysis?.relationCandidates?.length || 0);
  const bridgeCount = Number(summary.bridgeCandidateCount || analysis?.bridgeCandidates?.length || 0);
  const isolatedCount = Number(summary.isolatedNoteCount || analysis?.isolatedNotes?.length || 0);
  return `
    <section class="graph-section" aria-label="AI 图谱初判">
      <div class="graph-section-head">
        <div>
          <div class="graph-section-title">AI 图谱初判</div>
          <div class="graph-section-note">只生成待审候选：主题、桥接、弱关系和孤岛笔记都不会直接写入图谱。</div>
        </div>
        <button class="secondary-btn small" type="button" data-run-graph-ai-analysis ${loading ? "disabled" : ""}>
          ${loading ? "分析中..." : analysis ? "重新分析" : "AI 扫描"}
        </button>
      </div>
      ${
        error
          ? `<div class="graph-empty bad">AI 图谱初判失败：${escapeHtml(error)}</div>`
          : analysis
            ? `
              <div class="graph-metrics" aria-label="AI 图谱初判摘要">
                ${renderGraphMetricCard("待审项", pendingCount, "进入 AI Inbox 复核", pendingCount ? "warn" : "good")}
                ${renderGraphMetricCard("主题候选", topicCount, "不会自动建索引卡", topicCount ? "warn" : "good")}
                ${renderGraphMetricCard("关系候选", relationCount, "不会自动建边", relationCount ? "warn" : "good")}
                ${renderGraphMetricCard("桥接/孤岛", `${bridgeCount}/${isolatedCount}`, "优先补结构缺口", bridgeCount + isolatedCount ? "warn" : "good")}
              </div>
              <div class="graph-next-card">
                <strong>待审优先级</strong>
                <small>${escapeHtml(
                  pendingCount
                    ? "打开 AI Inbox 查看这些候选，确认有价值的关系或忽略噪声。"
                    : "当前没有新的图谱候选。"
                )}</small>
              </div>
            `
            : `<div class="graph-empty">运行一次本地图谱扫描，查看可能的主题、桥接关系和孤岛笔记。</div>`
      }
    </section>
  `;
}

function renderGraphPanel() {
  const summary = $("graphSummary");
  const canvas = $("graphCanvas");
  if (!summary || !canvas) return;

  const folder = folderById(state, GRAPH_ORIGINAL_SCOPE_DIRECTORY_ID);
  if (graphState.loading) {
    summary.textContent = `正在加载“${folder?.name || "永久笔记盒"}”的永久笔记关系...`;
    canvas.innerHTML = `<div class="graph-empty">正在读取永久笔记盒及其子目录里的笔记节点、显式关系和待补说明。</div>`;
    return;
  }

  if (graphState.error) {
    summary.textContent = `图谱加载失败：${graphState.error}`;
    canvas.innerHTML = `<div class="graph-empty bad">请先确认 API 正常运行，或保存几条带 [[关联笔记]] 的 Markdown。</div>`;
    return;
  }

  const graph = graphState.item;
  if (!graph) {
    summary.textContent = `永久笔记盒：点击“刷新图谱”查看所有永久笔记之间的关系。`;
    canvas.innerHTML = `<div class="graph-empty">图谱固定展示永久笔记盒及其子目录：节点是永久笔记，边是支持、反驳、限定、桥接等关系。</div>`;
    return;
  }

  const nodes = Array.isArray(graph.nodes) ? graph.nodes : [];
  const allEdges = Array.isArray(graph.edges) ? graph.edges : [];
  const filters = graphState.filters || { relationType: "all", status: "all" };
  const edges = allEdges.filter((edge) => graphEdgeMatchesFilters(edge, filters));
  const filterActive = filters.relationType !== "all" || filters.status !== "all";
  const visibleNodeIds = new Set(edges.flatMap((edge) => [edge.fromNoteId, edge.toNoteId]).filter(Boolean));
  const visibleNodes = filterActive ? nodes.filter((node) => visibleNodeIds.has(node.id)) : nodes;
  const conflictItems = Array.isArray(graphState.conflicts?.conflicts) ? graphState.conflicts.conflicts : [];
  const insights = graph.insights && typeof graph.insights === "object" ? graph.insights : {};
  const allSupportingRelations = allEdges.filter((edge) => String(edge.relationType || "").trim().toLowerCase() === "supports");
  const allConflictingRelations = allEdges.filter((edge) => GRAPH_CONFLICT_RELATION_TYPES.has(String(edge.relationType || "").trim().toLowerCase()));
  const supportingRelations = edges.filter((edge) => String(edge.relationType || "").trim().toLowerCase() === "supports");
  const conflictingRelations = edges.filter((edge) => GRAPH_CONFLICT_RELATION_TYPES.has(String(edge.relationType || "").trim().toLowerCase()));
  const bridgeGaps = Array.isArray(insights.bridgeGaps) ? insights.bridgeGaps : [];
  const relationCounts = allEdges.reduce((acc, edge) => {
    const key = String(edge.relationType || "associated_with").trim();
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const relationSummary = Object.entries(relationCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([type, count]) => `${graphRelationTypeLabel(type)} × ${count}`)
    .join(" / ");
  const linkedNodeIds = new Set(edges.flatMap((edge) => [edge.fromNoteId, edge.toNoteId]).filter(Boolean));
  const isolatedNodes = nodes.filter((node) => !linkedNodeIds.has(node.id));
  const isolatedCount = isolatedNodes.length;
  const busiestNode = visibleNodes
    .map((node) => ({
      node,
      degree: edges.filter((edge) => edge.fromNoteId === node.id || edge.toNoteId === node.id).length
    }))
    .sort((a, b) => b.degree - a.degree)[0];
  const highlightedEdge = edges[0] || null;
  const weakRationaleEdges = edges.filter((edge) => {
    const rationale = String(edge.rationale || "").trim();
    return !rationale || rationale === "markdown_wikilink";
  });
  const untypedRelations = filterActive ? weakRationaleEdges : Array.isArray(insights.untypedRelations) ? insights.untypedRelations : weakRationaleEdges;
  const typeFilterLabel = filters.relationType === "all" ? "全部类型" : graphRelationTypeLabel(filters.relationType);
  const statusFilterLabel = filters.status === "all" ? "全部状态" : graphRelationStatusLabel(filters.status);
  const reviewQueueTotal = Number(graphState.reviewQueue?.total || graphState.reviewQueue?.items?.length || 0);
  const densityRatio = nodes.length ? allEdges.length / nodes.length : 0;
  const densityLabel = densityRatio >= 1.4 ? "结构较密" : densityRatio >= 0.6 ? "正在成形" : "偏松散";
  const tensionCards = [];

  conflictItems.slice(0, 4).forEach((conflict) => {
    const noteTitles = (Array.isArray(conflict.notes) ? conflict.notes : [])
      .map((note) => note.title || note.id)
      .slice(0, 3)
      .join(" / ");
    tensionCards.push(`
      <div class="graph-detail-card">
        <strong>概念错位 / 重名冲突</strong>
        <small>${escapeHtml(conflict.title || "未命名冲突")}</small>
        <small>${escapeHtml(conflict.rationale || "永久笔记里有多条笔记标题相同，容易让连接和引用失真。")}</small>
        <small>涉及：${escapeHtml(noteTitles || String(conflict.noteIds?.length || 0))}</small>
      </div>
    `);
  });

  if (conflictingRelations.length) {
    tensionCards.push(`
      <div class="graph-detail-card">
        <strong>显式冲突关系</strong>
        <small>${conflictingRelations.length} 条关系已经明确标为冲突/反驳，而不是被模糊处理。</small>
        <small>${escapeHtml(
          conflictingRelations
            .slice(0, 3)
            .map((edge) => `${edge.fromTitle || edge.fromNoteId} → ${edge.toTitle || edge.toNoteId}`)
            .join(" / ")
        )}</small>
      </div>
    `);
  }

  if (bridgeGaps.length) {
    tensionCards.push(`
      <div class="graph-detail-card">
        <strong>桥接缺口</strong>
        <small>${bridgeGaps.length} 处结构还缺过渡节点或明确连接，写作时容易在这里断掉。</small>
        <small>${escapeHtml(
          bridgeGaps
            .slice(0, 4)
            .map((gap) => (Array.isArray(gap.noteTitles) ? gap.noteTitles.join(" / ") : "未命名缺口"))
            .join(" / ")
        )}</small>
      </div>
    `);
  } else if (isolatedNodes.length) {
    tensionCards.push(`
      <div class="graph-detail-card">
        <strong>孤立观点</strong>
        <small>${isolatedNodes.length} 条永久笔记还没有进入关系网络。</small>
        <small>${escapeHtml(
          isolatedNodes
            .slice(0, 4)
            .map((node) => node.title || node.id)
            .join(" / ")
        )}</small>
      </div>
    `);
  }

  if (untypedRelations.length) {
    tensionCards.push(`
      <div class="graph-detail-card">
        <strong>待补链接理由</strong>
        <small>${untypedRelations.length} 条连接仍主要依赖 wikilink，没有写清是支持、反驳、延展还是对照。</small>
        <small>${escapeHtml(
          untypedRelations
            .slice(0, 3)
            .map((edge) => `${edge.fromTitle || edge.fromNoteId} → ${edge.toTitle || edge.toNoteId}`)
            .join(" / ")
        )}</small>
      </div>
    `);
  }

  const nextAction = (() => {
    if (!nodes.length) {
      return {
        title: "先写出几条永久笔记",
        note: "当前目录还没有节点。先回到编辑器建立笔记，再用 [[关联笔记]] 串起观点。"
      };
    }
    if (!allEdges.length) {
      return {
        title: "下一步：建立第一条关系",
        note: "在两条相关笔记之间加入 [[关联笔记]]，再刷新图谱查看局部结构。"
      };
    }
    if (untypedRelations.length) {
      return {
        title: "下一步：补关系理由",
        note: `${untypedRelations.length} 条连接还没写清为什么成立。优先打开关系整理队列里的源笔记。`
      };
    }
    if (conflictingRelations.length + conflictItems.length) {
      return {
        title: "下一步：处理张力",
        note: "已经有冲突或重名信号。补反方、边界和例外条件后，写作时更稳。"
      };
    }
    return {
      title: "下一步：进入写作中心",
      note: "当前目录结构已经比较清楚，可以挑选永久笔记放入写作篮。"
    };
  })();

  summary.textContent = `${graph.directoryTitle || folder?.name || "永久笔记盒"}：${nodes.length} 个永久笔记节点，${allEdges.length} 条链接；当前显示 ${visibleNodes.length} 个节点、${edges.length} 条关系（${typeFilterLabel} / ${statusFilterLabel}）。`;
  canvas.innerHTML = `
    ${renderGraphOrientation({
      nodes,
      edges: allEdges,
      supportingCount: allSupportingRelations.length,
      conflictCount: allConflictingRelations.length + conflictItems.length,
      bridgeGapCount: bridgeGaps.length
    })}
    <div class="graph-filters" data-graph-filters>
      <label>
        <span>关系类型</span>
        <select id="graphRelationTypeFilter" data-graph-filter="relationType">
          ${graphFilterOptions(allEdges, "relationType", filters.relationType, "全部类型", graphRelationTypeLabel)}
        </select>
      </label>
      <label>
        <span>关系状态</span>
        <select id="graphRelationStatusFilter" data-graph-filter="status">
          ${graphFilterOptions(allEdges, "status", filters.status, "全部状态", graphRelationStatusLabel)}
        </select>
      </label>
      <div class="graph-filter-note">筛选只改变当前视图，不会改动笔记。建议先看“支持/反驳/限定/桥接”四类关系。</div>
    </div>
    <div class="graph-metrics" aria-label="图谱摘要">
      ${renderGraphMetricCard("节点", `${visibleNodes.length}/${nodes.length}`, densityLabel, nodes.length ? "good" : "warn")}
      ${renderGraphMetricCard("显式关系", edges.length, relationSummary || "等待建立关系", edges.length ? "good" : "warn")}
      ${renderGraphMetricCard("待整理", reviewQueueTotal, reviewQueueTotal ? "优先补说明" : "关系理由清爽", reviewQueueTotal ? "warn" : "good")}
      ${renderGraphMetricCard("孤立观点", isolatedCount, isolatedCount ? "需要连接或归档" : "都进入结构", isolatedCount ? "warn" : "good")}
    </div>
    ${renderGraphAiAnalysisCard()}
    ${renderGraphVisualMap({ nodes: visibleNodes, edges, filterActive })}
    <div class="graph-grid">
      <section class="graph-section">
        <div class="graph-section-head">
          <div>
            <div class="graph-section-title">这组笔记现在是什么结构</div>
            <div class="graph-section-note">先看中心、孤立和关系分布，判断这组笔记是不是已经能支撑一个主题。</div>
          </div>
        </div>
        <div class="graph-next-card">
          <strong>${escapeHtml(nextAction.title)}</strong>
          <small>${escapeHtml(nextAction.note)}</small>
        </div>
        ${renderGraphMapPreview(visibleNodes, edges, linkedNodeIds)}
        <div class="graph-overview">
          <div class="graph-overview-card">
            <strong>范围</strong>
            <small>${escapeHtml(graph.directoryTitle || folder?.name || "永久笔记盒")} 内共有 ${nodes.length} 条永久笔记节点、${allEdges.length} 条显式链接；筛选后显示 ${visibleNodes.length} 条节点、${edges.length} 条关系。</small>
          </div>
          <div class="graph-overview-card">
            <strong>中心与孤立</strong>
            <small>${busiestNode?.node?.title ? `当前视图连接最密的是「${escapeHtml(busiestNode.node.title)}」` : "当前视图还没有明显中心节点"}；${isolatedCount} 条笔记暂时没有进入当前关系视图。</small>
          </div>
          <div class="graph-overview-card">
            <strong>支撑与反方</strong>
            <small>${supportingRelations.length ? `显式支持关系 ${supportingRelations.length} 条` : "还没有显式 supports 关系"}；${
              conflictingRelations.length + conflictItems.length
                ? `冲突信号 ${conflictingRelations.length + conflictItems.length} 个`
                : "暂未发现显性冲突"
            }。</small>
          </div>
          <div class="graph-overview-card">
            <strong>缺口与说明</strong>
            <small>${bridgeGaps.length ? `桥接缺口 ${bridgeGaps.length} 处` : "当前没有明显桥接缺口"}；${
              untypedRelations.length
            } 条连接还缺明确关系说明。</small>
          </div>
          <div class="graph-overview-card">
            <strong>关系分布</strong>
            <small>${relationSummary || "目前还没有关系类型可统计，先在笔记中建立 [[关联笔记]]。"} </small>
          </div>
        </div>
      </section>
      <section class="graph-section">
        <div class="graph-section-head">
          <div>
            <div class="graph-section-title">需要处理的问题</div>
            <div class="graph-section-note">这里不是错误列表，而是提示：哪里要补反方、补边界、补过渡或补关联理由。</div>
          </div>
        </div>
        ${
          tensionCards.length
            ? `<div class="graph-list">${tensionCards.join("")}</div>`
            : `<div class="graph-empty">永久笔记范围内还没有显性冲突。如果这组笔记是写作材料，可以回到笔记里补反方、边界或例外条件，让论证更稳。</div>`
        }
      </section>
      ${renderRelationReviewQueueSection(graphState.reviewQueue)}
      <section class="graph-section">
        <div class="graph-section-head">
          <div>
            <div class="graph-section-title">笔记节点</div>
            <div class="graph-section-note">每个节点是一条笔记。点击节点可回到笔记，继续补观点、标签或关系。</div>
          </div>
        </div>
        <div class="graph-list">
        ${
          visibleNodes.length
            ? visibleNodes
                .map(
                  (node) => `
                    <button class="graph-node" type="button" data-open-note="${escapeHtml(node.id)}" aria-label="打开笔记：${escapeHtml(node.title || node.id)}">
                      <span class="graph-dot"></span>
                      <span class="graph-node-text">
                        <span class="graph-node-title">${escapeHtml(node.title || node.id)}</span>
                        <span class="graph-node-meta">${escapeHtml(node.id)} · ${escapeHtml(node.noteType || "note")}</span>
                      </span>
                      <small>${escapeHtml(node.noteType || "note")}</small>
                    </button>
                  `
                )
                .join("")
            : `<div class="graph-empty">${filterActive ? "当前筛选条件下没有可显示的节点。" : "永久笔记盒还没有笔记。"}</div>`
        }
        </div>
      </section>
      <section class="graph-section">
        <div class="graph-section-head">
          <div>
            <div class="graph-section-title">关系边</div>
            <div class="graph-section-note">每条边说明两条笔记为什么相连：支持、反驳、限定、桥接、补充或推进。</div>
          </div>
        </div>
        ${
          highlightedEdge
            ? `
              <div class="graph-detail-card">
                <strong>当前示例边</strong>
                <small>${escapeHtml(highlightedEdge.fromTitle || highlightedEdge.fromNoteId)} → ${escapeHtml(
                  highlightedEdge.toTitle || highlightedEdge.toNoteId
                )}</small>
                <small>类型：${escapeHtml(graphRelationTypeLabel(highlightedEdge.relationType))}；状态：${escapeHtml(
                  graphRelationStatusLabel(highlightedEdge.status)
                )}；说明：${escapeHtml(
                  highlightedEdge.rationale || "尚未写明，当前来自 Markdown wikilink。"
                )}</small>
              </div>
            `
            : `
              <div class="graph-detail-card">
                <strong>当前还没有关系边</strong>
                <small>你可以回到笔记编辑器，用 [[关联笔记]] 把已有观点串起来，再回来查看局部结构。</small>
              </div>
            `
        }
        <div class="graph-list">
        ${
          edges.length
            ? edges
                .map(
                  (edge) => {
                    const edgeTitle = `${edge.fromTitle || edge.fromNoteId} → ${edge.toTitle || edge.toNoteId}`;
                    const edgeRationale = String(edge.rationale || graphRelationTypeLabel(edge.relationType) || "").trim();
                    return `
                    <button class="graph-edge" type="button" data-open-note="${escapeHtml(edge.fromNoteId)}" aria-label="打开源笔记：${escapeHtml(edgeTitle)}">
                      <span class="graph-edge-text">
                        <span class="graph-edge-title">${escapeHtml(edgeTitle)}</span>
                        <span class="graph-edge-meta">${escapeHtml(graphRelationTypeLabel(edge.relationType))} · ${escapeHtml(
                          graphRelationStatusLabel(edge.status)
                        )} · ${escapeHtml(edge.createdBy || "user")}</span>
                      </span>
                      <small title="${escapeHtml(edgeRationale)}">${escapeHtml(edgeRationale)}</small>
                    </button>
                  `;
                  }
                )
                .join("")
            : `<div class="graph-empty">${filterActive ? "当前筛选条件下没有可显示的关系。" : "永久笔记范围内还没有可显示的 [[关联笔记]] 链接。"}</div>`
        }
        </div>
      </section>
    </div>
  `;
}

async function refreshDirectoryGraph() {
  graphState.loading = true;
  graphState.error = "";
  renderGraphPanel();
  try {
    const directoryId = GRAPH_ORIGINAL_SCOPE_DIRECTORY_ID;
    const [graph, conflicts, reviewQueue] = await Promise.all([
      fetchDirectoryGraph(directoryId, { includeDescendants: true }),
      fetchGraphConflicts({ directoryId, includeDescendants: true }).catch(() => null),
      fetchRelationReviewQueue({ directoryId, includeDescendants: true, limit: 8 }).catch((error) => ({
        error: String(error?.message || error),
        items: [],
        total: 0
      }))
    ]);
    graphState.item = graph;
    graphState.conflicts = conflicts;
    graphState.reviewQueue = reviewQueue;
    upsertGraphNodeSummaries(Array.isArray(graph?.nodes) ? graph.nodes : []);
  } catch (error) {
    graphState.error = String(error?.message || error);
    graphState.item = null;
    graphState.conflicts = null;
    graphState.reviewQueue = null;
  } finally {
    graphState.loading = false;
    renderGraphPanel();
  }
}

async function runGraphAiAnalysis() {
  if (graphState.aiAnalysisLoading) return;
  graphState.aiAnalysisLoading = true;
  graphState.aiAnalysisError = "";
  renderGraphPanel();
  try {
    const result = await analyzeDirectoryGraph(GRAPH_ORIGINAL_SCOPE_DIRECTORY_ID, {
      includeDescendants: true,
      minRelationConfidence: 0.05,
      persistArtifacts: true
    });
    graphState.aiAnalysis = result;
    const count = Number(result?.reviewItems?.summary?.artifactCount || 0);
    setStatus(count ? `AI 图谱初判已生成 ${count} 条待审候选` : "AI 图谱初判完成，没有新的候选", count ? "ok" : "");
    if (count) await openAiInboxModule({ view: "pending" });
  } catch (error) {
    graphState.aiAnalysisError = String(error?.message || error);
    setStatus(`AI 图谱初判失败：${graphState.aiAnalysisError}`, "warn");
  } finally {
    graphState.aiAnalysisLoading = false;
    renderGraphPanel();
  }
}

async function importYijingKnowledgeNetworkDemo() {
  const button = $("graphSeedYijing");
  const previousDisabled = Boolean(button?.disabled);
  if (button) button.disabled = true;
  setStatus("正在导入易经知识网络案例...", "");
  try {
    const result = await seedYijingKnowledgeNetwork();
    const directoryId = String(result?.directoryId || result?.directory?.id || "").trim();
    if (!directoryId) throw new Error("演示数据没有返回目录 ID");
    await syncDirectoriesFromApi();
    state.browserRootId = rootBoxIdFromFolder(state, directoryId);
    state.selectedFolderId = directoryId;
    await syncNotesForDirectory(directoryId);
    if (result?.firstNoteId) state.selectedFileId = result.firstNoteId;
    await refreshDirectoryGraph();
    renderAll();
    const summary = result?.summary || {};
    setStatus(`已导入易经案例：${summary.totalNodes || summary.notes || 0} 个节点，${summary.totalEdges || summary.relations || 0} 条关系`, "ok");
    return true;
  } catch (error) {
    setStatus(`易经案例导入失败：${String(error?.message || error)}`, "bad");
    return false;
  } finally {
    if (button) button.disabled = previousDisabled;
  }
}

async function importYijingRichAcceptanceDemo() {
  const button = $("graphSeedYijingRich");
  const previousDisabled = Boolean(button?.disabled);
  if (button) button.disabled = true;
  setStatus("正在导入易经官网演示案例...", "");
  try {
    const result = await seedYijingRichAcceptanceDemo();
    const directoryId = String(result?.directoryId || result?.directory?.id || "").trim();
    if (!directoryId) throw new Error("演示案例没有返回目录 ID");
    await syncDirectoriesFromApi();
    state.browserRootId = rootBoxIdFromFolder(state, directoryId);
    state.selectedFolderId = directoryId;
    await syncNotesForDirectory(directoryId);
    if (result?.firstNoteId) state.selectedFileId = result.firstNoteId;
    await refreshDirectoryGraph();
    renderAll();
    const counts = result?.counts || {};
    const summary = result?.summary || {};
    const noteCount = counts.original_notes || summary.createdNotes || summary.updatedNotes || 0;
    const relationCount = counts.relations || summary.createdRelations || summary.updatedRelations || 0;
    const projectCount = counts.writing_projects || summary.createdWritingProjects || summary.updatedWritingProjects || 0;
    setStatus(`已导入易经官网演示：${noteCount} 条永久笔记，${relationCount} 条关系，${projectCount} 个写作方案`, "ok");
    return true;
  } catch (error) {
    setStatus(`易经官网演示导入失败：${String(error?.message || error)}`, "bad");
    return false;
  } finally {
    if (button) button.disabled = previousDisabled;
  }
}

async function importSmartNotesProductThinkingDemo() {
  setStatus("正在导入 Smart Notes 产品思考 Demo...", "");
  try {
    const result = await seedSmartNotesProductThinkingDemo();
    const directoryId = String(result?.directoryId || result?.directory?.id || "").trim();
    if (!directoryId) throw new Error("Demo 导入结果缺少目录 ID");
    await syncDirectoriesFromApi();
    state.browserRootId = rootBoxIdFromFolder(state, directoryId);
    state.selectedFolderId = directoryId;
    await syncNotesForDirectory(directoryId);
    if (result?.firstNoteId) state.selectedFileId = result.firstNoteId;
    await refreshDirectoryGraph();
    renderAll();
    const counts = result?.counts || {};
    const summary = result?.summary || {};
    const noteCount = counts.permanent_notes || summary.createdNotes || summary.updatedNotes || 0;
    const relationCount = counts.relations || summary.createdRelations || summary.updatedRelations || 0;
    const projectCount = counts.writing_projects || summary.createdWritingProjects || summary.updatedWritingProjects || 0;
    setStatus(`已导入 Smart Notes 产品思考 Demo：${noteCount} 条永久笔记，${relationCount} 条关系，${projectCount} 个写作项目`, "ok");
    return true;
  } catch (error) {
    setStatus(`Smart Notes Demo 导入失败：${String(error?.message || error)}`, "bad");
    return false;
  }
}

async function ensureNoteBodyLoaded(noteId) {
  const note = state.notes.find((n) => n.id === noteId);
  if (!note || note.bodyLoaded) return;
  const expectedNoteBody = note.body;
  const expectedTab = state.tabs.find((t) => t.noteId === note.id);
  const expectedTabBody = expectedTab?.body;
  try {
    const full = await fetchNote(noteId);
    if (!full) return;
    const currentTab = state.tabs.find((t) => t.noteId === note.id);
    if (currentTab?.dirty) {
      note.bodyLoaded = true;
      return;
    }
    const hasLocalEditorChange = currentTab && currentTab.body !== expectedTabBody;
    const hasLocalNoteChange = note.body !== expectedNoteBody;
    if (hasLocalEditorChange || hasLocalNoteChange) {
      note.bodyLoaded = true;
      return;
    }
    note.body = full.body || note.body;
    note.title = full.title || note.title;
    note.status = full.status || note.status;
    note.markdownPath = full.markdownPath || note.markdownPath;
    note.originalityStatus = full.originalityStatus || note.originalityStatus;
    note.originalitySimilarity = normalizeOptionalNumber(full.originalitySimilarity ?? note.originalitySimilarity);
    note.authorship = normalizeAuthorshipItem(full.authorship) || note.authorship;
    note.thesis = full.thesis || note.thesis || "";
    note.threeLineSummary = Array.isArray(full.threeLineSummary) ? full.threeLineSummary : note.threeLineSummary || [];
    note.distillationStatus = full.distillationStatus || note.distillationStatus || "";
    note.thinkingStatus = normalizeThinkingStatusItem(full.thinkingStatus) || note.thinkingStatus || null;
    note.boundaryOrCounterpoint = full.boundaryOrCounterpoint || note.boundaryOrCounterpoint || "";
    note.updatedAt = full.updatedAt || note.updatedAt;
    note.bodyLoaded = true;
    const tab = state.tabs.find((t) => t.noteId === note.id);
    if (tab) {
      tab.body = note.body;
      tab.title = note.title;
      tab.savedBody = note.body;
      tab.savedTitle = note.title;
      tab.dirty = false;
      editor.syncTabMetadataFromNote(note.id);
      if (state.activeTabId === tab.id) editor.fillEditorFromTab();
    }
  } catch {}
}

function openNoteById(id, options = {}) {
  const activeTab = state.tabs.find((t) => t.id === state.activeTabId);
  if (activeTab?.dirty && activeTab.noteId !== id) {
    editor.updateActiveTabFromEditor();
    void editor.autoSaveTabById(activeTab.id, "switch-note");
  }
  state.selectedFileId = id;
  const note = state.notes.find((n) => n.id === id);
  const focusedIds = Array.isArray(state.literatureQueueFocusNoteIds) ? state.literatureQueueFocusNoteIds : [];
  if (focusedIds.length) {
    const keepFocus = String(note?.noteType || "").trim() === "literature" && focusedIds.includes(String(id || "").trim());
    if (!keepFocus) clearLiteratureQueueFocus();
  }
  if (note) syncExplorerContextToNote(note);
  editor.openNoteTab(id, options);
  renderAll();
  ensureNoteBodyLoaded(id);
  return true;
}

async function handleStateChange(reason, payload = {}) {
  if (reason === "create-primary-note") {
    const result = await createPrimaryOriginalNote({ preferTitleSelection: true });
    if (result.reused) {
      setStatus(
        result.cleanedCount
          ? `已打开永久笔记占位，并清理 ${result.cleanedCount} 条空白占位`
          : "已打开永久笔记占位",
        result.cleanedCount ? "warn" : "ok"
      );
    } else if (result.remote) {
      setStatus(result.switchedToOriginal ? "已切到永久笔记并创建 Markdown 文件" : "已创建新的永久笔记 Markdown 文件", "ok");
    } else {
      setStatus(`API 不可用，已降级本地创建永久笔记：${String(result.error?.message || result.error)}`, "warn");
    }
    return;
  }

  if (reason === "create-note-in-selected-folder") {
    const result = await createNoteInSelectedFolder({ preferTitleSelection: true });
    if (result.reused) {
      setStatus(
        result.cleanedCount
          ? `已打开现有未命名笔记，并清理 ${result.cleanedCount} 条空白占位`
          : "已打开现有未命名笔记",
        result.cleanedCount ? "warn" : "ok"
      );
    } else if (result.remote) {
      setStatus("已在当前目录创建 Markdown 文件（已落盘）", "ok");
    } else {
      setStatus(`API 不可用，已降级本地创建：${String(result.error?.message || result.error)}`, "warn");
    }
    return;
  }

  if (reason === "record-original-from-note" || reason === "create-original-from-literature") {
    const sourceNoteId = String(payload.sourceNoteId || "").trim();
    const sourceNote = state.notes.find((item) => item.id === sourceNoteId) || null;
    const sourceType = String(payload.sourceType || sourceNote?.noteType || "").trim().toLowerCase();
    const sourceTitle = String(payload.sourceTitle || sourceNote?.title || "").trim();
    const body = originalDraftBodyFromSource({
      ...payload,
      sourceType,
      sourceTitle,
      sourceBody: payload.sourceBody || sourceNote?.body || ""
    });
    const title = titleFromSeedText(
      payload.paraphrase || payload.sourceBody || payload.sourceTitle || sourceTitle || "",
      sourceTitle || "未命名永久笔记"
    );
    const directoryId = "dir_original_default";
    try {
      const created = await createNote({
        directoryId,
        status: "draft",
        body
      });
      if (!created) throw new Error("创建永久笔记失败");
      const note = mapNoteItem({
        ...created,
        body: typeof created?.body === "string" ? created.body : body
      });
      state.notes = [note, ...state.notes.filter((item) => item.id !== note.id)];
        if (sourceNoteId && sourceNote && isOriginalRecordableSource(sourceNote)) {
          const sourceBodyWithVisibleReference = withGeneratedOriginalReference(
            String(payload.sourceBody || sourceNote.body || ""),
            note.title || title
          );
          const nextSourceBody = withGeneratedOriginalMarker(sourceBodyWithVisibleReference, note.id);
        sourceNote.body = nextSourceBody;
        sourceNote.generatedOriginalNoteId = note.id;
        sourceNote.tags = parseTags(nextSourceBody);
        sourceNote.links = parseLinks(nextSourceBody);
        sourceNote.updatedAt = new Date().toISOString();
        const sourceTab = state.tabs.find((item) => item.noteId === sourceNote.id);
        if (sourceTab) {
          sourceTab.body = nextSourceBody;
          sourceTab.savedBody = nextSourceBody;
          sourceTab.title = sourceNote.title;
          sourceTab.savedTitle = sourceNote.title;
          sourceTab.dirty = false;
        }
        try {
          const updatedSource = await updateNote(sourceNote.id, {
            title: sourceNote.title,
            body: sourceNote.body,
            status: sourceNote.status || "draft",
            originalityStatus: sourceNote.originalityStatus || undefined,
            originalitySimilarity: sourceNote.originalitySimilarity ?? undefined
          });
          if (updatedSource) Object.assign(sourceNote, mapNoteItem(updatedSource), { bodyLoaded: true });
        } catch (sourceError) {
          setStatus(`永久笔记已创建，但来源笔记标记保存失败：${String(sourceError?.message || sourceError)}`, "warn");
        }
      }
      activateModule("explorer");
      openNoteById(note.id, { preferTitleSelection: false });
      setStatus(`已记录永久笔记：${note.title || title}`, "ok");
    } catch (error) {
      setStatus(`记录永久笔记失败：${String(error?.message || error)}`, "bad");
    }
    return;
  }

  if (reason === "select-folder") {
    try {
      await syncNotesForDirectory(state.selectedFolderId);
      if (state.module === "graph") await refreshDirectoryGraph();
    } catch (error) {
      setStatus(`目录加载失败，保留本地数据：${String(error?.message || error)}`, "warn");
    }
    renderAll();
    return;
  }

  if (reason === "run-note-ai-analysis") {
    const noteId = String(payload.noteId || "").trim();
    if (!noteId) return false;
    try {
      setStatus("正在运行本地永久笔记 AI 分析...", "warn");
      const result = await analyzePermanentNote(noteId, {
        relatedNoteIds: Array.isArray(payload.relatedNoteIds) ? payload.relatedNoteIds : [],
        persistArtifacts: payload.persistArtifacts !== false
      });
      const artifactCount = Number(result?.reviewItems?.storedArtifactIds?.length || result?.reviewItems?.artifacts?.length || 0);
      aiInboxState.filters = normalizeAiInboxFilters({
        ...aiInboxState.filters,
        view: "pending",
        sourceNoteId: noteId
      });
      aiInboxState.detail = null;
      aiInboxState.selectedArtifactId = "";
      activateModule("aiInbox");
      await openAiInboxModule();
      setStatus(
        artifactCount
          ? `已生成 ${artifactCount} 条待审核 AI 建议，已按当前笔记打开 AI Inbox`
          : "本地 AI 分析完成，暂时没有新的待审核建议",
        artifactCount ? "ok" : "warn"
      );
      return result || true;
    } catch (error) {
      setStatus(`永久笔记 AI 分析失败：${String(error?.message || error)}`, "bad");
      return false;
    }
  }

  if (reason === "open-note-ai-inbox") {
    const noteId = String(payload.noteId || "").trim();
    if (!noteId) return false;
    aiInboxState.filters = normalizeAiInboxFilters({
      ...aiInboxState.filters,
      view: "pending",
      sourceNoteId: noteId
    });
    aiInboxState.detail = null;
    aiInboxState.selectedArtifactId = "";
    activateModule("aiInbox");
    await openAiInboxModule();
    setStatus("已打开当前笔记的待审 AI 建议", "ok");
    return true;
  }

  if (reason === "save-note-distillation") {
    const noteId = String(payload.noteId || "").trim();
    const note = state.notes.find((n) => n.id === noteId);
    if (!note) return false;
    try {
      const updated = await updatePermanentNoteDistillation(note.id, {
        thesis: payload.thesis || "",
        threeLineSummary: Array.isArray(payload.threeLineSummary) ? payload.threeLineSummary : [],
        distillationStatus: payload.distillationStatus || "draft"
      });
      if (updated) {
        Object.assign(note, mapNoteItem(updated), { bodyLoaded: true });
        const tab = state.tabs.find((item) => item.noteId === note.id);
        if (tab && typeof updated.body === "string") {
          tab.body = updated.body;
          tab.savedBody = updated.body;
          tab.title = updated.title || tab.title;
          tab.savedTitle = tab.title;
          tab.dirty = false;
        }
      }
      setStatus("提纯字段已保存", "ok");
      renderAll();
      return updated || true;
    } catch (error) {
      setStatus(`提纯字段保存失败：${String(error?.message || error)}`, "bad");
      return false;
    }
  }

  if (reason === "confirm-note-distillation") {
    const noteId = String(payload.noteId || "").trim();
    const note = state.notes.find((n) => n.id === noteId);
    if (!note) return false;
    try {
      const updated = await confirmPermanentNoteDistillation(note.id, {
        aiAssisted: Boolean(note.authorship?.ai_assisted)
      });
      if (updated) Object.assign(note, mapNoteItem(updated), { bodyLoaded: true });
      setStatus("提纯结果已确认", "ok");
      renderAll();
      return updated || true;
    } catch (error) {
      setStatus(`提纯确认失败：${String(error?.message || error)}`, "bad");
      return false;
    }
  }

  if (reason === "save-note") {
    const noteId = payload.noteId || state.tabs.find((t) => t.id === state.activeTabId)?.noteId || null;
    let savedNote = null;
    if (noteId) {
      const note = state.notes.find((n) => n.id === noteId);
      if (note && payload.title) {
        note.title = payload.title;
        note.body = replaceFirstMarkdownTitle(note.body, payload.title);
        const tab = state.tabs.find((t) => t.noteId === note.id);
        if (tab) {
          tab.title = note.title;
          tab.body = note.body;
          if (state.activeTabId === tab.id) editor.fillEditorFromTab();
        }
      }
      if (note) {
        try {
          note.generatedOriginalNoteId = noteGeneratedOriginalNoteId(note) || generatedOriginalNoteIdFromBody(note.body);
          const resolvedStatus =
            String(payload.status || "").trim() ||
            (payload.originalityStatus === "pass" ? "active" : note.status || "draft");
          note.status = resolvedStatus;
          const updated = await updateNote(note.id, {
            title: note.title,
            body: note.body,
            status: resolvedStatus,
            originalityStatus: payload.originalityStatus,
            originalitySimilarity: payload.originalitySimilarity,
            authorship: note.noteType === "original" ? note.authorship : undefined
          });
          if (updated) {
            note.title = updated.title || note.title;
            note.body = updated.body || note.body;
            note.status = updated.status || note.status;
            note.markdownPath = updated.markdownPath || note.markdownPath;
            note.originalityStatus = updated.originalityStatus || note.originalityStatus;
            note.originalitySimilarity = normalizeOptionalNumber(updated.originalitySimilarity ?? note.originalitySimilarity);
            note.authorship = normalizeAuthorshipItem(updated.authorship) || note.authorship;
            note.thesis = updated.thesis || note.thesis || "";
            note.threeLineSummary = Array.isArray(updated.threeLineSummary) ? updated.threeLineSummary : note.threeLineSummary || [];
            note.distillationStatus = updated.distillationStatus || note.distillationStatus || "";
            note.thinkingStatus = normalizeThinkingStatusItem(updated.thinkingStatus) || note.thinkingStatus || null;
            note.generatedOriginalNoteId = noteGeneratedOriginalNoteId(updated) || note.generatedOriginalNoteId || generatedOriginalNoteIdFromBody(note.body);
            note.boundaryOrCounterpoint = updated.boundaryOrCounterpoint || note.boundaryOrCounterpoint || "";
            note.updatedAt = updated.updatedAt || note.updatedAt;
            note.bodyLoaded = true;
            savedNote = updated;
          }
          if (note.noteType === "original") {
            setStatus(
              resolvedStatus === "active"
                ? "已同步到 Markdown，永久笔记已完成作者确认"
                : "已同步到 Markdown，但当前永久笔记仍按 draft 处理",
              resolvedStatus === "active" ? "ok" : "warn"
            );
          } else {
            setStatus("已同步到 Markdown", "ok");
          }
          if (state.module === "graph") await refreshDirectoryGraph();
	        } catch (error) {
            const feedback = noteSaveFailureFeedback(error);
	          setStatus(feedback.statusMessage, feedback.statusTone);
            renderAll();
            return feedback;
	        }
	      }
	    }
	    renderAll();
	    return savedNote || true;
	  }

  if (reason === "note-move") {
    try {
      const moved = await moveNote(payload.noteId, payload.directoryId);
      const note = state.notes.find((n) => n.id === payload.noteId);
      if (note && moved) {
        note.folderId = moved.directoryId || payload.directoryId;
        note.noteType = typeFromFolder(state, note.folderId);
        note.markdownPath = moved.markdownPath || note.markdownPath;
        note.updatedAt = moved.updatedAt || new Date().toISOString();
      }
      state.selectedFolderId = payload.directoryId;
      setStatus("已移动笔记并落盘", "ok");
    } catch (error) {
      setStatus(`移动失败：${String(error?.message || error)}`, "bad");
    }
    renderAll();
    return;
  }

  if (reason === "note-delete") {
    try {
      await deleteNote(payload.noteId);
      state.notes = state.notes.filter((n) => n.id !== payload.noteId);
      state.tabs = state.tabs.filter((t) => t.noteId !== payload.noteId);
      if (state.activeTabId && !state.tabs.find((t) => t.id === state.activeTabId)) {
        state.activeTabId = state.tabs[0]?.id || null;
      }
      setStatus("已删除笔记并落盘", "ok");
    } catch (error) {
      setStatus(`删除失败：${String(error?.message || error)}`, "bad");
    }
    renderAll();
    return;
  }

  if (reason === "directory-update") {
    const subtreeIds = descendantDirectoryIds(payload.directoryId);
    const currentFolder = state.folders.find((item) => item.id === payload.directoryId);
    try {
      const patch = { ...(payload.patch || {}) };
      if (patch.title && !patch.fsPath) {
        const nextFsPath = renamedDirectoryFsPath(currentFolder, patch.title);
        if (nextFsPath) patch.fsPath = nextFsPath;
      }
      const updated = await updateDirectory(payload.directoryId, patch);
      await syncDirectoriesFromApi();
      await syncLoadedNotesForDirectories(subtreeIds);
      const folder = state.folders.find((f) => f.id === payload.directoryId);
      if (folder && updated) state.browserRootId = rootBoxIdFromFolder(state, folder.id);
      setStatus("目录已更新并落盘", "ok");
    } catch (error) {
      setStatus(`目录更新失败：${String(error?.message || error)}`, "bad");
    }
    renderAll();
    return;
  }

  if (reason === "directory-delete") {
    try {
      await deleteDirectory(payload.directoryId);
      state.folders = state.folders.filter((f) => f.id !== payload.directoryId);
      if (state.selectedFolderId === payload.directoryId) {
        state.selectedFolderId = state.browserRootId;
      }
      setStatus("目录已删除并落盘", "ok");
    } catch (error) {
      setStatus(`目录删除失败：${String(error?.message || error)}`, "bad");
    }
    renderAll();
    return;
  }

  if (reason === "directory-move") {
    const subtreeIds = descendantDirectoryIds(payload.directoryId);
    const folder = state.folders.find((item) => item.id === payload.directoryId);
    const targetParent = folderById(state, payload.parentDirectoryId);
    try {
      const patch = { parentDirectoryId: payload.parentDirectoryId };
      const nextFsPath = movedDirectoryFsPath(folder, targetParent);
      if (nextFsPath) patch.fsPath = nextFsPath;
      const updated = await updateDirectory(payload.directoryId, patch);
      await syncDirectoriesFromApi();
      await syncLoadedNotesForDirectories(subtreeIds);
      if (updated) {
        state.selectedFolderId = payload.directoryId;
        state.browserRootId = rootBoxIdFromFolder(state, payload.directoryId);
      }
      setStatus("目录层级已更新并落盘", "ok");
    } catch (error) {
      setStatus(`目录移动失败：${String(error?.message || error)}`, "bad");
    }
    renderAll();
    return;
  }

  if (reason === "switch-tab" || reason === "folder-context-action" || reason === "file-context-action" || reason === "list-context-action") {
    if (reason === "switch-tab") syncExplorerContextToActiveTab();
    renderAll();
  }
}

const contextMenu = new ContextMenu($("contextMenu"));
const createBoxDialog = new CreateBoxDialog({
  maskEl: $("newBoxModal"),
  nameEl: $("modalBoxName"),
  parentEl: $("modalParentFolder"),
  fsPathEl: $("modalFsPath"),
  browseEl: $("modalBrowsePath"),
  maxEl: $("modalMaxCards"),
  cancelEl: $("modalCancel"),
  createEl: $("modalCreate"),
  onStatus: setStatus,
  pickDirectory: desktopCommands.browseDirectory
});

createBoxDialog.onCreate = async ({ name, parentId, fsPath, maxCards }) => {
  if (!name) return setStatus("请输入目录名称", "bad");
  const parentFolder = folderById(state, parentId);
  const resolvedPath = fsPath || joinFsPath(parentFolder?.fsPath || "", name);
  try {
    const created = await createDirectory({
      title: name,
      parentDirectoryId: parentId || null,
      directoryType: "custom",
      fsPath: resolvedPath,
      maxNotes: maxCards > 0 ? maxCards : 500
    });
    if (!created) throw new Error("创建目录失败");
    const folder = mapDirectoryItem(created);
    state.folders.push(folder);
    state.selectedFolderId = folder.id;
    state.browserRootId = rootBoxIdFromFolder(state, folder.id);
    createBoxDialog.hide();
    setStatus(`目录“${name}”已创建并落盘，路径：${resolvedPath}`, "ok");
    renderAll();
  } catch (error) {
    setStatus(`创建目录失败：${String(error?.message || error)}`, "bad");
  }
};

const explorer = new ExplorerPane({
  state,
  elements: {
    searchInput: $("searchInput"),
    toggleSearchBtn: $("btnToggleSearch"),
    openNewBoxBtn: $("btnOpenNewBoxDialog"),
    newNoteBtn: $("btnNewNote"),
    listArea: $("listArea")
  },
  contextMenu,
  createBoxDialog,
  onOpenNote: openNoteById,
  onStatus: setStatus,
  onStateChange: handleStateChange,
  pickDirectory: desktopCommands.browseDirectory,
  desktopFile: { revealPath: desktopCommands.revealInFileManager, openPath: desktopCommands.openDirectory },
  resolveNotePath
});

const editor = new EditorPane({
  state,
  elements: {
    tabs: $("tabs"),
    body: $("editorBody"),
    wysiwygHost: $("wysiwygHost"),
    editorHost: $("editorHost"),
    markdownSplit: $("markdownSplit"),
    emptyStart: $("editorEmptyStart"),
    literatureWorkspace: $("literatureWorkspace"),
    literatureTitle: $("literatureTitleInput"),
    literatureOriginal: $("literatureOriginalInput"),
    literatureParaphrase: $("literatureParaphraseInput"),
    literatureWhyKeep: $("literatureWhyKeepInput"),
    literatureSupportsJudgment: $("literatureSupportsJudgmentInput"),
    literatureQuestion: $("literatureQuestionInput"),
    literatureBoundary: $("literatureBoundaryInput"),
    literatureCompletionBadge: $("literatureCompletionBadge"),
    literatureCompletionHint: $("literatureCompletionHint"),
    literatureQueueNote: $("literatureQueueNote"),
    literatureQueueSummary: $("literatureQueueSummary"),
    literatureQueueList: $("literatureQueueList"),
    literatureOpenNext: $("btnLiteratureOpenNext"),
    previewPanel: $("markdownPreviewPanel"),
    preview: $("markdownPreview"),
    editorThinkingStatus: $("editorThinkingStatus"),
    assetPreviewMask: $("assetPreviewMask"),
    assetPreviewTitle: $("assetPreviewTitle"),
    assetPreviewBody: $("assetPreviewBody"),
    assetPreviewOpenLink: $("assetPreviewOpenLink"),
    closeAssetPreview: $("btnCloseAssetPreview"),
    editorWrap: $("markdownPanel")?.closest(".editor-wrap"),
    editorRelationsBelow: $("editorRelationsBelow"),
    relatedPanel: $("relatedPanel"),
    result: $("resultArea"),
    linkPicker: $("linkPicker"),
    linkSearchInput: $("linkSearchInput"),
    linkSearchList: $("linkSearchList"),
    linkManagerSelect: $("linkManagerSelect"),
    linkRelationTypeSelect: $("linkRelationTypeSelect"),
    linkReasonInput: $("linkReasonInput"),
    closeLinkPicker: $("btnCloseLinkPicker"),
    tagPicker: $("tagPicker"),
    tagSearchInput: $("tagSearchInput"),
    tagSearchList: $("tagSearchList"),
    closeTagPicker: $("btnCloseTagPicker"),
    originalityNotice: $("originalityNotice"),
    originalityNoticeTitle: $("originalityNoticeTitle"),
    originalityNoticeBody: $("originalityNoticeBody"),
    closeOriginalityNotice: $("btnCloseOriginalityNotice"),
    insertLink: $("btnInsertLink"),
    insertImage: $("btnInsertImage"),
    insertTag: $("btnInsertTag"),
    toolbarCommandBtn: $("btnToolbarCommandSearch"),
    toolbarCommandMenu: $("toolbarCommandMenu"),
    toolbarCommandSearchInput: $("toolbarCommandSearchInput"),
    toolbarCommandList: $("toolbarCommandList"),
    headingLevel: $("headingLevelSelect"),
    assetImageInput: $("assetImageInput"),
    assetFileInput: $("assetFileInput"),
    modeEdit: $("btnModeToggle"),
    modeSplit: $("btnModeSplit"),
    modePreview: $("btnModeToggle"),
    showRelated: $("btnShowRelated"),
    hideRelated: $("btnHideRelated"),
    completeNote: $("btnCompleteNote"),
    save: $("btnSave"),
    statusHint: $("statusHint"),
    authorshipPanel: $("authorshipPanel"),
    authorshipClaimInput: $("authorshipClaimInput"),
    authorshipConfirm: $("authorshipConfirm"),
    authorshipHint: $("authorshipHint"),
    openExternalUrl: desktopCommands.openExternalUrl
  },
  onStatus: setStatus,
  onStateChange: handleStateChange,
  onOpenNote: openNoteById,
  onChromeChange: () => {
    renderStatusMeta();
    renderWorkspaceStatusHint();
  }
});
window.__prototypeEditor = editor;
window.__prototypeState = state;

$("btnFocusMode")?.addEventListener("click", () => {
  state.focusMode = !state.focusMode;
  applyFocusModeChrome();
  editor.setFocusMode(state.focusMode);
  setStatus(state.focusMode ? "已开启专注模式" : "已退出专注模式", "ok", { requireModule: "explorer" });
  renderWorkspaceStatusHint();
});

$("btnDismissEditorHelper")?.addEventListener("click", () => {
  editorHelperDismissed = true;
  hideEditorHelper();
});

$("btnEditorHelperAction")?.addEventListener("click", () => {
  const button = $("btnEditorHelperAction");
  const helperAction = String(button?.dataset.helperAction || "noop").trim();
  const targetNoteId = String(button?.dataset.targetNoteId || "").trim();
  if (helperAction === "noop") {
    editorHelperDismissed = true;
    hideEditorHelper();
    return;
  }
  if (helperAction === "open-generated-original" && targetNoteId) {
    const opened = openNoteById(targetNoteId, { preferTitleSelection: false });
    if (opened) {
      setStatus("已打开对应永久笔记", "ok", { requireModule: "explorer" });
      return;
    }
    setStatus("没有找到对应永久笔记", "warn", { requireModule: "explorer" });
    return;
  }
  setStatus("已记录当前建议，你可以继续编辑", "ok", { requireModule: "explorer" });
});

$("settingsRefreshVault")?.addEventListener("click", async () => {
  try {
    await refreshVaultSettings();
    setStatus("已刷新当前 Vault 信息", "ok");
  } catch (error) {
    setStatus(`刷新 Vault 信息失败：${String(error?.message || error)}`, "bad");
  }
});

$("btnEditorHelperMute")?.addEventListener("click", () => {
  editorHelperDismissed = true;
  editorHelperMuted = true;
  writeStoredBoolean(EDITOR_HELPER_MUTE_KEY, true);
  hideEditorHelper();
  setStatus("后续将不再显示这类编辑提示", "ok", { requireModule: "explorer" });
});

$("settingsBrowseVault")?.addEventListener("click", async () => {
  const picked = await desktopCommands.pickVaultDirectory({ defaultPath: $("settingsVaultPath")?.value || settingsState.vault?.vaultPath || "" });
  if (picked.path) {
    $("settingsVaultPath").value = picked.path;
    setStatus(`已选择 Vault 路径（${picked.source}）`, "ok");
  }
});

$("settingsSwitchVault")?.addEventListener("click", async () => {
  const vaultPath = String($("settingsVaultPath")?.value || "").trim();
  if (!vaultPath) return setStatus("请先选择或输入 Vault 路径", "warn");
  if (!editor.confirmDiscardDirtyTabs("切换 Vault 会关闭当前所有打开的笔记，未同步更改会丢失。是否继续？")) return;
  try {
    const vault = await desktopCommands.switchVault(vaultPath);
    settingsState.vault = vault;
    state.notes = [];
    state.tabs = [];
    state.activeTabId = null;
    state.selectedFileId = null;
    await syncDirectoriesFromApi();
    state.browserRootId = "dir_original_default";
    state.selectedFolderId = "dir_original_default";
    await syncNotesForDirectory(state.selectedFolderId);
    renderAll();
    setStatus(`已切换并初始化 Vault：${vault.vaultPath}`, "ok");
  } catch (error) {
    setStatus(`切换 Vault 失败：${String(error?.message || error)}`, "bad");
  }
});

$("settingsAiRuntimeMode")?.addEventListener("change", async (event) => {
  const next = normalizeAiRuntimeMode(event?.target?.value || "auto");
  const defaults = aiDefaultsForRuntimeMode(next);
  settingsState.ai.runtimeMode = next;
  settingsState.ai.userMode = defaults.userMode;
  settingsState.ai.modelPack = defaults.modelPack;
  settingsState.ai.routePreview = null;
  settingsState.ai.providerConfigError = "";
  settingsState.ai.providerHealthResult = null;
  if (next === "local_only" || next === "hybrid") {
    settingsState.ai.providerEndpointUrl = OLLAMA_CHAT_ENDPOINT_URL;
    settingsState.ai.providerHealthEndpointUrl = OLLAMA_HEALTH_ENDPOINT_URL;
    settingsState.ai.secretRef = "";
    if (settingsState.ai.localModel) applyOllamaLocalModelDefaults();
    else if (settingsState.ai.advancedModelRef && !settingsState.ai.advancedModelRef.startsWith("local_private_gateway:")) settingsState.ai.advancedModelRef = "";
  } else if (settingsState.ai.advancedModelRef.startsWith("local_private_gateway:")) {
    settingsState.ai.advancedModelRef = "";
  }
  persistAiSettingsToStorage();
  await syncAiSettingsToApi();
  if ((next === "local_only" || next === "hybrid") && !settingsState.ai.localRuntimeModels.length) {
    await detectOllamaModels({ silent: true, render: false });
  }
  if ((next === "local_only" || next === "hybrid") && settingsState.ai.localModel) {
    await saveLocalOllamaProviderConfig();
  }
  await refreshAiRoutePreview();
  renderSettingsPanel();
  setStatus(`AI 运行模式已切换为：${next}`, "ok");
});

$("settingsAiUserMode")?.addEventListener("change", (event) => {
  const next = String(event?.target?.value || "Auto").trim() || "Auto";
  settingsState.ai.userMode = next;
  persistAiSettingsToStorage();
  syncAiSettingsToApi();
  refreshAiRoutePreview();
  renderSettingsPanel();
  setStatus(`AI 模式已切换为：${next}`, "ok");
});

$("settingsAiModelPack")?.addEventListener("change", (event) => {
  const next = String(event?.target?.value || "Starter Auto").trim() || "Starter Auto";
  applyAiModelPackChange(next, { source: "settings" });
  return;
  settingsState.ai.modelPack = next;
  if (next === "Privacy First") settingsState.ai.runtimeMode = "local_only";
  else if (settingsState.ai.runtimeMode === "local_only") settingsState.ai.runtimeMode = "auto";
  settingsState.ai.routePreview = null;
  settingsState.ai.providerEndpointUrl = "";
  settingsState.ai.providerHealthEndpointUrl = "";
  settingsState.ai.secretRef = "";
  if (settingsState.ai.runtimeMode === "local_only" && settingsState.ai.localModel) applyOllamaLocalModelDefaults();
  settingsState.ai.providerConfigError = "";
  settingsState.ai.providerHealthResult = null;
  applyActiveAiProviderConfigToState();
  persistAiSettingsToStorage();
  syncAiSettingsToApi();
  refreshAiRoutePreview();
  renderSettingsPanel();
  setStatus(`AI 模型包已切换为：${next}`, "ok");
});

$("settingsAiLocalModel")?.addEventListener("change", async (event) => {
  const next = String(event?.target?.value || "").trim();
  settingsState.ai.localModel = next;
  settingsState.ai.routePreview = null;
  if (next) applyOllamaLocalModelDefaults();
  persistAiSettingsToStorage();
  await syncAiSettingsToApi();
  if (next && ["local_only", "hybrid"].includes(normalizeAiRuntimeMode(settingsState.ai.runtimeMode))) {
    await saveLocalOllamaProviderConfig();
    await refreshAiRoutePreview();
  } else {
    await refreshAiRoutePreview();
  }
  renderSettingsPanel();
  setStatus(next ? `本地模型已选择：${next}` : "本地模型选择已清空。", "ok");
});

$("settingsAiAdvancedModelRef")?.addEventListener("blur", (event) => {
  const next = String(event?.target?.value || "").trim();
  settingsState.ai.advancedModelRef = next;
  persistAiSettingsToStorage();
  syncAiSettingsToApi();
  refreshAiRoutePreview();
  renderSettingsPanel();
  setStatus(next ? "AI 高级模型 ID 已保存" : "AI 高级模型 ID 已清空（恢复自动选择）", "ok");
});

$("settingsAiSecretRef")?.addEventListener("blur", (event) => {
  const next = String(event?.target?.value || "").trim();
  settingsState.ai.secretRef = next;
  persistAiSettingsToStorage();
  syncAiSettingsToApi();
  refreshAiRoutePreview();
  renderSettingsPanel();
  setStatus(next ? "AI 密钥引用已保存" : "AI 密钥引用已清空", "ok");
});

$("settingsAiSecretRef")?.addEventListener("input", (event) => {
  settingsState.ai.secretRef = String(event?.target?.value || "").trim();
  settingsState.ai.providerConfigError = "";
  settingsState.ai.providerHealthResult = null;
  persistAiSettingsToStorage();
});

$("settingsAiProviderEndpointUrl")?.addEventListener("input", (event) => {
  settingsState.ai.providerEndpointUrl = String(event?.target?.value || "").trim();
  settingsState.ai.providerConfigError = "";
  settingsState.ai.providerHealthResult = null;
  persistAiSettingsToStorage();
});

$("settingsAiProviderEndpointUrl")?.addEventListener("blur", (event) => {
  const next = String(event?.target?.value || "").trim();
  settingsState.ai.providerEndpointUrl = next;
  persistAiSettingsToStorage();
  renderSettingsPanel();
});

$("settingsAiTestPrompt")?.addEventListener("input", (event) => {
  settingsState.ai.testPrompt = String(event?.target?.value || "");
  persistAiSettingsToStorage();
});

$("btnAiTestChatRun")?.addEventListener("click", async () => {
  const prompt = String($("settingsAiTestPrompt")?.value || settingsState.ai.testPrompt || "").trim();
  if (!prompt) return setStatus("先输入一条 Test Prompt", "warn");
  settingsState.ai.testRunning = true;
  settingsState.ai.testMeta = "";
  settingsState.ai.testOutput = "";
  renderSettingsPanel();
  try {
    const result = await runAiTestChat({
      prompt,
      userMode: settingsState.ai.userMode,
      modelPack: settingsState.ai.modelPack,
      modelTier: "standard",
      privacyMode: settingsState.ai.routePreview?.privacy?.mode || ""
    });
    settingsState.ai.testMeta = `${result?.providerId || "provider"} / ${result?.modelRef || "model"} (${result?.status || "unknown"})`;
    settingsState.ai.testOutput = String(result?.output?.content || "").trim() || JSON.stringify(result?.output?.json || result || {}, null, 2);
    setStatus("AI Test Run 已完成", "ok");
  } catch (error) {
    settingsState.ai.testMeta = "运行失败";
    settingsState.ai.testOutput = String(error?.message || error);
    setStatus(`AI Test Run 失败：${settingsState.ai.testOutput}`, "bad");
  } finally {
    settingsState.ai.testRunning = false;
    renderSettingsPanel();
  }
});

$("btnAiTestChatCopy")?.addEventListener("click", async () => {
  const text = String(settingsState.ai.testOutput || "").trim();
  if (!text) return setStatus("没有可复制的输出", "warn");
  try {
    await navigator.clipboard.writeText(text);
    setStatus("已复制输出", "ok");
  } catch {
    setStatus("复制失败（浏览器权限限制）", "warn");
  }
});

$("settingsAiProviderHealthEndpointUrl")?.addEventListener("input", (event) => {
  settingsState.ai.providerHealthEndpointUrl = String(event?.target?.value || "").trim();
  settingsState.ai.providerConfigError = "";
  settingsState.ai.providerHealthResult = null;
  persistAiSettingsToStorage();
});

$("settingsAiProviderHealthEndpointUrl")?.addEventListener("blur", (event) => {
  const next = String(event?.target?.value || "").trim();
  settingsState.ai.providerHealthEndpointUrl = next;
  persistAiSettingsToStorage();
  renderSettingsPanel();
});

$("settingsAiSaveProviderConfig")?.addEventListener("click", async () => {
  await syncAiProviderConfigToApi();
});

$("settingsAiCheckProviderHealth")?.addEventListener("click", async () => {
  await checkCurrentAiProviderHealth();
});

$("settingsAiDetectOllama")?.addEventListener("click", async () => {
  await detectOllamaModels();
});

$("settingsAiPullOllamaModel")?.addEventListener("click", async () => {
  await pullRecommendedOllamaModel();
});

$("settingsScheduledTasksPanel")?.addEventListener("click", async (event) => {
  if (event.target.closest("#btnScheduledTasksApplyFilters")) {
    settingsState.ai.scheduledTaskFilters = scheduledTaskFiltersFromUi();
    await refreshScheduledTasks();
    setStatus("Scheduled tasks refreshed", "ok");
    return;
  }

  if (event.target.closest("#btnScheduledTasksRefresh")) {
    await refreshScheduledTasks();
    setStatus("Scheduled tasks refreshed", "ok");
    return;
  }

  if (event.target.closest("#btnScheduledTasksRunDue")) {
    await runDueScheduledTasksFromUi();
    return;
  }

  if (event.target.closest("#btnScheduledTaskUseCurrentNote")) {
    const noteId = String(state.selectedFileId || state.activeTabId || "").trim();
    if (!noteId) return setStatus("No current note selected", "warn");
    settingsState.ai.scheduledTaskForm = {
      ...scheduledTaskFormFromUi(),
      noteIdsText: noteId,
      directoryIdsText: ""
    };
    renderScheduledTasksWorkspace();
    return;
  }

  if (event.target.closest("#btnScheduledTaskUseCurrentDirectory")) {
    const directoryId = String(state.selectedFolderId || "").trim();
    if (!directoryId) return setStatus("No current directory selected", "warn");
    settingsState.ai.scheduledTaskForm = {
      ...scheduledTaskFormFromUi(),
      noteIdsText: "",
      directoryIdsText: directoryId
    };
    renderScheduledTasksWorkspace();
    return;
  }

  if (event.target.closest("#btnScheduledTaskClearForm")) {
    resetScheduledTaskForm();
    setStatus("Scheduled task draft reset", "ok");
    return;
  }

  if (event.target.closest("#btnScheduledTaskSave")) {
    await saveScheduledTaskFromUi();
    return;
  }

  const editButton = event.target.closest("[data-scheduled-task-edit]");
  if (editButton) {
    editScheduledTaskFromList(editButton.getAttribute("data-scheduled-task-edit"));
    return;
  }

  const statusButton = event.target.closest("[data-scheduled-task-status]");
  if (statusButton) {
    await setScheduledTaskStatus(
      statusButton.getAttribute("data-scheduled-task-id"),
      statusButton.getAttribute("data-scheduled-task-status")
    );
  }
});

$("settingsScheduledTasksPanel")?.addEventListener("input", (event) => {
  if (!event.target.closest("#scheduledTaskForm")) return;
  settingsState.ai.scheduledTaskForm = scheduledTaskFormFromUi();
});

$("settingsScheduledTasksPanel")?.addEventListener("change", (event) => {
  if (!event.target.closest("#scheduledTaskForm")) return;
  settingsState.ai.scheduledTaskForm = scheduledTaskFormFromUi();
  if (event.target.closest("#scheduledTaskTemplateSelect")) {
    applyScheduledTaskTemplateToForm(event.target.value);
  }
});

$("settingsCopyFeedbackDiagnostics")?.addEventListener("click", async () => {
  try {
    await copyTextToClipboard(buildFeedbackDiagnosticText());
    setStatus("已复制反馈诊断信息", "ok");
  } catch (error) {
    setStatus(`复制反馈诊断信息失败：${String(error?.message || error)}`, "bad");
  }
});

$("settingsOpenBugReport")?.addEventListener("click", async () => {
  if (!FEEDBACK_REPOSITORY_READY) {
    setStatus("反馈仓库还没绑定，先把 FEEDBACK_REPOSITORY 改成真实 owner/repo", "warn");
    return;
  }
  if (await openFeedbackUrl(buildFeedbackUrl("bug"))) {
    setStatus("已打开问题反馈入口", "ok");
    return;
  }
  setStatus("没有成功打开反馈入口，请检查浏览器是否拦截了新窗口", "warn");
});

$("settingsOpenFeatureRequest")?.addEventListener("click", async () => {
  if (!FEEDBACK_REPOSITORY_READY) {
    setStatus("反馈仓库还没绑定，先把 FEEDBACK_REPOSITORY 改成真实 owner/repo", "warn");
    return;
  }
  if (await openFeedbackUrl(buildFeedbackUrl("feature"))) {
    setStatus("已打开功能建议入口", "ok");
    return;
  }
  setStatus("没有成功打开建议入口，请检查浏览器是否拦截了新窗口", "warn");
});

window.addEventListener("beforeunload", (event) => {
  if (!editor.hasDirtyTabs()) return;
  event.preventDefault();
  event.returnValue = "";
});

$("btnWritingUseCurrent")?.addEventListener("click", () => {
  const note = state.notes.find((item) => item.id === state.selectedFileId);
  if (!note) return setStatus("请先在左侧选择一条永久笔记", "warn");
if (!isWritingEligibleNote(note)) return setStatus("写作篮只接受永久笔记，请先切到永久笔记目录选择笔记", "warn");
  clearWritingSourceIndexIds();
  addWritingBasketIds([note.id]);
  if (!$("writingTitle")?.value.trim()) $("writingTitle").value = note.title || "新的写作项目";
  renderWritingPanel();
  setStatus(`已加入写作篮子：${note.title}`, "ok");
});

$("btnWritingAddVisible")?.addEventListener("click", () => {
  const candidates = writingCandidateNotes();
  if (!candidates.length) return setStatus("当前目录没有可加入的永久笔记", "warn");
  clearWritingSourceIndexIds();
  addWritingBasketIds(candidates.map((note) => note.id));
  renderWritingPanel();
  setStatus(`已把当前目录观点加入写作篮：${candidates.length} 条`, "ok");
});

$("btnWritingClearBasket")?.addEventListener("click", () => {
  clearWritingBasket();
  clearWritingSourceIndexIds();
  writingState.project = null;
  writingState.scaffold = null;
  writingState.scaffoldMarkdown = "";
  writingState.scaffoldVersions = [];
  writingState.draftVersions = [];
  renderWritingPanel();
  showWritingResult("已清空写作篮。");
  setStatus("已清空写作篮", "ok");
});

$("btnWritingStrongModelAnalysis")?.addEventListener("click", async () => {
  await prepareWritingStrongModelAnalysis();
});

$("writingCandidateList")?.addEventListener("click", (event) => {
  const button = event.target?.closest?.("[data-writing-action]");
  if (!button) return;
  const action = String(button.getAttribute("data-writing-action") || "");
  const noteId = String(button.getAttribute("data-writing-note-id") || "");
  if (!noteId) return;
  if (action === "add") {
    clearWritingSourceIndexIds();
    addWritingBasketIds([noteId]);
    renderWritingPanel();
    setStatus(`已加入写作篮：${noteId}`, "ok");
    return;
  }
  if (action === "remove") {
    clearWritingSourceIndexIds();
    removeWritingBasketId(noteId);
    renderWritingPanel();
    setStatus(`已移出写作篮：${noteId}`, "ok");
    return;
  }
  if (action === "open") {
    openNoteById(noteId);
    setStatus(`已打开永久笔记：${noteId}`, "ok");
  }
});

$("writingBasketList")?.addEventListener("click", (event) => {
  const button = event.target?.closest?.("[data-writing-action]");
  if (!button) return;
  const action = String(button.getAttribute("data-writing-action") || "");
  const noteId = String(button.getAttribute("data-writing-note-id") || "");
  if (!noteId) return;
  if (action === "remove") {
    clearWritingSourceIndexIds();
    removeWritingBasketId(noteId);
    renderWritingPanel();
    setStatus(`已移出写作篮：${noteId}`, "ok");
    return;
  }
  if (action === "open") {
    openNoteById(noteId);
    setStatus(`已打开永久笔记：${noteId}`, "ok");
  }
});

$("btnWritingRefreshThemeIndexes")?.addEventListener("click", async () => {
  try {
    await loadWritingThemeIndexes();
    setStatus("已刷新主题索引", "ok");
  } catch (error) {
    setStatus(`刷新主题索引失败：${String(error?.message || error)}`, "bad");
  }
});

$("btnWritingSaveThemeIndex")?.addEventListener("click", async () => {
  try {
    const card = await saveWritingBasketAsThemeIndex();
    if (!card) return;
    setStatus(`已保存主题索引：${card.title}`, "ok");
  } catch (error) {
    setStatus(`保存主题索引失败：${String(error?.message || error)}`, "bad");
  }
});

$("writingThemeIndexList")?.addEventListener("click", async (event) => {
  const button = event.target?.closest?.("[data-writing-index-action]");
  if (!button) return;
  const action = String(button.getAttribute("data-writing-index-action") || "");
  const indexId = String(button.getAttribute("data-writing-index-id") || "");
  if (!indexId) return;
  if (action === "use") {
    try {
      const { indexCard, noteIds } = await useThemeIndexAsWritingEntry(indexId, { replaceBasket: true });
      setStatus(`已从主题索引进入写作篮：${indexCard.title || indexId}（${noteIds.length} 条）`, "ok");
    } catch (error) {
      setStatus(`使用主题索引失败：${String(error?.message || error)}`, "bad");
    }
  }
});

$("writingProjectsList")?.addEventListener("click", async (event) => {
  const button = event.target?.closest?.("[data-writing-project-action]");
  if (!button) return;
  const action = String(button.getAttribute("data-writing-project-action") || "");
  const projectId = String(button.getAttribute("data-writing-project-id") || "");
  if (!projectId) return;
  if (action === "open") {
    try {
      await openWritingProject(projectId);
      setStatus(`已恢复写作项目：${projectId}`, "ok");
    } catch (error) {
      setStatus(`打开写作项目失败：${String(error?.message || error)}`, "bad");
    }
    return;
  }

  const project = writingState.projects.find((item) => item.id === projectId) || { id: projectId };
  if (action === "copy-scaffold") {
    try {
      const result = await copyWritingScaffold(project);
      setStatus(`已复制 Scaffold Markdown：${result.fileName}`, "ok");
    } catch (error) {
      setStatus(`复制 Scaffold 失败：${String(error?.message || error)}`, "bad");
    }
    return;
  }
  if (action === "export-scaffold") {
    try {
      const result = await exportWritingScaffold(project);
      setStatus(`已导出 Scaffold Markdown：${result.fileName}`, "ok");
    } catch (error) {
      setStatus(`导出 Scaffold 失败：${String(error?.message || error)}`, "bad");
    }
  }
});

$("writingScaffoldVersionsList")?.addEventListener("click", async (event) => {
  const button = event.target?.closest?.("[data-writing-scaffold-action]");
  if (!button) return;
  const action = String(button.getAttribute("data-writing-scaffold-action") || "");
  const scaffoldId = String(button.getAttribute("data-writing-scaffold-id") || "");
  if (!scaffoldId) return;
  const version = writingState.scaffoldVersions.find((item) => item.id === scaffoldId) || { id: scaffoldId, writing_project_id: writingState.project?.id };

  if (action === "open") {
    try {
      await openScaffoldVersion(scaffoldId);
      setStatus(`已切换到 scaffold 版本：${scaffoldId}`, "ok");
    } catch (error) {
      setStatus(`打开 scaffold 版本失败：${String(error?.message || error)}`, "bad");
    }
    return;
  }

  const projectLike = {
    ...(writingState.project || {}),
    id: writingState.project?.id || version.writing_project_id,
    scaffold_id: scaffoldId
  };
  if (action === "copy") {
    try {
      const result = await copyWritingScaffold(projectLike);
      setStatus(`已复制 Scaffold Markdown：${result.fileName}`, "ok");
    } catch (error) {
      setStatus(`复制 Scaffold 失败：${String(error?.message || error)}`, "bad");
    }
    return;
  }
  if (action === "export") {
    try {
      const result = await exportWritingScaffold(projectLike);
      setStatus(`已导出 Scaffold Markdown：${result.fileName}`, "ok");
    } catch (error) {
      setStatus(`导出 Scaffold 失败：${String(error?.message || error)}`, "bad");
    }
    return;
  }
  if (action === "edit-note") {
    const nextNote = promptVersionNoteEdit(version?.version_note || "", "Scaffold 版本");
    if (nextNote === null) return;
    try {
      const updated = await updateDraftScaffoldVersionNote(scaffoldId, nextNote);
      writingState.scaffoldVersions = writingState.scaffoldVersions.map((item) =>
        item.id === scaffoldId ? { ...item, version_note: updated?.version_note || "" } : item
      );
      if (writingState.scaffold?.id === scaffoldId) {
        writingState.scaffold = {
          ...writingState.scaffold,
          version_note: updated?.version_note || ""
        };
      }
      renderWritingPanel();
      setStatus(`已更新 scaffold 版本说明：${scaffoldId}`, "ok");
    } catch (error) {
      setStatus(`更新 scaffold 版本说明失败：${String(error?.message || error)}`, "bad");
    }
  }
});

$("writingDraftVersionsList")?.addEventListener("click", async (event) => {
  const button = event.target?.closest?.("[data-writing-draft-action]");
  if (!button) return;
  const action = String(button.getAttribute("data-writing-draft-action") || "");
  const draftNoteId = String(button.getAttribute("data-writing-draft-note-id") || "");
  const draftVersionId = String(button.getAttribute("data-writing-draft-version-id") || "");
  if (!draftNoteId) return;
  if (action === "edit-note") {
    const version = writingState.draftVersions.find((item) => item.id === draftVersionId) || null;
    const nextNote = promptVersionNoteEdit(version?.version_note || "", "草稿版本");
    if (nextNote === null) return;
    try {
      const updated = await updateDraftNoteVersionNote(draftVersionId, nextNote);
      writingState.draftVersions = writingState.draftVersions.map((item) =>
        item.id === draftVersionId ? { ...item, version_note: updated?.version_note || "" } : item
      );
      renderWritingPanel();
      setStatus(`已更新草稿版本说明：${draftVersionId}`, "ok");
    } catch (error) {
      setStatus(`更新草稿版本说明失败：${String(error?.message || error)}`, "bad");
    }
    return;
  }
  if (action === "set-current") {
    try {
      const project = await setWritingCurrentDraftNote(writingState.project?.id, draftNoteId);
      writingState.project = project;
      await loadWritingProjectsList();
      await loadWritingDraftVersions();
      renderWritingPanel();
      setStatus(`已将草稿版本设为当前：${draftNoteId}`, "ok");
    } catch (error) {
      setStatus(`设为当前草稿失败：${String(error?.message || error)}`, "bad");
    }
    return;
  }
  if (action === "open") {
    try {
      if (!writingNoteById(draftNoteId)) {
        const fetched = await fetchNote(draftNoteId);
        if (fetched) state.notes = [mapNoteItem(fetched), ...state.notes.filter((item) => item.id !== draftNoteId)];
      }
      activateModule("explorer");
      openNoteById(draftNoteId);
      setStatus(`已打开草稿版本：${draftNoteId}`, "ok");
    } catch (error) {
      setStatus(`打开草稿版本失败：${String(error?.message || error)}`, "bad");
    }
  }
});

$("btnWritingRefreshProjects")?.addEventListener("click", async () => {
  try {
    syncWritingProjectFiltersFromUi();
    await loadWritingProjectsList();
    setStatus("已刷新最近项目", "ok");
  } catch (error) {
    setStatus(`刷新项目失败：${String(error?.message || error)}`, "bad");
  }
});

$("writingProjectsSearch")?.addEventListener("input", async () => {
  try {
    syncWritingProjectFiltersFromUi();
    await loadWritingProjectsList();
  } catch {}
});

$("writingProjectsStatusFilter")?.addEventListener("change", async () => {
  try {
    syncWritingProjectFiltersFromUi();
    await loadWritingProjectsList();
  } catch {}
});

$("writingProjectsDraftFilter")?.addEventListener("change", async () => {
  try {
    syncWritingProjectFiltersFromUi();
    await loadWritingProjectsList();
  } catch {}
});

$("btnWritingRefreshScaffolds")?.addEventListener("click", async () => {
  try {
    await loadWritingScaffoldVersions();
    setStatus("已刷新 scaffold 版本", "ok");
  } catch (error) {
    setStatus(`刷新 scaffold 版本失败：${String(error?.message || error)}`, "bad");
  }
});

$("btnWritingRefreshDraftVersions")?.addEventListener("click", async () => {
  try {
    await loadWritingDraftVersions();
    setStatus("已刷新草稿版本", "ok");
  } catch (error) {
    setStatus(`刷新草稿版本失败：${String(error?.message || error)}`, "bad");
  }
});

$("btnWritingCreateProject")?.addEventListener("click", async () => {
  const title = String($("writingTitle")?.value || "").trim();
  const basketNoteIds = parseWritingBasketIds();
  const relatedIndexIds = uniqueStrings(writingState.sourceIndexIds);
  if (!title) return setStatus("请先填写写作项目标题", "warn");
  if (!basketNoteIds.length) return setStatus("请先加入至少一条永久笔记", "warn");
  try {
    const project = await createWritingProject({
      title,
      goal: String($("writingGoal")?.value || "").trim(),
      audience: String($("writingAudience")?.value || "").trim(),
      tone: String($("writingTone")?.value || "").trim(),
      basketNoteIds,
      relatedIndexIds
    });
    writingState.project = project;
    writingState.scaffold = null;
    writingState.scaffoldMarkdown = "";
    showWritingResult({
      stage: "writing_project",
      writingProjectId: project?.id,
      title: project?.title,
      relatedIndexIds: project?.related_index_ids,
      basketNoteIds: project?.basket_note_ids,
      basketNotes: project?.basket_notes
    });
    await loadWritingProjectsList();
    await loadWritingScaffoldVersions();
    await loadWritingDraftVersions();
    renderWritingPanel();
    setStatus(`写作项目已创建：${project?.id}`, "ok");
  } catch (error) {
    showWritingResult({
      stage: "writing_project_error",
      message: String(error?.message || error),
      code: error?.code || null,
      details: error?.details || null
    });
    setStatus(`写作项目创建失败：${String(error?.message || error)}`, "bad");
  }
});

$("btnWritingCreateScaffold")?.addEventListener("click", async () => {
  const writingProjectId = writingState.project?.id;
  if (!writingProjectId) return setStatus("请先创建写作项目", "warn");
  try {
    const result = await createDraftScaffold(writingProjectId, currentWritingVersionNote());
    writingState.scaffold = result.item || null;
    writingState.scaffoldMarkdown = result.export?.markdown || "";
    if (writingState.project) {
      const returnedProject = result.item?.writing_project || null;
      writingState.project = {
        ...writingState.project,
        ...(returnedProject || {}),
        scaffold_id: returnedProject?.scaffold_id || result.item?.id || null
      };
    }
    showWritingResult({
      stage: "draft_scaffold",
      writingProjectId,
      draftScaffoldId: result.item?.id,
      sections: result.item?.sections,
      markdown: result.export?.markdown,
      versionNote: result.item?.version_note || ""
    });
    await loadWritingProjectsList();
    await loadWritingScaffoldVersions();
    await loadWritingDraftVersions();
    renderWritingPanel();
    setStatus(`草稿骨架已生成：${result.item?.id}`, "ok");
  } catch (error) {
    showWritingResult({
      stage: "draft_scaffold_error",
      writingProjectId,
      message: String(error?.message || error),
      code: error?.code || null,
      details: error?.details || null
    });
    setStatus(`草稿骨架生成失败：${String(error?.message || error)}`, "bad");
  }
});

$("btnWritingCopyScaffold")?.addEventListener("click", async () => {
  try {
    const result = await copyWritingScaffold();
    setStatus(`已复制 Scaffold Markdown：${result.fileName}`, "ok");
  } catch (error) {
    showWritingResult({
      stage: "writing_copy_scaffold_error",
      writingProjectId: writingState.project?.id,
      draftScaffoldId: writingState.scaffold?.id,
      message: String(error?.message || error),
      code: error?.code || null
    });
    setStatus(`复制 Scaffold 失败：${String(error?.message || error)}`, "bad");
  }
});

$("btnWritingExportScaffold")?.addEventListener("click", async () => {
  try {
    const result = await exportWritingScaffold();
    setStatus(`已导出 Scaffold Markdown：${result.fileName}`, "ok");
  } catch (error) {
    showWritingResult({
      stage: "writing_export_scaffold_error",
      writingProjectId: writingState.project?.id,
      draftScaffoldId: writingState.scaffold?.id,
      message: String(error?.message || error),
      code: error?.code || null
    });
    setStatus(`导出 Scaffold 失败：${String(error?.message || error)}`, "bad");
  }
});

$("btnWritingSaveDraft")?.addEventListener("click", async () => {
  if (!writingState.scaffold || !String(writingState.scaffoldMarkdown || "").trim()) {
    showWritingResult({
      stage: "writing_draft_note_error",
      message: "scaffold is required before creating a draft note",
      code: "WRITING_DRAFT_INVALID"
    });
    return setStatus("请先生成草稿骨架", "warn");
  }

  const directoryId = writingDraftDirectoryId();
  const body = writingDraftBody();
  try {
    const created = await createNote({
      directoryId,
      status: "draft",
      body
    });
    const project = await bindWritingDraftNote(
      writingState.project?.id,
      created?.id,
      writingState.scaffold?.id,
      currentWritingVersionNote()
    );
    writingState.project = project;
    const note = mapNoteItem({
      ...created,
      body: typeof created?.body === "string" ? created.body : body
    });
    state.notes = [note, ...state.notes.filter((item) => item.id !== note.id)];
    showWritingResult({
      stage: "writing_draft_note",
      writingProjectId: project?.id || writingState.project?.id,
      draftScaffoldId: writingState.scaffold?.id,
      noteId: note.id,
      directoryId,
      title: note.title
    });
    await loadWritingProjectsList();
    await loadWritingScaffoldVersions();
    await loadWritingDraftVersions();
    activateModule("explorer");
    openNoteById(note.id);
    setStatus(`已创建草稿笔记：${note.title}`, "ok");
  } catch (error) {
    showWritingResult({
      stage: "writing_draft_note_error",
      writingProjectId: writingState.project?.id,
      draftScaffoldId: writingState.scaffold?.id,
      message: String(error?.message || error),
      code: error?.code || null,
      details: error?.details || null
    });
    setStatus(`草稿笔记创建失败：${String(error?.message || error)}`, "bad");
  }
});

$("btnWritingOpenDraft")?.addEventListener("click", async () => {
  const draftNoteId = String(writingState.project?.draft_note_id || "").trim();
  if (!draftNoteId) return setStatus("当前项目还没有绑定草稿笔记", "warn");
  try {
    if (!writingNoteById(draftNoteId)) {
      const fetched = await fetchNote(draftNoteId);
      if (fetched) state.notes = [mapNoteItem(fetched), ...state.notes.filter((item) => item.id !== draftNoteId)];
    }
    activateModule("explorer");
    openNoteById(draftNoteId);
    setStatus(`已打开草稿笔记：${draftNoteId}`, "ok");
  } catch (error) {
    setStatus(`打开草稿失败：${String(error?.message || error)}`, "bad");
  }
});

$("graphRefresh")?.addEventListener("click", async () => {
  await refreshDirectoryGraph();
  setStatus("永久笔记关系图谱已刷新", "ok");
});

$("graphSeedYijing")?.addEventListener("click", async () => {
  await importYijingKnowledgeNetworkDemo();
});

$("graphSeedYijingRich")?.addEventListener("click", async () => {
  await importYijingRichAcceptanceDemo();
});

$("aiInboxPanel")?.addEventListener("click", async (event) => {
  const viewButton = event.target.closest("[data-ai-inbox-view]");
  if (viewButton) {
    aiInboxState.filters = normalizeAiInboxFilters({
      ...aiInboxState.filters,
      view: viewButton.getAttribute("data-ai-inbox-view")
    });
    aiInboxState.detail = null;
    aiInboxState.selectedArtifactId = "";
    await openAiInboxModule();
    return;
  }

  if (event.target.closest("#btnAiInboxApplyFilters")) {
    await applyAiInboxFiltersFromUi();
    return;
  }

  if (event.target.closest("#btnAiInboxRefresh")) {
    await openAiInboxModule();
    setStatus("AI 建议已刷新", "ok");
    return;
  }

  const itemButton = event.target.closest("[data-ai-inbox-artifact-id]");
  if (itemButton) {
    await loadAiInboxDetail(itemButton.getAttribute("data-ai-inbox-artifact-id"));
    return;
  }

  const noteButton = event.target.closest("[data-ai-inbox-open-note]");
  if (noteButton) {
    const noteId = String(noteButton.getAttribute("data-ai-inbox-open-note") || "").trim();
    if (!noteId) return;
    try {
      if (!state.notes.some((item) => item.id === noteId)) {
        const fetched = await fetchNote(noteId);
        if (fetched) state.notes = [mapNoteItem(fetched), ...state.notes.filter((item) => item.id !== noteId)];
      }
      activateModule("explorer");
      openNoteById(noteId);
      setStatus(`Opened source note ${noteId}`, "ok");
    } catch (error) {
      setStatus(`Open source note failed: ${String(error?.message || error)}`, "warn");
    }
    return;
  }

  const decisionButton = event.target.closest("[data-ai-inbox-decision]");
  if (decisionButton) {
    await recordAiInboxReviewDecision(decisionButton.getAttribute("data-ai-inbox-decision"));
    return;
  }

  const acceptLinkButton = event.target.closest("[data-ai-inbox-accept-link]");
  if (acceptLinkButton) {
    await acceptAiInboxLinkSuggestion(acceptLinkButton.getAttribute("data-ai-inbox-accept-link"));
    return;
  }

  const promoteNoteButton = event.target.closest("[data-ai-inbox-promote-note]");
  if (promoteNoteButton) {
    await promoteAiInboxArtifactToNote(promoteNoteButton.getAttribute("data-ai-inbox-promote-note"));
  }

  if (event.target.closest("#btnAiInboxSummarize")) {
    await runAiInboxSummary(aiInboxState.selectedArtifactId || aiInboxState.detail?.item?.artifactId || "");
    return;
  }

  const recommendedActionButton = event.target.closest("[data-ai-inbox-recommended-action]");
  if (recommendedActionButton) {
    await applyAiInboxRecommendedAction(recommendedActionButton.getAttribute("data-ai-inbox-recommended-action"));
    return;
  }
});

$("graphCanvas")?.addEventListener("click", (event) => {
  const graphAiButton = event.target.closest("[data-run-graph-ai-analysis]");
  if (graphAiButton) {
    runGraphAiAnalysis();
    return;
  }
  const row = event.target.closest("[data-open-note]");
  if (!row) return;
  openNoteById(row.dataset.openNote);
  setStatus("已从图谱打开笔记", "ok");
});

$("graphCanvas")?.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" && event.key !== " ") return;
  const row = event.target.closest("[data-open-note]");
  if (!row) return;
  event.preventDefault();
  openNoteById(row.dataset.openNote);
  setStatus("已从图谱打开笔记", "ok");
});

$("graphCanvas")?.addEventListener("change", (event) => {
  const control = event.target.closest("[data-graph-filter]");
  if (!control) return;
  const key = control.dataset.graphFilter;
  if (key !== "relationType" && key !== "status") return;
  graphState.filters[key] = String(control.value || "all").trim() || "all";
  renderGraphPanel();
  const typeText = graphRelationTypeLabel(graphState.filters.relationType);
  const statusText = graphRelationStatusLabel(graphState.filters.status);
  setStatus(`图谱筛选已更新：${graphState.filters.relationType === "all" ? "全部类型" : typeText} / ${graphState.filters.status === "all" ? "全部状态" : statusText}`, "ok");
});

document.querySelectorAll(".rail-btn[data-module]").forEach((btn) => {
  btn.addEventListener("click", async () => {
    activateModule(btn.dataset.module);
    if (state.module === "graph") {
      await refreshDirectoryGraph();
      setStatus("已打开永久笔记关系图谱", "ok");
	    }
	    if (state.module === "aiInbox") {
	      await openAiInboxModule();
	      setStatus("已打开 AI 建议待办", "ok");
	    }
	    if (state.module === "settings") {
	      try {
	        await refreshVaultSettings();
	        setStatus("已打开设置", "ok");
	      } catch (error) {
	        setStatus(`设置加载失败：${String(error?.message || error)}`, "warn");
	      }
	    }
	    if (state.module === "writing") {
	      await openWritingModule();
	    }
	  });
	});

$("btnMobileNewNote")?.addEventListener("click", () => {
  const folderId = resolveExplorerNewNoteFolderId(state);
  if (folderById(state, folderId)) {
    state.selectedFolderId = folderId;
    state.browserRootId = rootBoxIdFromFolder(state, folderId);
    state.selectedFileId = null;
  }
  handleStateChange("create-note-in-selected-folder");
});

document.querySelectorAll("[data-action^='quick-']").forEach((btn) => {
  btn.addEventListener("click", () => {
    const activeTab = state.tabs.find((t) => t.id === state.activeTabId);
    if (activeTab?.dirty) {
      editor.updateActiveTabFromEditor();
      void editor.autoSaveTabById(activeTab.id, "switch-root");
    }
    const action = btn.dataset.action;
    if (action === "quick-fleeting") {
      state.browserRootId = "dir_fleeting_default";
      state.selectedFolderId = "dir_fleeting_default";
    }
    if (action === "quick-literature") {
      state.browserRootId = "dir_literature_default";
      state.selectedFolderId = "dir_literature_default";
    }
    if (action === "quick-original") {
      state.browserRootId = "dir_original_default";
      state.selectedFolderId = "dir_original_default";
    }
    state.module = "explorer";
    state.selectedFileId = null;
    document.querySelectorAll(".quick-entry").forEach((entry) => entry.classList.toggle("current-root", entry.dataset.action === action));
    document.querySelectorAll(".rail-btn[data-module]").forEach((b) => b.classList.toggle("active", b.dataset.module === "explorer"));
      setStatus(`已切换到 ${displayFolderName(folderById(state, state.browserRootId))} 入口`, "ok");
      renderAll();
    });
  });

document.querySelectorAll("[data-action='open-handoff']").forEach((btn) => {
  btn.addEventListener("click", () => {
    const url = `${window.location.origin}/app/handoff`;
    window.open(url, "_blank", "noopener,noreferrer");
    setStatus("已打开工作台交付板", "ok");
  });
});

document.addEventListener("keydown", (e) => {
  const tag = (e.target?.tagName || "").toLowerCase();
  if (tag === "input" || tag === "textarea" || tag === "select" || e.isComposing) return;

  if (e.key === "F2") {
    if (state.selectedFileId) {
      explorer.handleContextAction("rename", { kind: "file", id: state.selectedFileId });
      renderAll();
      e.preventDefault();
      return;
    }
    if (state.selectedFolderId) {
      explorer.handleContextAction("rename", { kind: "folder", id: state.selectedFolderId });
      renderAll();
      e.preventDefault();
      return;
    }
  }

  if (e.ctrlKey && (e.key === "ArrowLeft" || e.key === "ArrowRight")) {
    const idx = state.tabs.findIndex((t) => t.id === state.activeTabId);
    if (idx >= 0 && state.tabs.length > 1) {
      const next = e.key === "ArrowLeft" ? (idx - 1 + state.tabs.length) % state.tabs.length : (idx + 1) % state.tabs.length;
      state.activeTabId = state.tabs[next].id;
      editor.fillEditorFromTab();
      syncExplorerContextToActiveTab();
      renderAll();
      e.preventDefault();
    }
    return;
  }

  if (e.altKey && (e.key === "ArrowLeft" || e.key === "ArrowRight")) {
    if (e.key === "ArrowLeft") {
      const cur = folderById(state, state.selectedFolderId);
      if (cur?.parentId) {
        state.selectedFolderId = cur.parentId;
        setStatus("已定位到上级目录", "ok");
      } else {
        setStatus("当前已在顶层目录", "warn");
      }
    } else {
      const children = childFolders(state, state.selectedFolderId);
      if (children.length) {
        state.selectedFolderId = children[0].id;
        setStatus("已进入子目录", "ok");
      } else {
        const files = notesInFolder(state, state.selectedFolderId);
        if (files.length) {
          openNoteById(files[0].id);
          setStatus("已打开当前目录首个文件", "ok");
        } else {
          setStatus("当前目录无文件", "warn");
        }
      }
    }
    renderAll();
    e.preventDefault();
  }
});

async function bootstrap() {
  renderImportPageShell();

  const importToolbarActions = createImportToolbarActions({
    getToolbarValues: currentImportToolbarValues,
    getFallbackImportRecordId: () => importState.importRecordId,
    getActivePreview: () => activeImportPreviewContext(),
    selectionSummary,
    previewImport,
    confirmImport,
    cancelImport,
    loadImportRecordIntoUi,
    rollbackImportIntoUi,
    onPreviewSuccess: async (preview) => {
      importState.lastPreview = preview;
      importState.previewFilter = "all";
      syncImportSelection(preview.importRecordId, preview.candidatePreview);
      setImportRecordId(preview.importRecordId);
      showImportResult({
        stage: "preview",
        importRecordId: preview.importRecordId,
        connector: preview.connector,
        status: preview.status,
        summary: preview.summary,
        candidatePreview: preview.candidatePreview,
        warnings: preview.warnings,
        originalityGuard: preview.originalityGuard
      });
    },
    onConfirmSuccess: async ({ importRecordId, result, preview }) => {
      setImportRecordId(importRecordId);
      showImportResult({
        stage: "confirm",
        importRecordId,
        status: result.status,
        result: result.result,
        originalityGuard: result.originalityGuard,
        candidatePreview: preview?.candidatePreview || null
      });
      importState.lastPreview = null;
    },
    onCancelSuccess: async ({ importRecordId, result }) => {
      setImportRecordId(importRecordId);
      showImportResult({
        stage: "cancel",
        importRecordId,
        status: result.status,
        message: result.message
      });
      importState.lastPreview = null;
    },
    showImportResult,
    refreshImportHistory,
    refreshImportedNotesView,
    setStatus
  });

  renderImportToolbar();

  $("importResult")?.addEventListener("change", (event) => {
    const checkbox = event.target?.closest?.(".candidate-checkbox");
    if (!checkbox) return;
    const candidateId = String(checkbox.getAttribute("data-candidate-id") || "").trim();
    const importRecordId = String(importState.lastPreview?.importRecordId || "").trim();
    if (!candidateId || !importRecordId) return;
    if (importState.selectionImportRecordId !== importRecordId) {
      importState.selectionImportRecordId = importRecordId;
      importState.selectedCandidateIds = new Set(candidatePreviewItemIds(importState.lastPreview?.candidatePreview));
    }
    if (checkbox.checked) importState.selectedCandidateIds.add(candidateId);
    else importState.selectedCandidateIds.delete(candidateId);
    rerenderImportResult();
  });

  $("importResult")?.addEventListener("click", (event) => {
    const importWritingButton = event.target?.closest?.("[data-import-writing-action]");
    if (importWritingButton) {
      const action = String(importWritingButton.getAttribute("data-import-writing-action") || "").trim();
      if (action === "open-literature-queue") {
        void openImportedLiteratureQueue();
      } else if (action === "add-permanent-notes" || action === "add-permanent-notes-open-writing") {
        void addImportedPermanentNotesToWritingBasket({ openWriting: action === "add-permanent-notes-open-writing" });
      } else if (action === "create-writing-project") {
        void createWritingProjectFromImportedPermanentNotes();
      }
      return;
    }
    const clearFocusButton = event.target?.closest?.("[data-clear-candidate-focus]");
    if (clearFocusButton) {
      setImportResultFocus("");
      return;
    }
    const skipFocusButton = event.target?.closest?.("[data-skip-focus]");
    if (skipFocusButton) {
      const nextReason = String(skipFocusButton.getAttribute("data-skip-focus") || "").trim();
      setImportResultFocus(importState.resultFocusReason === nextReason ? "" : nextReason);
      return;
    }
    const actionButton = event.target?.closest?.("[data-candidate-action]");
    if (actionButton) {
      applyCandidateSelection(String(actionButton.getAttribute("data-candidate-action") || ""));
      return;
    }
    const filterButton = event.target?.closest?.("[data-candidate-filter]");
    if (!filterButton) return;
    setCandidateFilter(String(filterButton.getAttribute("data-candidate-filter") || ""));
  });

  $("importHistoryMount")?.addEventListener("click", async (event) => {
    const refreshButton = event.target?.closest?.("#btnImportHistoryRefresh");
    if (refreshButton) {
      await refreshImportHistory();
      setStatus("导入历史已刷新", "ok");
      return;
    }

    const actionButton = event.target?.closest?.("[data-import-history-action]");
    const item = event.target?.closest?.("[data-import-history-id]");
    const importRecordId = String(
      actionButton?.getAttribute("data-import-history-id") || item?.getAttribute("data-import-history-id") || ""
    ).trim();
    if (!importRecordId) return;
    try {
      const action = String(actionButton?.getAttribute("data-import-history-action") || "load").trim();
      if (action === "rollback") {
        await rollbackImportIntoUi(importRecordId, { statusPrefix: "已从历史记录回滚导入" });
        return;
      }
      if (action === "resume-literature-queue") {
        await openLiteratureQueueForImportRecord(importRecordId, { preferNextPending: true });
        return;
      }
      if (action === "promote-literature-batch") {
        await openLiteratureQueueForImportRecord(importRecordId, { preferReadyForOriginal: true });
        return;
      }
      if (action === "open-literature-queue") {
        await openLiteratureQueueForImportRecord(importRecordId);
        return;
      }
      await loadImportRecordIntoUi(importRecordId, { statusPrefix: "已从历史记录读取导入记录" });
    } catch (error) {
      const action = String(actionButton?.getAttribute("data-import-history-action") || "load").trim();
      showImportResult({
        stage: action === "rollback" ? "rollback_error" : "record_error",
        importRecordId,
        message: String(error?.message || error),
        code: error?.code || null
      });
      setStatus(
        `${action === "rollback" ? "回滚" : action === "open-literature-queue" ? "打开文献队列" : action === "resume-literature-queue" ? "继续待转述队列" : action === "promote-literature-batch" ? "转去永久笔记整理" : "读取导入记录"}失败：${String(error?.message || error)}`,
        "bad"
      );
    }
  });

  $("importHistoryMount")?.addEventListener("change", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLSelectElement)) return;
    if (target.id === "importHistoryStatus") {
      importState.historyStatusFilter = String(target.value || "all").trim();
      renderImportHistory();
      return;
    }
    if (target.id === "importHistoryConnector") {
      importState.historyConnectorFilter = String(target.value || "all").trim();
      renderImportHistory();
      return;
    }
    if (target.id === "importHistoryRisk") {
      importState.historyRiskFilter = String(target.value || "all").trim();
      renderImportHistory();
    }
  });

  $("importRecordId")?.addEventListener("input", (event) => {
    importState.importRecordId = String(event.target?.value || "").trim();
    updateImportConfirmButton();
    renderImportHistory();
  });

  $("btnImportPreview")?.addEventListener("click", async () => {
    await importToolbarActions.handlePreview();
  });

  $("btnBrowseImportPath")?.addEventListener("click", async () => {
    const picked = await desktopCommands.browseDirectory({
      defaultPath: $("importPath")?.value || "",
      purpose: "导入目录"
    });
    if (!picked.path) return;
    $("importPath").value = picked.path;
    setStatus(`已选择导入目录（${picked.source}）`, "ok");
  });

  $("btnImportConfirm")?.addEventListener("click", async () => {
    await importToolbarActions.handleConfirm();
  });

  $("btnImportCancel")?.addEventListener("click", async () => {
    await importToolbarActions.handleCancel();
  });

  $("btnImportRefresh")?.addEventListener("click", async () => {
    await importToolbarActions.handleRefresh();
  });

  $("btnImportRollback")?.addEventListener("click", async () => {
    await importToolbarActions.handleRollback();
  });

  $("btnExportMarkdown")?.addEventListener("click", async () => {
    const targetPath = String($("exportTargetPath")?.value || "").trim();
    if (!targetPath) return setStatus("请先填写 Markdown 导出目标路径", "warn");
    try {
      const result = await exportMarkdown(targetPath);
      showExportResult({
        stage: "export_markdown",
        targetPath,
        exportJobId: result.exportJobId,
        status: result.status,
        copied: result.copied,
        copiedBreakdown: result.copiedBreakdown || null
      });
      setStatus(`Markdown 导出已提交：${result.exportJobId}，复制 ${result.copied} 个文件`, "ok");
    } catch (error) {
      showExportResult({
        stage: "export_error",
        targetPath,
        message: String(error?.message || error),
        code: error?.code || null,
        details: error?.details || null
      });
      setStatus(`Markdown 导出失败：${String(error?.message || error)}`, "bad");
    }
  });

  $("btnBrowseExportPath")?.addEventListener("click", async () => {
    const picked = await desktopCommands.browseDirectory({
      defaultPath: $("exportTargetPath")?.value || "",
      purpose: "导出目录"
    });
    if (!picked.path) return;
    $("exportTargetPath").value = picked.path;
    setStatus(`已选择导出目录（${picked.source}）`, "ok");
  });

  try {
    await refreshVaultSettings();
    await syncDirectoriesFromApi();
    await syncNotesForDirectory(state.selectedFolderId);
    setStatus(`已连接 API：${getApiBase()}`, "ok");
  } catch (error) {
    renderImportHistory();

    const tauri = typeof window !== "undefined" ? window.__TAURI__ : null;
    if (tauri) {
      setStatus(`API 连接失败：${String(error?.message || error)}`, "bad");
      try {
        const message =
          `无法连接到本地 API（${getApiBase()}）。\n\n` +
          `当前桌面版需要本地 API 服务在后台运行。\n\n` +
          `解决办法：\n` +
          `1) 在项目目录运行：npm run dev:api\n` +
          `2) 保持窗口打开，然后重启桌面应用\n\n` +
          `如果你是安装包用户，请联系开发者获取“内置 API”的版本。`;

        if (typeof tauri?.dialog?.message === "function") {
          await tauri.dialog.message(message, { title: "API 未启动", kind: "error" });
        } else if (typeof tauri?.core?.invoke === "function") {
          await tauri.core.invoke("plugin:dialog|message", {
            message,
            options: { title: "API 未启动", kind: "error" }
          });
        }
      } catch {}
    } else {
      setStatus(`API 连接失败，使用本地工作台数据：${String(error?.message || error)}`, "warn");
    }
  }

  try {
    syncImportHistoryFiltersFromUi();
    await refreshImportHistory({ silent: true });
  } catch {}

  renderAll();
  const startupParams = new URLSearchParams(window.location.search);
  const startupDemo = String(startupParams.get("demo") || "").trim().toLowerCase();
  const explicitNoteId = startupParams.get("note") || "";
  const initialNote = explicitNoteId ? state.notes.find((n) => n.id === explicitNoteId) : null;
  const openedDemo =
    startupDemo === "smart-notes-product-thinking" || startupDemo === "smart-notes"
      ? await importSmartNotesProductThinkingDemo()
      : startupDemo === "yijing-rich" || startupDemo === "yijing"
        ? await (startupDemo === "yijing" ? importYijingKnowledgeNetworkDemo() : importYijingRichAcceptanceDemo())
        : false;
  if (openedDemo) {
    activateModule("graph");
    renderAll();
  } else if (initialNote) {
    state.browserRootId = rootBoxIdFromFolder(state, initialNote.folderId);
    state.selectedFolderId = initialNote.folderId;
    openNoteById(explicitNoteId);
  } else {
    await openStartupUntitledNote();
  }

  // MVP: if running inside Tauri, periodically check for updates and offer one-click install.
  // This is best-effort and will quietly no-op in browsers.
  setTimeout(async () => {
    const result = await checkForDesktopUpdate();
    if (result?.installed) setStatus("更新已开始下载，完成后会自动重启", "ok");
  }, 1200);
}

bootstrap();
