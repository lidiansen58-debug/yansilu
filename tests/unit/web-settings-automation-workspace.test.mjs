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

  assert.ok(html.indexOf('id="settingsAutomationSuggestionsTitle">需要确认') < html.indexOf('id="settingsAutomationTasksTitle">后台任务'));
  assert.ok(html.indexOf('id="settingsAutomationTasksTitle">后台任务') < html.indexOf('id="settingsAutomationRecentTitle">运行结果'));
  assert.match(html, /后台生成[\s\S]*人工确认[\s\S]*写入笔记/);
  assert.doesNotMatch(html, /AI 建议复核/);
  assert.doesNotMatch(html, /计划代理任务/);
});
