import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";

import {
  appendImportRecord,
  buildExternalCandidates,
  createdEntryFromVaultPath,
  createdEntryFromWriteResult,
  listImportRecords,
  loadImportRecord,
  publicImportRecord,
  rollbackCreatedFiles,
  summarizeImportCandidates
} from "../../../packages/connectors/src/index.mjs";
import {
  createDirectory,
  createIndexCard,
  createNoteInDirectory,
  createNoteRelation,
  deleteDirectory,
  deleteNoteRelation,
  deleteNoteById,
  distillIndexCard,
  detectGraphConflicts,
  findNotePath,
  getNoteById,
  getIndexCard,
  initVault,
  getDirectoryGraph,
  listDirectories,
  listDistillationQueue,
  listIndexCards,
  listNoteRelations,
  listRelationReviewQueue,
  listTags,
  listNotesByTag,
  listNotesInDirectory,
  moveNoteToDirectory,
  registerMarkdownNoteInCatalog,
  resolveVaultPath,
  saveNoteAsset,
  searchNotes,
  seedYijingKnowledgeNetwork,
  updateIndexCard,
  updateDirectory,
  updateNoteContent,
  updatePermanentNoteDistillation,
  updateNoteRelation,
  confirmPermanentNoteDistillation,
  writeLiteratureNoteIfAbsent,
  writePermanentNoteIfAbsent,
  writeSourceIfAbsent
} from "../../../packages/domain/src/index.mjs";
import { exportMarkdown } from "../../../packages/export-engine/src/index.mjs";
import { buildMarkdownCandidates } from "../../../packages/markdown-engine/src/index.mjs";
import { normalizeOriginalityPlan, originalityGuard } from "../../../packages/originality-guard/src/index.mjs";
import {
  addNotebookLmDraft,
  createPaperPermanentCandidate,
  createPaperWorkspace,
  getPaperWorkspace,
  savePaperPermanentNote,
  savePaperTranslation
} from "../../../packages/paper-workspace/src/index.mjs";
import {
  bindDraftNoteToProject,
  createDraftScaffold,
  createWritingProject,
  getDraftScaffold,
  getWritingProject,
  listProjectDraftVersions,
  listProjectScaffolds,
  listWritingProjects,
  setCurrentDraftNote,
  updateDraftNoteVersionNote,
  updateDraftScaffoldVersionNote
} from "../../../packages/writing-engine/src/index.mjs";
import { seedYijingRichAcceptance } from "../../../scripts/seed-yijing-rich-acceptance.mjs";
import { seedSmartNotesProductThinking } from "../../../scripts/seed-smart-notes-product-thinking.mjs";
import {
  createSqliteAiPreferencesStore,
  createSqliteAiProviderConfigStore,
  createSqliteScheduledAgentTaskStore,
  createSqliteArtifactStore,
  createAiInbox,
  createSqliteProviderHealthStore,
  createAiHarnessRuntime,
  createCoreNoteTools,
  createProviderAdapterRegistry,
  analyzePermanentNoteForReview,
  analyzePermanentNoteGraphLocally,
  buildPermanentNoteGraphReviewItems,
  buildPermanentNoteLocalModelRequest,
  createScheduledTaskFromTemplate,
  listScheduledAgentTaskTemplates,
  preferencesToSettingsInput,
  providerConfigToSettingsInput,
  resolveAiUserSettings,
  resolveModelRoute,
  resolveProviderDescriptor,
  mergePermanentNoteLocalModelResponse,
  runPermanentNoteLocalModelAnalysis,
  buildWritingStrongModelRequest,
  mergeWritingStrongModelResponse,
  runWritingStrongModelAnalysis,
  runDueScheduledAgentTasks,
  runProviderHealthCheck
} from "../../../packages/ai-orchestrator/src/index.mjs";

const PORT = Number(process.env.API_PORT || 3000);
const WEB_PORT = Number(process.env.WEB_PORT || 5173);
const PROTOTYPE_URL = String(process.env.PROTOTYPE_URL || `http://127.0.0.1:${WEB_PORT}/prototype`);
const APP_BASE_URL = String(process.env.APP_BASE_URL || `http://localhost:${WEB_PORT}`);
const CWD = process.cwd();
const DEFAULT_VAULT_PATH = path.resolve(process.env.VAULT_PATH || path.join(CWD, "vault-example", "yansilu-vault"));
const YIJING_KNOWLEDGE_NETWORK_FIXTURE_PATH = path.join(CWD, "tests", "fixtures", "knowledge-network", "yijing-network.json");
const OLLAMA_BASE_URL = String(process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434").replace(/\/+$/, "");
let VAULT_PATH = DEFAULT_VAULT_PATH;
let AUTH_STATE_PATH = path.resolve(DEFAULT_VAULT_PATH, ".yansilu", "auth-state.json");
const STRIPE_SECRET_KEY = String(process.env.STRIPE_SECRET_KEY || "").trim();
const STRIPE_PRICE_PRO_MONTHLY = String(process.env.STRIPE_PRICE_PRO_MONTHLY || "").trim();
const STRIPE_WEBHOOK_SECRET = String(process.env.STRIPE_WEBHOOK_SECRET || "").trim();
let stripeClientPromise = null;
let aiPreferencesStorePromise = null;
let aiProviderConfigStorePromise = null;
let aiProviderHealthStorePromise = null;
let aiScheduledTaskStorePromise = null;
let aiArtifactStorePromise = null;

async function aiPreferencesStore() {
  if (!aiPreferencesStorePromise) {
    aiPreferencesStorePromise = createSqliteAiPreferencesStore({ vaultPath: VAULT_PATH });
  }
  return aiPreferencesStorePromise;
}

async function aiProviderConfigStore() {
  if (!aiProviderConfigStorePromise) {
    aiProviderConfigStorePromise = createSqliteAiProviderConfigStore({ vaultPath: VAULT_PATH });
  }
  return aiProviderConfigStorePromise;
}

async function aiProviderHealthStore() {
  if (!aiProviderHealthStorePromise) {
    aiProviderHealthStorePromise = createSqliteProviderHealthStore({ vaultPath: VAULT_PATH });
  }
  return aiProviderHealthStorePromise;
}

async function aiScheduledTaskStore() {
  if (!aiScheduledTaskStorePromise) {
    aiScheduledTaskStorePromise = createSqliteScheduledAgentTaskStore({ vaultPath: VAULT_PATH });
  }
  return aiScheduledTaskStorePromise;
}

async function aiArtifactStore() {
  if (!aiArtifactStorePromise) {
    aiArtifactStorePromise = createSqliteArtifactStore({ vaultPath: VAULT_PATH });
  }
  return aiArtifactStorePromise;
}

function advancedModelRefFrom(input = {}) {
  const advancedSettings = input.advancedSettings || input.advanced_settings || {};
  return cleanText(input.modelRef || input.model_ref || advancedSettings.modelRef || advancedSettings.model_ref);
}

function advancedSecretRefFrom(input = {}) {
  const advancedSettings = input.advancedSettings || input.advanced_settings || {};
  return cleanText(input.secretRef || input.secret_ref || advancedSettings.secretRef || advancedSettings.secret_ref);
}

function authSummary(authMode = "", options = {}) {
  const mode = cleanText(authMode);
  const labels = {
    platform_managed: "platform_managed",
    workspace_managed: "workspace_key",
    byok_advanced: "user_key",
    local_no_key: "no_key",
    enterprise_secret: "enterprise_secret"
  };
  const requiresKey = ["workspace_managed", "byok_advanced", "enterprise_secret"].includes(mode);
  const secretRef = cleanText(options.secretRef || options.secret_ref);
  const secretRefConfigured = Boolean(secretRef);
  const ready = !requiresKey || secretRefConfigured;
  const nextActions = {
    workspace_managed: "configure_workspace_key",
    byok_advanced: "add_user_key",
    enterprise_secret: "configure_enterprise_secret"
  };
  const messages = {
    platform_managed: "Platform-managed AI can run without a user-provided key.",
    local_no_key: "Local/private mode does not require a cloud API key.",
    workspace_managed: secretRefConfigured
      ? "Workspace key reference is configured."
      : "A workspace provider key reference is required before this model pack can run.",
    byok_advanced: secretRefConfigured ? "User key reference is configured." : "A user provider key reference is required before this override can run.",
    enterprise_secret: secretRefConfigured ? "Enterprise secret reference is configured." : "An enterprise secret reference is required before this provider can run."
  };
  return {
    authMode: mode,
    keyMode: labels[mode] || "unknown",
    requiresKey,
    secretRefConfigured,
    ready,
    status: ready ? "ready" : "needs_key",
    nextAction: ready ? "none" : nextActions[mode] || "configure_provider",
    message: messages[mode] || "Provider access mode is unknown."
  };
}

function assertProviderResponseSucceeded(response = {}, code = "AI_PROVIDER_REQUEST_FAILED") {
  if (response?.status === "succeeded") return;
  const providerError = response?.error || {};
  const message = cleanText(providerError.message) || "Provider request failed.";
  const error = new Error(message);
  error.code = code;
  error.details = {
    providerId: cleanText(response?.providerId || response?.provider_id),
    modelRef: cleanText(response?.modelRef || response?.model_ref),
    status: cleanText(response?.status),
    providerError
  };
  throw error;
}

function providerConfigWithRunnableHealthCheck(config = {}, input = {}) {
  const healthCheck = {
    ...(config.healthCheck || {}),
    ...(input.healthCheck || input.health_check || {})
  };
  return {
    ...config,
    healthCheck: {
      enabled: true,
      endpointUrl: cleanText(healthCheck.endpointUrl || healthCheck.endpoint_url || config.endpointUrl),
      method: cleanText(healthCheck.method || "GET").toUpperCase(),
      timeoutMs: Number(healthCheck.timeoutMs ?? healthCheck.timeout_ms ?? 5000),
      expectedStatus: Number(healthCheck.expectedStatus ?? healthCheck.expected_status ?? 200),
      intervalSeconds: Number(healthCheck.intervalSeconds ?? healthCheck.interval_seconds ?? 300)
    }
  };
}

function providerHealthPreview(record = null) {
  if (!record) {
    return {
      status: "unknown",
      checkedAt: "",
      latencyMs: 0,
      message: "No provider health check has run yet.",
      errorType: "",
      retryable: false
    };
  }
  return {
    status: cleanText(record.status) || "unknown",
    checkedAt: cleanText(record.checkedAt || record.checked_at),
    latencyMs: Number(record.latencyMs || record.latency_ms || 0),
    message: cleanText(record.message),
    errorType: cleanText(record.errorType || record.error_type),
    retryable: record.retryable === true
  };
}

async function fetchJsonWithTimeout(url, options = {}) {
  if (typeof fetch !== "function") {
    const error = new Error("fetch is not available in this runtime");
    error.code = "FETCH_UNAVAILABLE";
    throw error;
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Number(options.timeoutMs || 2000));
  try {
    const response = await fetch(url, {
      method: options.method || "GET",
      headers: options.headers,
      body: options.body,
      signal: controller.signal
    });
    const json = await response.json().catch(() => ({}));
    return { response, json };
  } finally {
    clearTimeout(timeout);
  }
}

function normalizeOllamaPullModelName(value = "") {
  const model = cleanText(value).toLowerCase();
  if (!model) return "";
  if (!/^[a-z0-9][a-z0-9._:-]{0,80}$/.test(model)) return "";
  return model;
}

function normalizeOllamaModel(model = {}) {
  return {
    name: cleanText(model.name || model.model),
    modifiedAt: cleanText(model.modified_at || model.modifiedAt),
    size: Number(model.size || 0),
    parameterSize: cleanText(model.details?.parameter_size || model.parameter_size),
    quantizationLevel: cleanText(model.details?.quantization_level || model.quantization_level)
  };
}

async function buildOllamaModelsPreview() {
  const healthEndpointUrl = `${OLLAMA_BASE_URL}/api/tags`;
  const chatEndpointUrl = `${OLLAMA_BASE_URL}/v1/chat/completions`;
  const startedAt = Date.now();
  try {
    const { response, json } = await fetchJsonWithTimeout(healthEndpointUrl, { timeoutMs: 2500 });
    const models = Array.isArray(json.models) ? json.models.map(normalizeOllamaModel).filter((model) => model.name) : [];
    return {
      runtimeId: "ollama",
      displayName: "Ollama",
      status: response.ok ? "available" : "unavailable",
      baseUrl: OLLAMA_BASE_URL,
      chatEndpointUrl,
      healthEndpointUrl,
      latencyMs: Date.now() - startedAt,
      models,
      recommendedModels: models
        .map((model) => model.name)
        .filter((name) => /qwen|llama|phi|gemma|mistral/i.test(name))
        .slice(0, 6),
      message: response.ok ? "" : `Ollama returned HTTP ${response.status}`
    };
  } catch (error) {
    return {
      runtimeId: "ollama",
      displayName: "Ollama",
      status: "unavailable",
      baseUrl: OLLAMA_BASE_URL,
      chatEndpointUrl,
      healthEndpointUrl,
      latencyMs: Date.now() - startedAt,
      models: [],
      recommendedModels: ["qwen2.5:7b", "qwen2.5:3b", "llama3.1:8b", "phi3.5:latest", "gemma2:2b"],
      message: cleanText(error?.message) || "Ollama is not reachable."
    };
  }
}

async function pullOllamaModel(modelName = "qwen2.5:7b") {
  const model = normalizeOllamaPullModelName(modelName) || "qwen2.5:7b";
  const startedAt = Date.now();
  const pullEndpointUrl = `${OLLAMA_BASE_URL}/api/pull`;
  const { response, json } = await fetchJsonWithTimeout(pullEndpointUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model, stream: false }),
    timeoutMs: 30 * 60 * 1000
  });
  if (!response.ok) {
    const error = new Error(cleanText(json?.error || json?.message) || `Ollama pull returned HTTP ${response.status}`);
    error.status = response.status;
    error.details = json;
    throw error;
  }
  const runtime = await buildOllamaModelsPreview();
  return {
    runtimeId: "ollama",
    model,
    status: cleanText(json.status) || "success",
    latencyMs: Date.now() - startedAt,
    pullEndpointUrl,
    runtime
  };
}

async function buildAiRoutePreview(input = {}) {
  await initVault(VAULT_PATH);
  const store = await aiPreferencesStore();
  const storedPreferences = store.getUserPreferences({ workspaceId: "local_workspace", userId: "local_user" });
  const storedSettings = preferencesToSettingsInput(storedPreferences);
  const advancedSettings = {
    ...(storedSettings.advancedSettings || {}),
    ...(input.advancedSettings || input.advanced_settings || {})
  };
  const settingsInput = {
    ...storedSettings,
    userMode: input.userMode || input.user_mode || storedSettings.userMode,
    modelPack: input.modelPack || input.model_pack || storedSettings.modelPack,
    providerPreset: input.providerPreset || input.provider_preset || storedSettings.providerPreset,
    authMode: input.authMode || input.auth_mode || storedSettings.authMode,
    secretRef: advancedSecretRefFrom({ ...storedSettings, ...input, advancedSettings }),
    privacy: { ...(storedSettings.privacy || {}), ...(input.privacy || {}) },
    budget: { ...(storedSettings.budget || {}), ...(input.budget || {}) },
    fallbackPolicy: { ...(storedSettings.fallbackPolicy || {}), ...(input.fallbackPolicy || input.fallback_policy || {}) },
    advancedSettings
  };
  const modelRef = advancedModelRefFrom({ ...settingsInput, ...input, advancedSettings });
  if (modelRef) settingsInput.modelRef = modelRef;

  const userSettings = resolveAiUserSettings(settingsInput);
  const configStore = await aiProviderConfigStore();
  const providerConfig = configStore.getProviderConfig({ providerId: settingsInput.providerPreset || userSettings.providerPreset });
  if (providerConfig) {
    const configSettings = providerConfigToSettingsInput(providerConfig);
    const secretRef = settingsInput.secretRef || configSettings.secretRef;
    const providerDescriptorInput = {
      ...(configSettings.providerDescriptor || {}),
      secretRef
    };
    Object.assign(settingsInput, {
      ...configSettings,
      secretRef,
      providerDescriptor: providerDescriptorInput,
      runtimeModelMap: {
        ...(configSettings.runtimeModelMap || {}),
        ...(settingsInput.runtimeModelMap || settingsInput.runtime_model_map || {})
      }
    });
  }
  const providerDescriptor = resolveProviderDescriptor(settingsInput);
  const privacyMode = cleanText(input.privacyMode || input.privacy_mode || userSettings.privacy.defaultMode) || "normal";
  const cloudAllowed = userSettings.privacy.allowCloud !== false && privacyMode !== "local_only";
  const route = resolveModelRoute({
    ...settingsInput,
    providerDescriptor,
    contextPack: {
      privacy: {
        mode: privacyMode,
        cloudAllowed
      }
    },
    agent: {
      agentId: "settings_preview_agent",
      defaultModelTier: cleanText(input.modelTier || input.model_tier) || "standard",
      requiredCapabilities: ["structured_output"]
    },
    modelRef
  });
  const healthStore = await aiProviderHealthStore();
  const latestProviderHealth = healthStore.getLatestProviderHealth({ providerId: providerDescriptor.providerId });

  return {
    userMode: route.userMode,
    modelPack: route.modelPack,
    modelPackId: route.modelPackId,
    providerPreset: route.providerPreset,
    provider: {
      providerId: providerDescriptor.providerId,
      displayName: providerDescriptor.displayName,
      adapterType: providerDescriptor.adapterType,
      localExecution: providerDescriptor.localExecution === true,
      noviceVisible: providerDescriptor.noviceVisible === true
    },
    route: {
      modelRef: route.modelRef,
      requestedTier: route.requestedTier,
      selectedTier: route.selectedTier,
      localOnly: route.localOnly === true,
      cloudAllowed: route.cloudAllowed === true,
      advancedOverride: route.advancedOverride === true,
      confirmationRequired: route.confirmationRequired === true
    },
    privacy: {
      mode: route.privacyMode,
      localPreferred: userSettings.privacy.localPreferred === true
    },
    access: authSummary(route.authMode || userSettings.authMode || providerDescriptor.authMode, {
      secretRef: providerDescriptor.secretRef || settingsInput.secretRef
    }),
    health: providerHealthPreview(latestProviderHealth)
  };
}

function enabledFlag(input = {}, camelKey = "", snakeKey = "") {
  return input[camelKey] === true || (snakeKey && input[snakeKey] === true);
}

function disabledFlag(input = {}, camelKey = "", snakeKey = "") {
  return input[camelKey] === false || (snakeKey && input[snakeKey] === false);
}

function mergeRuntimeModelMaps(...values) {
  return Object.assign(
    {},
    ...values.filter((value) => value && typeof value === "object" && !Array.isArray(value))
  );
}

