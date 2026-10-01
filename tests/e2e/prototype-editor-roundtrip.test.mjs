import test from "node:test";
import assert from "node:assert/strict";
import { optionalPlaywright, startPrototypeStack, postJson, fetchJson, waitFor } from "./prototype-copy-test-helpers.mjs";

async function stackFor(t) {
  if (process.env.RUN_BROWSER_E2E !== "1") { t.skip("Set RUN_BROWSER_E2E=1"); return; }
  const pw = await optionalPlaywright(t);
  return pw ? startPrototypeStack(t, pw) : null;
}
async function open(page, id) {
  await page.locator("#btnToggleSearch").click();
  await page.locator(`[data-search-note="${id}"]`).click();
  await page.waitForFunction(id => window.__prototypeEditor.activeNote()?.id === id, id);
}
async function sourceMode(page) {
  if (!(await page.locator("#editorHost .cm-content").isVisible())) await page.locator("#btnModeToggle").click();
  await page.locator("#editorHost .cm-content:visible").click();
}

for (const kind of ["original", "fleeting", "literature"]) {
  test(`${kind} Unicode editing, mode roundtrip and reload preserve user content`, async t => {
    const stack = await stackFor(t);
    if (!stack) return;
    const { page, apiBase } = stack;
    const body = "# 模式往返\n\n## 自定义记录\n\n包含 **加粗**、`code`、🙂 和 #标签。\n\n- 第一项\n- 第二项\n\n> 一段引用。\n";
    const note = (await postJson(apiBase, "/api/v1/notes", { directoryId: `dir_${kind}_default`, body })).json.item;
    await open(page, note.id);
    await sourceMode(page);
    await page.keyboard.press("Control+End");
    await page.keyboard.insertText("\n\n源码模式新增：中文与 café。");
    await page.locator("#btnModeToggle").click();
    await page.locator("#wysiwygHost .ProseMirror:visible").click();
    await page.keyboard.press("Control+End");
    await page.keyboard.press("Enter");
    await page.keyboard.insertText("富文本新增：保留全部材料。");
    await page.locator("#btnModeToggle").click();
    const latest = await page.evaluate(() => window.__prototypeEditor.getEditorValue());
    for (const part of ["## 自定义记录", "第一项", "第二项", "一段引用", "🙂", "源码模式新增：中文与 café", "富文本新增：保留全部材料"]) assert.ok(latest.includes(part), part);
    await page.keyboard.press("Control+s");
    await waitFor(async () => assert.match((await fetchJson(apiBase, `/api/v1/notes/${note.id}`)).json.item.body, /富文本新增：保留全部材料/));
    await page.waitForFunction(() => !window.__prototypeEditor.activeTab()?.dirty);
    await page.reload({ waitUntil: "networkidle" });
    await open(page, note.id);
    const reopened = await page.evaluate(() => window.__prototypeEditor.getEditorValue());
    for (const part of ["自定义记录", "第一项", "第二项", "一段引用", "🙂", "源码模式新增：中文与 café", "富文本新增：保留全部材料"]) assert.ok(reopened.includes(part), part);
  });
}

test("a restored draft resumes autosave without additional typing", async t => {
  const stack = await stackFor(t);
  if (!stack) return;
  const { page, apiBase } = stack;
  const note = (await postJson(apiBase, "/api/v1/notes", { directoryId: "dir_fleeting_default", body: "# 草稿恢复\n\n磁盘内容。" })).json.item;
  await open(page, note.id);
  await sourceMode(page);
  await page.keyboard.press("Control+End");
  await page.keyboard.insertText("\n\n需要在恢复后自动保存的想法。");
  await page.waitForFunction(id => localStorage.getItem(`yansilu:draft:${id}`), note.id);
  page.on("dialog", dialog => dialog.accept());
  await page.reload({ waitUntil: "networkidle" });
  await page.clock.install();
  await open(page, note.id);
  assert.match(await page.evaluate(() => window.__prototypeEditor.getEditorValue()), /恢复后自动保存/);
  await page.clock.fastForward(15001);
  await waitFor(async () => assert.match((await fetchJson(apiBase, `/api/v1/notes/${note.id}`)).json.item.body, /恢复后自动保存/));
  await page.waitForFunction(() => !window.__prototypeEditor.activeTab()?.dirty);
});

test("a narrow screen can create and save a note through its visible entry", async t => {
  const stack = await stackFor(t);
  if (!stack) return;
  const { page, apiBase } = stack;
  await page.locator('[data-action="quick-original"]').click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator("#btnMobileNewNote").click();
  await page.waitForFunction(() => {
    const editor = window.__prototypeEditor, range = editor?.editorSelection();
    return range && editor.getEditorValue().slice(range.from, range.to) === "未命名笔记";
  });
  await page.keyboard.insertText("移动端记录");
  await page.keyboard.press("Enter");
  await page.keyboard.insertText("窄屏也可以连续输入正文。");
  assert.match(await page.evaluate(() => window.__prototypeEditor.getEditorValue()), /^# 移动端记录\n\n窄屏也可以连续输入正文。\n\n## 核心观点/);
  await page.keyboard.press("Control+s");
  const id = await page.evaluate(() => window.__prototypeEditor.activeNote().id);
  await waitFor(async () => assert.match((await fetchJson(apiBase, `/api/v1/notes/${id}`)).json.item.body, /^# 移动端记录\n\n窄屏也可以连续输入正文。\n\n## 核心观点/));
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  await page.screenshot({ path: "output/note-editor-validation/mobile-editor.png", fullPage: true });
});
