import test from "node:test";
import assert from "node:assert/strict";

import {
  handleWritingAddVisible,
  handleWritingCreateScaffoldClick,
  handleWritingDraftVersionsListClick,
  handleWritingOutlineClick,
  handleWritingOutlineInput,
  handleWritingStartDraftClick,
  handleWritingNoteListClick,
  persistWritingOutline,
  persistWritingProjectForm,
  handleWritingProjectsListClick,
  handleWritingSaveDraftClick,
  handleWritingScaffoldVersionsListClick,
  handleWritingThemeDetailClick,
  handleWritingThemeIndexListClick,
  handleWritingUseCurrent,
  installWritingDraftActionEventHandlers,
  installWritingPanelBasketEventHandlers,
  installWritingProjectHistoryEventHandlers,
  installWritingProjectListEventHandlers,
  installWritingThemeDetailEventHandlers,
  installWritingThemeIndexEventHandlers,
  normalizeWritingDraftTitle
} from "../../apps/web/src/writing-panel-events.js";

function actionTarget(action, noteId = "n1") {
  return {
    closest: (selector) => selector === "[data-writing-action]"
      ? {
          getAttribute: (name) => {
            if (name === "data-writing-action") return action;
            if (name === "data-writing-note-id") return noteId;
            return "";
          }
        }
      : null
  };
}

test("writing draft title removes legacy draft suffixes without changing the article title", () => {
  assert.equal(normalizeWritingDraftTitle("Writing UI Project"), "Writing UI Project");
  assert.equal(normalizeWritingDraftTitle("Writing UI Project 草稿"), "Writing UI Project");
  assert.equal(normalizeWritingDraftTitle("Evidence 项目"), "Evidence 项目");
  assert.equal(normalizeWritingDraftTitle("Evidence 项目 草稿"), "Evidence 项目");
  assert.equal(normalizeWritingDraftTitle("Evidence 主题"), "Evidence 主题");
  assert.equal(normalizeWritingDraftTitle("为什么《易经》不是答案机器 主题 草稿"), "为什么《易经》不是答案机器");
});

function indexTarget(selector, attrs = {}) {
  return {
    closest: (requested) => requested === selector
      ? {
          getAttribute: (name) => attrs[name] || ""
        }
      : null
  };
}

function buttonTarget(selector, button) {
  return {
    closest: (requested) => requested === selector ? button : null
  };
}

function contextualAiButton(actionAttrs = {}, actionId = "check_outline") {
  return {
    hasAttribute: (name) => actionAttrs[name] === true,
    closest: (selector) => selector === "[data-contextual-ai-action-id]"
      ? { getAttribute: () => actionId }
      : null
  };
}

test("writing panel basket installer wires core basket controls through latest deps", async () => {
  const handlers = new Map();
  let version = "first";
  const calls = [];
  const writingState = { project: { id: "p1", draft_note_id: "n1" }, scaffold: { id: "s1" }, scaffoldMarkdown: "outline" };
  const elements = new Map([
    ["btnWritingUseCurrent", {}],
    ["btnWritingAddVisible", {}],
    ["btnWritingClearBasket", {}],
    ["writingBasketNoteIds", {}],
    ["btnWritingStrongModelAnalysis", {}],
    ["writingStrongModelSummary", {}],
    ["btnWritingLocalBookIdeas", {}],
    ["writingCandidateList", {}],
    ["writingBasketList", {}],
    ["writingCandidateDetails", {}]
  ]);
  for (const [id, element] of elements) {
    element.addEventListener = (eventName, handler) => {
      handlers.set(`${id}:${eventName}`, handler);
    };
  }

  const registrations = installWritingPanelBasketEventHandlers({
    $: (id) => elements.get(id) || null,
    depsProvider: () => ({
      state: { notes: [{ id: "n1", title: "Note" }], selectedFileId: "n1" },
      writingState: {},
      writingNoteEligibility: () => ({ ok: true }),
      normalizeWritingProjectTitleSeed: (value) => value,
      continueWritingEntry: () => {
        calls.push(["continue", version]);
        return { addedNoteIds: ["n1"] };
      },
      handleWritingBasketManualInput: () => calls.push(["manual", version]),
      renderWritingPanel: () => calls.push(["render", version]),
      prepareWritingStrongModelAnalysis: async () => calls.push(["strong", version]),
      writingBasketEntries: () => [],
      setStatus: (message, tone) => calls.push(["status", version, message, tone])
    })
  });

  assert.equal(registrations.length, 10);
  assert.equal(registrations.every((item) => item.installed), true);

  handlers.get("btnWritingUseCurrent:click")();
  version = "second";
  handlers.get("writingBasketNoteIds:input")({});
  handlers.get("writingCandidateDetails:toggle")({ target: { open: true } });
  await handlers.get("btnWritingStrongModelAnalysis:click")();

  assert.deepEqual(calls[0], ["continue", "first"]);
  assert.deepEqual(calls.at(-3), ["manual", "second"]);
  assert.deepEqual(calls.at(-2), ["render", "second"]);
  assert.deepEqual(calls.at(-1), ["strong", "second"]);
});

test("writing panel contextual AI remote confirmation resumes outline check in place", async () => {
  const handlers = new Map();
  const calls = [];
  const elements = new Map([
    ["btnWritingUseCurrent", {}],
    ["btnWritingAddVisible", {}],
    ["btnWritingClearBasket", {}],
    ["writingBasketNoteIds", {}],
    ["btnWritingStrongModelAnalysis", {}],
    ["writingStrongModelSummary", {}],
    ["btnWritingLocalBookIdeas", {}],
    ["writingCandidateList", {}],
    ["writingBasketList", {}],
    ["writingCandidateDetails", {}]
  ]);
  for (const [id, element] of elements) {
    element.addEventListener = (eventName, handler) => {
      handlers.set(`${id}:${eventName}`, handler);
    };
  }
  installWritingPanelBasketEventHandlers({
    $: (id) => elements.get(id) || null,
    depsProvider: () => ({
      prepareWritingStrongModelAnalysis: async (options) => calls.push(["prepare", options]),
      renderWritingPanel: () => calls.push(["render"])
    })
  });

  await handlers.get("writingStrongModelSummary:click")({
    target: buttonTarget("[data-contextual-ai-ignore], [data-contextual-ai-confirm-remote], [data-contextual-ai-adopt]", {
      hasAttribute: (name) => name === "data-contextual-ai-confirm-remote"
    }),
    currentTarget: { querySelectorAll: () => [] }
  });

  assert.deepEqual(calls, [["prepare", { remoteConfirmed: true }], ["render"]]);
});

