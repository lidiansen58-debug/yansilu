import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { optionalPlaywright, startPrototypeStack, createWritingReadyPermanentNote, fetchJson, postJson, waitFor } from "./prototype-copy-test-helpers.mjs";
import { createWritingScopeDirectory, openWritingScopeCandidates, visibleWritingCandidateIds } from "./prototype-writing-scope-flow-helpers.mjs";
import { captureWritingSources } from "./prototype-writing-topic-repair-flow-helpers.mjs";
import { closeGraphRelationComposer, selectGraphNode } from "./prototype-graph-guidance-flow-helpers.mjs";

async function fixture(t, linked) {
  if (process.env.RUN_BROWSER_E2E !== "1") { t.skip("Set RUN_BROWSER_E2E=1"); return null; }
  const pw = await optionalPlaywright(t); if (!pw) return null;
  const stack = await startPrototypeStack(t, pw); if (!stack) return null;
  const directory = await createWritingScopeDirectory(stack, "关联后的图谱核对", linked ? "linked-theme-confirmation" : "local-relation-confirmation");
  const notes = [];
  for (const title of linked ? ["主题的判断", "主题的依据", "主题的条件", "不采用的补充材料"] : ["共同标签的独立判断", "共同标签的核对材料"]) notes.push((await createWritingReadyPermanentNote(stack.apiBase, {
    directoryId: directory.id, title, body: `# ${title}\n\n保留作者正文：中文 café 🌿。\n\n#current-graph-material`,
    thesis: "具体材料帮助核对自己的判断，并保留适用条件。",
    threeLineSummary: ["具体材料帮助核对自己的判断。", "说明适用条件能够避免过度推断。", "关联需要用户确认对象、类型与理由。"],
    boundaryOrCounterpoint: "共同标签只是查找线索，不能代替关联理由。"
  })).json.item);
  if (linked) for (const [index, note] of notes.slice(1).entries()) assert.equal((await postJson(stack.apiBase, `/api/v1/notes/${notes[0].id}/relations`, {
    toNoteId: note.id, relationType: ["supports", "qualifies", "bridges"][index], rationale: "这条材料为判断提供可追溯的依据或适用条件，整理主题前需要确认其用途。"
  })).status, 201);
  const assertSourcesUnchanged = await captureWritingSources(stack, notes);
  const snapshots = await Promise.all(notes.map(async note => (await fetchJson(stack.apiBase, `/api/v1/notes/${note.id}`)).json.item));
  const files = await Promise.all(notes.map(note => fs.readFile(path.join(stack.vaultPath, note.markdownPath))));
  const executions = [];
  stack.page.on("request", request => {
    const pathname = new URL(request.url()).pathname;
    if (request.method() === "POST" && pathname !== "/api/v1/ai/route-preview" && /\/api\/v1\/(?:ai|graph\/ai-analysis|writing\/ai-analysis|graph\/potential-relations\/refine)(?:\/|$)/.test(pathname)) executions.push(pathname);
  });
  await stack.page.goto(`${stack.webBase}/prototype`, { waitUntil: "networkidle" });
  await stack.page.locator('.rail-btn[data-action="quick-original"]').click();
  await stack.page.locator(`.explorer-item[data-kind="folder"][data-id="${directory.id}"]`).click();
  await stack.page.locator('.rail-btn[data-module="graph"]').click();
  await waitFor(async () => assert.deepEqual((await stack.page.locator(".graph-map-node[data-node-id]").evaluateAll(nodes => nodes.map(node => node.getAttribute("data-node-id")))).sort(), notes.map(note => note.id).sort()));
  const assertContentUnchanged = async () => {
    for (const [index, note] of notes.entries()) {
      const saved = (await fetchJson(stack.apiBase, `/api/v1/notes/${note.id}`)).json.item;
      for (const key of ["title", "body", "thesis", "threeLineSummary", "boundaryOrCounterpoint", "authorship", "distillationStatus", "originalityStatus"]) assert.deepEqual(saved[key], snapshots[index][key], key);
      assert.deepEqual(await fs.readFile(path.join(stack.vaultPath, note.markdownPath)), files[index]);
    }
  };
  return { ...stack, notes, directory, executions, assertSourcesUnchanged, assertContentUnchanged };
}

