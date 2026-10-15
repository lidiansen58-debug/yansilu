import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { optionalPlaywright, startPrototypeStack, fetchJson, postJson, waitFor, useWritingMarkdown } from "./prototype-copy-test-helpers.mjs";
import { createWritingSourceFixture, captureWritingSources } from "./prototype-writing-topic-repair-flow-helpers.mjs";
import { createManualWritingTheme, findWritingProject } from "./prototype-writing-flow-helpers.mjs";
import { createWritingScopeDirectory, createWritingScopeNote } from "./prototype-writing-scope-flow-helpers.mjs";

async function stackFor(t, options = {}) {
  if (process.env.RUN_BROWSER_E2E !== "1") { t.skip("Set RUN_BROWSER_E2E=1"); return null; }
  const pw = await optionalPlaywright(t);
  return pw ? startPrototypeStack(t, pw, options) : null;
}

async function item(stack, route) {
  const response = await fetchJson(stack.apiBase, route);
  assert.equal(response.status, 200, JSON.stringify(response.json));
  return response.json.item;
}

function observeExecution(page) {
  const paths = [];
  page.on("request", request => {
    const pathname = new URL(request.url()).pathname;
    if (request.method() === "POST" && pathname !== "/api/v1/ai/route-preview" && /\/api\/v1\/(?:ai|writing\/ai-analysis|graph\/ai-analysis|graph\/potential-relations\/refine)(?:\/|$)/.test(pathname)) paths.push(pathname);
  });
  return paths;
}

async function more(page, selector) {
  const menu = page.locator("#writingMoreMenu");
  if (await menu.getAttribute("open") === null) await menu.locator("summary").click();
  await menu.locator(selector).click();
}

async function chooseTheme(stack, id) {
  const { page } = stack;
  if (!await page.locator(`[data-writing-index-card-id="${id}"]:visible`).count()) await page.locator('[data-writing-sidebar-action="topics"]').click();
  await page.locator(`[data-writing-index-card-id="${id}"] [data-writing-index-action="use"]`).click();
  await page.locator("#writingGoal:visible").waitFor();
}

