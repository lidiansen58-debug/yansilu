import test from "node:test";
import assert from "node:assert/strict";

import {
  aiInboxFeedbackFromWorkspace,
  aiInboxFiltersFromWorkspace,
  bindAiInboxWorkspaceEvents,
  handleAiInboxWorkspaceClick,
  renderAiInboxWorkspaceView
} from "../../apps/web/src/ai-inbox-workspace.js";

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

test("AI inbox workspace render mounts panel html from injected renderer", () => {
  const mount = { innerHTML: "" };
  const rendered = renderAiInboxWorkspaceView({
    mount,
    state: { items: [{ artifactId: "artifact_1" }], actionError: "old" },
    renderPanel: (state) => `<section>${state.items[0].artifactId}:${state.actionError}</section>`
  });

  assert.equal(rendered, true);
  assert.equal(mount.innerHTML, "<section>artifact_1:old</section>");
});

test("AI inbox workspace reads filters and feedback from the current DOM", () => {
  const elements = {
    aiInboxTypeFilter: { value: "LinkSuggestion" },
    aiInboxSourceNoteFilter: { value: "note_1" },
    aiInboxPrivacyFilter: { value: "local_only" }
  };
  const filters = aiInboxFiltersFromWorkspace({
    state: { filters: { view: "pending", type: "all" } },
    getElement: (id) => elements[id]
  });
  assert.deepEqual(filters, {
    view: "pending",
    type: "LinkSuggestion",
    sourceNoteId: "note_1",
    privacyMode: "local_only",
    limit: 50
  });

  const feedback = aiInboxFeedbackFromWorkspace({
    querySelectorAll(selector) {
      assert.equal(selector, "[data-ai-inbox-feedback]");
      return [
        { checked: true, getAttribute: () => "useful" },
        { checked: false, getAttribute: () => "privacyConcern" }
      ];
    }
  });
  assert.deepEqual(feedback, { useful: true, privacyConcern: false });
});

test("AI inbox workspace routes list and action clicks through injected handlers", async () => {
  const calls = [];
  const aiInboxState = {
    filters: { view: "pending", type: "all" },
    detail: { item: { artifactId: "artifact_1" } },
    selectedArtifactId: "artifact_1"
  };
  const deps = {
    aiInboxState,
    openAiInboxModule: async () => calls.push(["open"]),
    applyFiltersFromUi: async () => calls.push(["filters"]),
    loadAiInboxDetail: async (artifactId) => calls.push(["detail", artifactId]),
    openNote: async (noteId) => calls.push(["note", noteId]),
    recordDecision: async (decision) => calls.push(["decision", decision]),
    acceptLink: async (artifactId) => calls.push(["accept", artifactId]),
    promoteNote: async (artifactId) => calls.push(["promote", artifactId]),
    adoptField: async (artifactId, suggestionId) => calls.push(["adopt", artifactId, suggestionId]),
    applySuggestionStatus: async (status, suggestionId) => calls.push(["suggestion", status, suggestionId]),
    runSummary: async (artifactId) => calls.push(["summary", artifactId]),
    applyRecommendedAction: async (action) => calls.push(["recommended", action]),
    setStatus: (message, tone) => calls.push(["status", message, tone])
  };

  await handleAiInboxWorkspaceClick({
    target: targetFor({ "[data-ai-inbox-view]": { "data-ai-inbox-view": "reviewed" } })
  }, deps);
  assert.equal(aiInboxState.filters.view, "reviewed");
  assert.equal(aiInboxState.detail, null);
  assert.equal(aiInboxState.selectedArtifactId, "");

  await handleAiInboxWorkspaceClick({ target: targetFor({ "#btnAiInboxApplyFilters": {} }) }, deps);
  await handleAiInboxWorkspaceClick({ target: targetFor({ "#btnAiInboxRefresh": {} }) }, deps);
  await handleAiInboxWorkspaceClick({
    target: targetFor({ "[data-ai-inbox-artifact-id]": { "data-ai-inbox-artifact-id": "artifact_2" } })
  }, deps);
  await handleAiInboxWorkspaceClick({
    target: targetFor({ "[data-ai-inbox-open-note]": { "data-ai-inbox-open-note": "note_1" } })
  }, deps);
  await handleAiInboxWorkspaceClick({
    target: targetFor({ "[data-ai-inbox-decision]": { "data-ai-inbox-decision": "accepted" } })
  }, deps);
  await handleAiInboxWorkspaceClick({
    target: targetFor({ "[data-ai-inbox-accept-link]": { "data-ai-inbox-accept-link": "artifact_3" } })
  }, deps);
  await handleAiInboxWorkspaceClick({
    target: targetFor({ "[data-ai-inbox-promote-note]": { "data-ai-inbox-promote-note": "artifact_4" } })
  }, deps);
  await handleAiInboxWorkspaceClick({
    target: targetFor({
      "[data-ai-inbox-adopt-field]": {
        "data-ai-inbox-adopt-field": "artifact_5",
        "data-ai-inbox-suggestion-id": "suggestion_5"
      }
    })
  }, deps);
  await handleAiInboxWorkspaceClick({
    target: targetFor({
      "[data-ai-inbox-suggestion-status]": {
        "data-ai-inbox-suggestion-status": "confirmed",
        "data-ai-inbox-suggestion-id": "suggestion_6"
      }
    })
  }, deps);
  aiInboxState.selectedArtifactId = "artifact_7";
  await handleAiInboxWorkspaceClick({ target: targetFor({ "#btnAiInboxSummarize": {} }) }, deps);
  await handleAiInboxWorkspaceClick({
    target: targetFor({ "[data-ai-inbox-recommended-action]": { "data-ai-inbox-recommended-action": "accept_link" } })
  }, deps);

  assert.deepEqual(calls, [
    ["open"],
    ["filters"],
    ["open"],
    ["status", "AI 建议已刷新", "ok"],
    ["detail", "artifact_2"],
    ["note", "note_1"],
    ["decision", "accepted"],
    ["accept", "artifact_3"],
    ["promote", "artifact_4"],
    ["adopt", "artifact_5", "suggestion_5"],
    ["suggestion", "confirmed", "suggestion_6"],
    ["summary", "artifact_7"],
    ["recommended", "accept_link"]
  ]);
});

test("AI inbox workspace binding attaches and detaches the click handler", async () => {
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
  const dispose = bindAiInboxWorkspaceEvents(panel, {
    aiInboxState: { filters: {}, detail: null, selectedArtifactId: "" },
    recordDecision: async (decision) => calls.push(decision)
  });

  assert.equal(listeners[0].type, "click");
  await listeners[0].handler({
    target: targetFor({ "[data-ai-inbox-decision]": { "data-ai-inbox-decision": "rejected" } })
  });
  assert.deepEqual(calls, ["rejected"]);

  dispose();
  assert.equal(listeners[1].type, "remove:click");
  assert.equal(listeners[1].handler, listeners[0].handler);
});
