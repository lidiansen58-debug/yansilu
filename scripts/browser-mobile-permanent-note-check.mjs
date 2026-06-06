import { spawnSync } from "node:child_process";

const testFile = "./tests/e2e/prototype-browser.test.mjs";
const testName = "prototype mobile viewport keeps permanent-note entry usable";

function exactTestPattern(name) {
  return `^${String(name).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`;
}

console.log(`\n== ${testName} ==`);

const result = spawnSync(
  process.execPath,
  ["--test", "--test-name-pattern", exactTestPattern(testName), testFile],
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

console.log("\nMobile permanent-note browser check passed.");
