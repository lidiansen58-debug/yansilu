import test from "node:test";
import assert from "node:assert/strict";

import {
  createScheduledTasksRuntimeController
} from "../../apps/web/src/scheduled-tasks-runtime-controller.js";

function baseSettingsState() {
  return {
    ai: {
      scheduledTasks: [],
      scheduledTasksTotal: 0,
      scheduledTaskTemplates: [
        {
          templateId: "reflection_reminder",
          name: "提醒我回看",
          implementationReady: true,
          task: { schedule: { type: "daily", time: "16:00" } }
        }
      ],
      scheduledTaskTemplatesLoading: false,
      scheduledTaskTemplatesError: "",
      scheduledTaskForm: { templateId: "", name: "", status: "paused" },
      scheduledTaskFormOpen: false,
      scheduledTaskFilters: { status: "all", taskType: "all", limit: 50 },
      scheduledTasksLoading: false,
      scheduledTaskActionLoading: false,
      scheduledTasksError: "",
      scheduledTaskRunSummary: null
    }
  };
}

test("scheduled tasks runtime controller resets and applies template defaults", () => {
  const calls = [];
  const settingsState = baseSettingsState();
  const controller = createScheduledTasksRuntimeController(() => ({
    render: () => calls.push(["render"]),
    settingsState,
    state: { selectedFileId: "note_1", selectedFolderId: "dir_1" }
  }));

  controller.resetForm({ formOpen: true });
  assert.equal(settingsState.ai.scheduledTaskFormOpen, true);
  assert.equal(settingsState.ai.scheduledTaskForm.noteIdsText, "note_1");

  controller.applyTemplateToForm("reflection_reminder");
  assert.equal(settingsState.ai.scheduledTaskForm.templateId, "reflection_reminder");
  assert.equal(settingsState.ai.scheduledTaskForm.scheduleType, "daily");
  assert.equal(settingsState.ai.scheduledTaskForm.time, "16:00");
  assert.equal(calls.filter((call) => call[0] === "render").length >= 2, true);
});

test("scheduled tasks runtime controller refreshes tasks and saves from UI", async () => {
  const calls = [];
  const settingsState = baseSettingsState();
  const elements = new Map([
    ["scheduledTaskTemplateSelect", { value: "reflection_reminder" }],
    ["scheduledTaskNameInput", { value: "提醒我回看" }],
    ["scheduledTaskStatusSelect", { value: "paused" }],
    ["scheduledTaskScheduleTypeSelect", { value: "daily" }],
    ["scheduledTaskDaySelect", { value: "monday" }],
    ["scheduledTaskTimeInput", { value: "09:00" }],
    ["scheduledTaskIntervalInput", { value: "30" }],
    ["scheduledTaskNoteIdsInput", { value: "note_1" }],
    ["scheduledTaskDirectoryIdsInput", { value: "" }],
    ["scheduledTaskTagsInput", { value: "" }],
    ["scheduledTaskKeywordsInput", { value: "" }],
    ["scheduledTaskIncludePrivateInput", { checked: false }]
  ]);
  const controller = createScheduledTasksRuntimeController(() => ({
    fetchAiScheduledTasks: async (request) => {
      calls.push(["fetch", request]);
      return { items: [{ scheduledTaskId: "sched_1", name: "Existing", status: "paused" }], total: 1 };
    },
    getElement: (id) => elements.get(id) || null,
    refreshScheduledTasks: async (options) => {
      calls.push(["refresh-wrapper", options]);
      return { total: 1 };
    },
    rememberAiDebugSnapshot: (...args) => calls.push(["debug", ...args]),
    render: () => calls.push(["render"]),
    saveAiScheduledTask: async (payload) => {
      calls.push(["save", payload]);
      return { scheduledTaskId: "sched_2", name: payload.name, status: payload.status };
    },
    setStatus: (...args) => calls.push(["status", ...args]),
    settingsState
  }));

  const result = await controller.refreshTasks();
  assert.equal(result.total, 1);
  assert.deepEqual(settingsState.ai.scheduledTasks, [{ scheduledTaskId: "sched_1", name: "Existing", status: "paused" }]);
  assert.deepEqual(calls.find((call) => call[0] === "fetch")[1], { status: "all", taskType: "all", limit: 50, canonical: true });

  const saved = await controller.saveFromUi();
  assert.equal(saved.scheduledTaskId, "sched_2");
  assert.equal(settingsState.ai.scheduledTaskFormOpen, false);
  assert.deepEqual(calls.find((call) => call[0] === "save")[1].scope.noteIds, ["note_1"]);
  assert.equal(calls.some((call) => call[0] === "status" && call[2] === "ok"), true);
});

