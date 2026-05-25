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
    actionError: "",
    detailRequestToken: 0
  };

  const loadAiInboxDetail = new Function(
    "aiInboxState",
    "fetchAiInboxItemWithOptions",
    "aiInboxDetailFromResponse",
    "rememberAiDebugSnapshot",
    "syncAiInboxSummaryFromDetail",
    "resetAiInboxSummaryState",
    "clearAiInboxActionNotice",
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
    actionError: "stale action error",
    detailRequestToken: 0
  };

  const loadAiInboxDetail = new Function(
    "aiInboxState",
    "fetchAiInboxItemWithOptions",
    "aiInboxDetailFromResponse",
    "rememberAiDebugSnapshot",
    "syncAiInboxSummaryFromDetail",
    "resetAiInboxSummaryState",
    "clearAiInboxActionNotice",
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
    () => {},
    () => {}
  );

  const fetched = await loadAiInboxDetail("artifact_retry");
  assert.equal(fetched.item.artifactId, "artifact_retry");
  assert.equal(aiInboxState.selectedArtifactId, "artifact_retry");
  assert.equal(aiInboxState.detail?.item?.artifactId, "artifact_retry");
  assert.equal(aiInboxState.detailError, "");
  assert.equal(aiInboxState.actionError, "");
  assert.equal(aiInboxState.detailLoading, false);

  await loadAiInboxDetail("");
  assert.equal(aiInboxState.selectedArtifactId, "");
  assert.equal(aiInboxState.detail, null);
  assert.equal(aiInboxState.detailError, "");
  assert.equal(aiInboxState.actionError, "");
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
      actionLoading: true,
      actionError: "stale action error"
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

test("applyAiInboxRecommendedAction reloads fresh detail instead of dispatching against a stale selection", async () => {
  const currentFile = fileURLToPath(import.meta.url);
  const repoRoot = path.resolve(path.dirname(currentFile), "../..");
  const source = fs.readFileSync(path.join(repoRoot, "apps/web/src/prototype-app.js"), "utf8");
  const fnSource = extractAsyncFunctionSource(source, "applyAiInboxRecommendedAction");

  const loadCalls = [];
  const notices = [];
  const statuses = [];
  let acceptCalls = 0;
  let confirmCalls = 0;
  const aiInboxState = {
    selectedArtifactId: "artifact_2",
    detail: { item: { artifactId: "artifact_1" } },
    detailLoading: false,
    aiSummaryRecommendedAction: "accept_link"
  };

  const applyAiInboxRecommendedAction = new Function(
    "$",
    "window",
    "aiInboxState",
    "loadAiInboxDetail",
    "setAiInboxActionNotice",
    "renderAiInboxWorkspace",
    "setStatus",
    "acceptAiInboxLinkSuggestion",
    "adoptAiInboxFieldSuggestionDraft",
    "promoteAiInboxArtifactToNote",
    "recordAiInboxReviewDecision",
    `${fnSource}; return applyAiInboxRecommendedAction;`
  )(
    () => ({ value: "" }),
    {
      confirm() {
        confirmCalls += 1;
        return true;
      }
    },
    aiInboxState,
    async (artifactId) => {
      loadCalls.push(artifactId);
      return { item: { artifactId } };
    },
    (message, tone) => notices.push({ message, tone }),
    () => {},
    (message, tone) => {
      statuses.push({ message, tone });
      return null;
    },
    async () => {
      acceptCalls += 1;
      return null;
    },
    async () => null,
    async () => null,
    async () => null
  );

  const result = await applyAiInboxRecommendedAction("accept_link");
  assert.equal(result, null);
  assert.equal(confirmCalls, 0);
  assert.equal(acceptCalls, 0);
  assert.deepEqual(loadCalls, ["artifact_2"]);
  assert.deepEqual(notices, [
    {
      message: "Detail changed while you were reviewing. Retry from the latest reviewed item.",
      tone: "warn"
    }
  ]);
  assert.deepEqual(statuses, [
    {
      message: "AI inbox detail changed before the recommended action could run. Retry on the latest detail.",
      tone: "warn"
    }
  ]);
});

