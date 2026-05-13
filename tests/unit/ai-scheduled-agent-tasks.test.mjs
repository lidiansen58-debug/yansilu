import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  buildScheduledTaskHarnessInput,
  createAiHarness,
  createInMemoryAiProviderConfigStore,
  createInMemoryProviderHealthStore,
  createInMemoryScheduledAgentTaskStore,
  createMockProviderAdapter,
  createScheduledTaskFromTemplate,
  createSqliteScheduledAgentTaskStore,
  getProviderPreset,
  getScheduledAgentTaskTemplate,
  listScheduledAgentTaskTemplates,
  preflightScheduledTaskBudget,
  runDueScheduledAgentTasks
} from "../../packages/ai-orchestrator/src/index.mjs";

async function hasNodeSqlite() {
  try {
    await import("node:sqlite");
    return true;
  } catch {
    return false;
  }
}

async function makeTempVault() {
  return fs.mkdtemp(path.join(os.tmpdir(), "yansilu-ai-scheduled-tasks-"));
}

test("scheduled task templates expose novice-safe runnable defaults", () => {
  const readyTemplates = listScheduledAgentTaskTemplates({ implementationReady: true });
  const researchTemplate = getScheduledAgentTaskTemplate("weekly_research_scan");
  const linkTask = createScheduledTaskFromTemplate({
    templateId: "weekly_link_suggestions",
    workspaceId: "workspace_templates",
    userId: "user_templates",
    scope: { keywords: ["model neutrality", "note links"] },
    now: "2026-05-11T00:00:00.000Z"
  });

  assert.deepEqual(
    readyTemplates.map((template) => template.templateId).sort(),
    ["reflection_reminder", "weekly_link_suggestions"].sort()
  );
  assert.equal(researchTemplate.implementationReady, false);
  assert.equal(linkTask.status, "active");
  assert.equal(linkTask.agentId, "connection_agent");
  assert.equal(linkTask.model.userMode, "Economy");
  assert.equal(linkTask.model.maxTier, "standard");
  assert.equal(linkTask.output.artifactTypes[0], "LinkSuggestion");
  assert.equal(linkTask.budget.maxEstimatedCostPerPeriod, 0.5);
  assert.equal(linkTask.privacy.requireConfirmationForPrivateNotes, true);
  assert.equal(linkTask.nextRunAt, "2026-05-18T00:00:00.000Z");
});

test("contract-only research template stays paused unless explicitly allowed", () => {
  const pausedResearchTask = createScheduledTaskFromTemplate({
    templateId: "weekly_research_scan",
    now: "2026-05-11T00:00:00.000Z"
  });

  assert.equal(pausedResearchTask.status, "paused");
  assert.equal(pausedResearchTask.nextRunAt, "");
  assert.throws(
    () =>
      createScheduledTaskFromTemplate({
        templateId: "weekly_research_scan",
        status: "active"
      }),
    { code: "AI_SCHEDULED_TASK_TEMPLATE_NOT_READY" }
  );
});

test("scheduled task store lists due active tasks and records run state", () => {
  const store = createInMemoryScheduledAgentTaskStore({
    tasks: [
      {
        scheduledTaskId: "sched_due",
        name: "Weekly link scan",
        status: "active",
        taskType: "relation_scan",
        schedule: { type: "interval", intervalMinutes: 60 },
        budget: { maxEstimatedCostPerPeriod: 1, spentThisPeriod: 0.1 },
        nextRunAt: "2026-05-10T00:00:00.000Z"
      },
      {
        scheduledTaskId: "sched_paused",
        status: "paused",
        nextRunAt: "2026-05-10T00:00:00.000Z"
      },
      {
        scheduledTaskId: "sched_future",
        status: "active",
        nextRunAt: "2026-05-12T00:00:00.000Z"
      }
    ]
  });

  assert.deepEqual(
    store.listDueScheduledTasks({ now: "2026-05-11T00:00:00.000Z" }).map((task) => task.scheduledTaskId),
    ["sched_due"]
  );

  const paused = store.updateScheduledTaskStatus({ scheduledTaskId: "sched_due", status: "paused" });
  assert.equal(paused.status, "paused");
  assert.equal(store.listDueScheduledTasks({ now: "2026-05-11T00:00:00.000Z" }).length, 0);

  store.updateScheduledTaskStatus({ scheduledTaskId: "sched_due", status: "active" });
  const recorded = store.recordScheduledTaskRun({
    scheduledTaskId: "sched_due",
    agentRunId: "run_sched_1",
    status: "succeeded",
    finishedAt: "2026-05-11T00:00:00.000Z",
    estimatedCost: 0.25
  });

  assert.equal(recorded.lastAgentRunId, "run_sched_1");
  assert.equal(recorded.lastRunStatus, "succeeded");
  assert.equal(recorded.nextRunAt, "2026-05-11T01:00:00.000Z");
  assert.equal(recorded.budget.spentThisPeriod, 0.35);
});

