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

function fileLineCount(...segments) {
  return fs.readFileSync(path.join(webSrcDir, ...segments), "utf8").split(/\r?\n/).length;
}

test("prototype-app stays inside the current shell validation budget", () => {
  const source = fs.readFileSync(prototypeAppPath, "utf8");
  const lineCount = source.split(/\r?\n/).length;

  assert.ok(lineCount <= 19000, `prototype-app.js should not grow past the shell budget, got ${lineCount} lines`);
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
    handleStateChange: 5
  };

  for (const [name, maxLines] of Object.entries(shellWrapperBudgets)) {
    const count = functionLineCount(source, name);
    assert.ok(count <= maxLines, `${name} should stay a shell wrapper under ${maxLines} lines, got ${count}`);
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
    "app-shell-state-change-host-deps.js": 100,
    "app-shell-state-change-deps.js": 40,
    "import-workspace-shell.js": 120,
    "writing-panel-host-deps.js": 60,
    "writing-panel-shell.js": 90,
    "writing-panel-deps.js": 120,
    "writing-candidate-state.js": 40,
    "writing-basket-state.js": 80,
    "writing-session-state.js": 80,
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
    "graph-refresh-controller.js": 90,
    "graph-viewport-controller.js": 110,
    "graph-utility-drawer-controller.js": 160,
    "graph-presentation-controller.js": 80,
    "graph-focus-controls-state.js": 90,
    "graph-reading-lens-state.js": 180,
    "graph-view-mode-state.js": 140,
    "graph-relation-visual-state.js": 100,
    "graph-visual-selection-state.js": 45,
    "graph-selection-host-deps.js": 80,
    "graph-workspace-host-deps.js": 60
  };

  for (const [modulePath, maxLines] of Object.entries(moduleLineBudgets)) {
    const count = fileLineCount(modulePath);
    assert.ok(count <= maxLines, `${modulePath} should stay under ${maxLines} lines, got ${count}`);
  }
});

test("prototype-app keeps shell-era UI responsibilities behind extracted modules", () => {
  const source = fs.readFileSync(prototypeAppPath, "utf8");
  const requiredImports = [
    "app-shell-render-all.js",
    "app-shell-render-all-host-deps.js",
    "app-shell-module-ui.js",
    "app-shell-module-header.js",
    "app-shell-sidebar-controller.js",
    "app-shell-sidebar-host-deps.js",
    "app-shell-state-change-host-deps.js",
    "app-shell-state-change-router.js",
    "import-workspace-shell.js",
    "writing-panel-host-deps.js",
    "writing-panel-shell.js",
    "writing-candidate-state.js",
    "writing-basket-state.js",
    "writing-session-state.js",
    "writing-theme-state.js",
    "system-messages-host-deps.js",
    "system-messages-shell.js",
    "system-message-storage.js",
    "system-message-deps.js",
    "system-message-workflow-sync.js",
    "system-messages-runtime-controller.js",
    "ai-runtime-mode-controller.js",
    "graph-canvas-event-router.js",
    "graph-selection-host-deps.js",
    "graph-workspace-host-deps.js",
    "graph-cluster-selection-panel.js",
    "graph-visual-map-controller.js",
    "graph-visual-map-host-deps.js",
    "graph-panel-host-deps.js",
    "graph-panel-shell.js",
    "graph-panel-renderer.js",
    "graph-refresh-controller.js",
    "graph-viewport-controller.js",
    "graph-utility-drawer-controller.js",
    "graph-presentation-controller.js",
    "graph-focus-controls-state.js",
    "graph-reading-lens-state.js",
    "graph-view-mode-state.js",
    "graph-relation-visual-state.js",
    "graph-visual-selection-state.js",
    "graph-visual-layout.js"
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
  assert.doesNotMatch(source, /function graphThemeNoteIds/);
  assert.doesNotMatch(source, /function graphThemeSelectionKey/);
  assert.doesNotMatch(source, /function graphIsolatedSelectionKey/);
  assert.doesNotMatch(source, /function graphBridgeSelectionKey/);
  assert.doesNotMatch(source, /function graphNodeClass/);
  assert.doesNotMatch(source, /function renderSystemMessagesDom/);
  assert.doesNotMatch(source, /function closeSystemMessagesDom/);
  assert.doesNotMatch(source, /function renderSystemMessages/);
  assert.doesNotMatch(source, /function openSystemMessages/);
  assert.doesNotMatch(source, /function closeSystemMessages/);
  assert.doesNotMatch(source, /function isSystemMessageModalOpen/);
  assert.doesNotMatch(source, /function systemMessagesDomDeps/);
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
