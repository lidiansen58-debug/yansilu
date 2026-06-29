import test from "node:test";
import assert from "node:assert/strict";
import { createAiInboxWorkspaceHostDeps } from "../../apps/web/src/ai-inbox-host-deps.js";
import { createAiSuggestionsWorkspaceHostDeps } from "../../apps/web/src/ai-suggestions-host-deps.js";

test("AI suggestions host deps open target notes from settings context", async () => {
  const calls = [];
  const deps = createAiSuggestionsWorkspaceHostDeps({
    settingsState: { ai: { suggestionFilters: { status: "pending" } } },
    aiSuggestionFiltersFromUi: () => ({ status: "accepted" }),
    activateModule: (...args) => calls.push(["module", ...args]),
    openNoteById: (...args) => calls.push(["note", ...args]),
    setStatus: (...args) => calls.push(["status", ...args.slice(1)])
  });

  assert.deepEqual(deps.getFilters(), { status: "accepted" });
  assert.equal(await deps.openTargetNote(""), false);
  assert.equal(await deps.openTargetNote("note-1"), true);

  assert.deepEqual(calls, [
    ["status", "warn"],
    ["module", "explorer"],
    ["note", "note-1", { preferTitleSelection: false }],
    ["status", "ok"]
  ]);
});

test("AI inbox host deps expose workspace action names without shell glue", async () => {
  const calls = [];
  const deps = createAiInboxWorkspaceHostDeps({
    aiInboxState: { selectedArtifactId: "artifact-1" },
    openAiInboxModule: async () => calls.push(["open"]),
    applyAiInboxFiltersFromUi: async () => calls.push(["filters"]),
    loadAiInboxDetail: async (id) => calls.push(["detail", id]),
    openAiInboxNote: async (id) => calls.push(["note", id]),
    recordAiInboxReviewDecision: async (decision) => calls.push(["decision", decision]),
    acceptAiInboxLinkSuggestion: async (id) => calls.push(["accept", id]),
    promoteAiInboxArtifactToNote: async (id) => calls.push(["promote", id]),
    adoptAiInboxFieldSuggestionDraft: async (field, id) => calls.push(["adopt", field, id]),
    applyAiInboxSuggestionStatus: async (status, id) => calls.push(["status", status, id]),
    runAiInboxSummary: async (id) => calls.push(["summary", id]),
    applyAiInboxRecommendedAction: async (action) => calls.push(["recommended", action])
  });

  await deps.openAiInboxModule();
  await deps.applyFiltersFromUi();
  await deps.loadAiInboxDetail("artifact-2");
  await deps.openNote("note-1");
  await deps.recordDecision("accepted");
  await deps.acceptLink("link-1");
  await deps.promoteNote("artifact-3");
  await deps.adoptField("title", "suggestion-1");
  await deps.applySuggestionStatus("confirmed", "suggestion-2");
  await deps.runSummary("artifact-4");
  await deps.applyRecommendedAction("needs_more_context");

  assert.equal(deps.aiInboxState.selectedArtifactId, "artifact-1");
  assert.deepEqual(calls, [
    ["open"],
    ["filters"],
    ["detail", "artifact-2"],
    ["note", "note-1"],
    ["decision", "accepted"],
    ["accept", "link-1"],
    ["promote", "artifact-3"],
    ["adopt", "title", "suggestion-1"],
    ["status", "confirmed", "suggestion-2"],
    ["summary", "artifact-4"],
    ["recommended", "needs_more_context"]
  ]);
});
