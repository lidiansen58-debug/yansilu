import test from "node:test";
import assert from "node:assert/strict";

import { renderScheduledTasksPanel } from "../../apps/web/src/scheduled-tasks-panel.js";

const task = {
  scheduledTaskId: "sched_reflection",
  name: "Reflection reminder",
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
    templates: [{ templateId: "reflection_reminder", name: "Reflection reminder", implementationReady: true }],
    form: { templateId: "reflection_reminder", name: "Reflection reminder", status: "paused" },
    currentNoteId: "note_1",
    currentDirectoryId: "dir_original_default",
    filters: { status: "active", taskType: "reflection_prompt" },
    runSummary: { total: 1, succeeded: 1, skipped: 0, failed: 0 }
  });

  assert.match(html, /计划代理任务/);
  assert.match(html, /输出会停留在系统消息里/);
  assert.match(html, /id="scheduledTaskStatusFilter"/);
  assert.match(html, /id="scheduledTaskTypeFilter"/);
  assert.match(html, /id="btnScheduledTasksRunDue"/);
  assert.match(html, /id="scheduledTaskForm"/);
  assert.match(html, /id="scheduledTaskTemplateSelect"/);
  assert.match(html, /id="btnScheduledTaskSave"/);
  assert.match(html, /id="btnScheduledTaskUseCurrentNote"/);
  assert.match(html, /Reflection reminder/);
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

  assert.match(renderScheduledTasksPanel({ loading: true }), /正在加载计划任务/);
  assert.match(renderScheduledTasksPanel({ error: "boom" }), /计划任务加载失败：boom/);
  assert.match(renderScheduledTasksPanel({ items: [], total: 0 }), /没有符合这些筛选条件的计划任务/);
});
