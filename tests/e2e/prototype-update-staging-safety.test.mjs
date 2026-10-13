import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { optionalPlaywright, startPrototypeStack, postJson, fetchJson, waitFor } from "./prototype-copy-test-helpers.mjs";

async function fixture(t, { controlledVersionFailure = false } = {}) {
  if (process.env.RUN_BROWSER_E2E !== "1") { t.skip("Set RUN_BROWSER_E2E=1"); return null; }
  const pw = await optionalPlaywright(t); if (!pw) return null;
  // Controlled native SDK boundary, not an actual installer or update download.
  let armVersionFailure = false, versionHeld = false, releaseVersionFailure;
  const versionGate = new Promise(resolve => { releaseVersionFailure = resolve; });
  t.after(() => releaseVersionFailure());
  const stack = await startPrototypeStack(t, pw, { beforeNavigate: async page => {
    if (controlledVersionFailure) await page.addInitScript(() => {
      localStorage.setItem('yansilu:update:settings:v1', JSON.stringify({autoCheckEnabled:false}));
    });
    await page.addInitScript(() => {
    window.__updateStageTest = { checks: 0, downloads: 0, installs: 0, relaunches: 0, releases: [], decisions: [], prompts: [], checkReleases: [], pauseNextCheck: false };
    window.__TAURI__ = {
      // The updater mock also needs a usable desktop service boundary. A partial
      // native global otherwise makes all frontend API requests unavailable.
      core: {async invoke(command) {
        if (command === 'get_desktop_api_base') return window.__API_BASE__;
        if (['get_desktop_service_status', 'wait_for_desktop_api_ready', 'get_desktop_api_status'].includes(command)) {
          const health = await (await fetch(`${window.__API_BASE__}/health`)).json();
          if (!health.ready) throw new Error('Controlled API service is not ready');
          const serviceStatus = {overall:'healthy', vaultPath:health.vaultPath,
            services:{api:{status:'healthy', baseUrl:window.__API_BASE__}}};
          return command === 'get_desktop_api_status'
            ? {running:true, baseUrl:window.__API_BASE__, vaultPath:health.vaultPath, serviceStatus} : serviceStatus;
        }
        throw new Error(`Unsupported controlled desktop command: ${command}`);
      }},
      updater: { async check() {
        window.__updateStageTest.checks++;
        if (window.__updateStageTest.pauseNextCheck) {
          window.__updateStageTest.pauseNextCheck = false;
          await new Promise(resolve => window.__updateStageTest.checkReleases.push(resolve));
        }
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
    });
    if (controlledVersionFailure) await page.route('**/api/v1/app/version', async route => {
      if (!armVersionFailure || versionHeld) return route.continue();
      versionHeld = true;
      await versionGate;
      await route.fulfill({status:500, json:{error:{code:'CONTROLLED_VERSION_FAILURE', message:'controlled late version query failure'}}});
    });
  } });
  if (!stack) return null;
  const note = (await postJson(stack.apiBase, "/api/v1/notes", { directoryId: "dir_fleeting_default", body: "# 更新验收中的原始记录\n\n保存中文 café 🌿，取消更新不得改变正文。\n" })).json.item;
  const original = (await fetchJson(stack.apiBase, `/api/v1/notes/${note.id}`)).json.item;
  const bytes = await fs.readFile(path.join(stack.vaultPath, note.markdownPath));
  const preserve = async () => {
    assert.deepEqual((await fetchJson(stack.apiBase, `/api/v1/notes/${note.id}`)).json.item, original);
    assert.deepEqual(await fs.readFile(path.join(stack.vaultPath, note.markdownPath)), bytes);
  };
  return { ...stack, preserve, armVersionFailure: () => { armVersionFailure = true; },
    versionHeld: () => versionHeld, releaseVersionFailure };
}

async function updateFailureSnapshot(page) {
  return page.evaluate(() => {
    const stored = JSON.parse(localStorage.getItem('yansilu:update:last-result:v1') || '{}');
    const button = document.querySelector('#settingsRelaunchUpdate');
    const ancestors = [];
    for (let node = button; node; node = node.parentElement) {
      const style = getComputedStyle(node);
      if (style.display === 'none' || node.hidden) ancestors.push({id:node.id, display:style.display, hidden:node.hidden});
    }
    return {module:window.__prototypeState.module, startupPending:window.__prototypeState.appStartupPending,
      startupFailed:!!window.__prototypeState.appStartupError, status:stored.status, ready:stored.installReadyForRestart,
      invisibleAncestors:ancestors, checks:window.__updateStageTest.checks, downloads:window.__updateStageTest.downloads,
      installs:window.__updateStageTest.installs, relaunches:window.__updateStageTest.relaunches};
  });
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
  const clickRelaunch = async () => {
    try { await button.click(); }
    catch (error) {
      try { t.diagnostic(JSON.stringify({stage:'update-relaunch-click-failure', state:await updateFailureSnapshot(page)})); } catch {}
      throw error;
    }
  };
  await clickRelaunch(); await page.waitForFunction(() => window.__updateStageTest.decisions.length === 1);
  await clickRelaunch();
  assert.equal(await page.evaluate(() => window.__updateStageTest.prompts.length), 1);
  assert.equal(await page.evaluate(() => window.__updateStageTest.installs), 0);
  await page.evaluate(() => window.__updateStageTest.decisions.shift()(false));
  await h.preserve();
  assert.equal(await page.evaluate(() => window.__updateStageTest.installs), 0);
  await clickRelaunch(); await page.waitForFunction(() => window.__updateStageTest.decisions.length === 1);
  assert.match(await page.evaluate(() => window.__updateStageTest.prompts.at(-1)), /安装.*重启/);
  await page.evaluate(() => window.__updateStageTest.decisions.shift()(true));
  await waitFor(async () => assert.equal(await page.evaluate(() => window.__updateStageTest.relaunches), 1));
  assert.equal(await page.evaluate(() => window.__updateStageTest.installs), 1);
  assert.equal(await page.evaluate(() => window.__updateStageTest.downloads), 1);
  await h.preserve();
});

test('a late failed version query keeps the staged update visible after cancellation and installs only after new approval', async t => {
  const h = await fixture(t, {controlledVersionFailure:true}); if (!h) return;
  const {page} = h;
  await openUpdates(page);
  h.armVersionFailure();
  await page.locator('#settingsCheckUpdate').click();
  await waitFor(() => assert.equal(h.versionHeld(), true));
  await page.locator('#settingsCheckUpdate').click();
  await finishDownload(page);
  await page.evaluate(() => { window.confirm = message => new Promise(resolve => {
    window.__updateStageTest.prompts.push(message); window.__updateStageTest.decisions.push(resolve);
  }); });
  await page.locator('#settingsRelaunchUpdate').click();
  await page.waitForFunction(() => window.__updateStageTest.decisions.length === 1);
  await page.evaluate(() => window.__updateStageTest.decisions.shift()(false));
  await h.preserve();
  await page.evaluate(() => { window.__updateStageTest.pauseNextCheck = true; });
  h.releaseVersionFailure();
  await page.waitForFunction(() => window.__updateStageTest.checkReleases.length === 1);
  const captured = await updateFailureSnapshot(page);
  assert.equal(captured.ready, true, JSON.stringify(captured));
  assert.equal(await page.locator('#settingsRelaunchUpdate').isVisible(), true, JSON.stringify(captured));
  assert.equal(captured.downloads, 1); assert.equal(captured.installs, 0); assert.equal(captured.relaunches, 0);
  await page.evaluate(() => window.__updateStageTest.checkReleases.shift()());
  await waitFor(async () => assert.match(await page.locator('#settingsUpdateStatusBadge').innerText(), /已下载/));
  await page.locator('#settingsRelaunchUpdate').click();
  await page.waitForFunction(() => window.__updateStageTest.decisions.length === 1);
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
