import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

import {
  currentModuleSidebarUi
} from "../../apps/web/src/app-shell-module-ui.js";
import {
  SETTINGS_DETAIL_ITEMS,
  settingsItemSummary
} from "../../apps/web/src/prototype-settings-navigation.js";

test("rail promotes encrypted backup restore above import export", () => {
  const html = fs.readFileSync("apps/web/src/prototype.html", "utf8");
  const railEnd = html.indexOf("</aside>");
  const railHtml = html.slice(0, railEnd);

  assert.match(railHtml, /data-module="backup"/);
  assert.doesNotMatch(railHtml, /data-module="imports"/);
  assert.match(html, /id="backupPanel"/);
  assert.match(html, /id="settingsCardVaultBackup"/);
  assert.match(html, /id="settingsCardVaultRestore"/);
});

test("import export is embedded in settings instead of the rail", () => {
  const html = fs.readFileSync("apps/web/src/prototype.html", "utf8");
  const importExportItem = SETTINGS_DETAIL_ITEMS.find((item) => item.id === "import-export");

  assert.ok(importExportItem);
  assert.equal(importExportItem.sectionId, "workspace");
  assert.deepEqual(importExportItem.cardIds, ["settingsCardImportExport"]);
  assert.match(settingsItemSummary("import-export"), /import|导入|瀵煎叆/i);
  const importPanelHtml = html.slice(html.indexOf('id="importPanel"'), html.indexOf('id="backupPanel"'));
  const importExportCardHtml = html.slice(html.indexOf('id="settingsCardImportExport"'), html.indexOf('id="settingsCardMobileAccess"'));

  assert.match(importExportCardHtml, /id="settingsCardImportExport"/);
  assert.match(importExportCardHtml, /id="importPageMount"/);
  assert.doesNotMatch(html, /id="settingsOpenImportExport"/);
  assert.doesNotMatch(importPanelHtml, /id="importPageMount"/);
});

test("legacy imports route is redirected into settings", () => {
  const appSource = fs.readFileSync("apps/web/src/prototype-app.js", "utf8");

  assert.match(appSource, /normalizedModule === "imports"/);
  assert.match(appSource, /state\.module = "settings"/);
  assert.match(appSource, /settingsState\.activeItem = "import-export"/);
});

test("backup module has direct chrome", () => {
  const ui = currentModuleSidebarUi({ module: "backup", rootName: "notes" });

  assert.ok(ui.title);
  assert.match(ui.summary, /backup|encrypt|鍔犲瘑|备份|加密/i);
  assert.ok(ui.sidebarHtml);
});
