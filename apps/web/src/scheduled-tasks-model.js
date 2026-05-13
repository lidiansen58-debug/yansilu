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
  const projectIds = Array.isArray(scope.projectIds || scope.project_ids) ? (scope.projectIds || scope.project_ids) : [];
  const keywords = Array.isArray(scope.keywords) ? scope.keywords : [];
  if (noteIds.length) parts.push(`${noteIds.length} notes`);
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