function modelExecutionSummary(response = {}, context = {}) {
  return {
    status: cleanText(response.status) || "unknown",
    fallbackUsed: context.fallbackUsed === true,
    providerId: cleanText(response.providerId || response.provider_id),
    modelRef: cleanText(response.modelRef || response.model_ref),
    route: context.modelRoute
      ? {
          modelRef: context.modelRoute.modelRef,
          selectedTier: context.modelRoute.selectedTier,
          privacyMode: context.modelRoute.privacyMode,
          cloudAllowed: context.modelRoute.cloudAllowed === true
        }
      : null,
    usage: response.usage || null,
    error: response.error || null
  };
}

function modelExecutionFailure(error = {}, context = {}) {
  return {
    status: "failed",
    fallbackUsed: context.fallbackUsed === true,
    providerId: cleanText(context.providerDescriptor?.providerId || context.providerDescriptor?.provider_id),
    modelRef: cleanText(context.modelRoute?.modelRef),
    route: context.modelRoute
      ? {
          modelRef: context.modelRoute.modelRef,
          selectedTier: context.modelRoute.selectedTier,
          privacyMode: context.modelRoute.privacyMode,
          cloudAllowed: context.modelRoute.cloudAllowed === true
        }
      : null,
    usage: null,
    error: {
      code: cleanText(error.code) || "AI_PROVIDER_EXECUTION_FAILED",
      message: String(error?.message || error)
    }
  };
}

function requestModelFromRoute(providerDescriptor = {}, modelRoute = {}, explicitModel = "", mode = "") {
  const modelRef = cleanText(explicitModel) || cleanText(modelRoute.modelRef);
  return {
    provider: cleanText(providerDescriptor.providerId || providerDescriptor.provider_id),
    model: modelRef,
    modelRef,
    tier: cleanText(modelRoute.selectedTier) || cleanText(modelRoute.requestedTier),
    mode: cleanText(mode) || cleanText(modelRoute.userMode)
  };
}

async function resolveAnalysisProviderExecution(input = {}, defaults = {}) {
  await initVault(VAULT_PATH);
  const preferencesStore = await aiPreferencesStore();
  const storedPreferences = preferencesStore.getUserPreferences({ workspaceId: "local_workspace", userId: "local_user" });
  const storedSettings = preferencesToSettingsInput(storedPreferences);
  const advancedSettings = {
    ...(storedSettings.advancedSettings || {}),
    ...(input.advancedSettings || input.advanced_settings || {})
  };
  const settingsInput = {
    ...storedSettings,
    userMode: input.userMode ?? input.user_mode ?? defaults.userMode ?? storedSettings.userMode,
    modelPack: input.modelPack ?? input.model_pack ?? defaults.modelPack ?? storedSettings.modelPack,
    providerPreset: input.providerPreset ?? input.provider_preset ?? defaults.providerPreset ?? storedSettings.providerPreset,
    authMode: input.authMode ?? input.auth_mode ?? defaults.authMode ?? storedSettings.authMode,
    secretRef: input.secretRef ?? input.secret_ref ?? storedSettings.secretRef,
    endpointUrl: input.endpointUrl ?? input.endpoint_url ?? storedSettings.endpointUrl,
    modelRef: input.modelRef ?? input.model_ref ?? storedSettings.modelRef,
    headers: {
      ...(storedSettings.headers || {}),
      ...(input.headers || {})
    },
    runtimeModelMap: mergeRuntimeModelMaps(
      storedSettings.runtimeModelMap,
      storedSettings.runtime_model_map,
      input.runtimeModelMap,
      input.runtime_model_map
    ),
    privacy: {
      ...(storedSettings.privacy || {}),
      ...(input.privacy || {}),
      ...(defaults.privacyMode ? { defaultMode: defaults.privacyMode } : {})
    },
    fallbackPolicy: {
      ...(storedSettings.fallbackPolicy || {}),
      ...(input.fallbackPolicy || input.fallback_policy || {})
    },
    advancedSettings
  };

  const userSettings = resolveAiUserSettings(settingsInput);
  const providerId = cleanText(settingsInput.providerPreset || settingsInput.providerId || settingsInput.provider_id || userSettings.providerPreset);
  const configStore = await aiProviderConfigStore();
  const providerConfig = providerId ? configStore.getProviderConfig({ providerId }) : null;
  const providerSettings = providerConfig ? providerConfigToSettingsInput(providerConfig) : {};
  const mergedSettings = {
    ...settingsInput,
    ...providerSettings,
    secretRef: cleanText(settingsInput.secretRef) || providerSettings.secretRef,
    modelRef: cleanText(settingsInput.modelRef) || providerSettings.modelRef,
    headers: {
      ...(providerSettings.headers || {}),
      ...(settingsInput.headers || {})
    },
    runtimeModelMap: mergeRuntimeModelMaps(providerSettings.runtimeModelMap, settingsInput.runtimeModelMap)
  };
  const providerDescriptor = resolveProviderDescriptor(mergedSettings);
  const resolvedUserSettings = resolveAiUserSettings(mergedSettings);
  const modelRoute = resolveModelRoute({
    ...mergedSettings,
    providerDescriptor,
    userMode: input.userMode ?? input.user_mode ?? defaults.userMode ?? resolvedUserSettings.userMode,
    modelTier: input.modelTier ?? input.model_tier ?? defaults.modelTier ?? "standard",
    privacyMode: defaults.privacyMode || input.privacyMode || input.privacy_mode || resolvedUserSettings.privacy?.defaultMode
  });
  const useMockProviderAdapters = enabledFlag(input, "useMockProviderAdapters", "use_mock_provider_adapters");
  const registry = createProviderAdapterRegistry({
    useMockProviderAdapters,
    useOpenAiCompatibleAdapter: !useMockProviderAdapters && !disabledFlag(input, "useOpenAiCompatibleAdapter", "use_openai_compatible_adapter"),
    networkEnabled: !disabledFlag(input, "networkEnabled", "network_enabled"),
    createExecutor: true
  });
  const adapterSelection = registry.getAdapter({
    ...mergedSettings,
    providerDescriptor
  });

  return {
    providerAdapter: adapterSelection.adapter,
    providerDescriptor,
    modelRoute,
    userSettings: resolvedUserSettings,
    providerConfig
  };
}

const importRecords = new Map();
const allowedConnectors = new Set(["markdown", "obsidian", "zotero", "readwise", "notebooklm"]);
const authChallenges = new Map();
const authSessions = new Map();
const authUsers = new Map();
const authBillingByUserId = new Map();

function stableAssetId(importRecordId, relativePath) {
  const hash = createHash("sha1").update(`${importRecordId}:${relativePath}`).digest("hex").slice(0, 12);
  return `asset_${hash}`;
}

function normalizeRelativeFileTarget(value) {
  const raw = String(value || "").trim().replaceAll("\\", "/");
  if (!raw) return null;
  if (raw.startsWith("/") || raw.includes("://")) return null;
  const normalized = path.posix.normalize(raw);
  if (!normalized || normalized === "." || normalized.startsWith("..") || normalized.includes("/../")) return null;
  return normalized;
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function cleanText(value) {
  return String(value || "").trim();
}

function stringArray(value) {
  if (Array.isArray(value)) return value.map(cleanText).filter(Boolean);
  if (value === undefined || value === null || value === "") return [];
  return [cleanText(value)].filter(Boolean);
}

async function loadNotesByIds(noteIds = []) {
  const ids = [...new Set(stringArray(noteIds))];
  const items = [];
  for (const noteId of ids) {
    items.push(await getNoteById(VAULT_PATH, noteId));
  }
  return items;
}

async function readYijingKnowledgeNetworkFixture() {
  return JSON.parse(await fs.readFile(YIJING_KNOWLEDGE_NETWORK_FIXTURE_PATH, "utf8"));
}

function defaultUserForEmail(email = "") {
  const normalized = normalizeEmail(email);
  return {
    id: `user_${normalized.replace(/[^a-z0-9]+/gi, "_")}`,
    email: normalized,
    createdAt: new Date().toISOString()
  };
}

function billingForUserId(userId = "", fallbackEmail = "") {
  const normalizedUserId = String(userId || "").trim();
  const normalizedEmail = normalizeEmail(fallbackEmail);
  const existing = authBillingByUserId.get(normalizedUserId);
  if (existing) return cloneJson(existing);
  const initial = defaultBillingForEmail(normalizedEmail);
  authBillingByUserId.set(normalizedUserId, initial);
  return cloneJson(initial);
}

async function persistAuthState() {
  const authState = {
    users: [...authUsers.values()],
    billingByUserId: Object.fromEntries(authBillingByUserId.entries()),
    sessions: [...authSessions.values()].map((session) => ({
      token: session.token,
      userId: session.userId || session.user?.id,
      email: session.email || session.user?.email,
      createdAt: session.createdAt
    }))
  };
  await fs.mkdir(path.dirname(AUTH_STATE_PATH), { recursive: true });
  await fs.writeFile(AUTH_STATE_PATH, JSON.stringify(authState, null, 2), "utf8");
}

async function loadAuthState() {
  try {
    const raw = await fs.readFile(AUTH_STATE_PATH, "utf8");
    const parsed = JSON.parse(raw);
    authUsers.clear();
    authBillingByUserId.clear();
    authSessions.clear();

    for (const user of Array.isArray(parsed?.users) ? parsed.users : []) {
      if (!user?.id || !user?.email) continue;
      authUsers.set(String(user.id), user);
    }

    for (const [userId, billing] of Object.entries(parsed?.billingByUserId || {})) {
      const normalizedUserId = String(userId || "").trim();
      if (!normalizedUserId) continue;
      const email = normalizeEmail(billing?.email || authUsers.get(normalizedUserId)?.email || "");
      authBillingByUserId.set(normalizedUserId, {
        ...defaultBillingForEmail(email),
        ...billing,
        email
      });
    }

    if (Object.keys(parsed?.billingByUserId || {}).length === 0) {
      for (const [email, billing] of Object.entries(parsed?.billingByEmail || {})) {
        const normalized = normalizeEmail(email);
        if (!normalized) continue;
        const user = [...authUsers.values()].find((item) => normalizeEmail(item.email) === normalized) || defaultUserForEmail(normalized);
        authUsers.set(String(user.id), user);
        authBillingByUserId.set(String(user.id), {
          ...defaultBillingForEmail(normalized),
          ...billing,
          email: normalized
        });
      }
    }

    for (const session of Array.isArray(parsed?.sessions) ? parsed.sessions : []) {
      if (!session?.token) continue;
      const sessionEmail = normalizeEmail(session.email || session?.user?.email || "");
      const sessionUserId = String(session.userId || session?.user?.id || "");
      if (!sessionEmail || !sessionUserId) continue;

      if (!authUsers.has(sessionUserId)) {
        authUsers.set(sessionUserId, {
          ...defaultUserForEmail(sessionEmail),
          id: sessionUserId
        });
      }
      if (!authBillingByUserId.has(sessionUserId)) {
        authBillingByUserId.set(sessionUserId, {
          ...defaultBillingForEmail(sessionEmail),
          ...(session.billing || {}),
          email: sessionEmail
        });
      }

      authSessions.set(String(session.token), {
        token: String(session.token),
        userId: sessionUserId,
        email: sessionEmail,
        createdAt: session.createdAt || new Date().toISOString()
      });
    }

    if (!Array.isArray(parsed?.users) && Array.isArray(parsed?.sessions)) {
      for (const legacy of parsed.sessions) {
        const email = normalizeEmail(legacy?.user?.email || legacy?.email || "");
        if (!email) continue;
        const user = legacy?.user || defaultUserForEmail(email);
        authUsers.set(String(user.id), {
          ...defaultUserForEmail(email),
          ...user,
          email
        });
        authBillingByUserId.set(String(user.id), {
          ...defaultBillingForEmail(email),
          ...(legacy?.billing || {}),
          email
        });
        authSessions.set(String(legacy.token), {
          token: String(legacy.token),
          userId: String(user.id),
          email,
          createdAt: legacy.createdAt || new Date().toISOString()
        });
      }
    }
  } catch (error) {
    if (error?.code !== "ENOENT") {
      console.warn(`Auth state load failed: ${String(error?.message || error)}`);
    }
  }
}

function normalizeEmail(value = "") {
  return String(value || "").trim().toLowerCase();
}

function authTokenFromReq(req) {
  const header = String(req.headers.authorization || "").trim();
  if (!header.toLowerCase().startsWith("bearer ")) return "";
  return header.slice(7).trim();
}

function defaultBillingForEmail(email = "") {
  return {
    plan: "free",
    status: "free",
    email,
    renewsAt: null
  };
}

function publicSession(session) {
  const user = authUsers.get(String(session.userId || "")) || defaultUserForEmail(session.email || "");
  const billing = billingForUserId(user.id, user.email);
  return {
    token: session.token,
    user,
    billing
  };
}

function sessionFromReq(req) {
  const token = authTokenFromReq(req);
  if (!token) return null;
  const session = authSessions.get(token);
  if (!session) return null;
  return { token, session };
}

async function getStripeClient() {
  if (!STRIPE_SECRET_KEY) return null;
  if (!stripeClientPromise) {
    stripeClientPromise = import("stripe")
      .then(({ default: Stripe }) => new Stripe(STRIPE_SECRET_KEY))
      .catch(() => null);
  }
  return stripeClientPromise;
}

function billingMode() {
  return STRIPE_SECRET_KEY && STRIPE_PRICE_PRO_MONTHLY ? "stripe" : "mock";
}

function updateBillingForUserId(userId = "", fallbackEmail = "", patch = {}) {
  const normalizedUserId = String(userId || "").trim();
  const normalizedEmail = normalizeEmail(fallbackEmail);
  if (!normalizedUserId) return 0;
  const next = {
    ...defaultBillingForEmail(normalizedEmail),
    ...(authBillingByUserId.get(normalizedUserId) || {}),
    ...patch,
    email: normalizeEmail(patch.email || normalizedEmail)
  };
  authBillingByUserId.set(normalizedUserId, next);
  return 1;
}

async function updateBillingForUserIdAndPersist(userId = "", fallbackEmail = "", patch = {}) {
  const updated = updateBillingForUserId(userId, fallbackEmail, patch);
  if (updated > 0) {
    await persistAuthState();
  }
  return updated;
}

function sendJson(res, status, body) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,X-Request-Id,Authorization"
  });
  res.end(status === 204 ? "" : JSON.stringify(body, null, 2));
}

function sendBinary(res, status, contentType, body) {
  res.writeHead(status, {
    "Content-Type": contentType || "application/octet-stream",
    "Cache-Control": "no-store",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,X-Request-Id,Authorization"
  });
  res.end(body);
}

function sendHtml(res, status, body) {
  res.writeHead(status, {
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "no-store",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,X-Request-Id,Authorization"
  });
  res.end(String(body || ""));
}

