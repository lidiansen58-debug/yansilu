import test from "node:test";
import assert from "node:assert/strict";
import { optionalPlaywright, startPrototypeStack, fetchJson, postJson } from "./prototype-copy-test-helpers.mjs";
import { findWritingProject } from "./prototype-writing-flow-helpers.mjs";
import { createWritingSourceFixture, captureWritingSources } from "./prototype-writing-topic-repair-flow-helpers.mjs";

test("a theme starts an article through one visible action and later resumes its existing outline without technical IDs", async t => {
  if (process.env.RUN_BROWSER_E2E !== "1") { t.skip("Set RUN_BROWSER_E2E=1"); return; }
  const pw = await optionalPlaywright(t);
  if (!pw) return;
  const stack = await startPrototypeStack(t, pw);
  if (!stack) return;
  const { page, apiBase, webBase } = stack, notes = await createWritingSourceFixture(stack), title = "从理解主题继续写";
  const created = await postJson(apiBase, "/api/v1/index-cards", { directoryId: "dir_original_default", title,
    centralQuestion: "怎样解释并核对依据，避免把表达流畅当作理解？", noteIds: notes.map(note => note.id) });
  assert.equal(created.status, 201);
  const theme = created.json.item, assertSourcesUnchanged = await captureWritingSources(stack, notes);
  let aiExecutions = 0;
  page.on("request", req => { if (req.method() === "POST" && new URL(req.url()).pathname === "/api/v1/writing/ai-analysis") aiExecutions++; });
  await page.goto(`${webBase}/prototype`, { waitUntil: "networkidle" });
  await page.locator('.rail-btn[data-module="writing"]').click();
  const card = page.locator(`[data-writing-index-card-id="${theme.id}"]`);
  assert.equal(await card.locator("button.primary").count(), 1);
  await card.getByRole("button", { name: "开始写", exact: true }).click();
  await page.locator("#writingTitle:visible").waitFor();
  assert.equal(await page.locator("#writingTitle").inputValue(), title);
  assert.deepEqual((await fetchJson(apiBase, "/api/v1/writing-projects?limit=50")).json.items, []);
  await page.locator("#btnWritingCreateScaffold").click();
  await page.locator("#writingScaffoldPanel:visible").waitFor();
  const project = await findWritingProject(stack, notes, title);
  assert.match(await page.locator("#statusText").innerText(), /提纲已生成.*编辑章节.*开始写草稿/);
  assert.doesNotMatch(await page.locator("#statusText").innerText(), /wp_|项目|scaffold/);
  const baseline = (await fetchJson(apiBase, `/api/v1/draft-scaffolds/${project.scaffold_id}`)).json.item;
  await page.goto(`${webBase}/prototype`, { waitUntil: "networkidle" });
  await page.locator('.rail-btn[data-module="writing"]').click();
  await card.getByRole("button", { name: "继续提纲", exact: true }).click();
  await page.locator("#writingScaffoldPanel:visible").waitFor();
  assert.equal((await fetchJson(apiBase, "/api/v1/writing-projects?limit=50")).json.items.length, 1);
  assert.deepEqual((await fetchJson(apiBase, `/api/v1/draft-scaffolds/${project.scaffold_id}`)).json.item, baseline);
  assert.equal((await fetchJson(apiBase, `/api/v1/writing-projects/${project.id}/scaffolds?limit=50`)).json.items.length, 1);
  await assertSourcesUnchanged(); assert.equal(aiExecutions, 0);
});