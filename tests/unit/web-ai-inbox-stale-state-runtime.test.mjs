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

test("loadAiInboxDetail ignores stale responses and keeps the latest selected artifact detail", async () => {
  const currentFile = fileURLToPath(import.meta.url);
  const repoRoot = path.resolve(path.dirname(currentFile), "../..");
  const source = fs.readFileSync(path.join(repoRoot, "apps/web/src/prototype-app.js"), "utf8");
  const fnSource = extractAsyncFunctionSource(source, "loadAiInboxDetail");

  let resolveFirst;
  let resolveSecond;
  const fetchCalls = [];
  const aiInboxState = {
    selectedArtifactId: "",
    detail: null,
    detailLoading: false,
    detailError: "",
    detailRequestToken: 0
  };

  const loadAiInboxDetail = new Function(
    "aiInboxState",
    "fetchAiInboxItemWithOptions",
    "aiInboxDetailFromResponse",
    "rememberAiDebugSnapshot",
    "syncAiInboxSummaryFromDetail",
    "resetAiInboxSummaryState",
    "renderAiInboxWorkspace",
    "setStatus",
    `${fnSource}; return loadAiInboxDetail;`
  )(
    aiInboxState,
    (artifactId) => {
      fetchCalls.push(artifactId);
      if (artifactId === "artifact_1") {
        return new Promise((resolve) => {
          resolveFirst = () => resolve({ item: { artifactId }, canonical: {} });
        });
      }
      return new Promise((resolve) => {
        resolveSecond = () => resolve({ item: { artifactId }, canonical: {} });
      });
    },
    (response) => ({ item: response.item }),
    () => {},
    () => {},
    () => {},
    () => {},
    () => {}
  );

  const firstPromise = loadAiInboxDetail("artifact_1");
  const secondPromise = loadAiInboxDetail("artifact_2");

  resolveSecond();
  await secondPromise;
  resolveFirst();
  await firstPromise;

  assert.deepEqual(fetchCalls, ["artifact_1", "artifact_2"]);
  assert.equal(aiInboxState.selectedArtifactId, "artifact_2");
  assert.equal(aiInboxState.detail?.item?.artifactId, "artifact_2");
  assert.equal(aiInboxState.detailLoading, false);
  assert.equal(aiInboxState.detailRequestToken, 2);
});

test("loadAiInboxDetail clears stale errors after a successful retry and when selection is reset", async () => {
  const currentFile = fileURLToPath(import.meta.url);
  const repoRoot = path.resolve(path.dirname(currentFile), "../..");
  const source = fs.readFileSync(path.join(repoRoot, "apps/web/src/prototype-app.js"), "utf8");
  const fnSource = extractAsyncFunctionSource(source, "loadAiInboxDetail");

  const aiInboxState = {
    selectedArtifactId: "artifact_old",
    detail: { item: { artifactId: "artifact_old" } },
    detailLoading: false,
    detailError: "stale detail error",
    detailRequestToken: 0
  };

  const loadAiInboxDetail = new Function(
    "aiInboxState",
    "fetchAiInboxItemWithOptions",
    "aiInboxDetailFromResponse",
    "rememberAiDebugSnapshot",
    "syncAiInboxSummaryFromDetail",
    "resetAiInboxSummaryState",
    "renderAiInboxWorkspace",
    "setStatus",
    `${fnSource}; return loadAiInboxDetail;`
  )(
    aiInboxState,
    async (artifactId) => ({ item: { artifactId }, canonical: {} }),
    (response) => ({ item: response.item }),
    () => {},
    () => {},
    () => {},
    () => {},
    () => {}
  );

  const fetched = await loadAiInboxDetail("artifact_retry");
  assert.equal(fetched.item.artifactId, "artifact_retry");
  assert.equal(aiInboxState.selectedArtifactId, "artifact_retry");
  assert.equal(aiInboxState.detail?.item?.artifactId, "artifact_retry");
  assert.equal(aiInboxState.detailError, "");
  assert.equal(aiInboxState.detailLoading, false);

  await loadAiInboxDetail("");
  assert.equal(aiInboxState.selectedArtifactId, "");
  assert.equal(aiInboxState.detail, null);
  assert.equal(aiInboxState.detailError, "");
  assert.equal(aiInboxState.detailLoading, false);
});