test("applyAiInboxRecommendedAction delegates accept_link to the same action handler as the manual button", async () => {
  const currentFile = fileURLToPath(import.meta.url);
  const repoRoot = path.resolve(path.dirname(currentFile), "../..");
  const source = fs.readFileSync(path.join(repoRoot, "apps/web/src/prototype-app.js"), "utf8");
  const fnSource = extractAsyncFunctionSource(source, "applyAiInboxRecommendedAction");

  const acceptCalls = [];
  const confirmPrompts = [];
  const aiInboxState = {
    selectedArtifactId: "artifact_1",
    detail: { item: { artifactId: "artifact_1" } },
    detailLoading: false,
    aiSummaryRecommendedAction: "accept_link"
  };

  const applyAiInboxRecommendedAction = new Function(
    "$",
    "window",
    "aiInboxState",
    "loadAiInboxDetail",
    "setAiInboxActionNotice",
    "renderAiInboxWorkspace",
    "setStatus",
    "acceptAiInboxLinkSuggestion",
    "adoptAiInboxFieldSuggestionDraft",
    "promoteAiInboxArtifactToNote",
    "recordAiInboxReviewDecision",
    `${fnSource}; return applyAiInboxRecommendedAction;`
  )(
    () => ({ value: "" }),
    {
      confirm(message) {
        confirmPrompts.push(message);
        return true;
      }
    },
    aiInboxState,
    async () => {
      throw new Error("loadAiInboxDetail should not run for fresh detail");
    },
    () => {},
    () => {},
    () => {
      throw new Error("setStatus should not be used on the successful delegated path");
    },
    async (artifactId) => {
      acceptCalls.push(artifactId);
      return { ok: true, artifactId };
    },
    async () => null,
    async () => null,
    async () => null
  );

  const result = await applyAiInboxRecommendedAction();
  assert.deepEqual(confirmPrompts, ["Apply AI recommended action: create the suggested relation?"]);
  assert.deepEqual(acceptCalls, ["artifact_1"]);
  assert.deepEqual(result, { ok: true, artifactId: "artifact_1" });
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
    actionError: "stale action error",
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
    "clearAiInboxActionNotice",
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
    () => {},
    () => {}
  );

  await refreshAiInbox({ silent: true });

  assert.equal(aiInboxState.selectedArtifactId, "artifact_2");
  assert.equal(aiInboxState.detail, null);
  assert.equal(aiInboxState.detailLoading, false);
  assert.equal(aiInboxState.detailError, "");
  assert.equal(aiInboxState.actionError, "");
  assert.equal(aiInboxState.detailRequestToken, 5);
  assert.equal(aiInboxState.aiSummary, "");
  assert.equal(aiInboxState.aiSummaryMeta, "");
  assert.equal(aiInboxState.aiSummaryRecommendedAction, "");
  assert.equal(aiInboxState.aiSummaryError, "");
});

test("refreshAiInbox invalidates stale detail state when the selected artifact metadata changes", async () => {
  const currentFile = fileURLToPath(import.meta.url);
  const repoRoot = path.resolve(path.dirname(currentFile), "../..");
  const source = fs.readFileSync(path.join(repoRoot, "apps/web/src/prototype-app.js"), "utf8");
  const fnSource = extractAsyncFunctionSource(source, "refreshAiInbox");

  const aiInboxState = {
    filters: { view: "pending", type: "all" },
    items: [{ artifactId: "artifact_1", title: "Old selection", status: "pending_review", updatedAt: "2026-05-18T12:00:00.000Z" }],
    counts: {},
    views: [],
    loading: false,
    error: "stale detail error",
    selectedArtifactId: "artifact_1",
    detail: {
      item: {
        artifactId: "artifact_1",
        title: "Old detail",
        status: "pending_review",
        actionState: "needs_review",
        updatedAt: "2026-05-18T12:00:00.000Z",
        decisionCount: 0
      }
    },
    detailLoading: true,
    detailError: "stale detail error",
    actionError: "stale action error",
    detailRequestToken: 8,
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
    "clearAiInboxActionNotice",
    "renderAiInboxWorkspace",
    "setStatus",
    `${fnSource}; return refreshAiInbox;`
  )(
    aiInboxState,
    (filters) => filters,
    async () => ({
      items: [{ artifactId: "artifact_1", title: "Old selection", status: "ignored", actionState: "reviewed", updatedAt: "2026-05-18T12:05:00.000Z", decisionCount: 1 }],
      counts: { pending: 0, reviewed: 1, archived: 0, all: 1 },
      views: ["pending", "reviewed"],
      canonical: {
        items: [{
          artifact_id: "artifact_1",
          title: "Old selection",
          status: "ignored",
          action_state: "reviewed",
          updated_at: "2026-05-18T12:05:00.000Z",
          decision_count: 1
        }]
      }
    }),
    (item) => ({
      artifactId: item.artifact_id,
      title: item.title,
      status: item.status,
      actionState: item.action_state,
      updatedAt: item.updated_at,
      decisionCount: item.decision_count
    }),
    () => {},
    () => {
      aiInboxState.aiSummary = "";
      aiInboxState.aiSummaryMeta = "";
      aiInboxState.aiSummaryRecommendedAction = "";
      aiInboxState.aiSummaryError = "";
    },
    () => {},
    () => {},
    () => {}
  );

  await refreshAiInbox({ silent: true });

  assert.equal(aiInboxState.selectedArtifactId, "artifact_1");
  assert.equal(aiInboxState.detail, null);
  assert.equal(aiInboxState.detailLoading, false);
  assert.equal(aiInboxState.detailError, "");
  assert.equal(aiInboxState.actionError, "");
  assert.equal(aiInboxState.detailRequestToken, 9);
  assert.equal(aiInboxState.aiSummary, "");
  assert.equal(aiInboxState.aiSummaryMeta, "");
  assert.equal(aiInboxState.aiSummaryRecommendedAction, "");
  assert.equal(aiInboxState.aiSummaryError, "");
});

