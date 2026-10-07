import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { seedSmartNotesProductThinking } from "../../scripts/seed-smart-notes-product-thinking.mjs";
import { optionalPlaywright, startPrototypeStack, fetchJson, waitFor } from "./prototype-copy-test-helpers.mjs";
import { graphBuildVisualLayout } from "../../apps/web/src/graph-visual-layout.js";

const fixturePath = fileURLToPath(new URL("../fixtures/graph-archived-real-demo.json", import.meta.url));

for (const width of [1366, 390, 320]) {
  test(`archived real graph keeps cluster paths and reading viewport at ${width}`, async t => {
    if (process.env.RUN_BROWSER_E2E !== "1") { t.skip("Set RUN_BROWSER_E2E=1"); return; }
    const pw = await optionalPlaywright(t);
    if (!pw) return;
    const stack = await startPrototypeStack(t, pw);
    if (!stack) return;
    const { page, apiBase, webBase, vaultPath } = stack;
    if (process.env.GRAPH_VIEWPORT_TRACE === '1') {
      await page.addInitScript(() => {
        window.__graphViewportTrace = [];
        for (const key of ['scrollLeft', 'scrollTop']) {
          const descriptor = Object.getOwnPropertyDescriptor(Element.prototype, key);
          Object.defineProperty(Element.prototype, key, { ...descriptor, set(value) {
            if (this.classList.contains('graph-map-viewport')) {
              window.__graphViewportTrace.push({ key, value, stack: new Error().stack.split('\n').slice(1, 7).join('\n') });
            }
            descriptor.set.call(this, value);
          } });
        }
      });
    }
    const directory = path.resolve('output/graph-real-reading', String(width));
    await fs.mkdir(directory, { recursive: true });
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await seedSmartNotesProductThinking(vaultPath, { fixturePath });
    const response = await fetchJson(apiBase, "/api/v1/graph?scope=directory&directoryId=dir_original_default&includeDescendants=true");
    assert.equal(response.status, 200, JSON.stringify(response.json));
    const graph = response.json.item;
    t.diagnostic(`Real saved graph: ${graph.nodes.length} notes, ${graph.edges.length} relations`);
    assert.ok(graph.nodes.length >= 48);
    assert.ok(graph.edges.length >= 104);
    const layout = graphBuildVisualLayout(graph.nodes, graph.edges);
    for (const cluster of layout.clusterMeta) {
      const members = new Set(cluster.memberIds), reached = new Set([cluster.anchorId]);
      const queue = [cluster.anchorId];
      for (let i = 0; i < queue.length; i += 1) {
        for (const edge of graph.edges) {
          const neighbor = edge.fromNoteId === queue[i] ? edge.toNoteId : edge.toNoteId === queue[i] ? edge.fromNoteId : null;
          if (members.has(neighbor) && !reached.has(neighbor)) { reached.add(neighbor); queue.push(neighbor); }
        }
      }
      assert.deepEqual([...reached].sort(), [...members].sort());
    }
    assert.ok(new Set(layout.clusterMeta.map(cluster => cluster.clusterKey)).size >= 2);
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`${webBase}/prototype`, { waitUntil: "networkidle" });
    await page.locator('.rail-btn[data-module="graph"]').click();
    await page.waitForFunction(() => window.__prototypeState.graphConnectivityReady);
    await page.locator('.graph-map-node').first().waitFor();
    const visibleIds = await page.locator('.graph-map-node').evaluateAll(nodes => nodes.map(node => node.dataset.nodeId));
    assert.ok(visibleIds.length >= 48);
    assert.ok(visibleIds.every(id => graph.nodes.some(node => node.id === id)));
    const clustered = page.locator('[data-graph-select-cluster]').first();
    await clustered.focus();
    await clustered.press("Enter");
    await page.locator('.graph-selection-panel.is-cluster').waitFor();
    const panel = page.locator('.graph-selection-panel.is-cluster');
    const clusterMembers = await panel.locator('[data-graph-theme-note-ids]').getAttribute('data-graph-theme-note-ids');
    const members = clusterMembers.split(',');
    assert.ok(members.length > 5, 'The real group must exercise the additional-note list');
    assert.ok(members.every(id => graph.nodes.some(node => node.id === id)));
    assert.deepEqual((await panel.locator('[data-open-note]').evaluateAll(notes => notes.map(note => note.dataset.openNote))).sort(), [...members].sort());
    assert.equal(await panel.locator('[data-open-note]:visible').count(), 5);
    assert.equal(await panel.locator('.graph-selection-role, .graph-selection-metrics, .graph-selection-reason, .graph-selection-prompt-details').count(), 0);
    assert.equal(await panel.locator('.graph-selection-action.is-primary').count(), 1);
    const heading = await panel.locator('.graph-selection-head strong').boundingBox();
    const close = await panel.locator('[data-graph-selection-close]').boundingBox();
    assert.ok(heading.x + heading.width <= close.x + 1, 'The close button must not overlap the group title');
    const more = panel.locator('.graph-cluster-more-notes');
    const relationSummary = panel.locator('.graph-cluster-relations');
    assert.equal(await more.getAttribute('open'), null);
    assert.equal(await relationSummary.getAttribute('open'), null);
    await page.screenshot({ path: path.join(directory, 'selected-cluster.png'), fullPage: true });
    await more.locator('summary').focus();
    await more.locator('summary').press('Enter');
    await waitFor(async () => assert.notEqual(await more.getAttribute('open'), null));
    await relationSummary.locator('summary').focus();
    await relationSummary.locator('summary').press('Enter');
    await waitFor(async () => assert.notEqual(await relationSummary.getAttribute('open'), null));
    const memberSet = new Set(members);
    const externalRelations = graph.edges.filter(edge => memberSet.has(edge.fromNoteId) !== memberSet.has(edge.toNoteId));
    assert.equal((await relationSummary.locator('dd').first().textContent()).trim(), `${externalRelations.length} 条`);
    const targetId = await more.locator('[data-open-note]').first().getAttribute('data-open-note');
    assert.ok(graph.nodes.some(node => node.id === targetId));
    await page.locator('[data-graph-zoom-step="1"]').click();
    await page.locator('[data-graph-zoom-step="1"]').click();
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    if (width === 390) {
      await page.locator('[data-graph-toggle-expanded="on"]').click();
      await page.locator('[data-graph-zoom-step="-1"]').click();
      await page.locator('[data-graph-zoom-step="1"]').click();
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    }
    const targetButton = panel.locator(`[data-open-note="${targetId}"]`);
    await targetButton.scrollIntoViewIfNeeded();
    const detailScroll = await panel.locator('.graph-selection-body').evaluate(element => element.scrollTop);
    if (width === 1366 || width === 390) assert.ok(detailScroll > 0, 'Read a note below the initially visible list');
    const viewport = page.locator('.graph-map-viewport');
    await viewport.evaluate((element, noteId) => {
      const node = [...element.querySelectorAll('.graph-map-node')].find(item => item.dataset.nodeId === noteId);
      const bounds = node.getBoundingClientRect(), frame = element.getBoundingClientRect();
      element.scrollLeft += bounds.left - frame.left - element.clientWidth * .35;
      element.scrollTop += bounds.top - frame.top - element.clientHeight * .3;
    }, targetId);
    const before = await viewport.evaluate(element => ({ left: element.scrollLeft, top: element.scrollTop }));
    const beforeMemory = process.env.GRAPH_VIEWPORT_TRACE === '1' ? await page.evaluate(async () =>
      (await import('/graph-viewport-memory.js')).captureGraphViewport(document)) : null;
    assert.ok(before.left > 0 || before.top > 0, 'Zoom must permit inspecting a local cluster');
    const zoom = await page.locator('.graph-map-svg').getAttribute('data-graph-zoom');
    assert.notEqual(await more.getAttribute('open'), null, 'Zoom must preserve the expanded member list');
    assert.notEqual(await relationSummary.getAttribute('open'), null, 'Zoom must preserve the relation disclosure');
    if (width === 1366 || width === 390) {
      const bounds = await panel.locator('[data-graph-create-theme-index]').boundingBox();
      const frame = await panel.boundingBox();
      assert.ok(bounds.y >= frame.y && bounds.y + bounds.height <= frame.y + frame.height + 1, 'Primary action must remain outside the scrolling list');
      assert.equal(await panel.locator('[data-graph-create-theme-index]').evaluate(button => {
        const rect = button.getBoundingClientRect();
        return button.contains(document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2));
      }), true, 'The primary action must not be clipped or covered');
    }
    await page.screenshot({ path: path.join(directory, 'local-cluster.png'), fullPage: true });
    await targetButton.click();
    await page.waitForFunction(id => window.__prototypeEditor.activeNote()?.id === id &&
      window.__prototypeState.module === "explorer", targetId);
    const savedNote = await fetchJson(apiBase, `/api/v1/notes/${targetId}`);
    assert.equal(savedNote.status, 200);
    assert.ok(savedNote.json.item.body.length > 60);
    const noteBytes = await fs.readFile(path.join(vaultPath, savedNote.json.item.markdownPath));
    assert.ok(noteBytes.toString('utf8').includes(savedNote.json.item.title));
    await page.locator('.rail-btn[data-module="graph"]').click();
    await page.locator('.graph-selection-panel.is-cluster').waitFor();
    assert.equal(await page.locator('.graph-map-panel.is-expanded').count(), width === 390 ? 1 : 0);
    await waitFor(async () => {
      assert.equal(await page.locator('.graph-map-svg').getAttribute('data-graph-zoom'), zoom);
      assert.equal(await page.locator('.graph-selection-panel [data-graph-theme-note-ids]').getAttribute('data-graph-theme-note-ids'), clusterMembers);
      assert.notEqual(await more.getAttribute('open'), null, 'Reading return must preserve the expanded member list');
      assert.notEqual(await relationSummary.getAttribute('open'), null, 'Reading return must preserve the relation disclosure');
      assert.equal(await panel.locator('.graph-selection-body').evaluate(element => element.scrollTop), detailScroll,
        'Reading return must preserve the position in the note list');
      const after = await viewport.evaluate(element => ({ left: element.scrollLeft, top: element.scrollTop }));
      assert.ok(Math.abs(after.left - before.left) <= 1 && Math.abs(after.top - before.top) <= 1,
        `Reading return moved from ${JSON.stringify(before)} to ${JSON.stringify(after)}`);
    });
    await page.evaluate(() => window.__prototypeEditor.refreshDirectoryGraph());
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    await page.waitForTimeout(300);
    const stable = await viewport.evaluate(element => ({ left: element.scrollLeft, top: element.scrollTop }));
    if (JSON.stringify(stable) !== JSON.stringify(before) && process.env.GRAPH_VIEWPORT_TRACE === '1') {
      t.diagnostic(JSON.stringify(await page.evaluate(() => window.__graphViewportTrace.slice(-8)), null, 2));
      const afterMemory = await page.evaluate(async () => (await import('/graph-viewport-memory.js')).captureGraphViewport(document));
      const oldKey = JSON.parse(beforeMemory.key), newKey = JSON.parse(afterMemory.key);
      t.diagnostic(JSON.stringify({ previous: oldKey.slice(0, 3), current: newKey.slice(0, 3),
        nodesBefore: oldKey[3].length, nodesAfter: newKey[3].length, edgesBefore: oldKey[4].length, edgesAfter: newKey[4].length,
        changedNodes: newKey[3].filter((node, i) => JSON.stringify(node) !== JSON.stringify(oldKey[3][i])).slice(0, 6),
        oldNodes: oldKey[3].slice(0, 6), newNodes: newKey[3].slice(0, 6),
        changedEdges: newKey[4].filter((edge, i) => JSON.stringify(edge) !== JSON.stringify(oldKey[4][i])).slice(0, 6)
      }, null, 2));
    }
    assert.deepEqual(stable, before);
    assert.deepEqual(await fs.readFile(path.join(vaultPath, savedNote.json.item.markdownPath)), noteBytes);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    await page.screenshot({ path: path.join(directory, 'returned-cluster.png'), fullPage: true });
    assert.deepEqual(errors, []);
  });
}

