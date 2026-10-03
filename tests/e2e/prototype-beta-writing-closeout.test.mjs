import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { optionalPlaywright, startPrototypeStack, createWritingReadyPermanentNote, postJson, fetchJson, waitFor } from "./prototype-copy-test-helpers.mjs";

async function answerInput(page, value) {
  await page.locator('[data-text-input-field]:visible').fill(value);
  await page.locator('[data-text-input-confirm]:visible').click();
}

test("Beta writing closes manual theme, outline, article save, current-text export and chapter export", async t => {
  if (process.env.RUN_BROWSER_E2E !== "1") { t.skip("Set RUN_BROWSER_E2E=1"); return; }
  const pw = await optionalPlaywright(t);
  if (!pw) return;
  const stack = await startPrototypeStack(t, pw);
  if (!stack) return;
  const { page, apiBase, webBase, vaultPath } = stack;
  const notes = [];
  for (const [title, thesis] of [["检验理解", "解释能暴露理解中的缺口。"], ["回到材料", "解释不清时需要核对材料。"], ["初学边界", "初学者需要先阅读再回忆。"]]) {
    const result = await createWritingReadyPermanentNote(apiBase, {
      title, body: `# ${title}\n\n${thesis}\n\n这条笔记提供一个独立的依据。`, thesis,
      threeLineSummary: [thesis, "将判断和依据联系起来，才能继续写作。", "这是对学习流程的观察，需要结合具体任务。"],
      boundaryOrCounterpoint: "这不适用于尚未读过材料的情形。"
    });
    notes.push(result.json.item);
  }
  for (const [from, to, relationType] of [[0, 1, "supports"], [1, 2, "qualifies"]]) {
    const relation = await postJson(apiBase, `/api/v1/notes/${notes[from].id}/relations`, {
      toNoteId: notes[to].id, relationType, rationale: "核对材料和初学条件使解释检验的适用范围更明确。", status: "confirmed"
    });
    assert.equal(relation.status, 201);
  }
  await page.goto(`${webBase}/prototype`, { waitUntil: "networkidle" });
  await page.locator('.rail-btn[data-module="writing"]').click();
  await page.locator('[data-writing-sidebar-action="related"]').click();
  await page.locator('#writingCandidateDetails > summary').click();
  for (const note of notes) await page.locator(`#writingCandidateList [data-writing-action="add"][data-writing-note-id="${note.id}"]`).click();
  await page.locator('#writingRelatedNotesPanel [data-writing-related-close]').click();
  await page.locator('#btnWritingSaveThemeIndex').click();
  await answerInput(page, "怎样检验读书后的理解");
  await answerInput(page, "怎样用解释和材料核对检验理解？");
  await page.locator('#writingTitle:visible').waitFor();
  assert.equal(await page.locator('#writingTitle').inputValue(), "怎样检验读书后的理解");
  await page.locator('#btnWritingCreateScaffold').click();
  await page.locator('#writingScaffoldPanel:visible').waitFor({ timeout: 15000 });
  await page.locator('#btnWritingStartDraft').click();
  const savedBody = "# 怎样检验读书后的理解\n\n文章正文已经写下，仍需人工修改。";
  await page.locator('#writingDraftEditor:visible').fill(savedBody);
  await page.locator('#btnWritingSaveDraft').click();
  let project;
  await waitFor(async () => {
    const projects = await fetchJson(apiBase, "/api/v1/writing-projects?limit=20");
    project = projects.json.items.find(item => item.title === "怎样检验读书后的理解");
    assert.ok(project?.draft_note_id);
    assert.match((await fetchJson(apiBase, `/api/v1/notes/${project.draft_note_id}`)).json.item.body, /文章正文已经写下/);
  }, 15000);
  assert.deepEqual((await fetchJson(apiBase, `/api/v1/writing-projects/${project.id}`)).json.item.book_structure.parts, [], "New article themes must not persist suggested book chapters");
  const currentBody = `${savedBody}\n\n尚未保存的正文也必须导出。`;
  await page.locator('#writingDraftEditor').fill(currentBody);
  const outputRoot = await fs.mkdtemp(path.join(os.tmpdir(), "yansilu-beta-writing-output-"));
  await page.locator('#writingMoreMenu > summary').click();
  const exportedResponse = page.waitForResponse(response => response.url().endsWith('/api/v1/exports/article') && response.request().method() === 'POST');
  await page.locator('#btnWritingExportArticle').click();
  await answerInput(page, outputRoot);
  const articleResponse = await exportedResponse;
  const exported = await articleResponse.json();
  assert.equal(articleResponse.status(), 200, JSON.stringify(exported));
  assert.equal(exported.status, "completed");
  assert.match(await fs.readFile(exported.articlePath, "utf8"), /尚未保存的正文也必须导出/);
  assert.doesNotMatch((await fetchJson(apiBase, `/api/v1/notes/${project.draft_note_id}`)).json.item.body, /尚未保存的正文也必须导出/);
  await page.locator('#btnWritingSaveDraft').click();
  await waitFor(async () => assert.match((await fetchJson(apiBase, `/api/v1/notes/${project.draft_note_id}`)).json.item.body, /尚未保存的正文也必须导出/));
  await waitFor(async () => assert.equal(await page.locator('#btnWritingSaveDraft').isDisabled(), false));
  for (const title of ["第一章 理解", "第二章 边界"]) {
    await page.locator('#btnWritingChapterAdd').click();
    await answerInput(page, title);
    await page.waitForFunction(title => document.querySelector('#writingDraftTarget')?.selectedOptions[0]?.textContent.includes(title), title);
    await page.locator('#writingDraftEditor').fill(`# ${title}\n\n${title}的已保存正文。`);
    await page.locator('#btnWritingSaveDraft').click();
    await waitFor(async () => {
      const fresh = (await fetchJson(apiBase, `/api/v1/writing-projects/${project.id}`)).json.item;
      const chapter = fresh.book_structure.parts.flatMap(part => part.chapters).find(chapter => chapter.title === title);
      assert.ok(chapter?.draft_note_id);
      assert.match((await fetchJson(apiBase, `/api/v1/notes/${chapter.draft_note_id}`)).json.item.body, new RegExp(`${title}的已保存正文`));
    }, 15000);
    await waitFor(async () => assert.match(await page.locator('#statusText').textContent(), /章节已保存/), 15000);
  }
  await page.locator('#btnWritingChapterUp').click();
  await waitFor(async () => assert.match(await page.locator('#statusText').textContent(), /章节顺序已保存/));
  await page.locator('#writingMoreMenu > summary').click();
  let bookResponse;
  page.on('response', response => { if (response.url().endsWith('/api/v1/exports/book') && response.request().method() === 'POST') bookResponse = response; });
  await page.locator('#btnWritingExportBook').click();
  await page.locator('[data-text-input-field]:visible').waitFor({ timeout: 3000 }).catch(async error => {
    throw new Error(`${error.message}\nStatus: ${await page.locator('#statusText').textContent()}\nProject: ${JSON.stringify((await fetchJson(apiBase, `/api/v1/writing-projects/${project.id}`)).json.item.book_structure)}`);
  });
  await answerInput(page, outputRoot);
  await waitFor(() => assert.ok(bookResponse));
  const book = await bookResponse.json();
  assert.equal(book.status, "completed");
  const text = await fs.readFile(book.bookPath, "utf8");
  assert.ok(text.indexOf("第二章 边界") < text.indexOf("第一章 理解"));
  assert.match(text, /第一章 理解的已保存正文/);
  assert.match(text, /第二章 边界的已保存正文/);
  await page.locator('.rail-btn[data-module="backup"]').click();
  await page.locator('#settingsBackupTargetDirectory').fill(outputRoot);
  await page.locator('#settingsBackupPassword').fill('beta-test-password');
  await page.locator('#settingsBackupPasswordConfirm').fill('different-password');
  await page.locator('#settingsCreateVaultBackup').click();
  await waitFor(async () => assert.match(await page.locator('#settingsBackupStatus').textContent(), /不一致/));
  await page.locator('#settingsBackupPasswordConfirm').fill('beta-test-password');
  const backupWait = page.waitForResponse(r => r.url().endsWith('/api/v1/vault/backups') && r.request().method() === 'POST');
  await page.locator('#settingsCreateVaultBackup').click();
  const backupResponse = await backupWait;
  assert.equal(backupResponse.status(), 201);
  const backup = (await backupResponse.json()).item;
  await fs.access(backup.backupPath);
  await waitFor(async () => assert.equal(await page.locator('#settingsBackupPassword').inputValue(), ''));
  await page.locator('#settingsRestoreTab').click();
  const restoredPath = path.join(outputRoot, 'restored-vault');
  await page.locator('#settingsRestoreBackupPath').fill(backup.backupPath);
  await page.locator('#settingsRestoreTargetVaultPath').fill(restoredPath);
  await page.locator('#settingsRestorePassword').fill('wrong-password');
  const failedRestoreWait = page.waitForResponse(r => r.url().endsWith('/api/v1/vault/backups/restore'));
  await page.locator('#settingsRestoreVaultBackup').click();
  assert.equal((await failedRestoreWait).status(), 400);
  await waitFor(async () => assert.match(await page.locator('#settingsRestoreStatus').textContent(), /密码错误/));
  await assert.rejects(fs.access(restoredPath));
  await page.locator('#settingsRestorePassword').fill('beta-test-password');
  const restoreWait = page.waitForResponse(r => r.url().endsWith('/api/v1/vault/backups/restore'));
  await page.locator('#settingsRestoreVaultBackup').click();
  assert.equal((await restoreWait).status(), 201);
  await page.locator('#settingsOpenRestoredVault:visible').waitFor();
  for (const note of [...notes, (await fetchJson(apiBase, `/api/v1/notes/${project.draft_note_id}`)).json.item]) {
    assert.equal(await fs.readFile(path.join(restoredPath, note.markdownPath), 'utf8'), await fs.readFile(path.join(vaultPath, note.markdownPath), 'utf8'));
  }
  await page.locator('#settingsOpenRestoredVault').click();
  await waitFor(async () => assert.equal(path.resolve((await fetchJson(apiBase, '/health')).json.vaultPath), path.resolve(restoredPath)));
  const restoredProject = (await fetchJson(apiBase, `/api/v1/writing-projects/${project.id}`)).json.item;
  const chapters = restoredProject.book_structure.parts.flatMap(p => p.chapters);
  assert.deepEqual(chapters.map(c => c.title), ['第二章 边界', '第一章 理解']);
  for (const chapter of chapters) assert.match((await fetchJson(apiBase, `/api/v1/notes/${chapter.draft_note_id}`)).json.item.body, /已保存正文/);
});
