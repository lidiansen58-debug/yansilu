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
