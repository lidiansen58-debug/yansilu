import test from "node:test";
import assert from "node:assert/strict";
import {
  readPrototypeAppSource,
  readWritingNoteCardPanelSource,
  readWritingStrongModelRequestPanelSource,
  readWritingThemeCardPanelSource,
  readWritingPanelControllerSource,
  readWritingPanelShellSource
} from "./copy-source-helpers.mjs";

test("prototype writing shell keeps the main writing surfaces wired", async () => {
  const source = await readPrototypeAppSource();

  assert.match(source, /function openWritingModule/);
  assert.match(source, /function continueWritingEntry/);
  assert.match(source, /function renderWritingPanel/);
  assert.match(source, /buildWritingPanelHostDeps\(/);
  assert.match(source, /function renderWritingPanel\(\) \{\s*return renderWritingPanelShell\(writingPanelDomDeps\(\)\);\s*\}/);
  assert.doesNotMatch(source, /renderWritingPanelDom\(writingPanelDomDeps\(\)\)/);
  assert.doesNotMatch(source, /buildWritingPanelState/);
});

test("prototype writing shell delegates panel state building to writing workspace helpers", async () => {
  const panelShellSource = await readWritingPanelShellSource();
  const panelControllerSource = await readWritingPanelControllerSource();
  const noteCardPanelSource = await readWritingNoteCardPanelSource();
  const strongModelRequestPanelSource = await readWritingStrongModelRequestPanelSource();
  const themeCardPanelSource = await readWritingThemeCardPanelSource();

  assert.match(panelShellSource, /createWritingPanelDomDeps/);
  assert.match(panelShellSource, /buildWritingPanelState/);
  assert.match(panelShellSource, /renderWritingPanelDom\(createWritingPanelDomDeps\(host\)\)/);
  assert.match(panelShellSource, /renderWritingScaffoldPreviewDom\(createWritingPanelDomDeps\(host\)\)/);
  assert.match(panelControllerSource, /const panelState = buildWritingPanelState\(/);
  assert.match(panelControllerSource, /toplineMetrics\.innerHTML = panelState\.toplineMetrics/);
  assert.match(panelControllerSource, /function renderWritingFlowStepsDom/);
  assert.match(panelControllerSource, /renderWritingFlowStepsDom\(deps,/);
  assert.match(panelControllerSource, /function renderWritingScaffoldPreviewDom/);
  assert.match(panelControllerSource, /renderWritingScaffoldPreviewDom\(deps\)/);
  assert.match(panelControllerSource, /renderWritingStrongModelRequestDetailDom\(deps,/);
  assert.match(panelControllerSource, /from "\.\/writing-strong-model-request-panel\.js"/);
  assert.match(strongModelRequestPanelSource, /function renderWritingStrongModelRequestDetailDom/);
  assert.match(panelControllerSource, /function renderWritingStatusStripDom/);
  assert.match(panelControllerSource, /renderWritingStatusStripDom\(deps\)/);
  assert.match(panelControllerSource, /from "\.\/writing-note-card-panel\.js"/);
  assert.match(panelControllerSource, /from "\.\/writing-theme-card-panel\.js"/);
  assert.match(themeCardPanelSource, /function renderWritingThemeIndexCardDom/);
  assert.match(themeCardPanelSource, /function renderWritingThemeDetailDom/);
  assert.match(noteCardPanelSource, /function renderWritingNoteCardDom/);
  assert.match(noteCardPanelSource, /function renderWritingProjectCardDom/);
  assert.doesNotMatch(panelControllerSource, /const candidateFocusSourceIds = uniqueStrings/);
});

test("prototype writing shell keeps continuity and scaffold wording boundaries without legacy scaffold labels", async () => {
  const source = await readPrototypeAppSource();
  const panelShellSource = await readWritingPanelShellSource();
  const panelControllerSource = await readWritingPanelControllerSource();

  assert.match(source, /currentWritingContinuationEntry/);
  assert.doesNotMatch(source, /describeWritingNextActionFromState/);
  assert.match(panelShellSource, /describeWritingNextActionFromState/);
  assert.match(panelControllerSource, /projectEntry\?\.projectId && projectEntry\?\.actionLabel/);
  assert.match(panelControllerSource, /const draftTone =[\s\S]*projectPreflightSummary\.level !== "ready"[\s\S]*"warn"/);
  assert.doesNotMatch(source, /WritingProject: \$\{projectId\}/);
  assert.doesNotMatch(source, /DraftScaffold: \$\{scaffoldId\}/);
  assert.doesNotMatch(source, /current scaffold/);
});
