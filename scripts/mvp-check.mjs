import { spawnSync } from "node:child_process";

function npmCommand(args) {
  if (process.platform === "win32") {
    return {
      command: process.env.ComSpec || "cmd.exe",
      args: ["/d", "/s", "/c", "npm.cmd", ...args]
    };
  }
  return {
    command: "npm",
    args
  };
}

function runStep(label, args, extraEnv = {}) {
  console.log(`\n== ${label} ==`);
  const npm = npmCommand(args);
  const result = spawnSync(npm.command, npm.args, {
    cwd: process.cwd(),
    env: {
      ...process.env,
      ...extraEnv
    },
    stdio: "inherit",
    shell: false
  });
  if (result.error) {
    console.error(`Step failed before completion: ${label}`);
    console.error(result.error);
    process.exit(1);
  }
  if (result.status !== 0) {
    console.error(`Step failed: ${label}`);
    if (result.signal) {
      console.error(`Signal: ${result.signal}`);
    }
    process.exit(result.status || 1);
  }
}

runStep("Core tests", ["test"]);
runStep("Smoke e2e", ["run", "test:e2e:smoke"]);
runStep("Browser MVP e2e", ["run", "test:e2e:browser:mvp"]);
runStep("Desktop dev preflight", ["run", "dev:desktop:check"]);
runStep("Desktop bundle preflight", ["run", "build:desktop:check"]);

if (process.env.RUN_BROWSER_E2E === "1") {
  runStep("Browser e2e", ["run", "test:e2e:browser"], { RUN_BROWSER_E2E: "1" });
} else {
  console.log("\n== Browser e2e ==");
  console.log("Skipped. Set RUN_BROWSER_E2E=1 to include the full Playwright suite.");
}

console.log("\nMVP check passed.");