test("refreshAiInbox realigns selection even when preserveDetail was requested but the current artifact left the filtered list", async () => {
  const currentFile = fileURLToPath(import.meta.url);
  const repoRoot = path.resolve(path.dirname(currentFile), "../..");
  const source = fs.readFileSync(path.join(repoRoot, "apps/web/src/prototype-app.js"), "utf8");
  const fnSource = extractAsyncFunctionSource(source, "refreshAiInbox");

  const aiInboxState = {
    filters: { view: "reviewed", type: "all" },
    items: [{ artifactId: "artifact_1", title: "Old reviewed selection" }],
    counts: {},
    views: [],
    loading: false,
    error: "",
    selectedArtifactId: "artifact_1",
    detail: { item: { artifactId: "artifact_1", title: "Old reviewed detail" } },
    detailLoading: false,
    detailError: "stale detail error",
    actionError: "stale action error",
    detailRequestToken: 10,
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
    "clearAiInboxActionNotice",
    "renderAiInboxWorkspace",
    "setStatus",
    `${fnSource}; return refreshAiInbox;`
  )(
    aiInboxState,
    (filters) => filters,
    async () => ({
      items: [{ artifactId: "artifact_2", title: "Remaining reviewed item" }],
      counts: { pending: 0, reviewed: 1, archived: 0, all: 1 },
      views: ["reviewed"],
      canonical: {
        items: [{ artifact_id: "artifact_2", title: "Remaining reviewed item" }]
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
    () => {},
    () => {}
  );

  await refreshAiInbox({ silent: true, preserveDetail: true });

  assert.equal(aiInboxState.selectedArtifactId, "artifact_2");
  assert.equal(aiInboxState.detail, null);
  assert.equal(aiInboxState.detailLoading, false);
  assert.equal(aiInboxState.detailRequestToken, 11);
  assert.equal(aiInboxState.detailError, "");
  assert.equal(aiInboxState.actionError, "");
  assert.equal(aiInboxState.aiSummary, "");
  assert.equal(aiInboxState.aiSummaryMeta, "");
  assert.equal(aiInboxState.aiSummaryRecommendedAction, "");
  assert.equal(aiInboxState.aiSummaryError, "");
});

test("refreshAiInbox invalidates stale reviewed detail even when preserveDetail keeps the current selection", async () => {
  const currentFile = fileURLToPath(import.meta.url);
  const repoRoot = path.resolve(path.dirname(currentFile), "../..");
  const source = fs.readFileSync(path.join(repoRoot, "apps/web/src/prototype-app.js"), "utf8");
  const fnSource = extractAsyncFunctionSource(source, "refreshAiInbox");

  const aiInboxState = {
    filters: { view: "reviewed", type: "all" },
    items: [{ artifactId: "artifact_1", title: "Reviewed selection", status: "ignored", actionState: "reviewed", updatedAt: "2026-05-18T12:00:00.000Z", decisionCount: 1 }],
    counts: {},
    views: [],
    loading: false,
    error: "",
    selectedArtifactId: "artifact_1",
    detail: {
      item: {
        artifactId: "artifact_1",
        title: "Reviewed detail",
        status: "ignored",
        actionState: "reviewed",
        updatedAt: "2026-05-18T12:00:00.000Z",
        decisionCount: 1
      }
    },
    detailLoading: false,
    detailError: "stale detail error",
    actionError: "stale action error",
    detailRequestToken: 11,
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
    "clearAiInboxActionNotice",
    "renderAiInboxWorkspace",
    "setStatus",
    `${fnSource}; return refreshAiInbox;`
  )(
    aiInboxState,
    (filters) => filters,
    async () => ({
      items: [{ artifactId: "artifact_1", title: "Reviewed selection", status: "archived", actionState: "reviewed", updatedAt: "2026-05-18T12:10:00.000Z", decisionCount: 2 }],
      counts: { pending: 0, reviewed: 0, archived: 1, all: 1 },
      views: ["reviewed", "archived"],
      canonical: {
        items: [{
          artifact_id: "artifact_1",
          title: "Reviewed selection",
          status: "archived",
          action_state: "reviewed",
          updated_at: "2026-05-18T12:10:00.000Z",
          decision_count: 2
        }]
      }
    }),
    (item) => ({
      artifactId: item.artifact_id,
      title: item.title,
      status: item.status,
      actionState: item.action_state,
      updatedAt: item.updated_at,
      decisionCount: item.decision_count
    }),
    () => {},
    () => {
      aiInboxState.aiSummary = "";
      aiInboxState.aiSummaryMeta = "";
      aiInboxState.aiSummaryRecommendedAction = "";
      aiInboxState.aiSummaryError = "";
    },
    () => {},
    () => {},
    () => {}
  );

  await refreshAiInbox({ silent: true, preserveDetail: true });

  assert.equal(aiInboxState.selectedArtifactId, "artifact_1");
  assert.equal(aiInboxState.detail, null);
  assert.equal(aiInboxState.detailLoading, false);
  assert.equal(aiInboxState.detailError, "");
  assert.equal(aiInboxState.actionError, "");
  assert.equal(aiInboxState.detailRequestToken, 12);
  assert.equal(aiInboxState.aiSummary, "");
  assert.equal(aiInboxState.aiSummaryMeta, "");
  assert.equal(aiInboxState.aiSummaryRecommendedAction, "");
  assert.equal(aiInboxState.aiSummaryError, "");
});

test("recordAiInboxReviewDecision stores action failures separately from detail state", async () => {
  const currentFile = fileURLToPath(import.meta.url);
  const repoRoot = path.resolve(path.dirname(currentFile), "../..");
  const source = fs.readFileSync(path.join(repoRoot, "apps/web/src/prototype-app.js"), "utf8");
  const fnSource = extractAsyncFunctionSource(source, "recordAiInboxReviewDecision");

  const aiInboxState = {
    selectedArtifactId: "artifact_1",
    detail: { item: { artifactId: "artifact_1" } },
    actionLoading: false,
    actionError: "old action error",
    detailError: "old detail error"
  };

  const recordDecision = new Function(
    "$",
    "aiInboxState",
    "recordAiInboxDecision",
    "aiInboxFeedbackFromUi",
    "aiInboxDetailFromResponse",
    "loadAiInboxDetail",
    "rememberAiDebugSnapshot",
    "refreshAiInbox",
    "refreshAiInboxEvaluationSummary",
    "aiInboxActionLabel",
    "setStatus",
    "clearAiInboxActionNotice",
    "renderAiInboxWorkspace",
    `${fnSource}; return recordAiInboxReviewDecision;`
  )(
    () => ({ value: "" }),
    aiInboxState,
    async () => {
      throw new Error("decision boom");
    },
    () => ({}),
    (response) => response,
    async () => true,
    () => {},
    async () => {},
    async () => {},
    () => "handled",
    () => {},
    () => {},
    () => {}
  );

  const result = await recordDecision("accepted");
  assert.equal(result, null);
  assert.equal(aiInboxState.actionError, "decision boom");
  assert.equal(aiInboxState.detailError, "old detail error");
  assert.equal(aiInboxState.actionLoading, false);
});

test("recordAiInboxReviewDecision reloads fresh detail instead of submitting against a stale selection", async () => {
  const currentFile = fileURLToPath(import.meta.url);
  const repoRoot = path.resolve(path.dirname(currentFile), "../..");
  const source = fs.readFileSync(path.join(repoRoot, "apps/web/src/prototype-app.js"), "utf8");
  const fnSource = extractAsyncFunctionSource(source, "recordAiInboxReviewDecision");

  let recordCalls = 0;
  const loadCalls = [];
  const statuses = [];
  const aiInboxState = {
    selectedArtifactId: "artifact_2",
    detail: { item: { artifactId: "artifact_1" } },
    detailLoading: false,
    actionLoading: false,
    actionError: ""
  };

  const recordDecision = new Function(
    "$",
    "aiInboxState",
    "recordAiInboxDecision",
    "aiInboxFeedbackFromUi",
    "aiInboxDetailFromResponse",
    "loadAiInboxDetail",
    "rememberAiDebugSnapshot",
    "refreshAiInbox",
    "refreshAiInboxEvaluationSummary",
    "aiInboxActionLabel",
    "setStatus",
    "clearAiInboxActionNotice",
    "renderAiInboxWorkspace",
    `${fnSource}; return recordAiInboxReviewDecision;`
  )(
    () => ({ value: "" }),
    aiInboxState,
    async () => {
      recordCalls += 1;
      return null;
    },
    () => ({}),
    (response) => response,
    async (artifactId) => {
      loadCalls.push(artifactId);
      return { item: { artifactId } };
    },
    () => {},
    async () => {},
    async () => {},
    () => "handled",
    (message, tone) => {
      statuses.push({ message, tone });
    },
    () => {},
    () => {}
  );

  const result = await recordDecision("accepted");
  assert.equal(result, null);
  assert.equal(recordCalls, 0);
  assert.deepEqual(loadCalls, ["artifact_2"]);
  assert.deepEqual(statuses, [{ message: "AI 建议详情已变化；请在最新详情加载后再执行处理动作", tone: "warn" }]);
  assert.equal(aiInboxState.actionLoading, false);
});

test("recordAiInboxReviewDecision clears stale detail when refresh removes the artifact from the current inbox view", async () => {
  const currentFile = fileURLToPath(import.meta.url);
  const repoRoot = path.resolve(path.dirname(currentFile), "../..");
  const source = fs.readFileSync(path.join(repoRoot, "apps/web/src/prototype-app.js"), "utf8");
  const fnSource = extractAsyncFunctionSource(source, "recordAiInboxReviewDecision");

  const refreshCalls = [];
  const loadCalls = [];
  const aiInboxState = {
    selectedArtifactId: "artifact_1",
    detail: { item: { artifactId: "artifact_1", title: "Old reviewed detail" } },
    actionLoading: false,
    actionError: "",
    detailError: "stale detail error",
    detailLoading: true
  };

  const recordDecision = new Function(
    "$",
    "aiInboxState",
    "recordAiInboxDecision",
    "aiInboxFeedbackFromUi",
    "aiInboxDetailFromResponse",
    "loadAiInboxDetail",
    "rememberAiDebugSnapshot",
    "refreshAiInbox",
    "refreshAiInboxEvaluationSummary",
    "aiInboxActionLabel",
    "setStatus",
    "clearAiInboxActionNotice",
    "renderAiInboxWorkspace",
    `${fnSource}; return recordAiInboxReviewDecision;`
  )(
    () => ({ value: "" }),
    aiInboxState,
    async () => ({ item: { artifactId: "artifact_1", title: "Archived action result" } }),
    () => ({}),
    (response) => response,
    async (artifactId) => {
      loadCalls.push(artifactId);
      return null;
    },
    () => {},
    async (options) => {
      refreshCalls.push(options);
      aiInboxState.selectedArtifactId = "";
      return true;
    },
    async () => true,
    () => "archived",
    () => {},
    () => {},
    () => {}
  );

  const result = await recordDecision("archived");
  assert.equal(result.item.artifactId, "artifact_1");
  assert.deepEqual(refreshCalls, [{ silent: true, preserveDetail: true }]);
  assert.deepEqual(loadCalls, []);
  assert.equal(aiInboxState.selectedArtifactId, "");
  assert.equal(aiInboxState.detail, null);
  assert.equal(aiInboxState.detailLoading, false);
  assert.equal(aiInboxState.detailError, "");
  assert.equal(aiInboxState.actionLoading, false);
});

test("acceptAiInboxLinkSuggestion is a no-op when the current detail is already linked", async () => {
  const currentFile = fileURLToPath(import.meta.url);
  const repoRoot = path.resolve(path.dirname(currentFile), "../..");
  const source = fs.readFileSync(path.join(repoRoot, "apps/web/src/prototype-app.js"), "utf8");
  const fnSource = extractAsyncFunctionSource(source, "acceptAiInboxLinkSuggestion");

  let acceptCalls = 0;
  const statuses = [];
  const aiInboxState = {
    selectedArtifactId: "artifact_1",
    detail: {
      item: { artifactId: "artifact_1" },
      artifact: {
        id: "artifact_1",
        status: "linked_to_note",
        userDecisions: [{ decision: "linked_to_note", noteId: "note_1" }]
      }
    },
    detailLoading: false,
    actionLoading: false,
    actionError: ""
  };

  const acceptAiInboxLinkSuggestion = new Function(
    "$",
    "aiInboxState",
    "loadAiInboxDetail",
    "currentAiInboxArtifactForSelection",
    "latestArtifactDecision",
    "setAiInboxActionNotice",
    "acceptAiInboxLink",
    "aiInboxDetailFromResponse",
    "rememberAiDebugSnapshot",
    "refreshAiInbox",
    "refreshAiInboxEvaluationSummary",
    "refreshDirectoryGraph",
    "state",
    "setStatus",
    "clearAiInboxActionNotice",
    "renderAiInboxWorkspace",
    `${fnSource}; return acceptAiInboxLinkSuggestion;`
  )(
    () => ({ value: "" }),
    aiInboxState,
    async () => {},
    () => aiInboxState.detail.artifact,
    (artifact) => artifact.userDecisions.at(-1),
    () => {},
    async () => {
      acceptCalls += 1;
      return null;
    },
    (response) => response,
    () => {},
    async () => {},
    async () => {},
    async () => {},
    { module: "notes" },
    (message, tone) => statuses.push({ message, tone }),
    () => {},
    () => {}
  );

  const result = await acceptAiInboxLinkSuggestion("artifact_1");
  assert.equal(result, null);
  assert.equal(acceptCalls, 0);
  assert.deepEqual(statuses, [{ message: "这条关联建议已经建立过关系", tone: "ok" }]);
});

test("promoteAiInboxArtifactToNote is a no-op when the current detail is already promoted", async () => {
  const currentFile = fileURLToPath(import.meta.url);
  const repoRoot = path.resolve(path.dirname(currentFile), "../..");
  const source = fs.readFileSync(path.join(repoRoot, "apps/web/src/prototype-app.js"), "utf8");
  const fnSource = extractAsyncFunctionSource(source, "promoteAiInboxArtifactToNote");

  let promoteCalls = 0;
  const statuses = [];
  const aiInboxState = {
    selectedArtifactId: "artifact_1",
    detail: {
      item: { artifactId: "artifact_1" },
      artifact: {
        id: "artifact_1",
        status: "promoted_to_note",
        userDecisions: [{ decision: "promoted_to_note", noteId: "note_1" }]
      }
    },
    detailLoading: false,
    actionLoading: false,
    actionError: ""
  };

  const promoteAiInboxArtifactToNote = new Function(
    "$",
    "aiInboxState",
    "loadAiInboxDetail",
    "currentAiInboxArtifactForSelection",
    "latestArtifactDecision",
    "setAiInboxActionNotice",
    "promoteAiInboxNote",
    "aiInboxDetailFromResponse",
    "rememberAiDebugSnapshot",
    "refreshAiInbox",
    "refreshAiInboxEvaluationSummary",
    "mapNoteItem",
    "state",
    "activateModule",
    "openNoteById",
    "setStatus",
    "clearAiInboxActionNotice",
    "renderAiInboxWorkspace",
    `${fnSource}; return promoteAiInboxArtifactToNote;`
  )(
    () => ({ value: "" }),
    aiInboxState,
    async () => {},
    () => aiInboxState.detail.artifact,
    (artifact) => artifact.userDecisions.at(-1),
    () => {},
    async () => {
      promoteCalls += 1;
      return null;
    },
    (response) => response,
    () => {},
    async () => {},
    async () => {},
    (note) => note,
    { notes: [] },
    () => {},
    () => {},
    (message, tone) => statuses.push({ message, tone }),
    () => {},
    () => {}
  );

  const result = await promoteAiInboxArtifactToNote("artifact_1");
  assert.equal(result, null);
  assert.equal(promoteCalls, 0);
  assert.deepEqual(statuses, [{ message: "这条建议已经生成过草稿笔记", tone: "ok" }]);
});

test("adoptAiInboxFieldSuggestionDraft is a no-op when the current detail is already adopted", async () => {
  const currentFile = fileURLToPath(import.meta.url);
  const repoRoot = path.resolve(path.dirname(currentFile), "../..");
  const source = fs.readFileSync(path.join(repoRoot, "apps/web/src/prototype-app.js"), "utf8");
  const fnSource = extractAsyncFunctionSource(source, "adoptAiInboxFieldSuggestionDraft");

  let adoptCalls = 0;
  const statuses = [];
  const aiInboxState = {
    selectedArtifactId: "artifact_1",
    detail: {
      item: { artifactId: "artifact_1" },
      artifact: {
        id: "artifact_1",
        status: "adopted_as_draft",
        userDecisions: [{ decision: "adopted_as_draft", noteId: "note_1" }]
      },
      suggestion: {
        id: "suggestion_1",
        status: "confirmed"
      }
    },
    detailLoading: false,
    actionLoading: false,
    actionError: ""
  };

  const adoptAiInboxFieldSuggestionDraft = new Function(
    "$",
    "aiInboxState",
    "loadAiInboxDetail",
    "currentAiInboxArtifactForSelection",
    "currentAiInboxSuggestionForSelection",
    "latestArtifactDecision",
    "aiSuggestionStatusLabel",
    "setAiInboxActionNotice",
    "adoptAiInboxFieldSuggestion",
    "aiInboxFeedbackFromUi",
    "aiInboxDetailFromResponse",
    "rememberAiDebugSnapshot",
    "refreshAiInbox",
    "refreshAiInboxEvaluationSummary",
    "mapNoteItem",
    "state",
    "activateModule",
    "openNoteById",
    "setStatus",
    "clearAiInboxActionNotice",
    "renderAiInboxWorkspace",
    `${fnSource}; return adoptAiInboxFieldSuggestionDraft;`
  )(
    () => ({ value: "" }),
    aiInboxState,
    async () => {},
    () => aiInboxState.detail.artifact,
    () => aiInboxState.detail.suggestion,
    (artifact) => artifact.userDecisions.at(-1),
    (status) => ({ confirmed: "Confirmed" }[status] || status),
    () => {},
    async () => {
      adoptCalls += 1;
      return null;
    },
    () => ({}),
    (response) => response,
    () => {},
    async () => {},
    async () => {},
    (note) => note,
    { notes: [] },
    () => {},
    () => {},
    (message, tone) => statuses.push({ message, tone }),
    () => {},
    () => {}
  );

  const result = await adoptAiInboxFieldSuggestionDraft("artifact_1");
  assert.equal(result, null);
  assert.equal(adoptCalls, 0);
  assert.deepEqual(statuses, [{ message: "这条字段建议已经是Confirmed", tone: "ok" }]);
});

test("recordAiInboxReviewDecision does not restore the old artifact when selection changes mid-submit", async () => {
  const currentFile = fileURLToPath(import.meta.url);
  const repoRoot = path.resolve(path.dirname(currentFile), "../..");
  const source = fs.readFileSync(path.join(repoRoot, "apps/web/src/prototype-app.js"), "utf8");
  const fnSource = extractAsyncFunctionSource(source, "recordAiInboxReviewDecision");

  const refreshCalls = [];
  const aiInboxState = {
    selectedArtifactId: "artifact_1",
    detail: { item: { artifactId: "artifact_1", title: "Original artifact" } },
    actionLoading: false,
    actionError: "",
    detailError: ""
  };

  const recordDecision = new Function(
    "$",
    "aiInboxState",
    "recordAiInboxDecision",
    "aiInboxFeedbackFromUi",
    "aiInboxDetailFromResponse",
    "loadAiInboxDetail",
    "rememberAiDebugSnapshot",
    "refreshAiInbox",
    "refreshAiInboxEvaluationSummary",
    "aiInboxActionLabel",
    "setStatus",
    "clearAiInboxActionNotice",
    "renderAiInboxWorkspace",
    `${fnSource}; return recordAiInboxReviewDecision;`
  )(
    () => ({ value: "" }),
    aiInboxState,
    async () => {
      aiInboxState.selectedArtifactId = "artifact_2";
      aiInboxState.detail = { item: { artifactId: "artifact_2", title: "Newer selection" } };
      return { item: { artifactId: "artifact_1", title: "Old action result" } };
    },
    () => ({}),
    (response) => response,
    async () => true,
    () => {},
    async (options) => {
      refreshCalls.push(options);
      return true;
    },
    async () => true,
    () => "handled",
    () => {},
    () => {},
    () => {}
  );

  const result = await recordDecision("accepted");
  assert.equal(result.item.artifactId, "artifact_1");
  assert.equal(aiInboxState.selectedArtifactId, "artifact_2");
  assert.equal(aiInboxState.detail.item.artifactId, "artifact_2");
  assert.deepEqual(refreshCalls, [{ silent: true, preserveDetail: false }]);
  assert.equal(aiInboxState.actionLoading, false);
});

test("applyAiInboxSuggestionStatus stores action failures separately from detail state", async () => {
  const currentFile = fileURLToPath(import.meta.url);
  const repoRoot = path.resolve(path.dirname(currentFile), "../..");
  const source = fs.readFileSync(path.join(repoRoot, "apps/web/src/prototype-app.js"), "utf8");
  const fnSource = extractAsyncFunctionSource(source, "applyAiInboxSuggestionStatus");

  const aiInboxState = {
    selectedArtifactId: "artifact_1",
    detail: {
      item: { artifactId: "artifact_1" },
      suggestion: { id: "suggestion_1", status: "edited", content: { thesis: "x" } }
    },
    actionLoading: false,
    actionError: "old action error",
    detailError: "old detail error"
  };

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
    "clearAiInboxActionNotice",
    "setAiInboxActionNotice",
    "renderAiInboxWorkspace",
    `${fnSource}; return applyAiInboxSuggestionStatus;`
  )(
    () => ({ value: "" }),
    aiInboxState,
    async () => {},
    () => ({ thesis: "x" }),
    async () => {
      throw new Error("suggestion action boom");
    },
    async () => {},
    async () => {},
    async () => {},
    () => {},
    () => {},
    () => {},
    () => {},
    () => {}
  );

  const result = await applyAiInboxSuggestionStatus("confirmed");
  assert.equal(result, null);
  assert.equal(aiInboxState.actionError, "suggestion action boom");
  assert.equal(aiInboxState.detailError, "old detail error");
  assert.equal(aiInboxState.actionLoading, false);
});

test("applyAiInboxSuggestionStatus is a no-op when the reviewed suggestion already has the requested status", async () => {
  const currentFile = fileURLToPath(import.meta.url);
  const repoRoot = path.resolve(path.dirname(currentFile), "../..");
  const source = fs.readFileSync(path.join(repoRoot, "apps/web/src/prototype-app.js"), "utf8");
  const fnSource = extractAsyncFunctionSource(source, "applyAiInboxSuggestionStatus");

  let updateCalls = 0;
  const statuses = [];
  const aiInboxState = {
    selectedArtifactId: "artifact_1",
    detail: {
      item: { artifactId: "artifact_1" },
      suggestion: { id: "suggestion_1", status: "rejected", content: { thesis: "x" } }
    },
    actionLoading: false,
    actionError: ""
  };

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
    "clearAiInboxActionNotice",
    "setAiInboxActionNotice",
    "renderAiInboxWorkspace",
    "aiSuggestionStatusLabel",
    `${fnSource}; return applyAiInboxSuggestionStatus;`
  )(
    () => ({ value: "" }),
    aiInboxState,
    async () => {},
    () => ({ thesis: "x" }),
    async () => {
      updateCalls += 1;
      return null;
    },
    async () => {},
    async () => {},
    async () => {},
    () => {},
    (message, tone) => {
      statuses.push({ message, tone });
    },
    () => {},
    () => {},
    () => {},
    (status) => ({ rejected: "Rejected" }[status] || status)
  );

  const result = await applyAiInboxSuggestionStatus("rejected");
  assert.equal(result, null);
  assert.equal(updateCalls, 0);
  assert.deepEqual(statuses, [{ message: "AI suggestion already rejected: suggestion_1", tone: "ok" }]);
});

test("applyAiInboxSuggestionStatus reloads fresh detail instead of submitting against a stale selection", async () => {
  const currentFile = fileURLToPath(import.meta.url);
  const repoRoot = path.resolve(path.dirname(currentFile), "../..");
  const source = fs.readFileSync(path.join(repoRoot, "apps/web/src/prototype-app.js"), "utf8");
  const fnSource = extractAsyncFunctionSource(source, "applyAiInboxSuggestionStatus");

  let updateCalls = 0;
  const loadCalls = [];
  const statuses = [];
  const aiInboxState = {
    selectedArtifactId: "artifact_2",
    detail: {
      item: { artifactId: "artifact_1" },
      suggestion: { id: "suggestion_1", status: "edited", content: { thesis: "x" } }
    },
    detailLoading: false,
    actionLoading: false,
    actionError: ""
  };

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
    "clearAiInboxActionNotice",
    "setAiInboxActionNotice",
    "renderAiInboxWorkspace",
    `${fnSource}; return applyAiInboxSuggestionStatus;`
  )(
    () => ({ value: "" }),
    aiInboxState,
    async () => {},
    () => ({ thesis: "x" }),
    async () => {
      updateCalls += 1;
      return null;
    },
    async (artifactId) => {
      loadCalls.push(artifactId);
      return { item: { artifactId } };
    },
    async () => {},
    async () => {},
    () => {},
    (message, tone) => {
      statuses.push({ message, tone });
    },
    () => {},
    () => {},
    () => {}
  );

  const result = await applyAiInboxSuggestionStatus("confirmed");
  assert.equal(result, null);
  assert.equal(updateCalls, 0);
  assert.deepEqual(loadCalls, ["artifact_2"]);
  assert.deepEqual(statuses, [
    {
      message: "AI inbox detail changed before the suggestion review action could run. Retry on the latest detail.",
      tone: "warn"
    }
  ]);
  assert.equal(aiInboxState.actionLoading, false);
});

