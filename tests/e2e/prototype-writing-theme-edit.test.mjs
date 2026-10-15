import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { optionalPlaywright, startPrototypeStack, postJson, fetchJson, patchJson, createWritingReadyPermanentNote } from "./prototype-copy-test-helpers.mjs";

async function setup(t, { mobile = 0 } = {}) {
  if (process.env.RUN_BROWSER_E2E !== "1") { t.skip("Set RUN_BROWSER_E2E=1 to enable browser e2e."); return; }
  const playwright = await optionalPlaywright(t);
  if (!playwright) return;
  const stack = await startPrototypeStack(t, playwright);
  if (!stack) return;
  const { apiBase } = stack;
  const page = mobile ? await (await stack.page.context().browser().newContext({ viewport: { width: mobile, height: 844 }, isMobile: true, hasTouch: true })).newPage() : stack.page;
  if (mobile) await page.goto(`${stack.webBase}/prototype`, { waitUntil: "networkidle" });
  const notes = [];
  for (let i = 0; i < 3; i++) {
    const result = await createWritingReadyPermanentNote(apiBase, {
      title: `主题编辑材料 ${i + 1}`, body: `# 材料 ${i + 1}\n\n保留这段原文。`, thesis: "用自己的话解释有助于检查理解。",
      threeLineSummary: ["用自己的话解释。", "暴露理解中的空缺。", "适用于学习复盘。"], boundaryOrCounterpoint: "不能替代实践。"
    });
    notes.push(result.json.item);
  }
  const created = await postJson(apiBase, "/api/v1/index-cards", {
    directoryId: "dir_original_default", indexType: "topic", title: "学习与理解", centralQuestion: "如何检查理解？",
    summary: "从复述中检查理解。", thesis: "解释能检验理解。", threeLineSummary: ["旧观点", "旧原因", "旧用途"],
    items: notes.map((note, i) => ({ noteId: note.id, shortLabel: note.title, rationale: `原始用途 ${i + 1}`, order: i + 1 }))
  });
  assert.equal(created.status, 201, JSON.stringify(created.json));
  const theme = created.json.item;
  const noteFiles = new Map(await Promise.all(notes.map(async note => [note.markdownPath, await fs.readFile(path.join(stack.vaultPath, note.markdownPath))])));
  const project = await postJson(apiBase, "/api/v1/writing-projects", {
    title: "已有文章", goal: "保留文章原来的问题。", basketNoteIds: notes.map(note => note.id), relatedIndexIds: [theme.id]
  });
  assert.equal(project.status, 201, JSON.stringify(project.json));
  await page.locator('.rail-btn[data-module="writing"]').click();
  const card = page.locator(`[data-writing-index-card-id="${theme.id}"]`);
  await card.waitFor();
  return { ...stack, page, theme, card, noteFiles };
}

async function assertSourcesUnchanged(stack) {
  const card = (await fetchJson(stack.apiBase, `/api/v1/index-cards/${stack.theme.id}`)).json.item;
  assert.deepEqual(card.items, stack.theme.items);
  for (const [file, bytes] of stack.noteFiles) assert.deepEqual(await fs.readFile(path.join(stack.vaultPath, file)), bytes);
}

test("theme metadata can be edited from a visible action without changing member notes or writing projects", async t => {
  const stack = await setup(t);
  if (!stack) return;
  const { page, apiBase, card, theme } = stack;
  const projects = (await fetchJson(apiBase, "/api/v1/writing-projects?limit=20")).json.items;
  await card.getByRole("button", { name: "编辑主题", exact: true }).click({ timeout: 6000 });
  const dialog = page.getByRole("dialog", { name: "编辑主题", exact: true });
  assert.equal(await dialog.getByLabel("主题名称", { exact: true }).inputValue(), theme.title);
  await dialog.getByLabel("想回答的问题", { exact: true }).fill("解释为什么能检查理解？");
  await dialog.getByText("观点与概括", { exact: true }).click();
  await dialog.getByLabel("核心观点", { exact: true }).fill("复述会暴露理解空缺。");
  for (let i = 1; i <= 3; i++) await dialog.getByLabel(`概括 ${i}`, { exact: true }).fill(`新概括 ${i}`);
  await dialog.getByRole("button", { name: "保存", exact: true }).click();
  await dialog.waitFor({ state: "hidden" });
  const saved = (await fetchJson(apiBase, `/api/v1/index-cards/${theme.id}`)).json.item;
  assert.equal(saved.central_question, "解释为什么能检查理解？");
  assert.equal(saved.thesis, "复述会暴露理解空缺。");
  assert.deepEqual(saved.three_line_summary, ["新概括 1", "新概括 2", "新概括 3"]);
  assert.deepEqual((await fetchJson(apiBase, "/api/v1/writing-projects?limit=20")).json.items, projects);
  await assertSourcesUnchanged(stack);
  await page.reload({ waitUntil: "networkidle" });
  await page.locator('.rail-btn[data-module="writing"]').click();
  await page.locator(`[data-writing-index-card-id="${theme.id}"]`).getByRole("button", { name: "编辑主题", exact: true }).click();
  assert.equal(await dialog.getByLabel("想回答的问题", { exact: true }).inputValue(), saved.central_question);
  await dialog.getByRole("button", { name: "取消", exact: true }).click();
});