test("writing panel contextual AI remote confirmation uses a generic handler for non-outline actions", async () => {
  const handlers = new Map();
  const calls = [];
  const elements = new Map([
    ["btnWritingUseCurrent", {}],
    ["btnWritingAddVisible", {}],
    ["btnWritingClearBasket", {}],
    ["writingBasketNoteIds", {}],
    ["btnWritingStrongModelAnalysis", {}],
    ["writingStrongModelSummary", {}],
    ["btnWritingLocalBookIdeas", {}],
    ["writingCandidateList", {}],
    ["writingBasketList", {}],
    ["writingCandidateDetails", {}]
  ]);
  for (const [id, element] of elements) {
    element.addEventListener = (eventName, handler) => {
      handlers.set(`${id}:${eventName}`, handler);
    };
  }
  installWritingPanelBasketEventHandlers({
    $: (id) => elements.get(id) || null,
    depsProvider: () => ({
      confirmContextualAiAction: async (...args) => {
        calls.push(["confirm", ...args]);
        return true;
      },
      prepareWritingStrongModelAnalysis: async (...args) => calls.push(["prepare", ...args]),
      renderWritingPanel: () => calls.push(["render"])
    })
  });

  await handlers.get("writingStrongModelSummary:click")({
    target: buttonTarget(
      "[data-contextual-ai-ignore], [data-contextual-ai-confirm-remote], [data-contextual-ai-adopt]",
      contextualAiButton({ "data-contextual-ai-confirm-remote": true }, "suggest_theme")
    ),
    currentTarget: { querySelectorAll: () => [] }
  });

  assert.deepEqual(calls, [
    ["confirm", { actionId: "suggest_theme", remoteConfirmed: true }],
    ["render"]
  ]);
});

test("writing panel contextual AI remote confirmation does not run outline check for another action", async () => {
  const handlers = new Map();
  const calls = [];
  const elements = new Map([
    ["btnWritingUseCurrent", {}],
    ["btnWritingAddVisible", {}],
    ["btnWritingClearBasket", {}],
    ["writingBasketNoteIds", {}],
    ["btnWritingStrongModelAnalysis", {}],
    ["writingStrongModelSummary", {}],
    ["btnWritingLocalBookIdeas", {}],
    ["writingCandidateList", {}],
    ["writingBasketList", {}],
    ["writingCandidateDetails", {}]
  ]);
  for (const [id, element] of elements) {
    element.addEventListener = (eventName, handler) => {
      handlers.set(`${id}:${eventName}`, handler);
    };
  }
  installWritingPanelBasketEventHandlers({
    $: (id) => elements.get(id) || null,
    depsProvider: () => ({
      prepareWritingStrongModelAnalysis: async (...args) => calls.push(["prepare", ...args]),
      renderWritingPanel: () => calls.push(["render"]),
      setStatus: (...args) => calls.push(["status", ...args])
    })
  });

  await handlers.get("writingStrongModelSummary:click")({
    target: buttonTarget(
      "[data-contextual-ai-ignore], [data-contextual-ai-confirm-remote], [data-contextual-ai-adopt]",
      contextualAiButton({ "data-contextual-ai-confirm-remote": true }, "suggest_theme")
    ),
    currentTarget: { querySelectorAll: () => [] }
  });

  assert.deepEqual(calls, [
    ["status", "当前 AI 操作还不能在这里继续。", "warn"],
    ["render"]
  ]);
});

test("writing panel contextual AI adopt action passes edited values to the controller", async () => {
  const handlers = new Map();
  const calls = [];
  const elements = new Map([
    ["btnWritingUseCurrent", {}],
    ["btnWritingAddVisible", {}],
    ["btnWritingClearBasket", {}],
    ["writingBasketNoteIds", {}],
    ["btnWritingStrongModelAnalysis", {}],
    ["writingStrongModelSummary", {}],
    ["btnWritingLocalBookIdeas", {}],
    ["writingCandidateList", {}],
    ["writingBasketList", {}],
    ["writingCandidateDetails", {}]
  ]);
  for (const [id, element] of elements) {
    element.addEventListener = (eventName, handler) => {
      handlers.set(`${id}:${eventName}`, handler);
    };
  }
  installWritingPanelBasketEventHandlers({
    $: (id) => elements.get(id) || null,
    depsProvider: () => ({
      contextualAiController: {
        adopt: async (...args) => calls.push(["adopt", ...args])
      },
      renderWritingPanel: () => calls.push(["render"])
    })
  });

  await handlers.get("writingStrongModelSummary:click")({
    target: buttonTarget(
      "[data-contextual-ai-ignore], [data-contextual-ai-confirm-remote], [data-contextual-ai-adopt]",
      contextualAiButton({ "data-contextual-ai-adopt": true }, "suggest_theme")
    ),
    currentTarget: {
      querySelectorAll: () => [
        { getAttribute: (name) => name === "data-contextual-ai-field" ? "title" : "0", value: "  updated title  " },
        { getAttribute: (name) => name === "data-contextual-ai-field" ? "body" : "1", value: "updated body" }
      ]
    }
  });

  assert.deepEqual(calls, [
    ["adopt", "suggest_theme", { values: [
      { field: "title", index: 0, value: "updated title" },
      { field: "body", index: 1, value: "updated body" }
    ] }],
    ["render"]
  ]);
});

test("writing panel contextual AI close action uses the panel action id", async () => {
  const handlers = new Map();
  const calls = [];
  const elements = new Map([
    ["btnWritingUseCurrent", {}],
    ["btnWritingAddVisible", {}],
    ["btnWritingClearBasket", {}],
    ["writingBasketNoteIds", {}],
    ["btnWritingStrongModelAnalysis", {}],
    ["writingStrongModelSummary", {}],
    ["btnWritingLocalBookIdeas", {}],
    ["writingCandidateList", {}],
    ["writingBasketList", {}],
    ["writingCandidateDetails", {}]
  ]);
  for (const [id, element] of elements) {
    element.addEventListener = (eventName, handler) => {
      handlers.set(`${id}:${eventName}`, handler);
    };
  }
  installWritingPanelBasketEventHandlers({
    $: (id) => elements.get(id) || null,
    depsProvider: () => ({
      contextualAiController: {
        ignore: async (...args) => calls.push(["ignore", ...args])
      },
      renderWritingPanel: () => calls.push(["render"])
    })
  });

  await handlers.get("writingStrongModelSummary:click")({
    target: buttonTarget(
      "[data-contextual-ai-ignore], [data-contextual-ai-confirm-remote], [data-contextual-ai-adopt]",
      contextualAiButton({ "data-contextual-ai-ignore": true }, "recommend_relation")
    ),
    currentTarget: { querySelectorAll: () => [] }
  });

  assert.deepEqual(calls, [
    ["ignore", "recommend_relation"],
    ["render"]
  ]);
});

test("writing panel current-note handler validates note eligibility", () => {
  const calls = [];

  handleWritingUseCurrent({
    state: { notes: [{ id: "n1", title: "Note" }], selectedFileId: "n1" },
    writingNoteEligibility: () => ({ ok: false, key: "type", message: "wrong" }),
    setStatus: (message, tone) => calls.push([message, tone])
  });

  assert.equal(calls[0][1], "warn");
  assert.match(calls[0][0], /永久笔记/);
});

