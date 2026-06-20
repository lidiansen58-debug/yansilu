import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const sourcePath = new URL("../../apps/web/src/components-editor-pane.js", import.meta.url);
const shellPath = new URL("../../apps/web/src/prototype.html", import.meta.url);

test("relation side panel uses action-first workspace copy without noisy placeholders", async () => {
  const source = await readFile(sourcePath, "utf8");
  const shell = await readFile(shellPath, "utf8");

  assert.match(shell, /<div class="panel-title">关系整理<\/div>/);
  assert.match(shell, /先处理当前建议，再确认正式关系。/);
  assert.match(source, /<div class="inspector-section-title">当前建议<\/div>/);
  assert.match(source, /<div class="inspector-section-title">关系网络<\/div>/);
  assert.match(source, /data-main-path-next-action/);
  assert.match(source, /data-deferred-workspace/);
  assert.match(source, /永久笔记工作台/);
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
  assert.match(source, /AI 推荐/);
  assert.match(source, /手动关联/);
  assert.match(source, /候选 \$\{Number\(overview\.wikilinkCount/);
  assert.match(source, /relationState === "error" \? "读取失败" : explicitRelationCount === null \? "读取中"/);

  assert.doesNotMatch(source, /提纯与 AI/);
  assert.doesNotMatch(source, /renderRelated\("当前笔记关联总览"\)/);
  assert.doesNotMatch(shell, /关联线索<\/div>/);
  assert.doesNotMatch(source, /主路径下一步/);
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
