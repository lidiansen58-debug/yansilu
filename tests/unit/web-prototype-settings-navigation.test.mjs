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
  settingsItemSummary,
  settingsModuleHeaderCopy,
  settingsSectionChromeMap,
  settingsSectionConfig,
  settingsSectionGuidanceMap,
  settingsSidebarNavigationHtml
} from "../../apps/web/src/prototype-settings-navigation.js";

test("prototype settings navigation normalizes sections and items", () => {
  assert.equal(SETTINGS_SECTIONS.length, 5);
  assert.equal(SETTINGS_DETAIL_ITEMS.length, 10);
  assert.equal(normalizeSettingsSection("ai"), "ai");
  assert.equal(normalizeSettingsSection("missing"), "workspace");
  assert.equal(settingsSectionConfig("support").label, "帮助与反馈");
  assert.equal(normalizeSettingsItem("version-update"), "version-update");
  assert.equal(normalizeSettingsItem("missing"), "mobile-access");
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
    settingsAiRuntimeModeLabel: () => "只用本地模型"
  });

  assert.equal(chrome.workspace.badge, "已初始化");
  assert.equal(chrome.workspace.meta, "Main");
  assert.equal(chrome.templates.badge, "1 个草稿");
  assert.equal(chrome.ai.badge, "只用本地模型");
  assert.equal(chrome.automation.badge, "5");
  assert.equal(chrome.support.meta, "遇到问题先看这里、Demo、任务帮助");
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
  assert.match(options, /<optgroup label="工作区与数据">/);
  assert.match(options, /<option value="ai-settings">AI 设置<\/option>/);
});

test("prototype settings navigation prioritizes the vault in workspace settings", () => {
  const localItems = SETTINGS_DETAIL_ITEMS.filter((item) => item.sectionId === "workspace").map((item) => item.id);
  assert.deepEqual(localItems.slice(0, 3), ["mobile-access", "current-vault", "import-export"]);

  const html = settingsSidebarNavigationHtml();
  assert.equal(html.match(/data-settings-item="([^"]+)"/)?.[1], "mobile-access");

  const options = settingsMobileItemOptionsHtml();
  assert.equal(options.match(/<option value="([^"]+)"/)?.[1], "mobile-access");
});

test("prototype settings navigation keeps user-facing helper copy stable", () => {
  assert.equal(formatSettingsUserError("ENOENT: missing path"), "找不到当前笔记库路径，请重新选择或切换笔记库。");
  assert.equal(formatSettingsUserError("permission denied"), "当前路径没有访问权限，请检查文件夹权限后再试。");
  assert.equal(settingsModuleHeaderCopy({ settingsState: { activeItem: "feedback" } }).title, "问题反馈");
  assert.equal(settingsItemSummary("ai-settings"), "");
  assert.match(
    settingsSectionGuidanceMap({
      settingsState: { vault: { vaultPath: "/vault/main" } },
      settingsLeafLabel: () => "main",
      settingsAiOverviewSummary: () => ({ value: "日常整理" })
    }).workspace.focus,
    /main/
  );
});
