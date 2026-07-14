import { createAgentRegistry } from "./agent-registry.mjs";
import { providerConfigToSettingsInput } from "./ai-provider-configs.mjs";
import { resolveModelRoute } from "./model-router.mjs";
import { providerHealthCandidateInput } from "./provider-health-store.mjs";
import { selectProviderForRoute, providerHealthSummary } from "./provider-health-policy.mjs";
import { resolveProviderDescriptor } from "./provider-presets.mjs";

export const DEFAULT_SCHEDULED_LOCAL_AI_BATCH_SIZE = 4;
export const DEFAULT_SCHEDULED_LOCAL_AI_TIMEOUT_MS = 120000;

const TASK_STATUSES = new Set(["active", "paused", "disabled", "failed"]);
const TASK_TYPES = new Set([
  "research_scan",
  "source_monitor",
  "relation_scan",
  "writable_theme_discovery",
  "project_digest",
  "reflection_prompt",
  "originality_check"
]);

const LOCAL_DISCOVERY_TASK_TYPES = new Set(["relation_scan", "writable_theme_discovery"]);

function defaultAgentIdForTaskType(taskType = "") {
  if (taskType === "relation_scan") return "connection_agent";
  if (taskType === "writable_theme_discovery") return "theme_agent";
  return "reflection_agent";
}

const SCHEDULED_TASK_TEMPLATES = [
  {
    templateId: "weekly_link_suggestions",
    name: "发现相关笔记",
    description: "定期找出可能有关联的笔记，先放到待处理里等你确认。",
    implementationReady: true,
    defaultStatus: "active",
    task: {
      taskType: "relation_scan",
      agentId: "connection_agent",
      schedule: { type: "daily", timezone: "local", time: "16:00" },
      scope: { noteIds: [], keywords: [], includePrivateNotes: false },
      model: { userMode: "Economy", maxTier: "standard", allowStrongReasoning: false },
      budget: { maxRunsPerPeriod: 1, maxEstimatedCostPerRun: 0.25, maxEstimatedCostPerPeriod: 0.5, period: "week" },
      privacy: { mode: "normal", allowCloudModels: true, requireConfirmationForPrivateNotes: true },
      output: { destination: "ai_inbox", artifactTypes: ["LinkSuggestion"], notifyUser: "digest" }
    }
  },
  {
    templateId: "reflection_reminder",
    name: "提醒我回看",
    description: "定期挑出值得回看的笔记，先放到待处理里等你确认。",
    implementationReady: true,
    defaultStatus: "active",
    task: {
      taskType: "reflection_prompt",
      agentId: "reflection_agent",
      schedule: { type: "daily", timezone: "local", time: "16:00" },
      scope: { noteIds: [], keywords: [], includePrivateNotes: false },
      model: { userMode: "Balanced", maxTier: "standard", allowStrongReasoning: false },
      budget: { maxRunsPerPeriod: 1, maxEstimatedCostPerRun: 0.35, maxEstimatedCostPerPeriod: 0.7, period: "week" },
      privacy: { mode: "normal", allowCloudModels: true, requireConfirmationForPrivateNotes: true },
      output: { destination: "ai_inbox", artifactTypes: ["ReflectionPrompt"], notifyUser: "only_if_high_signal" }
    }
  },
  {
    templateId: "writable_theme_discovery",
    name: "发现可写主题",
    description: "定期从笔记里找出适合开始写作的主题，先放到待处理里等你确认。",
    implementationReady: true,
    defaultStatus: "active",
    task: {
      taskType: "writable_theme_discovery",
      agentId: "theme_agent",
      schedule: { type: "daily", timezone: "local", time: "16:00" },
      scope: { noteIds: [], keywords: [], includePrivateNotes: false },
      model: { userMode: "Economy", maxTier: "standard", allowStrongReasoning: false },
      budget: { maxRunsPerPeriod: 1, maxEstimatedCostPerRun: 0.25, maxEstimatedCostPerPeriod: 0.5, period: "week" },
      privacy: { mode: "normal", allowCloudModels: true, requireConfirmationForPrivateNotes: true },
      output: { destination: "ai_inbox", artifactTypes: ["InsightCard"], notifyUser: "digest" },
      runInput: {
        userInstruction:
          "Find writable themes supported by the selected notes. Prefer concrete theme titles, source note ids, and a clear next action."
      }
    }
  },
  {
    templateId: "weekly_research_scan",
    name: "Weekly research scan",
    description: "Read selected source feeds and create research cards after source-reader contracts land.",
    implementationReady: false,
    defaultStatus: "paused",
    task: {
      taskType: "research_scan",
      agentId: "research_agent",
      schedule: { type: "weekly", timezone: "local", dayOfWeek: "monday", time: "09:00" },
      scope: { sourceFeedIds: [], keywords: [], includePrivateNotes: false },
      model: { userMode: "Auto", maxTier: "standard", allowStrongReasoning: false },
      budget: { maxRunsPerPeriod: 1, maxEstimatedCostPerRun: 0.5, maxEstimatedCostPerPeriod: 1, period: "week" },
      privacy: { mode: "normal", allowCloudModels: true, requireConfirmationForPrivateNotes: true },
      output: { destination: "research_inbox", artifactTypes: ["ResearchCard"], notifyUser: "only_if_high_signal" }
    }
  }
];

