import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { createWritingReadyPermanentNote, optionalPlaywright, postJson, startPrototypeStack, fetchJson, waitFor } from "./prototype-copy-test-helpers.mjs";

const longHeading = number => `第${number}节：先用自己的话说明读过的内容，检查判断成立的条件，再对照原文和反例修正遗漏，保留依据、适用范围及仍未解决的问题，以便在新的情境中继续检验和修改这条判断`;

for (const width of [1366, 320]) {
  test(`failed outline autosave survives immediate refresh and a normal retry (${width}px)`, async t => {
    if (process.env.RUN_BROWSER_E2E !== "1") { t.skip("Set RUN_BROWSER_E2E=1"); return; }
    const h = await workspace(t, width);
    if (!h) return;
    const { page, apiBase, project, directory } = h;
    const pattern = `**/api/v1/draft-scaffolds/${project.scaffold_id}`;
    let writes = 0, requests = 0;
    page.on("request", request => { if (request.url().endsWith(`/api/v1/draft-scaffolds/${project.scaffold_id}`) && request.method() === "PATCH") requests++; });
    await page.route(pattern, route => {
      if (route.request().method() !== "PATCH") return route.continue();
      writes++;
      return route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: {
        code: "SAVE_UNAVAILABLE", message: "服务暂时不可用。" } }) });
    });
    const original = (await fetchJson(apiBase, `/api/v1/draft-scaffolds/${project.scaffold_id}`)).json.item;
    const title = `${longHeading(1)}：断连时仍要保留的编辑`;
    const purpose = "新写的要点不能因为保存失败后重新打开而丢失。";
    try {
      await page.locator('.writing-outline-heading').first().fill(title);
      await page.locator('[data-writing-outline-field="purpose"]').first().fill(purpose);
      await page.locator('[data-writing-outline-field="purpose"]').first().press("Tab");
      await waitFor(async () => assert.match(await page.locator("#statusText").innerText(), /保存提纲失败/));
      assert.deepEqual((await fetchJson(apiBase, `/api/v1/draft-scaffolds/${project.scaffold_id}`)).json.item.sections, original.sections);
      const before = requests;
      await page.unroute(pattern);
      await page.reload({ waitUntil: "networkidle" });
      await page.locator('.rail-btn[data-module="writing"]').click();
      await page.locator("#writingThemeIndexList [data-writing-index-card-id]", { hasText: project.title })
        .getByRole("button", { name: "继续提纲", exact: true }).click();
      await page.locator('.rail-btn[data-module="writing"]').click();
      await page.locator('.writing-outline-heading:visible').first().waitFor();
      assert.equal(await page.locator('.writing-outline-heading').first().inputValue(), title);
      assert.equal(await page.locator('[data-writing-outline-field="purpose"]').first().inputValue(), purpose);
      assert.equal(requests, before, "Opening recovered input must not silently submit it");
      await page.screenshot({ path: path.join(directory, "outline-refresh-recovered.png"), fullPage: true });
      const finalTitle = `${title}（已核对）`;
      await page.locator('.writing-outline-heading').first().fill(finalTitle);
      await page.locator('.writing-outline-heading').first().press("Tab");
      await waitFor(async () => {
        const saved = (await fetchJson(apiBase, `/api/v1/draft-scaffolds/${project.scaffold_id}`)).json.item;
        assert.equal(saved.sections[0].heading, finalTitle);
        assert.equal(saved.sections[0].purpose, purpose);
        assert.deepEqual(saved.sections.map(section => section.evidence_note_ids), original.sections.map(section => section.evidence_note_ids));
      });
      assert.equal((await fetchJson(apiBase, "/api/v1/writing-projects?limit=20")).json.items.length, 1);
    } catch (error) {
      await page.screenshot({ path: path.join(directory, "outline-refresh-failure.png"), fullPage: true });
      throw error;
    } finally { await page.unroute(pattern); }
  });
}

