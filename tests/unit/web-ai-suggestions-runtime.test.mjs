import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

function extractAsyncFunctionSource(source, name) {
  const signature = `async function ${name}(`;
  const start = source.indexOf(signature);
  assert.ok(start >= 0, `expected ${name}() to exist`);
  const bodyStart = source.indexOf("{", start);
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
  const settingsState = {
    ai: {
      selectedSuggestionId: "",
      suggestionDetail: null,
      suggestionDetailRequestToken: 0,
      suggestionsError: ""
    }
  };

  const loadAiSuggestionDetail = new Function(
    "settingsState",
    "fetchAiSuggestion",
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
  assert.equal(settingsState.ai.suggestionDetail?.id, "suggestion_2");
  assert.equal(settingsState.ai.suggestionDetailRequestToken, 2);
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
  const settingsState = {
    ai: {
      suggestions: [{ id: "suggestion_1", status: "adopted_as_draft", content: { thesis: "Original." } }],
      suggestionDetail: { id: "suggestion_1", status: "adopted_as_draft", content: { thesis: "Original." } },
      selectedSuggestionId: "suggestion_1",
      suggestionActionLoading: false,
      suggestionsError: "stale error"
    }
  };

  const applyAiSuggestionStatus = new Function(
    "$",
    "settingsState",
    "aiSuggestionReviewedContentFromUi",
    "updateAiSuggestion",
    "setStatus",
    "renderAiSuggestionsWorkspace",
    `${fnSource}; return applyAiSuggestionStatus;`
  )(
    (id) => domState[id],
    settingsState,
    (current) => JSON.parse(String(domState.aiSuggestionContentEditor.value || "")),
    async (suggestionId, payload) => {
      calls.push({ suggestionId, payload });
      return { id: suggestionId, status: payload.status, content: payload.content };
    },
    () => {},
    () => {
      domState.aiSuggestionContentEditor.value = "{\"thesis\":\"stale\"}";
    }
  );

  const first = await applyAiSuggestionStatus("suggestion_1", "edited");
  assert.equal(first.status, "edited");
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0].payload.content, { thesis: "Edited in settings panel." });
  assert.equal(settingsState.ai.suggestionsError, "");

  settingsState.ai.suggestionActionLoading = true;
  const second = await applyAiSuggestionStatus("suggestion_1", "confirmed");
  assert.equal(second, null);
  assert.equal(calls.length, 1);
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
      suggestionsError: "old error"
    }
  };

  const applyAiSuggestionStatus = new Function(
    "$",
    "settingsState",
    "aiSuggestionReviewedContentFromUi",
    "updateAiSuggestion",
    "setStatus",
    "renderAiSuggestionsWorkspace",
    `${fnSource}; return applyAiSuggestionStatus;`
  )(
    () => ({ value: "{\"thesis\":\"Edited in settings panel.\"}" }),
    settingsState,
    () => ({ thesis: "Edited in settings panel." }),
    async () => {
      throw new Error("new failure");
    },
    () => {},
    () => {}
  );

  const result = await applyAiSuggestionStatus("suggestion_1", "confirmed");
  assert.equal(result, null);
  assert.equal(settingsState.ai.suggestionsError, "new failure");
});
