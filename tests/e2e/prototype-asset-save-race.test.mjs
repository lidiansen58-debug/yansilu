import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { parseMarkdownWithFrontmatter } from "../../packages/domain/src/frontmatter.mjs";
import { optionalPlaywright, startPrototypeStack, fetchJson, waitFor } from "./prototype-copy-test-helpers.mjs";

test("a title save during image upload keeps the image link and saved bytes", { timeout: 30000 }, async t => {
  if (process.env.RUN_BROWSER_E2E !== "1") { t.skip("Set RUN_BROWSER_E2E=1"); return; }
  const pw = await optionalPlaywright(t);
  if (!pw) return;
  let holdNextSave = false, releaseSave, recordSave, uploadCount = 0, before;
  const saveReleased = new Promise(resolve => { releaseSave = resolve; });
  const saveCaptured = new Promise(resolve => { recordSave = resolve; });
  t.after(() => releaseSave());
  const { page, apiBase, vaultPath } = await startPrototypeStack(t, pw, { beforeNavigate: async page => {
    await page.route("**/api/v1/**", async route => {
      const request = route.request(), pathname = new URL(request.url()).pathname;
      if (holdNextSave && request.method() === "PUT" && /\/notes\/[^/]+$/.test(pathname)) {
        holdNextSave = false;
        const response = await route.fetch();
        recordSave((await response.json()).item);
        await saveReleased;
        await route.fulfill({ response });
      } else if (request.method() === "POST" && pathname.endsWith("/assets")) {
        uploadCount++;
        const response = await route.fetch();
        releaseSave();
        await page.waitForFunction(() => !window.__prototypeEditor.savingPromise);
        assert.equal(await page.evaluate(() => window.__prototypeEditor.getEditorValue()), before.body);
        await route.fulfill({ response });
      } else await route.continue();
    });
  }});
  await page.locator('[data-action="quick-fleeting"]').click();
  await page.locator("#btnNewNote").click();
  if (!await page.locator("#editorHost .cm-content:visible").isVisible()) {
    await page.locator("#btnModeToggle").click();
    await page.locator("#btnNewNote").click();
  }
  await page.waitForFunction(() => {
    const editor = window.__prototypeEditor, range = editor.editorSelection();
    return !window.__prototypeState.pendingNoteCreation && range
      && editor.getEditorValue().slice(range.from, range.to) === "未命名笔记";
  });
  holdNextSave = true;
  await page.keyboard.insertText("Upload title save");
  await page.keyboard.press("Enter");
  await page.keyboard.insertText("Keep the body while the title save completes.");
  before = await page.evaluate(() => {
    const editor = window.__prototypeEditor;
    return { id: editor.activeNote().id, path: editor.activeNote().markdownPath, body: editor.getEditorValue() };
  });
  await page.keyboard.press("Control+s");
  const saved = await saveCaptured;
  assert.notEqual(saved.markdownPath, before.path);
  assert.equal(path.posix.dirname(saved.markdownPath), path.posix.dirname(before.path));
  const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMB/aznP6UAAAAASUVORK5CYII=", "base64");
  await page.locator("#assetImageInput").setInputFiles({ name: "tiny.png", mimeType: "image/png", buffer: png });
  await page.waitForFunction(() => !window.__prototypeEditor.assetUploadPending);
  assert.equal(uploadCount, 1);
  assert.equal(await page.evaluate(() => window.__prototypeEditor.activeNote().id), before.id);
  const body = await page.evaluate(() => window.__prototypeEditor.getEditorValue());
  const savedBody = body.endsWith("\n") ? body : `${body}\n`;
  assert.ok(body.includes("Keep the body while the title save completes."));
  assert.equal((body.match(/!\[tiny\]/g) || []).length, 1);
  await page.keyboard.press("Control+s");
  await waitFor(async () => assert.equal((await fetchJson(apiBase, `/api/v1/notes/${before.id}`)).json.item.body, savedBody));
  const disk = parseMarkdownWithFrontmatter(await fs.readFile(path.join(vaultPath, saved.markdownPath), "utf8"));
  assert.equal(disk.frontmatter.id, before.id);
  assert.equal(disk.body, savedBody);
  const link = body.match(/!\[tiny\]\(([^)]+tiny\.png)\)/);
  assert.ok(link);
  const imagePath = path.resolve(vaultPath, path.dirname(saved.markdownPath), link[1]);
  assert.ok(imagePath.startsWith(path.resolve(vaultPath) + path.sep));
  assert.deepEqual(await fs.readFile(imagePath), png);
  await page.locator("#btnModeToggle").click();
  await page.locator("#wysiwygHost img[data-preview-asset-url]:visible").first().waitFor();
});
