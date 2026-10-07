import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { optionalPlaywright, startPrototypeStack, waitFor, fetchJson } from "./prototype-copy-test-helpers.mjs";

async function settingsStack(t) {
  if (process.env.RUN_BROWSER_E2E !== "1") {
    t.skip("Set RUN_BROWSER_E2E=1 to enable browser e2e.");
    return null;
  }
  const pw = await optionalPlaywright(t);
  return pw ? startPrototypeStack(t, pw) : null;
}

async function openHelp(page) {
  await page.locator('.rail-btn[data-module="settings"]').click();
  await page.locator('[data-settings-item="desktop-help"]').click();
  await page.locator("#settingsDesktopHelpCard").waitFor({ state: "visible" });
}

async function assertNoOverflow(page) {
  const sizes = await page.evaluate(() => {
    const stage = document.querySelector("#moduleWorkspace .module-stage");
    return {
      pageWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
      stageWidth: stage.clientWidth,
      stageScroll: stage.scrollWidth,
      item: document.querySelector("#settingsMobileItemSelect").value,
      overflow: [...document.querySelectorAll("#moduleWorkspace *")].filter(node => {
        const rect = node.getBoundingClientRect();
        return rect.width && rect.right > innerWidth + 1;
      }).slice(0, 8).map(node => ({ id: node.id, className: node.className, width: node.getBoundingClientRect().width }))
    };
  });
  assert.ok(sizes.scrollWidth <= sizes.pageWidth + 1, JSON.stringify(sizes));
  assert.ok(sizes.stageScroll <= sizes.stageWidth + 1, JSON.stringify(sizes));
}

