import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { createWritingReadyPermanentNote, optionalPlaywright, fetchJson, patchJson, startPrototypeStack, waitFor } from "./prototype-copy-test-helpers.mjs";
import { addWritingSupportNotes, createManualWritingTheme, findWritingProject } from "./prototype-writing-flow-helpers.mjs";

test("saved reader takeaway survives visible outline regeneration with Chinese pass copy", async t => {
  if (process.env.RUN_BROWSER_E2E !== "1") { t.skip("Set RUN_BROWSER_E2E=1"); return; }
  const playwright = await optionalPlaywright(t);
  if (!playwright) return;
  const stack = await startPrototypeStack(t, playwright);
  if (!stack) return;
  const { page, apiBase, webBase } = stack;
  const source = (await createWritingReadyPermanentNote(apiBase, {
    title: "解释之后核对", body: "# 解释之后核对\n\n解释应当回到材料核对。", thesis: "核对材料能够发现解释中的遗漏。",
    threeLineSummary: ["先尝试解释。", "再核对材料。", "根据边界调整判断。"], boundaryOrCounterpoint: "未阅读材料时先阅读。"
  })).json.item;
  const notes = await addWritingSupportNotes(apiBase, source);
  const title = "读者收获保存验收";
  await createManualWritingTheme(stack, notes, { title });
  await page.locator("#btnWritingCreateScaffold").click();
  await page.locator("#writingScaffoldPanel:visible").waitFor();
  const project = await findWritingProject(stack, notes, title);
  const original = (await fetchJson(apiBase, `/api/v1/draft-scaffolds/${project.scaffold_id}`)).json.item;
  const intent = "说明解释之后如何核对遗漏的依据。";
  const takeaway = "读者能用材料与适用条件检查自己的解释。";
  const patched = await patchJson(apiBase, `/api/v1/writing-projects/${project.id}/intent`, {
    intent, desiredReaderTakeaway: takeaway
  });
  assert.equal(patched.status, 200, JSON.stringify(patched.json));
  assert.equal(patched.json.item.desired_reader_takeaway, takeaway);
  await page.goto(`${webBase}/prototype`, { waitUntil: "networkidle" });
  await page.locator('.rail-btn[data-module="writing"]').click();
  await page.locator(`#writingThemeIndexList [data-writing-project-id="${project.id}"]`).click();
  await page.locator('[data-writing-tab="theme"]').click();
  await page.locator("#btnWritingCreateScaffold").click();
  let regenerated;
  await waitFor(async () => {
    regenerated = (await fetchJson(apiBase, `/api/v1/writing-projects/${project.id}`)).json.item;
    assert.notEqual(regenerated.scaffold_id, original.id);
  });
  await page.locator("#writingScaffoldPanel:visible").waitFor();
  assert.equal(regenerated.intent, intent);
  assert.equal(regenerated.desired_reader_takeaway, takeaway);
  const scaffold = (await fetchJson(apiBase, `/api/v1/draft-scaffolds/${regenerated.scaffold_id}`)).json.item;
  const check = scaffold.preflight.checks.find(item => item.id === "reader_takeaway");
  assert.equal(check.status, "pass");
  assert.equal(check.label, "读者收获");
  assert.equal(check.message, "读者最后应带走的判断已经明确。");
  assert.match(scaffold.markdown, /- 通过 读者收获: 读者最后应带走的判断已经明确。/);
  assert.doesNotMatch(await page.locator("#writingPanel").innerText(), /The desired reader takeaway is explicit|desired_reader_takeaway/);
  const downloaded = page.waitForEvent("download");
  await page.locator("#writingMoreMenu > summary").click();
  await page.locator("#btnWritingExportScaffold").click();
  const markdown = await fs.readFile(await (await downloaded).path(), "utf8");
  assert.ok(markdown.includes(`读者收获：${takeaway}`));
  assert.ok(markdown.includes(`写作意图：${intent}`));
  assert.doesNotMatch(markdown, /The desired reader takeaway is explicit|desired_reader_takeaway/);
  assert.equal((await fetchJson(apiBase, "/api/v1/writing-projects?limit=50")).json.items.length, 1);
  assert.deepEqual((await fetchJson(apiBase, `/api/v1/draft-scaffolds/${original.id}`)).json.item.sections, original.sections);
  for (const note of notes) assert.equal((await fetchJson(apiBase, `/api/v1/notes/${note.id}`)).json.item.body, note.body);
});