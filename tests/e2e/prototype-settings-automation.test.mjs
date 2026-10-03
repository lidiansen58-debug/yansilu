import test from "node:test";
import assert from "node:assert/strict";

import {
  optionalPlaywright,
  startPrototypeStack,
  fetchJson,
  waitFor
} from "./prototype-copy-test-helpers.mjs";

async function openSettingsAutomation(page) {
  await page.locator('.rail-btn[data-module="settings"]').click();
  await waitFor(async () => {
    assert.equal(await page.evaluate(() => window.__prototypeState?.module || ""), "settings");
    assert.equal(await page.locator("#settingsPanel").isVisible(), true);
  }, 5000);
  await page.locator('[data-settings-item="automation"]').click();
  await waitFor(async () => {
    assert.equal(await page.locator('[data-settings-item="automation"]').getAttribute("aria-pressed"), "true");
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
  await page.locator('label[for="settingsAutomationTabRules"]').click();
  await page.locator("#settingsScheduledTasksPanel .scheduled-task-form-details > summary").click();
  await waitFor(async () => {
    assert.equal(await page.locator("#settingsScheduledTasksPanel .scheduled-task-form-details").evaluate((node) => node.open), true);
  });

  await page.locator("#scheduledTaskNameInput").fill("Failing background task");
  await page.locator("#scheduledTaskKeywordsInput").fill("验收范围");
  await page.locator("#btnScheduledTaskSave").click();

  await waitFor(async () => {
    assert.equal(saveAttempts, 1);
    assert.equal(await page.locator("#settingsScheduledTasksPanel .scheduled-task-form-details").evaluate((node) => node.open), true);
    assert.equal(await page.locator("#scheduledTaskNameInput").inputValue(), "Failing background task");
  }, 8000);
});

test("settings automation creates, edits, pauses and resumes a persisted rule", async t => {
  if (process.env.RUN_BROWSER_E2E !== "1") { t.skip("Set RUN_BROWSER_E2E=1"); return; }
  const pw = await optionalPlaywright(t);
  if (!pw) return;
  const stack = await startPrototypeStack(t, pw);
  if (!stack) return;
  const { page, apiBase } = stack;
  await openSettingsAutomation(page);
  await page.locator('label[for="settingsAutomationTabRules"]').click();
  await page.locator("#settingsScheduledTasksPanel .scheduled-task-form-details > summary").click();
  await page.locator("#scheduledTaskNameInput").fill("Beta 合成整理规则");
  await page.locator("#scheduledTaskKeywordsInput").fill("Beta 合成范围");
  await page.locator("#btnScheduledTaskSave").click();
  const row = page.locator("#settingsScheduledTasksPanel .scheduled-task-row", { hasText: "Beta 合成整理规则" });
  await row.waitFor();
  const id = await row.getAttribute("data-scheduled-task-id");
  const persisted = async () => {
    const result = await fetchJson(apiBase, `/api/v1/ai/scheduled-tasks/${id}`);
    assert.equal(result.status, 200, JSON.stringify(result.json));
    return result.json.item;
  };
  assert.equal((await persisted()).status, "active");
  await row.locator('[data-scheduled-task-status="paused"]').click();
  await waitFor(async () => assert.equal((await persisted()).status, "paused"), 5000);
  await row.locator('[data-scheduled-task-status="active"]').click();
  await waitFor(async () => assert.equal((await persisted()).status, "active"), 5000);
  await row.locator("[data-scheduled-task-edit]").click();
  await page.locator("#scheduledTaskNameInput").fill("Beta 合成整理规则修改后");
  await page.locator("#btnScheduledTaskSave").click();
  await waitFor(async () => assert.equal((await persisted()).name, "Beta 合成整理规则修改后"), 5000);
  await page.reload({ waitUntil: "networkidle" });
  await openSettingsAutomation(page);
  await page.locator('label[for="settingsAutomationTabRules"]').click();
  await page.locator(`.scheduled-task-row[data-scheduled-task-id="${id}"]`, { hasText: "修改后" }).waitFor();
  assert.equal((await persisted()).status, "active");
});