for (const { scenario, width } of [{ scenario: "pending", width: 320 }, { scenario: "external-conflict", width: 320 }, { scenario: "external-conflict", width: 1366 }]) {
  test(`outline refresh recovery handles ${scenario} without overwriting server data (${width}px)`, async t => {
    if (process.env.RUN_BROWSER_E2E !== "1") { t.skip("Set RUN_BROWSER_E2E=1"); return; }
    const h = await workspace(t, width);
    if (!h) return;
    const { page, apiBase, project, directory } = h;
    const routePath = `/api/v1/draft-scaffolds/${project.scaffold_id}`, pattern = `**${routePath}`;
    let release, accepted, count = 0, refreshing = false, releaseRead = () => {};
    const held = new Promise(resolve => { release = resolve; });
    const ready = new Promise(resolve => { accepted = resolve; });
    page.on("request", request => { if (request.url().endsWith(routePath) && request.method() === "PATCH") count++; });
    await page.route(pattern, async route => {
      if (route.request().method() !== "PATCH") return route.continue();
      if (scenario === "external-conflict") return route.fulfill({ status: 503, contentType: "application/json",
        body: JSON.stringify({ error: { code: "UNAVAILABLE", message: "Save unavailable" } }) });
      const response = await route.fetch();
      assert.equal(response.status(), 200);
      accepted();
      await held;
      try { await route.fulfill({ response }); }
      catch (error) { if (!refreshing || !/closed|disposed|canceled|cancelled|already handled|not found/i.test(error.message)) throw error; }
    });
    try {
      const field = page.locator('.writing-outline-heading').first();
      await field.fill("Submitted before refresh");
      await field.press("Tab");
      if (scenario === "pending") await ready;
      else await waitFor(async () => assert.match(await page.locator("#statusText").innerText(), /保存提纲失败/));
      await field.fill("My later title must survive reopening");
      let server = (await fetchJson(apiBase, routePath)).json.item;
      if (scenario === "external-conflict") {
        const response = await fetch(`${apiBase}${routePath}`, { method: "PATCH", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sections: server.sections.map((section, index) => index ? section : { ...section, heading: "An external change to preserve" }),
            openQuestions: server.open_questions }) });
        assert.equal(response.status, 200);
        server = (await response.json()).item;
      }
      const before = count;
      refreshing = true;
      await page.reload({ waitUntil: "networkidle" });
      release();
      await page.unroute(pattern);
      await page.locator('.rail-btn[data-module="writing"]').click();
      await page.locator("#writingThemeIndexList [data-writing-index-card-id]", { hasText: project.title })
        .getByRole("button", { name: "继续提纲", exact: true }).click();
      await page.locator('.rail-btn[data-module="writing"]').click();
      await page.locator('.writing-outline-heading:visible').first().waitFor();
      assert.equal(await page.locator('.writing-outline-heading').first().inputValue(), "My later title must survive reopening");
      assert.equal(count, before);
      assert.deepEqual((await fetchJson(apiBase, routePath)).json.item, server);
      const attempted = "My recovered title after checking";
      await page.locator('.writing-outline-heading').first().fill(attempted);
      const responseWait = page.waitForResponse(response => response.url().endsWith(routePath) && response.request().method() === "PATCH");
      await page.locator('.writing-outline-heading').first().press("Tab");
      const saved = await responseWait;
      assert.equal(saved.status(), scenario === "pending" ? 200 : 409);
      if (scenario === "pending") await waitFor(async () => assert.equal((await fetchJson(apiBase, routePath)).json.item.sections[0].heading, attempted));
      else {
        assert.equal((await saved.json()).error.code, "WRITING_OUTLINE_CONFLICT");
        await waitFor(async () => assert.match(await page.locator("#statusText").innerText(), /其他地方修改.*未覆盖/));
        assert.equal(await page.locator('.writing-outline-heading').first().inputValue(), attempted);
        assert.deepEqual((await fetchJson(apiBase, routePath)).json.item, server);
        await page.locator('#writingMoreMenu > summary').click();
        const downloadWait = page.waitForEvent('download');
        await page.locator('#btnWritingExportScaffold').click();
        const download = await downloadWait;
        const exportedPath = path.join(h.exportPath, download.suggestedFilename());
        await download.saveAs(exportedPath);
        const exported = await fs.readFile(exportedPath, 'utf8');
        assert.ok(exported.includes(attempted), 'Export keeps my recovered outline, not the server replacement');
        assert.ok(!exported.includes(server.sections[0].heading));
        for (const note of h.notes) assert.ok(exported.includes(`[[${note.title}]]`));
        assert.deepEqual((await fetchJson(apiBase, routePath)).json.item, server);
        await page.locator('#writingMoreMenu > summary').click();
        const reload = page.locator('#btnWritingReloadScaffold');
        await reload.waitFor({ state: 'visible', timeout: 5000 });
        await decideSavedOutlineLoad(page, false);
        assert.equal(await page.locator('.writing-outline-heading').first().inputValue(), attempted);
        await page.reload({ waitUntil: 'networkidle' });
        await page.locator('.rail-btn[data-module="writing"]').click();
        await page.locator('#writingThemeIndexList [data-writing-index-card-id]', { hasText: project.title })
          .getByRole('button', { name: '继续提纲', exact: true }).click();
        await page.locator('.writing-outline-heading:visible').first().waitFor();
        assert.equal(await page.locator('.writing-outline-heading').first().inputValue(), attempted);
        await page.route(pattern, route => route.request().method() === 'GET'
          ? route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: { code: 'READ_UNAVAILABLE', message: '读取暂时不可用' } }) })
          : route.continue());
        await page.locator('#writingMoreMenu > summary').click();
        await page.locator('#btnWritingReloadScaffold').click();
        await waitFor(async () => assert.match(await page.locator('#statusText').innerText(), /载入提纲失败.*读取暂时不可用.*当前编辑仍保留/));
        assert.equal(await page.locator('#writingMoreMenu').getAttribute('open'), null);
        assert.equal(await page.locator('.writing-outline-heading').first().inputValue(), attempted);
        await page.unroute(pattern);
        let readReady;
        const reading = new Promise(resolve => { readReady = resolve; });
        const heldRead = new Promise(resolve => { releaseRead = resolve; });
        await page.route(pattern, async route => {
          if (route.request().method() !== 'GET') return route.continue();
          const response = await route.fetch(); readReady(); await heldRead; await route.fulfill({ response });
        });
        await page.locator('#writingMoreMenu > summary').click();
        await page.locator('#btnWritingReloadScaffold').click();
        await reading;
        assert.equal(await page.locator('#btnWritingReloadScaffold').isDisabled(), true);
        const newerDuringLoad = `${attempted}: later typing while loading`;
        await page.locator('.writing-outline-heading').first().click();
        await page.locator('.writing-outline-heading').first().fill(newerDuringLoad);
        releaseRead();
        await waitFor(async () => assert.match(await page.locator('#statusText').innerText(), /当前内容已变化.*取消载入/));
        assert.equal(await page.locator('.writing-outline-heading').first().inputValue(), newerDuringLoad);
        assert.deepEqual((await fetchJson(apiBase, routePath)).json.item, server);
        await page.unroute(pattern);
        await page.locator('#writingMoreMenu > summary').click();
        await decideSavedOutlineLoad(page, true);
        await waitFor(async () => assert.equal(await page.locator('.writing-outline-heading').first().inputValue(), server.sections[0].heading));
        assert.deepEqual((await fetchJson(apiBase, routePath)).json.item, server, 'Loading is readonly');
        const resolvedTitle = 'After reviewing both versions, I can save again';
        await page.locator('.writing-outline-heading').first().fill(resolvedTitle);
        await page.locator('.writing-outline-heading').first().press('Tab');
        await waitFor(async () => assert.equal((await fetchJson(apiBase, routePath)).json.item.sections[0].heading, resolvedTitle));
        await page.reload({ waitUntil: 'networkidle' });
        await page.locator('.rail-btn[data-module="writing"]').click();
        await page.locator('#writingThemeIndexList [data-writing-index-card-id]', { hasText: project.title })
          .getByRole('button', { name: '继续提纲', exact: true }).click();
        await page.locator('.writing-outline-heading:visible').first().waitFor();
        assert.equal(await page.locator('.writing-outline-heading').first().inputValue(), resolvedTitle);
      }
      await page.screenshot({ path: path.join(directory, `outline-refresh-${scenario}.png`), fullPage: true });
    } finally { release(); releaseRead(); await page.unroute(pattern); }
  });
}

