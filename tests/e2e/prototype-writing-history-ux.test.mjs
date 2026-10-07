import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { createWritingReadyPermanentNote, optionalPlaywright, postJson, patchJson, fetchJson, startPrototypeStack, waitFor } from "./prototype-copy-test-helpers.mjs";

async function historyWorkspace(t, width, options = {}) {
  if (process.env.RUN_BROWSER_E2E !== "1") { t.skip("Set RUN_BROWSER_E2E=1"); return null; }
  const pw = await optionalPlaywright(t);
  if (!pw) return null;
  const h = await startPrototypeStack(t, pw, options);
  if (!h) return null;
  const { page, apiBase, webBase } = h;
  const note = (await createWritingReadyPermanentNote(apiBase, { title: "用反例检查自己的判断", body: "# 用反例检查自己的判断\n\n说明适用条件，避免把一次经验当作普遍规律。",
    thesis: "判断需要经得起反例检验。", threeLineSummary: ["寻找反例", "限定条件", "保留依据"], boundaryOrCounterpoint: "一个反例未必能否定全部判断。" })).json.item;
  const other = (await createWritingReadyPermanentNote(apiBase, { title: "核对判断成立的条件", body: "# 核对判断成立的条件\n\n对照原文与经验，明确判断适用于哪些情境。",
    thesis: "判断的适用条件需要明确。", threeLineSummary: ["核对条件", "限定范围", "继续检验"], boundaryOrCounterpoint: "不同情境可能要求不同方法。" })).json.item;
  const third = (await createWritingReadyPermanentNote(apiBase, { title: "保留判断的依据", body: "# 保留判断的依据\n\n保留来源与推理过程，以便日后重新核对。",
    thesis: "判断应有可追溯的依据。", threeLineSummary: ["保留来源", "保留过程", "重新核对"], boundaryOrCounterpoint: "依据本身也可能需要更新。" })).json.item;
  await page.setViewportSize({ width, height: width === 1366 ? 768 : 844 });
  await page.goto(`${webBase}/prototype`, { waitUntil: "networkidle" });
  await page.locator("#btnToggleSearch").click();
  await page.locator("#globalNoteSearchInput").fill(note.title);
  await page.locator(`[data-search-note="${note.id}"]`).click();
  await page.locator('.rail-btn[data-module="writing"]').click();
  await page.locator('.writing-head-actions [data-writing-related-open]').click();
  await page.locator("#writingCandidateDetails > summary").click();
  await page.locator(`#writingCandidateList [data-writing-action="add"][data-writing-note-id="${note.id}"]`).click();
  await page.locator(`#writingCandidateList [data-writing-action="add"][data-writing-note-id="${other.id}"]`).click();
  await page.locator(`#writingCandidateList [data-writing-action="add"][data-writing-note-id="${third.id}"]`).click();
  await page.locator("#writingRelatedNotesPanel [data-writing-related-close]").click();
  await page.locator("#btnWritingSaveThemeIndex").click();
  for (const value of [`判断的修改与写作${width}`, "如何从反例修正自己的判断？"]) {
    await page.locator("[data-text-input-field]:visible").fill(value);
    await page.locator("[data-text-input-confirm]:visible").click();
  }
  await page.locator("#btnWritingCreateScaffold").click();
  await page.locator("#writingScaffoldPanel:visible").waitFor();
  const project = (await fetchJson(apiBase, "/api/v1/writing-projects?limit=20")).json.items.find(item => item.title === `判断的修改与写作${width}`);
  const original = (await fetchJson(apiBase, `/api/v1/draft-scaffolds/${project.scaffold_id}`)).json.item;
  const first = (await patchJson(apiBase, `/api/v1/draft-scaffolds/${original.id}`, { versionNote: "最初结构" })).json.item;
  const second = (await postJson(apiBase, "/api/v1/draft-scaffolds", { writingProjectId: project.id, versionNote: "调整后的结构" })).json.item;
  const current = (await patchJson(apiBase, `/api/v1/draft-scaffolds/${second.id}`, { sections: second.sections.map((section, index) => index ? section : { ...section, heading: "当前提纲：先限定条件" }) })).json.item;
  const directory = path.resolve(`output/playwright/core-writing-history/${width}`);
  await fs.mkdir(directory, { recursive: true });
  const exportPath = await fs.mkdtemp(path.join(os.tmpdir(), "yansilu-history-export-"));
  t.after(() => fs.rm(exportPath, { recursive: true, force: true }));
  const reopen = async () => {
    await page.reload({ waitUntil: "networkidle" });
    await page.locator('.rail-btn[data-module="writing"]').click();
    await page.locator("#writingThemeIndexList [data-writing-index-card-id]", { hasText: project.title }).getByRole("button", { name: "继续提纲", exact: true }).click();
    await page.locator('.rail-btn[data-module="writing"]').click();
    await page.locator('.writing-outline-heading:visible').first().waitFor();
  };
  await reopen();
  return { ...h, note, first, current, project, directory, exportPath, reopen };
}