test("due scheduled task runner executes through harness and updates task state", async () => {
  const provider = createMockProviderAdapter();
  const harness = createAiHarness({ providerAdapter: provider });
  const scheduledTaskStore = createInMemoryScheduledAgentTaskStore({
    tasks: [
      {
        scheduledTaskId: "sched_reflect",
        name: "Weekly reflection",
        status: "active",
        taskType: "reflection_prompt",
        agentId: "reflection_agent",
        schedule: { type: "interval", intervalMinutes: 30 },
        model: { userMode: "Balanced", maxTier: "standard" },
        output: { artifactTypes: ["ReflectionPrompt"] },
        budget: { maxEstimatedCostPerRun: 1, maxEstimatedCostPerPeriod: 2 },
        nextRunAt: "2026-05-11T08:00:00.000Z"
      }
    ]
  });

  const summary = await runDueScheduledAgentTasks({
    harness,
    scheduledTaskStore,
    now: "2026-05-11T09:00:00.000Z",
    buildInput(task) {
      return {
        ...buildScheduledTaskHarnessInput(task),
        taskId: "task_scheduled_reflect",
        currentNote: {
          id: "note_scheduled_reflect",
          title: "Scheduled reflection note",
          body: "Scheduled reflection note\n\nThis should run through the same harness path as foreground tasks."
        }
      };
    }
  });
  const task = scheduledTaskStore.getScheduledTask("sched_reflect");

  assert.equal(summary.total, 1);
  assert.equal(summary.succeeded, 1);
  assert.equal(task.lastRunStatus, "succeeded");
  assert.equal(task.nextRunAt, "2026-05-11T09:30:00.000Z");
  assert.equal(provider.callCount, 1);
  assert.equal(provider.lastRequest.policy.budgetPrecheck.budget.scheduledTaskHardCap, 2);
  assert.equal(provider.lastRequest.policy.modelRoute.userMode, "Balanced");
});

test("scheduled task budget preflight blocks exhausted run caps", async () => {
  const provider = createMockProviderAdapter();
  const harness = createAiHarness({ providerAdapter: provider });
  const scheduledTaskStore = createInMemoryScheduledAgentTaskStore({
    tasks: [
      {
        scheduledTaskId: "sched_budget_cap",
        status: "active",
        taskType: "reflection_prompt",
        agentId: "reflection_agent",
        schedule: { type: "interval", intervalMinutes: 30 },
        budget: { maxRunsPerPeriod: 1, runsThisPeriod: 1, maxEstimatedCostPerPeriod: 1, spentThisPeriod: 0.25 },
        nextRunAt: "2026-05-11T08:00:00.000Z"
      }
    ]
  });

  const summary = await runDueScheduledAgentTasks({
    harness,
    scheduledTaskStore,
    now: "2026-05-11T09:00:00.000Z",
    buildInput(task) {
      return {
        ...buildScheduledTaskHarnessInput(task),
        currentNote: {
          id: "note_budget_cap",
          title: "Budget cap note",
          body: "Budget cap note\n\nThis should not reach the model after the scheduled run cap is exhausted."
        }
      };
    }
  });
  const task = scheduledTaskStore.getScheduledTask("sched_budget_cap");

  assert.equal(summary.total, 1);
  assert.equal(summary.skipped, 1);
  assert.equal(provider.callCount, 0);
  assert.equal(summary.runs[0].budgetPreflight.reason, "scheduled_task_run_cap_exceeded");
  assert.equal(summary.runs[0].providerHealthPreflight, null);
  assert.equal(summary.runs[0].result.run.status, "skipped");
  assert.equal(summary.runs[0].result.run.error.errorType, "AI_SCHEDULED_TASK_BUDGET_SKIPPED");
  assert.equal(summary.runs[0].result.run.events[0].eventType, "scheduled_task_preflight");
  assert.equal(summary.runs[0].result.run.events[0].summary.preflightType, "budget");
  assert.equal(task.lastRunStatus, "skipped");
  assert.equal(task.lastRunReason, "scheduled_task_run_cap_exceeded");
  assert.equal(task.lastAgentRunId, summary.runs[0].result.run.agentRunId);
  assert.equal(task.budget.runsThisPeriod, 1);
  assert.equal(task.budget.spentThisPeriod, 0.25);
});

