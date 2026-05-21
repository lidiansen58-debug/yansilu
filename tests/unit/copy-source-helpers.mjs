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

export function readComponentsEditorPaneSource() {
  return readRepoText("apps", "web", "src", "components-editor-pane.js");
}
