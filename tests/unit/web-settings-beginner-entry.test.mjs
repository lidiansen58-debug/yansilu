import assert from "node:assert/strict";
import test from "node:test";

import {
  SETTINGS_DETAIL_ITEMS,
  SETTINGS_SECTIONS,
  normalizeSettingsSection,
  settingsSectionChromeMap
} from "../../apps/web/src/prototype-settings-navigation.js";
import { readPrototypeHtmlSource } from "./copy-source-helpers.mjs";
import fs from "node:fs/promises";
import path from "node:path";

test("settings prioritizes the vault and groups phone access with workspace data", () => {
  assert.equal(SETTINGS_SECTIONS[0].id, "workspace");
  assert.equal(normalizeSettingsSection(""), "workspace");
  assert.deepEqual(
    SETTINGS_DETAIL_ITEMS.slice(0, 3).map((item) => item.id),
    ["current-vault", "import-export", "mobile-access"]
  );
  assert.equal(SETTINGS_DETAIL_ITEMS[2].group, "工作区与数据");
});

test("settings opens the local vault by default", async () => {
  const appSource = await fs.readFile(
    path.resolve("apps", "web", "src", "prototype-app.js"),
    "utf8"
  );

  assert.match(appSource, /activeSection:\s*"workspace"/);
  assert.match(appSource, /activeItem:\s*"current-vault"/);
});

test("settings support entry uses user help wording before implementation channels", () => {
  const chrome = settingsSectionChromeMap();

  assert.equal(chrome.support.badge, "问题反馈");
  assert.match(chrome.support.meta, /使用帮助/);
  assert.doesNotMatch(chrome.support.meta, /owner\/repo/);
});

test("settings help exposes a one-click Smart Notes Demo entrance", async () => {
  const html = await readPrototypeHtmlSource();
  const settingsEvents = await fs.readFile(
    path.resolve("apps", "web", "src", "settings-event-bindings.js"),
    "utf8"
  );

  assert.match(html, /遇到问题先看这里/);
  assert.match(html, /<summary>记录想法，整理成自己的观点<\/summary>/);
  assert.match(html, /<summary>关联笔记，发现主题<\/summary>/);
  assert.match(html, /<summary>用笔记写文章和书籍<\/summary>/);
  assert.match(html, /<summary>备份笔记，换一台电脑<\/summary>/);
  assert.match(html, /<summary>用手机随手记<\/summary>/);
  assert.match(html, /<summary>让 AI 辅助整理和写作<\/summary>/);
  assert.match(html, /卡片笔记写作法示例/);
  assert.match(html, /操作要点保存在笔记正文中/);
  assert.match(html, /先记一条随笔/);
  assert.match(html, /保留出处和原文，在“我的理解”中用自己的话说明意思/);
  assert.match(html, /创建永久笔记后，写清判断和依据，再“保存当前观点”/);
  assert.match(html, /正文链接和手动关联都会进入图谱/);
  assert.match(html, /采用草稿后仍需亲自核对、改写和确认/);
  assert.match(html, /示例只会在确认后添加/);
  assert.match(html, /id="settingsImportSmartNotesDemo"/);
  assert.match(html, /导入示例笔记与写作/);
  assert.match(settingsEvents, /data-settings-help-action/);
  assert.match(settingsEvents, /runSettingsDemoImport\(button, \{ \$, handleStateChange, setStatus \}\)/);
  const demoAction = await fs.readFile(path.resolve("apps/web/src/settings-demo-import-action.js"), "utf8");
  assert.match(demoAction, /handleStateChange\("seed-smart-notes-demo", \{ source: "settings-help" \}\)/);
  assert.match(settingsEvents, /activateModule\("today"\)/);
  assert.match(settingsEvents, /activateModule\("writing"\)/);
  assert.match(settingsEvents, /applyWritingTab\("themes"\)/);
  assert.match(settingsEvents, /activateModule\("backup"\)/);
  assert.match(settingsEvents, /setSettingsItem\("mobile-access"/);
  assert.match(settingsEvents, /setSettingsItem\("ai-settings"/);
});

test("local data troubleshooting is collapsed and does not repeat phone and backup actions", async () => {
  const html = await readPrototypeHtmlSource();

  assert.match(html, /id="settingsLocalRulesCard"/);
  assert.match(html, /你的笔记留在自己的设备上/);
  assert.match(html, /<details[^>]+id="settingsLocalRulesCard">/);
  const localHelp = html.slice(html.indexOf('id="settingsLocalRulesCard"'), html.indexOf('id="settingsFeedbackCard"'));
  assert.doesNotMatch(localHelp, /data-settings-help-action/);
  assert.match(html, /选不到文件夹或无法打开笔记库/);
});
