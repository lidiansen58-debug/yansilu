const STATUS_VALUES = ["all", "active", "paused", "disabled", "failed"];
const TASK_TYPE_VALUES = [
  "all",
  "relation_scan",
  "reflection_prompt",
  "research_scan",
  "source_monitor",
  "project_digest",
  "originality_check"
];

function cleanText(value) {
  return String(value || "").trim();
}

function normalizeCount(value) {
  const number = Number(value || 0);
  return Number.isFinite(number) ? Math.max(0, Math.floor(number)) : 0;
}

function normalizeLimit(value, fallback = 50) {
  const number = Number(value || fallback);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(1, Math.min(100, Math.floor(number)));
}

function splitList(value) {
  if (Array.isArray(value)) return value.map(cleanText).filter(Boolean);
  return String(value || "")
    .split(/[\n,]+/)
    .map(cleanText)
    .filter(Boolean);
}

export function scheduledTaskStatusOptions() {
  return [
    { value: "all", label: "All statuses" },
    { value: "active", label: "Active" },
    { value: "paused", label: "Paused" },
    { value: "disabled", label: "Disabled" },
    { value: "failed", label: "Failed" }
  ];
}

export function scheduledTaskTypeOptions() {
  return [
    { value: "all", label: "All task types" },
    { value: "relation_scan", label: "Relation scans" },
    { value: "reflection_prompt", label: "Reflection prompts" },
    { value: "research_scan", label: "Research scans" },
    { value: "source_monitor", label: "Source monitors" },
    { value: "project_digest", label: "Project digests" },
    { value: "originality_check", label: "Originality checks" }
  ];
}

export function scheduledTaskTemplateOptions(templates = []) {
  const list = Array.isArray(templates) ? templates : [];
  return list
    .filter((template) => template?.implementationReady === true)
    .map((template) => ({
      value: cleanText(template.templateId),
      label: cleanText(template.name) || cleanText(template.templateId),
      taskType: cleanText(template.task?.taskType || template.task_type),
      agentId: cleanText(template.task?.agentId || template.agent_id),
      description: cleanText(template.description)
    }))
    .filter((template) => template.value);
}

export function normalizeScheduledTaskFilters(filters = {}) {
  const status = STATUS_VALUES.includes(cleanText(filters.status)) ? cleanText(filters.status) : "all";
  const taskType = TASK_TYPE_VALUES.includes(cleanText(filters.taskType || filters.task_type))
    ? cleanText(filters.taskType || filters.task_type)
    : "all";
  const limit = normalizeLimit(filters.limit, 50);
  return { status, taskType, limit };
}

export function scheduledTaskStatusLabel(status = "") {
  const labels = {
    active: "Active",
    paused: "Paused",
    disabled: "Disabled",
    failed: "Failed"
  };
  return labels[cleanText(status)] || cleanText(status) || "Unknown";
}

export function scheduledTaskStatusTone(status = "") {
  const value = cleanText(status);
  if (value === "active") return "ok";
  if (value === "paused") return "warn";
  if (value === "disabled") return "muted";
  if (value === "failed") return "bad";
  return "";
}

export function scheduledTaskTypeLabel(taskType = "") {
  const option = scheduledTaskTypeOptions().find((item) => item.value === cleanText(taskType));
  return option && option.value !== "all" ? option.label : cleanText(taskType) || "Task";
}

export function scheduledTaskAction(task = {}) {
  const status = cleanText(task.status);
  if (status === "active") return { nextStatus: "paused", label: "Pause" };
  if (["paused", "disabled", "failed"].includes(status)) return { nextStatus: "active", label: "Resume" };
  return { nextStatus: "", label: "" };
}

export function scheduledTaskScheduleLabel(schedule = {}) {
  const type = cleanText(schedule.type) || "manual_only";
  if (schedule.intervalMinutes) return `Every ${normalizeCount(schedule.intervalMinutes)} min`;
  if (schedule.intervalHours) return `Every ${normalizeCount(schedule.intervalHours)} hr`;
  if (schedule.intervalDays) return `Every ${normalizeCount(schedule.intervalDays)} day`;
  if (type === "weekly") {
    const day = cleanText(schedule.dayOfWeek || schedule.day_of_week) || "weekly";
    const time = cleanText(schedule.time);
    return `${day}${time ? ` ${time}` : ""}`;
  }
  if (type === "daily") return cleanText(schedule.time) ? `Daily ${schedule.time}` : "Daily";
  return type.replaceAll("_", " ");
}

export function scheduledTaskScopeSummary(scope = {}) {
  const parts = [];
  const noteIds = Array.isArray(scope.noteIds || scope.note_ids) ? (scope.noteIds || scope.note_ids) : [];
  const directoryIds = Array.isArray(scope.directoryIds || scope.directory_ids) ? (scope.directoryIds || scope.directory_ids) : [];
  const tags = Array.isArray(scope.tags) ? scope.tags : [];
  const projectIds = Array.isArray(scope.projectIds || scope.project_ids) ? (scope.projectIds || scope.project_ids) : [];
  const keywords = Array.isArray(scope.keywords) ? scope.keywords : [];
  if (noteIds.length) parts.push(`${noteIds.length} notes`);
  if (directoryIds.length) parts.push(`${directoryIds.length} directories`);
  if (tags.length) parts.push(`${tags.length} tags`);
  if (projectIds.length) parts.push(`${projectIds.length} projects`);
  if (keywords.length) parts.push(`${keywords.length} keywords`);
  if (scope.includePrivateNotes || scope.include_private_notes) parts.push("private included");
  return parts.join(" / ") || "No scope";
}

