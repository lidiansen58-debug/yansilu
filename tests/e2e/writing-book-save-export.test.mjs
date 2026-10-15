import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import net from "node:net";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { fileURLToPath } from "node:url";
import { initVault, createNoteInDirectory } from "../../packages/domain/src/index.mjs";
import { createIndexCard } from "../../packages/domain/src/index-card-store.mjs";
import { createWritingProject } from "../../packages/writing-engine/src/writing-engine.mjs";
import { useWritingMarkdown, selectWritingChapter } from "./prototype-copy-test-helpers.mjs";

const repoRoot = fileURLToPath(new URL("../../", import.meta.url));

async function freePort() {
  const server = net.createServer();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const port = server.address().port;
  await new Promise(resolve => server.close(resolve));
  return port;
}

async function waitHealthy(base) {
  for (let attempt = 0; attempt < 100; attempt++) {
    try { if ((await fetch(`${base}/health`)).ok) return; } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error(`Service not ready: ${base}`);
}

function start(script, env) {
  const child = spawn(process.execPath, [script], { cwd: repoRoot, env: { ...process.env, ...env }, stdio: ["ignore", "pipe", "pipe"] });
  child.stdout.on("data", () => {});
  child.stderr.on("data", () => {});
  return child;
}

async function stop(child) {
  if (child.exitCode !== null) return;
  const exited = once(child, "exit");
  child.kill();
  await exited;
}

test("browser saves new chapters once and exports the complete book in directory order", { timeout: 90000 }, async t => {
  if (process.env.RUN_BROWSER_E2E !== "1") { t.skip("Set RUN_BROWSER_E2E=1 for browser acceptance."); return; }
  const { chromium } = await import("playwright");
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "yansilu-chapter-browser-"));
  const vaultPath = path.join(root, "vault"), targetPath = path.join(root, "export");
  await initVault(vaultPath);
  const source = await createNoteInDirectory(vaultPath, { directoryId: "dir_original_default", title: "Book source", body: "# Book source\n\nSource evidence.\n" });
  const index = await createIndexCard(vaultPath, { directoryId: "dir_original_default", indexType: "topic", title: "Chapter acceptance", centralQuestion: "Can saved chapters form a complete book?", items: [{ noteId: source.id, shortLabel: "Source", rationale: "Test evidence" }] });
  const project = await createWritingProject(vaultPath, { title: "Chapter acceptance", basketNoteIds: [source.id], relatedIndexIds: [index.id], bookStructure: { schema_version: 1, parts: [{ id: "part", title: "Part", chapters: [
    { id: "second", title: "Second", evidence_note_ids: [source.id] },
    { id: "first", title: "First", evidence_note_ids: [source.id] }
  ] }] } });
  const sourceBefore = await fs.readFile(path.join(vaultPath, source.markdownPath));
  const apiPort = await freePort(), webPort = await freePort();
  const apiBase = `http://127.0.0.1:${apiPort}`, webBase = `http://127.0.0.1:${webPort}`;
  const api = start("apps/api/src/server.mjs", { API_PORT: String(apiPort), VAULT_PATH: vaultPath, YANSILU_LOCAL_APP_PORTS: String(webPort) });
  const web = start("apps/web/src/dev-server.mjs", { WEB_PORT: String(webPort), API_BASE: apiBase });
  let browser;
  t.after(async () => {
    if (browser) {
      for (const context of browser.contexts()) for (const page of context.pages()) {
        await page.screenshot({ path: path.join(root, "acceptance.png"), fullPage: true }).catch(() => {});
      }
      await browser.close();
    }
    await stop(web);
    await stop(api);
  });
  await waitHealthy(apiBase);
  await waitHealthy(webBase);
  try { browser = await chromium.launch({ headless: true }); }
  catch { browser = await chromium.launch({ channel: "chrome", headless: true }); }
  const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto(`${webBase}/prototype`, { waitUntil: "networkidle" });
  await page.locator('.rail-btn[data-module="writing"]').click();
  await page.locator(`#writingProjectsList [data-writing-project-id="${project.id}"]`).first().waitFor({ state: "attached" });
  await page.locator(`[data-writing-index-card-id="${index.id}"] button.primary`).click();
  await page.waitForFunction(() => Boolean(document.querySelector('#writingDraftTarget option[value="first"]')));
  await page.locator('[data-writing-tab="draft"]').click();
  const bodies = { first: "# First\n\nBROWSER-CHAPTER-FIRST\n\n", second: "# Second\n\nBROWSER-CHAPTER-SECOND\n" };
  for (const id of ["first", "second"]) {
    await selectWritingChapter(page, id);
    await page.waitForFunction(id => document.querySelector("#writingDraftTarget")?.value === id && document.querySelector("#writingDraftEditor")?.value.includes(id === "first" ? "First" : "Second"), id);
    await useWritingMarkdown(page);
    await page.locator("#writingDraftEditor").fill(bodies[id]);
    await page.locator("#btnWritingSaveDraft").click();
    await page.waitForFunction(() => document.querySelector("#writingDraftSaveFeedback")?.textContent === "已保存");
    const status = await page.locator("#statusText").textContent();
    assert.doesNotMatch(status, /尚未保存|保存失败/);
    assert.match(await page.locator("#writingDraftEditor").inputValue(), new RegExp(`BROWSER-CHAPTER-${id.toUpperCase()}`));
  }
  assert.equal(await page.locator("#writingMoreMenu").isVisible(), true);
  await page.locator("#writingMoreMenu summary").click();
  const [response] = await Promise.all([
    page.waitForResponse(response => response.url().includes("/api/v1/exports/book") && response.request().method() === "POST"),
    (async () => {
      await page.locator("#btnWritingExportBook").click();
      const dialog = page.locator('.text-input-modal:not(.hidden)');
      await dialog.locator("[data-text-input-field]").fill(targetPath);
      await dialog.locator("[data-text-input-confirm]").click();
    })()
  ]);
  assert.equal(response.status(), 200, await response.text());
  const exported = await response.json();
  assert.equal(exported.status, "completed");
  assert.equal(exported.chapterCount, 2);
  const markdown = await fs.readFile(exported.bookPath, "utf8");
  assert.ok(markdown.indexOf("BROWSER-CHAPTER-SECOND") < markdown.indexOf("BROWSER-CHAPTER-FIRST"));
  assert.equal(markdown.split("BROWSER-CHAPTER-FIRST").length, 2);
  assert.equal(markdown.split("BROWSER-CHAPTER-SECOND").length, 2);
  const savedProject = await (await fetch(`${apiBase}/api/v1/writing-projects/${project.id}`)).json();
  const bound = savedProject.item.book_structure.parts[0].chapters;
  assert.equal(new Set(bound.map(chapter => chapter.draft_note_id)).size, 2);
  assert.ok(bound.every(chapter => chapter.draft_note_id));
  assert.deepEqual(bound.map(chapter => chapter.id), ["second", "first"]);
  await page.reload({ waitUntil: "networkidle" });
  await page.locator('.rail-btn[data-module="writing"]').click();
  await page.locator(`#writingProjectsList [data-writing-project-id="${project.id}"]`).first().waitFor({ state: "attached" });
  await page.locator(`[data-writing-index-card-id="${index.id}"] button.primary`).click();
  await page.waitForFunction(() => Boolean(document.querySelector('#writingDraftTarget option[value="first"]')));
  await page.locator('[data-writing-tab="draft"]').click();
  for (const chapter of bound) {
    const saved = await (await fetch(`${apiBase}/api/v1/notes/${chapter.draft_note_id}`)).json();
    await selectWritingChapter(page, chapter.id);
    await page.waitForFunction(title => document.querySelector("#writingDraftEditor")?.value.includes(title), chapter.title);
    assert.equal(await page.locator("#writingDraftEditor").inputValue(), saved.item.body.replace(/\r\n/g, "\n"));
  }
  assert.deepEqual(await fs.readFile(path.join(vaultPath, source.markdownPath)), sourceBefore);
  assert.deepEqual(errors, []);
  t.diagnostic(`Isolated acceptance files: ${root}`);
});
