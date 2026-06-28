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
  assert.match(source, /renderAppShell/);
  assert.match(source, /currentModuleSidebarUi/);
  assert.match(source, /renderSidebarTitleForRuntime/);
  assert.match(source, /routeAppShellStateChange/);
  assert.match(source, /renderWritingPanelShell/);
  assert.match(source, /renderSystemMessagesShell/);
  assert.match(source, /openSystemMessagesShell/);
  assert.match(source, /closeSystemMessagesShell/);
  assert.match(source, /isSystemMessageModalOpenShell/);
  assert.match(source, /renderGraphVisualMapForRuntime/);
  assert.match(source, /renderGraphPanelShell/);
  assert.match(source, /buildGraphPanelRuntimeDeps/);
  assert.match(source, /renderGraphPanelForRuntime/);
  assert.doesNotMatch(source, /renderSystemMessagesDom/);
  assert.doesNotMatch(source, /openSystemMessagesDom/);
  assert.doesNotMatch(source, /systemMessageModal"\)\?\.classList\.add\("hidden"\)/);
  assert.doesNotMatch(source, /classList\.remove\("system-message-modal-open"\)/);
});

test("prototype-app keeps critical shell wrappers thin", () => {
  const source = fs.readFileSync(prototypeAppPath, "utf8");
  const shellWrapperBudgets = {
    renderGraphVisualMap: 5,
    renderGraphPanel: 25,
    renderWritingPanel: 8,
    renderSystemMessages: 8,
    openSystemMessages: 8,
    closeSystemMessages: 5,
    isSystemMessageModalOpen: 5,
    renderAll: 30,
    renderSidebarTitle: 35,
    handleStateChange: 5
  };

  for (const [name, maxLines] of Object.entries(shellWrapperBudgets)) {
    const count = functionLineCount(source, name);
    assert.ok(count <= maxLines, `${name} should stay a shell wrapper under ${maxLines} lines, got ${count}`);
  }
});

test("extracted shell modules stay focused on one assembly boundary", () => {
  const moduleLineBudgets = {
    "app-shell-render-all.js": 80,
    "app-shell-render-all-deps.js": 70,
    "app-shell-render-all-host-deps.js": 35,
    "app-shell-sidebar-controller.js": 140,
    "app-shell-sidebar-deps.js": 60,
    "app-shell-state-change-deps.js": 40,
    "writing-panel-host-deps.js": 60,
    "writing-panel-shell.js": 90,
    "writing-panel-deps.js": 120,
    "writing-theme-selection-controller.js": 60,
    "writing-project-history-panel.js": 130,
    "writing-strong-model-panel.js": 60,
    "writing-book-design-panel.js": 110,
    "writing-strong-model-request-panel.js": 70,
    "writing-note-card-panel.js": 45,
    "writing-theme-card-panel.js": 180,
    "writing-status-strip-panel.js": 210,
    "writing-scaffold-preview-panel.js": 160,
    "system-messages-shell.js": 60,
    "system-messages-host-deps.js": 30,
    "system-messages-view.js": 100,
    "graph-visual-map-controller.js": 20,
    "graph-visual-map-composer.js": 240,
    "graph-visual-map-runtime-deps.js": 40,
    "graph-visual-map-host-deps.js": 60,
    "graph-visual-map-layout-state.js": 90,
    "graph-visual-map-head.js": 90,
    "graph-visual-map-empty-state.js": 40,
    "graph-visual-map-backdrop.js": 60,
    "graph-visual-map-panels.js": 70,
    "graph-panel-runtime-deps.js": 40,
    "graph-panel-renderer.js": 150
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
    "app-shell-render-all-deps.js",
    "app-shell-render-all-host-deps.js",
    "app-shell-module-ui.js",
    "app-shell-module-header.js",
    "app-shell-sidebar-controller.js",
    "app-shell-sidebar-deps.js",
    "app-shell-state-change-deps.js",
    "app-shell-state-change-router.js",
    "writing-panel-deps.js",
    "writing-panel-host-deps.js",
    "writing-panel-shell.js",
    "system-messages-host-deps.js",
    "system-messages-shell.js",
    "system-messages-runtime-controller.js",
    "ai-runtime-mode-controller.js",
    "graph-canvas-event-router.js",
    "graph-selection-runtime-deps.js",
    "graph-cluster-selection-panel.js",
    "graph-visual-map-controller.js",
    "graph-visual-map-host-deps.js",
    "graph-visual-map-runtime-deps.js",
    "graph-panel-shell.js",
    "graph-panel-runtime-deps.js",
    "graph-panel-renderer.js",
    "graph-visual-layout.js"
  ];

  for (const modulePath of requiredImports) {
    assert.match(source, new RegExp(`from "\\./${modulePath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`));
  }

  assert.doesNotMatch(source, /function renderWritingFlowSteps/);
  assert.doesNotMatch(source, /function renderWritingStatusStrip/);
  assert.doesNotMatch(source, /function renderGraphVisualNode/);
  assert.doesNotMatch(source, /function renderGraphVisualEdge/);
  assert.doesNotMatch(source, /function renderSystemMessagesDom/);
  assert.doesNotMatch(source, /function closeSystemMessagesDom/);
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
