import { spawnSync } from "node:child_process";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

export const RELATIONS_GRAPH_UNIT_TEST_FILES = [
  "tests/unit/web-graph-relation-state-query.test.mjs",
  "tests/unit/web-relation-save-transaction.test.mjs",
  "tests/unit/web-graph-relation-workflow-controller.test.mjs",
  "tests/unit/web-permanent-note-sidebar-architecture.test.mjs",
  "tests/unit/web-graph-relation-save-controller.test.mjs",
  "tests/unit/web-graph-isolated-relation-controller.test.mjs",
  "tests/unit/web-graph-isolated-relation-form.test.mjs",
  "tests/unit/web-graph-isolated-relation-workspace.test.mjs",
  "tests/unit/web-graph-isolated-workflow-shell.test.mjs",
  "tests/unit/web-graph-isolated-queue.test.mjs",
  "tests/unit/web-graph-local-relations.test.mjs",
  "tests/unit/web-graph-thinking-workspace-ui.test.mjs",
  "tests/unit/web-link-picker-insert-behavior.test.mjs",
  "tests/unit/web-permanent-relation-workspace.test.mjs",
  "tests/unit/web-relation-panel-workspace-copy.test.mjs",
  "tests/unit/web-relation-followup-suggestion.test.mjs",
  "tests/unit/web-note-embedded-ai-workspace.test.mjs",
  "tests/unit/web-writing-readiness.test.mjs"
];

export const RELATIONS_GRAPH_BROWSER_GROUPS = [
  "relations-graph-closeout",
  "permanent-relation-workspace"
];

function runNode(args, env = {}) {
  const result = spawnSync(process.execPath, args, {
    cwd: repoRoot,
    stdio: "inherit",
    env: {
      ...process.env,
      ...env
    }
  });
  if (result.error) {
    console.error(result.error);
    process.exit(1);
  }
  if ((result.status ?? 1) !== 0) {
    process.exit(result.status ?? 1);
  }
}

function runUnit() {
  console.log("== relations graph unit regression ==");
  runNode(["--test", ...RELATIONS_GRAPH_UNIT_TEST_FILES]);
}

function runBrowser() {
  console.log("== relations graph browser acceptance ==");
  runNode(["./scripts/browser-e2e-check.mjs", ...RELATIONS_GRAPH_BROWSER_GROUPS]);
}

function printList() {
  console.log("Relations graph unit regression files:");
  for (const file of RELATIONS_GRAPH_UNIT_TEST_FILES) console.log(`- ${file}`);
  console.log("\nRelations graph browser acceptance groups:");
  for (const group of RELATIONS_GRAPH_BROWSER_GROUPS) console.log(`- ${group}`);
}

function runCli(args = process.argv.slice(2)) {
  const mode = args.includes("--all")
    ? "all"
    : args.includes("--browser")
      ? "browser"
      : args.includes("--list") || args.includes("-l")
        ? "list"
        : "unit";

  if (mode === "list") printList();
  if (mode === "unit") runUnit();
  if (mode === "browser") runBrowser();
  if (mode === "all") {
    runUnit();
    runBrowser();
  }
}

const isMain = process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;
if (isMain) {
  runCli();
}
