import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readEditorDomainSource } from "./copy-source-helpers.mjs";

const currentFile = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(currentFile), "../..");

function readRepoFile(...segments) {
  return fs.readFileSync(path.join(repoRoot, ...segments), "utf8");
}

test("relation followup suggestion is rendered inside the relation panel", async () => {
  const css = readRepoFile("apps/web/src/prototype.css");
  const source = await readEditorDomainSource();

  assert.match(css, /\.relation-followup-suggestion\s*\{/);
  assert.match(css, /\.relation-followup-suggestion-actions\s*\{/);
  assert.match(source, /function relationFollowupSuggestionForDraft\(/);
  assert.match(source, /renderRelationFollowupSuggestion\(noteId\)/);
  assert.match(source, /data-relation-followup-suggestion/);
  assert.match(source, /data-relation-action="open-followup-reason"/);
  assert.match(source, /data-relation-action="dismiss-followup"/);
});

test("relation followup suggestion asks for reason work only when a saved relation can be edited", async () => {
  const source = await readEditorDomainSource();
  const start = source.indexOf("function relationFollowupSuggestionForDraft(");
  const end = source.indexOf("function excerptFromBody", start);

  assert.ok(start >= 0 && end > start, "expected relationFollowupSuggestionForDraft() to exist");
  const fnSource = source.slice(start, end);

  assert.match(fnSource, /if \(!cleanNoteId \|\| !cleanRelationId\) return null;/);
  assert.match(fnSource, /relationQualityEvaluation\(rationale, insightQuestion\)/);
  assert.match(fnSource, /if \(quality\.level === "strong"\) return null;/);
  assert.match(fnSource, /这条关系说明还需要再具体一点/);
  assert.match(fnSource, /这条关系还可以补一个后续问题/);
  assert.match(fnSource, /这条桥接关系建议补一个边界/);
  assert.match(fnSource, /actionLabel: "补理由"/);
});

test("relation creation stores a followup suggestion before returning to relation list", async () => {
  const source = await readEditorDomainSource();
  const start = source.indexOf("  async handleCreateForm(form) {");
  const end = source.indexOf("  async promoteInlineDraft", start);

  assert.ok(start >= 0 && end > start, "expected handleCreateForm() to exist");
  const handlerSource = source.slice(start, end);

  assert.match(handlerSource, /const transaction = await saveRelationTransaction\(\{/);
  assert.match(handlerSource, /const relation = transaction\.relation;/);
  assert.doesNotMatch(handlerSource, /await createNoteRelation\(note\.id,/);
  assert.match(handlerSource, /host\.setRelationFollowupSuggestion\(/);
  assert.match(handlerSource, /relationFollowupSuggestionForDraft\(\{/);
  assert.match(handlerSource, /relationId: relation\?\.id \|\| relation\?\.relationId \|\| ""/);
  assert.match(handlerSource, /this\.resetPanelState\(formNoteId\);/);
  assert.match(handlerSource, /host\.renderRelated\(relation\?\.created === false \?/);
});

test("relation followup actions focus the edit rationale or dismiss without mutation", async () => {
  const source = await readEditorDomainSource();
  const clickStart = source.indexOf('  const relationAction = target.closest("[data-relation-action]");');
  const clickEnd = source.indexOf("export function routeEditorRelationInput", clickStart);

  assert.ok(clickStart >= 0 && clickEnd > clickStart, "expected relation action event route to exist");
  const clickSource = source.slice(clickStart, clickEnd);

  assert.match(clickSource, /action === "open-followup-reason"/);
  assert.match(clickSource, /host\.openEditRelationForm\(relationId, \{/);
  assert.match(clickSource, /focusSelector: '\[data-edit-relation-form\] textarea\[name="rationale"\]'/);
  assert.match(clickSource, /host\.clearRelationFollowupSuggestion\(\);/);
  assert.match(clickSource, /action === "dismiss-followup"/);
  assert.match(clickSource, /host\.renderRelated\(\);/);
  assert.doesNotMatch(clickSource, /updateNoteRelation\(/);
});

test("inline relation promotion also creates the relation followup suggestion", async () => {
  const source = await readEditorDomainSource();
  const start = source.indexOf("  async promoteInlineDraft(indexValue = \"\") {");
  const end = source.indexOf("  async handleEditForm(form) {", start);

  assert.ok(start >= 0 && end > start, "expected promoteInlineDraft() to exist");
  const promoteSource = source.slice(start, end);

  assert.match(promoteSource, /const scoped = host\.scopedLinkCandidates\(\);/);
  assert.match(promoteSource, /const resolved = host\.resolveLinkToken\(draft\.token, scoped\);/);
  assert.match(promoteSource, /if \(resolved\?\.ambiguous\) \{/);
  assert.match(promoteSource, /const transaction = await saveRelationTransaction\(\{/);
  assert.match(promoteSource, /const relation = transaction\.relation;/);
  assert.doesNotMatch(promoteSource, /await createNoteRelation\(note\.id,/);
  assert.match(promoteSource, /host\.syncRelationNetworkConnected\(note\.id, target\.id\);/);
  assert.match(promoteSource, /host\.setRelationFollowupSuggestion\(/);
  assert.match(promoteSource, /relationFollowupSuggestionForDraft\(\{/);
});
