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
  assert.match(html, /一键导入 Smart Notes Demo/);
  assert.match(html, /导入一套可试错样例/);
  assert.match(html, /空库先导入 Demo；已有资料先选文件夹；只想记录就写第一条随笔/);
  assert.match(html, /关联不是为了图好看/);
  assert.match(html, /结果可编辑、可忽略，确认后才保存/);
  assert.match(html, /Demo 只会在你确认后导入/);
  assert.match(html, /id="settingsImportSmartNotesDemo"/);
  assert.match(html, /导入示例库 \/ 体验 Demo/);
  assert.match(settingsEvents, /data-settings-help-action/);
  assert.match(settingsEvents, /handleStateChange\("seed-smart-notes-demo", \{ source: "settings-help" \}\)/);
  assert.match(settingsEvents, /activateModule\("today"\)/);
  assert.match(settingsEvents, /activateModule\("writing"\)/);
  assert.match(settingsEvents, /applyWritingTab\("themes"\)/);
  assert.match(settingsEvents, /activateModule\("imports"\)/);
  assert.match(settingsEvents, /setSettingsItem\("mobile-access"/);
  assert.match(settingsEvents, /setSettingsItem\("ai-settings"/);
});
