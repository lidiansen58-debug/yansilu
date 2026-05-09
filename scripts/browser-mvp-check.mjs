import { spawnSync } from "node:child_process";

const testFile = "./tests/e2e/prototype-browser.test.mjs";
const testNames = [
  "prototype browser flow creates, edits, and persists a markdown note",
  "prototype settings switches and initializes the active vault",
  "prototype import panel previews confirms and rolls back markdown import",
  "prototype export panel exports markdown files through real API",
  "prototype graph panel renders directory wikilinks and opens graph nodes",
  "prototype explorer note context move and delete update disk state"
];

for (const testName of testNames) {
  console.log(`\n== ${testName} ==`);
  const result = spawnSync(
    process.execPath,
    ["--test", "--test-isolation=none", "--test-name-pattern", testName, testFile],
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