test("applyAiInboxSuggestionStatus is a no-op while another inbox action is already in flight", async () => {
  const currentFile = fileURLToPath(import.meta.url);
  const repoRoot = path.resolve(path.dirname(currentFile), "../..");
  const source = fs.readFileSync(path.join(repoRoot, "apps/web/src/prototype-app.js"), "utf8");
  const fnSource = extractAsyncFunctionSource(source, "applyAiInboxSuggestionStatus");
  const calls = [];

  const applyAiInboxSuggestionStatus = new Function(
    "$",
    "aiInboxState",
    "adoptAiInboxFieldSuggestionDraft",
    "aiInboxSuggestionReviewedContentFromUi",
    "updateAiSuggestion",
    "loadAiInboxDetail",
    "refreshAiInbox",
    "refreshAiInboxEvaluationSummary",
    "rememberAiDebugSnapshot",
    "setStatus",
    "renderAiInboxWorkspace",
    `${fnSource}; return applyAiInboxSuggestionStatus;`
  )(
    () => ({ value: "" }),
    {
      selectedArtifactId: "artifact_1",
      detail: {
        item: { artifactId: "artifact_1" },
        suggestion: { id: "suggestion_1", status: "edited", content: { thesis: "x" } }
      },
      actionLoading: true
    },
    async () => {
      calls.push("adopt");
    },
    () => ({ thesis: "x" }),
    async () => {
      calls.push("update");
    },
    async () => {},
    async () => {},
    async () => {},
    () => {},
    () => {},
    () => {}
  );

  const result = await applyAiInboxSuggestionStatus("confirmed");
  assert.equal(result, null);
  assert.deepEqual(calls, []);
});

test("refreshAiInbox invalidates stale detail state when a list refresh switches the selected artifact", async () => {
  const currentFile = fileURLToPath(import.meta.url);
  const repoRoot = path.resolve(path.dirname(currentFile), "../..");
  const source = fs.readFileSync(path.join(repoRoot, "apps/web/src/prototype-app.js"), "utf8");
  const fnSource = extractAsyncFunctionSource(source, "refreshAiInbox");

  const aiInboxState = {
    filters: { view: "pending", type: "all" },
    items: [{ artifactId: "artifact_1", title: "Old selection" }],
    counts: {},
    views: [],
    loading: false,
    error: "stale detail error",
    selectedArtifactId: "artifact_1",
    detail: { item: { artifactId: "artifact_1", title: "Old detail" } },
    detailLoading: true,
    detailError: "stale detail error",
    detailRequestToken: 4,
    aiSummary: "stale summary",
    aiSummaryMeta: "stale meta",
    aiSummaryRecommendedAction: "ignore",
    aiSummaryError: "stale summary error"
  };

  const refreshAiInbox = new Function(
    "aiInboxState",
    "normalizeAiInboxFilters",
    "fetchAiInbox",
    "aiInboxItemFromCanonical",
    "rememberAiDebugSnapshot",
    "resetAiInboxSummaryState",
    "renderAiInboxWorkspace",
    "setStatus",
    `${fnSource}; return refreshAiInbox;`
  )(
    aiInboxState,
    (filters) => filters,
    async () => ({
      items: [{ artifactId: "artifact_2", title: "New selection" }],
      counts: { pending: 1, reviewed: 0, archived: 0, all: 1 },
      views: ["pending"],
      canonical: {
        items: [{ artifact_id: "artifact_2", title: "New selection" }]
      }
    }),
    (item) => ({ artifactId: item.artifact_id, title: item.title }),
    () => {},
    () => {
      aiInboxState.aiSummary = "";
      aiInboxState.aiSummaryMeta = "";
      aiInboxState.aiSummaryRecommendedAction = "";
      aiInboxState.aiSummaryError = "";
    },
    () => {},
    () => {}
  );

  await refreshAiInbox({ silent: true });

  assert.equal(aiInboxState.selectedArtifactId, "artifact_2");
  assert.equal(aiInboxState.detail, null);
  assert.equal(aiInboxState.detailLoading, false);
  assert.equal(aiInboxState.detailError, "");
  assert.equal(aiInboxState.detailRequestToken, 5);
  assert.equal(aiInboxState.aiSummary, "");
  assert.equal(aiInboxState.aiSummaryMeta, "");
  assert.equal(aiInboxState.aiSummaryRecommendedAction, "");
  assert.equal(aiInboxState.aiSummaryError, "");
});