test("applyAiInboxSuggestionStatus does not reload the old inbox detail when selection changes mid-submit", async () => {
  const currentFile = fileURLToPath(import.meta.url);
  const repoRoot = path.resolve(path.dirname(currentFile), "../..");
  const source = fs.readFileSync(path.join(repoRoot, "apps/web/src/prototype-app.js"), "utf8");
  const fnSource = extractAsyncFunctionSource(source, "applyAiInboxSuggestionStatus");

  const loadCalls = [];
  const refreshCalls = [];
  const aiInboxState = {
    selectedArtifactId: "artifact_1",
    detail: {
      item: { artifactId: "artifact_1" },
      suggestion: { id: "suggestion_1", status: "edited", content: { thesis: "x" } }
    },
    actionLoading: false,
    actionError: "",
    detailError: ""
  };

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
    "clearAiInboxActionNotice",
    "setAiInboxActionNotice",
    "renderAiInboxWorkspace",
    `${fnSource}; return applyAiInboxSuggestionStatus;`
  )(
    () => ({ value: "" }),
    aiInboxState,
    async () => {},
    () => ({ thesis: "x" }),
    async () => {
      aiInboxState.selectedArtifactId = "artifact_2";
      aiInboxState.detail = {
        item: { artifactId: "artifact_2" },
        suggestion: { id: "suggestion_2", status: "suggested", content: { thesis: "new" } }
      };
      return { item: { id: "suggestion_1", status: "confirmed" } };
    },
    async (artifactId) => {
      loadCalls.push(artifactId);
      return true;
    },
    async (options) => {
      refreshCalls.push(options);
      return true;
    },
    async () => true,
    () => {},
    () => {},
    () => {},
    () => {},
    () => {}
  );

  const result = await applyAiInboxSuggestionStatus("confirmed");
  assert.equal(result, true);
  assert.deepEqual(loadCalls, []);
  assert.deepEqual(refreshCalls, [{ silent: true, preserveDetail: false }]);
  assert.equal(aiInboxState.selectedArtifactId, "artifact_2");
  assert.equal(aiInboxState.detail.item.artifactId, "artifact_2");
  assert.equal(aiInboxState.actionLoading, false);
});

