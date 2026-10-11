import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { optionalPlaywright, startPrototypeStack, postJson, fetchJson, waitFor } from "./prototype-copy-test-helpers.mjs";

async function fixture(t) {
  if (process.env.RUN_BROWSER_E2E !== "1") { t.skip("Set RUN_BROWSER_E2E=1"); return null; }
  const pw = await optionalPlaywright(t); if (!pw) return null;
  // Controlled native SDK boundary, not an actual installer or update download.
  const stack = await startPrototypeStack(t, pw, { beforeNavigate: page => page.addInitScript(() => {
    window.__updateStageTest = { checks: 0, downloads: 0, installs: 0, relaunches: 0, releases: [], decisions: [], prompts: [] };
    window.__TAURI__ = {
      updater: { async check() {
        window.__updateStageTest.checks++;
        let closed = false, downloaded = false;
        return { currentVersion: "0.1.1-beta.3", version: "0.1.2", body: "受控更新接口",
          async download(onEvent) {
            if (closed) throw new Error("Checking must not reuse a closed resource");
            window.__updateStageTest.downloads++;
            onEvent({ event: "Started", data: { contentLength: 100 } });
            onEvent({ event: "Progress", data: { chunkLength: 25 } });
            await new Promise(resolve => window.__updateStageTest.releases.push(resolve));
            downloaded = true; onEvent({ event: "Finished" });
          }, async install() {
            if (closed || !downloaded) throw new Error("Installation requires the retained downloaded resource");
            window.__updateStageTest.installs++;
          }, async downloadAndInstall() { throw new Error("Background download must never call combined installation"); },
          async close() { closed = true; }
        };
      } }, process: { async relaunch() { window.__updateStageTest.relaunches++; } }
    };
  }) });
  if (!stack) return null;
  const note = (await postJson(stack.apiBase, "/api/v1/notes", { directoryId: "dir_fleeting_default", body: "# 更新验收中的原始记录\n\n保存中文 café 🌿，取消更新不得改变正文。\n" })).json.item;
  const original = (await fetchJson(stack.apiBase, `/api/v1/notes/${note.id}`)).json.item;
  const bytes = await fs.readFile(path.join(stack.vaultPath, note.markdownPath));
  const preserve = async () => {
    assert.deepEqual((await fetchJson(stack.apiBase, `/api/v1/notes/${note.id}`)).json.item, original);
    assert.deepEqual(await fs.readFile(path.join(stack.vaultPath, note.markdownPath)), bytes);
  };
  return { ...stack, preserve };
}

async function openUpdates(page) {
  await page.locator('.rail-btn[data-module="settings"]').click();
  await page.locator('[data-settings-item="version-update"]').click();
}

async function finishDownload(page) {
  await page.waitForFunction(() => window.__updateStageTest.releases.length === 1);
  await page.evaluate(() => window.__updateStageTest.releases.shift()());
  await page.locator("#settingsRelaunchUpdate:visible").waitFor();
}

test("visible background update stages only; cancel leaves notes intact and explicit approval installs once", async t => {
  const h = await fixture(t); if (!h) return;
  const { page } = h;
  await openUpdates(page);
  if (await page.evaluate(() => window.__updateStageTest.downloads === 0)) await page.locator("#settingsCheckUpdate").click();
  await waitFor(async () => assert.match(await page.locator("#settingsUpdateInstallProgress").innerText(), /25%/));
  assert.equal(await page.evaluate(() => window.__updateStageTest.installs), 0);
  await finishDownload(page); await h.preserve();
  await page.evaluate(() => { window.confirm = message => new Promise(resolve => {
    window.__updateStageTest.prompts.push(message); window.__updateStageTest.decisions.push(resolve);
  }); });
  const button = page.locator("#settingsRelaunchUpdate");
  await button.click(); await page.waitForFunction(() => window.__updateStageTest.decisions.length === 1);
  await button.click();
  assert.equal(await page.evaluate(() => window.__updateStageTest.prompts.length), 1);
  assert.equal(await page.evaluate(() => window.__updateStageTest.installs), 0);
  await page.evaluate(() => window.__updateStageTest.decisions.shift()(false));
  await h.preserve();
  assert.equal(await page.evaluate(() => window.__updateStageTest.installs), 0);
  await button.click(); await page.waitForFunction(() => window.__updateStageTest.decisions.length === 1);
  assert.match(await page.evaluate(() => window.__updateStageTest.prompts.at(-1)), /安装.*重启/);
  await page.evaluate(() => window.__updateStageTest.decisions.shift()(true));
  await waitFor(async () => assert.equal(await page.evaluate(() => window.__updateStageTest.relaunches), 1));
  assert.equal(await page.evaluate(() => window.__updateStageTest.installs), 1);
  assert.equal(await page.evaluate(() => window.__updateStageTest.downloads), 1);
  await h.preserve();
});

test("page reload clears a stored update-ready flag and requires a fresh checked download", async t => {
  const h = await fixture(t); if (!h) return;
  const { page } = h;
  await openUpdates(page);
  if (await page.evaluate(() => window.__updateStageTest.downloads === 0)) await page.locator("#settingsCheckUpdate").click();
  await finishDownload(page);
  await page.reload({ waitUntil: "networkidle" }); await openUpdates(page);
  assert.equal(await page.locator("#settingsRelaunchUpdate:visible").count(), 0);
  assert.equal(await page.locator("#settingsCheckUpdate:visible").count(), 1);
  assert.equal(await page.evaluate(() => window.__updateStageTest.downloads), 0);
  await page.locator("#settingsCheckUpdate").click(); await finishDownload(page);
  assert.equal(await page.evaluate(() => window.__updateStageTest.downloads), 1);
  assert.equal(await page.evaluate(() => window.__updateStageTest.installs), 0);
  await h.preserve();
});
