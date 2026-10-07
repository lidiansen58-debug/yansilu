import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { optionalPlaywright, startPrototypeStack, fetchJson, waitFor } from "./prototype-copy-test-helpers.mjs";

async function createRecord(page, title) {
  await page.waitForFunction(() => {
    const editor = window.__prototypeEditor;
    const selection = editor?.editorSelection();
    return selection && editor.getEditorValue().slice(selection.from, selection.to) === "未命名笔记";
  });
  const id = await page.evaluate(() => window.__prototypeEditor.activeNote().id);
  if (!await page.locator("#editorHost .cm-content:visible").isVisible()) await page.locator("#btnModeToggle").click();
  await page.locator("#editorHost .cm-content:visible").click();
  await page.keyboard.press("Control+a");
  await page.keyboard.insertText(`# ${title}\n\n一条自己的观察。\n`);
  await page.keyboard.press("Control+s");
  await page.waitForFunction(() => !window.__prototypeEditor.savingPromise);
  return id;
}

test("directory toggles show real empty and populated content without changing the selected note", async t => {
  if (process.env.RUN_BROWSER_E2E !== "1") { t.skip("Set RUN_BROWSER_E2E=1"); return; }
  const pw = await optionalPlaywright(t);
  if (!pw) return;
  const stack = await startPrototypeStack(t, pw);
  if (!stack) return;
  const { page, apiBase } = stack;
  page.setDefaultTimeout(10000);
  await page.locator('[data-action="quick-fleeting"]').click();
  await page.locator("#btnOpenNewBoxDialog").click();
  await page.locator("#modalBoxName").fill("观察记录");
  await page.locator("#modalParentFolder").selectOption("dir_fleeting_default");
  await page.locator("#modalCreate").click();
  await page.locator("#newBoxModal").waitFor({ state: "hidden" });
  const row = page.locator('#listArea .explorer-item[data-kind="folder"]', { hasText: "观察记录" });
  const directoryId = await row.getAttribute("data-id");
  const toggle = page.locator(`#listArea button[data-toggle-folder="${directoryId}"]`);
  if (await toggle.getAttribute("aria-expanded") !== "true") await toggle.click();
  await page.locator(`[data-empty-folder="${directoryId}"]`).waitFor();
  await toggle.click();
  assert.equal(await toggle.getAttribute("aria-expanded"), "false");
  assert.equal(await page.locator(`[data-empty-folder="${directoryId}"]`).count(), 0);
  await toggle.click();
  await page.locator(`[data-empty-folder="${directoryId}"]`).waitFor();
  await row.click();
  await page.locator("#btnNewNote").click();
  const noteId = await createRecord(page, "检查目录展开");
  await waitFor(async () => assert.equal((await fetchJson(apiBase, `/api/v1/notes/${noteId}`)).json.item.directoryId, directoryId));
  const file = page.locator(`#listArea .explorer-item[data-kind="file"][data-id="${noteId}"]`);
  await file.waitFor();
  await toggle.click();
  assert.equal(await toggle.getAttribute("aria-expanded"), "false");
  assert.equal(await file.count(), 0);
  assert.equal(await page.evaluate(() => window.__prototypeEditor.activeNote().id), noteId);
  await toggle.click();
  await file.waitFor();
  await file.click();
  assert.match(await page.evaluate(() => window.__prototypeEditor.getEditorValue()), /检查目录展开/);
  await toggle.focus();
  await page.keyboard.press("Enter");
  assert.equal(await toggle.getAttribute("aria-expanded"), "false");
  assert.equal(await page.evaluate(() => document.activeElement?.dataset.toggleFolder), directoryId, "Keyboard toggle must retain focus after rendering the directory tree");
  await page.keyboard.press("Space");
  assert.equal(await toggle.getAttribute("aria-expanded"), "true");
  await fs.mkdir("output/playwright/core-assets", { recursive: true });
  await page.screenshot({ path: "output/playwright/core-assets/directory-expanded.png", fullPage: true });
});