test("scheduled task budget preflight catches planned cost limits", () => {
  const period = preflightScheduledTaskBudget({
    task: {
      scheduledTaskId: "sched_budget_period",
      budget: { maxRunsPerPeriod: 3, runsThisPeriod: 1, maxEstimatedCostPerPeriod: 0.5, spentThisPeriod: 0.45 }
    },
    plannedEstimatedCost: 0.1
  });
  const perRun = preflightScheduledTaskBudget({
    task: {
      scheduledTaskId: "sched_budget_run",
      budget: { maxRunsPerPeriod: 3, maxEstimatedCostPerRun: 0.05, maxEstimatedCostPerPeriod: 1 }
    },
    plannedEstimatedCost: 0.1
  });

  assert.equal(period.allowed, false);
  assert.equal(period.reason, "scheduled_task_budget_period_exceeded");
  assert.equal(perRun.allowed, false);
  assert.equal(perRun.reason, "scheduled_task_per_run_budget_exceeded");
});

test("scheduled task runner skips down provider before model calls", async () => {
  const provider = createMockProviderAdapter();
  const harness = createAiHarness({ providerAdapter: provider });
  const providerHealthStore = createInMemoryProviderHealthStore({
    records: [
      {
        providerId: "platform_managed_openai",
        status: "down",
        checkedAt: "2026-05-11T08:55:00.000Z",
        message: "Provider unavailable."
      }
    ]
  });
  const scheduledTaskStore = createInMemoryScheduledAgentTaskStore({
    tasks: [
      {
        scheduledTaskId: "sched_health_skip",
        status: "active",
        taskType: "reflection_prompt",
        agentId: "reflection_agent",
        schedule: { type: "interval", intervalMinutes: 30 },
        model: { userMode: "Auto", maxTier: "standard" },
        nextRunAt: "2026-05-11T08:00:00.000Z"
      }
    ]
  });

  const summary = await runDueScheduledAgentTasks({
    harness,
    scheduledTaskStore,
    providerHealthStore,
    now: "2026-05-11T09:00:00.000Z",
    buildInput(task) {
      return {
        ...buildScheduledTaskHarnessInput(task),
        currentNote: {
          id: "note_health_skip",
          title: "Health skip note",
          body: "Health skip note\n\nThis should not reach the model while the provider is down."
        }
      };
    }
  });
  const task = scheduledTaskStore.getScheduledTask("sched_health_skip");

  assert.equal(summary.total, 1);
  assert.equal(summary.skipped, 1);
  assert.equal(provider.callCount, 0);
  assert.equal(summary.runs[0].providerHealthPreflight.action, "skip_scheduled");
  assert.equal(summary.runs[0].result.run.status, "skipped");
  assert.equal(summary.runs[0].result.run.error.errorType, "AI_SCHEDULED_TASK_PROVIDER_HEALTH_SKIPPED");
  assert.equal(summary.runs[0].result.run.events[0].summary.preflightType, "provider_health");
  assert.equal(task.lastRunStatus, "skipped");
  assert.equal(task.lastRunReason, "provider_down");
  assert.equal(task.lastAgentRunId, summary.runs[0].result.run.agentRunId);
  assert.equal(task.failureCount, 0);
  assert.equal(task.budget.runsThisPeriod, 0);
  assert.equal(task.nextRunAt, "2026-05-11T09:30:00.000Z");
});