export async function runCurrentWritingProjectFlow(t) {
  const stack = await stackFor(t, { beforeNavigate: page => page.addInitScript(() => {
    // Instrument copy output only; actual exported files are checked separately.
    window.__writingCopyTest = [];
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: async text => window.__writingCopyTest.push(text) } });
  }) });
  if (!stack) return;
  const { page, apiBase, webBase, vaultPath } = stack;
  const notes = await createWritingSourceFixture(stack), title = "从依据形成文章";
  const assertSourcesUnchanged = await captureWritingSources(stack, notes), executions = observeExecution(page);
  const sourceSnapshots = await Promise.all(notes.map(note => item(stack, `/api/v1/notes/${note.id}`)));
  const sourceFiles = await Promise.all(notes.map(note => fs.readFile(path.join(vaultPath, note.markdownPath))));
  const relationSnapshots = await Promise.all(notes.map(note => item(stack, `/api/v1/notes/${note.id}/relations`)));
  await createManualWritingTheme(stack, notes, { title });
  assert.deepEqual((await fetchJson(apiBase, "/api/v1/writing-projects?limit=50")).json.items, []);
  const themes = (await fetchJson(apiBase, "/api/v1/index-cards?limit=50")).json.items;
  assert.equal(themes.length, 1);
  await page.locator("#btnWritingCreateScaffold").click();
  await page.locator("#writingScaffoldPanel:visible").waitFor();
  const project = await findWritingProject(stack, notes, title), projectRoute = `/api/v1/writing-projects/${project.id}`;
  assert.ok(project.intent.trim()); assert.ok(project.desired_reader_takeaway.trim());
  const first = await item(stack, `/api/v1/draft-scaffolds/${project.scaffold_id}`);
  assert.deepEqual([...new Set(first.sections.flatMap(section => section.evidence_note_ids))].sort(), notes.map(note => note.id).sort());
  await more(page, "#btnWritingCopyScaffold");
  await waitFor(async () => assert.ok((await page.evaluate(() => window.__writingCopyTest)).length));
  const copied = await page.evaluate(() => window.__writingCopyTest.at(-1));
  const download = page.waitForEvent("download");
  await more(page, "#btnWritingExportScaffold");
  const exported = await fs.readFile(await (await download).path(), "utf8");
  assert.equal(exported, `${copied}\n`);
  for (const note of notes) assert.ok(exported.includes(`[[${note.title}]]`));
  assert.match(exported, /文章提纲|章节结构/);
  await page.locator('[data-writing-outline-field="heading"]').first().fill("先解释判断，再核对材料");
  await page.locator('[data-writing-outline-field="heading"]').first().press("Tab");
  await waitFor(async () => assert.equal((await item(stack, `/api/v1/draft-scaffolds/${first.id}`)).sections[0].heading, "先解释判断，再核对材料"));
  const firstSaved = await item(stack, `/api/v1/draft-scaffolds/${first.id}`);
  await page.locator('[data-writing-tab="theme"]').click();
  await page.locator("#btnWritingCreateScaffold").click();
  await page.locator("#writingScaffoldPanel:visible").waitFor();
  await waitFor(async () => assert.notEqual((await item(stack, projectRoute)).scaffold_id, first.id));
  const secondId = (await item(stack, projectRoute)).scaffold_id;
  await page.locator('[data-writing-outline-field="heading"]').first().fill("第二版：先明确适用条件");
  await page.locator('[data-writing-outline-field="heading"]').first().press("Tab");
  await waitFor(async () => assert.equal((await item(stack, `/api/v1/draft-scaffolds/${secondId}`)).sections[0].heading, "第二版：先明确适用条件"));
  const secondSaved = await item(stack, `/api/v1/draft-scaffolds/${secondId}`);
  await assertSourcesUnchanged();
  await page.locator("#btnWritingStartDraft").click(); await useWritingMarkdown(page);
  const firstBody = `# ${title}\n\n第一版正文保留中文 café 🌿 与 [[${notes[0].title}]]。\n`;
  const secondBody = `${firstBody}\n第二次保存补充了适用条件。\n`;
  for (const body of [firstBody, secondBody]) {
    await page.locator("#writingDraftEditor").fill(body);
    await page.locator("#btnWritingSaveDraft").click();
    await waitFor(async () => {
      const current = await item(stack, projectRoute);
      assert.ok(current.draft_note_id);
      assert.equal((await item(stack, `/api/v1/notes/${current.draft_note_id}`)).body, body);
    });
  }
  const draftProject = await item(stack, projectRoute), draft = await item(stack, `/api/v1/notes/${draftProject.draft_note_id}`);
  const draftBytes = await fs.readFile(path.join(vaultPath, draft.markdownPath));
  await page.locator('[data-writing-tab="outline"]').click();
  await more(page, "#btnWritingHistory");
  const history = page.getByRole("dialog", { name: "提纲历史", exact: true }); await history.waitFor();
  await history.getByLabel("选择提纲版本").selectOption(first.id);
  await waitFor(async () => assert.equal(await history.locator("[data-history-restore]").isEnabled(), true));
  assert.match(await history.locator("#writingHistoryPreview").innerText(), /先解释判断，再核对材料/);
  page.once("dialog", async dialog => { assert.match(dialog.message(), /文章正文不变/); await dialog.accept(); });
  await history.locator("[data-history-restore]").click(); await history.waitFor({ state: "detached" });
  const restored = await item(stack, projectRoute);
  assert.notEqual(restored.scaffold_id, first.id); assert.notEqual(restored.scaffold_id, secondId);
  assert.deepEqual((await item(stack, `/api/v1/draft-scaffolds/${restored.scaffold_id}`)).sections, firstSaved.sections);
  assert.deepEqual(await item(stack, `/api/v1/draft-scaffolds/${first.id}`), firstSaved);
  assert.deepEqual(await item(stack, `/api/v1/draft-scaffolds/${secondId}`), secondSaved);
  assert.equal(restored.draft_note_id, draft.id);
  assert.deepEqual(await item(stack, `/api/v1/notes/${draft.id}`), draft);
  assert.deepEqual(await fs.readFile(path.join(vaultPath, draft.markdownPath)), draftBytes);
  await page.goto(`${webBase}/prototype`, { waitUntil: "networkidle" });
  await page.locator('.rail-btn[data-module="writing"]').click();
  await page.locator(`[data-writing-index-card-id="${themes[0].id}"] [data-writing-project-id="${project.id}"]`).click();
  await useWritingMarkdown(page);
  assert.equal(await page.locator("#writingDraftEditor").inputValue(), secondBody);
  await more(page, "#btnWritingOpenDraft");
  await page.locator("#wysiwygHost:visible").waitFor();
  assert.match(await page.locator("#wysiwygHost").innerText(), /第二次保存补充了适用条件/);
  assert.equal((await fetchJson(apiBase, "/api/v1/writing-projects?limit=50")).json.items.length, 1);
  for (const [index, note] of notes.entries()) {
    assert.deepEqual(await item(stack, `/api/v1/notes/${note.id}`), sourceSnapshots[index]);
    assert.deepEqual(await fs.readFile(path.join(vaultPath, note.markdownPath)), sourceFiles[index]);
    const relations = await item(stack, `/api/v1/notes/${note.id}/relations`);
    const articleLinks = relations.backlinks.filter(link => link.fromNoteId === draft.id);
    assert.deepEqual({ ...relations, backlinks: relations.backlinks.filter(link => link.fromNoteId !== draft.id) }, relationSnapshots[index]);
    assert.equal(articleLinks.length, index === 0 ? 1 : 0);
    for (const link of articleLinks) { assert.equal(link.rationale, "markdown_wikilink"); assert.equal(link.relationType, "associated_with"); }
  }
  assert.deepEqual(executions, []);
}

