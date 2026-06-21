import test from "node:test";
import assert from "node:assert/strict";

import { settingsSectionChromeMap } from "../../apps/web/src/prototype-settings-navigation.js";

test("workspace settings badge distinguishes missing vault paths from pending sync", () => {
  const missingPath = settingsSectionChromeMap({
    settingsState: {
      vault: { vaultPath: "D:\\Notes\\Missing", initialized: true }
    },
    settingsVaultPathMissing: () => true,
    settingsLeafLabel: () => "Missing"
  }).workspace;

  const pendingInit = settingsSectionChromeMap({
    settingsState: {
      vault: { vaultPath: "D:\\Notes\\Main", initialized: false }
    },
    settingsVaultPathMissing: () => false,
    settingsLeafLabel: (value) => String(value).split("\\").at(-1)
  }).workspace;

  const pendingSync = settingsSectionChromeMap({
    settingsState: { vault: null },
    settingsVaultPathMissing: () => false,
    settingsLeafLabel: () => "unused"
  }).workspace;

  assert.equal(missingPath.badge, "路径失效");
  assert.equal(missingPath.meta, "当前路径失效，请重新选择");
  assert.equal(pendingInit.badge, "待初始化");
  assert.equal(pendingInit.meta, "Main");
  assert.equal(pendingSync.badge, "待同步");
  assert.equal(pendingSync.meta, "选择或切换笔记库");
});
