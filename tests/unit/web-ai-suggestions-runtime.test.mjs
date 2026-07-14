import test from "node:test";
import assert from "node:assert/strict";
import {
  applyAiSuggestionStatusForRuntime,
  loadAiSuggestionDetailForRuntime,
  refreshAiSuggestionsForRuntime
} from "../../apps/web/src/ai-suggestions-runtime-controller.js";
import { normalizeVisibleSuggestionFilters } from "../../apps/web/src/ai-suggestions-workspace.js";

function createApplyAiSuggestionStatus(
  _select,
  settingsState,
  suggestionDetailFromResponse,
  aiSuggestionReviewedContentFromUi,
  updateAiSuggestion,
  refreshAiSuggestions,
  loadAiSuggestionDetail,
  rememberAiDebugSnapshot,
  setStatus,
  renderAiSuggestionsWorkspace,
  aiSuggestionStatusLabel
) {
  return (suggestionId, status) => applyAiSuggestionStatusForRuntime({
    aiState: settingsState.ai,
    suggestionDetailFromResponse,
    aiSuggestionReviewedContent: aiSuggestionReviewedContentFromUi,
    updateAiSuggestion,
    refreshAiSuggestions,
    loadAiSuggestionDetail,
    rememberAiDebugSnapshot,
    setStatus,
    render: renderAiSuggestionsWorkspace,
    aiSuggestionStatusLabel,
    messages: {}
  }, suggestionId, status);
}

function createLoadAiSuggestionDetail(settingsState, deps = {}) {
  return (suggestionId) => loadAiSuggestionDetailForRuntime({
    aiState: settingsState.ai,
    fetchAiSuggestion: deps.fetchAiSuggestion,
    suggestionDetailFromResponse: deps.suggestionDetailFromResponse || ((item) => ({ item })),
    rememberAiDebugSnapshot: deps.rememberAiDebugSnapshot || (() => {}),
    render: deps.renderAiSuggestionsWorkspace || (() => {}),
    setStatus: deps.setStatus || (() => {})
  }, suggestionId);
}

function createRefreshAiSuggestions(settingsState, deps = {}) {
  return (options = {}) => refreshAiSuggestionsForRuntime({
    aiState: settingsState.ai,
    fetchAiSuggestions: deps.fetchAiSuggestions,
    normalizeAiSuggestionFilters: deps.normalizeAiSuggestionFilters || ((filters) => filters),
    rememberAiDebugSnapshot: deps.rememberAiDebugSnapshot || (() => {}),
    render: deps.renderAiSuggestionsWorkspace || (() => {}),
    setStatus: deps.setStatus || (() => {}),
    loadDetail: deps.loadAiSuggestionDetail || (async () => null)
  }, options);
}

test("refreshAiSuggestions can clear hidden filters before fetching suggestions", async () => {
  let capturedFilters = null;
  const settingsState = {
    ai: {
      suggestionFilters: { status: "edited", targetType: "permanent_note", targetId: "old-note", scope: "note_field", limit: 25 },
      suggestions: [],
      suggestionsTotal: 0,
      selectedSuggestionId: "",
      suggestionDetail: null,
      suggestionDetailRequestToken: 0,
      suggestionsRequestToken: 0,
      suggestionsLoading: false,
      suggestionDetailLoading: false,
      suggestionActionLoading: false,
      suggestionsError: "",
      suggestionDetailError: "",
      suggestionActionError: ""
    }
  };
  const refreshAiSuggestions = createRefreshAiSuggestions(settingsState, {
    normalizeAiSuggestionFilters: normalizeVisibleSuggestionFilters,
    fetchAiSuggestions: async (filters) => {
      capturedFilters = filters;
      return { items: [], total: 0 };
    }
  });

  await refreshAiSuggestions({ silent: true });

  assert.deepEqual(capturedFilters, {
    status: "edited",
    targetType: "",
    targetId: "",
    scope: "",
    limit: 25,
    canonical: true
  });
  assert.deepEqual(settingsState.ai.suggestionFilters, {
    status: "edited",
    targetType: "",
    targetId: "",
    scope: "",
    limit: 25
  });
});

test("loadAiSuggestionDetail ignores stale responses and keeps the latest selected suggestion detail", async () => {
  let resolveFirst;
  let resolveSecond;
  const snapshots = [];
  const settingsState = {
    ai: {
      selectedSuggestionId: "",
      suggestionDetail: null,
      suggestionDetailSuggestionId: "",
      suggestionDetailRequestToken: 0,
      suggestionsError: "",
      suggestionDetailError: "",
      suggestionActionError: ""
    }
  };

  const loadAiSuggestionDetail = createLoadAiSuggestionDetail(settingsState, {
    fetchAiSuggestion: (suggestionId) =>
      new Promise((resolve) => {
        if (suggestionId === "suggestion_1") resolveFirst = () => resolve({ id: suggestionId, status: "suggested" });
        else resolveSecond = () => resolve({ id: suggestionId, status: "edited" });
      }),
    suggestionDetailFromResponse: (item) => ({ item }),
    rememberAiDebugSnapshot: (key, response) => snapshots.push({ key, response })
  });

  const firstPromise = loadAiSuggestionDetail("suggestion_1");
  assert.equal(settingsState.ai.selectedSuggestionId, "suggestion_1");
  assert.equal(settingsState.ai.suggestionDetail, null);
  assert.equal(settingsState.ai.suggestionDetailSuggestionId, "suggestion_1");
  const secondPromise = loadAiSuggestionDetail("suggestion_2");
  assert.equal(settingsState.ai.selectedSuggestionId, "suggestion_2");
  assert.equal(settingsState.ai.suggestionDetail, null);
  assert.equal(settingsState.ai.suggestionDetailSuggestionId, "suggestion_2");

  resolveSecond();
  await secondPromise;
  resolveFirst();
  await firstPromise;

  assert.equal(settingsState.ai.selectedSuggestionId, "suggestion_2");
  assert.equal(settingsState.ai.suggestionDetail?.item?.id, "suggestion_2");
  assert.equal(settingsState.ai.suggestionDetailSuggestionId, "suggestion_2");
  assert.equal(settingsState.ai.suggestionDetailRequestToken, 2);
  assert.deepEqual(snapshots.map((entry) => entry.key), ["suggestionDetail"]);
});

test("loadAiSuggestionDetail clears stale errors after a successful retry and when selection is reset", async () => {
  const settingsState = {
    ai: {
      selectedSuggestionId: "suggestion_old",
      suggestionDetail: { id: "suggestion_old", status: "suggested" },
      suggestionDetailSuggestionId: "suggestion_old",
      suggestionDetailRequestToken: 0,
      suggestionDetailLoading: false,
      suggestionsError: "stale list error",
      suggestionDetailError: "stale detail error",
      suggestionActionError: "stale action error"
    }
  };

  const loadAiSuggestionDetail = createLoadAiSuggestionDetail(settingsState, {
    fetchAiSuggestion: async (suggestionId) => ({ id: suggestionId, status: "edited" }),
    suggestionDetailFromResponse: (item) => ({ item })
  });

  const fetched = await loadAiSuggestionDetail("suggestion_retry");
  assert.equal(fetched.id, "suggestion_retry");
  assert.equal(settingsState.ai.selectedSuggestionId, "suggestion_retry");
  assert.equal(settingsState.ai.suggestionDetail?.item?.id, "suggestion_retry");
  assert.equal(settingsState.ai.suggestionDetailSuggestionId, "suggestion_retry");
  assert.equal(settingsState.ai.suggestionsError, "stale list error");
  assert.equal(settingsState.ai.suggestionDetailError, "");
  assert.equal(settingsState.ai.suggestionActionError, "");
  assert.equal(settingsState.ai.suggestionDetailLoading, false);

  await loadAiSuggestionDetail("");
  assert.equal(settingsState.ai.selectedSuggestionId, "");
  assert.equal(settingsState.ai.suggestionDetail, null);
  assert.equal(settingsState.ai.suggestionDetailSuggestionId, "");
  assert.equal(settingsState.ai.suggestionsError, "stale list error");
  assert.equal(settingsState.ai.suggestionDetailError, "");
  assert.equal(settingsState.ai.suggestionActionError, "");
  assert.equal(settingsState.ai.suggestionDetailLoading, false);
});

