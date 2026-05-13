import {
  normalizeScheduledTaskFilters,
  scheduledRunSummary,
  scheduledTaskAction,
  scheduledTaskBudgetSummary,
  scheduledTaskScheduleLabel,
  scheduledTasksSummary,
  scheduledTaskScopeSummary,
  scheduledTaskStatusLabel,
  scheduledTaskStatusOptions,
  scheduledTaskStatusTone,
  scheduledTaskTypeLabel,
  scheduledTaskTypeOptions
} from "./scheduled-tasks-model.js";

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function attr(value) {
  return escapeHtml(value ?? "");
}

function formatDate(value = "") {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  return date.toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function badge(text = "", tone = "") {
  const cleanTone = String(tone || "").trim();
  return `<span class="settings-stat-badge ${cleanTone ? escapeHtml(cleanTone) : ""}">${escapeHtml(text)}</span>`;
}

function renderControls(state = {}) {
  const filters = normalizeScheduledTaskFilters(state.filters || {});
  return `
    <div class="scheduled-task-toolbar">
      <label>
        <span>Status</span>
        <select id="scheduledTaskStatusFilter">
          ${scheduledTaskStatusOptions()
            .map((option) => `<option value="${attr(option.value)}" ${option.value === filters.status ? "selected" : ""}>${escapeHtml(option.label)}</option>`)
            .join("")}
        </select>
      </label>
      <label>
        <span>Type</span>
        <select id="scheduledTaskTypeFilter">
          ${scheduledTaskTypeOptions()
            .map((option) => `<option value="${attr(option.value)}" ${option.value === filters.taskType ? "selected" : ""}>${escapeHtml(option.label)}</option>`)
            .join("")}
        </select>
      </label>
      <button class="mini-btn" id="btnScheduledTasksApplyFilters" type="button">Apply</button>
      <button class="mini-btn" id="btnScheduledTasksRefresh" type="button">Refresh</button>
      <button class="mini-btn primary" id="btnScheduledTasksRunDue" type="button" ${state.actionLoading ? "disabled" : ""}>Run due now</button>
    </div>
  `;
}

function renderRunSummary(runSummary = null) {
  if (!runSummary) return "";
  const summary = scheduledRunSummary(runSummary);
  return `
    <div class="scheduled-task-run-summary">
      ${badge(`${summary.total} due`, "warn")}
      ${badge(`${summary.succeeded} succeeded`, "ok")}
      ${badge(`${summary.skipped} skipped`, "muted")}
      ${badge(`${summary.failed} failed`, summary.failed ? "bad" : "muted")}
    </div>
  `;
}

function renderTask(task = {}, actionLoading = false) {
  const id = String(task.scheduledTaskId || "").trim();
  const action = scheduledTaskAction(task);
  const nextRun = formatDate(task.nextRunAt);
  const lastRun = formatDate(task.lastRunAt);
  const tone = scheduledTaskStatusTone(task.status);
  return `
    <article class="scheduled-task-row" data-scheduled-task-id="${attr(id)}">
      <div class="scheduled-task-main">
        <div>
          <strong>${escapeHtml(task.name || id || "Scheduled task")}</strong>
          <p>${escapeHtml(scheduledTaskTypeLabel(task.taskType))} / ${escapeHtml(task.agentId || "agent")}</p>
        </div>
        ${badge(scheduledTaskStatusLabel(task.status), tone)}
      </div>
      <div class="scheduled-task-meta">
        <span>Schedule: ${escapeHtml(scheduledTaskScheduleLabel(task.schedule || {}))}</span>
        <span>Scope: ${escapeHtml(scheduledTaskScopeSummary(task.scope || {}))}</span>
        <span>Budget: ${escapeHtml(scheduledTaskBudgetSummary(task.budget || {}))}</span>
        <span>Next: ${escapeHtml(nextRun || task.nextRunAt || "not scheduled")}</span>
        <span>Last: ${escapeHtml(lastRun || task.lastRunAt || "never")}${task.lastRunStatus ? ` / ${escapeHtml(task.lastRunStatus)}` : ""}</span>
        ${task.lastRunReason ? `<span>Reason: ${escapeHtml(task.lastRunReason)}</span>` : ""}
        ${task.lastAgentRunId ? `<span>Run: ${escapeHtml(task.lastAgentRunId)}</span>` : ""}
      </div>
      ${
        action.nextStatus
          ? `
            <div class="scheduled-task-actions">
              <button
                class="mini-btn"
                type="button"
                data-scheduled-task-status="${attr(action.nextStatus)}"
                data-scheduled-task-id="${attr(id)}"
                ${actionLoading ? "disabled" : ""}
              >
                ${escapeHtml(action.label)}
              </button>
            </div>
          `
          : ""
      }
    </article>
  `;
}

function renderList(state = {}) {
  const items = Array.isArray(state.items) ? state.items : [];
  if (state.loading) return `<div class="scheduled-task-empty">Loading scheduled tasks...</div>`;
  if (state.error) return `<div class="scheduled-task-empty is-bad">Scheduled tasks failed to load: ${escapeHtml(state.error)}</div>`;
  if (!items.length) return `<div class="scheduled-task-empty">No scheduled tasks match these filters.</div>`;
  return `<div class="scheduled-task-list">${items.map((item) => renderTask(item, state.actionLoading)).join("")}</div>`;
}

export function renderScheduledTasksPanel(state = {}) {
  const summary = scheduledTasksSummary({ items: state.items, total: state.total });
  return `
    <div class="scheduled-task-panel">
      <div class="scheduled-task-head">
        <div>
          <div class="settings-card-title">Scheduled agent tasks</div>
          <div class="settings-card-note">Manual controls for due agent runs. Outputs remain AI Inbox artifacts until reviewed.</div>
        </div>
        <div class="settings-stat-row">
          ${badge(`${summary.visible}/${summary.total} visible`, "muted")}
          ${badge(`${summary.counts.active || 0} active`, "ok")}
          ${badge(`${summary.counts.paused || 0} paused`, "warn")}
          ${summary.counts.failed ? badge(`${summary.counts.failed} failed`, "bad") : ""}
        </div>
      </div>
      ${renderControls(state)}
      ${renderRunSummary(state.runSummary)}
      ${renderList(state)}
    </div>
  `;
}
