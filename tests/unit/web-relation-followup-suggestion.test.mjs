import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const currentFile = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(currentFile), "../..");

function readRepoFile(...segments) {
  return fs.readFileSync(path.join(repoRoot, ...segments), "utf8");
}

test("relation followup suggestion is rendered inside the relation panel", () => {
  const html = readRepoFile("apps/web/src/prototype.html");
  const source = readRepoFile("apps/web/src/components-editor-pane.js");

  assert.match(html, /\.relation-followup-suggestion\s*\{/);
  assert.match(html, /\.relation-followup-suggestion-actions\s*\{/);
  assert.match(source, /function relationFollowupSuggestionForDraft\(/);
  assert.match(source, /renderRelationFollowupSuggestion\(noteId\)/);
  assert.match(source, /data-relation-followup-suggestion/);
  assert.match(source, /data-relation-action="open-followup-reason"/);
  assert.match(source, /data-relation-action="dismiss-followup"/);
});

test("relation followup suggestion asks for reason work only when a saved relation can be edited", () => {
  const source = readRepoFile("apps/web/src/components-editor-pane.js");
  const start = source.indexOf("function relationFollowupSuggestionForDraft(");
  const end = source.indexOf("function excerptFromBody", start);

  assert.ok(start >= 0 && end > start, "expected relationFollowupSuggestionForDraft() to exist");
  const fnSource = source.slice(start, end);

  assert.match(fnSource, /if \(!cleanNoteId \|\| !cleanRelationId\) return null;/);
  assert.match(fnSource, /relationQualityEvaluation\(rationale, insightQuestion\)/);
  assert.match(fnSource, /if \(quality\.level === "strong"\) return null;/);
  assert.match(fnSource, /这条关系理由还需要再具体一点/);
  assert.match(fnSource, /这条关系还可以补一个后续问题/);
  assert.match(fnSource, /这条桥接关系建议补一个边界/);
  assert.match(fnSource, /actionLabel: "补理由"/);
});

test("relation creation stores a followup suggestion before returning to relation list", () => {
  const source = readRepoFile("apps/web/src/components-editor-pane.js");
  const start = source.indexOf("  async handleCreateRelationForm(form) {");
  const end = source.indexOf("  async promoteInlineDraftRelation", start);

  assert.ok(start >= 0 && end > start, "expected handleCreateRelationForm() to exist");
  const handlerSource = source.slice(start, end);

  assert.match(handlerSource, /const relation = await createNoteRelation\(note\.id,/);
  assert.match(handlerSource, /this\.setRelationFollowupSuggestion\(/);
  assert.match(handlerSource, /relationFollowupSuggestionForDraft\(\{/);
  assert.match(handlerSource, /relationId: relation\?\.id \|\| relation\?\.relationId \|\| ""/);
  assert.match(handlerSource, /this\.resetRelationPanelState\(note\.id\);/);
  assert.match(handlerSource, /this\.renderRelated\(relation\?\.created === false \? "关系已存在，已复用。" : "关系已建立。"\)/);
});

test("relation followup actions focus the edit rationale or dismiss without mutation", () => {
  const source = readRepoFile("apps/web/src/components-editor-pane.js");
  const clickStart = source.indexOf('      const relationAction = e.target.closest("[data-relation-action]");');
  const clickEnd = source.indexOf('      const aiAnalysisButton = e.target.closest("[data-note-ai-analysis]");', clickStart);

  assert.ok(clickStart >= 0 && clickEnd > clickStart, "expected relation action click handler to exist");
  const clickSource = source.slice(clickStart, clickEnd);

  assert.match(clickSource, /action === "open-followup-reason"/);
  assert.match(clickSource, /this\.openEditRelationForm\(relationId, \{/);
  assert.match(clickSource, /focusSelector: '\[data-edit-relation-form\] textarea\[name="rationale"\]'/);
  assert.match(clickSource, /this\.clearRelationFollowupSuggestion\(\);/);
  assert.match(clickSource, /action === "dismiss-followup"/);
  assert.match(clickSource, /this\.renderRelated\(\);/);
  assert.doesNotMatch(clickSource, /updateNoteRelation\(/);
});

test("inline relation promotion also creates the relation followup suggestion", () => {
  const source = readRepoFile("apps/web/src/components-editor-pane.js");
  const start = source.indexOf("  async promoteInlineDraftRelation(indexValue = \"\") {");
  const end = source.indexOf("  async handleEditRelationForm(form) {", start);

  assert.ok(start >= 0 && end > start, "expected promoteInlineDraftRelation() to exist");
  const promoteSource = source.slice(start, end);

  assert.match(promoteSource, /const relation = await createNoteRelation\(note\.id,/);
  assert.match(promoteSource, /this\.setRelationFollowupSuggestion\(/);
  assert.match(promoteSource, /relationFollowupSuggestionForDraft\(\{/);
});