test("loadAiSuggestionDetail stores detail failures separately from list errors", async () => {
  const settingsState = {
    ai: {
      selectedSuggestionId: "suggestion_old",
      suggestionDetail: { id: "suggestion_old", status: "suggested" },
      suggestionDetailSuggestionId: "suggestion_old",
      suggestionDetailRequestToken: 0,
      suggestionDetailLoading: false,
      suggestionsError: "list failed earlier",
      suggestionDetailError: "",
      suggestionActionError: ""
    }
  };

  const loadAiSuggestionDetail = createLoadAiSuggestionDetail(settingsState, {
    fetchAiSuggestion: async () => {
      throw new Error("detail boom");
    },
    suggestionDetailFromResponse: (item) => ({ item })
  });

  const fetched = await loadAiSuggestionDetail("suggestion_retry");
  assert.equal(fetched, null);
  assert.equal(settingsState.ai.suggestionsError, "list failed earlier");
  assert.equal(settingsState.ai.suggestionDetailSuggestionId, "suggestion_retry");
  assert.equal(settingsState.ai.suggestionDetailError, "detail boom");
  assert.equal(settingsState.ai.suggestionActionError, "");
  assert.equal(settingsState.ai.suggestionDetailLoading, false);
});

test("loadAiSuggestionDetail keeps a failed detail request bound to the original suggestion after selection moves", async () => {
  let rejectDetail;
  const settingsState = {
    ai: {
      selectedSuggestionId: "suggestion_1",
      suggestionDetail: null,
      suggestionDetailSuggestionId: "",
      suggestionDetailRequestToken: 0,
      suggestionDetailLoading: false,
      suggestionsError: "",
      suggestionDetailError: "",
      suggestionActionError: ""
    }
  };

  const loadAiSuggestionDetail = createLoadAiSuggestionDetail(settingsState, {
    fetchAiSuggestion: () =>
      new Promise((_, reject) => {
        rejectDetail = () => reject(new Error("detail boom"));
      }),
    suggestionDetailFromResponse: (item) => ({ item })
  });

  const pending = loadAiSuggestionDetail("suggestion_1");
  settingsState.ai.selectedSuggestionId = "suggestion_2";
  settingsState.ai.suggestionDetail = {
    item: { id: "suggestion_2", status: "suggested", content: { thesis: "Stay selected." } }
  };
  rejectDetail();
  const fetched = await pending;

  assert.equal(fetched, null);
  assert.equal(settingsState.ai.selectedSuggestionId, "suggestion_2");
  assert.equal(settingsState.ai.suggestionDetail?.item?.id, "suggestion_2");
  assert.equal(settingsState.ai.suggestionDetailSuggestionId, "suggestion_1");
  assert.equal(settingsState.ai.suggestionDetailError, "detail boom");
  assert.equal(settingsState.ai.suggestionDetailLoading, false);
});

test("applyAiSuggestionStatus captures edited content before rerender and blocks duplicate submission", async () => {
  const domState = {
    aiSuggestionContentEditor: { value: "{\"thesis\":\"Edited in settings panel.\"}" }
  };
  const calls = [];
  const snapshots = [];
  const settingsState = {
    ai: {
      suggestions: [{ id: "suggestion_1", status: "adopted_as_draft", content: "Stale list fallback." }],
      suggestionDetail: { id: "suggestion_1", status: "adopted_as_draft", content: { thesis: "Original." } },
      selectedSuggestionId: "suggestion_1",
      suggestionActionLoading: false,
      suggestionsError: "stale list error",
      suggestionDetailError: "stale detail error",
      suggestionActionError: "stale action error"
    }
  };

  const applyAiSuggestionStatus = createApplyAiSuggestionStatus(
    (id) => domState[id],
    settingsState,
    (item) => ({ item }),
    (current) => JSON.parse(String(domState.aiSuggestionContentEditor.value || "")),
    async (suggestionId, payload) => {
      calls.push({ suggestionId, payload });
      return { id: suggestionId, status: payload.status, content: payload.content };
    },
    async () => null,
    async () => null,
    (key, response) => snapshots.push({ key, response }),
    () => {},
    () => {
      domState.aiSuggestionContentEditor.value = "{\"thesis\":\"stale\"}";
    }
  );

  const first = await applyAiSuggestionStatus("suggestion_1", "edited");
  assert.equal(first.status, "edited");
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0].payload.content, { thesis: "Edited in settings panel." });
  assert.equal(settingsState.ai.suggestionsError, "stale list error");
  assert.equal(settingsState.ai.suggestionDetailError, "stale detail error");
  assert.equal(settingsState.ai.suggestionActionError, "");
  assert.deepEqual(snapshots.map((entry) => entry.key), ["suggestionDecision"]);

  settingsState.ai.suggestionActionLoading = true;
  const second = await applyAiSuggestionStatus("suggestion_1", "confirmed");
  assert.equal(second, null);
  assert.equal(calls.length, 1);
});

test("applyAiSuggestionStatus warns when another suggestion review is already in flight", async () => {
  const statuses = [];
  let updateCalls = 0;
  const settingsState = {
    ai: {
      suggestions: [
        { id: "suggestion_1", status: "edited", content: { thesis: "Original." } },
        { id: "suggestion_2", status: "edited", content: { thesis: "New selection." } }
      ],
      suggestionDetail: { item: { id: "suggestion_2", status: "edited", content: { thesis: "New selection." } } },
      selectedSuggestionId: "suggestion_2",
      suggestionActionLoading: true,
      suggestionActionSuggestionId: "suggestion_1",
      suggestionActionError: ""
    }
  };

  const applyAiSuggestionStatus = createApplyAiSuggestionStatus(
    () => ({ value: "" }),
    settingsState,
    (item) => ({ item }),
    () => ({ thesis: "Edited." }),
    async () => {
      updateCalls += 1;
      return null;
    },
    async () => null,
    async () => null,
    () => {},
    (message, tone) => {
      statuses.push({ message, tone });
    },
    () => {}
  );

  const result = await applyAiSuggestionStatus("suggestion_2", "confirmed");
  assert.equal(result, null);
  assert.equal(updateCalls, 0);
  assert.deepEqual(statuses, [
    {
      message: "Another AI suggestion review is still running. Wait for it to finish before reviewing a different suggestion.",
      tone: "warn"
    }
  ]);
  assert.equal(settingsState.ai.suggestionActionNoticeSuggestionId, "suggestion_2");
  assert.equal(
    settingsState.ai.suggestionActionNotice,
    "Another AI suggestion review is still running. Wait for it to finish before reviewing a different suggestion."
  );
  assert.equal(settingsState.ai.suggestionActionNoticeTone, "warn");
});