test('real cluster theme action uses every member, including collapsed notes', async t => {
  if (process.env.RUN_BROWSER_E2E !== '1') { t.skip('Set RUN_BROWSER_E2E=1'); return; }
  const pw = await optionalPlaywright(t);
  if (!pw) return;
  const stack = await startPrototypeStack(t, pw);
  if (!stack) return;
  const { page, apiBase, webBase, vaultPath } = stack;
  await seedSmartNotesProductThinking(vaultPath, { fixturePath });
  await page.goto(`${webBase}/prototype`, { waitUntil: 'networkidle' });
  await page.locator('.rail-btn[data-module="graph"]').click();
  await page.waitForFunction(() => window.__prototypeState.graphConnectivityReady);
  const cluster = page.locator('[data-graph-select-cluster]').first();
  await cluster.focus();
  await cluster.press('Enter');
  const panel = page.locator('.graph-selection-panel.is-cluster');
  await panel.waitFor();
  const expectedIds = (await panel.locator('[data-graph-theme-note-ids]').getAttribute('data-graph-theme-note-ids')).split(',');
  assert.ok(expectedIds.length > 5);
  assert.equal(await panel.locator('.graph-cluster-more-notes').getAttribute('open'), null);
  await panel.locator('[data-graph-create-theme-index]').click();
  const confirmation = page.locator('[data-graph-theme-confirmation-form]');
  await confirmation.waitFor();
  const selected = await confirmation.locator('[name="noteId"]:checked').evaluateAll(inputs => inputs.map(input => input.value));
  assert.deepEqual([...selected].sort(), [...expectedIds].sort());
  const question = '这些真实笔记如何帮助形成可追溯的写作主题？';
  await page.locator('#graphThemeQuestion').fill(question);
  await confirmation.locator('button[type="submit"]').click();
  await waitFor(async () => {
    const list = await fetchJson(apiBase, '/api/v1/index-cards?indexType=topic&limit=100');
    assert.equal(list.status, 200);
    const card = list.json.items.find(item => item.central_question === question);
    assert.ok(card, JSON.stringify(list.json));
    assert.deepEqual([...card.item_note_ids].sort(), [...expectedIds].sort());
  });
});
