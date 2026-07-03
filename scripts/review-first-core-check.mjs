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
const BROWSER_TEST_NAMES = [
  "prototype AI inbox field suggestion flow adopts a suggestion as draft and updates the target note",
  "prototype AI inbox returns review to the editor context for final processing",
  "prototype AI inbox reviewed detail can mark an adopted draft edited and then confirmed",
  "prototype AI inbox reviewed detail keeps invalid reviewed JSON as inline error without submitting",
  "prototype AI inbox can reject a linked suggestion and keeps the reviewed artifact inspectable",
  "prototype AI inbox reject plus refresh keeps the reviewed artifact stable",
  "prototype AI inbox reviewed reopen continuity keeps canonical detail aligned after refresh and tab switches",
  "prototype AI inbox review-action continuity keeps detail aligned with filtered pending selection changes",
  "prototype AI inbox guards stale detail selection and duplicate reviewed submit",
  "prototype AI inbox shows inline no-op UX for already adopted reviewed field suggestions without resubmitting",
  "prototype settings AI suggestions panel edits confirms and rejects suggestions through the real review flow",
  "prototype settings AI suggestions guards stale detail selection and duplicate review submits",
  "prototype settings AI suggestions review-action continuity keeps detail aligned with filtered selection changes"
];

function exactTestPattern(testName) {
  return `^${String(testName).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`;
}

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
  for (const testName of BROWSER_TEST_NAMES) {
    console.log(`== ${testName} ==`);
    runNode(
      ["--test", "--test-isolation=none", "--test-name-pattern", exactTestPattern(testName), BROWSER_FILE],
      { RUN_BROWSER_E2E: "1" }
    );
  }
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
