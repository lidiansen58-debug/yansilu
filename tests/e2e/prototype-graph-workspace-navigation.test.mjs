import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { optionalPlaywright, startPrototypeStack, createWritingReadyPermanentNote, postJson, waitFor } from './prototype-copy-test-helpers.mjs';

async function seedNotes(apiBase) {
  const notes = [];
  for (const title of ['解释能发现理解的缺口', '核对原文可以补上遗漏', '反例帮助划清观点边界']) {
    notes.push((await createWritingReadyPermanentNote(apiBase, {
      title, body: `# ${title}\n\n用阅读实践检验理解。 #理解检验`, thesis: title,
      threeLineSummary: [title, '解释后应回到原文核对。', '反例帮助检验这个判断。'], boundaryOrCounterpoint: '还需要不同读者的实践。'
    })).json.item);
  }
  for (let i = 0; i < notes.length - 1; i++) {
    assert.equal((await postJson(apiBase, `/api/v1/notes/${notes[i].id}/relations`, {
      toNoteId: notes[i + 1].id, relationType: 'supports', rationale: '一起说明检验理解的方法。'
    })).status, 201);
  }
}

test('graph hover details stay below the toolbar as controls wrap and the graph expands', async t => {
  if (process.env.RUN_BROWSER_E2E !== '1') { t.skip('Set RUN_BROWSER_E2E=1'); return; }
  const pw = await optionalPlaywright(t);
  if (!pw) return;
  const stack = await startPrototypeStack(t, pw);
  if (!stack) return;
  const { page, apiBase, webBase } = stack;
  await seedNotes(apiBase);
  await page.goto(`${webBase}/prototype`, { waitUntil: 'networkidle' });
  await mkdir('output/graph-workspace-navigation', { recursive: true });
  for (const width of [1366, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await page.locator('.rail-btn[data-module="graph"]').click();
    await page.waitForFunction(() => window.__prototypeState.graphConnectivityReady);
    for (const expanded of [false, true]) {
      if (expanded) await page.locator('[data-graph-toggle-expanded="on"]').click();
      const node = page.locator('.graph-map-node').first();
      const title = await node.getAttribute('data-node-title');
      const dot = await node.locator('.graph-map-node-core').boundingBox();
      await page.mouse.move(dot.x + dot.width / 2, dot.y + dot.height / 2);
      await waitFor(async () => {
        const report = await page.locator('#graphHoverCard').evaluate(card => {
          const bounds = el => { const r = el.getBoundingClientRect(); return { left:r.left, right:r.right, top:r.top, bottom:r.bottom }; };
          return { card:bounds(card), viewport:bounds(card.closest('.graph-map-viewport')), tools:[...card.closest('.graph-map-tools').querySelectorAll('button')].map(bounds), opacity:getComputedStyle(card).opacity, title:card.querySelector('strong').textContent };
        });
        assert.equal(report.opacity, '1');
        assert.equal(report.title, title);
        assert.ok(report.tools.every(tool => report.card.top >= tool.bottom + 7), JSON.stringify(report));
        assert.ok(report.card.left >= report.viewport.left && report.card.right <= report.viewport.right, JSON.stringify(report));
        assert.ok(report.card.bottom <= report.viewport.bottom, JSON.stringify(report));
      });
      await page.screenshot({ path:`output/graph-workspace-navigation/hover-${width}${expanded ? '-expanded' : ''}.png` });
      if (expanded) await page.locator('[data-graph-toggle-expanded="off"]').click();
    }
  }
});

for (const width of [1366, 375]) {
  test(`late graph refresh preserves writing navigation and theme edits (${width}px)`, async t => {
    if (process.env.RUN_BROWSER_E2E !== '1') { t.skip('Set RUN_BROWSER_E2E=1'); return; }
    const pw = await optionalPlaywright(t);
    if (!pw) return;
    const stack = await startPrototypeStack(t, pw);
    if (!stack) return;
    const { page, apiBase, webBase } = stack;
    await seedNotes(apiBase);
    await page.setViewportSize({ width, height:900 });
    await page.goto(`${webBase}/prototype`, { waitUntil:'networkidle' });
    // Hold wall time inside the old 1.8-second guard without delaying browser timers.
    await page.clock.setFixedTime(Date.now());
    let release, requested = false;
    const gate = new Promise(resolve => { release = resolve; });
    await page.route('**/api/v1/graph?*', async route => { requested = true; await gate; await route.continue(); });
    try {
      await page.locator('.rail-btn[data-module="graph"]').click();
      await waitFor(() => assert.ok(requested));
      await page.locator('.rail-btn[data-module="writing"]').click();
      await page.locator('#btnWritingDiscoverThemes').click();
      const title = page.locator('[data-theme-discovery-suggestion-id]').first().getByLabel('主题名称', { exact:true });
      await title.fill(`迟到图谱请求之后仍能编辑 ${width}`);
      const field = await title.elementHandle();
      release();
      await page.waitForFunction(() => window.__prototypeState.graphConnectivityReady);
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      assert.equal(await page.evaluate(() => window.__prototypeState.module), 'writing');
      assert.equal(await page.locator('#writingPanel').isVisible(), true);
      assert.equal(await field.evaluate(el => el.isConnected && el === document.activeElement), true);
      assert.equal(await title.inputValue(), `迟到图谱请求之后仍能编辑 ${width}`);
      await title.press('End');
      await title.pressSequentially('NEXT');
      assert.equal(await title.inputValue(), `迟到图谱请求之后仍能编辑 ${width}NEXT`);
    } finally { release(); }
  });
}
