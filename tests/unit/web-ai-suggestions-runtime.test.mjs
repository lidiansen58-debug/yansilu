import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

function extractAsyncFunctionSource(source, name) {
  const signature = `async function ${name}(`;
  const start = source.indexOf(signature);
  assert.ok(start >= 0, `expected ${name}() to exist`);
  let parenDepth = 0;
  let bodyStart = -1;
  for (let index = source.indexOf("(", start); index < source.length; index += 1) {
    const char = source[index];
    if (char === "(") parenDepth += 1;
    if (char === ")") {
      parenDepth -= 1;
      if (parenDepth === 0) {
        bodyStart = source.indexOf("{", index);
        break;
      }
    }
  }
  assert.ok(bodyStart >= 0, `expected ${name}() body to exist`);
  let depth = 0;
  for (let index = bodyStart; index < source.length; index += 1) {
    const char = source[index];
    if (char === "{") depth += 1;
    if (char === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(start, index + 1);
    }
  }
  throw new Error(`could not extract ${name}() source`);
}

test("loadAiSuggestionDetail ignores stale responses and keeps the latest selected suggestion detail", async () => {
  const currentFile = fileURLToPath(import.meta.url);
  const repoRoot = path.resolve(path.dirname(currentFile), "../..");
  const source = fs.readFileSync(path.join(repoRoot, "apps/web/src/prototype-app.js"), "utf8");
  const fnSource = extractAsyncFunctionSource(source, "loadAiSuggestionDetail");

  let resolveFirst;
  let resolveSecond;
  const snapshots = [];
  const settingsState = {
    ai: {
      selectedSuggestionId: "",
      suggestionDetail: null,
      suggestionDetailRequestToken: 0,
      suggestionsError: "",
      suggestionDetailError: "",
      suggestionActionError: ""
    }
  };

  const loadAiSuggestionDetail = new Function(
    "settingsState",
    "fetchAiSuggestion",
    "suggestionDetailFromResponse",
    "rememberAiDebugSnapshot",
    "renderAiSuggestionsWorkspace",
    "setStatus",
    `${fnSource}; return loadAiSuggestionDetail;`
  )(
    settingsState,
    (suggestionId) =>
      new Promise((resolve) => {
        if (suggestionId === "suggestion_1") resolveFirst = () => resolve({ id: suggestionId, status: "suggested" });
        else resolveSecond = () => resolve({ id: suggestionId, status: "edited" });
      }),
    (item) => ({ item }),
    (key, response) => snapshots.push({ key, response }),
    () => {},
    () => {}
  );

  const firstPromise = loadAiSuggestionDetail("suggestion_1");
  assert.equal(settingsState.ai.selectedSuggestionId, "suggestion_1");
  assert.equal(settingsState.ai.suggestionDetail, null);
  const secondPromise = loadAiSuggestionDetail("suggestion_2");
  assert.equal(settingsState.ai.selectedSuggestionId, "suggestion_2");
  assert.equal(settingsState.ai.suggestionDetail, null);

  resolveSecond();
  await secondPromise;
  resolveFirst();
  await firstPromise;

  assert.equal(settingsState.ai.selectedSuggestionId, "suggestion_2");
  assert.equal(settingsState.ai.suggestionDetail?.item?.id, "suggestion_2");
  assert.equal(settingsState.ai.suggestionDetailRequestToken, 2);
  assert.deepEqual(snapshots.map((entry) => entry.key), ["suggestionDetail"]);
});