test("scheduled task runner can route through a healthy fallback provider", async () => {
  const harness = createAiHarness();
  const scheduledTaskStore = createInMemoryScheduledAgentTaskStore({
    tasks: [
      {
        scheduledTaskId: "sched_health_fallback",
        status: "active",
        taskType: "reflection_prompt",
        agentId: "reflection_agent",
        schedule: { type: "interval", intervalMinutes: 30 },
        model: { userMode: "Auto", maxTier: "standard" },
        nextRunAt: "2026-05-11T08:00:00.000Z"
      }
    ]
  });

  const summary = await runDueScheduledAgentTasks({
    harness,
    scheduledTaskStore,
    now: "2026-05-11T09:00:00.000Z",
    primaryProvider: {
      ...getProviderPreset("platform_managed_openai"),
      health: { providerId: "platform_managed_openai", status: "down", checkedAt: "2026-05-11T08:55:00.000Z" }
    },
    providerCandidates: [
      {
        ...getProviderPreset("openai_compatible_gateway"),
        priority: 10,
        health: { providerId: "openai_compatible_gateway", status: "healthy", checkedAt: "2026-05-11T08:55:00.000Z" }
      }
    ],
    buildInput(task) {
      return {
        ...buildScheduledTaskHarnessInput(task),
        currentNote: {
          id: "note_health_fallback",
          title: "Health fallback note",
          body: "Health fallback note\n\nThis should use the healthy fallback provider."
        }
      };
    }
  });

  assert.equal(summary.succeeded, 1);
  assert.equal(summary.runs[0].providerHealthPreflight.action, "fallback");
  assert.equal(summary.runs[0].providerHealthPreflight.fallbackUsed, true);
  assert.equal(summary.runs[0].harnessInput.providerDescriptor.providerId, "openai_compatible_gateway");
  assert.equal(harness.providerAdapter.descriptor.providerId, "openai_compatible_gateway");
});

test("scheduled task preflight uses stored provider config descriptor", async () => {
  const harness = createAiHarness();
  const providerConfigStore = createInMemoryAiProviderConfigStore();
  providerConfigStore.setProviderConfig({
    providerId: "openai_compatible_gateway",
    authMode: "workspace_managed",
    secretRef: "secret_gateway",
    endpointUrl: "https://gateway.example.test/v1/chat/completions",
    modelMap: {
      standard: "openai_compatible_gateway:standard_override"
    },
    runtimeModelMap: {
      "openai_compatible_gateway:standard_override": "gateway-standard-model"
    }
  });
  const providerHealthStore = createInMemoryProviderHealthStore({
    records: [
      {
        providerId: "openai_compatible_gateway",
        status: "healthy",
        checkedAt: "2026-05-11T08:55:00.000Z"
      }
    ]
  });
  const scheduledTaskStore = createInMemoryScheduledAgentTaskStore({
    tasks: [
      {
        scheduledTaskId: "sched_configured_gateway",
        status: "active",
        taskType: "reflection_prompt",
        agentId: "reflection_agent",
        schedule: { type: "interval", intervalMinutes: 30 },
        model: { userMode: "Auto", modelPack: "Global Optimized", maxTier: "standard" },
        nextRunAt: "2026-05-11T08:00:00.000Z"
      }
    ]
  });

  const summary = await runDueScheduledAgentTasks({
    harness,
    scheduledTaskStore,
    providerConfigStore,
    providerHealthStore,
    now: "2026-05-11T09:00:00.000Z",
    buildInput(task) {
      return {
        ...buildScheduledTaskHarnessInput(task),
        currentNote: {
          id: "note_configured_gateway",
          title: "Configured gateway note",
          body: "Configured gateway note\n\nScheduled tasks should use the stored provider config."
        }
      };
    }
  });
  const run = summary.runs[0].result.run;
  const routeEvent = run.events.find((event) => event.eventType === "model_route_selected");

  assert.equal(summary.succeeded, 1);
  assert.equal(summary.runs[0].providerHealthPreflight.providerConfigId, "provider_openai_compatible_gateway");
  assert.equal(summary.runs[0].harnessInput.providerDescriptor.endpointUrl, "https://gateway.example.test/v1/chat/completions");
  assert.equal(summary.runs[0].harnessInput.providerDescriptor.secretRef, "secret_gateway");
  assert.equal(summary.runs[0].harnessInput.modelRef, "openai_compatible_gateway:standard_override");
  assert.equal(harness.providerAdapter.descriptor.endpointUrl, "https://gateway.example.test/v1/chat/completions");
  assert.equal(routeEvent.summary.modelRef, "openai_compatible_gateway:standard_override");
});

