import assert from "node:assert/strict";
import test from "node:test";

import {
  SETTINGS_DETAIL_ITEMS,
  SETTINGS_SECTIONS,
  normalizeSettingsSection,
  settingsSectionChromeMap
} from "../../apps/web/src/prototype-settings-navigation.js";

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
  assert.match(chrome.support.meta, /新手帮助/);
  assert.doesNotMatch(chrome.support.meta, /owner\/repo/);
});
