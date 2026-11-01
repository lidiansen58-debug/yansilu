import test from "node:test";
import assert from "node:assert/strict";
import { optionalPlaywright, startPrototypeStack, fetchJson, postJson, useWritingMarkdown, waitFor, openWritingChapterActions, selectWritingChapter } from "./prototype-copy-test-helpers.mjs";

test("a delayed materials response cannot undo an in-place confirmation", { timeout: 45000 }, async t => {
  if (process.env.RUN_BROWSER_E2E !== "1") { t.skip("Set RUN_BROWSER_E2E=1"); return; }
  const pw = await optionalPlaywright(t); if (!pw) return;
  const h = await startPrototypeStack(t, pw); if (!h) return;
  const { page, apiBase, webBase } = h;
  const created = await postJson(apiBase, "/api/v1/notes", { directoryId: "dir_original_default", title: "用解释检查理解",
    body: "# 用解释检查理解\n\n我能复述原文，却举不出新的例子。先写自己的解释，再核对遗漏的前提。觉得熟悉不等于真的理解。",
    thesis: "举出新例子并核对前提，才能发现只会复述时遗漏的理解。", status: "draft" });
  assert.equal(created.status, 201);
  const id = created.json.item.id;
  await page.goto(`${webBase}/prototype`, { waitUntil: "networkidle" });
  await page.locator('[data-action="quick-original"]').click();
  await page.waitForFunction(id => window.__prototypeState.notes.some(note => note.id === id), id);
  let release, started;
  const held = new Promise(resolve => { release = resolve; }), ready = new Promise(resolve => { started = resolve; });
  const pattern = "**/api/v1/directories/dir_original_default/notes?includeDescendants=true";
  await page.route(pattern, async route => { const response = await route.fetch(); started(); await held; await route.fulfill({ response }); });
  try {
    await page.locator('.rail-btn[data-module="writing"]').click(); await ready;
    await page.locator('.writing-head-actions [data-writing-related-open]').click();
    await page.locator("#writingCandidateDetails > summary").click();
    page.once("dialog", dialog => dialog.accept());
    await page.locator(`#writingCandidateList [data-writing-action="prepare"][data-writing-note-id="${id}"]`).click();
    await page.locator(`#writingBasketList article[data-writing-note-id="${id}"]`).waitFor();
    release(); await page.waitForLoadState("networkidle");
    assert.doesNotMatch(await page.locator("#writingCandidateSummary").innerText(), /正在读取笔记/);
    const cached = await page.evaluate(id => window.__prototypeState.notes.find(note => note.id === id), id);
    assert.equal(cached.status, "active"); assert.equal(cached.authorship.user_confirmed, true);
    assert.equal((await fetchJson(apiBase, `/api/v1/notes/${id}`)).json.item.status, "active");
  } finally { release(); await page.unroute(pattern); }
});