for (const width of [1366, 320]) {
  test(`real outline history is accessible and restoration persists without modifying older versions (${width}px)`, async t => {
    const h = await historyWorkspace(t, width, width === 320 ? { beforeNavigate: page => page.addInitScript(() => {
      Object.defineProperty(window.crypto, "randomUUID", { value: undefined });
    }) } : {});
    if (!h) return;
    const { page, apiBase, first, current, project, directory, reopen } = h;
    if (width === 320) assert.equal(await page.evaluate(() => typeof window.crypto.randomUUID), "undefined");
    await page.locator('#writingMoreMenu > summary').click();
    assert.equal(await page.getByRole("button", { name: "提纲历史", exact: true }).count(), 1, "History must have an actual accessible entry, not a hidden workbench");
    await page.getByRole("button", { name: "提纲历史", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "提纲历史", exact: true });
    await dialog.waitFor();
    await page.getByLabel("选择提纲版本").selectOption(first.id);
    await waitFor(async () => assert.match(await page.locator("#writingHistoryPreview").innerText(), new RegExp(first.sections[0].heading)));
    await page.screenshot({ path: path.join(directory, "history-preview.png"), fullPage: true });
    assert.equal(await dialog.evaluate(el => el.scrollWidth <= el.clientWidth + 1), true);
    const previous = (await fetchJson(apiBase, `/api/v1/writing-projects/${project.id}`)).json.item;
    page.once("dialog", d => d.dismiss());
    await dialog.getByRole("button", { name: "恢复此提纲", exact: true }).click();
    assert.equal((await fetchJson(apiBase, `/api/v1/writing-projects/${project.id}`)).json.item.scaffold_id, current.id);
    page.once("dialog", d => d.accept());
    await dialog.getByRole("button", { name: "恢复此提纲", exact: true }).click();
    await waitFor(async () => assert.equal(await dialog.isVisible(), false));
    const restoredProject = (await fetchJson(apiBase, `/api/v1/writing-projects/${project.id}`)).json.item;
    assert.notEqual(restoredProject.scaffold_id, first.id);
    assert.notEqual(restoredProject.scaffold_id, current.id);
    assert.equal(restoredProject.draft_note_id, previous.draft_note_id);
    const restored = (await fetchJson(apiBase, `/api/v1/draft-scaffolds/${restoredProject.scaffold_id}`)).json.item;
    assert.deepEqual(restored.sections, first.sections);
    assert.deepEqual(restored.open_questions, first.open_questions);
    assert.deepEqual((await fetchJson(apiBase, `/api/v1/draft-scaffolds/${first.id}`)).json.item, first);
    assert.deepEqual((await fetchJson(apiBase, `/api/v1/draft-scaffolds/${current.id}`)).json.item, current);
    await reopen();
    assert.equal(await page.locator('.writing-outline-heading').first().inputValue(), first.sections[0].heading);
    await page.locator('#writingMoreMenu > summary').click();
    const downloadWait = page.waitForEvent("download");
    await page.locator("#btnWritingExportScaffold").click();
    const download = await downloadWait;
    const exportedPath = path.join(h.exportPath, download.suggestedFilename());
    await download.saveAs(exportedPath);
    const markdown = await fs.readFile(exportedPath, "utf8");
    assert.ok(markdown.includes(first.sections[0].heading));
    assert.ok(!markdown.includes(current.sections[0].heading));
    assert.ok(markdown.includes(`[[${h.note.title}]]`));
    const edited = `${first.sections[0].heading}：恢复后继续修改`;
    await page.locator('.writing-outline-heading').first().fill(edited);
    await page.locator('.writing-outline-heading').first().press("Tab");
    await waitFor(async () => assert.equal((await fetchJson(apiBase, `/api/v1/draft-scaffolds/${restored.id}`)).json.item.sections[0].heading, edited));
    assert.deepEqual((await fetchJson(apiBase, `/api/v1/draft-scaffolds/${first.id}`)).json.item.sections, first.sections);
  });
}

