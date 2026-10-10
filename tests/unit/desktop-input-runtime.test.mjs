import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("desktop runtime includes the upstream Windows reentrant keyboard deadlock fix", () => {
  const lock = fs.readFileSync(new URL("../../apps/desktop/src-tauri/Cargo.lock", import.meta.url), "utf8");
  const versions = lock.split("[[package]]").filter(block => /^\s*name = "tao"/m.test(block))
    .map(block => block.match(/^version = "([^"]+)"/m)?.[1]);
  assert.equal(versions.length, 1, "all desktop windows must use the same fixed Tao runtime");
  const [major, minor] = versions[0].split(".").map(Number);
  // Tao #1215 first ships in 0.36.0; earlier input handlers peek messages while locked.
  assert.ok(major > 0 || minor >= 36, `Tao ${versions[0]} retains the Windows input deadlock`);
});

test("manual signed release rehearsal cannot publish a GitHub release", () => {
  const workflow = fs.readFileSync(new URL("../../.github/workflows/desktop-release.yml", import.meta.url), "utf8");
  assert.match(workflow, /^  workflow_dispatch:/m);
  const publication = workflow.split("      - name: Create or update draft GitHub release")[1];
  assert.ok(publication);
  assert.match(publication, /^\s*if: github\.event_name == 'push'/);
  assert.match(workflow, /name: yansilu-signed-release-rehearsal-assets/);
  assert.match(workflow, /run: bash \.\/scripts\/build-mac-release\.sh/);
});
