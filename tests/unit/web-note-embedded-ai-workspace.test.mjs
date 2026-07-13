import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  noteSuggestionReviewContent,
  renderNoteEmbeddedAiWorkspace,
  renderNoteEmbeddedAiWorkspaceSection
} from "../../apps/web/src/note-embedded-ai-workspace.js";
import {
  handleRunNoteAiAnalysisStateChange
} from "../../apps/web/src/app-shell-graph-state-actions.js";

const currentFile = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(currentFile), "../..");

function readRepoFile(...segments) {
  return fs.readFileSync(path.join(repoRoot, ...segments), "utf8");
}

test("embedded note AI workspace renders clear loading, error, and empty states", () => {
  assert.match(renderNoteEmbeddedAiWorkspace({ loading: true }), /正在检查这条笔记/);
  assert.match(renderNoteEmbeddedAiWorkspace({ error: "fetch failed" }), /检查失败：fetch failed/);

  const empty = renderNoteEmbeddedAiWorkspace({ items: [] });
  assert.match(empty, /还没有检查结果/);
  assert.match(empty, /检查这条笔记/);
  assert.match(empty, /data-note-ai-analysis/);
});

test("embedded note AI workspace section provides the permanent note mount", () => {
  const html = renderNoteEmbeddedAiWorkspaceSection({ id: "pn_1" }, { items: [] });

  assert.match(html, /data-note-ai-check-section/);
  assert.match(html, /data-note-id="pn_1"/);
  assert.match(html, /data-note-embedded-ai-workspace/);
  assert.match(html, /data-note-ai-analysis/);
  assert.match(html, /检查这条笔记/);
});

test("embedded note AI workspace renders field-level suggestions with review actions", () => {
  const html = renderNoteEmbeddedAiWorkspace({
    items: [
      {
        id: "suggestion_1",
        scope: "note_field",
        status: "suggested",
        sourceArtifactId: "artifact_1",
        target: { type: "permanent_note", id: "pn_1", field: "thesis" },
        content: { thesis: "候选判断应该先作为草稿进入编辑器。" }
      }
    ]
  });

  assert.match(html, /检查结果/);
  assert.match(html, /一句话判断/);
  assert.match(html, /字段建议/);
  assert.match(html, /候选判断应该先作为草稿进入编辑器/);
  assert.match(html, /data-note-ai-suggestion-action="adopted_as_draft"/);
  assert.match(html, />\s*采纳为草稿\s*<\/button>/);
  assert.match(html, /data-note-ai-suggestion-action="rejected"/);
  assert.match(html, />\s*忽略\s*<\/button>/);
  assert.doesNotMatch(html, /打开完整审阅/);
  assert.doesNotMatch(html, /data-note-ai-suggestion-action="confirmed"/);
});

test("embedded note AI workspace only exposes confirm after a suggestion is edited", () => {
  const html = renderNoteEmbeddedAiWorkspace({
    items: [
      {
        id: "suggestion_edited",
        scope: "note_field",
        status: "edited",
        sourceArtifactId: "artifact_edited",
        target: { type: "permanent_note", id: "pn_1", field: "three_line_summary" },
        content: { three_line_summary: ["一", "二", "三"] }
      }
    ],
    actionLoading: true,
    actionSuggestionId: "suggestion_edited"
  });

  assert.match(html, /三句话压缩/);
  assert.match(html, /data-note-ai-suggestion-action="confirmed"/);
  assert.match(html, />\s*确认建议\s*<\/button>/);
  assert.match(html, /data-note-ai-suggestion-action="confirmed"[\s\S]*disabled/);
});

test("embedded note AI workspace derives reviewed content from note fields", () => {
  assert.deepEqual(
    noteSuggestionReviewContent(
      {
        thesis: "这是用户自己确认后的判断。",
        threeLineSummary: ["第一句", "第二句", "第三句"],
        boundaryOrCounterpoint: "只在样本足够稳定时成立。"
      },
      {
        target: { field: "thesis" }
      }
    ),
    { thesis: "这是用户自己确认后的判断。" }
  );

  assert.deepEqual(
    noteSuggestionReviewContent(
      {
        thesis: "这是用户自己确认后的判断。",
        threeLineSummary: ["第一句", "第二句", "第三句"],
        boundaryOrCounterpoint: "只在样本足够稳定时成立。"
      },
      {
        target: { field: "three_line_summary" }
      }
    ),
    { three_line_summary: ["第一句", "第二句", "第三句"] }
  );
});

