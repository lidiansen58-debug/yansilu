import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { optionalPlaywright, startPrototypeStack, fetchJson, selectWritingChapter } from "./prototype-copy-test-helpers.mjs";
import { initVault, createNoteInDirectory } from "../../packages/domain/src/index.mjs";
import { createIndexCard } from "../../packages/domain/src/index-card-store.mjs";
import { createWritingProject } from "../../packages/writing-engine/src/writing-engine.mjs";

const deferred = () => { let resolve; const promise = new Promise(yes => { resolve = yes; }); return { promise, resolve }; };

for (const leave of [false, true]) for (const order of ["before vault readiness", "after vault readiness"]) test(`${leave ? "leaving writing cancels its startup entry" : "writing entered during startup loads the existing theme and article"} when project reads finish ${order}`, { timeout: 45000 }, async t => {
  if (process.env.RUN_BROWSER_E2E !== "1") { t.skip("Set RUN_BROWSER_E2E=1"); return; }
  const pw = await optionalPlaywright(t);
  if (!pw) return;
  const vaultGate = deferred(), projectGate = deferred(), vaultRead = deferred(), projectRead = deferred();
  t.after(() => { vaultGate.resolve(); projectGate.resolve(); });
  let source, draft, theme, project;
  const timeline = [];
  const start = Date.now();
  const stack = await startPrototypeStack(t, pw, {
    navigateWaitUntil: "domcontentloaded",
    prepareVault: async vault => {
      await initVault(vault);
      source = await createNoteInDirectory(vault, { directoryId: "dir_original_default", title: "来源", body: "# 来源\n\n解释有助于检查理解。", thesis: "解释能暴露理解空缺。" });
      draft = await createNoteInDirectory(vault, { directoryId: "dir_original_default", title: "第一章", body: "# 第一章\n\n保留已有文章内容。" });
      theme = await createIndexCard(vault, { directoryId: "dir_original_default", indexType: "topic", title: "检查理解", centralQuestion: "怎样检查理解？", items: [{ noteId: source.id, rationale: "支持这个问题", shortLabel: "来源" }] });
      project = await createWritingProject(vault, { title: theme.title, basketNoteIds: [source.id], relatedIndexIds: [theme.id],
        bookStructure: { schema_version: 1, parts: [{ id: "part", title: "正文", chapters: [{ id: "first", title: "第一章", draft_note_id: draft.id, evidence_note_ids: [source.id] }] }] } });
    },
    beforeNavigate: async page => {
      page.on("response", response => { const pathname = new URL(response.url()).pathname; if (pathname.startsWith("/api/")) timeline.push({ pathname, status: response.status(), ms: Date.now() - start }); });
      let heldVault = false;
      await page.route("**/api/v1/vault*", async route => {
        if (heldVault || new URL(route.request().url()).pathname !== "/api/v1/vault") return route.continue();
        heldVault = true;
        const response = await route.fetch(); assert.equal(response.status(), 200);
        vaultRead.resolve(); await vaultGate.promise; await route.fulfill({ response });
      });
      await page.route("**/api/v1/writing-projects*", async route => {
        if (new URL(route.request().url()).pathname !== "/api/v1/writing-projects" || route.request().method() !== "GET") return route.continue();
        const response = await route.fetch(); assert.equal(response.status(), 200);
        projectRead.resolve();
        if (order === "after vault readiness") await projectGate.promise;
        await route.fulfill({ response });
      });
    }
  });
  if (!stack) return;
  const { page, apiBase, vaultPath } = stack;
  const itemPath = `/api/v1/index-cards/${theme.id}`;
  const beforeTheme = (await fetchJson(apiBase, itemPath)).json.item;
  const beforeProjects = (await fetchJson(apiBase, "/api/v1/writing-projects?limit=20")).json.items;
  const beforeFiles = await Promise.all([source, draft].map(note => fs.readFile(path.join(vaultPath, note.markdownPath))));
  await vaultRead.promise;
  await page.waitForFunction(() => window.__prototypeEditor?.activeNote);
  await page.locator('.rail-btn[data-module="writing"]').click();
  // Give an already-started entry a chance to issue its reads while startup is held.
  await Promise.race([projectRead.promise, new Promise(resolve => setTimeout(resolve, 1000))]);
  if (leave) await page.locator('.rail-btn[data-module="today"]').click();
  const directoriesReady = page.waitForResponse(response => new URL(response.url()).pathname === "/api/v1/directories" && response.status() === 200);
  vaultGate.resolve(); await directoriesReady;
  projectGate.resolve();
  await page.waitForLoadState("networkidle");
  if (leave) {
    assert.equal(await page.locator('.rail-btn[data-module="today"]').evaluate(el => el.classList.contains("active")), true);
    assert.equal(timeline.filter(item => item.pathname === "/api/v1/writing-projects").length, 0);
    assert.deepEqual((await fetchJson(apiBase, itemPath)).json.item, beforeTheme);
    assert.deepEqual((await fetchJson(apiBase, "/api/v1/writing-projects?limit=20")).json.items, beforeProjects);
    for (const [i, note] of [source, draft].entries()) assert.deepEqual(await fs.readFile(path.join(vaultPath, note.markdownPath)), beforeFiles[i]);
    return;
  }
  const resume = page.locator(`[data-writing-index-card-id="${theme.id}"] button[data-writing-project-id="${project.id}"]`);
  try { await resume.waitFor({ state: "visible", timeout: 6000 }); }
  catch (error) {
    const dom = await page.evaluate(() => ({ module: document.querySelector('.rail-btn.active')?.dataset.module,
      shell: { ...document.querySelector('#writingPanel .writing-shell')?.dataset },
      topics: document.querySelector('#writingThemeIndexList')?.innerHTML,
      hint: document.querySelector('#writingThemeIndexesHint')?.textContent,
      projects: document.querySelector('#writingProjectsList')?.innerHTML }));
    await fs.mkdir("output/release-preflight-20261010/writing-startup", { recursive: true });
    const name = order.startsWith("before") ? "early" : "late";
    await fs.writeFile(`output/release-preflight-20261010/writing-startup/${name}-failure.json`, JSON.stringify({ dom, timeline }, null, 2), "utf8");
    await page.screenshot({ path: `output/release-preflight-20261010/writing-startup/${name}-failure.png` });
    t.diagnostic(JSON.stringify({ dom, timeline }));
    throw error;
  }
  assert.deepEqual((await fetchJson(apiBase, itemPath)).json.item, beforeTheme);
  assert.deepEqual((await fetchJson(apiBase, "/api/v1/writing-projects?limit=20")).json.items, beforeProjects);
  await resume.click();
  await page.locator('[data-writing-tab="draft"]').click();
  await selectWritingChapter(page, "first");
  await page.waitForFunction(() => document.querySelector("#writingDraftEditor")?.value.includes("保留已有文章内容"));
  for (const [i, note] of [source, draft].entries()) assert.deepEqual(await fs.readFile(path.join(vaultPath, note.markdownPath)), beforeFiles[i]);
});