test("writing panel add-visible handler appends focused candidates", () => {
  const calls = [];

  handleWritingAddVisible({
    writingCandidateNotes: () => [{ id: "n1", title: "One" }, { id: "n2", title: "Two" }],
    writingState: { focusedCandidateNoteIds: ["n2"], focusedCandidateScopeLabel: "图谱范围" },
    planWritingCandidateFocus: ({ focusedNoteIds, focusedScopeLabel }) => ({
      usingFocusedScope: true,
      noteIds: focusedNoteIds,
      scopeLabel: focusedScopeLabel
    }),
    writingKnownNoteById: (id) => ({ id, title: id }),
    isWritingEligibleNote: () => true,
    suggestedWritingProjectTitle: (ids) => ids.join(","),
    continueWritingEntry: (ids, options) => {
      calls.push(["continue", ids, options]);
      return { addedNoteIds: ids };
    },
    describeWritingBatchAppendStatus: ({ scopeLabel, addedCount, totalCount }) => `${scopeLabel}:${addedCount}/${totalCount}`,
    setStatus: (message, tone) => calls.push(["status", message, tone])
  });

  assert.deepEqual(calls[0], ["continue", ["n2"], { title: "n2", source: "writing_panel_visible_notes" }]);
  assert.deepEqual(calls[1], ["status", "图谱范围:1/1", "ok"]);
});

test("writing panel add-visible handler only appends loaded candidates before expansion", () => {
  const calls = [];
  const notes = Array.from({ length: 16 }, (_, index) => ({ id: `n${index + 1}`, title: `Note ${index + 1}` }));

  handleWritingAddVisible({
    writingCandidateNotes: () => notes,
    planWritingCandidateFocus: ({ candidateNoteIds }) => ({
      usingFocusedScope: false,
      noteIds: candidateNoteIds,
      scopeLabel: "当前目录"
    }),
    suggestedWritingProjectTitle: (ids) => ids.join(","),
    continueWritingEntry: (ids, options) => {
      calls.push(["continue", ids, options]);
      return { addedNoteIds: ids };
    },
    describeWritingBatchAppendStatus: ({ addedCount, totalCount }) => `${addedCount}/${totalCount}`,
    setStatus: (message, tone) => calls.push(["status", message, tone])
  });

  assert.equal(calls[0][1].length, 12);
  assert.deepEqual(calls[0][1], notes.slice(0, 12).map((note) => note.id));
  assert.deepEqual(calls[1], ["status", "12/12", "ok"]);
});

test("writing panel add-visible handler appends all candidates after expansion", () => {
  const calls = [];
  const notes = Array.from({ length: 16 }, (_, index) => ({ id: `n${index + 1}`, title: `Note ${index + 1}` }));

  handleWritingAddVisible({
    writingCandidateNotes: () => notes,
    isWritingCandidateDetailsExpanded: () => true,
    planWritingCandidateFocus: ({ candidateNoteIds }) => ({
      usingFocusedScope: false,
      noteIds: candidateNoteIds,
      scopeLabel: "当前目录"
    }),
    suggestedWritingProjectTitle: (ids) => ids.join(","),
    continueWritingEntry: (ids, options) => {
      calls.push(["continue", ids, options]);
      return { addedNoteIds: ids };
    },
    describeWritingBatchAppendStatus: ({ addedCount, totalCount }) => `${addedCount}/${totalCount}`,
    setStatus: (message, tone) => calls.push(["status", message, tone])
  });

  assert.equal(calls[0][1].length, 16);
  assert.deepEqual(calls[1], ["status", "16/16", "ok"]);
});

test("writing note list handler routes add remove and open actions", () => {
  const calls = [];
  const deps = {
    writingKnownNoteById: (id) => ({ id, title: "Known" }),
    writingNoteById: (id) => ({ id, title: "Known" }),
    continueWritingEntry: (ids, options) => {
      calls.push(["continue", ids, options]);
      return { addedNoteIds: ids };
    },
    resetWritingStrongModelState: () => calls.push(["resetStrong"]),
    clearWritingSourceIndexIds: () => calls.push(["clearSource"]),
    removeWritingBasketId: (id) => calls.push(["remove", id]),
    renderWritingPanel: () => calls.push(["render"]),
    openNoteById: (id) => calls.push(["open", id]),
    setStatus: (message, tone) => calls.push(["status", message, tone])
  };

  handleWritingNoteListClick({ target: actionTarget("add") }, deps);
  handleWritingNoteListClick({ target: actionTarget("remove") }, deps);
  handleWritingNoteListClick({ target: actionTarget("open") }, deps);

  assert.deepEqual(calls[0], ["continue", ["n1"], { title: "Known", source: "writing_candidate_list" }]);
  assert.ok(calls.some((call) => call[0] === "remove" && call[1] === "n1"));
  assert.ok(calls.some((call) => call[0] === "open" && call[1] === "n1"));
});

test("writing theme index installer wires refresh save and list clicks through latest deps", async () => {
  const handlers = new Map();
  let version = "first";
  const calls = [];
  const elements = new Map([
    ["btnWritingRefreshThemeIndexes", {}],
    ["btnWritingDiscoverThemes", {}],
    ["btnWritingSaveThemeIndex", {}],
    ["writingThemeIndexList", {}],
    ["writingThemeDiscoverySuggestions", {}]
  ]);
  for (const [id, element] of elements) {
    element.addEventListener = (eventName, handler) => {
      handlers.set(`${id}:${eventName}`, handler);
    };
  }

  const registrations = installWritingThemeIndexEventHandlers({
    $: (id) => elements.get(id) || null,
    depsProvider: () => ({
      loadWritingThemeIndexes: async () => calls.push(["refresh", version]),
      refreshWritableThemeDiscoverySuggestions: async () => calls.push(["discover", version]),
      saveWritingBasketAsThemeIndex: async () => {
        calls.push(["save", version]);
        return { title: "Theme" };
      },
      saveWritableThemeDiscoverySuggestion: async (id, draft) => calls.push(["save-suggestion", version, id, draft.title]),
      selectWritingThemeIndex: async (id) => calls.push(["select", version, id]),
      writingThemeIndexContinuationRoute: () => ({ kind: "" }),
      setStatus: (message, tone) => calls.push(["status", version, message, tone])
    })
  });

  assert.equal(registrations.length, 5);
  assert.equal(registrations.every((item) => item.installed), true);

  await handlers.get("btnWritingRefreshThemeIndexes:click")();
  await handlers.get("btnWritingDiscoverThemes:click")();
  version = "second";
  await handlers.get("btnWritingSaveThemeIndex:click")();
  await handlers.get("writingThemeDiscoverySuggestions:click")({
    target: {
      closest: (selector) => {
        if (selector === "[data-theme-discovery-action]") {
          return {
            disabled: false,
            getAttribute: (name) => name === "data-theme-discovery-action" ? "save" : "",
            closest: () => ({
              getAttribute: (name) => name === "data-theme-discovery-suggestion-id" ? "suggestion-1" : "",
              querySelector: () => ({ value: "Edited suggestion" }),
              querySelectorAll: () => []
            })
          };
        }
        return null;
      }
    }
  });
  await handlers.get("writingThemeIndexList:click")({
    target: indexTarget("[data-writing-index-card-id]", { "data-writing-index-card-id": "idx1" })
  });

  assert.deepEqual(calls[0], ["refresh", "first"]);
  assert.ok(calls.some((call) => call[0] === "discover" && call[1] === "first"));
  assert.ok(calls.some((call) => call[0] === "save" && call[1] === "second"));
  assert.ok(calls.some((call) => call[0] === "save-suggestion" && call[1] === "second" && call[2] === "suggestion-1"));
  assert.ok(calls.some((call) => call[0] === "select" && call[1] === "second" && call[2] === "idx1"));
});

