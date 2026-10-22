import assert from "node:assert/strict";
import fs from "node:fs/promises";
import test from "node:test";
import { createWritingReadyPermanentNote, fetchJson, optionalPlaywright, postJson, startPrototypeStack } from "./prototype-copy-test-helpers.mjs";

function deferred() {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
}

for (const width of [1366, 390]) test(`leaving home-to-theme navigation ignores its late fetched theme at ${width}px`, { timeout: 45000 }, async t => {
  if (process.env.RUN_BROWSER_E2E !== "1") { t.skip("Set RUN_BROWSER_E2E=1"); return; }
  const pw = await optionalPlaywright(t); if (!pw) return;
  const stack = await startPrototypeStack(t, pw); if (!stack) return;
  const { page, apiBase, webBase } = stack;
  page.setDefaultTimeout(12000);
  await page.setViewportSize({ width, height: 900 });
  const note = (await createWritingReadyPermanentNote(apiBase, {
    title: "解释之后还要核对依据", body: "# 解释之后还要核对依据\n\n自己的解释可能遗漏前提，需要回到材料检查。",
    thesis: "用自己的话解释后核对材料，可以发现遗漏的前提。",
    threeLineSummary: ["先尝试解释。", "再核对材料。", "发现遗漏后修改判断。"],
    boundaryOrCounterpoint: "材料本身不可靠时，还需要检查其他依据。"
  })).json.item;
  const pending = await postJson(apiBase, "/api/v1/notes", {
    directoryId: "dir_fleeting_default", title: "还未整理的阅读问题", body: "# 还未整理的阅读问题\n\n解释时为什么会忽略前提？"
  });
  assert.equal(pending.status, 201, JSON.stringify(pending.json));
  const created = await postJson(apiBase, "/api/v1/index-cards", {
    directoryId: "dir_original_default", indexType: "topic", title: "首页迟到主题不应覆盖设置",
    centralQuestion: "如何检查解释中遗漏的前提？",
    items: [{ noteId: note.id, shortLabel: "解释与核对", rationale: "这条判断回答了主题问题。" }]
  });
  assert.equal(created.status, 201, JSON.stringify(created.json));
  const theme = created.json.item;
  await page.goto(`${webBase}/prototype`, { waitUntil: "networkidle" });
  const home = page.locator("#todayOrganizingPanel");
  const pathToggle = home.locator('[data-today-secondary-tab="path"]');
  await pathToggle.click();
  assert.equal(await pathToggle.getAttribute("aria-expanded"), "true");
  await fs.mkdir("output/core-flow-clarity-20261022", { recursive: true });
  await page.screenshot({ path: `output/core-flow-clarity-20261022/home-${width}.png`, fullPage: true });
  const openTheme = home.locator('[data-today-secondary-panel="path"] [data-today-action="open-first-theme"]');
  await openTheme.waitFor({ state: "visible" });

  const blocked = deferred(), release = deferred(), fulfilled = deferred();
  t.after(() => release.resolve());
  let intercepted = false;
  const detailPath = `/api/v1/index-cards/${theme.id}`;
  await page.route(`**${detailPath}`, async route => {
    if (intercepted || route.request().method() !== "GET") return route.continue();
    intercepted = true;
    const response = await route.fetch();
    assert.equal(response.status(), 200);
    assert.equal((await response.json()).item.id, theme.id);
    blocked.resolve();
    await release.promise;
    await route.fulfill({ response });
    fulfilled.resolve();
  });
  await openTheme.click();
  await blocked.promise;
  const shell = page.locator("#writingPanel .writing-shell");
  const tabBeforeLeaving = await shell.getAttribute("data-writing-active-tab");
  assert.equal(await page.locator(`#writingThemeIndexList [data-writing-index-card-id="${theme.id}"].selected`).count(), 0);
  await page.locator('.rail-btn[data-module="settings"]').click();
  await page.locator("#settingsPanel:visible").waitFor();
  const lateResponse = page.waitForResponse(response => new URL(response.url()).pathname === detailPath && response.status() === 200);
  release.resolve();
  await Promise.all([fulfilled.promise, lateResponse]);
  await page.waitForLoadState("networkidle");
  assert.equal(await page.locator('.rail-btn[data-module="settings"]').getAttribute("class").then(value => value.split(/\s+/).includes("active")), true);
  assert.equal(await page.locator("#settingsPanel").isVisible(), true);
  assert.equal(await page.locator("#writingPanel").isVisible(), false);
  assert.equal(await shell.getAttribute("data-writing-active-tab"), tabBeforeLeaving, "a late home continuation must not change the writing tab");
  assert.equal(await page.locator(`#writingThemeIndexList [data-writing-index-card-id="${theme.id}"].selected`).count(), 0);
  assert.equal(await page.locator("#writingThemeDetailTitle").count(), 0);

  // Re-enter through the real rail. The late response must not have left an
  // invisible selection that becomes active when writing is opened again.
  await page.locator('.rail-btn[data-module="writing"]').click();
  await page.locator("#writingEmptyTopic:visible").waitFor();
  assert.equal(await page.locator(`#writingThemeIndexList [data-writing-index-card-id="${theme.id}"]`).count(), 1);
  assert.equal(await page.locator("#writingThemeIndexList .selected").count(), 0);
  assert.equal(await page.locator("#writingThemeDetailTitle").count(), 0);
  assert.equal(await page.locator("#writingWorkbenchActive").isVisible(), false);
  assert.equal(await page.locator("#writingWorkspaceTitle").innerText(), "写作");
  assert.deepEqual((await fetchJson(apiBase, detailPath)).json.item, theme);
  assert.equal((await fetchJson(apiBase, "/api/v1/writing-projects?limit=50")).json.items.length, 0);
});

