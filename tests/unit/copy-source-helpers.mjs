import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..", "..");

async function readRepoText(...segments) {
  const source = await fs.readFile(path.join(REPO_ROOT, ...segments), "utf8");
  return source.replace(/\r\n/g, "\n");
}

export function readWritingEngineSource() {
  return readRepoText("packages", "writing-engine", "src", "writing-engine.mjs");
}

export function readPrototypeAppSource() {
  return readRepoText("apps", "web", "src", "prototype-app.js");
}

export function readPrototypeHtmlSource() {
  return readRepoText("apps", "web", "src", "prototype.html");
}

export function readPrototypeCssSource() {
  return readPrototypeCssBundleSource();
}

async function readPrototypeCssBundleSource() {
  const entry = await readRepoText("apps", "web", "src", "prototype.css");
  const imported = await Promise.all(
    [...entry.matchAll(/@import\s+["']\.\/([^"']+\.css)["'];/g)]
      .map((match) => readRepoText("apps", "web", "src", match[1]))
  );
  return [entry, ...imported].join("\n");
}

export function readPrototypeWritingWorkspaceSource() {
  return readRepoText("apps", "web", "src", "prototype-writing-workspace.js");
}

export function readGraphFocusContextPanelSource() {
  return readRepoText("apps", "web", "src", "graph-focus-context-panel.js");
}

export async function readEditorDomainSource() {
  const files = [
    "components-editor-pane.js",
    "editor-autosave-drafts.js",
    "editor-dirty-state.js",
    "editor-link-picker.js",
    "editor-markdown-commands.js",
    "editor-preview-renderer.js",
    "editor-render-utils.js",
    "editor-relation-events.js",
    "editor-semantic-relations-controller.js",
    "editor-semantic-relations-model.js",
    "editor-semantic-relations-view.js",
    "editor-relation-helpers.js",
    "permanent-note-distillation-controller.js",
    "permanent-note-distillation-model.js",
    "permanent-note-distillation-view.js",
    "permanent-note-workspace-controller.js",
    "permanent-note-workspace-view.js",
    "editor-template-workspace.js"
  ];
  const sources = await Promise.all(files.map((file) => readRepoText("apps", "web", "src", file)));
  return sources.join("\n");
}

export function readComponentsExplorerPaneSource() {
  return readRepoText("apps", "web", "src", "components-explorer-pane.js");
}