export async function runCurrentWritingEntryAnalysisReset(t) {
  // Controlled availability and results isolate context ownership, not model quality or cost.
  const stack = await stackFor(t, { beforeNavigate: page => page.route("**/api/v1/ai/route-preview", route => route.fulfill({
    status: 200, contentType: "application/json", body: JSON.stringify({ item: { access: { ready: true }, provider: { providerId: "local_private_gateway" } } })
  })) });
  if (!stack) return;
  const { page, apiBase } = stack, notes = await createWritingSourceFixture(stack);
  const extra = await createWritingScopeNote(stack, "dir_original_default", "替换的条件材料");
  const relation = await postJson(apiBase, `/api/v1/notes/${notes[0].id}/relations`, { toNoteId: extra.id, relationType: "qualifies", rationale: "这条材料补充另一组判断成立的条件，改变文章的材料范围。" });
  assert.equal(relation.status, 201);
  const assertSourcesUnchanged = await captureWritingSources(stack, [...notes, extra]);
  const replacementNotes = [notes[0], notes[1], extra];
  const replacement = await postJson(apiBase, "/api/v1/index-cards", { directoryId: "dir_original_default", title: "换一组材料继续写", centralQuestion: "另一组条件怎样改变原有判断？", noteIds: replacementNotes.map(note => note.id) });
  assert.equal(replacement.status, 201);
  let release, calls = 0;
  const held = new Promise(resolve => { release = resolve; }); t.after(() => release());
  await page.route("**/api/v1/writing/ai-analysis", async route => {
    calls++;
    assert.deepEqual([...route.request().postDataJSON().noteIds].sort(), notes.map(note => note.id).sort());
    if (calls === 2) await held;
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ item: {
      request: { requestType: "writing_strong_model_analysis", model: { model: "controlled-test-response" } },
      result: { summary: { artifactCount: 1 }, artifacts: [{ type: "WritingMove", title: "旧材料组的检查建议", payload: { text: "旧材料组建议：先说明判断的适用条件。", sourceNoteIds: [notes[0].id] } }] }
    } }) });
  });
  await createManualWritingTheme(stack, notes, { title: "第一组材料的文章" });
  await page.locator("#btnWritingCreateScaffold").click(); await page.locator("#writingScaffoldPanel:visible").waitFor();
  const project = await findWritingProject(stack, notes, "第一组材料的文章");
  const projectBefore = await item(stack, `/api/v1/writing-projects/${project.id}`), scaffoldBefore = await item(stack, `/api/v1/draft-scaffolds/${project.scaffold_id}`);
  await page.locator("#btnWritingOutlineCheckPlaceholder").click();
  await waitFor(async () => assert.match(await page.locator("#writingStrongModelSummary:visible").innerText(), /旧材料组建议/));
  assert.equal(calls, 1);
  await page.locator("#btnWritingOutlineCheckPlaceholder").click();
  await waitFor(async () => assert.equal(calls, 2));
  await chooseTheme(stack, replacement.json.item.id);
  assert.equal(await page.locator("#writingTitle").inputValue(), replacement.json.item.title);
  assert.equal(await page.locator("#writingGoal").inputValue(), replacement.json.item.central_question);
  assert.deepEqual((await page.locator("#writingBasketList article[data-writing-note-id]").evaluateAll(cards => cards.map(card => card.getAttribute("data-writing-note-id")))).sort(), replacementNotes.map(note => note.id).sort());
  assert.equal(await page.locator("#writingStrongModelSummary:visible").count(), 0);
  const finished = page.waitForResponse(response => response.url().endsWith("/api/v1/writing/ai-analysis"));
  release();
  const lateResponse = await finished;
  assert.equal(await lateResponse.finished(), null);
  assert.match(JSON.stringify(await lateResponse.json()), /旧材料组建议/);
  // Observe after the response body and UI rendering turn, not just headers.
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await waitFor(async () => assert.equal(await page.locator("#writingStrongModelSummary:visible").count(), 0));
  assert.doesNotMatch(await page.locator("#writingPanel").innerText(), /旧材料组建议/);
  assert.equal(calls, 2);
  assert.deepEqual(await item(stack, `/api/v1/writing-projects/${project.id}`), projectBefore);
  assert.deepEqual(await item(stack, `/api/v1/draft-scaffolds/${project.scaffold_id}`), scaffoldBefore);
  assert.equal((await fetchJson(apiBase, "/api/v1/writing-projects?limit=50")).json.items.length, 1);
  await assertSourcesUnchanged();
}

