import test from "node:test";
import assert from "node:assert/strict";

import {
  createWritingProjectRuntimeController
} from "../../apps/web/src/writing-project-runtime-controller.js";

function form(fields = {}) {
  return (id) => ({ value: fields[id] || "" });
}

test("writing project runtime controller blocks current basket project without title", async () => {
  const statuses = [];
  const controller = createWritingProjectRuntimeController(() => ({
    $: form({ writingTitle: "" }),
    parseWritingBasketIds: () => ["n1"],
    setStatus: (...args) => statuses.push(args),
    writingState: {}
  }));

  const result = await controller.createWritingProjectFromCurrentBasket();

  assert.equal(result, null);
  assert.deepEqual(statuses.at(-1), ["请先填写主题标题", "warn"]);
});

test("writing project runtime controller creates a project from the current basket", async () => {
  const calls = [];
  const writingState = { sourceIndexIds: ["idx1"] };
  const controller = createWritingProjectRuntimeController(() => ({
    $: form({
      writingTitle: "  Project  ",
      writingGoal: "Goal",
      writingAudience: "Reader",
      writingTone: "Direct"
    }),
    createWritingProject: async (payload) => {
      calls.push(["create", payload]);
      return { id: "p1", title: payload.title, basket_note_ids: payload.basketNoteIds };
    },
    currentWritingBookStructure: (input) => ({ noteCount: input.notes.length }),
    loadWritingDraftVersions: async () => calls.push(["drafts"]),
    loadWritingProjectsList: async () => calls.push(["projects"]),
    loadWritingScaffoldVersions: async () => calls.push(["scaffolds"]),
    parseWritingBasketIds: () => ["n1", "n2"],
    renderWritingPanel: () => calls.push(["render"]),
    setStatus: (...args) => calls.push(["status", ...args]),
    showWritingResult: (result) => calls.push(["result", result.stage, result.writingProjectId]),
    syncWritingLocalBookIdeasFromProject: (project) => calls.push(["ideas", project.id]),
    writingKnownNoteById: (id) => ({ id, title: `Note ${id}` }),
    writingState
  }));

  const project = await controller.createWritingProjectFromCurrentBasket();

  assert.equal(project.id, "p1");
  assert.equal(writingState.project, project);
  assert.deepEqual(calls[0][1].basketNoteIds, ["n1", "n2"]);
  assert.deepEqual(calls[0][1].relatedIndexIds, ["idx1"]);
  assert.deepEqual(calls[0][1].bookStructure, { noteCount: 2 });
  assert.ok(calls.some((call) => call[0] === "result" && call[2] === "p1"));
  assert.deepEqual(calls.at(-1), ["status", "可写主题已确定：p1", "ok"]);
});

test("writing project runtime controller creates a project from imported permanent notes", async () => {
  const calls = [];
  const writingState = {};
  const controller = createWritingProjectRuntimeController(() => ({
    $: form({ writingGoal: "Goal" }),
    beginWritingEntry: (...args) => calls.push(["entry", ...args]),
    createWritingProject: async (payload) => {
      calls.push(["create", payload]);
      return { id: "p-import", title: payload.title, basket_note_ids: payload.basketNoteIds };
    },
    ensureNotesLoaded: async (ids) => calls.push(["load", ids]),
    importState: {
      lastResultPayload: {
        stage: "confirm",
        result: {
          createdFiles: [
            { noteId: "n1", noteType: "permanent" },
            { noteId: "lit1", noteType: "literature" }
          ]
        }
      }
    },
    openWritingModule: async (options) => calls.push(["open", options.statusMessage]),
    populateWritingFormFromProject: (project) => calls.push(["populate", project.id]),
    showWritingResult: (result) => calls.push(["result", result.writingProjectId]),
    suggestedWritingProjectTitle: () => "Imported title",
    syncWritingLocalBookIdeasFromProject: (project) => calls.push(["ideas", project.id]),
    writingState
  }));

  const ok = await controller.createWritingProjectFromImportedPermanentNotes();

  assert.equal(ok, true);
  assert.equal(writingState.project.id, "p-import");
  assert.deepEqual(calls[0], ["load", ["n1"]]);
  assert.equal(calls.some((call) => call[0] === "entry"), true);
  assert.equal(calls.find((call) => call[0] === "create")[1].title, "Imported title");
  assert.match(calls.find((call) => call[0] === "open")[1], /p-import/);
});

