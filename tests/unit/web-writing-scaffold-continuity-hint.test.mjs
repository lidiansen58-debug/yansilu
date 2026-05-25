import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describeWritingScaffoldStepState } from "../../apps/web/src/writing-center-flow.js";

function readPrototypeAppSource() {
  const currentFile = fileURLToPath(import.meta.url);
  const repoRoot = path.resolve(path.dirname(currentFile), "../..");
  return fs.readFileSync(path.join(repoRoot, "apps/web/src/prototype-app.js"), "utf8");
}

test("writing scaffold step uses the projected continuity action as its next-step title before any project is reopened", () => {
  const step = describeWritingScaffoldStepState({
    hasScaffold: false,
    hasProject: false,
    projectEntryProjectId: "wp_existing",
    projectEntryActionLabel: "继续当前项目",
    blockingCount: 0,
    warningCount: 0
  });

  assert.equal(step.title, "继续当前项目");
  assert.equal(step.note, "先继续当前项目，再检查证据、缺口和反方");
});

test("writing scaffold button uses continuity wording when basket already maps to a project", () => {
  const source = readPrototypeAppSource();

  assert.match(source, /projectEntry\?\.projectId && projectEntry\?\.actionLabel/);
  assert.match(source, /`先\$\{projectEntry\.actionLabel\}`/);
});
