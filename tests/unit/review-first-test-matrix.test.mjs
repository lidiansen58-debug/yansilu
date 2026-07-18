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
      'test("AI canonical contracts keep inbox detail, suggestion detail, and review action response shapes stable"',
      'test("AI canonical inbox detail keeps degraded suggestion trace stable when the linked suggestion record is missing"'
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
    file: "tests/unit/api-ai-accept-link-runtime.test.mjs",
    snippets: [
      'test("accept-link helper deletes a newly created relation when artifact decision recording fails"',
      'test("accept-link helper is idempotent when the relation already exists and the latest decision is already linked_to_note"'
    ]
  },
  {
    file: "tests/unit/api-ai-promote-note-runtime.test.mjs",
    snippets: [
      'test("promote-note helper records promoted_to_note after creating a draft note"',
      'test("promote-note helper deletes a newly created draft note when artifact decision recording fails"'
    ]
  },
  {
    file: "tests/unit/api-ai-field-adoption-runtime.test.mjs",
    snippets: [
      'test("non-sqlite adopt helper updates note artifact and suggestion together"',
      'test("non-sqlite adopt helper rolls note and stores back when suggestion transition fails"'
    ]
  },
  {
    file: "tests/integration/api-ai-suggestion-reject-consistency.test.mjs",
    snippets: ['test("AI suggestion reject keeps linked artifact semantics aligned in sqlite-backed API flows"']
  },
  {
    file: "tests/integration/api-ai-field-adoption-rollback.test.mjs",
    snippets: ['test("AI field adoption rolls note and inbox state back if the linked suggestion disappears before review commit"']
  },
  {
    file: "tests/integration/api-notes.test.mjs",
    snippets: [
      'test("notes AI analysis API stores reviewable local candidates without confirming relations"',
      'const adoptedFieldAgain = await postJson(baseUrl, `/api/v1/ai/inbox/${encodeURIComponent(fieldArtifact.id)}/adopt-field-suggestion?canonical=true`, {'
    ]
  },
  {
    file: "tests/unit/web-ai-inbox-stale-state-runtime.test.mjs",
    snippets: [
      'test("recordAiInboxReviewDecision stores action failures separately from detail state"',
      'test("applyAiInboxSuggestionStatus stores action failures separately from detail state"',
      'test("applyAiInboxSuggestionStatus reports invalid reviewed content through actionError without starting submit"',
      'test("refreshAiInbox invalidates stale detail state when a list refresh switches the selected artifact"',
      'test("refreshAiInbox invalidates stale detail state when the selected artifact metadata changes"',
      'test("refreshAiInbox realigns selection even when preserveDetail was requested but the current artifact left the filtered list"',
      'test("recordAiInboxReviewDecision clears stale detail when refresh removes the artifact from the current inbox view"',
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
      'test("refreshAiSuggestions leaves the detail modal closed until the user selects a suggestion"',
      'test("refreshAiSuggestions closes stale detail when the selected suggestion disappears"',
      'test("refreshAiSuggestions invalidates stale detail state when the selected suggestion metadata changes"',
      'test("applyAiSuggestionStatus realigns filtered settings suggestions after a status change removes the current item"',
      'test("applyAiSuggestionStatus loads the newly selected filtered suggestion detail after refresh switches selection"',
      'test("applyAiSuggestionStatus keeps selection and detail cleared when refresh leaves no filtered suggestions"',
      'test("applyAiSuggestionStatus preserves a newer settings suggestion selection while an older submit resolves"',
      'test("applyAiSuggestionStatus captures edited content before rerender and blocks duplicate submission"'
    ]
  },
  {
    file: "tests/unit/web-ai-inbox-panel.test.mjs",
    snippets: [
      'test("AI inbox panel surfaces review action errors inside the detail pane"',
      'test("AI inbox panel keeps traceability and review history out of the main detail"',
      'test("AI inbox panel hides incomplete trace placeholders from the main detail"',
      'test("AI inbox panel does not keep rendering stale detail when selection has moved"'
    ]
  },
  {
    file: "tests/unit/web-ai-suggestions-panel.test.mjs",
    snippets: [
      'test("AI suggestions panel keeps safety state visible while latest detail hydrates or fails"',
      'test("AI suggestions panel surfaces scoped action errors and notices only for the selected suggestion"',
      'test("AI suggestions panel renders readable guidance when detail is incomplete"',
      'test("AI suggestions panel does not keep rendering stale detail when selection has moved"'
    ]
  },
  {
    file: "tests/unit/web-ai-canonical-debug-panel.test.mjs",
    snippets: [
      'test("automation run history renders concise recent activity instead of open JSON blocks"'
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
      'test("prototype AI inbox review-action continuity keeps detail aligned with filtered pending selection changes"',
      'test("prototype AI inbox guards stale detail selection and duplicate reviewed submit"',
      'test("prototype settings AI suggestions panel edits confirms and rejects suggestions through the real review flow"',
      'test("prototype settings AI suggestions guards stale detail selection and duplicate review submits"',
      'test("prototype settings AI suggestions review-action continuity keeps detail aligned with filtered selection changes"'
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
    snippets: [
      'test("AI local runtime bootstrap previews readiness and prepares qwen3 local AI"',
      'test("AI inbox summarize runs current local route and persists summary decision"',
      'const acceptedAgain = await postJson(baseUrl, `/api/v1/ai/inbox/${encodeURIComponent(artifact.id)}/accept-link`, {',
      'const promotedAgain = await postJson(baseUrl, "/api/v1/ai/inbox/artifact_question_promote/promote-note", {',
      'const ignoredAgain = await postJson(baseUrl, `/api/v1/ai/inbox/${encodeURIComponent(ignoredArtifactId)}/decision`, {',
      'const archivedAgain = await postJson(baseUrl, `/api/v1/ai/inbox/${encodeURIComponent(archivedArtifactId)}/decision`, {'
    ]
  },
  {
    file: "tests/unit/potential-relations.test.mjs",
    snippets: [
      'test("potential relation AI second stage batches candidates in review-sized chunks"',
      'test("AI JSON parse failure preserves the rule candidate"',
      'test("reject/no_relation AI output is not converted into a formal relation draft"',
      'test("same-topic-only AI output remains a potential relation for user review"'
    ]
  },
  {
    file: "tests/integration/api-potential-relations-refine.test.mjs",
    snippets: [
      'assert.equal(response.json.batchPlan.batchSize, 4);',
      'assert.equal(response.json.batchPlan.numPredict, 400);'
    ]
  },
  {
    file: "tests/unit/ai-note-analysis.test.mjs",
    snippets: [
      'test("local model viewpoint distillation accepts structured candidate viewpoint output"',
      'test("local model viewpoint JSON failure falls back to rule candidates without auto-writing"',
      'assert.equal(request.executionDefaults.timeoutMs, DEFAULT_VIEWPOINT_DISTILLATION_TIMEOUT_MS);'
    ]
  },
  {
    file: "tests/unit/ai-scheduled-agent-tasks.test.mjs",
    snippets: [
      'assert.equal(harnessInput.timeoutMs, DEFAULT_SCHEDULED_LOCAL_AI_TIMEOUT_MS);',
      'assert.equal(harnessInput.batchSize, DEFAULT_SCHEDULED_LOCAL_AI_BATCH_SIZE);',
      'assert.equal(harnessInput.progress.retryable, true);'
    ]
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
