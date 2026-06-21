import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  RELATIONS_GRAPH_BROWSER_GROUPS,
  RELATIONS_GRAPH_UNIT_TEST_FILES
} from "../../scripts/relations-graph-regression-check.mjs";

const repoRoot = path.resolve(fileURLToPath(new URL("../..", import.meta.url)));

test("relations graph regression suite covers the extracted graph and relation layers", () => {
  const requiredFiles = [
    "tests/unit/web-graph-relation-state-query.test.mjs",
    "tests/unit/web-relation-save-transaction.test.mjs",
    "tests/unit/web-graph-relation-workflow-controller.test.mjs",
    "tests/unit/web-permanent-note-sidebar-architecture.test.mjs",
    "tests/unit/web-graph-thinking-workspace-ui.test.mjs",
    "tests/unit/web-permanent-relation-workspace.test.mjs",
    "tests/unit/web-link-picker-insert-behavior.test.mjs"
  ];

  for (const file of requiredFiles) {
    assert.ok(RELATIONS_GRAPH_UNIT_TEST_FILES.includes(file), `${file} should be in the regression suite`);
    assert.ok(fs.existsSync(path.join(repoRoot, file)), `${file} should exist`);
  }
});

test("relations graph browser acceptance suite includes graph closeout and permanent relation workspace flows", () => {
  assert.deepEqual(RELATIONS_GRAPH_BROWSER_GROUPS, [
    "relations-graph-closeout",
    "permanent-relation-workspace"
  ]);
});

test("browser closeout group includes AI connect and isolated save regression paths", () => {
  const browserCheckSource = fs.readFileSync(path.join(repoRoot, "scripts/browser-e2e-check.mjs"), "utf8");
  assert.match(browserCheckSource, /prototype graph AI connect suggests a relation from notes without relation data/);
  assert.match(browserCheckSource, /prototype graph local candidate save removes isolated state and updates graph/);
});

test("package scripts expose unit browser and full relations graph regression commands", () => {
  const packageJson = JSON.parse(fs.readFileSync(path.join(repoRoot, "package.json"), "utf8"));
  assert.equal(packageJson.scripts["test:relations-graph:unit"], "node ./scripts/relations-graph-regression-check.mjs");
  assert.equal(packageJson.scripts["test:relations-graph:browser"], "node ./scripts/relations-graph-regression-check.mjs --browser");
  assert.equal(packageJson.scripts["test:relations-graph:all"], "node ./scripts/relations-graph-regression-check.mjs --all");
});
