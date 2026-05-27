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
      if (depth === 0) {
        return source.slice(start, index + 1);
      }
    }
  }
  throw new Error(`could not extract ${name}() source`);
}

test("AI inbox suggestion edited action submits current reviewed content and comment before rerender", async () => {
  const currentFile = fileURLToPath(import.meta.url);
  const repoRoot = path.resolve(path.dirname(currentFile), "../..");
  const source = fs.readFileSync(path.join(repoRoot, "apps/web/src/prototype-app.js"), "utf8");
  const fnSource = extractAsyncFunctionSource(source, "applyAiInboxSuggestionStatus");
  const finalizeSource = extractAsyncFunctionSource(source, "finalizeAiInboxActionRefresh");

  const domState = {
    aiInboxDecisionComment: { value: "Keep the edited draft." },
    aiInboxSuggestionContentEditor: { value: "{\"thesis\":\"Edited in inbox.\"}" }
  };
  const calls = [];

  const factory = new Function(
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
    `${finalizeSource}; ${fnSource}; return applyAiInboxSuggestionStatus;`
  );

  const applyAiInboxSuggestionStatus = factory(
    (id) => domState[id],
    {
      selectedArtifactId: "artifact_1",
      detail: {
        item: { artifactId: "artifact_1" },
        suggestion: {
          id: "suggestion_1",
          status: "adopted_as_draft",
          content: { thesis: "Original." }
        }
      },
      actionLoading: false
    },
    async () => {
      throw new Error("adopt path should not be used");
    },
    (current) => {
      const raw = String(domState.aiInboxSuggestionContentEditor.value || "");
      if (typeof current.content === "string") return raw;
      return JSON.parse(raw);
    },
    async (suggestionId, payload) => {
      calls.push({ suggestionId, payload });
      return { item: { id: suggestionId, status: payload.status } };
    },
    async () => true,
    async () => true,
    async () => true,
    () => {},
    () => {},
    () => {},
    () => {},
    () => {
      domState.aiInboxDecisionComment.value = "";
      domState.aiInboxSuggestionContentEditor.value = "{\"thesis\":\"stale\"}";
    }
  );

  const result = await applyAiInboxSuggestionStatus("edited");
  assert.equal(result, true);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].suggestionId, "suggestion_1");
  assert.equal(calls[0].payload.comment, "Keep the edited draft.");
  assert.deepEqual(calls[0].payload.content, { thesis: "Edited in inbox." });
  assert.equal(calls[0].payload.status, "edited");
});