test("writing theme index list handler uses index cards and continuation routes", async () => {
  const calls = [];
  const deps = {
    selectWritingThemeIndex: async (id) => calls.push(["select", id]),
    writingThemeIndexContinuationRoute: ({ action, projectId }) =>
      action === "open-draft"
        ? { kind: "continue-project", projectId, openDraft: true, statusMessage: "resume", failurePrefix: "恢复可写主题" }
        : { kind: "" },
    continueWritingProjectEntry: async (projectId, options) => calls.push(["continue", projectId, options]),
    useThemeIndexAsWritingEntry: async (indexId, options) => {
      calls.push(["use", indexId, options]);
      return { indexCard: { title: "Theme" }, noteIds: ["n1", "n2"], addedCount: 2 };
    },
    setStatus: (message, tone) => calls.push(["status", message, tone])
  };

  await handleWritingThemeIndexListClick({
    target: indexTarget("[data-writing-index-action]", {
      "data-writing-index-action": "use",
      "data-writing-index-id": "idx1"
    })
  }, deps);
  await handleWritingThemeIndexListClick({
    target: indexTarget("[data-writing-index-action]", {
      "data-writing-index-action": "open-draft",
      "data-writing-project-id": "p1"
    })
  }, deps);

  assert.deepEqual(calls[0], ["use", "idx1", { replaceBasket: false, resetContext: false, source: "writing_theme_index_list" }]);
  assert.deepEqual(calls[2], ["continue", "p1", { openDraft: true, statusMessage: "resume" }]);
});

test("writing theme index actions show pending state and never fail silently", async () => {
  const calls = [];
  let resolveUse;
  const useButton = {
    disabled: false,
    textContent: "开始写",
    getAttribute: (name) => {
      if (name === "data-writing-index-action") return "use";
      if (name === "data-writing-index-id") return "idx1";
      return "";
    }
  };
  const usePromise = handleWritingThemeIndexListClick({
    target: buttonTarget("[data-writing-index-action]", useButton)
  }, {
    writingThemeIndexContinuationRoute: () => ({ kind: "" }),
    useThemeIndexAsWritingEntry: async () => new Promise((resolve) => {
      resolveUse = () => resolve({ indexCard: { title: "Theme" }, noteIds: ["n1"], addedCount: 1 });
    }),
    setStatus: (message, tone) => calls.push(["status", message, tone])
  });

  assert.equal(useButton.disabled, true);
  assert.equal(useButton.textContent, "正在选择...");
  resolveUse();
  await usePromise;
  assert.equal(useButton.disabled, false);
  assert.equal(useButton.textContent, "开始写");
  assert.ok(calls.some((call) => call[0] === "status" && call[2] === "ok"));

  const missingButton = {
    disabled: false,
    textContent: "继续草稿",
    getAttribute: (name) => name === "data-writing-index-action" ? "open-draft" : ""
  };
  await handleWritingThemeIndexListClick({
    target: buttonTarget("[data-writing-index-action]", missingButton)
  }, {
    writingThemeIndexContinuationRoute: () => ({ kind: "missing-project" }),
    setStatus: (message, tone) => calls.push(["status", message, tone])
  });

  assert.ok(calls.some((call) => call[0] === "status" && call[2] === "warn" && call[1].includes("没有可继续")));
});

test("writing theme detail installer wires the detail surface through latest deps", async () => {
  const handlers = new Map();
  let version = "first";
  const calls = [];
  const element = {
    addEventListener: (eventName, handler) => handlers.set(eventName, handler)
  };
  const registrations = installWritingThemeDetailEventHandlers({
    $: (id) => (id === "writingThemeDetail" ? element : null),
    depsProvider: () => ({
      saveSelectedThemeIndexDetail: async () => {
        calls.push(["save", version]);
        return { title: "Theme" };
      },
      setStatus: (message, tone) => calls.push(["status", version, message, tone])
    })
  });

  assert.deepEqual(registrations.map((item) => item.installed), [true]);

  await handlers.get("click")({
    target: indexTarget("[data-writing-theme-action]", { "data-writing-theme-action": "save" })
  });
  version = "second";
  await handlers.get("click")({
    target: indexTarget("[data-writing-theme-action]", { "data-writing-theme-action": "save" })
  });

  assert.deepEqual(calls[0], ["save", "first"]);
  assert.deepEqual(calls[2], ["save", "second"]);
});

test("writing theme detail handler routes use sync note and project actions", async () => {
  const calls = [];
  const deps = {
    saveSelectedThemeIndexDetail: async () => {
      calls.push(["save"]);
      return { id: "idx1", title: "Theme" };
    },
    useThemeIndexAsWritingEntry: async (indexId, options) => {
      calls.push(["use", indexId, options]);
      return { indexCard: { title: "Theme" }, noteIds: ["n1"], addedCount: 1 };
    },
    continueWritingProjectEntry: async (projectId, options) => calls.push(["continue", projectId, options]),
    writingThemeIndexById: () => ({ id: "idx1" }),
    findExistingWritingProjectForTheme: () => null,
    writingThemeIndexNoteIds: () => ["n1"],
    createWritingProjectFromThemeIndex: async (indexId) => {
      calls.push(["createProject", indexId]);
      return { id: "p1" };
    },
    syncSelectedThemeIndexWithBasket: async (mode) => {
      calls.push(["sync", mode]);
      return { id: "idx1", title: "Theme" };
    },
    activateModule: (moduleName) => calls.push(["activate", moduleName]),
    openNoteById: (noteId) => calls.push(["openNote", noteId]),
    removeNoteFromSelectedThemeIndex: async (noteId) => {
      calls.push(["removeNote", noteId]);
      return { id: "idx1", title: "Theme" };
    },
    setStatus: (message, tone) => calls.push(["status", message, tone])
  };

  await handleWritingThemeDetailClick({
    target: indexTarget("[data-writing-theme-action]", {
      "data-writing-theme-action": "use",
      "data-writing-theme-id": "idx1"
    })
  }, deps);
  await handleWritingThemeDetailClick({
    target: indexTarget("[data-writing-theme-action]", {
      "data-writing-theme-action": "create-project",
      "data-writing-theme-id": "idx1"
    })
  }, deps);
  await handleWritingThemeDetailClick({
    target: indexTarget("[data-writing-theme-action]", {
      "data-writing-theme-action": "append-from-basket"
    })
  }, deps);
  await handleWritingThemeDetailClick({
    target: indexTarget("[data-writing-theme-action]", {
      "data-writing-theme-action": "open-note",
      "data-writing-note-id": "n1"
    })
  }, deps);
  await handleWritingThemeDetailClick({
    target: indexTarget("[data-writing-theme-action]", {
      "data-writing-theme-action": "remove-note",
      "data-writing-note-id": "n1"
    })
  }, deps);

  assert.deepEqual(calls[0], ["use", "idx1", { replaceBasket: false, resetContext: false, source: "writing_theme_detail" }]);
  assert.ok(calls.some((call) => call[0] === "createProject" && call[1] === "idx1"));
  assert.ok(calls.some((call) => call[0] === "sync" && call[1] === "append"));
  assert.ok(calls.some((call) => call[0] === "activate" && call[1] === "explorer"));
  assert.ok(calls.some((call) => call[0] === "removeNote" && call[1] === "n1"));
});