for (const width of [1366, 390, 320]) {
  test(`real image upload, preview, failure retry and keyboard dialog (${width}px)`, async t => {
    if (process.env.RUN_BROWSER_E2E !== "1") { t.skip("Set RUN_BROWSER_E2E=1"); return; }
    const pw = await optionalPlaywright(t);
    if (!pw) return;
    const stack = await startPrototypeStack(t, pw);
    if (!stack) return;
    const { page, apiBase, vaultPath } = stack;
    page.setDefaultTimeout(10000);
    await page.setViewportSize({ width, height: 900 });
    const output = "output/playwright/core-assets";
    await fs.mkdir(output, { recursive: true });
    try {
      await page.locator('[data-today-action="start-first-note"]').click();
      const noteId = await createRecord(page, "图片核对记录");
      if (width === 390) {
        await page.locator("#btnModeToggle").click();
        await page.locator('#wysiwygHost [contenteditable="true"]:visible').click();
      } else {
        await page.locator("#editorHost .cm-content:visible").click();
      }
      await page.keyboard.press("Control+End");
      const bytes = await fs.readFile("apps/web/src/assets/icons/icon-256.png");
      const fileChooser = page.waitForEvent("filechooser");
      const uploadResponse = page.waitForResponse(response => response.url().endsWith("/api/v1/assets") && response.request().method() === "POST");
      uploadResponse.catch(() => {});
      await page.locator("#btnInsertImage").click();
      await (await fileChooser).setFiles({ name: "观察 图像 (原图).png", mimeType: "image/png", buffer: bytes });
      const response = await uploadResponse;
      assert.equal(response.status(), 201);
      const asset = (await response.json()).item;
      assert.deepEqual(await fs.readFile(path.join(vaultPath, asset.assetPath)), bytes);
      await page.waitForFunction(() => !window.__prototypeEditor.assetUploadPending);
      await page.keyboard.press("Control+s");
      await waitFor(async () => assert.match((await fetchJson(apiBase, `/api/v1/notes/${noteId}`)).json.item.body, /观察 图像/));
      await page.waitForFunction(() => !window.__prototypeEditor.savingPromise);
      if (await page.locator("#editorHost .cm-content:visible").isVisible()) await page.locator("#btnModeToggle").click();
      const inline = page.locator("#wysiwygHost img:visible").first();
      await inline.waitFor();
      await waitFor(async () => assert.ok(await inline.evaluate(img => img.complete && img.naturalWidth > 0)));
      const src = await inline.getAttribute("src");
      assert.equal((await page.request.get(src)).status(), 200);
      await inline.click();
      const preview = page.locator("#assetPreviewMask:not(.hidden)");
      await preview.waitFor();
      await waitFor(async () => assert.equal(await preview.locator("img.asset-preview-image").evaluate(img => img.complete && img.naturalWidth), 256));
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      await page.screenshot({ path: `${output}/image-loaded-${width}.png`, fullPage: true });
      assert.equal(await preview.getAttribute("role"), "dialog");
      assert.equal(await preview.getAttribute("aria-modal"), "true");
      assert.ok(await preview.evaluate(el => el.contains(document.activeElement)), "Opening preview must move focus into the dialog");
      assert.ok(await preview.locator("#btnCloseAssetPreview").evaluate(el => {
        const rect = el.getBoundingClientRect();
        return rect.width >= 44 && rect.height >= 44 && el.contains(document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2));
      }), "Close must be touch-sized and not occluded by navigation");
      const mode = await page.evaluate(() => window.__prototypeState.previewMode);
      await page.keyboard.press("Control+2");
      await page.keyboard.press("Control+s");
      assert.equal(await page.evaluate(() => window.__prototypeState.previewMode), mode, "Preview shortcuts cannot change the background editor");
      for (let step = 0; step < 6; step++) {
        await page.keyboard.press("Tab");
        assert.ok(await preview.evaluate(el => el.contains(document.activeElement)), "Tab cannot leave the preview");
      }
      await page.keyboard.press("Escape");
      await page.locator("#assetPreviewMask").waitFor({ state: "hidden" });
      assert.ok(await page.locator("#wysiwygHost").evaluate(el => el.contains(document.activeElement)), "Closing preview returns focus to its editor");
      await page.route("**/api/v1/assets/file?**", route => route.fulfill({ status: 503, body: "Image service unavailable" }));
      await inline.click();
      await preview.getByRole("button", { name: "重新加载", exact: true }).waitFor();
      assert.match(await preview.textContent(), /图片未能加载/);
      assert.ok(await preview.locator("img.asset-preview-image").evaluate(img => img.hidden));
      assert.ok(await preview.getByRole("button", { name: "重新加载", exact: true }).evaluate(el => {
        const rect = el.getBoundingClientRect();
        return rect.height >= 44 && el.contains(document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2));
      }), "Retry must be visible and reachable above the sidebar");
      await page.screenshot({ path: `${output}/image-failed-${width}.png`, fullPage: true });
      await page.unroute("**/api/v1/assets/file?**");
      await preview.getByRole("button", { name: "重新加载", exact: true }).click();
      await waitFor(async () => assert.ok(await preview.locator("img.asset-preview-image").evaluate(img => !img.hidden && img.naturalWidth === 256)));
      await preview.locator("#btnCloseAssetPreview").click();
      await page.locator("#assetPreviewMask").waitFor({ state: "hidden" });
      assert.match((await fetchJson(apiBase, `/api/v1/notes/${noteId}`)).json.item.body, /观察 图像/);
    } catch (error) {
      await page.screenshot({ path: `${output}/failure-${width}.png`, fullPage: true });
      throw error;
    }
  });
}

