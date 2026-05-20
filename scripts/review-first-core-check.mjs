import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

const CORE_TEST_FILES = [
  "tests/unit/review-first-test-matrix.test.mjs",
  "tests/unit/api-ai-suggestion-reject-runtime.test.mjs",
  "tests/unit/web-ai-inbox-stale-state-runtime.test.mjs",
  "tests/unit/web-ai-suggestions-runtime.test.mjs",
  "tests/unit/web-ai-inbox-panel.test.mjs",
  "tests/unit/web-ai-suggestions-panel.test.mjs",
  "tests/integration/api-ai-canonical-response.test.mjs",
  "tests/integration/api-ai-suggestions-canonical.test.mjs",
  "tests/integration/api-ai-canonical-contract.test.mjs",
  "tests/integration/api-ai-suggestion-reject-consistency.test.mjs",
  "tests/integration/api-ai-legacy-revised-compat.test.mjs",
  "tests/integration/api-vault-settings.test.mjs",
  "tests/integration/api-notes.test.mjs"
];

const BROWSER_PATTERN = "prototype AI inbox|prototype settings AI suggestions";
const BROWSER_FILE = "tests/e2e/prototype-browser.test.mjs";

function runNode(args, env = {}) {
  const result = spawnSync(process.execPath, args, {
    cwd: repoRoot,
    stdio: "inherit",
    env: {
      ...process.env,
      ...env
    }
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function runCore() {
  console.log("== review-first core ==");
  runNode(["--test", ...CORE_TEST_FILES]);
}

function runBrowser() {
  console.log("== review-first browser ==");
  runNode(
    ["--test", "--test-isolation=none", "--test-name-pattern", BROWSER_PATTERN, BROWSER_FILE],
    { RUN_BROWSER_E2E: "1" }
  );
}

const mode = process.argv.includes("--all")
  ? "all"
  : process.argv.includes("--browser")
    ? "browser"
    : "core";

if (mode === "core") runCore();
if (mode === "browser") runBrowser();
if (mode === "all") {
  runCore();
  runBrowser();
}