export async function runCurrentGraphLocalRelation(t) {
  const f = await fixture(t, false); if (!f) return;
  const { page, apiBase, notes } = f, [source, target] = notes;
  const readRelations = async () => (await fetchJson(apiBase, `/api/v1/notes/${source.id}/relations`)).json.item;
  assert.deepEqual((await readRelations()).outgoingLinks, []);
  assert.equal(await page.locator(".graph-map-edge-group").count(), 0);
  assert.equal(await page.locator(`.graph-map-node[data-node-id="${source.id}"]`).getAttribute("data-node-degree"), "0");
  await page.locator('[data-graph-task-view="relations"]').click();
  await page.locator(`.graph-workbench-panel [data-graph-isolated-note="${source.id}"]`).first().click();
  const composer = page.locator("[data-permanent-relation-workspace]:visible"); await composer.waitFor();
  const search = composer.locator("[data-permanent-relation-target-search]");
  if (!await search.isVisible()) await composer.locator('[data-permanent-relation-mode="manual"]').first().click();
  await waitFor(async () => assert.equal(await search.isVisible(), true, await composer.innerText()));
  await search.fill(target.title);
  await composer.locator(`[data-permanent-relation-manual-target="${target.id}"]`).click();
  await composer.locator('[data-permanent-relation-type-choice="supports"]').click();
  await composer.locator('textarea[name="rationale"]').fill("未确认的关系不应保存。");
  await composer.getByRole("button", { name: "重选笔记", exact: true }).click();
  await search.fill("不存在的对象");
  await waitFor(async () => assert.equal(await composer.locator('button[type="submit"]').isDisabled(), true));
  assert.deepEqual((await readRelations()).outgoingLinks, []);
  await closeGraphRelationComposer(composer); await f.assertSourcesUnchanged();
  await page.locator('.rail-btn[data-module="graph"]').click();
  await page.locator('[data-graph-task-view="relations"]').click();
  await page.locator(`.graph-workbench-panel [data-graph-isolated-note="${source.id}"]`).first().click(); await composer.waitFor();
  if (!await search.isVisible()) await composer.locator('[data-permanent-relation-mode="manual"]').first().click();
  await search.fill(target.title);
  await composer.locator(`[data-permanent-relation-manual-target="${target.id}"]`).click();
  await composer.locator('[data-permanent-relation-type-choice="supports"]').click();
  const rationale = "材料提供具体核对依据，因此支持当前判断；共同标签只帮助找到材料。";
  await composer.locator('textarea[name="rationale"]').fill(rationale);
  await composer.locator('button[type="submit"]').click(); await composer.locator(".permanent-relation-result").waitFor();
  const links = (await readRelations()).outgoingLinks;
  assert.equal(links.length, 1); assert.equal(links[0].toNoteId, target.id); assert.equal(links[0].relationType, "supports"); assert.equal(links[0].rationale, rationale);
  await closeGraphRelationComposer(composer);
  await page.locator('.rail-btn[data-module="graph"]').click();
  await waitFor(async () => {
    const edge = page.locator(`.graph-map-edge-group[data-edge-id="${links[0].id}"]`);
    assert.equal(await edge.count(), 1); assert.equal(await page.locator(".graph-map-edge-group").count(), 1);
    assert.equal(await edge.getAttribute("data-edge-from"), source.id); assert.equal(await edge.getAttribute("data-edge-to"), target.id);
    for (const note of notes) {
      const node = page.locator(`.graph-map-node[data-node-id="${note.id}"]`);
      assert.equal(await node.getAttribute("data-node-degree"), "1"); assert.equal(await node.getAttribute("data-graph-isolated-key"), null);
    }
  });
  assert.deepEqual((await fetchJson(apiBase, "/api/v1/index-cards?limit=50")).json.items, []);
  assert.deepEqual((await fetchJson(apiBase, "/api/v1/writing-projects?limit=50")).json.items, []);
  await f.assertContentUnchanged(); assert.deepEqual(f.executions, []);
}

export async function runCurrentGraphThemeSubset(t) {
  const f = await fixture(t, true); if (!f) return;
  const { page, notes, apiBase } = f, selected = notes.slice(0, 3).map(note => note.id).sort();
  const panel = await selectGraphNode(page, notes[0].id), create = panel.locator("[data-graph-create-theme-index]");
  assert.equal(await create.isEnabled(), true);
  await create.click();
  const form = page.locator("[data-graph-theme-confirmation-form]"); await form.waitFor();
  assert.equal(await form.locator('input[name="noteId"]:checked').count(), 4);
  await form.locator(`[name="noteId"][value="${notes[3].id}"]`).uncheck();
  await form.locator("[data-graph-theme-confirmation-cancel]").click(); await form.waitFor({ state: "hidden" });
  await f.assertSourcesUnchanged();
  assert.deepEqual((await fetchJson(apiBase, "/api/v1/index-cards?limit=50")).json.items, []);
  await create.click(); await form.waitFor();
  await form.locator(`[name="noteId"][value="${notes[3].id}"]`).uncheck();
  const question = "哪些材料支持判断，哪些材料限定其成立条件？";
  await form.locator("#graphThemeQuestion").fill(question);
  const request = page.waitForRequest(request => request.method() === "POST" && new URL(request.url()).pathname === "/api/v1/index-cards");
  await form.getByRole("button", { name: "确认主题并继续", exact: true }).click();
  const payload = (await request).postDataJSON(); assert.equal(payload.expectedVaultPath, f.vaultPath);
  await page.locator("#writingTitle:visible").waitFor();
  const themes = (await fetchJson(apiBase, "/api/v1/index-cards?limit=50")).json.items;
  assert.equal(themes.length, 1);
  const theme = (await fetchJson(apiBase, `/api/v1/index-cards/${themes[0].id}`)).json.item;
  assert.equal(theme.central_question, question); assert.deepEqual(theme.items.map(row => row.note_id).sort(), selected);
  assert.deepEqual((await page.locator("#writingBasketList article[data-writing-note-id]").evaluateAll(cards => cards.map(card => card.getAttribute("data-writing-note-id")))).sort(), selected);
  await openWritingScopeCandidates(page); assert.deepEqual(await visibleWritingCandidateIds(page), selected);
  assert.deepEqual((await fetchJson(apiBase, "/api/v1/writing-projects?limit=50")).json.items, []);
  await f.assertSourcesUnchanged(); assert.deepEqual(f.executions, []);
}
