import test from "node:test";
import assert from "node:assert/strict";

import {
  normalizeScheduledTaskFilters,
  scheduledRunSummary,
  scheduledTaskAction,
  scheduledTaskBudgetSummary,
  scheduledTaskScheduleLabel,
  scheduledTasksSummary,
  scheduledTaskScopeSummary,
  scheduledTaskStatusTone,
  scheduledTaskTypeLabel
} from "../../apps/web/src/scheduled-tasks-model.js";

test("scheduled tasks model normalizes filters and labels", () => {
  assert.deepEqual(normalizeScheduledTaskFilters({ status: "missing", taskType: "nope", limit: 999 }), {
    status: "all",
    taskType: "all",
    limit: 100
  });
  assert.deepEqual(normalizeScheduledTaskFilters({ status: "paused", taskType: "relation_scan", limit: 12 }), {
    status: "paused",
    taskType: "relation_scan",
    limit: 12
  });
  assert.equal(scheduledTaskTypeLabel("reflection_prompt"), "Reflection prompts");
  assert.equal(scheduledTaskStatusTone("active"), "ok");
  assert.equal(scheduledTaskStatusTone("failed"), "bad");
});

test("scheduled tasks model summarizes schedule scope budget and runs", () => {
  assert.equal(scheduledTaskScheduleLabel({ type: "interval", intervalMinutes: 30 }), "Every 30 min");
  assert.equal(scheduledTaskScheduleLabel({ type: "weekly", dayOfWeek: "monday", time: "09:00" }), "monday 09:00");
  assert.equal(scheduledTaskScopeSummary({ noteIds: ["n1", "n2"], keywords: ["spacing"], includePrivateNotes: true }), "2 notes / 1 keywords / private included");
  assert.equal(
    scheduledTaskBudgetSummary({ maxRunsPerPeriod: 3, runsThisPeriod: 1, maxEstimatedCostPerPeriod: 2, period: "week" }),
    "1/3 runs per week, cap 2"
  );
  assert.deepEqual(scheduledRunSummary({ total: 2, succeeded: 1, skipped: "1", failed: -1 }), {
    total: 2,
    succeeded: 1,
    skipped: 1,
    failed: 0
  });
});

test("scheduled tasks model derives actions and list summary", () => {
  assert.deepEqual(scheduledTaskAction({ status: "active" }), { nextStatus: "paused", label: "Pause" });
  assert.deepEqual(scheduledTaskAction({ status: "paused" }), { nextStatus: "active", label: "Resume" });
  assert.deepEqual(
    scheduledTasksSummary({
      items: [{ status: "active" }, { status: "paused" }, { status: "active" }],
      total: 5
    }),
    {
      visible: 3,
      total: 5,
      counts: { active: 2, paused: 1, disabled: 0, failed: 0 }
    }
  );
});
