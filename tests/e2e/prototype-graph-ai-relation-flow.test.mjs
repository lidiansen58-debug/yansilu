import test from "node:test";
import assert from "node:assert/strict";
import { optionalPlaywright, startPrototypeStack, postJson, fetchJson, waitFor } from "./prototype-copy-test-helpers.mjs";

for (const width of [1366, 390]) {
test(`graph AI candidates require confirmation and late responses preserve a new node selection (${width}px)`, async t => {
  if (process.env.RUN_BROWSER_E2E !== "1") { t.skip("Set RUN_BROWSER_E2E=1"); return; }
  const pw = await optionalPlaywright(t);
  if (!pw) return;
  const stack = await startPrototypeStack(t, pw);
  if (!stack) return;
  const { page, apiBase } = stack;
  const create = async title => (await postJson(apiBase, "/api/v1/notes", {
    directoryId: "dir_original_default", body: `# ${title}\n\n独立观点。`
  })).json.item;
  const source = await create("AI 关联来源"), target = await create("AI 推荐目标"), other = await create("迟到的推荐目标");
  await page.locator('.rail-btn[data-module="graph"]').click();
  await page.waitForFunction(() => window.__prototypeState.graphConnectivityReady === true);
  await page.setViewportSize({ width, height: 900 });
  let hold = false, release, entered;
  const held = new Promise(done => { release = done; });
  const started = new Promise(done => { entered = done; });
  t.after(() => release());
  await page.route("**/api/v1/graph/ai-analysis", async route => {
    const candidateTarget = hold ? other : target;
    if (hold) { entered(); await held; }
    await route.fulfill({ status: 200, json: { item: {
      analysis: { analysisMode: "local_graph_rule", relationCandidates: [{
        sourceNoteId: source.id, targetNoteId: candidateTarget.id, relationType: "supports",
        rationale: "目标的独立论据支持当前观点。", confidence: 0.8
      }], bridgeCandidates: [] }, reviewItems: { summary: { artifactCount: 1 } }
    } } });
  });
  assert.equal(await page.evaluate(id => window.__prototypeGraph.runAiConnectForNote(id), source.id), true);
  const workspace = page.locator("[data-permanent-relation-workspace]");
  await workspace.waitFor({ state: "visible" });
  const read = async () => (await fetchJson(apiBase, `/api/v1/notes/${source.id}/relations`)).json.item.outgoingLinks;
  assert.equal((await read()).length, 0);
  assert.match(await workspace.innerText(), /AI 推荐目标/);
  assert.match(await workspace.locator('textarea[name="rationale"]').inputValue(), /独立论据/);
  await workspace.locator('button[type="submit"]').click();
  await page.waitForFunction(() => {
    const draft = window.__prototypeEditor.permanentRelationWorkspaceState;
    return draft.saveState === "saved" || draft.error;
  }, null, { timeout: 8000 }).catch(async error => {
    throw new Error(`${error.message}\n${JSON.stringify(await page.evaluate(() => ({
      draft: window.__prototypeEditor.permanentRelationWorkspaceState,
      active: window.__prototypeEditor.activeNote()?.id,
      module: window.__prototypeState.module
    })))}`);
  });
  assert.equal(await page.evaluate(() => window.__prototypeEditor.permanentRelationWorkspaceState.error), "");
  await workspace.locator(".permanent-relation-result").waitFor();
  assert.ok((await read()).some(link => link.toNoteId === target.id && link.relationType === "supports"));
  await workspace.locator('[data-permanent-relation-action="complete"]').click();
  const chart = await page.locator('.graph-map-viewport').boundingBox();
  const details = await page.locator('.graph-side-stack').boundingBox();
  assert.ok(chart && details);
  if (width > 920) assert.ok(details.x >= chart.x + chart.width, "Details must not cover the graph on desktop");
  else assert.ok(details.y >= chart.y + chart.height, "Narrow screens place details below the graph");
  hold = true;
  await page.evaluate(id => { window.__heldAiConnect = window.__prototypeGraph.runAiConnectForNote(id); }, source.id);
  await started;
  assert.equal(await page.locator(`#graphCanvas .graph-map-node[data-node-id="${target.id}"] .graph-map-node-hit`).evaluate(node => {
    const rect = node.getBoundingClientRect();
    const top = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
    return top?.closest('.graph-map-node')?.dataset.nodeId === node.closest('.graph-map-node').dataset.nodeId;
  }), true, "A neighbouring clickable title must not cover the node centre");
  await page.locator(`#graphCanvas .graph-map-node[data-node-id="${target.id}"] .graph-map-node-hit`).click();
  await page.locator(".graph-selection-panel", { hasText: target.title }).waitFor();
  release();
  assert.equal(await page.evaluate(() => window.__heldAiConnect), false);
  await waitFor(async () => assert.equal(await workspace.count(), 0));
  assert.ok(await page.locator(".graph-selection-panel", { hasText: target.title }).isVisible());
  assert.ok(!(await read()).some(link => link.toNoteId === other.id));
});
}

