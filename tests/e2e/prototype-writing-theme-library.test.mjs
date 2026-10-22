import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { initVault, createNoteInDirectory } from "../../packages/domain/src/index.mjs";
import { createIndexCard, listIndexCards } from "../../packages/domain/src/index-card-store.mjs";
import { SQLITE_DB_FILES } from "../../packages/domain/src/sqlite-migrations.mjs";
import { createWritingProject, createDraftScaffold, bindDraftNoteToProject } from "../../packages/writing-engine/src/writing-engine.mjs";
import { optionalPlaywright, startPrototypeStack, fetchJson, useWritingMarkdown } from "./prototype-copy-test-helpers.mjs";

for (const width of [1366, 390]) test(`theme library reaches past fifty and resumes the same draft at ${width}px`, { timeout: 60000 }, async t => {
  if (process.env.RUN_BROWSER_E2E !== "1") { t.skip("Set RUN_BROWSER_E2E=1"); return; }
  const pw = await optionalPlaywright(t); if (!pw) return;
  let target, project, draft, source, ids;
  const stack = await startPrototypeStack(t, pw, {
    prepareVault: async vault => {
      await initVault(vault);
      source = await createNoteInDirectory(vault, { directoryId: "dir_original_default", title: "用解释检查理解", body: "# 用解释检查理解\n\n用自己的话解释，才能找到理解中的空缺。" });
      draft = await createNoteInDirectory(vault, { directoryId: "dir_original_default", title: "保留已有草稿", body: "# 保留已有草稿\n\n继续这篇文章，保留原来内容 library-resume-52。" });
      const themes = [];
      for (let i = 0; i < 52; i++) themes.push(await createIndexCard(vault, { directoryId: "dir_original_default", indexType: "topic", title: "主题库分页边界", centralQuestion: `问题 ${i}`, items: [{ noteId: source.id, rationale: "支持这个主题", shortLabel: "观点" }] }));
      // Identical time and title deliberately exercise the ID tie-break over
      // the 50-row page boundary, independent of filesystem speed.
      ids = themes.map(item => item.id).sort();
      target = themes.find(item => item.id === ids.at(-1));
      const db = new DatabaseSync(path.join(vault, ".yansilu", SQLITE_DB_FILES.catalog));
      try {
        db.prepare("UPDATE index_cards SET updated_at = ?").run("2026-01-01T00:00:00.000Z");
        db.prepare("UPDATE index_cards SET central_question = ? WHERE id = ?").run("断点续写唯一问题", target.id);
      } finally { db.close(); }
      const first = await listIndexCards(vault, { directoryId: "dir_original_default", indexType: "topic", limit: 50 });
      const second = await listIndexCards(vault, { directoryId: "dir_original_default", indexType: "topic", limit: 50, offset: 50 });
      assert.deepEqual([...first, ...second].map(item => item.id), ids);
      project = await createWritingProject(vault, { title: "已有的目标文章", basketNoteIds: [source.id], relatedIndexIds: [target.id] });
      await createDraftScaffold(vault, { writingProjectId: project.id });
      await bindDraftNoteToProject(vault, { writingProjectId: project.id, draftNoteId: draft.id });
    }
  });
  if (!stack) return;
  const { page, apiBase, vaultPath } = stack;
  await page.setViewportSize({ width, height: 900 });
  const beforeFiles = await Promise.all([source, draft].map(note => fs.readFile(path.join(vaultPath, note.markdownPath))));
  const firstPage = (await fetchJson(apiBase, "/api/v1/index-cards?directoryId=dir_original_default&indexType=topic&limit=50")).json.items;
  const secondPage = (await fetchJson(apiBase, "/api/v1/index-cards?directoryId=dir_original_default&indexType=topic&limit=50&offset=50")).json.items;
  assert.deepEqual([...firstPage, ...secondPage].map(item => item.id), ids);
  const projectBefore = (await fetchJson(apiBase, "/api/v1/writing-projects?limit=50")).json.items;
  await page.locator('.rail-btn[data-module="writing"]').click();
  const cards = page.locator("#writingThemeIndexList [data-writing-index-card-id]");
  await page.getByRole("button", { name: "显示全部 52 个主题", exact: true }).waitFor();
  assert.equal(await cards.count(), 3);
  await page.locator("#btnWritingExpandThemes").click();
  assert.equal(await cards.count(), 52);
  const search = page.getByRole("searchbox", { name: "搜索主题", exact: true });
  await search.fill("断点续写唯一问题");
  assert.equal(await cards.count(), 1);
  assert.equal(await cards.getAttribute("data-writing-index-card-id"), target.id);
  assert.equal(await search.evaluate(el => el === document.activeElement), true);
  await page.locator("#btnWritingExpandThemes").click();
  assert.equal(await cards.count(), 3);
  assert.equal(await page.locator("#btnWritingExpandThemes").evaluate(el => el === document.activeElement), true);
  await page.locator("#btnWritingExpandThemes").click();
  assert.equal(await search.inputValue(), "断点续写唯一问题");
  assert.equal(await cards.count(), 1);
  await search.fill("不存在的主题");
  await page.locator("#writingThemeIndexList").getByText("没有匹配的主题，试试其他关键词。", { exact: true }).waitFor();
  await search.fill("断点续写唯一问题");
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
  await fs.mkdir("output/core-flow-clarity-20261022", { recursive: true });
  await page.screenshot({ path: `output/core-flow-clarity-20261022/theme-library-${width}.png`, fullPage: true });
  await cards.getByRole("button", { name: "继续草稿", exact: true }).click();
  await page.locator("#writingDraftPanel:visible").waitFor();
  await useWritingMarkdown(page);
  assert.match(await page.locator("#writingDraftEditor").inputValue(), /library-resume-52/);
  const after = (await fetchJson(apiBase, "/api/v1/writing-projects?limit=50")).json.items;
  assert.deepEqual(after.map(item => [item.id, item.draft_note_id]), projectBefore.map(item => [item.id, item.draft_note_id]));
  for (const [i, note] of [source, draft].entries()) assert.deepEqual(await fs.readFile(path.join(vaultPath, note.markdownPath)), beforeFiles[i]);
});