function requestId(req) {
  return req.headers["x-request-id"] || `req_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
}

function err(code, message, rid, details) {
  return {
    error: { code, message, ...(details ? { details } : {}) },
    requestId: rid,
    timestamp: new Date().toISOString()
  };
}

function publicVaultInfo(layout = null) {
  return {
    vaultPath: VAULT_PATH,
    defaultVaultPath: DEFAULT_VAULT_PATH,
    initialized: Boolean(layout),
    dirs: layout?.dirs || []
  };
}

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (!chunks.length) return {};
  const raw = Buffer.concat(chunks).toString("utf8").trim();
  if (!raw) return {};
  return JSON.parse(raw);
}

async function readRaw(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks);
}

function parseConfirmPath(urlPath) {
  const m = urlPath.match(/^\/api\/v1\/imports\/([^/]+)\/confirm$/);
  return m ? m[1] : null;
}

function parseRollbackPath(urlPath) {
  const m = urlPath.match(/^\/api\/v1\/imports\/([^/]+)\/rollback$/);
  return m ? m[1] : null;
}

function parseImportRecordPath(urlPath) {
  const m = urlPath.match(/^\/api\/v1\/imports\/([^/]+)$/);
  return m ? m[1] : null;
}

function parseConnectorPath(urlPath) {
  const m = urlPath.match(/^\/api\/v1\/imports\/(markdown|obsidian|zotero|readwise|notebooklm)$/);
  return m ? m[1] : null;
}

function parsePaperPath(urlPath) {
  const m = urlPath.match(/^\/api\/v1\/papers\/([^/]+)$/);
  return m ? decodeURIComponent(m[1]) : null;
}

function parsePaperNotebookLmDraftsPath(urlPath) {
  const m = urlPath.match(/^\/api\/v1\/papers\/([^/]+)\/notebooklm-drafts$/);
  return m ? decodeURIComponent(m[1]) : null;
}

function parsePaperTranslationsPath(urlPath) {
  const m = urlPath.match(/^\/api\/v1\/papers\/([^/]+)\/translations$/);
  return m ? decodeURIComponent(m[1]) : null;
}

function parsePaperPermanentCandidatesPath(urlPath) {
  const m = urlPath.match(/^\/api\/v1\/papers\/([^/]+)\/permanent-candidates$/);
  return m ? decodeURIComponent(m[1]) : null;
}

function parsePaperPermanentNotesPath(urlPath) {
  const m = urlPath.match(/^\/api\/v1\/papers\/([^/]+)\/permanent-notes$/);
  return m ? decodeURIComponent(m[1]) : null;
}

function bucketFromCandidateId(candidates = {}) {
  const buckets = new Map();
  for (const item of Array.isArray(candidates.sources) ? candidates.sources : []) {
    if (item?.id) buckets.set(String(item.id), "sources");
  }
  for (const item of Array.isArray(candidates.literature) ? candidates.literature : []) {
    if (item?.id) buckets.set(String(item.id), "literature");
  }
  for (const item of Array.isArray(candidates.permanent) ? candidates.permanent : []) {
    if (item?.id) buckets.set(String(item.id), "permanent");
  }
  return buckets;
}

function buildSelectedImportCandidates(candidates = {}, selectedCandidateIds) {
  const sources = Array.isArray(candidates.sources) ? candidates.sources : [];
  const literature = Array.isArray(candidates.literature) ? candidates.literature : [];
  const permanent = Array.isArray(candidates.permanent) ? candidates.permanent : [];
  const totalCandidates = sources.length + literature.length + permanent.length;
  const byId = bucketFromCandidateId(candidates);

  if (selectedCandidateIds === undefined) {
    return {
      candidates: { sources, literature, permanent },
      selection: {
        mode: "all",
        candidateIds: [...byId.keys()],
        totalCandidates,
        selectedCandidates: totalCandidates,
        counts: {
          sources: sources.length,
          literatureNotes: literature.length,
          permanentNotes: permanent.length
        }
      }
    };
  }

  if (!Array.isArray(selectedCandidateIds)) {
    const error = new Error("selectedCandidateIds must be an array");
    error.code = "IMPORT_SELECTED_CANDIDATES_INVALID";
    throw error;
  }

  const requestedIds = [...new Set(selectedCandidateIds.map((item) => String(item || "").trim()).filter(Boolean))];
  if (!requestedIds.length) {
    const error = new Error("selectedCandidateIds must contain at least one candidate id");
    error.code = "IMPORT_SELECTION_EMPTY";
    throw error;
  }

  const unknownCandidateIds = requestedIds.filter((id) => !byId.has(id));
  if (unknownCandidateIds.length) {
    const error = new Error("selectedCandidateIds contains unknown candidate ids");
    error.code = "IMPORT_SELECTED_CANDIDATES_INVALID";
    error.details = { unknownCandidateIds };
    throw error;
  }

  const selectedSet = new Set(requestedIds);
  const selectedSources = sources.filter((item) => selectedSet.has(String(item?.id || "")));
  const selectedLiterature = literature.filter((item) => selectedSet.has(String(item?.id || "")));
  const selectedPermanent = permanent.filter((item) => selectedSet.has(String(item?.id || "")));

  return {
    candidates: {
      sources: selectedSources,
      literature: selectedLiterature,
      permanent: selectedPermanent
    },
    selection: {
      mode: requestedIds.length === totalCandidates ? "all" : "subset",
      candidateIds: requestedIds,
      totalCandidates,
      selectedCandidates: requestedIds.length,
      counts: {
        sources: selectedSources.length,
        literatureNotes: selectedLiterature.length,
        permanentNotes: selectedPermanent.length
      }
    }
  };
}

function parseDirectoryNotesPath(urlPath) {
  const m = urlPath.match(/^\/api\/v1\/directories\/([^/]+)\/notes$/);
  return m ? decodeURIComponent(m[1]) : null;
}

function parseTagNotesPath(urlPath) {
  const m = urlPath.match(/^\/api\/v1\/tags\/([^/]+)\/notes$/);
  return m ? decodeURIComponent(m[1]) : null;
}

function parseDirectoryPath(urlPath) {
  const m = urlPath.match(/^\/api\/v1\/directories\/([^/]+)$/);
  return m ? decodeURIComponent(m[1]) : null;
}

function parseNotePath(urlPath) {
  const m = urlPath.match(/^\/api\/v1\/notes\/([^/]+)$/);
  return m ? decodeURIComponent(m[1]) : null;
}

function parsePermanentNoteDistillationPath(urlPath) {
  const m = urlPath.match(/^\/api\/v1\/permanent-notes\/([^/]+)\/distillation$/);
  return m ? decodeURIComponent(m[1]) : null;
}

function parsePermanentNoteDistillationConfirmPath(urlPath) {
  const m = urlPath.match(/^\/api\/v1\/permanent-notes\/([^/]+)\/distillation\/confirm$/);
  return m ? decodeURIComponent(m[1]) : null;
}

function parseNoteRelationsPath(urlPath) {
  const m = urlPath.match(/^\/api\/v1\/notes\/([^/]+)\/relations$/);
  return m ? decodeURIComponent(m[1]) : null;
}

function parseNoteAiAnalysisPath(urlPath) {
  const m = urlPath.match(/^\/api\/v1\/notes\/([^/]+)\/ai-analysis$/);
  return m ? decodeURIComponent(m[1]) : null;
}

function parseRelationPath(urlPath) {
  const m = urlPath.match(/^\/api\/v1\/relations\/([^/]+)$/);
  return m ? decodeURIComponent(m[1]) : null;
}

function parseMoveNotePath(urlPath) {
  const m = urlPath.match(/^\/api\/v1\/notes\/([^/]+)\/move$/);
  return m ? decodeURIComponent(m[1]) : null;
}

function parseScheduledTaskPath(urlPath) {
  const m = urlPath.match(/^\/api\/v1\/ai\/scheduled-tasks\/([^/]+)$/);
  return m ? decodeURIComponent(m[1]) : null;
}

function parseScheduledTaskStatusPath(urlPath) {
  const m = urlPath.match(/^\/api\/v1\/ai\/scheduled-tasks\/([^/]+)\/status$/);
  return m ? decodeURIComponent(m[1]) : null;
}

function parseAiInboxItemPath(urlPath) {
  const m = urlPath.match(/^\/api\/v1\/ai\/inbox\/([^/]+)$/);
  return m ? decodeURIComponent(m[1]) : null;
}

function parseAiInboxDecisionPath(urlPath) {
  const m = urlPath.match(/^\/api\/v1\/ai\/inbox\/([^/]+)\/decision$/);
  return m ? decodeURIComponent(m[1]) : null;
}

function parseAiInboxAcceptLinkPath(urlPath) {
  const m = urlPath.match(/^\/api\/v1\/ai\/inbox\/([^/]+)\/accept-link$/);
  return m ? decodeURIComponent(m[1]) : null;
}

function parseAiInboxPromoteNotePath(urlPath) {
  const m = urlPath.match(/^\/api\/v1\/ai\/inbox\/([^/]+)\/promote-note$/);
  return m ? decodeURIComponent(m[1]) : null;
}

function parseAiInboxSummarizePath(urlPath) {
  const m = urlPath.match(/^\/api\/v1\/ai\/inbox\/([^/]+)\/summarize$/);
  return m ? decodeURIComponent(m[1]) : null;
}

function assetContentType(filePath) {
  const ext = path.extname(String(filePath || "")).toLowerCase();
  if (ext === ".png") return "image/png";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".gif") return "image/gif";
  if (ext === ".webp") return "image/webp";
  if (ext === ".svg") return "image/svg+xml";
  if (ext === ".bmp") return "image/bmp";
  if (ext === ".ico") return "image/x-icon";
  if (ext === ".pdf") return "application/pdf";
  if (ext === ".md") return "text/markdown; charset=utf-8";
  if (ext === ".txt") return "text/plain; charset=utf-8";
  return "application/octet-stream";
}

function defaultDirectoryIdForImportNoteType(noteType) {
  if (noteType === "literature") return "dir_literature_default";
  if (noteType === "fleeting") return "dir_fleeting_default";
  return "dir_original_default";
}

function normalizeAiInboxDecision(body = {}) {
  const raw = cleanText(body.decision || body.action || body.status);
  const aliases = {
    accept: "accepted",
    accepted: "accepted",
    ignore: "ignored",
    ignored: "ignored",
    archive: "archived",
    archived: "archived"
  };
  return aliases[raw] || raw;
}

function assertReviewDecision(decision) {
  if (["accepted", "revised", "ignored", "archived"].includes(decision)) return;
  const error = new Error("Use a dedicated promotion API for promoted_to_note or linked_to_note decisions");
  error.code = "AI_ARTIFACT_DECISION_INVALID";
  throw error;
}

function recommendedAiInboxActionFromText(text = "") {
  const raw = cleanText(text).toLowerCase();
  if (!raw) return "";
  const match = raw.match(/recommended\s+action\s*[:：]\s*([a-z_ -]+)/i);
  const candidate = cleanText(match?.[1] || "")
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

function hasExplicitConfirmation(body = {}) {
  return body.confirm === true || body.confirmed === true || body.userConfirmed === true || body.user_confirmed === true;
}

function noteEndpointId(endpoint = {}) {
  const kind = cleanText(endpoint.kind || endpoint.type || "note").toLowerCase();
  if (kind && kind !== "note") {
    const error = new Error("LinkSuggestion acceptance only supports note-to-note relations");
    error.code = "AI_LINK_SUGGESTION_NOTE_ENDPOINT_REQUIRED";
    throw error;
  }
  return cleanText(endpoint.id || endpoint.noteId || endpoint.note_id);
}

function relationInputFromLinkSuggestion(artifact = {}, body = {}) {
  if (artifact.type !== "LinkSuggestion") {
    const error = new Error("artifact must be a LinkSuggestion");
    error.code = "AI_LINK_SUGGESTION_REQUIRED";
    throw error;
  }
  const payload = artifact.payload || {};
  const suggestedFromNoteId = noteEndpointId(payload.from || {});
  const suggestedToNoteId = noteEndpointId(payload.to || {});
  const fromNoteId = cleanText(body.fromNoteId || body.from_note_id) || suggestedFromNoteId;
  const toNoteId = cleanText(body.toNoteId || body.to_note_id) || suggestedToNoteId;
  const relationType = cleanText(body.relationType || body.relation_type || payload.relationType || payload.relation_type || "related").toLowerCase();
  const rationale = cleanText(body.rationale || payload.rationale || artifact.summary);
  const confidence = body.confidence ?? body.confidenceScore ?? body.confidence_score ?? artifact.confidence?.score;
  return {
    fromNoteId,
    toNoteId,
    relationType,
    rationale,
    confidence
  };
}

const NOTE_PROMOTION_ARTIFACT_TYPES = new Set(["QuestionCard", "ReflectionPrompt"]);

function latestPromotedNoteDecision(artifact = {}) {
  const decisions = Array.isArray(artifact.userDecisions) ? artifact.userDecisions : [];
  return decisions
    .slice()
    .reverse()
    .find((decision) => decision?.decision === "promoted_to_note" && cleanText(decision.noteId || decision.note_id));
}

function firstCleanText(...values) {
  for (const value of values) {
    const text = cleanText(value);
    if (text) return text;
  }
  return "";
}

function promoteNoteInputFromArtifact(artifact = {}, body = {}) {
  if (!NOTE_PROMOTION_ARTIFACT_TYPES.has(artifact.type)) {
    const error = new Error("artifact must be a QuestionCard or ReflectionPrompt");
    error.code = "AI_NOTE_PROMOTION_ARTIFACT_TYPE_INVALID";
    throw error;
  }

  const existingPromotion = latestPromotedNoteDecision(artifact);
  if (existingPromotion) {
    const error = new Error("artifact has already been promoted to a note");
    error.code = "AI_ARTIFACT_ALREADY_PROMOTED";
    error.details = { noteId: existingPromotion.noteId || existingPromotion.note_id };
    throw error;
  }

  const payload = artifact.payload && typeof artifact.payload === "object" ? artifact.payload : {};
  const title = firstCleanText(
    body.title,
    payload.noteTitle,
    payload.note_title,
    payload.title,
    payload.question,
    payload.prompt,
    artifact.title,
    "AI artifact draft"
  );
  const mainBody = firstCleanText(
    body.body,
    payload.draft,
    payload.question,
    payload.prompt,
    payload.body,
    artifact.body,
    artifact.summary
  );
  const sourceNoteIds = Array.isArray(artifact.sources?.noteIds) ? artifact.sources.noteIds.filter(Boolean) : [];
  const sourceLines = sourceNoteIds.length
    ? ["", "## Source notes", ...sourceNoteIds.map((noteId) => `- ${noteId}`)]
    : [];
  const contextLines = [
    "",
    "## AI artifact context",
    `- Artifact: ${artifact.id}`,
    `- Type: ${artifact.type}`,
    `- Agent run: ${artifact.agentRunId || "unknown"}`,
    `- Context pack: ${artifact.contextPackId || "none"}`,
    `- Privacy: ${artifact.privacy?.mode || "normal"}`
  ];
  const summaryLines = artifact.summary ? ["", "## Summary", artifact.summary] : [];
  const payloadRationale = firstCleanText(payload.rationale, payload.whyItMatters, payload.why_it_matters);
  const rationaleLines = payloadRationale ? ["", "## Rationale", payloadRationale] : [];

  return {
    directoryId: cleanText(body.directoryId || body.directory_id) || "dir_fleeting_default",
    title,
    body: [
      `# ${title}`,
      "",
      "AI artifact draft. Review, revise, or delete before treating it as your own note.",
      "",
      "## Draft",
      mainBody || "No draft body recorded.",
      ...summaryLines,
      ...rationaleLines,
      ...sourceLines,
      ...contextLines
    ].join("\n"),
    status: cleanText(body.status) || "draft"
  };
}

function titleForCatalogNote(candidate) {
  const explicit = String(candidate?.title || "").trim();
  if (explicit) return explicit;
  const firstLine = String(candidate?.core_claim || candidate?.quote_text || "")
    .trim()
    .split(/\r?\n/)[0]
    ?.trim();
  return firstLine || String(candidate?.id || "imported-note");
}

async function registerImportCatalogNote(candidate, noteType, writeResult) {
  if (!writeResult?.written) return null;
  return registerMarkdownNoteInCatalog(VAULT_PATH, {
    noteId: candidate.id,
    noteType,
    title: titleForCatalogNote(candidate),
    status: candidate.status || "draft",
    markdownPath: path.relative(path.resolve(VAULT_PATH), writeResult.path).replaceAll("\\", "/"),
    directoryId: defaultDirectoryIdForImportNoteType(noteType)
  });
}

async function createPreview(connector, payload, options, rid) {
  const originalityPlan = normalizeOriginalityPlan(options?.originalityPlan || {});
  const built =
    connector === "markdown" || connector === "obsidian"
      ? await buildMarkdownCandidates({ connector, payload, options, cwd: CWD })
      : buildExternalCandidates(connector, payload);
  const guard = originalityGuard(built, originalityPlan);
  const warnings = [...built.warnings, ...guard.warnings];
  const importRecordId = `imp_${Date.now()}_${randomUUID().slice(0, 8)}`;
  const candidatePreview = summarizeImportCandidates(built, guard);
  const preview = {
    importRecordId,
    status: "preview",
    connector,
    summary: {
      sources: built.sources.length,
      literatureNotes: built.literature.length,
      permanentNotes: built.permanent.length,
      warnings: warnings.reduce((a, b) => a + Number(b.count || 1), 0)
    },
    samples: {
      sourceIds: built.sources.slice(0, 3).map((x) => x.id),
      literatureNoteIds: built.literature.slice(0, 3).map((x) => x.id),
      permanentNoteIds: built.permanent.slice(0, 3).map((x) => x.id)
    },
    candidatePreview,
    warnings,
    originalityGuard: {
      plan: guard.plan,
      flaggedPermanentIds: guard.flaggedPermanentIds,
      evaluations: guard.evaluations
    },
    createdAt: new Date().toISOString()
  };

  importRecords.set(importRecordId, { ...preview, state: "preview", payload, options, candidates: built, updatedAt: preview.createdAt });
  await initVault(VAULT_PATH);
  await appendImportRecord(VAULT_PATH, connector, importRecordId, "preview", { requestId: rid, preview, payload, options, candidates: built });
  return preview;
}

async function getImportRecord(recordId) {
  const memoryRecord = importRecords.get(recordId);
  if (memoryRecord) return memoryRecord;
  const diskRecord = await loadImportRecord(VAULT_PATH, recordId);
  if (diskRecord) importRecords.set(recordId, diskRecord);
  return diskRecord;
}

