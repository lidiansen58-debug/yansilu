import test from "node:test";
import assert from "node:assert/strict";

import {
  handleWritingAddVisible,
  handleWritingCreateScaffoldClick,
  handleWritingDraftVersionsListClick,
  handleWritingNoteListClick,
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

  assert.deepEqual(calls[0], ["continue", "p1", { openDraft: true, statusMessage: "已从项目列表打开当前草稿：p1" }]);
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
  const elements = new Map([
    ["btnWritingCreateProject", {}],
    ["btnWritingCreateScaffold", { textContent: "" }],
    ["btnWritingCopyScaffold", {}],
    ["btnWritingExportScaffold", {}],
    ["btnWritingSaveDraft", { textContent: "" }],
    ["btnWritingOpenDraft", {}]
  ]);
  for (const [id, element] of elements) {
    element.addEventListener = (eventName, handler) => handlers.set(`${id}:${eventName}`, handler);
  }

  const registrations = installWritingDraftActionEventHandlers({
    $: (id) => elements.get(id) || null,
    depsProvider: () => ({
      $: (id) => elements.get(id) || null,
      writingState: { project: { id: "p1", draft_note_id: "n1" }, scaffold: { id: "s1" }, scaffoldMarkdown: "md" },
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
      loadWritingProjectsList: async () => calls.push(["projects", version]),
      loadWritingScaffoldVersions: async () => calls.push(["scaffolds", version]),
      loadWritingDraftVersions: async () => calls.push(["drafts", version]),
      renderWritingPanel: () => calls.push(["render", version]),
      setStatus: (message, tone) => calls.push(["status", version, message, tone])
    })
  });

  assert.equal(registrations.length, 6);
  assert.equal(registrations.every((item) => item.installed), true);

  await handlers.get("btnWritingCreateProject:click")();
  version = "second";
  await handlers.get("btnWritingCreateScaffold:click")();
  await handlers.get("btnWritingCopyScaffold:click")();
  await handlers.get("btnWritingExportScaffold:click")();
  await handlers.get("btnWritingOpenDraft:click")();

  assert.deepEqual(calls[0], ["createProject", "first"]);
  assert.ok(calls.some((call) => call[0] === "createScaffold" && call[1] === "second"));
  assert.ok(calls.some((call) => call[0] === "copy" && call[1] === "second"));
  assert.ok(calls.some((call) => call[0] === "export" && call[1] === "second"));
  assert.ok(calls.some((call) => call[0] === "openDraft" && call[1] === "second" && call[2] === "n1"));
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

test("writing create scaffold and save draft handlers persist generated state", async () => {
  const calls = [];
  const state = { notes: [] };
  const writingState = {
    project: { id: "p1", preflight: {} }
  };
  const sharedDeps = {
    $: () => ({ textContent: "" }),
    state,
    writingState,
    describeWritingProjectPreflight: () => ({ level: "ready" }),
    currentWritingVersionNote: () => "note",
    showWritingResult: (payload) => calls.push(["result", payload.stage, payload.noteId || payload.draftScaffoldId]),
    loadWritingProjectsList: async () => calls.push(["projects"]),
    loadWritingScaffoldVersions: async () => calls.push(["scaffolds"]),
    loadWritingDraftVersions: async () => calls.push(["drafts"]),
    renderWritingPanel: () => calls.push(["render"]),
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
    writingDraftBody: () => "body",
    createNote: async () => ({ id: "n1", title: "Draft" }),
    bindWritingDraftNote: async (projectId, noteId, scaffoldId, versionNote) => {
      calls.push(["bind", projectId, noteId, scaffoldId, versionNote]);
      return { id: projectId, draft_note_id: noteId };
    },
    mapNoteItem: (note) => ({ ...note, mapped: true })
  });

  assert.equal(writingState.scaffold.id, "s1");
  assert.equal(writingState.scaffoldMarkdown, "body");
  assert.equal(writingState.project.draft_note_id, "n1");
  assert.equal(state.notes[0].mapped, true);
  assert.ok(calls.some((call) => call[0] === "bind" && call[1] === "p1" && call[2] === "n1" && call[3] === "s1"));
});
