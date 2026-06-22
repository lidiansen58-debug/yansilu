import test from "node:test";
import assert from "node:assert/strict";
import {
  SETTINGS_DETAIL_ITEMS,
  SETTINGS_SECTIONS,
  formatSettingsUserError,
  normalizeSettingsItem,
  normalizeSettingsSection,
  settingsDetailItemConfig,
  settingsMobileItemOptionsHtml,
  settingsModuleHeaderCopy,
  settingsSectionChromeMap,
  settingsSectionConfig,
  settingsSectionGuidanceMap,
  settingsSidebarNavigationHtml
} from "../../apps/web/src/prototype-settings-navigation.js";

test("prototype settings navigation normalizes sections and items", () => {
  assert.equal(SETTINGS_SECTIONS.length, 5);
  assert.equal(SETTINGS_DETAIL_ITEMS.length, 8);
  assert.equal(normalizeSettingsSection("ai"), "ai");
  assert.equal(normalizeSettingsSection("missing"), "workspace");
  assert.equal(settingsSectionConfig("support").label, "支持");
  assert.equal(normalizeSettingsItem("version-update"), "version-update");
  assert.equal(normalizeSettingsItem("missing"), "current-vault");
  assert.equal(settingsDetailItemConfig("feedback").sectionId, "support");
});

test("prototype settings navigation derives chrome from explicit state dependencies", () => {
  const chrome = settingsSectionChromeMap({
    settingsState: {
      vault: { vaultPath: "D:\\Notes\\Main", initialized: true },
      noteTemplates: { permanent: { draftActive: true }, literature: { draftActive: false } },
      ai: {
        runtimeMode: "local_only",
        scheduledTasksTotal: 2,
        suggestionsTotal: 3
      }
    },
    settingsVaultPathMissing: () => false,
    settingsLeafLabel: (value) => String(value).split("\\").at(-1),
    settingsAiOverviewSummary: () => ({ value: "本地私密", meta: "只用本地模型 / 自动" }),
    settingsAiRuntimeModeLabel: () => "只用本地模型",
    feedbackRepository: "owner/repo",
    feedbackRepositoryReady: true
  });

  assert.equal(chrome.workspace.badge, "已初始化");
  assert.equal(chrome.workspace.meta, "Main");
  assert.equal(chrome.templates.badge, "1 个草稿");
  assert.equal(chrome.ai.badge, "只用本地模型");
  assert.equal(chrome.automation.badge, "5");
  assert.equal(chrome.support.meta, "owner/repo");
});

test("prototype settings navigation renders sidebar and mobile item options", () => {
  const html = settingsSidebarNavigationHtml({
    settingsState: { activeItem: "version-update" },
    chromeMap: { support: { badge: "GitHub", meta: "问题反馈与本地说明" } }
  });
  assert.match(html, /data-settings-item="version-update"/);
  assert.match(html, /class="settings-sidebar-menu-item is-active"/);
  assert.match(html, /版本更新/);
  assert.match(html, /问题反馈与本地说明/);

  const options = settingsMobileItemOptionsHtml();
  assert.match(options, /<optgroup label="智能">/);
  assert.match(options, /<option value="ai-settings">AI 设置<\/option>/);
});

test("prototype settings navigation keeps user-facing helper copy stable", () => {
  assert.equal(formatSettingsUserError("ENOENT: missing path"), "找不到当前笔记库路径，请重新选择或切换笔记库。");
  assert.equal(formatSettingsUserError("permission denied"), "当前路径没有访问权限，请检查文件夹权限后再试。");
  assert.equal(settingsModuleHeaderCopy({ settingsState: { activeItem: "feedback" } }).title, "问题反馈");
  assert.match(
    settingsSectionGuidanceMap({
      settingsState: { vault: { vaultPath: "/vault/main" } },
      settingsLeafLabel: () => "main",
      settingsAiOverviewSummary: () => ({ value: "日常整理" })
    }).workspace.focus,
    /main/
  );
});
