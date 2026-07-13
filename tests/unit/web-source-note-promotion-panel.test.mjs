import test from "node:test";
import assert from "node:assert/strict";

import {
  renderSourceNotePromotionPanel,
  sourceNotePromotionState
} from "../../apps/web/src/source-note-promotion-panel.js";

test("source note promotion state shows a clear ungenerated fleeting note workflow", () => {
  const state = sourceNotePromotionState({
    note: { id: "fn_1", title: "随笔记录" },
    noteType: "fleeting",
    showFleetingCleanup: true
  });

  assert.equal(state.status, "ready");
  assert.equal(state.statusLabel, "未生成");
  assert.equal(state.kindLabel, "随笔");
  assert.equal(state.primaryActionLabel, "生成永久笔记");
  assert.equal(state.showFleetingCleanup, true);

  const html = renderSourceNotePromotionPanel({
    note: { id: "fn_1", title: "随笔记录" },
    noteType: "fleeting",
    showFleetingCleanup: true
  });

  assert.match(html, /可以生成永久笔记/);
  assert.match(html, /data-source-promotion-status="ready"/);
  assert.match(html, /data-source-note-action="record-permanent"[\s\S]*>生成永久笔记</);
  assert.match(html, /data-fleeting-cleanup-prompt/);
});

test("source note promotion panel shows generated result and open state", () => {
  const html = renderSourceNotePromotionPanel({
    note: { id: "ln_1", title: "文献材料" },
    noteType: "literature",
    generatedOriginal: {
      id: "pn_1",
      title: "长期判断",
      folderId: "dir_original_default"
    },
    generatedDirectoryLabel: "永久笔记盒 / 写作方法",
    isOpen: true
  });

  assert.match(html, /已经生成永久笔记/);
  assert.match(html, /data-source-promotion-status="generated"/);
  assert.match(html, /长期判断/);
  assert.match(html, /永久笔记盒 \/ 写作方法/);
  assert.match(html, /当前已打开/);
  assert.match(html, /可更新/);
  assert.match(html, /data-open-linked-note="pn_1"[\s\S]*>打开永久笔记</);
  assert.match(html, /data-source-note-action="record-permanent"[\s\S]*>重新生成</);
});

test("source note promotion panel hides legacy create action while AI draft is pending", () => {
  const html = renderSourceNotePromotionPanel({
    note: { id: "fn_1", title: "随笔", noteType: "fleeting" },
    noteType: "fleeting",
    aiActionState: {
      actionId: "distill_material",
      status: "awaiting_confirmation",
      result: {
        kind: "draft",
        draft: {
          title: "草稿",
          coreArgument: "观点",
          content: "正文",
          questions: "问题"
        }
      }
    }
  });

  assert.match(html, /data-contextual-ai-adopt/);
  assert.doesNotMatch(html, /data-source-note-action="record-permanent"/);
});

test("source note promotion state keeps incomplete literature from looking ready", () => {
  const state = sourceNotePromotionState({
    note: { id: "ln_2", title: "文献材料" },
    noteType: "literature",
    literatureCompletion: {
      readyForOriginal: false,
      hint: "先补出处和转述。"
    }
  });

  assert.equal(state.status, "not_ready");
  assert.equal(state.statusLabel, "未准备好");
  assert.equal(state.guidance, "先补出处和转述。");
});
