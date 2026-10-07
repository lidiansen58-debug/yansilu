import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { optionalPlaywright, startPrototypeStack, fetchJson, waitFor } from "./prototype-copy-test-helpers.mjs";

for (const width of [1366, 390, 320]) {
  test(`existing library reopens its own notes without importing a demo at ${width}px`, async t => {
    if (process.env.RUN_BROWSER_E2E !== "1") { t.skip("Set RUN_BROWSER_E2E=1"); return; }
    const pw = await optionalPlaywright(t);
    if (!pw) return;
    const stack = await startPrototypeStack(t, pw);
    if (!stack) return;
    const { page, apiBase, vaultPath } = stack;
    page.setDefaultTimeout(12000);
    await page.setViewportSize({ width, height: width === 1366 ? 768 : 844 });
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.locator('[data-today-action="start-first-note"]').click();
    await page.waitForFunction(() => {
      const editor = window.__prototypeEditor;
      const range = editor?.editorSelection();
      return range && editor.getEditorValue().slice(range.from, range.to) === "未命名笔记";
    });
    const id = await page.evaluate(() => window.__prototypeEditor.activeNote().id);
    const editor = page.locator("#editorHost .cm-content:visible");
    if (!await editor.isVisible()) await page.locator("#btnModeToggle").click();
    await editor.click();
    await page.keyboard.press("Control+a");
    await page.keyboard.insertText("# 我自己的阅读记录\n\n白鹭书房的一次观察：复述之后核对原文，才能发现漏掉的前提。");
    await page.keyboard.press("Control+s");
    let note;
    await waitFor(async () => {
      note = (await fetchJson(apiBase, `/api/v1/notes/${id}`)).json.item;
      assert.match(note.body, /白鹭书房/);
    });
    await page.waitForFunction(() => !window.__prototypeEditor.savingPromise);
    const file = path.join(vaultPath, note.markdownPath);
    const bytes = await fs.readFile(file);
    const otherVault = await fs.mkdtemp(path.join(os.tmpdir(), "yansilu-existing-vault-other-"));
    const openSettings = async () => {
      await page.locator('.rail-btn[data-module="settings"]').click();
      if (width === 1366) await page.locator('[data-settings-item="current-vault"]').click();
      else await page.locator("#settingsMobileItemSelect").selectOption("current-vault");
    };
    const openVault = async target => {
      await openSettings();
      await page.locator("#settingsVaultPath").fill(target);
      await page.locator("#settingsSwitchVault").click();
      await waitFor(async () => assert.equal(path.resolve((await fetchJson(apiBase, "/api/v1/vault")).json.item.vaultPath), path.resolve(target)));
      await waitFor(async () => assert.match(await page.locator("#statusText").textContent(), /已打开笔记库/));
      await waitFor(async () => assert.equal(await page.locator("[data-vault-switch-recovery]").count(), 0));
    };
    await openVault(otherVault);
    await page.locator('.rail-btn[data-module="today"]').click();
    await page.locator('[data-today-action="start-first-note"]').waitFor();
    assert.equal((await fetchJson(apiBase, "/api/v1/directories/dir_fleeting_default/notes")).json.items.length, 0);
    await openVault(vaultPath);
    await page.locator('.rail-btn[data-module="today"]').click();
    await waitFor(async () => assert.equal(await page.locator(".today-empty-home").count(), 0));
    assert.match(await page.locator("#todayOrganizingPanel").textContent(), /我自己的阅读记录/);
    const actual = (await fetchJson(apiBase, "/api/v1/directories/dir_fleeting_default/notes")).json.items;
    assert.deepEqual(actual.map(item => item.id), [id]);
    await page.locator("#btnToggleSearch").click();
    await page.locator("#globalNoteSearchInput").fill("白鹭书房");
    await page.locator(`[data-search-note="${id}"]`).click();
    await page.waitForFunction(id => window.__prototypeEditor.activeNote()?.id === id, id);
    assert.match(await page.evaluate(() => window.__prototypeEditor.getEditorValue()), /漏掉的前提/);
    assert.deepEqual(await fs.readFile(file), bytes);
    await page.reload({ waitUntil: "networkidle" });
    await page.locator('.rail-btn[data-module="today"]').click();
    await waitFor(async () => assert.equal(await page.locator(".today-empty-home").count(), 0));
    assert.match(await page.locator("#todayOrganizingPanel").textContent(), /我自己的阅读记录/);
    await page.locator("#btnToggleSearch").click();
    await page.locator("#globalNoteSearchInput").fill("白鹭书房");
    await page.locator(`[data-search-note="${id}"]`).click();
    await page.waitForFunction(id => window.__prototypeEditor.activeNote()?.id === id, id);
    assert.match(await page.evaluate(() => window.__prototypeEditor.getEditorValue()), /漏掉的前提/);
    assert.deepEqual(await fs.readFile(file), bytes);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    await fs.mkdir("output/playwright/core-existing-vault", { recursive: true });
    await page.screenshot({ path: `output/playwright/core-existing-vault/reopened-${width}.png` });
    assert.deepEqual(errors, []);
  });
}
