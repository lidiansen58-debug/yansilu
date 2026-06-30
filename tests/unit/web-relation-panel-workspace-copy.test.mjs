import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const sourcePath = new URL("../../apps/web/src/components-editor-pane.js", import.meta.url);
const sidebarArchitecturePath = new URL("../../apps/web/src/permanent-note-sidebar-architecture.js", import.meta.url);
const sidebarViewPath = new URL("../../apps/web/src/permanent-note-sidebar-view.js", import.meta.url);
const sidebarControllerPath = new URL("../../apps/web/src/permanent-note-sidebar-controller.js", import.meta.url);
const semanticRelationsViewPath = new URL("../../apps/web/src/editor-semantic-relations-view.js", import.meta.url);
const semanticRelationsControllerPath = new URL("../../apps/web/src/editor-semantic-relations-controller.js", import.meta.url);
const relationEventsPath = new URL("../../apps/web/src/editor-relation-events.js", import.meta.url);
const distillationControllerPath = new URL("../../apps/web/src/permanent-note-distillation-controller.js", import.meta.url);
const workspaceControllerPath = new URL("../../apps/web/src/permanent-note-workspace-controller.js", import.meta.url);
const workspaceViewPath = new URL("../../apps/web/src/permanent-note-workspace-view.js", import.meta.url);
const permanentRelationWorkspacePath = new URL("../../apps/web/src/permanent-relation-workspace.js", import.meta.url);
const shellPath = new URL("../../apps/web/src/prototype.html", import.meta.url);

test("relation side panel uses action-first workspace copy without noisy placeholders", async () => {
  const source = [
    await readFile(sourcePath, "utf8"),
    await readFile(semanticRelationsViewPath, "utf8"),
    await readFile(semanticRelationsControllerPath, "utf8"),
    await readFile(relationEventsPath, "utf8"),
    await readFile(workspaceControllerPath, "utf8"),
    await readFile(workspaceViewPath, "utf8"),
    await readFile(permanentRelationWorkspacePath, "utf8")
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
  assert.match(source, /<div class="inspector-section-title">建议先做<\/div>/);
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
  assert.match(source, /永久笔记右侧/);
  assert.match(source, /选择一个动作处理当前笔记：整理关系、提炼观点或进入写作。/);
  assert.match(source, /key: "relations",\s+label: "整理关系"/);
  assert.match(source, /key: "viewpoint",\s+label: "提炼观点"/);
  assert.match(source, /key: "writing",\s+label: "进入写作"/);
  assert.match(source, /提炼观点、理由、边界、追问和写作主题。/);
  assert.match(source, /data-permanent-workspace-tab="\$\{escapeHtml\(key\)\}"/);
  assert.match(source, /data-permanent-note-workspace data-note-id="\$\{escapeHtml\(note\.id\)\}"/);
  assert.match(source, /refreshPermanentWorkspaceSnapshot\(note, tab, overview\)/);
  assert.match(source, /shouldPreserveRelationSection\(section\)/);
  assert.match(sidebarView, /data-note-relation-assist-section/);
  assert.match(source, /workspaceMatchesNote\(noteId = ""\)/);
  assert.match(source, /permanentRelationCandidateRationale\(firstCandidate\) \|\| this\.permanentRelationWorkspaceState\.rationale/);
  assert.doesNotMatch(source, /rationale: firstCandidate\?\.rationaleDraft \|\| this\.permanentRelationWorkspaceState\.rationale/);
  assert.doesNotMatch(source, /workspace\.outerHTML = this\.renderDeferredNoteWorkspace\(note, tab\)/);
  assert.match(source, /AI 推荐/);
  assert.match(source, /手动搜索/);
  assert.match(source, /data-permanent-relation-ai-select/);
  assert.match(source, /建立笔记关联/);
  assert.match(sidebarView, /正在读取这条笔记的正式关系。读取完成后再保存新关系。/);
  assert.match(sidebarView, /AI 找到 \$\{escapeHtml\(String\(assist\.relationCandidates\)\)\} 条可复核候选。确认前不会自动保存。/);

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
});
