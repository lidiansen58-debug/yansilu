import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { createWritingReadyPermanentNote, fetchJson, postJson, waitFor } from "./prototype-copy-test-helpers.mjs";
import { addWritingSupportNotes } from "./prototype-writing-flow-helpers.mjs";

export async function createWritingSourceFixture(stack) {
  const source = (await createWritingReadyPermanentNote(stack.apiBase, {
    title: "解释并核对理解", body: "# 解释并核对理解\n\n先解释自己的判断，再用材料核对。保留中文 café 🌿 与 [[内部链接]]。",
    thesis: "解释并核对材料能够发现理解中的遗漏。",
    threeLineSummary: ["用自己的话解释判断，能够发现理解中的遗漏。", "回到材料核对依据，能够避免把流畅表达当成理解。", "记录适用边界，能够让文章说明判断成立的条件。"],
    boundaryOrCounterpoint: "尚未阅读材料时，应先阅读，不能只依靠表达判断理解。"
  })).json.item;
  return addWritingSupportNotes(stack.apiBase, source);
}

export async function captureWritingSources(stack, notes) {
  const snapshots = await Promise.all(notes.map(async note => (await fetchJson(stack.apiBase, `/api/v1/notes/${note.id}`)).json.item));
  const files = await Promise.all(notes.map(note => fs.readFile(path.join(stack.vaultPath, note.markdownPath))));
  const relations = await Promise.all(notes.map(async note => (await fetchJson(stack.apiBase, `/api/v1/notes/${note.id}/relations`)).json.item));
  return async () => {
    assert.deepEqual(await Promise.all(notes.map(async note => (await fetchJson(stack.apiBase, `/api/v1/notes/${note.id}`)).json.item)), snapshots);
    assert.deepEqual(await Promise.all(notes.map(async note => (await fetchJson(stack.apiBase, `/api/v1/notes/${note.id}/relations`)).json.item)), relations);
    for (const [index, note] of notes.entries()) assert.deepEqual(await fs.readFile(path.join(stack.vaultPath, note.markdownPath)), files[index]);
  };
}

export async function runVisibleTopicRepairFlow(stack, { missingQuestion }) {
  const { apiBase, page, webBase } = stack, notes = await createWritingSourceFixture(stack);
  const question = "怎样通过表达、材料核对与适用边界判断是否理解？";
  const theme = await postJson(apiBase, "/api/v1/index-cards", {
    directoryId: "dir_original_default", title: "理解与核对", centralQuestion: missingQuestion ? "" : question,
    summary: "", noteIds: notes.map(note => note.id)
  });
  assert.equal(theme.status, 201, JSON.stringify(theme.json));
  const created = await postJson(apiBase, "/api/v1/writing-projects", {
    title: "继续整理理解的依据", basketNoteIds: notes.map(note => note.id), relatedIndexIds: [theme.json.item.id]
  });
  assert.equal(created.status, 201, JSON.stringify(created.json));
  const project = created.json.item;
  const readProject = async () => (await fetchJson(apiBase, `/api/v1/writing-projects/${project.id}`)).json.item;
  const baseline = await readProject(), assertSourcesUnchanged = await captureWritingSources(stack, notes);
  assert.equal(baseline.goal, "");
  const missingCheck = baseline.preflight.checks.find(check => check.code === "missing_central_question");
  assert.equal(Boolean(missingCheck), missingQuestion);
  if (missingQuestion) assert.match(missingCheck.message, /补一张带中心问题的主题卡/);
  let aiExecutions = 0;
  page.on("request", request => { if (request.method() === "POST" && new URL(request.url()).pathname === "/api/v1/writing/ai-analysis") aiExecutions++; });
  await page.goto(`${webBase}/prototype`, { waitUntil: "networkidle" });
  await page.locator('.rail-btn[data-module="writing"]').click();
  const card = page.locator(`[data-writing-index-card-id="${theme.json.item.id}"]`);
  if (missingQuestion) {
    await card.locator('[data-writing-index-action="edit"]').click();
    const dialog = page.locator('.writing-theme-edit-mask[role="dialog"]');
    assert.equal(await dialog.getByLabel("想回答的问题").inputValue(), "");
    await dialog.getByLabel("想回答的问题").fill(question);
    await dialog.getByRole("button", { name: "保存", exact: true }).click();
    await dialog.waitFor({ state: "detached" });
    assert.equal((await fetchJson(apiBase, `/api/v1/index-cards/${theme.json.item.id}`)).json.item.central_question, question);
    const current = await readProject();
    assert.equal(current.goal, baseline.goal); assert.equal(current.scaffold_id, baseline.scaffold_id);
    assert.equal(current.preflight.checks.some(check => check.code === "missing_central_question"), false);
  }
  assert.match(await card.innerText(), new RegExp(question));
  await card.locator(`button[data-writing-project-id="${project.id}"]`).click();
  await page.locator("#writingGoal:visible").waitFor();
  assert.equal(await page.locator("#writingTitle").inputValue(), project.title);
  assert.equal(await page.getByLabel("想回答的问题", { exact: true }).inputValue(), "");
  assert.equal((await readProject()).goal, "", "Reading a historical empty question must not silently persist a replacement");
  await page.getByLabel("想回答的问题", { exact: true }).fill(question);
  await page.locator("#btnWritingCreateScaffold").click();
  await page.locator("#writingScaffoldPanel:visible").waitFor();
  await waitFor(async () => assert.equal((await readProject()).goal, question));
  const saved = await readProject();
  assert.equal(saved.id, project.id); assert.deepEqual(saved.related_index_ids, [theme.json.item.id]);
  assert.equal(saved.preflight.checks.some(check => check.code === "missing_central_question"), false);
  const scaffold = (await fetchJson(apiBase, `/api/v1/draft-scaffolds/${saved.scaffold_id}`)).json.item;
  const check = scaffold.preflight.checks.find(item => item.id === "topic_entry");
  assert.equal(check.status, "pass"); assert.match(check.message, /主题|索引/);
  assert.equal(await page.locator("#writingResult").isVisible(), false);
  assert.doesNotMatch(await page.locator("#writingPanel").innerText(), /missing_central_question|topic_entry|wp_[a-f0-9]+|scaffold/);
  assert.equal((await fetchJson(apiBase, "/api/v1/writing-projects?limit=50")).json.items.length, 1);
  await assertSourcesUnchanged(); assert.equal(aiExecutions, 0);
}
