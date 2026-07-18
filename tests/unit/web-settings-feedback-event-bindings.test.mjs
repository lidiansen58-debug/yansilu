import test from "node:test";
import assert from "node:assert/strict";
import { installSettingsFeedbackEventBindings } from "../../apps/web/src/settings-feedback-event-bindings.js";

test("settings feedback opens the prepared email", async () => {
  let clickHandler = null;
  const statuses = [];
  installSettingsFeedbackEventBindings({
    $: (id) => id === "settingsOpenFeedbackEmail" ? {
      addEventListener: (_type, handler) => { clickHandler = handler; }
    } : null,
    buildFeedbackMailtoUrl: () => "mailto:lidiansen58@gmail.com?subject=feedback",
    openFeedbackMailtoUrl: async (url) => url.startsWith("mailto:"),
    setStatus: (message, tone) => statuses.push([message, tone])
  });

  await clickHandler();
  assert.deepEqual(statuses, [["已打开反馈邮件", "ok"]]);
});

test("settings feedback explains when no default mail app is available", async () => {
  let clickHandler = null;
  const statuses = [];
  installSettingsFeedbackEventBindings({
    $: (id) => id === "settingsOpenFeedbackEmail" ? {
      addEventListener: (_type, handler) => { clickHandler = handler; }
    } : null,
    openFeedbackMailtoUrl: async () => false,
    setStatus: (message, tone) => statuses.push([message, tone])
  });

  await clickHandler();
  assert.deepEqual(statuses, [["没有成功打开邮件，请确认已设置默认邮件应用", "warn"]]);
});
