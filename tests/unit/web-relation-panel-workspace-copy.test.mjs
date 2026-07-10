import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const sourcePath = new URL("../../apps/web/src/components-editor-pane.js", import.meta.url);
const sidebarViewPath = new URL("../../apps/web/src/permanent-note-sidebar-view.js", import.meta.url);
const sidebarControllerPath = new URL("../../apps/web/src/permanent-note-sidebar-controller.js", import.meta.url);
const semanticRelationsViewPath = new URL("../../apps/web/src/editor-semantic-relations-view.js", import.meta.url);
const semanticRelationsControllerPath = new URL("../../apps/web/src/editor-semantic-relations-controller.js", import.meta.url);
const relationEventsPath = new URL("../../apps/web/src/editor-relation-events.js", import.meta.url);
const distillationControllerPath = new URL("../../apps/web/src/permanent-note-distillation-controller.js", import.meta.url);
const workspaceControllerPath = new URL("../../apps/web/src/permanent-note-workspace-controller.js", import.meta.url);
const workspaceViewPath = new URL("../../apps/web/src/permanent-note-workspace-view.js", import.meta.url);
const actionPanelPath = new URL("../../apps/web/src/permanent-note-action-panel.js", import.meta.url);
const permanentRelationWorkspacePath = new URL("../../apps/web/src/permanent-relation-workspace.js", import.meta.url);
const shellPath = new URL("../../apps/web/src/prototype.html", import.meta.url);

