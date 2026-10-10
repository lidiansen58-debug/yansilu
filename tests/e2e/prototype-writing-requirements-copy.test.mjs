import test from "node:test";
import assert from "node:assert/strict";
import { createWritingReadyPermanentNote, optionalPlaywright, putJson, fetchJson, startPrototypeStack, waitFor } from "./prototype-copy-test-helpers.mjs";
import { addWritingSupportNotes, createManualWritingTheme, findWritingProject } from "./prototype-writing-flow-helpers.mjs";

for (const requirement of ["authorship", "originality"]) {
  test(`visible saved theme explains missing ${requirement} and resumes after confirmation`, async t => {
    if (process.env.RUN_BROWSER_E2E !== "1") { t.skip("Set RUN_BROWSER_E2E=1"); return; }
    const playwright = await optionalPlaywright(t);
    if (!playwright) return;
    const stack = await startPrototypeStack(t, playwright);
    if (!stack) return;
    const { apiBase, page, webBase } = stack;
    const created = await createWritingReadyPermanentNote(apiBase, {
      title: "写作要求入口验收", body: "# 写作要求入口验收\n\n解释后需要回到材料核对。",
      thesis: "解释后核对材料能够检验理解。",
      threeLineSummary: ["先尝试解释。", "再核对依据。", "根据适用条件调整解释。"],
      boundaryOrCounterpoint: "尚未读过材料时，需要先阅读。"
    });
    const notes = await addWritingSupportNotes(apiBase, created.json.item);
    const title = `写作要求恢复-${requirement}`;
    await createManualWritingTheme(stack, notes, { title });
    const theme = (await fetchJson(apiBase, "/api/v1/index-cards?limit=50")).json.items.find(item => item.title === title);
    assert.ok(theme?.id);
    const changed = await putJson(apiBase, `/api/v1/notes/${created.json.item.id}`, {
      status: "draft",
      authorshipConfirmed: requirement !== "authorship",
      authorship: { user_confirmed: requirement !== "authorship", ai_assisted: false }
    });
    assert.equal(changed.status, 200, JSON.stringify(changed.json));
    const note = changed.json.item;
    assert.equal(note.status, "draft", JSON.stringify(note));
    assert.equal(note.authorship?.user_confirmed, requirement !== "authorship", JSON.stringify(note));
    if (requirement === "originality") {
      await page.goto(`${webBase}/prototype`, { waitUntil: "networkidle" });
      await page.locator('.rail-btn[data-module="writing"]').click();
      await page.locator(`#writingThemeIndexList [data-writing-index-action="use"][data-writing-index-id="${theme.id}"]`).click();
      await page.setViewportSize({ width: 320, height: 844 });
    }
    await page.locator("#btnWritingCreateScaffold").click();
    await waitFor(async () => {
      const status = page.locator("#statusText");
      assert.equal(await status.isVisible(), true);
      const text = await status.innerText();
      assert.match(text, requirement === "authorship" ? /还没完成作者确认/ : /还未通过原创性检查/);
      assert.match(text, /写作要求入口验收/);
      assert.doesNotMatch(text, /authorship|originality|写作篮只接受永久笔记/);
    });
    assert.deepEqual((await fetchJson(apiBase, "/api/v1/writing-projects?limit=50")).json.items, []);
    assert.deepEqual((await fetchJson(apiBase, `/api/v1/notes/${note.id}`)).json.item, note);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
    const restored = await putJson(apiBase, `/api/v1/notes/${note.id}`, {
      status: "active", authorshipConfirmed: true, authorship: { user_confirmed: true, ai_assisted: false }
    });
    assert.equal(restored.status, 200, JSON.stringify(restored.json));
    await page.goto(`${webBase}/prototype`, { waitUntil: "networkidle" });
    await page.locator('.rail-btn[data-module="writing"]').click();
    await page.locator(`#writingThemeIndexList [data-writing-index-action="use"][data-writing-index-id="${theme.id}"]`).click();
    await page.locator("#btnWritingCreateScaffold").click();
    await page.locator("#writingScaffoldPanel:visible").waitFor();
    const project = await findWritingProject(stack, notes, title);
    assert.ok(project.scaffold_id);
    assert.equal((await fetchJson(apiBase, "/api/v1/writing-projects?limit=50")).json.items.length, 1);
    for (const source of notes) assert.equal((await fetchJson(apiBase, `/api/v1/notes/${source.id}`)).json.item.body, source.body);
  });
}
