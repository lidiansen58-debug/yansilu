import test from "node:test";
import assert from "node:assert/strict";

import { renderWritableThemeDiscoveryPanelDom } from "../../apps/web/src/writable-theme-discovery-panel.js";

test("writable theme discovery panel explains suggestion before confirmation", () => {
  const html = renderWritableThemeDiscoveryPanelDom({
    writingState: {
      themeDiscoverySuggestions: [{
        id: "suggested-theme:n1|n2|n3",
        canSave: true,
        title: "卡片写作的可写主题",
        sourceLabel: "本地规则建议",
        noteIds: ["n1", "n2", "n3"],
        centralQuestion: "为什么卡片写作要先形成判断？",
        membershipReason: "这些笔记都在说明判断如何进入写作。",
        explanation: {
          keyNotes: ["判断先行", "关系理由", "文章提纲"],
          sharedSignals: ["2 条关联", "共享标签"],
          gap: "还缺一个反例。",
          confirmationSummary: "确认后会保存一张主题索引笔记，不会自动创建文章、草稿或关系。"
        },
        items: [
          { noteId: "n1", shortLabel: "判断先行", rationale: "说明共同问题。" }
        ]
      }]
    }
  });

  assert.match(html, /关键笔记/);
  assert.match(html, /共同信号/);
  assert.match(html, /缺什么才更适合写/);
  assert.match(html, /确认后会保存什么/);
  assert.match(html, /不会自动创建文章/);
  assert.match(html, /确认并保存为可写主题/);
});