async function decideSavedOutlineLoad(page, accept) {
  const dialogWait = page.waitForEvent('dialog');
  const clicking = page.locator('#btnWritingReloadScaffold').click();
  const dialog = await dialogWait;
  assert.equal(dialog.type(), 'confirm');
  assert.match(dialog.message(), /未保存.*替换/);
  if (accept) await dialog.accept();
  else await dialog.dismiss();
  await clicking;
  await waitFor(async () => assert.equal(await page.locator('#btnWritingReloadScaffold').isDisabled(), false));
}

async function answer(page, value) {
  await page.locator("[data-text-input-field]:visible").fill(value);
  await page.locator("[data-text-input-confirm]:visible").click();
}

async function workspace(t, width, options = {}) {
  const pw = await optionalPlaywright(t);
  if (!pw) return null;
  const stack = await startPrototypeStack(t, pw, options);
  if (!stack) return null;
  const { page, apiBase, webBase } = stack;
  const notes = [];
  for (const [index, title] of ["解释能暴露理解缺口", "核对原文补充前提", "反例限定适用范围"].entries()) {
    const created = await createWritingReadyPermanentNote(apiBase, { title, body: `# ${title}\n\n第${index + 1}条阅读实践的判断及依据。`,
      thesis: `${title}，但需要结合具体情境反复检验。`, threeLineSummary: [title, "从一次具体阅读中发现问题。", "作为后续文章的一条依据。"],
      boundaryOrCounterpoint: "不同背景和任务可能需要不同方法。" });
    notes.push(created.json.item);
  }
  for (const target of notes.slice(1)) assert.equal((await postJson(apiBase, `/api/v1/notes/${notes[0].id}/relations`, {
    toNoteId: target.id, relationType: "qualifies", rationale: "理解之后还需要核对前提与反例，不能仅凭熟悉感判断。", confidence: 1
  })).status, 201);
  await page.setViewportSize({ width, height: width === 1366 ? 768 : 844 });
  await page.goto(`${webBase}/prototype`, { waitUntil: "networkidle" });
  await page.locator("#btnToggleSearch").click();
  await page.locator("#globalNoteSearchInput").fill(notes[0].title);
  await page.locator(`[data-search-note="${notes[0].id}"]`).click();
  await page.locator('.rail-btn[data-module="writing"]').click();
  await page.locator('.writing-head-actions [data-writing-related-open]').click();
  await page.locator("#writingCandidateDetails > summary").click();
  for (const note of notes) await page.locator(`#writingCandidateList [data-writing-action="add"][data-writing-note-id="${note.id}"]`).click();
  await page.locator("#writingRelatedNotesPanel [data-writing-related-close]").click();
  await page.locator("#btnWritingSaveThemeIndex").click();
  const title = `阅读与判断的长期整理${width}`;
  await answer(page, title);
  await answer(page, "如何从阅读材料形成可追溯、可检验并能够继续写作的判断？");
  await page.locator("#btnWritingCreateScaffold").click();
  await page.locator("#writingScaffoldPanel:visible").waitFor();
  const project = (await fetchJson(apiBase, "/api/v1/writing-projects?limit=20")).json.items.find(item => item.title === title);
  assert.ok(project?.scaffold_id);
  const directory = path.resolve(`output/playwright/core-long-writing/${width}`);
  await fs.mkdir(directory, { recursive: true });
  const exportPath = await fs.mkdtemp(path.join(os.tmpdir(), "yansilu-long-writing-export-"));
  t.after(() => fs.rm(exportPath, { recursive: true, force: true }));
  return { ...stack, notes, project, directory, exportPath };
}

