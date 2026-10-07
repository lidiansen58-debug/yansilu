import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

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

for (const width of [1366, 390, 320]) {
  test(`rule form preserves draft through failure, retry and delayed list refresh at ${width}px`, async t => {
    if (process.env.RUN_BROWSER_E2E !== "1") { t.skip("Set RUN_BROWSER_E2E=1"); return; }
    const pw = await optionalPlaywright(t);
    if (!pw) return;
    const stack = await startPrototypeStack(t, pw);
    if (!stack) return;
    const { page, apiBase } = stack;
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.setViewportSize({ width, height: 844 });
    await page.locator('.rail-btn[data-module="settings"]').click();
    if (width > 920) await page.locator('[data-settings-item="automation"]').click();
    else await page.locator("#settingsMobileItemSelect").selectOption("automation");
    await page.locator('label[for="settingsAutomationTabRules"]').click();
    await page.locator(".scheduled-task-form-details > summary").click();
    await page.locator("#scheduledTaskNameInput").fill(`验收规则 ${width}`);
    await page.locator("#scheduledTaskStatusSelect").selectOption("paused");
    await page.locator("#scheduledTaskKeywordsInput").fill("隔离测试，不调用模型");
    for (const type of ["daily", "weekly", "interval", "manual_only"]) {
      await page.locator("#scheduledTaskScheduleTypeSelect").selectOption(type);
      assert.equal(await page.locator("#scheduledTaskDaySelect").isVisible(), type === "weekly");
      assert.equal(await page.locator("#scheduledTaskTimeInput").isVisible(), ["daily", "weekly"].includes(type));
      assert.equal(await page.locator("#scheduledTaskIntervalInput").isVisible(), type === "interval");
    }
    const failSave = async (route, request) => request.method() === "POST"
      ? route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: { message: "验收模拟离线" } }) }) : route.continue();
    const endpoint = `${apiBase}/api/v1/ai/scheduled-tasks*`;
    await page.route(endpoint, failSave);
    await page.locator("#btnScheduledTaskSave").click();
    await waitFor(async () => assert.match(await page.locator("#scheduledTaskForm [role=alert]").innerText(), /保存失败.*验收模拟离线/));
    assert.equal(await page.locator("#scheduledTaskNameInput").inputValue(), `验收规则 ${width}`);
    assert.equal(await page.locator("#btnScheduledTaskSave").isEnabled(), true);
    await page.unroute(endpoint, failSave);
    await page.locator("#btnScheduledTaskSave").click();
    const row = page.locator(".scheduled-task-row", { hasText: `验收规则 ${width}` });
    await row.waitFor();
    const id = await row.getAttribute("data-scheduled-task-id");
    const persisted = (await fetchJson(apiBase, `/api/v1/ai/scheduled-tasks/${id}`)).json.item;
    assert.equal(persisted.status, "paused");
    assert.equal(persisted.schedule.type, "manual_only");
    await row.locator("[data-scheduled-task-edit]").click();
    let release, entered;
    const gate = new Promise(resolve => { release = resolve; });
    const started = new Promise(resolve => { entered = resolve; });
    t.after(() => release());
    const holdList = async (route, request) => {
      if (request.method() === "GET" && new URL(request.url()).pathname === "/api/v1/ai/scheduled-tasks") { entered(); await gate; }
      await route.continue();
    };
    await page.route(endpoint, holdList);
    await page.locator("#btnScheduledTasksRefresh").click();
    await started;
    const name = page.locator("#scheduledTaskNameInput");
    await name.fill("刷新中写入的规则名称");
    await name.focus();
    await name.evaluate(node => { window.__editingRuleName = node; node.setSelectionRange(2, 5); node.dispatchEvent(new CompositionEvent("compositionstart", { bubbles: true, data: "新" })); });
    const response = page.waitForResponse(res => res.request().method() === "GET" && new URL(res.url()).pathname === "/api/v1/ai/scheduled-tasks");
    release();
    await response;
    await waitFor(async () => assert.equal(await page.locator(".scheduled-task-row").count(), 1));
    assert.deepEqual(await name.evaluate(node => ({ same: node === window.__editingRuleName, focused: node === document.activeElement, value: node.value, start: node.selectionStart, end: node.selectionEnd })),
      { same: true, focused: true, value: "刷新中写入的规则名称", start: 2, end: 5 });
    await name.evaluate(node => node.dispatchEvent(new CompositionEvent("compositionend", { bubbles: true, data: "新" })));
    await page.unroute(endpoint, holdList);
    const layout = await page.evaluate(() => {
      const stage = document.querySelector("#moduleWorkspace .module-stage");
      return { scroll: stage.scrollWidth, width: stage.clientWidth, primary: [...document.querySelectorAll('#settingsPaneAutomation .primary')].filter(node => node.getClientRects().length).length };
    });
    assert.ok(layout.scroll <= layout.width + 1, JSON.stringify(layout));
    assert.equal(layout.primary, 1);
    await fs.mkdir("output/playwright/settings-goal", { recursive: true });
    await page.screenshot({ path: `output/playwright/settings-goal/automation-rule-${width}.png` });
    await page.locator("#btnScheduledTaskSave").click();
    await waitFor(async () => assert.equal((await fetchJson(apiBase, `/api/v1/ai/scheduled-tasks/${id}`)).json.item.name, "刷新中写入的规则名称"));
    assert.deepEqual(errors, []);
  });
}

