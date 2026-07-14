import test from "node:test";
import assert from "node:assert/strict";

import {
  automationRunHistoryItems,
  renderSettingsAutomationRunHistory
} from "../../apps/web/src/settings-automation-run-history.js";

test("automation run history renders concise recent activity instead of open JSON blocks", () => {
  const snapshots = {
    suggestionsList: {
      capturedAt: "2026-05-20T12:00:00.000Z",
      runtime: { items: [{ id: "suggestion_1", status: "suggested" }] },
      canonical: { items: [{ id: "suggestion_1", status: "suggested" }] }
    },
    suggestionDecision: {
      capturedAt: "2026-05-20T12:02:00.000Z",
      runtime: { item: { id: "suggestion_1", status: "confirmed" } },
      canonical: { item: { id: "suggestion_1", status: "confirmed" } }
    }
  };

  const items = automationRunHistoryItems(snapshots);
  assert.equal(items.length, 2);
  assert.equal(items[0].title, "建议处理结果");

  const html = renderSettingsAutomationRunHistory({ snapshots });
  assert.match(html, /建议处理结果/);
  assert.match(html, /待处理建议列表/);
  assert.match(html, /<summary>查看细节<\/summary>/);
  assert.doesNotMatch(html, /AI 建议决策/);
  assert.doesNotMatch(html, /最近一次建议审阅更新结果/);
});

test("automation run history keeps empty state short", () => {
  assert.match(renderSettingsAutomationRunHistory(), /还没有整理记录/);
});