function cleanText(value) {
  return String(value || "").trim();
}

function clone(value) {
  return JSON.parse(JSON.stringify(value ?? null));
}

function nowIso() {
  return new Date().toISOString();
}

function generatedId(prefix = "sched") {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeLimit(value, fallback = 50) {
  const limit = Number(value || fallback);
  if (!Number.isFinite(limit)) return fallback;
  return Math.max(1, Math.min(500, Math.floor(limit)));
}

function optionalNumber(value) {
  if (value === undefined || value === null || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function positiveInteger(value, fallback = 0) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(0, Math.floor(number));
}

function normalizeStatus(value, fallback = "active") {
  const status = cleanText(value || fallback);
  return TASK_STATUSES.has(status) ? status : fallback;
}

function normalizeTaskType(value, fallback = "relation_scan") {
  const taskType = cleanText(value || fallback);
  return TASK_TYPES.has(taskType) ? taskType : fallback;
}

function normalizeSchedule(input = {}) {
  const schedule = input.schedule || {};
  const type = cleanText(schedule.type) || "manual_only";
  return {
    type,
    timezone: cleanText(schedule.timezone) || "local",
    dayOfWeek: cleanText(schedule.dayOfWeek || schedule.day_of_week),
    time: cleanText(schedule.time),
    intervalMinutes: positiveInteger(schedule.intervalMinutes ?? schedule.interval_minutes),
    intervalHours: positiveInteger(schedule.intervalHours ?? schedule.interval_hours),
    intervalDays: positiveInteger(schedule.intervalDays ?? schedule.interval_days),
    rrule: cleanText(schedule.rrule)
  };
}

function normalizeScope(input = {}) {
  const scope = input.scope || {};
  return {
    projectIds: Array.isArray(scope.projectIds || scope.project_ids) ? [...(scope.projectIds || scope.project_ids)] : [],
    noteIds: Array.isArray(scope.noteIds || scope.note_ids) ? [...(scope.noteIds || scope.note_ids)] : [],
    directoryIds: Array.isArray(scope.directoryIds || scope.directory_ids) ? [...(scope.directoryIds || scope.directory_ids)] : [],
    tags: Array.isArray(scope.tags) ? [...scope.tags] : [],
    sourceFeedIds: Array.isArray(scope.sourceFeedIds || scope.source_feed_ids) ? [...(scope.sourceFeedIds || scope.source_feed_ids)] : [],
    keywords: Array.isArray(scope.keywords) ? [...scope.keywords] : [],
    includePrivateNotes: scope.includePrivateNotes === true || scope.include_private_notes === true
  };
}

function normalizeModel(input = {}) {
  const model = input.model || {};
  return {
    userMode: cleanText(model.userMode || model.user_mode || input.userMode || input.user_mode) || "Auto",
    modelPack: cleanText(model.modelPack || model.model_pack || input.modelPack || input.model_pack),
    maxTier: cleanText(model.maxTier || model.max_tier) || "standard",
    allowStrongReasoning: model.allowStrongReasoning === true || model.allow_strong_reasoning === true
  };
}

function normalizeBudget(input = {}) {
  const budget = input.budget || {};
  return {
    maxRunsPerPeriod: positiveInteger(budget.maxRunsPerPeriod ?? budget.max_runs_per_period, 1),
    maxEstimatedCostPerRun: optionalNumber(budget.maxEstimatedCostPerRun ?? budget.max_estimated_cost_per_run),
    maxEstimatedCostPerPeriod: optionalNumber(budget.maxEstimatedCostPerPeriod ?? budget.max_estimated_cost_per_period),
    period: cleanText(budget.period) || "week",
    spentThisPeriod: Number(budget.spentThisPeriod ?? budget.spent_this_period ?? 0) || 0,
    runsThisPeriod: positiveInteger(budget.runsThisPeriod ?? budget.runs_this_period)
  };
}

function normalizePrivacy(input = {}) {
  const privacy = input.privacy || {};
  return {
    mode: cleanText(privacy.mode || input.privacyMode || input.privacy_mode) || "normal",
    allowCloudModels: privacy.allowCloudModels !== false && privacy.allow_cloud_models !== false,
    requireConfirmationForPrivateNotes:
      privacy.requireConfirmationForPrivateNotes !== false && privacy.require_confirmation_for_private_notes !== false
  };
}

function normalizeOutput(input = {}) {
  const output = input.output || {};
  return {
    destination: cleanText(output.destination) || "ai_inbox",
    artifactTypes: Array.isArray(output.artifactTypes || output.artifact_types)
      ? [...(output.artifactTypes || output.artifact_types)]
      : [],
    notifyUser: cleanText(output.notifyUser || output.notify_user) || "only_if_high_signal"
  };
}

function supportedScheduledTaskDestination(destination = "") {
  return cleanText(destination || "ai_inbox") === "ai_inbox";
}

function scheduleIntervalMs(schedule = {}) {
  if (schedule.intervalMinutes > 0) return schedule.intervalMinutes * 60_000;
  if (schedule.intervalHours > 0) return schedule.intervalHours * 60 * 60_000;
  if (schedule.intervalDays > 0) return schedule.intervalDays * 24 * 60 * 60_000;
  if (schedule.type === "daily") return 24 * 60 * 60_000;
  if (schedule.type === "weekly") return 7 * 24 * 60 * 60_000;
  if (schedule.type === "monthly") return 30 * 24 * 60 * 60_000;
  return 0;
}

function taskId(input = {}) {
  return cleanText(input.scheduledTaskId || input.scheduled_task_id || input.id);
}

function templateId(input = {}) {
  return cleanText(input.templateId || input.template_id || input.id);
}

function scheduledTaskSort(a, b) {
  return String(a.nextRunAt || "").localeCompare(String(b.nextRunAt || "")) || a.scheduledTaskId.localeCompare(b.scheduledTaskId);
}

function mergeTaskDefaults(base = {}, override = {}) {
  return {
    ...base,
    ...override,
    schedule: { ...(base.schedule || {}), ...(override.schedule || {}) },
    scope: { ...(base.scope || {}), ...(override.scope || {}) },
    model: { ...(base.model || {}), ...(override.model || {}) },
    budget: { ...(base.budget || {}), ...(override.budget || {}) },
    privacy: { ...(base.privacy || {}), ...(override.privacy || {}) },
    output: { ...(base.output || {}), ...(override.output || {}) },
    runInput: override.runInput || override.run_input || base.runInput || base.run_input || null
  };
}

function agentForScheduledTask(task = {}, input = {}) {
  const fallbackAgent = {
    agentId: task.agentId || "reflection_agent",
    agentVersion: "v1",
    defaultModelTier: task.model?.maxTier || "standard",
    requiredCapabilities: ["structured_output"]
  };

  try {
    const registry = input.agentRegistry || input.agent_registry || createAgentRegistry(input.agentDefinitions || input.agent_definitions);
    return registry.get(task.agentId);
  } catch {
    return fallbackAgent;
  }
}

function providerCandidateWithHealth(candidate = {}, providerHealthStore = null) {
  const descriptor = candidate.providerDescriptor || candidate.provider_descriptor || candidate.descriptor || candidate;
  const health = candidate.health || candidate.providerHealth || candidate.provider_health;
  if (health) return { ...descriptor, ...candidate, health };
  return providerHealthCandidateInput(descriptor, providerHealthStore);
}

function providerDescriptorForSelection(providerCandidates = [], providerId = "") {
  const selected = providerCandidates.find((candidate) => candidate.providerId === providerId || candidate.provider_id === providerId);
  if (!selected) return null;
  const { health, providerHealth, provider_health, descriptor, providerDescriptor, provider_descriptor, ...rest } = selected;
  return providerDescriptor || provider_descriptor || descriptor || rest;
}

function providerConfigFromStore(providerConfigStore = null, providerDescriptor = {}) {
  if (!providerConfigStore || typeof providerConfigStore.getProviderConfig !== "function") return null;
  const providerId = cleanText(providerDescriptor.providerId || providerDescriptor.provider_id);
  if (!providerId) return null;
  return providerConfigStore.getProviderConfig({ providerId });
}

function isDisabledProviderConfig(providerConfig = null) {
  return cleanText(providerConfig?.status || providerConfig?.status_text) === "disabled";
}

function scheduledProviderDescriptor(input = {}, task = {}) {
  const baseDescriptor = resolveProviderDescriptor({
    userMode: task.model?.userMode,
    modelPack: task.model?.modelPack,
    providerDescriptor: input.providerDescriptor || input.provider_descriptor,
    providerPreset: input.providerPreset || input.provider_preset,
    authMode: input.authMode || input.auth_mode,
    privacy: {
      defaultMode: task.privacy?.mode,
      allowCloud: task.privacy?.allowCloudModels !== false
    },
    fallbackPolicy: input.fallbackPolicy || input.fallback_policy
  });
  const explicitConfig = input.providerConfig || input.provider_config || null;
  const providerConfig = explicitConfig || providerConfigFromStore(input.providerConfigStore || input.provider_config_store, baseDescriptor);
  if (!providerConfig) return { providerDescriptor: baseDescriptor, providerConfig: null };

  const configSettings = providerConfigToSettingsInput(providerConfig);
  return {
    providerDescriptor: resolveProviderDescriptor({
      ...configSettings,
      providerDescriptor: configSettings.providerDescriptor,
      secretRef: input.secretRef || input.secret_ref || configSettings.secretRef
    }),
    providerConfig
  };
}

function matchesFilter(task = {}, filter = {}) {
  const workspaceId = cleanText(filter.workspaceId || filter.workspace_id);
  const userId = cleanText(filter.userId || filter.user_id);
  const status = cleanText(filter.status);
  const taskType = cleanText(filter.taskType || filter.task_type);

  if (workspaceId && task.workspaceId !== workspaceId) return false;
  if (userId && task.userId !== userId) return false;
  if (status && task.status !== status) return false;
  if (taskType && task.taskType !== taskType) return false;
  return true;
}

export function normalizeScheduledAgentTask(input = {}, existing = {}) {
  const now = nowIso();
  const id = taskId(input) || taskId(existing) || generatedId();
  const taskType = normalizeTaskType(input.taskType || input.task_type || existing.taskType || existing.task_type);
  return {
    scheduledTaskId: id,
    workspaceId: cleanText(input.workspaceId || input.workspace_id || existing.workspaceId || existing.workspace_id) || "local_workspace",
    userId: cleanText(input.userId || input.user_id || existing.userId || existing.user_id) || "local_user",
    name: cleanText(input.name || existing.name) || taskType.replaceAll("_", " "),
    status: normalizeStatus(input.status || existing.status),
    taskType,
    agentId:
      cleanText(input.agentId || input.agent_id || existing.agentId || existing.agent_id) ||
      defaultAgentIdForTaskType(taskType),
    schedule: normalizeSchedule({ schedule: input.schedule || existing.schedule || {} }),
    scope: normalizeScope({ scope: input.scope || existing.scope || {} }),
    model: normalizeModel({ model: input.model || existing.model || {}, ...input }),
    budget: normalizeBudget({ budget: input.budget || existing.budget || {} }),
    privacy: normalizePrivacy({ privacy: input.privacy || existing.privacy || {}, ...input }),
    output: normalizeOutput({ output: input.output || existing.output || {} }),
    runInput: clone(input.runInput || input.run_input || existing.runInput || existing.run_input || null),
    failureCount: positiveInteger(input.failureCount ?? input.failure_count ?? existing.failureCount ?? existing.failure_count),
    lastRunAt: cleanText(input.lastRunAt || input.last_run_at || existing.lastRunAt || existing.last_run_at),
    lastRunStatus: cleanText(input.lastRunStatus || input.last_run_status || existing.lastRunStatus || existing.last_run_status),
    lastRunReason: cleanText(input.lastRunReason || input.last_run_reason || existing.lastRunReason || existing.last_run_reason),
    lastAgentRunId: cleanText(input.lastAgentRunId || input.last_agent_run_id || existing.lastAgentRunId || existing.last_agent_run_id),
    nextRunAt: cleanText(input.nextRunAt || input.next_run_at || existing.nextRunAt || existing.next_run_at),
    createdAt: cleanText(existing.createdAt || existing.created_at || input.createdAt || input.created_at) || now,
    updatedAt: cleanText(input.updatedAt || input.updated_at) || now
  };
}

export function computeNextScheduledRunAt(task = {}, input = {}) {
  const schedule = normalizeSchedule(task);
  const fromDate = new Date(input.from || input.fromAt || input.from_at || nowIso());
  const intervalMs = scheduleIntervalMs(schedule);
  if (!intervalMs) return "";
  return new Date(fromDate.getTime() + intervalMs).toISOString();
}

export function listScheduledAgentTaskTemplates(filter = {}) {
  const ready = filter.implementationReady ?? filter.implementation_ready;
  return SCHEDULED_TASK_TEMPLATES.filter((template) => ready === undefined || template.implementationReady === (ready === true))
    .map((template) => clone(template));
}

export function getScheduledAgentTaskTemplate(id = "") {
  const found = SCHEDULED_TASK_TEMPLATES.find((template) => template.templateId === cleanText(id));
  return found ? clone(found) : null;
}

export function createScheduledTaskFromTemplate(input = {}, overrides = {}) {
  const options = typeof input === "string" ? { templateId: input, ...overrides } : { ...input };
  const template = getScheduledAgentTaskTemplate(templateId(options));
  if (!template) {
    const error = new Error(`scheduled task template not found: ${templateId(options)}`);
    error.code = "AI_SCHEDULED_TASK_TEMPLATE_NOT_FOUND";
    throw error;
  }

  const requestedStatus = cleanText(options.status);
  if (template.implementationReady !== true && requestedStatus === "active" && options.allowExperimental !== true && options.allow_experimental !== true) {
    const error = new Error(`scheduled task template is not implementation-ready: ${template.templateId}`);
    error.code = "AI_SCHEDULED_TASK_TEMPLATE_NOT_READY";
    throw error;
  }

  const task = normalizeScheduledAgentTask(
    mergeTaskDefaults(
      {
        ...template.task,
        name: template.name,
        status: requestedStatus || template.defaultStatus
      },
      options
    )
  );

  if (task.nextRunAt || task.status !== "active") return task;
  return normalizeScheduledAgentTask({
    ...task,
    nextRunAt: computeNextScheduledRunAt(task, { from: options.from || options.fromAt || options.from_at || options.now })
  });
}

export function preflightScheduledTaskProviderHealth(input = {}) {
  const task = normalizeScheduledAgentTask(input.task || input.scheduledTask || input.scheduled_task || {});
  const providerHealthStore = input.providerHealthStore || input.provider_health_store || null;
  const rawCandidates = Array.isArray(input.providerCandidates || input.provider_candidates)
    ? input.providerCandidates || input.provider_candidates
    : [];

  const agent = agentForScheduledTask(task, input);
  const { providerDescriptor, providerConfig } = scheduledProviderDescriptor(input, task);
  const route = resolveModelRoute({
    agent,
    contextPack: {
      privacy: {
        mode: task.privacy?.mode || "normal",
        cloudAllowed: task.privacy?.allowCloudModels !== false
      }
    },
    providerDescriptor,
    userMode: task.model?.userMode,
    modelPack: task.model?.modelPack,
    modelTier: task.model?.maxTier || agent.defaultModelTier,
    fallbackPolicy: input.fallbackPolicy || input.fallback_policy,
    requiredCapabilities: agent.requiredCapabilities || ["structured_output"]
  });

  if (isDisabledProviderConfig(providerConfig)) {
    return {
      status: "skipped",
      allowed: false,
      action: "skip_scheduled",
      fallbackUsed: false,
      reason: "provider_config_disabled",
      route,
      selection: null,
      summary: {
        action: "skip_scheduled",
        fallbackUsed: false,
        fallbackReason: "provider_config_disabled"
      },
      selectedProviderDescriptor: providerDescriptor,
      selectedModelRef: route.modelRef,
      providerConfigId: providerConfig?.id || ""
    };
  }

  if (!providerHealthStore && rawCandidates.length === 0 && !input.primaryProvider && !input.primary_provider) {
    return {
      status: "not_checked",
      allowed: true,
      action: "not_checked",
      fallbackUsed: false,
      reason: "provider_health_not_configured",
      route,
      selection: null,
      summary: {
        action: "not_checked",
        fallbackUsed: false,
        fallbackReason: "provider_health_not_configured"
      },
      selectedProviderDescriptor: providerDescriptor,
      selectedModelRef: route.modelRef,
      providerConfigId: providerConfig?.id || ""
    };
  }

  const primaryProvider = providerCandidateWithHealth(input.primaryProvider || input.primary_provider || providerDescriptor, providerHealthStore);
  const providerCandidates = rawCandidates.map((candidate) => providerCandidateWithHealth(candidate, providerHealthStore));
  const selection = selectProviderForRoute({
    route,
    primaryProvider,
    providerCandidates,
    trigger: "scheduled_task",
    fallbackPolicy: input.fallbackPolicy || input.fallback_policy
  });
  const summary = providerHealthSummary(selection);
  const blocked = selection.action === "skip_scheduled" || selection.action === "fail";
  const allCandidates = [primaryProvider, ...providerCandidates];

  return {
    status: blocked ? "skipped" : "allowed",
    allowed: !blocked,
    action: selection.action,
    fallbackUsed: selection.fallbackUsed === true,
    reason: summary.fallbackReason || "none",
    route,
    selection,
    summary,
    selectedProviderDescriptor: providerDescriptorForSelection(allCandidates, selection.selectedProviderId),
    selectedModelRef: selection.selectedModelRef,
    providerConfigId: providerConfig?.id || ""
  };
}

export function preflightScheduledTaskBudget(input = {}) {
  const task = normalizeScheduledAgentTask(input.task || input.scheduledTask || input.scheduled_task || {});
  const budget = task.budget || {};
  const estimatedCost = optionalNumber(input.estimatedCost ?? input.estimated_cost ?? input.plannedEstimatedCost ?? input.planned_estimated_cost);
  const reasons = [];

  if (budget.maxRunsPerPeriod > 0 && budget.runsThisPeriod >= budget.maxRunsPerPeriod) {
    reasons.push("scheduled_task_run_cap_exceeded");
  }

  if (budget.maxEstimatedCostPerPeriod !== null && budget.spentThisPeriod >= budget.maxEstimatedCostPerPeriod) {
    reasons.push("scheduled_task_budget_period_exceeded");
  }

  if (estimatedCost !== null && budget.maxEstimatedCostPerRun !== null && estimatedCost > budget.maxEstimatedCostPerRun) {
    reasons.push("scheduled_task_per_run_budget_exceeded");
  }

  if (
    estimatedCost !== null &&
    budget.maxEstimatedCostPerPeriod !== null &&
    budget.spentThisPeriod + estimatedCost > budget.maxEstimatedCostPerPeriod
  ) {
    reasons.push("scheduled_task_budget_period_exceeded");
  }

  return {
    status: reasons.length ? "skipped" : "allowed",
    allowed: reasons.length === 0,
    reason: reasons[0] || "none",
    reasons,
    budget: clone(budget),
    estimatedCost
  };
}

export function createInMemoryScheduledAgentTaskStore(options = {}) {
  const tasks = new Map();
  const initialTasks = Array.isArray(options.tasks) ? options.tasks : [];

  function getScheduledTask(id) {
    const task = tasks.get(cleanText(id));
    return task ? clone(task) : null;
  }

  function upsertScheduledTask(input = {}) {
    const id = taskId(input);
    const existing = id ? tasks.get(id) : null;
    const task = normalizeScheduledAgentTask(input, existing || {});
    tasks.set(task.scheduledTaskId, task);
    return getScheduledTask(task.scheduledTaskId);
  }

  for (const task of initialTasks) {
    upsertScheduledTask(task);
  }

  return {
    upsertScheduledTask,
    createScheduledTask: upsertScheduledTask,
    getScheduledTask,
    listScheduledTasks(filter = {}) {
      return [...tasks.values()]
        .filter((task) => matchesFilter(task, filter))
        .sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")) || a.scheduledTaskId.localeCompare(b.scheduledTaskId))
        .slice(0, normalizeLimit(filter.limit))
        .map(clone);
    },
    listDueScheduledTasks(filter = {}) {
      const now = cleanText(filter.now || filter.nowAt || filter.now_at) || nowIso();
      return [...tasks.values()]
        .filter((task) => task.status === "active")
        .filter((task) => task.nextRunAt && task.nextRunAt <= now)
        .filter((task) => matchesFilter(task, filter))
        .sort(scheduledTaskSort)
        .slice(0, normalizeLimit(filter.limit, 20))
        .map(clone);
    },
    updateScheduledTaskStatus(input = {}) {
      const id = taskId(input);
      const existing = tasks.get(id);
      if (!existing) return null;
      return upsertScheduledTask({ ...existing, status: normalizeStatus(input.status, existing.status) });
    },
    recordScheduledTaskRun(input = {}) {
      const id = taskId(input);
      const existing = tasks.get(id);
      if (!existing) return null;
      const status = cleanText(input.status) || "unknown";
      const finishedAt = cleanText(input.finishedAt || input.finished_at || input.now) || nowIso();
      const shouldCountRun = !["skipped", "requires_confirmation"].includes(status);
      return upsertScheduledTask({
        ...existing,
        lastRunAt: finishedAt,
        lastRunStatus: status,
        lastRunReason: cleanText(input.reason || input.lastRunReason || input.last_run_reason),
        lastAgentRunId: cleanText(input.agentRunId || input.agent_run_id),
        nextRunAt: cleanText(input.nextRunAt || input.next_run_at) || computeNextScheduledRunAt(existing, { from: finishedAt }),
        failureCount: status === "succeeded" ? 0 : status === "skipped" ? existing.failureCount : existing.failureCount + 1,
        status: cleanText(input.taskStatus || input.task_status) || existing.status,
        budget: {
          ...existing.budget,
          spentThisPeriod: Number((existing.budget.spentThisPeriod + Number(input.estimatedCost || input.estimated_cost || 0)).toFixed(8)),
          runsThisPeriod: existing.budget.runsThisPeriod + (shouldCountRun ? 1 : 0)
        }
      });
    },
    deleteScheduledTask(input = {}) {
      return tasks.delete(taskId(input));
    },
    close() {}
  };
}

export function buildScheduledTaskHarnessInput(task = {}, input = {}) {
  const overrideInput = input.runInput || input.run_input || {};
  const baseInput = task.runInput || {};
  const scope = task.scope || {};
  const keywords = Array.isArray(scope.keywords) ? scope.keywords.map(cleanText).filter(Boolean) : [];
  const noteIds = Array.isArray(scope.noteIds) ? scope.noteIds.map(cleanText).filter(Boolean) : [];
  const directoryIds = Array.isArray(scope.directoryIds) ? scope.directoryIds.map(cleanText).filter(Boolean) : [];
  const tags = Array.isArray(scope.tags) ? scope.tags.map((tag) => cleanText(tag).replace(/^#/, "")).filter(Boolean) : [];
  const outputArtifactTypes = task.output?.artifactTypes || [];
  const searchNotes =
    tags.length || keywords.length || directoryIds.length
      ? {
          ...(keywords.length ? { query: keywords.join(" ") } : {}),
          ...(tags.length ? { tag: tags } : {}),
          ...(directoryIds.length ? { rootDirectoryIds: directoryIds } : {}),
          limit: 10
        }
      : null;

  return {
    taskId: `scheduled_${task.scheduledTaskId}_${Date.now()}`,
    scheduledTaskId: task.scheduledTaskId,
    userId: task.userId,
    workspaceId: task.workspaceId,
    agentId: task.agentId,
    taskType: task.taskType,
    trigger: "scheduled_task",
    background: true,
    userMode: task.model?.userMode || "Auto",
    modelPack: task.model?.modelPack || undefined,
    modelTier: task.model?.maxTier || "standard",
    privacyMode: task.privacy?.mode || "normal",
    expectedArtifactType: outputArtifactTypes[0],
    timeoutMs: LOCAL_DISCOVERY_TASK_TYPES.has(task.taskType) ? DEFAULT_SCHEDULED_LOCAL_AI_TIMEOUT_MS : undefined,
    batchSize: LOCAL_DISCOVERY_TASK_TYPES.has(task.taskType) ? DEFAULT_SCHEDULED_LOCAL_AI_BATCH_SIZE : undefined,
    reviewOnly: true,
    progress: {
      status: "queued",
      label: LOCAL_DISCOVERY_TASK_TYPES.has(task.taskType) ? "Scanning notes for suggestions" : "Running scheduled AI task",
      retryable: true
    },
    budget: {
      maxEstimatedCostPerRun: task.budget?.maxEstimatedCostPerRun,
      scheduledTaskHardCap: task.budget?.maxEstimatedCostPerPeriod,
      scheduledTaskSpent: task.budget?.spentThisPeriod
    },
    ...(noteIds.length ? { noteIds } : {}),
    ...(!noteIds.length && searchNotes ? { searchNotes } : {}),
    ...(LOCAL_DISCOVERY_TASK_TYPES.has(task.taskType)
      ? {
          graphContext: {
            includeTags: true,
            includeOutgoingLinks: true,
            includeBacklinks: true,
            maxLinksPerNote: 12
          }
        }
      : {}),
    ...baseInput,
    ...overrideInput
  };
}

function skippedRunLog(input = {}) {
  const runLog = input.runLog || input.run_log || input.harness?.runLog;
  if (!runLog || typeof runLog.startRun !== "function") {
    return {
      status: "skipped",
      error: {
        errorType: input.errorType || "AI_SCHEDULED_TASK_SKIPPED",
        message: input.reason || "scheduled_task_skipped"
      }
    };
  }

  const task = normalizeScheduledAgentTask(input.task || {});
  const taskId = cleanText(input.taskId || input.task_id) || `scheduled_${task.scheduledTaskId}_${Date.now()}`;
  const reason = cleanText(input.reason) || "scheduled_task_skipped";
  const run = runLog.startRun({
    taskId,
    agentId: task.agentId,
    agentVersion: "v1",
    trigger: "scheduled_task",
    taskType: task.taskType,
    userMode: task.model?.userMode || "Auto",
    modelPack: task.model?.modelPack,
    privacyMode: task.privacy?.mode || "normal",
    modelTier: task.model?.maxTier || "standard"
  });

  runLog.addEvent(run.agentRunId, {
    eventType: "scheduled_task_preflight",
    status: "skipped",
    summary: {
      scheduledTaskId: task.scheduledTaskId,
      preflightType: input.preflightType || input.preflight_type || "unknown",
      reason,
      reasons: Array.isArray(input.reasons) ? [...input.reasons] : [reason],
      nextRunAt: cleanText(input.nextRunAt || input.next_run_at)
    },
    error: {
      errorType: input.errorType || "AI_SCHEDULED_TASK_SKIPPED",
      message: reason,
      retryable: false
    }
  });

  return runLog.finishRun(run.agentRunId, {
    status: "skipped",
    error: {
      errorType: input.errorType || "AI_SCHEDULED_TASK_SKIPPED",
      message: reason
    }
  });
}

export async function runScheduledAgentTask(input = {}) {
  const harness = input.harness;
  if (!harness || typeof harness.runTask !== "function") {
    const error = new Error("harness.runTask is required");
    error.code = "AI_SCHEDULED_TASK_HARNESS_REQUIRED";
    throw error;
  }

  const scheduledTaskStore = input.scheduledTaskStore || input.scheduled_task_store;
  const task = normalizeScheduledAgentTask(input.task || input.scheduledTask || input.scheduled_task || {});
  if (!supportedScheduledTaskDestination(task.output?.destination)) {
    const error = new Error(`scheduled task output destination is not implemented: ${task.output?.destination}`);
    error.code = "AI_SCHEDULED_TASK_DESTINATION_UNSUPPORTED";
    throw error;
  }
  const budgetPreflight =
    input.scheduledBudgetPreflight === false || input.scheduled_budget_preflight === false
      ? { status: "disabled", allowed: true, reason: "disabled", reasons: [] }
      : preflightScheduledTaskBudget({ ...input, task });
  if (budgetPreflight.allowed === false) {
    const nextRunAt = computeNextScheduledRunAt(task, { from: input.now || input.nowAt || input.now_at || nowIso() });
    const skippedRun = skippedRunLog({
      ...input,
      task,
      nextRunAt,
      preflightType: "budget",
      reason: budgetPreflight.reason,
      reasons: budgetPreflight.reasons,
      errorType: "AI_SCHEDULED_TASK_BUDGET_SKIPPED"
    });
    const record = scheduledTaskStore?.recordScheduledTaskRun?.({
      scheduledTaskId: task.scheduledTaskId,
      agentRunId: skippedRun.agentRunId,
      status: "skipped",
      finishedAt: input.now || nowIso(),
      nextRunAt,
      reason: budgetPreflight.reason,
      taskStatus: task.status
    });

    return {
      scheduledTask: record || task,
      harnessInput: null,
      result: {
        run: skippedRun,
        contextPack: null,
        artifacts: []
      },
      budgetPreflight,
      providerHealthPreflight: null,
      nextRunAt,
      status: "skipped"
    };
  }
  const providerHealthPreflight =
    input.providerHealthPreflight === false || input.provider_health_preflight === false
      ? { status: "disabled", allowed: true, action: "disabled", reason: "disabled" }
      : preflightScheduledTaskProviderHealth({ ...input, task });
  if (providerHealthPreflight.allowed === false) {
    const nextRunAt = computeNextScheduledRunAt(task, { from: input.now || input.nowAt || input.now_at || nowIso() });
    const skippedRun = skippedRunLog({
      ...input,
      task,
      nextRunAt,
      preflightType: "provider_health",
      reason: providerHealthPreflight.reason,
      reasons: [providerHealthPreflight.reason],
      errorType: "AI_SCHEDULED_TASK_PROVIDER_HEALTH_SKIPPED"
    });
    const record = scheduledTaskStore?.recordScheduledTaskRun?.({
      scheduledTaskId: task.scheduledTaskId,
      agentRunId: skippedRun.agentRunId,
      status: "skipped",
      finishedAt: input.now || nowIso(),
      nextRunAt,
      reason: providerHealthPreflight.reason,
      taskStatus: task.status
    });

    return {
      scheduledTask: record || task,
      harnessInput: null,
      result: {
        run: skippedRun,
        contextPack: null,
        artifacts: []
      },
      budgetPreflight,
      providerHealthPreflight,
      nextRunAt,
      status: "skipped"
    };
  }
  const buildInput = typeof input.buildInput === "function" ? input.buildInput : buildScheduledTaskHarnessInput;
  const harnessInput = {
    ...buildInput(task, input),
    ...(providerHealthPreflight.selectedProviderDescriptor ? { providerDescriptor: providerHealthPreflight.selectedProviderDescriptor } : {}),
    ...(providerHealthPreflight.selectedModelRef ? { modelRef: providerHealthPreflight.selectedModelRef } : {})
  };
  const result = await harness.runTask(harnessInput);
  const status = result.run?.status || "failed";
  const nextRunAt = computeNextScheduledRunAt(task, { from: input.now || input.nowAt || input.now_at || nowIso() });

  const record = scheduledTaskStore?.recordScheduledTaskRun?.({
    scheduledTaskId: task.scheduledTaskId,
    agentRunId: result.run?.agentRunId,
    status,
    finishedAt: input.now || nowIso(),
    nextRunAt,
    estimatedCost: result.run?.usage?.estimatedCost || result.run?.usage?.cost || 0,
    taskStatus: status === "failed" && task.failureCount >= 2 ? "failed" : task.status
  });

  return {
    scheduledTask: record || task,
    harnessInput,
    result,
    budgetPreflight,
    providerHealthPreflight,
    nextRunAt,
    status
  };
}

export async function runDueScheduledAgentTasks(input = {}) {
  const scheduledTaskStore = input.scheduledTaskStore || input.scheduled_task_store;
  if (!scheduledTaskStore || typeof scheduledTaskStore.listDueScheduledTasks !== "function") {
    const error = new Error("scheduledTaskStore.listDueScheduledTasks is required");
    error.code = "AI_SCHEDULED_TASK_STORE_REQUIRED";
    throw error;
  }

  const tasks = scheduledTaskStore.listDueScheduledTasks({
    now: input.now || input.nowAt || input.now_at,
    workspaceId: input.workspaceId || input.workspace_id,
    userId: input.userId || input.user_id,
    limit: input.limit
  });
  const runs = [];
  for (const task of tasks) {
    runs.push(await runScheduledAgentTask({ ...input, scheduledTaskStore, task }));
  }
  return {
    total: tasks.length,
    succeeded: runs.filter((run) => run.status === "succeeded").length,
    failed: runs.filter((run) => run.status === "failed").length,
    skipped: runs.filter((run) => run.status === "skipped").length,
    runs
  };
}

export function scheduledAgentTaskStatuses() {
  return [...TASK_STATUSES];
}

export function scheduledAgentTaskTypes() {
  return [...TASK_TYPES];
}
