import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { optionalPlaywright, startPrototypeStack, waitFor } from "./prototype-copy-test-helpers.mjs";

async function stackFor(t) {
  if (process.env.RUN_BROWSER_E2E !== "1") {
    t.skip("Set RUN_BROWSER_E2E=1 to enable browser e2e.");
    return null;
  }
  const pw = await optionalPlaywright(t);
  return pw ? startPrototypeStack(t, pw) : null;
}

async function openUpdates(page) {
  await page.locator('.rail-btn[data-module="settings"]').click();
  await page.locator('[data-settings-item="version-update"]').click();
  await page.locator("#settingsUpdateCard").waitFor({ state: "visible" });
}

async function assertCompact(page, primaryId) {
  const primary = page.locator(`#${primaryId}`);
  assert.equal(await primary.isVisible(), true, await page.locator("#settingsUpdateCard").innerHTML());
  const box = await primary.boundingBox();
  assert.ok(box.y >= 0 && box.y + box.height <= page.viewportSize().height, JSON.stringify(box));
  assert.equal(await page.locator("#settingsUpdateCard .settings-update-actions .primary:visible").count(), 1);
  const overflow = await page.evaluate(() => {
    const stage = document.querySelector("#moduleWorkspace .module-stage");
    return { page: document.documentElement.scrollWidth - innerWidth, stage: stage.scrollWidth - stage.clientWidth };
  });
  assert.ok(overflow.page <= 1 && overflow.stage <= 1, JSON.stringify(overflow));
}

