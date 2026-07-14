import test from "node:test";
import assert from "node:assert/strict";

import {
  aiSuggestionFiltersFromWorkspace,
  aiSuggestionReviewedContentFromWorkspace,
  bindAiSuggestionsWorkspaceEvents,
  handleAiSuggestionsWorkspaceClick,
  normalizeVisibleSuggestionFilters,
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

test("AI suggestions workspace keeps only visible suggestion filters", () => {
  assert.deepEqual(normalizeVisibleSuggestionFilters({
    status: "edited",
    targetType: "permanent_note",
    targetId: "pn_1",
    scope: "note_field",
    limit: 25
  }), {
    status: "edited",
    targetType: "",
    targetId: "",
    scope: "",
    limit: 25
  });
});

test("AI suggestions workspace render mounts panel html from injected renderer", () => {
  const mount = { innerHTML: "" };
  const state = {
    suggestions: [{ id: "suggestion_1" }],
    suggestionsTotal: 7,
    suggestionFilters: { status: "suggested", targetType: "permanent_note", targetId: "pn_1", scope: "note_field", limit: 25 },
    suggestionActionError: "failed"
  };
  const rendered = renderAiSuggestionsWorkspaceView({
    mount,
    state,
    renderPanel: (state) => `<section>${state.items[0].id}:${state.total}:${state.actionError}</section>`
  });

  assert.equal(rendered, true);
  assert.equal(mount.innerHTML, "<section>suggestion_1:7:failed</section>");
  assert.deepEqual(state.suggestionFilters, {
    status: "suggested",
    targetType: "",
    targetId: "",
    scope: "",
    limit: 25
  });
});

test("AI suggestions workspace fills missing target titles from known notes", () => {
  const mount = { innerHTML: "" };
  const state = {
    suggestions: [
      {
        id: "suggestion_title",
        target: { type: "permanent_note", id: "pn_title", field: "thesis" },
        content: "Draft claim"
      }
    ],
    suggestionsTotal: 1,
    suggestionFilters: { status: "suggested" }
  };
  const rendered = renderAiSuggestionsWorkspaceView({
    mount,
    state,
    notes: [{ id: "pn_title", title: "真正的笔记标题" }],
    renderPanel: (panelState) => `<section>${panelState.items[0].target.title}:${panelState.items[0].target.id}</section>`
  });

  assert.equal(rendered, true);
  assert.equal(mount.innerHTML, "<section>真正的笔记标题:pn_title</section>");
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
    targetType: "",
    targetId: "",
    scope: "",
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

  assert.deepEqual(aiSuggestionReviewedContentFromWorkspace({
    getElement: (id) => elements[id],
    current: { content: { title: "Original" } }
  }), { title: "plain text" });

  elements.aiSuggestionContentEditor.value = "First line\nSecond line\n";
  assert.deepEqual(aiSuggestionReviewedContentFromWorkspace({
    getElement: (id) => elements[id],
    current: { content: { threeLineSummary: ["Original"] } }
  }), { threeLineSummary: ["First line", "Second line"] });

  elements.aiSuggestionContentEditor.value = "42";
  assert.deepEqual(aiSuggestionReviewedContentFromWorkspace({
    getElement: (id) => elements[id],
    current: { content: { priority: 1 } }
  }), { priority: 42 });

  elements.aiSuggestionContentEditor.value = "not a number";
  assert.throws(() => aiSuggestionReviewedContentFromWorkspace({
    getElement: (id) => elements[id],
    current: { content: { priority: 1 } }
  }), /number format/);

  elements.aiSuggestionContentEditor.value = "false";
  assert.deepEqual(aiSuggestionReviewedContentFromWorkspace({
    getElement: (id) => elements[id],
    current: { content: { enabled: true } }
  }), { enabled: false });

  elements.aiSuggestionContentEditor.value = "sometimes";
  assert.throws(() => aiSuggestionReviewedContentFromWorkspace({
    getElement: (id) => elements[id],
    current: { content: { enabled: true } }
  }), /true\/false format/);

  assert.throws(() => aiSuggestionReviewedContentFromWorkspace({
    getElement: (id) => elements[id],
    current: { content: { title: "Original", summary: "Keep" } }
  }), /valid JSON/);
});

test("AI suggestions workspace reads the editor for the suggestion being reviewed", () => {
  const elements = {
    aiSuggestionContentEditor: { value: "First suggestion text" },
    "aiSuggestionContentEditor-suggestion_summary": { value: "Second suggestion text" }
  };

  assert.equal(aiSuggestionReviewedContentFromWorkspace({
    getElement: (id) => elements[id],
    current: { id: "suggestion_summary", content: "Original summary" }
  }), "Second suggestion text");

  assert.equal(aiSuggestionReviewedContentFromWorkspace({
    getElement: (id) => elements[id],
    current: { id: "suggestion_missing_editor", content: "Original thesis" }
  }), "First suggestion text");
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

test("AI suggestions workspace closes the suggestion modal", async () => {
  const calls = [];
  const settingsAiState = {
    selectedSuggestionId: "suggestion_1",
    suggestionDetail: { item: { id: "suggestion_1" } },
    suggestionDetailSuggestionId: "suggestion_1",
    suggestionDetailError: "old error",
    suggestionActionError: "old action error",
    suggestionActionNoticeSuggestionId: "suggestion_1",
    suggestionActionNotice: "old notice",
    suggestionActionNoticeTone: "warn"
  };

  await handleAiSuggestionsWorkspaceClick({
    target: targetFor({ "[data-ai-suggestion-close]": { "data-ai-suggestion-close": "true" } })
  }, {
    settingsAiState,
    render: () => calls.push("render")
  });

  assert.equal(settingsAiState.selectedSuggestionId, "");
  assert.equal(settingsAiState.suggestionDetail, null);
  assert.equal(settingsAiState.suggestionDetailSuggestionId, "");
  assert.equal(settingsAiState.suggestionActionNotice, "");
  assert.deepEqual(calls, ["render"]);
});

test("AI suggestions workspace applies one modal action to grouped suggestions", async () => {
  const calls = [];
  const settingsAiState = {
    selectedSuggestionId: "suggestion_1",
    suggestionDetail: { item: { id: "suggestion_1" } },
    suggestionDetailSuggestionId: "suggestion_1"
  };

  await handleAiSuggestionsWorkspaceClick({
    target: targetFor({
      "[data-ai-suggestion-group-status]": {
        "data-ai-suggestion-group-status": "adopted_as_draft",
        "data-ai-suggestion-ids": "suggestion_1,suggestion_summary"
      }
    })
  }, {
    settingsAiState,
    loadAiSuggestionDetail: async (id) => calls.push(["detail", id]),
    applyAiSuggestionStatus: async (id, status) => calls.push(["status", id, status]),
    render: () => calls.push(["render"])
  });

  assert.deepEqual(calls, [
    ["detail", "suggestion_1"],
    ["status", "suggestion_1", "adopted_as_draft"],
    ["detail", "suggestion_summary"],
    ["status", "suggestion_summary", "adopted_as_draft"],
    ["render"]
  ]);
  assert.equal(settingsAiState.selectedSuggestionId, "");
  assert.equal(settingsAiState.suggestionDetail, null);
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
