function cleanText(value) {
  return String(value || "").trim();
}

function normalizeKey(value) {
  return cleanText(value).toLowerCase().replace(/[\s/-]+/g, "_");
}

const USER_MODES = {
  auto: {
    userMode: "Auto",
    description: "Let the app choose the right model for each task."
  },
  economy: {
    userMode: "Economy",
    description: "Prefer lower cost and speed for routine work."
  },
  balanced: {
    userMode: "Balanced",
    description: "Use normal quality and cost for everyday AI work."
  },
  deep_thinking: {
    userMode: "Deep Thinking",
    description: "Use stronger reasoning for important synthesis and reflection."
  },
  local_private: {
    userMode: "Local / Private",
    description: "Keep eligible work on configured local or private models."
  }
};

const USER_MODE_ALIASES = {
  auto: "auto",
  economy: "economy",
  cheap: "economy",
  low_cost: "economy",
  balanced: "balanced",
  standard: "balanced",
  deep: "deep_thinking",
  deep_thinking: "deep_thinking",
  strong: "deep_thinking",
  local: "local_private",
  private: "local_private",
  local_private: "local_private",
  local_and_private: "local_private"
};

const MODEL_PACKS = {
  starter_auto: {
    modelPackId: "starter_auto",
    modelPack: "Starter Auto",
    description: "Default simple setup with platform-managed AI and automatic routing.",
    defaultUserMode: "Auto",
    providerPreset: "platform_managed_openai",
    authMode: "platform_managed",
    providerVisibility: "hidden",
    byokRequired: false,
    fallbackPolicy: {
      allowSameProviderFallback: true,
      allowCrossProviderFallback: true,
      allowCloudFallback: true,
      allowCloudFallbackForPrivate: false,
      requiresConfirmationForCloud: false
    },
    budget: {
      monthlyLimit: 10,
      confirmationThresholdPerRun: 0.25,
      scheduledTaskHardCap: 1
    },
    privacy: {
      defaultMode: "normal",
      allowCloud: true,
      localPreferred: false
    }
  },
  low_cost_research: {
    modelPackId: "low_cost_research",
    modelPack: "Low Cost Research",
    description: "Lower-cost defaults for summaries, RSS scans, and relation discovery.",
    defaultUserMode: "Economy",
    providerPreset: "openai_compatible_gateway",
    authMode: "workspace_managed",
    providerVisibility: "advanced",
    byokRequired: false,
    fallbackPolicy: {
      allowSameProviderFallback: true,
      allowCrossProviderFallback: true,
      allowCloudFallback: true,
      allowCloudFallbackForPrivate: false,
      requiresConfirmationForStrongReasoning: true
    },
    budget: {
      monthlyLimit: 5,
      confirmationThresholdPerRun: 0.1,
      scheduledTaskHardCap: 0.5
    },
    privacy: {
      defaultMode: "normal",
      allowCloud: true,
      localPreferred: false
    }
  },
  deep_work: {
    modelPackId: "deep_work",
    modelPack: "Deep Work",
    description: "Higher-quality defaults for reflection, writing, and synthesis.",
    defaultUserMode: "Deep Thinking",
    providerPreset: "platform_managed_openai",
    authMode: "platform_managed",
    providerVisibility: "advanced",
    byokRequired: false,
    fallbackPolicy: {
      allowSameProviderFallback: true,
      allowCrossProviderFallback: true,
      allowCloudFallback: true,
      allowCloudFallbackForPrivate: false,
      requiresConfirmationForBroadContext: true
    },
    budget: {
      monthlyLimit: 20,
      confirmationThresholdPerRun: 0.5,
      scheduledTaskHardCap: 1
    },
    privacy: {
      defaultMode: "normal",
      allowCloud: true,
      localPreferred: false
    }
  },
  privacy_first: {
    modelPackId: "privacy_first",
    modelPack: "Privacy First",
    description: "Prefer local or private providers and require confirmation before cloud fallback.",
    defaultUserMode: "Local / Private",
    providerPreset: "local_private_gateway",
    authMode: "local_no_key",
    providerVisibility: "advanced",
    byokRequired: false,
    fallbackPolicy: {
      allowSameProviderFallback: true,
      allowCrossProviderFallback: false,
      allowCloudFallback: false,
      allowCloudFallbackForPrivate: false,
      requiresConfirmationForCloud: true
    },
    budget: {
      monthlyLimit: 0,
      confirmationThresholdPerRun: 0,
      scheduledTaskHardCap: 0
    },
    privacy: {
      defaultMode: "local_only",
      allowCloud: false,
      localPreferred: true
    }
  },
  ollama_local: {
    modelPackId: "ollama_local",
    modelPack: "Ollama Local",
    description: "Run eligible AI work through Ollama on localhost with a small local model.",
    defaultUserMode: "Local / Private",
    providerPreset: "ollama_local_gateway",
    authMode: "local_no_key",
    providerVisibility: "advanced",
    byokRequired: false,
    fallbackPolicy: {
      allowSameProviderFallback: true,
      allowCrossProviderFallback: false,
      allowCloudFallback: false,
      allowCloudFallbackForPrivate: false,
      requiresConfirmationForCloud: true
    },
    budget: {
      monthlyLimit: 0,
      confirmationThresholdPerRun: 0,
      scheduledTaskHardCap: 0
    },
    privacy: {
      defaultMode: "local_only",
      allowCloud: false,
      localPreferred: true
    }
  },
  minicpm_local: {
    modelPackId: "minicpm_local",
    modelPack: "MiniCPM Local",
    description: "Run eligible AI work through a local MiniCPM-compatible endpoint first.",
    defaultUserMode: "Local / Private",
    providerPreset: "minicpm_local_gateway",
    authMode: "local_no_key",
    providerVisibility: "advanced",
    byokRequired: false,
    fallbackPolicy: {
      allowSameProviderFallback: true,
      allowCrossProviderFallback: false,
      allowCloudFallback: false,
      allowCloudFallbackForPrivate: false,
      requiresConfirmationForCloud: true
    },
    budget: {
      monthlyLimit: 0,
      confirmationThresholdPerRun: 0,
      scheduledTaskHardCap: 0
    },
    privacy: {
      defaultMode: "local_only",
      allowCloud: false,
      localPreferred: true
    }
  },
  minicpm_remote: {
    modelPackId: "minicpm_remote",
    modelPack: "MiniCPM Remote",
    description: "Use a configured third-party MiniCPM-compatible gateway when local runtime is unavailable.",
    defaultUserMode: "Balanced",
    providerPreset: "minicpm_remote_gateway",
    authMode: "workspace_managed",
    providerVisibility: "advanced",
    byokRequired: false,
    fallbackPolicy: {
      allowSameProviderFallback: true,
      allowCrossProviderFallback: false,
      allowCloudFallback: true,
      allowCloudFallbackForPrivate: false,
      requiresConfirmationForCloud: false,
      requiresConfirmationForInternationalFallback: true
    },
    budget: {
      monthlyLimit: 5,
      confirmationThresholdPerRun: 0.1,
      scheduledTaskHardCap: 0.5
    },
    privacy: {
      defaultMode: "normal",
      allowCloud: true,
      localPreferred: false
    }
  },
  china_optimized: {
    modelPackId: "china_optimized",
    modelPack: "China Optimized",
    description: "Prefer China-region-friendly providers while keeping the UI simple.",
    defaultUserMode: "Auto",
    providerPreset: "china_optimized_gateway",
    authMode: "workspace_managed",
    providerVisibility: "advanced",
    byokRequired: false,
    fallbackPolicy: {
      allowSameProviderFallback: true,
      allowCrossProviderFallback: false,
      allowCloudFallback: true,
      allowCloudFallbackForPrivate: false,
      requiresConfirmationForInternationalFallback: true
    },
    budget: {
      monthlyLimit: 10,
      confirmationThresholdPerRun: 0.25,
      scheduledTaskHardCap: 1
    },
    privacy: {
      defaultMode: "normal",
      allowCloud: true,
      localPreferred: false
    }
  },
  global_optimized: {
    modelPackId: "global_optimized",
    modelPack: "Global Optimized",
    description: "Prefer globally available providers and gateway fallback.",
    defaultUserMode: "Auto",
    providerPreset: "openai_compatible_gateway",
    authMode: "workspace_managed",
    providerVisibility: "advanced",
    byokRequired: false,
    fallbackPolicy: {
      allowSameProviderFallback: true,
      allowCrossProviderFallback: true,
      allowCloudFallback: true,
      allowCloudFallbackForPrivate: false,
      requiresConfirmationForCloud: false
    },
    budget: {
      monthlyLimit: 10,
      confirmationThresholdPerRun: 0.25,
      scheduledTaskHardCap: 1
    },
    privacy: {
      defaultMode: "normal",
      allowCloud: true,
      localPreferred: false
    }
  }
};

