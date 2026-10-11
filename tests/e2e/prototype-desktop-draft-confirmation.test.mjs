import test from "node:test";
import assert from "node:assert/strict";
import { optionalPlaywright, startPrototypeStack, postJson, fetchJson, waitFor } from "./prototype-copy-test-helpers.mjs";

for (const approve of [true, false]) {
  test(`desktop draft restore uses SDK confirmation and preserves the decision (approve=${approve})`, async (t) => {
    if (process.env.RUN_BROWSER_E2E !== "1") { t.skip("Set RUN_BROWSER_E2E=1"); return; }
    const pw = await optionalPlaywright(t);
    if (!pw) return;
    const stack = await startPrototypeStack(t, pw);
    if (!stack) return;
    const { page, apiBase } = stack;
    await page.addInitScript((approve) => {
      window.confirm = async () => { throw new Error("Obsolete confirm command must not run"); };
      window.__nativeConfirmationRequests = [];
      window.__TAURI_PLUGIN_DIALOG__ = { async confirm(message, options) {
        window.__nativeConfirmationRequests.push({ message, options });
        return approve;
      } };
    }, approve);
    const result = await postJson(apiBase, "/api/v1/notes", {
      directoryId: "dir_fleeting_default", title: "桌面草稿确认验证", body: "# 桌面草稿确认验证\n\n原始正文。"
    });
    assert.equal(result.status, 201);
    const note = result.json.item;
    const open = async () => {
      await page.locator("#btnToggleSearch").click();
      await page.locator("#globalNoteSearchInput").fill(note.title);
      await page.locator(`[data-search-note="${note.id}"]`).click();
      await page.waitForFunction((id) => window.__prototypeEditor.activeNote()?.id === id, note.id);
    };
    await page.reload({ waitUntil: "networkidle" });
    await open();
    if (!await page.locator("#markdownSplit").evaluate((node) => node.classList.contains("editor-mode-source"))) {
      await page.locator("#btnModeToggle").click();
    }
    const content = page.locator("#editorHost .cm-content");
    await content.click();
    await content.press("Control+End");
    const marker = "未保存的中文草稿正文。";
    await page.keyboard.insertText(`\n\n${marker}`);
    await page.waitForFunction(({ id, marker }) => localStorage.getItem(`yansilu:draft:${id}`)?.includes(marker), { id: note.id, marker });
    assert.equal((await fetchJson(apiBase, `/api/v1/notes/${note.id}`)).json.item.body, note.body);
    await page.reload({ waitUntil: "networkidle" });
    await open();
    await waitFor(async () => assert.equal(await page.evaluate(() => window.__nativeConfirmationRequests.length), 1));
    await waitFor(async () => {
      assert.equal(await page.evaluate((marker) => window.__prototypeEditor.getEditorValue().includes(marker), marker), approve);
    });
    const request = await page.evaluate(() => window.__nativeConfirmationRequests[0]);
    assert.match(request.message, /未完成的编辑|是否恢复/);
    assert.deepEqual(request.options, { title: "研思录", okLabel: "确认", cancelLabel: "取消" });
    if (approve) {
      await page.keyboard.press("Control+s");
      await waitFor(async () => assert.match((await fetchJson(apiBase, `/api/v1/notes/${note.id}`)).json.item.body, new RegExp(marker)));
      await page.waitForFunction((id) => !localStorage.getItem(`yansilu:draft:${id}`), note.id);
    } else {
      assert.equal((await fetchJson(apiBase, `/api/v1/notes/${note.id}`)).json.item.body, note.body);
      assert.equal(await page.evaluate(({ id, marker }) => localStorage.getItem(`yansilu:draft:${id}`)?.includes(marker), { id: note.id, marker }), true);
    }
  });
}
