import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..", "..");

async function readRepoText(...segments) {
  return fs.readFile(path.join(REPO_ROOT, ...segments), "utf8");
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

export async function readEditorDomainSource() {
  const files = [
    "components-editor-pane.js",
    "editor-dirty-state.js",
    "editor-link-picker.js",
    "editor-markdown-commands.js",
    "editor-preview-renderer.js",
    "editor-render-utils.js",
    "editor-relation-helpers.js",
    "editor-template-workspace.js"
  ];
  const sources = await Promise.all(files.map((file) => readRepoText("apps", "web", "src", file)));
  return sources.join("\n");
}

export function readComponentsExplorerPaneSource() {
  return readRepoText("apps", "web", "src", "components-explorer-pane.js");
}