for (const width of [1366, 320]) {
  test(`outline autosave preserves new input through delayed success, failure and keyboard retry (${width}px)`, async t => {
    if (process.env.RUN_BROWSER_E2E !== "1") { t.skip("Set RUN_BROWSER_E2E=1"); return; }
    const h = await workspace(t, width, { beforeNavigate: page => page.addInitScript(() => { window.ResizeObserver = undefined; }) });
    if (!h) return;
    const { page, apiBase, project, directory } = h;
    await page.addStyleTag({ content: '.writing-outline-heading { field-sizing: fixed !important; }' });
    const routePattern = `**/api/v1/draft-scaffolds/${project.scaffold_id}`;
    let release = () => {};
    try {
      for (const outcome of ["success", "failure"]) {
        let accepted;
        const ready = new Promise(resolve => { accepted = resolve; });
        const held = new Promise(resolve => { release = resolve; });
        let intercepted = false;
        await page.route(routePattern, async route => {
          if (route.request().method() !== "PATCH" || intercepted) return route.continue();
          intercepted = true;
          const upstream = outcome === "success" ? await route.fetch() : null;
          accepted();
          await held;
          if (upstream) await route.fulfill({ response: upstream });
          else await route.fulfill({ status: 503, contentType: "application/json",
            body: JSON.stringify({ error: { code: "SAVE_UNAVAILABLE", message: "提纲保存暂时不可用，请重试。" } }) });
        });
        const heading = page.locator('.writing-outline-heading').first();
        const older = `${longHeading(1)}：${outcome}返回前的内容`;
        const newer = `${longHeading(1)}：${outcome}等待时继续写下的新内容`;
        await heading.fill(older);
        await heading.press("Tab");
        await ready;
        await heading.fill(newer);
        await heading.evaluate(field => { window.__liveOutlineInput = field; field.setSelectionRange(8, 15); });
        release();
        await waitFor(async () => assert.match(await page.locator("#statusText").innerText(),
          outcome === "success" ? /正在编辑的修改仍保留/ : /保存提纲失败.*暂时不可用/));
        assert.equal(await heading.inputValue(), newer);
        assert.deepEqual(await heading.evaluate(field => [field === window.__liveOutlineInput, field === document.activeElement,
          field.selectionStart, field.selectionEnd]), [true, true, 8, 15]);
        if (outcome === "success") assert.equal((await fetchJson(apiBase, `/api/v1/draft-scaffolds/${project.scaffold_id}`)).json.item.sections[0].heading, older);
        for (const nextWidth of [820, 320, 1366, width]) {
          await page.setViewportSize({ width: nextWidth, height: nextWidth === 1366 ? 768 : 844 });
          await page.waitForFunction(() => [...document.querySelectorAll('.writing-outline-heading')]
            .every(field => field.clientHeight >= field.scrollHeight - 1));
          assert.deepEqual(await heading.evaluate(field => [field === window.__liveOutlineInput, field === document.activeElement,
            field.selectionStart, field.selectionEnd]), [true, true, 8, 15]);
        }
        await page.unroute(routePattern);
        await heading.press("Tab");
        await waitFor(async () => {
          assert.equal((await fetchJson(apiBase, `/api/v1/draft-scaffolds/${project.scaffold_id}`)).json.item.sections[0].heading, newer);
          assert.equal(await page.locator("#statusText").innerText(), "提纲已保存");
        });
        await page.screenshot({ path: path.join(directory, `outline-${outcome}-retry.png`), fullPage: true });
        await page.reload({ waitUntil: "networkidle" });
        await page.locator('.rail-btn[data-module="writing"]').click();
        await page.locator("#writingThemeIndexList [data-writing-index-card-id]", { hasText: project.title })
          .getByRole("button", { name: "继续提纲", exact: true }).click();
        await page.locator('.rail-btn[data-module="writing"]').click();
        await page.locator('.writing-outline-heading:visible').first().waitFor();
        assert.equal(await page.locator('.writing-outline-heading').first().inputValue(), newer);
        await page.addStyleTag({ content: '.writing-outline-heading { field-sizing: fixed !important; }' });
      }
    } catch (error) {
      await page.screenshot({ path: path.join(directory, "autosave-failure.png"), fullPage: true });
      throw error;
    } finally { release(); await page.unroute(routePattern); }
  });
}