test("a theme with a saved draft and no outline offers viewing and keeps its original body", { timeout: 30000 }, async t => {
  if (process.env.RUN_BROWSER_E2E !== "1") { t.skip("Set RUN_BROWSER_E2E=1"); return; }
  const pw = await optionalPlaywright(t); if (!pw) return;
  let draft, project;
  const stack = await startPrototypeStack(t, pw, { prepareVault: async vault => {
    await initVault(vault);
    const source = await createNoteInDirectory(vault, { directoryId: "dir_original_default", body: "# Own judgment\n\nKeep the original claim." });
    draft = await createNoteInDirectory(vault, { directoryId: "dir_original_default", body: "# Existing draft\n\nPreserve the saved article without an outline." });
    const theme = await createIndexCard(vault, { directoryId: "dir_original_default", title: "Archived article", noteIds: [source.id] });
    project = await createWritingProject(vault, { title: "Archived article", basketNoteIds: [source.id], relatedIndexIds: [theme.id] });
    await bindDraftNoteToProject(vault, { writingProjectId: project.id, draftNoteId: draft.id });
  } });
  if (!stack) return;
  const { page, apiBase, vaultPath } = stack;
  const before = await fs.readFile(path.join(vaultPath, draft.markdownPath));
  await page.locator('.rail-btn[data-module="writing"]').click();
  const view = page.locator(`#writingThemeIndexList [data-writing-project-id="${project.id}"]`);
  await view.getByText("查看草稿", { exact: true }).waitFor();
  await view.click();
  await page.locator("#writingDraftPanel:visible").waitFor();
  assert.match(await page.locator("#writingDraftEditor").inputValue(), /Preserve the saved article without an outline/);
  assert.equal(await page.locator("#writingDraftEditor").isDisabled(), true);
  assert.equal(await page.locator("#btnWritingSaveDraft").isDisabled(), true);
  const after = (await fetchJson(apiBase, `/api/v1/writing-projects/${project.id}`)).json.item;
  assert.equal(after.draft_note_id, draft.id);
  assert.equal(Boolean(after.scaffold_id), false);
  assert.deepEqual(await fs.readFile(path.join(vaultPath, draft.markdownPath)), before);
  await fs.mkdir("output/core-flow-clarity-20261022", { recursive: true });
  await page.screenshot({ path: "output/core-flow-clarity-20261022/theme-library-view-only.png", fullPage: true });
});