async function getImportRecordList({ limit = 50 } = {}) {
  const requestedLimit = Number.isFinite(Number(limit)) ? Math.max(0, Math.min(200, Number(limit))) : 50;
  const diskRecords = await listImportRecords(VAULT_PATH, { limit: Math.max(requestedLimit, importRecords.size, 50) });
  const byId = new Map(diskRecords.map((record) => [record.importRecordId, record]));
  for (const record of importRecords.values()) {
    byId.set(record.importRecordId, record);
  }
  const records = [...byId.values()].sort((a, b) => {
    const byUpdatedAt = String(b.updatedAt || b.createdAt || "").localeCompare(String(a.updatedAt || a.createdAt || ""));
    if (byUpdatedAt !== 0) return byUpdatedAt;
    return String(b.importRecordId || "").localeCompare(String(a.importRecordId || ""));
  });
  return {
    total: records.length,
    items: records.slice(0, requestedLimit)
  };
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
  const rid = requestId(req);

  try {
    if (req.method === "OPTIONS") return sendJson(res, 204, {});

    if (req.method === "GET" && (url.pathname === "/" || url.pathname === "/index.html")) {
      return sendHtml(
        res,
        200,
        `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>研思录 API 开发入口</title>
    <meta http-equiv="refresh" content="0; url=${PROTOTYPE_URL}" />
    <style>
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        background: #f3f5f9;
        color: #0f172a;
        font-family: "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
      }
      .card {
        width: min(560px, calc(100vw - 40px));
        padding: 28px 30px;
        border-radius: 18px;
        background: #ffffff;
        box-shadow: 0 18px 48px rgba(15, 23, 42, 0.08);
      }
      h1 {
        margin: 0 0 10px;
        font-size: 24px;
      }
      p {
        margin: 0 0 14px;
        line-height: 1.65;
        color: #475569;
      }
      .actions {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
        margin-top: 18px;
      }
      a {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 140px;
        padding: 10px 14px;
        border-radius: 10px;
        text-decoration: none;
        font-weight: 600;
      }
      .primary {
        background: #0f172a;
        color: #ffffff;
      }
      .secondary {
        background: #eef2f7;
        color: #0f172a;
      }
      code {
        padding: 2px 6px;
        border-radius: 6px;
        background: #eef2f7;
      }
    </style>
    <script>
      window.location.replace(${JSON.stringify(PROTOTYPE_URL)});
    </script>
  </head>
  <body>
    <div class="card">
      <h1>研思录开发服务已启动</h1>
      <p>你当前打开的是 <code>API 端口 ${PORT}</code>，不是前端原型页。页面会自动跳转到可操作的原型界面。</p>
      <p>如果没有自动跳转，可以手动打开下面的入口。</p>
      <div class="actions">
        <a class="primary" href="${PROTOTYPE_URL}">打开原型界面</a>
        <a class="secondary" href="/health">查看 API 健康状态</a>
        <a class="secondary" href="/api/v1/vault">查看 Vault 信息</a>
      </div>
    </div>
  </body>
</html>`
      );
    }

    if (req.method === "GET" && url.pathname === "/health") {
      return sendJson(res, 200, { ok: true, service: "api", requestId: rid, vaultPath: VAULT_PATH, time: new Date().toISOString() });
    }

    if (req.method === "POST" && url.pathname === "/api/v1/auth/start") {
      const body = await readJson(req);
      const email = normalizeEmail(body.email);
      if (!email) return sendJson(res, 400, err("AUTH_EMAIL_REQUIRED", "email is required", rid));
      const challengeId = `authc_${Date.now()}_${randomUUID().slice(0, 8)}`;
      const code = "123456";
      authChallenges.set(challengeId, {
        challengeId,
        email,
        code,
        createdAt: new Date().toISOString()
      });
      return sendJson(res, 200, {
        challengeId,
        email,
        delivery: "mock_code",
        codeHint: code,
        requestId: rid,
        timestamp: new Date().toISOString()
      });
    }

    if (req.method === "POST" && url.pathname === "/api/v1/auth/verify") {
      const body = await readJson(req);
      const challengeId = String(body.challengeId || body.challenge_id || "").trim();
      const code = String(body.code || "").trim();
      const challenge = authChallenges.get(challengeId);
      if (!challenge) return sendJson(res, 400, err("AUTH_CHALLENGE_INVALID", "challenge is invalid or expired", rid));
      if (challenge.code !== code) return sendJson(res, 400, err("AUTH_CODE_INVALID", "verification code is invalid", rid));

      authChallenges.delete(challengeId);
      const token = `auts_${Date.now()}_${randomUUID().replaceAll("-", "").slice(0, 18)}`;
      const user = authUsers.get(`user_${challenge.email.replace(/[^a-z0-9]+/gi, "_")}`) || defaultUserForEmail(challenge.email);
      authUsers.set(String(user.id), user);
      if (!authBillingByUserId.has(String(user.id))) {
        authBillingByUserId.set(String(user.id), defaultBillingForEmail(challenge.email));
      }
      const session = {
        token,
        userId: String(user.id),
        email: challenge.email,
        createdAt: new Date().toISOString()
      };
      authSessions.set(token, session);
      await persistAuthState();
      return sendJson(res, 200, {
        session: publicSession(session),
        requestId: rid,
        timestamp: new Date().toISOString()
      });
    }

    if (req.method === "GET" && url.pathname === "/api/v1/me") {
      const token = authTokenFromReq(req);
      const session = authSessions.get(token);
      if (!session) return sendJson(res, 401, err("AUTH_REQUIRED", "authentication required", rid));
      return sendJson(res, 200, {
        session: publicSession(session),
        requestId: rid,
        timestamp: new Date().toISOString()
      });
    }

    if (req.method === "POST" && url.pathname === "/api/v1/auth/logout") {
      const token = authTokenFromReq(req);
      if (token) {
        authSessions.delete(token);
        await persistAuthState();
      }
      return sendJson(res, 200, {
        ok: true,
        requestId: rid,
        timestamp: new Date().toISOString()
      });
    }

    if (req.method === "GET" && url.pathname === "/api/v1/billing/status") {
      const token = authTokenFromReq(req);
      const session = authSessions.get(token);
      if (!session) return sendJson(res, 401, err("AUTH_REQUIRED", "authentication required", rid));
      const billing = billingForUserId(session.userId, session.email);
      return sendJson(res, 200, {
        item: billing,
        mode: billingMode(),
        requestId: rid,
        timestamp: new Date().toISOString()
      });
    }

    if (req.method === "POST" && url.pathname === "/api/v1/billing/checkout-session") {
      const auth = sessionFromReq(req);
      if (!auth) return sendJson(res, 401, err("AUTH_REQUIRED", "authentication required", rid));
      const body = await readJson(req);
      const plan = String(body.plan || "pro").trim().toLowerCase();
      if (plan !== "pro") return sendJson(res, 400, err("BILLING_PLAN_INVALID", "only pro is supported in this mock flow", rid));
      const successUrl = String(body.successUrl || `${APP_BASE_URL}/checkout/success`).trim();
      const cancelUrl = String(body.cancelUrl || `${APP_BASE_URL}/checkout/cancel`).trim();

      if (billingMode() === "stripe") {
        const stripe = await getStripeClient();
        if (!stripe) {
          return sendJson(res, 500, err("BILLING_STRIPE_UNAVAILABLE", "stripe client failed to initialize", rid));
        }
        const sessionView = publicSession(auth.session);
        try {
          const session = await stripe.checkout.sessions.create({
            mode: "subscription",
            success_url: successUrl,
            cancel_url: cancelUrl,
            customer_email: sessionView.user.email,
            line_items: [
              {
                price: STRIPE_PRICE_PRO_MONTHLY,
                quantity: 1
              }
            ],
            metadata: {
              appUserId: sessionView.user.id,
              appUserEmail: sessionView.user.email,
              plan
            }
          });
          return sendJson(res, 200, {
            item: {
              plan,
              mode: "stripe",
              checkoutUrl: session.url,
              checkoutSessionId: session.id,
              cancelUrl
            },
            requestId: rid,
            timestamp: new Date().toISOString()
          });
        } catch (stripeError) {
          return sendJson(res, 400, err("BILLING_STRIPE_CHECKOUT_FAILED", String(stripeError?.message || stripeError), rid));
        }
      }

      return sendJson(res, 200, {
        item: {
          plan,
          mode: "mock_checkout",
          checkoutUrl: `${successUrl}?plan=pro`,
          cancelUrl
        },
        requestId: rid,
        timestamp: new Date().toISOString()
      });
    }

    if (req.method === "POST" && url.pathname === "/api/v1/billing/portal-session") {
      const auth = sessionFromReq(req);
      if (!auth) return sendJson(res, 401, err("AUTH_REQUIRED", "authentication required", rid));

      const billing = billingForUserId(auth.session.userId, auth.session.email);
      const returnUrl = String(
        (await readJson(req).catch(() => ({})))?.returnUrl || `${APP_BASE_URL}/billing`
      ).trim();

      if (billingMode() === "stripe") {
        const stripe = await getStripeClient();
        if (!stripe) {
          return sendJson(res, 500, err("BILLING_STRIPE_UNAVAILABLE", "stripe client failed to initialize", rid));
        }
        if (!billing?.stripeCustomerId) {
          return sendJson(res, 400, err("BILLING_PORTAL_UNAVAILABLE", "stripe customer is not ready for this account", rid));
        }

        try {
          const session = await stripe.billingPortal.sessions.create({
            customer: String(billing.stripeCustomerId),
            return_url: returnUrl
          });
          return sendJson(res, 200, {
            item: {
              mode: "stripe",
              portalUrl: session.url,
              returnUrl
            },
            requestId: rid,
            timestamp: new Date().toISOString()
          });
        } catch (stripeError) {
          return sendJson(res, 400, err("BILLING_PORTAL_CREATE_FAILED", String(stripeError?.message || stripeError), rid));
        }
      }

      return sendJson(res, 200, {
        item: {
          mode: "mock_portal",
          portalUrl: `${APP_BASE_URL}/billing?portal=mock`,
          returnUrl
        },
        requestId: rid,
        timestamp: new Date().toISOString()
      });
    }

    if (req.method === "POST" && url.pathname === "/api/v1/billing/mock-complete") {
      const auth = sessionFromReq(req);
      if (!auth) return sendJson(res, 401, err("AUTH_REQUIRED", "authentication required", rid));
      const nextBilling = {
        ...billingForUserId(auth.session.userId, auth.session.email),
        plan: "pro",
        status: "active",
        renewsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        email: auth.session.email
      };
      authBillingByUserId.set(String(auth.session.userId), nextBilling);
      await persistAuthState();
      return sendJson(res, 200, {
        item: nextBilling,
        requestId: rid,
        timestamp: new Date().toISOString()
      });
    }

    if (req.method === "POST" && url.pathname === "/api/v1/billing/webhook/stripe") {
      if (!STRIPE_SECRET_KEY) {
        return sendJson(res, 400, err("BILLING_STRIPE_UNAVAILABLE", "stripe is not configured", rid));
      }
      const stripe = await getStripeClient();
      if (!stripe) {
        return sendJson(res, 500, err("BILLING_STRIPE_UNAVAILABLE", "stripe client failed to initialize", rid));
      }

      try {
        const rawBody = await readRaw(req);
        const signature = String(req.headers["stripe-signature"] || "");
        const event = STRIPE_WEBHOOK_SECRET
          ? stripe.webhooks.constructEvent(rawBody, signature, STRIPE_WEBHOOK_SECRET)
          : JSON.parse(rawBody.toString("utf8"));

        const type = String(event?.type || "");
        const object = event?.data?.object || {};
        let updated = 0;

        if (type === "checkout.session.completed") {
          const email =
            object?.customer_details?.email ||
            object?.customer_email ||
            object?.metadata?.appUserEmail ||
            "";
          const userId = String(object?.metadata?.appUserId || authUsers.get(`user_${email.replace(/[^a-z0-9]+/gi, "_")}`)?.id || "");
          updated = await updateBillingForUserIdAndPersist(userId, email, {
            plan: "pro",
            status: "active",
            renewsAt: null,
            stripeCustomerId: object?.customer || null,
            stripeSubscriptionId: object?.subscription || null
          });
        }

        if (type === "customer.subscription.created" || type === "customer.subscription.updated") {
          const email = object?.metadata?.appUserEmail || "";
          const userId = String(object?.metadata?.appUserId || authUsers.get(`user_${email.replace(/[^a-z0-9]+/gi, "_")}`)?.id || "");
          updated = await updateBillingForUserIdAndPersist(userId, email, {
            plan: "pro",
            status: String(object?.status || "active"),
            renewsAt: object?.current_period_end ? new Date(Number(object.current_period_end) * 1000).toISOString() : null,
            stripeCustomerId: object?.customer || null,
            stripeSubscriptionId: object?.id || null
          });
        }

        if (type === "customer.subscription.deleted") {
          const email = object?.metadata?.appUserEmail || "";
          const userId = String(object?.metadata?.appUserId || authUsers.get(`user_${email.replace(/[^a-z0-9]+/gi, "_")}`)?.id || "");
          updated = await updateBillingForUserIdAndPersist(userId, email, {
            plan: "free",
            status: "canceled",
            renewsAt: null,
            stripeSubscriptionId: object?.id || null
          });
        }

        return sendJson(res, 200, {
          ok: true,
          eventType: type,
          updatedSessions: updated,
          requestId: rid,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        return sendJson(res, 400, err("BILLING_STRIPE_WEBHOOK_FAILED", String(error?.message || error), rid));
      }
    }

    if (req.method === "GET" && url.pathname === "/api/v1/vault") {
      try {
        const layout = await initVault(VAULT_PATH);
        return sendJson(res, 200, {
          item: publicVaultInfo(layout),
          requestId: rid,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        return sendJson(res, 500, err("VAULT_INIT_FAILED", String(error?.message || error), rid));
      }
    }

    if (req.method === "POST" && url.pathname === "/api/v1/vault") {
      const body = await readJson(req);
      const nextVaultPathRaw = String(body.vaultPath || "").trim();
      if (!nextVaultPathRaw) return sendJson(res, 400, err("VAULT_PATH_REQUIRED", "vaultPath required", rid));
      const nextVaultPath = path.resolve(nextVaultPathRaw);
      try {
        const layout = await initVault(nextVaultPath);
        VAULT_PATH = layout.vaultPath;
        AUTH_STATE_PATH = path.resolve(VAULT_PATH, ".yansilu", "auth-state.json");
        importRecords.clear();
        aiPreferencesStorePromise = null;
        aiProviderConfigStorePromise = null;
        aiProviderHealthStorePromise = null;
        aiScheduledTaskStorePromise = null;
        aiArtifactStorePromise = null;
        await loadAuthState();
        return sendJson(res, 200, {
          item: publicVaultInfo(layout),
          requestId: rid,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        return sendJson(res, 400, err("VAULT_SWITCH_FAILED", String(error?.message || error), rid));
      }
    }

    if (req.method === "GET" && url.pathname === "/api/v1/ai/preferences") {
      try {
        await initVault(VAULT_PATH);
        const store = await aiPreferencesStore();
        const prefs = store.getUserPreferences({ workspaceId: "local_workspace", userId: "local_user" });
        return sendJson(res, 200, {
          item: prefs,
          requestId: rid,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        return sendJson(res, 500, err("AI_PREFERENCES_LOAD_FAILED", String(error?.message || error), rid));
      }
    }

    if (req.method === "GET" && url.pathname === "/api/v1/ai/local-runtimes/ollama/models") {
      const item = await buildOllamaModelsPreview();
      return sendJson(res, 200, {
        item,
        requestId: rid,
        timestamp: new Date().toISOString()
      });
    }

    if (req.method === "POST" && url.pathname === "/api/v1/ai/local-runtimes/ollama/pull-model") {
      try {
        const body = await readJson(req);
        const requestedModel = normalizeOllamaPullModelName(body.model || body.modelName || body.model_name);
        if (!requestedModel) return sendJson(res, 400, err("OLLAMA_MODEL_REQUIRED", "valid Ollama model name required", rid));
        const item = await pullOllamaModel(requestedModel);
        return sendJson(res, 200, {
          item,
          requestId: rid,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        return sendJson(res, 502, err("OLLAMA_PULL_FAILED", String(error?.message || error), rid, error?.details || {}));
      }
    }

    if (req.method === "GET" && url.pathname === "/api/v1/ai/provider-configs") {
      try {
        await initVault(VAULT_PATH);
        const store = await aiProviderConfigStore();
        const items = store.listProviderConfigs({
          status: url.searchParams.get("status") || "",
          limit: url.searchParams.get("limit") || 50
        });
        return sendJson(res, 200, {
          items,
          total: items.length,
          requestId: rid,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        return sendJson(res, 500, err("AI_PROVIDER_CONFIGS_LOAD_FAILED", String(error?.message || error), rid));
      }
    }

    if (req.method === "GET" && url.pathname.startsWith("/api/v1/ai/provider-configs/")) {
      try {
        await initVault(VAULT_PATH);
        const providerId = decodeURIComponent(url.pathname.slice("/api/v1/ai/provider-configs/".length));
        const store = await aiProviderConfigStore();
        const item = store.getProviderConfig({ id: providerId, providerId });
        if (!item) return sendJson(res, 404, err("AI_PROVIDER_CONFIG_NOT_FOUND", "provider config not found", rid));
        return sendJson(res, 200, {
          item,
          requestId: rid,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        return sendJson(res, 500, err("AI_PROVIDER_CONFIG_LOAD_FAILED", String(error?.message || error), rid));
      }
    }

    if (req.method === "POST" && url.pathname === "/api/v1/ai/provider-configs") {
      try {
        await initVault(VAULT_PATH);
        const body = await readJson(req);
        const store = await aiProviderConfigStore();
        const item = store.setProviderConfig(body);
        return sendJson(res, 200, {
          item,
          requestId: rid,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        return sendJson(res, 400, err("AI_PROVIDER_CONFIG_SAVE_FAILED", String(error?.message || error), rid));
      }
    }

    if (req.method === "POST" && url.pathname.startsWith("/api/v1/ai/provider-configs/") && url.pathname.endsWith("/health-check")) {
      try {
        await initVault(VAULT_PATH);
        const providerId = decodeURIComponent(url.pathname.slice("/api/v1/ai/provider-configs/".length, -"/health-check".length));
        const body = await readJson(req);
        const configStore = await aiProviderConfigStore();
        const providerConfig = configStore.getProviderConfig({ id: providerId, providerId });
        if (!providerConfig) return sendJson(res, 404, err("AI_PROVIDER_CONFIG_NOT_FOUND", "provider config not found", rid));
        const healthStore = await aiProviderHealthStore();
        const result = await runProviderHealthCheck({
          providerConfig: providerConfigWithRunnableHealthCheck(providerConfig, body),
          providerHealthStore: healthStore,
          trigger: "user_command",
          networkEnabled: body.networkEnabled !== false && body.network_enabled !== false
        });
        return sendJson(res, 200, {
          item: {
            status: result.status,
            record: result.record,
            request: result.request
              ? {
                  providerId: result.request.providerId,
                  providerConfigId: result.request.providerConfigId,
                  url: result.request.url,
                  method: result.request.init?.method || "GET",
                  expectedStatus: result.request.expectedStatus,
                  timeoutMs: result.request.timeoutMs
                }
              : null
          },
          requestId: rid,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        return sendJson(res, 400, err("AI_PROVIDER_HEALTH_CHECK_FAILED", String(error?.message || error), rid));
      }
    }

    if (req.method === "GET" && url.pathname === "/api/v1/ai/route-preview") {
      try {
        const item = await buildAiRoutePreview();
        return sendJson(res, 200, {
          item,
          requestId: rid,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        return sendJson(res, 400, err("AI_ROUTE_PREVIEW_FAILED", String(error?.message || error), rid));
      }
    }

    if (req.method === "POST" && url.pathname === "/api/v1/ai/route-preview") {
      try {
        const body = await readJson(req);
        const item = await buildAiRoutePreview(body);
        return sendJson(res, 200, {
          item,
          requestId: rid,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        return sendJson(res, 400, err("AI_ROUTE_PREVIEW_FAILED", String(error?.message || error), rid));
      }
    }

    if (req.method === "POST" && url.pathname === "/api/v1/ai/test-chat") {
      let runtime = null;
      try {
        await initVault(VAULT_PATH);
        const body = await readJson(req);
        const store = await aiPreferencesStore();
        const prefs = store.getUserPreferences({ workspaceId: "local_workspace", userId: "local_user" }) || {};
        const baseSettingsInput = preferencesToSettingsInput(prefs);

        const settingsInput = {
          ...baseSettingsInput,
          userMode: body.userMode ?? body.user_mode ?? baseSettingsInput.userMode,
          modelPack: body.modelPack ?? body.model_pack ?? baseSettingsInput.modelPack,
          authMode: body.authMode ?? body.auth_mode ?? baseSettingsInput.authMode,
          secretRef: body.secretRef ?? body.secret_ref ?? baseSettingsInput.secretRef,
          modelRef: body.modelRef ?? body.model_ref ?? baseSettingsInput.modelRef
        };

        const userSettings = resolveAiUserSettings(settingsInput);
        const providerPreset = String(userSettings.providerPreset || "").trim();
        const configStore = await aiProviderConfigStore();
        const providerConfig = providerPreset ? configStore.getProviderConfig({ providerId: providerPreset }) : null;
        const providerSettings = providerConfig ? providerConfigToSettingsInput(providerConfig) : {};
        const mergedSettings = { ...settingsInput, ...providerSettings };

        const providerDescriptor = resolveProviderDescriptor(mergedSettings);
        const modelRoute = resolveModelRoute({
          providerDescriptor,
          userMode: userSettings.userMode,
          modelTier: body.modelTier ?? body.model_tier ?? "standard",
          privacyMode: body.privacyMode ?? body.privacy_mode ?? userSettings.privacy?.defaultMode ?? "normal"
        });

        runtime = await createAiHarnessRuntime({
          storageMode: "sqlite",
          vaultPath: VAULT_PATH,
          tools: createCoreNoteTools({ vaultPath: VAULT_PATH }),
          useOpenAiCompatibleAdapter: true,
          networkEnabled: true,
          createExecutor: true
        });

        const adapterSelection = runtime.providerAdapterRegistry.getAdapter({
          ...mergedSettings,
          providerDescriptor
        });
        const providerAdapter = adapterSelection.adapter;

        const prompt = String(body.prompt || "").trim();
        if (!prompt) return sendJson(res, 400, err("AI_TEST_PROMPT_REQUIRED", "prompt is required", rid));

        const response = await providerAdapter.complete({
          requestId: `${rid}_test_chat`,
          agentRunId: rid,
          purpose: "test_chat",
          providerDescriptor,
          modelRoute,
          modelRef: modelRoute.modelRef,
          messages: [
            { role: "system", content: "You are a helpful local assistant for note-taking and knowledge work." },
            { role: "user", content: prompt }
          ],
          tools: [],
          output: { mode: "text" },
          settings: { stream: false, temperature: body.temperature },
          policy: {
            privacyMode: modelRoute.privacyMode,
            allowCloud: modelRoute.cloudAllowed,
            allowFallback: modelRoute.fallbackPolicy.allowSameProviderFallback,
            modelRoute,
            budgetPrecheck: { ok: true, confirmationRequired: false, estimatedUsage: { estimatedCost: 0, currency: "USD" } }
          }
        });
        assertProviderResponseSucceeded(response, "AI_TEST_CHAT_PROVIDER_FAILED");

        return sendJson(res, 200, {
          item: {
            providerId: response.providerId,
            modelRef: response.modelRef,
            status: response.status,
            output: response.output,
            usage: response.usage
          },
          requestId: rid,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        return sendJson(res, 400, err(error?.code || "AI_TEST_CHAT_FAILED", String(error?.message || error), rid, error?.details));
      } finally {
        if (runtime && typeof runtime.close === "function") runtime.close();
      }
    }

    if (req.method === "POST" && url.pathname === "/api/v1/ai/preferences") {
      try {
        await initVault(VAULT_PATH);
        const body = await readJson(req);
        const store = await aiPreferencesStore();
        const updated = store.setUserPreferences({
          workspaceId: "local_workspace",
          userId: "local_user",
          userMode: body.userMode ?? body.user_mode,
          modelPack: body.modelPack ?? body.model_pack,
          monthlyBudget: body.monthlyBudget ?? body.monthly_budget,
          confirmationThreshold: body.confirmationThreshold ?? body.confirmation_threshold,
          fallbackPolicy: body.fallbackPolicy ?? body.fallback_policy,
          privacy: body.privacy,
          budget: body.budget,
          budgetState: body.budgetState ?? body.budget_state,
          advancedSettings: body.advancedSettings ?? body.advanced_settings
        });
        return sendJson(res, 200, {
          item: updated,
          requestId: rid,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        return sendJson(res, 400, err("AI_PREFERENCES_SAVE_FAILED", String(error?.message || error), rid));
      }
    }

    if (req.method === "GET" && url.pathname === "/api/v1/ai/inbox") {
      try {
        await initVault(VAULT_PATH);
        const artifactStore = await aiArtifactStore();
        const inbox = createAiInbox({ artifactStore });
        const filter = {
          view: url.searchParams.get("view") || "pending",
          type: url.searchParams.get("type") || url.searchParams.get("artifactType") || "",
          sourceNoteId: url.searchParams.get("sourceNoteId") || url.searchParams.get("source_note_id") || "",
          privacyMode: url.searchParams.get("privacyMode") || url.searchParams.get("privacy_mode") || "",
          limit: url.searchParams.get("limit") || 50
        };
        const items = inbox.listItems(filter);
        return sendJson(res, 200, {
          items,
          total: items.length,
          counts: inbox.counts(filter),
          views: inbox.views(),
          requestId: rid,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        return sendJson(res, 400, err(error?.code || "AI_INBOX_LOAD_FAILED", String(error?.message || error), rid));
      }
    }

    if (req.method === "GET" && url.pathname === "/api/v1/ai/inbox/evaluation-summary") {
      try {
        await initVault(VAULT_PATH);
        const artifactStore = await aiArtifactStore();
        const inbox = createAiInbox({ artifactStore });
        const filter = {
          view: url.searchParams.get("view") || "all",
          type: url.searchParams.get("type") || url.searchParams.get("artifactType") || "",
          sourceNoteId: url.searchParams.get("sourceNoteId") || url.searchParams.get("source_note_id") || "",
          privacyMode: url.searchParams.get("privacyMode") || url.searchParams.get("privacy_mode") || ""
        };
        return sendJson(res, 200, {
          item: inbox.evaluationSummary(filter),
          requestId: rid,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        return sendJson(res, 400, err(error?.code || "AI_INBOX_EVALUATION_SUMMARY_FAILED", String(error?.message || error), rid));
      }
    }

    const aiInboxDecisionId = parseAiInboxDecisionPath(url.pathname);
    if (req.method === "POST" && aiInboxDecisionId) {
      try {
        await initVault(VAULT_PATH);
        const body = await readJson(req);
        const artifactStore = await aiArtifactStore();
        const decision = normalizeAiInboxDecision(body);
        assertReviewDecision(decision);
        const artifact = artifactStore.recordDecision(aiInboxDecisionId, {
          ...body,
          decision,
          userId: body.userId || body.user_id || "local_user"
        });
        const inbox = createAiInbox({ artifactStore });
        const item = inbox.getItem(aiInboxDecisionId);
        return sendJson(res, 200, {
          item,
          artifact,
          latestDecision: item?.latestDecision || null,
          requestId: rid,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        const status = error?.code === "AI_ARTIFACT_NOT_FOUND" ? 404 : 400;
        return sendJson(res, status, err(error?.code || "AI_INBOX_DECISION_FAILED", String(error?.message || error), rid));
      }
    }

    const aiInboxAcceptLinkId = parseAiInboxAcceptLinkPath(url.pathname);
    if (req.method === "POST" && aiInboxAcceptLinkId) {
      try {
        await initVault(VAULT_PATH);
        const body = await readJson(req);
        if (!hasExplicitConfirmation(body)) {
          return sendJson(
            res,
            400,
            err("AI_LINK_SUGGESTION_CONFIRMATION_REQUIRED", "confirm: true is required before creating a note relation", rid)
          );
        }

        const artifactStore = await aiArtifactStore();
        const existingArtifact = artifactStore.getArtifact(aiInboxAcceptLinkId);
        if (!existingArtifact) return sendJson(res, 404, err("AI_ARTIFACT_NOT_FOUND", "artifact not found", rid));

        const relationInput = relationInputFromLinkSuggestion(existingArtifact, body);
        const relation = await createNoteRelation(VAULT_PATH, {
          ...relationInput,
          createdBy: "user"
        });
        const artifact = artifactStore.recordDecision(aiInboxAcceptLinkId, {
          decision: "linked_to_note",
          userId: body.userId || body.user_id || "local_user",
          noteId: relation.fromNoteId,
          comment: body.comment || `Accepted LinkSuggestion as ${relation.relationType} relation.`
        });
        const inbox = createAiInbox({ artifactStore });
        const item = inbox.getItem(aiInboxAcceptLinkId);
        return sendJson(res, 200, {
          item,
          artifact,
          relation,
          latestDecision: item?.latestDecision || null,
          requestId: rid,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        const status = error?.code === "AI_ARTIFACT_NOT_FOUND" ? 404 : 400;
        return sendJson(res, status, err(error?.code || "AI_LINK_SUGGESTION_ACCEPT_FAILED", String(error?.message || error), rid));
      }
    }

    const aiInboxPromoteNoteId = parseAiInboxPromoteNotePath(url.pathname);
    if (req.method === "POST" && aiInboxPromoteNoteId) {
      try {
        await initVault(VAULT_PATH);
        const body = await readJson(req);
        if (!hasExplicitConfirmation(body)) {
          return sendJson(
            res,
            400,
            err("AI_NOTE_PROMOTION_CONFIRMATION_REQUIRED", "confirm: true is required before creating a draft note", rid)
          );
        }

        const artifactStore = await aiArtifactStore();
        const existingArtifact = artifactStore.getArtifact(aiInboxPromoteNoteId);
        if (!existingArtifact) return sendJson(res, 404, err("AI_ARTIFACT_NOT_FOUND", "artifact not found", rid));

        const noteInput = promoteNoteInputFromArtifact(existingArtifact, body);
        const note = await createNoteInDirectory(VAULT_PATH, noteInput);
        const artifact = artifactStore.recordDecision(aiInboxPromoteNoteId, {
          decision: "promoted_to_note",
          userId: body.userId || body.user_id || "local_user",
          noteId: note.id,
          comment: body.comment || `Promoted ${existingArtifact.type} into draft note ${note.id}.`
        });
        const inbox = createAiInbox({ artifactStore });
        const item = inbox.getItem(aiInboxPromoteNoteId);
        return sendJson(res, 201, {
          item,
          artifact,
          note,
          latestDecision: item?.latestDecision || null,
          requestId: rid,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        const status = error?.code === "AI_ARTIFACT_NOT_FOUND" ? 404 : error?.code === "AI_ARTIFACT_ALREADY_PROMOTED" ? 409 : 400;
        return sendJson(res, status, err(error?.code || "AI_NOTE_PROMOTION_FAILED", String(error?.message || error), rid, error?.details));
      }
    }

    const aiInboxItemId = parseAiInboxItemPath(url.pathname);
    if (req.method === "GET" && aiInboxItemId) {
      try {
        await initVault(VAULT_PATH);
        const artifactStore = await aiArtifactStore();
        const artifact = artifactStore.getArtifact(aiInboxItemId);
        if (!artifact) return sendJson(res, 404, err("AI_ARTIFACT_NOT_FOUND", "artifact not found", rid));
        const inbox = createAiInbox({ artifactStore });
        return sendJson(res, 200, {
          item: inbox.getItem(aiInboxItemId),
          artifact,
          requestId: rid,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        return sendJson(res, 500, err("AI_INBOX_ITEM_LOAD_FAILED", String(error?.message || error), rid));
      }
    }

    if (req.method === "GET" && url.pathname === "/api/v1/ai/scheduled-task-templates") {
      try {
        const implementationReady = url.searchParams.has("implementationReady")
          ? url.searchParams.get("implementationReady") === "true"
          : undefined;
        const items = listScheduledAgentTaskTemplates({ implementationReady });
        return sendJson(res, 200, {
          items,
          total: items.length,
          requestId: rid,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        return sendJson(res, 500, err("AI_SCHEDULED_TASK_TEMPLATES_LOAD_FAILED", String(error?.message || error), rid));
      }
    }

    if (req.method === "GET" && url.pathname === "/api/v1/ai/scheduled-tasks") {
      try {
        await initVault(VAULT_PATH);
        const store = await aiScheduledTaskStore();
        const items = store.listScheduledTasks({
          workspaceId: "local_workspace",
          userId: "local_user",
          status: url.searchParams.get("status") || "",
          taskType: url.searchParams.get("taskType") || url.searchParams.get("task_type") || "",
          limit: url.searchParams.get("limit") || 50
        });
        return sendJson(res, 200, {
          items,
          total: items.length,
          requestId: rid,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        return sendJson(res, 500, err("AI_SCHEDULED_TASKS_LOAD_FAILED", String(error?.message || error), rid));
      }
    }

    if (req.method === "POST" && url.pathname === "/api/v1/ai/scheduled-tasks") {
      try {
        await initVault(VAULT_PATH);
        const body = await readJson(req);
        const store = await aiScheduledTaskStore();
        const input = {
          ...body,
          workspaceId: "local_workspace",
          userId: "local_user"
        };
        const item = body.templateId || body.template_id ? store.upsertScheduledTask(createScheduledTaskFromTemplate(input)) : store.upsertScheduledTask(input);
        return sendJson(res, 201, {
          item,
          requestId: rid,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        return sendJson(res, 400, err(error?.code || "AI_SCHEDULED_TASK_SAVE_FAILED", String(error?.message || error), rid));
      }
    }

    if (req.method === "POST" && url.pathname === "/api/v1/ai/scheduled-tasks/run-due") {
      let runtime = null;
      try {
        await initVault(VAULT_PATH);
        const body = await readJson(req);
        runtime = await createAiHarnessRuntime({
          storageMode: "sqlite",
          vaultPath: VAULT_PATH,
          tools: createCoreNoteTools({ vaultPath: VAULT_PATH })
        });
        const summary = await runDueScheduledAgentTasks({
          harness: runtime,
          scheduledTaskStore: runtime.stores.scheduledTaskStore,
          providerConfigStore: runtime.stores.providerConfigStore,
          providerHealthStore: runtime.stores.providerHealthStore,
          now: body.now || body.nowAt || body.now_at,
          workspaceId: "local_workspace",
          userId: "local_user",
          limit: body.limit
        });
        return sendJson(res, 200, {
          item: summary,
          requestId: rid,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        return sendJson(res, 400, err(error?.code || "AI_SCHEDULED_TASK_RUN_DUE_FAILED", String(error?.message || error), rid));
      } finally {
        if (runtime && typeof runtime.close === "function") runtime.close();
      }
    }

    const scheduledTaskStatusId = parseScheduledTaskStatusPath(url.pathname);
    if (req.method === "POST" && scheduledTaskStatusId) {
      try {
        await initVault(VAULT_PATH);
        const body = await readJson(req);
        const store = await aiScheduledTaskStore();
        const item = store.updateScheduledTaskStatus({
          scheduledTaskId: scheduledTaskStatusId,
          status: body.status
        });
        if (!item) return sendJson(res, 404, err("AI_SCHEDULED_TASK_NOT_FOUND", "scheduled task not found", rid));
        return sendJson(res, 200, {
          item,
          requestId: rid,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        return sendJson(res, 400, err("AI_SCHEDULED_TASK_STATUS_FAILED", String(error?.message || error), rid));
      }
    }

    const scheduledTaskId = parseScheduledTaskPath(url.pathname);
    if (req.method === "GET" && scheduledTaskId) {
      try {
        await initVault(VAULT_PATH);
        const store = await aiScheduledTaskStore();
        const item = store.getScheduledTask(scheduledTaskId);
        if (!item) return sendJson(res, 404, err("AI_SCHEDULED_TASK_NOT_FOUND", "scheduled task not found", rid));
        return sendJson(res, 200, {
          item,
          requestId: rid,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        return sendJson(res, 500, err("AI_SCHEDULED_TASK_LOAD_FAILED", String(error?.message || error), rid));
      }
    }

    if (req.method === "DELETE" && scheduledTaskId) {
      try {
        await initVault(VAULT_PATH);
        const store = await aiScheduledTaskStore();
        const deleted = store.deleteScheduledTask({ scheduledTaskId });
        if (!deleted) return sendJson(res, 404, err("AI_SCHEDULED_TASK_NOT_FOUND", "scheduled task not found", rid));
        return sendJson(res, 200, {
          ok: true,
          deleted: true,
          scheduledTaskId,
          requestId: rid,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        return sendJson(res, 400, err("AI_SCHEDULED_TASK_DELETE_FAILED", String(error?.message || error), rid));
      }
    }

    if (req.method === "GET" && url.pathname === "/api/v1/directories") {
      await initVault(VAULT_PATH);
      const includeHidden = url.searchParams.get("includeHidden") === "true";
      const directories = await listDirectories(VAULT_PATH, { includeHidden });
      return sendJson(res, 200, {
        items: directories,
        total: directories.length,
        requestId: rid,
        timestamp: new Date().toISOString()
      });
    }

    if (req.method === "GET" && url.pathname === "/api/v1/graph") {
      const scope = String(url.searchParams.get("scope") || "directory").trim();
      const directoryId = String(url.searchParams.get("directoryId") || "").trim();
      const includeDescendants = url.searchParams.get("includeDescendants") === "true";
      if (scope !== "directory") {
        return sendJson(res, 400, err("GRAPH_SCOPE_INVALID", "only directory scope is supported in MVP", rid));
      }
      try {
        await initVault(VAULT_PATH);
        const graph = await getDirectoryGraph(VAULT_PATH, directoryId, { includeDescendants });
        return sendJson(res, 200, {
          item: graph,
          requestId: rid,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        return sendJson(res, 400, err("GRAPH_QUERY_INVALID", String(error?.message || error), rid));
      }
    }

    if (req.method === "POST" && url.pathname === "/api/v1/graph/ai-analysis") {
      try {
        await initVault(VAULT_PATH);
        const body = await readJson(req);
        let notes = Array.isArray(body.notes) ? body.notes : [];
        let relations = Array.isArray(body.relations) ? body.relations : [];
        let graph = null;
        if (!notes.length && body.directoryId) {
          graph = await getDirectoryGraph(VAULT_PATH, body.directoryId, {
            includeDescendants: body.includeDescendants === true || body.include_descendants === true
          });
          const permanentNodeIds = graph.nodes.filter((node) => node.noteType === "permanent").map((node) => node.id);
          notes = await loadNotesByIds(permanentNodeIds);
          relations = graph.edges;
        } else if (Array.isArray(body.noteIds || body.note_ids)) {
          notes = await loadNotesByIds(body.noteIds || body.note_ids);
        }

        const analysis = analyzePermanentNoteGraphLocally({
          notes,
          relations,
          options: body.options || {
            minRelationConfidence: body.minRelationConfidence ?? body.min_relation_confidence,
            relationLimit: body.relationLimit ?? body.relation_limit,
            minTopicSize: body.minTopicSize ?? body.min_topic_size
          }
        });
        const reviewItems = buildPermanentNoteGraphReviewItems(analysis, {
          agentRunId: `run_graph_analysis_${rid}`,
          contextPackId: `ctx_graph_analysis_${rid}`,
          artifactIdSalt: rid,
          privacyMode: "local_only"
        });
        const persistArtifacts = body.persistArtifacts !== false && body.persist_artifacts !== false;
        const artifactStore = persistArtifacts ? await aiArtifactStore() : null;
        const storedArtifacts = persistArtifacts ? artifactStore.createMany(reviewItems.artifacts) : [];
        return sendJson(res, 200, {
          item: {
            directoryId: body.directoryId || null,
            graphScope: graph
              ? {
                  nodeCount: graph.totalNodes,
                  edgeCount: graph.totalEdges,
                  includeDescendants: graph.includeDescendants
                }
              : null,
            analysis,
            reviewItems: {
              ...reviewItems,
              storedArtifactIds: storedArtifacts.map((artifact) => artifact.id),
              artifactsPersisted: persistArtifacts
            }
          },
          requestId: rid,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        return sendJson(res, 400, err(error?.code || "GRAPH_AI_ANALYSIS_FAILED", String(error?.message || error), rid, error?.details));
      }
    }

    if (req.method === "GET" && url.pathname === "/api/v1/graph/path") {
      try {
        await initVault(VAULT_PATH);
        const item = await findNotePath(VAULT_PATH, {
          fromNoteId: url.searchParams.get("fromNoteId"),
          toNoteId: url.searchParams.get("toNoteId"),
          directoryId: url.searchParams.get("directoryId"),
          maxDepth: url.searchParams.get("maxDepth"),
          direction: url.searchParams.get("direction")
        });
        return sendJson(res, 200, {
          item,
          requestId: rid,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        return sendJson(res, 400, err("GRAPH_PATH_INVALID", String(error?.message || error), rid));
      }
    }

    if (req.method === "GET" && url.pathname === "/api/v1/graph/conflicts") {
      try {
        await initVault(VAULT_PATH);
        const item = await detectGraphConflicts(VAULT_PATH, {
          directoryId: url.searchParams.get("directoryId"),
          includeDescendants: url.searchParams.get("includeDescendants") !== "false"
        });
        return sendJson(res, 200, {
          item,
          requestId: rid,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        return sendJson(res, 400, err("GRAPH_CONFLICTS_INVALID", String(error?.message || error), rid));
      }
    }

    if (req.method === "GET" && url.pathname === "/api/v1/relations/review-queue") {
      try {
        await initVault(VAULT_PATH);
        const result = await listRelationReviewQueue(VAULT_PATH, {
          directoryId: url.searchParams.get("directoryId"),
          includeDescendants: url.searchParams.get("includeDescendants") === "true",
          qualityLevels: url.searchParams.get("qualityLevels") || url.searchParams.get("qualityLevel"),
          relationType: url.searchParams.get("relationType"),
          status: url.searchParams.get("status"),
          limit: Number(url.searchParams.get("limit") || 20)
        });
        return sendJson(res, 200, {
          ...result,
          requestId: rid,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        return sendJson(res, 400, err(error?.code || "RELATION_REVIEW_QUEUE_INVALID", String(error?.message || error), rid, error?.details));
      }
    }

    const tagName = parseTagNotesPath(url.pathname);
    if (req.method === "GET" && tagName) {
      const rootDirectoryId = String(url.searchParams.get("rootDirectoryId") || url.searchParams.get("directoryId") || "").trim();
      try {
        await initVault(VAULT_PATH);
        const result = await listNotesByTag(VAULT_PATH, tagName, { rootDirectoryId });
        return sendJson(res, 200, {
          ...result,
          requestId: rid,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        return sendJson(res, 400, err("TAG_QUERY_INVALID", String(error?.message || error), rid));
      }
    }

    if (req.method === "GET" && url.pathname === "/api/v1/tags") {
      const rootDirectoryId = String(url.searchParams.get("rootDirectoryId") || url.searchParams.get("directoryId") || "").trim();
      const query = String(url.searchParams.get("q") || "").trim();
      const limit = Number(url.searchParams.get("limit") || 20);
      try {
        await initVault(VAULT_PATH);
        const result = await listTags(VAULT_PATH, { rootDirectoryId, query, limit });
        return sendJson(res, 200, {
          ...result,
          requestId: rid,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        return sendJson(res, 400, err("TAG_LIST_INVALID", String(error?.message || error), rid));
      }
    }

    if (req.method === "GET" && url.pathname === "/api/v1/notes/search") {
      try {
        await initVault(VAULT_PATH);
        const result = await searchNotes(VAULT_PATH, {
          q: url.searchParams.get("q") || "",
          rootDirectoryId: url.searchParams.get("rootDirectoryId") || url.searchParams.get("directoryId") || "",
          excludeNoteId: url.searchParams.get("excludeNoteId") || "",
          limit: Number(url.searchParams.get("limit") || 20)
        });
        return sendJson(res, 200, {
          ...result,
          requestId: rid,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        return sendJson(res, 400, err("NOTE_SEARCH_INVALID", String(error?.message || error), rid));
      }
    }

    if (req.method === "POST" && url.pathname === "/api/v1/demo/knowledge-network/yijing") {
      try {
        await readJson(req);
        const fixture = await readYijingKnowledgeNetworkFixture();
        const item = await seedYijingKnowledgeNetwork(VAULT_PATH, fixture);
        return sendJson(res, 200, {
          item,
          requestId: rid,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        return sendJson(res, 400, err("YIJING_DEMO_SEED_INVALID", String(error?.message || error), rid, error?.details));
      }
    }

    const aiInboxSummarizeId = parseAiInboxSummarizePath(url.pathname);
    if (req.method === "POST" && aiInboxSummarizeId) {
      let runtime = null;
      try {
        await initVault(VAULT_PATH);
        const body = await readJson(req);
        const artifactStore = await aiArtifactStore();
        const artifact = artifactStore.getArtifact(aiInboxSummarizeId);
        if (!artifact) return sendJson(res, 404, err("AI_ARTIFACT_NOT_FOUND", "artifact not found", rid));

        const prefStore = await aiPreferencesStore();
        const prefs = prefStore.getUserPreferences({ workspaceId: "local_workspace", userId: "local_user" }) || {};
        const baseSettingsInput = preferencesToSettingsInput(prefs);
        const settingsInput = {
          ...baseSettingsInput,
          userMode: body.userMode ?? body.user_mode ?? baseSettingsInput.userMode,
          modelPack: body.modelPack ?? body.model_pack ?? baseSettingsInput.modelPack,
          authMode: body.authMode ?? body.auth_mode ?? baseSettingsInput.authMode,
          secretRef: body.secretRef ?? body.secret_ref ?? baseSettingsInput.secretRef,
          modelRef: body.modelRef ?? body.model_ref ?? baseSettingsInput.modelRef
        };
        const userSettings = resolveAiUserSettings(settingsInput);
        const providerPreset = String(userSettings.providerPreset || "").trim();
        const configStore = await aiProviderConfigStore();
        const providerConfig = providerPreset ? configStore.getProviderConfig({ providerId: providerPreset }) : null;
        const providerSettings = providerConfig ? providerConfigToSettingsInput(providerConfig) : {};
        const mergedSettings = { ...settingsInput, ...providerSettings };
        const providerDescriptor = resolveProviderDescriptor(mergedSettings);

        const artifactPrivacyMode = String(artifact?.privacy?.mode || artifact?.privacy_mode || "").trim();
        const privacyMode = body.privacyMode ?? body.privacy_mode ?? artifactPrivacyMode ?? userSettings.privacy?.defaultMode ?? "normal";
        const modelTier = body.modelTier ?? body.model_tier ?? "cheap_fast";
        const modelRoute = resolveModelRoute({
          providerDescriptor,
          userMode: userSettings.userMode,
          modelTier,
          privacyMode
        });

        runtime = await createAiHarnessRuntime({
          storageMode: "sqlite",
          vaultPath: VAULT_PATH,
          tools: createCoreNoteTools({ vaultPath: VAULT_PATH }),
          useOpenAiCompatibleAdapter: true,
          networkEnabled: true,
          createExecutor: true
        });
        const adapterSelection = runtime.providerAdapterRegistry.getAdapter({
          ...mergedSettings,
          providerDescriptor
        });
        const providerAdapter = adapterSelection.adapter;

        const prompt = [
          "Summarize this AI Inbox item for a human reviewer.",
          "Return:",
          "1) one-sentence gist",
          "2) key evidence bullets (max 5)",
          "3) recommended action among: accept_link, promote_note, ignore, needs_more_context",
          "4) privacy risk note if any",
          "",
          `artifactType: ${artifact.artifactType || artifact.type || ""}`,
          `title: ${artifact.title || ""}`,
          `summary: ${artifact.summary || ""}`,
          `body: ${artifact.body || ""}`,
          `payload: ${JSON.stringify(artifact.payload || {}, null, 2).slice(0, 8000)}`
        ].join("\n");

        const response = await providerAdapter.complete({
          requestId: `${rid}_inbox_summarize`,
          agentRunId: rid,
          purpose: "ai_inbox_summarize",
          providerDescriptor,
          modelRoute,
          modelRef: modelRoute.modelRef,
          messages: [
            { role: "system", content: "You are a precise, privacy-aware assistant for note review workflows." },
            { role: "user", content: prompt }
          ],
          tools: [],
          output: { mode: "text" },
          settings: { stream: false, temperature: body.temperature },
          policy: {
            privacyMode: modelRoute.privacyMode,
            allowCloud: modelRoute.cloudAllowed,
            allowFallback: modelRoute.fallbackPolicy.allowSameProviderFallback,
            modelRoute,
            budgetPrecheck: { ok: true, confirmationRequired: false, estimatedUsage: { estimatedCost: 0, currency: "USD" } }
          }
        });
        assertProviderResponseSucceeded(response, "AI_INBOX_SUMMARIZE_PROVIDER_FAILED");

        const summaryText = String(response?.output?.content || "").trim();
        const recommendedAction = recommendedAiInboxActionFromText(summaryText);
        const decorated = [
          "[AI Summary]",
          `provider=${String(response.providerId || "").trim()}`,
          `model=${String(response.modelRef || "").trim()}`,
          ...(recommendedAction ? [`recommendedAction=${recommendedAction}`] : []),
          "",
          summaryText || "(empty)"
        ].join("\n");
        const updatedArtifact = artifactStore.recordDecision(aiInboxSummarizeId, {
          decision: "revised",
          userId: body.userId || body.user_id || "local_user",
          comment: decorated
        });
        const inbox = createAiInbox({ artifactStore });
        const updatedItem = inbox.getItem(aiInboxSummarizeId);

        return sendJson(res, 200, {
          item: {
            artifactId: aiInboxSummarizeId,
            providerId: response.providerId,
            modelRef: response.modelRef,
            status: response.status,
            recommendedAction,
            output: response.output,
            usage: response.usage,
            artifact: updatedArtifact,
            inboxItem: updatedItem
          },
          requestId: rid,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        return sendJson(res, 400, err(error?.code || "AI_INBOX_SUMMARIZE_FAILED", String(error?.message || error), rid, error?.details));
      } finally {
        if (runtime && typeof runtime.close === "function") runtime.close();
      }
    }

    if (req.method === "POST" && url.pathname === "/api/v1/demo/acceptance/yijing-rich") {
      try {
        await readJson(req);
        const item = await seedYijingRichAcceptance(VAULT_PATH);
        return sendJson(res, 200, {
          item,
          requestId: rid,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        return sendJson(res, 400, err("YIJING_RICH_ACCEPTANCE_SEED_INVALID", String(error?.message || error), rid, error?.details));
      }
    }

    if (req.method === "POST" && url.pathname === "/api/v1/demo/product-thinking/smart-notes") {
      try {
        await readJson(req);
        const item = await seedSmartNotesProductThinking(VAULT_PATH);
        return sendJson(res, 200, {
          item,
          requestId: rid,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        return sendJson(
          res,
          400,
          err("SMART_NOTES_PRODUCT_THINKING_SEED_INVALID", String(error?.message || error), rid, error?.details)
        );
      }
    }

    if (req.method === "POST" && url.pathname === "/api/v1/directories") {
      const body = await readJson(req);
      try {
        await initVault(VAULT_PATH);
        const created = await createDirectory(VAULT_PATH, {
          title: body.title,
          parentDirectoryId: body.parentDirectoryId || null,
          directoryType: body.directoryType || "custom",
          fsPath: body.fsPath,
          maxNotes: body.maxNotes
        });
        return sendJson(res, 201, {
          item: created,
          requestId: rid,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        return sendJson(res, 400, err("DIRECTORY_PAYLOAD_INVALID", String(error?.message || error), rid));
      }
    }

    const directoryId = parseDirectoryPath(url.pathname);
    if (req.method === "PATCH" && directoryId) {
      const body = await readJson(req);
      try {
        await initVault(VAULT_PATH);
        const item = await updateDirectory(VAULT_PATH, directoryId, {
          title: body.title,
          parentDirectoryId: body.parentDirectoryId,
          fsPath: body.fsPath,
          isHidden: body.isHidden,
          maxNotes: body.maxNotes
        });
        return sendJson(res, 200, {
          item,
          requestId: rid,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        return sendJson(res, 400, err("DIRECTORY_UPDATE_INVALID", String(error?.message || error), rid));
      }
    }

    if (req.method === "DELETE" && directoryId) {
      try {
        await initVault(VAULT_PATH);
        const result = await deleteDirectory(VAULT_PATH, directoryId);
        return sendJson(res, 200, {
          ...result,
          requestId: rid,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        return sendJson(res, 400, err("DIRECTORY_DELETE_INVALID", String(error?.message || error), rid));
      }
    }

    const dirNotesId = parseDirectoryNotesPath(url.pathname);
    if (req.method === "GET" && dirNotesId) {
      try {
        await initVault(VAULT_PATH);
        const items = await listNotesInDirectory(VAULT_PATH, dirNotesId);
        return sendJson(res, 200, {
          directoryId: dirNotesId,
          items,
          total: items.length,
          requestId: rid,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        return sendJson(res, 400, err("DIRECTORY_NOTES_INVALID", String(error?.message || error), rid));
      }
    }

    if (req.method === "POST" && url.pathname === "/api/v1/notes") {
      const body = await readJson(req);
      try {
        await initVault(VAULT_PATH);
        const created = await createNoteInDirectory(VAULT_PATH, {
          directoryId: body.directoryId,
          title: body.title,
          body: body.body,
          status: body.status || "draft",
          thesis: body.thesis,
          threeLineSummary: body.threeLineSummary ?? body.three_line_summary,
          distillationStatus: body.distillationStatus ?? body.distillation_status,
          boundaryOrCounterpoint: body.boundaryOrCounterpoint ?? body.boundary_or_counterpoint,
          originalityStatus: body.originalityStatus ?? body.originality_status,
          originalitySimilarity: body.originalitySimilarity ?? body.originality_similarity,
          authorship: body.authorship,
          authorshipConfirmed: body.authorshipConfirmed,
          authorshipAiAssisted: body.authorshipAiAssisted
        });
        return sendJson(res, 201, {
          item: created,
          requestId: rid,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        return sendJson(
          res,
          400,
          err(error?.code || "NOTE_PAYLOAD_INVALID", String(error?.message || error), rid, error?.details)
        );
      }
    }

    if (req.method === "GET" && url.pathname === "/api/v1/distillation/queue") {
      try {
        await initVault(VAULT_PATH);
        const result = await listDistillationQueue(VAULT_PATH, {
          targetType: url.searchParams.get("targetType") || url.searchParams.get("target_type") || "permanent_note",
          status: url.searchParams.get("status") || "",
          limit: url.searchParams.get("limit") || 50
        });
        return sendJson(res, 200, {
          ...result,
          requestId: rid,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        return sendJson(res, 400, err(error?.code || "DISTILLATION_QUEUE_INVALID", String(error?.message || error), rid, error?.details));
      }
    }

    const permanentNoteDistillationId = parsePermanentNoteDistillationPath(url.pathname);
    if (req.method === "PATCH" && permanentNoteDistillationId) {
      const body = await readJson(req);
      try {
        await initVault(VAULT_PATH);
        const item = await updatePermanentNoteDistillation(VAULT_PATH, permanentNoteDistillationId, {
          thesis: body.thesis,
          threeLineSummary: body.threeLineSummary ?? body.three_line_summary,
          distillationStatus: body.distillationStatus ?? body.distillation_status
        });
        return sendJson(res, 200, {
          item,
          requestId: rid,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        const status = error?.code === "PERMANENT_NOTE_REQUIRED" ? 400 : error?.code === "NOTE_NOT_FOUND" ? 404 : 400;
        return sendJson(res, status, err(error?.code || "PERMANENT_NOTE_DISTILLATION_UPDATE_INVALID", String(error?.message || error), rid, error?.details));
      }
    }

    const permanentNoteDistillationConfirmId = parsePermanentNoteDistillationConfirmPath(url.pathname);
    if (req.method === "POST" && permanentNoteDistillationConfirmId) {
      const body = await readJson(req);
      if (body.confirm !== true) {
        return sendJson(
          res,
          400,
          err("PERMANENT_DISTILLATION_CONFIRM_REQUIRED", "confirm must be true to confirm permanent-note distillation.", rid)
        );
      }
      try {
        await initVault(VAULT_PATH);
        const item = await confirmPermanentNoteDistillation(VAULT_PATH, permanentNoteDistillationConfirmId, {
          aiAssisted: body.aiAssisted ?? body.ai_assisted
        });
        return sendJson(res, 200, {
          item,
          requestId: rid,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        const status = error?.code === "PERMANENT_NOTE_REQUIRED" ? 400 : error?.code === "NOTE_NOT_FOUND" ? 404 : 400;
        return sendJson(res, status, err(error?.code || "PERMANENT_NOTE_DISTILLATION_CONFIRM_INVALID", String(error?.message || error), rid, error?.details));
      }
    }

    const noteRelationsId = parseNoteRelationsPath(url.pathname);
    if (req.method === "POST" && noteRelationsId) {
      const body = await readJson(req);
      try {
        await initVault(VAULT_PATH);
        const relation = await createNoteRelation(VAULT_PATH, noteRelationsId, {
          toNoteId: body.toNoteId ?? body.to_note_id,
          relationType: body.relationType ?? body.relation_type,
          rationale: body.rationale,
          insightQuestion: body.insightQuestion ?? body.insight_question,
          createdBy: body.createdBy ?? body.created_by,
          confidence: body.confidence,
          status: body.status
        });
        return sendJson(res, 201, {
          item: relation,
          requestId: rid,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        return sendJson(res, 400, err(error?.code || "NOTE_RELATION_CREATE_INVALID", String(error?.message || error), rid, error?.details));
      }
    }

    if (req.method === "GET" && noteRelationsId) {
      try {
        await initVault(VAULT_PATH);
        const relations = await listNoteRelations(VAULT_PATH, noteRelationsId);
        return sendJson(res, 200, {
          item: relations,
          requestId: rid,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        return sendJson(res, 404, err("NOTE_RELATIONS_NOT_FOUND", String(error?.message || error), rid));
      }
    }

    const noteAiAnalysisId = parseNoteAiAnalysisPath(url.pathname);
    if (req.method === "POST" && noteAiAnalysisId) {
      try {
        await initVault(VAULT_PATH);
        const body = await readJson(req);
        const note = await getNoteById(VAULT_PATH, noteAiAnalysisId);
        if (note.noteType !== "permanent") {
          return sendJson(
            res,
            400,
            err("NOTE_AI_ANALYSIS_PERMANENT_REQUIRED", "AI note analysis currently only supports permanent notes.", rid, {
              noteId: noteAiAnalysisId,
              noteType: note.noteType
            })
          );
        }

        const relatedNotes = [
          ...(Array.isArray(body.relatedNotes || body.related_notes) ? body.relatedNotes || body.related_notes : []),
          ...(await loadNotesByIds(body.relatedNoteIds || body.related_note_ids))
        ];
        const literatureNotes = [
          ...(Array.isArray(body.literatureNotes || body.literature_notes) ? body.literatureNotes || body.literature_notes : []),
          ...(await loadNotesByIds(body.literatureNoteIds || body.literature_note_ids))
        ];
        const analysisInput = {
          note,
          relatedNotes,
          literatureNotes,
          options: body.options || {
            minRelationConfidence: body.minRelationConfidence ?? body.min_relation_confidence,
            relationLimit: body.relationLimit ?? body.relation_limit,
            originalityPlan: body.originalityPlan ?? body.originality_plan
          }
        };
        const analysisContext = {
          agentRunId: `run_note_analysis_${rid}`,
          contextPackId: `ctx_note_analysis_${rid}`,
          artifactIdSalt: rid,
          privacyMode: "local_only"
        };
        const localModelResponse = body.localModelResponse ?? body.local_model_response;
        const executeLocalModel = enabledFlag(body, "executeLocalModel", "execute_local_model");
        const prepareLocalModelRequest =
          body.prepareLocalModelRequest === true ||
          body.prepare_local_model_request === true ||
          Boolean(localModelResponse) ||
          executeLocalModel;
        const providerExecution = executeLocalModel
          ? await resolveAnalysisProviderExecution(body, {
              modelPack: "Ollama Local",
              userMode: "Local / Private",
              providerPreset: "ollama_local_gateway",
              authMode: "local_no_key",
              modelTier: "local_private",
              privacyMode: "local_only"
            })
          : null;
        const explicitLocalModel = cleanText(body.localModel || body.local_model);
        const localModelContext = providerExecution
          ? {
              ...analysisContext,
              model: requestModelFromRoute(
                providerExecution.providerDescriptor,
                providerExecution.modelRoute,
                explicitLocalModel,
                "Local / Private"
              )
            }
          : {
              ...analysisContext,
              localModel: explicitLocalModel
            };
        const localModelRequest = prepareLocalModelRequest
          ? buildPermanentNoteLocalModelRequest(analysisInput, null, localModelContext)
          : null;
        let modelExecution = null;
        let result = null;
        if (localModelResponse) {
          result = mergePermanentNoteLocalModelResponse(localModelRequest, localModelResponse, analysisContext);
        } else if (executeLocalModel) {
          try {
            result = await runPermanentNoteLocalModelAnalysis(localModelRequest, providerExecution.providerAdapter, {
              ...analysisContext,
              model: localModelRequest.model
            });
            modelExecution = modelExecutionSummary(result.providerResponse, {
              modelRoute: providerExecution.modelRoute
            });
          } catch (error) {
            if (body.fallbackOnProviderFailure === false || body.fallback_on_provider_failure === false) throw error;
            result = analyzePermanentNoteForReview(analysisInput, analysisContext);
            modelExecution = modelExecutionFailure(error, {
              fallbackUsed: true,
              providerDescriptor: providerExecution.providerDescriptor,
              modelRoute: providerExecution.modelRoute
            });
          }
        } else {
          result = analyzePermanentNoteForReview(analysisInput, analysisContext);
        }
        const { analysis, reviewItems } = result;
        const persistArtifacts = body.persistArtifacts !== false && body.persist_artifacts !== false;
        const artifactStore = persistArtifacts ? await aiArtifactStore() : null;
        const storedArtifacts = persistArtifacts ? artifactStore.createMany(reviewItems.artifacts) : [];
        const inbox = persistArtifacts ? createAiInbox({ artifactStore }) : null;
        return sendJson(res, 200, {
          item: {
            noteId: noteAiAnalysisId,
            analysis,
            localModelRequest,
            modelExecution,
            reviewItems: {
              ...reviewItems,
              storedArtifactIds: storedArtifacts.map((artifact) => artifact.id),
              artifactsPersisted: persistArtifacts
            },
            inbox: inbox
              ? {
                  counts: inbox.counts({ sourceNoteId: noteAiAnalysisId }),
                  pending: inbox.listItems({ view: "pending", sourceNoteId: noteAiAnalysisId, limit: 100 })
                }
              : null
          },
          requestId: rid,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        const status = error?.code === "NOTE_NOT_FOUND" ? 404 : 400;
        return sendJson(res, status, err(error?.code || "NOTE_AI_ANALYSIS_FAILED", String(error?.message || error), rid, error?.details));
      }
    }

    if (req.method === "GET" && noteAiAnalysisId) {
      try {
        await initVault(VAULT_PATH);
        await getNoteById(VAULT_PATH, noteAiAnalysisId);
        const artifactStore = await aiArtifactStore();
        const inbox = createAiInbox({ artifactStore });
        const filter = {
          sourceNoteId: noteAiAnalysisId,
          view: url.searchParams.get("view") || "all",
          limit: url.searchParams.get("limit") || 100
        };
        const items = inbox.listItems(filter);
        return sendJson(res, 200, {
          item: {
            noteId: noteAiAnalysisId,
            items,
            counts: inbox.counts({ sourceNoteId: noteAiAnalysisId }),
            views: inbox.views()
          },
          requestId: rid,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        const status = error?.code === "NOTE_NOT_FOUND" ? 404 : 400;
        return sendJson(res, status, err(error?.code || "NOTE_AI_ANALYSIS_LOAD_FAILED", String(error?.message || error), rid));
      }
    }

    const relationId = parseRelationPath(url.pathname);
    if (req.method === "PATCH" && relationId) {
      const body = await readJson(req);
      try {
        await initVault(VAULT_PATH);
        const relation = await updateNoteRelation(VAULT_PATH, relationId, {
          relationType: body.relationType ?? body.relation_type,
          rationale: body.rationale,
          insightQuestion: body.insightQuestion ?? body.insight_question,
          confidence: body.confidence,
          status: body.status
        });
        return sendJson(res, 200, {
          item: relation,
          requestId: rid,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        return sendJson(res, 400, err(error?.code || "NOTE_RELATION_UPDATE_INVALID", String(error?.message || error), rid, error?.details));
      }
    }

    if (req.method === "DELETE" && relationId) {
      try {
        await initVault(VAULT_PATH);
        const result = await deleteNoteRelation(VAULT_PATH, relationId);
        return sendJson(res, 200, {
          ...result,
          requestId: rid,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        return sendJson(res, 400, err(error?.code || "NOTE_RELATION_DELETE_INVALID", String(error?.message || error), rid, error?.details));
      }
    }

    const noteId = parseNotePath(url.pathname);
    if (req.method === "GET" && noteId) {
      try {
        await initVault(VAULT_PATH);
        const item = await getNoteById(VAULT_PATH, noteId);
        return sendJson(res, 200, {
          item,
          requestId: rid,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        return sendJson(res, 404, err("NOTE_NOT_FOUND", String(error?.message || error), rid));
      }
    }

    if (req.method === "PUT" && noteId) {
      const body = await readJson(req);
      try {
        await initVault(VAULT_PATH);
        const item = await updateNoteContent(VAULT_PATH, noteId, {
          title: body.title,
          body: body.body,
          status: body.status,
          thesis: body.thesis,
          threeLineSummary: body.threeLineSummary ?? body.three_line_summary,
          distillationStatus: body.distillationStatus ?? body.distillation_status,
          boundaryOrCounterpoint: body.boundaryOrCounterpoint ?? body.boundary_or_counterpoint,
          originalityStatus: body.originalityStatus ?? body.originality_status,
          originalitySimilarity: body.originalitySimilarity ?? body.originality_similarity,
          authorship: body.authorship,
          authorshipConfirmed: body.authorshipConfirmed,
          authorshipAiAssisted: body.authorshipAiAssisted
        });
        return sendJson(res, 200, {
          item,
          requestId: rid,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        return sendJson(
          res,
          400,
          err(error?.code || "NOTE_UPDATE_INVALID", String(error?.message || error), rid, error?.details)
        );
      }
    }

    const moveNoteId = parseMoveNotePath(url.pathname);
    if (req.method === "POST" && moveNoteId) {
      const body = await readJson(req);
      try {
        await initVault(VAULT_PATH);
        const item = await moveNoteToDirectory(VAULT_PATH, moveNoteId, body.directoryId);
        return sendJson(res, 200, {
          item,
          requestId: rid,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        return sendJson(res, 400, err("NOTE_MOVE_INVALID", String(error?.message || error), rid));
      }
    }

    if (req.method === "DELETE" && noteId) {
      try {
        await initVault(VAULT_PATH);
        const result = await deleteNoteById(VAULT_PATH, noteId);
        return sendJson(res, 200, {
          ...result,
          requestId: rid,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        return sendJson(res, 400, err("NOTE_DELETE_INVALID", String(error?.message || error), rid));
      }
    }

    if (req.method === "POST" && url.pathname === "/api/v1/assets") {
      const body = await readJson(req);
      try {
        await initVault(VAULT_PATH);
        const item = await saveNoteAsset(VAULT_PATH, body.noteId, {
          fileName: body.fileName,
          mimeType: body.mimeType,
          contentBase64: body.contentBase64,
          kind: body.kind
        });
        return sendJson(res, 201, {
          item,
          requestId: rid,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        return sendJson(res, 400, err("ASSET_UPLOAD_INVALID", String(error?.message || error), rid));
      }
    }

    if (req.method === "GET" && url.pathname === "/api/v1/assets/file") {
      const relativePath = String(url.searchParams.get("path") || "").trim().replaceAll("\\", "/");
      if (!relativePath) {
        return sendJson(res, 400, err("ASSET_PATH_REQUIRED", "asset path required", rid));
      }
      if (!relativePath.startsWith("assets/")) {
        return sendJson(res, 400, err("ASSET_PATH_INVALID", "asset path must stay inside assets/", rid));
      }
      try {
        await initVault(VAULT_PATH);
        const absolutePath = resolveVaultPath(VAULT_PATH, relativePath);
        const body = await fs.readFile(absolutePath);
        return sendBinary(res, 200, assetContentType(absolutePath), body);
      } catch (error) {
        return sendJson(res, 404, err("ASSET_NOT_FOUND", String(error?.message || error), rid));
      }
    }

    const directConnector = parseConnectorPath(url.pathname);
    if (req.method === "POST" && directConnector) {
      const body = await readJson(req);
      const preview = await createPreview(directConnector, body.payload || body, body.options || {}, rid);
      return sendJson(res, 200, preview);
    }

    if (req.method === "POST" && url.pathname === "/api/v1/imports/preview") {
      const body = await readJson(req);
      const connector = String(body.connector || "").trim();
      if (!allowedConnectors.has(connector)) return sendJson(res, 400, err("IMPORT_PAYLOAD_INVALID", "connector invalid", rid));
      const preview = await createPreview(connector, body.payload || {}, body.options || {}, rid);
      return sendJson(res, 200, preview);
    }

    if (req.method === "GET" && url.pathname === "/api/v1/imports") {
      const result = await getImportRecordList({ limit: url.searchParams.get("limit") || 50 });
      return sendJson(res, 200, {
        items: result.items.map(publicImportRecord),
        count: result.items.length,
        total: result.total,
        requestId: rid,
        timestamp: new Date().toISOString()
      });
    }

    if (req.method === "POST" && url.pathname === "/api/v1/papers") {
      const body = await readJson(req);
      try {
        await initVault(VAULT_PATH);
        const item = await createPaperWorkspace(VAULT_PATH, body);
        return sendJson(res, 201, {
          item,
          requestId: rid,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        return sendJson(res, 400, err(error.code || "PAPER_WORKSPACE_INVALID", String(error?.message || error), rid));
      }
    }

    const paperId = parsePaperPath(url.pathname);
    if (req.method === "GET" && paperId) {
      try {
        await initVault(VAULT_PATH);
        const item = await getPaperWorkspace(VAULT_PATH, paperId);
        if (!item) return sendJson(res, 404, err("PAPER_WORKSPACE_NOT_FOUND", "paper workspace not found", rid));
        return sendJson(res, 200, {
          item,
          requestId: rid,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        return sendJson(res, 400, err(error.code || "PAPER_WORKSPACE_INVALID", String(error?.message || error), rid));
      }
    }

    const paperNotebookLmDraftsId = parsePaperNotebookLmDraftsPath(url.pathname);
    if (req.method === "POST" && paperNotebookLmDraftsId) {
      const body = await readJson(req);
      try {
        await initVault(VAULT_PATH);
        const result = await addNotebookLmDraft(VAULT_PATH, paperNotebookLmDraftsId, body.payload || body);
        return sendJson(res, 201, {
          item: result.workspace,
          draft: {
            id: result.draftId,
            candidateIds: result.candidates.map((item) => item.id),
            warnings: result.warnings
          },
          candidates: result.candidates,
          requestId: rid,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        const status = error.code === "PAPER_WORKSPACE_NOT_FOUND" ? 404 : 400;
        return sendJson(res, status, err(error.code || "PAPER_NOTEBOOKLM_DRAFT_INVALID", String(error?.message || error), rid));
      }
    }

    const paperTranslationsId = parsePaperTranslationsPath(url.pathname);
    if (req.method === "POST" && paperTranslationsId) {
      const body = await readJson(req);
      try {
        await initVault(VAULT_PATH);
        const result = await savePaperTranslation(VAULT_PATH, paperTranslationsId, body);
        return sendJson(res, 201, {
          item: result.workspace,
          translation: result.translation,
          candidate: result.candidate,
          requestId: rid,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        const status = error.code === "PAPER_WORKSPACE_NOT_FOUND" || error.code === "PAPER_CANDIDATE_NOT_FOUND" ? 404 : 400;
        return sendJson(res, status, err(error.code || "PAPER_TRANSLATION_INVALID", String(error?.message || error), rid));
      }
    }

    const paperPermanentCandidatesId = parsePaperPermanentCandidatesPath(url.pathname);
    if (req.method === "POST" && paperPermanentCandidatesId) {
      const body = await readJson(req);
      try {
        await initVault(VAULT_PATH);
        const result = await createPaperPermanentCandidate(VAULT_PATH, paperPermanentCandidatesId, body);
        return sendJson(res, 201, {
          item: result.workspace,
          permanentCandidate: result.permanentCandidate,
          originalityGuard: result.originalityGuard,
          evaluation: result.evaluation,
          requestId: rid,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        const status = error.code === "PAPER_WORKSPACE_NOT_FOUND" || error.code === "PAPER_CANDIDATE_NOT_FOUND" ? 404 : 400;
        return sendJson(res, status, err(error.code || "PAPER_PERMANENT_CANDIDATE_INVALID", String(error?.message || error), rid));
      }
    }

    const paperPermanentNotesId = parsePaperPermanentNotesPath(url.pathname);
    if (req.method === "POST" && paperPermanentNotesId) {
      const body = await readJson(req);
      try {
        await initVault(VAULT_PATH);
        const result = await savePaperPermanentNote(VAULT_PATH, paperPermanentNotesId, body);
        await registerImportCatalogNote(result.permanentNote, "permanent", result.writeResult);
        return sendJson(res, 201, {
          item: result.workspace,
          permanentNote: result.permanentNote,
          permanentCandidate: result.permanentCandidate,
          writeResult: {
            written: result.writeResult.written,
            skipped: result.writeResult.skipped,
            reason: result.writeResult.reason || null,
            path: path.relative(VAULT_PATH, result.writeResult.path).replaceAll("\\", "/")
          },
          requestId: rid,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        const status =
          error.code === "PAPER_WORKSPACE_NOT_FOUND" || error.code === "PAPER_PERMANENT_CANDIDATE_NOT_FOUND"
            ? 404
            : error.code === "PAPER_PERMANENT_NOTE_EXISTS" || error.code === "PAPER_PERMANENT_NOTE_ALREADY_SAVED"
              ? 409
              : 400;
        return sendJson(res, status, err(error.code || "PAPER_PERMANENT_NOTE_INVALID", String(error?.message || error), rid));
      }
    }

    const importRecordId = parseImportRecordPath(url.pathname);
    if (req.method === "GET" && importRecordId) {
      const record = await getImportRecord(importRecordId);
      if (!record) return sendJson(res, 404, err("IMPORT_RECORD_NOT_FOUND", "import record not found", rid));
      return sendJson(res, 200, {
        importRecord: publicImportRecord(record),
        requestId: rid,
        timestamp: new Date().toISOString()
      });
    }

    if (req.method === "POST" && url.pathname === "/api/v1/originality/check") {
      const body = await readJson(req);
      const plan = normalizeOriginalityPlan(body.originalityPlan || {});
      const record = {
        literature: Array.isArray(body.literature) ? body.literature : [],
        permanent: Array.isArray(body.permanent) ? body.permanent : []
      };
      const guard = originalityGuard(record, plan);
      return sendJson(res, 200, {
        originalityGuard: {
          plan: guard.plan,
          blockedPermanentIds: guard.flaggedPermanentIds,
          evaluations: guard.evaluations,
          warnings: guard.warnings
        },
        summary: {
          permanentCount: record.permanent.length,
          blockedCount: guard.evaluations.filter((x) => x.status === "blocked").length,
          warningCount: guard.evaluations.filter((x) => x.status === "warning").length,
          passCount: guard.evaluations.filter((x) => x.status === "pass").length
        }
      });
    }

    const confirmId = parseConfirmPath(url.pathname);
    if (req.method === "POST" && confirmId) {
      const body = await readJson(req);
      const record = await getImportRecord(confirmId);
      if (!record) return sendJson(res, 404, err("IMPORT_RECORD_NOT_FOUND", "import record not found", rid));
      if (record.state !== "preview") return sendJson(res, 400, err("IMPORT_STATUS_INVALID", "import status invalid", rid));
      if (body.confirm === false) {
        record.state = "cancelled";
        importRecords.set(confirmId, record);
        return sendJson(res, 200, { importRecordId: confirmId, status: "cancelled", message: "Import cancelled." });
      }
      if (body.confirm !== true) return sendJson(res, 400, err("IMPORT_CONFIRM_REQUIRED", "confirm must be true/false", rid));

      let selected;
      try {
        selected = buildSelectedImportCandidates(record.candidates, body.selectedCandidateIds);
      } catch (error) {
        return sendJson(res, 400, err(error.code || "IMPORT_SELECTED_CANDIDATES_INVALID", String(error?.message || error), rid, error.details));
      }

      const confirmPlan = normalizeOriginalityPlan(body.originalityPlan || record.originalityGuard?.plan || {});
      const confirmGuard = originalityGuard(selected.candidates, confirmPlan);
      const blocked = confirmGuard.evaluations.filter((x) => x.status === "blocked");
      const evaluationById = new Map(confirmGuard.evaluations.map((x) => [x.permanentId, x]));
      const allowOverride = body.overrideOriginality === true;
      if (confirmPlan.blockOnBlocked && blocked.length && !allowOverride) {
        return sendJson(
          res,
          409,
          err("IMPORT_ORIGINALITY_BLOCKED", "originality guard blocked confirmation", rid, {
            blockedPermanentIds: blocked.map((x) => x.permanentId),
            threshold: confirmPlan.blockThreshold
          })
        );
      }

      await initVault(VAULT_PATH);
      const created = { sources: 0, literatureNotes: 0, permanentNotes: 0 };
      const skipped = { conflicted: 0, invalid: 0 };
      const writtenPaths = new Set();
      const createdFiles = [];

      for (const source of selected.candidates.sources) {
        const result = await writeSourceIfAbsent(VAULT_PATH, source);
        if (result.written) {
          created.sources += 1;
          writtenPaths.add(path.dirname(result.path));
          createdFiles.push(await createdEntryFromWriteResult(VAULT_PATH, result));
        } else skipped.conflicted += 1;
      }
      for (const ln of selected.candidates.literature) {
        const result = await writeLiteratureNoteIfAbsent(VAULT_PATH, ln);
        if (result.written) {
          created.literatureNotes += 1;
          writtenPaths.add(path.dirname(result.path));
          createdFiles.push(await createdEntryFromWriteResult(VAULT_PATH, result));
          await registerImportCatalogNote(ln, "literature", result);
        } else skipped.conflicted += 1;
      }

      if (record.connector === "obsidian") {
        const importRootRaw = String(record.payload?.path || "").trim();
        const importRoot = importRootRaw ? (path.isAbsolute(importRootRaw) ? importRootRaw : path.resolve(CWD, importRootRaw)) : null;
        const assetTargets = new Set();

        for (const note of selected.candidates.literature) {
          for (const link of Array.isArray(note?.parsed_wikilinks) ? note["parsed_wikilinks"] : []) {
            if (!link?.embed || !link?.target) continue;
            const normalizedTarget = normalizeRelativeFileTarget(link.target);
            if (!normalizedTarget) continue;
            if (normalizedTarget.toLowerCase().endsWith(".md")) continue;
            assetTargets.add(normalizedTarget);
          }
        }

        if (importRoot && assetTargets.size) {
          for (const normalizedTarget of assetTargets) {
            const sourcePath = path.resolve(importRoot, normalizedTarget);
            const relToImportRoot = path.relative(importRoot, sourcePath);
            if (relToImportRoot.startsWith("..") || path.isAbsolute(relToImportRoot)) continue;

            try {
              await fs.access(sourcePath);
            } catch {
              continue;
            }

            const destRel = path.posix.join("assets", "imports", confirmId, normalizedTarget);
            const destFull = path.join(VAULT_PATH, destRel);
            await fs.mkdir(path.dirname(destFull), { recursive: true });
            await fs.copyFile(sourcePath, destFull);
            writtenPaths.add(path.dirname(destFull));
            createdFiles.push(
              await createdEntryFromVaultPath(VAULT_PATH, {
                noteId: stableAssetId(confirmId, destRel),
                noteType: "asset",
                filePath: destFull
              })
            );
          }
        }
      }
      for (const pn of selected.candidates.permanent) {
        const evalItem = evaluationById.get(pn.id);
        if (evalItem?.status === "warning" && !confirmPlan.allowDraftOnWarning) {
          skipped.invalid += 1;
          continue;
        }
        const noteToWrite = {
          ...pn,
          originality_status: evalItem?.status || pn.originality_status || "warning"
        };
        const result = await writePermanentNoteIfAbsent(VAULT_PATH, noteToWrite);
        if (result.written) {
          created.permanentNotes += 1;
          writtenPaths.add(path.dirname(result.path));
          createdFiles.push(await createdEntryFromWriteResult(VAULT_PATH, result));
          await registerImportCatalogNote(noteToWrite, "permanent", result);
        } else skipped.conflicted += 1;
      }

      record.state = "completed";
      record.originalityGuard = confirmGuard;
      record.confirmResult = {
        created,
        skipped,
        selection: selected.selection,
        writtenPaths: [...writtenPaths].map((x) => path.relative(VAULT_PATH, x).replaceAll("\\", "/")),
        createdFiles,
        finishedAt: new Date().toISOString()
      };
      record.updatedAt = record.confirmResult.finishedAt;
      importRecords.set(confirmId, record);
      await appendImportRecord(VAULT_PATH, record.connector, confirmId, "confirm", {
        requestId: rid,
        created,
        skipped,
        selection: record.confirmResult.selection,
        writtenPaths: record.confirmResult.writtenPaths,
        createdFiles,
        originalityGuard: {
          plan: confirmGuard.plan,
          blockedPermanentIds: confirmGuard.flaggedPermanentIds,
          evaluations: confirmGuard.evaluations
        }
      });

      return sendJson(res, 200, {
        importRecordId: confirmId,
        status: "completed",
        result: {
          created,
          skipped,
          selection: record.confirmResult.selection,
          writtenPaths: record.confirmResult.writtenPaths,
          createdFiles
        },
        originalityGuard: {
          plan: confirmGuard.plan,
          blockedPermanentIds: confirmGuard.flaggedPermanentIds,
          evaluations: confirmGuard.evaluations
        },
        finishedAt: record.confirmResult.finishedAt
      });
    }

    const rollbackId = parseRollbackPath(url.pathname);
    if (req.method === "POST" && rollbackId) {
      const record = await getImportRecord(rollbackId);
      if (!record) return sendJson(res, 404, err("IMPORT_RECORD_NOT_FOUND", "import record not found", rid));
      if (record.state !== "completed") return sendJson(res, 400, err("IMPORT_STATUS_INVALID", "only completed imports can be rolled back", rid));

      const createdFiles = Array.isArray(record.confirmResult?.createdFiles) ? record.confirmResult.createdFiles : [];
      const { rolledBack, skipped } = await rollbackCreatedFiles(VAULT_PATH, createdFiles);
      for (const item of rolledBack) {
        if (item.noteType === "literature" || item.noteType === "permanent") {
          try {
            await deleteNoteById(VAULT_PATH, item.noteId);
          } catch {}
        }
      }

      const finishedAt = new Date().toISOString();
      record.state = "rolled_back";
      record.rollbackResult = {
        rolledBack,
        skipped,
        finishedAt
      };
      record.updatedAt = finishedAt;
      importRecords.set(rollbackId, record);
      await appendImportRecord(VAULT_PATH, record.connector, rollbackId, "rollback", {
        requestId: rid,
        rolledBack,
        skipped,
        finishedAt
      });

      return sendJson(res, 200, {
        importRecordId: rollbackId,
        status: "rolled_back",
        result: {
          rolledBack: rolledBack.length,
          skipped: skipped.length,
          rolledBackPaths: rolledBack.map((item) => item.path),
          skippedFiles: skipped
        },
        finishedAt
      });
    }

    if (req.method === "POST" && url.pathname === "/api/v1/exports/markdown") {
      const body = await readJson(req);
      const targetPathRaw = String(body.targetPath || "").trim();
      if (!targetPathRaw) return sendJson(res, 400, err("EXPORT_SCOPE_INVALID", "targetPath required", rid));
      const targetPath = path.isAbsolute(targetPathRaw) ? targetPathRaw : path.resolve(CWD, targetPathRaw);
      const includeDescendants =
        body.includeDescendants === undefined
          ? true
          : body.includeDescendants !== false && String(body.includeDescendants).trim().toLowerCase() !== "false";
      let result;
      try {
        result = await exportMarkdown({
          vaultPath: VAULT_PATH,
          targetPath,
          noteIds: body.noteIds,
          directoryId: body.directoryId,
          includeDescendants,
          requestId: rid
        });
      } catch (error) {
        if (error?.code === "EXPORT_TARGET_INSIDE_VAULT") {
          return sendJson(res, 400, err("EXPORT_TARGET_INVALID", String(error.message || error), rid));
        }
        if (error?.code === "EXPORT_SCOPE_INVALID") {
          return sendJson(res, 400, err("EXPORT_SCOPE_INVALID", String(error.message || error), rid));
        }
        throw error;
      }
      return sendJson(res, 202, {
        exportJobId: result.exportJobId,
        status: result.status,
        copied: result.copied,
        copiedBreakdown: result.copiedBreakdown,
        scope: result.scope
      });
    }

    if (req.method === "POST" && url.pathname === "/api/v1/index-cards") {
      const body = await readJson(req);
      try {
        await initVault(VAULT_PATH);
        const item = await createIndexCard(VAULT_PATH, body);
        return sendJson(res, 201, {
          item,
          requestId: rid,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        return sendJson(res, 400, err("INDEX_CARD_INVALID", String(error?.message || error), rid));
      }
    }

    if (req.method === "GET" && url.pathname === "/api/v1/index-cards") {
      try {
        await initVault(VAULT_PATH);
        const items = await listIndexCards(VAULT_PATH, {
          directoryId: url.searchParams.get("directoryId") || "",
          includeDescendants: url.searchParams.get("includeDescendants") || "true",
          indexType: url.searchParams.get("indexType") || "",
          limit: Number(url.searchParams.get("limit") || 12)
        });
        return sendJson(res, 200, {
          items,
          total: items.length,
          requestId: rid,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        return sendJson(res, 400, err("INDEX_CARD_INVALID", String(error?.message || error), rid));
      }
    }

    const indexCardMatch = url.pathname.match(/^\/api\/v1\/index-cards\/([^/]+)$/);
    if (req.method === "GET" && indexCardMatch) {
      try {
        await initVault(VAULT_PATH);
        const item = await getIndexCard(VAULT_PATH, decodeURIComponent(indexCardMatch[1]));
        return sendJson(res, 200, {
          item,
          requestId: rid,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        return sendJson(res, 400, err("INDEX_CARD_INVALID", String(error?.message || error), rid));
      }
    }

    if (req.method === "PATCH" && indexCardMatch) {
      const body = await readJson(req);
      try {
        await initVault(VAULT_PATH);
        const item = await updateIndexCard(VAULT_PATH, decodeURIComponent(indexCardMatch[1]), body);
        return sendJson(res, 200, {
          item,
          requestId: rid,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        return sendJson(res, 400, err("INDEX_CARD_INVALID", String(error?.message || error), rid));
      }
    }

    const indexCardDistillMatch = url.pathname.match(/^\/api\/v1\/index-cards\/([^/]+)\/distill$/);
    if (req.method === "POST" && indexCardDistillMatch) {
      try {
        await initVault(VAULT_PATH);
        const item = await distillIndexCard(VAULT_PATH, decodeURIComponent(indexCardDistillMatch[1]));
        return sendJson(res, 200, {
          item,
          requestId: rid,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        return sendJson(res, 400, err("INDEX_CARD_INVALID", String(error?.message || error), rid));
      }
    }

    if (req.method === "POST" && url.pathname === "/api/v1/writing/ai-analysis") {
      try {
        await initVault(VAULT_PATH);
        const body = await readJson(req);
        const notes = [
          ...(Array.isArray(body.notes) ? body.notes : []),
          ...(await loadNotesByIds(body.noteIds || body.note_ids))
        ];
        const requestPayload = {
          ...body,
          notes
        };
        const executeRemoteModel =
          enabledFlag(body, "executeRemoteModel", "execute_remote_model") ||
          enabledFlag(body, "executeModel", "execute_model");
        const providerExecution = executeRemoteModel
          ? await resolveAnalysisProviderExecution(body, {
              modelPack: "Deep Work",
              userMode: "Deep Thinking",
              modelTier: "strong_reasoning",
              privacyMode: "remote_after_confirmation"
            })
          : null;
        const explicitRemoteModel = cleanText(body.model || body.remoteModel || body.remote_model);
        const requestContext = {
          agentRunId: `run_writing_analysis_${rid}`,
          contextPackId: `ctx_writing_analysis_${rid}`,
          artifactIdSalt: rid,
          userConfirmedRemoteModel: body.userConfirmedRemoteModel === true || body.user_confirmed_remote_model === true,
          model: providerExecution
            ? requestModelFromRoute(
                providerExecution.providerDescriptor,
                providerExecution.modelRoute,
                explicitRemoteModel,
                "Remote / Confirmed"
              )
            : body.model
            ? {
                provider: cleanText(body.provider) || "remote_strong_model",
                model: cleanText(body.model),
                tier: "strong",
                mode: "Remote / Confirmed"
              }
            : null
        };
        const strongModelRequest = buildWritingStrongModelRequest(requestPayload, requestContext);
        const modelResponse = body.modelResponse ?? body.model_response ?? body.remoteModelResponse ?? body.remote_model_response;
        let modelExecution = null;
        const result = modelResponse
          ? mergeWritingStrongModelResponse(strongModelRequest, modelResponse, requestContext)
          : executeRemoteModel
            ? await runWritingStrongModelAnalysis(strongModelRequest, providerExecution.providerAdapter, requestContext).then((executionResult) => {
                modelExecution = modelExecutionSummary(executionResult.providerResponse, {
                  modelRoute: providerExecution.modelRoute
                });
                return executionResult;
              })
            : null;
        const persistArtifacts = Boolean(result) && body.persistArtifacts !== false && body.persist_artifacts !== false;
        const artifactStore = persistArtifacts ? await aiArtifactStore() : null;
        const storedArtifacts = persistArtifacts ? artifactStore.createMany(result.artifacts) : [];
        return sendJson(res, 200, {
          item: {
            request: strongModelRequest,
            modelExecution,
            result: result
              ? {
                  ...result,
                  storedArtifactIds: storedArtifacts.map((artifact) => artifact.id),
                  artifactsPersisted: persistArtifacts
                }
              : null
          },
          requestId: rid,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        const status = error?.code === "WRITING_REMOTE_MODEL_CONFIRMATION_REQUIRED" ? 403 : 400;
        return sendJson(res, status, err(error?.code || "WRITING_AI_ANALYSIS_FAILED", String(error?.message || error), rid, error?.details));
      }
    }

    if (req.method === "POST" && url.pathname === "/api/v1/writing-projects") {
      const body = await readJson(req);
      try {
        await initVault(VAULT_PATH);
        const item = await createWritingProject(VAULT_PATH, body);
        return sendJson(res, 201, {
          item,
          requestId: rid,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        return sendJson(res, 400, err("WRITING_PROJECT_INVALID", String(error?.message || error), rid));
      }
    }

    if (req.method === "GET" && url.pathname === "/api/v1/writing-projects") {
      try {
        await initVault(VAULT_PATH);
        const limit = Number(url.searchParams.get("limit") || 8);
        const items = await listWritingProjects(VAULT_PATH, {
          limit,
          q: url.searchParams.get("q") || "",
          status: url.searchParams.get("status") || "",
          hasDraft: url.searchParams.get("hasDraft") || ""
        });
        return sendJson(res, 200, {
          items,
          total: items.length,
          requestId: rid,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        return sendJson(res, 400, err("WRITING_PROJECT_INVALID", String(error?.message || error), rid));
      }
    }

    const writingProjectMatch = url.pathname.match(/^\/api\/v1\/writing-projects\/([^/]+)$/);
    if (req.method === "GET" && writingProjectMatch) {
      try {
        await initVault(VAULT_PATH);
        const item = await getWritingProject(VAULT_PATH, decodeURIComponent(writingProjectMatch[1]));
        return sendJson(res, 200, {
          item,
          requestId: rid,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        return sendJson(res, 400, err("WRITING_PROJECT_INVALID", String(error?.message || error), rid));
      }
    }

    const writingDraftBindingMatch = url.pathname.match(/^\/api\/v1\/writing-projects\/([^/]+)\/draft-note$/);
    if (req.method === "POST" && writingDraftBindingMatch) {
      const body = await readJson(req);
      try {
        await initVault(VAULT_PATH);
        const item = await bindDraftNoteToProject(VAULT_PATH, {
          writingProjectId: decodeURIComponent(writingDraftBindingMatch[1]),
          draftNoteId: body.draftNoteId || body.draft_note_id,
          sourceScaffoldId: body.sourceScaffoldId || body.source_scaffold_id,
          versionNote: body.versionNote || body.version_note
        });
        return sendJson(res, 200, {
          item,
          requestId: rid,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        return sendJson(res, 400, err("WRITING_PROJECT_INVALID", String(error?.message || error), rid));
      }
    }

    const writingCurrentDraftMatch = url.pathname.match(/^\/api\/v1\/writing-projects\/([^/]+)\/current-draft$/);
    if (req.method === "POST" && writingCurrentDraftMatch) {
      const body = await readJson(req);
      try {
        await initVault(VAULT_PATH);
        const item = await setCurrentDraftNote(VAULT_PATH, {
          writingProjectId: decodeURIComponent(writingCurrentDraftMatch[1]),
          draftNoteId: body.draftNoteId || body.draft_note_id
        });
        return sendJson(res, 200, {
          item,
          requestId: rid,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        return sendJson(res, 400, err("WRITING_PROJECT_INVALID", String(error?.message || error), rid));
      }
    }

    const writingDraftVersionsMatch = url.pathname.match(/^\/api\/v1\/writing-projects\/([^/]+)\/draft-versions$/);
    if (req.method === "GET" && writingDraftVersionsMatch) {
      try {
        await initVault(VAULT_PATH);
        const item = await listProjectDraftVersions(
          VAULT_PATH,
          decodeURIComponent(writingDraftVersionsMatch[1]),
          { limit: Number(url.searchParams.get("limit") || 12) }
        );
        return sendJson(res, 200, {
          items: item,
          total: item.length,
          requestId: rid,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        return sendJson(res, 400, err("WRITING_PROJECT_INVALID", String(error?.message || error), rid));
      }
    }

    const writingProjectScaffoldsMatch = url.pathname.match(/^\/api\/v1\/writing-projects\/([^/]+)\/scaffolds$/);
    if (req.method === "GET" && writingProjectScaffoldsMatch) {
      try {
        await initVault(VAULT_PATH);
        const item = await listProjectScaffolds(
          VAULT_PATH,
          decodeURIComponent(writingProjectScaffoldsMatch[1]),
          { limit: Number(url.searchParams.get("limit") || 12) }
        );
        return sendJson(res, 200, {
          items: item,
          total: item.length,
          requestId: rid,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        return sendJson(res, 400, err("DRAFT_SCAFFOLD_INVALID", String(error?.message || error), rid));
      }
    }

    if (req.method === "POST" && url.pathname === "/api/v1/draft-scaffolds") {
      const body = await readJson(req);
      try {
        await initVault(VAULT_PATH);
        const item = await createDraftScaffold(VAULT_PATH, body);
        return sendJson(res, 201, {
          item,
          export: {
              json: {
                id: item.id,
                writing_project_id: item.writing_project_id,
                sections: item.sections,
                open_questions: item.open_questions,
                preflight: item.preflight || null,
                generated_by: item.generated_by,
                version_note: item.version_note || "",
                created_at: item.created_at,
                updated_at: item.updated_at
              },
            markdown: item.markdown
          },
          requestId: rid,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        return sendJson(res, 400, err("DRAFT_SCAFFOLD_INVALID", String(error?.message || error), rid));
      }
    }

    const draftScaffoldMatch = url.pathname.match(/^\/api\/v1\/draft-scaffolds\/([^/]+)$/);
    if (req.method === "GET" && draftScaffoldMatch) {
      try {
        await initVault(VAULT_PATH);
        const item = await getDraftScaffold(VAULT_PATH, decodeURIComponent(draftScaffoldMatch[1]));
        return sendJson(res, 200, {
          item,
          export: {
              json: {
                id: item.id,
                writing_project_id: item.writing_project_id,
                sections: item.sections,
                open_questions: item.open_questions,
                preflight: item.preflight || null,
                generated_by: item.generated_by,
                version_note: item.version_note || "",
                created_at: item.created_at,
                updated_at: item.updated_at
              },
            markdown: item.markdown
          },
          requestId: rid,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        return sendJson(res, 400, err("DRAFT_SCAFFOLD_INVALID", String(error?.message || error), rid));
      }
    }

    if (req.method === "PATCH" && draftScaffoldMatch) {
      const body = await readJson(req);
      try {
        await initVault(VAULT_PATH);
        const item = await updateDraftScaffoldVersionNote(VAULT_PATH, decodeURIComponent(draftScaffoldMatch[1]), body);
        return sendJson(res, 200, {
          item,
          requestId: rid,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        return sendJson(res, 400, err("DRAFT_SCAFFOLD_INVALID", String(error?.message || error), rid));
      }
    }

    const draftNoteVersionMatch = url.pathname.match(/^\/api\/v1\/draft-note-versions\/([^/]+)$/);
    if (req.method === "PATCH" && draftNoteVersionMatch) {
      const body = await readJson(req);
      try {
        await initVault(VAULT_PATH);
        const item = await updateDraftNoteVersionNote(VAULT_PATH, decodeURIComponent(draftNoteVersionMatch[1]), body);
        return sendJson(res, 200, {
          item,
          requestId: rid,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        return sendJson(res, 400, err("WRITING_PROJECT_INVALID", String(error?.message || error), rid));
      }
    }

    return sendJson(res, 404, err("NOT_FOUND", "Route not found", rid));
  } catch (error) {
    return sendJson(res, 500, err("INTERNAL_ERROR", String(error?.message || error), rid));
  }
});

server.listen(PORT, async () => {
  console.log(`API running on http://localhost:${PORT}`);
  console.log(`Vault path: ${VAULT_PATH}`);
  try {
    await initVault(VAULT_PATH);
    AUTH_STATE_PATH = path.resolve(VAULT_PATH, ".yansilu", "auth-state.json");
    await loadAuthState();
    console.log("Vault initialized.");
  } catch (error) {
    console.error(`Vault initialization failed: ${String(error?.message || error)}`);
  }
});
