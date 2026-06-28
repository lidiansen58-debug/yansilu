import test from "node:test";
import assert from "node:assert/strict";

import {
  handleWritingAddVisible,
  handleWritingNoteListClick,
  handleWritingUseCurrent,
  installWritingPanelBasketEventHandlers
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
