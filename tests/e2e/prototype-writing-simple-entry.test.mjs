import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { optionalPlaywright, startPrototypeStack, createWritingReadyPermanentNote, fetchJson, postJson, useWritingMarkdown, waitFor } from "./prototype-copy-test-helpers.mjs";

for (const [width, initialSources] of [[1366, 0], [390, 1]]) test(`a thought becomes a saved article at ${width}px with ${initialSources} sources`, { timeout: 60000 }, async t => {
  if (process.env.RUN_BROWSER_E2E !== "1") { t.skip("Set RUN_BROWSER_E2E=1"); return; }
  const pw = await optionalPlaywright(t); if (!pw) return;
  const h = await startPrototypeStack(t, pw); if (!h) return;
  const { page, apiBase, webBase } = h;
  const created = await createWritingReadyPermanentNote(apiBase, {
    title: "用自己的话解释", body: "# 用自己的话解释\n\n自己的解释能暴露理解的空缺。", thesis: "自己的解释能暴露理解的空缺。",
    threeLineSummary: ["先用自己的话解释。", "再检查空缺。", "用于检验理解。"], boundaryOrCounterpoint: "仍要核对原文。"
  });
  const sourceId = created.json.item.id;
  await page.goto(`${webBase}/prototype`, { waitUntil: "networkidle" });
  await page.setViewportSize({ width, height: 844 });
  const errors = [], requests = [];
  page.on("pageerror", e => errors.push(e.message));
  page.on("request", r => { if (r.method() === "POST") requests.push(r.url()); });
  await page.locator('.rail-btn[data-module="writing"]').click();
  await page.locator("#btnWritingSaveThemeIndex").click();
  const title = page.locator("#writingTitle");
  await title.waitFor({ state: "visible" });
  assert.equal(await page.getByLabel("想写什么？", { exact: true }).count(), 1);
  assert.equal(await title.getAttribute("placeholder"), "写下一个问题，或一句自己的想法。");
  assert.equal(await page.locator("#writingGoal").isVisible(), false);
  assert.equal(await page.locator("#btnWritingCreateScaffold").isVisible(), false);
  assert.equal(await page.locator("#btnWritingStartManualDraft").isDisabled(), true);
  await title.fill("为什么写下来才能想清楚？");
  if (process.env.WRITING_QA_OUTPUT) {
    await fs.mkdir(process.env.WRITING_QA_OUTPUT, { recursive: true });
    await page.screenshot({ path: path.join(process.env.WRITING_QA_OUTPUT, `theme-${width}.png`), fullPage: true });
  }
  async function materials(action) {
    await page.locator('[data-writing-related-open]:visible').first().click();
    if (action === "add") {
      await page.locator("#writingCandidateDetails").evaluate(el => { el.open = true; el.dispatchEvent(new Event("toggle")); });
      await page.locator(`#writingCandidateList [data-writing-action="add"][data-writing-note-id="${sourceId}"]`).click();
    } else await page.locator(`#writingBasketList [data-writing-action="remove"][data-writing-note-id="${sourceId}"]`).click();
    await page.locator('button[data-writing-related-close]:visible').first().click();
  }
  await materials("add");
  await materials("remove");
  assert.equal(await title.isVisible(), true);
  assert.equal(await title.inputValue(), "为什么写下来才能想清楚？");
  assert.equal(await page.locator("#btnWritingStartManualDraft").isEnabled(), true);
  if (initialSources) await materials("add");
  // A failed request keeps the one input and allows a normal retry.
  await page.route("**/api/v1/writing-projects", async route => {
    if (route.request().method() === "POST") return route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ message: "temporary failure" }) });
    return route.continue();
  });
  await page.locator("#btnWritingStartManualDraft").click();
  await waitFor(async () => assert.equal(await page.locator("#btnWritingStartManualDraft").isEnabled(), true));
  assert.equal(await title.inputValue(), "为什么写下来才能想清楚？");
  await page.unroute("**/api/v1/writing-projects");
  await page.locator("#btnWritingStartManualDraft").click();
  await page.locator("#writingDraftPanel:visible").waitFor();
  await useWritingMarkdown(page);
  assert.equal(await page.locator("#writingDraftEditor").isEnabled(), true);
  const prose = "# 为什么写下来才能想清楚？\n\n这是我自己的想法，先写一段，再补材料。";
  await page.locator("#writingDraftEditor").fill(prose);
  await page.locator("#btnWritingSaveDraft").click();
  await waitFor(async () => assert.equal(await page.locator("#writingDraftSaveFeedback").textContent(), "已保存", await page.locator("#statusText").textContent()));
  let project = (await fetchJson(apiBase, "/api/v1/writing-projects?limit=50")).json.items[0];
  assert.equal(project.scaffold_id, null);
  assert.equal(project.basket_note_ids.length, initialSources);
  const projectId = project.id, draftId = project.draft_note_id;
  assert.ok(draftId);
  const saved = (await fetchJson(apiBase, `/api/v1/notes/${draftId}`)).json.item.body;
  assert.match(saved, /这是我自己的想法/);
  // Adding and removing the final source must retain the exact article body.
  if (!initialSources) await materials("add");
  await materials("remove");
  project = (await fetchJson(apiBase, `/api/v1/writing-projects/${projectId}`)).json.item;
  assert.deepEqual(project.basket_note_ids, []);
  assert.deepEqual(project.book_structure.parts, []);
  assert.equal((await fetchJson(apiBase, `/api/v1/notes/${draftId}`)).json.item.body, saved);
  assert.match(await page.locator("#writingDraftEditor").inputValue(), /这是我自己的想法/);
  // The existing theme tab still allows changing this provisional title.
  await page.locator('[data-writing-tab="theme"]').click();
  await title.fill("写下来，让想法更清楚");
  await page.locator("#btnWritingStartManualDraft").click();
  await page.locator("#writingDraftPanel:visible").waitFor();
  await page.locator("#btnWritingSaveDraft").click();
  await waitFor(async () => assert.equal(await page.locator("#writingDraftSaveFeedback").textContent(), "已保存", await page.locator("#statusText").textContent()));
  // The article remains reachable beyond the first page of stored themes.
  for (let i = 0; i < 51; i++) assert.equal((await postJson(apiBase, "/api/v1/writing-projects", {
    title: `其他写作 ${i}`, entryMode: "manual", basketNoteIds: [], bookStructure: { schema_version: 1, parts: [] }
  })).status, 201);
  await page.reload({ waitUntil: "networkidle" });
  await page.locator('.rail-btn[data-module="writing"]').click();
  await page.locator("#btnWritingExpandThemes").click();
  await page.locator("#writingThemeSearch").fill("写下来，让想法更清楚");
  const card = page.locator(`#writingThemeIndexList [data-writing-project-id="${projectId}"]`);
  await card.getByRole("button", { name: "继续写", exact: true }).click();
  await page.locator("#writingDraftPanel:visible").waitFor();
  await useWritingMarkdown(page);
  assert.match(await page.locator("#writingDraftEditor").inputValue(), /这是我自己的想法/);
  assert.equal((await fetchJson(apiBase, `/api/v1/writing-projects/${projectId}`)).json.item.draft_note_id, draftId);
  assert.equal(requests.some(url => /draft-scaffolds|\/writing\/ai-analysis/.test(url)), false);
  assert.deepEqual(errors, []);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  if (process.env.WRITING_QA_OUTPUT) {
    await fs.mkdir(process.env.WRITING_QA_OUTPUT, { recursive: true });
    await page.screenshot({ path: path.join(process.env.WRITING_QA_OUTPUT, `draft-${width}.png`), fullPage: true });
  }
});
