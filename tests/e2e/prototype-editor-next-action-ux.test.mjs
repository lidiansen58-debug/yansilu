import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { optionalPlaywright, startPrototypeStack, fetchJson, waitFor } from "./prototype-copy-test-helpers.mjs";

for (const width of [1366, 390, 320]) {
  test(`saved material keeps its real next action reachable without duplicate floating hints (${width}px)`, async t => {
    if (process.env.RUN_BROWSER_E2E !== "1") { t.skip("Set RUN_BROWSER_E2E=1"); return; }
    const pw = await optionalPlaywright(t);
    if (!pw) return;
    const stack = await startPrototypeStack(t, pw);
    if (!stack) return;
    const { page, apiBase, vaultPath } = stack;
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    page.setDefaultTimeout(10000);
    await page.setViewportSize({ width, height: 900 });
    const assertNoHints = async () => assert.equal(await page.locator("#editorHelper, #saveAiSuggestion").count(), 0);
    await assertNoHints();
    await page.locator('[data-today-action="start-first-note"]').click();
    await page.waitForFunction(() => window.__prototypeEditor.activeNote());
    const sourceId = await page.evaluate(() => window.__prototypeEditor.activeNote().id);
    if (!await page.locator("#editorHost .cm-content:visible").isVisible()) await page.locator("#btnModeToggle").click();
    await page.locator("#editorHost .cm-content:visible").click();
    await page.keyboard.press("Control+a");
    await page.keyboard.insertText("# 解释后的阅读记录\n\n合上书试着解释一个观点，再对照材料，才发现漏掉的条件。\n");
    await page.keyboard.press("Control+s");
    await waitFor(async () => assert.match((await fetchJson(apiBase, `/api/v1/notes/${sourceId}`)).json.item.body, /漏掉的条件/));
    await page.waitForFunction(() => !window.__prototypeEditor.savingPromise);
    await assertNoHints();
    const next = page.locator("#btnRecordPermanent");
    assert.equal(await next.isVisible(), true);
    assert.equal(await next.isEnabled(), true);
    assert.equal(await next.locator("span").isVisible(), true);
    assert.equal(await next.locator("span").innerText(), "创建永久笔记");
    assert.equal(await next.evaluate(button => getComputedStyle(button).backgroundColor), "rgb(15, 118, 110)");
    assert.equal(await page.locator("#btnDistillSourceAi").evaluate(button => getComputedStyle(button).backgroundColor), "rgb(255, 255, 255)");
    assert.ok(await next.evaluate(button => {
      const r = button.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && r.x >= 0 && r.right <= innerWidth + 1
        && button.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2));
    }), "The real next action must not be covered or pushed offscreen");
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    await fs.mkdir("output/playwright/core-next-action", { recursive: true });
    await page.screenshot({ path: `output/playwright/core-next-action/saved-${width}.png`, fullPage: true });
    await next.click();
    await page.locator("#permanentNoteCreate").click();
    await page.waitForFunction(id => window.__prototypeEditor.activeNote()?.id !== id, sourceId);
    const permanentId = await page.evaluate(() => window.__prototypeEditor.activeNote().id);
    await waitFor(async () => assert.equal((await fetchJson(apiBase, `/api/v1/notes/${permanentId}`)).json.item.noteType, "permanent"));
    const permanent = (await fetchJson(apiBase, `/api/v1/notes/${permanentId}`)).json.item;
    assert.equal(permanent.title, "解释后的阅读记录");
    assert.match(permanent.body, new RegExp(sourceId));
    assert.match(await fs.readFile(path.join(vaultPath, permanent.markdownPath), "utf8"), /合上书/);
    await page.reload({ waitUntil: "networkidle" });
    await assertNoHints();
    assert.deepEqual(errors, []);
  });
}