test("runAiInboxSummary ignores stale failures and keeps the latest summary state", async () => {
  const currentFile = fileURLToPath(import.meta.url);
  const repoRoot = path.resolve(path.dirname(currentFile), "../..");
  const source = fs.readFileSync(path.join(repoRoot, "apps/web/src/prototype-app.js"), "utf8");
  const fnSource = extractAsyncFunctionSource(source, "runAiInboxSummary");

  let rejectFirst;
  let resolveSecond;
  const aiInboxState = {
    selectedArtifactId: "artifact_2",
    detail: null,
    aiSummary: "stale summary",
    aiSummaryMeta: "stale meta",
    aiSummaryRecommendedAction: "ignore",
    aiSummaryLoading: false,
    aiSummaryError: "stale error",
    aiSummaryRequestToken: 0
  };

  const runAiInboxSummary = new Function(
    "aiInboxState",
    "settingsState",
    "summarizeAiInboxItem",
    "recommendedAiInboxActionFromText",
    "loadAiInboxDetail",
    "setStatus",
    "renderAiInboxWorkspace",
    `${fnSource}; return runAiInboxSummary;`
  )(
    aiInboxState,
    { ai: { userMode: "Auto", modelPack: "Starter Auto", routePreview: { privacy: { mode: "normal" } } } },
    (artifactId) =>
      new Promise((resolve, reject) => {
        if (artifactId === "artifact_1") rejectFirst = () => reject(new Error("old failure"));
        else resolveSecond = () =>
          resolve({
            providerId: "provider_b",
            modelRef: "model_b",
            output: { content: "new summary" },
            recommendedAction: "ignore",
            artifact: { id: artifactId, status: "ignored" },
            inboxItem: { artifactId }
          });
      }),
    (text) => (String(text).includes("context") ? "needs_more_context" : "ignore"),
    async () => {
      throw new Error("loadAiInboxDetail should not run when summary returns an artifact");
    },
    () => {},
    () => {}
  );

  const firstPromise = runAiInboxSummary("artifact_1");
  const secondPromise = runAiInboxSummary("artifact_2");

  resolveSecond();
  await secondPromise;
  rejectFirst();
  await firstPromise;

  assert.equal(aiInboxState.aiSummary, "new summary");
  assert.equal(aiInboxState.aiSummaryMeta, "provider_b / model_b");
  assert.equal(aiInboxState.aiSummaryRecommendedAction, "ignore");
  assert.equal(aiInboxState.aiSummaryError, "");
  assert.equal(aiInboxState.aiSummaryLoading, false);
  assert.equal(aiInboxState.aiSummaryRequestToken, 2);
  assert.equal(aiInboxState.detail?.item?.artifactId, "artifact_2");
});

test("refreshAiInboxEvaluationSummary ignores stale failures and keeps the latest evaluation state", async () => {
  const currentFile = fileURLToPath(import.meta.url);
  const repoRoot = path.resolve(path.dirname(currentFile), "../..");
  const source = fs.readFileSync(path.join(repoRoot, "apps/web/src/prototype-app.js"), "utf8");
  const fnSource = extractAsyncFunctionSource(source, "refreshAiInboxEvaluationSummary");

  let rejectFirst;
  let resolveSecond;
  const renders = [];
  const aiInboxState = {
    filters: { view: "pending", type: "all", sourceNoteId: "", privacyMode: "" },
    evaluationSummary: { filter: { view: "all" }, artifacts: { total: 9 } },
    evaluationError: "stale evaluation error",
    evaluationLoading: false,
    evaluationRequestToken: 0
  };

  const refreshAiInboxEvaluationSummary = new Function(
    "aiInboxState",
    "normalizeAiInboxFilters",
    "fetchAiInboxEvaluationSummary",
    "renderAiInboxWorkspace",
    "setStatus",
    `${fnSource}; return refreshAiInboxEvaluationSummary;`
  )(
    aiInboxState,
    (filters) => filters,
    () =>
      new Promise((resolve, reject) => {
        if (!rejectFirst) rejectFirst = () => reject(new Error("old evaluation failure"));
        else resolveSecond = () => resolve({ filter: { view: "all" }, artifacts: { total: 1 } });
      }),
    () => {
      renders.push({
        evaluationError: aiInboxState.evaluationError,
        evaluationLoading: aiInboxState.evaluationLoading
      });
    },
    () => {}
  );

  const firstPromise = refreshAiInboxEvaluationSummary({ silent: false });
  const secondPromise = refreshAiInboxEvaluationSummary({ silent: false });

  resolveSecond();
  await secondPromise;
  rejectFirst();
  await firstPromise;

  assert.deepEqual(aiInboxState.evaluationSummary, { filter: { view: "all" }, artifacts: { total: 1 } });
  assert.equal(aiInboxState.evaluationError, "");
  assert.equal(aiInboxState.evaluationLoading, false);
  assert.equal(aiInboxState.evaluationRequestToken, 2);
  assert.ok(renders.length >= 2);
});
