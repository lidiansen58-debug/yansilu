import test from "node:test";
import assert from "node:assert/strict";

import {
  normalizeScheduledTaskFilters,
  scheduledTaskFormDefaults,
  scheduledTaskFromCanonical,
  scheduledTaskFormFromTask,
  scheduledTaskPayloadFromForm,
  scheduledRunSummary,
  scheduledTaskAction,
  scheduledTaskBudgetSummary,
  scheduledTaskScheduleLabel,
  scheduledTasksSummary,
  scheduledTaskScopeSummary,
  scheduledTaskStatusTone,
  scheduledTaskTemplateOptions,
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
  assert.equal(scheduledTaskTypeLabel("reflection_prompt"), "反思提醒");
  assert.equal(scheduledTaskStatusTone("active"), "ok");
  assert.equal(scheduledTaskStatusTone("failed"), "bad");
  assert.deepEqual(
    scheduledTaskTemplateOptions([
      { templateId: "reflection_reminder", name: "Reflection reminder", implementationReady: true, task: { taskType: "reflection_prompt" } },
      { templateId: "weekly_research_scan", name: "Research scan", implementationReady: false }
    ]).map((item) => item.value),
    ["reflection_reminder"]
  );
});

test("scheduled tasks model summarizes schedule scope budget and runs", () => {
  assert.equal(scheduledTaskScheduleLabel({ type: "interval", intervalMinutes: 30 }), "每 30 分钟");
  assert.equal(scheduledTaskScheduleLabel({ type: "weekly", dayOfWeek: "monday", time: "09:00" }), "monday 09:00");
  assert.equal(
    scheduledTaskScopeSummary({ noteIds: ["n1", "n2"], directoryIds: ["dir_1"], tags: ["writing"], keywords: ["spacing"], includePrivateNotes: true }),
    "2 条笔记 / 1 个目录 / 1 个标签 / 1 个关键词 / 包含私密内容"
  );
  assert.equal(
    scheduledTaskBudgetSummary({ maxRunsPerPeriod: 3, runsThisPeriod: 1, maxEstimatedCostPerPeriod: 2, period: "week" }),
    "1/3 次 / week，上限 2"
  );
  assert.deepEqual(scheduledRunSummary({ total: 2, succeeded: 1, skipped: "1", failed: -1 }), {
    total: 2,
    succeeded: 1,
    skipped: 1,
    failed: 0
  });
});

test("scheduled tasks model can hydrate runtime task objects from canonical payloads", () => {
  const task = scheduledTaskFromCanonical({
    scheduled_task_id: "sched_1",
    workspace_id: "workspace_1",
    user_id: "user_1",
    name: "Reflection reminder",
    status: "active",
    task_type: "reflection_prompt",
    agent_id: "reflection_agent",
    schedule: {
      type: "interval",
      timezone: "local",
      day_of_week: "",
      time: "",
      interval_minutes: 30,
      interval_hours: 0,
      interval_days: 0,
      rrule: ""
    },
    scope: {
      project_ids: [],
      note_ids: ["pn_1"],
      directory_ids: ["dir_1"],
      tags: ["reflection"],
      source_feed_ids: [],
      keywords: ["bridge"],
      include_private_notes: true
    },
    model: {
      user_mode: "Balanced",
      model_pack: "",
      max_tier: "standard",
      allow_strong_reasoning: false
    },
    budget: {
      max_runs_per_period: 3,
      max_estimated_cost_per_run: 0.35,
      max_estimated_cost_per_period: 1,
      period: "week",
      spent_this_period: 0.2,
      runs_this_period: 1
    },
    privacy: {
      mode: "normal",
      allow_cloud_models: true,
      require_confirmation_for_private_notes: true
    },
    output: {
      destination: "ai_inbox",
      artifact_types: ["ReflectionPrompt"],
      notify_user: "digest"
    },
    run_input: null,
    failure_count: 1,
    last_run_at: "2026-05-18T12:30:00.000Z",
    last_run_status: "succeeded",
    last_run_reason: "",
    last_agent_run_id: "run_sched_1",
    next_run_at: "2026-05-18T13:00:00.000Z",
    created_at: "2026-05-18T12:00:00.000Z",
    updated_at: "2026-05-18T12:30:00.000Z"
  });

  assert.equal(task.scheduledTaskId, "sched_1");
  assert.equal(task.schedule.intervalMinutes, 30);
  assert.deepEqual(task.scope.noteIds, ["pn_1"]);
  assert.equal(task.model.userMode, "Balanced");
  assert.equal(task.output.artifactTypes[0], "ReflectionPrompt");
  assert.equal(task.failureCount, 1);
});

test("scheduled tasks model derives actions and list summary", () => {
  assert.deepEqual(scheduledTaskAction({ status: "active" }), { nextStatus: "paused", label: "暂停" });
  assert.deepEqual(scheduledTaskAction({ status: "paused" }), { nextStatus: "active", label: "恢复启用" });
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

test("scheduled tasks model builds safe create and edit payloads", () => {
  const defaults = scheduledTaskFormDefaults({
    templates: [{ templateId: "weekly_link_suggestions", name: "Weekly link suggestions", implementationReady: true }],
    currentDirectoryId: "dir_original_default"
  });
  assert.equal(defaults.status, "paused");
  assert.equal(defaults.directoryIdsText, "dir_original_default");

  const payload = scheduledTaskPayloadFromForm({
    ...defaults,
    status: "active",
    scheduleType: "interval",
    intervalMinutes: 2,
    tagsText: "#writing, source-gap",
    keywordsText: "bridge\nconcept"
  });
  assert.equal(payload.templateId, "weekly_link_suggestions");
  assert.equal(payload.schedule.intervalMinutes, 5);
  assert.deepEqual(payload.scope.tags, ["writing", "source-gap"]);
  assert.deepEqual(payload.scope.keywords, ["bridge", "concept"]);

  const form = scheduledTaskFormFromTask({
    scheduledTaskId: "sched_1",
    name: "Edited",
    status: "active",
    taskType: "relation_scan",
    schedule: { type: "weekly", dayOfWeek: "tuesday", time: "10:30" },
    scope: { noteIds: ["note_1"], directoryIds: ["dir_1"], tags: ["ai"] }
  });
  assert.equal(form.templateId, "weekly_link_suggestions");
  assert.equal(form.noteIdsText, "note_1");
  assert.equal(form.directoryIdsText, "dir_1");
});
