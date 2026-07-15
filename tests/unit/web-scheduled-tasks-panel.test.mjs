import test from "node:test";
import assert from "node:assert/strict";

import { renderScheduledTasksPanel } from "../../apps/web/src/scheduled-tasks-panel.js";

const task = {
  scheduledTaskId: "sched_reflection",
  name: "提醒我回看",
  status: "active",
  taskType: "reflection_prompt",
  agentId: "reflection_agent",
  schedule: { type: "interval", intervalMinutes: 30 },
  scope: { noteIds: ["note_1"] },
  budget: { maxRunsPerPeriod: 3, runsThisPeriod: 1, maxEstimatedCostPerPeriod: 2, period: "week" },
  nextRunAt: "2026-05-13T11:00:00.000Z",
  lastRunAt: "2026-05-13T10:00:00.000Z",
  lastRunStatus: "succeeded",
  lastAgentRunId: "run_1"
};

test("scheduled tasks panel renders filters, summaries, and pause action", () => {
  const html = renderScheduledTasksPanel({
    items: [task],
    total: 1,
    templates: [{ templateId: "reflection_reminder", name: "提醒我回看", implementationReady: true }],
    form: { templateId: "reflection_reminder", name: "提醒我回看", status: "paused", scheduleType: "daily", time: "16:00" },
    currentNoteId: "note_1",
    currentNoteLabel: "Inbox review target",
    currentDirectoryId: "dir_original_default",
    currentDirectoryLabel: "永久笔记",
    filters: { status: "active", taskType: "reflection_prompt" },
    runSummary: { total: 1, succeeded: 1, skipped: 0, failed: 0 }
  });

  assert.match(html, /整理规则/);
  assert.match(html, /你确认后才会写入笔记/);
  assert.match(html, /id="scheduledTaskStatusFilter"/);
  assert.match(html, /id="scheduledTaskTypeFilter"/);
  assert.match(html, /id="btnScheduledTasksRunDue"/);
  assert.match(html, /id="scheduledTaskForm"/);
  assert.match(html, /id="scheduledTaskTemplateSelect"/);
  assert.match(html, /整理类型/);
  assert.match(html, /决定这条规则要做什么；结果会先放到待处理。/);
  assert.doesNotMatch(html, />模板</);
  assert.match(html, /id="btnScheduledTaskSave"/);
  assert.match(html, /id="btnScheduledTaskUseCurrentNote"/);
  assert.match(html, /只整理这些笔记/);
  assert.match(html, /当前笔记：Inbox review target/);
  assert.match(html, /value="note_1"/);
  assert.match(html, /默认不限制；可点下方选择当前笔记/);
  assert.match(html, /#写作, #素材缺口/);
  assert.match(html, /关系、概念、证据/);
  assert.doesNotMatch(html, /placeholder="note_1, note_2"/);
  assert.doesNotMatch(html, /placeholder="dir_original_default"/);
  assert.match(html, /提醒我回看/);
  assert.match(html, /<option value="daily" selected>每天<\/option>/);
  assert.match(html, /每 30 分钟/);
  assert.match(html, /1 条笔记/);
  assert.match(html, /1\/3 次 \/ week，上限 2/);
  assert.match(html, /data-scheduled-task-id="sched_reflection"/);
  assert.match(html, /data-scheduled-task-edit="sched_reflection"/);
  assert.match(html, /data-scheduled-task-status="paused"/);
  assert.match(html, /1 条成功/);
});

test("scheduled tasks panel renders resume action and empty states", () => {
  const pausedHtml = renderScheduledTasksPanel({
    items: [{ ...task, status: "paused" }],
    total: 1
  });
  assert.match(pausedHtml, /data-scheduled-task-status="active"/);
  assert.match(pausedHtml, /恢复启用/);

  assert.match(renderScheduledTasksPanel({ loading: true }), /正在加载整理规则/);
  assert.match(renderScheduledTasksPanel({ error: "boom" }), /整理规则加载失败：boom/);
  assert.match(renderScheduledTasksPanel({ items: [], total: 0 }), /没有符合这些筛选条件的整理规则/);
});

test("scheduled task form hides internal note and directory ids from visible scope fields", () => {
  const html = renderScheduledTasksPanel({
    items: [],
    total: 0,
    templates: [{ templateId: "weekly_link_suggestions", name: "Weekly link suggestions", implementationReady: true }],
    form: {
      templateId: "weekly_link_suggestions",
      name: "Relation scan",
      status: "paused",
      noteIdsText: "note_1, note_2",
      directoryIdsText: "dir_original_default"
    }
  });

  assert.match(html, /value="已选择 2 条笔记"/);
  assert.match(html, /value="已选择 1 个目录"/);
  assert.match(html, /id="scheduledTaskNoteIdsInput" type="hidden" value="note_1, note_2"/);
  assert.match(html, /id="scheduledTaskDirectoryIdsInput" type="hidden" value="dir_original_default"/);
  assert.doesNotMatch(html, /指定笔记编号/);
  assert.doesNotMatch(html, /指定目录编号/);
});

test("scheduled task form uses sorting type wording while loading options", () => {
  const html = renderScheduledTasksPanel({
    items: [],
    total: 0,
    templates: [],
    templatesLoading: true,
    templatesError: "boom"
  });

  assert.match(html, /整理类型加载中/);
  assert.match(html, /整理类型加载失败/);
  assert.doesNotMatch(html, /模板加载/);
});

test("scheduled tasks panel can collapse creation form in compact mode", () => {
  const html = renderScheduledTasksPanel({
    items: [],
    total: 0,
    compact: true
  });

  assert.match(html, /<details class="scheduled-task-form-details">/);
  assert.match(html, /新建整理规则/);
  assert.match(html, /还没有整理规则/);
  assert.doesNotMatch(html, /0\/0 可见/);
  assert.doesNotMatch(html, /id="btnScheduledTasksApplyFilters"/);
  assert.doesNotMatch(html, /<div class="settings-card-title">新建整理规则<\/div>/);

  const openHtml = renderScheduledTasksPanel({
    items: [],
    total: 0,
    compact: true,
    formOpen: true
  });
  assert.match(openHtml, /<details class="scheduled-task-form-details" open>/);
});

test("scheduled tasks compact mode keeps filters visible when an empty filter is active", () => {
  const html = renderScheduledTasksPanel({
    items: [],
    total: 0,
    compact: true,
    filters: { status: "active", taskType: "all" }
  });

  assert.match(html, /还没有整理规则/);
  assert.match(html, /id="btnScheduledTasksApplyFilters"/);
});
