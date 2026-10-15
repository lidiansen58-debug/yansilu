import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { archivedDenseFixture } from "./graph-archived-dense-fixture.mjs";
import { seedSmartNotesProductThinking } from "../../scripts/seed-smart-notes-product-thinking.mjs";
import { optionalPlaywright, startPrototypeStack, fetchJson, waitFor } from "./prototype-copy-test-helpers.mjs";
import { graphDenseGalaxyMode } from "../../apps/web/src/graph-visual-geometry.js";
import { graphBuildVisualLayout } from "../../apps/web/src/graph-visual-layout.js";

function assertConnected(members, edges) {
  const allowed = new Set(members), reached = new Set([members[0]]), queue = [members[0]];
  for (let i = 0; i < queue.length; i++) for (const edge of edges) {
    const neighbor = edge.fromNoteId === queue[i] ? edge.toNoteId : edge.toNoteId === queue[i] ? edge.fromNoteId : null;
    if (allowed.has(neighbor) && !reached.has(neighbor)) { reached.add(neighbor); queue.push(neighbor); }
  }
  assert.deepEqual([...reached].sort(), [...allowed].sort(), "Each grouped note must have a real path inside the group");
}

for (const width of [1366, 390, 320]) {
  test(`dense archived graph has real clusters, readable notes and traceable writing (${width}px)`, async t => {
    if (process.env.RUN_BROWSER_E2E !== "1") { t.skip("Set RUN_BROWSER_E2E=1"); return; }
    const pw = await optionalPlaywright(t);
    if (!pw) return;
    const archive = await archivedDenseFixture(t);
    const stack = await startPrototypeStack(t, pw);
    if (!stack) return;
    const { page, apiBase, webBase, vaultPath } = stack;
    const output = path.resolve(`output/playwright/core-dense-real-graph/${width}`);
    await fs.mkdir(output, { recursive: true });
    const errors = [];
    const writingResponses = [];
    const requestStarts = new WeakMap(), requestTimings = [];
    page.on('request', request => requestStarts.set(request, Date.now()));
    page.on('response', response => {
      if (!response.url().includes('/api/v1/')) return;
      const request = response.request();
      requestTimings.push({ path: new URL(response.url()).pathname, method: request.method(),
        status: response.status(), startedAt: requestStarts.get(request), elapsedMs: Date.now() - requestStarts.get(request) });
    });
    t.after(() => fs.writeFile(path.join(output, 'request-timings.json'), JSON.stringify(requestTimings, null, 2), 'utf8'));
    page.on("pageerror", error => errors.push(error.message));
    page.on("response", async response => {
      if (!/\/api\/v1\/(writing-projects|draft-scaffolds)/.test(response.url())) return;
      writingResponses.push({ url: response.url(), method: response.request().method(), status: response.status(),
        body: await response.json().catch(() => null) });
    });
    await seedSmartNotesProductThinking(vaultPath, { fixturePath: archive.fixturePath });
    const response = await fetchJson(apiBase, "/api/v1/graph?scope=directory&directoryId=dir_original_default&includeDescendants=true");
    assert.equal(response.status, 200, JSON.stringify(response.json));
    const graph = response.json.item, nodes = new Map(graph.nodes.map(node => [node.id, node]));
    t.diagnostic(`Historical ${archive.provenance.revision}: saved graph ${graph.nodes.length} notes / ${graph.edges.length} relations`);
    assert.equal(graphDenseGalaxyMode(graph), true, "The real graph must actually exercise dense mode");
    const layout = graphBuildVisualLayout(graph.nodes, graph.edges);
    for (const cluster of layout.clusterMeta) assertConnected(cluster.memberIds, graph.edges);
    for (const note of archive.data.permanent_notes) assert.equal(nodes.get(note.id)?.title, note.title);
    for (const edge of graph.edges) {
      assert.ok(nodes.has(edge.fromNoteId) && nodes.has(edge.toNoteId));
      assert.ok(edge.rationale || edge.relationSource === "body_wikilink" || edge.relationType === "belongs_to_topic");
    }
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`${webBase}/prototype`, { waitUntil: "networkidle" });
    await page.locator('.rail-btn[data-module="graph"]').click();
    await page.waitForFunction(() => window.__prototypeState.graphConnectivityReady);
    await page.locator('.graph-map-node').first().waitFor();
    const shown = await page.locator('.graph-map-node').evaluateAll(items => items.map(item => item.dataset.nodeId));
    for (const id of shown) assert.ok(nodes.has(id), `No fabricated graph node: ${id}`);
    for (const note of archive.data.permanent_notes) assert.ok(shown.includes(note.id), `Dense graph dropped ${note.title}`);
    assert.ok(await page.locator('[data-graph-select-cluster]').count() >= 2);
    await page.screenshot({ path: path.join(output, "01-overview.png"), fullPage: true });

    const group = page.locator('[data-graph-select-cluster]').first();
    await group.focus(); await group.press("Enter");
    const panel = page.locator('.graph-selection-panel.is-cluster');
    await panel.waitFor();
    const members = (await panel.locator('[data-graph-theme-note-ids]').getAttribute('data-graph-theme-note-ids')).split(',');
    assert.ok(members.length > 10, "Dense semantic group must exercise a long real member list");
    assertConnected(members, graph.edges);
    const listed = await panel.locator('[data-open-note]').evaluateAll(items => items.map(item => item.dataset.openNote));
    assert.deepEqual([...listed].sort(), [...members].sort());
    assert.equal(await panel.locator('.graph-selection-action.is-primary').count(), 1);
    const more = panel.locator('.graph-cluster-more-notes');
    await more.locator('summary').focus(); await more.locator('summary').press('Enter');
    await waitFor(async () => assert.notEqual(await more.getAttribute('open'), null));
    await page.locator('[data-graph-zoom-step="1"]').click();
    await page.locator('[data-graph-zoom-step="1"]').click();
    await waitFor(async () => assert.equal(await page.locator('.graph-map-svg').getAttribute('data-graph-zoom'), 'detail'));
    if (width === 390) await page.locator('[data-graph-toggle-expanded="on"]').click();
    const dimensions = await page.locator('.graph-map-viewport').evaluate(element => ({
      width: element.clientWidth, svgWidth: element.querySelector('.graph-map-svg').getBoundingClientRect().width
    }));
    await page.screenshot({ path: path.join(output, "02-enlarged-cluster.png"), fullPage: true });
    assert.ok(dimensions.svgWidth > dimensions.width * 1.35, "Detail mode must enlarge the actual map, not just its button state");
    const labelledMembers = await page.locator('.graph-map-node.is-theme-selected .graph-map-node-label').evaluateAll(items =>
      items.filter(item => Number(getComputedStyle(item).opacity) >= .9 && item.getBoundingClientRect().height >= 14)
        .map(item => ({ id: item.closest('[data-node-id]').dataset.nodeId, text: item.textContent })));
    assert.deepEqual(labelledMembers.map(item => item.id).sort(), [...members].sort(), "Every enlarged group member needs a rendered title");
    for (const item of labelledMembers) assert.ok(nodes.get(item.id).title.startsWith(item.text.replace(/…$/, '')));
    const overlaps = await page.locator('.graph-map-node.is-theme-selected .graph-map-node-label').evaluateAll(items => {
      const labels = items.map(item => ({ id: item.closest('[data-node-id]').dataset.nodeId,
        rect: item.getBoundingClientRect() }));
      return labels.flatMap((a, index) => labels.slice(index + 1).filter(b =>
        a.rect.left < b.rect.right + 3 && a.rect.right + 3 > b.rect.left &&
        a.rect.top < b.rect.bottom + 3 && a.rect.bottom + 3 > b.rect.top).map(b => [a.id, b.id]));
    });
    assert.equal(overlaps.length, 0, `Detail titles must not overlap: ${JSON.stringify(overlaps.slice(0, 5))}`);
    const internalEdges = graph.edges.filter(edge => members.includes(edge.fromNoteId) && members.includes(edge.toNoteId));
    const highlightedEdges = await page.locator('.graph-map-edge-group.is-theme-selected').evaluateAll(items => items.map(item => ({
      from: item.dataset.edgeFrom, to: item.dataset.edgeTo, type: item.dataset.edgeRelationType,
      opacity: Number(getComputedStyle(item.querySelector('.graph-map-edge')).opacity)
    })));
    assert.equal(highlightedEdges.length, internalEdges.length);
    for (const edge of highlightedEdges) {
      assert.ok(internalEdges.some(item => item.fromNoteId === edge.from && item.toNoteId === edge.to && item.relationType === edge.type));
      assert.ok(edge.opacity >= .5, "Selected group relations must not stay faded by the reading lens");
    }
    t.diagnostic(`Selected real group: ${members.length} notes / ${highlightedEdges.length} internal relations; SVG ${Math.round(dimensions.svgWidth)}px in ${dimensions.width}px viewport`);
    const target = more.locator('[data-open-note]').first(), targetId = await target.getAttribute('data-open-note');
    assert.ok((await target.textContent()).includes(nodes.get(targetId).title));
    await target.scrollIntoViewIfNeeded();
    const viewport = page.locator('.graph-map-viewport');
    await viewport.evaluate((element, id) => {
      const node = [...element.querySelectorAll('[data-node-id]')].find(item => item.dataset.nodeId === id);
      const bounds = node.getBoundingClientRect(), frame = element.getBoundingClientRect();
      element.scrollLeft += bounds.left - frame.left - element.clientWidth * .3;
      element.scrollTop += bounds.top - frame.top - element.clientHeight * .4;
    }, targetId);
    const position = await viewport.evaluate(element => [element.scrollLeft, element.scrollTop]);
    const listPosition = await panel.locator('.graph-selection-body').evaluate(element => element.scrollTop);
    assert.ok(position.some(value => value > 0));
    assert.ok(listPosition > 0, "Additional members must scroll inside the bounded list on every screen");
    const action = panel.locator('[data-graph-create-theme-index]');
    const actionBox = await action.boundingBox(), panelBox = await panel.boundingBox();
    assert.ok(actionBox.y >= panelBox.y && actionBox.y + actionBox.height <= panelBox.y + panelBox.height + 1);
    assert.equal(await action.evaluate(button => {
      const box = button.getBoundingClientRect();
      return button.contains(document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2));
    }), true, "The group action must stay visible and uncovered while reading later members");
    await page.screenshot({ path: path.join(output, "02-enlarged-cluster.png"), fullPage: true });
    const savedNote = await fetchJson(apiBase, `/api/v1/notes/${targetId}`);
    assert.equal(savedNote.status, 200);
    const originalBytes = await fs.readFile(path.join(vaultPath, savedNote.json.item.markdownPath));
    await target.click();
    await page.waitForFunction(id => window.__prototypeState.module === 'explorer' && window.__prototypeEditor.activeNote()?.id === id, targetId);
    assert.ok((await page.evaluate(() => window.__prototypeEditor.getEditorValue())).includes(savedNote.json.item.title));
    await page.locator('.rail-btn[data-module="graph"]').click();
    await panel.waitFor();
    await waitFor(async () => {
      assert.equal(await page.locator('.graph-map-panel.is-expanded').count(), width === 390 ? 1 : 0);
      assert.equal(await page.locator('.graph-map-svg').getAttribute('data-graph-zoom'), 'detail');
      assert.deepEqual(await viewport.evaluate(element => [element.scrollLeft, element.scrollTop]), position);
      assert.equal(await panel.locator('.graph-selection-body').evaluate(element => element.scrollTop), listPosition);
      assert.notEqual(await more.getAttribute('open'), null);
    });
    await page.evaluate(() => window.__prototypeEditor.refreshDirectoryGraph());
    await waitFor(async () => assert.deepEqual(await viewport.evaluate(element => [element.scrollLeft, element.scrollTop]), position));
    assert.deepEqual(await fs.readFile(path.join(vaultPath, savedNote.json.item.markdownPath)), originalBytes);
    await panel.locator('[data-graph-selection-close]').click();
    await page.locator('#graphRelationTypeFilter').selectOption('supports');
    await waitFor(async () => {
      const types = await page.locator('.graph-map-edge-group').evaluateAll(items => items.map(item => item.dataset.edgeRelationType));
      assert.ok(types.length > 0);
      assert.ok(types.every(type => type === 'supports'));
    });
    const support = page.locator('.graph-map-edge-group[data-edge-relation-type="supports"]').first();
    const endpoints = await support.evaluate(item => [item.dataset.edgeFrom, item.dataset.edgeTo]);
    assert.ok(graph.edges.some(edge => edge.fromNoteId === endpoints[0] && edge.toNoteId === endpoints[1] && edge.relationType === 'supports'));
    await support.focus(); await support.press('Enter');
    await page.locator('.graph-selection-panel.is-edge').waitFor();
    const relation = graph.edges.find(edge => edge.fromNoteId === endpoints[0] && edge.toNoteId === endpoints[1] && edge.relationType === 'supports');
    assert.ok((await page.locator('.graph-selection-panel.is-edge').textContent()).includes(relation.rationale));
    const closeHit = await page.locator('.graph-selection-panel.is-edge [data-graph-selection-close]').evaluate(button => {
      const rect = button.getBoundingClientRect();
      const hit = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
      return { reachable: hit === button || button.contains(hit), x: rect.x, y: rect.y, hit: hit?.outerHTML?.slice(0, 240) };
    });
    await page.screenshot({ path: path.join(output, '02-edge-details.png'), fullPage: true });
    assert.ok(closeHit.reachable, `Relation close button must remain reachable: ${JSON.stringify(closeHit)}`);
    await page.locator('.graph-selection-panel.is-edge [data-graph-selection-close]').click();
    await page.locator('#graphRelationTypeFilter').selectOption('all');
    await page.locator('[data-graph-select-cluster]').first().focus();
    await page.locator('[data-graph-select-cluster]').first().press('Enter');
    await panel.waitFor();
    await panel.locator('[data-graph-create-theme-index]').click();
    const form = page.locator('[data-graph-theme-confirmation-form]');
    await form.waitFor();
    const confirmed = new Set(archive.data.permanent_notes.filter(note => note.authorship?.user_confirmed && note.distillation_status === 'confirmed').map(note => note.id));
    const choices = await form.locator('[name="noteId"]:checked').evaluateAll(items => items.map(item => item.value));
    assert.ok(choices.every(id => members.includes(id)), 'Theme confirmation cannot introduce unrelated notes');
    for (const id of choices) if (!confirmed.has(id)) await form.locator(`[name="noteId"][value="${id}"]`).uncheck();
    const selected = choices.filter(id => confirmed.has(id));
    assert.ok(selected.length >= 3);
    t.diagnostic(`Confirmed writing sources: ${selected.length} actual permanent notes`);
    const question = `怎样让已有判断支持有依据的写作？${width}`;
    await page.locator('#graphThemeQuestion').fill(question);
    await form.locator('button[type="submit"]').click();
    await page.waitForFunction(() => window.__prototypeState.module === 'writing');
    const card = await waitFor(async () => {
      const items = (await fetchJson(apiBase, '/api/v1/index-cards?indexType=topic&limit=100')).json.items;
      const item = items.find(item => item.central_question === question);
      assert.ok(item?.id); assert.deepEqual([...item.item_note_ids].sort(), [...selected].sort()); return item;
    });
    await page.locator('#btnWritingCreateScaffold').click();
    try { await page.locator('#writingScaffoldPanel:visible').waitFor({ timeout: 15000 }); }
    catch (error) {
      t.diagnostic(JSON.stringify({ writingResponses, current: await page.evaluate(() => ({
        status: document.querySelector('#statusText')?.textContent,
        writingStatus: document.querySelector('#writingStatus')?.textContent,
        module: window.__prototypeState.module, theme: window.__prototypeState.selectedWritingThemeId,
        project: window.__prototypeState.writingProject, buttonDisabled: document.querySelector('#btnWritingCreateScaffold')?.disabled
      })) }));
      await page.screenshot({ path: path.join(output, 'failure-outline.png'), fullPage: true });
      throw error;
    }
    const project = (await fetchJson(apiBase, '/api/v1/writing-projects?limit=100')).json.items.find(item => item.title === question);
    assert.ok(project?.scaffold_id, JSON.stringify(project));
    const scaffold = (await fetchJson(apiBase, `/api/v1/draft-scaffolds/${project.scaffold_id}`)).json.item;
    const evidence = new Set(scaffold.sections.flatMap(section => section.evidence_note_ids));
    for (const id of selected) assert.ok(evidence.has(id), `Theme member must remain traceable in its outline: ${id}`);
    assert.ok([...evidence].every(id => selected.includes(id)));
    assert.deepEqual(project.related_index_ids, [card.id]);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    assert.deepEqual(errors, []);
    await page.screenshot({ path: path.join(output, '03-traceable-outline.png'), fullPage: true });
  });
}
