import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

test("graph bridge followup opens the large relation workspace with target and type prefilled", () => {
  const currentFile = fileURLToPath(import.meta.url);
  const repoRoot = path.resolve(path.dirname(currentFile), "../..");
  const source = fs.readFileSync(path.join(repoRoot, "apps/web/src/prototype-app.js"), "utf8");

  assert.match(source, /const focusRelationCreate = \(entryHint = ""\) => \{/);
  assert.match(source, /editor\?\.openPermanentRelationWorkspace\?\.\(\{/);
  assert.match(source, /targetNoteId: cleanTargetNoteId,/);
  assert.match(source, /relationType: cleanRelationType,/);
  assert.match(source, /rationaleDraft: relationDrafts\.rationaleDraft,/);
  assert.doesNotMatch(source, /'\[data-create-relation-form\] textarea\[name="rationale"\]'/);
});
