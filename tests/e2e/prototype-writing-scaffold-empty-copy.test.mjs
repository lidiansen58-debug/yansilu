import test from "node:test";
import assert from "node:assert/strict";
import { createWritingReadyPermanentNote, optionalPlaywright, fetchJson, startPrototypeStack, waitFor } from "./prototype-copy-test-helpers.mjs";
import { addWritingSupportNotes, createManualWritingTheme, findWritingProject } from "./prototype-writing-flow-helpers.mjs";

test("prototype empty outline offers a visible first-section action and preserves saved edits", async t => {
  if (process.env.RUN_BROWSER_E2E !== "1") { t.skip("Set RUN_BROWSER_E2E=1"); return; }
  const playwright = await optionalPlaywright(t);
  if (!playwright) return;
  const stack = await startPrototypeStack(t, playwright);
  if (!stack) return;
  const { page, apiBase, webBase } = stack;
  const source = (await createWritingReadyPermanentNote(apiBase, {
    title: "解释与核对", body: "# 解释与核对\n\n解释后需要回到原始材料核对依据。",
    thesis: "解释后核对材料能够发现理解中的缺口。",
    threeLineSummary: ["先写自己的解释。", "再核对原始材料。", "根据适用条件调整解释。"],
    boundaryOrCounterpoint: "这不适用于尚未阅读材料的情形。"
  })).json.item;
  const notes = await addWritingSupportNotes(apiBase, source);
  const title = "空提纲恢复验收";
  await createManualWritingTheme(stack, notes, { title });
  await page.locator("#btnWritingCreateScaffold").click();
  await page.locator("#writingScaffoldPanel:visible").waitFor();
  const project = await findWritingProject(stack, notes, title);
  const readOutline = async () => (await fetchJson(apiBase, `/api/v1/draft-scaffolds/${project.scaffold_id}`)).json.item;
  const original = await readOutline();
  assert.ok(original.sections.length > 0);
  for (let remaining = original.sections.length; remaining > 0; remaining--) {
    await page.locator('#writingScaffoldPreview [data-writing-outline-action="delete"]').last().click();
    await waitFor(async () => assert.equal((await readOutline()).sections.length, remaining - 1));
  }
  assert.match(await page.locator("#writingScaffoldPreview").innerText(), /还没有章节。/);
  const addFirst = page.getByRole("button", { name: "添加第一节", exact: true });
  assert.equal(await addFirst.isVisible(), true);
  await addFirst.click();
  const heading = page.locator('#writingScaffoldPreview [data-writing-outline-field="heading"]');
  await heading.fill("重新组织的第一节");
  await heading.press("Tab");
  await waitFor(async () => {
    const saved = await readOutline();
    assert.equal(saved.sections.length, 1);
    assert.equal(saved.sections[0].heading, "重新组织的第一节");
  });
  await page.goto(`${webBase}/prototype`, { waitUntil: "networkidle" });
  await page.locator('.rail-btn[data-module="writing"]').click();
  await page.locator(`#writingThemeIndexList [data-writing-project-id="${project.id}"]`).click();
  await page.locator("#writingScaffoldPanel:visible").waitFor();
  assert.equal(await page.locator('#writingScaffoldPreview [data-writing-outline-field="heading"]').inputValue(), "重新组织的第一节");
  assert.equal((await fetchJson(apiBase, "/api/v1/writing-projects?limit=50")).json.items.length, 1);
  for (const note of notes) assert.equal((await fetchJson(apiBase, `/api/v1/notes/${note.id}`)).json.item.body, note.body);
});