test("late sorting type refresh preserves an in-progress rule and its actual save", async t => {
  if (process.env.RUN_BROWSER_E2E !== "1") { t.skip("Set RUN_BROWSER_E2E=1"); return; }
  const pw = await optionalPlaywright(t);
  if (!pw) return;
  const stack = await startPrototypeStack(t, pw);
  if (!stack) return;
  const { page, apiBase } = stack;
  let entered = false, release;
  const gate = new Promise(resolve => { release = resolve; });
  t.after(() => release());
  await page.route(`${apiBase}/api/v1/ai/scheduled-task-templates*`, async route => {
    entered = true;
    await gate;
    const response = await route.fetch();
    const payload = await response.json();
    payload.items.push({ templateId: "acceptance_extra", name: "额外验收类型", implementationReady: true });
    await route.fulfill({ response, json: payload });
  });
  await openSettingsAutomation(page);
  await waitFor(async () => assert.equal(entered, true));
  await page.locator('label[for="settingsAutomationTabRules"]').click();
  await page.locator(".scheduled-task-form-details > summary").click();
  const name = page.locator("#scheduledTaskNameInput");
  await name.fill("整理类型加载时写的规则");
  await page.locator("#scheduledTaskStatusSelect").selectOption("paused");
  await page.locator("#scheduledTaskScheduleTypeSelect").selectOption("manual_only");
  await page.locator("#scheduledTaskKeywordsInput").fill("无需调用模型的验收范围");
  await name.focus();
  await name.evaluate(node => { window.__lateTypeName = node; node.setSelectionRange(1, 3); });
  release();
  await page.locator('#scheduledTaskTemplateSelect option[value="acceptance_extra"]').waitFor({ state: "attached" });
  await waitFor(async () => assert.equal(await page.locator("#btnScheduledTaskSave").isEnabled(), true));
  assert.deepEqual(await name.evaluate(node => ({ same: node === window.__lateTypeName, focused: node === document.activeElement, value: node.value, start: node.selectionStart, end: node.selectionEnd })),
    { same: true, focused: true, value: "整理类型加载时写的规则", start: 1, end: 3 });
  assert.equal(await page.locator("#scheduledTaskScheduleTypeSelect").inputValue(), "manual_only");
  await page.locator("#btnScheduledTaskSave").click();
  const row = page.locator(".scheduled-task-row", { hasText: "整理类型加载时写的规则" });
  await row.waitFor();
  const id = await row.getAttribute("data-scheduled-task-id");
  assert.equal((await fetchJson(apiBase, `/api/v1/ai/scheduled-tasks/${id}`)).json.item.status, "paused");
});