for (const scenario of ["module return", "chapter directory", "chapter binding"]) test(`remote article changes cannot cause stale writes through ${scenario}`, { timeout: 45000 }, async t => {
  if (process.env.RUN_BROWSER_E2E !== "1") { t.skip("Set RUN_BROWSER_E2E=1"); return; }
  const pw = await optionalPlaywright(t); if (!pw) return;
  const h = await startPrototypeStack(t, pw); if (!h) return;
  const { page, apiBase } = h;
  await page.locator('.rail-btn[data-module="writing"]').click(); await page.locator("#btnWritingSaveThemeIndex").click();
  await page.locator("#writingTitle").fill("写下自己的解释"); await page.locator("#btnWritingStartManualDraft").click();
  await useWritingMarkdown(page); await page.locator("#writingDraftEditor").fill("# 写下自己的解释\n\n窗口里的原稿。");
  await page.locator("#btnWritingSaveDraft").click();
  let project;
  await waitFor(async () => { project = (await fetchJson(apiBase, "/api/v1/writing-projects?limit=50")).json.items[0]; assert.ok(project.draft_note_id); });
  const original = (await fetchJson(apiBase, `/api/v1/notes/${project.draft_note_id}`)).json.item;
  async function addChapter() {
    await openWritingChapterActions(page); await page.locator("#btnWritingChapterAdd").click();
    await page.locator('[data-text-input-field]:visible').fill("一个章节"); await page.locator('[data-text-input-confirm]:visible').click();
    await page.waitForFunction(() => document.querySelector("#writingDraftTarget").value !== "");
  }
  if (scenario === "module return") await page.locator('.rail-btn[data-module="today"]').click();
  if (scenario === "chapter binding") await addChapter();
  const alternate = await postJson(apiBase, "/api/v1/notes", { directoryId: "dir_original_default", title: "另一个版本", status: "draft", body: "# 另一个版本\n\n另一窗口选定的正文。" });
  assert.equal(alternate.status, 201);
  const binding = await postJson(apiBase, `/api/v1/writing-projects/${project.id}/draft-note`, { draftNoteId: alternate.json.item.id });
  assert.equal(binding.status, 200, JSON.stringify(binding.json));
  if (scenario === "module return") {
    await page.locator('.rail-btn[data-module="writing"]').click();
    await waitFor(async () => assert.match(await page.locator("#statusText").innerText(), /当前草稿已在其他地方切换/));
    await page.locator('[data-writing-tab="draft"]').click();
  } else {
    if (scenario === "chapter directory") await addChapter();
    if (scenario === "chapter binding") {
      await page.locator("#writingDraftEditor").fill("# 一个章节\n\n章节正文。"); await page.locator("#btnWritingSaveDraft").click();
      await waitFor(async () => assert.match(await page.locator("#statusText").innerText(), /章节已保存/));
    }
    await selectWritingChapter(page, "");
  }
  await page.locator("#writingDraftEditor").fill("# 写下自己的解释\n\n仍需保留的当前修改。"); await page.locator("#btnWritingSaveDraft").click();
  await waitFor(async () => assert.match(await page.locator("#writingDraftSaveFeedback").innerText(), /保存失败/));
  assert.match(await page.locator("#writingDraftEditor").inputValue(), /仍需保留的当前修改/);
  assert.equal((await fetchJson(apiBase, `/api/v1/notes/${original.id}`)).json.item.body, original.body);
  assert.equal((await fetchJson(apiBase, `/api/v1/notes/${alternate.json.item.id}`)).json.item.body, alternate.json.item.body);
  assert.equal((await fetchJson(apiBase, `/api/v1/writing-projects/${project.id}`)).json.item.draft_note_id, alternate.json.item.id);
});

for (const save of [false, true]) test(`materials arrive when a manual draft is ${save ? "saved" : "started"} before their read finishes`, { timeout: 45000 }, async t => {
  if (process.env.RUN_BROWSER_E2E !== "1") { t.skip("Set RUN_BROWSER_E2E=1"); return; }
  const pw = await optionalPlaywright(t); if (!pw) return;
  const h = await startPrototypeStack(t, pw); if (!h) return;
  const { page, apiBase } = h;
  const note = await postJson(apiBase, "/api/v1/notes", { directoryId: "dir_original_default", title: "尚未打开的旧笔记", body: "# 尚未打开的旧笔记\n\n这是已有的材料。" });
  let release, started;
  const held = new Promise(resolve => { release = resolve; }), ready = new Promise(resolve => { started = resolve; });
  const pattern = "**/api/v1/directories/dir_original_default/notes?includeDescendants=true";
  await page.route(pattern, async route => { const response = await route.fetch(); started(); await held; await route.fulfill({ response }); });
  try {
    await page.locator('.rail-btn[data-module="writing"]').click(); await ready;
    await page.locator("#btnWritingSaveThemeIndex").click(); await page.locator("#writingTitle").fill("先写一个问题");
    await page.locator("#btnWritingStartManualDraft").click(); await page.locator("#writingDraftPanel:visible").waitFor();
    if (save) {
      await useWritingMarkdown(page); await page.locator("#writingDraftEditor").fill("# 先写一个问题\n\n在材料读完之前先把正文保存。");
      await page.locator("#btnWritingSaveDraft").click();
      await waitFor(async () => assert.equal(await page.locator("#writingDraftSaveFeedback").innerText(), "已保存"));
    }
    release(); await page.waitForLoadState("networkidle");
    await page.locator('.writing-head-actions [data-writing-related-open]').click(); await page.locator("#writingCandidateDetails > summary").click();
    await page.locator(`#writingCandidateList article[data-writing-note-id="${note.json.item.id}"]`).waitFor();
    assert.doesNotMatch(await page.locator("#writingCandidateSummary").innerText(), /正在读取|还没有可添加/);
  } finally { release(); await page.unroute(pattern); }
});
