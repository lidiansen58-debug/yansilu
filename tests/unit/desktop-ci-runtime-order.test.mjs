import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

for (const [workflow, expectedChecks] of [
  ["desktop-bundles.yml", 2], ["desktop-release.yml", 1], ["release-readiness.yml", 2]
]) {
  test(`${workflow} prepares actual runtime resources before every desktop check`, () => {
    const source = fs.readFileSync(new URL(`../../.github/workflows/${workflow}`, import.meta.url), "utf8");
    const steps = source.split(/(?=^      - name: )/m);
    let checks = 0;
    for (let index = 0; index < steps.length; index++) {
      if (!/^      - name: (?:Desktop (?:bundle )?preflight|Release readiness MVP check)\r?\n/.test(steps[index])) continue;
      checks++;
      assert.match(steps[index - 1], /^      - name: Prepare desktop API runtime\r?\n/);
      assert.match(steps[index - 1], /run: npm run prepare:desktop:runtime/);
      if (steps[index].includes("needs.detect-desktop-surface.outputs.full_bundle_required")) {
        assert.match(steps[index - 1], /if: needs\.detect-desktop-surface\.outputs\.full_bundle_required == 'true'/);
      }
    }
    assert.equal(checks, expectedChecks);
  });
}

test("runtime preparation uses npm to supply the current CLI location", () => {
  const pkg = JSON.parse(fs.readFileSync(new URL("../../package.json", import.meta.url), "utf8"));
  assert.equal(pkg.scripts["prepare:desktop:runtime"], "node ./scripts/prepare-desktop-api-runtime.mjs");
});

test("PR bundles require successful preflight while manual dispatch remains available", () => {
  const source = fs.readFileSync(new URL("../../.github/workflows/desktop-bundles.yml", import.meta.url), "utf8");
  const buildJob = source.split("\n  build:\n")[1]?.split("\n  release-rehearsal:\n")[0];
  assert.ok(buildJob);
  assert.match(buildJob, /if: always\(\).*\(github\.event_name == 'workflow_dispatch' \|\| needs\.preflight\.result == 'success'\)/);
});
