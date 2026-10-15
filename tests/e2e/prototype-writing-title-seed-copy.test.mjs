import test from "node:test";
import assert from "node:assert/strict";
import { optionalPlaywright, startPrototypeStack, fetchJson } from "./prototype-copy-test-helpers.mjs";
import { createManualWritingTheme, findWritingProject } from "./prototype-writing-flow-helpers.mjs";
import { createWritingSourceFixture, captureWritingSources } from "./prototype-writing-topic-repair-flow-helpers.mjs";

test("the article title starts from its theme without a project suffix and preserves the user's rename on resume", async t => {
  if (process.env.RUN_BROWSER_E2E !== "1") { t.skip("Set RUN_BROWSER_E2E=1"); return; }
  const pw = await optionalPlaywright(t);
  if (!pw) return;
  const stack = await startPrototypeStack(t, pw);
  if (!stack) return;
  const { page, apiBase, webBase } = stack, notes = await createWritingSourceFixture(stack), title = "第一章 怎样检验理解";
  await createManualWritingTheme(stack, notes, { title });
  const assertSourcesUnchanged = await captureWritingSources(stack, notes);
  assert.equal(await page.getByLabel("文章题目", { exact: true }).inputValue(), title);
  assert.equal(await page.locator("#writingWorkspaceTitle").innerText(), title);
  assert.equal(await page.getByText(title, { exact: true }).filter({ visible: true }).count(), 1);
  assert.doesNotMatch(await page.locator("#writingPanel").innerText(), /写作项目|未命名写作项目|第一章 怎样检验理解 项目/);
  const renamed = "理解检验：第一版";
  await page.getByLabel("文章题目", { exact: true }).fill(renamed);
  await page.locator("#btnWritingCreateScaffold").click();
  await page.locator("#writingScaffoldPanel:visible").waitFor();
  const project = await findWritingProject(stack, notes, renamed);
  assert.equal(await page.locator("#writingWorkspaceTitle").innerText(), renamed);
  await page.goto(`${webBase}/prototype`, { waitUntil: "networkidle" });
  await page.locator('.rail-btn[data-module="writing"]').click();
  const card = page.locator(`[data-writing-index-card-id="${project.related_index_ids[0]}"]`);
  assert.match(await card.innerText(), new RegExp(title));
  await card.locator(`button[data-writing-project-id="${project.id}"]`).click();
  await page.locator("#writingScaffoldPanel:visible").waitFor();
  assert.equal(await page.locator("#writingWorkspaceTitle").innerText(), renamed);
  await page.locator('[data-writing-tab="theme"]').click();
  assert.equal(await page.getByLabel("文章题目", { exact: true }).inputValue(), renamed);
  assert.equal((await fetchJson(apiBase, `/api/v1/index-cards/${project.related_index_ids[0]}`)).json.item.title, title);
  assert.equal((await fetchJson(apiBase, "/api/v1/writing-projects?limit=50")).json.items.length, 1);
  await assertSourcesUnchanged();
});