test("conflicting theme saves keep typed input and never overwrite the newer question", async t => {
  const stack = await setup(t);
  if (!stack) return;
  const { page, apiBase, theme, card } = stack;
  await card.getByRole("button", { name: "编辑主题", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "编辑主题", exact: true });
  await dialog.getByLabel("想回答的问题", { exact: true }).fill("我正在修改的问题");
  const latest = await patchJson(apiBase, `/api/v1/index-cards/${theme.id}`, { centralQuestion: "另一次操作保存的新问题" });
  assert.equal(latest.status, 200);
  await dialog.getByRole("button", { name: "保存", exact: true }).click();
  await dialog.getByRole("alert").waitFor();
  assert.match(await dialog.getByRole("alert").textContent(), /输入已保留/);
  assert.equal(await dialog.getByLabel("想回答的问题", { exact: true }).inputValue(), "我正在修改的问题");
  assert.equal((await fetchJson(apiBase, `/api/v1/index-cards/${theme.id}`)).json.item.central_question, latest.json.item.central_question);
  await dialog.getByRole("button", { name: "取消", exact: true }).click();
  await card.getByRole("button", { name: "编辑主题", exact: true }).click();
  assert.equal(await dialog.getByLabel("想回答的问题", { exact: true }).inputValue(), latest.json.item.central_question);
  await dialog.press("Escape");
  await assertSourcesUnchanged(stack);
});

for (const width of [390, 320]) test(`a touch theme form keeps actions reachable, traps focus and supports valid empty metadata (${width})`, async t => {
  const stack = await setup(t, { mobile: width });
  if (!stack) return;
  const { page, apiBase, theme, card } = stack;
  await card.getByRole("button", { name: "编辑主题", exact: true }).tap();
  const dialog = page.getByRole("dialog", { name: "编辑主题", exact: true });
  await dialog.getByLabel("主题名称", { exact: true }).press("Shift+Tab");
  assert.equal(await dialog.getByRole("button", { name: "保存", exact: true }).evaluate(el => el === document.activeElement), true);
  await page.keyboard.press("Tab");
  assert.equal(await dialog.getByLabel("主题名称", { exact: true }).evaluate(el => el === document.activeElement), true);
  assert.equal(await dialog.getByLabel("核心观点", { exact: true }).isVisible(), false);
  assert.equal(await dialog.locator("button.primary").count(), 1);
  await fs.mkdir("output/playwright/theme-edit", { recursive: true });
  await page.screenshot({ path: `output/playwright/theme-edit/theme-edit-collapsed-${width}.png` });
  await dialog.getByLabel("想回答的问题", { exact: true }).fill("");
  await dialog.getByText("观点与概括", { exact: true }).click();
  await dialog.getByLabel("核心观点", { exact: true }).fill("");
  for (let i = 1; i <= 3; i++) await dialog.getByLabel(`概括 ${i}`, { exact: true }).fill("");
  await dialog.getByLabel("概括 1", { exact: true }).fill("不完整的概括");
  await dialog.getByRole("button", { name: "保存", exact: true }).click();
  assert.match(await dialog.getByRole("alert").textContent(), /三条概括/);
  assert.equal((await fetchJson(apiBase, `/api/v1/index-cards/${theme.id}`)).json.item.updated_at, theme.updated_at);
  await dialog.getByLabel("概括 1", { exact: true }).fill("");
  for (const name of ["取消", "保存"]) {
    const rect = await dialog.getByRole("button", { name, exact: true }).boundingBox();
    assert.ok(rect.height >= 44 && rect.x >= 0 && rect.x + rect.width <= width && rect.y + rect.height <= 844);
  }
  await fs.mkdir("output/playwright/theme-edit", { recursive: true });
  await page.screenshot({ path: `output/playwright/theme-edit/theme-edit-${width}.png` });
  await dialog.getByRole("button", { name: "保存", exact: true }).tap();
  await dialog.waitFor({ state: "hidden" });
  const saved = (await fetchJson(apiBase, `/api/v1/index-cards/${theme.id}`)).json.item;
  assert.equal(saved.central_question, "");
  assert.equal(saved.thesis, "");
  assert.deepEqual(saved.three_line_summary, []);
  await assertSourcesUnchanged(stack);
});

