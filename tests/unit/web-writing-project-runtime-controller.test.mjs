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
  assert.equal(calls.some((call) => call[0] === "message" && JSON.stringify(call[1]).includes("p1")), true);
  assert.deepEqual(calls.at(-1), ["render"]);
  assert.equal(calls.some((call) => call[0] === "status" && /gpt-x/.test(call[1])), true);
});