test("applyAiSuggestionStatus reloads the latest detail instead of submitting against list-only fallback data", async () => {
  const statuses = [];
  const loadCalls = [];
  let updateCalls = 0;
  const settingsState = {
    ai: {
      suggestions: [{ id: "suggestion_1", status: "edited", content: { thesis: "List fallback only." } }],
      suggestionDetail: null,
      selectedSuggestionId: "suggestion_1",
      suggestionActionLoading: false,
      suggestionDetailLoading: false,
      suggestionActionError: ""
    }
  };

  const applyAiSuggestionStatus = createApplyAiSuggestionStatus(
    () => ({ value: "" }),
    settingsState,
    (item) => ({ item }),
    () => ({ thesis: "Edited" }),
    async () => {
      updateCalls += 1;
      return null;
    },
    async () => null,
    async (suggestionId) => {
      loadCalls.push(suggestionId);
      settingsState.ai.suggestionDetail = { item: { id: suggestionId, status: "edited", content: { thesis: "Fresh detail." } } };
      return settingsState.ai.suggestionDetail;
    },
    () => {},
    (message, tone) => statuses.push({ message, tone }),
    () => {}
  );

  const result = await applyAiSuggestionStatus("suggestion_1", "confirmed");
  assert.equal(result, null);
  assert.equal(updateCalls, 0);
  assert.deepEqual(loadCalls, ["suggestion_1"]);
  assert.deepEqual(statuses, []);
  assert.equal(settingsState.ai.suggestionActionNoticeSuggestionId, "");
  assert.equal(settingsState.ai.suggestionActionNotice, "");
  assert.equal(settingsState.ai.suggestionActionNoticeTone, "");
});

test("applyAiSuggestionStatus loads the clicked grouped suggestion before submitting it", async () => {
  const statuses = [];
  const loadCalls = [];
  let updateCalls = 0;
  const settingsState = {
    ai: {
      suggestions: [
        { id: "suggestion_1", status: "edited", content: { thesis: "Current detail." } },
        { id: "suggestion_2", status: "edited", content: { threeLineSummary: ["List fallback only."] } }
      ],
      suggestionDetail: { item: { id: "suggestion_1", status: "edited", content: { thesis: "Current detail." } } },
      selectedSuggestionId: "suggestion_1",
      suggestionActionLoading: false,
      suggestionDetailLoading: false,
      suggestionActionError: ""
    }
  };

  const applyAiSuggestionStatus = createApplyAiSuggestionStatus(
    () => ({ value: "" }),
    settingsState,
    (item) => ({ item }),
    () => ({ threeLineSummary: ["Edited"] }),
    async () => {
      updateCalls += 1;
      return null;
    },
    async () => null,
    async (suggestionId) => {
      loadCalls.push(suggestionId);
      settingsState.ai.suggestionDetail = {
        item: { id: suggestionId, status: "edited", content: { threeLineSummary: ["Fresh detail."] } }
      };
      settingsState.ai.selectedSuggestionId = suggestionId;
      return settingsState.ai.suggestionDetail;
    },
    () => {},
    (message, tone) => statuses.push({ message, tone }),
    () => {}
  );

  const result = await applyAiSuggestionStatus("suggestion_2", "confirmed");
  assert.equal(result, null);
  assert.equal(updateCalls, 0);
  assert.deepEqual(loadCalls, ["suggestion_2"]);
  assert.deepEqual(statuses, []);
  assert.equal(settingsState.ai.suggestionActionNoticeSuggestionId, "");
  assert.equal(settingsState.ai.suggestionActionNotice, "");
  assert.equal(settingsState.ai.suggestionActionNoticeTone, "");
});

test("applyAiSuggestionStatus shows a safety notice when clicked suggestion detail still is not available", async () => {
  const statuses = [];
  const loadCalls = [];
  let updateCalls = 0;
  const settingsState = {
    ai: {
      suggestions: [{ id: "suggestion_1", status: "edited", content: { thesis: "List fallback only." } }],
      suggestionDetail: null,
      selectedSuggestionId: "suggestion_1",
      suggestionActionLoading: false,
      suggestionDetailLoading: false,
      suggestionActionError: ""
    }
  };

  const applyAiSuggestionStatus = createApplyAiSuggestionStatus(
    () => ({ value: "" }),
    settingsState,
    (item) => ({ item }),
    () => ({ thesis: "Edited" }),
    async () => {
      updateCalls += 1;
      return null;
    },
    async () => null,
    async (suggestionId) => {
      loadCalls.push(suggestionId);
      settingsState.ai.suggestionDetail = null;
      return null;
    },
    () => {},
    (message, tone) => statuses.push({ message, tone }),
    () => {}
  );

  const result = await applyAiSuggestionStatus("suggestion_1", "confirmed");
  assert.equal(result, null);
  assert.equal(updateCalls, 0);
  assert.deepEqual(loadCalls, ["suggestion_1"]);
  assert.deepEqual(statuses, [
    {
      message: "AI suggestion detail is not ready yet. Retry after the latest detail loads.",
      tone: "warn"
    }
  ]);
  assert.equal(settingsState.ai.suggestionActionNoticeSuggestionId, "suggestion_1");
  assert.equal(settingsState.ai.suggestionActionNotice, "Load the latest suggestion detail before running review actions.");
  assert.equal(settingsState.ai.suggestionActionNoticeTone, "warn");
});

test("applyAiSuggestionStatus preserves a newer settings suggestion selection while an older submit resolves", async () => {
  const settingsState = {
    ai: {
      suggestions: [
        { id: "suggestion_1", status: "edited", content: { thesis: "Original." } },
        { id: "suggestion_2", status: "suggested", content: { thesis: "Stay selected." } }
      ],
      suggestionDetail: { item: { id: "suggestion_1", status: "edited", content: { thesis: "Original." } } },
      selectedSuggestionId: "suggestion_1",
      suggestionActionLoading: false,
      suggestionActionSuggestionId: "",
      suggestionsError: "",
      suggestionDetailError: "",
      suggestionActionError: ""
    }
  };
  const snapshots = [];

  const applyAiSuggestionStatus = createApplyAiSuggestionStatus(
    () => ({ value: "{\"thesis\":\"Updated old selection.\"}" }),
    settingsState,
    (item) => ({ item }),
    () => ({ thesis: "Updated old selection." }),
    async (suggestionId, payload) => {
      settingsState.ai.selectedSuggestionId = "suggestion_2";
      settingsState.ai.suggestionDetail = {
        item: { id: "suggestion_2", status: "suggested", content: { thesis: "Stay selected." } }
      };
      return { id: suggestionId, status: payload.status, content: payload.content };
    },
    async () => null,
    async () => null,
    (key, response) => snapshots.push({ key, response }),
    () => {},
    () => {}
  );

  const result = await applyAiSuggestionStatus("suggestion_1", "confirmed");
  assert.equal(result.status, "confirmed");
  assert.equal(settingsState.ai.selectedSuggestionId, "suggestion_2");
  assert.equal(settingsState.ai.suggestionDetail?.item?.id, "suggestion_2");
  assert.equal(
    settingsState.ai.suggestions.find((item) => item.id === "suggestion_1")?.status,
    "confirmed"
  );
  assert.deepEqual(snapshots.map((entry) => entry.key), ["suggestionDecision"]);
  assert.equal(settingsState.ai.suggestionActionLoading, false);
});

