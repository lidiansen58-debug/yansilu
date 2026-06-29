import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const currentFile = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(currentFile), "../..");
const unitDir = path.join(repoRoot, "tests", "unit");
const prototypeAppPath = path.join(repoRoot, "apps", "web", "src", "prototype-app.js");
const webSrcDir = path.join(repoRoot, "apps", "web", "src");

function unitTestFiles(dir = unitDir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return unitTestFiles(entryPath);
    return entry.name.endsWith(".test.mjs") ? [entryPath] : [];
  });
}

function prototypeSourceReferenceCount(source = "") {
  return (source.match(/readPrototypeAppSource|prototype-app\.js|apps\/web\/src\/prototype-app\.js|apps", "web", "src", "prototype-app\.js/g) || []).length;
}

function functionLineCount(source = "", name = "") {
  const start = source.indexOf(`function ${name}`);
  const asyncStart = source.indexOf(`async function ${name}`);
  const index = start >= 0 ? start : asyncStart;
  assert.ok(index >= 0, `expected ${name} to exist`);
  const bodyStart = source.indexOf("{", index);
  let depth = 0;
  for (let cursor = bodyStart; cursor < source.length; cursor += 1) {
    const char = source[cursor];
    if (char === "{") depth += 1;
    if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        return source.slice(index, cursor + 1).split(/\r?\n/).length;
      }
    }
  }
  throw new Error(`expected ${name} body to close`);
}

function optionalFunctionLineCount(source = "", name = "") {
  const start = source.indexOf(`function ${name}`);
  const asyncStart = source.indexOf(`async function ${name}`);
  const index = start >= 0 ? start : asyncStart;
  if (index < 0) return null;
  return functionLineCount(source, name);
}

function fileLineCount(...segments) {
  return fs.readFileSync(path.join(webSrcDir, ...segments), "utf8").split(/\r?\n/).length;
}