test("writing project runtime controller prepares strong model analysis", async () => {
  const calls = [];
  const writingState = {
    project: { id: "p1", goal: "Project goal", audience: "Project audience" },
    strongModelRevision: 0
  };
  const controller = createWritingProjectRuntimeController(() => ({
    $: form({ writingGoal: "Goal", writingAudience: "Audience" }),
    addSystemMessage: (message, options) => calls.push(["message", message, options]),
    analyzeWritingWithStrongModel: async (request) => ({
      request: { model: { model: "gpt-x" } },
      result: { storedArtifactIds: ["a1"] },
      seenRequest: request
    }),
    parseWritingBasketIds: () => ["n1"],
    renderWritingPanel: () => calls.push(["render"]),
    setStatus: (...args) => calls.push(["status", ...args]),
    window: { confirm: () => true },
    writingState
  }));

  await controller.prepareWritingStrongModelAnalysis();

  assert.equal(writingState.strongModelLoading, false);
  assert.equal(writingState.strongModelResult.seenRequest.writingGoal, "Goal");
  assert.equal(writingState.strongModelResult.seenRequest.userConfirmedRemoteModel, false);
  assert.equal(writingState.strongModelResult.seenRequest.privacyMode, "local_only");
  assert.equal(writingState.strongModelResult.seenRequest.modelTier, "local_private");
  assert.equal(calls.some((call) => call[0] === "message"), false);
  assert.deepEqual(calls.at(-1), ["render"]);
  assert.equal(calls.some((call) => call[0] === "status" && /写作检查已完成/.test(call[1])), true);
});

test("writing project runtime controller applies feature AI request options", async () => {
  const writingState = {
    project: { id: "p1", goal: "Project goal" },
    strongModelRevision: 0
  };
  let seenRequest = null;
  const controller = createWritingProjectRuntimeController(() => ({
    $: form({ writingGoal: "Goal" }),
    aiFeatureRequestOptions: () => ({
      userConfirmedRemoteModel: true,
      privacyMode: "remote_after_confirmation",
      providerPreset: "openai-compatible",
      modelTier: "strong_reasoning"
    }),
    aiRuntimeMode: "cloud_only",
    aiAvailable: true,
    analyzeWritingWithStrongModel: async (request) => {
      seenRequest = request;
      return { suggestions: [{ text: "补证据" }] };
    },
    parseWritingBasketIds: () => ["n1"],
    renderWritingPanel: () => {},
    setStatus: () => {},
    writingState
  }));

  await controller.prepareWritingStrongModelAnalysis({ remoteConfirmed: true });

  assert.equal(seenRequest.providerPreset, "openai-compatible");
  assert.equal(seenRequest.userConfirmedRemoteModel, true);
  assert.equal(seenRequest.privacyMode, "remote_after_confirmation");
});

test("writing project runtime controller opens AI settings when remote AI is unavailable", async () => {
  const calls = [];
  const writingState = {
    project: { id: "p1" },
    strongModelRevision: 0
  };
  const controller = createWritingProjectRuntimeController(() => ({
    $: form({ writingGoal: "Goal" }),
    activateModule: (...args) => calls.push(["activate", ...args]),
    aiAvailable: false,
    aiRuntimeMode: "cloud_only",
    analyzeWritingWithStrongModel: async () => {
      calls.push(["analyze"]);
      return {};
    },
    parseWritingBasketIds: () => ["n1"],
    renderSettingsPanel: () => calls.push(["render-settings"]),
    renderWritingPanel: () => calls.push(["render-writing"]),
    setSettingsItem: (...args) => calls.push(["settings-item", ...args]),
    setStatus: (...args) => calls.push(["status", ...args]),
    writingState
  }));

  await controller.prepareWritingStrongModelAnalysis();

  assert.equal(calls.some((call) => call[0] === "analyze"), false);
  assert.deepEqual(calls.find((call) => call[0] === "activate"), ["activate", "settings"]);
  assert.deepEqual(calls.find((call) => call[0] === "settings-item"), ["settings-item", "ai-settings", { render: false }]);
  assert.equal(calls.some((call) => call[0] === "render-settings"), true);
  assert.equal(calls.some((call) => call[0] === "status" && /完成 AI 设置/.test(call[1])), true);
  assert.deepEqual(writingState.pendingContextualAiAction, { actionId: "check_outline", projectId: "p1" });
});