test("applyAiSuggestionStatus realigns filtered settings suggestions after a status change removes the current item", async () => {
  const refreshCalls = [];
  const settingsState = {
    ai: {
      suggestionFilters: { status: "edited", targetType: "", targetId: "", scope: "", limit: 50 },
      suggestions: [
        { id: "suggestion_1", status: "edited", content: { thesis: "Current filtered item." } },
        { id: "suggestion_2", status: "edited", content: { thesis: "Next filtered item." } }
      ],
      suggestionDetail: { item: { id: "suggestion_1", status: "edited", content: { thesis: "Current filtered item." } } },
      selectedSuggestionId: "suggestion_1",
      suggestionActionLoading: false,
      suggestionsError: "",
      suggestionDetailError: "",
      suggestionActionError: ""
    }
  };

  const applyAiSuggestionStatus = createApplyAiSuggestionStatus(
    () => ({ value: "{\"thesis\":\"Confirmed and should leave edited filter.\"}" }),
    settingsState,
    (item) => ({ item }),
    () => ({ thesis: "Confirmed and should leave edited filter." }),
    async (suggestionId, payload) => ({ id: suggestionId, status: payload.status, content: payload.content }),
    async (options) => {
      refreshCalls.push(options);
      settingsState.ai.suggestions = [
        { id: "suggestion_2", status: "edited", content: { thesis: "Next filtered item." } }
      ];
      settingsState.ai.selectedSuggestionId = "suggestion_2";
      settingsState.ai.suggestionDetail = {
        item: { id: "suggestion_2", status: "edited", content: { thesis: "Next filtered item." } }
      };
      return { items: settingsState.ai.suggestions, total: 1 };
    },
    async () => null,
    () => {},
    () => {},
    () => {}
  );

  const result = await applyAiSuggestionStatus("suggestion_1", "confirmed");
  assert.equal(result.status, "confirmed");
  assert.deepEqual(refreshCalls, [{ silent: true }]);
  assert.deepEqual(settingsState.ai.suggestions.map((item) => item.id), ["suggestion_2"]);
  assert.equal(settingsState.ai.selectedSuggestionId, "suggestion_2");
  assert.equal(settingsState.ai.suggestionDetail?.item?.id, "suggestion_2");
  assert.equal(settingsState.ai.suggestionActionError, "");
  assert.equal(settingsState.ai.suggestionActionLoading, false);
});

test("applyAiSuggestionStatus loads the newly selected filtered suggestion detail after refresh switches selection", async () => {
  const refreshCalls = [];
  const detailLoads = [];
  const settingsState = {
    ai: {
      suggestionFilters: { status: "edited", targetType: "", targetId: "", scope: "", limit: 50 },
      suggestions: [
        { id: "suggestion_1", status: "edited", content: { thesis: "Current filtered item." } },
        { id: "suggestion_2", status: "edited", content: { thesis: "Next filtered item." } }
      ],
      suggestionDetail: { item: { id: "suggestion_1", status: "edited", content: { thesis: "Current filtered item." } } },
      selectedSuggestionId: "suggestion_1",
      suggestionActionLoading: false,
      suggestionsError: "",
      suggestionDetailError: "",
      suggestionActionError: ""
    }
  };

  const applyAiSuggestionStatus = createApplyAiSuggestionStatus(
    () => ({ value: "{\"thesis\":\"Confirmed and should leave edited filter.\"}" }),
    settingsState,
    (item) => ({ item }),
    () => ({ thesis: "Confirmed and should leave edited filter." }),
    async (suggestionId, payload) => ({ id: suggestionId, status: payload.status, content: payload.content }),
    async (options) => {
      refreshCalls.push(options);
      settingsState.ai.suggestions = [
        { id: "suggestion_2", status: "edited", content: { thesis: "Next filtered item." } }
      ];
      settingsState.ai.selectedSuggestionId = "suggestion_2";
      settingsState.ai.suggestionDetail = null;
      settingsState.ai.suggestionDetailLoading = false;
      return { items: settingsState.ai.suggestions, total: 1 };
    },
    async (suggestionId) => {
      detailLoads.push(suggestionId);
      settingsState.ai.suggestionDetail = {
        item: { id: suggestionId, status: "edited", content: { thesis: "Loaded next filtered item." } }
      };
      return settingsState.ai.suggestionDetail.item;
    },
    () => {},
    () => {},
    () => {}
  );

  const result = await applyAiSuggestionStatus("suggestion_1", "confirmed");
  assert.equal(result.status, "confirmed");
  assert.deepEqual(refreshCalls, [{ silent: true }]);
  assert.deepEqual(detailLoads, ["suggestion_2"]);
  assert.equal(settingsState.ai.selectedSuggestionId, "suggestion_2");
  assert.equal(settingsState.ai.suggestionDetail?.item?.id, "suggestion_2");
  assert.equal(settingsState.ai.suggestionActionError, "");
  assert.equal(settingsState.ai.suggestionActionLoading, false);
});

test("applyAiSuggestionStatus keeps selection and detail cleared when refresh leaves no filtered suggestions", async () => {
  let detailLoadCount = 0;
  const settingsState = {
    ai: {
      suggestionFilters: { status: "edited", targetType: "", targetId: "", scope: "", limit: 50 },
      suggestions: [{ id: "suggestion_1", status: "edited", content: { thesis: "Current filtered item." } }],
      suggestionDetail: { item: { id: "suggestion_1", status: "edited", content: { thesis: "Current filtered item." } } },
      selectedSuggestionId: "suggestion_1",
      suggestionDetailLoading: false,
      suggestionActionLoading: false,
      suggestionsError: "",
      suggestionDetailError: "",
      suggestionActionError: ""
    }
  };

  const applyAiSuggestionStatus = createApplyAiSuggestionStatus(
    () => ({ value: "{\"thesis\":\"Confirmed and should empty edited filter.\"}" }),
    settingsState,
    (item) => ({ item }),
    () => ({ thesis: "Confirmed and should empty edited filter." }),
    async (suggestionId, payload) => ({ id: suggestionId, status: payload.status, content: payload.content }),
    async () => {
      settingsState.ai.suggestions = [];
      settingsState.ai.selectedSuggestionId = "";
      settingsState.ai.suggestionDetail = null;
      settingsState.ai.suggestionDetailLoading = false;
      return { items: [], total: 0 };
    },
    async () => {
      detailLoadCount += 1;
      return null;
    },
    () => {},
    () => {},
    () => {}
  );

  const result = await applyAiSuggestionStatus("suggestion_1", "confirmed");
  assert.equal(result.status, "confirmed");
  assert.equal(detailLoadCount, 0);
  assert.equal(settingsState.ai.selectedSuggestionId, "");
  assert.equal(settingsState.ai.suggestionDetail, null);
  assert.equal(settingsState.ai.suggestionDetailLoading, false);
  assert.equal(settingsState.ai.suggestionActionError, "");
  assert.equal(settingsState.ai.suggestionActionLoading, false);
});

test("applyAiSuggestionStatus preserves list/detail errors while replacing stale action errors with the latest failure", async () => {
  const settingsState = {
    ai: {
      suggestions: [{ id: "suggestion_1", status: "edited", content: { thesis: "Original." } }],
      suggestionDetail: { id: "suggestion_1", status: "edited", content: { thesis: "Original." } },
      selectedSuggestionId: "suggestion_1",
      suggestionActionLoading: false,
      suggestionsError: "old list error",
      suggestionDetailError: "old detail error",
      suggestionActionError: "old action error"
    }
  };

  const applyAiSuggestionStatus = createApplyAiSuggestionStatus(
    () => ({ value: "{\"thesis\":\"Edited in settings panel.\"}" }),
    settingsState,
    (item) => ({ item }),
    () => ({ thesis: "Edited in settings panel." }),
    async () => {
      throw new Error("new failure");
    },
    async () => null,
    async () => null,
    () => {},
    () => {},
    () => {}
  );

  const result = await applyAiSuggestionStatus("suggestion_1", "confirmed");
  assert.equal(result, null);
  assert.equal(settingsState.ai.suggestionsError, "old list error");
  assert.equal(settingsState.ai.suggestionDetailError, "old detail error");
  assert.equal(settingsState.ai.suggestionActionSuggestionId, "suggestion_1");
  assert.equal(settingsState.ai.suggestionActionError, "new failure");
  assert.equal(settingsState.ai.suggestionActionLoading, false);
});