test("prototype-app stays inside the current shell validation budget", () => {
  const source = fs.readFileSync(prototypeAppPath, "utf8");
  const lineCount = source.split(/\r?\n/).length;

  assert.ok(lineCount <= 8500, `prototype-app.js should not grow past the shell budget, got ${lineCount} lines`);
  assert.match(source, /bindAiInboxWorkspaceEvents/);
  assert.match(source, /bindAiSuggestionsWorkspaceEvents/);
  assert.match(source, /createGraphRelationWorkflowController/);
  assert.match(source, /createPrototypeUpdateController/);
  assert.match(source, /systemMessageActionRoute/);
  assert.match(source, /createRenderAppShellController/);
  assert.match(source, /currentModuleSidebarUi/);
  assert.match(source, /createSidebarTitleController/);
  assert.match(source, /routeAppShellStateChange/);
  assert.match(source, /createWritingPanelShellController/);
  assert.match(source, /createSystemMessagesShellController/);
  assert.match(source, /createGraphVisualMapController/);
  assert.match(source, /renderGraphPanelShell/);
  assert.match(source, /createGraphPanelPrototypeRuntimeDepsProvider/);
  assert.match(source, /renderGraphPanelForRuntime/);
  assert.doesNotMatch(source, /renderSystemMessagesDom/);
  assert.doesNotMatch(source, /openSystemMessagesDom/);
  assert.doesNotMatch(source, /systemMessageModal"\)\?\.classList\.add\("hidden"\)/);
  assert.doesNotMatch(source, /classList\.remove\("system-message-modal-open"\)/);
});

test("prototype-app keeps critical shell wrappers thin", () => {
  const source = fs.readFileSync(prototypeAppPath, "utf8");
  const shellWrapperBudgets = {
    renderGraphPanel: 25,
    renderSettingsWorkbenchChrome: 15,
    renderSettingsSidebarColumn: 15,
    renderSettingsDetailFocus: 5,
    renderSettingsPanel: 5,
    renderAiSettingsExperience: 5,
    renderAiLocalModelRecommendations: 5,
    renderAiLocalModelControls: 5,
    renderAiProviderConfigControls: 5,
    renderAiRoutePreview: 5,
    renderDistillationPanel: 15,
    handleStateChange: 5,
    bootstrap: 5,
    appStartupDeps: 65
  };

  for (const [name, maxLines] of Object.entries(shellWrapperBudgets)) {
    const count = functionLineCount(source, name);
    assert.ok(count <= maxLines, `${name} should stay a shell wrapper under ${maxLines} lines, got ${count}`);
  }
});

test("prototype-app residual controller and view candidates stay explicit and bounded", () => {
  const source = fs.readFileSync(prototypeAppPath, "utf8");
  const residualControllerCandidates = {
    createGraphThemeIndexFromNoteIds: 80
  };
  const residualViewCandidates = {
    renderGraphAiAnalysisCard: 60,
    renderGraphBridgeGapSection: 60,
    renderGraphWeakRelationClueSection: 60,
    renderGraphIsolatedDecisionForm: 60,
    renderGraphRelationCandidateCards: 50
  };

  for (const [name, maxLines] of Object.entries({ ...residualControllerCandidates, ...residualViewCandidates })) {
    const count = optionalFunctionLineCount(source, name);
    if (count === null) continue;
    assert.ok(count <= maxLines, `${name} is a known shell residual and should stay under ${maxLines} lines while it remains in prototype-app.js, got ${count}`);
  }
});

test("extracted shell modules stay focused on one assembly boundary", () => {
  const moduleLineBudgets = {
    "app-shell-render-all.js": 90,
    "app-shell-render-all-deps.js": 70,
    "app-shell-render-all-host-deps.js": 35,
    "app-shell-sidebar-controller.js": 150,
    "app-shell-sidebar-deps.js": 60,
    "app-shell-sidebar-host-deps.js": 30,
    "explorer-host-deps.js": 50,
    "mobile-note-event-bindings.js": 35,
    "app-shell-state-change-host-deps.js": 100,
    "app-shell-state-change-deps.js": 40,
    "app-startup-controller.js": 120,
    "app-event-bindings.js": 200,
    "app-rail-event-bindings.js": 70,
    "quick-action-event-bindings.js": 70,
    "app-global-keyboard-events.js": 120,
    "startup-auto-open-event-bindings.js": 20,
    "dirty-tabs-beforeunload-event-bindings.js": 20,
    "editor-shell-event-bindings.js": 90,
    "save-ai-suggestion-route-events.js": 80,
    "app-startup-seed.js": 70,
    "app-route-initializer.js": 60,
    "import-workspace-shell.js": 120,
    "distillation-panel-view.js": 140,
    "distillation-event-bindings.js": 60,
    "distillation-note-route.js": 60,
    "writing-panel-host-deps.js": 60,
    "writing-panel-shell.js": 90,
    "writing-panel-deps.js": 120,
    "writing-candidate-state.js": 40,
    "writing-basket-state.js": 80,
    "writing-session-state.js": 80,
    "writing-project-action-model.js": 130,
    "writing-project-runtime-controller.js": 270,
    "writing-entry-route-model.js": 100,
    "writing-entry-runtime-controller.js": 230,
    "writing-theme-state.js": 50,
    "writing-theme-selection-controller.js": 60,
    "writing-project-history-panel.js": 130,
    "writing-strong-model-panel.js": 60,
    "writing-book-design-panel.js": 110,
    "writing-strong-model-request-panel.js": 70,
    "writing-note-card-panel.js": 45,
    "writing-theme-card-panel.js": 180,
    "writing-status-strip-panel.js": 210,
    "writing-scaffold-preview-panel.js": 160,
    "system-messages-shell.js": 75,
    "system-messages-host-deps.js": 30,
    "system-messages-view.js": 100,
    "system-message-storage.js": 35,
    "system-message-deps.js": 85,
    "system-message-workflow-sync.js": 70,
    "system-message-route-model.js": 40,
    "system-message-controller.js": 120,
    "workflow-reminder-controller.js": 40,
    "settings-ai-controls-view.js": 360,
    "settings-ai-experience-model.js": 90,
    "settings-ai-experience-view.js": 340,
    "settings-ai-runtime-actions.js": 130,
    "settings-ai-runtime-controller.js": 560,
    "settings-ai-provider-config-actions.js": 70,
    "settings-ai-route-preview-view.js": 230,
    "settings-panel-shell.js": 130,
    "settings-panel-renderer.js": 180,
    "settings-event-bindings.js": 320,
    "settings-ai-event-bindings.js": 450,
    "settings-feedback-event-bindings.js": 60,
    "ai-inbox-host-deps.js": 45,
    "ai-suggestions-host-deps.js": 45,
    "graph-visual-map-controller.js": 35,
    "graph-visual-map-composer.js": 240,
    "graph-visual-map-runtime-deps.js": 40,
    "graph-visual-map-host-deps.js": 60,
    "graph-visual-map-layout-state.js": 90,
    "graph-visual-map-head.js": 90,
    "graph-visual-map-empty-state.js": 40,
    "graph-visual-map-backdrop.js": 60,
    "graph-visual-map-panels.js": 70,
    "graph-panel-host-deps.js": 70,
    "graph-panel-runtime-deps.js": 40,
    "graph-panel-renderer.js": 150,
    "graph-entry-event-bindings.js": 45,
    "graph-scope-state.js": 160,
    "graph-refresh-controller.js": 90,
    "graph-viewport-controller.js": 110,
    "graph-utility-drawer-controller.js": 160,
    "graph-presentation-controller.js": 80,
    "graph-focus-controls-state.js": 90,
    "graph-reading-lens-state.js": 180,
    "graph-view-mode-state.js": 140,
    "graph-relation-visual-state.js": 100,
    "graph-visual-selection-state.js": 45,
    "graph-visual-geometry.js": 240,
    "graph-icon-view.js": 130,
    "graph-filter-options-view.js": 120,
    "graph-map-preview-view.js": 90,
    "graph-isolated-decision-form-model.js": 60,
    "graph-isolated-decision-note-update.js": 70,
    "note-runtime-controller.js": 170,
    "note-loading-runtime.js": 80,
    "note-template-runtime-helpers.js": 150,
    "note-persistence-policy.js": 90,
    "scheduled-tasks-runtime-controller.js": 340,
    "workspace-status-hint-model.js": 120,
    "settings-template-preview-view.js": 80,
    "settings-template-card-model.js": 80,
    "editor-host-deps.js": 130,
    "graph-ai-connect-model.js": 60,
    "graph-ai-connect-runtime-controller.js": 230,
    "graph-followup-controller.js": 260,
    "graph-followup-draft-templates.js": 190,
    "graph-isolated-decision-controller.js": 110,
    "graph-selection-host-deps.js": 80,
    "graph-selection-panel-renderer.js": 60,
    "graph-workspace-host-deps.js": 60,
    "graph-residual-views.js": 3400
  };

  for (const [modulePath, maxLines] of Object.entries(moduleLineBudgets)) {
    const count = fileLineCount(modulePath);
    assert.ok(count <= maxLines, `${modulePath} should stay under ${maxLines} lines, got ${count}`);
  }
});

test("prototype-app keeps shell-era UI responsibilities behind extracted modules", () => {
  const source = fs.readFileSync(prototypeAppPath, "utf8");
  const settingsAiEventSource = fs.readFileSync(path.join(webSrcDir, "settings-ai-event-bindings.js"), "utf8");
  const requiredImports = [
    "app-shell-render-all.js",
    "app-shell-render-all-host-deps.js",
    "app-shell-module-ui.js",
    "app-shell-module-header.js",
    "app-shell-sidebar-controller.js",
    "app-shell-sidebar-host-deps.js",
    "explorer-host-deps.js",
    "mobile-note-event-bindings.js",
    "app-shell-state-change-host-deps.js",
    "app-shell-state-change-router.js",
    "app-startup-controller.js",
    "app-rail-event-bindings.js",
    "quick-action-event-bindings.js",
    "app-global-keyboard-events.js",
    "startup-auto-open-event-bindings.js",
    "dirty-tabs-beforeunload-event-bindings.js",
    "editor-shell-event-bindings.js",
    "save-ai-suggestion-route-events.js",
    "import-workspace-shell.js",
    "distillation-panel-view.js",
    "distillation-event-bindings.js",
    "distillation-note-route.js",
    "writing-panel-host-deps.js",
    "writing-panel-shell.js",
    "writing-candidate-state.js",
    "writing-basket-state.js",
    "writing-session-state.js",
    "writing-project-runtime-controller.js",
    "writing-entry-route-model.js",
    "writing-theme-state.js",
    "system-messages-host-deps.js",
    "system-messages-shell.js",
    "system-message-storage.js",
    "system-message-route-model.js",
    "system-message-deps.js",
    "workflow-reminder-controller.js",
    "system-messages-runtime-controller.js",
    "ai-runtime-mode-controller.js",
    "settings-ai-controls-view.js",
    "settings-ai-experience-view.js",
    "settings-ai-runtime-actions.js",
    "settings-ai-runtime-controller.js",
    "settings-ai-provider-config-actions.js",
    "settings-ai-route-preview-view.js",
    "settings-panel-shell.js",
    "settings-panel-renderer.js",
    "settings-event-bindings.js",
    "settings-ai-event-bindings.js",
    "settings-feedback-event-bindings.js",
    "ai-inbox-host-deps.js",
    "ai-suggestions-host-deps.js",
    "graph-canvas-event-router.js",
    "graph-workspace-host-deps.js",
    "graph-cluster-selection-panel.js",
    "graph-visual-map-controller.js",
    "graph-visual-map-host-deps.js",
    "graph-panel-host-deps.js",
    "graph-panel-shell.js",
    "graph-panel-renderer.js",
    "graph-entry-event-bindings.js",
    "graph-scope-state.js",
    "graph-refresh-controller.js",
    "graph-viewport-controller.js",
    "graph-utility-drawer-controller.js",
    "graph-presentation-controller.js",
    "graph-focus-controls-state.js",
    "graph-reading-lens-state.js",
    "graph-view-mode-state.js",
    "graph-relation-visual-state.js",
    "graph-visual-selection-state.js",
    "graph-visual-geometry.js",
    "graph-visual-layout.js",
    "graph-icon-view.js",
    "graph-filter-options-view.js",
    "graph-map-preview-view.js",
    "graph-ai-connect-runtime-controller.js",
    "graph-followup-controller.js",
    "graph-isolated-decision-controller.js",
    "note-runtime-controller.js",
    "note-persistence-policy.js",
    "workspace-status-hint-model.js",
    "settings-template-preview-view.js",
    "settings-template-card-model.js",
    "editor-host-deps.js",
    "graph-selection-panel-renderer.js",
    "graph-residual-views.js"
  ];

  for (const modulePath of requiredImports) {
    assert.match(source, new RegExp(`from "\\./${modulePath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`));
  }

  assert.doesNotMatch(source, /function renderWritingFlowSteps/);
  assert.doesNotMatch(source, /function renderWritingStatusStrip/);
  assert.doesNotMatch(source, /function renderWritingPanel/);
  assert.doesNotMatch(source, /function writingPanelDomDeps/);
  assert.doesNotMatch(source, /function renderAll/);
  assert.doesNotMatch(source, /function renderSidebarTitle/);
  assert.doesNotMatch(source, /function renderGraphVisualNode/);
  assert.doesNotMatch(source, /function renderGraphVisualEdge/);
  assert.doesNotMatch(source, /function renderGraphVisualMap/);
  assert.doesNotMatch(source, /function graphVisualMapRuntimeDeps/);
  assert.doesNotMatch(source, /function beginGraphViewportDrag/);
  assert.doesNotMatch(source, /function updateGraphViewportDrag/);
  assert.doesNotMatch(source, /function endGraphViewportDrag/);
  assert.doesNotMatch(source, /function clampGraphUtilityDrawerPosition/);
  assert.doesNotMatch(source, /function beginGraphUtilityDrawerDrag/);
  assert.doesNotMatch(source, /function updateGraphUtilityDrawerDrag/);
  assert.doesNotMatch(source, /function endGraphUtilityDrawerDrag/);
  assert.doesNotMatch(source, /function syncGraphDisclosureState/);
  assert.doesNotMatch(source, /function clearGraphDensityHintTimer/);
  assert.doesNotMatch(source, /function shouldShowGraphDensityHint/);
  assert.doesNotMatch(source, /function resetGraphDemoPresentationState/);
  assert.doesNotMatch(source, /function normalizeGraphFocusDepth/);
  assert.doesNotMatch(source, /function graphFocusDepthMeta/);
  assert.doesNotMatch(source, /function normalizeGraphFocusContextMode/);
  assert.doesNotMatch(source, /function graphFocusContextModeMeta/);
  assert.doesNotMatch(source, /function graphEdgeMatchesReadingLens/);
  assert.doesNotMatch(source, /const GENERATED_ORIGINAL_MARKER_PATTERN/);
  assert.doesNotMatch(source, /function generatedOriginalNoteIdFromBody/);
  assert.doesNotMatch(source, /function stripGeneratedOriginalMarker/);
  assert.doesNotMatch(source, /function withGeneratedOriginalMarker/);
  assert.doesNotMatch(source, /function withGeneratedOriginalReference/);
  assert.doesNotMatch(source, /function graphBuildReadingLensState/);
  assert.doesNotMatch(source, /function graphViewModeForRelationType/);
  assert.doesNotMatch(source, /function normalizeGraphRelationTypeFilter/);
  assert.doesNotMatch(source, /function graphReadingModeMeta/);
  assert.doesNotMatch(source, /function graphHasMeaningfulStructureEdges/);
  assert.doesNotMatch(source, /const GRAPH_RELATION_VISUALS/);
  assert.doesNotMatch(source, /const GRAPH_RELATION_GROUP_META/);
  assert.doesNotMatch(source, /function graphRelationVisual/);
  assert.doesNotMatch(source, /function graphRelationGroupMeta/);
  assert.doesNotMatch(source, /function graphEdgeSelectionKey/);
  assert.match(
    source,
    /import\s+\{[\s\S]*GRAPH_RELATION_GROUP_META[\s\S]*GRAPH_RELATION_MARKER_COLORS[\s\S]*graphRelationGroupMeta[\s\S]*\}\s+from "\.\/graph-relation-visual-state\.js";/
  );
  assert.doesNotMatch(source, /function graphThemeNoteIds/);
  assert.doesNotMatch(source, /function graphThemeSelectionKey/);
  assert.doesNotMatch(source, /function graphIsolatedSelectionKey/);
  assert.doesNotMatch(source, /function graphBridgeSelectionKey/);
  assert.doesNotMatch(source, /function graphNodeClass/);
  assert.doesNotMatch(source, /function graphHash/);
  assert.doesNotMatch(source, /function graphNodeStarTier/);
  assert.doesNotMatch(source, /function graphDenseGalaxyMode/);
  assert.doesNotMatch(source, /function graphEdgeShouldRender\(\{/);
  assert.doesNotMatch(source, /function graphThemeBoundaryMeta\(\{/);
  assert.doesNotMatch(source, /function renderGraphThemeBoundary\(boundary = null\) \{\s*if \(!boundary\)/);
  assert.doesNotMatch(source, /function renderSystemMessagesDom/);
  assert.doesNotMatch(source, /function closeSystemMessagesDom/);
  assert.doesNotMatch(source, /function renderSystemMessages/);
  assert.doesNotMatch(source, /function openSystemMessages/);
  assert.doesNotMatch(source, /function closeSystemMessages/);
  assert.doesNotMatch(source, /function isSystemMessageModalOpen/);
  assert.doesNotMatch(source, /function systemMessagesDomDeps/);
  assert.doesNotMatch(settingsAiEventSource, /settingsPaneAutomationBody/);
  assert.doesNotMatch(source, /async function applyAiRuntimeModeChange\(nextMode = "auto"\) \{\s*const next = normalizeAiRuntimeMode/);
  assert.doesNotMatch(source, /const configs = \{\s*distillation:/);
});

test("prototype-app source-string tests stay centralized as architecture boundary checks", () => {
  const readers = unitTestFiles()
    .map((file) => ({
      file,
      count: prototypeSourceReferenceCount(fs.readFileSync(file, "utf8"))
    }))
    .filter((item) => item.count > 0);
  const totalReferences = readers.reduce((total, item) => total + item.count, 0);

  assert.ok(readers.length <= 20, `expected at most 20 prototype-app source-reading unit files, got ${readers.length}`);
  assert.ok(totalReferences <= 50, `expected at most 50 prototype-app source references, got ${totalReferences}`);
  assert.ok(readers.some((item) => item.file.endsWith("web-prototype-graph-shell-boundary.test.mjs")));
  assert.ok(readers.some((item) => item.file.endsWith("web-prototype-writing-shell-boundary.test.mjs")));
});
