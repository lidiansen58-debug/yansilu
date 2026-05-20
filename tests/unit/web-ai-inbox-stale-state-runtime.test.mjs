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