test("applyAiSuggestionStatus reports invalid reviewed content through actionError without starting submit", async () => {
  let updateCalls = 0;
  const settingsState = {
    ai: {
      suggestions: [{ id: "suggestion_1", status: "edited", content: { thesis: "Original." } }],
      suggestionDetail: { id: "suggestion_1", status: "edited", content: { thesis: "Original." } },
      selectedSuggestionId: "suggestion_1",
      suggestionActionLoading: false,
      suggestionsError: "old list error",
      suggestionDetailError: "old detail error",
      suggestionActionError: "old action error"
    }
  };

  const applyAiSuggestionStatus = createApplyAiSuggestionStatus(
    () => ({ value: "{not valid json}" }),
    settingsState,
    (item) => ({ item }),
    () => {
      throw new Error("Reviewed suggestion content must be valid JSON before it can be marked edited or confirmed");
    },
    async () => {
      updateCalls += 1;
      return null;
    },
    async () => null,
    async () => null,
    () => {},
    () => {},
    () => {}
  );

  const result = await applyAiSuggestionStatus("suggestion_1", "confirmed");
  assert.equal(result, null);
  assert.equal(updateCalls, 0);
  assert.equal(settingsState.ai.suggestionsError, "old list error");
  assert.equal(settingsState.ai.suggestionDetailError, "old detail error");
  assert.equal(settingsState.ai.suggestionActionSuggestionId, "suggestion_1");
  assert.equal(
    settingsState.ai.suggestionActionError,
    "Reviewed suggestion content must be valid JSON before it can be marked edited or confirmed"
  );
  assert.equal(settingsState.ai.suggestionActionLoading, false);
});

test("applyAiSuggestionStatus is a no-op when the suggestion already has the requested status", async () => {
  let updateCalls = 0;
  const statuses = [];
  const settingsState = {
    ai: {
      suggestions: [{ id: "suggestion_1", status: "rejected", content: { thesis: "Original." } }],
      suggestionDetail: { id: "suggestion_1", status: "rejected", content: { thesis: "Original." } },
      selectedSuggestionId: "suggestion_1",
      suggestionActionLoading: false,
      suggestionActionSuggestionId: "",
      suggestionActionNotice: "",
      suggestionActionNoticeTone: "",
      suggestionsError: "",
      suggestionDetailError: "",
      suggestionActionError: ""
    }
  };

  const applyAiSuggestionStatus = createApplyAiSuggestionStatus(
    () => ({ value: "{\"thesis\":\"Ignored.\"}" }),
    settingsState,
    (item) => ({ item }),
    () => ({ thesis: "Ignored." }),
    async () => {
      updateCalls += 1;
      return null;
    },
    async () => null,
    async () => null,
    () => {},
    (message, tone) => statuses.push({ message, tone }),
    () => {}
  );

  const result = await applyAiSuggestionStatus("suggestion_1", "rejected");
  assert.equal(result, null);
  assert.equal(updateCalls, 0);
  assert.equal(settingsState.ai.suggestionActionLoading, false);
  assert.equal(settingsState.ai.suggestionActionSuggestionId, "");
  assert.equal(settingsState.ai.suggestionActionNoticeSuggestionId, "suggestion_1");
  assert.equal(settingsState.ai.suggestionActionNotice, "This reviewed suggestion is already rejected.");
  assert.equal(settingsState.ai.suggestionActionNoticeTone, "ok");
  assert.equal(settingsState.ai.suggestionActionError, "");
  assert.deepEqual(statuses, [{ message: "AI suggestion already rejected: suggestion_1", tone: "ok" }]);
});

test("applyAiSuggestionStatus formats adopted_as_draft no-op feedback with a human-readable status label", async () => {
  let updateCalls = 0;
  const statuses = [];
  const settingsState = {
    ai: {
      suggestions: [{ id: "suggestion_1", status: "adopted_as_draft", content: { thesis: "Original." } }],
      suggestionDetail: { id: "suggestion_1", status: "adopted_as_draft", content: { thesis: "Original." } },
      selectedSuggestionId: "suggestion_1",
      suggestionActionLoading: false,
      suggestionActionSuggestionId: "",
      suggestionActionNotice: "",
      suggestionActionNoticeTone: "",
      suggestionsError: "",
      suggestionDetailError: "",
      suggestionActionError: ""
    }
  };

  const applyAiSuggestionStatus = createApplyAiSuggestionStatus(
    () => ({ value: "{\"thesis\":\"Ignored.\"}" }),
    settingsState,
    (item) => ({ item }),
    () => ({ thesis: "Ignored." }),
    async () => {
      updateCalls += 1;
      return null;
    },
    async () => null,
    async () => null,
    () => {},
    (message, tone) => statuses.push({ message, tone }),
    () => {},
    (status) => (status === "adopted_as_draft" ? "Adopted as draft" : status)
  );

  const result = await applyAiSuggestionStatus("suggestion_1", "adopted_as_draft");
  assert.equal(result, null);
  assert.equal(updateCalls, 0);
  assert.equal(settingsState.ai.suggestionActionNoticeSuggestionId, "suggestion_1");
  assert.equal(settingsState.ai.suggestionActionNotice, "This reviewed suggestion is already adopted as draft.");
  assert.deepEqual(statuses, [{ message: "AI suggestion already adopted as draft: suggestion_1", tone: "ok" }]);
});

test("applyAiSuggestionStatus formats adopted_as_draft success feedback with a human-readable status label", async () => {
  const statuses = [];
  const settingsState = {
    ai: {
      suggestions: [{ id: "suggestion_1", status: "suggested", content: { thesis: "Original." } }],
      suggestionDetail: { id: "suggestion_1", status: "suggested", content: { thesis: "Original." } },
      selectedSuggestionId: "suggestion_1",
      suggestionActionLoading: false,
      suggestionActionSuggestionId: "",
      suggestionActionNotice: "old notice",
      suggestionActionNoticeTone: "warn",
      suggestionsError: "",
      suggestionDetailError: "",
      suggestionActionError: ""
    }
  };

  const applyAiSuggestionStatus = createApplyAiSuggestionStatus(
    () => ({ value: "{\"thesis\":\"Adopt this draft.\"}" }),
    settingsState,
    (item) => ({ item }),
    () => ({ thesis: "Adopt this draft." }),
    async (suggestionId, payload) => ({ id: suggestionId, status: payload.status, content: payload.content }),
    async () => ({ items: settingsState.ai.suggestions, total: 1 }),
    async () => null,
    () => {},
    (message, tone) => statuses.push({ message, tone }),
    () => {},
    (status) => (status === "adopted_as_draft" ? "Adopted as draft" : status)
  );

  const result = await applyAiSuggestionStatus("suggestion_1", "adopted_as_draft");
  assert.equal(result.status, "adopted_as_draft");
  assert.deepEqual(statuses, [{ message: "AI suggestion adopted as draft: suggestion_1", tone: "ok" }]);
  assert.equal(settingsState.ai.suggestionActionNotice, "");
  assert.equal(settingsState.ai.suggestionActionNoticeTone, "");
});

