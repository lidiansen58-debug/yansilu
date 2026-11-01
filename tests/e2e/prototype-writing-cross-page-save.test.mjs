import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { optionalPlaywright, startPrototypeStack, fetchJson, putJson, useWritingMarkdown, waitFor } from "./prototype-copy-test-helpers.mjs";

for (const [width, mode] of [[1366, "document"], [390, "markdown"]]) test(`saved writing survives module round trips at ${width}px in ${mode} mode`, { timeout: 60000 }, async t => {
  if (process.env.RUN_BROWSER_E2E !== "1") { t.skip("Set RUN_BROWSER_E2E=1"); return; }
  const pw = await optionalPlaywright(t); if (!pw) return;
  const h = await startPrototypeStack(t, pw); if (!h) return;
  const { page, apiBase } = h;
  await page.setViewportSize({ width, height: 844 });
  const errors = []; page.on("pageerror", e => errors.push(e.message));
  await page.locator('.rail-btn[data-module="writing"]').click();
  await page.locator("#btnWritingSaveThemeIndex").click();
  await page.locator("#writingTitle").fill("写下来，让自己的想法更清楚");
  await page.locator("#btnWritingStartManualDraft").click();
  await page.locator("#writingDraftPanel:visible").waitFor();
  if (mode === "markdown") await useWritingMarkdown(page);
  async function append(marker) {
    if (mode === "markdown") await page.locator("#writingDraftEditor").fill(`${await page.locator("#writingDraftEditor").inputValue()}\n\n${marker}`);
    else {
      await page.locator('#writingDocumentEditor .toastui-editor-ww-container .ProseMirror[contenteditable="true"]').click();
      await page.keyboard.press("ControlOrMeta+End");
      await page.keyboard.press("Enter"); await page.keyboard.insertText(marker);
    }
    await waitFor(async () => assert.ok((await page.locator("#writingDraftEditor").inputValue()).includes(marker)));
  }
  await append("第一段自己的想法。");
  await page.locator("#btnWritingSaveDraft").click();
  let project;
  await waitFor(async () => {
    project = (await fetchJson(apiBase, "/api/v1/writing-projects?limit=50")).json.items[0];
    assert.ok(project?.draft_note_id);
    assert.match((await fetchJson(apiBase, `/api/v1/notes/${project.draft_note_id}`)).json.item.body, /第一段自己的想法/);
  });
  for (const [selector, marker] of [
    ['.rail-btn[data-module="today"]', "回到首页后继续写。"],
    ['.rail-btn[data-module="settings"]', "看过设置后继续写。"],
    ['.rail-btn[data-action="quick-original"]', "看过笔记后继续写。"]
  ]) {
    await page.locator(selector).click();
    const loaded = page.waitForResponse(r => r.request().method() === "GET" && r.url().endsWith(`/api/v1/writing-projects/${project.id}`));
    await page.locator('.rail-btn[data-module="writing"]').click();
    await loaded; await page.waitForLoadState("networkidle");
    await page.locator('[data-writing-tab="draft"]').click();
    await append(marker); await page.locator("#btnWritingSaveDraft").click();
    await waitFor(async () => assert.equal(await page.locator("#writingDraftSaveFeedback").textContent(), "已保存", await page.locator("#statusText").textContent()));
    assert.ok((await fetchJson(apiBase, `/api/v1/notes/${project.draft_note_id}`)).json.item.body.includes(marker));
    assert.equal((await fetchJson(apiBase, `/api/v1/writing-projects/${project.id}`)).json.item.draft_note_id, project.draft_note_id);
  }
  // Retaining a save baseline must still refuse a newer file from another editor.
  const saved = (await fetchJson(apiBase, `/api/v1/notes/${project.draft_note_id}`)).json.item;
  const externalBody = `${saved.body}\n\n另一处写入的新内容。`;
  const external = await putJson(apiBase, `/api/v1/notes/${saved.id}`, { body: externalBody, expectedBody: saved.body, expectedRevision: saved.fileRevision });
  assert.equal(external.status, 200);
  await append("当前未保存的修改。"); await page.locator("#btnWritingSaveDraft").click();
  await waitFor(async () => assert.match(await page.locator("#statusText").textContent(), /其他地方修改.*未覆盖/));
  assert.equal((await fetchJson(apiBase, `/api/v1/notes/${saved.id}`)).json.item.body, external.json.item.body);
  assert.match(await page.locator("#writingDraftEditor").inputValue(), /当前未保存的修改/);
  assert.deepEqual(errors, []);
  if (process.env.YANSILU_QA_OUTPUT) {
    await fs.mkdir(process.env.YANSILU_QA_OUTPUT, { recursive: true });
    await page.screenshot({ path: path.join(process.env.YANSILU_QA_OUTPUT, `cross-page-conflict-${width}.png`), fullPage: true });
  }
});