for (const scenario of ["read-failure", "write-failure", "lost-response", "unconfirmed-response", "external-conflict"]) {
  test(`outline history preserves current input and saved data on ${scenario}`, async t => {
    const h = await historyWorkspace(t, 320);
    if (!h) return;
    const { page, apiBase, project, first, current } = h;
    const endpoint = `/api/v1/writing-projects/${project.id}/scaffold-restore`;
    const readPattern = `**/api/v1/draft-scaffolds/${first.id}`;
    let count = 0, restorationIds = [];
    if (scenario === "read-failure") await page.route(readPattern, route => route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: { message: "历史提纲暂时无法读取" } }) }));
    await page.locator('#writingMoreMenu > summary').click();
    await page.getByRole("button", { name: "提纲历史", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "提纲历史", exact: true });
    await page.getByLabel("选择提纲版本").selectOption(first.id);
    if (scenario === "read-failure") {
      await waitFor(async () => assert.match(await page.locator("#writingHistoryStatus").innerText(), /暂时无法读取/));
      assert.equal(await dialog.getByRole("button", { name: "恢复此提纲", exact: true }).isDisabled(), true);
      await page.unroute(readPattern);
      await dialog.getByRole("button", { name: "重新载入", exact: true }).click();
      await page.getByLabel("选择提纲版本").selectOption(first.id);
    }
    await waitFor(async () => assert.equal(await dialog.getByRole("button", { name: "恢复此提纲", exact: true }).isEnabled(), true));
    if (scenario === "external-conflict") {
      assert.equal((await patchJson(apiBase, `/api/v1/draft-scaffolds/${current.id}`, { sections: current.sections.map((s, i) => i ? s : { ...s, heading: "来自另一窗口的新提纲" }) })).status, 200);
    } else if (scenario !== "read-failure") {
      await page.route(`**${endpoint}`, async route => {
        count++; restorationIds.push(route.request().postDataJSON().restorationId);
        if (count > 1) return route.continue();
        if (scenario === "lost-response" || scenario === "unconfirmed-response") {
          const response = await route.fetch();
          assert.equal(response.status(), 201);
        }
        return route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: { message: "恢复结果暂时无法确认，请重试" } }) });
      });
      if (scenario === "unconfirmed-response") await page.route("**/api/v1/draft-scaffolds/*", route => {
        const id = route.request().url().split("/").at(-1);
        return restorationIds.includes(id) ? route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: { message: "结果读取暂时不可用" } }) }) : route.continue();
      });
    }
    page.once("dialog", d => d.accept());
    await dialog.getByRole("button", { name: "恢复此提纲", exact: true }).click();
    if (scenario === "read-failure" || scenario === "lost-response") {
      await waitFor(async () => assert.equal(await dialog.isVisible(), false));
      if (scenario === "lost-response") {
        assert.equal(count, 1, "Actual saved result is read back without repeating the POST");
        assert.equal((await fetchJson(apiBase, `/api/v1/writing-projects/${project.id}`)).json.item.scaffold_id, restorationIds[0]);
        assert.equal(await page.locator('.writing-outline-heading').first().inputValue(), first.sections[0].heading);
      }
    }
    else {
      await waitFor(async () => assert.match(await page.locator("#writingHistoryStatus").innerText(), scenario === "external-conflict" ? /其他地方修改/ : /暂时无法确认/));
      assert.equal(await page.locator('.writing-outline-heading').first().inputValue(), current.sections[0].heading);
      const saved = (await fetchJson(apiBase, `/api/v1/writing-projects/${project.id}`)).json.item;
      assert.equal(saved.scaffold_id === current.id, scenario !== "unconfirmed-response");
      assert.equal((await fetchJson(apiBase, `/api/v1/writing-projects/${project.id}/scaffolds?limit=50`)).json.items.length, scenario === "unconfirmed-response" ? 3 : 2);
      if (scenario !== "external-conflict") {
        page.once("dialog", d => d.accept());
        await dialog.getByRole("button", { name: "恢复此提纲", exact: true }).click();
        await waitFor(async () => assert.equal(await dialog.isVisible(), false));
        assert.equal(restorationIds[0], restorationIds[1], "Lost-response retries use the same restoration identity");
        assert.equal((await fetchJson(apiBase, `/api/v1/writing-projects/${project.id}/scaffolds?limit=50`)).json.items.length, 3);
      } else {
        await page.keyboard.press("Escape");
        assert.equal(await dialog.count(), 0);
        await h.reopen();
        assert.equal(await page.locator('.writing-outline-heading').first().inputValue(), "来自另一窗口的新提纲");
      }
    }
    assert.deepEqual((await fetchJson(apiBase, `/api/v1/draft-scaffolds/${first.id}`)).json.item, first);
  });
}

