import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const sourcePath = new URL("../../apps/web/src/components-editor-pane.js", import.meta.url);
const sidebarArchitecturePath = new URL("../../apps/web/src/permanent-note-sidebar-architecture.js", import.meta.url);
const sidebarViewPath = new URL("../../apps/web/src/permanent-note-sidebar-view.js", import.meta.url);
const sidebarControllerPath = new URL("../../apps/web/src/permanent-note-sidebar-controller.js", import.meta.url);
const semanticRelationsViewPath = new URL("../../apps/web/src/editor-semantic-relations-view.js", import.meta.url);
const semanticRelationsControllerPath = new URL("../../apps/web/src/editor-semantic-relations-controller.js", import.meta.url);
const shellPath = new URL("../../apps/web/src/prototype.html", import.meta.url);

test("relation side panel uses action-first workspace copy without noisy placeholders", async () => {
  const source = [
    await readFile(sourcePath, "utf8"),
    await readFile(semanticRelationsViewPath, "utf8"),
    await readFile(semanticRelationsControllerPath, "utf8")
  ].join("\n");
  const sidebarArchitecture = await readFile(sidebarArchitecturePath, "utf8");
  const sidebarView = await readFile(sidebarViewPath, "utf8");
  const sidebarController = await readFile(sidebarControllerPath, "utf8");
  const shell = await readFile(shellPath, "utf8");

  assert.match(source, /from "\.\/permanent-note-sidebar-architecture\.js";/);
  assert.match(source, /permanentNoteSidebarLayout\(\{ isPermanentNote, isRecordableSource, tags \}\)/);
  assert.match(source, /permanentNoteWorkspaceArchitecture\(\{/);
  assert.match(sidebarArchitecture, /export function permanentNoteSidebarLayout/);
  assert.match(sidebarArchitecture, /export function permanentNoteWorkspaceArchitecture/);
  assert.match(sidebarArchitecture, /showDeferredWorkspace/);
  assert.match(sidebarArchitecture, /activeTab/);

  assert.match(shell, /<div class="panel-title">关系整理<\/div>/);
  assert.match(shell, /先选要关联的笔记，再写清为什么。/);
  assert.match(source, /<div class="inspector-section-title">下一步<\/div>/);
  assert.match(source, /<div class="inspector-section-title">关系网络<\/div>/);
  assert.match(source, /renderPermanentRelationWorkspace/);
  assert.match(source, /from "\.\/permanent-note-sidebar-view\.js";/);
  assert.match(source, /renderPermanentNoteRelationAssistSectionView\(\{/);
  assert.match(sidebarView, /data-permanent-relation-action="open"/);
  assert.match(source, /permanentRelationMode && !permanentRelationMode\.hasAttribute\("data-permanent-relation-action"\)/);
  assert.match(source, /data-permanent-relation-workspace/);
  assert.match(source, /this\.permanentRelationWorkspaceState = defaultPermanentRelationWorkspaceState\(""\)/);
  assert.match(source, /this\.permanentRelationWorkspaceState\.noteId !== note\.id/);
  assert.match(source, /syncPermanentRelationManualResults\(\)/);
  assert.match(source, /notice: "正在确认现有关系。"/);
  assert.match(source, /const latestRelations = await fetchNoteRelations\(note\.id\)/);
  assert.match(source, /const latestValidation = permanentRelationWorkspaceCanSave\(\{/);
  assert.match(source, /const savedRelations = await fetchNoteRelations\(note\.id\)\.catch\(\(\) => null\)/);
  assert.match(source, /permanentSidebarController\(\)\.continueRelationWorkspace\(\)/);
  assert.match(sidebarController, /permanentRelationWorkspaceNextAiCandidate\(/);
  assert.match(sidebarController, /relationEntryRouteForPermanentWorkspaceContinuation\(note\.id, host\.permanentRelationWorkspaceState\.entryRoute/);
  assert.match(source, /data-main-path-next-action/);
  assert.match(source, /data-deferred-workspace/);
  assert.match(source, /永久笔记整理/);
  assert.match(source, /\["relations", "关联"/);
  assert.match(source, /\["viewpoint", "观点提纯"/);
  assert.match(source, /\["writing", "写作准备"/);
  assert.match(source, /data-permanent-workspace-tab="\$\{escapeHtml\(key\)\}"/);
  assert.match(source, /data-permanent-note-workspace data-note-id="\$\{escapeHtml\(note\.id\)\}"/);
  assert.match(source, /refreshPermanentWorkspaceSnapshot\(note, tab, overview\)/);
  assert.match(source, /shouldPreserveRelationSection\(section\)/);
  assert.match(sidebarView, /data-note-relation-assist-section/);
  assert.match(source, /String\(workspace\.getAttribute\("data-note-id"\) \|\| ""\)\.trim\(\) !== note\.id/);
  assert.doesNotMatch(source, /workspace\.outerHTML = this\.renderDeferredNoteWorkspace\(note, tab\)/);
  assert.match(source, /AI 推荐/);
  assert.match(source, /手动搜索/);
  assert.match(source, /候选 \$\{Number\(overview\.wikilinkCount/);
  assert.match(source, /relationState === "error" \? "读取失败" : explicitRelationCount === null \? "读取中"/);

  assert.doesNotMatch(source, /提纯与 AI/);
  assert.doesNotMatch(source, /renderRelated\("当前笔记关联总览"\)/);
  assert.doesNotMatch(source, /永久笔记工作台/);
  assert.doesNotMatch(shell, /关联线索<\/div>/);
  assert.doesNotMatch(source, /主路径下一步/);
  assert.doesNotMatch(source, /<span class="inspector-chip">正文链接 \$\{/);
  assert.doesNotMatch(source, /<span class="inspector-chip">标签线索 \$\{/);
});

test("permanent relation manual search keeps the search input mounted while updating results", async () => {
  const source = await readFile(sourcePath, "utf8");
  const workspaceSource = await readFile(new URL("../../apps/web/src/permanent-relation-workspace.js", import.meta.url), "utf8");
  const refreshStart = source.indexOf("  async refreshPermanentRelationManualSearch(query = \"\") {");
  const refreshEnd = source.indexOf("  queuePermanentRelationManualSearch(input) {", refreshStart);
  assert.ok(refreshStart >= 0 && refreshEnd > refreshStart, "expected refreshPermanentRelationManualSearch() to exist");
  const refreshSource = source.slice(refreshStart, refreshEnd);

  assert.match(workspaceSource, /data-permanent-relation-manual-results/);
  assert.match(workspaceSource, /data-permanent-relation-target-preview-slot/);
  assert.match(source, /renderPermanentRelationManualTargets/);
  assert.match(source, /renderPermanentRelationTargetPreview/);
  assert.match(refreshSource, /this\.syncPermanentRelationManualResults\(\)/);
  assert.match(refreshSource, /this\.syncPermanentRelationTargetPreview\(\)/);
  assert.doesNotMatch(refreshSource, /this\.syncPermanentRelationWorkspaceOverlay\(\)/);
  assert.doesNotMatch(refreshSource, /querySelector\?\.\("\[data-permanent-relation-target-search\]"\)\?\.focus/);
});

test("permanent-note async workflows guard UI refreshes by active note id", async () => {
  const source = await readFile(sourcePath, "utf8");
  const semanticRelationsController = await readFile(semanticRelationsControllerPath, "utf8");

  const distillationStart = source.indexOf("  async handleDistillationForm(form) {");
  const distillationEnd = source.indexOf("  async confirmDistillation()", distillationStart);
  assert.ok(distillationStart >= 0 && distillationEnd > distillationStart, "expected handleDistillationForm() to exist");
  const distillationSource = source.slice(distillationStart, distillationEnd);
  assert.match(distillationSource, /const noteId = String\(note\?\.id \|\| ""\)\.trim\(\)/);
  assert.match(distillationSource, /if \(!this\.isActiveNoteId\(noteId\)\) return/);

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
});