test("direct writing theme request cannot revive selection after a settings roundtrip at 1366px", { timeout: 45000 }, async t => {
  if (process.env.RUN_BROWSER_E2E !== "1") { t.skip("Set RUN_BROWSER_E2E=1"); return; }
  const pw = await optionalPlaywright(t); if (!pw) return;
  const stack = await startPrototypeStack(t, pw); if (!stack) return;
  const { page, apiBase, webBase } = stack;
  page.setDefaultTimeout(12000);
  const note = (await createWritingReadyPermanentNote(apiBase, {
    title: "主题选择请求属于发起时的页面", body: "# 主题选择请求属于发起时的页面\n\n离开后再返回，也不应恢复已经取消的主题选择。",
    thesis: "离开写作页面会取消当时发起但尚未返回的主题选择。",
    threeLineSummary: ["先打开主题。", "离开时取消选择意图。", "返回后保持新的页面状态。"],
    boundaryOrCounterpoint: "仍停留在同一次页面访问时，可以提交返回的主题。"
  })).json.item;
  const created = await postJson(apiBase, "/api/v1/index-cards", {
    directoryId: "dir_original_default", indexType: "topic", title: "写作往返后不恢复旧主题",
    centralQuestion: "如何避免旧请求在新一次页面访问中提交？",
    items: [{ noteId: note.id, shortLabel: "导航意图", rationale: "区分发起时与返回后的写作页面。" }]
  });
  assert.equal(created.status, 201, JSON.stringify(created.json));
  const theme = created.json.item;
  await page.goto(`${webBase}/prototype`, { waitUntil: "networkidle" });
  await page.locator('.rail-btn[data-module="writing"]').click();
  const themeCard = page.locator(`#writingThemeIndexList [data-writing-index-card-id="${theme.id}"]`);
  await themeCard.waitFor({ state: "visible" });
  assert.equal(await themeCard.evaluate(el => el.classList.contains("selected")), false);

  const blocked = deferred(), release = deferred(), fulfilled = deferred();
  t.after(() => release.resolve());
  let intercepted = false;
  const detailPath = `/api/v1/index-cards/${theme.id}`;
  await page.route(`**${detailPath}`, async route => {
    if (intercepted || route.request().method() !== "GET") return route.continue();
    intercepted = true;
    const response = await route.fetch();
    assert.equal(response.status(), 200);
    assert.equal((await response.json()).item.id, theme.id);
    blocked.resolve();
    await release.promise;
    await route.fulfill({ response });
    fulfilled.resolve();
  });
  // Card text goes through direct selection, without the home caller's guard
  // or the card button's separate writing-entry controller.
  await themeCard.locator(".writing-note-title").click();
  await blocked.promise;
  await page.locator('.rail-btn[data-module="settings"]').click();
  await page.locator("#settingsPanel:visible").waitFor();
  await page.locator('.rail-btn[data-module="writing"]').click();
  await page.locator("#writingEmptyTopic:visible").waitFor();
  const shell = page.locator("#writingPanel .writing-shell");
  const tabOnReturn = await shell.getAttribute("data-writing-active-tab");
  const lateResponse = page.waitForResponse(response => new URL(response.url()).pathname === detailPath && response.status() === 200);
  release.resolve();
  await Promise.all([fulfilled.promise, lateResponse]);
  await page.waitForLoadState("networkidle");
  assert.equal(await page.locator('.rail-btn[data-module="writing"]').evaluate(el => el.classList.contains("active")), true);
  assert.equal(await page.locator("#writingEmptyTopic").isVisible(), true);
  assert.equal(await page.locator("#writingWorkbenchActive").isVisible(), false);
  assert.equal(await page.locator("#writingThemeIndexList .selected").count(), 0);
  assert.equal(await page.locator("#writingThemeDetailTitle").count(), 0);
  assert.equal(await page.locator("#writingWorkspaceTitle").innerText(), "写作");
  assert.equal(await shell.getAttribute("data-writing-active-tab"), tabOnReturn, "a prior page visit cannot overwrite the returned page's tab");
  assert.deepEqual((await fetchJson(apiBase, detailPath)).json.item, theme);
  assert.equal((await fetchJson(apiBase, "/api/v1/writing-projects?limit=50")).json.items.length, 0);
});
