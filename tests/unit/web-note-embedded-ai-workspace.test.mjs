import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  noteSuggestionReviewContent,
  renderNoteEmbeddedAiWorkspace
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
  assert.match(renderNoteEmbeddedAiWorkspace({ loading: true }), /正在读取这条笔记的 AI 建议/);
  assert.match(renderNoteEmbeddedAiWorkspace({ error: "fetch failed" }), /AI 建议加载失败：fetch failed/);

  const empty = renderNoteEmbeddedAiWorkspace({ items: [] });
  assert.match(empty, /暂时没有待审 AI 建议/);
  assert.match(empty, /运行这条笔记的 AI 分析/);
  assert.match(empty, /data-note-ai-analysis/);
  assert.match(empty, /由你决定是否采纳/);
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

  assert.match(html, /当前笔记的 AI 建议/);
  assert.match(html, /一句话判断/);
  assert.match(html, /字段建议/);
  assert.match(html, /候选判断应该先作为草稿进入编辑器/);
  assert.match(html, /data-note-ai-suggestion-action="adopted_as_draft"/);
  assert.match(html, />\s*采纳为草稿\s*<\/button>/);
  assert.match(html, /data-note-ai-suggestion-action="rejected"/);
  assert.match(html, />\s*忽略\s*<\/button>/);
  assert.match(html, />\s*打开完整审阅\s*<\/button>/);
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

test("editor-triggered note AI analysis stays in the current note workspace", async () => {
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
  assert.match(workspaceControllerSource, /this\.host\.renderPermanentNoteRelationAssistSection\(note, overview\)/);
  assert.match(workspaceControllerSource, /this\.host\.renderPermanentNoteDistillationSection\(note\)/);
  assert.match(workspaceViewSource, /data-deferred-workspace/);

  const sectionStart = editorSource.indexOf("  renderPermanentNoteRelationAssistSection(note, overview = {}) {");
  const sectionEnd = editorSource.indexOf("  renderPermanentNoteWritingPrepSection", sectionStart);
  assert.ok(sectionStart >= 0 && sectionEnd > sectionStart, "expected renderPermanentNoteRelationAssistSection() to exist");
  const sectionSource = editorSource.slice(sectionStart, sectionEnd);
  assert.match(editorWorkspaceSource, /data-note-embedded-ai-workspace data-note-id="\$\{escapeHtml\(note\.id\)\}"/);
  assert.match(sectionSource, /renderPermanentNoteRelationAssistSectionView\(\{/);
  assert.match(sidebarViewSource, /AI 推荐/);
  assert.match(sidebarViewSource, /手动搜索/);
  assert.doesNotMatch(sectionSource, /分析结果会进入 AI Inbox/);
  assert.doesNotMatch(editorSource, /renderPermanentNoteAiAnalysisSection/);
  assert.doesNotMatch(editorSource, /data-note-ai-analysis-open-inbox/);

  const analysisStart = editorSource.indexOf("  async runPermanentNoteAnalysis() {");
  const analysisEnd = editorSource.indexOf("  legacyPermanentNoteMainPathSummary", analysisStart);

  assert.ok(analysisStart >= 0 && analysisEnd > analysisStart, "expected runPermanentNoteAnalysis() to exist");
  const analysisSource = editorSource.slice(analysisStart, analysisEnd);

  assert.match(analysisSource, /openInbox: false/);
  assert.match(analysisSource, /this\.noteAiAnalysisByNoteId\.set\(noteId, result\)/);
  assert.match(analysisSource, /if \(!this\.isActiveNoteId\(noteId\)\) return/);
  assert.match(analysisSource, /this\.activatePermanentWorkspaceTab\("relations"\)/);
  assert.match(analysisSource, /this\.refreshPermanentWorkspaceSnapshot\(note, tab, overview\)/);
  assert.match(analysisSource, /void this\.refreshNoteAiSuggestions\(noteId\)/);
  assert.doesNotMatch(analysisSource, /this\.renderRelated\(\)/);

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
    "message",
    ["status", "已生成 1 条待审 AI 建议，可在当前笔记里处理", "ok"]
  ]);
  assert.deepEqual(aiInboxState, { filters: {}, detail: { id: "old" }, selectedArtifactId: "old" });

});
