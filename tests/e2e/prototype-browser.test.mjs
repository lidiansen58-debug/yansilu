import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import fs from "node:fs/promises";
import os from "node:os";
import net from "node:net";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..", "..");

async function makeTempDir(prefix) {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

async function findFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.on("error", reject);
    server.listen(0, () => {
      const address = server.address();
      const port = typeof address === "object" ? address.port : 0;
      server.close(() => resolve(port));
    });
  });
}

async function waitForJsonHealth(url) {
  const deadline = Date.now() + 5000;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url);
      if (res.ok) return await res.json();
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 80));
  }
  throw new Error(`Service did not become healthy: ${url}`);
}

async function waitFor(assertFn, timeoutMs = 6000, intervalMs = 120) {
  const deadline = Date.now() + timeoutMs;
  let lastError = null;
  while (Date.now() < deadline) {
    try {
      return await assertFn();
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  throw lastError || new Error("waitFor timeout");
}

async function fetchJson(baseUrl, pathname) {
  const res = await fetch(`${baseUrl}${pathname}`);
  const json = await res.json();
  return { status: res.status, json };
}

async function optionalPlaywright(t) {
  try {
    return await import("playwright");
  } catch {
    t.skip("Playwright is not installed; run npm install -D playwright and playwright install chromium to enable browser e2e.");
    return null;
  }
}

async function startPrototypeStack(t, playwright) {
  const vaultPath = await makeTempDir("yansilu-browser-e2e-vault-");
  const apiPort = await findFreePort();
  const webPort = await findFreePort();
  const apiBase = `http://127.0.0.1:${apiPort}`;
  const webBase = `http://127.0.0.1:${webPort}`;

  const api = spawn(process.execPath, ["apps/api/src/server.mjs"], {
    cwd: REPO_ROOT,
    env: {
      ...process.env,
      API_PORT: String(apiPort),
      VAULT_PATH: vaultPath
    },
    stdio: ["ignore", "pipe", "pipe"]
  });

  const web = spawn(process.execPath, ["apps/web/src/dev-server.mjs"], {
    cwd: REPO_ROOT,
    env: {
      ...process.env,
      WEB_PORT: String(webPort),
      API_BASE: apiBase
    },
    stdio: ["ignore", "pipe", "pipe"]
  });

  t.after(() => {
    api.kill();
    web.kill();
  });

  await waitForJsonHealth(`${apiBase}/health`);
  await waitForJsonHealth(`${webBase}/health`);

  let browser;
  try {
    browser = await playwright.chromium.launch({ headless: true });
  } catch (error) {
    t.skip(`Chromium is not installed for Playwright: ${String(error?.message || error)}`);
    return null;
  }

  t.after(async () => {
    if (browser) await browser.close();
  });

  const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
  await page.goto(`${webBase}/prototype`, { waitUntil: "networkidle" });

  return { apiBase, webBase, vaultPath, browser, page };
}

async function createAndSaveNoteViaEditor(page, markdown) {
  await page.locator("#btnNewNote").click();
  await page.waitForFunction(() => {
    const text = document.querySelector("#statusText")?.textContent || "";
    return text.includes("已在当前目录创建 Markdown 文件");
  });
  await page.waitForFunction(() => {
    const body = document.querySelector("#editorBody");
    return Boolean(body && typeof body.value === "string" && body.value.length > 0);
  });

  await page.locator("#editorBody").click();
  await page.keyboard.press(process.platform === "darwin" ? "Meta+A" : "Control+A");
  await page.keyboard.type(markdown);
  await page.waitForFunction((expected) => document.querySelector("#editorBody")?.value?.includes(expected), markdown.split("\n")[0]);
  const editorValueBeforeSave = await page.locator("#editorBody").inputValue();
  await page.locator("#btnSave").click();
  await page.waitForFunction(() => {
    const text = document.querySelector("#statusText")?.textContent || "";
    return text.includes("已保存 Markdown（已落盘）");
  });
  return editorValueBeforeSave;
}

test("prototype browser flow creates, edits, and persists a markdown note", async (t) => {
  if (process.env.RUN_BROWSER_E2E !== "1") {
    t.skip("Set RUN_BROWSER_E2E=1 to enable browser e2e in local runs.");
    return;
  }

  const playwright = await optionalPlaywright(t);
  if (!playwright) return;

  const stack = await startPrototypeStack(t, playwright);
  if (!stack) return;
  const { apiBase, page } = stack;

  const noteUpdatePayloads = [];
  page.on("request", (request) => {
    if (request.method() !== "PUT") return;
    if (!request.url().includes("/api/v1/notes/")) return;
    const raw = request.postData();
    if (!raw) return;
    try {
      noteUpdatePayloads.push(JSON.parse(raw));
    } catch {}
  });

  const editorValueBeforeSave = await createAndSaveNoteViaEditor(
    page,
    "# Browser E2E note\n\nThis markdown note was edited through the prototype UI. #e2e"
  );

  assert.ok(
    noteUpdatePayloads.some((payload) => String(payload.body || "").includes("# Browser E2E note")),
    JSON.stringify({ editorValueBeforeSave, noteUpdatePayloads }, null, 2)
  );

  const notes = await waitFor(async () => {
    const result = await fetchJson(apiBase, "/api/v1/directories/dir_original_default/notes");
    assert.equal(result.status, 200);
    assert.equal(result.json.total, 1);
    assert.equal(result.json.items[0].title, "Browser E2E note");
    return result;
  }, 7000);

  const noteId = notes.json.items[0].id;
  const note = await fetchJson(apiBase, `/api/v1/notes/${encodeURIComponent(noteId)}`);
  assert.equal(note.status, 200);
  assert.match(note.json.item.body, /This markdown note was edited through the prototype UI\./);
  assert.match(note.json.item.body, /#e2e/);
});

test("prototype browser flow creates a directory and persists notes inside it after reload", async (t) => {
  if (process.env.RUN_BROWSER_E2E !== "1") {
    t.skip("Set RUN_BROWSER_E2E=1 to enable browser e2e in local runs.");
    return;
  }

  const playwright = await optionalPlaywright(t);
  if (!playwright) return;

  const stack = await startPrototypeStack(t, playwright);
  if (!stack) return;
  const { apiBase, page, vaultPath } = stack;

  const targetFsPath = path.join(vaultPath, "notes", "original", "browser-e2e-folder");

  await page.locator("#btnOpenNewBoxDialog").click();
  await page.locator("#modalBoxName").fill("Browser E2E Folder");
  await page.locator("#modalFsPath").fill(targetFsPath);
  await page.locator("#modalCreate").click();
  await page.waitForFunction(() => {
    const text = document.querySelector("#statusText")?.textContent || "";
    return text.includes("已创建并落盘");
  });
  await page.waitForSelector('.explorer-item[data-kind="folder"] >> text=Browser E2E Folder');

  const editorValueBeforeSave = await createAndSaveNoteViaEditor(
    page,
    "# Directory scoped note\n\nThis note belongs to the newly created directory."
  );
  assert.match(editorValueBeforeSave, /Directory scoped note/);

  const directories = await fetchJson(apiBase, "/api/v1/directories?includeHidden=true");
  assert.equal(directories.status, 200);
  const createdDirectory = directories.json.items.find((item) => item.title === "Browser E2E Folder");
  assert.ok(createdDirectory, JSON.stringify(directories.json.items, null, 2));

  const notes = await waitFor(async () => {
    const result = await fetchJson(apiBase, `/api/v1/directories/${encodeURIComponent(createdDirectory.id)}/notes`);
    assert.equal(result.status, 200);
    assert.equal(result.json.total, 1);
    assert.equal(result.json.items[0].title, "Directory scoped note");
    return result;
  }, 7000);

  await page.reload({ waitUntil: "networkidle" });
  await page.locator('.explorer-item[data-kind="folder"]', { hasText: "Browser E2E Folder" }).click();
  await waitFor(async () => {
    const visibleCount = await page.locator('.explorer-item[data-kind="file"]', { hasText: "Directory scoped note.md" }).count();
    assert.equal(visibleCount, 1);
  }, 7000);
  await page.locator('.explorer-item[data-kind="file"]', { hasText: "Directory scoped note.md" }).click();
  await page.waitForFunction(() => document.querySelector("#editorBody")?.value?.includes("Directory scoped note"));

  const note = await fetchJson(apiBase, `/api/v1/notes/${encodeURIComponent(notes.json.items[0].id)}`);
  assert.equal(note.status, 200);
  assert.equal(note.json.item.directoryId, createdDirectory.id);
  assert.match(note.json.item.body, /newly created directory/);
});

test("prototype import panel previews confirms and rolls back markdown import", async (t) => {
  if (process.env.RUN_BROWSER_E2E !== "1") {
    t.skip("Set RUN_BROWSER_E2E=1 to enable browser e2e in local runs.");
    return;
  }

  const playwright = await optionalPlaywright(t);
  if (!playwright) return;

  const stack = await startPrototypeStack(t, playwright);
  if (!stack) return;
  const { apiBase, page } = stack;

  const fixturePath = path.join(REPO_ROOT, "tests", "fixtures", "imports", "markdown-basic");

  await page.selectOption("#importConnector", "markdown");
  await page.fill("#importPath", fixturePath);
  await page.fill("#importPayload", "");
  await page.fill("#importOptions", JSON.stringify({ detectWikilinks: true, detectAliases: true }));
  await page.click("#btnImportPreview");

  await page.waitForFunction(() => {
    const text = document.querySelector("#importResult")?.textContent || "";
    return text.includes('"stage": "preview"');
  });

  const previewResultText = await page.locator("#importResult").textContent();
  assert.match(previewResultText || "", /"importRecordId":\s*"/);
  const importRecordId = await page.inputValue("#importRecordId");
  assert.ok(importRecordId.startsWith("imp_"));

  await page.click("#btnImportConfirm");
  await page.waitForFunction(() => {
    const text = document.querySelector("#importResult")?.textContent || "";
    return text.includes('"stage": "confirm"') && text.includes('"status": "completed"');
  });

  const confirmResultText = await page.locator("#importResult").textContent();
  assert.match(confirmResultText || "", /"literatureNotes":\s*1/);

  await page.click("#btnImportRollback");
  await page.waitForFunction(() => {
    const text = document.querySelector("#importResult")?.textContent || "";
    return text.includes('"stage": "rollback"') && text.includes('"status": "rolled_back"');
  });

  const rollbackResultText = await page.locator("#importResult").textContent();
  assert.match(rollbackResultText || "", /"status":\s*"rolled_back"/);
});
