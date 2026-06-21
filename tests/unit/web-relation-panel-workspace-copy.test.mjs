import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const sourcePath = new URL("../../apps/web/src/components-editor-pane.js", import.meta.url);
const prototypePath = new URL("../../apps/web/src/prototype-app.js", import.meta.url);
const shellPath = new URL("../../apps/web/src/prototype.html", import.meta.url);

test("relation side panel uses action-first workspace copy without noisy placeholders", async () => {
  const source = await readFile(sourcePath, "utf8");
  const prototypeSource = await readFile(prototypePath, "utf8");
  const shell = await readFile(shellPath, "utf8");
  const openRelationStart = prototypeSource.indexOf("function openNoteRelationEditor");
  const openRelationEnd = prototypeSource.indexOf("const openRecordPermanentWorkflowFromCurrentNote", openRelationStart);
  assert.ok(openRelationStart >= 0 && openRelationEnd > openRelationStart, "expected openNoteRelationEditor() to exist");
  const openRelationSource = prototypeSource.slice(openRelationStart, openRelationEnd);
  const deferredStart = source.indexOf("  renderDeferredNoteWorkspace(note, tab) {");
  const deferredEnd = source.indexOf("  renderPermanentNoteRelationAssistSection(note, overview = {}) {", deferredStart);
  assert.ok(deferredStart >= 0 && deferredEnd > deferredStart, "expected renderDeferredNoteWorkspace() to exist");
  const deferredSource = source.slice(deferredStart, deferredEnd);

  assert.match(shell, /<div class="panel-title">关系整理<\/div>/);
  assert.match(shell, /先选要关联的笔记，再写清为什么。/);
  assert.match(source, /<div class="inspector-section-title">关系网络<\/div>/);
  assert.match(source, /renderPermanentRelationWorkspace/);
  assert.match(source, /RELATION_EDIT_STATUSES/);
  assert.match(source, /data-permanent-relation-action="open"/);
  assert.match(source, /permanentRelationMode && !permanentRelationMode\.hasAttribute\("data-permanent-relation-action"\)/);
  assert.match(source, /data-permanent-relation-workspace/);
  assert.match(source, /this\.permanentRelationWorkspaceState = defaultPermanentRelationWorkspaceState\(""\)/);
  assert.match(source, /this\.permanentRelationWorkspaceState\.noteId !== note\.id/);
  assert.doesNotMatch(source, /this\.syncPermanentRelationWorkspaceOverlay\(\);\s*if \(cleanQuery\)/);
  assert.match(source, /notice: "正在确认现有关系。"/);
  assert.match(source, /const latestRelations = await fetchNoteRelations\(note\.id\)/);
  assert.match(source, /const latestValidation = permanentRelationWorkspaceCanSave\(\{/);
  assert.match(source, /const savedRelations = await fetchNoteRelations\(note\.id\)\.catch\(\(\) => null\)/);
  assert.match(source, /permanentRelationWorkspaceNextAiCandidate\(/);
  assert.match(source, /data-deferred-workspace/);
  assert.match(source, /\["relations", "关联"/);
  assert.match(source, /\["viewpoint", "观点提纯"/);
  assert.match(source, /\["writing", "写作准备"/);
  assert.match(source, /data-permanent-workspace-tab="\$\{escapeHtml\(key\)\}"/);
  assert.match(source, /data-permanent-note-workspace data-note-id="\$\{escapeHtml\(note\.id\)\}"/);
  assert.match(source, /refreshPermanentWorkspaceSnapshot\(note, tab, overview\)/);
  assert.match(source, /shouldPreserveRelationSection\(section\)/);
  assert.match(source, /data-note-relation-assist-section/);
  assert.match(source, /String\(workspace\.getAttribute\("data-note-id"\) \|\| ""\)\.trim\(\) !== note\.id/);
  assert.doesNotMatch(source, /workspace\.outerHTML = this\.renderDeferredNoteWorkspace\(note, tab\)/);
  assert.match(openRelationSource, /editor\?\.renderRelated\?\.\(\);/);
  assert.match(openRelationSource, /editor\?\.openPermanentRelationWorkspace\?\.\(\{/);
  assert.doesNotMatch(openRelationSource, /openCreateRelationForm/);
  assert.doesNotMatch(openRelationSource, /data-create-relation-form/);
  assert.match(source, /整理关系/);
  assert.match(source, /手动搜索/);
  assert.match(source, /relationState === "error" \? "读取失败" : explicitRelationCount === null \? "读取中"/);

  assert.doesNotMatch(source, /提纯与 AI/);
  assert.doesNotMatch(source, /renderRelated\("当前笔记关联总览"\)/);
  assert.doesNotMatch(source, /关联、观点提纯和写作准备分开处理/);
  assert.doesNotMatch(deferredSource, /<div class="inspector-section-title">永久笔记整理<\/div>/);
  assert.doesNotMatch(deferredSource, /<div class="inspector-section-title">下一步<\/div>/);
  assert.doesNotMatch(deferredSource, /renderPermanentNoteMainPathSectionV2/);
  assert.doesNotMatch(source, /永久笔记工作台/);
  assert.doesNotMatch(shell, /关联线索<\/div>/);
  assert.doesNotMatch(source, /主路径下一步/);
  assert.doesNotMatch(openRelationSource, /explorer-browser|关联浏览器/);
  assert.doesNotMatch(source, /preview-target"[\s\S]{0,260}showNotePreviewInInspector/);
  assert.doesNotMatch(source, /<span class="inspector-chip">正文链接 \$\{/);
  assert.doesNotMatch(source, /<span class="inspector-chip">标签线索 \$\{/);
});

test("permanent-note async workflows guard UI refreshes by active note id", async () => {
  const source = await readFile(sourcePath, "utf8");

  const distillationStart = source.indexOf("  async handleDistillationForm(form) {");
  const distillationEnd = source.indexOf("  async confirmDistillation()", distillationStart);
  assert.ok(distillationStart >= 0 && distillationEnd > distillationStart, "expected handleDistillationForm() to exist");
  const distillationSource = source.slice(distillationStart, distillationEnd);
  assert.match(distillationSource, /const noteId = String\(note\?\.id \|\| ""\)\.trim\(\)/);
  assert.match(distillationSource, /if \(!this\.isActiveNoteId\(noteId\)\) return/);

  const createStart = source.indexOf("  async handleCreateRelationForm(form) {");
  const createEnd = source.indexOf("  async promoteInlineDraftRelation", createStart);
  assert.ok(createStart >= 0 && createEnd > createStart, "expected handleCreateRelationForm() to exist");
  const createSource = source.slice(createStart, createEnd);
  assert.match(createSource, /if \(!this\.isActiveNoteId\(formNoteId\)\) return/);
  assert.match(createSource, /if \(submit && this\.isActiveNoteId\(formNoteId\)\) submit\.disabled = false/);

  const editStart = source.indexOf("  async handleEditRelationForm(form) {");
  const editEnd = source.indexOf("  async deleteSemanticRelation", editStart);
  assert.ok(editStart >= 0 && editEnd > editStart, "expected handleEditRelationForm() to exist");
  const editSource = source.slice(editStart, editEnd);
  assert.match(editSource, /if \(!this\.isActiveNoteId\(formNoteId\)\) return/);
  assert.match(editSource, /if \(submit && this\.isActiveNoteId\(formNoteId\)\) submit\.disabled = false/);

  const promoteStart = source.indexOf("  async promoteInlineDraftRelation");
  const promoteEnd = source.indexOf("  async handleEditRelationForm", promoteStart);
  assert.ok(promoteStart >= 0 && promoteEnd > promoteStart, "expected promoteInlineDraftRelation() to exist");
  const promoteSource = source.slice(promoteStart, promoteEnd);
  assert.match(promoteSource, /this\.syncRelationNetworkConnected\(note\.id, target\.id\);\s*if \(!this\.isActiveNoteId\(noteId\)\) return;/);

  const deleteStart = source.indexOf("  async deleteSemanticRelation(relationId) {");
  const deleteEnd = source.indexOf("  renderRelated(extraTitle = \"\") {", deleteStart);
  assert.ok(deleteStart >= 0 && deleteEnd > deleteStart, "expected deleteSemanticRelation() to exist");
  const deleteSource = source.slice(deleteStart, deleteEnd);
  assert.match(deleteSource, /if \(!this\.isActiveNoteId\(activeNoteId\)\) return/);
});

test("permanent relation manual search does not rerender the input while typing", async () => {
  const source = await readFile(sourcePath, "utf8");
  const queueStart = source.indexOf("  queuePermanentRelationManualSearch(input) {");
  const queueEnd = source.indexOf("  updatePermanentRelationWorkspaceField(field = \"\", value = \"\") {", queueStart);
  assert.ok(queueStart >= 0 && queueEnd > queueStart, "expected queuePermanentRelationManualSearch() to exist");
  const queueSource = source.slice(queueStart, queueEnd);
  const refreshStart = source.indexOf("  async refreshPermanentRelationManualSearch(query = \"\", searchSerial = null) {");
  const refreshEnd = source.indexOf("  queuePermanentRelationManualSearch(input) {", refreshStart);
  assert.ok(refreshStart >= 0 && refreshEnd > refreshStart, "expected refreshPermanentRelationManualSearch() to accept a serial");
  const refreshSource = source.slice(refreshStart, refreshEnd);
  const beforeSearch = refreshSource.slice(0, refreshSource.indexOf("const result = await searchNotes"));

  assert.match(queueSource, /const serial = \+\+this\.permanentRelationSearchSerial/);
  assert.match(queueSource, /refreshPermanentRelationManualSearch\(query, serial\)/);
  assert.doesNotMatch(queueSource, /syncPermanentRelationWorkspaceOverlay\(\)/);
  assert.doesNotMatch(beforeSearch, /this\.syncPermanentRelationWorkspaceOverlay\(\)/);
  assert.match(refreshSource, /if \(serial !== this\.permanentRelationSearchSerial/);
  assert.match(refreshSource, /setSelectionRange\?\.\(end, end\)/);
});