test("editor-triggered note AI analysis no longer mounts inside viewpoint distillation", async () => {
  const editorSource = readRepoFile("apps/web/src/components-editor-pane.js");
  const distillationViewSource = readRepoFile("apps/web/src/permanent-note-distillation-view.js");
  const sidebarViewSource = readRepoFile("apps/web/src/permanent-note-sidebar-view.js");
  const workspaceControllerSource = readRepoFile("apps/web/src/permanent-note-workspace-controller.js");
  const workspaceViewSource = readRepoFile("apps/web/src/permanent-note-workspace-view.js");
  const editorWorkspaceSource = `${editorSource}\n${distillationViewSource}\n${workspaceControllerSource}\n${workspaceViewSource}`;
  const renderStart = editorSource.indexOf("  renderRelated(extraTitle = \"\") {");
  const renderEnd = editorSource.indexOf("  async handleTokenAction(token) {", renderStart);
  assert.ok(renderStart >= 0 && renderEnd > renderStart, "expected renderRelated() to exist");
  const renderSource = editorSource.slice(renderStart, renderEnd);
  assert.match(renderSource, /this\.renderDeferredNoteWorkspace\(note, tab\)/);

  const deferredStart = editorSource.indexOf("  renderDeferredNoteWorkspace(note, tab) {");
  const deferredEnd = editorSource.indexOf("  setDistillationPrefill", deferredStart);
  assert.ok(deferredStart >= 0 && deferredEnd > deferredStart, "expected renderDeferredNoteWorkspace() to exist");
  const deferredSource = editorSource.slice(deferredStart, deferredEnd);
  assert.match(deferredSource, /this\.permanentNoteWorkspace\(\)\.renderDeferredWorkspace\(note, tab\)/);
  assert.match(workspaceControllerSource, /this\.host\.renderPermanentNoteDistillationSection\(note\)/);
  assert.match(workspaceControllerSource, /this\.host\.renderNoteEmbeddedAiWorkspaceSectionForNote\(note\)/);
  assert.match(workspaceControllerSource, /this\.host\.renderPermanentNoteRelationAssistSection\(note\)/);
  assert.match(workspaceViewSource, /data-deferred-workspace/);

  const sectionStart = editorSource.indexOf("  renderPermanentNoteRelationAssistSection(note, overview = {}) {");
  const sectionEnd = editorSource.indexOf("  renderPermanentNoteWritingPrepSection", sectionStart);
  assert.ok(sectionStart >= 0 && sectionEnd > sectionStart, "expected renderPermanentNoteRelationAssistSection() to exist");
  const sectionSource = editorSource.slice(sectionStart, sectionEnd);
  assert.doesNotMatch(editorWorkspaceSource, /data-note-embedded-ai-workspace data-note-id="\$\{escapeHtml\(note\.id\)\}"/);
  assert.match(sectionSource, /renderPermanentNoteRelationAssistSectionView\(\{/);
  assert.match(sidebarViewSource, /data-relation-ai-count/);
  assert.doesNotMatch(sidebarViewSource, /条建议/);
  assert.doesNotMatch(sectionSource, /分析结果会进入 AI Inbox/);
  assert.doesNotMatch(editorSource, /renderPermanentNoteAiAnalysisSection/);
  assert.doesNotMatch(editorSource, /data-note-ai-analysis-open-inbox/);

  const analysisStart = editorSource.indexOf("  async runPermanentNoteAnalysis() {");
  const analysisEnd = editorSource.indexOf("  legacyPermanentNoteMainPathSummary", analysisStart);
  const toolbarButtonStart = editorSource.indexOf("  ensureContextualAiToolbarButtons() {");
  const toolbarButtonEnd = editorSource.indexOf("  async autoSaveTabById", toolbarButtonStart);

  assert.ok(toolbarButtonStart >= 0 && toolbarButtonEnd > toolbarButtonStart, "expected ensureContextualAiToolbarButtons() to exist");
  const toolbarButtonSource = editorSource.slice(toolbarButtonStart, toolbarButtonEnd);
  assert.match(toolbarButtonSource, /button\.dataset\.contextualAiActionId = "check_note"/);
  assert.doesNotMatch(toolbarButtonSource, /button\.dataset\.noteAiAnalysis = ""/);
  assert.doesNotMatch(toolbarButtonSource, /button\.title = "检查这条笔记"/);
  assert.doesNotMatch(toolbarButtonSource, /button\.dataset\.tip = "检查这条笔记"/);

  assert.ok(analysisStart >= 0 && analysisEnd > analysisStart, "expected runPermanentNoteAnalysis() to exist");
  const analysisSource = editorSource.slice(analysisStart, analysisEnd);

  assert.match(analysisSource, /ensure-ai-ready-for-feature/);
  assert.match(analysisSource, /feature: "note_analysis"/);
  assert.match(analysisSource, /this\.rememberPendingContextualAiAction\("note_analysis", \{ noteId \}\)/);
  assert.match(analysisSource, /this\.closePermanentRelationWorkspace\(\)/);
  assert.match(analysisSource, /openInbox: false/);
  assert.match(analysisSource, /this\.noteAiAnalysisByNoteId\.set\(noteId, result\)/);
  assert.match(analysisSource, /if \(!this\.isActiveNoteId\(noteId\)\) return/);
  assert.match(analysisSource, /permanentRelationAiRecommendationTimer/);
  assert.match(analysisSource, /暂时还没有找到可推荐的关联/);
  assert.match(analysisSource, /这条笔记暂时没有可推荐的关联/);
  assert.doesNotMatch(analysisSource, /this\.activatePermanentWorkspaceTab\("relations"\)/);
  assert.match(analysisSource, /this\.refreshPermanentWorkspaceSnapshot\(note, tab, overview\)/);
  assert.match(analysisSource, /await this\.refreshNoteAiSuggestions\(noteId, \{ preserveActionFeedback: true \}\)/);
  assert.match(analysisSource, /this\.onStatus\("检查结果已更新", "ok"\)/);
  assert.doesNotMatch(analysisSource, /请确认是否保存关系/);
  assert.doesNotMatch(analysisSource, /this\.renderRelated\(\)/);

  const clickStart = editorSource.indexOf("      const aiAnalysisButton = e.target.closest(\"[data-note-ai-analysis]\");");
  const clickEnd = editorSource.indexOf("      const permanentWorkspaceTab = e.target.closest", clickStart);
  assert.ok(clickStart >= 0 && clickEnd > clickStart, "expected note AI analysis click branch to exist");
  const clickSource = editorSource.slice(clickStart, clickEnd);
  assert.match(clickSource, /void this\.runPermanentNoteAnalysis\(\)/);
  assert.doesNotMatch(clickSource, /activatePermanentWorkspaceTab\("relations"\)/);

  const bindStart = editorSource.indexOf("    this.els.checkNoteAi?.addEventListener(\"click\"");
  const bindEnd = editorSource.indexOf("    this.els.completeNote?.addEventListener", bindStart);
  assert.ok(bindStart >= 0 && bindEnd > bindStart, "expected toolbar check button click binding to exist");
  assert.match(editorSource.slice(bindStart, bindEnd), /void this\.runPermanentNoteAnalysis\(\)/);

  const applyStart = editorSource.indexOf("  async applyNoteAiSuggestionAction");
  const applyEnd = editorSource.indexOf("  jumpToInspectorSection", applyStart);
  assert.ok(applyStart >= 0 && applyEnd > applyStart, "expected applyNoteAiSuggestionAction() to exist");
  const applySource = editorSource.slice(applyStart, applyEnd);
  assert.match(applySource, /await this\.refreshNoteAiSuggestions\(noteId, \{ preserveActionFeedback: true \}\)/);
  assert.match(applySource, /this\.renderEmbeddedAiWorkspaceMount\(noteId\)/);
  assert.doesNotMatch(applySource, /this\.renderRelated\(\)/);

  const aiInboxState = { filters: {}, detail: { id: "old" }, selectedArtifactId: "old" };
  const calls = [];
  await handleRunNoteAiAnalysisStateChange({ noteId: "n1", openInbox: false }, {
    state: { notes: [{ id: "n1", title: "Note" }] },
    aiInboxState,
    analyzePermanentNote: async () => ({ reviewItems: { artifacts: [{ id: "a1" }] } }),
    addSystemMessage: () => calls.push("message"),
    openSystemMessages: () => calls.push("open-system"),
    setStatus: (message, tone) => calls.push(["status", message, tone])
  });

  assert.deepEqual(calls, [
    ["status", "正在运行本地永久笔记 AI 分析...", "warn"],
    ["status", "已生成 1 条待审 AI 建议，可在当前笔记里处理", "ok"]
  ]);
  assert.deepEqual(aiInboxState, { filters: {}, detail: { id: "old" }, selectedArtifactId: "old" });

});
