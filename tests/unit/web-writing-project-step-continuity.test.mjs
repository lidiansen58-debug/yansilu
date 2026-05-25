import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describeWritingProjectStepState } from "../../apps/web/src/writing-center-flow.js";

function readPrototypeAppSource() {
  const currentFile = fileURLToPath(import.meta.url);
  const repoRoot = path.resolve(path.dirname(currentFile), "../..");
  return fs.readFileSync(path.join(repoRoot, "apps/web/src/prototype-app.js"), "utf8");
}

test("writing project step reuses continuity guidance before reopening an existing project", () => {
  const step = describeWritingProjectStepState({
    basketCount: 2,
    hasProject: false,
    projectEntryStatus: "继续当前项目",
    projectEntryHint: "当前写作篮已经对应项目 wp_existing。直接回到这个项目继续推进，会比重新创建项目更连续。",
    projectEntryProjectId: "wp_existing",
    projectEntryActionLabel: "继续当前项目",
    canCreateProject: true
  });

  assert.equal(step.title, "创建项目");
  assert.match(step.note, /wp_existing/);
  assert.match(step.note, /继续推进|继续当前项目/);
});

test("writing flow steps pass projected continuity into the project step helper", () => {
  const source = readPrototypeAppSource();

  assert.match(source, /projectEntryProjectId: hasProject \? "" : String\(projectEntry\?\.projectId \|\| ""\)\.trim\(\)/);
  assert.match(source, /projectEntryActionLabel: hasProject \? "" : String\(projectEntry\?\.actionLabel \|\| ""\)\.trim\(\)/);
});
