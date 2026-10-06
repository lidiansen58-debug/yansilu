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

test("settings puts mobile access first and keeps help available at the end", () => {
  assert.equal(SETTINGS_SECTIONS[0].id, "workspace");
  assert.equal(normalizeSettingsSection(""), "workspace");
  assert.deepEqual(
    SETTINGS_DETAIL_ITEMS.slice(0, 3).map((item) => item.id),
    ["mobile-access", "current-vault", "import-export"]
  );
  assert.equal(SETTINGS_DETAIL_ITEMS[0].group, "手机访问");
});

test("settings opens mobile access by default", async () => {
  const appSource = await fs.readFile(
    path.resolve("apps", "web", "src", "prototype-app.js"),
    "utf8"
  );

  assert.match(appSource, /activeSection:\s*"workspace"/);
  assert.match(appSource, /activeItem:\s*"mobile-access"/);
});

test("settings support entry uses user help wording before implementation channels", () => {
  const chrome = settingsSectionChromeMap();

  assert.equal(chrome.support.badge, "问题反馈");
  assert.match(chrome.support.meta, /遇到问题先看这里/);
  assert.doesNotMatch(chrome.support.meta, /owner\/repo/);
});

test("settings help exposes a one-click Smart Notes Demo entrance", async () => {
  const html = await readPrototypeHtmlSource();
  const settingsEvents = await fs.readFile(
    path.resolve("apps", "web", "src", "settings-event-bindings.js"),
    "utf8"
  );

  assert.match(html, /遇到问题先看这里/);
  assert.match(html, /按任务找帮助/);
  assert.match(html, /研思录最核心的路径/);
  assert.match(html, /第一次打开先做什么/);
  assert.match(html, /有一条想法怎么办/);
  assert.match(html, /为什么要关联/);
  assert.match(html, /怎么开始写作/);
  assert.match(html, /如何备份和迁移/);
  assert.match(html, /手机访问适合怎么用/);
  assert.match(html, /AI 可以帮什么/);
  assert.match(html, /卡片笔记写作法示例/);
  assert.match(html, /操作要点保存在笔记正文中/);
  assert.match(html, /先记一条随笔，或选择一条已有材料整理成自己的观点/);
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
  assert.match(settingsEvents, /activateModule\("imports"\)/);
  assert.match(settingsEvents, /setSettingsItem\("mobile-access"/);
  assert.match(settingsEvents, /setSettingsItem\("ai-settings"/);
});

test("local help keeps the first screen focused on data, phone access, and moving computers", async () => {
  const html = await readPrototypeHtmlSource();

  assert.match(html, /id="settingsLocalRulesCard"/);
  assert.match(html, /你的笔记留在自己的设备上/);
  assert.match(html, /笔记在哪儿/);
  assert.match(html, /手机怎么用/);
  assert.match(html, /换电脑前做什么/);
  assert.match(html, /管理手机访问/);
  assert.match(html, /打开备份与恢复/);
  assert.match(html, /查看本地索引说明/);
  assert.match(html, /选不到文件夹或无法打开笔记库/);
});
