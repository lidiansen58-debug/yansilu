import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { optionalPlaywright, startPrototypeStack, createWritingReadyPermanentNote, fetchJson, waitFor } from "./prototype-copy-test-helpers.mjs";
import { createWritingScopeDirectory } from "./prototype-writing-scope-flow-helpers.mjs";
import { captureWritingSources } from "./prototype-writing-topic-repair-flow-helpers.mjs";
import { closeGraphRelationComposer } from "./prototype-graph-guidance-flow-helpers.mjs";

test("shared tags are clues and become a real relation only after the user saves a reason", async t => {
  if (process.env.RUN_BROWSER_E2E !== "1") { t.skip("Set RUN_BROWSER_E2E=1"); return; }
  const pw = await optionalPlaywright(t); if (!pw) return;
  const stack = await startPrototypeStack(t, pw); if (!stack) return;
  const { page, apiBase, webBase } = stack;
  const directory = await createWritingScopeDirectory(stack, "同标签关系核对", "tag-relation-guidance");
  const notes = [];
  for (const title of ["同标签的判断", "同标签的材料"]) notes.push((await createWritingReadyPermanentNote(apiBase, {
    directoryId: directory.id, title, body: `# ${title}\n\n保留作者正文：中文 café 🌿。\n\n#product-judgment`,
    thesis: "共同标签提供阅读线索，不能代替说明关系的理由。",
    threeLineSummary: ["共同标签提供阅读线索。", "标签相同不等于支持同一判断。", "保存关系前，需要明确对象、类型和理由。"],
    boundaryOrCounterpoint: "仅凭标签，不应自动建立论证关系。"
  })).json.item);
  assert.ok(notes.every(note => note.body.includes("#product-judgment")));
  const assertSourcesUnchanged = await captureWritingSources(stack, notes);
  const noteSnapshots = await Promise.all(notes.map(async note => (await fetchJson(apiBase, `/api/v1/notes/${note.id}`)).json.item));
  const noteFiles = await Promise.all(notes.map(note => fs.readFile(path.join(stack.vaultPath, note.markdownPath))));
  const aiRequestPaths = [];
  page.on('request', request => {
    const pathname = new URL(request.url()).pathname;
    if (request.method() === 'POST' && pathname !== '/api/v1/ai/route-preview' && /\/api\/v1\/(?:ai|writing\/ai-analysis|graph\/ai-analysis|graph\/potential-relations\/refine)(?:\/|$)/.test(pathname)) aiRequestPaths.push(pathname);
  });
  const readRelations = async () => (await fetchJson(apiBase, `/api/v1/notes/${notes[0].id}/relations`)).json.item;
  const baseline = await readRelations();
  assert.deepEqual(baseline.outgoingLinks, []);
  assert.deepEqual((await fetchJson(apiBase, `/api/v1/notes/${notes[1].id}/relations`)).json.item.outgoingLinks, []);
  const themes = (await fetchJson(apiBase, '/api/v1/index-cards?limit=50')).json.items;
  const articles = (await fetchJson(apiBase, '/api/v1/writing-projects?limit=50')).json.items;
  await page.goto(`${webBase}/prototype`, { waitUntil: 'networkidle' });
  await page.locator('.rail-btn[data-action="quick-original"]').click();
  await page.locator(`.explorer-item[data-kind="folder"][data-id="${directory.id}"]`).click();
  await page.locator(`.explorer-item[data-kind="file"][data-id="${notes[0].id}"]`).click();
  await page.locator('#wysiwygHost:visible').waitFor();
  if (!await page.locator('#relatedPanel').isVisible()) await page.locator('#btnShowRelated').click();
  await page.locator('[data-permanent-workspace-tab="relations"]').click();
  const route = page.locator('#relatedPanel [data-permanent-relation-action="open"][data-permanent-relation-mode="manual"]:visible');
  await route.waitFor();
  assert.equal((await route.innerText()).trim(), '搜索笔记');
  assert.deepEqual(await readRelations(), baseline);
  await route.click();
  let composer = page.locator('[data-permanent-relation-workspace]:visible'); await composer.waitFor();
  await composer.locator('[data-permanent-relation-target-search]').fill(notes[1].title);
  await composer.locator(`[data-permanent-relation-manual-target="${notes[1].id}"]`).click();
  await composer.locator('[data-permanent-relation-type-choice="supports"]').click();
  await composer.locator('textarea[name="rationale"]').fill("未提交的说明，不应因为共享标签而自动保存。");
  await closeGraphRelationComposer(composer);
  await assertSourcesUnchanged();
  assert.deepEqual(await readRelations(), baseline);
  await route.click(); composer = page.locator('[data-permanent-relation-workspace]:visible'); await composer.waitFor();
  await composer.locator('[data-permanent-relation-target-search]').fill(notes[1].title);
  await composer.locator(`[data-permanent-relation-manual-target="${notes[1].id}"]`).click();
  await composer.locator('[data-permanent-relation-type-choice="supports"]').click();
  const rationale = "材料提供判断的具体核对依据，因此支持这条判断；共同标签只帮助找到材料。";
  await composer.locator('textarea[name="rationale"]').fill(rationale);
  await composer.locator('button[type="submit"]').click();
  await composer.locator('.permanent-relation-result').waitFor();
  await waitFor(async () => {
    const links = (await readRelations()).outgoingLinks;
    assert.equal(links.length, 1); assert.equal(links[0].toNoteId, notes[1].id);
    assert.equal(links[0].relationType, 'supports'); assert.equal(links[0].rationale, rationale);
  });
  for (const [index, note] of notes.entries()) {
    const read = (await fetchJson(apiBase, `/api/v1/notes/${note.id}`)).json.item;
    for (const key of ['title', 'body', 'thesis', 'threeLineSummary', 'boundaryOrCounterpoint', 'authorship', 'distillationStatus', 'originalityStatus']) assert.deepEqual(read[key], noteSnapshots[index][key], key);
    assert.deepEqual(await fs.readFile(path.join(stack.vaultPath, note.markdownPath)), noteFiles[index]);
  }
  assert.deepEqual(aiRequestPaths, []);
  assert.deepEqual((await fetchJson(apiBase, '/api/v1/index-cards?limit=50')).json.items, themes);
  assert.deepEqual((await fetchJson(apiBase, '/api/v1/writing-projects?limit=50')).json.items, articles);
});