export function scheduledTaskBudgetSummary(budget = {}) {
  const maxRuns = normalizeCount(budget.maxRunsPerPeriod ?? budget.max_runs_per_period);
  const runs = normalizeCount(budget.runsThisPeriod ?? budget.runs_this_period);
  const period = cleanText(budget.period) || "period";
  const cost = budget.maxEstimatedCostPerPeriod ?? budget.max_estimated_cost_per_period;
  const runPart = maxRuns ? `${runs}/${maxRuns} runs per ${period}` : `${runs} runs this ${period}`;
  return cost === null || cost === undefined || cost === "" ? runPart : `${runPart}, cap ${cost}`;
}

export function scheduledTasksSummary({ items = [], total = 0 } = {}) {
  const list = Array.isArray(items) ? items : [];
  const counts = list.reduce(
    (acc, task) => {
      const key = cleanText(task.status) || "unknown";
      acc[key] = normalizeCount(acc[key]) + 1;
      return acc;
    },
    { active: 0, paused: 0, disabled: 0, failed: 0 }
  );
  return {
    visible: list.length,
    total: normalizeCount(total || list.length),
    counts
  };
}

export function scheduledRunSummary(summary = {}) {
  return {
    total: normalizeCount(summary.total),
    succeeded: normalizeCount(summary.succeeded),
    skipped: normalizeCount(summary.skipped),
    failed: normalizeCount(summary.failed)
  };
}

export function scheduledTaskFormDefaults({ templates = [], currentNoteId = "", currentDirectoryId = "" } = {}) {
  const templateOptions = scheduledTaskTemplateOptions(templates);
  const templateId = templateOptions[0]?.value || "reflection_reminder";
  return {
    scheduledTaskId: "",
    templateId,
    name: templateOptions[0]?.label || "Reflection reminder",
    status: "paused",
    scheduleType: "weekly",
    dayOfWeek: "friday",
    time: "16:00",
    intervalMinutes: 30,
    noteIdsText: cleanText(currentNoteId),
    directoryIdsText: currentNoteId ? "" : cleanText(currentDirectoryId),
    tagsText: "",
    keywordsText: "",
    includePrivateNotes: false
  };
}

export function scheduledTaskFormFromTask(task = {}) {
  const schedule = task.schedule || {};
  const scope = task.scope || {};
  return {
    scheduledTaskId: cleanText(task.scheduledTaskId),
    templateId: task.taskType === "relation_scan" ? "weekly_link_suggestions" : "reflection_reminder",
    name: cleanText(task.name),
    status: cleanText(task.status) || "paused",
    scheduleType: cleanText(schedule.type) || "weekly",
    dayOfWeek: cleanText(schedule.dayOfWeek || schedule.day_of_week) || "monday",
    time: cleanText(schedule.time) || "09:00",
    intervalMinutes: normalizeCount(schedule.intervalMinutes ?? schedule.interval_minutes) || 30,
    noteIdsText: (scope.noteIds || scope.note_ids || []).join(", "),
    directoryIdsText: (scope.directoryIds || scope.directory_ids || []).join(", "),
    tagsText: (scope.tags || []).join(", "),
    keywordsText: (scope.keywords || []).join(", "),
    includePrivateNotes: scope.includePrivateNotes === true || scope.include_private_notes === true
  };
}

export function scheduledTaskPayloadFromForm(form = {}) {
  const scheduleType = cleanText(form.scheduleType) || "weekly";
  const schedule = {
    type: scheduleType,
    timezone: "local"
  };
  if (scheduleType === "interval") {
    schedule.intervalMinutes = Math.max(5, normalizeCount(form.intervalMinutes || 30));
  } else if (scheduleType === "weekly") {
    schedule.dayOfWeek = cleanText(form.dayOfWeek) || "monday";
    schedule.time = cleanText(form.time) || "09:00";
  }

  return {
    ...(cleanText(form.scheduledTaskId) ? { scheduledTaskId: cleanText(form.scheduledTaskId) } : {}),
    templateId: cleanText(form.templateId) || "reflection_reminder",
    name: cleanText(form.name) || "Scheduled agent task",
    status: cleanText(form.status) || "paused",
    schedule,
    scope: {
      noteIds: splitList(form.noteIdsText),
      directoryIds: splitList(form.directoryIdsText),
      tags: splitList(form.tagsText).map((tag) => tag.replace(/^#/, "")),
      keywords: splitList(form.keywordsText),
      includePrivateNotes: form.includePrivateNotes === true
    }
  };
}
