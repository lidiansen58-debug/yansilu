import { spawnSync } from "node:child_process";

const testFile = "./tests/e2e/prototype-browser.test.mjs";
function exactTestPattern(testName) {
  return `^${String(testName).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`;
}

const testNames = [
  "prototype browser flow creates, edits, and persists a markdown note",
  "prototype settings switches and initializes the active vault",
  "prototype import panel previews and confirms realistic Obsidian import",
  "prototype export panel exports markdown files through real API",
  "prototype graph panel renders directory wikilinks and opens graph nodes",
  "prototype explorer keeps current-note context when selecting a different folder",
  "prototype explorer close-all clears stale file highlight and current-note state",
  "prototype close-all lets a new note reopen from a clean explorer and tab state",
  "prototype explorer note context move and delete update disk state",
  "prototype editor preserves consecutive blank lines in wysiwyg",
  "prototype editor opens external links without navigating the app",
  "prototype editor can insert image and attachment",
  "prototype editor opens wikilinks and tag results from wysiwyg tokens"
];

for (const testName of testNames) {
  console.log(`\n== ${testName} ==`);
  const result = spawnSync(
    process.execPath,
    ["--test", "--test-isolation=none", "--test-name-pattern", exactTestPattern(testName), testFile],
    {
      cwd: process.cwd(),
      env: {
        ...process.env,
        RUN_BROWSER_E2E: "1"
      },
      stdio: "inherit",
      shell: false
    }
  );

  if (result.error) {
    console.error(result.error);
    process.exit(1);
  }

  if ((result.status ?? 1) !== 0) {
    process.exit(result.status ?? 1);
  }
}

console.log("\nBrowser MVP check passed.");
