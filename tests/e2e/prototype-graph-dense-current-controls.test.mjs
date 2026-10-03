import test from "node:test";
import assert from "node:assert/strict";
import { optionalPlaywright, startPrototypeStack, waitFor } from "./prototype-copy-test-helpers.mjs";

test("current dense graph keeps 132 nodes selectable, filters edges, zooms and expands", async t => {
  if (process.env.RUN_BROWSER_E2E !== "1") { t.skip("Set RUN_BROWSER_E2E=1"); return; }
  const pw = await optionalPlaywright(t);
  if (!pw) return;
  const stack = await startPrototypeStack(t, pw);
  if (!stack) return;
  const { page, webBase } = stack;
  const nodes = Array.from({ length: 132 }, (_, i) => ({ id: `dense-${i}`, title: `Dense note ${i}`, noteType: "original", directoryId: "dir_original_default", folderId: "dir_original_default" }));
  const edges = nodes.map((n, i) => ({ id: `edge-${i}`, fromNoteId: n.id, toNoteId: nodes[(i + 1) % nodes.length].id,
    fromTitle: n.title, toTitle: nodes[(i + 1) % nodes.length].title, relationType: i % 5 ? "supports" : "contradicts",
    rationale: "Synthetic density fixture: a human relation explanation.", status: "confirmed", createdBy: "user" }));
  const errors = [];
  page.on("pageerror", e => errors.push(e.message));
  await page.route('**/api/v1/graph?*', r => r.fulfill({ json: { item: { directoryTitle: "Density fixture", nodes, edges, insights: { bridgeGaps: [], untypedRelations: [] } } } }));
  await page.goto(`${webBase}/prototype`, { waitUntil: "networkidle" });
  await page.locator('.rail-btn[data-module="graph"]').click();
  await waitFor(async () => assert.equal(await page.locator('.graph-map-node').count(), 132));
  const svg = page.locator('.graph-map-svg').first();
  const zoom = await svg.getAttribute('data-graph-zoom');
  await page.locator('[data-graph-zoom-step="1"]').click();
  await waitFor(async () => assert.notEqual(await svg.getAttribute('data-graph-zoom'), zoom));
  await page.locator('[data-graph-zoom-step="-1"]').click();
  await waitFor(async () => assert.equal(await svg.getAttribute('data-graph-zoom'), zoom));
  await page.locator('[data-graph-toggle-expanded="on"]').click();
  assert.equal(await page.locator('.graph-map-panel.is-expanded').count(), 1);
  await page.locator('[data-graph-toggle-expanded="off"]').click();
  await page.locator('#graphRelationTypeFilter').selectOption('contradicts');
  await waitFor(async () => assert.equal(await page.locator('.graph-map-edge-group').count(), edges.filter(e => e.relationType === 'contradicts').length));
  await page.locator('.graph-map-edge-group').first().focus();
  await page.keyboard.press('Enter');
  const panel = page.locator('.graph-selection-panel.is-edge');
  await panel.waitFor({ state: 'visible' });
  assert.match(await panel.innerText(), /Synthetic density fixture/);
  await panel.locator('[data-graph-selection-close]').click();
  await page.locator('.graph-map-node[data-node-id="dense-0"]').focus();
  await page.keyboard.press('Enter');
  await page.locator('.graph-selection-panel.is-node', { hasText: 'Dense note 0' }).waitFor({ state: 'visible' });
  assert.deepEqual(errors, []);
});
