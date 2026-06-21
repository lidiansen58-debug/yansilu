export const SETTINGS_AUTOMATION_PANEL_IDS = Object.freeze({
  mount: "settingsAutomationWorkspaceMount",
  card: "settingsCardAutomation",
  suggestions: "settingsAiSuggestionsPanel",
  scheduledTasks: "settingsScheduledTasksPanel",
  recentRuns: "settingsAiCanonicalDebug"
});

export function renderSettingsAutomationWorkspace() {
  return `
    <section class="settings-card settings-automation-workspace" id="${SETTINGS_AUTOMATION_PANEL_IDS.card}">
      <div class="settings-automation-head">
        <div>
          <div class="settings-card-title">自动处理</div>
          <div class="settings-card-note">先看需要你确认的内容；后台任务和运行结果放在下面。</div>
        </div>
        <div class="settings-automation-flow" aria-label="自动处理流程">
          后台生成 <span></span> 人工确认 <span></span> 写入笔记
        </div>
      </div>

      <div class="settings-automation-layout">
        <section class="settings-automation-section settings-automation-primary" aria-labelledby="settingsAutomationSuggestionsTitle">
          <div class="settings-automation-section-head">
            <div>
              <div class="settings-automation-section-title" id="settingsAutomationSuggestionsTitle">需要确认</div>
              <div class="settings-automation-section-note">AI 产生的建议、关系提醒和系统提示先停在这里，由你决定是否采纳。</div>
            </div>
          </div>
          <div id="${SETTINGS_AUTOMATION_PANEL_IDS.suggestions}">
            <div class="scheduled-task-empty">暂无需要确认的内容。</div>
          </div>
        </section>

        <div class="settings-automation-side">
          <section class="settings-automation-section" aria-labelledby="settingsAutomationTasksTitle">
            <div class="settings-automation-section-head">
              <div>
                <div class="settings-automation-section-title" id="settingsAutomationTasksTitle">后台任务</div>
                <div class="settings-automation-section-note">只在需要定时运行或手动触发时打开。</div>
              </div>
            </div>
            <div id="${SETTINGS_AUTOMATION_PANEL_IDS.scheduledTasks}">
              <div class="scheduled-task-empty">暂无后台任务。</div>
            </div>
          </section>

          <section class="settings-automation-section" aria-labelledby="settingsAutomationRecentTitle">
            <div class="settings-automation-section-head">
              <div>
                <div class="settings-automation-section-title" id="settingsAutomationRecentTitle">运行结果</div>
                <div class="settings-automation-section-note">用于排查失败或确认最近一次写入。</div>
              </div>
            </div>
            <div id="${SETTINGS_AUTOMATION_PANEL_IDS.recentRuns}">
              <div class="settings-canonical-empty">还没有运行记录。</div>
            </div>
          </section>
        </div>
      </div>
    </section>
  `;
}

export function mountSettingsAutomationWorkspace(root = document) {
  const mount = root?.getElementById?.(SETTINGS_AUTOMATION_PANEL_IDS.mount);
  if (!mount) return false;
  if (mount.dataset.automationWorkspaceMounted === "true") return true;
  mount.innerHTML = renderSettingsAutomationWorkspace();
  mount.dataset.automationWorkspaceMounted = "true";
  return true;
}