const MODEL_PACK_ALIASES = {
  starter: "starter_auto",
  starter_auto: "starter_auto",
  auto: "starter_auto",
  default: "starter_auto",
  low_cost: "low_cost_research",
  low_cost_research: "low_cost_research",
  research: "low_cost_research",
  deep: "deep_work",
  deep_work: "deep_work",
  privacy: "privacy_first",
  privacy_first: "privacy_first",
  local: "privacy_first",
  ollama: "ollama_local",
  ollama_local: "ollama_local",
  minicpm: "minicpm_local",
  minicpm_local: "minicpm_local",
  minicpm_remote: "minicpm_remote",
  minicpm_third_party: "minicpm_remote",
  china: "china_optimized",
  china_optimized: "china_optimized",
  global: "global_optimized",
  global_optimized: "global_optimized"
};

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function normalizeUserModeForSettings(value = "Auto") {
  const key = USER_MODE_ALIASES[normalizeKey(value)];
  if (!key || !USER_MODES[key]) {
    const error = new Error(`Unsupported AI user mode: ${value}`);
    error.code = "AI_USER_MODE_INVALID";
    throw error;
  }
  return USER_MODES[key].userMode;
}

export function normalizeModelPackId(value = "Starter Auto") {
  const key = normalizeKey(value || "Starter Auto");
  const packId = MODEL_PACK_ALIASES[key] || key;
  if (!MODEL_PACKS[packId]) {
    const error = new Error(`Unsupported model pack: ${value}`);
    error.code = "AI_MODEL_PACK_INVALID";
    throw error;
  }
  return packId;
}

