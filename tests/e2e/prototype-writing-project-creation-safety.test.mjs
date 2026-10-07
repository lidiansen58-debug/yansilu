import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { optionalPlaywright, startPrototypeStack, createWritingReadyPermanentNote, postJson, fetchJson, waitFor } from "./prototype-copy-test-helpers.mjs";

for (const width of [1366, 320]) for (const phase of ["before request arrival", "after commit", "during theme hydration"]) {
  test(`project preparation cannot follow a Vault switch ${phase} at ${width}px`, async t => {
    const committed = phase === "after commit", hydrating = phase === "during theme hydration";
    if (process.env.RUN_BROWSER_E2E !== "1") { t.skip("Set RUN_BROWSER_E2E=1"); return; }
    const pw = await optionalPlaywright(t);
    if (!pw) return;
    const h = await startPrototypeStack(t, pw);
    if (!h) return;
    const { page, apiBase, webBase, vaultPath } = h;
    await page.setViewportSize({ width, height: 844 });
    const notes = [];
    for (const title of ["先解释再核对", "反例能发现遗漏", "补充判断的适用条件"]) {
      const created = await createWritingReadyPermanentNote(apiBase, {
        title, body: `# ${title}\n\n把理解写清楚，再对照材料检查。`, thesis: title,
        threeLineSummary: [title, "通过材料检查遗漏。", "用于改进阅读理解。"], boundaryOrCounterpoint: "仍需了解背景知识。"
      });
      notes.push(created.json.item);
    }
    for (const target of notes.slice(1)) assert.equal((await postJson(apiBase, `/api/v1/notes/${notes[0].id}/relations`, {
      toNoteId: target.id, relationType: "supports", rationale: "反例与适用条件可以帮助核对解释中的遗漏。"
    })).status, 201);
    const theme = await postJson(apiBase, "/api/v1/index-cards", {
      directoryId: "dir_original_default", indexType: "topic", title: "怎样核对阅读理解",
      centralQuestion: "如何发现解释中的遗漏？", summary: "从自己的解释到材料核对。",
      items: notes.map(note => ({ noteId: note.id, shortLabel: note.title, rationale: "用于讨论阅读理解。" }))
    });
    assert.equal(theme.status, 201, JSON.stringify(theme.json));
    const originalFiles = await Promise.all(notes.map(note => fs.readFile(path.join(vaultPath, note.markdownPath), "utf8")));
    // The stack first opens an empty Vault. Keep that real cache for hydration:
    // these notes were created afterwards and have not yet been read by the UI.
    if (!hydrating) await page.goto(`${webBase}/prototype`, { waitUntil: "networkidle" });
    else assert.equal(await page.evaluate(id => window.__prototypeState.notes.some(note => note.id === id), notes[2].id), false);
    if (!hydrating) await page.locator('.rail-btn[data-module="writing"]').click();
    const pickTheme = () => page.locator('#writingThemeIndexList [data-writing-index-card-id]', { hasText: "怎样核对阅读理解" })
      .getByRole('button', { name: '开始写', exact: true }).click();
    if (!hydrating) {
      await pickTheme();
      await waitFor(async () => assert.equal(await page.locator('#btnWritingCreateScaffold').isDisabled(), false));
    }
    let release, held, finished, creations = 0, generations = 0;
    const requests = [];
    const gate = new Promise(resolve => { release = resolve; });
    const started = new Promise(resolve => { held = resolve; });
    const routeFinished = new Promise(resolve => { finished = resolve; });
    const hydrationNoteId = notes[2].id;
    const endpoint = hydrating ? `**/api/v1/notes/${hydrationNoteId}` : '**/api/v1/writing-projects';
    page.on('request', request => {
      requests.push(`${request.method()} ${request.url()}`);
      if (request.method() === 'POST' && request.url().endsWith('/api/v1/draft-scaffolds')) generations++;
      if (request.method() === 'POST' && request.url().endsWith('/api/v1/writing-projects')) creations++;
    });
    await page.route(endpoint, async route => {
      if (route.request().method() !== (hydrating ? 'GET' : 'POST')) return route.continue();
      try {
        if (!hydrating) assert.equal(path.resolve(route.request().postDataJSON().expectedVaultPath), path.resolve(vaultPath));
        if (committed || hydrating) {
          const response = await route.fetch();
          assert.equal(response.status(), hydrating ? 200 : 201);
          held(); await gate; await route.fulfill({ response });
        } else {
          held(); await gate;
          const response = await route.fetch();
          assert.equal(response.status(), 409);
          await route.fulfill({ response });
        }
      } finally { finished(); }
    });
    const otherVault = await fs.mkdtemp(path.join(os.tmpdir(), 'yansilu-project-create-context-'));
    const switchVault = async destination => {
      await page.locator('.rail-btn[data-module="settings"]').click();
      if (await page.locator('#settingsMobileItemSelect').isVisible()) await page.locator('#settingsMobileItemSelect').selectOption('current-vault');
      else await page.locator('[data-settings-item="current-vault"]').click();
      await page.locator('#settingsVaultPath').fill(destination);
      await page.locator('#settingsSwitchVault').click();
      await waitFor(async () => {
        const current = await fetchJson(apiBase, `/api/v1/vault?${new URLSearchParams({ targetVaultPath: destination })}`);
        assert.equal(current.json.item.targetVaultMatchesCurrent, true);
        assert.match(await page.locator('#statusText').textContent(), /已打开笔记库/);
      });
    };
    try {
      if (hydrating) await page.locator('.rail-btn[data-module="writing"]').click();
      if (hydrating) await pickTheme();
      else await page.locator('#btnWritingCreateScaffold').click();
      await Promise.race([started, new Promise((_, reject) => {
        setTimeout(() => reject(new Error(`The ${phase} request was not reached`)), 10000).unref();
      })]);
      await switchVault(otherVault);
    } catch (error) {
      const directory = 'output/playwright/core-project-creation';
      await fs.mkdir(directory, { recursive: true });
      await page.screenshot({ path: path.join(directory, `failure-${width}-${phase.replaceAll(' ', '-')}.png`), fullPage: true });
      t.diagnostic(JSON.stringify({ requests, body: await page.locator('body').innerText(), state: await page.evaluate(() => ({
        module: window.__prototypeState.module, notes: window.__prototypeState.notes.map(note => ({ id: note.id, bodyLoaded: note.bodyLoaded }))
      })) }));
      throw error;
    } finally { release(); }
    // Routing cancellation may not emit a page response/requestfailed event on every viewport.
    // Wait for the actual route handler to finish, then verify UI and real persisted state.
    await routeFinished;
    await page.unroute(endpoint);
    await page.locator('.rail-btn[data-module="writing"]').click();
    await waitFor(async () => assert.equal(await page.locator('.writing-shell').getAttribute('data-writing-has-topic'), 'false'));
    assert.equal(await page.locator('#writingScaffoldPanel').isVisible(), false);
    assert.equal((await fetchJson(apiBase, '/api/v1/writing-projects?limit=50')).json.items.length, 0);
    assert.equal(creations, hydrating ? 0 : 1);
    assert.equal(generations, 0, "A stale preparation result must not generate a scaffold in either Vault");
    assert.doesNotMatch(await page.locator('#statusText').textContent(), /确定主题失败|可写主题已确定|提纲已生成/);
    assert.equal(await page.locator('[data-writing-note-id]').count(), 0, "Late hydration must not repopulate the empty Vault");
    const output = path.join('output/playwright/core-project-creation', `${width}-${phase.replaceAll(' ', '-')}`);
    await fs.mkdir(output, { recursive: true });
    await page.screenshot({ path: path.join(output, 'empty-vault-after-late-result.png'), fullPage: true });
    await switchVault(vaultPath);
    const projects = (await fetchJson(apiBase, '/api/v1/writing-projects?limit=50')).json.items;
    assert.equal(projects.length, committed ? 1 : 0);
    if (committed) assert.equal(projects[0].scaffold_id, null);
    for (const [index, note] of notes.entries()) assert.equal(await fs.readFile(path.join(vaultPath, note.markdownPath), 'utf8'), originalFiles[index]);
  });
}