test("rapid outline edits send only the newest waiting snapshot and preserve continued typing", async t => {
  if (process.env.RUN_BROWSER_E2E !== "1") { t.skip("Set RUN_BROWSER_E2E=1"); return; }
  const h = await workspace(t, 1366);
  if (!h) return;
  const { page, apiBase, project, vaultPath } = h;
  const pattern = `**/api/v1/draft-scaffolds/${project.scaffold_id}`;
  const requests = [];
  let release, accepted;
  const held = new Promise(resolve => { release = resolve; });
  const ready = new Promise(resolve => { accepted = resolve; });
  await page.route(pattern, async route => {
    if (route.request().method() !== "PATCH") return route.continue();
    const payload = route.request().postDataJSON();
    assert.equal(payload.expectedVaultPath, vaultPath);
    requests.push(payload);
    if (requests.length !== 1) return route.continue();
    const upstream = await route.fetch();
    accepted();
    await held;
    await route.fulfill({ response: upstream });
  });
  try {
    const field = page.locator('.writing-outline-heading').first();
    await field.fill("Already saving");
    await field.press("Tab");
    await ready;
    await field.fill("An obsolete waiting snapshot");
    await field.press("Tab");
    await field.fill("The latest complete waiting snapshot");
    await field.press("Tab");
    await field.fill("Continued typing that has not yet been submitted");
    await field.evaluate(input => { window.__coalescedOutlineField = input; input.setSelectionRange(4, 11); });
    release();
    await waitFor(async () => {
      assert.equal((await fetchJson(apiBase, `/api/v1/draft-scaffolds/${project.scaffold_id}`)).json.item.sections[0].heading,
        "The latest complete waiting snapshot");
      assert.match(await page.locator("#statusText").innerText(), /正在编辑的修改仍保留/);
    });
    assert.equal(requests.length, 2);
    assert.equal(requests[1].sections[0].heading, "The latest complete waiting snapshot");
    assert.deepEqual(await field.evaluate(input => [input === window.__coalescedOutlineField, input === document.activeElement,
      input.selectionStart, input.selectionEnd]), [true, true, 4, 11]);
    assert.equal(await field.inputValue(), "Continued typing that has not yet been submitted");
    await field.press("Tab");
    await waitFor(async () => {
      assert.equal((await fetchJson(apiBase, `/api/v1/draft-scaffolds/${project.scaffold_id}`)).json.item.sections[0].heading,
        "Continued typing that has not yet been submitted");
      assert.equal(await page.locator("#statusText").innerText(), "提纲已保存");
    });
    assert.equal(requests.length, 3);
  } finally { release(); await page.unroute(pattern); }
});