export async function runCurrentWritingThemeEdit(t) {
  const stack = await stackFor(t); if (!stack) return;
  const { page, apiBase, webBase } = stack, notes = await createWritingSourceFixture(stack);
  const assertSourcesUnchanged = await captureWritingSources(stack, notes), executions = observeExecution(page);
  const title = "可编辑的材料主题", question = "核对材料与边界怎样检验理解？";
  await createManualWritingTheme(stack, notes, { title });
  const themes = (await fetchJson(apiBase, "/api/v1/index-cards?limit=50")).json.items;
  assert.equal(themes.length, 1); const theme = await item(stack, `/api/v1/index-cards/${themes[0].id}`);
  assert.deepEqual(theme.items.map(row => row.note_id).sort(), notes.map(note => note.id).sort());
  await page.locator('[data-writing-sidebar-action="topics"]').click();
  const card = page.locator(`[data-writing-index-card-id="${theme.id}"]`);
  await card.locator('[data-writing-index-action="edit"]').click();
  const dialog = page.getByRole("dialog", { name: "编辑主题", exact: true }); await dialog.waitFor();
  await dialog.getByLabel("想回答的问题").fill("取消的修改不应保存");
  await dialog.getByRole("button", { name: "取消", exact: true }).click(); await dialog.waitFor({ state: "detached" });
  assert.deepEqual(await item(stack, `/api/v1/index-cards/${theme.id}`), theme);
  await card.locator('[data-writing-index-action="edit"]').click(); await dialog.waitFor();
  await dialog.getByLabel("想回答的问题").fill(question);
  await dialog.locator("details > summary").click();
  const thesis = "观点需要具体材料核对，并明确适用条件。", summary = ["观点来自自己的解释。", "材料帮助检验解释中的遗漏。", "适用边界让文章的判断更准确。"];
  await dialog.getByLabel("核心观点").fill(thesis);
  for (const [index, line] of summary.entries()) await dialog.getByLabel(`概括 ${index + 1}`, { exact: true }).fill(line);
  await dialog.getByRole("button", { name: "保存", exact: true }).click(); await dialog.waitFor({ state: "detached" });
  const saved = await item(stack, `/api/v1/index-cards/${theme.id}`);
  assert.equal(saved.central_question, question); assert.equal(saved.thesis, thesis); assert.deepEqual(saved.three_line_summary, summary);
  assert.deepEqual(saved.items, theme.items);
  await page.goto(`${webBase}/prototype`, { waitUntil: "networkidle" }); await page.locator('.rail-btn[data-module="writing"]').click();
  assert.match(await page.locator(`[data-writing-index-card-id="${theme.id}"]`).innerText(), new RegExp(question));
  await chooseTheme(stack, theme.id);
  assert.deepEqual((await fetchJson(apiBase, "/api/v1/writing-projects?limit=50")).json.items, []);
  await page.locator("#btnWritingCreateScaffold").click(); await page.locator("#writingScaffoldPanel:visible").waitFor();
  const project = await findWritingProject(stack, notes, title);
  assert.equal(project.goal, question); assert.deepEqual(project.related_index_ids, [theme.id]);
  assert.equal((await fetchJson(apiBase, "/api/v1/writing-projects?limit=50")).json.items.length, 1);
  await assertSourcesUnchanged(); assert.deepEqual(executions, []);
}