for (const width of [1366, 320]) for (const scenario of ['success', 'save failure', 'continued input']) {
  test(`project creation uses form edits made while waiting with ${scenario} at ${width}px`, async t => {
    if (process.env.RUN_BROWSER_E2E !== "1") { t.skip("Set RUN_BROWSER_E2E=1"); return; }
    const pw = await optionalPlaywright(t);
    if (!pw) return;
    const h = await startPrototypeStack(t, pw);
    if (!h) return;
    const { page, apiBase, webBase } = h;
    await page.setViewportSize({ width, height: 844 });
    const notes = [];
    for (const title of ["先解释再核对", "反例能发现遗漏", "补充适用条件"]) {
      notes.push((await createWritingReadyPermanentNote(apiBase, { title, body: `# ${title}\n\n把理解写清楚，再核对。`, thesis: title,
        threeLineSummary: [title, "材料帮助核对遗漏。", "适用于阅读整理。"], boundaryOrCounterpoint: "需了解背景。" })).json.item);
    }
    for (const target of notes.slice(1)) assert.equal((await postJson(apiBase, `/api/v1/notes/${notes[0].id}/relations`, {
      toNoteId: target.id, relationType: "supports", rationale: "核对解释中的遗漏。"
    })).status, 201);
    const theme = await postJson(apiBase, '/api/v1/index-cards', { directoryId: 'dir_original_default', indexType: 'topic',
      title: '核对阅读理解', centralQuestion: '怎样发现遗漏？', summary: '通过反例核对自己的理解。',
      items: notes.map(note => ({ noteId: note.id, shortLabel: note.title, rationale: '用于核对理解。' })) });
    assert.equal(theme.status, 201);
    await page.goto(`${webBase}/prototype`, { waitUntil: 'networkidle' });
    await page.locator('.rail-btn[data-module="writing"]').click();
    await page.locator('#writingThemeIndexList [data-writing-index-card-id]', { hasText: '核对阅读理解' })
      .getByRole('button', { name: '开始写', exact: true }).click();
    await waitFor(async () => assert.equal(await page.locator('#btnWritingCreateScaffold').isDisabled(), false));
    let release, held, createdId, patchHeld, releasePatch, patches = 0, creations = 0, generations = 0;
    const gate = new Promise(resolve => { release = resolve; });
    const started = new Promise(resolve => { held = resolve; });
    const patchGate = new Promise(resolve => { releasePatch = resolve; });
    const patchStarted = new Promise(resolve => { patchHeld = resolve; });
    const latestQuestion = scenario === 'continued input' ? '反例与适用条件怎样一起核对我的理解？' : '反例怎样帮助我发现解释中的遗漏？';
    page.on('request', request => {
      if (request.method() === 'POST' && request.url().endsWith('/api/v1/draft-scaffolds')) generations++;
    });
    await page.route('**/api/v1/writing-projects', async route => {
      if (route.request().method() !== 'POST') return route.continue();
      creations++;
      const response = await route.fetch();
      assert.equal(response.status(), 201);
      createdId = (await response.json()).item.id;
      held(); await gate; await route.fulfill({ response });
    });
    await page.route('**/api/v1/writing-projects/*', async route => {
      if (route.request().method() !== 'PATCH') return route.continue();
      patches++;
      if (scenario === 'save failure' && patches === 1) return route.fulfill({ status: 503, contentType: 'application/json',
        body: JSON.stringify({ error: { code: 'FORM_SAVE_UNAVAILABLE', message: '题目保存暂时不可用' } }) });
      const response = await route.fetch();
      assert.equal(response.status(), 200);
      if (scenario === 'continued input' && patches === 1) { patchHeld(); await patchGate; }
      return route.fulfill({ response });
    });
    try {
      await page.locator('#btnWritingCreateScaffold').click();
      await started;
      await page.locator('#writingTitle').fill('用反例核对自己的理解');
      await page.locator('#writingGoal').fill('反例怎样帮助我发现解释中的遗漏？');
    } finally { release(); }
    if (scenario === 'save failure') {
      await waitFor(async () => assert.match(await page.locator('#statusText').textContent(), /题目保存暂时不可用/));
      assert.equal(await page.locator('#writingTitle').inputValue(), '用反例核对自己的理解');
      assert.equal(await page.locator('#writingGoal').inputValue(), latestQuestion);
      assert.equal(generations, 0);
      assert.equal((await fetchJson(apiBase, `/api/v1/writing-projects/${createdId}`)).json.item.scaffold_id, null);
      await page.locator('#btnWritingCreateScaffold').click();
    }
    if (scenario === 'continued input') {
      try {
        await patchStarted;
        await page.locator('#writingGoal').fill(latestQuestion);
        await page.locator('#writingGoal').evaluate(input => input.setSelectionRange(3, 8));
        assert.equal(await page.locator('#writingGoal').evaluate(input => input === document.activeElement), true);
      } finally { releasePatch(); }
    }
    await waitFor(async () => {
      const project = (await fetchJson(apiBase, `/api/v1/writing-projects/${createdId}`)).json.item;
      assert.equal(project.title, '用反例核对自己的理解');
      assert.equal(project.goal, latestQuestion);
      assert.ok(project.scaffold_id);
      assert.deepEqual(project.book_structure.parts, []);
    });
    assert.equal(creations, 1);
    assert.equal(generations, 1);
    assert.equal(patches, scenario === 'success' ? 1 : 2);
    await page.reload({ waitUntil: 'networkidle' });
    await page.locator('.rail-btn[data-module="writing"]').click();
    await page.locator(`#writingThemeIndexList [data-writing-project-id="${createdId}"]`).getByText('继续提纲', { exact: true }).click();
    await waitFor(async () => {
      assert.equal(await page.locator('#writingTitle').inputValue(), '用反例核对自己的理解');
      assert.equal(await page.locator('#writingGoal').inputValue(), latestQuestion);
    });
    await page.locator('[data-writing-tab="theme"]').click();
    assert.equal(await page.locator('#writingTitle').isVisible(), true);
    assert.equal(await page.locator('#writingGoal').isVisible(), true);
    const output = path.join('output/playwright/core-project-creation', `${width}-pending-form-${scenario.replaceAll(' ', '-')}`);
    await fs.mkdir(output, { recursive: true });
    await page.screenshot({ path: path.join(output, 'restored-title-and-question.png'), fullPage: true });
  });
}
