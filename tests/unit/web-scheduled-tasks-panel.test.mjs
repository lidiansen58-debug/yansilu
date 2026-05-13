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
    filters: { status: "active", taskType: "reflection_prompt" },
    runSummary: { total: 1, succeeded: 1, skipped: 0, failed: 0 }
  });

  assert.match(html, /Scheduled agent tasks/);
  assert.match(html, /Outputs remain AI Inbox artifacts/);
  assert.match(html, /id="scheduledTaskStatusFilter"/);
  assert.match(html, /id="scheduledTaskTypeFilter"/);
  assert.match(html, /id="btnScheduledTasksRunDue"/);
  assert.match(html, /Reflection reminder/);
  assert.match(html, /Every 30 min/);
  assert.match(html, /1 notes/);
  assert.match(html, /1\/3 runs per week, cap 2/);
  assert.match(html, /data-scheduled-task-id="sched_reflection"/);
  assert.match(html, /data-scheduled-task-status="paused"/);
  assert.match(html, /1 succeeded/);
});

test("scheduled tasks panel renders resume action and empty states", () => {
  const pausedHtml = renderScheduledTasksPanel({
    items: [{ ...task, status: "paused" }],
    total: 1
  });
  assert.match(pausedHtml, /data-scheduled-task-status="active"/);
  assert.match(pausedHtml, /Resume/);

  assert.match(renderScheduledTasksPanel({ loading: true }), /Loading scheduled tasks/);
  assert.match(renderScheduledTasksPanel({ error: "boom" }), /Scheduled tasks failed to load: boom/);
  assert.match(renderScheduledTasksPanel({ items: [], total: 0 }), /No scheduled tasks match these filters/);
});