test("scheduled tasks runtime controller runs due tasks and opens AI inbox review", async () => {
  const calls = [];
  const settingsState = baseSettingsState();
  const aiInboxState = { filters: { type: "field_suggestion" }, detail: { id: "old" }, selectedArtifactId: "artifact_old" };
  const controller = createScheduledTasksRuntimeController(() => ({
    addSystemMessage: (...args) => calls.push(["message", ...args]),
    aiInboxState,
    globalPendingAiInboxFilters: () => ({ view: "pending" }),
    normalizeAiInboxFilters: (filters) => ({ ...filters, normalized: true }),
    refreshAiInbox: async (options) => calls.push(["inbox", options]),
    refreshAiInboxEvaluationSummary: async (options) => calls.push(["eval", options]),
    refreshScheduledTasks: async (options) => calls.push(["tasks", options]),
    render: () => calls.push(["render"]),
    runDueAiScheduledTasks: async (request) => {
      calls.push(["run", request]);
      return { succeeded: 1, skipped: 0, failed: 0, artifactsCreated: 2 };
    },
    scheduledTaskReviewArtifactCount: (summary) => summary.artifactsCreated,
    scheduledTaskSystemMessageForArtifacts: (count) => ({ id: "msg_1", count }),
    setStatus: (...args) => calls.push(["status", ...args]),
    settingsState,
    window: { confirm: () => true }
  }));

  const summary = await controller.runDueFromUi();

  assert.equal(summary.succeeded, 1);
  assert.deepEqual(settingsState.ai.scheduledTaskRunSummary, { succeeded: 1, skipped: 0, failed: 0, artifactsCreated: 2 });
  assert.deepEqual(aiInboxState.filters, { view: "pending", type: "field_suggestion", normalized: true });
  assert.equal(aiInboxState.detail, null);
  assert.equal(aiInboxState.selectedArtifactId, "");
  assert.deepEqual(calls.find((call) => call[0] === "message"), ["message", { id: "msg_1", count: 2 }, { interrupt: true }]);
  assert.deepEqual(calls.find((call) => call[0] === "run"), ["run", { limit: 50 }]);
  assert.equal(calls.some((call) => call[0] === "status" && call[2] === "ok"), true);
});

test("scheduled rule save failure keeps the draft open, exposes the cause and allows retry", async () => {
  const settingsState = baseSettingsState();
  let fail = true;
  const controller = createScheduledTasksRuntimeController(() => ({
    settingsState, getElement: id => id === "scheduledTaskNameInput" ? { value: "我的规则" } : null,
    saveAiScheduledTask: async payload => { if (fail) throw new Error("connection refused"); return { ...payload, scheduledTaskId: "saved" }; },
    refreshScheduledTasks: async () => ({}), render() {}, setStatus() {}
  }));
  assert.equal(await controller.saveFromUi(), null);
  assert.equal(settingsState.ai.scheduledTaskForm.name, "我的规则");
  assert.equal(settingsState.ai.scheduledTaskFormOpen, true);
  assert.match(settingsState.ai.scheduledTaskFormError, /保存失败：connection refused/);
  assert.equal(settingsState.ai.scheduledTaskActionLoading, false);
  fail = false;
  assert.equal((await controller.saveFromUi()).scheduledTaskId, "saved");
  assert.equal(settingsState.ai.scheduledTaskFormOpen, false);
  assert.equal(settingsState.ai.scheduledTaskFormError, "");
});

test("rule status and run failures stay visible; cancelling a run never calls AI", async () => {
  const settingsState = baseSettingsState();
  let confirmed = true;
  let runs = 0;
  const controller = createScheduledTasksRuntimeController(() => ({
    settingsState, window: { confirm: () => confirmed }, render() {}, setStatus() {},
    updateAiScheduledTaskStatusWithOptions: async () => { throw new Error("offline"); },
    runDueAiScheduledTasks: async () => { runs++; throw new Error("not available"); }
  }));
  assert.equal(await controller.setTaskStatus("one", "paused"), null);
  assert.match(settingsState.ai.scheduledTaskActionError, /修改规则状态失败：offline/);
  assert.equal(await controller.runDueFromUi(), null);
  assert.match(settingsState.ai.scheduledTaskActionError, /整理失败：not available/);
  confirmed = false;
  assert.equal(await controller.runDueFromUi(), null);
  assert.equal(runs, 1);
});

test("late sorting types do not reset an already opened rule draft", async () => {
  const settingsState = baseSettingsState();
  settingsState.ai.scheduledTaskForm = { templateId: "", name: "加载时输入的名称", keywordsText: "我的范围", status: "paused", scheduleType: "manual_only" };
  settingsState.ai.scheduledTaskFormOpen = true;
  const renders = [];
  const controller = createScheduledTasksRuntimeController(() => ({
    settingsState, render: options => renders.push(options),
    fetchAiScheduledTaskTemplates: async () => ({ items: settingsState.ai.scheduledTaskTemplates })
  }));
  await controller.refreshTemplates();
  assert.equal(settingsState.ai.scheduledTaskForm.name, "加载时输入的名称");
  assert.equal(settingsState.ai.scheduledTaskForm.keywordsText, "我的范围");
  assert.equal(settingsState.ai.scheduledTaskForm.scheduleType, "manual_only");
  assert.equal(settingsState.ai.scheduledTaskForm.templateId, "reflection_reminder");
  assert.ok(renders.every(options => options?.preserveForm === true));
});