test("scheduled task runner uses stored provider config without provider health checks", async () => {
  const harness = createAiHarness();
  const providerConfigStore = createInMemoryAiProviderConfigStore();
  providerConfigStore.setProviderConfig({
    providerId: "openai_compatible_gateway",
    authMode: "workspace_managed",
    secretRef: "secret_gateway_no_health",
    endpointUrl: "https://gateway-no-health.example.test/v1/chat/completions",
    modelMap: {
      standard: "openai_compatible_gateway:no_health_standard"
    },
    runtimeModelMap: {
      "openai_compatible_gateway:no_health_standard": "gateway-no-health-model"
    }
  });
  const scheduledTaskStore = createInMemoryScheduledAgentTaskStore({
    tasks: [
      {
        scheduledTaskId: "sched_configured_gateway_no_health",
        status: "active",
        taskType: "reflection_prompt",
        agentId: "reflection_agent",
        schedule: { type: "interval", intervalMinutes: 30 },
        model: { userMode: "Auto", modelPack: "Global Optimized", maxTier: "standard" },
        nextRunAt: "2026-05-11T08:00:00.000Z"
      }
    ]
  });

  const summary = await runDueScheduledAgentTasks({
    harness,
    scheduledTaskStore,
    providerConfigStore,
    now: "2026-05-11T09:00:00.000Z",
    buildInput(task) {
      return {
        ...buildScheduledTaskHarnessInput(task),
        currentNote: {
          id: "note_configured_gateway_no_health",
          title: "Configured gateway without health note",
          body: "Configured gateway without health note\n\nScheduled tasks should still use the stored provider config."
        }
      };
    }
  });
  const run = summary.runs[0].result.run;
  const routeEvent = run.events.find((event) => event.eventType === "model_route_selected");

  assert.equal(summary.succeeded, 1);
  assert.equal(summary.runs[0].providerHealthPreflight.status, "not_checked");
  assert.equal(summary.runs[0].providerHealthPreflight.providerConfigId, "provider_openai_compatible_gateway");
  assert.equal(summary.runs[0].providerHealthPreflight.selectedModelRef, "openai_compatible_gateway:no_health_standard");
  assert.equal(summary.runs[0].harnessInput.providerDescriptor.endpointUrl, "https://gateway-no-health.example.test/v1/chat/completions");
  assert.equal(summary.runs[0].harnessInput.providerDescriptor.secretRef, "secret_gateway_no_health");
  assert.equal(summary.runs[0].harnessInput.modelRef, "openai_compatible_gateway:no_health_standard");
  assert.equal(harness.providerAdapter.descriptor.endpointUrl, "https://gateway-no-health.example.test/v1/chat/completions");
  assert.equal(routeEvent.summary.modelRef, "openai_compatible_gateway:no_health_standard");
});

test("sqlite scheduled task store persists due tasks and run state", async (t) => {
  if (!(await hasNodeSqlite())) {
    t.skip("node:sqlite is not available in current runtime");
    return;
  }

  const vaultPath = await makeTempVault();
  let store = await createSqliteScheduledAgentTaskStore({ vaultPath });
  store.upsertScheduledTask({
    scheduledTaskId: "sched_sqlite",
    name: "SQLite relation scan",
    status: "active",
    taskType: "relation_scan",
    schedule: { type: "interval", intervalHours: 2 },
    scope: { keywords: ["bridge concept"] },
    nextRunAt: "2026-05-11T08:00:00.000Z"
  });
  store.close();

  store = await createSqliteScheduledAgentTaskStore({ vaultPath });
  assert.equal(store.listDueScheduledTasks({ now: "2026-05-11T09:00:00.000Z" }).length, 1);
  const recorded = store.recordScheduledTaskRun({
    scheduledTaskId: "sched_sqlite",
    agentRunId: "run_sqlite_sched",
    status: "failed",
    finishedAt: "2026-05-11T09:00:00.000Z",
    reason: "tool_error"
  });
  assert.equal(recorded.failureCount, 1);
  store.close();

  store = await createSqliteScheduledAgentTaskStore({ vaultPath });
  const persisted = store.getScheduledTask("sched_sqlite");
  assert.equal(persisted.lastAgentRunId, "run_sqlite_sched");
  assert.equal(persisted.lastRunStatus, "failed");
  assert.equal(persisted.lastRunReason, "tool_error");
  assert.equal(persisted.nextRunAt, "2026-05-11T11:00:00.000Z");
  store.close();
});