export async function runCurrentColdThemeEntry(t) {
  const stack = await stackFor(t); if (!stack) return;
  const { page, apiBase, webBase } = stack;
  const directory = await createWritingScopeDirectory(stack, "尚未打开的主题材料", "cold-theme-materials");
  const notes = [];
  for (const title of ["冷启动的判断", "冷启动的依据", "冷启动的条件"]) notes.push(await createWritingScopeNote(stack, directory.id, title));
  for (const [index, note] of notes.slice(1).entries()) assert.equal((await postJson(apiBase, `/api/v1/notes/${notes[0].id}/relations`, { toNoteId: note.id, relationType: index ? "qualifies" : "supports", rationale: "材料提供明确的核对依据与条件，应在主题开始写作时加载。" })).status, 201);
  const outside = await createWritingScopeNote(stack, "dir_original_default", "不属于主题的材料");
  const assertSourcesUnchanged = await captureWritingSources(stack, [...notes, outside]), executions = observeExecution(page);
  const theme = await postJson(apiBase, "/api/v1/index-cards", { directoryId: directory.id, title: "尚未打开材料的主题", centralQuestion: "未打开的材料怎样仍能支持主题写作？", noteIds: notes.map(note => note.id) });
  assert.equal(theme.status, 201);
  const reads = [];
  const observedRows = [], probes = [];
  page.on("response", response => {
    if (!response.url().startsWith(apiBase)) return;
    probes.push(response.json().then(json => {
      const visit = value => {
        if (!value || typeof value !== "object") return;
        if (notes.some(note => note.id === value.id)) observedRows.push({ path: new URL(response.url()).pathname, id: value.id, bodyLength: typeof value.body === "string" ? value.body.length : null });
        for (const child of Object.values(value)) if (child && typeof child === "object") visit(child);
      }; visit(json);
    }).catch(() => {}));
  });
  let projected = 0;
  // Project real directory rows to metadata to exercise a genuinely cold cache.
  // Individual note reads and every persistence operation still use the real API.
  await page.route("**/api/v1/directories/*/notes*", async route => {
    const response = await route.fetch(), json = await response.json();
    for (const row of json.items || []) if (notes.some(note => row.id === note.id)) { delete row.body; projected++; }
    await route.fulfill({ response, json });
  });
  page.on("request", request => { const pathname = new URL(request.url()).pathname; if (request.method() === "GET" && notes.some(note => pathname === `/api/v1/notes/${note.id}`)) reads.push(pathname); });
  await page.goto(`${webBase}/prototype`, { waitUntil: "networkidle" });
  await Promise.allSettled(probes);
  assert.ok(projected >= 3);
  // Startup may hydrate immediately after the metadata arrives. Verify the actual
  // metadata-to-body transition rather than requiring hydration to wait for a click.
  assert.deepEqual([...new Set(observedRows.filter(row => row.path.includes("/directories/") && row.bodyLength === null).map(row => row.id))].sort(), notes.map(note => note.id).sort());
  await page.locator('.rail-btn[data-module="writing"]').click();
  await chooseTheme(stack, theme.json.item.id);
  assert.deepEqual([...new Set(reads)].sort(), notes.map(note => `/api/v1/notes/${note.id}`).sort());
  await Promise.allSettled(probes);
  for (const note of notes) assert.ok(observedRows.some(row => row.path === `/api/v1/notes/${note.id}` && row.bodyLength === note.body.length), JSON.stringify(observedRows));
  assert.deepEqual((await fetchJson(apiBase, "/api/v1/writing-projects?limit=50")).json.items, []);
  await page.locator("#btnWritingCreateScaffold").click(); await page.locator("#writingScaffoldPanel:visible").waitFor();
  const project = await findWritingProject(stack, notes, theme.json.item.title);
  const scaffold = await item(stack, `/api/v1/draft-scaffolds/${project.scaffold_id}`);
  for (const id of ["source_files", "source_note_types", "confirmed_distillation", "distillation_quality", "topic_entry"]) assert.equal(scaffold.preflight.checks.find(check => check.id === id).status, "pass", id);
  assert.deepEqual([...new Set(scaffold.sections.flatMap(section => section.evidence_note_ids))].sort(), notes.map(note => note.id).sort());
  assert.equal((await fetchJson(apiBase, "/api/v1/writing-projects?limit=50")).json.items.length, 1);
  await assertSourcesUnchanged(); assert.deepEqual(executions, []);
}
