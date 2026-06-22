import test from "node:test";
import assert from "node:assert/strict";
import { readPrototypeAppSource } from "./copy-source-helpers.mjs";

test("prototype writing shell keeps the main writing surfaces wired", async () => {
  const source = await readPrototypeAppSource();

  assert.match(source, /function openWritingModule/);
  assert.match(source, /function continueWritingEntry/);
  assert.match(source, /function renderWritingPanel/);
  assert.match(source, /function renderWritingFlowSteps/);
  assert.match(source, /function renderWritingScaffoldPreview/);
  assert.match(source, /function renderWritingStrongModelRequestDetail/);
});

test("prototype writing shell keeps continuity and scaffold wording boundaries without legacy scaffold labels", async () => {
  const source = await readPrototypeAppSource();

  assert.match(source, /currentWritingContinuationEntry/);
  assert.match(source, /describeWritingNextActionFromState/);
  assert.match(source, /projectEntry\?\.projectId && projectEntry\?\.actionLabel/);
  assert.match(source, /const draftTone =[\s\S]*projectPreflightSummary\.level !== "ready"[\s\S]*"warn"/);
  assert.doesNotMatch(source, /WritingProject: \$\{projectId\}/);
  assert.doesNotMatch(source, /DraftScaffold: \$\{scaffoldId\}/);
  assert.doesNotMatch(source, /current scaffold/);
});