test("writing project runtime controller returns from AI settings and waits for remote confirmation", async () => {
  const calls = [];
  let aiAvailable = false;
  const writingState = {
    project: { id: "p1", goal: "Project goal" },
    strongModelRevision: 0,
    pendingContextualAiAction: { actionId: "check_outline", projectId: "p1" }
  };
  const controller = createWritingProjectRuntimeController(() => ({
    $: form({ writingGoal: "Goal" }),
    activateModule: (...args) => calls.push(["activate", ...args]),
    aiAvailable,
    aiRuntimeMode: "cloud_only",
    analyzeWritingWithStrongModel: async () => {
      calls.push(["analyze"]);
      return { suggestions: [{ text: "补证据" }] };
    },
    parseWritingBasketIds: () => ["n1"],
    refreshAiRoutePreview: async () => {
      calls.push(["preview"]);
      aiAvailable = true;
    },
    renderWritingPanel: () => calls.push(["render-writing"]),
    setStatus: (...args) => calls.push(["status", ...args]),
    window: { confirm: () => true },
    writingState
  }));

  const resumed = await controller.resumePendingContextualAiAction();

  assert.equal(resumed, true);
  assert.equal(writingState.pendingContextualAiAction, null);
  assert.deepEqual(calls.find((call) => call[0] === "activate"), ["activate", "writing"]);
  assert.equal(calls.some((call) => call[0] === "analyze"), false);
  assert.equal(writingState.contextualAiActionState.status, "needs_remote_confirmation");
});

test("writing project runtime controller sends remote outline check only after in-app confirmation", async () => {
  const calls = [];
  const writingState = {
    project: { id: "p1", goal: "Project goal" },
    strongModelRevision: 0
  };
  const controller = createWritingProjectRuntimeController(() => ({
    $: form({ writingGoal: "Goal" }),
    aiAvailable: true,
    aiRuntimeMode: "cloud_only",
    analyzeWritingWithStrongModel: async () => {
      calls.push(["analyze"]);
      return { suggestions: [{ text: "补证据" }] };
    },
    parseWritingBasketIds: () => ["n1"],
    renderWritingPanel: () => calls.push(["render-writing"]),
    setStatus: (...args) => calls.push(["status", ...args]),
    window: { confirm: () => {
      calls.push(["confirm"]);
      return true;
    } },
    writingState
  }));

  await controller.prepareWritingStrongModelAnalysis({ remoteConfirmed: true });

  assert.equal(calls.some((call) => call[0] === "confirm"), false);
  assert.equal(calls.some((call) => call[0] === "analyze"), true);
  assert.equal(writingState.contextualAiActionState.status, "awaiting_confirmation");
});

test("writing project runtime controller reports cancel accurately before remote content is sent", async () => {
  const calls = [];
  const writingState = {
    project: { id: "p1", goal: "Project goal" },
    strongModelRevision: 0
  };
  const controller = createWritingProjectRuntimeController(() => ({
    $: form({ writingGoal: "Goal" }),
    aiAvailable: true,
    aiRuntimeMode: "cloud_only",
    analyzeWritingWithStrongModel: async () => {
      calls.push(["analyze"]);
      return {};
    },
    parseWritingBasketIds: () => ["n1"],
    renderWritingPanel: () => calls.push(["render-writing"]),
    setStatus: (...args) => calls.push(["status", ...args]),
    writingState
  }));

  await controller.prepareWritingStrongModelAnalysis();
  await controller.contextualAiController.ignore("check_outline");

  assert.equal(calls.some((call) => call[0] === "analyze"), false);
  assert.equal(calls.some((call) => call[0] === "status" && call[1] === "已取消检查。"), true);
  assert.equal(writingState.contextualAiActionState.status, "idle");
});

test("writing project runtime controller closes generated outline check without leaving an ignored placeholder", async () => {
  const calls = [];
  const writingState = {
    project: { id: "p1", goal: "Project goal" },
    strongModelRevision: 0
  };
  const controller = createWritingProjectRuntimeController(() => ({
    $: form({ writingGoal: "Goal" }),
    aiRuntimeMode: "local",
    analyzeWritingWithStrongModel: async () => ({ suggestions: [{ text: "补证据" }] }),
    ensureLocalAiReadyForFeature: async () => ({ ready: true }),
    parseWritingBasketIds: () => ["n1"],
    renderWritingPanel: () => calls.push(["render-writing"]),
    setStatus: (...args) => calls.push(["status", ...args]),
    writingState
  }));

  await controller.prepareWritingStrongModelAnalysis();
  assert.ok(writingState.strongModelResult);
  assert.equal(writingState.contextualAiActionState.status, "awaiting_confirmation");
  await controller.contextualAiController.ignore("check_outline");

  assert.equal(writingState.contextualAiActionState.status, "idle");
  assert.equal(writingState.strongModelResult, null);
  assert.equal(writingState.strongModelError, "");
  assert.equal(calls.some((call) => call[0] === "status" && call[1] === "已关闭检查结果。"), true);
});

