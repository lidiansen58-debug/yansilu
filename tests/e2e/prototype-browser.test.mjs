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

async function postJson(baseUrl, pathname, body) {
  const res = await fetch(`${baseUrl}${pathname}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const json = await res.json();
  return { status: res.status, json };
}

async function patchJson(baseUrl, pathname, body) {
  const res = await fetch(`${baseUrl}${pathname}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const json = await res.json();
  return { status: res.status, json };
}

async function listMarkdownFiles(rootPath) {
  const result = [];
  const entries = await fs.readdir(rootPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(rootPath, entry.name);
    if (entry.isDirectory()) {
      result.push(...(await listMarkdownFiles(fullPath)));
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith(".md")) {
      result.push(fullPath);
    }
  }
  return result;
}

async function expectChecked(locator, checked) {
  const isChecked = await locator.isChecked();
  assert.equal(isChecked, checked);
}

function escapeRegExp(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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

async function createAndSaveNoteViaEditor(page, markdown, options = {}) {
  const saveWithShortcut = Boolean(options.saveWithShortcut);
  const source = String(markdown || "").replace(/\r\n/g, "\n");
  const [firstLine = "", ...restLines] = source.split("\n");
  const expectedTitle = firstLine.replace(/^#+\s*/, "").trim();
  const expectedBody = restLines.join("\n").replace(/^\n+/, "");
  await page.locator("#btnNewNote").click();
  await page.waitForSelector(".tab.active");
  await ensurePlaceholderTitleSelection(page);
  await page.evaluate((title) => {
    const editor = document.querySelector("#editorHost")?.__markdownEditor;
    const value = String(editor?.getValue?.() || "");
    const lineEnd = value.indexOf("\n");
    const end = lineEnd >= 0 ? lineEnd : value.length;
    editor?.replaceRange?.(2, end, title);
    const cursor = 2 + String(title || "").length;
    editor?.setSelectionRange?.(cursor, cursor);
    editor?.focus?.();
  }, expectedTitle);
  if (expectedBody.trim()) {
    await page.keyboard.press("Enter");
    await page.keyboard.type(expectedBody);
  }
  await page.waitForFunction(
    ({ title, body }) => {
      const value = document.querySelector("#editorBody")?.value || "";
      return value.includes(`# ${title}`) && (!body || value.includes(body));
    },
    { title: expectedTitle, body: expectedBody.trim() ? expectedBody : "" }
  );
  const editorValueBeforeSave = await page.locator("#editorBody").inputValue();
  if (saveWithShortcut) {
    await page.keyboard.press(process.platform === "darwin" ? "Meta+S" : "Control+S");
  } else {
    await page.locator("#btnSave").click();
  }
  await waitFor(async () => {
    const editorValue = await page.locator("#editorBody").inputValue();
    const saveButtonClass = await page.locator("#btnSave").getAttribute("class");
    assert.match(editorValue, new RegExp(escapeRegExp(expectedTitle)));
    assert.match(String(saveButtonClass || ""), /is-saved/);
  }, 10000);
  return editorValueBeforeSave;
}

async function focusEditorContent(page) {
  await page.waitForSelector("#editorHost .cm-content");
  await page.evaluate(() => {
    document.querySelector("#editorHost")?.__markdownEditor?.focus?.();
  });
}

async function ensurePlaceholderTitleSelection(page) {
  await focusEditorContent(page);
  await page.evaluate(() => {
    const editor = document.querySelector("#editorHost")?.__markdownEditor;
    if (!editor) return;
    const value = String(editor.getValue?.() || "");
    const lineEnd = value.indexOf("\n");
    const end = lineEnd >= 0 ? lineEnd : value.length;
    editor.setSelectionRange?.(2, end);
    editor.focus?.();
  });
  await page.waitForTimeout(60);
}

async function waitForPlaceholderTitleSelection(page) {
  await page.waitForFunction(() => {
    const editor = document.querySelector("#editorHost")?.__markdownEditor;
    if (!editor) return false;
    const value = String(editor.getValue?.() || "");
    const selection = editor.selection?.();
    return Boolean(selection && value.slice(selection.from, selection.to) === "未命名笔记");
  });
}

async function acceptPrompt(page, expectedMessagePattern, answer) {
  page.once("dialog", async (dialog) => {
    assert.equal(dialog.type(), "prompt");
    assert.match(dialog.message(), expectedMessagePattern);
    await dialog.accept(answer);
  });
}

async function openContextAction(page, locator, actionKey) {
  await locator.click({ button: "right" });
  await page.locator(`#contextMenu button[data-action="${actionKey}"]`).click();
}

async function openImportsModule(page) {
  await page.locator('.rail-btn[data-module="imports"]').click();
  await waitFor(async () => {
    const isActive = await page.locator('.rail-btn[data-module="imports"]').getAttribute("class");
    assert.match(String(isActive || ""), /active/);
    await page.locator("#importPanel:not(.hidden)").waitFor({ timeout: 500 });
  }, 7000);
  await page.locator("#importAdvanced").evaluate((el) => {
    el.open = true;
  });
}

async function selectRichTextInBlock(page, selector, searchText) {
  await page.evaluate(
    ({ searchText: targetText }) => {
      const editor = document.querySelector("#editorHost")?.__markdownEditor;
      if (!editor) throw new Error("Missing markdown editor");
      const value = String(editor.getValue?.() || "");
      const index = value.indexOf(targetText);
      if (index < 0) throw new Error(`Missing text: ${targetText}`);
      editor.setSelectionRange?.(index, index + targetText.length);
      editor.focus?.();
    },
    { selector, searchText }
  );
}

async function placeCaretAtRichBlockEnd(page, selector) {
  await page.evaluate((blockSelector) => {
    const editor = document.querySelector("#editorHost")?.__markdownEditor;
    if (!editor) throw new Error("Missing markdown editor");
    const value = String(editor.getValue?.() || "");
    let position = value.length;

    if (String(blockSelector || "").includes("h2")) {
      const match = value.match(/(^|\n)##\s+[^\n]*/);
      if (match) position = match.index + match[0].length;
    } else if (String(blockSelector || "").includes("h1")) {
      const lineEnd = value.indexOf("\n");
      position = lineEnd >= 0 ? lineEnd : value.length;
    }

    editor.setSelectionRange?.(position, position);
    editor.focus?.();
  }, selector);
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
  const { apiBase, page, webBase } = stack;

  await page.waitForFunction(() => document.querySelector("#importPanel")?.classList.contains("hidden"));
  await page.waitForFunction(() => !document.querySelector("#markdownPanel")?.classList.contains("hidden"));

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

  const notes = await waitFor(async () => {
    const result = await fetchJson(apiBase, "/api/v1/directories/dir_original_default/notes");
    assert.equal(result.status, 200);
    assert.equal(result.json.total, 1);
    assert.equal(result.json.items[0].title, "Browser E2E note");
    return result;
  }, 7000);

  await waitFor(async () => {
    assert.ok(
      noteUpdatePayloads.some((payload) => String(payload.body || "").includes("# Browser E2E note")),
      JSON.stringify({ editorValueBeforeSave, noteUpdatePayloads }, null, 2)
    );
  }, 7000);

  const noteId = notes.json.items[0].id;
  const note = await fetchJson(apiBase, `/api/v1/notes/${encodeURIComponent(noteId)}`);
  assert.equal(note.status, 200);
  assert.match(note.json.item.body, /This markdown note was edited through the prototype UI\./);
  assert.match(note.json.item.body, /#e2e/);
});

test("standalone editor route loads and saves a note without workspace chrome", async (t) => {
  if (process.env.RUN_BROWSER_E2E !== "1") {
    t.skip("Set RUN_BROWSER_E2E=1 to enable browser e2e in local runs.");
    return;
  }

  const playwright = await optionalPlaywright(t);
  if (!playwright) return;

  const stack = await startPrototypeStack(t, playwright);
  if (!stack) return;
  const { apiBase, webBase, page } = stack;

  const created = await postJson(apiBase, "/api/v1/notes", {
    directoryId: "dir_original_default",
    body: "# Standalone editor note\n\nLoaded through the dedicated editor route."
  });
  assert.equal(created.status, 201);
  const noteId = created.json.item.id;

  await page.goto(`${webBase}/editor?note=${encodeURIComponent(noteId)}`, { waitUntil: "networkidle" });

  await page.waitForFunction(() => {
    const rail = document.querySelector(".rail");
    const sidebar = document.querySelector(".sidebar");
    const importPanel = document.querySelector("#importPanel");
    const relatedPanel = document.querySelector("#relatedPanel");
    const markdownPanel = document.querySelector("#markdownPanel");
    const styleOf = (node) => (node ? window.getComputedStyle(node) : null);
    return Boolean(
      document.documentElement.classList.contains("editor-only") &&
        rail &&
        sidebar &&
        importPanel &&
        relatedPanel &&
        markdownPanel &&
        styleOf(rail)?.display === "none" &&
        styleOf(sidebar)?.display === "none" &&
        styleOf(importPanel)?.display === "none" &&
        styleOf(relatedPanel)?.display === "none" &&
        styleOf(markdownPanel)?.display !== "none"
    );
  });

  await page.waitForSelector("#editorHost .cm-content");
  await page.waitForFunction(() => {
    const value = document.querySelector("#editorBody")?.value || "";
    return value.includes("Standalone editor note") && value.includes("dedicated editor route");
  });

  await focusEditorContent(page);
  await page.keyboard.press(process.platform === "darwin" ? "Meta+End" : "Control+End");
  await page.keyboard.type("\n\nSaved from /editor.");
  await page.locator("#btnSave").click();

  await waitFor(async () => {
    const note = await fetchJson(apiBase, `/api/v1/notes/${encodeURIComponent(noteId)}`);
    assert.equal(note.status, 200);
    assert.match(note.json.item.body, /Saved from \/editor\./);
    const saveButtonClass = await page.locator("#btnSave").getAttribute("class");
    assert.match(String(saveButtonClass || ""), /is-saved/);
  }, 10000);
});

test("prototype new note auto-selects placeholder title for immediate typing", async (t) => {
  if (process.env.RUN_BROWSER_E2E !== "1") {
    t.skip("Set RUN_BROWSER_E2E=1 to enable browser e2e in local runs.");
    return;
  }

  const playwright = await optionalPlaywright(t);
  if (!playwright) return;

  const stack = await startPrototypeStack(t, playwright);
  if (!stack) return;
  const { page } = stack;

  await page.locator("#btnNewNote").click();
  await page.waitForSelector("#editorHost .cm-content");
  await waitForPlaceholderTitleSelection(page);
  await page.keyboard.type("Immediate Title");

  await waitFor(async () => {
    const editorValue = await page.locator("#editorBody").inputValue();
    const tabTitle = await page.locator(".tab.active .tab-title").textContent();
    assert.match(editorValue, /^# Immediate Title\b/);
    assert.doesNotMatch(editorValue, /未命名笔记/);
    assert.match(tabTitle || "", /Immediate Title/);
  }, 7000);
});

test("prototype editor keeps related inspector collapsed until explicitly opened", async (t) => {
  if (process.env.RUN_BROWSER_E2E !== "1") {
    t.skip("Set RUN_BROWSER_E2E=1 to enable browser e2e in local runs.");
    return;
  }

  const playwright = await optionalPlaywright(t);
  if (!playwright) return;

  const stack = await startPrototypeStack(t, playwright);
  if (!stack) return;
  const { page } = stack;

  await page.locator("#btnNewNote").click();
  await page.waitForSelector(".tab.active");

  await page.waitForFunction(() => {
    const wrap = document.querySelector(".editor-wrap");
    const panel = document.querySelector("#relatedPanel");
    return Boolean(wrap?.classList.contains("inspector-closed") && panel && window.getComputedStyle(panel).display === "none");
  });

  await page.locator("#btnShowRelated").click();

  await page.waitForFunction(() => {
    const wrap = document.querySelector(".editor-wrap");
    const panel = document.querySelector("#relatedPanel");
    return Boolean(wrap && !wrap.classList.contains("inspector-closed") && panel && window.getComputedStyle(panel).display !== "none");
  });
});

test("prototype editor toggles markdown preview modes and renders current note", async (t) => {
  if (process.env.RUN_BROWSER_E2E !== "1") {
    t.skip("Set RUN_BROWSER_E2E=1 to enable browser e2e in local runs.");
    return;
  }

  const playwright = await optionalPlaywright(t);
  if (!playwright) return;

  const stack = await startPrototypeStack(t, playwright);
  if (!stack) return;
  const { page } = stack;

  await page.locator("#btnNewNote").click();
  await page.waitForSelector("#editorHost .cm-content");
  await waitForPlaceholderTitleSelection(page);
  await page.keyboard.type("Preview Note");
  await page.keyboard.press("Enter");
  await page.keyboard.type("Body with [[关联目标]] and #标签预览");

  await page.locator("#btnModeSplit").click();
  await page.waitForFunction(() => {
    const split = document.querySelector("#markdownSplit");
    const panel = document.querySelector("#markdownPreviewPanel");
    const preview = document.querySelector("#markdownPreview");
    return Boolean(
      split?.classList.contains("split-mode") &&
        panel &&
        !panel.classList.contains("hidden") &&
        /Preview Note/.test(preview?.textContent || "") &&
        /标签预览/.test(preview?.textContent || "")
    );
  });

  const previewHtml = await page.locator("#markdownPreview").innerHTML();
  assert.match(previewHtml, /<h1>/);
  assert.match(previewHtml, /data-preview-link/);
  assert.match(previewHtml, /data-preview-tag/);

  await page.locator("#btnModePreview").click();
  await page.waitForFunction(() => {
    const split = document.querySelector("#markdownSplit");
    const panel = document.querySelector("#markdownPreviewPanel");
    const editorCol = document.querySelector(".markdown-editor-col");
    return Boolean(
      split?.classList.contains("preview-only") &&
        panel &&
        !panel.classList.contains("hidden") &&
        editorCol &&
        window.getComputedStyle(editorCol).display === "none"
    );
  });

  await page.locator("#btnModeEdit").click();
  await page.waitForFunction(() => {
    const split = document.querySelector("#markdownSplit");
    const panel = document.querySelector("#markdownPreviewPanel");
    return Boolean(split?.classList.contains("edit-only") && panel?.classList.contains("hidden"));
  });
});

test("prototype editor inserts uploaded image into markdown and preview", async (t) => {
  if (process.env.RUN_BROWSER_E2E !== "1") {
    t.skip("Set RUN_BROWSER_E2E=1 to enable browser e2e in local runs.");
    return;
  }

  const playwright = await optionalPlaywright(t);
  if (!playwright) return;

  const stack = await startPrototypeStack(t, playwright);
  if (!stack) return;
  const { apiBase, page } = stack;

  await createAndSaveNoteViaEditor(page, "# Asset note\n\nImage goes below.");
  const notes = await fetchJson(apiBase, "/api/v1/directories/dir_original_default/notes");
  const noteId = notes.json.items[0].id;

  await page.locator("#assetFileInput").setInputFiles({
    name: "inline-image.png",
    mimeType: "image/png",
    buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9l9wAAAABJRU5ErkJggg==", "base64")
  });

  await waitFor(async () => {
    const editorValue = await page.locator("#editorBody").inputValue();
    assert.match(editorValue, /!\[inline-image\]\(\.\.\/\.\.\/assets\/images\//);
    const previewHtml = await page.locator("#markdownPreview").innerHTML();
    assert.match(previewHtml, /preview-image-asset/);
  }, 10000);

  await page.locator("#btnSave").click();

  await waitFor(async () => {
    const savedNote = await fetchJson(apiBase, `/api/v1/notes/${encodeURIComponent(noteId)}`);
    assert.equal(savedNote.status, 200);
    assert.match(savedNote.json.item.body, /!\[inline-image\]\(\.\.\/\.\.\/assets\/images\//);
  }, 10000);
});

test("prototype editor inserts code blocks tables and dividers with preview support", async (t) => {
  if (process.env.RUN_BROWSER_E2E !== "1") {
    t.skip("Set RUN_BROWSER_E2E=1 to enable browser e2e in local runs.");
    return;
  }

  const playwright = await optionalPlaywright(t);
  if (!playwright) return;

  const stack = await startPrototypeStack(t, playwright);
  if (!stack) return;
  const { page } = stack;

  await page.locator("#btnNewNote").click();
  await page.waitForSelector("#editorHost .cm-content");
  await waitForPlaceholderTitleSelection(page);
  await page.keyboard.type("Structure Blocks");
  await page.keyboard.press("Enter");

  await page.locator('.tb[data-md="code"]').click();
  await page.keyboard.type("const answer = 42;");

  await page.evaluate(() => {
    const editor = document.querySelector("#editorHost")?.__markdownEditor;
    const value = String(editor?.getValue?.() || "");
    editor?.setSelectionRange?.(value.length, value.length);
    editor?.focus?.();
  });
  await page.locator('.tb[data-md="table"]').click();

  await waitFor(async () => {
    const editorValue = await page.locator("#editorBody").inputValue();
    assert.match(editorValue, /```[\s\S]*const answer = 42;[\s\S]*```/);
    assert.match(editorValue, /\| 列 1 \| 列 2 \|/);
    assert.match(editorValue, /\| --- \| --- \|/);
  }, 7000);

  await waitFor(async () => {
    assert.equal(await page.locator("#tableTools").isVisible(), true);
  }, 7000);
  await page.locator("#btnTableAddRow").click();
  await page.locator("#btnTableAddColumn").click();
  await waitFor(async () => {
    const editorValue = await page.locator("#editorBody").inputValue();
    assert.match(editorValue, /\| 列 1 \| 列 2 \| 列 3 \|/);
    const contentRows = editorValue.split("\n").filter((line) => /^\| 内容 \|/u.test(line));
    assert.ok(contentRows.length >= 2);
  }, 7000);

  await page.evaluate(() => {
    const editor = document.querySelector("#editorHost")?.__markdownEditor;
    const value = String(editor?.getValue?.() || "");
    editor?.setSelectionRange?.(value.length, value.length);
    editor?.focus?.();
  });
  await page.locator('.tb[data-md="hr"]').click();

  await page.evaluate(() => {
    window.__copiedTexts = [];
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async (text) => {
          window.__copiedTexts.push(String(text || ""));
        }
      }
    });
  });
  await page.locator("#btnModeSplit").click();
  await waitFor(async () => {
    const previewHtml = await page.locator("#markdownPreview").innerHTML();
    assert.match(previewHtml, /preview-code-block/);
    assert.match(previewHtml, /preview-code-head[\s\S]*<span>javascript<\/span>/);
    assert.match(previewHtml, /preview-code-copy/);
    assert.match(previewHtml, /code-token-keyword/);
    assert.match(previewHtml, /code-token-number/);
    assert.match(previewHtml, /<table class="preview-table">/);
    assert.match(previewHtml, /preview-rule/);
  }, 7000);
  await page.locator(".preview-code-copy").click();
  await waitFor(async () => {
    const copiedTexts = await page.evaluate(() => window.__copiedTexts || []);
    assert.match(String(copiedTexts.at(-1) || ""), /const answer = 42;/);
  }, 7000);
});

test("prototype editor contextual code tools can switch the current code block language", async (t) => {
  if (process.env.RUN_BROWSER_E2E !== "1") {
    t.skip("Set RUN_BROWSER_E2E=1 to enable browser e2e in local runs.");
    return;
  }

  const playwright = await optionalPlaywright(t);
  if (!playwright) return;

  const stack = await startPrototypeStack(t, playwright);
  if (!stack) return;
  const { page } = stack;

  await page.locator("#btnNewNote").click();
  await page.waitForSelector("#editorHost .cm-content");
  await waitForPlaceholderTitleSelection(page);
  await page.keyboard.type("Code Language Tools");
  await page.keyboard.press("Enter");

  await page.locator('.tb[data-md="code"]').click();
  await page.keyboard.type("const sample = 1;");

  await waitFor(async () => {
    assert.equal(await page.locator("#codeTools").isVisible(), true);
    assert.equal(await page.locator("#codeLanguageSelect").inputValue(), "text");
  }, 7000);

  await page.locator("#codeLanguageSelect").selectOption("shell");
  await waitFor(async () => {
    const editorValue = await page.locator("#editorBody").inputValue();
    assert.match(editorValue, /^# Code Language Tools\n\n```shell\nconst sample = 1;\n```/);
  }, 7000);

  await page.locator("#btnModeSplit").click();
  await waitFor(async () => {
    const previewHtml = await page.locator("#markdownPreview").innerHTML();
    assert.match(previewHtml, /preview-code-head[\s\S]*<span>shell<\/span>/);
  }, 7000);
});

test("prototype editor preview mode shortcuts switch edit split and preview", async (t) => {
  if (process.env.RUN_BROWSER_E2E !== "1") {
    t.skip("Set RUN_BROWSER_E2E=1 to enable browser e2e in local runs.");
    return;
  }

  const playwright = await optionalPlaywright(t);
  if (!playwright) return;

  const stack = await startPrototypeStack(t, playwright);
  if (!stack) return;
  const { page } = stack;

  await page.locator("#btnNewNote").click();
  await page.waitForSelector("#editorHost .cm-content");
  await waitForPlaceholderTitleSelection(page);
  await page.keyboard.type("Mode Shortcut Note");

  await page.evaluate(() => {
    const target = document.querySelector("#editorHost .cm-content");
    target?.dispatchEvent(new KeyboardEvent("keydown", { key: "3", ctrlKey: true, bubbles: true }));
  });
  await page.waitForFunction(() => document.querySelector("#markdownSplit")?.classList.contains("preview-only"));

  await page.evaluate(() => {
    const target = document.querySelector("#editorHost .cm-content");
    target?.dispatchEvent(new KeyboardEvent("keydown", { key: "2", ctrlKey: true, bubbles: true }));
  });
  await page.waitForFunction(() => document.querySelector("#markdownSplit")?.classList.contains("split-mode"));

  await page.evaluate(() => {
    const target = document.querySelector("#editorHost .cm-content");
    target?.dispatchEvent(new KeyboardEvent("keydown", { key: "1", ctrlKey: true, bubbles: true }));
  });
  await page.waitForFunction(() => document.querySelector("#markdownSplit")?.classList.contains("edit-only"));
});

test("prototype new note exposes editable body area below title", async (t) => {
  if (process.env.RUN_BROWSER_E2E !== "1") {
    t.skip("Set RUN_BROWSER_E2E=1 to enable browser e2e in local runs.");
    return;
  }

  const playwright = await optionalPlaywright(t);
  if (!playwright) return;

  const stack = await startPrototypeStack(t, playwright);
  if (!stack) return;
  const { page } = stack;

  await page.locator("#btnNewNote").click();
  await page.waitForSelector("#editorHost .cm-content");
  await waitForPlaceholderTitleSelection(page);

  await page.keyboard.type("Title To Body");
  await placeCaretAtRichBlockEnd(page, "#editorHost .cm-content h1");
  await page.keyboard.press("Enter");
  await page.keyboard.type("First paragraph.");

  await waitFor(async () => {
    const editorValue = await page.locator("#editorBody").inputValue();
    assert.match(editorValue, /^# Title To Body\n\nFirst paragraph\./);
  }, 7000);
});

test("prototype editor toolbar keeps title in place and formats rich text blocks", async (t) => {
  if (process.env.RUN_BROWSER_E2E !== "1") {
    t.skip("Set RUN_BROWSER_E2E=1 to enable browser e2e in local runs.");
    return;
  }

  const playwright = await optionalPlaywright(t);
  if (!playwright) return;

  const stack = await startPrototypeStack(t, playwright);
  if (!stack) return;
  const { page } = stack;

  await page.locator("#btnNewNote").click();
  await page.waitForSelector("#editorHost .cm-content");
  await waitForPlaceholderTitleSelection(page);
  await page.keyboard.type("Toolbar Title");

  await page.locator('.tb[data-md="h2"]').click();
  await page.keyboard.type("Section Heading");
  await page.keyboard.press("Enter");
  await page.keyboard.type("Formatting target");

  await waitFor(async () => {
    const editorValue = await page.locator("#editorBody").inputValue();
    assert.match(editorValue, /^# Toolbar Title\n\n## Section Heading\n+Formatting target/);
  }, 7000);

  await placeCaretAtRichBlockEnd(page, "#editorHost .cm-content h2");
  await waitFor(async () => {
    const h2Class = await page.locator('.tb[data-md="h2"]').getAttribute("class");
    assert.match(String(h2Class || ""), /active/);
  }, 4000);

  await selectRichTextInBlock(page, "#editorHost .cm-content p", "Formatting");
  await page.locator('.tb[data-md="bold"]').click();

  await waitFor(async () => {
    const editorValue = await page.locator("#editorBody").inputValue();
    assert.match(editorValue, /\*\*Formatting\*\* target/);
  }, 7000);
});

test("prototype editor tab indents and shift-tab outdents selected lines", async (t) => {
  if (process.env.RUN_BROWSER_E2E !== "1") {
    t.skip("Set RUN_BROWSER_E2E=1 to enable browser e2e in local runs.");
    return;
  }

  const playwright = await optionalPlaywright(t);
  if (!playwright) return;

  const stack = await startPrototypeStack(t, playwright);
  if (!stack) return;
  const { apiBase, page, webBase } = stack;

  const created = await postJson(apiBase, "/api/v1/notes", {
    directoryId: "dir_original_default",
    body: "# Indent note\n\n- first\n- second"
  });
  assert.equal(created.status, 201);

  await page.goto(`${webBase}/prototype`, { waitUntil: "networkidle" });
  await page.locator('.explorer-item[data-kind="file"]', { hasText: "Indent note" }).click();
  await page.waitForFunction(() => document.querySelector("#editorBody")?.value?.includes("- first"));

  await page.evaluate(() => {
    const editor = document.querySelector("#editorHost")?.__markdownEditor;
    const value = String(editor?.getValue?.() || "");
    const start = value.indexOf("- first");
    const end = value.indexOf("- second") + "- second".length;
    editor?.setSelectionRange?.(start, end);
    editor?.focus?.();
  });

  await page.keyboard.press("Tab");
  await waitFor(async () => {
    const editorValue = await page.locator("#editorBody").inputValue();
    assert.match(editorValue, /\n  - first\n  - second/);
  }, 5000);

  await page.keyboard.press("Shift+Tab");
  await waitFor(async () => {
    const editorValue = await page.locator("#editorBody").inputValue();
    assert.match(editorValue, /\n- first\n- second/);
  }, 5000);
});

test("prototype editor enter continues list quote and checklist structures", async (t) => {
  if (process.env.RUN_BROWSER_E2E !== "1") {
    t.skip("Set RUN_BROWSER_E2E=1 to enable browser e2e in local runs.");
    return;
  }

  const playwright = await optionalPlaywright(t);
  if (!playwright) return;

  const stack = await startPrototypeStack(t, playwright);
  if (!stack) return;
  const { apiBase, page, webBase } = stack;

  const created = await postJson(apiBase, "/api/v1/notes", {
    directoryId: "dir_original_default",
    body: "# Continue structures\n\n- first\n> quoted\n- [ ] todo"
  });
  assert.equal(created.status, 201);

  await page.goto(`${webBase}/prototype`, { waitUntil: "networkidle" });
  await page.locator('.explorer-item[data-kind="file"]', { hasText: "Continue structures" }).click();
  await page.waitForFunction(() => document.querySelector("#editorBody")?.value?.includes("- [ ] todo"));

  await page.evaluate(() => {
    const editor = document.querySelector("#editorHost")?.__markdownEditor;
    const value = String(editor?.getValue?.() || "");
    const pos = value.indexOf("- first") + "- first".length;
    editor?.setSelectionRange?.(pos, pos);
    editor?.focus?.();
  });
  await page.keyboard.press("Enter");
  await page.keyboard.type("second");
  await waitFor(async () => {
    const editorValue = await page.locator("#editorBody").inputValue();
    assert.match(editorValue, /\n- first\n- second/);
  }, 5000);

  await page.evaluate(() => {
    const editor = document.querySelector("#editorHost")?.__markdownEditor;
    const value = String(editor?.getValue?.() || "");
    const pos = value.indexOf("> quoted") + "> quoted".length;
    editor?.setSelectionRange?.(pos, pos);
    editor?.focus?.();
  });
  await page.keyboard.press("Enter");
  await page.keyboard.type("reply");
  await waitFor(async () => {
    const editorValue = await page.locator("#editorBody").inputValue();
    assert.match(editorValue, /\n> quoted\n> reply/);
  }, 5000);

  await page.evaluate(() => {
    const editor = document.querySelector("#editorHost")?.__markdownEditor;
    const value = String(editor?.getValue?.() || "");
    const pos = value.indexOf("- [ ] todo") + "- [ ] todo".length;
    editor?.setSelectionRange?.(pos, pos);
    editor?.focus?.();
  });
  await page.keyboard.press("Enter");
  await page.keyboard.type("todo next");
  await waitFor(async () => {
    const editorValue = await page.locator("#editorBody").inputValue();
    assert.match(editorValue, /\n- \[ \] todo\n- \[ \] todo next/);
  }, 5000);
});

test("prototype editor shows dirty state and supports Ctrl/Cmd+S save", async (t) => {
  if (process.env.RUN_BROWSER_E2E !== "1") {
    t.skip("Set RUN_BROWSER_E2E=1 to enable browser e2e in local runs.");
    return;
  }

  const playwright = await optionalPlaywright(t);
  if (!playwright) return;

  const stack = await startPrototypeStack(t, playwright);
  if (!stack) return;
  const { apiBase, page } = stack;

  await page.locator("#btnNewNote").click();
  await page.waitForSelector("#editorHost .cm-content");
  await waitForPlaceholderTitleSelection(page);
  await page.keyboard.type("Shortcut Save Note");
  await placeCaretAtRichBlockEnd(page, "#editorHost .cm-content h1");
  await page.keyboard.press("Enter");
  await page.keyboard.type("Dirty marker should appear before save.");

  await waitFor(async () => {
    const tabTitle = await page.locator(".tab.active .tab-title").textContent();
    const tabDirty = await page.locator(".tab.active .tab-dirty").textContent();
    const hint = await page.locator("#statusHint").textContent();
    const saveButtonTip = await page.locator("#btnSave").getAttribute("data-tip");
    const saveButtonClass = await page.locator("#btnSave").getAttribute("class");
    assert.match(tabTitle || "", /Shortcut Save Note/);
    assert.ok(String(tabDirty || "").trim().length > 0);
    assert.ok(String(hint || "").includes("未保存") || String(hint || "").includes("鏈"));
    assert.ok(String(saveButtonTip || "").includes("保存"));
    assert.match(String(saveButtonClass || ""), /is-dirty/);
  }, 7000);

  await page.keyboard.press(process.platform === "darwin" ? "Meta+S" : "Control+S");

  await waitFor(async () => {
    const notes = await fetchJson(apiBase, "/api/v1/directories/dir_original_default/notes");
    assert.equal(notes.status, 200);
    assert.equal(notes.json.total, 1);
    assert.equal(notes.json.items[0].title, "Shortcut Save Note");

    const tabDirty = await page.locator(".tab.active .tab-dirty").textContent();
    const hint = await page.locator("#statusHint").textContent();
    const saveButtonTip = await page.locator("#btnSave").getAttribute("data-tip");
    const saveButtonClass = await page.locator("#btnSave").getAttribute("class");
    assert.ok(!String(tabDirty || "").trim() || /已保存/.test(String(hint || "")));
    assert.ok(String(saveButtonTip || "").includes("保存"));
    assert.match(String(saveButtonClass || ""), /is-saved/);
  }, 10000);
});

test("prototype editor keeps long-form dirty drafts and save state isolated per tab", async (t) => {
  if (process.env.RUN_BROWSER_E2E !== "1") {
    t.skip("Set RUN_BROWSER_E2E=1 to enable browser e2e in local runs.");
    return;
  }

  const playwright = await optionalPlaywright(t);
  if (!playwright) return;

  const stack = await startPrototypeStack(t, playwright);
  if (!stack) return;
  const { apiBase, page, webBase } = stack;

  const alphaMarkdown = [
    "# Longform Alpha",
    "",
    ...Array.from({ length: 12 }, (_, index) => `Alpha paragraph ${index + 1}: ${"evidence map ".repeat(10).trim()}`),
    "",
    "## Closing",
    "",
    "Alpha ending keeps the note intentionally long."
  ].join("\n");
  const betaMarkdown = [
    "# Longform Beta",
    "",
    ...Array.from({ length: 10 }, (_, index) => `Beta paragraph ${index + 1}: ${"draft scaffold ".repeat(9).trim()}`),
    "",
    "## Summary",
    "",
    "Beta ending should stay untouched while Alpha is dirty."
  ].join("\n");

  const alphaCreate = await postJson(apiBase, "/api/v1/notes", {
    directoryId: "dir_original_default",
    body: alphaMarkdown
  });
  const betaCreate = await postJson(apiBase, "/api/v1/notes", {
    directoryId: "dir_original_default",
    body: betaMarkdown
  });
  assert.equal(alphaCreate.status, 201);
  assert.equal(betaCreate.status, 201);

  await page.goto(`${webBase}/prototype`, { waitUntil: "networkidle" });
  await page.locator('.explorer-item[data-kind="file"]', { hasText: "Longform Alpha" }).click();
  await page.locator('.explorer-item[data-kind="file"]', { hasText: "Longform Beta" }).click();

  await page.locator(".tab", { hasText: "Longform Alpha" }).click();
  await waitFor(async () => {
    const editorValue = await page.locator("#editorBody").inputValue();
    const saveButtonClass = await page.locator("#btnSave").getAttribute("class");
    assert.match(editorValue, /Longform Alpha/);
    assert.match(String(saveButtonClass || ""), /is-saved/);
  }, 7000);

  const unsavedSuffix = "\n\nUnsaved alpha appendix line 1.\nUnsaved alpha appendix line 2.";
  await focusEditorContent(page);
  await page.keyboard.press(process.platform === "darwin" ? "Meta+End" : "Control+End");
  await page.keyboard.type(unsavedSuffix);

  await waitFor(async () => {
    const editorValue = await page.locator("#editorBody").inputValue();
    const tabDirty = await page.locator(".tab.active .tab-dirty").textContent();
    const saveButtonClass = await page.locator("#btnSave").getAttribute("class");
    const hint = await page.locator("#statusHint").textContent();
    assert.match(editorValue, /Unsaved alpha appendix line 2\./);
    assert.ok(String(tabDirty || "").trim().length > 0);
    assert.match(String(saveButtonClass || ""), /is-dirty/);
    assert.match(String(hint || ""), /未保存|草稿/);
  }, 7000);

  await page.locator(".tab", { hasText: "Longform Beta" }).click();
  await waitFor(async () => {
    const editorValue = await page.locator("#editorBody").inputValue();
    const saveButtonClass = await page.locator("#btnSave").getAttribute("class");
    const hint = await page.locator("#statusHint").textContent();
    assert.match(editorValue, /Longform Beta/);
    assert.doesNotMatch(editorValue, /Unsaved alpha appendix/);
    assert.match(String(saveButtonClass || ""), /is-saved/);
    assert.match(String(hint || ""), /已保存/);
  }, 7000);

  await page.locator(".tab", { hasText: "Longform Alpha" }).click();
  await waitFor(async () => {
    const editorValue = await page.locator("#editorBody").inputValue();
    const saveButtonClass = await page.locator("#btnSave").getAttribute("class");
    const hint = await page.locator("#statusHint").textContent();
    assert.match(editorValue, /Unsaved alpha appendix line 2\./);
    assert.match(String(saveButtonClass || ""), /is-dirty/);
    assert.match(String(hint || ""), /未保存|草稿/);
  }, 7000);

  await page.locator("#btnSave").click();
  await waitFor(async () => {
    const saveButtonClass = await page.locator("#btnSave").getAttribute("class");
    const hint = await page.locator("#statusHint").textContent();
    assert.match(String(saveButtonClass || ""), /is-saved/);
    assert.match(String(hint || ""), /已保存/);
  }, 10000);

  const notes = await fetchJson(apiBase, "/api/v1/directories/dir_original_default/notes");
  assert.equal(notes.status, 200);
  const alphaNote = notes.json.items.find((item) => item.title === "Longform Alpha");
  const betaNote = notes.json.items.find((item) => item.title === "Longform Beta");
  assert.ok(alphaNote);
  assert.ok(betaNote);

  const alphaAfterSave = await fetchJson(apiBase, `/api/v1/notes/${encodeURIComponent(alphaNote.id)}`);
  assert.equal(alphaAfterSave.status, 200);
  assert.match(alphaAfterSave.json.item.body, /Unsaved alpha appendix line 2\./);

  const betaAfterSave = await fetchJson(apiBase, `/api/v1/notes/${encodeURIComponent(betaNote.id)}`);
  assert.equal(betaAfterSave.status, 200);
  assert.doesNotMatch(betaAfterSave.json.item.body, /Unsaved alpha appendix/);
});

test("prototype editor inline wikilink picker inserts ranked candidate", async (t) => {
  if (process.env.RUN_BROWSER_E2E !== "1") {
    t.skip("Set RUN_BROWSER_E2E=1 to enable browser e2e in local runs.");
    return;
  }

  const playwright = await optionalPlaywright(t);
  if (!playwright) return;

  const stack = await startPrototypeStack(t, playwright);
  if (!stack) return;
  const { apiBase, page, webBase } = stack;

  await postJson(apiBase, "/api/v1/notes", {
    directoryId: "dir_original_default",
    body: "# Alpha target\n\nA less relevant target."
  });
  await postJson(apiBase, "/api/v1/notes", {
    directoryId: "dir_original_default",
    body: "# Gamma target\n\nThe expected wikilink target."
  });
  const source = await postJson(apiBase, "/api/v1/notes", {
    directoryId: "dir_original_default",
    body: "# Link picker source\n\nStart typing below."
  });
  assert.equal(source.status, 201);

  await page.goto(`${webBase}/prototype`, { waitUntil: "networkidle" });
  await page.locator('.explorer-item[data-kind="file"]', { hasText: "Link picker source" }).click();
  await page.waitForSelector("#editorHost .cm-content");
  await focusEditorContent(page);
  await page.keyboard.press(process.platform === "darwin" ? "Meta+End" : "Control+End");
  await page.keyboard.type("\n\n[[ga");

  await waitFor(async () => {
    await page.locator("#linkPicker:not(.hidden) .link-picker-item.active", { hasText: "Gamma target" }).waitFor({ timeout: 500 });
  }, 7000);

  const linkSectionText = await page.locator("#linkPicker .picker-section-label").first().textContent();
  assert.match(String(linkSectionText || ""), /最匹配|同目录笔记/);

  const linkCandidateHtml = await page.locator("#linkPicker .link-picker-item.active").innerHTML();
  assert.match(linkCandidateHtml, /picker-mark/);
  assert.match(linkCandidateHtml, /picker-badge/);
  assert.match(linkCandidateHtml, /picker-meta/);

  const saveTip = await page.locator("#btnSave").getAttribute("data-tip");
  assert.match(saveTip || "", /Ctrl\/Cmd\+S/);

  await page.keyboard.press("Enter");
  await page.waitForFunction(() => document.querySelector("#editorBody")?.value?.includes("[[Gamma target]]"));
  const editorValue = await page.locator("#editorBody").inputValue();
  assert.match(editorValue, /\[\[Gamma target\]\]/);
});

test("prototype editor confirms before closing or switching away from dirty note", async (t) => {
  if (process.env.RUN_BROWSER_E2E !== "1") {
    t.skip("Set RUN_BROWSER_E2E=1 to enable browser e2e in local runs.");
    return;
  }

  const playwright = await optionalPlaywright(t);
  if (!playwright) return;

  const stack = await startPrototypeStack(t, playwright);
  if (!stack) return;
  const { apiBase, page, webBase } = stack;

  const first = await postJson(apiBase, "/api/v1/notes", {
    directoryId: "dir_original_default",
    body: "# Dirty source\n\nThis note will be edited without saving."
  });
  const second = await postJson(apiBase, "/api/v1/notes", {
    directoryId: "dir_original_default",
    body: "# Switch target\n\nOpening this should ask first."
  });
  assert.equal(first.status, 201);
  assert.equal(second.status, 201);

  await page.goto(`${webBase}/prototype`, { waitUntil: "networkidle" });
  await page.locator('.explorer-item[data-kind="file"]', { hasText: "Dirty source" }).click();
  await page.waitForSelector("#editorHost .cm-content");
  await placeCaretAtRichBlockEnd(page, "#editorHost .cm-content p:last-of-type, #editorHost .cm-content h1");
  await page.keyboard.type("\n\nUnsaved line.");

  await waitFor(async () => {
    const dirty = await page.locator(".tab.active .tab-dirty").textContent();
    assert.ok(String(dirty || "").trim());
  }, 7000);

  page.once("dialog", async (dialog) => {
    assert.ok(dialog.message().includes("未保存") || dialog.message().includes("unsaved") || dialog.message().includes("更改"));
    await dialog.dismiss();
  });
  await page.locator(".tab.active .tab-close").click();
  await page.locator(".tab.active", { hasText: "Dirty source" }).waitFor({ timeout: 1000 });

  page.once("dialog", async (dialog) => {
    assert.ok(dialog.message().includes("未保存") || dialog.message().includes("unsaved") || dialog.message().includes("更改"));
    await dialog.dismiss();
  });
  await page.locator('.explorer-item[data-kind="file"]', { hasText: "Switch target" }).click();
  const afterDismiss = await page.locator("#editorBody").inputValue();
  assert.match(afterDismiss, /Dirty source/);

  page.once("dialog", async (dialog) => {
    assert.ok(dialog.message().includes("未保存") || dialog.message().includes("unsaved") || dialog.message().includes("更改"));
    await dialog.accept();
  });
  await page.locator('.explorer-item[data-kind="file"]', { hasText: "Switch target" }).click();
  await page.waitForFunction(() => document.querySelector("#editorBody")?.value?.includes("Switch target"));

  page.once("dialog", async (dialog) => {
    assert.ok(dialog.message().includes("未保存") || dialog.message().includes("unsaved") || dialog.message().includes("更改"));
    await dialog.accept();
  });
  await page.locator(".tab", { hasText: "Dirty source" }).locator(".tab-close").click();
  await waitFor(async () => {
    const dirtySourceTabs = await page.locator(".tab", { hasText: "Dirty source" }).count();
    assert.equal(dirtySourceTabs, 0);
  }, 7000);
});

test("prototype editor restores autosaved draft after reload", async (t) => {
  if (process.env.RUN_BROWSER_E2E !== "1") {
    t.skip("Set RUN_BROWSER_E2E=1 to enable browser e2e in local runs.");
    return;
  }

  const playwright = await optionalPlaywright(t);
  if (!playwright) return;

  const stack = await startPrototypeStack(t, playwright);
  if (!stack) return;
  const { apiBase, page, webBase } = stack;

  const created = await postJson(apiBase, "/api/v1/notes", {
    directoryId: "dir_original_default",
    body: "# Autosave source\n\nThis note starts from disk."
  });
  assert.equal(created.status, 201);

  await page.goto(`${webBase}/prototype`, { waitUntil: "networkidle" });
  await page.locator('.explorer-item[data-kind="file"]', { hasText: "Autosave source" }).click();
  await page.waitForSelector("#editorHost .cm-content");
  await placeCaretAtRichBlockEnd(page, "#editorHost .cm-content p:last-of-type, #editorHost .cm-content h1");
  await page.keyboard.type("\n\nRecovered draft line.");

  await waitFor(async () => {
    const draftCount = await page.evaluate(() =>
      Object.keys(window.localStorage).filter((key) => key.startsWith("yansilu:draft:")).length
    );
    const hint = await page.locator("#statusHint").textContent();
    assert.equal(draftCount, 1);
    assert.ok(String(hint || "").includes("自动保存草稿") || String(hint || "").includes("草稿"));
  }, 7000);

  const dialogMessages = [];
  page.on("dialog", async (dialog) => {
    dialogMessages.push(dialog.message());
    await dialog.accept();
  });

  await page.reload({ waitUntil: "networkidle" });
  await page.waitForFunction(() => document.querySelector("#editorBody")?.value?.includes("Recovered draft line."));

  assert.ok(dialogMessages.some((message) => String(message || "").includes("草稿") || String(message || "").includes("恢复")), JSON.stringify(dialogMessages));
  const restored = await page.locator("#editorBody").inputValue();
  assert.match(restored, /Recovered draft line\./);

  await page.locator("#btnSave").click();
  await waitFor(async () => {
    const draftCount = await page.evaluate(() =>
      Object.keys(window.localStorage).filter((key) => key.startsWith("yansilu:draft:")).length
    );
    assert.equal(draftCount, 0);
  }, 10000);
});

test("prototype tag click searches SQLite beyond the loaded directory", async (t) => {
  if (process.env.RUN_BROWSER_E2E !== "1") {
    t.skip("Set RUN_BROWSER_E2E=1 to enable browser e2e in local runs.");
    return;
  }

  const playwright = await optionalPlaywright(t);
  if (!playwright) return;

  const stack = await startPrototypeStack(t, playwright);
  if (!stack) return;
  const { apiBase, page, vaultPath } = stack;

  const siblingDir = await postJson(apiBase, "/api/v1/directories", {
    title: "SQLite Tag Sibling",
    parentDirectoryId: "dir_original_default",
    directoryType: "custom",
    fsPath: path.join(vaultPath, "notes", "original", "sqlite-tag-sibling"),
    maxNotes: 500
  });
  assert.equal(siblingDir.status, 201, JSON.stringify(siblingDir.json));

  const sourceNote = await postJson(apiBase, "/api/v1/notes", {
    directoryId: "dir_original_default",
    body: "# Tag source\n\nClick #sharedtag to search through SQLite."
  });
  assert.equal(sourceNote.status, 201, JSON.stringify(sourceNote.json));

  const hiddenSiblingNote = await postJson(apiBase, "/api/v1/notes", {
    directoryId: siblingDir.json.item.id,
    body: "# Hidden sibling result\n\nThis note is outside the loaded directory but has #sharedtag."
  });
  assert.equal(hiddenSiblingNote.status, 201, JSON.stringify(hiddenSiblingNote.json));

  await page.reload({ waitUntil: "networkidle" });
  await page.locator('.explorer-item[data-kind="file"]', { hasText: "Tag source" }).click();
  await page.waitForFunction(() => document.querySelector("#editorBody")?.value?.includes("#sharedtag"));

  await page.locator("#editorBody").evaluate((el) => {
    const index = el.value.indexOf("#sharedtag");
    el.focus();
    el.selectionStart = index + 2;
    el.selectionEnd = index + 2;
    el.dispatchEvent(new MouseEvent("click", { bubbles: true, ctrlKey: true }));
  });

  await waitFor(async () => {
    const related = await page.locator("#resultArea").textContent();
    assert.match(related || "", /Hidden sibling result/);
  }, 7000);

  const resultText = await page.locator("#resultArea").textContent();
  assert.ok(String(resultText || "").includes("标签") && String(resultText || "").includes("#sharedtag"));
  const siblingNote = await fetchJson(apiBase, `/api/v1/notes/${encodeURIComponent(hiddenSiblingNote.json.item.id)}`);
  assert.equal(siblingNote.status, 200);
});

test("prototype editor inline tag picker inserts SQLite-backed tag suggestion", async (t) => {
  if (process.env.RUN_BROWSER_E2E !== "1") {
    t.skip("Set RUN_BROWSER_E2E=1 to enable browser e2e in local runs.");
    return;
  }

  const playwright = await optionalPlaywright(t);
  if (!playwright) return;

  const stack = await startPrototypeStack(t, playwright);
  if (!stack) return;
  const { apiBase, page, vaultPath, webBase } = stack;

  const siblingDir = await postJson(apiBase, "/api/v1/directories", {
    title: "Tag Suggestion Sibling",
    parentDirectoryId: "dir_original_default",
    directoryType: "custom",
    fsPath: path.join(vaultPath, "notes", "original", "tag-suggestion-sibling"),
    maxNotes: 500
  });
  assert.equal(siblingDir.status, 201, JSON.stringify(siblingDir.json));

  const taggedNote = await postJson(apiBase, "/api/v1/notes", {
    directoryId: siblingDir.json.item.id,
    body: "# Tagged sibling\n\nThis note contributes #writingflow to tag suggestions."
  });
  assert.equal(taggedNote.status, 201, JSON.stringify(taggedNote.json));

  const sourceNote = await postJson(apiBase, "/api/v1/notes", {
    directoryId: "dir_original_default",
    body: "# Tag picker source\n\nStart a new tag below."
  });
  assert.equal(sourceNote.status, 201, JSON.stringify(sourceNote.json));

  await page.goto(`${webBase}/prototype`, { waitUntil: "networkidle" });
  await page.locator('.explorer-item[data-kind="file"]', { hasText: "Tag picker source" }).click();
  await page.waitForSelector("#editorHost .cm-content");
  await focusEditorContent(page);
  await page.keyboard.press(process.platform === "darwin" ? "Meta+End" : "Control+End");
  await page.keyboard.type("\n\n#writ");

  await waitFor(async () => {
    await page.locator("#tagPicker:not(.hidden) .link-picker-item.active", { hasText: "#writingflow" }).waitFor({ timeout: 500 });
  }, 7000);

  const tagSectionText = await page.locator("#tagPicker .picker-section-label").first().textContent();
  assert.match(String(tagSectionText || ""), /最匹配|已有标签|相关标签/);

  const tagCandidateHtml = await page.locator("#tagPicker .link-picker-item.active").innerHTML();
  assert.match(tagCandidateHtml, /picker-mark/);
  assert.match(tagCandidateHtml, /picker-badge/);
  assert.match(tagCandidateHtml, /picker-meta/);

  await page.keyboard.press("Enter");
  await page.waitForFunction(() => document.querySelector("#editorBody")?.value?.includes("#writingflow"));
  const editorValue = await page.locator("#editorBody").inputValue();
  assert.match(editorValue, /#writingflow/);
});

test("prototype settings switches and initializes the active vault", async (t) => {
  if (process.env.RUN_BROWSER_E2E !== "1") {
    t.skip("Set RUN_BROWSER_E2E=1 to enable browser e2e in local runs.");
    return;
  }

  const playwright = await optionalPlaywright(t);
  if (!playwright) return;

  const stack = await startPrototypeStack(t, playwright);
  if (!stack) return;
  const { apiBase, page, vaultPath } = stack;
  const nextVaultPath = path.join(await makeTempDir("yansilu-browser-e2e-switched-vault-parent-"), "switched-vault");

  await page.locator('.rail-btn[data-module="settings"]').click();
  await waitFor(async () => {
    const currentVaultText = await page.locator("#settingsCurrentVault").textContent();
    assert.equal(path.resolve(String(currentVaultText || "").trim()), path.resolve(vaultPath));
  }, 7000);

  await page.locator("#settingsVaultPath").fill(nextVaultPath);
  await page.locator("#settingsSwitchVault").click();
  await waitFor(async () => {
    const health = await fetchJson(apiBase, "/health");
    assert.equal(health.status, 200);
    assert.equal(path.resolve(health.json.vaultPath), path.resolve(nextVaultPath));
  }, 10000);
  await waitFor(async () => {
    const currentVaultText = await page.locator("#settingsCurrentVault").textContent();
    assert.equal(path.resolve(String(currentVaultText || "").trim()), path.resolve(nextVaultPath));
  }, 7000);

  await fs.access(path.join(nextVaultPath, ".yansilu", "vault.json"));

  const health = await fetchJson(apiBase, "/health");
  assert.equal(health.status, 200);
  assert.equal(path.resolve(health.json.vaultPath), path.resolve(nextVaultPath));

  const directories = await fetchJson(apiBase, "/api/v1/directories");
  assert.equal(directories.status, 200);
  assert.ok(directories.json.items.some((item) => item.id === "dir_original_default"));
});

test("prototype settings browse vault uses picker fallback and fills the path", async (t) => {
  if (process.env.RUN_BROWSER_E2E !== "1") {
    t.skip("Set RUN_BROWSER_E2E=1 to enable browser e2e in local runs.");
    return;
  }

  const playwright = await optionalPlaywright(t);
  if (!playwright) return;

  const stack = await startPrototypeStack(t, playwright);
  if (!stack) return;
  const { page, vaultPath } = stack;
  const nextVaultPath = path.join(await makeTempDir("yansilu-browser-e2e-browse-vault-parent-"), "browsed-vault");

  await page.locator('.rail-btn[data-module="settings"]').click();
  await waitFor(async () => {
    const currentVaultText = await page.locator("#settingsCurrentVault").textContent();
    assert.equal(path.resolve(String(currentVaultText || "").trim()), path.resolve(vaultPath));
  }, 7000);

  await page.evaluate((pickedPath) => {
    window.showDirectoryPicker = undefined;
    window.__lastVaultPrompt = null;
    window.prompt = (message, defaultPath) => {
      window.__lastVaultPrompt = { message, defaultPath };
      return pickedPath;
    };
  }, nextVaultPath);

  await page.locator("#settingsBrowseVault").click();

  await waitFor(async () => {
    const selectedPath = await page.locator("#settingsVaultPath").inputValue();
    const statusText = await page.locator("#statusText").textContent();
    assert.equal(path.resolve(selectedPath), path.resolve(nextVaultPath));
    assert.match(String(statusText || ""), /已选择 Vault 路径（browser）/);
  }, 7000);

  const promptMeta = await page.evaluate(() => window.__lastVaultPrompt || null);
  assert.ok(promptMeta);
  assert.match(String(promptMeta.message || ""), /请输入目录路径/);
  assert.equal(path.resolve(String(promptMeta.defaultPath || "")), path.resolve(vaultPath));
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
    const visibleCount = await page.locator('.explorer-item[data-kind="file"]', { hasText: "Directory scoped note" }).count();
    assert.equal(visibleCount, 1);
  }, 7000);
  await page.locator('.explorer-item[data-kind="file"]', { hasText: "Directory scoped note" }).click();
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

  await openImportsModule(page);
  await page.selectOption("#importConnector", "markdown");
  await page.fill("#importPath", fixturePath);
  await page.fill("#importPayload", "");
  await page.fill("#importOptions", JSON.stringify({ detectWikilinks: true, detectAliases: true }));
  await page.click("#btnImportPreview");

  await page.waitForFunction(() => {
    const text = document.querySelector("#importResult")?.textContent || "";
    return text.includes('"stage": "preview"');
  });
  await page.locator('#importResult .result-card[data-result-stage="preview"]').waitFor();
  await page.locator("#importResult .result-candidates", { hasText: "Fixture Import Note" }).waitFor();
  await page.locator("#importResult .candidate-group", { hasText: "LiteratureNote" }).waitFor();

  const previewResultText = await page.locator("#importResult").textContent();
  assert.match(previewResultText || "", /"importRecordId":\s*"/);
  const importRecordId = await page.inputValue("#importRecordId");
  assert.ok(importRecordId.startsWith("imp_"));

  const sourceGroup = page.locator("#importResult .candidate-group").filter({
    has: page.locator(".candidate-group-title", { hasText: /^Source$/ })
  });
  const literatureGroup = page.locator("#importResult .candidate-group").filter({
    has: page.locator(".candidate-group-title", { hasText: /^LiteratureNote$/ })
  });
  await sourceGroup.waitFor();
  const sourceCheckbox = sourceGroup.locator(".candidate-checkbox").first();
  const literatureCheckbox = literatureGroup.locator(".candidate-checkbox").first();
  await expectChecked(sourceCheckbox, true);
  await expectChecked(literatureCheckbox, true);
  await literatureCheckbox.uncheck();
  await waitFor(async () => {
    const buttonText = await page.locator("#btnImportConfirm").textContent();
    assert.match(buttonText || "", /1\/2/);
  }, 7000);

  await page.click("#btnImportConfirm");
  await page.waitForFunction(() => {
    const text = document.querySelector("#importResult")?.textContent || "";
    return text.includes('"stage": "confirm"') && text.includes('"status": "completed"');
  });
  await page.locator('#importResult .result-card[data-result-stage="confirm"]').waitFor();

  const confirmResultText = await page.locator("#importResult").textContent();
  assert.match(confirmResultText || "", /"sources":\s*1/);
  assert.match(confirmResultText || "", /"literatureNotes":\s*0/);
  assert.match(confirmResultText || "", /"selectedCandidates":\s*1/);
  assert.match(confirmResultText || "", /"notes\/sources"/);
  await page.locator("#importResult .candidate-summary-title", { hasText: "未写入候选" }).waitFor();
  await page.locator("#importResult .candidate-summary-item", { hasText: "Fixture Import Note" }).waitFor();
  await page.locator('#importResult [data-skip-focus="unselected"]').click();
  await page.locator("#importResult .candidate-focus-banner", { hasText: "未勾选跳过" }).waitFor();
  await page.locator("#importResult .candidate-item.is-focused", { hasText: "Fixture Import Note" }).waitFor();
  await page.locator("#importResult .candidate-inline-note", { hasText: "确认前取消勾选" }).waitFor();
  const sourceConfirmGroup = page.locator("#importResult .candidate-group").filter({
    has: page.locator(".candidate-group-title", { hasText: /^Source$/ })
  });
  await sourceConfirmGroup.locator(".candidate-item.is-muted").waitFor();
  await page.locator('#importResult [data-clear-candidate-focus="1"]').click();
  await page.waitForFunction(() => !document.querySelector("#importResult .candidate-focus-banner"));
  await page.waitForFunction(() => !document.querySelector("#importResult .candidate-item.is-focused"));

  const importedLiteratureNotes = await fetchJson(apiBase, "/api/v1/directories/dir_literature_default/notes");
  assert.equal(importedLiteratureNotes.status, 200);
  assert.equal(importedLiteratureNotes.json.total, 0);

  await page.click("#btnImportRollback");
  await page.waitForFunction(() => {
    const text = document.querySelector("#importResult")?.textContent || "";
    return text.includes('"stage": "rollback"') && text.includes('"status": "rolled_back"');
  });
  await page.locator('#importResult .result-card[data-result-stage="rollback"]').waitFor();

  const rollbackResultText = await page.locator("#importResult").textContent();
  assert.match(rollbackResultText || "", /"status":\s*"rolled_back"/);

  const literatureNotesAfterRollback = await waitFor(async () => {
    const result = await fetchJson(apiBase, "/api/v1/directories/dir_literature_default/notes");
    assert.equal(result.status, 200);
    assert.equal(result.json.total, 0);
    return result;
  }, 7000);
  assert.equal(literatureNotesAfterRollback.json.total, 0);
});

test("prototype import history filters records and supports inline actions", async (t) => {
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

  await openImportsModule(page);
  await page.selectOption("#importConnector", "markdown");
  await page.fill("#importPath", fixturePath);
  await page.fill("#importPayload", "");
  await page.fill("#importOptions", JSON.stringify({ detectWikilinks: true, detectAliases: true }));
  await page.click("#btnImportPreview");

  await page.waitForFunction(() => {
    const text = document.querySelector("#importResult")?.textContent || "";
    return text.includes('"stage": "preview"');
  });

  const importRecordId = await page.inputValue("#importRecordId");
  assert.ok(importRecordId.startsWith("imp_"));

  await waitFor(async () => {
    const item = page.locator(`.import-history-item[data-import-history-id="${importRecordId}"]`);
    await item.waitFor({ timeout: 500 });
    const text = await item.textContent();
    assert.match(text || "", /预览/);
  }, 7000);

  await page.selectOption("#importHistoryStatus", "preview");
  await page.selectOption("#importHistoryConnector", "markdown");
  await page.locator(`.import-history-item[data-import-history-id="${importRecordId}"]`).waitFor();
  await page.waitForFunction(
    (recordId) => {
      const item = document.querySelector(`.import-history-item[data-import-history-id="${recordId}"]`);
      return Boolean(item && /预览/.test(item.textContent || ""));
    },
    importRecordId
  );

  await page.locator(`.import-history-item[data-import-history-id="${importRecordId}"] [data-import-history-action="load"]`).click();
  await page.waitForFunction(
    (recordId) => {
      const input = document.querySelector("#importRecordId");
      const result = document.querySelector("#importResult")?.textContent || "";
      return input?.value === recordId && result.includes('"stage": "record"') && result.includes('"status": "preview"');
    },
    importRecordId
  );

  await page.click("#btnImportConfirm");
  await page.waitForFunction(() => {
    const text = document.querySelector("#importResult")?.textContent || "";
    return text.includes('"stage": "confirm"') && text.includes('"status": "completed"');
  });

  await page.waitForFunction(() => {
    const text = document.querySelector("#importHistory")?.textContent || "";
    return text.includes("当前筛选条件下没有导入记录");
  });

  await page.selectOption("#importHistoryStatus", "completed");
  await page.locator(`.import-history-item[data-import-history-id="${importRecordId}"]`).waitFor();
  await page.waitForFunction(
    (recordId) => {
      const item = document.querySelector(`.import-history-item[data-import-history-id="${recordId}"]`);
      const text = item?.textContent || "";
      return Boolean(
        item &&
          /已写入/.test(text) &&
          /已创建 S1 · L1 · P0/.test(text) &&
          /写入 notes\/sources/.test(text) &&
          item.querySelector('[data-import-history-action="rollback"]')
      );
    },
    importRecordId
  );

  await page.locator(`.import-history-item[data-import-history-id="${importRecordId}"] [data-import-history-action="rollback"]`).click();
  await page.waitForFunction(() => {
    const text = document.querySelector("#importResult")?.textContent || "";
    return text.includes('"stage": "rollback"') && text.includes('"status": "rolled_back"');
  });

  await page.waitForFunction(() => {
    const text = document.querySelector("#importHistory")?.textContent || "";
    return text.includes("当前筛选条件下没有导入记录");
  });

  await page.selectOption("#importHistoryStatus", "rolled_back");
  await page.locator(`.import-history-item[data-import-history-id="${importRecordId}"]`).waitFor();
  await page.waitForFunction(
    (recordId) => {
      const item = document.querySelector(`.import-history-item[data-import-history-id="${recordId}"]`);
      const text = item?.textContent || "";
      return Boolean(
        item &&
          /已回滚/.test(text) &&
          /已回滚 2 项/.test(text) &&
          /跳过 0 项/.test(text) &&
          item.querySelector('[data-import-history-action="load"]')
      );
    },
    importRecordId
  );

  const notesAfterRollback = await waitFor(async () => {
    const result = await fetchJson(apiBase, "/api/v1/directories/dir_literature_default/notes");
    assert.equal(result.status, 200);
    assert.equal(result.json.total, 0);
    return result;
  }, 7000);
  assert.equal(notesAfterRollback.json.total, 0);
});

test("prototype import history highlights modified files skipped during rollback", async (t) => {
  if (process.env.RUN_BROWSER_E2E !== "1") {
    t.skip("Set RUN_BROWSER_E2E=1 to enable browser e2e in local runs.");
    return;
  }

  const playwright = await optionalPlaywright(t);
  if (!playwright) return;

  const stack = await startPrototypeStack(t, playwright);
  if (!stack) return;
  const { apiBase, page, vaultPath } = stack;

  const fixturePath = path.join(REPO_ROOT, "tests", "fixtures", "imports", "markdown-basic");

  await openImportsModule(page);
  await page.selectOption("#importConnector", "markdown");
  await page.fill("#importPath", fixturePath);
  await page.fill("#importPayload", "");
  await page.fill("#importOptions", "");
  await page.click("#btnImportPreview");

  await page.waitForFunction(() => {
    const text = document.querySelector("#importResult")?.textContent || "";
    return text.includes('"stage": "preview"');
  });

  const importRecordId = await page.inputValue("#importRecordId");
  assert.ok(importRecordId.startsWith("imp_"));

  await page.click("#btnImportConfirm");
  await page.waitForFunction(() => {
    const text = document.querySelector("#importResult")?.textContent || "";
    return text.includes('"stage": "confirm"') && text.includes('"status": "completed"');
  });

  const literatureNotes = await waitFor(async () => {
    const result = await fetchJson(apiBase, "/api/v1/directories/dir_literature_default/notes");
    assert.equal(result.status, 200);
    assert.equal(result.json.total, 1);
    return result;
  }, 7000);
  const markdownPath = path.join(vaultPath, literatureNotes.json.items[0].markdownPath.replaceAll("/", path.sep));
  await fs.appendFile(markdownPath, "\n\nUser edit after import.", "utf8");

  await page.selectOption("#importHistoryStatus", "completed");
  await page.locator(`.import-history-item[data-import-history-id="${importRecordId}"] [data-import-history-action="rollback"]`).click();
  await page.waitForFunction(() => {
    const text = document.querySelector("#importResult")?.textContent || "";
    return text.includes('"stage": "rollback"') && text.includes('"status": "rolled_back"') && text.includes('"reason": "modified"');
  });

  await page.selectOption("#importHistoryStatus", "rolled_back");
  await page.selectOption("#importHistoryRisk", "modified");
  await page.waitForFunction(
    (recordId) => {
      const item = document.querySelector(`.import-history-item[data-import-history-id="${recordId}"]`);
      const text = item?.textContent || "";
      return Boolean(
        item &&
          /已回滚 1 项/.test(text) &&
          /跳过 1 项/.test(text) &&
          /Modified 1/.test(text) &&
          /已被修改而保留/.test(text)
      );
    },
    importRecordId
  );

  await fs.access(markdownPath);
});

test("prototype import panel explains conflicted candidates after repeated confirm", async (t) => {
  if (process.env.RUN_BROWSER_E2E !== "1") {
    t.skip("Set RUN_BROWSER_E2E=1 to enable browser e2e in local runs.");
    return;
  }

  const playwright = await optionalPlaywright(t);
  if (!playwright) return;

  const stack = await startPrototypeStack(t, playwright);
  if (!stack) return;
  const { page } = stack;
  const fixturePath = path.join(REPO_ROOT, "tests", "fixtures", "imports", "markdown-basic");

  await openImportsModule(page);
  await page.selectOption("#importConnector", "markdown");
  await page.fill("#importPath", fixturePath);
  await page.fill("#importPayload", "");
  await page.fill("#importOptions", "");
  await page.click("#btnImportPreview");

  await page.waitForFunction(() => {
    const text = document.querySelector("#importResult")?.textContent || "";
    return text.includes('"stage": "preview"');
  });

  await page.click("#btnImportConfirm");
  await page.waitForFunction(() => {
    const text = document.querySelector("#importResult")?.textContent || "";
    return text.includes('"stage": "confirm"') && text.includes('"status": "completed"');
  });

  await page.click("#btnImportPreview");
  await page.waitForFunction(() => {
    const text = document.querySelector("#importResult")?.textContent || "";
    return text.includes('"stage": "preview"');
  });

  await page.click("#btnImportConfirm");
  await page.waitForFunction(() => {
    const text = document.querySelector("#importResult")?.textContent || "";
    return text.includes('"stage": "confirm"') && text.includes('"conflicted": 2');
  });

  await page.locator('#importResult [data-skip-focus="conflicted"]').click();
  await page.locator("#importResult .candidate-focus-banner", { hasText: "文件冲突跳过" }).waitFor();
  await page.locator("#importResult .candidate-item.is-focused .candidate-inline-note", { hasText: "目标路径已有同名文件" }).first().waitFor();
});

test("prototype import confirm can send created permanent notes into writing basket and open writing panel", async (t) => {
  if (process.env.RUN_BROWSER_E2E !== "1") {
    t.skip("Set RUN_BROWSER_E2E=1 to enable browser e2e in local runs.");
    return;
  }

  const playwright = await optionalPlaywright(t);
  if (!playwright) return;

  const stack = await startPrototypeStack(t, playwright);
  if (!stack) return;
  const { page, webBase, vaultPath } = stack;
  const recordId = "imp_browser_writing_seed";
  const createdAt = new Date().toISOString();

  await fs.mkdir(path.join(vaultPath, "imports", "markdown"), { recursive: true });
  await fs.writeFile(
    path.join(vaultPath, "imports", "markdown", `${recordId}.preview.json`),
    JSON.stringify(
      {
        requestId: "browser_writing_seed",
        payload: {},
        options: {},
        preview: {
          importRecordId: recordId,
          connector: "markdown",
          status: "preview",
          state: "preview",
          summary: { sources: 0, literatureNotes: 0, permanentNotes: 1, warnings: 0 },
          samples: {
            sourceIds: [],
            literatureNoteIds: [],
            permanentNoteIds: ["pn_browser_writing_seed"]
          },
          warnings: [],
          originalityGuard: {
            plan: {
              warnThreshold: 0.6,
              blockThreshold: 0.8,
              requireCitationLocator: true,
              allowDraftOnWarning: true,
              blockOnBlocked: true
            },
            flaggedPermanentIds: [],
            evaluations: [
              {
                permanentId: "pn_browser_writing_seed",
                similarity: 0.21,
                status: "pass",
                reasons: []
              }
            ]
          },
          createdAt,
          updatedAt: createdAt,
          payload: {},
          options: {}
        },
        candidates: {
          sources: [],
          literature: [],
          permanent: [
            {
              id: "pn_browser_writing_seed",
              title: "Imported Writing Seed",
              core_claim: "A stable imported permanent note that should seed the writing basket.",
              rationale: "",
              from_literature_note_ids: [],
              authorship: { user_confirmed: true, ai_assisted: false },
              originality_status: "pass",
              status: "active",
              tags: ["permanent", "writing"],
              citations: [],
              created_at: createdAt,
              updated_at: createdAt,
              connector: "markdown",
              candidate_only: true
            }
          ],
          warnings: []
        }
      },
      null,
      2
    ),
    "utf8"
  );

  await page.goto(`${webBase}/prototype`, { waitUntil: "networkidle" });
  await openImportsModule(page);
  await page.fill("#importRecordId", recordId);
  await page.click("#btnImportRefresh");
  await page.waitForFunction(() => {
    const text = document.querySelector("#importResult")?.textContent || "";
    return text.includes('"stage": "record"') && text.includes("Imported Writing Seed");
  });

  await page.click("#btnImportConfirm");
  await page.locator('#importResult .result-card[data-result-stage="confirm"]').waitFor();
  await page.locator('[data-import-writing-action="add-permanent-notes-open-writing"]').waitFor();
  await page.locator('[data-import-writing-action="add-permanent-notes-open-writing"]').click();
  await page.waitForFunction(() => {
    const text = document.querySelector("#writingBasketSummary")?.textContent || "";
    return text.includes("已加入 1 条原创笔记");
  });
  await page.locator('.rail-btn[data-module="writing"].active').waitFor();

  const basketText = await page.locator("#writingBasketList").textContent();
  assert.match(basketText || "", /Imported Writing Seed/);
  const titleValue = await page.inputValue("#writingTitle");
  assert.match(titleValue || "", /Imported Writing Seed/);
});

test("prototype import confirm can create a writing project from created permanent notes", async (t) => {
  if (process.env.RUN_BROWSER_E2E !== "1") {
    t.skip("Set RUN_BROWSER_E2E=1 to enable browser e2e in local runs.");
    return;
  }

  const playwright = await optionalPlaywright(t);
  if (!playwright) return;

  const stack = await startPrototypeStack(t, playwright);
  if (!stack) return;
  const { page, webBase, vaultPath } = stack;
  const recordId = "imp_browser_create_project";
  const createdAt = new Date().toISOString();

  await fs.mkdir(path.join(vaultPath, "imports", "markdown"), { recursive: true });
  await fs.writeFile(
    path.join(vaultPath, "imports", "markdown", `${recordId}.preview.json`),
    JSON.stringify(
      {
        requestId: "browser_create_project",
        payload: {},
        options: {},
        preview: {
          importRecordId: recordId,
          connector: "markdown",
          status: "preview",
          state: "preview",
          summary: { sources: 0, literatureNotes: 0, permanentNotes: 1, warnings: 0 },
          samples: {
            sourceIds: [],
            literatureNoteIds: [],
            permanentNoteIds: ["pn_browser_create_project"]
          },
          warnings: [],
          originalityGuard: {
            plan: {
              warnThreshold: 0.6,
              blockThreshold: 0.8,
              requireCitationLocator: true,
              allowDraftOnWarning: true,
              blockOnBlocked: true
            },
            flaggedPermanentIds: [],
            evaluations: [
              {
                permanentId: "pn_browser_create_project",
                similarity: 0.19,
                status: "pass",
                reasons: []
              }
            ]
          },
          createdAt,
          updatedAt: createdAt,
          payload: {},
          options: {}
        },
        candidates: {
          sources: [],
          literature: [],
          permanent: [
            {
              id: "pn_browser_create_project",
              title: "Imported Project Seed",
              core_claim: "An imported permanent note ready to become a writing project seed.",
              rationale: "",
              from_literature_note_ids: [],
              authorship: { user_confirmed: true, ai_assisted: false },
              originality_status: "pass",
              status: "active",
              tags: ["permanent", "project"],
              citations: [],
              created_at: createdAt,
              updated_at: createdAt,
              connector: "markdown",
              candidate_only: true
            }
          ],
          warnings: []
        }
      },
      null,
      2
    ),
    "utf8"
  );

  await page.goto(`${webBase}/prototype`, { waitUntil: "networkidle" });
  await openImportsModule(page);
  await page.fill("#importRecordId", recordId);
  await page.click("#btnImportRefresh");
  await page.waitForFunction(() => {
    const text = document.querySelector("#importResult")?.textContent || "";
    return text.includes('"stage": "record"') && text.includes("Imported Project Seed");
  });

  await page.click("#btnImportConfirm");
  await page.locator('#importResult .result-card[data-result-stage="confirm"]').waitFor();
  await page.locator('[data-import-writing-action="create-writing-project"]').click();

  await page.locator('.rail-btn[data-module="writing"].active').waitFor();
  await page.waitForFunction(() => {
    const text = document.querySelector("#writingResult")?.textContent || "";
    return text.includes('"stage": "writing_project"') && text.includes('"writingProjectId": "wp_');
  });
  await page.waitForFunction(() => {
    const text = document.querySelector("#writingBasketSummary")?.textContent || "";
    return text.includes("当前项目：wp_") && text.includes("已加入 1 条原创笔记");
  });

  const basketText = await page.locator("#writingBasketList").textContent();
  assert.match(basketText || "", /Imported Project Seed/);
  const titleValue = await page.inputValue("#writingTitle");
  assert.match(titleValue || "", /Imported Project Seed/);
});

test("prototype import panel renders actionable warning hints", async (t) => {
  if (process.env.RUN_BROWSER_E2E !== "1") {
    t.skip("Set RUN_BROWSER_E2E=1 to enable browser e2e in local runs.");
    return;
  }

  const playwright = await optionalPlaywright(t);
  if (!playwright) return;

  const stack = await startPrototypeStack(t, playwright);
  if (!stack) return;
  const { page } = stack;

  const fixturePath = path.join(REPO_ROOT, "tests", "fixtures", "imports", "malformed", "readwise-highlights-not-array.json");
  const payload = await fs.readFile(fixturePath, "utf8");

  await openImportsModule(page);
  await page.selectOption("#importConnector", "readwise");
  await page.fill("#importPath", "");
  await page.fill("#importPayload", payload);
  await page.click("#btnImportPreview");

  await page.waitForFunction(() => {
    const text = document.querySelector("#importResult")?.textContent || "";
    return text.includes('"stage": "preview"') && text.includes("IMPORT_EMPTY_PAYLOAD");
  });

  await page.locator("#importResult .result-warnings", { hasText: "IMPORT_EMPTY_PAYLOAD" }).waitFor();
  await page.locator("#importResult .result-actions", { hasText: "Payload JSON" }).waitFor();
});

test("prototype import panel can focus blocked and excluded candidates", async (t) => {
  if (process.env.RUN_BROWSER_E2E !== "1") {
    t.skip("Set RUN_BROWSER_E2E=1 to enable browser e2e in local runs.");
    return;
  }

  const playwright = await optionalPlaywright(t);
  if (!playwright) return;

  const stack = await startPrototypeStack(t, playwright);
  if (!stack) return;
  const { page } = stack;

  const sourceDir = await makeTempDir("yansilu-browser-blocked-import-");
  await fs.writeFile(
    path.join(sourceDir, "blocked.md"),
    [
      "---",
      "title: Blocked candidate note",
      "type: permanent",
      'tags: ["permanent", "blocked"]',
      "---",
      "",
      "A copied claim that should be flagged."
    ].join("\n"),
    "utf8"
  );

  await openImportsModule(page);
  await page.selectOption("#importConnector", "markdown");
  await page.fill("#importPath", sourceDir);
  await page.fill("#importPayload", "");
  await page.fill("#importOptions", "");
  await page.click("#btnImportPreview");

  await page.waitForFunction(() => {
    const text = document.querySelector("#importResult")?.textContent || "";
    return text.includes('"stage": "preview"') && text.includes('"blocked"');
  });

  await page.locator('#importResult .result-card[data-result-stage="preview"]').waitFor();
  const importRecordId = await page.inputValue("#importRecordId");
  assert.ok(importRecordId.startsWith("imp_"));
  await page.selectOption("#importHistoryStatus", "preview");
  await page.selectOption("#importHistoryConnector", "markdown");
  await page.selectOption("#importHistoryRisk", "blocked");
  await page.waitForFunction(
    (recordId) => {
      const item = document.querySelector(`.import-history-item[data-import-history-id="${recordId}"]`);
      const text = item?.textContent || "";
      return Boolean(item && /Blocked 1/.test(text));
    },
    importRecordId
  );
  await page.locator('[data-candidate-filter="blocked"]', { hasText: "Blocked 1" }).click();
  await page.locator("#importResult .candidate-item.tone-blocked", { hasText: "Blocked candidate note" }).waitFor();
  await page.locator("#importResult .candidate-reason").first().waitFor();

  const blockedCheckbox = page.locator("#importResult .candidate-item.tone-blocked .candidate-checkbox").first();
  await blockedCheckbox.uncheck();
  await page.locator("#importResult .candidate-summary.candidate-summary-warn").waitFor();

  await page.locator("[data-candidate-filter=\"excluded\"]").click();
  await page.locator("#importResult .candidate-inline-note").waitFor();
  await page.locator("[data-candidate-filter=\"excluded\"].is-filter-active").waitFor();

  await page.locator("[data-candidate-action=\"all\"]").click();
  await page.locator("#btnImportConfirm", { hasText: "3/3" }).waitFor();
  await page.locator("[data-candidate-action=\"exclude-blocked\"]").click();
  await page.locator("#btnImportConfirm", { hasText: "2/3" }).waitFor();
  const blockedAfterExclude = page.locator("#importResult .candidate-item.tone-blocked .candidate-checkbox").first();
  await expectChecked(blockedAfterExclude, false);

  await page.locator("[data-candidate-action=\"safe\"]").click();
  await page.locator("#btnImportConfirm", { hasText: "2/3" }).waitFor();
  await page.locator("[data-candidate-filter=\"safe\"]").click();
  await page.locator("[data-candidate-filter=\"safe\"].is-filter-active").waitFor();
});

test("prototype import panel can exclude warning candidates with one action", async (t) => {
  if (process.env.RUN_BROWSER_E2E !== "1") {
    t.skip("Set RUN_BROWSER_E2E=1 to enable browser e2e in local runs.");
    return;
  }

  const playwright = await optionalPlaywright(t);
  if (!playwright) return;

  const stack = await startPrototypeStack(t, playwright);
  if (!stack) return;
  const { page, vaultPath } = stack;
  const recordId = "imp_browser_warning_fixture";
  const createdAt = new Date().toISOString();

  await fs.mkdir(path.join(vaultPath, "imports", "markdown"), { recursive: true });
  await fs.writeFile(
    path.join(vaultPath, "imports", "markdown", `${recordId}.preview.json`),
    JSON.stringify(
      {
        requestId: "browser_warning_fixture",
        payload: {},
        options: {},
        preview: {
          importRecordId: recordId,
          connector: "markdown",
          status: "preview",
          state: "preview",
          summary: { sources: 1, literatureNotes: 1, permanentNotes: 2, warnings: 2 },
          samples: {
            sourceIds: ["src_warning_browser"],
            literatureNoteIds: ["ln_warning_browser"],
            permanentNoteIds: ["pn_warning_browser", "pn_blocked_browser"]
          },
          warnings: [{ code: "ORIGINALITY_GUARD_WARNING", message: "Some permanent note candidates require manual review.", count: 2 }],
          originalityGuard: {
            plan: {
              warnThreshold: 0.6,
              blockThreshold: 0.8,
              requireCitationLocator: true,
              allowDraftOnWarning: true,
              blockOnBlocked: true
            },
            flaggedPermanentIds: ["pn_blocked_browser"],
            evaluations: [
              {
                permanentId: "pn_warning_browser",
                similarity: 0,
                status: "warning",
                reasons: ["citation_locator_missing"],
                sourceId: "src_warning_browser"
              },
              {
                permanentId: "pn_blocked_browser",
                similarity: 0.91,
                status: "blocked",
                reasons: ["similarity_above_block_threshold"],
                sourceId: "src_warning_browser"
              }
            ]
          },
          createdAt,
          updatedAt: createdAt,
          payload: {},
          options: {}
        },
        candidates: {
          sources: [
            {
              id: "src_warning_browser",
              title: "Warning source",
              description: "Fixture source for browser warning preview."
            }
          ],
          literature: [
            {
              id: "ln_warning_browser",
              source_id: "src_warning_browser",
              title: "Warning literature",
              quote_text: "A reading note that remains distinct from the permanent claim.",
              paraphrase_text: "",
              status: "draft",
              tags: ["warning"]
            }
          ],
          permanent: [
            {
              id: "pn_warning_browser",
              title: "Warning candidate note",
              core_claim: "A distinct claim that should only be warned for missing locator.",
              rationale: "",
              from_literature_note_ids: ["ln_warning_browser"],
              authorship: { user_confirmed: false, ai_assisted: false },
              originality_status: "warning",
              status: "draft",
              tags: ["permanent", "warning"],
              citations: [{ source_id: "src_warning_browser" }],
              created_at: createdAt,
              updated_at: createdAt,
              connector: "markdown",
              candidate_only: true
            },
            {
              id: "pn_blocked_browser",
              title: "Blocked browser candidate",
              core_claim: "A claim copied too closely from the source material.",
              rationale: "",
              from_literature_note_ids: ["ln_warning_browser"],
              authorship: { user_confirmed: false, ai_assisted: false },
              originality_status: "blocked",
              status: "draft",
              tags: ["permanent", "blocked"],
              citations: [{ source_id: "src_warning_browser", locator: "p. 11" }],
              created_at: createdAt,
              updated_at: createdAt,
              connector: "markdown",
              candidate_only: true
            }
          ],
          warnings: []
        }
      },
      null,
      2
    ),
    "utf8"
  );

  await openImportsModule(page);
  await page.fill("#importRecordId", recordId);
  await page.click("#btnImportRefresh");

  await page.waitForFunction(() => {
    const text = document.querySelector("#importResult")?.textContent || "";
    return text.includes('"stage": "record"') && text.includes('"status": "preview"');
  });

  await page.locator('#importResult .result-card[data-result-stage="record"]').waitFor();
  await page.waitForFunction(
    (importId) => {
      const item = document.querySelector(`.import-history-item[data-import-history-id="${importId}"]`);
      const text = item?.textContent || "";
      return Boolean(
        item &&
          /Warning 2/.test(text) &&
          /Blocked 1/.test(text) &&
          /候选 1 Source · 1 Literature · 2 Permanent/.test(text) &&
          /需人工检查：warning 2 · originality warning 1 · blocked 1/.test(text)
      );
    },
    recordId
  );
  await page.locator('[data-candidate-filter="warning"]').click();
  await page.locator("#importResult .candidate-item.tone-warning", { hasText: "Warning candidate note" }).waitFor();

  await page.locator("[data-candidate-action=\"exclude-warning\"]").click();
  await page.locator("#btnImportConfirm", { hasText: "3/4" }).waitFor();
  const warningCheckbox = page.locator("#importResult .candidate-item.tone-warning .candidate-checkbox").first();
  await expectChecked(warningCheckbox, false);

  await page.locator("[data-candidate-action=\"all\"]").click();
  await page.locator("#btnImportConfirm", { hasText: "4/4" }).waitFor();
  await page.locator("[data-candidate-action=\"confirmable\"]").click();
  await page.locator("#btnImportConfirm", { hasText: "3/4" }).waitFor();
  await expectChecked(warningCheckbox, true);

  await page.locator("[data-candidate-filter=\"blocked\"]").click();
  await page.locator("[data-candidate-filter=\"blocked\"].is-filter-active").waitFor();
  const blockedCheckbox = page.locator("#importResult .candidate-item.tone-blocked .candidate-checkbox").first();
  await expectChecked(blockedCheckbox, false);

  await page.locator("[data-candidate-filter=\"confirmable\"]").click();
  await page.locator("[data-candidate-filter=\"confirmable\"].is-filter-active").waitFor();
  await page.locator("#importResult .candidate-item.tone-warning", { hasText: "Warning candidate note" }).waitFor();
  await page.waitForFunction(() => !document.querySelector("#importResult .candidate-item.tone-blocked"));

  await page.locator("[data-candidate-action=\"all\"]").click();
  await page.locator("#btnImportConfirm", { hasText: "4/4" }).waitFor();
  await page.locator("[data-candidate-filter=\"risky\"]").click();
  await page.locator("[data-candidate-filter=\"risky\"].is-filter-active").waitFor();
  await page.locator("#importResult .candidate-item.tone-warning", { hasText: "Warning candidate note" }).waitFor();
  await page.locator("[data-candidate-action=\"exclude-risky\"]").click();
  await page.locator("#btnImportConfirm", { hasText: "2/4" }).waitFor();
  await expectChecked(warningCheckbox, false);
  await expectChecked(blockedCheckbox, false);

  await page.locator("[data-candidate-filter=\"excluded\"]").click();
  await page.locator("#importResult .candidate-item.tone-warning .candidate-inline-note").waitFor();
});

test("prototype export panel exports markdown files through real API", async (t) => {
  if (process.env.RUN_BROWSER_E2E !== "1") {
    t.skip("Set RUN_BROWSER_E2E=1 to enable browser e2e in local runs.");
    return;
  }

  const playwright = await optionalPlaywright(t);
  if (!playwright) return;

  const stack = await startPrototypeStack(t, playwright);
  if (!stack) return;
  const { apiBase, page } = stack;

  const createdNote = await postJson(apiBase, "/api/v1/notes", {
    directoryId: "dir_original_default",
    body: "# Export panel note\n\nThis note should be exported from the browser UI."
  });
  assert.equal(createdNote.status, 201);

  const exportTargetPath = await makeTempDir("yansilu-browser-export-target-");
  await openImportsModule(page);
  await page.fill("#exportTargetPath", exportTargetPath);
  await page.click("#btnExportMarkdown");

  await page.waitForFunction(() => {
    const text = document.querySelector("#exportResult")?.textContent || "";
    return text.includes('"stage": "export_markdown"') && text.includes('"copied": 1');
  });
  await page.locator('#exportResult .result-card[data-result-stage="export_markdown"]').waitFor();

  const exportResultText = await page.locator("#exportResult").textContent();
  assert.match(exportResultText || "", /"exportJobId":\s*"exp_/);
  assert.match(exportResultText || "", /"status":\s*"queued"/);

  const exportedFiles = await listMarkdownFiles(exportTargetPath);
  assert.equal(exportedFiles.length, 1, JSON.stringify(exportedFiles, null, 2));

  const exportedContent = await fs.readFile(exportedFiles[0], "utf8");
  assert.match(exportedContent, /# Export panel note/);
  assert.match(exportedContent, /exported from the browser UI/);
});

test("prototype writing panel creates project and draft scaffold through real API", async (t) => {
  if (process.env.RUN_BROWSER_E2E !== "1") {
    t.skip("Set RUN_BROWSER_E2E=1 to enable browser e2e in local runs.");
    return;
  }

  const playwright = await optionalPlaywright(t);
  if (!playwright) return;

  const stack = await startPrototypeStack(t, playwright);
  if (!stack) return;
  const { apiBase, page, webBase } = stack;

  await page.addInitScript(() => {
    window.__copiedTexts = [];
    window.__downloads = [];
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async (text) => {
          window.__copiedTexts.push(String(text || ""));
        }
      }
    });
    const originalCreateObjectUrl = URL.createObjectURL.bind(URL);
    URL.createObjectURL = (blob) => {
      window.__downloads.push({ size: blob.size, type: blob.type });
      return originalCreateObjectUrl(blob);
    };
  });

  const noteA = await postJson(apiBase, "/api/v1/notes", {
    directoryId: "dir_original_default",
    status: "active",
    body: "# Writing UI claim\n\nThe writing panel should start from permanent notes."
  });
  assert.equal(noteA.status, 201, JSON.stringify(noteA.json));

  const noteB = await postJson(apiBase, "/api/v1/notes", {
    directoryId: "dir_original_default",
    status: "active",
    body: "# Evidence UI map\n\nThe scaffold should retain an evidence map."
  });
  assert.equal(noteB.status, 201, JSON.stringify(noteB.json));

  await page.goto(`${webBase}/prototype`, { waitUntil: "networkidle" });
  await page.locator('.rail-btn[data-module="writing"]').click();
  await page.fill("#writingTitle", "Writing UI Project");
  await page.fill("#writingGoal", "Turn two permanent notes into a browser-generated scaffold.");
  await page.fill("#writingAudience", "Researchers");
  await page.fill("#writingTone", "clear");
  await page.click("#btnWritingAddVisible");
  await page.waitForFunction(() => {
    const text = document.querySelector("#writingBasketSummary")?.textContent || "";
    return text.includes("已加入 2 条原创笔记");
  });

  const basketText = await page.locator("#writingBasketList").textContent();
  assert.match(basketText || "", /Writing UI claim/);
  assert.match(basketText || "", /Evidence UI map/);

  await page.click("#btnWritingCreateProject");

  await page.waitForFunction(() => {
    const text = document.querySelector("#writingResult")?.textContent || "";
    return text.includes('"stage": "writing_project"') && text.includes('"writingProjectId": "wp_');
  });
  await page.locator('#writingResult .result-card[data-result-stage="writing_project"]').waitFor();

  const projectResultText = await page.locator("#writingResult").textContent();
  assert.match(projectResultText || "", /Writing UI Project/);
  assert.match(projectResultText || "", /Writing UI claim/);
  assert.match(projectResultText || "", /Evidence UI map/);

  await page.click("#btnWritingCreateScaffold");
  await page.waitForFunction(() => {
    const text = document.querySelector("#writingScaffoldPreview")?.textContent || "";
    return text.includes("Scaffold") && text.includes("Paragraph-Evidence Map");
  });
  await page.locator('#writingResult .result-card[data-result-stage="draft_scaffold"]').waitFor();

  const scaffoldResultText = await page.locator("#writingResult").textContent();
  assert.match(scaffoldResultText || "", /"draftScaffoldId":\s*"ds_/);
  assert.match(scaffoldResultText || "", /Writing UI claim/);
  assert.match(scaffoldResultText || "", /Evidence UI map/);

  const scaffoldPreviewText = await page.locator("#writingScaffoldPreview").textContent();
  assert.match(scaffoldPreviewText || "", /Opening frame/);
  assert.match(scaffoldPreviewText || "", /Paragraph-Evidence Map/);

  await page.click("#btnWritingCopyScaffold");
  await page.waitForFunction(() => {
    const text = document.querySelector("#writingResult")?.textContent || "";
    return text.includes("writing_copy_scaffold");
  });
  const copiedTexts = await page.evaluate(() => window.__copiedTexts || []);
  assert.ok(copiedTexts.length >= 1);
  assert.match(copiedTexts.at(-1), /Paragraph-Evidence Map/);

  await page.click("#btnWritingExportScaffold");
  await page.waitForFunction(() => {
    const text = document.querySelector("#writingResult")?.textContent || "";
    return text.includes("writing_export_scaffold");
  });
  const exportMeta = await page.evaluate(() => window.__lastWritingExport__ || null);
  assert.ok(exportMeta);
  assert.match(exportMeta.fileName || "", /Writing UI Project_scaffold\.md/);

  const firstScaffoldCardId = await page.locator('#writingScaffoldVersionsList [data-writing-scaffold-id]').first().getAttribute("data-writing-scaffold-id");
  await page.click("#btnWritingCreateScaffold");
  await page.waitForFunction((firstId) => {
    const cards = [...document.querySelectorAll("#writingScaffoldVersionsList [data-writing-scaffold-id]")];
    return cards.length >= 2 && cards.some((card) => card.getAttribute("data-writing-scaffold-id") !== firstId);
  }, firstScaffoldCardId);

  const scaffoldVersionText = await page.locator("#writingScaffoldVersionsList").textContent();
  assert.match(scaffoldVersionText || "", /ds_/);

  await page.locator('#writingScaffoldVersionsList [data-writing-scaffold-action="open"]').nth(1).click();
  await page.waitForFunction((firstId) => {
    const summary = document.querySelector("#writingScaffoldPreview")?.textContent || "";
    return summary.includes(firstId);
  }, firstScaffoldCardId);

  await page.click("#btnWritingSaveDraft");
  await page.waitForFunction(() => {
    const text = document.querySelector("#statusText")?.textContent || "";
    return text.includes("已创建草稿笔记");
  });

  const draftVersionsTextV1 = await page.locator("#writingDraftVersionsList").textContent();
  assert.match(draftVersionsTextV1 || "", /v1/);
  assert.match(draftVersionsTextV1 || "", /当前草稿/);

  const activeModule = await page.locator('.rail-btn[data-module="explorer"]').getAttribute("class");
  assert.match(activeModule || "", /active/);

  const editorValue = await page.locator("#editorBody").inputValue();
  assert.match(editorValue, /# Writing UI Project 草稿/);
  assert.match(editorValue, /DraftScaffold: ds_/);

  await page.locator('.rail-btn[data-module="writing"]').click();
  await page.waitForFunction(() => {
    const text = document.querySelector("#writingBasketSummary")?.textContent || "";
    return text.includes("草稿：");
  });

  const writingSummaryText = await page.locator("#writingBasketSummary").textContent();
  assert.match(writingSummaryText || "", /草稿：Writing UI Project 草稿/);
  await page.waitForFunction(() => {
    const text = document.querySelector("#writingProjectsList")?.textContent || "";
    return text.includes("Writing UI Project");
  });
  const projectsListText = await page.locator("#writingProjectsList").textContent();
  assert.match(projectsListText || "", /Writing UI Project/);

  await page.click("#btnWritingSaveDraft");
  await page.waitForFunction(() => {
    const text = document.querySelector("#writingDraftVersionsList")?.textContent || "";
    return text.includes("v2");
  });
  const draftVersionsTextV2 = await page.locator("#writingDraftVersionsList").textContent();
  assert.match(draftVersionsTextV2 || "", /v2/);

  await page.locator('.rail-btn[data-module="writing"]').click();
  await page.waitForFunction(() => document.querySelector('.rail-btn[data-module="writing"]')?.classList.contains("active"));
  await page.locator("#btnWritingOpenDraft").click({ force: true });
  await page.waitForFunction(() => {
    const text = document.querySelector("#statusText")?.textContent || "";
    return text.includes("已打开草稿笔记");
  });

  await page.locator('.rail-btn[data-module="writing"]').click();
  await page.waitForFunction(() => {
    const buttons = [...document.querySelectorAll('#writingDraftVersionsList [data-writing-draft-action="open"]')];
    return buttons.length >= 1 && buttons.every((button) => button instanceof HTMLElement && button.offsetParent !== null);
  });
  await page.locator('#writingDraftVersionsList [data-writing-draft-action="open"]').last().click();
  await page.waitForFunction(() => {
    const text = document.querySelector("#statusText")?.textContent || "";
    return text.includes("已打开草稿版本");
  });

  await page.locator('.rail-btn[data-module="writing"]').click();
  await page.waitForFunction(() => {
    const buttons = [...document.querySelectorAll('#writingDraftVersionsList [data-writing-draft-action="set-current"]')];
    return buttons.length >= 1 && buttons.every((button) => button instanceof HTMLElement && button.offsetParent !== null);
  });
  await page.locator('#writingDraftVersionsList [data-writing-draft-action="set-current"]').last().click();
  await page.waitForFunction(() => {
    const text = document.querySelector("#statusText")?.textContent || "";
    return text.includes("已将草稿版本设为当前");
  });
  const reboundDraftVersionsText = await page.locator("#writingDraftVersionsList").textContent();
  assert.match(reboundDraftVersionsText || "", /v1/);
  assert.match(reboundDraftVersionsText || "", /当前草稿/);

  await page.locator("#btnWritingOpenDraft").click({ force: true });
  await page.waitForFunction(() => {
    const text = document.querySelector("#statusText")?.textContent || "";
    return text.includes("已打开草稿笔记");
  });
  const reboundEditorValue = await page.locator("#editorBody").inputValue();
  assert.match(reboundEditorValue, /# Writing UI Project 草稿/);
  assert.doesNotMatch(reboundEditorValue, /second scaffold/i);

  await page.locator('.rail-btn[data-module="writing"]').click();
  await page.locator('#writingProjectsList button[data-writing-project-action="open"]').first().click();
  await page.waitForFunction(() => {
    const title = document.querySelector("#writingTitle")?.value || "";
    return title.includes("Writing UI Project");
  });
});

test("prototype graph panel renders directory wikilinks and opens graph nodes", async (t) => {
  if (process.env.RUN_BROWSER_E2E !== "1") {
    t.skip("Set RUN_BROWSER_E2E=1 to enable browser e2e in local runs.");
    return;
  }

  const playwright = await optionalPlaywright(t);
  if (!playwright) return;

  const stack = await startPrototypeStack(t, playwright);
  if (!stack) return;
  const { apiBase, page, webBase } = stack;

  const targetNote = await postJson(apiBase, "/api/v1/notes", {
    directoryId: "dir_original_default",
    body: "# Graph target\n\nThis note should be opened from the graph."
  });
  assert.equal(targetNote.status, 201);

  const sourceNote = await postJson(apiBase, "/api/v1/notes", {
    directoryId: "dir_original_default",
    body: "# Graph source\n\nThis note links to [[Graph target]] and should create one graph edge."
  });
  assert.equal(sourceNote.status, 201);

  await page.goto(`${webBase}/prototype`, { waitUntil: "networkidle" });
  await page.locator('.rail-btn[data-module="graph"]').click();

  await waitFor(async () => {
    await page.waitForSelector("#graphCanvas .graph-node", { timeout: 500 });
    const summary = await page.locator("#graphSummary").textContent();
    assert.match(summary || "", /2 .*1 /);
    await page.locator("#graphCanvas .graph-edge", { hasText: "Graph source" }).waitFor({ timeout: 500 });
  }, 7000);

  await page.locator("#graphCanvas .graph-node", { hasText: "Graph target" }).click();
  await page.waitForFunction(() => document.querySelector("#editorBody")?.value?.includes("Graph target"));

  const activeEditorText = await page.locator("#editorBody").inputValue();
  assert.match(activeEditorText, /Graph target/);
});

test("prototype explorer context rename moves directory fsPath and note markdown path", async (t) => {
  if (process.env.RUN_BROWSER_E2E !== "1") {
    t.skip("Set RUN_BROWSER_E2E=1 to enable browser e2e in local runs.");
    return;
  }

  const playwright = await optionalPlaywright(t);
  if (!playwright) return;

  const stack = await startPrototypeStack(t, playwright);
  if (!stack) return;
  const { apiBase, page, vaultPath, webBase } = stack;

  const originalPath = path.join(vaultPath, "notes", "original", "rename-me");
  const renamedPath = path.join(vaultPath, "notes", "original", "Renamed Folder");

  const directory = await postJson(apiBase, "/api/v1/directories", {
    title: "Rename Me",
    parentDirectoryId: "dir_original_default",
    directoryType: "custom",
    fsPath: originalPath,
    maxNotes: 500
  });
  assert.equal(directory.status, 201, JSON.stringify(directory.json));

  const note = await postJson(apiBase, "/api/v1/notes", {
    directoryId: directory.json.item.id,
    body: "# Rename flow note\n\nThis note should move with the renamed directory."
  });
  assert.equal(note.status, 201, JSON.stringify(note.json));

  await page.goto(`${webBase}/prototype`, { waitUntil: "networkidle" });
  const folderRow = page.locator('.explorer-item[data-kind="folder"]', { hasText: "Rename Me" });
  await folderRow.waitFor();

  await acceptPrompt(page, /重命名目录/, "Renamed Folder");
  await openContextAction(page, folderRow, "rename");

  await waitFor(async () => {
    await page.locator('.explorer-item[data-kind="folder"]', { hasText: "Renamed Folder" }).waitFor({ timeout: 500 });
    const statusText = await page.locator("#statusText").textContent();
    assert.match(statusText || "", /目录已更新并落盘/);
  }, 8000);

  const directories = await fetchJson(apiBase, "/api/v1/directories?includeHidden=true");
  assert.equal(directories.status, 200);
  const renamedDirectory = directories.json.items.find((item) => item.id === directory.json.item.id);
  assert.ok(renamedDirectory, JSON.stringify(directories.json.items, null, 2));
  assert.equal(renamedDirectory.title, "Renamed Folder");
  assert.equal(path.resolve(renamedDirectory.fsPath), path.resolve(renamedPath));

  const noteAfter = await fetchJson(apiBase, `/api/v1/notes/${encodeURIComponent(note.json.item.id)}`);
  assert.equal(noteAfter.status, 200);
  const movedNotePath = path.join(vaultPath, noteAfter.json.item.markdownPath.replaceAll("/", path.sep));
  assert.equal(path.resolve(movedNotePath), path.resolve(path.join(renamedPath, "Rename flow note.md")));
  await fs.access(movedNotePath);
  await assert.rejects(fs.access(path.join(originalPath, "Rename flow note.md")));
});

test("prototype explorer set-folder-path updates directory fsPath and moves markdown files", async (t) => {
  if (process.env.RUN_BROWSER_E2E !== "1") {
    t.skip("Set RUN_BROWSER_E2E=1 to enable browser e2e in local runs.");
    return;
  }

  const playwright = await optionalPlaywright(t);
  if (!playwright) return;

  const stack = await startPrototypeStack(t, playwright);
  if (!stack) return;
  const { apiBase, page, vaultPath, webBase } = stack;

  const originalPath = path.join(vaultPath, "notes", "original", "path-source");
  const updatedPath = path.join(vaultPath, "notes", "original", "path-target");

  const directory = await postJson(apiBase, "/api/v1/directories", {
    title: "Path Source",
    parentDirectoryId: "dir_original_default",
    directoryType: "custom",
    fsPath: originalPath,
    maxNotes: 500
  });
  assert.equal(directory.status, 201, JSON.stringify(directory.json));

  const note = await postJson(apiBase, "/api/v1/notes", {
    directoryId: directory.json.item.id,
    body: "# Path move note\n\nThis note should move when the directory save path changes."
  });
  assert.equal(note.status, 201, JSON.stringify(note.json));

  await page.goto(`${webBase}/prototype`, { waitUntil: "networkidle" });
  const folderRow = page.locator('.explorer-item[data-kind="folder"]', { hasText: "Path Source" });
  await folderRow.waitFor();

  await page.evaluate((nextPath) => {
    window.showDirectoryPicker = undefined;
    window.prompt = () => nextPath;
  }, updatedPath);
  await openContextAction(page, folderRow, "set-folder-path");

  await waitFor(async () => {
    const directories = await fetchJson(apiBase, "/api/v1/directories?includeHidden=true");
    const updatedDirectory = directories.json.items.find((item) => item.id === directory.json.item.id);
    assert.ok(updatedDirectory);
    assert.equal(path.resolve(updatedDirectory.fsPath), path.resolve(updatedPath));
  }, 8000);

  const noteAfter = await fetchJson(apiBase, `/api/v1/notes/${encodeURIComponent(note.json.item.id)}`);
  assert.equal(noteAfter.status, 200);
  const movedNotePath = path.join(vaultPath, noteAfter.json.item.markdownPath.replaceAll("/", path.sep));
  assert.equal(path.resolve(movedNotePath), path.resolve(path.join(updatedPath, "Path move note.md")));
  await fs.access(movedNotePath);
  await assert.rejects(fs.access(path.join(originalPath, "Path move note.md")));
});

test("prototype explorer drag and drop moves directory under another folder and updates note path", async (t) => {
  if (process.env.RUN_BROWSER_E2E !== "1") {
    t.skip("Set RUN_BROWSER_E2E=1 to enable browser e2e in local runs.");
    return;
  }

  const playwright = await optionalPlaywright(t);
  if (!playwright) return;

  const stack = await startPrototypeStack(t, playwright);
  if (!stack) return;
  const { apiBase, page, vaultPath, webBase } = stack;

  const targetPath = path.join(vaultPath, "notes", "original", "target-parent");
  const sourcePath = path.join(vaultPath, "notes", "original", "source-parent");
  const movedSourcePath = path.join(targetPath, "source-parent");

  const targetDirectory = await postJson(apiBase, "/api/v1/directories", {
    title: "Target Parent",
    parentDirectoryId: "dir_original_default",
    directoryType: "custom",
    fsPath: targetPath,
    maxNotes: 500
  });
  assert.equal(targetDirectory.status, 201, JSON.stringify(targetDirectory.json));

  const sourceDirectory = await postJson(apiBase, "/api/v1/directories", {
    title: "Source Parent",
    parentDirectoryId: "dir_original_default",
    directoryType: "custom",
    fsPath: sourcePath,
    maxNotes: 500
  });
  assert.equal(sourceDirectory.status, 201, JSON.stringify(sourceDirectory.json));

  const sourceNote = await postJson(apiBase, "/api/v1/notes", {
    directoryId: sourceDirectory.json.item.id,
    body: "# Drag move note\n\nThis note should move with the dragged directory."
  });
  assert.equal(sourceNote.status, 201, JSON.stringify(sourceNote.json));

  await page.goto(`${webBase}/prototype`, { waitUntil: "networkidle" });
  const sourceRow = page.locator('.explorer-item[data-kind="folder"]', { hasText: "Source Parent" });
  const targetRow = page.locator('.explorer-item[data-kind="folder"]', { hasText: "Target Parent" });
  await sourceRow.waitFor();
  await targetRow.waitFor();

  await sourceRow.dragTo(targetRow);

  await waitFor(async () => {
    const statusText = await page.locator("#statusText").textContent();
    assert.match(statusText || "", /目录层级已更新并落盘/);
    const directories = await fetchJson(apiBase, "/api/v1/directories?includeHidden=true");
    const movedDirectory = directories.json.items.find((item) => item.id === sourceDirectory.json.item.id);
    assert.ok(movedDirectory);
    assert.equal(movedDirectory.parentDirectoryId, targetDirectory.json.item.id);
    assert.equal(path.resolve(movedDirectory.fsPath), path.resolve(movedSourcePath));
  }, 8000);

  const noteAfter = await fetchJson(apiBase, `/api/v1/notes/${encodeURIComponent(sourceNote.json.item.id)}`);
  assert.equal(noteAfter.status, 200);
  const movedNotePath = path.join(vaultPath, noteAfter.json.item.markdownPath.replaceAll("/", path.sep));
  assert.equal(path.resolve(movedNotePath), path.resolve(path.join(movedSourcePath, "Drag move note.md")));
  await fs.access(movedNotePath);
  await assert.rejects(fs.access(path.join(sourcePath, "Drag move note.md")));
});

test("prototype explorer note context rename updates markdown title and keeps file addressable", async (t) => {
  if (process.env.RUN_BROWSER_E2E !== "1") {
    t.skip("Set RUN_BROWSER_E2E=1 to enable browser e2e in local runs.");
    return;
  }

  const playwright = await optionalPlaywright(t);
  if (!playwright) return;

  const stack = await startPrototypeStack(t, playwright);
  if (!stack) return;
  const { apiBase, page, vaultPath, webBase } = stack;

  const note = await postJson(apiBase, "/api/v1/notes", {
    directoryId: "dir_original_default",
    body: "# Rename source note\n\nThis note title should change through the explorer context menu."
  });
  assert.equal(note.status, 201, JSON.stringify(note.json));

  const originalMarkdownPath = path.join(vaultPath, note.json.item.markdownPath.replaceAll("/", path.sep));
  await fs.access(originalMarkdownPath);

  await page.goto(`${webBase}/prototype`, { waitUntil: "networkidle" });
  const noteRow = page.locator('.explorer-item[data-kind="file"]', { hasText: "Rename source note" });
  await noteRow.waitFor();

  await acceptPrompt(page, /重命名笔记/, "Renamed note title");
  await openContextAction(page, noteRow, "rename");

  await waitFor(async () => {
    await page.locator('.explorer-item[data-kind="file"]', { hasText: "Renamed note title" }).waitFor({ timeout: 500 });
    const statusText = await page.locator("#statusText").textContent();
    assert.match(statusText || "", /已保存 Markdown|笔记已重命名/);
  }, 8000);

  const noteAfter = await fetchJson(apiBase, `/api/v1/notes/${encodeURIComponent(note.json.item.id)}`);
  assert.equal(noteAfter.status, 200);
  assert.equal(noteAfter.json.item.title, "Renamed note title");
  assert.match(noteAfter.json.item.body, /^# Renamed note title/m);

  const renamedMarkdownPath = path.join(vaultPath, noteAfter.json.item.markdownPath.replaceAll("/", path.sep));
  await assert.rejects(fs.access(originalMarkdownPath));
  const markdownAfter = await fs.readFile(renamedMarkdownPath, "utf8");
  assert.match(markdownAfter, /^# Renamed note title/m);
});

test("prototype explorer reveal note uses tauri opener when desktop shell is available", async (t) => {
  if (process.env.RUN_BROWSER_E2E !== "1") {
    t.skip("Set RUN_BROWSER_E2E=1 to enable browser e2e in local runs.");
    return;
  }

  const playwright = await optionalPlaywright(t);
  if (!playwright) return;

  const stack = await startPrototypeStack(t, playwright);
  if (!stack) return;
  const { apiBase, page, vaultPath, webBase } = stack;

  const note = await postJson(apiBase, "/api/v1/notes", {
    directoryId: "dir_original_default",
    body: "# Reveal source note\n\nThis note should ask the desktop shell to reveal its Markdown file."
  });
  assert.equal(note.status, 201, JSON.stringify(note.json));

  const expectedMarkdownPath = path.join(vaultPath, note.json.item.markdownPath.replaceAll("/", path.sep));

  await page.goto(`${webBase}/prototype`, { waitUntil: "networkidle" });
  await page.evaluate(() => {
    window.__tauriRevealCalls = [];
    window.__TAURI__ = {
      opener: {
        async revealItemInDir(targetPath) {
          window.__tauriRevealCalls.push(targetPath);
        }
      }
    };
  });

  const noteRow = page.locator('.explorer-item[data-kind="file"]', { hasText: "Reveal source note" });
  await noteRow.waitFor();
  await openContextAction(page, noteRow, "reveal-note");

  await waitFor(async () => {
    const statusText = await page.locator("#statusText").textContent();
    assert.match(String(statusText || ""), /已打开Markdown 文件位置/);
  }, 7000);

  const revealCalls = await page.evaluate(() => window.__tauriRevealCalls || []);
  assert.deepEqual(revealCalls.map((item) => path.resolve(item)), [path.resolve(expectedMarkdownPath)]);
});

test("prototype explorer note context move and delete update disk state", async (t) => {
  if (process.env.RUN_BROWSER_E2E !== "1") {
    t.skip("Set RUN_BROWSER_E2E=1 to enable browser e2e in local runs.");
    return;
  }

  const playwright = await optionalPlaywright(t);
  if (!playwright) return;

  const stack = await startPrototypeStack(t, playwright);
  if (!stack) return;
  const { apiBase, page, vaultPath, webBase } = stack;

  const targetPath = path.join(vaultPath, "notes", "original", "note-move-target");
  const targetDirectory = await postJson(apiBase, "/api/v1/directories", {
    title: "Note Move Target",
    parentDirectoryId: "dir_original_default",
    directoryType: "custom",
    fsPath: targetPath,
    maxNotes: 500
  });
  assert.equal(targetDirectory.status, 201, JSON.stringify(targetDirectory.json));

  const note = await postJson(apiBase, "/api/v1/notes", {
    directoryId: "dir_original_default",
    body: "# Note move source\n\nThis note should move and then be deleted through the explorer context menu."
  });
  assert.equal(note.status, 201, JSON.stringify(note.json));

  const oldMarkdownPath = path.join(vaultPath, note.json.item.markdownPath.replaceAll("/", path.sep));
  await fs.access(oldMarkdownPath);

  await page.goto(`${webBase}/prototype`, { waitUntil: "networkidle" });
  const noteRow = page.locator('.explorer-item[data-kind="file"]', { hasText: "Note move source" });
  await noteRow.waitFor();

  await acceptPrompt(page, /移动到目录 ID/, targetDirectory.json.item.id);
  await openContextAction(page, noteRow, "move");

  await waitFor(async () => {
    const statusText = await page.locator("#statusText").textContent();
    assert.match(statusText || "", /已移动笔记并落盘/);
    const noteAfterMove = await fetchJson(apiBase, `/api/v1/notes/${encodeURIComponent(note.json.item.id)}`);
    assert.equal(noteAfterMove.status, 200);
    assert.equal(noteAfterMove.json.item.directoryId, targetDirectory.json.item.id);
  }, 8000);

  const noteAfterMove = await fetchJson(apiBase, `/api/v1/notes/${encodeURIComponent(note.json.item.id)}`);
  const movedMarkdownPath = path.join(vaultPath, noteAfterMove.json.item.markdownPath.replaceAll("/", path.sep));
  assert.equal(path.resolve(movedMarkdownPath), path.resolve(path.join(targetPath, "Note move source.md")));
  await fs.access(movedMarkdownPath);
  await assert.rejects(fs.access(oldMarkdownPath));

  await page.locator('.explorer-item[data-kind="folder"]', { hasText: "Note Move Target" }).click();
  const movedRow = page.locator('.explorer-item[data-kind="file"]', { hasText: "Note move source" });
  await movedRow.waitFor();

  page.once("dialog", async (dialog) => {
    assert.equal(dialog.type(), "confirm");
    assert.match(dialog.message(), /确认删除笔记/);
    await dialog.accept();
  });
  await openContextAction(page, movedRow, "delete");

  await waitFor(async () => {
    const statusText = await page.locator("#statusText").textContent();
    assert.match(statusText || "", /已删除笔记并落盘/);
    const deletedNote = await fetchJson(apiBase, `/api/v1/notes/${encodeURIComponent(note.json.item.id)}`);
    assert.equal(deletedNote.status, 404);
  }, 8000);

  await assert.rejects(fs.access(movedMarkdownPath));
});