test("history preview isolates late reads, exports the selected version without switching, and supports keyboard dismissal", async t => {
  const h = await historyWorkspace(t, 1366);
  if (!h) return;
  const { page, apiBase, project, first, current } = h;
  let release, started;
  const held = new Promise(resolve => { release = resolve; });
  const ready = new Promise(resolve => { started = resolve; });
  const pattern = `**/api/v1/draft-scaffolds/${first.id}`;
  await page.route(pattern, async route => { const response = await route.fetch(); started(); await held; await route.fulfill({ response }); });
  t.after(() => release());
  await page.locator('#writingMoreMenu > summary').click();
  await page.getByRole("button", { name: "提纲历史", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "提纲历史", exact: true });
  await page.getByLabel("选择提纲版本").selectOption(first.id);
  await ready;
  await page.getByLabel("选择提纲版本").selectOption(current.id);
  await waitFor(async () => assert.ok((await page.locator("#writingHistoryPreview").innerText()).includes(current.sections[0].heading)));
  release();
  await page.unroute(pattern, { behavior: "wait" });
  assert.ok((await page.locator("#writingHistoryPreview").innerText()).includes(current.sections[0].heading));
  await page.getByLabel("选择提纲版本").selectOption(first.id);
  await waitFor(async () => assert.equal(await dialog.getByRole("button", { name: "导出 .md", exact: true }).isEnabled(), true));
  const downloadWait = page.waitForEvent("download");
  await dialog.getByRole("button", { name: "导出 .md", exact: true }).click();
  const download = await downloadWait;
  const file = path.join(h.exportPath, download.suggestedFilename());
  await download.saveAs(file);
  assert.ok((await fs.readFile(file, "utf8")).includes(first.sections[0].heading));
  assert.equal((await fetchJson(apiBase, `/api/v1/writing-projects/${project.id}`)).json.item.scaffold_id, current.id);
  assert.equal(await page.locator('.writing-outline-heading').first().inputValue(), current.sections[0].heading);
  await page.keyboard.press("Control+Shift+f");
  assert.equal(await page.locator("#noteSearchDialog").isVisible(), false);
  for (let i = 0; i < 9; i++) {
    await page.keyboard.press("Tab");
    assert.equal(await dialog.evaluate(el => el.contains(document.activeElement)), true);
  }
  await page.keyboard.press("Escape");
  assert.equal(await dialog.count(), 0);
  assert.equal(await page.locator('#writingMoreMenu > summary').evaluate(el => el === document.activeElement), true);
});

test("older than fifty saved outlines remains reachable and can be restored through the actual history UI", async t => {
  const h = await historyWorkspace(t, 320);
  if (!h) return;
  const { page, apiBase, project, first } = h;
  for (let i = 0; i < 51; i++) assert.equal((await postJson(apiBase, "/api/v1/draft-scaffolds", { writingProjectId: project.id, versionNote: `后续提纲 ${i + 1}` })).status, 201);
  await h.reopen();
  await page.locator('#writingMoreMenu > summary').click();
  await page.getByRole("button", { name: "提纲历史", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "提纲历史", exact: true });
  await waitFor(async () => assert.equal(await dialog.getByRole("button", { name: "更早", exact: true }).isEnabled(), true));
  assert.equal(await page.getByLabel("选择提纲版本").locator(`option[value="${first.id}"]`).count(), 0);
  await dialog.getByRole("button", { name: "更早", exact: true }).click();
  await waitFor(async () => assert.equal(await page.getByLabel("选择提纲版本").locator(`option[value="${first.id}"]`).count(), 1));
  await page.getByLabel("选择提纲版本").selectOption(first.id);
  await waitFor(async () => assert.equal(await dialog.getByRole("button", { name: "恢复此提纲", exact: true }).isEnabled(), true));
  await page.screenshot({ path: path.join(h.directory, "history-older-page.png"), fullPage: true });
  assert.equal(await dialog.evaluate(el => el.scrollWidth <= el.clientWidth + 1), true);
  page.once("dialog", d => d.accept());
  await dialog.getByRole("button", { name: "恢复此提纲", exact: true }).click();
  await waitFor(async () => assert.equal(await dialog.isVisible(), false));
  const current = (await fetchJson(apiBase, `/api/v1/writing-projects/${project.id}`)).json.item;
  assert.deepEqual((await fetchJson(apiBase, `/api/v1/draft-scaffolds/${current.scaffold_id}`)).json.item.sections, first.sections);
  const newest = (await fetchJson(apiBase, `/api/v1/writing-projects/${project.id}/scaffolds?limit=50`)).json.items;
  const older = (await fetchJson(apiBase, `/api/v1/writing-projects/${project.id}/scaffolds?limit=50&offset=50`)).json.items;
  assert.equal(new Set([...newest, ...older].map(item => item.id)).size, 54);
  assert.equal(older.some(item => item.id === first.id), true);
});