test("writing theme detail handler resumes an existing project before creating another", async () => {
  const calls = [];

  await handleWritingThemeDetailClick({
    target: indexTarget("[data-writing-theme-action]", {
      "data-writing-theme-action": "create-project",
      "data-writing-theme-id": "idx1"
    })
  }, {
    writingThemeIndexById: () => ({ id: "idx1" }),
    findExistingWritingProjectForTheme: () => ({ id: "p1", draft_note_id: "d1" }),
    writingThemeIndexNoteIds: () => ["n1"],
    continueWritingProjectEntry: async (projectId, options) => calls.push(["continue", projectId, options]),
    createWritingProjectFromThemeIndex: async () => calls.push(["create"])
  });

  assert.deepEqual(calls, [["continue", "p1", { openDraft: true, statusMessage: "已从主题打开当前草稿：p1" }]]);
});

test("writing project list installer wires project actions through latest deps", async () => {
  const handlers = new Map();
  let version = "first";
  const calls = [];
  const element = {
    addEventListener: (eventName, handler) => handlers.set(eventName, handler)
  };
  const registrations = installWritingProjectListEventHandlers({
    $: (id) => (id === "writingProjectsList" ? element : null),
    depsProvider: () => ({
      openWritingProject: async (projectId) => calls.push(["open", version, projectId]),
      setStatus: (message, tone) => calls.push(["status", version, message, tone])
    })
  });

  assert.deepEqual(registrations.map((item) => item.installed), [true]);

  await handlers.get("click")({
    target: indexTarget("[data-writing-project-action]", {
      "data-writing-project-action": "open",
      "data-writing-project-id": "p1"
    })
  });
  version = "second";
  await handlers.get("click")({
    target: indexTarget("[data-writing-project-action]", {
      "data-writing-project-action": "open",
      "data-writing-project-id": "p2"
    })
  });

  assert.deepEqual(calls[0], ["open", "first", "p1"]);
  assert.deepEqual(calls[2], ["open", "second", "p2"]);
});

test("writing project list handler routes continue open copy and export actions", async () => {
  const calls = [];
  const deps = {
    writingState: { projects: [{ id: "p1", title: "Project" }] },
    continueWritingProjectEntry: async (projectId, options) => calls.push(["continue", projectId, options]),
    openWritingProject: async (projectId) => calls.push(["open", projectId]),
    copyWritingScaffold: async (project) => {
      calls.push(["copy", project.id]);
      return { fileName: "scaffold.md" };
    },
    exportWritingScaffold: async (project) => {
      calls.push(["export", project.id]);
      return { fileName: "scaffold.md" };
    },
    setStatus: (message, tone) => calls.push(["status", message, tone])
  };

  await handleWritingProjectsListClick({
    target: indexTarget("[data-writing-project-action]", {
      "data-writing-project-action": "open-draft",
      "data-writing-project-id": "p1"
    })
  }, deps);
  await handleWritingProjectsListClick({
    target: indexTarget("[data-writing-project-action]", {
      "data-writing-project-action": "open",
      "data-writing-project-id": "p1"
    })
  }, deps);
  await handleWritingProjectsListClick({
    target: indexTarget("[data-writing-project-action]", {
      "data-writing-project-action": "copy-scaffold",
      "data-writing-project-id": "p1"
    })
  }, deps);
  await handleWritingProjectsListClick({
    target: indexTarget("[data-writing-project-action]", {
      "data-writing-project-action": "export-scaffold",
      "data-writing-project-id": "p1"
    })
  }, deps);

  assert.deepEqual(calls[0], ["continue", "p1", { openDraft: true, statusMessage: "已从最近写作打开当前草稿：p1" }]);
  assert.ok(calls.some((call) => call[0] === "open" && call[1] === "p1"));
  assert.ok(calls.some((call) => call[0] === "copy" && call[1] === "p1"));
  assert.ok(calls.some((call) => call[0] === "export" && call[1] === "p1"));
});

test("writing project history installer wires version lists filters and refreshes through latest deps", async () => {
  const handlers = new Map();
  let version = "first";
  const calls = [];
  const elements = new Map([
    ["writingScaffoldVersionsList", {}],
    ["writingDraftVersionsList", {}],
    ["btnWritingRefreshProjects", {}],
    ["writingProjectsSearch", {}],
    ["writingProjectsStatusFilter", {}],
    ["writingProjectsDraftFilter", {}],
    ["btnWritingRefreshScaffolds", {}],
    ["btnWritingRefreshDraftVersions", {}]
  ]);
  for (const [id, element] of elements) {
    element.addEventListener = (eventName, handler) => handlers.set(`${id}:${eventName}`, handler);
  }

  const registrations = installWritingProjectHistoryEventHandlers({
    $: (id) => elements.get(id) || null,
    depsProvider: () => ({
      writingState: { scaffoldVersions: [], draftVersions: [] },
      syncWritingProjectFiltersFromUi: () => calls.push(["sync", version]),
      loadWritingProjectsList: async () => calls.push(["projects", version]),
      loadWritingScaffoldVersions: async () => calls.push(["scaffolds", version]),
      loadWritingDraftVersions: async () => calls.push(["drafts", version]),
      setStatus: (message, tone) => calls.push(["status", version, message, tone])
    })
  });

  assert.equal(registrations.length, 8);
  assert.equal(registrations.every((item) => item.installed), true);

  await handlers.get("btnWritingRefreshProjects:click")();
  version = "second";
  await handlers.get("writingProjectsSearch:input")();
  await handlers.get("btnWritingRefreshScaffolds:click")();
  await handlers.get("btnWritingRefreshDraftVersions:click")();

  assert.deepEqual(calls[0], ["sync", "first"]);
  assert.ok(calls.some((call) => call[0] === "projects" && call[1] === "second"));
  assert.ok(calls.some((call) => call[0] === "scaffolds" && call[1] === "second"));
  assert.ok(calls.some((call) => call[0] === "drafts" && call[1] === "second"));
});

test("writing scaffold version handler routes open copy export and note edits", async () => {
  const calls = [];
  const writingState = {
    project: { id: "p1" },
    scaffold: { id: "s1", version_note: "old" },
    scaffoldVersions: [{ id: "s1", version_note: "old" }]
  };
  const deps = {
    writingState,
    openScaffoldVersion: async (id) => calls.push(["open", id]),
    copyWritingScaffold: async (project) => {
      calls.push(["copy", project.scaffold_id]);
      return { fileName: "s.md" };
    },
    exportWritingScaffold: async (project) => {
      calls.push(["export", project.scaffold_id]);
      return { fileName: "s.md" };
    },
    promptVersionNoteEdit: () => "new",
    updateDraftScaffoldVersionNote: async (id, note) => {
      calls.push(["updateNote", id, note]);
      return { version_note: note };
    },
    renderWritingPanel: () => calls.push(["render"]),
    setStatus: (message, tone) => calls.push(["status", message, tone])
  };

  for (const action of ["open", "copy", "export", "edit-note"]) {
    await handleWritingScaffoldVersionsListClick({
      target: indexTarget("[data-writing-scaffold-action]", {
        "data-writing-scaffold-action": action,
        "data-writing-scaffold-id": "s1"
      })
    }, deps);
  }

  assert.ok(calls.some((call) => call[0] === "open" && call[1] === "s1"));
  assert.ok(calls.some((call) => call[0] === "copy" && call[1] === "s1"));
  assert.ok(calls.some((call) => call[0] === "export" && call[1] === "s1"));
  assert.deepEqual(calls.find((call) => call[0] === "updateNote"), ["updateNote", "s1", "new"]);
  assert.equal(writingState.scaffold.version_note, "new");
  assert.equal(writingState.scaffoldVersions[0].version_note, "new");
});

