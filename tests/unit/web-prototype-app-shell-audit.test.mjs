import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const currentFile = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(currentFile), "../..");
const unitDir = path.join(repoRoot, "tests", "unit");
const prototypeAppPath = path.join(repoRoot, "apps", "web", "src", "prototype-app.js");

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
  assert.match(source, /handleCreatePrimaryNoteStateChange/);
  assert.match(source, /handleNoteMoveStateChange/);
  assert.match(source, /handleSelectFolderStateChange/);
  assert.match(source, /renderWritingPanelShell/);
  assert.match(source, /renderSystemMessagesShell/);
  assert.match(source, /openSystemMessagesShell/);
  assert.match(source, /renderGraphVisualMapForRuntime/);
  assert.doesNotMatch(source, /renderSystemMessagesDom/);
  assert.doesNotMatch(source, /openSystemMessagesDom/);
});

test("prototype-app keeps shell-era UI responsibilities behind extracted modules", () => {
  const source = fs.readFileSync(prototypeAppPath, "utf8");
  const requiredImports = [
    "app-shell-render-all.js",
    "app-shell-module-ui.js",
    "app-shell-sidebar-controller.js",
    "app-shell-state-file-actions.js",
    "app-shell-state-note-creation-actions.js",
    "app-shell-state-navigation-actions.js",
    "writing-panel-shell.js",
    "system-messages-shell.js",
    "ai-runtime-mode-controller.js",
    "graph-canvas-event-router.js",
    "graph-visual-map-controller.js",
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
