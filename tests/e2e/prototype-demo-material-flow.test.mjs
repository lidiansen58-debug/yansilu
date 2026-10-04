import test from "node:test";
import assert from "node:assert/strict";
import { optionalPlaywright, startPrototypeStack, fetchJson, waitFor } from "./prototype-copy-test-helpers.mjs";

test("pending demo fleeting and literature notes convert with source links and demo graph opens a real note", async t => {
  if (process.env.RUN_BROWSER_E2E !== "1") { t.skip("Set RUN_BROWSER_E2E=1"); return; }
  const pw = await optionalPlaywright(t);
  if (!pw) return;
  const stack = await startPrototypeStack(t, pw);
  if (!stack) return;
  const { page, apiBase, webBase } = stack;
  await page.goto(`${webBase}/prototype?demo=smart-notes-product-thinking`, { waitUntil: 'networkidle' });
  for (const id of ['FN-PHONE-CAPTURE-UNPROCESSED', 'LN-LINKING-NEEDS-REASON']) {
    const before = (await fetchJson(apiBase, `/api/v1/notes/${id}`)).json.item;
    await page.locator('#btnToggleSearch').click();
    await page.locator('#globalNoteSearchInput').fill(before.title);
    await page.locator(`[data-search-note="${id}"]`).click();
    await page.waitForFunction(id => window.__prototypeEditor.activeNote()?.id === id, id);
    await page.locator('#btnRecordPermanent').click();
    await page.locator('#permanentNoteCreate').click();
    await page.waitForFunction(id => window.__prototypeEditor.activeNote()?.id !== id && !window.__prototypeEditor.savingPromise, id);
    const permanentId = await page.evaluate(() => window.__prototypeEditor.activeNote().id);
    const permanent = (await fetchJson(apiBase, `/api/v1/notes/${permanentId}`)).json.item;
    assert.equal(permanent.noteType, 'permanent');
    assert.ok(permanent.body.includes(`[[${id}|`));
    const saved = (await fetchJson(apiBase, `/api/v1/notes/${id}`)).json.item;
    assert.ok(saved.body.includes(`[[${permanentId}|`));
    assert.ok(saved.body.includes(before.title));
  }
  await page.locator('[data-action="quick-original"]').click();
  await page.locator('.explorer-item[data-kind="folder"][data-id="dir_demo_smart_notes_product_thinking_original"]').click();
  await page.locator('.rail-btn[data-module="graph"]').click();
  const id = 'PERM-PERMANENT-NOTE-IS-JUDGMENT';
  await page.locator(`#graphCanvas .graph-map-node[data-node-id="${id}"]`).click();
  await page.locator(`.graph-selection-panel [data-open-note="${id}"]`).getByText('打开笔记', { exact: true }).click();
  await page.waitForFunction(id => window.__prototypeEditor.activeNote()?.id === id, id);
  await waitFor(async () => assert.match(await page.evaluate(() => window.__prototypeEditor.getEditorValue()), /永久笔记/));
});
