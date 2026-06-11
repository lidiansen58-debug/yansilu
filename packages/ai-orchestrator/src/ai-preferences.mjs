function cleanText(value) {
  return String(value || "").trim();
}

function jsonClone(value) {
  return JSON.parse(JSON.stringify(value ?? null));
}

function optionalNumber(value) {
  if (value === undefined || value === null || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function preferenceKey(workspaceId, userId) {
  return `${cleanText(workspaceId) || "local_workspace"}::${cleanText(userId) || "local_user"}`;
}

function defaultModelPackForMode(userMode) {
  return cleanText(userMode) === "Local / Private" ? "Privacy First" : "Starter Auto";
}

function normalizeRuntimeMode(value = "") {
  const mode = cleanText(value).toLowerCase().replace(/[\s/-]+/g, "_");
  if (["local", "local_only", "private"].includes(mode)) return "local_only";
  if (["hybrid", "mixed", "local_cloud"].includes(mode)) return "hybrid";
  if (["cloud", "cloud_only", "remote"].includes(mode)) return "cloud_only";
  return "auto";
}

export function normalizeAiPreferences(input = {}, existing = {}) {
  const now = new Date().toISOString();
  const userId = cleanText(input.userId || input.user_id || existing.userId) || "local_user";
  const workspaceId = cleanText(input.workspaceId || input.workspace_id || existing.workspaceId) || "local_workspace";
  const userMode = cleanText(input.userMode || input.user_mode || existing.userMode) || "Auto";
  const modelPack =
    cleanText(input.modelPack || input.model_pack || existing.modelPack) ||
    defaultModelPackForMode(userMode);
  const monthlyBudget = optionalNumber(input.monthlyBudget ?? input.monthly_budget ?? existing.monthlyBudget);
  const confirmationThreshold = optionalNumber(
    input.confirmationThreshold ?? input.confirmation_threshold ?? existing.confirmationThreshold
  );
  const budgetInput = input.budget || existing.budget || {};
  const budgetStateInput = input.budgetState || input.budget_state || existing.budgetState || {};

  return {
    userId,
    workspaceId,
    userMode,
    modelPack,
    monthlyBudget,
    confirmationThreshold,
    fallbackPolicy: jsonClone(input.fallbackPolicy || input.fallback_policy || existing.fallbackPolicy || {}),
    privacy: jsonClone(input.privacy || existing.privacy || {}),
    budget: {
      ...(monthlyBudget !== null ? { monthlyLimit: monthlyBudget } : {}),
      ...(confirmationThreshold !== null ? { confirmationThresholdPerRun: confirmationThreshold } : {}),
      ...jsonClone(budgetInput)
    },
    budgetState: jsonClone(budgetStateInput),
    advancedSettings: jsonClone(input.advancedSettings || input.advanced_settings || existing.advancedSettings || {}),
    createdAt: cleanText(existing.createdAt || existing.created_at || input.createdAt || input.created_at) || now,
    updatedAt: cleanText(input.updatedAt || input.updated_at) || now
  };
}

export function preferencesToSettingsInput(preferences = null) {
  if (!preferences) return {};
  const advancedSettings = preferences.advancedSettings || {};
  const advancedModelRef = cleanText(advancedSettings.modelRef || advancedSettings.model_ref);
  const advancedSecretRef = cleanText(advancedSettings.secretRef || advancedSettings.secret_ref);
  const localProviderPreset = cleanText(advancedSettings.localProviderPreset || advancedSettings.local_provider_preset);
  const localModel = cleanText(advancedSettings.localModel || advancedSettings.local_model);
  const runtimeMode = normalizeRuntimeMode(advancedSettings.runtimeMode || advancedSettings.runtime_mode);
  const localProviderActive = Boolean(localProviderPreset && localModel && runtimeMode === "local_only");
  return {
    userMode: preferences.userMode,
    modelPack: preferences.modelPack,
    ...(localProviderActive ? { providerPreset: localProviderPreset } : {}),
    ...(advancedModelRef ? { modelRef: advancedModelRef } : {}),
    ...(advancedSecretRef ? { secretRef: advancedSecretRef } : {}),
    fallbackPolicy: preferences.fallbackPolicy || {},
    privacy: preferences.privacy || {},
    budget: preferences.budget || {},
    budgetState: preferences.budgetState || {},
    advancedSettings
  };
}

export function createInMemoryAiPreferencesStore(options = {}) {
  const preferences = new Map();
  const initialPreferences = Array.isArray(options.preferences) ? options.preferences : [];

  function setUserPreferences(input = {}) {
    const key = preferenceKey(input.workspaceId || input.workspace_id, input.userId || input.user_id);
    const existing = preferences.get(key) || {};
    const normalized = normalizeAiPreferences(input, existing);
    preferences.set(preferenceKey(normalized.workspaceId, normalized.userId), normalized);
    return jsonClone(normalized);
  }

  for (const preference of initialPreferences) {
    setUserPreferences(preference);
  }

  return {
    setUserPreferences,
    upsertUserPreferences: setUserPreferences,
    getUserPreferences(input = {}) {
      const key = preferenceKey(input.workspaceId || input.workspace_id, input.userId || input.user_id);
      const preference = preferences.get(key);
      return preference ? jsonClone(preference) : null;
    },
    listUserPreferences(filter = {}) {
      const workspaceId = cleanText(filter.workspaceId || filter.workspace_id);
      return [...preferences.values()]
        .filter((preference) => !workspaceId || preference.workspaceId === workspaceId)
        .map((preference) => jsonClone(preference));
    },
    deleteUserPreferences(input = {}) {
      return preferences.delete(preferenceKey(input.workspaceId || input.workspace_id, input.userId || input.user_id));
    },
    close() {}
  };
}