test("writing project runtime controller cancels pending outline check when the project changed", async () => {
  const calls = [];
  const writingState = {
    project: { id: "p2", goal: "Another project" },
    strongModelRevision: 0,
    pendingContextualAiAction: { actionId: "check_outline", projectId: "p1" }
  };
  const controller = createWritingProjectRuntimeController(() => ({
    activateModule: (...args) => calls.push(["activate", ...args]),
    analyzeWritingWithStrongModel: async () => calls.push(["analyze"]),
    refreshAiRoutePreview: async () => calls.push(["preview"]),
    setStatus: (...args) => calls.push(["status", ...args]),
    writingState
  }));

  const resumed = await controller.resumePendingContextualAiAction();

  assert.equal(resumed, false);
  assert.equal(writingState.pendingContextualAiAction, null);
  assert.equal(calls.some((call) => call[0] === "preview"), false);
  assert.equal(calls.some((call) => call[0] === "activate"), false);
  assert.equal(calls.some((call) => call[0] === "analyze"), false);
  assert.equal(calls.some((call) => call[0] === "status" && /写作主题已变化/.test(call[1])), true);
});

test("writing project runtime controller cancels pending outline check when the project is missing", async () => {
  const calls = [];
  const writingState = {
    project: null,
    strongModelRevision: 0,
    pendingContextualAiAction: { actionId: "check_outline", projectId: "p1" }
  };
  const controller = createWritingProjectRuntimeController(() => ({
    activateModule: (...args) => calls.push(["activate", ...args]),
    analyzeWritingWithStrongModel: async () => calls.push(["analyze"]),
    refreshAiRoutePreview: async () => calls.push(["preview"]),
    setStatus: (...args) => calls.push(["status", ...args]),
    writingState
  }));

  const resumed = await controller.resumePendingContextualAiAction();

  assert.equal(resumed, false);
  assert.equal(writingState.pendingContextualAiAction, null);
  assert.equal(calls.some((call) => call[0] === "preview"), false);
  assert.equal(calls.some((call) => call[0] === "activate"), false);
  assert.equal(calls.some((call) => call[0] === "analyze"), false);
});

test("writing project runtime controller keeps pending outline check when AI is still unavailable", async () => {
  const calls = [];
  const writingState = {
    project: { id: "p1" },
    strongModelRevision: 0,
    pendingContextualAiAction: { actionId: "check_outline", projectId: "p1" }
  };
  const controller = createWritingProjectRuntimeController(() => ({
    activateModule: (...args) => calls.push(["activate", ...args]),
    aiAvailable: false,
    aiRuntimeMode: "cloud_only",
    analyzeWritingWithStrongModel: async () => calls.push(["analyze"]),
    refreshAiRoutePreview: async () => calls.push(["preview"]),
    writingState
  }));

  const resumed = await controller.resumePendingContextualAiAction();

  assert.equal(resumed, false);
  assert.deepEqual(writingState.pendingContextualAiAction, { actionId: "check_outline", projectId: "p1" });
  assert.equal(calls.some((call) => call[0] === "activate"), false);
  assert.equal(calls.some((call) => call[0] === "analyze"), false);
});

test("writing project runtime controller keeps local pending outline check until local AI is ready", async () => {
  const calls = [];
  const writingState = {
    project: { id: "p1" },
    strongModelRevision: 0,
    pendingContextualAiAction: { actionId: "check_outline", projectId: "p1" }
  };
  const controller = createWritingProjectRuntimeController(() => ({
    activateModule: (...args) => calls.push(["activate", ...args]),
    aiRuntimeMode: "local",
    analyzeWritingWithStrongModel: async () => calls.push(["analyze"]),
    ensureLocalAiReadyForFeature: async (options) => {
      calls.push(["ensure-local", options]);
      return { ready: false };
    },
    refreshAiRoutePreview: async () => calls.push(["preview"]),
    writingState
  }));

  const resumed = await controller.resumePendingContextualAiAction();

  assert.equal(resumed, false);
  assert.deepEqual(writingState.pendingContextualAiAction, { actionId: "check_outline", projectId: "p1" });
  assert.deepEqual(calls.find((call) => call[0] === "ensure-local"), ["ensure-local", { feature: "writing_check", openSettings: false }]);
  assert.equal(calls.some((call) => call[0] === "activate"), false);
  assert.equal(calls.some((call) => call[0] === "analyze"), false);
});