for (const width of [1366, 390, 320]) {
  test(`long outline and chapter editing survives resizing, refresh and real exports (${width}px)`, async t => {
    if (process.env.RUN_BROWSER_E2E !== "1") { t.skip("Set RUN_BROWSER_E2E=1"); return; }
    const h = await workspace(t, width);
    if (!h) return;
    const { page, apiBase, webBase, project, notes, vaultPath, directory, exportPath } = h;
    let stage = "outline expansion";
    try {
      if (width <= 390) {
        for (const button of await page.locator('.writing-outline-section-actions button').all()) {
          const bounds = await button.boundingBox();
          assert.ok(bounds.width >= 44 && bounds.height >= 44, "Outline controls must remain usable on a narrow screen");
        }
      }
      while (await page.locator(".writing-outline-section").count() < 24) {
        await page.locator('[data-writing-outline-action="add"]').last().click();
      }
      const fields = page.locator('.writing-outline-heading');
      for (let index = 0; index < 24; index++) {
        await fields.nth(index).fill(longHeading(index + 1));
        await page.locator('[data-writing-outline-field="purpose"]').nth(index).fill(`第${index + 1}节先提出问题，再核对材料、反例和判断条件。\n保留争议和后续需要补充的证据。`);
      }
      await page.locator("#btnWritingStartDraft").focus();
      await waitFor(async () => {
        const fresh = (await fetchJson(apiBase, `/api/v1/draft-scaffolds/${project.scaffold_id}`)).json.item;
        assert.equal(fresh.sections.length, 24);
        assert.equal(fresh.sections[23].heading, longHeading(24));
      }, 15000);
      assert.equal(await fields.count(), 24);
      stage = "window resizing";
      await fields.nth(23).focus();
      await fields.nth(23).evaluate(field => { field.setSelectionRange(9, 17); window.__longWritingField = field; });
      for (const nextWidth of [1366, 820, 390, 320, 1366]) {
        await page.setViewportSize({ width: nextWidth, height: nextWidth === 1366 ? 768 : 844 });
        await page.waitForFunction(() => {
          const fields = [...document.querySelectorAll('.writing-outline-heading')];
          return fields.length === 24 && fields.every(field => field.clientHeight >= field.scrollHeight - 1);
        }, null, { timeout: 5000 });
        assert.equal(await fields.nth(23).evaluate(field => field === window.__longWritingField), true);
        assert.deepEqual(await fields.nth(23).evaluate(field => [field === document.activeElement, field.selectionStart, field.selectionEnd]), [true, 9, 17]);
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
        const bounds = await fields.nth(23).boundingBox();
        assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= nextWidth + 1);
      }
      await page.setViewportSize({ width, height: width === 1366 ? 768 : 844 });
      await page.screenshot({ path: path.join(directory, "long-outline.png"), fullPage: true });
      stage = "article saving";
      await page.locator("#btnWritingStartDraft").click();
      const draft = await page.locator("#writingDraftEditor").inputValue();
      for (let number = 1; number <= 24; number++) assert.ok(draft.includes(longHeading(number)));
      const article = `${draft}\n\n${Array.from({ length: 80 }, (_, i) => `第${i + 1}段：自己的解释需要与原始材料和反例一起检验，保留判断的依据和变化过程。`).join("\n\n")}`;
      await page.locator("#writingDraftEditor").fill(article);
      await page.locator("#btnWritingSaveDraft").click();
      await waitFor(async () => {
        const fresh = (await fetchJson(apiBase, `/api/v1/writing-projects/${project.id}`)).json.item;
        assert.ok(fresh.draft_note_id);
        assert.match((await fetchJson(apiBase, `/api/v1/notes/${fresh.draft_note_id}`)).json.item.body, /第80段/);
      }, 15000);
      stage = "long chapters";
      const chapterTitles = [1, 2, 3].map(number => `第${number}章：从阅读时产生的问题出发，用自己的话解释材料，检查证据与反例，在真实任务中逐步修正判断，并保留整个形成过程以支持后续的主题文章和书稿写作`);
      for (const title of chapterTitles) {
        await page.locator("#btnWritingChapterAdd").click();
        await answer(page, title);
        await page.waitForFunction(title => document.querySelector("#writingDraftTarget")?.selectedOptions[0]?.textContent === title, title);
        assert.equal(await page.locator("#writingDraftPanel .writing-section-title").innerText(), title);
        const body = `# ${title}\n\n${Array.from({ length: 35 }, (_, i) => `本章第${i + 1}段：先说明问题，再对照证据和反例，保留观点的变化理由。`).join("\n\n")}`;
        await page.locator("#writingDraftEditor").fill(body);
        await page.locator("#btnWritingSaveDraft").click();
        await waitFor(async () => {
          const fresh = (await fetchJson(apiBase, `/api/v1/writing-projects/${project.id}`)).json.item;
          const chapter = fresh.book_structure.parts.flatMap(part => part.chapters).find(chapter => chapter.title === title);
          assert.ok(chapter.draft_note_id);
          const note = (await fetchJson(apiBase, `/api/v1/notes/${chapter.draft_note_id}`)).json.item;
          assert.match(note.body, /本章第35段/);
          assert.ok((await fs.readFile(path.join(vaultPath, note.markdownPath), "utf8")).includes(title));
        }, 15000);
        await waitFor(async () => assert.match(await page.locator("#statusText").innerText(), /章节已保存/));
      }
      const selectedId = await page.locator("#writingDraftTarget").inputValue();
      if (width <= 390) {
        for (const button of await page.locator('.writing-chapter-tools button').all()) {
          const bounds = await button.boundingBox();
          assert.ok(bounds.width >= 44 && bounds.height >= 44, "Chapter controls must remain usable on a narrow screen");
        }
      }
      await page.locator("#writingDraftEditor").focus();
      await page.locator("#writingDraftEditor").evaluate(field => { field.setSelectionRange(150, 159); field.scrollTop = 200; });
      for (const nextWidth of [820, 320, 1366, width]) {
        await page.setViewportSize({ width: nextWidth, height: nextWidth === 1366 ? 768 : 844 });
        assert.equal(await page.locator("#writingDraftTarget").inputValue(), selectedId);
        assert.deepEqual(await page.locator("#writingDraftEditor").evaluate(field => [field === document.activeElement, field.selectionStart, field.selectionEnd]), [true, 150, 159]);
        assert.ok(await page.locator("#writingDraftEditor").evaluate(field => field.scrollTop > 0), "Resizing must not reset a long chapter to its beginning");
        assert.equal(await page.locator("#writingDraftPanel .writing-section-title").innerText(), chapterTitles[2]);
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      }
      await page.screenshot({ path: path.join(directory, "long-chapter.png"), fullPage: true });
      stage = "refresh and exports";
      await page.reload({ waitUntil: "networkidle" });
      await page.locator('.rail-btn[data-module="writing"]').click();
      await page.locator("#writingThemeIndexList [data-writing-index-card-id]", { hasText: project.title }).getByRole("button", { name: "继续草稿", exact: true }).click();
      await page.locator('.rail-btn[data-module="writing"]').click();
      await page.locator("#writingDraftEditor:visible").waitFor();
      assert.match(await page.locator("#writingDraftEditor").inputValue(), /第80段/);
      const persisted = (await fetchJson(apiBase, `/api/v1/draft-scaffolds/${project.scaffold_id}`)).json.item;
      assert.equal(persisted.sections.length, 24);
      for (const note of notes) assert.ok(persisted.sections.some(section => section.evidence_note_ids.includes(note.id)));
      const refreshed = (await fetchJson(apiBase, `/api/v1/writing-projects/${project.id}`)).json.item;
      const chapter = refreshed.book_structure.parts.flatMap(part => part.chapters).find(item => item.id === selectedId);
      await page.locator("#writingDraftTarget").selectOption(selectedId);
      await page.waitForFunction(title => document.querySelector("#writingDraftPanel .writing-section-title")?.textContent === title, chapter.title);
      assert.match(await page.locator("#writingDraftEditor").inputValue(), /本章第35段/);
      await page.locator("#btnWritingChapterUp").click();
      await waitFor(async () => assert.match(await page.locator("#statusText").innerText(), /章节顺序已保存/));
      await page.locator("#writingMoreMenu > summary").click();
      const exportedWait = page.waitForResponse(response => response.url().endsWith("/api/v1/exports/book") && response.request().method() === "POST");
      await page.locator("#btnWritingExportBook").click();
      await answer(page, exportPath);
      const exported = await (await exportedWait).json();
      assert.equal(exported.status, "completed");
      const book = await fs.readFile(exported.bookPath, "utf8");
      for (const title of chapterTitles) assert.ok(book.includes(title));
      assert.ok(book.indexOf(chapterTitles[2]) < book.indexOf(chapterTitles[1]));
      assert.equal((await fetchJson(apiBase, "/api/v1/writing-projects?limit=20")).json.items.length, 1);
      await page.screenshot({ path: path.join(directory, "long-work-restored.png"), fullPage: true });
    } catch (error) {
      await page.screenshot({ path: path.join(directory, "failure.png"), fullPage: true });
      throw new Error(`${stage}: ${error.message}`, { cause: error });
    }
  });
}