export function getModelPack(value = "Starter Auto") {
  return clone(MODEL_PACKS[normalizeModelPackId(value)]);
}

export function listModelPacks() {
  return Object.keys(MODEL_PACKS).map((id) => getModelPack(id));
}

export function listUserModeDefinitions() {
  return Object.keys(USER_MODES).map((id) => ({ id, ...clone(USER_MODES[id]) }));
}

export function resolveAiUserSettings(input = {}) {
  const explicitPack = input.modelPack || input.model_pack || input.modelPackId || input.model_pack_id;
  const requestedUserMode = input.userMode || input.user_mode;
  const pack = getModelPack(
    explicitPack || (requestedUserMode && normalizeUserModeForSettings(requestedUserMode) === "Local / Private" ? "Privacy First" : "Starter Auto")
  );
  const userMode = normalizeUserModeForSettings(requestedUserMode || pack.defaultUserMode);
  const providerPreset = cleanText(input.providerPreset || input.provider_preset) || pack.providerPreset;
  const authMode = cleanText(input.authMode || input.auth_mode) || pack.authMode;
  const providerVisibility = cleanText(input.providerVisibility || input.provider_visibility) || pack.providerVisibility;

  return {
    ...pack,
    userMode,
    providerPreset,
    authMode,
    providerVisibility,
    platformManaged: authMode === "platform_managed",
    byokRequired: input.byokRequired === true || input.byok_required === true || pack.byokRequired === true,
    noviceProviderDetailsHidden: providerVisibility === "hidden",
    fallbackPolicy: {
      ...pack.fallbackPolicy,
      ...(input.fallbackPolicy || input.fallback_policy || {})
    },
    budget: {
      ...pack.budget,
      ...(input.budget || {})
    },
    privacy: {
      ...pack.privacy,
      ...(input.privacy || {})
    }
  };
}
