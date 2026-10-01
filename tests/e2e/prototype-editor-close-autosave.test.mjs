import test from "node:test";
import assert from "node:assert/strict";
import { optionalPlaywright, startPrototypeStack, postJson, fetchJson, waitFor } from "./prototype-copy-test-helpers.mjs";

for (const action of ["cancel-close", "close-other"]) {
  test(`editor autosave continues after ${action} without more typing`, async t => {
    if (process.env.RUN_BROWSER_E2E !== "1") { t.skip("Set RUN_BROWSER_E2E=1"); return; }
    const playwright = await optionalPlaywright(t);
    if (!playwright) return;
    const stack = await startPrototypeStack(t, playwright);
    if (!stack) return;
    const { page, apiBase } = stack;
    const create = async body => (await postJson(apiBase, "/api/v1/notes", {
      directoryId: "dir_fleeting_default", body
    })).json.item;
    const first = await create("# 编辑连续性\n\n原始内容。");
    const other = await create("# 另一条笔记\n\n保留内容。");
    const open = async id => {
      await page.locator("#btnToggleSearch").click();
      await page.locator(`[data-search-note="${id}"]`).click();
      await page.waitForFunction(noteId => window.__prototypeEditor?.activeNote()?.id === noteId, id);
    };
    await open(other.id);
    await open(first.id);
    if (!(await page.locator("#editorHost .cm-content").isVisible())) await page.locator("#btnModeToggle").click();
    await page.clock.install();
    const input = page.locator("#editorHost .cm-content:visible");
    await input.click();
    await page.keyboard.press("Control+End");
    await page.keyboard.insertText("\n\n取消关闭后仍应自动保存。");
    await page.waitForFunction(() => window.__prototypeEditor.activeTab()?.dirty === true);
    const expected = await page.evaluate(() => window.__prototypeEditor.getEditorValue());
    assert.match(expected, /取消关闭后仍应自动保存/);
    if (action === "cancel-close") {
      page.once("dialog", dialog => dialog.dismiss());
      await page.locator(".tab.active .tab-close").click();
    } else {
      await page.locator(`[data-close-tab="tab_${other.id}"]`).click();
    }
    await page.clock.fastForward(15001);
    await waitFor(async () => {
      const saved = (await fetchJson(apiBase, `/api/v1/notes/${first.id}`)).json.item;
      assert.equal(saved.body.trimEnd(), expected.trimEnd());
    });
    await page.waitForFunction(() => window.__prototypeEditor.activeTab()?.dirty === false);
    assert.equal(await page.evaluate(() => window.__prototypeEditor.activeNote()?.id), first.id);
    assert.equal((await fetchJson(apiBase, `/api/v1/notes/${other.id}`)).json.item.body, other.body);
    await page.clock.resume();
    await page.reload({ waitUntil: "networkidle" });
    await open(first.id);
    await page.waitForFunction(body => window.__prototypeEditor.getEditorValue().trimEnd() === body.trimEnd(), expected);
    await page.screenshot({ path: `output/note-core-autosave/${action}.png`, fullPage: true });
  });
}
