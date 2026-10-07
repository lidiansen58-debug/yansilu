import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { initVault } from '../../packages/domain/src/vault.mjs';
import { createDirectory } from '../../packages/domain/src/catalog-store.mjs';
import { createNoteInDirectory } from '../../packages/domain/src/note-catalog-store.mjs';
import { seedSmartNotesProductThinking } from '../../scripts/seed-smart-notes-product-thinking.mjs';
import { optionalPlaywright, startPrototypeStack, fetchJson, waitFor } from './prototype-copy-test-helpers.mjs';

const fixturePath = fileURLToPath(new URL('../fixtures/graph-archived-real-demo.json', import.meta.url));
const capacityTitle = '容量验收记录';
const digest = bytes => createHash('sha256').update(bytes).digest('hex');

test('a 1000-file library remains usable through startup, switching, search and graph', { timeout: 180000 }, async t => {
  if (process.env.RUN_BROWSER_E2E !== '1') { t.skip('Set RUN_BROWSER_E2E=1'); return; }
  const pw = await optionalPlaywright(t);
  if (!pw) return;
  const files = [];
  const requests = [];
  const errors = [];
  const responses = [];
  let phase = 'startup';
  const stack = await startPrototypeStack(t, pw, {
    prepareVault: async vaultPath => {
      await initVault(vaultPath);
      await seedSmartNotesProductThinking(vaultPath, { fixturePath });
      for (let group = 0; group < 50; group += 1) {
        const material = group < 20;
        const directory = await createDirectory(vaultPath, {
          title: `容量验收 ${String(group).padStart(2, '0')}`,
          parentDirectoryId: material ? 'dir_fleeting_default' : 'dir_original_default',
          fsPath: path.join(vaultPath, 'notes', material ? 'fleeting' : 'original', `capacity-${group}`)
        });
        for (let offset = 0; offset < 20; offset += 1) {
          const number = String(group * 20 + offset).padStart(4, '0');
          const title = `${capacityTitle} ${number}`;
          // Synthetic capacity files are not Demo content or evidence of meaningful clusters.
          const body = `# ${title}\n\n容量正文检索标记-${number}\n\n` +
            '这是隔离性能验收文件，不是用户笔记，也不用于官网或图谱价值展示。\n\n'.repeat(24);
          const note = await createNoteInDirectory(vaultPath, { directoryId: directory.id, title, body });
          const file = path.join(vaultPath, note.markdownPath);
          files.push({ id: note.id, file, hash: digest(await fs.readFile(file)) });
        }
      }
      t.diagnostic(`Capacity fixture: ${files.length} generated Markdown files in 50 directories; archived real relations are unchanged.`);
    },
    beforeNavigate: async page => {
      page.on('pageerror', error => errors.push(error.message));
      page.on('response', response => {
        const url = new URL(response.url());
        if (url.pathname.startsWith('/api/')) responses.push({ phase, path: url.pathname, status: response.status() });
      });
      page.on('requestfinished', request => {
        const url = new URL(request.url());
        if (!url.pathname.startsWith('/api/')) return;
        const timing = request.timing();
        requests.push({ phase, path: url.pathname, query: url.search, durationMs: timing.responseEnd });
      });
    }
  });
  if (!stack) return;
  const { page, apiBase, vaultPath } = stack;
  page.setDefaultTimeout(30000);
  const loaded = async () => page.waitForFunction(prefix =>
    window.__prototypeState.notes.filter(note => note.title.startsWith(prefix)).length === 1000, capacityTitle);
  await loaded();
  const metrics = { pageStartupMs: Math.round(await page.evaluate(() => performance.now())) };
  assert.equal(await page.locator('.today-empty-home').count(), 0);
  const otherVault = await fs.mkdtemp(path.join(os.tmpdir(), 'yansilu-capacity-empty-'));
  const openVault = async target => {
    await page.locator('.rail-btn[data-module="settings"]').click();
    await page.locator('[data-settings-item="current-vault"]').click();
    await page.locator('#settingsVaultPath').fill(target);
    const started = performance.now();
    await page.locator('#settingsSwitchVault').click();
    try {
      await waitFor(async () => {
        assert.equal(path.resolve((await fetchJson(apiBase, '/api/v1/vault')).json.item.vaultPath), path.resolve(target));
        assert.match(await page.locator('#statusText').textContent(), /已打开笔记库/);
        assert.equal(await page.locator('[data-vault-switch-recovery]').count(), 0);
      }, 30000);
    } catch (error) {
      t.diagnostic(JSON.stringify({ phase, errors, responses, state: await page.evaluate(() => ({
        status: document.querySelector('#statusText')?.textContent,
        recovery: document.querySelector('[data-vault-switch-recovery]')?.textContent,
        switching: window.__prototypeState.noteMoveVaultSwitching,
        uncertain: window.__prototypeState.noteMoveVaultUncertain,
        notes: window.__prototypeState.notes.length
      })) }));
      throw error;
    }
    return Math.round(performance.now() - started);
  };
  phase = 'switch-empty';
  metrics.switchEmptyMs = await openVault(otherVault);
  assert.equal(await page.evaluate(prefix => window.__prototypeState.notes.filter(note => note.title.startsWith(prefix)).length, capacityTitle), 0);
  phase = 'switch-large';
  metrics.switchLargeMs = await openVault(vaultPath);
  await loaded();
  const last = files.at(-1);
  phase = 'search';
  await page.locator('#btnToggleSearch').click();
  const searchStarted = performance.now();
  await page.locator('#globalNoteSearchInput').fill('容量正文检索标记-0999');
  await page.locator(`[data-search-note="${last.id}"]`).waitFor();
  metrics.bodySearchMs = Math.round(performance.now() - searchStarted);
  await page.locator(`[data-search-note="${last.id}"]`).click();
  await page.waitForFunction(id => window.__prototypeEditor.activeNote()?.id === id, last.id);
  assert.match(await page.evaluate(() => window.__prototypeEditor.getEditorValue()), /容量正文检索标记-0999/);
  await page.locator('.rail-btn[data-module="today"]').click();
  await page.locator('[data-action="quick-original"]').click();
  await page.locator('.explorer-item[data-kind="folder"][data-id="dir_original_default"]').click();
  phase = 'graph';
  const profiler = process.env.PROFILE_GRAPH === '1' ? await page.context().newCDPSession(page) : null;
  if (profiler) {
    await profiler.send('Profiler.enable');
    await profiler.send('Profiler.start');
  }
  const graphStarted = performance.now();
  await page.locator('.rail-btn[data-module="graph"]').click();
  await page.waitForFunction(() => window.__prototypeState.graphConnectivityReady &&
    document.querySelectorAll('.graph-map-node').length >= 600);
  metrics.graphReadyMs = Math.round(performance.now() - graphStarted);
  let cpu = [];
  if (profiler) {
    const { profile } = await profiler.send('Profiler.stop');
    const nodes = new Map(profile.nodes.map(node => [node.id, node.callFrame]));
    const totals = new Map();
    (profile.samples || []).forEach((id, index) => {
      const frame = nodes.get(id);
      const key = `${frame?.url || ''}:${Number(frame?.lineNumber ?? -1) + 1} ${frame?.functionName || '(anonymous)'}`;
      totals.set(key, (totals.get(key) || 0) + (profile.timeDeltas?.[index] || 0));
    });
    cpu = [...totals].sort((a, b) => b[1] - a[1]).slice(0, 25).map(([frame, microseconds]) => ({ frame, milliseconds: Math.round(microseconds / 1000) }));
    t.diagnostic(JSON.stringify({ graphCpu: cpu }));
    await profiler.detach();
  }
  const graph = await fetchJson(apiBase, '/api/v1/graph?scope=directory&directoryId=dir_original_default&includeDescendants=true');
  assert.equal(graph.status, 200);
  assert.ok(graph.json.item.nodes.length >= 600);
  assert.ok(graph.json.item.edges.length >= 104, 'Only archived real relationships supply the connected groups');
  assert.equal(await page.locator('.graph-map-node').count(), graph.json.item.nodes.length);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('[data-graph-zoom-step="1"]').click();
  await page.locator('.graph-map-node').first().focus();
  await page.locator('.graph-map-node').first().press('Enter');
  await page.locator('.graph-selection-panel').waitFor();
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  for (const item of files) assert.equal(digest(await fs.readFile(item.file)), item.hash, item.file);
  const artifact = path.resolve('output/playwright/core-large-library');
  await fs.mkdir(artifact, { recursive: true });
  await page.screenshot({ path: path.join(artifact, 'graph-390.png'), fullPage: true });
  const report = {
    generatedFiles: files.length, directories: 50,
    caveat: 'Synthetic file-capacity workload with unchanged archived real relationships; not a proof of theme quality or native startup.',
    metrics, requests, cpu
  };
  await fs.writeFile(path.join(artifact, 'measurements.json'), JSON.stringify(report, null, 2), 'utf8');
  t.diagnostic(JSON.stringify({ metrics, noteRequestsByPhase: Object.fromEntries(['startup', 'switch-large', 'graph'].map(name =>
    [name, requests.filter(request => request.phase === name && /\/directories\/[^/]+\/notes$/.test(request.path)).length])) }));
  assert.equal(requests.filter(request => request.phase === 'graph' && request.path === '/api/v1/graph').length, 1,
    'A completed explorer load must not start a second graph refresh after navigation');
  assert.deepEqual(errors, []);
  assert.ok(metrics.pageStartupMs < 6000, `Page startup: ${metrics.pageStartupMs}ms`);
  assert.ok(metrics.switchLargeMs < 6000, `Switch: ${metrics.switchLargeMs}ms`);
  assert.ok(metrics.graphReadyMs < 6000, `Graph: ${metrics.graphReadyMs}ms`);
});