test("settings prioritizes the vault, keeps all sections reachable and adapts without horizontal scrolling", async t => {
  const stack = await settingsStack(t);
  if (!stack) return;
  const { page } = stack;
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await fs.mkdir("output/playwright/settings-goal", { recursive: true });
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.locator('.rail-btn[data-module="settings"]').click();
  await page.locator("#settingsCardSwitchVault").waitFor({ state: "visible" });
  assert.equal(await page.locator('[data-settings-item="current-vault"]').getAttribute("aria-pressed"), "true");
  const bottom = await page.locator('[data-settings-item="version-update"]').boundingBox();
  assert.ok(bottom.y + bottom.height <= 768, JSON.stringify(bottom));
  await assertNoOverflow(page);
  await page.screenshot({ path: "output/playwright/settings-goal/vault-desktop.png" });
  await openHelp(page);
  const tasks = page.locator("#settingsDesktopHelpCard .settings-help-task");
  assert.equal(await tasks.count(), 7);
  assert.equal(await tasks.evaluateAll(nodes => nodes.filter(node => node.open).length), 1);
  const firstSummary = tasks.first().locator("summary");
  await firstSummary.focus();
  await page.keyboard.press("Enter");
  assert.equal(await tasks.first().evaluate(node => node.open), false);
  await page.keyboard.press("Enter");
  assert.equal(await tasks.first().evaluate(node => node.open), true);
  assert.equal(await page.locator('#settingsPaneSupport [data-settings-help-action="open-home"]').count(), 1);
  await page.screenshot({ path: "output/playwright/settings-goal/help-desktop.png" });
  await page.locator('[data-settings-item="feedback"]').click();
  assert.equal(await page.locator("#settingsLocalRulesCard").isVisible(), false);
  assert.equal(await page.locator("#settingsDesktopHelpCard").isVisible(), false);
  assert.equal(await page.locator("#settingsOpenFeedbackEmail").isVisible(), true);
  await page.screenshot({ path: "output/playwright/settings-goal/feedback-desktop.png" });

  for (const width of [820, 390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    await page.locator("#settingsMobileItemSelect").selectOption("desktop-help");
    await page.locator("#settingsDesktopHelpCard").waitFor({ state: "visible" });
    await assertNoOverflow(page);
    assert.equal(await page.locator("#settingsMobileItemSelect option").count(), 10);
    await page.screenshot({ path: `output/playwright/settings-goal/help-${width}.png` });
    await page.locator("#settingsMobileItemSelect").selectOption("current-vault");
    await assertNoOverflow(page);
    await page.screenshot({ path: `output/playwright/settings-goal/vault-${width}.png` });
    for (const item of ["import-export", "mobile-access", "permanent-template", "literature-template", "ai-settings", "automation", "feedback", "version-update"]) {
      await page.locator("#settingsMobileItemSelect").selectOption(item);
      await page.screenshot({ path: `output/playwright/settings-goal/check-${item}-${width}.png` });
      await assertNoOverflow(page);
      if (item === "automation") {
        await page.locator("#settingsAutomationTabPending").focus();
        await page.keyboard.press("ArrowRight");
        assert.equal(await page.locator("#settingsAutomationTabRules").isChecked(), true);
        assert.equal(await page.locator("#settingsScheduledTasksPanel").isVisible(), true);
        await page.keyboard.press("ArrowLeft");
      }
      if (width === 390) await page.screenshot({ path: `output/playwright/settings-goal/${item}-${width}.png` });
    }
  }
  assert.deepEqual(errors, []);
});

test("help actions open the actual task and keep local troubleshooting out of feedback and updates", async t => {
  const stack = await settingsStack(t);
  if (!stack) return;
  const { page } = stack;
  for (const [summary, action, module] of [
    ["记录想法，整理成自己的观点", "open-home", "today"],
    ["关联笔记，发现主题", "open-graph", "graph"],
    ["用笔记写文章和书籍", "open-writing", "writing"],
    ["备份笔记，换一台电脑", "open-backup", "backup"]
  ]) {
    await openHelp(page);
    const details = page.locator("#settingsDesktopHelpCard details", { has: page.locator("summary", { hasText: summary }) });
    if (!(await details.evaluate(node => node.open))) await details.locator("summary").click();
    await details.locator(`[data-settings-help-action="${action}"]`).click();
    await waitFor(async () => assert.equal(await page.evaluate(() => window.__prototypeState.module), module), 5000);
    if (action === "open-backup") assert.equal(await page.locator("#settingsCardVaultBackup").isVisible(), true);
  }
  for (const [summary, action, target] of [
    ["用手机随手记", "open-mobile-access", "settingsCardMobileAccess"],
    ["让 AI 辅助整理和写作", "open-ai-settings", "settingsCardAiSettings"]
  ]) {
    await openHelp(page);
    const details = page.locator("#settingsDesktopHelpCard details", { has: page.locator("summary", { hasText: summary }) });
    await details.locator("summary").click();
    await details.locator(`[data-settings-help-action="${action}"]`).click();
    await page.locator(`#${target}`).waitFor({ state: "visible" });
  }
  await openHelp(page);
  await page.locator("#settingsLocalRulesCard > summary").click();
  assert.match(await page.locator("#settingsLocalRulesCard").innerText(), /完整迁移请使用加密备份/);
  await page.locator('[data-settings-item="version-update"]').click();
  assert.equal(await page.locator("#settingsLocalRulesCard").isVisible(), false);
  assert.equal(await page.locator("#settingsCheckUpdate").isVisible(), true);
  await page.locator('[data-settings-item="desktop-help"]').click();
  const guide = page.locator('#settingsDesktopHelpCard a[href="./help/quick-start.html"]');
  const popupPromise = page.waitForEvent("popup");
  await guide.click();
  const popup = await popupPromise;
  await popup.waitForLoadState();
  assert.match(await popup.locator("h1").innerText(), /研思录使用指南/);
  await popup.close();
});

test("collapsed example help preserves confirmation, cancellation and ordinary-content import", async t => {
  const stack = await settingsStack(t);
  if (!stack) return;
  const { page, apiBase } = stack;
  await openHelp(page);
  const examples = page.locator("#settingsDesktopHelpCard details", { has: page.locator("summary", { hasText: "查看一套完整示例" }) });
  await examples.locator("summary").click();
  page.once("dialog", dialog => dialog.dismiss());
  await page.locator("#settingsImportSmartNotesDemo").click();
  await waitFor(async () => assert.match(await page.locator("#settingsImportSmartNotesDemoStatus").innerText(), /已取消导入/));
  assert.equal((await fetchJson(apiBase, "/api/v1/notes/NOTE-YANSILU-CONTENTS")).status, 404);
  assert.equal(await page.locator("#settingsImportSmartNotesDemo").isEnabled(), true);

  page.once("dialog", dialog => dialog.accept());
  await page.locator("#settingsImportSmartNotesDemo").click();
  await waitFor(async () => assert.equal((await fetchJson(apiBase, "/api/v1/notes/NOTE-YANSILU-CONTENTS")).status, 200), 15000);
  await waitFor(async () => assert.match(await page.locator("#settingsImportSmartNotesDemoStatus").innerText(), /示例已导入/), 15000);
  await openHelp(page);
  const writing = page.locator("#settingsDesktopHelpCard details", { has: page.locator("summary", { hasText: "用笔记写文章和书籍" }) });
  await writing.locator("summary").click();
  await writing.locator('[data-settings-help-action="open-theme-example"]').click();
  await waitFor(async () => assert.equal(await page.evaluate(() => window.__prototypeState.module), "writing"));
  assert.equal(await page.locator('[data-smart-notes-demo-guide]').count(), 0);
});
