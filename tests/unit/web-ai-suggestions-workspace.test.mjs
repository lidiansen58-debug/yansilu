import test from "node:test";
import assert from "node:assert/strict";

import {
  aiSuggestionFiltersFromWorkspace,
  aiSuggestionReviewedContentFromWorkspace,
  bindAiSuggestionsWorkspaceEvents,
  handleAiSuggestionsWorkspaceClick,
  renderAiSuggestionsWorkspaceView
} from "../../apps/web/src/ai-suggestions-workspace.js";

function targetFor(matches = {}) {
  return {
    closest(selector) {
      const attrs = matches[selector];
      if (!attrs) return null;
      return {
        getAttribute(name) {
          return attrs[name] ?? "";
        }
      };
    }
  };
}

test("AI suggestions workspace render mounts panel html from injected renderer", () => {
  const mount = { innerHTML: "" };
  const rendered = renderAiSuggestionsWorkspaceView({
    mount,
    state: {
      suggestions: [{ id: "suggestion_1" }],
      suggestionsTotal: 7,
      suggestionActionError: "failed"
    },
    renderPanel: (state) => `<section>${state.items[0].id}:${state.total}:${state.actionError}</section>`
  });

  assert.equal(rendered, true);
  assert.equal(mount.innerHTML, "<section>suggestion_1:7:failed</section>");
});

test("AI suggestions workspace reads filters and reviewed content from the current DOM", () => {
  const elements = {
    aiSuggestionStatusFilter: { value: "suggested" },
    aiSuggestionTargetTypeFilter: { value: "PermanentNote" },
    aiSuggestionTargetIdFilter: { value: "note_1" },
    aiSuggestionScopeFilter: { value: "local" },
    aiSuggestionContentEditor: { value: '{"title":"Updated"}' }
  };

  const filters = aiSuggestionFiltersFromWorkspace({
    state: { suggestionFilters: { status: "all", limit: 25 } },
    getElement: (id) => elements[id]
  });
  assert.deepEqual(filters, {
    status: "suggested",
    targetType: "PermanentNote",
    targetId: "note_1",
    scope: "local",
    limit: 25
  });

  assert.deepEqual(aiSuggestionReviewedContentFromWorkspace({
    getElement: (id) => elements[id],
    current: { content: { title: "Original" } }
  }), { title: "Updated" });

  elements.aiSuggestionContentEditor.value = "plain text";
  assert.equal(aiSuggestionReviewedContentFromWorkspace({
    getElement: (id) => elements[id],
    current: { content: "Original" }
  }), "plain text");

  assert.throws(() => aiSuggestionReviewedContentFromWorkspace({
    getElement: (id) => elements[id],
    current: { content: { title: "Original" } }
  }), /valid JSON/);
});

test("AI suggestions workspace routes filter, list, action, and open-note clicks through injected handlers", async () => {
  const calls = [];
  const settingsAiState = {
    suggestionFilters: { status: "all" },
    suggestionDetail: { item: { id: "suggestion_1" } },
    selectedSuggestionId: "suggestion_1"
  };
  const deps = {
    settingsAiState,
    getFilters: () => ({ status: "suggested", limit: 50 }),
    refreshAiSuggestions: async () => calls.push(["refresh"]),
    loadAiSuggestionDetail: async (suggestionId) => calls.push(["detail", suggestionId]),
    applyAiSuggestionStatus: async (suggestionId, status) => calls.push(["status-action", suggestionId, status]),
    openTargetNote: async (noteId) => calls.push(["open-note", noteId]),
    setStatus: (message, tone) => calls.push(["status", message, tone]),
    refreshStatusMessage: "AI 建议已刷新"
  };

  await handleAiSuggestionsWorkspaceClick({ target: targetFor({ "#btnAiSuggestionsApplyFilters": {} }) }, deps);
  assert.deepEqual(settingsAiState.suggestionFilters, { status: "suggested", limit: 50 });
  assert.equal(settingsAiState.suggestionDetail, null);
  assert.equal(settingsAiState.selectedSuggestionId, "");

  await handleAiSuggestionsWorkspaceClick({ target: targetFor({ "#btnAiSuggestionsRefresh": {} }) }, deps);
  await handleAiSuggestionsWorkspaceClick({
    target: targetFor({ "[data-ai-suggestion-open-note]": { "data-ai-suggestion-open-note": "note_1" } })
  }, deps);
  await handleAiSuggestionsWorkspaceClick({
    target: targetFor({
      "[data-ai-suggestion-status]": {
        "data-ai-suggestion-id": "suggestion_2",
        "data-ai-suggestion-status": "confirmed"
      }
    })
  }, deps);
  await handleAiSuggestionsWorkspaceClick({
    target: targetFor({ "[data-ai-suggestion-id]": { "data-ai-suggestion-id": "suggestion_3" } })
  }, deps);

  assert.deepEqual(calls, [
    ["refresh"],
    ["refresh"],
    ["status", "AI 建议已刷新", "ok"],
    ["open-note", "note_1"],
    ["status-action", "suggestion_2", "confirmed"],
    ["detail", "suggestion_3"]
  ]);
});

test("AI suggestions workspace binding attaches and detaches the click handler", async () => {
  const listeners = [];
  const panel = {
    addEventListener(type, handler) {
      listeners.push({ type, handler });
    },
    removeEventListener(type, handler) {
      listeners.push({ type: `remove:${type}`, handler });
    }
  };
  const calls = [];
  const dispose = bindAiSuggestionsWorkspaceEvents(panel, {
    settingsAiState: { suggestionFilters: {}, suggestionDetail: null, selectedSuggestionId: "" },
    loadAiSuggestionDetail: async (suggestionId) => calls.push(suggestionId)
  });

  assert.equal(listeners[0].type, "click");
  await listeners[0].handler({
    target: targetFor({ "[data-ai-suggestion-id]": { "data-ai-suggestion-id": "suggestion_4" } })
  });
  assert.deepEqual(calls, ["suggestion_4"]);

  dispose();
  assert.equal(listeners[1].type, "remove:click");
  assert.equal(listeners[1].handler, listeners[0].handler);
});
