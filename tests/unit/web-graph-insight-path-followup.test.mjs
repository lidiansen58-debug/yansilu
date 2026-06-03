import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

test("graph insight path items prefill target note for ordinary relation followups", () => {
  const currentFile = fileURLToPath(import.meta.url);
  const repoRoot = path.resolve(path.dirname(currentFile), "../..");
  const source = fs.readFileSync(path.join(repoRoot, "apps/web/src/prototype-app.js"), "utf8");
  const match = source.match(/function renderGraphInsightCoach\(context = \{\}\) \{([\s\S]*?)\n\}/);

  assert.ok(match, "expected renderGraphInsightCoach() to exist");
  const fnBody = match[1];

  assert.match(fnBody, /const relationPrefillAction = followupAction === "bridge" \|\| followupAction === "relations";/);
  assert.match(fnBody, /relationPrefillAction && targetNoteId \? ` data-graph-target-note="\$\{escapeHtml\(targetNoteId\)\}"` : ""/);
  assert.match(fnBody, /relationPrefillAction && relationType \? ` data-graph-relation-type="\$\{escapeHtml\(relationType\)\}"` : ""/);
});

test("graph relation followup continues to prefill target and relation type through the relation form entry helper", () => {
  const currentFile = fileURLToPath(import.meta.url);
  const repoRoot = path.resolve(path.dirname(currentFile), "../..");
  const source = fs.readFileSync(path.join(repoRoot, "apps/web/src/prototype-app.js"), "utf8");
  const match = source.match(/function openGraphFollowupNote\(noteId = "", action = "", options = \{\}\) \{([\s\S]*?)\n\}/);

  assert.ok(match, "expected openGraphFollowupNote() to exist");
  const fnBody = match[1];

  assert.match(fnBody, /editor\?\.openCreateRelationForm\?\.\(\{/);
  assert.match(fnBody, /targetNoteId: cleanTargetNoteId,/);
  assert.match(fnBody, /relationType: cleanRelationType,/);
});
