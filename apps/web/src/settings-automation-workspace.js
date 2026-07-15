export const SETTINGS_AUTOMATION_PANEL_IDS = Object.freeze({
  mount: "settingsAutomationWorkspaceMount",
  card: "settingsCardAutomation",
  suggestions: "settingsAiSuggestionsPanel",
  scheduledTasks: "settingsScheduledTasksPanel",
  recentRuns: "settingsAiCanonicalDebug"
});

export function renderSettingsAutomationWorkspace() {
  return `
    <section class="settings-card settings-automation-workspace" id="${SETTINGS_AUTOMATION_PANEL_IDS.card}" aria-label="自动整理">
      <div class="settings-automation-tabs">
        <input class="settings-automation-tab-input" id="settingsAutomationTabPending" name="settingsAutomationTab" type="radio" checked />
        <input class="settings-automation-tab-input" id="settingsAutomationTabRules" name="settingsAutomationTab" type="radio" />
        <input class="settings-automation-tab-input" id="settingsAutomationTabHistory" name="settingsAutomationTab" type="radio" />

        <div class="settings-automation-tab-list" aria-label="自动整理内容">
          <label class="settings-automation-tab" for="settingsAutomationTabPending">待处理</label>
          <label class="settings-automation-tab" for="settingsAutomationTabRules">整理规则</label>
          <label class="settings-automation-tab" for="settingsAutomationTabHistory">历史记录</label>
        </div>

        <div class="settings-automation-tab-panels">
          <section class="settings-automation-section settings-automation-panel-pending" aria-label="待处理">
            <div id="${SETTINGS_AUTOMATION_PANEL_IDS.suggestions}">
              <div class="scheduled-task-empty">现在没有待处理。</div>
            </div>
          </section>

          <section class="settings-automation-section settings-automation-panel-rules" aria-labelledby="settingsAutomationTasksTitle">
            <div class="settings-automation-section-head">
              <div>
                <div class="settings-automation-section-title" id="settingsAutomationTasksTitle">整理规则</div>
                <div class="settings-automation-section-note">设置哪些内容需要自动整理，以及什么时候整理。</div>
              </div>
            </div>
            <div id="${SETTINGS_AUTOMATION_PANEL_IDS.scheduledTasks}">
              <div class="scheduled-task-empty">暂无整理规则。</div>
            </div>
          </section>

          <section class="settings-automation-section settings-automation-panel-history" aria-labelledby="settingsAutomationRecentTitle">
            <div class="settings-automation-section-head">
              <div>
                <div class="settings-automation-section-title" id="settingsAutomationRecentTitle">历史记录</div>
                <div class="settings-automation-section-note">查看最近整理过什么；出问题时再展开细节。</div>
              </div>
            </div>
            <div id="${SETTINGS_AUTOMATION_PANEL_IDS.recentRuns}">
              <div class="settings-canonical-empty">还没有整理记录。</div>
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