test("applyAiSuggestionStatus reloads fresh detail instead of submitting against a stale selection", async () => {
  let updateCalls = 0;
  const loadCalls = [];
  const statuses = [];
  const settingsState = {
    ai: {
      suggestions: [
        { id: "suggestion_2", status: "edited", content: { thesis: "Current selection." } }
      ],
      suggestionDetail: { item: { id: "suggestion_1", status: "edited", content: { thesis: "Stale detail." } } },
      selectedSuggestionId: "suggestion_2",
      suggestionDetailLoading: false,
      suggestionActionLoading: false,
      suggestionActionSuggestionId: "",
      suggestionActionNotice: "",
      suggestionActionNoticeTone: "",
      suggestionsError: "",
      suggestionDetailError: "old detail error",
      suggestionActionError: ""
    }
  };

  const applyAiSuggestionStatus = createApplyAiSuggestionStatus(
    () => ({ value: "{\"thesis\":\"Ignored.\"}" }),
    settingsState,
    (item) => ({ item }),
    () => ({ thesis: "Ignored." }),
    async () => {
      updateCalls += 1;
      return null;
    },
    async () => null,
    async (suggestionId) => {
      loadCalls.push(suggestionId);
      settingsState.ai.suggestionDetail = {
        item: { id: suggestionId, status: "edited", content: { thesis: "Fresh detail." } }
      };
      settingsState.ai.suggestionDetailError = "";
      return settingsState.ai.suggestionDetail.item;
    },
    () => {},
    (message, tone) => statuses.push({ message, tone }),
    () => {}
  );

  const result = await applyAiSuggestionStatus("suggestion_2", "confirmed");
  assert.equal(result, null);
  assert.equal(updateCalls, 0);
  assert.deepEqual(loadCalls, ["suggestion_2"]);
  assert.equal(settingsState.ai.suggestionActionNoticeSuggestionId, "suggestion_2");
  assert.equal(
    settingsState.ai.suggestionActionNotice,
    "Detail changed while you were reviewing. Retry from the latest reviewed item."
  );
  assert.equal(settingsState.ai.suggestionActionNoticeTone, "warn");
  assert.deepEqual(statuses, [
    {
      message: "AI suggestion detail changed before the review action could run. Retry on the latest detail.",
      tone: "warn"
    }
  ]);
});

test("applyAiSuggestionStatus reports the latest failure status while replacing stale action errors", async () => {
  const settingsState = {
    ai: {
      suggestions: [{ id: "suggestion_1", status: "edited", content: { thesis: "Original." } }],
      suggestionDetail: { item: { id: "suggestion_1", status: "edited", content: { thesis: "Original." } } },
      selectedSuggestionId: "suggestion_1",
      suggestionActionLoading: false,
      suggestionsError: "stale list error",
      suggestionDetailError: "stale detail error",
      suggestionActionError: "stale action error"
    }
  };

  const statuses = [];
  const applyAiSuggestionStatus = createApplyAiSuggestionStatus(
    () => ({ value: "{\"thesis\":\"Edited.\"}" }),
    settingsState,
    (item) => ({ item }),
    () => ({ thesis: "Edited." }),
    async () => {
      throw new Error("latest failure");
    },
    async () => null,
    async () => null,
    () => {},
    (message, tone) => statuses.push({ message, tone }),
    () => {}
  );

  const result = await applyAiSuggestionStatus("suggestion_1", "confirmed");
  assert.equal(result, null);
  assert.equal(settingsState.ai.suggestionsError, "stale list error");
  assert.equal(settingsState.ai.suggestionDetailError, "stale detail error");
  assert.equal(settingsState.ai.suggestionActionSuggestionId, "suggestion_1");
  assert.equal(settingsState.ai.suggestionActionError, "latest failure");
  assert.equal(settingsState.ai.suggestionActionLoading, false);
  assert.deepEqual(statuses, [{ message: "AI suggestion update failed: latest failure", tone: "bad" }]);
});

test("applyAiSuggestionStatus keeps a failed review action bound to the original suggestion after selection moves", async () => {
  const settingsState = {
    ai: {
      suggestions: [
        { id: "suggestion_1", status: "edited", content: { thesis: "Original." } },
        { id: "suggestion_2", status: "suggested", content: { thesis: "Stay selected." } }
      ],
      suggestionDetail: { item: { id: "suggestion_1", status: "edited", content: { thesis: "Original." } } },
      selectedSuggestionId: "suggestion_1",
      suggestionActionLoading: false,
      suggestionActionSuggestionId: "",
      suggestionsError: "old list error",
      suggestionDetailError: "old detail error",
      suggestionActionError: ""
    }
  };

  const statuses = [];
  const applyAiSuggestionStatus = createApplyAiSuggestionStatus(
    () => ({ value: "{\"thesis\":\"Edited.\"}" }),
    settingsState,
    (item) => ({ item }),
    () => ({ thesis: "Edited." }),
    async () => {
      settingsState.ai.selectedSuggestionId = "suggestion_2";
      settingsState.ai.suggestionDetail = {
        item: { id: "suggestion_2", status: "suggested", content: { thesis: "Stay selected." } }
      };
      throw new Error("failed after selection moved");
    },
    async () => null,
    async () => null,
    () => {},
    (message, tone) => statuses.push({ message, tone }),
    () => {}
  );

  const result = await applyAiSuggestionStatus("suggestion_1", "confirmed");
  assert.equal(result, null);
  assert.equal(settingsState.ai.selectedSuggestionId, "suggestion_2");
  assert.equal(settingsState.ai.suggestionDetail?.item?.id, "suggestion_2");
  assert.equal(settingsState.ai.suggestionsError, "old list error");
  assert.equal(settingsState.ai.suggestionDetailError, "old detail error");
  assert.equal(settingsState.ai.suggestionActionSuggestionId, "suggestion_1");
  assert.equal(settingsState.ai.suggestionActionError, "failed after selection moved");
  assert.equal(settingsState.ai.suggestionActionLoading, false);
  assert.deepEqual(statuses, [{ message: "AI suggestion update failed: failed after selection moved", tone: "bad" }]);
});

test("refreshAiSuggestions invalidates stale detail state when a list refresh switches the selected suggestion", async () => {
  const settingsState = {
    ai: {
      suggestionFilters: { status: "all", targetType: "", targetId: "", scope: "", limit: 50 },
      suggestions: [{ id: "suggestion_1", status: "suggested" }],
      suggestionsTotal: 1,
      selectedSuggestionId: "suggestion_1",
      suggestionDetail: { id: "suggestion_1", status: "suggested", content: { thesis: "Old detail" } },
      suggestionDetailSuggestionId: "suggestion_1",
      suggestionDetailRequestToken: 7,
      suggestionDetailLoading: true,
      suggestionsLoading: false,
      suggestionActionLoading: false,
      suggestionActionSuggestionId: "suggestion_1",
      suggestionsError: "stale suggestion error",
      suggestionDetailError: "stale detail error",
      suggestionActionError: "stale action error"
    }
  };

  const refreshAiSuggestions = createRefreshAiSuggestions(settingsState, {
    fetchAiSuggestions: async () => ({
      items: [{ id: "suggestion_2", status: "edited" }],
      total: 1
    })
  });

  await refreshAiSuggestions({ silent: true });

  assert.equal(settingsState.ai.selectedSuggestionId, "suggestion_2");
  assert.equal(settingsState.ai.suggestionDetail, null);
  assert.equal(settingsState.ai.suggestionDetailSuggestionId, "");
  assert.equal(settingsState.ai.suggestionDetailLoading, false);
  assert.equal(settingsState.ai.suggestionDetailRequestToken, 8);
  assert.equal(settingsState.ai.suggestionsError, "");
  assert.equal(settingsState.ai.suggestionDetailError, "");
  assert.equal(settingsState.ai.suggestionActionSuggestionId, "");
  assert.equal(settingsState.ai.suggestionActionError, "");
});