test("relation and viewpoint polish entry stay separated", async () => {
  const source = [
    await readFile(sourcePath, "utf8"),
    await readFile(semanticRelationsViewPath, "utf8"),
    await readFile(semanticRelationsControllerPath, "utf8"),
    await readFile(relationEventsPath, "utf8"),
    await readFile(actionPanelPath, "utf8"),
    await readFile(workspaceControllerPath, "utf8"),
    await readFile(workspaceViewPath, "utf8"),
    await readFile(permanentRelationWorkspacePath, "utf8")
  ].join("\n");
  const sidebarView = await readFile(sidebarViewPath, "utf8");
  const sidebarController = await readFile(sidebarControllerPath, "utf8");
  const shell = await readFile(shellPath, "utf8");
  const relationWorkspaceSource = await readFile(permanentRelationWorkspacePath, "utf8");
  const workspaceControllerSource = await readFile(workspaceControllerPath, "utf8");

  assert.match(shell, /<div class="panel-title">提炼观点<\/div>/);
  assert.match(shell, /把当前笔记整理成清楚判断/);
  assert.match(shell, /aria-label="提炼观点"/);

  assert.match(source, /renderPermanentRelationWorkspace/);
  assert.match(source, /renderPermanentNoteRelationAssistSectionView\(\{/);
  assert.match(source, /data-permanent-relation-workspace/);
  assert.match(source, /syncPermanentRelationManualResults\(\)/);
  assert.match(source, /const latestRelations = await fetchNoteRelations\(note\.id\)/);
  assert.match(source, /permanentSidebarController\(\)\.continueRelationWorkspace\(\)/);
  assert.doesNotMatch(sidebarController, /permanentRelationWorkspaceNextAiCandidate\(/);
  assert.match(sidebarView, /data-permanent-relation-action="open"/);

  assert.match(source, /data-deferred-workspace/);
  assert.match(source, /data-permanent-note-workspace data-note-id="\$\{escapeHtml\(note\.id\)\}"/);
  assert.match(workspaceControllerSource, /this\.host\.renderPermanentNoteDistillationSection\(note\)/);
  assert.doesNotMatch(source, /data-permanent-workspace-tab="\$\{escapeHtml\(key\)\}"/);
  assert.doesNotMatch(source, /key: "relations",\s+label:/);
  assert.doesNotMatch(source, /key: "writing",\s+label:/);
  assert.doesNotMatch(workspaceControllerSource, /renderPermanentNoteWritingPrepSection\(note\)/);
  assert.doesNotMatch(workspaceControllerSource, /renderPermanentNoteRelationAssistSection\(note, overview\)/);

  assert.doesNotMatch(relationWorkspaceSource, /role="tablist" aria-label="打磨笔记操作"/);
  assert.doesNotMatch(source, /renderRelated\("当前笔记关联总览"\)/);
  assert.doesNotMatch(shell, /关联 \/ 写作/);
  assert.doesNotMatch(shell, /打磨笔记/);
});

test("permanent relation manual search keeps the search input mounted while updating results", async () => {
  const source = await readFile(sourcePath, "utf8");
  const workspaceSource = await readFile(new URL("../../apps/web/src/permanent-relation-workspace.js", import.meta.url), "utf8");
  const refreshStart = source.indexOf("  async refreshPermanentRelationManualSearch(query = \"\") {");
  const refreshEnd = source.indexOf("  queuePermanentRelationManualSearch(input) {", refreshStart);
  assert.ok(refreshStart >= 0 && refreshEnd > refreshStart, "expected refreshPermanentRelationManualSearch() to exist");
  const refreshSource = source.slice(refreshStart, refreshEnd);

  assert.match(workspaceSource, /data-permanent-relation-manual-results/);
  assert.match(source, /renderPermanentRelationManualTargets/);
  assert.match(refreshSource, /this\.syncPermanentRelationManualResults\(\)/);
  assert.match(refreshSource, /selectedTargetNoteId:\s*cleanQuery \? "" : this\.permanentRelationWorkspaceState\.selectedTargetNoteId/);
  assert.doesNotMatch(refreshSource, /this\.syncPermanentRelationTargetPreview\(\)/);
  assert.doesNotMatch(refreshSource, /this\.syncPermanentRelationWorkspaceOverlay\(\)/);
  assert.doesNotMatch(refreshSource, /querySelector\?\.\("\[data-permanent-relation-target-search\]"\)\?\.focus/);
});

test("permanent-note async workflows guard UI refreshes by active note id", async () => {
  const source = await readFile(sourcePath, "utf8");
  const semanticRelationsController = await readFile(semanticRelationsControllerPath, "utf8");
  const distillationController = await readFile(distillationControllerPath, "utf8");

  const distillationStart = distillationController.indexOf("  async handleForm(form) {");
  const distillationEnd = distillationController.indexOf("  async confirm()", distillationStart);
  assert.ok(distillationStart >= 0 && distillationEnd > distillationStart, "expected distillation handleForm() to exist");
  const distillationSource = distillationController.slice(distillationStart, distillationEnd);
  assert.match(distillationSource, /const noteId = String\(note\?\.id \|\| ""\)\.trim\(\)/);
  assert.match(distillationSource, /if \(!host\.isActiveNoteId\(noteId\)\) return/);

  const createStart = semanticRelationsController.indexOf("  async handleCreateForm(form) {");
  const createEnd = semanticRelationsController.indexOf("  async promoteInlineDraft", createStart);
  assert.ok(createStart >= 0 && createEnd > createStart, "expected handleCreateForm() to exist");
  const createSource = semanticRelationsController.slice(createStart, createEnd);
  assert.match(createSource, /if \(!host\.isActiveNoteId\(formNoteId\)\) return/);
  assert.match(createSource, /if \(submit && host\.isActiveNoteId\(formNoteId\)\) submit\.disabled = false/);

  const editStart = semanticRelationsController.indexOf("  async handleEditForm(form) {");
  const editEnd = semanticRelationsController.indexOf("  async deleteRelation", editStart);
  assert.ok(editStart >= 0 && editEnd > editStart, "expected handleEditForm() to exist");
  const editSource = semanticRelationsController.slice(editStart, editEnd);
  assert.match(editSource, /if \(!host\.isActiveNoteId\(formNoteId\)\) return/);
  assert.match(editSource, /if \(submit && host\.isActiveNoteId\(formNoteId\)\) submit\.disabled = false/);

  const promoteStart = semanticRelationsController.indexOf("  async promoteInlineDraft");
  const promoteEnd = semanticRelationsController.indexOf("  async handleEditForm", promoteStart);
  assert.ok(promoteStart >= 0 && promoteEnd > promoteStart, "expected promoteInlineDraft() to exist");
  const promoteSource = semanticRelationsController.slice(promoteStart, promoteEnd);
  assert.match(promoteSource, /host\.syncRelationNetworkConnected\(note\.id, target\.id\);\s*if \(!host\.isActiveNoteId\(noteId\)\) return;/);

  const deleteStart = semanticRelationsController.indexOf("  async deleteRelation(relationId) {");
  const deleteEnd = semanticRelationsController.indexOf("\n}", deleteStart);
  assert.ok(deleteStart >= 0 && deleteEnd > deleteStart, "expected deleteRelation() to exist");
  const deleteSource = semanticRelationsController.slice(deleteStart, deleteEnd);
  assert.match(deleteSource, /if \(!host\.isActiveNoteId\(activeNoteId\)\) return/);
  assert.match(deleteSource, /host\.closePermanentRelationWorkspace\?\.\(\)/);
});
