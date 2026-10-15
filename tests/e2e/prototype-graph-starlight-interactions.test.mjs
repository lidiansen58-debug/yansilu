import test from "node:test";
import assert from "node:assert/strict";
import { startGraphPresentationStack, openPresentationGraph, assertPresentationDoesNotWrite } from "./prototype-graph-presentation-flow-helpers.mjs";
import { waitFor, fetchJson } from "./prototype-copy-test-helpers.mjs";
import { snapshotDemoNoteInventory } from "./prototype-demo-inventory-helpers.mjs";

test("dense graph opens group, node and edge details through the visible canvas", async t => {
  const stack = await startGraphPresentationStack(t); if (!stack) return;
  const { page } = stack;
  await openPresentationGraph(stack);
  const cluster = page.locator('.graph-map-cluster-glow[data-graph-select-cluster]').first();
  await cluster.focus(); await cluster.press("Enter");
  const group = page.locator('.graph-selection-panel.is-cluster:visible');
  await group.waitFor();
  assert.match(await group.innerText(), /笔记组|条笔记/);
  assert.ok(await group.locator('[data-open-note]').count() > 0);
  await group.locator('[data-graph-selection-close]').click();
  await group.waitFor({ state: "hidden" });
  const node = page.locator('.graph-map-node[data-node-id="star-1"]');
  await node.focus(); await node.press("Enter");
  const selected = page.locator('.graph-selection-panel.is-node:visible');
  await selected.waitFor();
  assert.match(await selected.innerText(), /Star Note 1/);
  assert.ok(await selected.locator('.graph-relation-workspace-card').count() > 0);
  const edge = page.locator('.graph-map-edge-group[data-edge-from]').first();
  await edge.focus(); await edge.press("Enter");
  const relation = page.locator('.graph-selection-panel.is-edge:visible');
  await relation.waitFor();
  assert.match(await relation.innerText(), /关系理由/);
  assert.equal(await relation.getByRole('button', { name: '编辑关联', exact: true }).isEnabled(), true);
  await assertPresentationDoesNotWrite(stack);
});

test("dense graph task panels and zoom controls remain usable without a visible density banner", async t => {
  const stack = await startGraphPresentationStack(t); if (!stack) return;
  const { page } = stack;
  await openPresentationGraph(stack);
  assert.equal(await page.locator('.graph-density-hint:visible').count(), 0);
  for (const task of ["relations", "themes"]) {
    await page.locator(`[data-graph-task-view="${task}"]`).click();
    const panel = page.locator('.graph-workbench-panel:visible'); await panel.waitFor();
    assert.equal(await page.locator(`[data-graph-task-view="${task}"]`).getAttribute('aria-pressed'), 'true');
    await panel.locator('[data-graph-workbench-close]').click();
    await panel.waitFor({ state: "hidden" });
  }
  await page.locator('[data-graph-task-view="structure"]').click();
  const svg = page.locator('.graph-map-svg').first();
  assert.equal(await svg.getAttribute('data-graph-zoom'), 'fit');
  await page.locator('[data-graph-zoom-step="1"]').click();
  assert.equal(await svg.getAttribute('data-graph-zoom'), 'read');
  await page.locator('[data-graph-zoom-step="-1"]').click();
  assert.equal(await svg.getAttribute('data-graph-zoom'), 'fit');
  await assertPresentationDoesNotWrite(stack);
});

test("dense graph expires its hidden density guidance after ten seconds without losing keyboard focus", async t => {
  const stack = await startGraphPresentationStack(t); if (!stack) return;
  const { page } = stack;
  await openPresentationGraph(stack);
  assert.equal(await page.locator('.graph-density-hint').count(), 1);
  assert.equal(await page.locator('.graph-density-hint:visible').count(), 0);
  await page.locator('[data-graph-zoom-step="1"]').focus();
  await waitFor(async () => assert.equal(await page.locator('.graph-density-hint').count(), 0), 12000, 250);
  assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('data-graph-zoom-step')), '1');
  await page.keyboard.press('Enter');
  assert.equal(await page.locator('.graph-map-svg').first().getAttribute('data-graph-zoom'), 'read');
  await assertPresentationDoesNotWrite(stack);
});

test("graph analysis restores the theme workbench when its pending response completes after closure", async t => {
  const stack = await startGraphPresentationStack(t); if (!stack) return;
  const { page } = stack;
  let release, analyses = 0;
  const pending = new Promise(resolve => { release = resolve; });
  t.after(() => release());
  await page.route('**/api/v1/graph/ai-analysis', async route => {
    analyses++; await pending;
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ item: {
      analysis: { topicCandidates: [{ title: '需要用户确认的主题', noteIds: ['star-1', 'star-2', 'star-3'], rationale: '这些材料可能共同回答一个问题，确认前不保存。' }], relationCandidates: [], bridgeCandidates: [], isolatedNotes: [] },
      reviewItems: { summary: { artifactCount: 1, topicCandidateCount: 1, relationCandidateCount: 0, bridgeCandidateCount: 0, isolatedNoteCount: 0 } }
    } }) });
  });
  await openPresentationGraph(stack);
  await page.locator('[data-graph-task-view="themes"]').click();
  await page.locator('.graph-workbench-panel [data-graph-workbench-close]').click();
  assert.equal(await page.locator('.graph-workbench-panel:visible').count(), 0);
  await page.locator('[data-run-graph-ai-analysis="theme"]').click();
  await waitFor(async () => assert.equal(analyses, 1));
  await page.locator('.graph-workbench-panel [data-graph-workbench-close]').click();
  assert.equal(await page.locator('.graph-workbench-panel:visible').count(), 0);
  await assertPresentationDoesNotWrite(stack);
  release();
  await waitFor(async () => {
    assert.equal(await page.locator('[data-graph-task-view="themes"]').getAttribute('aria-pressed'), 'true');
    assert.equal(await page.locator('.graph-workbench-panel:visible').count(), 1);
    assert.match(await page.locator('#statusText').innerText(), /已找到 1 条建议/);
  });
  assert.equal(analyses, 1);
  await assertPresentationDoesNotWrite(stack);
});

test("example startup preserves the user's graph filter and resets zoom and open panels", async t => {
  const stack = await startGraphPresentationStack(t); if (!stack) return;
  const { page, webBase, apiBase } = stack;
  await page.addInitScript(() => {
    localStorage.setItem('yansilu:graph:relation-type-filter', 'supports');
    localStorage.setItem('yansilu:graph:focus-depth', 'all');
  });
  await page.goto(`${webBase}/prototype?demo=smart-notes-product-thinking`, { waitUntil: 'networkidle' });
  await waitFor(async () => assert.match(await page.locator('#statusText').innerText(), /已导入 Smart Notes Demo/), 20000);
  const inventory = await snapshotDemoNoteInventory(apiBase);
  await page.locator('.rail-btn[data-module="graph"]').click();
  await waitFor(async () => {
    assert.equal(await page.locator('#graphRelationTypeFilter').inputValue(), 'supports');
    assert.equal(await page.locator('.graph-map-svg').first().getAttribute('data-graph-zoom'), 'fit');
    assert.equal(await page.locator('.graph-workbench-panel:visible').count(), 0);
  });
  assert.deepEqual(await snapshotDemoNoteInventory(apiBase), inventory);
  assert.equal((await fetchJson(apiBase, '/api/v1/writing-projects/WRITE-SMART-NOTES-DEMO')).status, 200);
});
