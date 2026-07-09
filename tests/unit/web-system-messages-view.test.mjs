import test from "node:test";
import assert from "node:assert/strict";

import {
  renderSystemMessageDetailView,
  renderSystemMessageEmptyDetailView,
  renderSystemMessageEmptyListView,
  renderSystemMessageListView
} from "../../apps/web/src/system-messages-view.js";

const viewDeps = {
  notes: [{ id: "n1", title: "Note One" }],
  escapeHtml: (value = "") => String(value ?? "").replaceAll("<", "&lt;"),
  systemMessageActionLabel: (message) => (message.action ? "Open" : ""),
  systemMessageDisplayTitle: (message) => message.title,
  systemMessagePreviewText: (message) => message.body,
  systemMessageSubjectText: () => "Note One"
};

test("system messages view renders empty list and detail states", () => {
  assert.match(renderSystemMessageEmptyListView(), /system-message-empty-list/);
  assert.match(renderSystemMessageEmptyDetailView(), /system-message-empty-card/);
});

test("system messages view renders selectable unread list items", () => {
  const messages = [
    {
      id: "m1",
      title: "Review",
      body: "Needs <review>",
      action: "open-ai-inbox",
      read: false,
      createdAt: "2026-06-22T00:00:00.000Z",
      artifactCount: 2
    }
  ];
  const html = renderSystemMessageListView(messages, messages[0], viewDeps);

  assert.match(html, /system-message-item is-unread is-selected/);
  assert.match(html, /data-system-message-select="m1"/);
  assert.match(html, /Needs &lt;review>/);
  assert.match(html, /data-system-message-action/);
  assert.match(html, /2/);
});

test("system messages view keeps full message bodies in the single-column history", () => {
  const fullBody = "这是一条很长的系统消息，用来确认单列历史列表不会再依赖右侧详情栏显示完整内容。这里必须完整保留，而不是只留下预览摘要。";
  const messages = [
    {
      id: "m-long",
      title: "Long",
      body: fullBody,
      action: "open-ai-inbox",
      read: true,
      createdAt: "2026-06-22T00:00:00.000Z"
    }
  ];
  const html = renderSystemMessageListView(messages, messages[0], {
    ...viewDeps,
    systemMessagePreviewText: () => "这是一条很长的系统消息..."
  });

  assert.match(html, new RegExp(fullBody));
  assert.doesNotMatch(html, /这是一条很长的系统消息\.\.\./);
  assert.doesNotMatch(html, /role="button"/);
});

test("system messages view renders detail action and subject", () => {
  const html = renderSystemMessageDetailView({
    id: "m1",
    title: "Review",
    body: "Needs review",
    read: false,
    action: "open-ai-inbox",
    createdAt: "2026-06-22T00:00:00.000Z"
  }, viewDeps);

  assert.match(html, /data-system-message-detail-id="m1"/);
  assert.match(html, /system-message-focus/);
  assert.match(html, /data-system-message-action="open-ai-inbox"/);
});
