import test from "node:test";
import assert from "node:assert/strict";
import { readPrototypeAppSource } from "./copy-source-helpers.mjs";

function extractFunctionSource(source, functionName) {
  const start = source.indexOf(`function ${functionName}`);
  assert.ok(start >= 0, `expected ${functionName} to exist`);
  const nextFunction = source.indexOf("\nfunction ", start + 1);
  return source.slice(start, nextFunction > start ? nextFunction : undefined);
}

test("prototype writing shell keeps the main writing surfaces wired", async () => {
  const source = await readPrototypeAppSource();

  assert.match(source, /function openWritingModule/);
  assert.match(source, /function continueWritingEntry/);
  assert.match(source, /function renderWritingPanel/);
  assert.match(source, /function renderWritingFlowSteps/);
  assert.match(source, /function renderWritingScaffoldPreview/);
  assert.match(source, /function renderWritingStrongModelRequestDetail/);
});

test("prototype writing shell delegates panel state building to writing workspace helpers", async () => {
  const source = await readPrototypeAppSource();
  const renderWritingPanelSource = extractFunctionSource(source, "renderWritingPanel");

  assert.match(source, /buildWritingPanelState/);
  assert.match(renderWritingPanelSource, /const panelState = buildWritingPanelState\(/);
  assert.match(renderWritingPanelSource, /toplineMetrics\.innerHTML = panelState\.toplineMetrics/);
  assert.doesNotMatch(renderWritingPanelSource, /const candidateFocusSourceIds = uniqueStrings/);
  assert.doesNotMatch(renderWritingPanelSource, /const strongModelState = describeWritingStrongModelStatus/);
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