test("writing draft version handler updates current draft and opens unloaded notes", async () => {
  const calls = [];
  const state = { notes: [] };
  const writingState = {
    project: { id: "p1" },
    draftVersions: [{ id: "v1", version_note: "old" }]
  };
  const deps = {
    state,
    writingState,
    promptVersionNoteEdit: () => "new",
    updateDraftNoteVersionNote: async (id, note) => {
      calls.push(["updateNote", id, note]);
      return { version_note: note };
    },
    setWritingCurrentDraftNote: async (projectId, noteId) => {
      calls.push(["setCurrent", projectId, noteId]);
      return { id: projectId, draft_note_id: noteId };
    },
    loadWritingProjectsList: async () => calls.push(["projects"]),
    loadWritingDraftVersions: async () => calls.push(["drafts"]),
    renderWritingPanel: () => calls.push(["render"]),
    writingNoteById: () => null,
    fetchNote: async (id) => ({ id, title: "Draft" }),
    mapNoteItem: (note) => ({ ...note, mapped: true }),
    activateModule: (moduleName) => calls.push(["activate", moduleName]),
    openNoteById: (noteId) => calls.push(["open", noteId]),
    setStatus: (message, tone) => calls.push(["status", message, tone])
  };

  await handleWritingDraftVersionsListClick({
    target: indexTarget("[data-writing-draft-action]", {
      "data-writing-draft-action": "edit-note",
      "data-writing-draft-note-id": "n1",
      "data-writing-draft-version-id": "v1"
    })
  }, deps);
  await handleWritingDraftVersionsListClick({
    target: indexTarget("[data-writing-draft-action]", {
      "data-writing-draft-action": "set-current",
      "data-writing-draft-note-id": "n1",
      "data-writing-draft-version-id": "v1"
    })
  }, deps);
  await handleWritingDraftVersionsListClick({
    target: indexTarget("[data-writing-draft-action]", {
      "data-writing-draft-action": "open",
      "data-writing-draft-note-id": "n1",
      "data-writing-draft-version-id": "v1"
    })
  }, deps);

  assert.deepEqual(calls.find((call) => call[0] === "updateNote"), ["updateNote", "v1", "new"]);
  assert.deepEqual(calls.find((call) => call[0] === "setCurrent"), ["setCurrent", "p1", "n1"]);
  assert.equal(writingState.project.draft_note_id, "n1");
  assert.equal(writingState.draftVersions[0].version_note, "new");
  assert.equal(state.notes[0].mapped, true);
  assert.ok(calls.some((call) => call[0] === "activate" && call[1] === "explorer"));
  assert.ok(calls.some((call) => call[0] === "open" && call[1] === "n1"));
});

test("writing draft action installer wires primary draft buttons through latest deps", async () => {
  const handlers = new Map();
  let version = "first";
  const calls = [];
  const writingState = { project: { id: "p1", draft_note_id: "n1" }, scaffold: { id: "s1" }, scaffoldMarkdown: "outline" };
  const elements = new Map([
    ["btnWritingCreateProject", {}],
    ["btnWritingCreateScaffold", { textContent: "" }],
    ["btnWritingCopyScaffold", {}],
    ["btnWritingExportScaffold", {}],
    ["btnWritingSaveDraft", { textContent: "" }],
    ["btnWritingOpenDraft", {}],
    ["writingDraftEditor", {}],
    ["writingTitle", {}],
    ["writingGoal", {}],
    ["writingScaffoldPreview", {}],
    ["btnWritingStartDraft", {}],
    ["btnWritingOutlineCheckPlaceholder", {}],
    ["writingPanel", {}]
  ]);
  for (const [id, element] of elements) {
    element.addEventListener = (eventName, handler) => handlers.set(`${id}:${eventName}`, handler);
  }

  const registrations = installWritingDraftActionEventHandlers({
    $: (id) => elements.get(id) || null,
    depsProvider: () => ({
      $: (id) => elements.get(id) || null,
      writingState,
      createWritingProjectFromCurrentBasket: async () => calls.push(["createProject", version]),
      describeWritingProjectPreflight: () => ({ level: "ready" }),
      createDraftScaffold: async () => {
        calls.push(["createScaffold", version]);
        return { item: { id: "s1" }, export: { markdown: "md" } };
      },
      copyWritingScaffold: async () => {
        calls.push(["copy", version]);
        return { fileName: "s.md" };
      },
      exportWritingScaffold: async () => {
        calls.push(["export", version]);
        return { fileName: "s.md" };
      },
      openWritingDraftNoteById: async (noteId) => calls.push(["openDraft", version, noteId]),
      prepareWritingStrongModelAnalysis: async () => calls.push(["check-outline", version]),
      writingDraftBody: () => "# Draft from outline",
      loadWritingProjectsList: async () => calls.push(["projects", version]),
      loadWritingScaffoldVersions: async () => calls.push(["scaffolds", version]),
      loadWritingDraftVersions: async () => calls.push(["drafts", version]),
      renderWritingPanel: () => calls.push(["render", version]),
      setStatus: (message, tone) => calls.push(["status", version, message, tone])
    })
  });

  assert.equal(registrations.length, 15);
  assert.equal(registrations.every((item) => item.installed), true);

  await handlers.get("btnWritingCreateProject:click")();
  version = "second";
  await handlers.get("btnWritingCreateScaffold:click")();
  await handlers.get("btnWritingCopyScaffold:click")();
  await handlers.get("btnWritingExportScaffold:click")();
  await handlers.get("btnWritingOpenDraft:click")();
  handlers.get("writingDraftEditor:input")({ target: { value: "edited draft" } });
  assert.equal(writingState.draftSaveState, "dirty");
  handlers.get("writingScaffoldPreview:input")({
    target: {
      value: "live outline",
      closest: (selector) => selector === "[data-writing-outline-field]"
        ? {
            value: "live outline",
            getAttribute: (name) => {
              if (name === "data-writing-outline-index") return "0";
              if (name === "data-writing-outline-field") return "heading";
              return "";
            }
          }
        : null
    }
  });
  handlers.get("btnWritingStartDraft:click")();
  await handlers.get("btnWritingOutlineCheckPlaceholder:click")();
  await handlers.get("writingPanel:click")({
    target: {
      closest: (selector) => selector === "#btnWritingOutlineCheckPlaceholder" ? {} : null
    }
  });

  assert.deepEqual(calls[0], ["createProject", "first"]);
  assert.ok(calls.some((call) => call[0] === "createScaffold" && call[1] === "second"));
  assert.ok(calls.some((call) => call[0] === "copy" && call[1] === "second"));
  assert.ok(calls.some((call) => call[0] === "export" && call[1] === "second"));
  assert.ok(calls.some((call) => call[0] === "openDraft" && call[1] === "second" && call[2] === "n1"));
  assert.equal(writingState.draftMarkdown, "edited draft");
  assert.equal(writingState.scaffoldMarkdown, "md");
  assert.equal(calls.filter((call) => call[0] === "check-outline" && call[1] === "second").length, 2);
});

