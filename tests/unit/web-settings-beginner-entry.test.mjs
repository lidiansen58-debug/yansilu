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

test("settings defaults to beginner help before technical configuration", () => {
  assert.equal(SETTINGS_SECTIONS[0].id, "support");
  assert.equal(normalizeSettingsSection(""), "support");
  assert.deepEqual(
    SETTINGS_DETAIL_ITEMS.slice(0, 3).map((item) => item.id),
    ["desktop-help", "feedback", "version-update"]
  );
  assert.equal(SETTINGS_DETAIL_ITEMS[0].group, "新手帮助");
});

test("settings support entry uses user help wording before implementation channels", () => {
  const chrome = settingsSectionChromeMap({
    feedbackRepository: "owner/repo-feedback",
    feedbackRepositoryReady: true
  });

  assert.equal(chrome.support.badge, "反馈入口");
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
  assert.match(html, /第一次打开应该做什么/);
  assert.match(html, /我有一条想法，下一步怎么处理/);
  assert.match(html, /为什么要建联/);
  assert.match(html, /怎么从主题进入写作/);
  assert.match(html, /如何备份和迁移/);
  assert.match(html, /手机访问电脑笔记怎么用/);
  assert.match(html, /AI \/ Ollama 是什么，什么时候需要/);
  assert.match(html, /一键导入 Smart Notes Demo/);
  assert.match(html, /创建一套卡片笔记写作法示例数据/);
  assert.match(html, /帮助示例/);
  assert.match(html, /读“从这里开始”和“第一次使用研思录应该先做什么”/);
  assert.match(html, /Demo 里有一条故意留给你练习的待关联笔记/);
  assert.match(html, /Demo 会说明“AI 建议为什么只能作为候选”/);
  assert.match(html, /导入前会再次确认/);
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
