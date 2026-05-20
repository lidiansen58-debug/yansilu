import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

test("AI inbox suggestion actions capture editor and comment values before rerendering", () => {
  const currentFile = fileURLToPath(import.meta.url);
  const repoRoot = path.resolve(path.dirname(currentFile), "../..");
  const source = fs.readFileSync(path.join(repoRoot, "apps/web/src/prototype-app.js"), "utf8");
  const match = source.match(/async function applyAiInboxSuggestionStatus\(status\) \{([\s\S]*?)\n\}/);

  assert.ok(match, "expected applyAiInboxSuggestionStatus() to exist");
  const fnBody = match[1];

  const reviewedContentIndex = fnBody.indexOf("const reviewedContent =");
  const reviewCommentIndex = fnBody.indexOf("const reviewComment =");
  const actionLoadingIndex = fnBody.indexOf("aiInboxState.actionLoading = true;");

  assert.ok(reviewedContentIndex >= 0, "expected reviewed content to be captured");
  assert.ok(reviewCommentIndex >= 0, "expected review comment to be captured");
  assert.ok(actionLoadingIndex >= 0, "expected action loading transition to exist");
  assert.ok(reviewedContentIndex < actionLoadingIndex, "reviewed content should be captured before rerender");
  assert.ok(reviewCommentIndex < actionLoadingIndex, "review comment should be captured before rerender");
});