test("writing outline handlers edit sections and report status", () => {
  const calls = [];
  const writingState = {
    project: { title: "主题" },
    scaffold: {
      sections: [{ heading: "旧标题", purpose: "" }],
      open_questions: []
    },
    scaffoldMarkdown: ""
  };
  const deps = {
    writingState,
    renderWritingPanel: () => calls.push(["render"]),
    setStatus: (message, tone) => calls.push(["status", message, tone])
  };

  const inputOk = handleWritingOutlineInput({
    target: {
      value: "新标题",
      closest: (selector) => selector === "[data-writing-outline-field]"
        ? {
            value: "新标题",
            getAttribute: (name) => {
              if (name === "data-writing-outline-index") return "0";
              if (name === "data-writing-outline-field") return "heading";
              return "";
            }
          }
        : null
    }
  }, deps);
  assert.equal(inputOk, true);
  assert.equal(writingState.scaffold.sections[0].heading, "新标题");

  const clickOk = handleWritingOutlineClick({
    target: {
      closest: (selector) => selector === "[data-writing-outline-action]"
        ? {
            getAttribute: (name) => {
              if (name === "data-writing-outline-index") return "0";
              if (name === "data-writing-outline-action") return "add";
              return "";
            }
          }
        : null
    }
  }, deps);

  assert.equal(clickOk, true);
  assert.equal(writingState.scaffold.sections.length, 2);
  assert.ok(calls.some((call) => call[0] === "render"));
  assert.ok(calls.some((call) => call[0] === "status" && call[2] === "ok"));
});

test("writing start draft uses the current edited outline before a draft exists", () => {
  const draftEditor = { value: "" };
  const writingState = {
    project: { id: "p1" },
    scaffoldMarkdown: "# Edited outline"
  };

  const ok = handleWritingStartDraftClick({
    $: (id) => id === "writingDraftEditor" ? draftEditor : null,
    writingState,
    writingDraftBody: () => "# Edited outline\n\n正文起点"
  });

  assert.equal(ok, true);
  assert.equal(writingState.draftMarkdown, "# Edited outline\n\n正文起点");
  assert.equal(draftEditor.value, "# Edited outline\n\n正文起点");
});

test("writing outline saves changes in edit order and only applies the latest response", async () => {
  const requests = [];
  const resolvers = [];
  const writingState = {
    scaffold: {
      id: "scaffold-1",
      sections: [{ heading: "第一节", purpose: "" }],
      open_questions: []
    },
    scaffoldMarkdown: ""
  };
  const deps = {
    writingState,
    updateDraftScaffold: (id, payload) => new Promise((resolve) => {
      requests.push({ id, payload });
      resolvers.push(() => resolve({ id, ...payload, markdown: payload.sections[0].heading }));
    }),
    renderWritingPanel: () => {},
    setStatus: () => {}
  };

  const firstSave = persistWritingOutline(deps);
  await Promise.resolve();
  writingState.scaffold.sections[0].heading = "第二节";
  const secondSave = persistWritingOutline(deps);
  await Promise.resolve();

  assert.equal(requests.length, 1);
  assert.equal(requests[0].payload.sections[0].heading, "第一节");

  resolvers.shift()();
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(requests.length, 2);
  assert.equal(requests[1].payload.sections[0].heading, "第二节");

  resolvers.shift()();
  await Promise.all([firstSave, secondSave]);

  assert.equal(writingState.scaffold.sections[0].heading, "第二节");
  assert.equal(writingState.scaffoldMarkdown, "第二节");
});

test("writing workbench persists topic, outline, and material changes for an existing project", async () => {
  const calls = [];
  const inputs = new Map([
    ["writingTitle", { value: "更新后的题目" }],
    ["writingGoal", { value: "更新后的中心问题" }],
    ["writingAudience", { value: "读者" }],
    ["writingTone", { value: "冷静" }]
  ]);
  const writingState = {
    project: {
      id: "project-1",
      title: "旧题目",
      goal: "旧问题",
      audience: "读者",
      tone: "冷静",
      intent: "意图",
      desired_reader_takeaway: "收获",
      related_index_ids: ["theme-1"],
      status: "draft",
      basket_note_ids: ["n1"]
    },
    scaffold: {
      id: "scaffold-1",
      sections: [{ heading: "第一节", purpose: "说明", evidence_note_ids: ["n1"] }],
      open_questions: []
    },
    scaffoldMarkdown: "旧提纲"
  };
  const deps = {
    $: (id) => inputs.get(id) || null,
    writingState,
    parseWritingBasketIds: () => ["n1"],
    setWritingBasketIds: (ids) => calls.push(["set-basket", ids]),
    uniqueStrings: (ids) => [...new Set(ids)],
    syncWritingProject: async (id, payload) => {
      calls.push(["sync", id, payload]);
      return { ...writingState.project, ...payload, basket_note_ids: payload.basketNoteIds };
    },
    updateDraftScaffold: async (id, payload) => {
      calls.push(["outline", id, payload]);
      return { ...writingState.scaffold, ...payload, markdown: "新提纲" };
    },
    renderWritingPanel: () => calls.push(["render"]),
    setStatus: (message, tone) => calls.push(["status", message, tone]),
    writingKnownNoteById: (id) => ({ id, title: id }),
    writingNoteById: (id) => ({ id, title: id })
  };

  await persistWritingProjectForm(deps);
  await persistWritingOutline(deps);
  await handleWritingNoteListClick({ target: actionTarget("add", "n2") }, deps);

  assert.equal(calls.filter((call) => call[0] === "sync").length, 2);
  assert.deepEqual(calls.find((call) => call[0] === "sync")[2].basketNoteIds, ["n1"]);
  assert.deepEqual(calls.find((call) => call[0] === "outline")[2].sections[0].heading, "第一节");
  assert.equal(writingState.scaffoldMarkdown, "新提纲");
  assert.ok(calls.some((call) => call[0] === "set-basket" && call[1].includes("n2")));
  assert.equal(writingState.project.id, "project-1");
});

test("writing create scaffold handler resumes continuation before warning about missing project", async () => {
  const calls = [];

  await handleWritingCreateScaffoldClick({
    $: () => ({ textContent: "create" }),
    writingState: {},
    describeWritingProjectPreflight: () => ({ level: "ready" }),
    currentWritingContinuationEntry: () => ({ projectId: "p1", action: "open-draft" }),
    continueWritingProjectEntry: async (projectId, options) => calls.push(["continue", projectId, options]),
    writingCenterContinuationStatusMessage: () => "resume",
    setStatus: (message, tone) => calls.push(["status", message, tone])
  });

  assert.deepEqual(calls, [["continue", "p1", { openDraft: true, statusMessage: "resume" }]]);
});

