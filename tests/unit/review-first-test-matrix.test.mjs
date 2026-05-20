import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const currentFile = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(currentFile), "../..");

const MUST_KEEP_CASES = [
  {
    file: "tests/integration/api-ai-canonical-contract.test.mjs",
    snippets: [
      'test("AI canonical contracts keep inbox detail, suggestion detail, and review action response shapes stable"'
    ]
  },
  {
    file: "tests/integration/api-ai-canonical-response.test.mjs",
    snippets: ['test("AI inbox and scheduled task APIs expose optional canonical payloads"']
  },
  {
    file: "tests/integration/api-ai-suggestions-canonical.test.mjs",
    snippets: ['test("AI suggestions API exposes optional canonical payloads"']
  },
  {
    file: "tests/unit/api-ai-suggestion-reject-runtime.test.mjs",
    snippets: [
      'test("non-sqlite reject helper keeps suggestion and linked artifact semantics aligned"',
      'test("non-sqlite reject helper rolls back both suggestion and artifact when decision recording fails"'
    ]
  },
  {
    file: "tests/integration/api-ai-suggestion-reject-consistency.test.mjs",
    snippets: ['test("AI suggestion reject keeps linked artifact semantics aligned in sqlite-backed API flows"']
  },
  {
    file: "tests/integration/api-notes.test.mjs",
    snippets: ['test("notes AI analysis API stores reviewable local candidates without confirming relations"']
  },
  {
    file: "tests/unit/web-ai-inbox-stale-state-runtime.test.mjs",
    snippets: [
      'test("recordAiInboxReviewDecision stores action failures separately from detail state"',
      'test("applyAiInboxSuggestionStatus stores action failures separately from detail state"',
      'test("applyAiInboxSuggestionStatus reports invalid reviewed content through actionError without starting submit"',
      'test("refreshAiInbox invalidates stale detail state when a list refresh switches the selected artifact"',
      'test("refreshAiInbox invalidates stale detail state when the selected artifact metadata changes"',
      'test("runAiInboxSummary ignores stale failures and keeps the latest summary state"',
      'test("refreshAiInboxEvaluationSummary ignores stale failures and keeps the latest evaluation state"'
    ]
  },
  {
    file: "tests/unit/web-ai-suggestions-runtime.test.mjs",
    snippets: [
      'test("loadAiSuggestionDetail stores detail failures separately from list errors"',
      'test("applyAiSuggestionStatus reports invalid reviewed content through actionError without starting submit"',
      'test("refreshAiSuggestions captures a suggestionsList debug snapshot"',
      'test("refreshAiSuggestions invalidates stale detail state when a list refresh switches the selected suggestion"',
      'test("refreshAiSuggestions invalidates stale detail state when the selected suggestion metadata changes"',
      'test("applyAiSuggestionStatus captures edited content before rerender and blocks duplicate submission"'
    ]
  },
  {
    file: "tests/unit/web-ai-inbox-panel.test.mjs",
    snippets: [
      'test("AI inbox panel surfaces review action errors inside the detail pane"',
      'test("AI inbox panel surfaces suggestion traceability and review history inside inbox detail"',
      'test("AI inbox panel renders trace placeholders and target-missing guidance when linked trace is incomplete"',
      'test("AI inbox panel does not keep rendering stale detail when selection has moved"'
    ]
  },
  {
    file: "tests/unit/web-ai-suggestions-panel.test.mjs",
    snippets: [
      'test("AI suggestions panel keeps the list visible when detail loading fails"',
      'test("AI suggestions panel surfaces review action errors inside the detail pane"',
      'test("AI suggestions panel renders trace placeholders and target-missing guidance when detail is incomplete"',
      'test("AI suggestions panel does not keep rendering stale detail when selection has moved"'
    ]
  },
  {
    file: "tests/unit/web-ai-canonical-debug-panel.test.mjs",
    snippets: [
      'test("AI canonical debug panel renders suggestion snapshots alongside inbox snapshots"'
    ]
  },
  {
    file: "tests/e2e/prototype-browser.test.mjs",
    snippets: [
      'test("prototype AI inbox field suggestion flow adopts a suggestion as draft and updates the target note"',
      'test("prototype AI inbox reviewed detail can mark an adopted draft edited and then confirmed"',
      'test("prototype AI inbox reviewed detail keeps invalid reviewed JSON as inline error without submitting"',
      'test("prototype AI inbox can reject a linked suggestion and keeps the reviewed artifact inspectable"',
      'test("prototype AI inbox reject plus refresh keeps the reviewed artifact stable"',
      'test("prototype settings AI suggestions panel edits confirms and rejects suggestions through the real review flow"',
      'test("prototype settings AI suggestions guards stale detail selection and duplicate review submits"'
    ]
  },
  {
    file: "tests/e2e/ai-review-flow-inline-errors.test.mjs",
    snippets: [
      'test("AI inbox inline error blocks invalid reviewed JSON submit without PATCH"'
    ]
  },
  {
    file: "tests/integration/api-ai-legacy-revised-compat.test.mjs",
    snippets: ['test("AI inbox APIs continue to load legacy revised sqlite rows without a data repair script"']
  },
  {
    file: "tests/integration/api-vault-settings.test.mjs",
    snippets: ['test("AI inbox summarize runs current local route and persists summary decision"']
  }
];

test("review-first core test matrix references existing must-keep tests", () => {
  for (const entry of MUST_KEEP_CASES) {
    const fullPath = path.join(repoRoot, entry.file);
    assert.equal(fs.existsSync(fullPath), true, `missing matrix file: ${entry.file}`);
    const source = fs.readFileSync(fullPath, "utf8");
    for (const snippet of entry.snippets) {
      assert.equal(
        source.includes(snippet),
        true,
        `missing must-keep test snippet in ${entry.file}: ${snippet}`
      );
    }
  }
});
