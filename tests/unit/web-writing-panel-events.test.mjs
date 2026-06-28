import test from "node:test";
import assert from "node:assert/strict";

import {
  handleWritingAddVisible,
  handleWritingNoteListClick,
  handleWritingThemeDetailClick,
  handleWritingThemeIndexListClick,
  handleWritingUseCurrent,
  installWritingPanelBasketEventHandlers,
  installWritingThemeDetailEventHandlers,
  installWritingThemeIndexEventHandlers
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

function indexTarget(selector, attrs = {}) {
  return {
    closest: (requested) => requested === selector
      ? {
          getAttribute: (name) => attrs[name] || ""
        }
      : null
  };
}

test("writing panel basket installer wires core basket controls through latest deps", async () => {
  const handlers = new Map();
  let version = "first";
  const calls = [];
  const elements = new Map([
    ["btnWritingUseCurrent", {}],
    ["btnWritingAddVisible", {}],
    ["btnWritingClearBasket", {}],
    ["writingBasketNoteIds", {}],
    ["btnWritingStrongModelAnalysis", {}],
    ["btnWritingLocalBookIdeas", {}],
    ["writingCandidateList", {}],
    ["writingBasketList", {}]
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
      prepareWritingStrongModelAnalysis: async () => calls.push(["strong", version]),
      writingBasketEntries: () => [],
      setStatus: (message, tone) => calls.push(["status", version, message, tone])
    })
  });

  assert.equal(registrations.length, 8);
  assert.equal(registrations.every((item) => item.installed), true);

  handlers.get("btnWritingUseCurrent:click")();
  version = "second";
  handlers.get("writingBasketNoteIds:input")({});
  await handlers.get("btnWritingStrongModelAnalysis:click")();

  assert.deepEqual(calls[0], ["continue", "first"]);
  assert.deepEqual(calls.at(-2), ["manual", "second"]);
  assert.deepEqual(calls.at(-1), ["strong", "second"]);
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
    writingState: { focusedCandidateNoteIds: ["n2"], focusedCandidateScopeLabel: "图谱切片" },
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
  assert.deepEqual(calls[1], ["status", "图谱切片:1/1", "ok"]);
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
    ["btnWritingSaveThemeIndex", {}],
    ["writingThemeIndexList", {}]
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
      saveWritingBasketAsThemeIndex: async () => {
        calls.push(["save", version]);
        return { title: "Theme" };
      },
      selectWritingThemeIndex: async (id) => calls.push(["select", version, id]),
      writingThemeIndexContinuationRoute: () => ({ kind: "" }),
      setStatus: (message, tone) => calls.push(["status", version, message, tone])
    })
  });

  assert.equal(registrations.length, 3);
  assert.equal(registrations.every((item) => item.installed), true);

  await handlers.get("btnWritingRefreshThemeIndexes:click")();
  version = "second";
  await handlers.get("btnWritingSaveThemeIndex:click")();
  await handlers.get("writingThemeIndexList:click")({
    target: indexTarget("[data-writing-index-card-id]", { "data-writing-index-card-id": "idx1" })
  });

  assert.deepEqual(calls[0], ["refresh", "first"]);
  assert.deepEqual(calls[2], ["save", "second"]);
  assert.ok(calls.some((call) => call[0] === "select" && call[1] === "second" && call[2] === "idx1"));
});

test("writing theme index list handler uses index cards and continuation routes", async () => {
  const calls = [];
  const deps = {
    selectWritingThemeIndex: async (id) => calls.push(["select", id]),
    writingThemeIndexContinuationRoute: ({ action, projectId }) =>
      action === "open-draft"
        ? { kind: "continue-project", projectId, openDraft: true, statusMessage: "resume", failurePrefix: "恢复项目" }
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