test("loadAiSuggestionDetail clears stale errors after a successful retry and when selection is reset", async () => {
  const currentFile = fileURLToPath(import.meta.url);
  const repoRoot = path.resolve(path.dirname(currentFile), "../..");
  const source = fs.readFileSync(path.join(repoRoot, "apps/web/src/prototype-app.js"), "utf8");
  const fnSource = extractAsyncFunctionSource(source, "loadAiSuggestionDetail");

  const settingsState = {
    ai: {
      selectedSuggestionId: "suggestion_old",
      suggestionDetail: { id: "suggestion_old", status: "suggested" },
      suggestionDetailRequestToken: 0,
      suggestionDetailLoading: false,
      suggestionsError: "stale list error",
      suggestionDetailError: "stale detail error",
      suggestionActionError: "stale action error"
    }
  };

  const loadAiSuggestionDetail = new Function(
    "settingsState",
    "fetchAiSuggestion",
    "suggestionDetailFromResponse",
    "rememberAiDebugSnapshot",
    "renderAiSuggestionsWorkspace",
    "setStatus",
    `${fnSource}; return loadAiSuggestionDetail;`
  )(
    settingsState,
    async (suggestionId) => ({ id: suggestionId, status: "edited" }),
    (item) => ({ item }),
    () => {},
    () => {},
    () => {}
  );

  const fetched = await loadAiSuggestionDetail("suggestion_retry");
  assert.equal(fetched.id, "suggestion_retry");
  assert.equal(settingsState.ai.selectedSuggestionId, "suggestion_retry");
  assert.equal(settingsState.ai.suggestionDetail?.item?.id, "suggestion_retry");
  assert.equal(settingsState.ai.suggestionsError, "stale list error");
  assert.equal(settingsState.ai.suggestionDetailError, "");
  assert.equal(settingsState.ai.suggestionActionError, "");
  assert.equal(settingsState.ai.suggestionDetailLoading, false);

  await loadAiSuggestionDetail("");
  assert.equal(settingsState.ai.selectedSuggestionId, "");
  assert.equal(settingsState.ai.suggestionDetail, null);
  assert.equal(settingsState.ai.suggestionsError, "stale list error");
  assert.equal(settingsState.ai.suggestionDetailError, "");
  assert.equal(settingsState.ai.suggestionActionError, "");
  assert.equal(settingsState.ai.suggestionDetailLoading, false);
});

test("loadAiSuggestionDetail stores detail failures separately from list errors", async () => {
  const currentFile = fileURLToPath(import.meta.url);
  const repoRoot = path.resolve(path.dirname(currentFile), "../..");
  const source = fs.readFileSync(path.join(repoRoot, "apps/web/src/prototype-app.js"), "utf8");
  const fnSource = extractAsyncFunctionSource(source, "loadAiSuggestionDetail");

  const settingsState = {
    ai: {
      selectedSuggestionId: "suggestion_old",
      suggestionDetail: { id: "suggestion_old", status: "suggested" },
      suggestionDetailRequestToken: 0,
      suggestionDetailLoading: false,
      suggestionsError: "list failed earlier",
      suggestionDetailError: "",
      suggestionActionError: ""
    }
  };

  const loadAiSuggestionDetail = new Function(
    "settingsState",
    "fetchAiSuggestion",
    "suggestionDetailFromResponse",
    "rememberAiDebugSnapshot",
    "renderAiSuggestionsWorkspace",
    "setStatus",
    `${fnSource}; return loadAiSuggestionDetail;`
  )(
    settingsState,
    async () => {
      throw new Error("detail boom");
    },
    (item) => ({ item }),
    () => {},
    () => {},
    () => {}
  );

  const fetched = await loadAiSuggestionDetail("suggestion_retry");
  assert.equal(fetched, null);
  assert.equal(settingsState.ai.suggestionsError, "list failed earlier");
  assert.equal(settingsState.ai.suggestionDetailError, "detail boom");
  assert.equal(settingsState.ai.suggestionActionError, "");
  assert.equal(settingsState.ai.suggestionDetailLoading, false);
});