for (const change of ["switch-note", "edit-body", "switch-vault"]) {
  test(`a delayed real upload cannot replace a changed editor context (${change})`, { timeout: 45000 }, async t => {
    if (process.env.RUN_BROWSER_E2E !== "1") { t.skip("Set RUN_BROWSER_E2E=1"); return; }
    const pw = await optionalPlaywright(t);
    if (!pw) return;
    const stack = await startPrototypeStack(t, pw);
    if (!stack) return;
    const { page, apiBase, vaultPath } = stack;
    page.setDefaultTimeout(10000);
    await page.locator('[data-today-action="start-first-note"]').click();
    const sourceId = await createRecord(page, "图片上传源");
    const sourceRecord = (await fetchJson(apiBase, `/api/v1/notes/${sourceId}`)).json.item;
    const sourceBefore = sourceRecord.body;
    const sourceBytes = await fs.readFile(path.join(vaultPath, sourceRecord.markdownPath));
    await page.locator("#btnNewNote").click();
    const otherId = await createRecord(page, "另一条独立记录");
    const otherBefore = (await fetchJson(apiBase, `/api/v1/notes/${otherId}`)).json.item.body;
    await page.locator(`#listArea .explorer-item[data-kind="file"][data-id="${sourceId}"]`).click();
    await page.waitForFunction(id => window.__prototypeEditor.activeNote()?.id === id, sourceId);
    if (!await page.locator("#editorHost .cm-content:visible").isVisible()) await page.locator("#btnModeToggle").click();
    await page.locator("#editorHost .cm-content:visible").click();
    await page.keyboard.press("Control+a");
    let release;
    const gate = new Promise(resolve => { release = resolve; });
    let asset;
    await page.route("**/api/v1/assets", async route => {
      const response = await route.fetch();
      asset = (await response.json()).item;
      await gate;
      await route.fulfill({ response });
    });
    try {
      const picker = page.waitForEvent("filechooser");
      await page.locator("#btnInsertImage").click();
      const bytes = await fs.readFile("apps/web/src/assets/icons/icon-256.png");
      await (await picker).setFiles({ name: "等待中的图片.png", mimeType: "image/png", buffer: bytes });
      await waitFor(() => assert.ok(asset?.assetPath));
      let expectedBody, expectedNoteId;
      if (change === "switch-vault") {
        const nextVault = path.join(vaultPath, "next-empty-vault");
        await fs.mkdir(nextVault);
        await page.locator('.rail-btn[data-module="settings"]').click();
        await page.locator("#settingsVaultPath").fill(nextVault);
        await page.locator("#settingsSwitchVault").click();
        await waitFor(async () => assert.equal(path.resolve((await fetchJson(apiBase, "/api/v1/vault")).json.item.vaultPath), path.resolve(nextVault)));
        await page.waitForFunction(() => !window.__prototypeEditor.activeNote());
      } else if (change === "switch-note") {
        await page.locator(`#listArea .explorer-item[data-kind="file"][data-id="${otherId}"]`).click();
        expectedBody = otherBefore;
        expectedNoteId = otherId;
      } else {
        await page.locator("#editorHost .cm-content:visible").click();
        await page.keyboard.press("Control+a");
        expectedBody = "# 图片上传源\n\n这是上传期间输入的新依据，任何部分都不能丢。\n";
        await page.keyboard.insertText(expectedBody);
        expectedNoteId = sourceId;
      }
      release();
      await page.waitForFunction(() => !window.__prototypeEditor.assetUploadPending);
      if (change === "switch-vault") {
        assert.equal(await page.evaluate(() => window.__prototypeEditor.activeNote()), null);
        assert.match(await page.locator("#statusBar").textContent(), /未插入|重新插入/);
        assert.deepEqual(await fs.readFile(path.join(vaultPath, asset.assetPath)), bytes);
        assert.deepEqual(await fs.readFile(path.join(vaultPath, sourceRecord.markdownPath)), sourceBytes);
        const empty = await fetchJson(apiBase, "/api/v1/directories/dir_fleeting_default/notes");
        assert.equal(empty.status, 200, JSON.stringify(empty.json));
        assert.equal(empty.json.items.length, 0);
        return;
      }
      assert.equal(await page.evaluate(() => window.__prototypeEditor.activeNote().id), expectedNoteId);
      assert.equal(await page.evaluate(() => window.__prototypeEditor.getEditorValue()), expectedBody, "A late attachment response must not use a stale range in another or changed note");
      assert.match(await page.locator("#statusBar").textContent(), /未插入|重新插入/);
      assert.deepEqual(await fs.readFile(path.join(vaultPath, asset.assetPath)), bytes);
      await page.keyboard.press("Control+s");
      await waitFor(async () => assert.equal((await fetchJson(apiBase, `/api/v1/notes/${expectedNoteId}`)).json.item.body, expectedBody));
      assert.equal((await fetchJson(apiBase, `/api/v1/notes/${otherId}`)).json.item.body, otherBefore);
      if (change === "switch-note") assert.equal((await fetchJson(apiBase, `/api/v1/notes/${sourceId}`)).json.item.body, sourceBefore);
    } finally {
      release();
    }
  });
}
