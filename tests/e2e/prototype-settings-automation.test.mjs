import test from "node:test";
import assert from "node:assert/strict";

import {
  optionalPlaywright,
  startPrototypeStack,
  waitFor
} from "./prototype-copy-test-helpers.mjs";

async function openSettingsAutomation(page) {
  await page.locator('.rail-btn[data-module="settings"]').click();
  await waitFor(async () => {
    assert.equal(await page.evaluate(() => window.__prototypeState?.module || ""), "settings");
    assert.equal(await page.locator("#settingsPanel").isVisible(), true);
  }, 5000);
  await page.evaluate(() => {
    document.querySelector('#settingsSectionNav [data-settings-section="automation"]')?.click();
  });
  await waitFor(async () => {
    assert.equal(await page.locator("#settingsNavAutomation").getAttribute("aria-pressed"), "true");
    assert.equal(await page.locator("#settingsPaneAutomation").isVisible(), true);
  }, 5000);
}

test("settings automation keeps background task form open after save failure", async (t) => {
  if (process.env.RUN_BROWSER_E2E !== "1") {
    t.skip("Set RUN_BROWSER_E2E=1 to enable browser e2e in local runs.");
    return;
  }

  const playwright = await optionalPlaywright(t);
  if (!playwright) return;

  const stack = await startPrototypeStack(t, playwright);
  if (!stack) return;
  const { apiBase, page } = stack;

  let saveAttempts = 0;
  await page.route(`${apiBase}/api/v1/ai/scheduled-tasks*`, async (route, request) => {
    if (request.method() !== "POST") return route.continue();
    saveAttempts += 1;
    await route.fulfill({
      status: 500,
      contentType: "application/json",
      body: JSON.stringify({ error: { message: "forced scheduled task save failure" } })
    });
  });

  await openSettingsAutomation(page);
  await page.locator("#settingsScheduledTasksPanel .scheduled-task-form-details > summary").click();
  await waitFor(async () => {
    assert.equal(await page.locator("#settingsScheduledTasksPanel .scheduled-task-form-details").evaluate((node) => node.open), true);
  });

  await page.locator("#scheduledTaskNameInput").fill("Failing background task");
  await page.locator("#btnScheduledTaskSave").click();

  await waitFor(async () => {
    assert.equal(saveAttempts, 1);
    assert.equal(await page.locator("#settingsScheduledTasksPanel .scheduled-task-form-details").evaluate((node) => node.open), true);
    assert.equal(await page.locator("#scheduledTaskNameInput").inputValue(), "Failing background task");
  }, 8000);
});
