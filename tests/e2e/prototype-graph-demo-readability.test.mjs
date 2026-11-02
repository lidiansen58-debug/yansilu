import test from "node:test";
import assert from "node:assert/strict";
import { seedSmartNotesProductThinking } from "../../scripts/seed-smart-notes-product-thinking.mjs";
import { fetchJson, optionalPlaywright, startPrototypeStack, useWritingMarkdown, waitFor } from "./prototype-copy-test-helpers.mjs";
import { snapshotDemoNoteInventory } from "./prototype-demo-inventory-helpers.mjs";

test("the real bundled demo is readable and leads from saved relationships to a saved article without AI", { timeout: 90000 }, async t => {
  if (process.env.RUN_BROWSER_E2E !== "1") { t.skip("Set RUN_BROWSER_E2E=1"); return; }
  const pw = await optionalPlaywright(t); if (!pw) return;
  const stack = await startPrototypeStack(t, pw, { prepareVault: vault => seedSmartNotesProductThinking(vault) });
  if (!stack) return;
  const { page, apiBase } = stack;
  const inventory = await snapshotDemoNoteInventory(apiBase);
  const modelCalls = [], errors = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("request", request => {
    if (request.method() === "POST" && /ai-analysis|\/ai\/|\/agent-runs|\/test-chat/.test(new URL(request.url()).pathname)) modelCalls.push(request.url());
  });
  const graph = (await fetchJson(apiBase, "/api/v1/graph?scope=directory&directoryId=dir_original_default&includeDescendants=true")).json.item;
  assert.equal(graph.nodes.length, 24); assert.equal(graph.edges.length, 51);
  await page.locator('.rail-btn[data-module="graph"]').click();
  await page.waitForFunction(() => window.__prototypeState.graphConnectivityReady);
  await page.locator('.graph-map-node').first().waitFor({ state: "attached" });
  assert.equal(await page.locator('.graph-map-node').count(), 24);
  assert.equal(await page.locator('.graph-map-edge').count(), 51);
  for (const width of [1366, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    for (const zoom of ["fit", "read", "detail"]) {
      await page.locator(`[data-graph-zoom-option="${zoom}"]`).click();
      assert.equal(await page.locator('.graph-map-node-label').count(), 24, 'Every demo note has a readable title');
      const overlap = await page.locator('.graph-map-node-label').evaluateAll(labels => {
        const boxes = labels.filter(label => Number(getComputedStyle(label).opacity) > .5)
          .map(label => ({ title: label.textContent, rect: label.getBoundingClientRect() }));
        const pairs = [];
        for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
          const a = boxes[i].rect, b = boxes[j].rect;
          if (a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top) pairs.push([boxes[i].title, boxes[j].title]);
        }
        return pairs;
      });
      assert.deepEqual(overlap, [], `${width}px ${zoom}: Demo titles must not cover each other`);
    }
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  }
  await page.setViewportSize({ width: 1366, height: 900 });
  const first = page.locator('.graph-map-node-core').first();
  await first.scrollIntoViewIfNeeded();
  await first.click();
  await page.locator('.graph-selection-panel.is-node:visible').waitFor();
  await page.locator('[data-graph-selection-close]').click();
  await page.locator('#graphRelationTypeFilter').selectOption('meaningful');
  assert.equal(await page.locator('.graph-map-edge').count(), 12);
  await page.locator('#graphRelationTypeFilter').selectOption('all');
  assert.equal(await page.locator('.graph-map-edge').count(), 51);
  await page.locator('[data-graph-task-view="relations"]').click();
  assert.match(await page.locator('.graph-workbench-panel').innerText(), /补充关联/);
  assert.doesNotMatch(await page.locator('.graph-workbench-panel').innerText(), /正文关联/);
  await page.locator('[data-graph-task-view="themes"]').click();
  const materials = page.locator('.graph-workbench-panel [data-graph-create-theme-index]');
  assert.equal(await materials.count(), 3);
  const ids = (await materials.first().getAttribute('data-graph-theme-note-ids')).split(',').sort();
  await materials.first().click();
  const form = page.locator('[data-graph-theme-confirmation-form]');
  await form.waitFor();
  assert.equal(await form.locator('input[name="noteId"]:checked').count(), ids.length);
  const question = '怎样把记录变成可以继续使用的判断？';
  await form.locator('#graphThemeQuestion').fill(question);
  await form.locator('button[type="submit"]').click();
  await page.locator('#writingTitle:visible').waitFor();
  assert.equal(await page.locator('#writingGoal').inputValue(), question);
  assert.deepEqual((await page.locator('#writingBasketList article[data-writing-note-id]').evaluateAll(es => es.map(e => e.dataset.writingNoteId))).sort(), ids);
  await page.locator('#btnWritingCreateScaffold').click();
  await page.locator('#btnWritingStartDraft:visible').click();
  await useWritingMarkdown(page);
  const body = `# ${question}\n\n记录先保留想法，再用自己的话说明判断。\n\n关联的理由、反方和边界，让旧笔记在新问题中继续使用。\n`;
  await page.locator('#writingDraftEditor').fill(body);
  await page.locator('#btnWritingSaveDraft').click();
  await waitFor(async () => {
    const project = (await fetchJson(apiBase, '/api/v1/writing-projects?limit=50')).json.items.find(item => item.title === question);
    assert.ok(project?.draft_note_id);
    assert.equal((await fetchJson(apiBase, `/api/v1/notes/${project.draft_note_id}`)).json.item.body, body);
  });
  assert.deepEqual(await snapshotDemoNoteInventory(apiBase), inventory);
  assert.deepEqual(modelCalls, []); assert.deepEqual(errors, []);
});
