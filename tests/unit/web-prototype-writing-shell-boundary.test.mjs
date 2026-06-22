import test from "node:test";
import assert from "node:assert/strict";
import {
  readPrototypeAppSource,
  readWritingPanelControllerSource
} from "./copy-source-helpers.mjs";

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
});

test("prototype writing shell delegates panel state building to writing workspace helpers", async () => {
  const source = await readPrototypeAppSource();
  const panelControllerSource = await readWritingPanelControllerSource();
  const renderWritingPanelSource = extractFunctionSource(source, "renderWritingPanel");

  assert.match(source, /buildWritingPanelState/);
  assert.match(renderWritingPanelSource, /renderWritingPanelDom\(writingPanelDomDeps\(\)\)/);
  assert.match(panelControllerSource, /const panelState = buildWritingPanelState\(/);
  assert.match(panelControllerSource, /toplineMetrics\.innerHTML = panelState\.toplineMetrics/);
  assert.match(panelControllerSource, /function renderWritingFlowStepsDom/);
  assert.match(panelControllerSource, /renderWritingFlowStepsDom\(deps,/);
  assert.doesNotMatch(source, /function renderWritingFlowSteps/);
  assert.match(panelControllerSource, /function renderWritingScaffoldPreviewDom/);
  assert.match(panelControllerSource, /renderWritingScaffoldPreviewDom\(deps\)/);
  assert.doesNotMatch(source, /function renderWritingScaffoldPreview/);
  assert.match(panelControllerSource, /function renderWritingStrongModelRequestDetailDom/);
  assert.match(panelControllerSource, /renderWritingStrongModelRequestDetailDom\(deps,/);
  assert.doesNotMatch(source, /function renderWritingStrongModelRequestDetail/);
  assert.match(panelControllerSource, /function renderWritingStatusStripDom/);
  assert.match(panelControllerSource, /renderWritingStatusStripDom\(deps\)/);
  assert.doesNotMatch(source, /function renderWritingStatusStrip/);
  assert.match(panelControllerSource, /function renderWritingThemeIndexCardDom/);
  assert.match(panelControllerSource, /function renderWritingThemeDetailDom/);
  assert.doesNotMatch(source, /function renderWritingThemeIndexCard/);
  assert.doesNotMatch(source, /function renderWritingThemeDetail/);
  assert.match(panelControllerSource, /function renderWritingNoteCardDom/);
  assert.match(panelControllerSource, /function renderWritingProjectCardDom/);
  assert.doesNotMatch(source, /function renderWritingNoteCard/);
  assert.doesNotMatch(source, /function renderWritingProjectCard/);
  assert.doesNotMatch(panelControllerSource, /const candidateFocusSourceIds = uniqueStrings/);
});

test("prototype writing shell keeps continuity and scaffold wording boundaries without legacy scaffold labels", async () => {
  const source = await readPrototypeAppSource();
  const panelControllerSource = await readWritingPanelControllerSource();

  assert.match(source, /currentWritingContinuationEntry/);
  assert.match(source, /describeWritingNextActionFromState/);
  assert.match(panelControllerSource, /projectEntry\?\.projectId && projectEntry\?\.actionLabel/);
  assert.match(panelControllerSource, /const draftTone =[\s\S]*projectPreflightSummary\.level !== "ready"[\s\S]*"warn"/);
  assert.doesNotMatch(source, /WritingProject: \$\{projectId\}/);
  assert.doesNotMatch(source, /DraftScaffold: \$\{scaffoldId\}/);
  assert.doesNotMatch(source, /current scaffold/);
});