test("refreshAiSuggestions keeps a newer visible user selection made while the list request is in flight", async () => {
  let resolveList;
  const detailLoads = [];
  const settingsState = {
    ai: {
      suggestionFilters: { status: "edited", targetType: "", targetId: "", scope: "", limit: 50 },
      suggestions: [
        { id: "suggestion_1", status: "edited" },
        { id: "suggestion_2", status: "edited" }
      ],
      suggestionsTotal: 2,
      selectedSuggestionId: "",
      suggestionDetail: null,
      suggestionDetailSuggestionId: "",
      suggestionDetailRequestToken: 2,
      suggestionDetailLoading: false,
      suggestionsLoading: false,
      suggestionActionLoading: false,
      suggestionActionSuggestionId: "",
      suggestionsError: "",
      suggestionDetailError: "",
      suggestionActionError: ""
    }
  };

  const refreshAiSuggestions = createRefreshAiSuggestions(settingsState, {
    fetchAiSuggestions: () =>
      new Promise((resolve) => {
        resolveList = () => resolve({
          items: [
            { id: "suggestion_1", status: "edited" },
            { id: "suggestion_2", status: "edited" }
          ],
          total: 2
        });
      }),
    loadAiSuggestionDetail: async (suggestionId) => {
      detailLoads.push(suggestionId);
      settingsState.ai.suggestionDetail = {
        item: { id: suggestionId, status: "edited", content: { thesis: "Fresh detail" } }
      };
      settingsState.ai.suggestionDetailSuggestionId = suggestionId;
      return settingsState.ai.suggestionDetail.item;
    }
  });

  const pending = refreshAiSuggestions({ silent: true });
  settingsState.ai.selectedSuggestionId = "suggestion_2";
  resolveList();
  await pending;

  assert.equal(settingsState.ai.selectedSuggestionId, "suggestion_2");
  assert.deepEqual(detailLoads, ["suggestion_2"]);
  assert.equal(settingsState.ai.suggestionDetail?.item?.id, "suggestion_2");
  assert.equal(settingsState.ai.suggestionDetailSuggestionId, "suggestion_2");
  assert.equal(settingsState.ai.suggestionActionError, "");
});

test("refreshAiSuggestions ignores an older list response after a newer filter refresh starts", async () => {
  let resolveOldList;
  let resolveNewList;
  const settingsState = {
    ai: {
      suggestionFilters: { status: "edited", targetType: "", targetId: "old-note", scope: "", limit: 50 },
      suggestions: [{ id: "suggestion_old", status: "edited", target: { id: "old-note" } }],
      suggestionsTotal: 1,
      selectedSuggestionId: "suggestion_old",
      suggestionDetail: { item: { id: "suggestion_old", status: "edited" } },
      suggestionDetailSuggestionId: "suggestion_old",
      suggestionsRequestToken: 0,
      suggestionDetailRequestToken: 0,
      suggestionDetailLoading: false,
      suggestionsLoading: false,
      suggestionActionLoading: false,
      suggestionActionSuggestionId: "",
      suggestionsError: "",
      suggestionDetailError: "",
      suggestionActionError: ""
    }
  };

  const refreshAiSuggestions = createRefreshAiSuggestions(settingsState, {
    fetchAiSuggestions: async (filters) =>
      new Promise((resolve) => {
        if (filters.targetId === "old-note") {
          resolveOldList = () => resolve({
            items: [{ id: "suggestion_old", status: "edited", target: { id: "old-note" } }],
            total: 1
          });
        } else {
          resolveNewList = () => resolve({
            items: [{ id: "suggestion_new", status: "edited", target: { id: "new-note" } }],
            total: 1
          });
        }
      }),
    loadAiSuggestionDetail: async (suggestionId) => {
      settingsState.ai.suggestionDetail = { item: { id: suggestionId, status: "edited" } };
      settingsState.ai.suggestionDetailSuggestionId = suggestionId;
      return settingsState.ai.suggestionDetail.item;
    }
  });

  const oldRefresh = refreshAiSuggestions({ silent: true });
  settingsState.ai.suggestionFilters = { status: "edited", targetType: "", targetId: "new-note", scope: "", limit: 50 };
  settingsState.ai.selectedSuggestionId = "";
  settingsState.ai.suggestionDetail = null;
  const newRefresh = refreshAiSuggestions({ silent: true });

  resolveNewList();
  await newRefresh;
  resolveOldList();
  await oldRefresh;

  assert.equal(settingsState.ai.suggestionsRequestToken, 2);
  assert.deepEqual(settingsState.ai.suggestions.map((item) => item.id), ["suggestion_new"]);
  assert.equal(settingsState.ai.selectedSuggestionId, "suggestion_new");
  assert.equal(settingsState.ai.suggestionDetail?.item?.id, "suggestion_new");
  assert.equal(settingsState.ai.suggestionsError, "");
  assert.equal(settingsState.ai.suggestionsLoading, false);
});

test("refreshAiSuggestions invalidates stale detail state when the selected suggestion metadata changes", async () => {
  const settingsState = {
    ai: {
      suggestionFilters: { status: "all", targetType: "", targetId: "", scope: "", limit: 50 },
      suggestions: [{ id: "suggestion_1", status: "suggested", updatedAt: "2026-05-18T12:00:00.000Z" }],
      suggestionsTotal: 1,
      selectedSuggestionId: "suggestion_1",
      suggestionDetail: {
        item: {
          id: "suggestion_1",
          status: "suggested",
          updatedAt: "2026-05-18T12:00:00.000Z",
          sourceArtifactId: "artifact_1",
          content: { thesis: "Old detail" }
        }
      },
      suggestionDetailSuggestionId: "suggestion_1",
      suggestionDetailRequestToken: 3,
      suggestionDetailLoading: true,
      suggestionsLoading: false,
      suggestionActionLoading: false,
      suggestionActionSuggestionId: "suggestion_1",
      suggestionsError: "stale suggestion error",
      suggestionDetailError: "stale detail error",
      suggestionActionError: "stale action error"
    }
  };

  const refreshAiSuggestions = createRefreshAiSuggestions(settingsState, {
    fetchAiSuggestions: async () => ({
      items: [{ id: "suggestion_1", status: "edited", updatedAt: "2026-05-18T12:05:00.000Z", sourceArtifactId: "artifact_1" }],
      total: 1
    })
  });

  await refreshAiSuggestions({ silent: true });

  assert.equal(settingsState.ai.selectedSuggestionId, "suggestion_1");
  assert.equal(settingsState.ai.suggestionDetail, null);
  assert.equal(settingsState.ai.suggestionDetailSuggestionId, "");
  assert.equal(settingsState.ai.suggestionDetailLoading, false);
  assert.equal(settingsState.ai.suggestionDetailRequestToken, 4);
  assert.equal(settingsState.ai.suggestionsError, "");
  assert.equal(settingsState.ai.suggestionDetailError, "");
  assert.equal(settingsState.ai.suggestionActionSuggestionId, "");
  assert.equal(settingsState.ai.suggestionActionError, "");
});