test("update settings keep checking, error recovery and preferences usable on the first screen", async t => {
  const stack = await stackFor(t);
  if (!stack) return;
  const { page } = stack;
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  let mode = "current";
  let release;
  t.after(() => release?.());
  await page.route("**/api/v1/app/updates/check", async route => {
    if (route.request().method() === "OPTIONS") {
      await route.continue();
      return;
    }
    const currentMode = mode;
    if (currentMode === "failure") await new Promise(resolve => { release = resolve; });
    await route.fulfill({ status: 200, headers: { "Access-Control-Allow-Origin": "*" }, json: { item: currentMode === "failure"
      ? { status: "failed", currentVersion: "0.1.1-beta.2", error: "测试网络暂时不可用" }
      : currentMode === "available"
        ? { status: "update-available", currentVersion: "0.1.1-beta.2", latestVersion: "0.1.2", manifest: { version: "0.1.2", downloadUrl: "https://example.test/download", changelog: ["修复示例问题"] } }
        : { status: "up-to-date", currentVersion: "0.1.1-beta.2", latestVersion: "0.1.1-beta.2" }
    } });
  });
  await page.reload({ waitUntil: "networkidle" });
  await page.setViewportSize({ width: 1366, height: 768 });
  await openUpdates(page);
  const preferences = page.locator("#settingsUpdateCard details", { has: page.locator("summary", { hasText: "更新偏好" }) });
  await preferences.locator("summary").click();
  await page.locator("#settingsAutoUpdateEnabled").uncheck();
  await preferences.locator("summary").click();
  await waitFor(async () => assert.equal(await page.locator("#settingsCheckUpdate").isEnabled(), true));
  assert.equal(await page.locator("#settingsInstallUpdate").isVisible(), false);
  assert.equal(await page.locator("#settingsRelaunchUpdate").isVisible(), false);
  assert.equal(await page.locator("#settingsOpenUpdateDownload").isVisible(), false);
  assert.equal(await page.locator("#settingsUpdateLocalNotes").evaluate(node => node.open), false);
  assert.equal(await page.locator("#settingsUpdateManifestUrl").isVisible(), false);
  await assertCompact(page, "settingsCheckUpdate");
  await fs.mkdir("output/playwright/settings-goal", { recursive: true });
  await page.screenshot({ path: "output/playwright/settings-goal/update-desktop.png" });

  mode = "failure";
  await page.locator("#settingsCheckUpdate").click();
  await waitFor(async () => assert.equal(typeof release, "function"));
  assert.equal(await page.locator("#settingsCheckUpdate").isDisabled(), true);
  release();
  await waitFor(async () => assert.match(await page.locator("#settingsUpdateError").innerText(), /更新失败.*测试网络/, await page.locator("#settingsUpdateCard").innerHTML()));
  assert.equal(await page.locator("#settingsCheckUpdate").isEnabled(), true);
  assert.equal(await page.locator("#settingsUpdateError").isVisible(), true);

  mode = "available";
  await page.locator("#settingsCheckUpdate").click();
  await page.locator("#settingsOpenUpdateDownload").waitFor({ state: "visible" });
  assert.equal(await page.locator("#settingsUpdateError").isVisible(), false);
  assert.equal(await page.locator("#settingsInstallUpdate").isVisible(), false);
  assert.match(await page.locator("#settingsUpdateLatestVersion").innerText(), /0\.1\.2/);
  await page.locator("#settingsUpdateLocalNotes > summary").click();
  await preferences.locator("summary").click();
  await page.locator("#settingsRemindUpdateLater").click();
  assert.equal(await page.locator("#settingsUpdateLocalNotes").evaluate(node => node.open), true);
  await page.locator("#settingsUpdateLocalNotes > summary").click();
  await preferences.locator("summary").click();
  for (const width of [820, 390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    await assertCompact(page, "settingsOpenUpdateDownload");
    await page.screenshot({ path: `output/playwright/settings-goal/update-${width}.png` });
  }
  await page.locator("#settingsUpdateRemoteNotes > summary").focus();
  await page.keyboard.press("Enter");
  assert.equal(await page.locator("#settingsUpdateRemoteNotes").evaluate(node => node.open), true);
  assert.match(await page.locator("#settingsUpdateRemoteNotes").innerText(), /修复示例问题/);
  await page.reload({ waitUntil: "networkidle" });
  await page.setViewportSize({ width: 1366, height: 768 });
  await openUpdates(page);
  await preferences.locator("summary").click();
  assert.equal(await page.locator("#settingsAutoUpdateEnabled").isChecked(), false);
  assert.deepEqual(errors, []);
});

test("desktop update presentation preserves progress and restart without a false error", async t => {
  const stack = await stackFor(t);
  if (!stack) return;
  await openUpdates(stack.page);
  // Test synthetic native states in the actual page markup without the live app overwriting them.
  const markup = await stack.page.evaluate(() => {
    const root = document.documentElement.cloneNode(true);
    root.querySelectorAll("script").forEach(script => script.remove());
    const base = document.createElement("base");
    base.href = location.origin + "/";
    root.querySelector("head").prepend(base);
    return "<!doctype html>" + root.outerHTML;
  });
  const page = stack.page;
  await page.goto(`${stack.webBase}/health`);
  await page.setContent(markup, { waitUntil: "networkidle" });
  await fs.mkdir("output/playwright/settings-goal", { recursive: true });
  for (const phase of ["downloading", "downloaded"]) {
    for (const width of [1366, 390, 320]) {
      await page.setViewportSize({ width, height: width === 1366 ? 768 : 844 });
      await page.evaluate(async phase => {
        const { renderUpdateSettingsCard } = await import("/prototype-update-controller.js");
        const { createUpdateState, updateStateDownloaded } = await import("/update-state.js");
        const { escapeHtml } = await import("/editor-render-utils.js");
        window.__TAURI__ = { updater: { check() {} }, process: { relaunch() {} } };
        try {
          const update = createUpdateState({ status: phase, currentVersion: "0.1.1-beta.2", latestVersion: "0.1.2", installable: true, installProgress: { percent: 42 } });
          renderUpdateSettingsCard({
            $: id => document.getElementById(id), escapeHtml,
            settingsState: { update: phase === "downloaded" ? updateStateDownloaded(update, { message: "更新已下载，重启后更新。" }) : update }
          });
        } finally { delete window.__TAURI__; }
      }, phase);
      const action = phase === "downloaded" ? "settingsRelaunchUpdate" : "settingsInstallUpdate";
      await assertCompact(page, action);
      assert.equal(await page.locator("#settingsUpdateError").isVisible(), false);
      assert.equal(await page.locator("#settingsCheckUpdate").isVisible(), false);
      assert.match(await page.locator("#settingsUpdateInstallProgress").innerText(), phase === "downloaded" ? /等待重启/ : /42%/);
      await page.screenshot({ path: `output/playwright/settings-goal/update-${phase}-${width}.png` });
    }
  }
});
