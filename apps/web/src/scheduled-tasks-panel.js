import {
  normalizeScheduledTaskFilters,
  scheduledRunSummary,
  scheduledTaskAction,
  scheduledTaskBudgetSummary,
  scheduledTaskFormDefaults,
  scheduledTaskScheduleLabel,
  scheduledTasksSummary,
  scheduledTaskScopeSummary,
  scheduledTaskStatusLabel,
  scheduledTaskStatusOptions,
  scheduledTaskStatusTone,
  scheduledTaskTemplateOptions,
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
        <span>状态</span>
        <select id="scheduledTaskStatusFilter">
          ${scheduledTaskStatusOptions()
            .map((option) => `<option value="${attr(option.value)}" ${option.value === filters.status ? "selected" : ""}>${escapeHtml(option.label)}</option>`)
            .join("")}
        </select>
      </label>
      <label>
        <span>类型</span>
        <select id="scheduledTaskTypeFilter">
          ${scheduledTaskTypeOptions()
            .map((option) => `<option value="${attr(option.value)}" ${option.value === filters.taskType ? "selected" : ""}>${escapeHtml(option.label)}</option>`)
            .join("")}
        </select>
      </label>
      <button class="mini-btn" id="btnScheduledTasksApplyFilters" type="button">筛选</button>
      <button class="mini-btn" id="btnScheduledTasksRefresh" type="button">刷新</button>
      <button class="mini-btn primary" id="btnScheduledTasksRunDue" type="button" ${state.actionLoading ? "disabled" : ""}>立即整理到期内容</button>
    </div>
  `;
}

function renderTaskForm(state = {}) {
  const templates = scheduledTaskTemplateOptions(state.templates || []);
  const fallbackForm = scheduledTaskFormDefaults({
    templates: state.templates || [],
    currentNoteId: state.currentNoteId || "",
    currentDirectoryId: state.currentDirectoryId || ""
  });
  const form = { ...fallbackForm, ...(state.form || {}) };
  const editing = Boolean(String(form.scheduledTaskId || "").trim());
  const showHead = !state.compact || editing || state.templatesLoading || state.templatesError;
  return `
    <form class="scheduled-task-form" id="scheduledTaskForm">
      ${showHead ? `
        <div class="scheduled-task-form-head">
          <div>
            <div class="settings-card-title">${editing ? "编辑整理规则" : "新建整理规则"}</div>
            <div class="settings-card-note">整理结果会先进入待处理内容，确认后才会写入笔记。</div>
          </div>
          <div class="settings-stat-row">
            ${editing ? badge(`编辑中 ${form.scheduledTaskId}`, "warn") : badge("草稿", "muted")}
            ${state.templatesLoading ? badge("模板加载中", "warn") : ""}
            ${state.templatesError ? badge("模板加载失败", "bad") : ""}
          </div>
        </div>
      ` : ""}
      <div class="scheduled-task-form-grid">
        <label>
          <span>模板</span>
          <select id="scheduledTaskTemplateSelect" ${editing ? "disabled" : ""}>
            ${templates
              .map((template) => `<option value="${attr(template.value)}" ${template.value === form.templateId ? "selected" : ""}>${escapeHtml(template.label)}</option>`)
              .join("")}
          </select>
        </label>
        <label>
          <span>规则名称</span>
          <input id="scheduledTaskNameInput" value="${attr(form.name)}" placeholder="每周关系建议" />
        </label>
        <label>
          <span>状态</span>
          <select id="scheduledTaskStatusSelect">
            <option value="paused" ${form.status === "paused" ? "selected" : ""}>暂停</option>
            <option value="active" ${form.status === "active" ? "selected" : ""}>启用</option>
          </select>
        </label>
        <label>
          <span>整理时间</span>
          <select id="scheduledTaskScheduleTypeSelect">
            <option value="weekly" ${form.scheduleType === "weekly" ? "selected" : ""}>每周</option>
            <option value="interval" ${form.scheduleType === "interval" ? "selected" : ""}>间隔</option>
            <option value="manual_only" ${form.scheduleType === "manual_only" ? "selected" : ""}>仅手动</option>
          </select>
        </label>
        <label>
          <span>星期</span>
          <select id="scheduledTaskDaySelect">
            ${[
              ["monday", "周一"],
              ["tuesday", "周二"],
              ["wednesday", "周三"],
              ["thursday", "周四"],
              ["friday", "周五"],
              ["saturday", "周六"],
              ["sunday", "周日"]
            ]
              .map(([day, label]) => `<option value="${day}" ${day === form.dayOfWeek ? "selected" : ""}>${label}</option>`)
              .join("")}
          </select>
        </label>
        <label>
          <span>时间</span>
          <input id="scheduledTaskTimeInput" type="time" value="${attr(form.time)}" />
        </label>
        <label>
          <span>间隔时间</span>
          <input id="scheduledTaskIntervalInput" type="number" min="5" step="5" value="${attr(form.intervalMinutes)}" />
      </label>
      <label>
          <span>指定笔记编号</span>
          <input id="scheduledTaskNoteIdsInput" value="${attr(form.noteIdsText)}" placeholder="note_1, note_2" />
      </label>
      <label>
          <span>指定目录编号</span>
          <input id="scheduledTaskDirectoryIdsInput" value="${attr(form.directoryIdsText)}" placeholder="dir_original_default" />
      </label>
        <label>
          <span>标签</span>
          <input id="scheduledTaskTagsInput" value="${attr(form.tagsText)}" placeholder="writing, source-gap" />
        </label>
        <label>
          <span>关键词</span>
          <input id="scheduledTaskKeywordsInput" value="${attr(form.keywordsText)}" placeholder="bridge concept" />
        </label>
        <label class="scheduled-task-checkbox">
          <input id="scheduledTaskIncludePrivateInput" type="checkbox" ${form.includePrivateNotes ? "checked" : ""} />
          <span>包含私密笔记</span>
        </label>
      </div>
      <div class="scheduled-task-form-actions">
        <button class="mini-btn is-ghost" id="btnScheduledTaskUseCurrentNote" type="button" ${state.currentNoteId ? "" : "disabled"}>使用当前笔记</button>
        <button class="mini-btn is-ghost" id="btnScheduledTaskUseCurrentDirectory" type="button" ${state.currentDirectoryId ? "" : "disabled"}>使用当前目录</button>
        <button class="mini-btn" id="btnScheduledTaskClearForm" type="button">新规则</button>
        <button class="mini-btn primary" id="btnScheduledTaskSave" type="button" ${state.actionLoading || !templates.length ? "disabled" : ""}>
          ${editing ? "保存规则" : "创建规则"}
        </button>
      </div>
    </form>
  `;
}

function renderRunSummary(runSummary = null) {
  if (!runSummary) return "";
  const summary = scheduledRunSummary(runSummary);
  return `
    <div class="scheduled-task-run-summary">
      ${badge(`${summary.total} 条到期`, "warn")}
      ${badge(`${summary.succeeded} 条成功`, "ok")}
      ${badge(`${summary.skipped} 条跳过`, "muted")}
      ${badge(`${summary.failed} 条失败`, summary.failed ? "bad" : "muted")}
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
          <strong>${escapeHtml(task.name || id || "整理规则")}</strong>
          <p>${escapeHtml(scheduledTaskTypeLabel(task.taskType))}</p>
        </div>
        ${badge(scheduledTaskStatusLabel(task.status), tone)}
      </div>
      <div class="scheduled-task-meta">
        <span>频率：${escapeHtml(scheduledTaskScheduleLabel(task.schedule || {}))}</span>
        <span>范围：${escapeHtml(scheduledTaskScopeSummary(task.scope || {}))}</span>
        <span>用量：${escapeHtml(scheduledTaskBudgetSummary(task.budget || {}))}</span>
        <span>下次：${escapeHtml(nextRun || task.nextRunAt || "未安排")}</span>
        <span>上次：${escapeHtml(lastRun || task.lastRunAt || "从未运行")}${task.lastRunStatus ? ` / ${escapeHtml(task.lastRunStatus)}` : ""}</span>
        ${task.lastRunReason ? `<span>原因：${escapeHtml(task.lastRunReason)}</span>` : ""}
      </div>
      ${
        action.nextStatus
          ? `
            <div class="scheduled-task-actions">
              <button
                class="mini-btn is-ghost"
                type="button"
                data-scheduled-task-edit="${attr(id)}"
                ${actionLoading ? "disabled" : ""}
              >
                编辑
              </button>
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
  if (state.loading) return `<div class="scheduled-task-empty">正在加载整理规则...</div>`;
  if (state.error) return `<div class="scheduled-task-empty is-bad">整理规则加载失败：${escapeHtml(state.error)}</div>`;
  if (!items.length) return `<div class="scheduled-task-empty">${state.compact ? "还没有整理规则。" : "没有符合这些筛选条件的整理规则。"}</div>`;
  return `<div class="scheduled-task-list">${items.map((item) => renderTask(item, state.actionLoading)).join("")}</div>`;
}

function renderTaskFormSlot(state = {}) {
  const form = renderTaskForm(state);
  if (!state.compact) return form;
  const openAttr = state.formOpen ? " open" : "";
  const editing = Boolean(String(state.form?.scheduledTaskId || "").trim());
  return `
    <details class="scheduled-task-form-details"${openAttr}>
      <summary>${editing ? "编辑整理规则" : "新建整理规则"}</summary>
      ${form}
    </details>
  `;
}

export function renderScheduledTasksPanel(state = {}) {
  const summary = scheduledTasksSummary({ items: state.items, total: state.total });
  const filters = normalizeScheduledTaskFilters(state.filters || {});
  const hasActiveFilters = filters.status !== "all" || filters.taskType !== "all";
  const emptyCompact = state.compact && !state.loading && !state.error && !(Array.isArray(state.items) && state.items.length);
  return `
    <div class="scheduled-task-panel ${state.compact ? "is-compact" : ""}">
      ${state.compact ? "" : `
        <div class="scheduled-task-head">
          <div>
            <div class="settings-card-title">整理规则</div>
            <div class="settings-card-note">定时或手动整理内容；你确认后才会写入笔记。</div>
          </div>
          <div class="settings-stat-row">
            ${badge(`${summary.visible}/${summary.total} 可见`, "muted")}
            ${badge(`${summary.counts.active || 0} 启用`, "ok")}
            ${badge(`${summary.counts.paused || 0} 暂停`, "warn")}
            ${summary.counts.failed ? badge(`${summary.counts.failed} 失败`, "bad") : ""}
          </div>
        </div>
      `}
      ${emptyCompact && !hasActiveFilters ? "" : renderControls(state)}
      ${renderTaskFormSlot(state)}
      ${renderRunSummary(state.runSummary)}
      ${renderList(state)}
    </div>
  `;
}