test("applyAiInboxSuggestionStatus reports invalid reviewed content through actionError without starting submit", async () => {
  const currentFile = fileURLToPath(import.meta.url);
  const repoRoot = path.resolve(path.dirname(currentFile), "../..");
  const source = fs.readFileSync(path.join(repoRoot, "apps/web/src/prototype-app.js"), "utf8");
  const fnSource = extractAsyncFunctionSource(source, "applyAiInboxSuggestionStatus");

  let updateCalls = 0;
  const aiInboxState = {
    selectedArtifactId: "artifact_1",
    detail: {
      item: { artifactId: "artifact_1" },
      suggestion: { id: "suggestion_1", status: "edited", content: { thesis: "x" } }
    },
    actionLoading: false,
    actionError: "old action error",
    detailError: "old detail error"
  };

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
    "clearAiInboxActionNotice",
    "setAiInboxActionNotice",
    "renderAiInboxWorkspace",
    `${fnSource}; return applyAiInboxSuggestionStatus;`
  )(
    () => ({ value: "{not valid json}" }),
    aiInboxState,
    async () => {},
    () => {
      throw new Error("Reviewed suggestion content in AI inbox must be valid JSON before it can be marked edited or confirmed");
    },
    async () => {
      updateCalls += 1;
      return null;
    },
    async () => {},
    async () => {},
    async () => {},
    () => {},
    () => {},
    () => {},
    () => {},
    () => {}
  );

  const result = await applyAiInboxSuggestionStatus("confirmed");
  assert.equal(result, null);
  assert.equal(updateCalls, 0);
  assert.equal(aiInboxState.detailError, "old detail error");
  assert.equal(
    aiInboxState.actionError,
    "Reviewed suggestion content in AI inbox must be valid JSON before it can be marked edited or confirmed"
  );
  assert.equal(aiInboxState.actionLoading, false);
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
