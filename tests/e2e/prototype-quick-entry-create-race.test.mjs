import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {optionalPlaywright, startPrototypeStack, postJson, fetchJson, waitFor} from './prototype-copy-test-helpers.mjs';

for (const [kind, label] of [['fleeting', '随笔'], ['literature', '文献']]) {
  test(`a late ${kind} entry read preserves the note created through the visible mobile action`, async t => {
    if (process.env.RUN_BROWSER_E2E !== '1') { t.skip('Set RUN_BROWSER_E2E=1'); return; }
    const pw = await optionalPlaywright(t); if (!pw) return;
    let release;
    const held = new Promise(resolve => { release = resolve; });
    t.after(() => release());
    const stack = await startPrototypeStack(t, pw); if (!stack) return;
    const {page, apiBase, vaultPath} = stack;
    const root = `dir_${kind}_default`;
    const baseline = (await postJson(apiBase, '/api/v1/notes', {directoryId: root, body: '# 已保存的材料\n\n原始中文、café 和 🙂。\n'})).json.item;
    await page.reload({waitUntil: 'networkidle'});
    await page.setViewportSize({width: 390, height: 844});
    await page.locator('[data-action="quick-original"]').click();
    await waitFor(async () => assert.match(await page.locator('#statusText').innerText(), /已切换到.*永久.*入口/));
    // A real earlier creation initializes the vault scope. Without it, the first
    // creation changes that scope and independently cancels the held read.
    await page.locator('#btnMobileNewNote').click();
    await page.waitForFunction(baselineId => !window.__prototypeState.pendingNoteCreation
      && window.__prototypeEditor.activeNote()?.id && window.__prototypeEditor.activeNote().id !== baselineId, baseline.id);
    const seedId = await page.evaluate(() => window.__prototypeEditor.activeNote().id);
    const seedEditor = page.locator('#editorHost .cm-content:visible');
    if (!await seedEditor.isVisible()) await page.locator('#btnModeToggle').click();
    await seedEditor.click();
    await page.keyboard.press('Control+a');
    await page.keyboard.insertText('# 导航前已有的笔记\n\n保留这条独立记录。\n');
    await page.keyboard.press('Control+s');
    await waitFor(async () => assert.match((await fetchJson(apiBase, `/api/v1/notes/${seedId}`)).json.item.body, /保留这条独立记录/));
    await page.waitForFunction(() => !window.__prototypeEditor.savingPromise && !window.__prototypeEditor.activeTab()?.dirty);
    assert.equal(await page.evaluate(() => !!window.__prototypeState.noteMoveVaultScope), true);
    let intercepted = false, oldReadCaptured = false, heldRequest;
    await page.route('**/api/v1/directories/**/notes**', async route => {
      const url = new URL(route.request().url());
      if (intercepted || url.pathname !== `/api/v1/directories/${root}/notes` || url.searchParams.get('includeDescendants') !== 'true') return route.continue();
      intercepted = true;
      heldRequest = route.request();
      const response = await route.fetch();
      oldReadCaptured = true;
      await held;
      await route.fulfill({response});
    });
    await page.locator(`[data-action="quick-${kind}"]`).click();
    await waitFor(() => assert.equal(oldReadCaptured, true));
    await page.locator('#btnMobileNewNote').click();
    await page.waitForFunction(previousIds => {
      const editor = window.__prototypeEditor;
      return !window.__prototypeState.pendingNoteCreation && editor.activeNote()?.id && !previousIds.includes(editor.activeNote().id);
    }, [baseline.id, seedId]);
    const id = await page.evaluate(() => window.__prototypeEditor.activeNote().id);
    assert.equal((await fetchJson(apiBase, `/api/v1/notes/${id}`)).json.item.directoryId, root);
    const finished = page.waitForEvent('requestfinished', {predicate: request => request === heldRequest});
    release();
    await finished;
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const active = await page.evaluate(() => ({id: window.__prototypeEditor.activeNote()?.id || null, tabId: window.__prototypeEditor.activeTab()?.noteId || null}));
    assert.equal(active.id, id, JSON.stringify({stage:'after-late-directory-read', active, expectedNoteId:id}));
    const source = page.locator('#editorHost .cm-content:visible');
    if (!await source.isVisible()) await page.locator('#btnModeToggle').click();
    await source.click();
    await page.keyboard.press('Control+a');
    const body = `# 切换入口时创建的${label}\n\n继续记录中文、café 和 🙂。\n`;
    await page.keyboard.insertText(body);
    await page.keyboard.press('Control+s');
    await waitFor(async () => assert.equal((await fetchJson(apiBase, `/api/v1/notes/${id}`)).json.item.body, body));
    await page.waitForFunction(() => !window.__prototypeEditor.savingPromise && !window.__prototypeEditor.activeTab()?.dirty);
    const saved = (await fetchJson(apiBase, `/api/v1/notes/${id}`)).json.item;
    assert.equal(saved.noteType, kind);
    assert.equal(saved.directoryId, root);
    assert.equal((await fetchJson(apiBase, `/api/v1/notes/${baseline.id}`)).json.item.body, baseline.body);
    assert.match(await fs.readFile(path.join(vaultPath, saved.markdownPath), 'utf8'), /继续记录中文、café 和 🙂/);
  });
}
