import test from "node:test";
import assert from "node:assert/strict";

import {
  noteSuggestionReviewContent,
  renderNoteEmbeddedAiWorkspace
} from "../../apps/web/src/note-embedded-ai-workspace.js";

test("embedded note AI workspace renders empty and loading states", () => {
  assert.match(renderNoteEmbeddedAiWorkspace({ loading: true }), /读取这条笔记的 AI 建议/);
  assert.match(renderNoteEmbeddedAiWorkspace({ items: [] }), /目前还没有待审 AI 建议/);
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

  assert.match(html, /一句话判断/);
  assert.match(html, /候选判断应该先作为草稿进入编辑器/);
  assert.match(html, /data-note-ai-suggestion-action="adopted_as_draft"/);
  assert.match(html, /data-note-ai-suggestion-action="rejected"/);
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
  assert.match(html, /data-note-ai-suggestion-action="confirmed"[\s\S]*disabled/);
});

test("embedded note AI workspace derives reviewed content from note fields", () => {
  assert.deepEqual(
    noteSuggestionReviewContent(
      {
        thesis: "这是一条用户自己确认后的判断。",
        threeLineSummary: ["第一句", "第二句", "第三句"],
        boundaryOrCounterpoint: "只在样本足够稳定时成立。"
      },
      {
        target: { field: "thesis" }
      }
    ),
    { thesis: "这是一条用户自己确认后的判断。" }
  );

  assert.deepEqual(
    noteSuggestionReviewContent(
      {
        thesis: "这是一条用户自己确认后的判断。",
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