test("theme cancel and composing Escape leave saved metadata intact", async t => {
  const stack = await setup(t);
  if (!stack) return;
  const { page, theme, card, apiBase } = stack;
  await card.getByRole("button", { name: "编辑主题", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "编辑主题", exact: true });
  await dialog.getByLabel("主题名称", { exact: true }).fill("   ");
  await dialog.getByRole("button", { name: "保存", exact: true }).click();
  assert.match(await dialog.getByRole("alert").textContent(), /填写主题名称/);
  await dialog.getByLabel("主题名称", { exact: true }).fill("放弃的修改");
  await dialog.getByLabel("主题名称", { exact: true }).evaluate(el => {
    el.dispatchEvent(new CompositionEvent("compositionstart", { bubbles: true }));
    el.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", isComposing: true, bubbles: true }));
  });
  assert.equal(await dialog.isVisible(), true);
  await dialog.getByLabel("主题名称", { exact: true }).evaluate(el => el.dispatchEvent(new CompositionEvent("compositionend", { bubbles: true })));
  await dialog.press("Escape");
  await dialog.waitFor({ state: "hidden" });
  assert.equal(await card.getByRole("button", { name: "编辑主题", exact: true }).evaluate(el => el === document.activeElement), true);
  assert.deepEqual((await fetchJson(apiBase, `/api/v1/index-cards/${theme.id}`)).json.item, theme);
});

test("a late theme read cannot open a modal on another page", async t => {
  const stack = await setup(t);
  if (!stack) return;
  const { page, card, theme, apiBase } = stack;
  let release, markRead;
  const held = new Promise(resolve => { release = resolve; }), reading = new Promise(resolve => { markRead = resolve; });
  t.after(() => release());
  await page.route(`**/api/v1/index-cards/${theme.id}`, async route => {
    if (route.request().method() !== "GET") return route.continue();
    markRead(); await held; await route.continue();
  });
  await card.getByRole("button", { name: "编辑主题", exact: true }).click();
  await reading;
  await page.locator('.rail-btn[data-module="graph"]').click();
  const response = page.waitForResponse(res => res.url().endsWith(`/api/v1/index-cards/${theme.id}`) && res.request().method() === "GET");
  release(); await (await response).finished();
  await page.waitForFunction(() => !document.querySelector('[data-writing-index-action="edit"]')?.disabled);
  assert.equal(await page.getByRole("dialog", { name: "编辑主题", exact: true }).count(), 0);
  assert.equal(await page.locator('.rail-btn[data-module="graph"]').getAttribute("class").then(value => value.includes("active")), true);
  assert.deepEqual((await fetchJson(apiBase, `/api/v1/index-cards/${theme.id}`)).json.item, theme);
});

test("pending theme saves reject duplicate submits and restore focus after the response", async t => {
  const stack = await setup(t);
  if (!stack) return;
  const { page, card, theme } = stack;
  let release, markWrite, writes = 0;
  const held = new Promise(resolve => { release = resolve; }), writing = new Promise(resolve => { markWrite = resolve; });
  t.after(() => release());
  await page.route(`**/api/v1/index-cards/${theme.id}`, async route => {
    if (route.request().method() !== "PATCH") return route.continue();
    writes++;
    const payload = route.request().postDataJSON();
    assert.equal(payload.expectedVaultPath, stack.vaultPath);
    assert.equal(payload.expectedUpdatedAt, theme.updated_at);
    const response = await route.fetch(); markWrite(); await held; await route.fulfill({ response });
  });
  await card.getByRole("button", { name: "编辑主题", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "编辑主题", exact: true });
  await dialog.getByLabel("想回答的问题", { exact: true }).fill("等待保存的问题");
  await dialog.getByRole("button", { name: "保存", exact: true }).click();
  await writing;
  assert.equal(await dialog.getByRole("button", { name: "正在保存…", exact: true }).isDisabled(), true);
  assert.equal(await dialog.getByRole("button", { name: "取消", exact: true }).isDisabled(), true);
  await dialog.locator("form").evaluate(form => { for (let i = 0; i < 3; i++) form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })); });
  await page.keyboard.press("Escape");
  assert.equal(await dialog.isVisible(), true);
  release();
  await dialog.waitFor({ state: "hidden" });
  assert.equal(writes, 1);
  assert.equal(await card.getByRole("button", { name: "编辑主题", exact: true }).evaluate(el => el === document.activeElement), true);
  await assertSourcesUnchanged(stack);
});
