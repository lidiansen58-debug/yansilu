import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

test("graph bridge followup focuses relation rationale after prefilling target and type", () => {
  const currentFile = fileURLToPath(import.meta.url);
  const repoRoot = path.resolve(path.dirname(currentFile), "../..");
  const source = fs.readFileSync(path.join(repoRoot, "apps/web/src/prototype-app.js"), "utf8");

  assert.match(source, /const focusRelationCreate = \(focusSelector = '\[data-create-relation-form\] \[data-relation-target-search\]', entryHint = ""\) => \{/);
  assert.match(source, /editor\?\.openCreateRelationForm\?\.\(\{/);
  assert.match(source, /targetNoteId: cleanTargetNoteId,/);
  assert.match(source, /relationType: cleanRelationType,/);
  assert.match(source, /focusRelationCreate\(\s*cleanAction === "bridge"/);
  assert.match(source, /'\[data-create-relation-form\] textarea\[name="rationale"\]'/);
});
