import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

test("graph bridge followup focuses relation rationale after prefilling target and type", () => {
  const currentFile = fileURLToPath(import.meta.url);
  const repoRoot = path.resolve(path.dirname(currentFile), "../..");
  const source = fs.readFileSync(path.join(repoRoot, "apps/web/src/prototype-app.js"), "utf8");

  assert.match(source, /const focusRelationCreate = \(focusSelector = '\[data-create-relation-form\] \[data-relation-target-search\]'\) => \{/);
  assert.match(source, /focusRelationCreate\(\s*cleanAction === "bridge"\s*\?\s*'\[data-create-relation-form\] textarea\[name="rationale"\]'/);
  assert.match(source, /:\s*'\[data-create-relation-form\] \[data-relation-target-search\]'\s*\)/);
});