test("twelve linked long-title notes remain framed and clickable on narrow screens", async t => {
  if (process.env.RUN_BROWSER_E2E !== "1") { t.skip("Set RUN_BROWSER_E2E=1"); return; }
  const pw = await optionalPlaywright(t);
  if (!pw) return;
  const stack = await startPrototypeStack(t, pw);
  if (!stack) return;
  const { page, apiBase } = stack;
  const titles = Array.from({ length: 12 }, (_, i) => `第${i + 1}条用于验证小图完整可点击区域的长标题`);
  const notes = [];
  for (const [i, title] of titles.entries()) notes.push((await postJson(apiBase, "/api/v1/notes", {
    directoryId: "dir_original_default", body: `# ${title}\n\n${i + 1 < titles.length ? `[[${titles[i + 1]}]]` : "独立观点。"}`
  })).json.item);
  for (let i = 0; i + 1 < notes.length; i++) {
    const saved = await postJson(apiBase, `/api/v1/notes/${notes[i].id}/relations`, {
      toNoteId: notes[i + 1].id, relationType: "supports", rationale: "相邻观点形成已经确认的验证关系。", status: "confirmed"
    });
    assert.equal(saved.status, 201);
  }
  const graph = (await fetchJson(apiBase, "/api/v1/graph?scope=directory&directoryId=dir_original_default&includeDescendants=true")).json.item;
  assert.equal(graph.nodes.length, 12);
  assert.ok(notes.slice(0, -1).every((note, i) => graph.edges.some(edge => edge.fromNoteId === note.id && edge.toNoteId === notes[i + 1].id && edge.status === "confirmed")),
    "The detail-navigation fixture must contain actual confirmed relations");
  await page.locator('.rail-btn[data-module="graph"]').click();
  await page.waitForFunction(() => window.__prototypeState.graphConnectivityReady === true);
  await waitFor(async () => assert.equal(await page.locator('#graphCanvas .graph-map-node').count(), 12));
  for (const width of [1366, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    const reading = await page.locator('#graphCanvas .graph-map-node').evaluateAll(nodes => nodes.map(node => {
      const label = node.querySelector('.graph-map-node-label'), hit = node.querySelector('.graph-map-node-hit');
      const bounds = label.getBoundingClientRect(), rect = hit.getBoundingClientRect();
      const frame = node.closest('svg').getBoundingClientRect();
      const top = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
      return { id: node.dataset.nodeId, framed: bounds.left >= frame.left && bounds.right <= frame.right && bounds.top >= frame.top && bounds.bottom <= frame.bottom,
        receivesClick: top?.closest('.graph-map-node')?.dataset.nodeId === node.dataset.nodeId };
    }));
    assert.ok(reading.every(node => node.framed && node.receivesClick), `${width}px ${JSON.stringify(reading)}`);
    await page.locator(`#graphCanvas .graph-map-node[data-node-id="${notes[4].id}"] .graph-map-node-hit`).click();
    await page.locator('.graph-selection-panel', { hasText: notes[4].title }).waitFor().catch(async error => {
      const ui = await page.evaluate(() => ({ module: window.__prototypeState.module,
        selected: [...document.querySelectorAll('.graph-map-node.is-selected, .graph-map-node.is-isolated-selected')].map(node => ({ id: node.dataset.nodeId, title: node.dataset.nodeTitle })),
        panels: [...document.querySelectorAll('.graph-selection-panel')].map(node => ({ visible: Boolean(node.getClientRects().length), heading: node.querySelector('h2,h3,strong')?.textContent })),
        composer: Boolean(document.querySelector('[data-permanent-relation-workspace]')) }));
      throw new Error(`${width}px clicked ${notes[4].id}: ${error.message}\n${JSON.stringify(ui)}`);
    });
    await page.locator('[data-graph-selection-close]').click();
  }
});