test("applyAiSuggestionStatus captures edited content before rerender and blocks duplicate submission", async () => {
  const currentFile = fileURLToPath(import.meta.url);
  const repoRoot = path.resolve(path.dirname(currentFile), "../..");
  const source = fs.readFileSync(path.join(repoRoot, "apps/web/src/prototype-app.js"), "utf8");
  const fnSource = extractAsyncFunctionSource(source, "applyAiSuggestionStatus");

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

  const applyAiSuggestionStatus = new Function(
    "$",
    "settingsState",
    "suggestionDetailFromResponse",
    "aiSuggestionReviewedContentFromUi",
    "updateAiSuggestion",
    "refreshAiSuggestions",
    "loadAiSuggestionDetail",
    "rememberAiDebugSnapshot",
    "setStatus",
    "renderAiSuggestionsWorkspace",
    `${fnSource}; return applyAiSuggestionStatus;`
  )(
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

test("applyAiSuggestionStatus preserves a newer settings suggestion selection while an older submit resolves", async () => {
  const currentFile = fileURLToPath(import.meta.url);
  const repoRoot = path.resolve(path.dirname(currentFile), "../..");
  const source = fs.readFileSync(path.join(repoRoot, "apps/web/src/prototype-app.js"), "utf8");
  const fnSource = extractAsyncFunctionSource(source, "applyAiSuggestionStatus");

  const settingsState = {
    ai: {
      suggestions: [
        { id: "suggestion_1", status: "edited", content: { thesis: "Original." } },
        { id: "suggestion_2", status: "suggested", content: { thesis: "Keep me selected." } }
      ],
      suggestionDetail: { item: { id: "suggestion_1", status: "edited", content: { thesis: "Original." } } },
      selectedSuggestionId: "suggestion_1",
      suggestionActionLoading: false,
      suggestionsError: "",
      suggestionDetailError: "",
      suggestionActionError: ""
    }
  };
  const snapshots = [];

  const applyAiSuggestionStatus = new Function(
    "$",
    "settingsState",
    "suggestionDetailFromResponse",
    "aiSuggestionReviewedContentFromUi",
    "updateAiSuggestion",
    "refreshAiSuggestions",
    "loadAiSuggestionDetail",
    "rememberAiDebugSnapshot",
    "setStatus",
    "renderAiSuggestionsWorkspace",
    `${fnSource}; return applyAiSuggestionStatus;`
  )(
    () => ({ value: "{\"thesis\":\"Updated old selection.\"}" }),
    settingsState,
    (item) => ({ item }),
    () => ({ thesis: "Updated old selection." }),
    async (suggestionId, payload) => {
      settingsState.ai.selectedSuggestionId = "suggestion_2";
      settingsState.ai.suggestionDetail = {
        item: { id: "suggestion_2", status: "suggested", content: { thesis: "Keep me selected." } }
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
  const currentFile = fileURLToPath(import.meta.url);
  const repoRoot = path.resolve(path.dirname(currentFile), "../..");
  const source = fs.readFileSync(path.join(repoRoot, "apps/web/src/prototype-app.js"), "utf8");
  const fnSource = extractAsyncFunctionSource(source, "applyAiSuggestionStatus");

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

  const applyAiSuggestionStatus = new Function(
    "$",
    "settingsState",
    "suggestionDetailFromResponse",
    "aiSuggestionReviewedContentFromUi",
    "updateAiSuggestion",
    "refreshAiSuggestions",
    "loadAiSuggestionDetail",
    "rememberAiDebugSnapshot",
    "setStatus",
    "renderAiSuggestionsWorkspace",
    `${fnSource}; return applyAiSuggestionStatus;`
  )(
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
  const currentFile = fileURLToPath(import.meta.url);
  const repoRoot = path.resolve(path.dirname(currentFile), "../..");
  const source = fs.readFileSync(path.join(repoRoot, "apps/web/src/prototype-app.js"), "utf8");
  const fnSource = extractAsyncFunctionSource(source, "applyAiSuggestionStatus");

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

  const applyAiSuggestionStatus = new Function(
    "$",
    "settingsState",
    "suggestionDetailFromResponse",
    "aiSuggestionReviewedContentFromUi",
    "updateAiSuggestion",
    "refreshAiSuggestions",
    "loadAiSuggestionDetail",
    "rememberAiDebugSnapshot",
    "setStatus",
    "renderAiSuggestionsWorkspace",
    `${fnSource}; return applyAiSuggestionStatus;`
  )(
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
  const currentFile = fileURLToPath(import.meta.url);
  const repoRoot = path.resolve(path.dirname(currentFile), "../..");
  const source = fs.readFileSync(path.join(repoRoot, "apps/web/src/prototype-app.js"), "utf8");
  const fnSource = extractAsyncFunctionSource(source, "applyAiSuggestionStatus");

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

  const applyAiSuggestionStatus = new Function(
    "$",
    "settingsState",
    "suggestionDetailFromResponse",
    "aiSuggestionReviewedContentFromUi",
    "updateAiSuggestion",
    "refreshAiSuggestions",
    "loadAiSuggestionDetail",
    "rememberAiDebugSnapshot",
    "setStatus",
    "renderAiSuggestionsWorkspace",
    `${fnSource}; return applyAiSuggestionStatus;`
  )(
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

test("applyAiSuggestionStatus replaces stale errors with the latest failure", async () => {
  const currentFile = fileURLToPath(import.meta.url);
  const repoRoot = path.resolve(path.dirname(currentFile), "../..");
  const source = fs.readFileSync(path.join(repoRoot, "apps/web/src/prototype-app.js"), "utf8");
  const fnSource = extractAsyncFunctionSource(source, "applyAiSuggestionStatus");

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

  const applyAiSuggestionStatus = new Function(
    "$",
    "settingsState",
    "suggestionDetailFromResponse",
    "aiSuggestionReviewedContentFromUi",
    "updateAiSuggestion",
    "refreshAiSuggestions",
    "loadAiSuggestionDetail",
    "rememberAiDebugSnapshot",
    "setStatus",
    "renderAiSuggestionsWorkspace",
    `${fnSource}; return applyAiSuggestionStatus;`
  )(
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
  assert.equal(settingsState.ai.suggestionActionError, "new failure");
});

test("applyAiSuggestionStatus reports invalid reviewed content through actionError without starting submit", async () => {
  const currentFile = fileURLToPath(import.meta.url);
  const repoRoot = path.resolve(path.dirname(currentFile), "../..");
  const source = fs.readFileSync(path.join(repoRoot, "apps/web/src/prototype-app.js"), "utf8");
  const fnSource = extractAsyncFunctionSource(source, "applyAiSuggestionStatus");

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

  const applyAiSuggestionStatus = new Function(
    "$",
    "settingsState",
    "suggestionDetailFromResponse",
    "aiSuggestionReviewedContentFromUi",
    "updateAiSuggestion",
    "refreshAiSuggestions",
    "loadAiSuggestionDetail",
    "rememberAiDebugSnapshot",
    "setStatus",
    "renderAiSuggestionsWorkspace",
    `${fnSource}; return applyAiSuggestionStatus;`
  )(
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
  assert.equal(
    settingsState.ai.suggestionActionError,
    "Reviewed suggestion content must be valid JSON before it can be marked edited or confirmed"
  );
  assert.equal(settingsState.ai.suggestionActionLoading, false);
});

test("refreshAiSuggestions invalidates stale detail state when a list refresh switches the selected suggestion", async () => {
  const currentFile = fileURLToPath(import.meta.url);
  const repoRoot = path.resolve(path.dirname(currentFile), "../..");
  const source = fs.readFileSync(path.join(repoRoot, "apps/web/src/prototype-app.js"), "utf8");
  const fnSource = extractAsyncFunctionSource(source, "refreshAiSuggestions");

  const settingsState = {
    ai: {
      suggestionFilters: { status: "all", targetType: "", targetId: "", scope: "", limit: 50 },
      suggestions: [{ id: "suggestion_1", status: "suggested" }],
      suggestionsTotal: 1,
      selectedSuggestionId: "suggestion_1",
      suggestionDetail: { id: "suggestion_1", status: "suggested", content: { thesis: "Old detail" } },
      suggestionDetailRequestToken: 7,
      suggestionDetailLoading: true,
      suggestionsLoading: false,
      suggestionActionLoading: false,
      suggestionsError: "stale suggestion error",
      suggestionDetailError: "stale detail error",
      suggestionActionError: "stale action error"
    }
  };

  const refreshAiSuggestions = new Function(
    "settingsState",
    "normalizeAiSuggestionFilters",
    "fetchAiSuggestions",
    "rememberAiDebugSnapshot",
    "renderAiSuggestionsWorkspace",
    "setStatus",
    `${fnSource}; return refreshAiSuggestions;`
  )(
    settingsState,
    (filters) => filters,
    async () => ({
      items: [{ id: "suggestion_2", status: "edited" }],
      total: 1
    }),
    () => {},
    () => {},
    () => {}
  );

  await refreshAiSuggestions({ silent: true });

  assert.equal(settingsState.ai.selectedSuggestionId, "suggestion_2");
  assert.equal(settingsState.ai.suggestionDetail, null);
  assert.equal(settingsState.ai.suggestionDetailLoading, false);
  assert.equal(settingsState.ai.suggestionDetailRequestToken, 8);
  assert.equal(settingsState.ai.suggestionsError, "");
  assert.equal(settingsState.ai.suggestionDetailError, "");
  assert.equal(settingsState.ai.suggestionActionError, "");
});

test("refreshAiSuggestions invalidates stale detail state when the selected suggestion metadata changes", async () => {
  const currentFile = fileURLToPath(import.meta.url);
  const repoRoot = path.resolve(path.dirname(currentFile), "../..");
  const source = fs.readFileSync(path.join(repoRoot, "apps/web/src/prototype-app.js"), "utf8");
  const fnSource = extractAsyncFunctionSource(source, "refreshAiSuggestions");

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
      suggestionDetailRequestToken: 3,
      suggestionDetailLoading: true,
      suggestionsLoading: false,
      suggestionActionLoading: false,
      suggestionsError: "stale suggestion error",
      suggestionDetailError: "stale detail error",
      suggestionActionError: "stale action error"
    }
  };

  const refreshAiSuggestions = new Function(
    "settingsState",
    "normalizeAiSuggestionFilters",
    "fetchAiSuggestions",
    "rememberAiDebugSnapshot",
    "renderAiSuggestionsWorkspace",
    "setStatus",
    `${fnSource}; return refreshAiSuggestions;`
  )(
    settingsState,
    (filters) => filters,
    async () => ({
      items: [{ id: "suggestion_1", status: "edited", updatedAt: "2026-05-18T12:05:00.000Z", sourceArtifactId: "artifact_1" }],
      total: 1
    }),
    () => {},
    () => {},
    () => {}
  );

  await refreshAiSuggestions({ silent: true });

  assert.equal(settingsState.ai.selectedSuggestionId, "suggestion_1");
  assert.equal(settingsState.ai.suggestionDetail, null);
  assert.equal(settingsState.ai.suggestionDetailLoading, false);
  assert.equal(settingsState.ai.suggestionDetailRequestToken, 4);
  assert.equal(settingsState.ai.suggestionsError, "");
  assert.equal(settingsState.ai.suggestionDetailError, "");
  assert.equal(settingsState.ai.suggestionActionError, "");
});

test("refreshAiSuggestions captures a suggestionsList debug snapshot", async () => {
  const currentFile = fileURLToPath(import.meta.url);
  const repoRoot = path.resolve(path.dirname(currentFile), "../..");
  const source = fs.readFileSync(path.join(repoRoot, "apps/web/src/prototype-app.js"), "utf8");
  const fnSource = extractAsyncFunctionSource(source, "refreshAiSuggestions");

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

  const refreshAiSuggestions = new Function(
    "settingsState",
    "normalizeAiSuggestionFilters",
    "fetchAiSuggestions",
    "rememberAiDebugSnapshot",
    "renderAiSuggestionsWorkspace",
    "setStatus",
    `${fnSource}; return refreshAiSuggestions;`
  )(
    settingsState,
    (filters) => filters,
    async () => ({
      items: [{ id: "suggestion_1", status: "suggested" }],
      total: 1,
      canonical: { items: [{ id: "suggestion_1", status: "suggested" }] }
    }),
    (key, response) => snapshots.push({ key, response }),
    () => {},
    () => {}
  );

  await refreshAiSuggestions({ silent: true });
  assert.deepEqual(snapshots.map((entry) => entry.key), ["suggestionsList"]);
});