test("late editor autosave cannot change the older version after another window restores history", async t => {
  const h = await historyWorkspace(t, 1366);
  if (!h) return;
  const { page, apiBase, project, first, current } = h;
  const savedProject = (await fetchJson(apiBase, `/api/v1/writing-projects/${project.id}`)).json.item;
  const restored = await postJson(apiBase, `/api/v1/writing-projects/${project.id}/scaffold-restore`, {
    sourceScaffoldId: first.id, expectedScaffoldId: current.id, expectedScaffoldUpdatedAt: current.updated_at,
    expectedProjectUpdatedAt: savedProject.updated_at, expectedSourceUpdatedAt: first.updated_at, expectedVaultPath: h.vaultPath
  });
  assert.equal(restored.status, 201, JSON.stringify(restored.json));
  const input = "本机尚未保存的改动应保留，不能改写历史版本";
  await page.locator('.writing-outline-heading').first().fill(input);
  await page.locator('.writing-outline-heading').first().press("Tab");
  await waitFor(async () => assert.match(await page.locator("#statusText").innerText(), /当前提纲已切换.*未覆盖历史版本/));
  assert.equal(await page.locator('.writing-outline-heading').first().inputValue(), input);
  assert.deepEqual((await fetchJson(apiBase, `/api/v1/draft-scaffolds/${current.id}`)).json.item, current);
  assert.deepEqual((await fetchJson(apiBase, `/api/v1/draft-scaffolds/${restored.json.item.id}`)).json.item.sections, first.sections);
  await h.reopen();
  assert.equal(await page.locator('.writing-outline-heading').first().inputValue(), first.sections[0].heading);
});

test("historical evidence remains traceable in preview export, restoration and refresh after the project changes material", async t => {
  const h = await historyWorkspace(t, 320);
  if (!h) return;
  const { page, apiBase, project, first, note } = h;
  const before = await fs.readFile(path.join(h.vaultPath, note.markdownPath), "utf8");
  const savedProject = (await fetchJson(apiBase, `/api/v1/writing-projects/${project.id}`)).json.item;
  const kept = savedProject.basket_note_ids.filter(id => id !== note.id);
  assert.equal((await patchJson(apiBase, `/api/v1/writing-projects/${project.id}`, { basketNoteIds: kept })).status, 200);
  assert.equal((await postJson(apiBase, "/api/v1/draft-scaffolds", { writingProjectId: project.id })).status, 201);
  await h.reopen();
  await page.locator('#writingMoreMenu > summary').click();
  await page.getByRole("button", { name: "提纲历史", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "提纲历史", exact: true });
  await page.getByLabel("选择提纲版本").selectOption(first.id);
  await waitFor(async () => assert.equal(await dialog.getByRole("button", { name: "导出 .md", exact: true }).isEnabled(), true));
  const exportAndRead = async button => {
    const waiting = page.waitForEvent("download");
    await button.click();
    const download = await waiting, file = path.join(h.exportPath, download.suggestedFilename());
    await download.saveAs(file);
    return fs.readFile(file, "utf8");
  };
  assert.ok((await exportAndRead(dialog.getByRole("button", { name: "导出 .md", exact: true }))).includes(`[[${note.title}]]`), "A real historical source must not disappear merely because the current material changed");
  page.once("dialog", d => d.accept());
  await dialog.getByRole("button", { name: "恢复此提纲", exact: true }).click();
  await waitFor(async () => assert.equal(await dialog.isVisible(), false));
  await h.reopen();
  const restoredProject = (await fetchJson(apiBase, `/api/v1/writing-projects/${project.id}`)).json.item;
  assert.deepEqual(restoredProject.basket_note_ids, kept, "History restoration must not silently change current topic membership");
  assert.deepEqual((await fetchJson(apiBase, `/api/v1/draft-scaffolds/${restoredProject.scaffold_id}`)).json.item.sections, first.sections);
  await page.locator('#writingMoreMenu > summary').click();
  assert.ok((await exportAndRead(page.locator("#btnWritingExportScaffold"))).includes(`[[${note.title}]]`));
  assert.equal(await fs.readFile(path.join(h.vaultPath, note.markdownPath), "utf8"), before);
});
