import test from "node:test";
import assert from "node:assert/strict";

import {
  SETTINGS_AUTOMATION_PANEL_IDS,
  renderSettingsAutomationWorkspace
} from "../../apps/web/src/settings-automation-workspace.js";

test("settings automation workspace keeps user task hierarchy and stable mount points", () => {
  const html = renderSettingsAutomationWorkspace();

  assert.match(html, new RegExp(`id="${SETTINGS_AUTOMATION_PANEL_IDS.card}"`));
  assert.match(html, new RegExp(`id="${SETTINGS_AUTOMATION_PANEL_IDS.suggestions}"`));
  assert.match(html, new RegExp(`id="${SETTINGS_AUTOMATION_PANEL_IDS.scheduledTasks}"`));
  assert.match(html, new RegExp(`id="${SETTINGS_AUTOMATION_PANEL_IDS.recentRuns}"`));

  assert.ok(html.indexOf('id="settingsAutomationSuggestionsTitle">待处理') < html.indexOf('id="settingsAutomationTasksTitle">整理规则'));
  assert.ok(html.indexOf('id="settingsAutomationTasksTitle">整理规则') < html.indexOf('id="settingsAutomationRecentTitle">历史记录'));
  assert.match(html, /待处理[\s\S]*整理规则[\s\S]*历史记录/);
  assert.doesNotMatch(html, /当前状态/);
  assert.doesNotMatch(html, /AI 建议复核/);
  assert.doesNotMatch(html, /计划代理任务/);
  assert.doesNotMatch(html, /后台任务/);
});