test("refreshAiSuggestions with preserveDetail keeps selection but invalidates stale detail when metadata changes", async () => {
  const settingsState = {
    ai: {
      suggestionFilters: { status: "all", targetType: "", targetId: "", scope: "", limit: 50 },
      suggestions: [{ id: "suggestion_1", status: "suggested", updatedAt: "2026-05-18T12:00:00.000Z" }],
      suggestionsTotal: 1,
      selectedSuggestionId: "suggestion_1",
      suggestionDetail: {
        item: {
          id: "suggestion_1",
          status: "suggested",
          updatedAt: "2026-05-18T12:00:00.000Z",
          sourceArtifactId: "artifact_1",
          content: { thesis: "Old detail" }
        }
      },
      suggestionDetailSuggestionId: "suggestion_1",
      suggestionDetailRequestToken: 9,
      suggestionDetailLoading: true,
      suggestionsLoading: false,
      suggestionActionLoading: false,
      suggestionActionSuggestionId: "suggestion_1",
      suggestionsError: "stale suggestion error",
      suggestionDetailError: "stale detail error",
      suggestionActionError: "stale action error"
    }
  };

  const refreshAiSuggestions = createRefreshAiSuggestions(settingsState, {
    fetchAiSuggestions: async () => ({
      items: [{ id: "suggestion_1", status: "edited", updatedAt: "2026-05-18T12:05:00.000Z", sourceArtifactId: "artifact_1" }],
      total: 1
    })
  });

  await refreshAiSuggestions({ silent: true, preserveDetail: true });

  assert.equal(settingsState.ai.selectedSuggestionId, "suggestion_1");
  assert.equal(settingsState.ai.suggestionDetail, null);
  assert.equal(settingsState.ai.suggestionDetailSuggestionId, "");
  assert.equal(settingsState.ai.suggestionDetailLoading, false);
  assert.equal(settingsState.ai.suggestionDetailRequestToken, 10);
  assert.equal(settingsState.ai.suggestionDetailError, "");
  assert.equal(settingsState.ai.suggestionActionSuggestionId, "");
  assert.equal(settingsState.ai.suggestionActionError, "");
});

test("refreshAiSuggestions with preserveDetail realigns selection and clears stale detail when the item disappears", async () => {
  const settingsState = {
    ai: {
      suggestionFilters: { status: "all", targetType: "", targetId: "", scope: "", limit: 50 },
      suggestions: [{ id: "suggestion_1", status: "suggested" }],
      suggestionsTotal: 1,
      selectedSuggestionId: "suggestion_1",
      suggestionDetail: { item: { id: "suggestion_1", status: "suggested", content: { thesis: "Old detail" } } },
      suggestionDetailSuggestionId: "suggestion_1",
      suggestionDetailRequestToken: 4,
      suggestionDetailLoading: true,
      suggestionsLoading: false,
      suggestionActionLoading: false,
      suggestionActionSuggestionId: "suggestion_1",
      suggestionsError: "stale suggestion error",
      suggestionDetailError: "stale detail error",
      suggestionActionError: "stale action error"
    }
  };

  const refreshAiSuggestions = createRefreshAiSuggestions(settingsState, {
    fetchAiSuggestions: async () => ({
      items: [{ id: "suggestion_2", status: "edited" }],
      total: 1
    })
  });

  await refreshAiSuggestions({ silent: true, preserveDetail: true });

  assert.equal(settingsState.ai.selectedSuggestionId, "suggestion_2");
  assert.equal(settingsState.ai.suggestionDetail, null);
  assert.equal(settingsState.ai.suggestionDetailSuggestionId, "");
  assert.equal(settingsState.ai.suggestionDetailLoading, false);
  assert.equal(settingsState.ai.suggestionDetailRequestToken, 5);
  assert.equal(settingsState.ai.suggestionDetailError, "");
  assert.equal(settingsState.ai.suggestionActionSuggestionId, "");
  assert.equal(settingsState.ai.suggestionActionError, "");
  assert.deepEqual(settingsState.ai.suggestions.map((item) => item.id), ["suggestion_2"]);
});

test("refreshAiSuggestions captures a suggestionsList debug snapshot", async () => {
  const snapshots = [];
  const settingsState = {
    ai: {
      suggestionFilters: { status: "all", targetType: "", targetId: "", scope: "", limit: 50 },
      suggestions: [],
      suggestionsTotal: 0,
      selectedSuggestionId: "",
      suggestionDetail: null,
      suggestionDetailRequestToken: 0,
      suggestionDetailLoading: false,
      suggestionsLoading: false,
      suggestionActionLoading: false,
      suggestionsError: "",
      suggestionDetailError: "",
      suggestionActionError: ""
    }
  };

  const refreshAiSuggestions = createRefreshAiSuggestions(settingsState, {
    fetchAiSuggestions: async () => ({
      items: [{ id: "suggestion_1", status: "suggested" }],
      total: 1,
      canonical: { items: [{ id: "suggestion_1", status: "suggested" }] }
    }),
    rememberAiDebugSnapshot: (key, response) => snapshots.push({ key, response })
  });

  await refreshAiSuggestions({ silent: true });
  assert.deepEqual(snapshots.map((entry) => entry.key), ["suggestionsList"]);
});

test("refreshAiSuggestions rehydrates the selected detail after invalidating stale metadata", async () => {
  const detailLoads = [];
  const settingsState = {
    ai: {
      suggestionFilters: { status: "all", targetType: "", targetId: "", scope: "", limit: 50 },
      suggestions: [{ id: "suggestion_1", status: "suggested", updatedAt: "2026-05-18T12:00:00.000Z" }],
      suggestionsTotal: 1,
      selectedSuggestionId: "suggestion_1",
      suggestionDetail: {
        item: {
          id: "suggestion_1",
          status: "suggested",
          updatedAt: "2026-05-18T12:00:00.000Z",
          sourceArtifactId: "artifact_1",
          content: { thesis: "Old detail" }
        }
      },
      suggestionDetailSuggestionId: "suggestion_1",
      suggestionDetailRequestToken: 11,
      suggestionDetailLoading: true,
      suggestionsLoading: false,
      suggestionActionLoading: false,
      suggestionActionSuggestionId: "suggestion_1",
      suggestionsError: "",
      suggestionDetailError: "stale detail error",
      suggestionActionError: "stale action error"
    }
  };

  const refreshAiSuggestions = createRefreshAiSuggestions(settingsState, {
    fetchAiSuggestions: async () => ({
      items: [{ id: "suggestion_1", status: "edited", updatedAt: "2026-05-18T12:05:00.000Z", sourceArtifactId: "artifact_1" }],
      total: 1
    }),
    loadAiSuggestionDetail: async (suggestionId) => {
      detailLoads.push(suggestionId);
      settingsState.ai.suggestionDetail = {
        item: {
          id: suggestionId,
          status: "edited",
          updatedAt: "2026-05-18T12:05:00.000Z",
          sourceArtifactId: "artifact_1",
          content: { thesis: "Fresh detail" }
        }
      };
      settingsState.ai.suggestionDetailSuggestionId = suggestionId;
      settingsState.ai.suggestionDetailLoading = false;
      settingsState.ai.suggestionDetailError = "";
      return settingsState.ai.suggestionDetail.item;
    }
  });

  await refreshAiSuggestions({ silent: true });

  assert.deepEqual(detailLoads, ["suggestion_1"]);
  assert.equal(settingsState.ai.selectedSuggestionId, "suggestion_1");
  assert.equal(settingsState.ai.suggestionDetail?.item?.content?.thesis, "Fresh detail");
  assert.equal(settingsState.ai.suggestionDetailSuggestionId, "suggestion_1");
  assert.equal(settingsState.ai.suggestionDetailLoading, false);
  assert.equal(settingsState.ai.suggestionActionSuggestionId, "");
  assert.equal(settingsState.ai.suggestionActionError, "");
});
