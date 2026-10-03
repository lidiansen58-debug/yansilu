import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { chromium } from "playwright";

// Current visible workflows. Legacy suites remain available for migration;
// this acceptance list does not redefine their failures as passing.
const files = [
  "tests/e2e/ai-review-flow-inline-errors.test.mjs",
  "tests/e2e/prototype-asset-locators.test.mjs",
  "tests/e2e/prototype-beta-paper-closeout.test.mjs",
  "tests/e2e/prototype-beta-writing-closeout.test.mjs",
  "tests/e2e/prototype-body-links.test.mjs",
  "tests/e2e/prototype-editor-close-autosave.test.mjs",
  "tests/e2e/prototype-editor-explicit-route.test.mjs",
  "tests/e2e/prototype-editor-roundtrip.test.mjs",
  "tests/e2e/prototype-editor-save-feedback.test.mjs",
  "tests/e2e/prototype-graph-ai-relation-flow.test.mjs",
  "tests/e2e/prototype-graph-followup-context.test.mjs",
  "tests/e2e/prototype-graph-navigation-input.test.mjs",
  "tests/e2e/prototype-graph-relation-adjustment.test.mjs",
  "tests/e2e/prototype-note-title-body-entry.test.mjs",
  "tests/e2e/prototype-relation-edit-safety.test.mjs",
  "tests/e2e/prototype-relation-graph-sync.test.mjs",
  "tests/e2e/prototype-relation-recommendation-eligibility.test.mjs",
  "tests/e2e/prototype-relation-save-context.test.mjs",
  "tests/e2e/prototype-relation-snapshot-refresh.test.mjs",
  "tests/e2e/prototype-relation-vault-isolation.test.mjs",
  "tests/e2e/prototype-settings-automation.test.mjs",
  "tests/e2e/prototype-source-promotion-safety.test.mjs",
  "tests/e2e/prototype-ux-feedback.test.mjs",
  "tests/e2e/prototype-ai-settings-closeout.test.mjs",
  "tests/e2e/prototype-graph-dense-current-controls.test.mjs",
  "tests/e2e/prototype-theme-discovery-vault-isolation.test.mjs",
  "tests/e2e/prototype-writing-theme-context-continuity.test.mjs",
  "tests/e2e/prototype-writing-theme-list-project-resume.test.mjs",
  "tests/e2e/prototype-writable-theme-discovery.test.mjs",
  "tests/e2e/prototype-graph-theme-index-entry.test.mjs",
  "tests/e2e/prototype-beta-short-practice.test.mjs",
  "tests/e2e/prototype-beta-mobile-closeout.test.mjs"
];
const mainTests = [
  "prototype permanent note saves a current viewpoint and shows how it formed",
  "prototype main-path card refreshes relation state and does not leak stale relation status across note switches",
  "prototype permanent relation workspace saves manually, refreshes before save, and resets on note switch",
  "prototype permanent relation workspace saves a searched relation in place",
  "prototype right sidebar relation entry saves through overlay and appears in graph",
  "prototype editor inserts uploaded image into markdown and preview",
  "prototype editor inserts uploaded file into markdown and preview action",
  "prototype wysiwyg supports inline [[ link picker and # tag picker",
  "prototype editor contextual code tools can switch the current code block language",
  "prototype tab switch syncs the left navigation to the active note location",
  "prototype editor stays editable after closing its related overlay and switching directories",
  "prototype editor keeps content editable when toggling source and wysiwyg after closing the related overlay",
  "prototype settings saved literature and permanent templates drive later new notes in the same vault",
  "prototype smart notes startup demo opens the guide note without duplicating seed data",
  "prototype editor embedded AI suggestion flow keeps review inside the permanent note context",
  "prototype AI inbox can reject a linked suggestion and keeps the reviewed artifact inspectable",
  "prototype AI inbox reject plus refresh keeps the reviewed artifact stable",
  "prototype root boxes keep source-note and isolated badges scoped to their own note types",
  "prototype current AI suggestions modal guards closed detail and duplicate edits and persists review decisions"
];
const mainFile = "tests/e2e/prototype-browser.test.mjs";
const mainSource = readFileSync(mainFile, "utf8");
for (const name of mainTests) {
  if (!mainSource.includes(`test(${JSON.stringify(name)},`)) throw new Error(`Missing test: ${name}`);
}
for (const file of files) readFileSync(file, "utf8");
if (process.argv.includes("--list")) {
  console.log(JSON.stringify({ files, mainTests }, null, 2));
} else {
  // Fail on an unavailable browser instead of accepting optional test skips.
  const browser = await chromium.launch({ headless: true });
  await browser.close();
  const pattern = mainTests.map(name => "^" + name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "$").join("|");
  for (const args of [
    ["--test", "--test-isolation=none", "--test-name-pattern", pattern, mainFile],
    ["--test", "--test-isolation=none", ...files]
  ]) {
    const result = spawnSync(process.execPath, args, {
      cwd: process.cwd(), env: { ...process.env, RUN_BROWSER_E2E: "1" },
      stdio: "inherit", shell: false
    });
    if (result.error) throw result.error;
    if (result.status !== 0) process.exit(result.status ?? 1);
  }
}