test("writing create scaffold handler creates project from selected theme", async () => {
  const calls = [];
  const writingState = {
    selectedThemeIndexId: "theme-1",
    project: null
  };

  await handleWritingCreateScaffoldClick({
    $: () => ({ textContent: "生成提纲" }),
    writingState,
    describeWritingProjectPreflight: () => ({ level: "ready" }),
    createWritingProjectFromThemeIndex: async (themeId) => {
      calls.push(["theme-project", themeId]);
      writingState.project = { id: "p-theme", preflight: {} };
    },
    createDraftScaffold: async (projectId) => {
      calls.push(["scaffold", projectId]);
      return {
        item: { id: "s-theme", sections: [], writing_project: { id: projectId, scaffold_id: "s-theme" } },
        export: { markdown: "outline" }
      };
    },
    showWritingResult: (payload) => calls.push(["result", payload.writingProjectId, payload.draftScaffoldId]),
    loadWritingProjectsList: async () => calls.push(["projects"]),
    loadWritingScaffoldVersions: async () => calls.push(["scaffolds"]),
    loadWritingDraftVersions: async () => calls.push(["drafts"]),
    renderWritingPanel: () => calls.push(["render"])
  });

  assert.deepEqual(calls.slice(0, 3), [
    ["theme-project", "theme-1"],
    ["scaffold", "p-theme"],
    ["result", "p-theme", "s-theme"]
  ]);
  assert.equal(writingState.project.scaffold_id, "s-theme");
});

test("writing create scaffold and save draft handlers persist generated state", async () => {
  const calls = [];
  const state = { notes: [] };
  const actionFeedback = { textContent: "", hidden: true, dataset: {} };
  const createScaffoldButton = { textContent: "生成提纲", disabled: false };
  const writingState = {
    project: { id: "p1", preflight: {} }
  };
  const sharedDeps = {
    $: (id) => {
      if (id === "writingActionFeedback") return actionFeedback;
      if (id === "btnWritingCreateScaffold") return createScaffoldButton;
      return { textContent: "" };
    },
    state,
    writingState,
    currentWritingVersionNote: () => "note",
    showWritingResult: (payload) => calls.push(["result", payload.stage, payload.noteId || payload.draftScaffoldId]),
    loadWritingProjectsList: async () => calls.push(["projects"]),
    loadWritingScaffoldVersions: async () => calls.push(["scaffolds"]),
    loadWritingDraftVersions: async () => calls.push(["drafts"]),
    renderWritingPanel: () => calls.push(["render"]),
    applyWritingTab: (tab) => calls.push(["tab", tab]),
    setStatus: (message, tone) => calls.push(["status", message, tone])
  };

  await handleWritingCreateScaffoldClick({
    ...sharedDeps,
    createDraftScaffold: async () => ({
      item: { id: "s1", sections: [], writing_project: { scaffold_id: "s1" }, version_note: "note" },
      export: { markdown: "body" }
    })
  });

  await handleWritingSaveDraftClick({
    ...sharedDeps,
    writingDraftDirectoryId: () => "dir1",
    writingDraftTitle: () => "Writing UI Project",
    writingDraftBody: () => "# Writing UI Project 草稿\n\nbody",
    createNote: async (payload) => {
      calls.push(["create-note", payload.title, payload.body]);
      return { id: "n1", title: payload.title };
    },
    bindWritingDraftNote: async (projectId, noteId, scaffoldId, versionNote) => {
      calls.push(["bind", projectId, noteId, scaffoldId, versionNote]);
      return { id: projectId, draft_note_id: noteId };
    },
    mapNoteItem: (note) => ({ ...note, mapped: true })
  });

  assert.equal(writingState.scaffold.id, "s1");
  assert.equal(writingState.scaffoldMarkdown, "body");
  assert.equal(actionFeedback.hidden, false);
  assert.equal(actionFeedback.textContent, "提纲已生成。现在可以编辑章节，或开始写草稿。");
  assert.equal(actionFeedback.dataset.tone, "ok");
  assert.equal(createScaffoldButton.disabled, false);
  assert.ok(calls.some((call) => call[0] === "tab" && call[1] === "outline"));
  assert.equal(writingState.project.draft_note_id, "n1");
  assert.equal(state.notes[0].mapped, true);
  assert.ok(calls.some((call) => call[0] === "create-note" && call[1] === "Writing UI Project" && /^# Writing UI Project/.test(call[2])));
  assert.ok(calls.some((call) => call[0] === "bind" && call[1] === "p1" && call[2] === "n1" && call[3] === "s1"));
});

test("writing save draft updates the current draft instead of creating another version", async () => {
  const calls = [];
  const saveButton = { textContent: "保存草稿", disabled: false };
  const writingState = {
    project: { id: "p1", draft_note_id: "n1", draft_note: { id: "n1", body: "old" } },
    scaffold: { id: "s1" },
    scaffoldMarkdown: "# Updated draft\n\nbody"
  };

  await handleWritingSaveDraftClick({
    $: (id) => id === "btnWritingSaveDraft" ? saveButton : null,
    state: { notes: [] },
    writingState,
    writingDraftDirectoryId: () => "dir1",
    writingDraftTitle: () => "Writing UI Project",
    writingDraftBody: () => "# Writing UI Project 草稿\n\nupdated body",
    createNote: async () => {
      calls.push("create");
      return { id: "unexpected" };
    },
    updateNote: async (noteId, payload) => {
      calls.push(["update", noteId, payload]);
      return { id: noteId, title: payload.title, body: payload.body };
    },
    bindWritingDraftNote: async () => {
      calls.push("bind");
      return null;
    },
    mapNoteItem: (note) => note,
    loadWritingProjectsList: async () => {},
    loadWritingScaffoldVersions: async () => {},
    loadWritingDraftVersions: async () => {},
    renderWritingPanel: () => {},
    setStatus: (message) => calls.push(["status", message])
  });

  assert.deepEqual(calls.find((call) => Array.isArray(call) && call[0] === "update")?.slice(0, 2), ["update", "n1"]);
  assert.equal(calls.includes("create"), false);
  assert.equal(calls.includes("bind"), false);
  assert.equal(writingState.project.draft_note_id, "n1");
  assert.match(writingState.draftMarkdown, /updated body/);
  assert.equal(writingState.draftSaveState, "saved");
  assert.equal(saveButton.disabled, false);
  assert.equal(saveButton.textContent, "已保存");
  assert.ok(calls.some((call) => Array.isArray(call) && call[0] === "status" && call[1] === "草稿已保存"));
});

test("writing save draft keeps retry feedback on the button after failure", async () => {
  const saveButton = { textContent: "保存草稿", disabled: false };
  const calls = [];
  const writingState = {
    project: { id: "p1", draft_note_id: "n1" },
    scaffold: { id: "s1" },
    scaffoldMarkdown: "outline"
  };

  await handleWritingSaveDraftClick({
    $: (id) => id === "btnWritingSaveDraft" ? saveButton : null,
    state: { notes: [] },
    writingState,
    writingDraftDirectoryId: () => "dir1",
    writingDraftTitle: () => "文章",
    writingDraftBody: () => "# 文章\n\n正文",
    updateNote: async () => {
      assert.equal(saveButton.disabled, true);
      assert.equal(saveButton.textContent, "正在保存...");
      throw new Error("network down");
    },
    setStatus: (message, tone) => calls.push([message, tone])
  });

  assert.equal(saveButton.disabled, false);
  assert.equal(saveButton.textContent, "保存失败，重试");
  assert.equal(writingState.draftSaveState, "error");
  assert.ok(calls.some(([message, tone]) => message.includes("network down") && tone === "bad"));
});
