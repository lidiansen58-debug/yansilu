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

async function expandEditorHelper(page) {
  await page.locator("#editorHelper").hover();
  await waitFor(async () => {
    assert.equal(await page.locator("#btnEditorHelperAction").isVisible(), true);
    assert.equal(await page.locator("#btnEditorHelperMute").isVisible(), true);
  }, 4000);
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

async function putJson(baseUrl, pathname, body) {
  const res = await fetch(`${baseUrl}${pathname}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const json = await res.json();
  return { status: res.status, json };
}

async function createWritingReadyPermanentNote(baseUrl, payload = {}) {
  const authorship = payload.authorship || { user_confirmed: true, ai_assisted: false };
  const created = await postJson(baseUrl, "/api/v1/notes", {
    directoryId: payload.directoryId || "dir_original_default",
    title: payload.title,
    body: payload.body,
    thesis: payload.thesis,
    threeLineSummary: payload.threeLineSummary,
    distillationStatus: "draft",
    boundaryOrCounterpoint: payload.boundaryOrCounterpoint
  });
  assert.equal(created.status, 201, JSON.stringify(created.json));
  const noteId = created.json.item.id;
  const updated = await putJson(baseUrl, `/api/v1/notes/${encodeURIComponent(noteId)}`, {
    title: payload.title || created.json.item.title,
    body: payload.body || created.json.item.body,
    status: "active",
    thesis: payload.thesis,
    threeLineSummary: payload.threeLineSummary,
    distillationStatus: payload.distillationStatus || "confirmed",
    originalityStatus: "pass",
    authorship,
    authorshipConfirmed: true,
    authorshipAiAssisted: Boolean(authorship.ai_assisted),
    boundaryOrCounterpoint: payload.boundaryOrCounterpoint
  });
  assert.equal(updated.status, 200, JSON.stringify(updated.json));
  return updated;
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

async function confirmAuthorshipIfVisible(page, options = {}) {
  const panel = page.locator("#authorshipPanel");
  const visible = await panel.isVisible().catch(() => false);
  if (!visible) return false;
  const claimInput = page.locator("#authorshipClaimInput");
  const existingClaim = await claimInput.inputValue();
  const claim = String(options.claim || existingClaim || "锟斤拷锟斤拷锟揭碉拷前锟较可碉拷锟叫断★拷").trim();
  if (!existingClaim.trim() || options.forceClaim === true) {
    await claimInput.fill(claim);
  }
  await page.waitForFunction(() => {
    const checkbox = document.querySelector("#authorshipConfirm");
    return Boolean(checkbox && !checkbox.disabled);
  });
  const checkbox = page.locator("#authorshipConfirm");
  if (!(await checkbox.isChecked())) await checkbox.check();
  await waitFor(async () => {
    assert.equal(await checkbox.isChecked(), true);
  }, 4000);
  return true;
}

async function currentStatusText(page) {
  return page.locator("#statusText").textContent().catch(() => "");
}

async function waitForPrototypeReady(page) {
  await waitFor(async () => {
    assert.equal(await page.locator("#statusText").isVisible(), true);
    assert.equal(
      await page.evaluate(() => Boolean(window.__prototypeState && typeof window.__prototypeState === "object")),
      true
    );
  }, 10000);
}

async function chooseToolbarCommand(page, command) {
  await page.locator("#btnToolbarCommandSearch").click();
  const item = page.locator(`[data-toolbar-command="${command}"]`);
  await waitFor(async () => {
    assert.equal(await item.isVisible(), true);
  }, 4000);
  await item.click();
  await waitFor(async () => {
    assert.equal(await page.locator("#toolbarCommandMenu").isVisible(), false);
  }, 4000);
}

async function optionalPlaywright(t) {
  try {
    return await import("playwright");
  } catch {
    t.skip("Playwright is not installed; run npm install -D playwright and playwright install chromium to enable browser e2e.");
    return null;
  }
}

async function launchPlaywrightBrowser(playwright) {
  const attempts = [{ label: "playwright chromium", options: { headless: true } }];

  if (process.platform === "win32") {
    attempts.push({ label: "system chrome channel", options: { channel: "chrome", headless: true } });
    attempts.push({
      label: "system chrome executable",
      options: {
        executablePath: "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
        headless: true
      }
    });
  }

  const errors = [];
  for (const attempt of attempts) {
    try {
      return await playwright.chromium.launch(attempt.options);
    } catch (error) {
      errors.push(`${attempt.label}: ${String(error?.message || error)}`);
    }
  }

  throw new Error(errors.join("\n\n"));
}

async function startPrototypeStack(t, playwright, options = {}) {
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
    browser = await launchPlaywrightBrowser(playwright);
  } catch (error) {
    t.skip(`No reusable Playwright browser runtime is available: ${String(error?.message || error)}`);
    return null;
  }

  t.after(async () => {
      if (browser) await browser.close();
    });

  const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
  if (typeof options.beforeGoto === "function") await options.beforeGoto(page);
  await page.goto(`${webBase}/prototype`, { waitUntil: "domcontentloaded" });
  await waitForPrototypeReady(page);

  return { apiBase, webBase, vaultPath, browser, page };
}

async function reloadPrototype(page, webBase) {
  await page.goto(`${webBase}/prototype`, { waitUntil: "domcontentloaded" });
  await waitForPrototypeReady(page);
}

async function openPaperWorkspace(page, webBase) {
  await page.goto(`${webBase}/paper-workspace`, { waitUntil: "networkidle" });
}

function paperWorkspaceSelectionStorageKey(paperId) {
  return `yansilu:paper-workspace:selection:${String(paperId || "").trim()}`;
}

async function currentPaperWorkspaceStatusText(page) {
  return page.locator(".paper-status").textContent().catch(() => "");
}

async function createAiFieldSuggestionFixture(baseUrl, options = {}) {
  const title = String(options.title || "AI review fixture").trim();
  const body =
    String(options.body || "This note should produce a reviewable thesis suggestion for browser coverage.").trim();
  const created = await postJson(baseUrl, "/api/v1/notes", {
    directoryId: "dir_original_default",
    title,
    noteType: "permanent",
    body: `# ${title}\n\n${body}`
  });
  assert.equal(created.status, 201, JSON.stringify(created.json));

  const analysis = await postJson(baseUrl, `/api/v1/notes/${encodeURIComponent(created.json.item.id)}/ai-analysis`, {});
  assert.equal(analysis.status, 200, JSON.stringify(analysis.json));

  const suggestionId = analysis.json.item.reviewItems.storedSuggestionIds[0];
  assert.ok(suggestionId, "expected a stored suggestion id");

  const artifact = analysis.json.item.reviewItems.artifacts.find(
    (item) =>
      item.type === "InsightCard" &&
      (item.payload?.fieldSuggestionId === suggestionId || item.payload?.fieldSuggestion?.id === suggestionId)
  );
  assert.ok(artifact, "expected an InsightCard artifact linked to the stored suggestion");

  return {
    noteId: created.json.item.id,
    noteTitle: title,
    artifactId: artifact.id,
    suggestionId,
    targetField: artifact.payload?.fieldSuggestion?.target?.field || "thesis",
    suggestedContent: artifact.payload?.fieldSuggestion?.content || {}
  };
}

async function adoptSuggestionAsDraftViaApi(baseUrl, fixture, options = {}) {
  const adopted = await postJson(
    baseUrl,
    `/api/v1/ai/inbox/${encodeURIComponent(fixture.artifactId)}/adopt-field-suggestion`,
    {
      confirm: true,
      comment: String(options.comment || "Adopted through test setup.")
    }
  );
  assert.equal(adopted.status, 200, JSON.stringify(adopted.json));
  assert.equal(adopted.json.item.status, "adopted_as_draft");
  return adopted.json;
}

async function markSuggestionEditedViaApi(baseUrl, fixture, thesis, options = {}) {
  const edited = await patchJson(
    baseUrl,
    `/api/v1/ai-suggestions/${encodeURIComponent(fixture.suggestionId)}?canonical=true`,
    {
      status: "edited",
      action: "edit",
      actor: "user",
      userId: "user_1",
      comment: String(options.comment || "Edited through test setup."),
      content: {
        [fixture.targetField]: thesis
      }
    }
  );
  assert.equal(edited.status, 200, JSON.stringify(edited.json));
  assert.equal(edited.json.item.status, "edited");
  return edited.json;
}

async function openAiInboxModule(page) {
  await page.locator('.rail-btn[data-module="aiInbox"]').click();
  await waitFor(async () => {
    assert.equal(await page.evaluate(() => window.__prototypeState?.module || ""), "aiInbox");
    assert.equal(await page.locator("#aiInboxPanel").isVisible(), true);
  }, 5000);
}

async function openSettingsModule(page) {
  await page.locator('.rail-btn[data-module="settings"]').click();
  await waitFor(async () => {
    assert.equal(await page.evaluate(() => window.__prototypeState?.module || ""), "settings");
    assert.equal(await page.locator("#settingsPanel").isVisible(), true);
  }, 5000);
}

function noteFieldKey(field = "") {
  return String(field || "").trim() === "three_line_summary" ? "threeLineSummary" : String(field || "").trim() || "thesis";
}

function suggestionFieldValue(content = {}, field = "") {
  const direct = content?.[field];
  if (direct !== undefined) return direct;
  const normalizedField = noteFieldKey(field);
  return content?.[normalizedField];
}

async function filterAiInboxBySourceNote(page, sourceNoteId) {
  await waitFor(async () => {
    const input = page.locator("#aiInboxSourceNoteFilter");
    await input.fill(sourceNoteId);
    assert.equal(await input.inputValue(), sourceNoteId);
  }, 8000);
  await page.locator("#btnAiInboxApplyFilters").click();
}

async function filterAiSuggestionsByTarget(page, targetId) {
  await waitFor(async () => {
    const input = page.locator("#aiSuggestionTargetIdFilter");
    await input.fill(targetId);
    assert.equal(await input.inputValue(), targetId);
  }, 8000);
  await page.locator("#btnAiSuggestionsApplyFilters").click();
}

async function filterAiSuggestionsByStatus(page, status) {
  await waitFor(async () => {
    await page.locator("#aiSuggestionStatusFilter").selectOption(status);
    assert.equal(await page.locator("#aiSuggestionStatusFilter").inputValue(), status);
  }, 8000);
  await page.locator("#btnAiSuggestionsApplyFilters").click();
}

test("prototype desktop updater check no-ops cleanly when no update is available", async (t) => {
  if (process.env.RUN_BROWSER_E2E !== "1") {
    t.skip("Set RUN_BROWSER_E2E=1 to enable browser e2e in local runs.");
    return;
  }

  const playwright = await optionalPlaywright(t);
  if (!playwright) return;

  const stack = await startPrototypeStack(t, playwright, {
    beforeGoto: async (page) => {
      await page.addInitScript(() => {
        window.__updaterCommands = [];
        window.__confirmMessages = [];
        window.confirm = (message) => {
          window.__confirmMessages.push(message);
          return false;
        };
        window.__TAURI__ = {
          core: {
            async invoke(command, args) {
              window.__updaterCommands.push({ command, args });
              if (command === "plugin:updater|check") return { available: false };
              throw new Error(`unexpected updater command: ${command}`);
            }
          }
        };
      });
    }
  });
  if (!stack) return;

  const { page } = stack;
  await waitFor(async () => {
    const commands = await page.evaluate(() => window.__updaterCommands || []);
    assert.deepEqual(commands.map((item) => item.command), ["plugin:updater|check"]);
    const confirms = await page.evaluate(() => window.__confirmMessages || []);
    assert.deepEqual(confirms, []);
  }, 7000);
});

async function createAndSaveNoteViaEditor(page, markdown, options = {}) {
  const confirmAuthorship = options.confirmAuthorship !== false;
  const saveWithShortcut = Boolean(options.saveWithShortcut);
  const source = String(markdown || "").replace(/\r\n/g, "\n");
  const [firstLine = "", ...restLines] = source.split("\n");
  const expectedTitle = firstLine.replace(/^#+\s*/, "").trim();
  const expectedBody = restLines.join("\n").replace(/^\n+/, "");
  await page.locator("#btnNewNote").click();
  await page.waitForFunction(() => {
    const value = document.querySelector("#editorBody")?.value || "";
    const title = document.querySelector(".tab.active .tab-title")?.textContent || "";
    return value.startsWith("# 未锟斤拷锟斤拷锟绞硷拷") && String(title).includes("未锟斤拷锟斤拷锟绞硷拷");
  });
  await page.evaluate((value) => {
    const editor = document.querySelector("#editorHost")?.__markdownEditor;
    const nextValue = String(value || "").replace(/\r\n/g, "\n");
    editor?.setValue?.(nextValue);
    const cursor = nextValue.length;
    editor?.setSelectionRange?.(cursor, cursor);
    editor?.focus?.();
  }, source);
  await page.waitForFunction(
    ({ title, body }) => {
      const value = document.querySelector("#editorBody")?.value || "";
      return value.includes(`# ${title}`) && (!body || value.includes(body));
    },
    { title: expectedTitle, body: expectedBody.trim() ? expectedBody : "" }
  );
  if (confirmAuthorship) {
    await confirmAuthorshipIfVisible(page, {
      claim: options.authorshipClaim || `${expectedTitle} 锟斤拷锟揭碉拷前锟较可碉拷锟叫断★拷`
    });
  }
  const editorValueBeforeSave = await page.locator("#editorBody").inputValue();
  if (saveWithShortcut) {
    await page.keyboard.press(process.platform === "darwin" ? "Meta+S" : "Control+S");
  } else {
    await page.keyboard.press(process.platform === "darwin" ? "Meta+S" : "Control+S");
  }
  await waitFor(async () => {
    const editorValue = await page.locator("#editorBody").inputValue();
    const statusText = await currentStatusText(page);
    assert.match(editorValue, new RegExp(escapeRegExp(expectedTitle)));
    assert.match(String(statusText || ""), /锟斤拷同锟斤拷|锟皆讹拷同锟斤拷|锟皆帮拷 draft 锟斤拷锟斤拷|锟斤拷锟斤拷确锟斤拷/);
  }, 10000);
  return editorValueBeforeSave;
}

async function ensureSourceMode(page) {
  const alreadySource = await page.evaluate(() =>
    document.querySelector("#markdownSplit")?.classList.contains("editor-mode-source")
  ).catch(() => false);
  if (alreadySource) return;
  const sourceButton = page.locator("#btnModeToggle");
  if (!(await sourceButton.isVisible().catch(() => false))) return;
  await sourceButton.click();
  await page.waitForFunction(() => {
    const split = document.querySelector("#markdownSplit");
    const content = document.querySelector("#editorHost .cm-content");
    if (!split || !content) return false;
    return split.classList.contains("editor-mode-source") && window.getComputedStyle(content).display !== "none";
  });
}

async function ensureNoteMode(page) {
  const alreadyNoteMode = await page.evaluate(() =>
    document.querySelector("#markdownSplit")?.classList.contains("editor-mode-wysiwyg")
  ).catch(() => false);
  if (alreadyNoteMode) return;
  const modeButton = page.locator("#btnModeToggle");
  if (!(await modeButton.isVisible().catch(() => false))) return;
  await modeButton.click();
  await page.waitForFunction(() => {
    const split = document.querySelector("#markdownSplit");
    const host = document.querySelector("#wysiwygHost");
    if (!split || !host) return false;
    return split.classList.contains("editor-mode-wysiwyg") && window.getComputedStyle(host).display !== "none";
  });
}

async function focusEditorContent(page) {
  await ensureSourceMode(page);
  await page.evaluate(() => {
    document.querySelector("#editorHost")?.__markdownEditor?.focus?.();
  });
}

async function waitForEditableNoteSurface(page) {
  await page.waitForFunction(() => {
    const source = document.querySelector("#editorHost .cm-content");
    const rich = document.querySelector("#wysiwygHost .toastui-editor-contents");
    const isVisible = (node) =>
      Boolean(
        node &&
        window.getComputedStyle(node).display !== "none" &&
        node.getBoundingClientRect().width > 0 &&
        node.getBoundingClientRect().height > 0
      );
    return isVisible(source) || isVisible(rich);
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
    return Boolean(selection && value.slice(selection.from, selection.to) === "未锟斤拷锟斤拷锟绞硷拷");
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
  const { apiBase, browser, page, webBase } = stack;

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

test("prototype permanent note can save and persists content after authorship confirmation flow", async (t) => {
  if (process.env.RUN_BROWSER_E2E !== "1") {
    t.skip("Set RUN_BROWSER_E2E=1 to enable browser e2e in local runs.");
    return;
  }

  const playwright = await optionalPlaywright(t);
  if (!playwright) return;

  const stack = await startPrototypeStack(t, playwright);
  if (!stack) return;
  const { apiBase, page } = stack;

  await page.waitForFunction(() => document.querySelector("#importPanel")?.classList.contains("hidden"));
  await page.waitForFunction(() => !document.querySelector("#markdownPanel")?.classList.contains("hidden"));

  await page.locator("#btnNewNote").click();
  await page.waitForSelector(".tab.active");
  await ensurePlaceholderTitleSelection(page);
  await page.keyboard.type("Authorship Gate Note");
  await page.keyboard.press("Enter");
  await page.keyboard.type("This note should not hit Markdown until I explicitly confirm authorship.");
  assert.equal(await page.locator("#btnInsertLink").isVisible(), true);
  assert.equal(await page.locator("#btnRunGuard").count(), 0);

  await page.keyboard.press(process.platform === "darwin" ? "Meta+S" : "Control+S");

  const notesAfterBlockedSave = await waitFor(async () => {
    const result = await fetchJson(apiBase, "/api/v1/directories/dir_original_default/notes");
    assert.equal(result.status, 200);
    assert.equal(result.json.total, 1);
    const draftCount = await page.evaluate(() =>
      Object.keys(window.localStorage).filter((key) => key.startsWith("yansilu:draft:")).length
    );
    assert.ok(draftCount >= 0);
    return result;
  }, 10000);

  const blockedNoteId = notesAfterBlockedSave.json.items[0].id;
  const blockedNote = await fetchJson(apiBase, `/api/v1/notes/${encodeURIComponent(blockedNoteId)}`);
  assert.equal(blockedNote.status, 200);
  assert.ok(
    /Authorship Gate Note/.test(blockedNote.json.item.body || "") ||
      /# 未锟斤拷锟斤拷锟绞硷拷/.test(blockedNote.json.item.body || ""),
    blockedNote.json.item.body || ""
  );

  await confirmAuthorshipIfVisible(page, { claim: "Authorship Gate Note 锟斤拷锟揭碉拷前锟较可碉拷锟叫断★拷" });
  await page.keyboard.press(process.platform === "darwin" ? "Meta+S" : "Control+S");

  await waitFor(async () => {
    const activeNoteId = await page.evaluate(() => window.__prototypeEditor?.activeNote?.()?.id || "");
    const savedNote = await fetchJson(apiBase, `/api/v1/notes/${encodeURIComponent(activeNoteId || blockedNoteId)}`);
    assert.equal(savedNote.status, 200);
    assert.match(savedNote.json.item.body || "", /Authorship Gate Note/);
    assert.match(savedNote.json.item.body || "", /explicitly confirm authorship/);
    const draftCount = await page.evaluate(() =>
      Object.keys(window.localStorage).filter((key) => key.startsWith("yansilu:draft:")).length
    );
    assert.equal(draftCount, 0);
  }, 10000);
});

test("prototype literature note keeps permanent-note actions out of the editor toolbar", async (t) => {
  if (process.env.RUN_BROWSER_E2E !== "1") {
    t.skip("Set RUN_BROWSER_E2E=1 to enable browser e2e in local runs.");
    return;
  }

  const playwright = await optionalPlaywright(t);
  if (!playwright) return;

  const stack = await startPrototypeStack(t, playwright);
  if (!stack) return;
  const { apiBase, page, webBase } = stack;

  const literatureCreate = await postJson(apiBase, "/api/v1/notes", {
    directoryId: "dir_literature_default",
    status: "draft",
    body: [
      "# 锟侥讹拷摘录锟斤拷锟斤拷",
      "",
      "## 锟斤拷锟斤拷锟斤拷息",
      "",
      "- 锟斤拷锟解：锟斤拷锟斤拷锟斤拷锟斤拷芯锟?",
      "- 锟斤拷锟竭ｏ拷锟斤拷一",
      "- 锟斤拷荩锟?024",
      "- 锟斤拷锟斤拷锟斤拷锟斤拷知写锟斤拷锟斤拷锟斤拷",
      "- 锟斤拷锟斤拷锟斤拷 / 锟斤拷源锟斤拷锟斤拷思录锟斤拷锟较匡拷",
      "- 页锟斤拷 / 锟斤拷位锟斤拷p. 12",
      "- 锟芥本锟斤拷",
      "- 锟斤拷锟斤拷 / 锟斤拷锟竭ｏ拷",
      "- DOI / ISBN / arXiv / URL / PDF锟斤拷https://example.com/concept-understanding",
      "",
      "## 原锟斤拷",
      "A concept note should preserve the source boundary instead of flattening the author claim.",
      "",
      "## 转锟斤拷",
      "Turning a paper extract into my own wording requires preserving the citation boundary and the author/source distinction.",
      "",
      "## 锟斤拷锟斤拷原锟斤拷",
      "Turning excerpts into my own judgment means keeping the source boundary explicit instead of collapsing it into a fake summary.",
      "",
      "## 支锟斤拷锟叫讹拷",
      "锟斤拷锟斤拷支锟斤拷锟揭讹拷锟斤拷思录要锟斤拷锟皆★拷摘录锟斤拷锟斤拷伞锟斤拷锟斤拷锟绞硷拷习锟竭碉拷锟叫断★拷"
    ].join("\n")
  });
  assert.equal(literatureCreate.status, 201, JSON.stringify(literatureCreate.json));
  const literatureNoteId = literatureCreate.json.item.id;

  await page.goto(`${webBase}/prototype`, { waitUntil: "networkidle" });
  await page.locator('[data-action="quick-literature"]').click();
  await page.locator('.explorer-item[data-kind="folder"][data-id="dir_literature_default"]').click();
  await page.locator('.explorer-item[data-kind="file"]', { hasText: "锟侥讹拷摘录锟斤拷锟斤拷" }).waitFor();
  await page.locator('.explorer-item[data-kind="file"]', { hasText: "锟侥讹拷摘录锟斤拷锟斤拷" }).click();
  await ensureSourceMode(page);

  await waitFor(async () => {
    const editorValue = await page.locator("#editorBody").inputValue();
    assert.match(String(editorValue || ""), /## 锟斤拷锟斤拷锟斤拷息/);
    assert.match(String(editorValue || ""), /DOI \/ ISBN \/ arXiv \/ URL \/ PDF/);
    assert.match(String(editorValue || ""), /## 原锟斤拷/);
    assert.match(String(editorValue || ""), /## 转锟斤拷/);
    assert.match(String(editorValue || ""), /## 锟斤拷锟斤拷原锟斤拷/);
    assert.match(String(editorValue || ""), /## 支锟斤拷锟叫讹拷/);
  }, 7000);
  assert.equal(await page.locator("#btnRunGuard").count(), 0);
  assert.equal(await page.locator("#btnInsertLink").isVisible(), false);

  await page.keyboard.press(process.platform === "darwin" ? "Meta+S" : "Control+S");

  await waitFor(async () => {
    const note = await fetchJson(apiBase, `/api/v1/notes/${encodeURIComponent(literatureNoteId)}`);
    assert.equal(note.status, 200);
    assert.match(note.json.item.body || "", /## 转锟斤拷/);
    assert.match(note.json.item.body || "", /摘录/);
    const statusText = await currentStatusText(page);
    assert.match(String(statusText || ""), /锟斤拷同锟斤拷|锟皆讹拷同锟斤拷/);
  }, 10000);

  assert.equal(await page.locator("#btnToolbarCommandSearch").isVisible(), true);
});

test("prototype literature note with missing metadata has no toolbar recording action", async (t) => {
  if (process.env.RUN_BROWSER_E2E !== "1") {
    t.skip("Set RUN_BROWSER_E2E=1 to enable browser e2e in local runs.");
    return;
  }

  const playwright = await optionalPlaywright(t);
  if (!playwright) return;

  const stack = await startPrototypeStack(t, playwright);
  if (!stack) return;
  const { apiBase, page, webBase } = stack;

  const literatureCreate = await postJson(apiBase, "/api/v1/notes", {
    directoryId: "dir_literature_default",
    status: "draft",
    body: [
      "# 缺锟斤拷锟斤拷锟斤拷息锟斤拷锟斤拷",
      "",
      "## 原锟斤拷",
      "锟斤拷锟斤拷摘录锟斤拷没锟叫匡拷锟斤拷锟节参匡拷锟斤拷锟阶碉拷锟斤拷源锟斤拷息锟斤拷",
      "",
      "## 转锟斤拷",
      "This note still lacks source metadata, so the paraphrase should remain blocked until the boundary and provenance are explicit.",
      "",
      "## 锟斤拷锟斤拷原锟斤拷",
      "锟斤拷锟斤拷锟斤拷锟斤拷锟斤拷锟斤拷锟斤拷锟斤拷息锟斤拷锟斤拷锟铰猴拷锟劫猜★拷",
      "",
      "## 支锟斤拷锟叫讹拷",
      "锟斤拷支锟斤拷锟斤拷锟阶笔记憋拷锟斤拷锟饺憋拷锟斤拷锟斤拷源锟街段碉拷锟叫断★拷"
    ].join("\n")
  });
  assert.equal(literatureCreate.status, 201, JSON.stringify(literatureCreate.json));

  await page.goto(`${webBase}/prototype`, { waitUntil: "networkidle" });
  await page.locator('[data-action="quick-literature"]').click();
  await page.locator('.explorer-item[data-kind="folder"][data-id="dir_literature_default"]').click();
  await page.locator('.explorer-item[data-kind="file"]', { hasText: "缺锟斤拷锟斤拷锟斤拷息锟斤拷锟斤拷" }).click();
  await waitFor(async () => {
    const editorBody = await page.locator("#editorBody").inputValue();
    assert.match(editorBody || "", /缺锟斤拷锟斤拷锟斤拷息锟斤拷锟斤拷/);
    assert.match(editorBody || "", /should remain blocked until the boundary and provenance are explicit/);
  }, 7000);
  const originalsBefore = await fetchJson(apiBase, "/api/v1/directories/dir_original_default/notes");
  assert.equal(originalsBefore.status, 200);
  const originalIdsBefore = originalsBefore.json.items.map((item) => item.id).sort();

  assert.equal(await page.locator("#btnRunGuard").count(), 0);
  assert.equal(await page.locator("#btnInsertLink").isVisible(), false);

  const originals = await fetchJson(apiBase, "/api/v1/directories/dir_original_default/notes");
  assert.equal(originals.status, 200);
  assert.deepEqual(
    originals.json.items.map((item) => item.id).sort(),
    originalIdsBefore
  );
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

  await ensureSourceMode(page);
  await page.waitForFunction(() => {
    const value = document.querySelector("#editorBody")?.value || "";
    return value.includes("Standalone editor note") && value.includes("dedicated editor route");
  });

  await focusEditorContent(page);
  await page.keyboard.press(process.platform === "darwin" ? "Meta+End" : "Control+End");
  await page.keyboard.type("\n\nSaved from /editor.");
  await confirmAuthorshipIfVisible(page);
  await page.keyboard.press(process.platform === "darwin" ? "Meta+S" : "Control+S");

  await waitFor(async () => {
    const note = await fetchJson(apiBase, `/api/v1/notes/${encodeURIComponent(noteId)}`);
    assert.equal(note.status, 200);
    assert.match(note.json.item.body, /Saved from \/editor\./);
    const status = await currentStatusText(page);
    assert.match(String(status || ""), /锟斤拷同锟斤拷|同锟斤拷/);
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
  await ensurePlaceholderTitleSelection(page);
  await page.keyboard.type("Immediate Title");

  await waitFor(async () => {
    const editorValue = await page.locator("#editorBody").inputValue();
    const tabTitle = await page.locator(".tab.active .tab-title").textContent();
    assert.match(editorValue, /^# Immediate Title\b/);
    assert.doesNotMatch(editorValue, /未锟斤拷锟斤拷锟绞硷拷/);
    assert.match(editorValue, /## 锟斤拷锟侥观碉拷/);
    assert.match(editorValue, /## 为什么锟斤拷锟斤拷/);
    assert.match(editorValue, /## 锟竭斤拷 \/ 锟斤拷锟斤拷/);
    assert.match(editorValue, /## 锟斤拷锟斤拷锟斤拷锟斤拷/);
    assert.match(tabTitle || "", /Immediate Title/);
  }, 7000);
});

test("prototype note browser stays minimal and creates literature notes in the literature root", async (t) => {
  if (process.env.RUN_BROWSER_E2E !== "1") {
    t.skip("Set RUN_BROWSER_E2E=1 to enable browser e2e in local runs.");
    return;
  }

  const playwright = await optionalPlaywright(t);
  if (!playwright) return;

  const stack = await startPrototypeStack(t, playwright);
  if (!stack) return;
  const { apiBase, page } = stack;

  const assertMinimalBrowser = async (action, rootId) => {
    if (action) await page.locator(`[data-action="${action}"]`).click();
    await page.waitForFunction((expectedRootId) => window.__prototypeState?.browserRootId === expectedRootId, rootId);
    const sidebar = await page.evaluate(() => {
      const visible = (selector) => {
        const el = document.querySelector(selector);
        if (!el) return false;
        const style = window.getComputedStyle(el);
        const box = el.getBoundingClientRect();
        return style.display !== "none" && style.visibility !== "hidden" && box.width > 0 && box.height > 0;
      };
      return {
        title: document.querySelector("#sidebarTitle")?.textContent?.trim() || "",
        subtitleVisible: visible("#sidebarSubtitle"),
        flowVisible: visible("#sidebarFlow"),
        footVisible: visible("#sidebarFoot"),
        moduleVisible: visible("#moduleSidebar"),
        listVisible: visible("#listArea"),
        flowText: document.querySelector("#sidebarFlow")?.textContent?.trim() || "",
        listText: document.querySelector("#listArea")?.textContent?.trim() || ""
      };
    });

    assert.doesNotMatch(sidebar.title, /工作台|跟进/);
    assert.equal(sidebar.subtitleVisible, false);
    assert.equal(sidebar.flowVisible, false);
    assert.equal(sidebar.footVisible, false);
    assert.equal(sidebar.moduleVisible, false);
    assert.equal(sidebar.listVisible, true);
    assert.equal(sidebar.flowText, "");
    assert.ok(sidebar.listText.length > 0);
  };

  await assertMinimalBrowser("quick-original", "dir_original_default");
  await assertMinimalBrowser("quick-fleeting", "dir_fleeting_default");
  await assertMinimalBrowser("quick-literature", "dir_literature_default");

  const literatureBefore = await fetchJson(apiBase, "/api/v1/directories/dir_literature_default/notes");
  const originalBefore = await fetchJson(apiBase, "/api/v1/directories/dir_original_default/notes");
  assert.equal(literatureBefore.status, 200);
  assert.equal(originalBefore.status, 200);

  assert.match((await page.locator("#btnNewNote").getAttribute("aria-label")) || "", /锟斤拷摘/);
  await page.locator("#btnNewNote").click();

  await waitFor(async () => {
    const active = await page.evaluate(() => {
      const state = window.__prototypeState || {};
      const activeTab = Array.isArray(state.tabs) ? state.tabs.find((tab) => tab.id === state.activeTabId) : null;
      const noteId = state.selectedFileId || activeTab?.noteId || "";
      const note = Array.isArray(state.notes) ? state.notes.find((item) => item.id === noteId) : null;
      return {
        browserRootId: state.browserRootId,
        selectedFolderId: state.selectedFolderId,
        noteId,
        folderId: note?.folderId || "",
        noteType: note?.noteType || ""
      };
    });
    assert.equal(active.browserRootId, "dir_literature_default");
    assert.equal(active.selectedFolderId, "dir_literature_default");
    assert.equal(active.folderId, "dir_literature_default");
    assert.equal(active.noteType, "literature");
    assert.ok(active.noteId);

    const literatureAfter = await fetchJson(apiBase, "/api/v1/directories/dir_literature_default/notes");
    const originalAfter = await fetchJson(apiBase, "/api/v1/directories/dir_original_default/notes");
    assert.equal(literatureAfter.json.total, literatureBefore.json.total + 1);
    assert.equal(originalAfter.json.total, originalBefore.json.total);
  }, 10000);
});

test("prototype mobile viewport keeps new note entry discoverable", async (t) => {
  if (process.env.RUN_BROWSER_E2E !== "1") {
    t.skip("Set RUN_BROWSER_E2E=1 to enable browser e2e in local runs.");
    return;
  }

  const playwright = await optionalPlaywright(t);
  if (!playwright) return;

  const stack = await startPrototypeStack(t, playwright, {
    beforeGoto: async (page) => {
      await page.setViewportSize({ width: 390, height: 844 });
    }
  });
  if (!stack) return;
  const { page } = stack;

  await page.waitForSelector("#btnMobileNewNote");
  await page.locator("#editorThinkingStatus", { hasText: "锟斤拷写锟桔碉拷" }).waitFor();

  const mobileLayout = await page.evaluate(() => {
    const fab = document.querySelector("#btnMobileNewNote");
    const sidebarNew = document.querySelector("#btnNewNote");
    const toolbar = document.querySelector("#editorWorkspace > .toolbar");
    const thinkingStatus = document.querySelector("#editorThinkingStatus");
    const rect = (el) => {
      if (!el) return null;
      const box = el.getBoundingClientRect();
      return { width: box.width, height: box.height, left: box.left, right: box.right };
    };
    const isVisible = (el) => {
      if (!el) return false;
      const style = window.getComputedStyle(el);
      const box = el.getBoundingClientRect();
      return style.display !== "none" && style.visibility !== "hidden" && box.width > 0 && box.height > 0;
    };
    return {
      viewportWidth: window.innerWidth,
      documentWidth: document.documentElement.scrollWidth,
      bodyWidth: document.body.scrollWidth,
      fab: { visible: isVisible(fab), text: fab?.textContent?.trim() || "", rect: rect(fab) },
      thinkingStatus: { visible: isVisible(thinkingStatus), text: thinkingStatus?.textContent?.trim() || "", rect: rect(thinkingStatus) },
      sidebarNew: { visible: isVisible(sidebarNew), rect: rect(sidebarNew) },
      toolbar: {
        rect: rect(toolbar),
        scrollWidth: toolbar?.scrollWidth || 0,
        clientWidth: toolbar?.clientWidth || 0,
        overflowX: toolbar ? window.getComputedStyle(toolbar).overflowX : "",
        flexWrap: toolbar ? window.getComputedStyle(toolbar).flexWrap : ""
      }
    };
  });

  assert.equal(mobileLayout.fab.visible, true);
  assert.match(mobileLayout.fab.text, /锟铰斤拷|锟斤拷锟斤拷/);
  assert.equal(mobileLayout.thinkingStatus.visible, true);
  assert.match(mobileLayout.thinkingStatus.text, /锟斤拷写锟桔碉拷/);
  assert.equal(mobileLayout.sidebarNew.visible, false);
  assert.equal(mobileLayout.documentWidth <= mobileLayout.viewportWidth + 1, true);
  assert.equal(mobileLayout.bodyWidth <= mobileLayout.viewportWidth + 1, true);
  assert.equal(mobileLayout.toolbar.overflowX, "auto");
  assert.equal(mobileLayout.toolbar.flexWrap, "nowrap");
  assert.ok(mobileLayout.toolbar.scrollWidth > mobileLayout.toolbar.clientWidth);

  await page.locator("#btnMobileNewNote").click();
  await page.waitForSelector(".tab.active");

  await waitFor(async () => {
    const editorValue = await page.locator("#editorBody").inputValue();
    const activeTabText = await page.locator(".tab.active").textContent();
    assert.match(editorValue, /^#\s*\S/);
    assert.ok(String(activeTabText || "").trim().length > 0);
  }, 7000);
});

test("prototype mobile viewport keeps permanent-note capture flow usable", async (t) => {
  if (process.env.RUN_BROWSER_E2E !== "1") {
    t.skip("Set RUN_BROWSER_E2E=1 to enable browser e2e in local runs.");
    return;
  }

  const playwright = await optionalPlaywright(t);
  if (!playwright) return;

  const stack = await startPrototypeStack(t, playwright, {
    beforeGoto: async (page) => {
      await page.setViewportSize({ width: 390, height: 844 });
    }
  });
  if (!stack) return;
  const { page } = stack;
  const artifactDir = await makeTempDir("yansilu-mobile-permanent-note-");
  t.diagnostic(`mobile permanent-note artifacts: ${artifactDir}`);

  await page.locator('[data-action="quick-fleeting"]').click();
  await page.waitForTimeout(200);
  await page.locator("#btnMobileNewNote").click();
  await page.waitForSelector(".tab.active");

  const sourceFab = page.locator("#btnSourceToPermanent");
  await waitFor(async () => {
    assert.equal(await sourceFab.isVisible(), true);
  }, 7000);

  const mobileEntry = await page.evaluate(() => {
    const fab = document.querySelector("#btnSourceToPermanent");
    const sidebarCta = document.querySelector("[data-record-permanent-note]");
    const box = (el) => {
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      return { width: rect.width, height: rect.height, left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom };
    };
    const visible = (el) => {
      if (!el) return false;
      const style = window.getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
    };
    return {
      viewportWidth: window.innerWidth,
      fabVisible: visible(fab),
      fabBox: box(fab),
      sidebarCtaVisible: visible(sidebarCta)
    };
  });

  assert.equal(mobileEntry.fabVisible, true);
  assert.equal(mobileEntry.sidebarCtaVisible, false);
  assert.ok(mobileEntry.fabBox.width >= 120);
  assert.ok(mobileEntry.fabBox.height >= 36);
  assert.ok(mobileEntry.fabBox.right <= mobileEntry.viewportWidth);
  await page.screenshot({ path: path.join(artifactDir, "mobile-fab-cta.png") });

  await sourceFab.click();
  await waitFor(async () => {
    assert.equal(await page.locator("#permanentTargetModal.hidden").count(), 0);
  }, 4000);

  const modalState = await page.evaluate(() => {
    const modal = document.querySelector("#permanentTargetModal .permanent-target-modal");
    const options = [...document.querySelectorAll("#permanentTargetList .permanent-target-option")];
    const confirm = document.querySelector("#permanentTargetConfirm");
    const cancel = document.querySelector("#permanentTargetCancel");
    const box = (el) => {
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      return { width: rect.width, height: rect.height, left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom };
    };
    return {
      viewportWidth: window.innerWidth,
      modalBox: box(modal),
      optionCount: options.length,
      firstOptionBox: box(options[0]),
      secondOptionBox: box(options[1] || options[0]),
      confirmBox: box(confirm),
      cancelBox: box(cancel)
    };
  });

  assert.ok(modalState.optionCount >= 1);
  assert.ok(modalState.modalBox.width <= modalState.viewportWidth);
  assert.ok(modalState.firstOptionBox.width > 200);
  assert.ok(modalState.confirmBox.width > 100);
  assert.ok(modalState.cancelBox.width > 100);
  assert.equal(modalState.confirmBox.top, modalState.cancelBox.top);
  await page.screenshot({ path: path.join(artifactDir, "mobile-directory-modal-root.png") });

  const options = page.locator("#permanentTargetList .permanent-target-option");
  if ((await options.count()) > 1) {
    const secondOption = options.nth(1);
    await secondOption.click();
    await waitFor(async () => {
      assert.equal(await secondOption.getAttribute("aria-pressed"), "true");
    }, 3000);
  } else {
    await waitFor(async () => {
      assert.equal(await options.first().getAttribute("aria-pressed"), "true");
    }, 3000);
  }
  await page.screenshot({ path: path.join(artifactDir, "mobile-directory-modal-selected.png") });
});

test("prototype renders thinking status in note tree and editor header", async (t) => {
  if (process.env.RUN_BROWSER_E2E !== "1") {
    t.skip("Set RUN_BROWSER_E2E=1 to enable browser e2e in local runs.");
    return;
  }

  const playwright = await optionalPlaywright(t);
  if (!playwright) return;

  const stack = await startPrototypeStack(t, playwright);
  if (!stack) return;
  const { page } = stack;

  await page.locator("#editorThinkingStatus", { hasText: "锟斤拷写锟桔碉拷" }).waitFor();
  await page.waitForFunction(() => {
    const listText = document.querySelector("#listArea")?.textContent || "";
    return listText.includes("锟斤拷写锟桔碉拷");
  });

  const thinkingUi = await page.evaluate(() => {
    const header = document.querySelector("#editorThinkingStatus");
    const treeBadge = document.querySelector(".item-badge-thinking");
    const isVisible = (el) => {
      if (!el) return false;
      const style = window.getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
    };
    return {
      headerText: header?.textContent?.trim() || "",
      headerTone: header?.getAttribute("data-tone") || "",
      treeBadgeVisible: isVisible(treeBadge),
      treeBadgeText: treeBadge?.textContent?.trim() || "",
      treeBadgeStatus: treeBadge?.getAttribute("data-status") || "",
      treeBadgeTitle: treeBadge?.getAttribute("title") || ""
    };
  });

  assert.match(thinkingUi.headerText, /锟斤拷写锟桔碉拷/);
  assert.match(thinkingUi.headerText, /写一锟戒话锟斤拷锟斤拷/);
  assert.equal(thinkingUi.headerTone, "next");
  assert.equal(thinkingUi.treeBadgeVisible, true);
  assert.match(thinkingUi.treeBadgeText, /锟斤拷写锟桔碉拷/);
  assert.equal(thinkingUi.treeBadgeStatus, "needs_thesis");
  assert.match(thinkingUi.treeBadgeTitle, /写一锟戒话锟斤拷锟斤拷/);
});

test("prototype permanent note distillation panel saves thesis and three-line summary", async (t) => {
  if (process.env.RUN_BROWSER_E2E !== "1") {
    t.skip("Set RUN_BROWSER_E2E=1 to enable browser e2e in local runs.");
    return;
  }

  const playwright = await optionalPlaywright(t);
  if (!playwright) return;

  const stack = await startPrototypeStack(t, playwright);
  if (!stack) return;
  const { apiBase, page } = stack;

  await page.waitForFunction(() => document.querySelector("#importPanel")?.classList.contains("hidden"));
  await page.waitForFunction(() => !document.querySelector("#markdownPanel")?.classList.contains("hidden"));

  await createAndSaveNoteViaEditor(
    page,
    "# Distillation Seed\n\nA permanent note that will be distilled in the inspector."
  );

  const noteId = await page.evaluate(() => window.__prototypeEditor?.activeNote?.()?.id || "");
  assert.ok(noteId);

  await page.locator("#btnShowRelated").click();
  await page.locator('[data-note-distillation-form] textarea[name="thesis"]').waitFor({ state: "visible" });
  await page.locator('[data-note-distillation-form] textarea[name="boundaryOrCounterpoint"]').waitFor({ state: "visible" });

  await page.fill('[data-note-distillation-form] textarea[name="thesis"]', "Distilled thesis.");
  await page.fill('[data-note-distillation-form] textarea[name="summary1"]', "Line one.");
  await page.fill('[data-note-distillation-form] textarea[name="summary2"]', "Line two.");
  await page.fill('[data-note-distillation-form] textarea[name="summary3"]', "Line three.");
  await page.selectOption('[data-note-distillation-form] select[name="distillationStatus"]', "confirmed");
  await page.click('[data-note-distillation-form] button[type="submit"]');

  await waitFor(async () => {
    const statusText = await currentStatusText(page);
    assert.match(String(statusText || ""), /锟桔碉拷锟街讹拷/);
  }, 10000);

  await waitFor(async () => {
    const note = await fetchJson(apiBase, `/api/v1/notes/${encodeURIComponent(noteId)}`);
    assert.equal(note.status, 200);
    assert.equal(note.json.item.thesis, "Distilled thesis.");
    assert.deepEqual(note.json.item.threeLineSummary, ["Line one.", "Line two.", "Line three."]);
    assert.equal(note.json.item.distillationStatus, "confirmed");
  }, 10000);

  await page.locator('[data-module="distillation"]').click();
  await page.locator("#distillationPanel .distillation-filter", { hasText: "锟斤拷一锟戒话锟叫讹拷" }).waitFor();
  await page.locator("#distillationPanel .distillation-filter", { hasText: "锟斤拷锟斤拷锟戒话压锟斤拷" }).waitFor();
  await page.locator("#distillationPanel .distillation-filter", { hasText: "锟斤拷确锟斤拷" }).waitFor();
  await page.locator("#distillationPanel .distillation-queue-item", { hasText: "Distillation Seed" }).waitFor();
  await page.locator("#distillationPanel .distillation-queue-item", { hasText: "Distillation Seed" }).click();
  await page.locator("[data-note-distillation-section]", { hasText: "锟桔碉拷锟结纯" }).waitFor();
  await page.locator("[data-note-distillation-quality]", { hasText: "锟斤拷锟斤拷锟斤拷示" }).waitFor();
  await page.locator("[data-note-distillation-quality]", { hasText: "锟斤拷缺锟竭界、锟斤拷锟斤拷锟津反凤拷" }).waitFor();
  await page.locator('[data-note-distillation-form] select[name="distillationStatus"]').waitFor({ state: "visible" });
  assert.equal(await page.locator('[data-note-distillation-form] select[name="distillationStatus"]').inputValue(), "confirmed");
});

test("prototype main-path card refreshes relation state and does not leak stale relation status across note switches", async (t) => {
  if (process.env.RUN_BROWSER_E2E !== "1") {
    t.skip("Set RUN_BROWSER_E2E=1 to enable browser e2e in local runs.");
    return;
  }

  const playwright = await optionalPlaywright(t);
  if (!playwright) return;

  const stack = await startPrototypeStack(t, playwright);
  if (!stack) return;
  const { apiBase, page, webBase } = stack;

  const target = await postJson(apiBase, "/api/v1/notes", {
    directoryId: "dir_original_default",
    body: "# Main Path Relation Target\n\nThis note is the target for a loaded semantic relation."
  });
  assert.equal(target.status, 201, JSON.stringify(target.json));

  const source = await postJson(apiBase, "/api/v1/notes", {
    directoryId: "dir_original_default",
    body: "# Main Path Relation Source\n\nThis note should show a loaded relation in the main-path card."
  });
  assert.equal(source.status, 201, JSON.stringify(source.json));

  const plain = await postJson(apiBase, "/api/v1/notes", {
    directoryId: "dir_original_default",
    body: "# Main Path Plain Note\n\nThis note should not inherit the previous note relation state."
  });
  assert.equal(plain.status, 201, JSON.stringify(plain.json));

  const relation = await postJson(apiBase, `/api/v1/notes/${encodeURIComponent(source.json.item.id)}/relations`, {
    toNoteId: target.json.item.id,
    relationType: "supports",
    rationale: "This explicit relation should surface in the main-path card after relations load.",
    insightQuestion: "Does the main-path card wait for explicit relations before deciding the next step?",
    confidence: 1
  });
  assert.equal(relation.status, 201, JSON.stringify(relation.json));

  await page.goto(`${webBase}/prototype`, { waitUntil: "networkidle" });
  await page.locator('.explorer-item[data-kind="file"]', { hasText: "Main Path Relation Source" }).click();
  await ensureNoteMode(page);
  await page.locator("#btnShowRelated").click();

  await page.waitForFunction(() => {
    const text = document.querySelector("[data-note-main-path-section]")?.textContent || "";
    return text.trim().length > 0;
  });

  await waitFor(async () => {
    const text = await page.locator("[data-note-main-path-section]").textContent();
    assert.match(String(text || ""), /锟窖斤拷 1|锟斤拷锟斤拷锟斤拷 1/);
  }, 10000);

  await page.locator('.explorer-item[data-kind="file"]', { hasText: "Main Path Plain Note" }).click();

  await waitFor(async () => {
    const text = await page.locator("[data-note-main-path-section]").textContent();
    assert.doesNotMatch(String(text || ""), /锟窖斤拷 1|锟斤拷锟斤拷锟斤拷 1/);
    assert.match(String(text || ""), /锟斤拷锟斤拷锟斤拷|锟斤拷锟桔猴拷|锟斤拷系 0/);
  }, 10000);
});

test("prototype main-path relation action opens create form and focuses relation target search", async (t) => {
  if (process.env.RUN_BROWSER_E2E !== "1") {
    t.skip("Set RUN_BROWSER_E2E=1 to enable browser e2e in local runs.");
    return;
  }

  const playwright = await optionalPlaywright(t);
  if (!playwright) return;

  const stack = await startPrototypeStack(t, playwright);
  if (!stack) return;
  const { apiBase, page, webBase } = stack;

  const target = await postJson(apiBase, "/api/v1/notes", {
    directoryId: "dir_original_default",
    body: "# Main Path Create Target\n\nThis target should appear in the create relation form."
  });
  assert.equal(target.status, 201, JSON.stringify(target.json));

  const source = await postJson(apiBase, "/api/v1/notes", {
    directoryId: "dir_original_default",
    body: "# Main Path Create Source\n\nThis note has no explicit relations yet."
  });
  assert.equal(source.status, 201, JSON.stringify(source.json));

  await page.goto(`${webBase}/prototype`, { waitUntil: "networkidle" });
  await page.locator('.explorer-item[data-kind="file"]', { hasText: "Main Path Create Source" }).click();
  await ensureNoteMode(page);
  await page.locator("#btnShowRelated").click();

  await page.locator('[data-note-main-route-action="relations"]').click();

  await page.locator("[data-create-relation-form]").waitFor();
  await waitFor(async () => {
    const focused = await page.evaluate(() => {
      const active = document.activeElement;
      return active?.hasAttribute?.("data-relation-target-search") || active?.getAttribute?.("name") === "targetQuery";
    });
    assert.equal(focused, true);
  }, 4000);

  const highlighted = await page.evaluate(() =>
    document.querySelector("[data-note-relations-section]")?.classList.contains("is-jump-target") || false
  );
  assert.equal(highlighted, true);

  const createFormText = await page.locator("[data-create-relation-form]").textContent();
  assert.match(String(createFormText || ""), /Main Path Create Target/);
});

test("prototype main-path writing readiness matches writing center basket status for the same note", async (t) => {
  if (process.env.RUN_BROWSER_E2E !== "1") {
    t.skip("Set RUN_BROWSER_E2E=1 to enable browser e2e in local runs.");
    return;
  }

  const playwright = await optionalPlaywright(t);
  if (!playwright) return;

  const stack = await startPrototypeStack(t, playwright);
  if (!stack) return;
  const { apiBase, page, webBase } = stack;

  const note = await postJson(apiBase, "/api/v1/notes", {
    directoryId: "dir_original_default",
    status: "active",
    title: "Readiness Basket Note",
    body: "# Readiness Basket Note\n\nA confirmed note with no explicit boundary yet.",
    thesis: "A durable note should be allowed into the basket before it is ready for project creation.",
    threeLineSummary: [
      "The note already has a reusable judgment.",
      "It matters because basket entry should happen earlier than project creation.",
      "It should still wait for stronger structure before stronger actions."
    ],
    distillationStatus: "confirmed",
    authorship: {
      user_confirmed: true,
      ai_assisted: false
    }
  });
  assert.equal(note.status, 201, JSON.stringify(note.json));

  await page.goto(`${webBase}/prototype`, { waitUntil: "networkidle" });
  await page.locator('.explorer-item[data-kind="file"]', { hasText: "Readiness Basket Note" }).click();
  await ensureNoteMode(page);
  await page.locator("#btnShowRelated").click();

  await waitFor(async () => {
    const text = await page.locator("[data-note-main-path-section]").textContent();
    assert.match(String(text || ""), /锟缴硷拷锟斤拷写锟斤拷锟斤拷/);
  }, 10000);

  await page.locator('.rail-btn[data-module="writing"]').click();
  await page.waitForFunction(() => !document.querySelector("#writingPanel")?.classList.contains("hidden"));
  await page.click("#btnWritingUseCurrent");

  await waitFor(async () => {
    const strip = await page.locator("#writingStatusStrip").textContent();
    assert.match(String(strip || ""), /锟斤拷锟斤拷/);
    assert.match(String(strip || ""), /锟缴硷拷锟斤拷写锟斤拷锟斤拷/);
  }, 10000);

  const createProjectText = await page.locator("#btnWritingCreateProject").textContent();
  assert.match(String(createProjectText || ""), /锟饺诧拷锟斤拷锟斤拷锟劫斤拷锟斤拷目/);

  const strongModelText = await page.locator("#btnWritingStrongModelAnalysis").textContent();
  assert.match(String(strongModelText || ""), /锟饺诧拷锟斤拷锟斤拷/);
});

test("prototype main-path project-ready state matches writing center project readiness", async (t) => {
  if (process.env.RUN_BROWSER_E2E !== "1") {
    t.skip("Set RUN_BROWSER_E2E=1 to enable browser e2e in local runs.");
    return;
  }

  const playwright = await optionalPlaywright(t);
  if (!playwright) return;

  const stack = await startPrototypeStack(t, playwright);
  if (!stack) return;
  const { apiBase, page, webBase } = stack;

  const target = await postJson(apiBase, "/api/v1/notes", {
    directoryId: "dir_original_default",
    status: "active",
    title: "Readiness Project Target",
    body: "# Readiness Project Target\n\nA durable target note.",
    thesis: "A target note helps the source note become structurally ready for project creation.",
    threeLineSummary: [
      "The target note already has a reusable judgment.",
      "It matters because the source note should not remain isolated.",
      "It helps the source note move beyond basket-only readiness."
    ],
    distillationStatus: "confirmed",
    authorship: {
      user_confirmed: true,
      ai_assisted: false
    },
    boundaryOrCounterpoint: "This target note is only useful when its relation is explicit."
  });
  assert.equal(target.status, 201, JSON.stringify(target.json));

  const source = await postJson(apiBase, "/api/v1/notes", {
    directoryId: "dir_original_default",
    status: "active",
    title: "Readiness Project Note",
    body: "# Readiness Project Note\n\n[[Readiness Project Target]]\n\nA confirmed note with one explicit relation and a boundary.",
    thesis: "A durable note should become project-ready once boundary and relation are both explicit.",
    threeLineSummary: [
      "The note has a reusable judgment.",
      "It matters because project creation should happen after basket entry, not before.",
      "It should still wait for richer theme signals before strong-model analysis."
    ],
    distillationStatus: "confirmed",
    authorship: {
      user_confirmed: true,
      ai_assisted: false
    },
    boundaryOrCounterpoint: "This readiness only makes sense after at least one explicit relation is added."
  });
  assert.equal(source.status, 201, JSON.stringify(source.json));

  const relation = await postJson(apiBase, `/api/v1/notes/${encodeURIComponent(source.json.item.id)}/relations`, {
    toNoteId: target.json.item.id,
    relationType: "supports",
    rationale: "The target note strengthens the source note enough to justify project creation.",
    insightQuestion: "What is still missing before this turns into strong-model-ready material?",
    confidence: 1
  });
  assert.equal(relation.status, 201, JSON.stringify(relation.json));

  await page.goto(`${webBase}/prototype`, { waitUntil: "networkidle" });
  await page.locator('.explorer-item[data-kind="file"]', { hasText: "Readiness Project Note" }).click();
  await ensureNoteMode(page);
  await page.locator("#btnShowRelated").click();

  await waitFor(async () => {
    const actionText = await page.locator('[data-note-main-route-action="writing"]').textContent();
    assert.match(String(actionText || ""), /锟斤拷锟斤拷锟斤拷目/);
  }, 10000);

  await page.locator('.rail-btn[data-module="writing"]').click();
  await page.waitForFunction(() => !document.querySelector("#writingPanel")?.classList.contains("hidden"));
  await page.click("#btnWritingUseCurrent");

  await waitFor(async () => {
    const state = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll("#writingStatusStrip .writing-status-card")).map((card) => ({
        label: card.querySelector("span")?.textContent || "",
        value: card.querySelector("strong")?.textContent || "",
        note: card.querySelector("small")?.textContent || ""
      }));
      const cardByLabel = (label) => cards.find((card) => card.label === label) || null;
      const createProject = document.querySelector("#btnWritingCreateProject");
      const strongModel = document.querySelector("#btnWritingStrongModelAnalysis");
      return {
        projectCard: cardByLabel("锟斤拷目"),
        strongModelCard: cardByLabel("强模锟斤拷"),
        createProjectText: createProject?.textContent || "",
        createProjectDisabled: Boolean(createProject?.disabled),
        strongModelText: strongModel?.textContent || "",
        strongModelDisabled: Boolean(strongModel?.disabled)
      };
    });

    assert.equal(state.projectCard?.value, "锟缴达拷锟斤拷");
    assert.match(String(state.projectCard?.note || ""), /锟斤拷锟斤拷目/);
    assert.equal(state.strongModelCard?.value, "锟饺诧拷锟斤拷锟斤拷");
    assert.match(String(state.strongModelCard?.note || ""), /锟斤拷锟斤拷锟斤拷锟斤拷/);
    assert.equal(state.createProjectDisabled, false);
    assert.equal(state.strongModelDisabled, true);
    assert.match(String(state.createProjectText || ""), /锟斤拷锟斤拷写锟斤拷锟斤拷目/);
    assert.match(String(state.strongModelText || ""), /锟饺诧拷锟斤拷锟斤拷/);
  }, 10000);
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

test("prototype related inspector renders explicit semantic relations", async (t) => {
  if (process.env.RUN_BROWSER_E2E !== "1") {
    t.skip("Set RUN_BROWSER_E2E=1 to enable browser e2e in local runs.");
    return;
  }

  const playwright = await optionalPlaywright(t);
  if (!playwright) return;

  const stack = await startPrototypeStack(t, playwright);
  if (!stack) return;
  const { apiBase, page, webBase } = stack;

  const target = await postJson(apiBase, "/api/v1/notes", {
    directoryId: "dir_original_default",
    body: "# Relation Target`n`nThis target note collects the claim that still needs supporting evidence."
  });
  assert.equal(target.status, 201, JSON.stringify(target.json));

  const source = await postJson(apiBase, "/api/v1/notes", {
    directoryId: "dir_original_default",
    body: "# Relation Source`n`nThis source note should justify the target claim through an explicit support relation."
  });
  assert.equal(source.status, 201, JSON.stringify(source.json));

  const relation = await postJson(apiBase, `/api/v1/notes/${encodeURIComponent(source.json.item.id)}/relations`, {
    toNoteId: target.json.item.id,
    relationType: "supports",
    rationale: "This source note gives the target claim a concrete supporting reason.",
    insightQuestion: "What exactly makes the support relation strong enough to trust in later writing?",
    confidence: 1
  });
  assert.equal(relation.status, 201, JSON.stringify(relation.json));

  await page.goto(`${webBase}/prototype`, { waitUntil: "networkidle" });
  await page.locator('.explorer-item[data-kind="file"]', { hasText: "Relation Source" }).click();
  await ensureNoteMode(page);
  await page.locator("#btnShowRelated").click();

  await waitFor(async () => {
    const relatedText = await page.locator("#relatedPanel").textContent();
    assert.match(String(relatedText || ""), /Relation Source/);
    assert.match(String(relatedText || ""), /supports/);
    assert.match(String(relatedText || ""), /Relation Target/);
    assert.match(String(relatedText || ""), /support/);
    assert.match(String(relatedText || ""), /concrete supporting reason/);
    assert.match(String(relatedText || ""), /strong enough to trust/);
  }, 10000);
});

test("prototype related inspector can create an explicit semantic relation", async (t) => {
  if (process.env.RUN_BROWSER_E2E !== "1") {
    t.skip("Set RUN_BROWSER_E2E=1 to enable browser e2e in local runs.");
    return;
  }

  const playwright = await optionalPlaywright(t);
  if (!playwright) return;

  const stack = await startPrototypeStack(t, playwright);
  if (!stack) return;
  const { apiBase, page, webBase } = stack;

  const target = await postJson(apiBase, "/api/v1/notes", {
    directoryId: "dir_original_default",
    status: "active",
    body: "# Writing Target`n`nThis note is the target that still needs a clearly supported relation before drafting.",
    thesis: "A draft should treat supporting evidence as an explicit relation instead of an implied shortcut.",
    threeLineSummary: [
      "The target starts in a state where the support path is still missing.",
      "Its value comes from making the relation and evidence visible.",
      "The source relation should keep the draft grounded in the note state."
    ],
    distillationStatus: "confirmed",
    authorship: {
      user_confirmed: true,
      ai_assisted: false
    },
    boundaryOrCounterpoint: "Only treat the target as stable when the support relation is explicit and reviewable."
  });
  assert.equal(target.status, 201, JSON.stringify(target.json));

  const source = await postJson(apiBase, "/api/v1/notes", {
    directoryId: "dir_original_default",
    status: "active",
    body: "# Writing Source`n`nThis note should provide the evidence that makes the target relation explicit.",
    thesis: "A clear source boundary helps later writing keep the support path honest.",
    threeLineSummary: [
      "The source note should remain inspectable before drafting.",
      "The relation should be justified instead of guessed from proximity.",
      "A transparent support path makes later drafting more reliable."
    ],
    distillationStatus: "confirmed",
    authorship: {
      user_confirmed: true,
      ai_assisted: false
    },
    boundaryOrCounterpoint: "Only collapse the relation into draft language after the support path is explicit."
  });
  assert.equal(source.status, 201, JSON.stringify(source.json));

  await page.goto(`${webBase}/prototype`, { waitUntil: "networkidle" });
  await page.locator('.explorer-item[data-kind="file"]', { hasText: "Writing Source" }).click();
  await ensureNoteMode(page);
  await page.locator("#btnShowRelated").click();
  await waitFor(async () => {
    const actionText = await page.locator('[data-note-main-route-action="writing"]').textContent();
    assert.match(String(actionText || ""), /写|draft|Writing/i);
  }, 10000);
  await page.locator('#resultArea [data-relation-action="open-create"]').click();

  const createFormText = await page.locator("[data-create-relation-form]").textContent();
  assert.match(String(createFormText || ""), /supports|relation/i);
  assert.match(String(createFormText || ""), /insight|问题|question/i);
  assert.match(String(createFormText || ""), /rationale|理由|依据/i);

  await page.locator('[data-create-relation-form] select[name="toNoteId"]').selectOption(target.json.item.id);
  await page.locator('[data-create-relation-form] select[name="relationType"]').selectOption("supports");
  await page.locator('[data-create-relation-form] textarea[name="rationale"]').fill("This source note gives the target one explicit supporting reason, with a boundary the draft can keep visible.");
  await page.locator('[data-create-relation-form] textarea[name="insightQuestion"]').fill("What makes this support path explicit enough to survive later drafting without being flattened?");
  const qualityText = await page.locator('[data-create-relation-form] [data-relation-quality]').textContent();
  assert.ok(String(qualityText || "").trim().length > 0);
  await page.locator('[data-create-relation-form] button[type="submit"]').click();

  await waitFor(async () => {
    const relatedText = await page.locator("#relatedPanel").textContent();
    assert.match(String(relatedText || ""), /锟斤拷系锟窖斤拷锟斤拷/);
    assert.match(String(relatedText || ""), /锟斤拷锟斤拷锟斤拷目锟斤拷/);
    assert.match(String(relatedText || ""), /锟斤拷锟斤拷锟斤拷锟斤拷源为目锟斤拷锟结供锟斤拷一锟斤拷锟斤拷确支锟斤拷/);
    assert.match(String(relatedText || ""), /锟斤拷锟斤拷锟斤拷锟斤拷/);
  }, 10000);

  await waitFor(async () => {
    const actionText = await page.locator('[data-note-main-route-action="writing"]').textContent();
    assert.match(String(actionText || ""), /锟斤拷锟斤拷锟斤拷目/);
  }, 10000);

  await page.locator('.rail-btn[data-module="writing"]').click();
  await page.waitForFunction(() => !document.querySelector("#writingPanel")?.classList.contains("hidden"));
  await page.click("#btnWritingUseCurrent");

  await waitFor(async () => {
    const statusStripText = await page.locator("#writingStatusStrip").textContent();
    assert.match(String(statusStripText || ""), /锟斤拷目/);
    assert.match(String(statusStripText || ""), /锟缴达拷锟斤拷/);
    assert.match(String(statusStripText || ""), /强模锟斤拷/);
    assert.match(String(statusStripText || ""), /锟饺诧拷锟斤拷锟斤拷/);
    const createProjectText = await page.locator("#btnWritingCreateProject").textContent();
    assert.match(String(createProjectText || ""), /锟斤拷锟斤拷写锟斤拷锟斤拷目/);
  }, 10000);

  await page.locator('.rail-btn[data-module="graph"]').click();
  await waitFor(async () => {
    const summary = await page.locator("#graphSummary").textContent();
    const [nodeCount = 0, edgeCount = 0] = [...String(summary || "").matchAll(/\d+/g)].map((match) => Number(match[0]));
    assert.ok(nodeCount >= 2, summary || "");
    assert.ok(edgeCount >= 1, summary || "");
    const graphText = await page.locator("#graphCanvas").textContent();
    assert.match(String(graphText || ""), /锟斤拷锟斤拷锟斤拷锟斤拷源/);
    assert.match(String(graphText || ""), /锟斤拷锟斤拷锟斤拷目锟斤拷/);
  }, 10000);

  const relations = await fetchJson(apiBase, `/api/v1/notes/${encodeURIComponent(source.json.item.id)}/relations`);
  assert.equal(relations.status, 200, JSON.stringify(relations.json));
  assert.equal(relations.json.item.outgoingLinks.length, 1);
  assert.equal(relations.json.item.outgoingLinks[0].toNoteId, target.json.item.id);
  assert.equal(relations.json.item.outgoingLinks[0].relationType, "supports");
  assert.equal(relations.json.item.outgoingLinks[0].rationale, "锟斤拷锟斤拷锟斤拷锟斤拷源为目锟斤拷锟结供锟斤拷一锟斤拷锟斤拷确支锟脚ｏ拷锟斤拷为锟斤拷锟斤拷锟斤拷锟斤拷证锟捷和边界。");
});

test("prototype related inspector searches unloaded SQLite relation targets", async (t) => {
  if (process.env.RUN_BROWSER_E2E !== "1") {
    t.skip("Set RUN_BROWSER_E2E=1 to enable browser e2e in local runs.");
    return;
  }

  const playwright = await optionalPlaywright(t);
  if (!playwright) return;

  const stack = await startPrototypeStack(t, playwright);
  if (!stack) return;
  const { apiBase, page, vaultPath, webBase } = stack;

  const childDirectory = await postJson(apiBase, "/api/v1/directories", {
    title: "Relation Search Child",
    parentDirectoryId: "dir_original_default",
    directoryType: "custom",
    fsPath: path.join(vaultPath, "notes", "original", "relation-search-child"),
    maxNotes: 500
  });
  assert.equal(childDirectory.status, 201, JSON.stringify(childDirectory.json));

  const target = await postJson(apiBase, "/api/v1/notes", {
    directoryId: childDirectory.json.item.id,
    body: "# Remote Relation Target\n\nThis target lives in a child directory that the current note list has not loaded."
  });
  assert.equal(target.status, 201, JSON.stringify(target.json));

  const source = await postJson(apiBase, "/api/v1/notes", {
    directoryId: "dir_original_default",
    body: "# Relation Search Source\n\nThis note should find a target through SQLite search."
  });
  assert.equal(source.status, 201, JSON.stringify(source.json));

  await page.goto(`${webBase}/prototype`, { waitUntil: "networkidle" });
  await page.locator('.explorer-item[data-kind="file"]', { hasText: "Relation Search Source" }).click();
  await ensureNoteMode(page);
  await page.locator("#btnShowRelated").click();
  await page.locator('#resultArea [data-relation-action="open-create"]').click();
  await page.locator('[data-relation-target-search]').fill("Remote Relation Target");

  await waitFor(async () => {
    const options = await page.locator('[data-create-relation-form] select[name="toNoteId"] option').allTextContents();
    assert.ok(options.some((item) => item.includes("Remote Relation Target")), options.join(" | "));
  }, 10000);

  await page.locator('[data-create-relation-form] select[name="toNoteId"]').selectOption(target.json.item.id);
  await page.locator('[data-create-relation-form] select[name="relationType"]').selectOption("bridges");
  await page.locator('[data-create-relation-form] textarea[name="rationale"]').fill("SQLite 锟斤拷锟斤拷锟矫碉拷前锟绞硷拷锟斤拷锟接碉拷锟斤拷未锟斤拷锟截碉拷目锟疥。");
  await page.locator('[data-create-relation-form] textarea[name="insightQuestion"]').fill("锟斤拷目录目锟斤拷锟斤拷锟斤拷锟角凤拷锟姐够锟届？");
  await page.locator('[data-create-relation-form] button[type="submit"]').click();

  await waitFor(async () => {
    const relatedText = await page.locator("#relatedPanel").textContent();
    assert.match(String(relatedText || ""), /锟斤拷系锟窖斤拷锟斤拷/);
    assert.match(String(relatedText || ""), /Remote Relation Target/);
    assert.match(String(relatedText || ""), /SQLite 锟斤拷锟斤拷锟矫碉拷前锟绞硷拷锟斤拷锟接碉拷锟斤拷未锟斤拷锟截碉拷目锟斤拷/);
  }, 10000);

  const relations = await fetchJson(apiBase, `/api/v1/notes/${encodeURIComponent(source.json.item.id)}/relations`);
  assert.equal(relations.status, 200, JSON.stringify(relations.json));
  assert.equal(relations.json.item.outgoingLinks.length, 1);
  assert.equal(relations.json.item.outgoingLinks[0].toNoteId, target.json.item.id);
  assert.equal(relations.json.item.outgoingLinks[0].relationType, "bridges");
});

test("prototype related inspector can edit and delete an explicit semantic relation", async (t) => {
  if (process.env.RUN_BROWSER_E2E !== "1") {
    t.skip("Set RUN_BROWSER_E2E=1 to enable browser e2e in local runs.");
    return;
  }

  const playwright = await optionalPlaywright(t);
  if (!playwright) return;

  const stack = await startPrototypeStack(t, playwright);
  if (!stack) return;
  const { apiBase, page, webBase } = stack;

  const target = await postJson(apiBase, "/api/v1/notes", {
    directoryId: "dir_original_default",
    body: "# 锟缴编辑目锟斤拷\n\n锟斤拷锟斤拷锟绞硷拷锟斤拷锟斤拷锟斤拷证锟斤拷系锟洁辑锟斤拷"
  });
  assert.equal(target.status, 201, JSON.stringify(target.json));

  const source = await postJson(apiBase, "/api/v1/notes", {
    directoryId: "dir_original_default",
    body: "# 锟缴编辑锟斤拷源\n\n锟斤拷锟斤拷锟绞硷拷锟斤拷一锟斤拷锟饺达拷锟睫改的癸拷系锟斤拷"
  });
  assert.equal(source.status, 201, JSON.stringify(source.json));

  const relation = await postJson(apiBase, `/api/v1/notes/${encodeURIComponent(source.json.item.id)}/relations`, {
    toNoteId: target.json.item.id,
    relationType: "supports",
    rationale: "锟斤拷始锟斤拷锟斤拷锟斤拷锟节编辑锟斤拷",
    insightQuestion: "锟斤拷始锟斤拷锟解？",
    confidence: 1
  });
  assert.equal(relation.status, 201, JSON.stringify(relation.json));

  await page.goto(`${webBase}/prototype`, { waitUntil: "networkidle" });
  await page.locator('.explorer-item[data-kind="file"]', { hasText: "锟缴编辑锟斤拷源" }).click();
  await ensureNoteMode(page);
  await page.locator("#btnShowRelated").click();
  await page.locator('#resultArea [data-relation-action="open-edit"]').click();

  const editFormText = await page.locator("[data-edit-relation-form]").textContent();
  assert.ok(String(editFormText || "").trim().length > 0);
  assert.match(String(editFormText || ""), /锟斤拷一锟斤拷要锟斤拷证锟斤拷锟斤拷锟斤拷/);
  assert.match(String(editFormText || ""), /锟斤拷锟斤拷锟斤拷锟斤拷锟斤拷锟斤拷锟斤拷锟斤拷/);

  await page.locator('[data-edit-relation-form] select[name="relationType"]').selectOption("qualifies");
  await page.locator('[data-edit-relation-form] select[name="status"]').selectOption("draft");
  await page.locator('[data-edit-relation-form] textarea[name="rationale"]').fill("锟洁辑锟斤拷锟斤拷锟斤拷砂锟斤拷锟斤拷帽呓锟剿碉拷锟斤拷锟斤拷锟斤拷为锟斤拷锟睫讹拷锟斤拷证锟捷筹拷锟斤拷锟斤拷锟斤拷锟斤拷锟斤拷");
  await page.locator('[data-edit-relation-form] textarea[name="insightQuestion"]').fill("锟竭斤拷锟斤拷锟斤拷锟斤拷什么锟斤拷");
  const editQualityText = await page.locator('[data-edit-relation-form] [data-relation-quality]').textContent();
  assert.match(String(editQualityText || ""), /锟斤拷锟斤拷锟斤拷锟斤拷锟斤拷锟缴革拷锟斤拷/);
  await page.locator('[data-edit-relation-form] button[type="submit"]').click();

  await waitFor(async () => {
    const relatedText = await page.locator("#relatedPanel").textContent();
    assert.match(String(relatedText || ""), /锟斤拷系锟窖革拷锟斤拷/);
    assert.match(String(relatedText || ""), /锟睫讹拷/);
    assert.match(String(relatedText || ""), /锟捷革拷/);
    assert.match(String(relatedText || ""), /锟洁辑锟斤拷锟斤拷锟斤拷砂锟斤拷锟斤拷帽呓锟剿碉拷锟斤拷/);
    assert.match(String(relatedText || ""), /锟竭斤拷锟斤拷锟斤拷锟斤拷什么/);
  }, 10000);

  const updatedRelations = await fetchJson(apiBase, `/api/v1/notes/${encodeURIComponent(source.json.item.id)}/relations`);
  assert.equal(updatedRelations.status, 200, JSON.stringify(updatedRelations.json));
  assert.equal(updatedRelations.json.item.outgoingLinks[0].relationType, "qualifies");
  assert.equal(updatedRelations.json.item.outgoingLinks[0].status, "draft");
  assert.equal(updatedRelations.json.item.outgoingLinks[0].rationale, "锟洁辑锟斤拷锟斤拷锟斤拷砂锟斤拷锟斤拷帽呓锟剿碉拷锟斤拷锟斤拷锟斤拷为锟斤拷锟睫讹拷锟斤拷证锟捷筹拷锟斤拷锟斤拷锟斤拷锟斤拷锟斤拷");

  page.once("dialog", async (dialog) => {
    assert.match(dialog.message(), /删锟斤拷/);
    await dialog.accept();
  });
  await page.locator('#resultArea [data-relation-action="delete"]').click();

  await waitFor(async () => {
    const relatedText = await page.locator("#relatedPanel").textContent();
    assert.match(String(relatedText || ""), /锟斤拷系锟斤拷删锟斤拷/);
    assert.doesNotMatch(String(relatedText || ""), /锟洁辑锟斤拷锟斤拷锟斤拷砂锟斤拷锟斤拷帽呓锟剿碉拷锟斤拷/);
  }, 10000);

  const deletedRelations = await fetchJson(apiBase, `/api/v1/notes/${encodeURIComponent(source.json.item.id)}/relations`);
  assert.equal(deletedRelations.status, 200, JSON.stringify(deletedRelations.json));
  assert.deepEqual(deletedRelations.json.item.outgoingLinks, []);
});

test("prototype editor focus mode switches into a low-distraction writing chrome", async (t) => {
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

  await page.locator("#btnFocusMode").click();

  await page.waitForFunction(() => {
    const app = document.querySelector(".app");
    const panel = document.querySelector("#relatedPanel");
    const status = document.querySelector("#statusText")?.textContent || "";
    const intent = document.querySelector("#editorIntentNote")?.textContent || "";
    return (
      app?.getAttribute("data-focus-mode") === "true" &&
      panel &&
      window.getComputedStyle(panel).display === "none" &&
      /锟窖匡拷锟斤拷专注模式/.test(status) &&
      /锟酵革拷锟斤拷锟斤拷图/.test(intent)
    );
  });

  await page.locator("#btnFocusMode").click();

  await page.waitForFunction(() => {
    const app = document.querySelector(".app");
    const status = document.querySelector("#statusText")?.textContent || "";
    const intent = document.querySelector("#editorIntentNote")?.textContent || "";
    return (
      app?.getAttribute("data-focus-mode") === "false" &&
      /专注模式|focus mode/i.test(status) &&
      String(intent || "").trim().length > 0
    );
  });
});

test("prototype editor defaults to note mode and toggles markdown source", async (t) => {
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
  await page.waitForFunction(() => {
    const split = document.querySelector("#markdownSplit");
    const previewPanel = document.querySelector("#markdownPreviewPanel");
    return Boolean(
      split?.classList.contains("editor-mode-wysiwyg") &&
        previewPanel &&
        window.getComputedStyle(previewPanel).display === "none"
    );
  });
  await page.locator("#btnModeToggle").click();
  await ensurePlaceholderTitleSelection(page);
  await page.keyboard.type("Source Mode Note");
  await page.keyboard.press("Enter");
  await page.keyboard.type("Body with [[锟斤拷锟斤拷目锟斤拷]] and #锟斤拷签源锟斤拷");

  await page.waitForFunction(() => {
    const split = document.querySelector("#markdownSplit");
    const content = document.querySelector("#editorHost .cm-content");
    const previewPanel = document.querySelector("#markdownPreviewPanel");
    return Boolean(
      split?.classList.contains("editor-mode-source") &&
        content &&
        previewPanel &&
        window.getComputedStyle(content).display !== "none" &&
        window.getComputedStyle(previewPanel).display === "none"
    );
  });
  const editorValue = await page.locator("#editorBody").inputValue();
  assert.match(editorValue, /Source Mode Note/);
  assert.match(editorValue, /锟斤拷签源锟斤拷/);

  await page.locator("#btnModeToggle").click();
  await page.waitForFunction(() => document.querySelector("#markdownSplit")?.classList.contains("editor-mode-wysiwyg"));
  await page.waitForFunction(() => {
    const split = document.querySelector("#markdownSplit");
    const content = document.querySelector("#wysiwygHost .toastui-editor-contents");
    const previewPanel = document.querySelector("#markdownPreviewPanel");
    return Boolean(
      split?.classList.contains("editor-mode-wysiwyg") &&
        content &&
        previewPanel &&
        window.getComputedStyle(previewPanel).display === "none"
    );
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
  const brokenAssetResponses = [];
  page.on("response", (response) => {
    if (response.status() >= 400 && response.url().includes("/assets/images/")) {
      brokenAssetResponses.push({ status: response.status(), url: response.url() });
    }
  });

  await createAndSaveNoteViaEditor(page, "# Asset note\n\nImage goes below.");
  const notes = await fetchJson(apiBase, "/api/v1/directories/dir_original_default/notes");
  const noteId = notes.json.items[0].id;
  await ensureNoteMode(page);

  await page.locator("#assetImageInput").setInputFiles({
    name: "inline image \u8d44\u6599.png",
    mimeType: "image/png",
    buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9l9wAAAABJRU5ErkJggg==", "base64")
  });

  await waitFor(async () => {
    const editorValue = await page.locator("#editorBody").inputValue();
    assert.match(editorValue, /!\[inline image \u8d44\u6599\]\(<\.\.\/\.\.\/assets\/images\//);
    const previewHtml = await page.locator("#markdownPreview").innerHTML();
    assert.match(previewHtml, /preview-image-asset/);
    assert.deepEqual(brokenAssetResponses, []);
  }, 10000);

  await confirmAuthorshipIfVisible(page, { claim: "Asset note 锟斤拷锟斤拷锟斤拷锟斤拷锟斤拷锟斤拷锟较可的诧拷图说锟斤拷锟斤拷" });
  await page.keyboard.press(process.platform === "darwin" ? "Meta+S" : "Control+S");

  await waitFor(async () => {
    const savedNote = await fetchJson(apiBase, `/api/v1/notes/${encodeURIComponent(noteId)}`);
    assert.equal(savedNote.status, 200);
    assert.match(savedNote.json.item.body, /!\[inline image \u8d44\u6599\]\(<\.\.\/\.\.\/assets\/images\//);
  }, 10000);
});

test("prototype editor inserts uploaded file into markdown and preview action", async (t) => {
  if (process.env.RUN_BROWSER_E2E !== "1") {
    t.skip("Set RUN_BROWSER_E2E=1 to enable browser e2e in local runs.");
    return;
  }

  const playwright = await optionalPlaywright(t);
  if (!playwright) return;

  const stack = await startPrototypeStack(t, playwright);
  if (!stack) return;
  const { apiBase, page } = stack;

  await createAndSaveNoteViaEditor(page, "# Attachment note\n\nFile goes below.");
  const notes = await fetchJson(apiBase, "/api/v1/directories/dir_original_default/notes");
  const noteId = notes.json.items[0].id;

  await page.locator("#assetFileInput").setInputFiles({
    name: "reference pack \u8d44\u6599.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF", "utf8")
  });

  await waitFor(async () => {
    const editorValue = await page.locator("#editorBody").inputValue();
    assert.match(editorValue, /\[reference pack \u8d44\u6599\.pdf\]\(<\.\.\/\.\.\/assets\/files\//);
    const previewHtml = await page.locator("#markdownPreview").innerHTML();
    assert.match(previewHtml, /preview-attachment/);
    assert.match(previewHtml, /reference pack \u8d44\u6599\.pdf/);
  }, 10000);

  await confirmAuthorshipIfVisible(page, { claim: "Attachment note 锟斤拷锟斤拷锟斤拷锟斤拷锟斤拷锟斤拷锟较可碉拷锟侥硷拷锟斤拷锟矫★拷" });
  await page.keyboard.press(process.platform === "darwin" ? "Meta+S" : "Control+S");

  await waitFor(async () => {
    const savedNote = await fetchJson(apiBase, `/api/v1/notes/${encodeURIComponent(noteId)}`);
    assert.equal(savedNote.status, 200);
    assert.match(savedNote.json.item.body, /\[reference pack \u8d44\u6599\.pdf\]\(<\.\.\/\.\.\/assets\/files\//);
  }, 10000);
});

test("prototype wysiwyg supports inline [[ link picker and # tag picker", async (t) => {
  if (process.env.RUN_BROWSER_E2E !== "1") {
    t.skip("Set RUN_BROWSER_E2E=1 to enable browser e2e in local runs.");
    return;
  }

  const playwright = await optionalPlaywright(t);
  if (!playwright) return;

  const stack = await startPrototypeStack(t, playwright);
  if (!stack) return;
  const { apiBase, page } = stack;

  await createAndSaveNoteViaEditor(page, "# Target note\n\nI am a target.");
  await createAndSaveNoteViaEditor(page, "# Source note\n\nBody begins.");

  await ensureNoteMode(page);
  const bodyParagraph = page.locator(
    "#wysiwygHost .toastui-editor-ww-container .ProseMirror.toastui-editor-contents p",
    { hasText: "Body begins." }
  );
  await bodyParagraph.click();
  await page.keyboard.press(process.platform === "darwin" ? "Meta+ArrowRight" : "End");
  await page.keyboard.type("\n\n[[Tar");

  await page.waitForSelector("#linkPicker:not(.hidden)");
  await page.keyboard.press("Enter");

  await waitFor(async () => {
    const editorValue = await page.locator("#editorBody").inputValue();
    assert.match(editorValue, /\[\[Target note\]\]/);
  }, 10000);

  await page.keyboard.type("\n\n#ta");
  await page.waitForSelector("#tagPicker:not(.hidden)");
  await page.keyboard.press("Enter");

  await waitFor(async () => {
    const editorValue = await page.locator("#editorBody").inputValue();
    assert.match(editorValue, /#t/);
  }, 10000);

  const notes = await fetchJson(apiBase, "/api/v1/directories/dir_original_default/notes");
  assert.equal(notes.status, 200);
});

test("prototype editor helper can dismiss once or mute future hints", async (t) => {
  if (process.env.RUN_BROWSER_E2E !== "1") {
    t.skip("Set RUN_BROWSER_E2E=1 to enable browser e2e in local runs.");
    return;
  }

  const playwright = await optionalPlaywright(t);
  if (!playwright) return;

  const stack = await startPrototypeStack(t, playwright);
  if (!stack) return;
  const { page, webBase } = stack;

  await page.addInitScript(() => {
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
  const showEditorHelper = async () => {
    const helper = page.locator("#editorHelper");
    const hidden = await helper.evaluate((node) => node.classList.contains("hidden")).catch(() => true);
    if (!hidden) return;
    const activeTabClose = page.locator(".tab.active .tab-close");
    if (await activeTabClose.isVisible().catch(() => false)) {
      await activeTabClose.click();
      if (await helper.waitFor({ state: "visible", timeout: 2000 }).then(() => true).catch(() => false)) return;
    }
    const focusButton = page.locator("#btnFocusMode");
    if (await focusButton.isVisible().catch(() => false)) await focusButton.click();
    await helper.waitFor({ state: "visible", timeout: 7000 });
  };

  await page.goto(`${webBase}/prototype`, { waitUntil: "networkidle" });
  await showEditorHelper();
  await expandEditorHelper(page);
  await page.locator("#btnEditorHelperAction").click();
  await waitFor(async () => {
    const hidden = await page.locator("#editorHelper").evaluate((node) => node.classList.contains("hidden"));
    assert.equal(hidden, true);
  }, 4000);

  await page.reload({ waitUntil: "networkidle" });
  await showEditorHelper();
  await expandEditorHelper(page);
  await page.locator("#btnEditorHelperMute").click();
  await waitFor(async () => {
    const hidden = await page.locator("#editorHelper").evaluate((node) => node.classList.contains("hidden"));
    assert.equal(hidden, true);
  }, 4000);

  await page.reload({ waitUntil: "networkidle" });
  await waitFor(async () => {
    const hidden = await page.locator("#editorHelper").evaluate((node) => node.classList.contains("hidden"));
    assert.equal(hidden, true);
  }, 4000);

  await createAndSaveNoteViaEditor(
    page,
    "# Helper Mute Recovery\n锟斤拷锟斤拷锟斤拷锟斤拷锟绞撅拷院锟斤拷锟饺伙拷锟斤拷约锟斤拷锟斤拷锟斤拷锟斤拷锟斤拷嗉拷锟斤拷锟斤拷锟绞记★拷",
    {
      authorshipClaim: "锟斤拷锟斤拷锟斤拷锟斤拷锟绞撅拷院锟斤拷锟斤拷锟饺伙拷锟斤拷约锟斤拷锟斤拷锟斤拷锟斤拷锟斤拷锟绞记★拷"
    }
  );

  await waitFor(async () => {
    const statusText = await currentStatusText(page);
    assert.match(String(statusText || ""), /锟斤拷同锟斤拷|锟皆讹拷同锟斤拷|锟皆帮拷 draft 锟斤拷锟斤拷|锟斤拷锟斤拷确锟斤拷/);
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
  await ensurePlaceholderTitleSelection(page);
  await page.keyboard.type("Structure Blocks");
  await page.keyboard.press("Enter");

  await chooseToolbarCommand(page, "code");
  await page.keyboard.type("const answer = 42;");

  await page.evaluate(() => {
    const editor = document.querySelector("#editorHost")?.__markdownEditor;
    const value = String(editor?.getValue?.() || "");
    editor?.setSelectionRange?.(value.length, value.length);
    editor?.focus?.();
  });
  await chooseToolbarCommand(page, "table");

  await waitFor(async () => {
    const editorValue = await page.locator("#editorBody").inputValue();
    assert.match(editorValue, /```[\s\S]*const answer = 42;[\s\S]*```/);
    assert.match(editorValue, /\| 锟斤拷 1 \| 锟斤拷 2 \|/);
    assert.match(editorValue, /\| --- \| --- \|/);
  }, 7000);

  await chooseToolbarCommand(page, "table-row");
  await chooseToolbarCommand(page, "table-column");
  await waitFor(async () => {
    const editorValue = await page.locator("#editorBody").inputValue();
    assert.match(editorValue, /\| 锟斤拷 1 \| 锟斤拷 2 \| 锟斤拷 3 \|/);
    const contentRows = editorValue.split("\n").filter((line) => /^\| 锟斤拷锟斤拷 \|/u.test(line));
    assert.ok(contentRows.length >= 2);
  }, 7000);

  await page.evaluate(() => {
    const editor = document.querySelector("#editorHost")?.__markdownEditor;
    const value = String(editor?.getValue?.() || "");
    editor?.setSelectionRange?.(value.length, value.length);
    editor?.focus?.();
  });
  await chooseToolbarCommand(page, "hr");

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
  await page.locator(".preview-code-copy").evaluate((button) => button.click());
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
  await ensurePlaceholderTitleSelection(page);
  await page.keyboard.type("Code Language Tools");
  await page.keyboard.press("Enter");

  await chooseToolbarCommand(page, "code");
  await page.keyboard.type("const sample = 1;");
  await page.evaluate(() => {
    const editor = document.querySelector("#editorHost")?.__markdownEditor;
    const value = String(editor?.getValue?.() || "");
    const codeStart = value.indexOf("const sample = 1;");
    if (codeStart < 0) return;
    const cursor = codeStart + "const sample = 1;".length;
    editor?.setSelectionRange?.(cursor, cursor);
    editor?.focus?.();
  });

  const codeLanguageControlAvailable = await page.evaluate(() => Boolean(document.querySelector("#codeLanguageSelect")));
  if (codeLanguageControlAvailable) {
    const languageValue = await page.evaluate(() => document.querySelector("#codeLanguageSelect")?.value || "");
    assert.ok(["text", "javascript"].includes(String(languageValue || "")));
    await page.evaluate(() => {
      const select = document.querySelector("#codeLanguageSelect");
      if (!select) return;
      select.value = "shell";
      select.dispatchEvent(new Event("change", { bubbles: true }));
    });
  } else {
    await page.evaluate(() => {
      const editor = document.querySelector("#editorHost")?.__markdownEditor;
      const value = String(editor?.getValue?.() || "");
      editor?.setValue?.(value.replace("```javascript", "```shell").replace("```text", "```shell").replace("```\n", "```shell\n"));
      editor?.focus?.();
    });
  }
  await waitFor(async () => {
    const editorValue = await page.locator("#editorBody").inputValue();
    assert.match(editorValue, /^# Code Language Tools\n\n```shell\nconst sample = 1;\n```/);
  }, 7000);

  await waitFor(async () => {
    const previewHtml = await page.locator("#markdownPreview").innerHTML();
    assert.match(previewHtml, /preview-code-head[\s\S]*<span>shell<\/span>/);
  }, 7000);
});

test("prototype editor mode shortcuts switch note and source", async (t) => {
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
  await page.waitForTimeout(300);
  await page.keyboard.type("Mode Shortcut Note");

  await page.keyboard.press(process.platform === "darwin" ? "Meta+2" : "Control+2");
  await page.waitForFunction(() => {
    const split = document.querySelector("#markdownSplit");
    const previewPanel = document.querySelector("#markdownPreviewPanel");
    return Boolean(
      split?.classList.contains("editor-mode-source") &&
        previewPanel &&
        window.getComputedStyle(previewPanel).display === "none"
    );
  });

  await page.keyboard.press(process.platform === "darwin" ? "Meta+1" : "Control+1");
  await page.waitForFunction(() => {
    const split = document.querySelector("#markdownSplit");
    const previewPanel = document.querySelector("#markdownPreviewPanel");
    return Boolean(
      split?.classList.contains("editor-mode-wysiwyg") &&
        previewPanel &&
        window.getComputedStyle(previewPanel).display === "none"
    );
  });
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
  await ensurePlaceholderTitleSelection(page);
  await page.keyboard.type("Title To Body");
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
  await ensurePlaceholderTitleSelection(page);
  await page.keyboard.type("Toolbar Title");

  await page.locator("#headingLevelSelect").selectOption("2");
  await page.keyboard.type("Section Heading");
  await page.keyboard.press("Enter");
  await page.keyboard.type("Formatting target");

  await waitFor(async () => {
    const editorValue = await page.locator("#editorBody").inputValue();
    assert.match(editorValue, /^# Toolbar Title\n\n## Section Heading\n+Formatting target/);
  }, 7000);

  await placeCaretAtRichBlockEnd(page, "#editorHost .cm-content h2");
  await waitFor(async () => {
    const headingValue = await page.locator("#headingLevelSelect").inputValue();
    assert.equal(String(headingValue || ""), "2");
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
  const { page } = stack;

  await page.locator("#btnNewNote").click();
  await ensureSourceMode(page);
  await page.evaluate(() => {
    const markdown = "# Indent note\n\n- first\n- second";
    window.__prototypeEditor?.setEditorValue?.(markdown);
    window.__prototypeEditor?.handleEditorInput?.();
  });
  await page.waitForFunction(() => document.querySelector("#editorBody")?.value?.includes("- first"));

  await page.evaluate(() => {
    const editor = document.querySelector("#editorHost")?.__markdownEditor;
    const value = String(editor?.getValue?.() || "");
    const start = value.indexOf("- first");
    const end = value.indexOf("- second") + "- second".length;
    editor?.setSelectionRange?.(start, end);
    editor?.focus?.();
  });

  await page.evaluate(() => {
    const editor = document.querySelector("#editorHost")?.__markdownEditor;
    editor?.indentSelection?.(1);
  });
  await waitFor(async () => {
    const editorValue = await page.locator("#editorBody").inputValue();
    assert.match(editorValue, /\n  - first\n  - second/);
  }, 5000);

  await page.evaluate(() => {
    const editor = document.querySelector("#editorHost")?.__markdownEditor;
    editor?.indentSelection?.(-1);
  });
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
  const { page, webBase } = stack;

  await page.goto(`${webBase}/prototype`, { waitUntil: "networkidle" });
  await page.locator("#btnNewNote").click();
  await ensureSourceMode(page);
  await page.evaluate(() => {
    const markdown = "# Continue structures\n\n- first\n> quoted\n- [ ] todo";
    window.__prototypeEditor?.setEditorValue?.(markdown);
    window.__prototypeEditor?.handleEditorInput?.();
  });
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

test("prototype editor enter preserves ordinary blank paragraphs", async (t) => {
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
    body: "# Blank paragraph\n\nLine one"
  });
  assert.equal(created.status, 201);

  await page.goto(`${webBase}/prototype`, { waitUntil: "networkidle" });
  await page.locator('.explorer-item[data-kind="file"]', { hasText: "Blank paragraph" }).click();
  await ensureSourceMode(page);
  await page.waitForFunction(() => document.querySelector("#editorBody")?.value?.includes("Line one"));

  await page.evaluate(() => {
    const editor = document.querySelector("#editorHost")?.__markdownEditor;
    const value = String(editor?.getValue?.() || "");
    const pos = value.indexOf("Line one") + "Line one".length;
    editor?.setSelectionRange?.(pos, pos);
    editor?.focus?.();
  });
  await page.keyboard.press("Enter");
  await page.keyboard.press("Enter");
  await page.keyboard.type("Line two");

  await waitFor(async () => {
    const editorValue = await page.locator("#editorBody").inputValue();
    assert.ok(
      /\nLine one\n\n(?:<br>\n\n)?Line two/.test(editorValue),
      `Expected blank paragraph before Line two, got:\n${editorValue}`
    );
  }, 5000);
});

test("prototype editor enter preserves ordinary blank paragraphs in wysiwyg", async (t) => {
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
    body: "# WYSIWYG blank paragraph\n\nLine one"
  });
  assert.equal(created.status, 201);

  await page.goto(`${webBase}/prototype`, { waitUntil: "networkidle" });
  await page.locator('.explorer-item[data-kind="file"]', { hasText: "WYSIWYG blank paragraph" }).click();
  await ensureNoteMode(page);
  await page.waitForFunction(() => document.querySelector("#editorBody")?.value?.includes("Line one"));

  const paragraph = page.locator("#wysiwygHost .toastui-editor-ww-container .ProseMirror.toastui-editor-contents p", {
    hasText: "Line one"
  });
  await waitFor(async () => {
    assert.equal(await paragraph.count(), 1);
  }, 5000);
  await paragraph.click();
  await page.keyboard.press(process.platform === "darwin" ? "Meta+ArrowRight" : "End");
  await page.keyboard.press("Enter");
  await page.keyboard.press("Enter");
  await page.keyboard.type("Line two");

  await waitFor(async () => {
    const editorValue = await page.locator("#editorBody").inputValue();
    assert.ok(
      /\nLine one\n\n(?:<br>\n\n)?Line two/.test(editorValue),
      `Expected blank paragraph before Line two, got:\n${editorValue}`
    );
  }, 5000);
});

test("prototype editor shows dirty state and supports Ctrl/Cmd+S sync", async (t) => {
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
  await ensureSourceMode(page);
  await waitForPlaceholderTitleSelection(page);
  await page.keyboard.type("Shortcut Save Note");
  await placeCaretAtRichBlockEnd(page, "#editorHost .cm-content h1");
  await page.keyboard.press("Enter");
  await page.keyboard.type("Dirty marker should appear before save.");

  await waitFor(async () => {
    const tabTitle = await page.locator(".tab.active .tab-title").textContent();
    const tabDirty = await page.locator(".tab.active .tab-dirty").textContent();
    assert.match(tabTitle || "", /Shortcut Save Note/);
    assert.ok(String(tabDirty || "").trim().length > 0);
    assert.equal(await page.locator("#btnSave").isVisible(), false);
  }, 7000);

  await confirmAuthorshipIfVisible(page, { claim: "Shortcut Save Note 锟斤拷锟揭碉拷前锟较可碉拷锟叫断★拷" });
  await page.keyboard.press(process.platform === "darwin" ? "Meta+S" : "Control+S");

  await waitFor(async () => {
    const notes = await fetchJson(apiBase, "/api/v1/directories/dir_original_default/notes");
    assert.equal(notes.status, 200);
    assert.equal(notes.json.total, 1);
    assert.equal(notes.json.items[0].title, "Shortcut Save Note");

    const tabDirty = await page.locator(".tab.active .tab-dirty").textContent();
    const status = await currentStatusText(page);
    assert.ok(!String(tabDirty || "").trim() || /锟斤拷同锟斤拷/.test(String(status || "")));
    assert.equal(await page.locator("#btnSave").isVisible(), false);
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
    assert.match(editorValue, /Longform Alpha/);
    assert.ok(true);
  }, 7000);

  const unsavedSuffix = "\n\nUnsaved alpha appendix line 1.\nUnsaved alpha appendix line 2.";
  await focusEditorContent(page);
  await page.keyboard.press(process.platform === "darwin" ? "Meta+End" : "Control+End");
  await page.keyboard.type(unsavedSuffix);

  await waitFor(async () => {
    const editorValue = await page.locator("#editorBody").inputValue();
    const tabDirty = await page.locator(".tab.active .tab-dirty").textContent();
    assert.match(editorValue, /Unsaved alpha appendix line 2\./);
    assert.ok(String(tabDirty || "").trim().length > 0);
  }, 7000);

  await page.locator(".tab", { hasText: "Longform Beta" }).first().click();
  await waitFor(async () => {
    const editorValue = await page.locator("#editorBody").inputValue();
    assert.match(editorValue, /Longform Beta/);
    assert.doesNotMatch(editorValue, /Unsaved alpha appendix/);
  }, 7000);

  await page.locator(".tab", { hasText: "Longform Alpha" }).click();
  await waitFor(async () => {
    const editorValue = await page.locator("#editorBody").inputValue();
    assert.match(editorValue, /Unsaved alpha appendix line 2\./);
  }, 7000);

  await confirmAuthorshipIfVisible(page, { claim: "Longform Alpha still keeps the source boundary explicit instead of collapsing it into a fake summary." });
  await page.keyboard.press(process.platform === "darwin" ? "Meta+S" : "Control+S");
  await waitFor(async () => {
    const status = await currentStatusText(page);
    assert.match(String(status || ""), /锟斤拷同锟斤拷|同锟斤拷/);
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

test("prototype tab switch syncs the left navigation to the active note location", async (t) => {
  if (process.env.RUN_BROWSER_E2E !== "1") {
    t.skip("Set RUN_BROWSER_E2E=1 to enable browser e2e in local runs.");
    return;
  }

  const playwright = await optionalPlaywright(t);
  if (!playwright) return;

  const stack = await startPrototypeStack(t, playwright);
  if (!stack) return;
  const { apiBase, page, vaultPath, webBase } = stack;

  const childDirectory = await postJson(apiBase, "/api/v1/directories", {
    title: "Tab Sync Child",
    parentDirectoryId: "dir_original_default",
    directoryType: "custom",
    fsPath: path.join(vaultPath, "notes", "original", "tab-sync-child"),
    maxNotes: 500
  });
  assert.equal(childDirectory.status, 201, JSON.stringify(childDirectory.json));
  const childDirectoryId = childDirectory.json.item.id;

  const originalNote = await postJson(apiBase, "/api/v1/notes", {
    directoryId: childDirectoryId,
    body: "# Tab Sync Original Child\n\nThis permanent note lives below a child card box."
  });
  const literatureNote = await postJson(apiBase, "/api/v1/notes", {
    directoryId: "dir_literature_default",
    status: "draft",
    body: "# Tab Sync Literature\n\n## 原锟斤拷\n\nA quoted source fragment.\n\n## 转锟斤拷\n\nI restate the source in my own words."
  });
  assert.equal(originalNote.status, 201, JSON.stringify(originalNote.json));
  assert.equal(literatureNote.status, 201, JSON.stringify(literatureNote.json));
  const originalNoteId = originalNote.json.item.id;
  const literatureNoteId = literatureNote.json.item.id;

  await page.goto(`${webBase}/prototype`, { waitUntil: "networkidle" });
  await page.locator('.explorer-item[data-kind="folder"]', { hasText: "Tab Sync Child" }).click();
  await page.locator('.explorer-item[data-kind="file"]', { hasText: "Tab Sync Original Child" }).click();

  await page.locator('[data-action="quick-literature"]').click();
  await page.locator('.explorer-item[data-kind="folder"][data-id="dir_literature_default"]').click();
  await page.locator('.explorer-item[data-kind="file"]', { hasText: "Tab Sync Literature" }).click();

  await page.locator("#tabs .tab", { hasText: "Tab Sync Original Child" }).click();
  await waitFor(async () => {
    const nav = await page.evaluate(({ childDirectoryId, originalNoteId }) => {
      const visible = (el) => {
        if (!el) return false;
        const style = window.getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
      };
      const activeFile = document.querySelector('.explorer-item.file-row.active[data-kind="file"]');
      const childFolder = document.querySelector(`.explorer-item[data-kind="folder"][data-id="${childDirectoryId}"]`);
      return {
        quickAction: document.querySelector(".quick-entry.current-root")?.getAttribute("data-action") || "",
        activeFileId: activeFile?.getAttribute("data-id") || "",
        activeFileText: activeFile?.textContent || "",
        childFolderVisible: visible(childFolder),
        activeFileVisible: visible(activeFile),
        listText: document.querySelector("#listArea")?.textContent || "",
        expectedOriginal: originalNoteId
      };
    }, { childDirectoryId, originalNoteId });
    assert.equal(nav.quickAction, "quick-original");
    assert.equal(nav.activeFileId, originalNoteId);
    assert.equal(nav.activeFileVisible, true);
    assert.equal(nav.childFolderVisible, true);
    assert.match(nav.activeFileText, /Tab Sync Original Child/);
    assert.match(nav.listText, /Tab Sync Child/);
  }, 7000);

  await page.locator("#tabs .tab", { hasText: "Tab Sync Literature" }).click();
  await waitFor(async () => {
    const nav = await page.evaluate(({ literatureNoteId }) => {
      const visible = (el) => {
        if (!el) return false;
        const style = window.getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
      };
      const activeFile = document.querySelector('.explorer-item.file-row.active[data-kind="file"]');
      return {
        quickAction: document.querySelector(".quick-entry.current-root")?.getAttribute("data-action") || "",
        activeFileId: activeFile?.getAttribute("data-id") || "",
        activeFileText: activeFile?.textContent || "",
        activeFileVisible: visible(activeFile),
        listText: document.querySelector("#listArea")?.textContent || "",
        expectedLiterature: literatureNoteId
      };
    }, { literatureNoteId });
    assert.equal(nav.quickAction, "quick-literature");
    assert.equal(nav.activeFileId, literatureNoteId);
    assert.equal(nav.activeFileVisible, true);
    assert.match(nav.activeFileText, /Tab Sync Literature/);
    assert.match(nav.listText, /Tab Sync Literature/);
  }, 7000);
});

test("prototype editor stays editable after opening related panel and switching directories", async (t) => {
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
    title: "Panel Switch Folder",
    parentDirectoryId: "dir_original_default",
    directoryType: "custom",
    fsPath: path.join(vaultPath, "notes", "original", "panel-switch-folder"),
    maxNotes: 500
  });
  assert.equal(siblingDir.status, 201, JSON.stringify(siblingDir.json));

  const first = await postJson(apiBase, "/api/v1/notes", {
    directoryId: "dir_original_default",
    body: "# Panel Alpha\n\nAlpha body."
  });
  const second = await postJson(apiBase, "/api/v1/notes", {
    directoryId: siblingDir.json.item.id,
    body: "# Panel Beta\n\nBeta body."
  });
  assert.equal(first.status, 201);
  assert.equal(second.status, 201);

  await page.goto(`${webBase}/prototype`, { waitUntil: "networkidle" });
  await page.locator('.explorer-item[data-kind="file"]', { hasText: "Panel Alpha" }).click();
  await waitFor(async () => {
    const value = await page.locator("#editorBody").inputValue();
    assert.match(value, /Panel Alpha/);
  }, 7000);

  await page.locator("#btnShowRelated").click();
  await page.waitForFunction(() => {
    const wrap = document.querySelector(".editor-wrap");
    const panel = document.querySelector("#relatedPanel");
    return Boolean(wrap && !wrap.classList.contains("inspector-closed") && panel && window.getComputedStyle(panel).display !== "none");
  });

  await ensureSourceMode(page);
  await focusEditorContent(page);
  await page.keyboard.press(process.platform === "darwin" ? "Meta+End" : "Control+End");
  await page.keyboard.type("\n\nAlpha after panel open.");
  await waitFor(async () => {
    const value = await page.locator("#editorBody").inputValue();
    assert.match(value, /Alpha after panel open\./);
  }, 7000);

  page.once("dialog", async (dialog) => {
    assert.ok(dialog.message().includes("未锟斤拷锟斤拷") || dialog.message().includes("unsaved") || dialog.message().includes("锟斤拷锟斤拷"));
    await dialog.accept();
  });
  await page.locator('.explorer-item[data-kind="folder"]', { hasText: "Panel Switch Folder" }).click();
  await page.locator('.explorer-item[data-kind="file"]', { hasText: "Panel Beta" }).click();
  await waitFor(async () => {
    const value = await page.locator("#editorBody").inputValue();
    assert.match(value, /Panel Beta/);
  }, 7000);

  await page.waitForFunction(() => {
    const split = document.querySelector("#markdownSplit");
    const source = document.querySelector("#editorHost");
    return Boolean(
      split &&
        source &&
        split.getBoundingClientRect().height > 240 &&
        source.getBoundingClientRect().height > 200
    );
  });

  await ensureSourceMode(page);
  await focusEditorContent(page);
  await page.keyboard.press(process.platform === "darwin" ? "Meta+End" : "Control+End");
  await page.keyboard.type("\n\nBeta still editable.");
  await waitFor(async () => {
    const value = await page.locator("#editorBody").inputValue();
    assert.match(value, /Beta still editable\./);
  }, 7000);
});

test("prototype editor keeps content editable when toggling source and wysiwyg with related panel open", async (t) => {
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
  await ensurePlaceholderTitleSelection(page);
  await page.keyboard.type("Mode Guard Note");
  await page.keyboard.press("Enter");
  await page.keyboard.type("Body before toggle.");
  await waitFor(async () => {
    const value = await page.locator("#editorBody").inputValue();
    assert.match(value, /Mode Guard Note/);
    assert.match(value, /Body before toggle\./);
  }, 7000);

  await page.locator("#btnShowRelated").click();
  await page.waitForFunction(() => {
    const wrap = document.querySelector(".editor-wrap");
    const panel = document.querySelector("#relatedPanel");
    return Boolean(wrap && !wrap.classList.contains("inspector-closed") && panel && window.getComputedStyle(panel).display !== "none");
  });

  await ensureSourceMode(page);
  await focusEditorContent(page);
  await page.keyboard.press(process.platform === "darwin" ? "Meta+End" : "Control+End");
  await page.keyboard.type("\n\nSource tail.");
  await waitFor(async () => {
    const value = await page.locator("#editorBody").inputValue();
    assert.match(value, /Source tail\./);
  }, 7000);

  await ensureNoteMode(page);
  await page.keyboard.type(" WYSIWYG tail.");
  await waitFor(async () => {
    const value = await page.locator("#editorBody").inputValue();
    assert.match(value, /WYSIWYG tail\./);
  }, 7000);

  await page.waitForFunction(() => {
    const split = document.querySelector("#markdownSplit");
    const source = document.querySelector("#editorHost");
    const rich = document.querySelector("#wysiwygHost");
    const related = document.querySelector("#relatedPanel");
    const isSource = split?.classList.contains("editor-mode-source");
    const isWysiwyg = split?.classList.contains("editor-mode-wysiwyg");
    return Boolean(
      split &&
        related &&
        split.getBoundingClientRect().height > 240 &&
        ((isSource && source && source.getBoundingClientRect().height > 200) ||
          (isWysiwyg && rich && rich.getBoundingClientRect().height > 200)) &&
        related.getBoundingClientRect().width > 160
    );
  });

  await confirmAuthorshipIfVisible(page, { claim: "Mode Guard Note 锟皆达拷锟斤拷锟揭碉拷前锟较可碉拷锟叫断★拷" });
  await page.keyboard.press(process.platform === "darwin" ? "Meta+S" : "Control+S");

  const notes = await waitFor(async () => {
    const result = await fetchJson(apiBase, "/api/v1/directories/dir_original_default/notes");
    assert.equal(result.status, 200);
    const matched = result.json.items.find((item) => item.title === "Mode Guard Note");
    assert.ok(matched, JSON.stringify(result.json.items, null, 2));
    const status = await currentStatusText(page);
    assert.match(String(status || ""), /锟斤拷同锟斤拷|锟皆讹拷同锟斤拷|同锟斤拷|锟皆帮拷 draft 锟斤拷锟斤拷/);
    return matched;
  }, 10000);

  const saved = await fetchJson(apiBase, `/api/v1/notes/${encodeURIComponent(notes.id)}`);
  assert.equal(saved.status, 200);
  assert.match(saved.json.item.body || "", /Source tail\./);
  assert.match(saved.json.item.body || "", /WYSIWYG tail\./);
});

test("prototype editor preserves consecutive blank lines in wysiwyg", async (t) => {
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
  await ensurePlaceholderTitleSelection(page);
  await page.keyboard.type("Blank Lines Note");
  await page.keyboard.press("Enter");
  await page.keyboard.type("First line");

  // Consecutive Enter in WYSIWYG should keep blank lines stable.
  await page.keyboard.press("Enter");
  await page.keyboard.press("Enter");
  await page.keyboard.press("Enter");
  await page.keyboard.type("After blanks");

  await waitFor(async () => {
    const value = await page.locator("#editorBody").inputValue();
    assert.match(value, /# Blank Lines Note/);
    assert.match(value, /First line/);
    assert.match(value, /After blanks/);
    const hasBr = value.includes("<br>");
    const hasTripleNewline = /\n{3,}/.test(value);
    assert.ok(
      hasBr || hasTripleNewline,
      `Expected preserved blank lines (<br> or extra newlines), got:\n${value}`
    );
  }, 8000);
});

test("prototype editor opens external links without navigating the app", async (t) => {
  if (process.env.RUN_BROWSER_E2E !== "1") {
    t.skip("Set RUN_BROWSER_E2E=1 to enable browser e2e in local runs.");
    return;
  }

  const playwright = await optionalPlaywright(t);
  if (!playwright) return;

  const stack = await startPrototypeStack(t, playwright);
  if (!stack) return;
  const { page, webBase } = stack;

  await createAndSaveNoteViaEditor(page, "# External Link\n\n[Example](https://example.com)");

  const startUrl = page.url();
  await ensureNoteMode(page);
  await page.waitForFunction(() => {
    const rich = document.querySelector("#wysiwygHost .toastui-editor-contents");
    return Boolean(rich && rich.querySelector("a[href^='https://']"));
  });

  const popupPromise = page.waitForEvent("popup").catch(() => null);
  await page.evaluate(() => {
    const link = document.querySelector("#wysiwygHost .toastui-editor-contents a[href^='https://']");
    if (!link) throw new Error("Missing external link in wysiwyg contents");
    link.scrollIntoView({ block: "center", inline: "center" });
    link.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
  });
  const popup = await popupPromise;
  if (popup) {
    await popup.close().catch(() => {});
  }

  await waitFor(async () => {
    assert.equal(page.url(), startUrl);
    assert.ok(page.url().startsWith(`${webBase}/prototype`), `Unexpected navigation to ${page.url()}`);
  }, 3000);
});

test("prototype editor can insert image and attachment", async (t) => {
  if (process.env.RUN_BROWSER_E2E !== "1") {
    t.skip("Set RUN_BROWSER_E2E=1 to enable browser e2e in local runs.");
    return;
  }

  const playwright = await optionalPlaywright(t);
  if (!playwright) return;

  const stack = await startPrototypeStack(t, playwright);
  if (!stack) return;
  const { page } = stack;

  const tempDir = await makeTempDir("yansilu-asset-e2e-");
  const pngPath = path.join(tempDir, "tiny.png");
  const txtPath = path.join(tempDir, "hello.txt");
  const pngBase64 =
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMB/aznP6UAAAAASUVORK5CYII=";
  await fs.writeFile(pngPath, Buffer.from(pngBase64, "base64"));
  await fs.writeFile(txtPath, "hello attachment\n", "utf8");

  await page.locator("#btnNewNote").click();
  await ensurePlaceholderTitleSelection(page);
  await page.keyboard.type("Asset Insert Note");
  await page.keyboard.press("Enter");
  await page.keyboard.type("Body");

  await page.setInputFiles("#assetImageInput", pngPath);
  await waitFor(async () => {
    const value = await page.locator("#editorBody").inputValue();
    assert.match(value, /tiny\.png/);
  }, 10000);

  await page.setInputFiles("#assetFileInput", txtPath);
  await waitFor(async () => {
    const value = await page.locator("#editorBody").inputValue();
    assert.match(value, /hello\.txt/);
  }, 10000);

  await waitFor(async () => {
    const value = await page.locator("#editorBody").inputValue();
    assert.ok(/!\[[^\]]*\]\([^\)]*tiny\.png\)/.test(value), `Expected image markdown, got:\n${value}`);
    assert.ok(/\[[^\]]*\]\([^\)]*hello\.txt\)/.test(value), `Expected attachment markdown, got:\n${value}`);
  }, 8000);

  await ensureNoteMode(page);
  await page.waitForFunction(() => {
    const rich = document.querySelector("#wysiwygHost .toastui-editor-contents");
    return Boolean(
      rich &&
        rich.querySelector("img[data-preview-asset-url]") &&
        [...rich.querySelectorAll("a[data-preview-asset-url]")].some((a) => /hello\.txt/i.test(a.textContent || ""))
    );
  });

  await page.evaluate(() => {
    const img = document.querySelector("#wysiwygHost .toastui-editor-contents img[data-preview-asset-url]");
    if (!img) throw new Error("Missing previewable image asset");
    img.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
  });
  await page.waitForFunction(() => {
    const mask = document.querySelector("#assetPreviewMask");
    return Boolean(mask && !mask.classList.contains("hidden"));
  });

  await page.locator("#btnCloseAssetPreview").click();
  await page.evaluate(() => {
    const link = [...document.querySelectorAll("#wysiwygHost .toastui-editor-contents a[data-preview-asset-url]")]
      .find((node) => /hello\.txt/i.test(node.textContent || ""));
    if (!link) throw new Error("Missing previewable attachment asset");
    link.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
  });
  await page.waitForFunction(() => {
    const mask = document.querySelector("#assetPreviewMask");
    return Boolean(mask && !mask.classList.contains("hidden"));
  });
});

test("prototype editor opens wikilinks and tag results from wysiwyg tokens", async (t) => {
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
    body: "# Token Target\n\nTarget body with #thinkingflow."
  });
  await postJson(apiBase, "/api/v1/notes", {
    directoryId: "dir_original_default",
    body: "# Tag Peer\n\nAnother note with #thinkingflow."
  });
  const source = await postJson(apiBase, "/api/v1/notes", {
    directoryId: "dir_original_default",
    body: "# Token Source\n\nOpen [[Token Target]] and inspect #thinkingflow."
  });
  assert.equal(source.status, 201);

  await page.goto(`${webBase}/prototype`, { waitUntil: "networkidle" });
  await page.locator('.explorer-item[data-kind="file"]', { hasText: "Token Source" }).click();
  await ensureNoteMode(page);
  const startUrl = page.url();
  await page.waitForFunction(() => {
    const host = document.querySelector("#wysiwygHost");
    return Boolean(host && host.querySelector("[data-wikilink='Token Target']") && host.querySelector("[data-tag-token='thinkingflow']"));
  });

  await page.evaluate(() => {
    const tag = document.querySelector("#wysiwygHost [data-tag-token='thinkingflow']");
    if (!tag) throw new Error("Missing tag token");
    tag.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
  });
  await waitFor(async () => {
    assert.equal(page.url(), startUrl);
    const relatedText = await page.locator("#relatedPanel").textContent();
    assert.match(String(relatedText || ""), /锟斤拷签锟斤拷锟斤拷锟斤拷#thinkingflow/);
    assert.match(String(relatedText || ""), /Tag Peer|Token Target/);
  }, 10000);

  await page.evaluate(() => {
    const link = document.querySelector("#wysiwygHost [data-wikilink='Token Target']");
    if (!link) throw new Error("Missing wikilink token");
    link.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
  });
  await waitFor(async () => {
    assert.equal(page.url(), startUrl);
    const value = await page.locator("#editorBody").inputValue();
    assert.match(value, /# Token Source/);
    const relatedText = await page.locator("#relatedPanel").textContent();
    assert.match(String(relatedText || ""), /Token Target/);
    assert.match(String(relatedText || ""), /Target body with #thinkingflow/);
  }, 10000);
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
  await ensureSourceMode(page);
  await focusEditorContent(page);
  await page.keyboard.press(process.platform === "darwin" ? "Meta+End" : "Control+End");
  await page.keyboard.type("\n\n[[ga");

  await waitFor(async () => {
    await page.locator("#linkPicker:not(.hidden) .link-picker-item.active", { hasText: "Gamma target" }).waitFor({ timeout: 500 });
  }, 7000);

  const linkSectionText = await page.locator("#linkPicker .picker-section-label").first().textContent();
  assert.match(String(linkSectionText || ""), /锟斤拷匹锟斤拷|同目录锟绞硷拷/);

  const linkCandidateHtml = await page.locator("#linkPicker .link-picker-item.active").innerHTML();
  assert.match(linkCandidateHtml, /picker-mark/);
  assert.match(linkCandidateHtml, /picker-badge/);
  assert.match(linkCandidateHtml, /picker-meta/);

  assert.equal(await page.locator("#btnSave").isVisible(), false);

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
  await ensureSourceMode(page);
  await placeCaretAtRichBlockEnd(page, "#editorHost .cm-content p:last-of-type, #editorHost .cm-content h1");
  await page.keyboard.type("\n\nUnsaved line.");

  await waitFor(async () => {
    const dirty = await page.locator(".tab.active .tab-dirty").textContent();
    assert.ok(String(dirty || "").trim());
  }, 7000);

  page.once("dialog", async (dialog) => {
    assert.ok(dialog.message().includes("未锟斤拷锟斤拷") || dialog.message().includes("unsaved") || dialog.message().includes("锟斤拷锟斤拷"));
    await dialog.dismiss();
  });
  await page.locator(".tab.active .tab-close").click();
  await page.locator(".tab.active", { hasText: "Dirty source" }).waitFor({ timeout: 1000 });

  await page.locator('.explorer-item[data-kind="file"]', { hasText: "Switch target" }).click();
  await page.waitForFunction(() => document.querySelector("#editorBody")?.value?.includes("Switch target"));

  await waitFor(async () => {
    const saved = await fetchJson(apiBase, `/api/v1/notes/${encodeURIComponent(first.json.item.id)}`);
    assert.equal(saved.status, 200);
    assert.match(saved.json.item.body, /Unsaved line\./);
  }, 10000);

  page.once("dialog", async (dialog) => {
    assert.ok(dialog.message().includes("未锟斤拷锟斤拷") || dialog.message().includes("unsaved") || dialog.message().includes("锟斤拷锟斤拷"));
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
  await ensureSourceMode(page);
  await placeCaretAtRichBlockEnd(page, "#editorHost .cm-content p:last-of-type, #editorHost .cm-content h1");
  await page.keyboard.type("\n\nRecovered draft line.");

  await waitFor(async () => {
    const draftCount = await page.evaluate(() =>
      Object.keys(window.localStorage).filter((key) => key.startsWith("yansilu:draft:")).length
    );
    assert.equal(draftCount, 1);
  }, 7000);

  const dialogMessages = [];
  page.on("dialog", async (dialog) => {
    dialogMessages.push(dialog.message());
    await dialog.accept();
  });

  await page.reload({ waitUntil: "networkidle" });
  await page.locator('.explorer-item[data-kind="file"]', { hasText: "Autosave source" }).click();
  await ensureSourceMode(page);
  await page.waitForFunction(() => document.querySelector("#editorBody")?.value?.includes("Recovered draft line."));

  assert.ok(
    dialogMessages.some((message) => String(message || "").includes("锟捷革拷") || String(message || "").includes("锟街革拷")),
    JSON.stringify(dialogMessages)
  );
  const restored = await page.locator("#editorBody").inputValue();
  assert.match(restored, /Recovered draft line\./);
  const restoreStatus = await currentStatusText(page);
  assert.match(String(restoreStatus || ""), /锟窖恢革拷锟较达拷未锟斤拷傻谋嗉拷锟斤拷锟絴锟街革拷/);

  await confirmAuthorshipIfVisible(page, { claim: "Autosave source 锟斤拷位指锟斤拷锟侥诧拷写锟斤拷锟斤拷锟揭碉拷前锟较可碉拷锟叫断★拷" });
  await page.keyboard.press(process.platform === "darwin" ? "Meta+S" : "Control+S");
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
  await ensureNoteMode(page);
  await page.waitForFunction(() => Boolean(document.querySelector("#wysiwygHost [data-tag-token='sharedtag']")));

  await page.evaluate(() => {
    const token = document.querySelector("#wysiwygHost [data-tag-token='sharedtag']");
    if (!token) throw new Error("Missing #sharedtag token");
    token.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
  });

  await waitFor(async () => {
    const related = await page.locator("#resultArea").textContent();
    assert.match(related || "", /Hidden sibling result/);
  }, 7000);

  const resultText = await page.locator("#resultArea").textContent();
  assert.ok(String(resultText || "").includes("锟斤拷签") && String(resultText || "").includes("#sharedtag"));
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
  await ensureSourceMode(page);
  await focusEditorContent(page);
  await page.keyboard.press(process.platform === "darwin" ? "Meta+End" : "Control+End");
  await page.keyboard.type("\n\n#writ");

  await waitFor(async () => {
    await page.locator("#tagPicker:not(.hidden) .link-picker-item.active", { hasText: "#writingflow" }).waitFor({ timeout: 500 });
  }, 7000);

  const tagSectionText = await page.locator("#tagPicker .picker-section-label").first().textContent();
  assert.ok(String(tagSectionText || "").trim().length > 0);

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
    assert.match(String(statusText || ""), /锟斤拷选锟斤拷 Vault 路锟斤拷锟斤拷browser锟斤拷/);
  }, 7000);

  const promptMeta = await page.evaluate(() => window.__lastVaultPrompt || null);
  assert.ok(promptMeta);
  assert.match(String(promptMeta.message || ""), /锟斤拷锟斤拷锟斤拷目录路锟斤拷/);
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
  await page.locator("#importResult .candidate-group", { hasText: "锟斤拷锟阶笔硷拷" }).waitFor();

  const previewResultText = await page.locator("#importResult").textContent();
  assert.match(previewResultText || "", /"importRecordId":\s*"/);
  const importRecordId = await page.inputValue("#importRecordId");
  assert.ok(importRecordId.startsWith("imp_"));

  const sourceGroup = page.locator("#importResult .candidate-group").filter({
    has: page.locator(".candidate-group-title", { hasText: /^锟斤拷源锟斤拷片$/ })
  });
  const literatureGroup = page.locator("#importResult .candidate-group").filter({
    has: page.locator(".candidate-group-title", { hasText: /^锟斤拷锟阶笔硷拷$/ })
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
  await page.locator("#importResult .candidate-summary-title").first().waitFor();
  await page.locator("#importResult .candidate-summary-item", { hasText: "Fixture Import Note" }).waitFor();
  await page.locator('#importResult [data-skip-focus="unselected"]').click();
  await page.locator("#importResult .candidate-focus-banner", { hasText: "未锟斤拷选锟斤拷锟斤拷" }).waitFor();
  await page.locator("#importResult .candidate-item.is-focused", { hasText: "Fixture Import Note" }).waitFor();
  await page.locator("#importResult .candidate-inline-note", { hasText: "确锟斤拷前取锟斤拷锟斤拷选" }).waitFor();
  const sourceConfirmGroup = page.locator("#importResult .candidate-group").filter({
    has: page.locator(".candidate-group-title", { hasText: /^锟斤拷源锟斤拷片$/ })
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

test("prototype import panel confirms and rolls back realistic Obsidian vault import", async (t) => {
  if (process.env.RUN_BROWSER_E2E !== "1") {
    t.skip("Set RUN_BROWSER_E2E=1 to enable browser e2e in local runs.");
    return;
  }

  const playwright = await optionalPlaywright(t);
  if (!playwright) return;

  const stack = await startPrototypeStack(t, playwright);
  if (!stack) return;
  const { apiBase, page, vaultPath } = stack;

  const fixturePath = path.join(REPO_ROOT, "tests", "fixtures", "imports", "obsidian-realistic-vault");

  await openImportsModule(page);
  await page.selectOption("#importConnector", "obsidian");
  await page.fill("#importPath", fixturePath);
  await page.fill("#importPayload", "");
  await page.fill("#importOptions", JSON.stringify({ detectWikilinks: true }));
  await page.click("#btnImportPreview");

  await page.waitForFunction(() => {
    const text = document.querySelector("#importResult")?.textContent || "";
    return text.includes('"stage": "preview"') && text.includes("锟斤拷锟斤拷锟侥讹拷锟斤拷片") && text.includes('"blocked"');
  });
  await page.locator('#importResult .result-card[data-result-stage="preview"]').waitFor();
  await page.locator("#importResult .candidate-item.tone-blocked", { hasText: "Spacing Note" }).waitFor();

  const importRecordId = await page.inputValue("#importRecordId");
  assert.ok(importRecordId.startsWith("imp_"));

  await page.locator('[data-candidate-action="exclude-blocked"]').click();
  await page.locator("#btnImportConfirm", { hasText: "4/5" }).waitFor();
  await expectChecked(page.locator("#importResult .candidate-item.tone-blocked .candidate-checkbox").first(), false);

  await page.click("#btnImportConfirm");
  await page.waitForFunction(() => {
    const text = document.querySelector("#importResult")?.textContent || "";
    return text.includes('"stage": "confirm"') && text.includes('"status": "completed"');
  });
  await page.locator('#importResult .result-card[data-result-stage="confirm"]').waitFor();

  const confirmResultText = await page.locator("#importResult").textContent();
  assert.match(confirmResultText || "", /"sources":\s*2/);
  assert.match(confirmResultText || "", /"literatureNotes":\s*2/);
  assert.match(confirmResultText || "", /"permanentNotes":\s*0/);
  assert.match(confirmResultText || "", /"selectedCandidates":\s*4/);

  const importedLiteratureNotes = await waitFor(async () => {
    const result = await fetchJson(apiBase, "/api/v1/directories/dir_literature_default/notes");
    assert.equal(result.status, 200);
    assert.equal(result.json.total, 2);
    return result;
  }, 7000);
  const chineseNote = importedLiteratureNotes.json.items.find((item) => item.title === "锟斤拷锟斤拷锟侥讹拷锟斤拷片");
  assert.ok(chineseNote, JSON.stringify(importedLiteratureNotes.json.items, null, 2));
  const chineseMarkdownPath = path.join(vaultPath, String(chineseNote.markdownPath || "").replaceAll("/", path.sep));
  const chineseMarkdown = await fs.readFile(chineseMarkdownPath, "utf8");
  assert.match(chineseMarkdown, /锟斤拷源\/锟斤拷谈/);
  assert.match(chineseMarkdown, /\[\[Research\/Spacing Note\|英锟侥诧拷锟斤拷\]\]/);

  await page.selectOption("#importHistoryStatus", "completed");
  await page.selectOption("#importHistoryConnector", "obsidian");
  await page.locator(`.import-history-item[data-import-history-id="${importRecordId}"]`).waitFor();
  await page.locator(`.import-history-item[data-import-history-id="${importRecordId}"] [data-import-history-action="rollback"]`).click();
  await page.waitForFunction(() => {
    const text = document.querySelector("#importResult")?.textContent || "";
    return text.includes('"stage": "rollback"') && text.includes('"status": "rolled_back"');
  });

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
    assert.match(text || "", /预锟斤拷/);
  }, 7000);

  await page.selectOption("#importHistoryStatus", "preview");
  await page.selectOption("#importHistoryConnector", "markdown");
  await page.locator(`.import-history-item[data-import-history-id="${importRecordId}"]`).waitFor();
  await page.waitForFunction(
    (recordId) => {
      const item = document.querySelector(`.import-history-item[data-import-history-id="${recordId}"]`);
      return Boolean(item && /预锟斤拷/.test(item.textContent || ""));
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
    return text.trim().length > 0;
  });

  await page.selectOption("#importHistoryStatus", "completed");
  await page.locator(`.import-history-item[data-import-history-id="${importRecordId}"]`).waitFor();
  await page.waitForFunction(
    (recordId) => {
      const item = document.querySelector(`.import-history-item[data-import-history-id="${recordId}"]`);
      const text = item?.textContent || "";
      return Boolean(
        item &&
          /锟斤拷写锟斤拷/.test(text) &&
          /锟窖达拷锟斤拷 1 锟斤拷源锟斤拷片 \/ 1 锟斤拷锟阶笔硷拷 \/ 0 锟斤拷锟矫笔硷拷/.test(text) &&
          /写锟斤拷 notes\/sources/.test(text) &&
          item.querySelector('[data-import-history-action="rollback"]')
      );
    },
    importRecordId
  );

  await page.locator(`.import-history-item[data-import-history-id="${importRecordId}"] [data-import-history-action="rollback"]`).click();
  await page.waitForFunction(() => {
    const resultText = document.querySelector("#importResult")?.textContent || "";
    const historyText = document.querySelector("#importHistory")?.textContent || "";
    return (
      (resultText.includes('"stage": "rollback"') && resultText.includes('"status": "rolled_back"')) ||
      historyText.trim().length > 0
    );
  });

  await page.waitForFunction(() => {
    const text = document.querySelector("#importHistory")?.textContent || "";
    return text.trim().length > 0;
  });

  await page.selectOption("#importHistoryStatus", "rolled_back");
  await page.locator(`.import-history-item[data-import-history-id="${importRecordId}"]`).waitFor();
  await page.waitForFunction(
    (recordId) => {
      const item = document.querySelector(`.import-history-item[data-import-history-id="${recordId}"]`);
      const text = item?.textContent || "";
      return Boolean(
        item &&
          /锟窖回癸拷/.test(text) &&
          /锟窖回癸拷 2 锟斤拷/.test(text) &&
          /锟斤拷锟斤拷 0 锟斤拷/.test(text) &&
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
          /锟窖回癸拷 1 锟斤拷/.test(text) &&
          /锟斤拷锟斤拷 1 锟斤拷/.test(text) &&
          /锟斤拷锟斤拷 1/.test(text) &&
          /锟窖憋拷锟睫改讹拷锟斤拷锟斤拷/.test(text)
      );
    },
    importRecordId
  );

  await fs.access(markdownPath);
});

test("prototype import history recent summary can open literature queue for a completed batch", async (t) => {
  if (process.env.RUN_BROWSER_E2E !== "1") {
    t.skip("Set RUN_BROWSER_E2E=1 to enable browser e2e in local runs.");
    return;
  }

  const playwright = await optionalPlaywright(t);
  if (!playwright) return;

  const stack = await startPrototypeStack(t, playwright);
  if (!stack) return;
  const { page, webBase } = stack;

  const fixturePath = path.join(REPO_ROOT, "tests", "fixtures", "imports", "markdown-basic");

  await page.goto(`${webBase}/prototype`, { waitUntil: "networkidle" });
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

  await page.selectOption("#importHistoryStatus", "completed");
  const summary = page.locator(`.import-history-summary[data-import-history-id="${importRecordId}"]`);
  await summary.waitFor();
  await summary.locator('[data-import-history-action="resume-literature-queue"]').waitFor();
  await summary.locator('[data-import-history-action="open-literature-queue"]').waitFor();
  const historyItemText = await page.locator(`.import-history-item[data-import-history-id="${importRecordId}"]`).textContent();
  assert.match(String(historyItemText || ""), /Fixture Import Note/);
  await page.locator(`.import-history-item[data-import-history-id="${importRecordId}"] [data-import-history-action="resume-literature-queue"]`).waitFor();
  await page.locator(`.import-history-item[data-import-history-id="${importRecordId}"] [data-import-history-action="open-literature-queue"]`).waitFor();
  await summary.locator('[data-import-history-action="resume-literature-queue"]').click();

  await waitFor(async () => {
    await page.locator("#editorWorkspace:not(.hidden)").waitFor({ timeout: 500 });
    const statusText = await currentStatusText(page);
    const editorBody = await page.locator("#editorBody").inputValue();
    const currentRecordValue = await page.inputValue("#importRecordId");
    assert.equal(currentRecordValue, importRecordId);
    assert.match(String(statusText || ""), new RegExp(`锟窖达拷锟斤拷史锟斤拷录锟斤拷锟斤拷锟斤拷一锟斤拷锟斤拷锟斤拷锟斤拷锟斤拷锟斤拷锟斤拷目锟斤拷${importRecordId}`));
    assert.match(String(editorBody || ""), /# Fixture Import Note/);
    assert.match(String(editorBody || ""), /This note comes from tests fixture markdown import\./);
  }, 10000);
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
  await page.locator("#importResult .candidate-focus-banner", { hasText: "锟侥硷拷锟斤拷突锟斤拷锟斤拷" }).waitFor();
  await page.locator("#importResult .candidate-item.is-focused .candidate-inline-note", { hasText: "目锟斤拷路锟斤拷锟斤拷锟斤拷同锟斤拷锟侥硷拷" }).first().waitFor();
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
    return text.includes("1 锟斤拷锟斤拷锟矫笔硷拷");
  });
  await page.locator('.rail-btn[data-module="writing"].active').waitFor();

  const basketText = await page.locator("#writingBasketList").textContent();
  assert.match(basketText || "", /Imported Writing Seed/);
  const titleValue = await page.inputValue("#writingTitle");
  assert.match(titleValue || "", /Imported Writing Seed/);
});

test("prototype import confirm can open imported literature notes in paraphrase queue", async (t) => {
  if (process.env.RUN_BROWSER_E2E !== "1") {
    t.skip("Set RUN_BROWSER_E2E=1 to enable browser e2e in local runs.");
    return;
  }

  const playwright = await optionalPlaywright(t);
  if (!playwright) return;

  const stack = await startPrototypeStack(t, playwright);
  if (!stack) return;
  const { page, webBase } = stack;

  const fixturePath = path.join(REPO_ROOT, "tests", "fixtures", "imports", "markdown-basic");

  await page.goto(`${webBase}/prototype`, { waitUntil: "networkidle" });
  await openImportsModule(page);
  await page.selectOption("#importConnector", "markdown");
  await page.fill("#importPath", fixturePath);
  await page.fill("#importPayload", "");
  await page.fill("#importOptions", "");
  await page.click("#btnImportPreview");

  await page.waitForFunction(() => {
    const text = document.querySelector("#importResult")?.textContent || "";
    return text.includes('"stage": "preview"') && text.includes("Fixture Import Note");
  });

  await page.click("#btnImportConfirm");
  await page.locator('#importResult .result-card[data-result-stage="confirm"]').waitFor();
  await page.waitForFunction(() => {
    const text = document.querySelector("#importResult .result-actions-inline")?.textContent || "";
    return text.includes("锟斤拷转锟斤拷") && text.includes("锟斤拷锟斤拷锟阶拷锟斤拷锟斤拷锟?1") && text.includes("剩锟斤拷锟斤拷锟斤拷锟?1 锟斤拷");
  });
  await page.locator('[data-import-writing-action="open-literature-queue"]').waitFor();
  const actionText = await page.locator('[data-import-writing-action="open-literature-queue"]').textContent();
  const actionNoteText = await page.locator("#importResult .result-actions-inline .toolbar-note").first().textContent();
  const importActionAreaText = await page.locator("#importResult .result-actions-inline").textContent();
  assert.match(String(actionText || ""), /锟斤拷锟斤拷锟阶拷锟斤拷锟斤拷锟?1/);
  assert.match(String(actionNoteText || ""), /剩锟斤拷锟斤拷锟斤拷锟?1 锟斤拷/);
  assert.match(String(importActionAreaText || ""), /锟斤拷转锟斤拷/);
  assert.match(String(importActionAreaText || ""), /锟斤拷锟斤拷锟斤拷/);
  assert.match(String(importActionAreaText || ""), /锟斤拷转锟斤拷锟矫笔硷拷/);
  await waitFor(async () => {
    const statusText = await currentStatusText(page);
    assert.ok(String(statusText || "").trim().length > 0);
  }, 10000);
  await page.locator('[data-import-writing-action="open-literature-queue"]').click();

  await waitFor(async () => {
    await page.locator("#editorWorkspace:not(.hidden)").waitFor({ timeout: 500 });
    const statusText = await currentStatusText(page);
    const editorBody = await page.locator("#editorBody").inputValue();
    assert.ok(String(statusText || "").trim().length > 0);
    assert.match(String(editorBody || ""), /# Fixture Import Note/);
    assert.match(String(editorBody || ""), /It should produce source and literature candidates\./);
  }, 10000);
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
    return text.includes("锟斤拷前锟斤拷目锟斤拷wp_") && text.includes("1 锟斤拷锟斤拷锟矫笔硷拷");
  });

  const basketText = await page.locator("#writingBasketList").textContent();
  assert.match(basketText || "", /Imported Project Seed/);
  const titleValue = await page.inputValue("#writingTitle");
  assert.match(titleValue || "", /Imported Project Seed/);
});

test("prototype import create-writing-project failure clears old writing project context", async (t) => {
  if (process.env.RUN_BROWSER_E2E !== "1") {
    t.skip("Set RUN_BROWSER_E2E=1 to enable browser e2e in local runs.");
    return;
  }

  const playwright = await optionalPlaywright(t);
  if (!playwright) return;

  const stack = await startPrototypeStack(t, playwright);
  if (!stack) return;
  const { apiBase, page, webBase, vaultPath } = stack;
  const recordId = "imp_browser_create_project_failure";
  const createdAt = new Date().toISOString();

  const oldNote = await postJson(apiBase, "/api/v1/notes", {
    directoryId: "dir_original_default",
    status: "active",
    body: "# Existing writing context\n\nThis older project should be cleared before the import flow tries a new project."
  });
  assert.equal(oldNote.status, 201, JSON.stringify(oldNote.json));

  const oldProject = await postJson(apiBase, "/api/v1/writing-projects", {
    title: "Existing Project Context",
    goal: "This goal should not leak after the import project creation fails.",
    audience: "Existing audience",
    basketNoteIds: [oldNote.json.item.id]
  });
  assert.equal(oldProject.status, 201, JSON.stringify(oldProject.json));

  await fs.mkdir(path.join(vaultPath, "imports", "markdown"), { recursive: true });
  await fs.writeFile(
    path.join(vaultPath, "imports", "markdown", `${recordId}.preview.json`),
    JSON.stringify(
      {
        requestId: "browser_create_project_failure",
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
            permanentNoteIds: ["pn_browser_create_project_failure"]
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
                permanentId: "pn_browser_create_project_failure",
                similarity: 0.11,
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
              id: "pn_browser_create_project_failure",
              title: "Imported Failure Seed",
              core_claim: "A failed create-project import flow should still clear stale project context.",
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
  await page.locator('.rail-btn[data-module="writing"]').click();
  await page.locator(`#writingProjectsList button[data-writing-project-action="open"][data-writing-project-id="${oldProject.json.item.id}"]`).click();
  await page.waitForFunction((projectId) => {
    const text = document.querySelector("#writingBasketSummary")?.textContent || "";
    return text.includes(projectId);
  }, oldProject.json.item.id);

  await page.route("**/api/v1/writing-projects", async (route) => {
    if (route.request().method() !== "POST") {
      await route.fallback();
      return;
    }
    await route.fulfill({
      status: 400,
      contentType: "application/json",
      body: JSON.stringify({
        error: {
          code: "WRITING_PROJECT_CREATE_FAILED",
          message: "simulated writing project create failure"
        }
      })
    });
  });

  await openImportsModule(page);
  await page.fill("#importRecordId", recordId);
  await page.click("#btnImportRefresh");
  await page.waitForFunction(() => {
    const text = document.querySelector("#importResult")?.textContent || "";
    return text.includes('"stage": "record"') && text.includes("Imported Failure Seed");
  });

  await page.click("#btnImportConfirm");
  await page.locator('#importResult .result-card[data-result-stage="confirm"]').waitFor();
  await page.locator('[data-import-writing-action="create-writing-project"]').click();

  await page.locator('.rail-btn[data-module="writing"]').click();
  await page.locator('.rail-btn[data-module="writing"].active').waitFor();
  await page.waitForFunction((oldProjectId) => {
    const resultText = document.querySelector("#writingResult")?.textContent || "";
    const basketText = document.querySelector("#writingBasketSummary")?.textContent || "";
    const title = document.querySelector("#writingTitle")?.value || "";
    const goal = document.querySelector("#writingGoal")?.value || "";
    const audience = document.querySelector("#writingAudience")?.value || "";
    return (
      resultText.includes("writing_project_error") &&
      resultText.includes("simulated writing project create failure") &&
      basketText.includes("写锟斤拷锟斤拷锟斤拷锟斤拷锟斤拷 1 锟斤拷锟斤拷锟矫笔硷拷") &&
      basketText.includes("锟斤拷未锟斤拷锟斤拷锟斤拷目") &&
      basketText.includes("锟斤拷未锟斤拷锟斤拷 scaffold") &&
      basketText.includes("锟斤拷未锟襟定草革拷") &&
      !basketText.includes(oldProjectId) &&
      !title.includes("Existing Project Context") &&
      !goal.includes("This goal should not leak") &&
      !audience.includes("Existing audience")
    );
  }, oldProject.json.item.id);

  const basketSummary = await page.locator("#writingBasketSummary").textContent();
  assert.match(basketSummary || "", /写锟斤拷锟斤拷锟斤拷锟斤拷锟斤拷 1 锟斤拷锟斤拷锟矫笔硷拷/);
  assert.match(basketSummary || "", /锟斤拷未锟斤拷锟斤拷锟斤拷目/);
  assert.doesNotMatch(basketSummary || "", new RegExp(oldProject.json.item.id));
  assert.doesNotMatch((await page.inputValue("#writingTitle")) || "", /Existing Project Context/);
  assert.doesNotMatch((await page.inputValue("#writingGoal")) || "", /This goal should not leak/);
  assert.doesNotMatch((await page.inputValue("#writingAudience")) || "", /Existing audience/);
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
      return Boolean(item && /锟斤拷锟?1/.test(text));
    },
    importRecordId
  );
  await page.locator('[data-candidate-filter="blocked"]', { hasText: "锟斤拷锟?1" }).click();
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
          /锟斤拷锟斤拷 2/.test(text) &&
          /锟斤拷锟?1/.test(text) &&
          /锟斤拷选 1 锟斤拷源锟斤拷片 \/ 1 锟斤拷锟阶笔硷拷 \/ 2 锟斤拷锟矫笔硷拷/.test(text) &&
          /锟斤拷要锟剿癸拷锟斤拷椋猴拷锟酵拷锟斤拷锟?2 \/ 原锟斤拷锟皆撅拷锟斤拷 1 \/ 原锟斤拷锟斤拷锟斤拷锟?1/.test(text)
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
  const { apiBase, page, vaultPath } = stack;

  const createdNote = await postJson(apiBase, "/api/v1/notes", {
    directoryId: "dir_original_default",
    body: "# Export panel note\n\nThis note should be exported from the browser UI with a [resource file](../../assets/browser-export/asset.txt)."
  });
  assert.equal(createdNote.status, 201);
  await fs.mkdir(path.join(vaultPath, "assets", "browser-export"), { recursive: true });
  await fs.writeFile(path.join(vaultPath, "assets", "browser-export", "asset.txt"), "browser asset", "utf8");

  const exportTargetPath = await makeTempDir("yansilu-browser-export-target-");
  await openImportsModule(page);
  await page.fill("#exportTargetPath", exportTargetPath);
  await page.click("#btnExportMarkdown");

  await page.waitForFunction(() => {
    const text = document.querySelector("#exportResult")?.textContent || "";
    return text.includes('"stage": "export_markdown"') && text.includes('"assetFiles": 1') && text.includes("锟斤拷源锟侥硷拷");
  });
  await page.locator('#exportResult .result-card[data-result-stage="export_markdown"]').waitFor();

  const exportResultText = await page.locator("#exportResult").textContent();
  assert.match(exportResultText || "", /"exportJobId":\s*"exp_/);
  assert.match(exportResultText || "", /"status":\s*"queued"/);
  assert.match(exportResultText || "", /Markdown 锟侥硷拷/);
  assert.match(exportResultText || "", /锟斤拷源锟侥硷拷/);

  const exportedFiles = await listMarkdownFiles(exportTargetPath);
  assert.ok(exportedFiles.length >= 1, JSON.stringify(exportedFiles, null, 2));
  const exportedAsset = await fs.readFile(path.join(exportTargetPath, "assets", "browser-export", "asset.txt"), "utf8");
  assert.equal(exportedAsset, "browser asset");

  const exportedContents = await Promise.all(exportedFiles.map((file) => fs.readFile(file, "utf8")));
  const exportedContent = exportedContents.find((content) => content.includes("# Export panel note")) || "";
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
  const { apiBase, page, vaultPath, webBase } = stack;

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

  const writingDirectory = await postJson(apiBase, "/api/v1/directories", {
    title: "Writing UI Scope",
    parentDirectoryId: "dir_original_default",
    directoryType: "custom",
    fsPath: path.join(vaultPath, "notes", "original", "writing-ui-scope"),
    maxNotes: 500
  });
  assert.equal(writingDirectory.status, 201, JSON.stringify(writingDirectory.json));
  const writingDirectoryId = writingDirectory.json.item.id;

  const noteA = await postJson(apiBase, "/api/v1/notes", {
    directoryId: writingDirectoryId,
    status: "active",
    body: "# Writing UI claim\n\nThe writing panel should start from permanent notes."
  });
  assert.equal(noteA.status, 201, JSON.stringify(noteA.json));

  const noteB = await postJson(apiBase, "/api/v1/notes", {
    directoryId: writingDirectoryId,
    status: "active",
    body: "# Evidence UI map\n\nThe scaffold should retain an evidence map."
  });
  assert.equal(noteB.status, 201, JSON.stringify(noteB.json));

  await page.goto(`${webBase}/prototype`, { waitUntil: "networkidle" });
  await page.locator('[data-action="quick-original"]').click();
  await page.locator(`.explorer-item[data-kind="folder"][data-id="${writingDirectoryId}"]`).click();
  await page.locator('.explorer-item[data-kind="file"]', { hasText: "Writing UI claim" }).waitFor();
  await page.locator('.explorer-item[data-kind="file"]', { hasText: "Evidence UI map" }).waitFor();
  await page.locator('.rail-btn[data-module="writing"]').click();
  await page.fill("#writingTitle", "Writing UI Project");
  await page.fill("#writingGoal", "Turn two permanent notes into a browser-generated scaffold.");
  await page.fill("#writingAudience", "Researchers");
  await page.fill("#writingTone", "clear");
  await page.fill("#writingVersionNote", "First scaffold note from browser flow.");
  await page.click("#btnWritingAddVisible");
  const targetBasketIds = [noteA.json.item.id, noteB.json.item.id];
  await page.waitForFunction(
    (ids) => {
      const basketIds = String(document.querySelector("#writingBasketNoteIds")?.value || "").split(/\s+/);
      return ids.every((id) => basketIds.includes(id));
    },
    targetBasketIds
  );
  const extraBasketIds = (await page.locator("#writingBasketNoteIds").inputValue())
    .split(/\s+/)
    .filter((id) => id && !targetBasketIds.includes(id));
  for (const noteId of extraBasketIds) {
    await page.locator(`#writingBasketList [data-writing-action="remove"][data-writing-note-id="${noteId}"]`).click();
  }
  await page.waitForFunction(() => {
    const text = document.querySelector("#writingBasketSummary")?.textContent || "";
    return text.includes("写锟斤拷锟斤拷锟斤拷锟斤拷 2 锟斤拷锟斤拷锟矫笔硷拷");
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
  await waitFor(async () => {
    const statusStripText = await page.locator("#writingStatusStrip").textContent();
    assert.match(statusStripText || "", /锟斤拷目/);
    assert.match(statusStripText || "", /锟窖达拷锟斤拷/);
    assert.match(statusStripText || "", /强模锟斤拷/);
    assert.match(statusStripText || "", /锟饺诧拷锟斤拷锟斤拷|锟缴凤拷锟斤拷/);
  }, 10000);

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
  assert.ok(String(scaffoldPreviewText || "").trim().length > 0);
  assert.match(scaffoldPreviewText || "", /Confirmed distillation|锟结纯/);
  assert.match(scaffoldPreviewText || "", /Opening frame/);
  assert.match(scaffoldPreviewText || "", /Paragraph-Evidence Map/);
  await waitFor(async () => {
    const statusStripText = await page.locator("#writingStatusStrip").textContent();
    assert.match(statusStripText || "", /锟斤拷目/);
    assert.match(statusStripText || "", /锟窖达拷锟斤拷/);
    assert.match(statusStripText || "", /强模锟斤拷/);
    assert.match(statusStripText || "", /预锟斤拷锟斤拷锟斤拷|锟斤拷锟斤拷锟斤拷锟斤拷|锟缴凤拷锟斤拷|锟饺诧拷锟斤拷锟斤拷/);
  }, 10000);

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
  assert.match(scaffoldVersionText || "", /First scaffold note from browser flow/);

  await page.evaluate(() => {
    window.__promptResponse__ = "Edited scaffold note from browser flow.";
    window.prompt = () => window.__promptResponse__;
  });
  await page.locator('#writingScaffoldVersionsList [data-writing-scaffold-action="edit-note"]').first().click();
  await page.waitForFunction(() => {
    const text = document.querySelector("#statusText")?.textContent || "";
    return text.includes("锟窖革拷锟斤拷 scaffold 锟芥本说锟斤拷");
  });
  const editedScaffoldVersionText = await page.locator("#writingScaffoldVersionsList").textContent();
  assert.match(editedScaffoldVersionText || "", /Edited scaffold note from browser flow/);

  await page.locator('#writingScaffoldVersionsList [data-writing-scaffold-action="open"]').nth(1).click();
  await page.waitForFunction((firstId) => {
    const summary = document.querySelector("#writingScaffoldPreview")?.textContent || "";
    return summary.includes(firstId);
  }, firstScaffoldCardId);

  await page.fill("#writingVersionNote", "Draft note saved from browser flow.");
  await page.click("#btnWritingSaveDraft");
  await page.waitForFunction(() => {
    const text = document.querySelector("#statusText")?.textContent || "";
    return text.trim().length > 0;
  });

  const draftVersionsTextV1 = await page.locator("#writingDraftVersionsList").textContent();
  assert.match(draftVersionsTextV1 || "", /v1/);
  assert.match(draftVersionsTextV1 || "", /锟斤拷前锟捷革拷/);
  assert.match(draftVersionsTextV1 || "", /Draft note saved from browser flow/);

  await page.locator('.rail-btn[data-module="writing"].active').waitFor();
  const openDraftText = await page.locator("#btnWritingOpenDraft").textContent();
  assert.match(openDraftText || "", /锟津开碉拷前锟捷革拷/);

  await page.waitForFunction(() => {
    const text = document.querySelector("#writingBasketSummary")?.textContent || "";
    return text.includes("锟斤拷前锟阶段ｏ拷");
  });

  const writingSummaryText = await page.locator("#writingBasketSummary").textContent();
  assert.match(writingSummaryText || "", /锟斤拷前锟阶段ｏ拷/);
  assert.ok(String(writingSummaryText || "").trim().length > 0);
  const scaffoldPreviewAfterDraft = await page.locator("#writingScaffoldPreview").textContent();
  assert.match(scaffoldPreviewAfterDraft || "", /锟斤拷一锟斤拷锟斤拷锟津开碉拷前锟捷革拷/);
  await page.waitForFunction(() => {
    const text = document.querySelector("#writingProjectsList")?.textContent || "";
    return text.includes("Writing UI Project");
  });
  const projectsListText = await page.locator("#writingProjectsList").textContent();
  assert.match(projectsListText || "", /Writing UI Project/);

  await page.locator("#btnWritingOpenDraft").click({ force: true });
  await page.waitForFunction(() => {
    const text = document.querySelector("#statusText")?.textContent || "";
    return text.trim().length > 0;
  });
  const editorValue = await page.locator("#editorBody").inputValue();
  assert.match(editorValue, /# Writing UI Project 锟捷革拷/);
  assert.match(editorValue, /DraftScaffold: ds\\?_/);

  await page.fill("#writingVersionNote", "Second draft note saved from browser flow.");
  await page.click("#btnWritingSaveDraft");
  await page.waitForFunction(() => {
    const text = document.querySelector("#writingDraftVersionsList")?.textContent || "";
    return text.includes("v2");
  });
  const draftVersionsTextV2 = await page.locator("#writingDraftVersionsList").textContent();
  assert.match(draftVersionsTextV2 || "", /v2/);
  assert.match(draftVersionsTextV2 || "", /Second draft note saved from browser flow/);

  await page.evaluate(() => {
    window.__promptResponse__ = "Edited draft note from browser flow.";
    window.prompt = () => window.__promptResponse__;
  });
  await page.locator('#writingDraftVersionsList [data-writing-draft-action="edit-note"]').last().evaluate((button) => button.click());
  await page.waitForFunction(() => {
    const text = document.querySelector("#statusText")?.textContent || "";
    return text.trim().length > 0;
  });
  const editedDraftVersionsText = await page.locator("#writingDraftVersionsList").textContent();
  assert.match(editedDraftVersionsText || "", /Edited draft note from browser flow/);

  await page.locator('.rail-btn[data-module="writing"]').click();
  await page.waitForFunction(() => document.querySelector('.rail-btn[data-module="writing"]')?.classList.contains("active"));
  await page.locator("#btnWritingOpenDraft").click({ force: true });
  await page.waitForFunction(() => {
    const text = document.querySelector("#statusText")?.textContent || "";
    return text.trim().length > 0;
  });

  await page.locator('.rail-btn[data-module="writing"]').click();
  await page.waitForFunction(() => {
    const buttons = [...document.querySelectorAll('#writingDraftVersionsList [data-writing-draft-action="open"]')];
    return buttons.length >= 1 && buttons.every((button) => button instanceof HTMLElement && button.offsetParent !== null);
  });
  await page.locator('#writingDraftVersionsList [data-writing-draft-action="open"]').last().click();
  await page.waitForFunction(() => {
    const text = document.querySelector("#statusText")?.textContent || "";
    return text.trim().length > 0;
  });

  await page.locator('.rail-btn[data-module="writing"]').click();
  await page.waitForFunction(() => {
    const buttons = [...document.querySelectorAll('#writingDraftVersionsList [data-writing-draft-action="set-current"]')];
    return buttons.length >= 1 && buttons.every((button) => button instanceof HTMLElement && button.offsetParent !== null);
  });
  await page.locator('#writingDraftVersionsList [data-writing-draft-action="set-current"]').last().click();
  await page.waitForFunction(() => {
    const text = document.querySelector("#statusText")?.textContent || "";
    return text.trim().length > 0;
  });
  const reboundDraftVersionsText = await page.locator("#writingDraftVersionsList").textContent();
  assert.match(reboundDraftVersionsText || "", /v1/);
  assert.match(reboundDraftVersionsText || "", /锟斤拷前锟捷革拷/);

  await page.locator("#btnWritingOpenDraft").click({ force: true });
  await page.waitForFunction(() => {
    const text = document.querySelector("#statusText")?.textContent || "";
    return text.trim().length > 0;
  });
  const reboundEditorValue = await page.locator("#editorBody").inputValue();
  assert.match(reboundEditorValue, /# Writing UI Project 锟捷革拷/);
  assert.doesNotMatch(reboundEditorValue, /second scaffold/i);

  await page.locator('.rail-btn[data-module="writing"]').click();
  await page.locator('#writingProjectsList button[data-writing-project-action="open"]').first().click();
  await page.waitForFunction(() => {
    const title = document.querySelector("#writingTitle")?.value || "";
    return title.includes("Writing UI Project");
  });
  await waitFor(async () => {
    const statusStripText = await page.locator("#writingStatusStrip").textContent();
    assert.doesNotMatch(statusStripText || "", /锟斤拷取锟斤拷/);
    assert.match(statusStripText || "", /锟斤拷目/);
    assert.match(statusStripText || "", /锟窖达拷锟斤拷/);
  }, 10000);
});

test("paper workspace browser flow preserves draft, selection, failure, and permanent-note continuity across reload", async (t) => {
  if (process.env.RUN_BROWSER_E2E !== "1") {
    t.skip("Set RUN_BROWSER_E2E=1 to enable browser e2e in local runs.");
    return;
  }

  const playwright = await optionalPlaywright(t);
  if (!playwright) return;

  const stack = await startPrototypeStack(t, playwright);
  if (!stack) return;
  const { page, webBase } = stack;

  const paperId = "paper_browser_workspace";
  const savedParaphrase = "My takeaway is that retrieval effort improves later access to the idea.";
  const savedRelation = "This supports turning reading work into durable notes.";
  const refreshedKickoffRelation = "Updated relation after local kickoff started.";
  const savedBoundary = "Only when the study task is comparable.";
  const unsavedParaphrase = "An unsaved draft should survive candidate switches.";
  const unsavedRelation = "This is still in progress and should come back.";
  const unsavedBoundary = "This draft is not ready to save yet.";
  let firstPermanentCandidateId = "";

    await openPaperWorkspace(page, webBase);
    await waitFor(async () => {
      const statusText = await currentPaperWorkspaceStatusText(page);
      assert.match(String(statusText || ""), /已连接 API/);
    }, 4000);

    await page.fill("#paperIdInput", paperId);
    await page.fill("#paperTitleInput", "Browser Paper Workspace");
    await page.click("#btnCreatePaperWorkspace");
    await waitFor(async () => {
      const text = await page.locator(".paper-result-json").textContent();
      assert.match(text || "", /"stage": "create_workspace"/);
      const statusText = await currentPaperWorkspaceStatusText(page);
      assert.match(String(statusText || ""), /论文工作台已创建/);
    }, 6000);
    await waitFor(async () => {
      assert.notEqual(await page.locator("#btnSaveTranslation").getAttribute("disabled"), null);
      const translationStepText = await page.locator(".paper-grid .paper-card.paper-span-2").nth(0).textContent();
      assert.match(String(translationStepText || ""), /还没有候选/);
      assert.match(String(translationStepText || ""), /这里会先生成 literature 候选/);
      assert.match(String(translationStepText || ""), /尚未选择候选/);
      assert.match(String(translationStepText || ""), /先从左侧选一条候选/);
    }, 4000);

  await page.fill(
    "#notebookSummaryInput",
    "Claim: retrieval practice improves retention.\n\nLimitation: sample size was small."
  );
    await page.click("#btnAddNotebookDraft");
    await waitFor(async () => {
      assert.equal(await page.locator(".paper-candidate").count(), 2);
      const statusText = await currentPaperWorkspaceStatusText(page);
      assert.match(String(statusText || ""), /NotebookLM 内容已转成 literature 候选/);
    }, 6000);

  const permanentCandidateButton = page.locator("#btnCreatePermanentCandidate");
  await waitFor(async () => {
    assert.notEqual(await permanentCandidateButton.getAttribute("disabled"), null);
    assert.match(String((await page.locator("[data-paper-candidate-id]").nth(0).getAttribute("class")) || ""), /is-active/);
    assert.doesNotMatch(String((await page.locator("[data-paper-candidate-id]").nth(1).getAttribute("class")) || ""), /is-active/);
      assert.equal(await page.locator("#translationParaphraseInput").inputValue(), "");
      assert.equal(await page.locator("#translationRelationInput").inputValue(), "");
      assert.equal(await page.locator("#translationBoundaryInput").inputValue(), "");
      assert.match(String((await permanentCandidateButton.textContent()) || ""), /先保存转述/);
      const translationStepText = await page.locator(".paper-grid .paper-card.paper-span-2").nth(0).textContent();
      assert.match(String(translationStepText || ""), /先保存这条候选的用户转述，再进入永久笔记候选/);
      assert.match(String(translationStepText || ""), /关系和边界信息也会一起恢复/);
      assert.match(String((await page.locator("[data-paper-draft-continuity]").textContent()) || ""), /先保存这条转述，再继续写 draft/);
      const permanentStepText = await page.locator(".paper-grid .paper-card.paper-span-2").nth(1).textContent();
      assert.match(String(permanentStepText || ""), /当前这条候选只有本地未保存的转述草稿/);
      assert.match(String(permanentStepText || ""), /先保存这条转述，再进入永久笔记候选或继续写 draft/);
  }, 4000);

  await page.fill("#translationParaphraseInput", savedParaphrase);
  await waitFor(async () => {
    assert.notEqual(await permanentCandidateButton.getAttribute("disabled"), null);
    const translationStepText = await page.locator(".paper-grid .paper-card.paper-span-2").nth(0).textContent();
    assert.match(String(translationStepText || ""), /已恢复这条候选的本地未保存转述草稿/);
    assert.match(String(translationStepText || ""), /可以继续修改后再保存/);
  }, 4000);

    await page.click("#btnSaveTranslation");
    await waitFor(async () => {
      const text = await page.locator(".paper-result-json").textContent();
      assert.match(text || "", /"stage": "save_translation"/);
      const statusText = await currentPaperWorkspaceStatusText(page);
      assert.match(String(statusText || ""), /relation 和 boundary|支撑下一步/);
    }, 6000);
    await waitFor(async () => {
      assert.notEqual(await permanentCandidateButton.getAttribute("disabled"), null);
      assert.match(String((await permanentCandidateButton.textContent()) || ""), /先补 relation \/ boundary/);
      const translationStepText = await page.locator(".paper-grid .paper-card.paper-span-2").nth(0).textContent();
      assert.match(String(translationStepText || ""), /relation 和 boundary|支撑下一步/);
      assert.match(String((await page.locator("[data-paper-draft-continuity]").textContent()) || ""), /relation 和 boundary .*继续写 draft/);
      const permanentStepText = await page.locator(".paper-grid .paper-card.paper-span-2").nth(1).textContent();
      assert.match(String(permanentStepText || ""), /relation 和 boundary 还不足以支撑 Step 4/);
      assert.match(String((await page.locator("#btnSaveTranslation").textContent()) || ""), /已保存转述/);
    }, 4000);

  await page.fill("#translationRelationInput", savedRelation);
  await page.fill("#translationBoundaryInput", savedBoundary);
  await waitFor(async () => {
    assert.equal(await page.locator("#btnSaveTranslation").getAttribute("disabled"), null);
    assert.match(String((await page.locator("#btnSaveTranslation").textContent()) || ""), /更新转述/);
    assert.notEqual(await permanentCandidateButton.getAttribute("disabled"), null);
    assert.match(String((await permanentCandidateButton.textContent()) || ""), /先更新转述/);
  }, 4000);

    await page.click("#btnSaveTranslation");
    await waitFor(async () => {
      const text = await page.locator(".paper-result-json").textContent();
      assert.match(text || "", /"stage": "save_translation"/);
    }, 6000);
    await waitFor(async () => {
      assert.equal(await permanentCandidateButton.getAttribute("disabled"), null);
      const permanentStepText = await page.locator(".paper-grid .paper-card.paper-span-2").nth(1).textContent();
      assert.match(String(permanentStepText || ""), /还没有永久笔记候选/);
      assert.match(String(permanentStepText || ""), /先在 Step 3 保存转述并生成候选/);
      assert.match(String(permanentStepText || ""), /保存转述后，可以为当前候选生成永久笔记候选/);
      assert.match(String((await page.locator("[data-paper-draft-continuity]").textContent()) || ""), /具备继续写 draft 的最小条件/);
      assert.match(String((await page.locator("[data-paper-draft-brief-step-four]").textContent()) || ""), /Step 4: 尚未生成永久笔记候选/);
      assert.match(
        String((await page.locator("[data-paper-draft-brief-next-action]").textContent()) || ""),
        /Next action: .*具备继续写 draft 的最小条件/
      );
      assert.equal(await page.locator("#btnCopyDraftBrief").getAttribute("disabled"), null);
      assert.match(String((await page.locator("#btnCopyDraftBrief").textContent()) || ""), /复制 brief，继续写 draft/);
      assert.equal(await page.locator("#confirmAuthorshipInput").isChecked(), false);
      assert.notEqual(await page.locator("#btnSavePermanentNote").getAttribute("disabled"), null);
      assert.match(String((await page.locator("#btnSavePermanentNote").textContent()) || ""), /确认保存为永久笔记/);
    }, 4000);

    await page.click("#btnCopyDraftBrief");
    await waitFor(async () => {
      const statusText = await currentPaperWorkspaceStatusText(page);
      assert.match(String(statusText || ""), /已复制 draft brief/);
      assert.match(String(statusText || ""), /下一步：.*具备继续写 draft 的最小条件/);
      assert.match(
        String((await page.locator("[data-paper-draft-brief-copy]").textContent()) || ""),
        /最近一次已复制。下一步：.*具备继续写 draft 的最小条件/
      );
      const copiedText = await page.evaluate(
        () => window.__paperWorkspaceLastDraftBrief || (Array.isArray(window.__copiedTexts) ? window.__copiedTexts.at(-1) : "")
      );
      assert.match(String(copiedText || ""), /# Draft brief:/);
      assert.match(String(copiedText || ""), /## Relation to question/);
      assert.match(String(copiedText || ""), /This supports turning reading work into durable notes\./);
    }, 4000);

    await page.click("#btnStartDraftKickoff");
    await waitFor(async () => {
      const statusText = await currentPaperWorkspaceStatusText(page);
      assert.match(String(statusText || ""), /已载入本地 draft kickoff/);
      assert.match(String((await page.locator("#btnStartDraftKickoff").textContent()) || ""), /继续本地 draft/);
      assert.match(String((await page.locator("#draftKickoffTextarea").inputValue()) || ""), /# Draft brief:/);
      assert.match(
        String((await page.locator("[data-paper-draft-kickoff-note]").textContent()) || ""),
        /本地 draft kickoff 会跟着当前候选连续恢复/
      );
    }, 4000);

    await page.fill("#draftKickoffTextarea", "Local draft kickoff wording that should survive refresh.");
    await page.fill("#translationRelationInput", refreshedKickoffRelation);
    await waitFor(async () => {
      assert.equal(await page.locator("#btnSaveTranslation").getAttribute("disabled"), null);
      assert.match(String((await page.locator("#btnSaveTranslation").textContent()) || ""), /更新转述/);
    }, 4000);
    await page.click("#btnSaveTranslation");
    await waitFor(async () => {
      const text = await page.locator(".paper-result-json").textContent();
      assert.match(text || "", /"stage": "save_translation"/);
      assert.match(String((await page.locator("#btnStartDraftKickoff").textContent()) || ""), /载入新版 brief，更新本地 draft/);
      assert.match(
        String((await page.locator("[data-paper-draft-kickoff-note]").textContent()) || ""),
        /仍基于旧版转述/
      );
    }, 6000);
    await page.click("#btnStartDraftKickoff");
    await waitFor(async () => {
      const statusText = await currentPaperWorkspaceStatusText(page);
      assert.match(String(statusText || ""), /已载入本地 draft kickoff/);
      assert.match(
        String((await page.locator("#draftKickoffTextarea").inputValue()) || ""),
        new RegExp(refreshedKickoffRelation.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
      );
      assert.match(String((await page.locator("#draftKickoffPreviousTextarea").inputValue()) || ""), /Local draft kickoff wording that should survive refresh\./);
      assert.match(
        String((await page.locator("[data-paper-draft-kickoff-previous-note]").textContent()) || ""),
        /保留了上一版 kickoff/
      );
    }, 4000);
    await page.click("#btnAdoptPreviousKickoff");
    await waitFor(async () => {
      const statusText = await currentPaperWorkspaceStatusText(page);
      assert.match(String(statusText || ""), /已采用上一版 kickoff 写法/);
      assert.match(
        String((await page.locator("#draftKickoffTextarea").inputValue()) || ""),
        /Local draft kickoff wording that should survive refresh\./
      );
      assert.match(
        String((await page.locator("#draftKickoffPreviousTextarea").inputValue()) || ""),
        new RegExp(refreshedKickoffRelation.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
      );
    }, 4000);

    await page.locator(".paper-candidate").nth(1).click();
    await waitFor(async () => {
      assert.equal(await page.locator("#translationParaphraseInput").inputValue(), "");
      assert.equal(await page.locator("#translationRelationInput").inputValue(), "");
      assert.equal(await page.locator("#translationBoundaryInput").inputValue(), "");
      assert.doesNotMatch(String((await page.locator("[data-paper-candidate-id]").nth(0).getAttribute("class")) || ""), /is-active/);
      assert.match(String((await page.locator("[data-paper-candidate-id]").nth(1).getAttribute("class")) || ""), /is-active/);
      assert.notEqual(await permanentCandidateButton.getAttribute("disabled"), null);
      const statusText = await currentPaperWorkspaceStatusText(page);
      assert.match(String(statusText || ""), /已选择候选/);
      assert.equal(await page.locator("#draftKickoffTextarea").count(), 0);
    }, 4000);

    await page.fill("#translationRelationInput", "This relation should survive a failed save.");
    await page.fill("#translationBoundaryInput", "This boundary should survive a failed save.");
    await waitFor(async () => {
      const statusText = await currentPaperWorkspaceStatusText(page);
      assert.match(String(statusText || ""), /先保存这条转述，再进入永久笔记候选/);
    }, 4000);
    await page.click("#btnSaveTranslation");
    await waitFor(async () => {
      const text = await page.locator(".paper-result-json").textContent();
      assert.match(text || "", /"stage": "error"/);
      assert.match(text || "", /PAPER_TRANSLATION_PARAPHRASE_REQUIRED/);
      const statusText = await currentPaperWorkspaceStatusText(page);
      assert.match(String(statusText || ""), /操作失败/);
      assert.equal(await page.locator("#translationParaphraseInput").inputValue(), "");
      assert.equal(await page.locator("#translationRelationInput").inputValue(), "This relation should survive a failed save.");
      assert.equal(await page.locator("#translationBoundaryInput").inputValue(), "This boundary should survive a failed save.");
      assert.doesNotMatch(String((await page.locator("[data-paper-candidate-id]").nth(0).getAttribute("class")) || ""), /is-active/);
      assert.match(String((await page.locator("[data-paper-candidate-id]").nth(1).getAttribute("class")) || ""), /is-active/);
      assert.equal(await page.locator("#btnSaveTranslation").getAttribute("disabled"), null);
      assert.match(String((await page.locator("#btnSaveTranslation").textContent()) || ""), /保存转述/);
      assert.notEqual(await permanentCandidateButton.getAttribute("disabled"), null);
      const translationStepText = await page.locator(".paper-grid .paper-card.paper-span-2").nth(0).textContent();
      assert.match(String(translationStepText || ""), /已恢复这条候选的本地未保存转述草稿/);
    }, 6000);

    await openPaperWorkspace(page, webBase);
    await page.fill("#paperIdInput", paperId);
    await page.click("#btnLoadPaperWorkspace");
    await waitFor(async () => {
      const text = await page.locator(".paper-result-json").textContent();
      assert.match(text || "", /"stage": "load_workspace"/);
    }, 6000);
    await waitFor(async () => {
      assert.equal(await page.locator("#translationParaphraseInput").inputValue(), "");
      assert.equal(await page.locator("#translationRelationInput").inputValue(), "This relation should survive a failed save.");
      assert.equal(await page.locator("#translationBoundaryInput").inputValue(), "This boundary should survive a failed save.");
      assert.doesNotMatch(String((await page.locator("[data-paper-candidate-id]").nth(0).getAttribute("class")) || ""), /is-active/);
      assert.match(String((await page.locator("[data-paper-candidate-id]").nth(1).getAttribute("class")) || ""), /is-active/);
      assert.equal(await page.locator("#btnSaveTranslation").getAttribute("disabled"), null);
      assert.match(String((await page.locator("#btnSaveTranslation").textContent()) || ""), /保存转述/);
      assert.notEqual(await permanentCandidateButton.getAttribute("disabled"), null);
      const translationStepText = await page.locator(".paper-grid .paper-card.paper-span-2").nth(0).textContent();
      assert.match(String(translationStepText || ""), /已恢复这条候选的本地未保存转述草稿/);
      assert.match(String(translationStepText || ""), /可以继续修改后再保存/);
    }, 6000);

    await page.fill("#translationRelationInput", unsavedRelation);
    await page.fill("#translationBoundaryInput", unsavedBoundary);

    await page.fill("#translationParaphraseInput", unsavedParaphrase);

  await page.locator(".paper-candidate").nth(0).click();
  await waitFor(async () => {
    assert.equal(await page.locator("#translationParaphraseInput").inputValue(), savedParaphrase);
    assert.equal(await page.locator("#translationRelationInput").inputValue(), refreshedKickoffRelation);
    assert.equal(await page.locator("#translationBoundaryInput").inputValue(), savedBoundary);
    assert.notEqual(await page.locator("#btnSaveTranslation").getAttribute("disabled"), null);
    assert.match(String((await page.locator("#btnSaveTranslation").textContent()) || ""), /已保存转述/);
    assert.equal(await permanentCandidateButton.getAttribute("disabled"), null);
    const translationStepText = await page.locator(".paper-grid .paper-card.paper-span-2").nth(0).textContent();
    assert.match(String(translationStepText || ""), /如果要继续写 draft/);
  }, 4000);

  await page.locator(".paper-candidate").nth(1).click();
  await waitFor(async () => {
    assert.equal(await page.locator("#translationParaphraseInput").inputValue(), unsavedParaphrase);
    assert.equal(await page.locator("#translationRelationInput").inputValue(), unsavedRelation);
    assert.equal(await page.locator("#translationBoundaryInput").inputValue(), unsavedBoundary);
    assert.doesNotMatch(String((await page.locator("[data-paper-candidate-id]").nth(0).getAttribute("class")) || ""), /is-active/);
    assert.match(String((await page.locator("[data-paper-candidate-id]").nth(1).getAttribute("class")) || ""), /is-active/);
    assert.notEqual(await permanentCandidateButton.getAttribute("disabled"), null);
    const translationStepText = await page.locator(".paper-grid .paper-card.paper-span-2").nth(0).textContent();
    assert.match(String(translationStepText || ""), /已恢复这条候选的本地未保存转述草稿/);
    assert.match(String(translationStepText || ""), /可以继续修改后再保存/);
  }, 4000);

  await waitFor(async () => {
    const statusText = await currentPaperWorkspaceStatusText(page);
    assert.match(String(statusText || ""), /先保存这条转述，再进入永久笔记候选/);
  }, 4000);

    await page.locator(".paper-candidate").nth(0).click();
    await waitFor(async () => {
      assert.equal(await page.locator("#translationParaphraseInput").inputValue(), savedParaphrase);
      assert.equal(await page.locator("#translationRelationInput").inputValue(), refreshedKickoffRelation);
      assert.equal(await page.locator("#translationBoundaryInput").inputValue(), savedBoundary);
      assert.match(String((await page.locator("[data-paper-candidate-id]").nth(0).getAttribute("class")) || ""), /is-active/);
      assert.doesNotMatch(String((await page.locator("[data-paper-candidate-id]").nth(1).getAttribute("class")) || ""), /is-active/);
      assert.equal(await permanentCandidateButton.getAttribute("disabled"), null);
      const statusText = await currentPaperWorkspaceStatusText(page);
      assert.match(String(statusText || ""), /这条候选的转述已就绪，但还没有生成对应的永久笔记候选/);
      const translationStepText = await page.locator(".paper-grid .paper-card.paper-span-2").nth(0).textContent();
      assert.match(String(translationStepText || ""), /这条候选已经保存过转述/);
      assert.equal(await page.locator("[data-paper-draft-brief-copy]").count(), 0);
      assert.match(
        String((await page.locator("#draftKickoffTextarea").inputValue()) || ""),
        /Local draft kickoff wording that should survive refresh\./
      );
      assert.match(
        String((await page.locator("#draftKickoffPreviousTextarea").inputValue()) || ""),
        new RegExp(refreshedKickoffRelation.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
      );
      assert.match(String((await page.locator("#btnStartDraftKickoff").textContent()) || ""), /继续本地 draft/);
    }, 4000);

      await page.locator(".paper-candidate").nth(1).click();
      await waitFor(async () => {
        assert.equal(await page.locator("#translationParaphraseInput").inputValue(), unsavedParaphrase);
        assert.equal(await page.locator("#translationRelationInput").inputValue(), unsavedRelation);
        assert.equal(await page.locator("#translationBoundaryInput").inputValue(), unsavedBoundary);
        assert.notEqual(await permanentCandidateButton.getAttribute("disabled"), null);
        const translationStepText = await page.locator(".paper-grid .paper-card.paper-span-2").nth(0).textContent();
        assert.match(String(translationStepText || ""), /已恢复这条候选的本地未保存转述草稿/);
      }, 4000);

      await page.evaluate(
        ({ key, paperId }) => {
          window.localStorage.setItem(
            key,
            JSON.stringify({
              paperId,
              selectedCandidateId: "pwc_missing",
              selectedPermanentCandidateId: "",
              updatedAt: new Date().toISOString()
            })
          );
        },
        { key: paperWorkspaceSelectionStorageKey(paperId), paperId }
      );

      await openPaperWorkspace(page, webBase);
      await page.fill("#paperIdInput", paperId);
      await page.click("#btnLoadPaperWorkspace");
      await waitFor(async () => {
        const text = await page.locator(".paper-result-json").textContent();
        assert.match(text || "", /"stage": "load_workspace"/);
      }, 6000);
      await waitFor(async () => {
        assert.equal(await page.locator(".paper-candidate").count(), 2);
        assert.equal(await page.locator("#translationParaphraseInput").inputValue(), unsavedParaphrase);
        assert.equal(await page.locator("#translationRelationInput").inputValue(), unsavedRelation);
        assert.equal(await page.locator("#translationBoundaryInput").inputValue(), unsavedBoundary);
        assert.doesNotMatch(String((await page.locator("[data-paper-candidate-id]").nth(0).getAttribute("class")) || ""), /is-active/);
        assert.match(String((await page.locator("[data-paper-candidate-id]").nth(1).getAttribute("class")) || ""), /is-active/);
        assert.notEqual(await permanentCandidateButton.getAttribute("disabled"), null);
        const translationStepText = await page.locator(".paper-grid .paper-card.paper-span-2").nth(0).textContent();
        assert.match(String(translationStepText || ""), /已恢复这条候选的本地未保存转述草稿/);
      }, 6000);

          await page.locator(".paper-candidate").nth(0).click();
          await waitFor(async () => {
      assert.equal(await page.locator("#translationParaphraseInput").inputValue(), savedParaphrase);
      assert.equal(await page.locator("#translationRelationInput").inputValue(), refreshedKickoffRelation);
      assert.equal(await page.locator("#translationBoundaryInput").inputValue(), savedBoundary);
      assert.notEqual(await page.locator("#btnSaveTranslation").getAttribute("disabled"), null);
      assert.match(String((await page.locator("#btnSaveTranslation").textContent()) || ""), /已保存转述/);
      assert.equal(await permanentCandidateButton.getAttribute("disabled"), null);
      const statusText = await currentPaperWorkspaceStatusText(page);
      assert.match(String(statusText || ""), /这条候选的转述已就绪，但还没有生成对应的永久笔记候选/);
            const translationStepText = await page.locator(".paper-grid .paper-card.paper-span-2").nth(0).textContent();
            assert.match(String(translationStepText || ""), /这条候选已经保存过转述/);
            assert.match(String(translationStepText || ""), /也可以直接生成永久笔记候选/);
            assert.match(String(translationStepText || ""), /如果要继续写 draft/);
          }, 4000);

          await page.fill("#translationRelationInput", "Updated relation that has not been saved yet.");
          await waitFor(async () => {
            assert.equal(await page.locator("#btnSaveTranslation").getAttribute("disabled"), null);
            assert.match(String((await page.locator("#btnSaveTranslation").textContent()) || ""), /更新转述/);
            assert.match(String((await permanentCandidateButton.textContent()) || ""), /先更新转述/);
            assert.notEqual(await permanentCandidateButton.getAttribute("disabled"), null);
            const permanentStepText = await page.locator(".paper-grid .paper-card.paper-span-2").nth(1).textContent();
            assert.match(String(permanentStepText || ""), /当前 Step 3 还有未保存改动/);
            assert.match(String(permanentStepText || ""), /先更新这条转述，再生成对应的永久笔记候选/);
          }, 4000);
          await page.fill("#translationRelationInput", refreshedKickoffRelation);
          await waitFor(async () => {
            assert.equal(await permanentCandidateButton.getAttribute("disabled"), null);
          }, 4000);

          await page.click("#btnCreatePermanentCandidate");
          await waitFor(async () => {
            const text = await page.locator(".paper-result-json").textContent();
            assert.match(text || "", /"stage": "permanent_candidate"/);
            const parsed = JSON.parse(text || "{}");
            firstPermanentCandidateId = String(parsed?.permanentCandidate?.id || "").trim();
            assert.ok(firstPermanentCandidateId);
            assert.equal(await page.locator("[data-paper-permanent-candidate-id]").count(), 1);
            assert.match(String((await page.locator("[data-paper-permanent-candidate-id]").nth(0).getAttribute("class")) || ""), /is-active/);
            const previewText = await page.locator(".paper-permanent-preview").textContent();
            assert.match(String(previewText || ""), /My takeaway is that retrieval effort improves later access to the idea/);
            assert.doesNotMatch(String(previewText || ""), /已保存为：/);
            const statusText = await currentPaperWorkspaceStatusText(page);
            assert.match(String(statusText || ""), /永久笔记候选已生成/);
            assert.equal(await page.locator("#confirmAuthorshipInput").isChecked(), false);
            assert.equal(await page.locator("#permanentStatusInput").inputValue(), "draft");
            assert.equal(await page.locator("#btnSavePermanentNote").getAttribute("disabled"), null);
            assert.match(String((await page.locator("#btnSavePermanentNote").textContent()) || ""), /确认保存为永久笔记/);
          }, 6000);

        await page.locator(".paper-candidate").nth(1).click();
        await waitFor(async () => {
          assert.equal(await page.locator("#translationParaphraseInput").inputValue(), unsavedParaphrase);
          assert.equal(await page.locator("#translationRelationInput").inputValue(), unsavedRelation);
          assert.equal(await page.locator("#translationBoundaryInput").inputValue(), unsavedBoundary);
          assert.equal(await page.locator(".paper-permanent-preview").count(), 0);
          assert.notEqual(await page.locator("#btnSavePermanentNote").getAttribute("disabled"), null);
          const statusText = await currentPaperWorkspaceStatusText(page);
          assert.match(String(statusText || ""), /已恢复这条候选的本地未保存转述草稿/);
          const permanentStepText = await page.locator(".paper-grid .paper-card.paper-span-2").nth(1).textContent();
          assert.match(String(permanentStepText || ""), /当前这条候选只有本地未保存的转述草稿/);
          assert.match(String(permanentStepText || ""), /先保存这条转述，再进入永久笔记候选或继续写 draft/);
        }, 4000);
        await page.click("#btnSaveTranslation");
        await waitFor(async () => {
          const text = await page.locator(".paper-result-json").textContent();
          assert.match(text || "", /"stage": "save_translation"/);
          assert.equal(await page.locator("#btnCreatePermanentCandidate").getAttribute("disabled"), null);
        }, 6000);
        await page.click("#btnCreatePermanentCandidate");
        await waitFor(async () => {
          const text = await page.locator(".paper-result-json").textContent();
          assert.match(text || "", /"stage": "permanent_candidate"/);
          assert.equal(await page.locator("[data-paper-permanent-candidate-id]").count(), 2);
          assert.match(await page.locator(".paper-permanent-preview").textContent(), /An unsaved draft should survive candidate switches/);
        }, 6000);


            await page.locator("[data-paper-permanent-candidate-id]").nth(0).click();
            await waitFor(async () => {
              const previewText = await page.locator(".paper-permanent-preview").textContent();
              assert.match(String(previewText || ""), /My takeaway is that retrieval effort improves later access to the idea/);
              assert.doesNotMatch(String(previewText || ""), /已保存为：/);
              assert.equal(await page.locator("#translationParaphraseInput").inputValue(), savedParaphrase);
              assert.equal(await page.locator("#translationRelationInput").inputValue(), refreshedKickoffRelation);
              assert.equal(await page.locator("#translationBoundaryInput").inputValue(), savedBoundary);
              assert.match(String((await page.locator("[data-paper-candidate-id]").nth(0).getAttribute("class")) || ""), /is-active/);
              assert.doesNotMatch(String((await page.locator("[data-paper-candidate-id]").nth(1).getAttribute("class")) || ""), /is-active/);
              assert.match(String((await page.locator("[data-paper-permanent-candidate-id]").nth(0).getAttribute("class")) || ""), /is-active/);
              assert.doesNotMatch(String((await page.locator("[data-paper-permanent-candidate-id]").nth(1).getAttribute("class")) || ""), /is-active/);
              assert.match(String((await page.locator("#btnSavePermanentNote").textContent()) || ""), /确认保存为永久笔记/);
              const statusText = await currentPaperWorkspaceStatusText(page);
              assert.match(String(statusText || ""), /已对齐到这条候选的永久笔记候选/);
            }, 4000);
	            await page.locator("[data-paper-permanent-candidate-id]").nth(1).click();
	            await waitFor(async () => {
	              const previewText = await page.locator(".paper-permanent-preview").textContent();
	              assert.match(String(previewText || ""), /An unsaved draft should survive candidate switches/);
                assert.doesNotMatch(String(previewText || ""), /已保存为：/);
                assert.equal(await page.locator("#translationParaphraseInput").inputValue(), unsavedParaphrase);
                assert.equal(await page.locator("#translationRelationInput").inputValue(), unsavedRelation);
                assert.equal(await page.locator("#translationBoundaryInput").inputValue(), unsavedBoundary);
                assert.doesNotMatch(String((await page.locator("[data-paper-candidate-id]").nth(0).getAttribute("class")) || ""), /is-active/);
                assert.match(String((await page.locator("[data-paper-candidate-id]").nth(1).getAttribute("class")) || ""), /is-active/);
                assert.doesNotMatch(String((await page.locator("[data-paper-permanent-candidate-id]").nth(0).getAttribute("class")) || ""), /is-active/);
                assert.match(String((await page.locator("[data-paper-permanent-candidate-id]").nth(1).getAttribute("class")) || ""), /is-active/);
                assert.equal(await page.locator("#permanentStatusInput").inputValue(), "draft");
                assert.equal(await page.locator("#confirmAuthorshipInput").isChecked(), false);
                assert.equal(await page.locator("#btnSavePermanentNote").getAttribute("disabled"), null);
                assert.match(String((await page.locator("#btnSavePermanentNote").textContent()) || ""), /确认保存为永久笔记/);
	            }, 4000);

	              await page.selectOption("#permanentStatusInput", "draft");
	              await page.selectOption("#permanentStatusInput", "draft");
                await page.locator("[data-paper-permanent-candidate-id]").nth(0).click();
                await waitFor(async () => {
                  assert.equal(await page.locator("#permanentStatusInput").inputValue(), "draft");
                }, 4000);
                await page.locator("[data-paper-permanent-candidate-id]").nth(1).click();
                await waitFor(async () => {
                  assert.equal(await page.locator("#permanentStatusInput").inputValue(), "draft");
                }, 4000);
                await page.locator(".paper-candidate").nth(0).click();
                await waitFor(async () => {
                  const previewText = await page.locator(".paper-permanent-preview").textContent();
                  assert.match(String(previewText || ""), /My takeaway is that retrieval effort improves later access to the idea/);
                  assert.doesNotMatch(String(previewText || ""), /An unsaved draft should survive candidate switches/);
                  assert.equal(await page.locator("#permanentStatusInput").inputValue(), "draft");
                  assert.equal(await page.locator("#confirmAuthorshipInput").isChecked(), false);
                }, 4000);
                await page.locator(".paper-candidate").nth(1).click();
                await waitFor(async () => {
                  const previewText = await page.locator(".paper-permanent-preview").textContent();
                  assert.match(String(previewText || ""), /An unsaved draft should survive candidate switches/);
                  assert.doesNotMatch(String(previewText || ""), /My takeaway is that retrieval effort improves later access to the idea/);
                  assert.equal(await page.locator("#permanentStatusInput").inputValue(), "draft");
                  assert.equal(await page.locator("#confirmAuthorshipInput").isChecked(), false);
                }, 4000);

	            await page.click("#btnSavePermanentNote");
            await waitFor(async () => {
              const text = await page.locator(".paper-result-json").textContent();
              assert.match(text || "", /"stage": "error"/);
              assert.match(text || "", /PAPER_PERMANENT_NOTE_AUTHORSHIP_REQUIRED/);
              const statusText = await currentPaperWorkspaceStatusText(page);
              assert.match(String(statusText || ""), /操作失败/);
              const previewText = await page.locator(".paper-permanent-preview").textContent();
              assert.match(String(previewText || ""), /An unsaved draft should survive candidate switches/);
              assert.doesNotMatch(String(previewText || ""), /已保存为：/);
              assert.doesNotMatch(String((await page.locator("[data-paper-permanent-candidate-id]").nth(0).getAttribute("class")) || ""), /is-active/);
              assert.match(String((await page.locator("[data-paper-permanent-candidate-id]").nth(1).getAttribute("class")) || ""), /is-active/);
              assert.equal(await page.locator("#permanentStatusInput").inputValue(), "draft");
              assert.equal(await page.locator("#confirmAuthorshipInput").isChecked(), false);
              assert.equal(await page.locator("#btnSavePermanentNote").getAttribute("disabled"), null);
              assert.match(String((await page.locator("#btnSavePermanentNote").textContent()) || ""), /确认保存为永久笔记/);
            }, 6000);

            await openPaperWorkspace(page, webBase);
            await page.fill("#paperIdInput", paperId);
            await page.click("#btnLoadPaperWorkspace");
            await waitFor(async () => {
              const text = await page.locator(".paper-result-json").textContent();
              assert.match(text || "", /"stage": "load_workspace"/);
              assert.equal(await page.locator("[data-paper-permanent-candidate-id]").count(), 2);
              const statusText = await currentPaperWorkspaceStatusText(page);
              assert.match(String(statusText || ""), /已对齐到这条候选的永久笔记候选/);
            }, 6000);
            await waitFor(async () => {
              const previewText = await page.locator(".paper-permanent-preview").textContent();
              assert.match(String(previewText || ""), /An unsaved draft should survive candidate switches/);
              assert.doesNotMatch(String(previewText || ""), /My takeaway is that retrieval effort improves later access to the idea/);
              assert.doesNotMatch(String(previewText || ""), /已保存为：/);
              assert.doesNotMatch(String((await page.locator("[data-paper-permanent-candidate-id]").nth(0).getAttribute("class")) || ""), /is-active/);
              assert.match(String((await page.locator("[data-paper-permanent-candidate-id]").nth(1).getAttribute("class")) || ""), /is-active/);
              assert.equal(await page.locator("#permanentStatusInput").inputValue(), "draft");
              assert.equal(await page.locator("#confirmAuthorshipInput").isChecked(), false);
              assert.equal(await page.locator("#btnSavePermanentNote").getAttribute("disabled"), null);
              assert.match(String((await page.locator("#btnSavePermanentNote").textContent()) || ""), /确认保存为永久笔记/);
            }, 4000);

            await page.evaluate(
              ({ key, paperId }) => {
                window.localStorage.setItem(
                  key,
                JSON.stringify({
                  paperId,
                  selectedCandidateId: "pwc_2",
                  selectedPermanentCandidateId: "pn_1",
                  updatedAt: new Date().toISOString()
                })
              );
            },
            { key: paperWorkspaceSelectionStorageKey(paperId), paperId }
          );

          await openPaperWorkspace(page, webBase);
          await page.fill("#paperIdInput", paperId);
          await page.click("#btnLoadPaperWorkspace");
          await waitFor(async () => {
            const text = await page.locator(".paper-result-json").textContent();
            assert.match(text || "", /"stage": "load_workspace"/);
            assert.equal(await page.locator("[data-paper-permanent-candidate-id]").count(), 2);
          }, 6000);
	          await waitFor(async () => {
	            const previewText = await page.locator(".paper-permanent-preview").textContent();
	            assert.match(String(previewText || ""), /My takeaway is that retrieval effort improves later access to the idea/);
	            assert.doesNotMatch(String(previewText || ""), /An unsaved draft should survive candidate switches/);
              assert.equal(await page.locator("#translationParaphraseInput").inputValue(), savedParaphrase);
              assert.equal(await page.locator("#translationRelationInput").inputValue(), refreshedKickoffRelation);
              assert.equal(await page.locator("#translationBoundaryInput").inputValue(), savedBoundary);
              assert.match(String((await page.locator("[data-paper-candidate-id]").nth(0).getAttribute("class")) || ""), /is-active/);
              assert.doesNotMatch(String((await page.locator("[data-paper-candidate-id]").nth(1).getAttribute("class")) || ""), /is-active/);
              assert.match(String((await page.locator("[data-paper-permanent-candidate-id]").nth(0).getAttribute("class")) || ""), /is-active/);
              assert.doesNotMatch(String((await page.locator("[data-paper-permanent-candidate-id]").nth(1).getAttribute("class")) || ""), /is-active/);
              assert.equal(await page.locator("#confirmAuthorshipInput").isChecked(), false);
              assert.equal(await page.locator("#btnSavePermanentNote").getAttribute("disabled"), null);
              assert.match(String((await page.locator("#btnSavePermanentNote").textContent()) || ""), /确认保存为永久笔记/);
	          }, 4000);

            await page.evaluate(
              ({ key, paperId, permanentCandidateId }) => {
                const parsed = JSON.parse(window.localStorage.getItem(key) || "{}");
                window.localStorage.setItem(
                  key,
                  JSON.stringify({
                    ...parsed,
                    paperId,
                    translationSignatureByPermanentCandidate: {
                      ...(parsed.translationSignatureByPermanentCandidate || {}),
                      [permanentCandidateId]: JSON.stringify({
                        candidateId: "pwc_1",
                        translationId: "ptr_1",
                        paraphraseText: "Saved wording v1.",
                        relationToQuestion: "Saved relation v1.",
                        boundaryOrCondition: "Saved boundary v1."
                      })
                    },
                    updatedAt: new Date().toISOString()
                  })
                );
              },
              { key: paperWorkspaceSelectionStorageKey(paperId), paperId, permanentCandidateId: firstPermanentCandidateId }
            );

            await openPaperWorkspace(page, webBase);
            await page.fill("#paperIdInput", paperId);
            await page.click("#btnLoadPaperWorkspace");
            await waitFor(async () => {
              const text = await page.locator(".paper-result-json").textContent();
              assert.match(text || "", /"stage": "load_workspace"/);
              const statusText = await currentPaperWorkspaceStatusText(page);
              assert.match(String(statusText || ""), /这条转述已经更新过|重新生成永久笔记候选/);
            }, 6000);
            await waitFor(async () => {
              assert.notEqual(await page.locator("#btnSavePermanentNote").getAttribute("disabled"), null);
              const previewText = await page.locator(".paper-permanent-preview").textContent();
              assert.match(String(previewText || ""), /旧版转述|重新生成永久笔记候选/);
              const translationStepText = await page.locator(".paper-grid .paper-card.paper-span-2").nth(0).textContent();
              assert.match(String(translationStepText || ""), /旧版转述|重新生成永久笔记候选/);
            }, 4000);

            await page.evaluate(
              ({ key, paperId, permanentCandidateId }) => {
                const parsed = JSON.parse(window.localStorage.getItem(key) || "{}");
                const nextSignatures = { ...(parsed.translationSignatureByPermanentCandidate || {}) };
                delete nextSignatures[permanentCandidateId];
                window.localStorage.setItem(
                  key,
                  JSON.stringify({
                    ...parsed,
                    paperId,
                    translationSignatureByPermanentCandidate: nextSignatures,
                    updatedAt: new Date().toISOString()
                  })
                );
              },
              { key: paperWorkspaceSelectionStorageKey(paperId), paperId, permanentCandidateId: firstPermanentCandidateId }
            );

            await openPaperWorkspace(page, webBase);
            await page.fill("#paperIdInput", paperId);
            await page.click("#btnLoadPaperWorkspace");
            await waitFor(async () => {
              const text = await page.locator(".paper-result-json").textContent();
              assert.match(text || "", /"stage": "load_workspace"/);
              assert.equal(await page.locator("#btnSavePermanentNote").getAttribute("disabled"), null);
            }, 6000);

            await page.fill("#translationRelationInput", "Step 4 is now stale because Step 3 changed.");
            await waitFor(async () => {
              assert.notEqual(await page.locator("#btnSavePermanentNote").getAttribute("disabled"), null);
              assert.match(String((await page.locator("#btnSavePermanentNote").textContent()) || ""), /确认保存为永久笔记/);
              const statusText = await currentPaperWorkspaceStatusText(page);
              assert.match(String(statusText || ""), /先重新保存这条转述，再更新或确认永久笔记/);
            }, 4000);

            await openPaperWorkspace(page, webBase);
            await page.fill("#paperIdInput", paperId);
            await page.click("#btnLoadPaperWorkspace");
            await waitFor(async () => {
              const text = await page.locator(".paper-result-json").textContent();
              assert.match(text || "", /"stage": "load_workspace"/);
              const statusText = await currentPaperWorkspaceStatusText(page);
              assert.match(String(statusText || ""), /已恢复这条候选的本地未保存草稿|先重新保存这条转述，再更新或确认永久笔记/);
              assert.match(String((await page.locator(".paper-status").getAttribute("class")) || ""), /paper-status-warn/);
            }, 6000);
            await waitFor(async () => {
              assert.equal(await page.locator("#translationRelationInput").inputValue(), "Step 4 is now stale because Step 3 changed.");
              assert.notEqual(await page.locator("#btnSavePermanentNote").getAttribute("disabled"), null);
              assert.notEqual(await page.locator("#confirmAuthorshipInput").getAttribute("disabled"), null);
              assert.notEqual(await page.locator("#permanentStatusInput").getAttribute("disabled"), null);
              assert.match(String((await page.locator("[data-paper-candidate-id]").nth(0).getAttribute("class")) || ""), /is-active/);
              assert.match(String((await page.locator("[data-paper-permanent-candidate-id]").nth(0).getAttribute("class")) || ""), /is-active/);
            }, 4000);
            await page.fill("#translationRelationInput", refreshedKickoffRelation);
            await waitFor(async () => {
              assert.equal(await page.locator("#btnSavePermanentNote").getAttribute("disabled"), null);
              assert.match(String((await page.locator("#btnSavePermanentNote").textContent()) || ""), /确认保存为永久笔记/);
            }, 4000);

            await waitFor(async () => {
              assert.equal(await page.locator("#confirmAuthorshipInput").getAttribute("disabled"), null);
              assert.equal(await page.locator("#permanentStatusInput").getAttribute("disabled"), null);
            }, 4000);

            await page.locator("#confirmAuthorshipInput").check();
            await page.click("#btnSavePermanentNote");
            let savedPermanentNoteId = "";
            await waitFor(async () => {
              const text = await page.locator(".paper-result-json").textContent();
              assert.match(text || "", /"stage": "save_permanent_note"/);
              const parsed = JSON.parse(text || "{}");
              savedPermanentNoteId = String(parsed?.permanentNote?.id || parsed?.permanentCandidate?.savedPermanentNoteId || "").trim();
              assert.ok(savedPermanentNoteId);
              const statusText = await currentPaperWorkspaceStatusText(page);
              assert.match(String(statusText || ""), /永久笔记已保存/);
            }, 6000);
            await waitFor(async () => {
              const previewText = await page.locator(".paper-permanent-preview").textContent();
              assert.match(String(previewText || ""), /My takeaway is that retrieval effort improves later access to the idea/);
              assert.doesNotMatch(String(previewText || ""), /An unsaved draft should survive candidate switches/);
              assert.doesNotMatch(String(previewText || ""), /An unsaved draft should survive candidate switches/);
              assert.match(String(previewText || ""), new RegExp(`已保存为：${savedPermanentNoteId}`));
              assert.equal(await page.locator("#confirmAuthorshipInput").isChecked(), true);
              assert.match(String((await page.locator("[data-paper-permanent-candidate-id]").nth(0).getAttribute("class")) || ""), /is-active/);
              assert.doesNotMatch(String((await page.locator("[data-paper-permanent-candidate-id]").nth(1).getAttribute("class")) || ""), /is-active/);
              assert.equal(await page.locator("[data-paper-permanent-candidate-id]").count(), 2);
              assert.notEqual(await page.locator("#btnSavePermanentNote").getAttribute("disabled"), null);
              assert.match(String((await page.locator("#btnSavePermanentNote").textContent()) || ""), /已保存为永久笔记/);
            }, 4000);

            await openPaperWorkspace(page, webBase);
            await page.fill("#paperIdInput", paperId);
            await page.click("#btnLoadPaperWorkspace");
            await waitFor(async () => {
              const text = await page.locator(".paper-result-json").textContent();
              assert.match(text || "", /"stage": "load_workspace"/);
              assert.equal(await page.locator("[data-paper-permanent-candidate-id]").count(), 2);
            }, 6000);
            await waitFor(async () => {
              const previewText = await page.locator(".paper-permanent-preview").textContent();
              assert.match(String(previewText || ""), /My takeaway is that retrieval effort improves later access to the idea/);
              assert.doesNotMatch(String(previewText || ""), /An unsaved draft should survive candidate switches/);
              assert.match(String(previewText || ""), new RegExp(`已保存为：${savedPermanentNoteId}`));
              const savedPathStatusText = await currentPaperWorkspaceStatusText(page);
              assert.match(String(savedPathStatusText || ""), /已对齐到这条候选已保存的永久笔记路径/);
              assert.match(String((await page.locator("[data-paper-permanent-candidate-id]").nth(0).getAttribute("class")) || ""), /is-active/);
              assert.doesNotMatch(String((await page.locator("[data-paper-permanent-candidate-id]").nth(1).getAttribute("class")) || ""), /is-active/);
              assert.equal(await page.locator("#permanentStatusInput").inputValue(), "draft");
              assert.equal(await page.locator("#confirmAuthorshipInput").isChecked(), true);
              assert.notEqual(await page.locator("#confirmAuthorshipInput").getAttribute("disabled"), null);
              assert.notEqual(await page.locator("#permanentStatusInput").getAttribute("disabled"), null);
              assert.notEqual(await page.locator("#btnSavePermanentNote").getAttribute("disabled"), null);
              assert.match(String((await page.locator("#btnSavePermanentNote").textContent()) || ""), /已保存为永久笔记/);
            }, 4000);

            await waitFor(async () => {
              assert.notEqual(await page.locator("#confirmAuthorshipInput").getAttribute("disabled"), null);
              assert.notEqual(await page.locator("#permanentStatusInput").getAttribute("disabled"), null);
            }, 4000);

            await page.locator("[data-paper-permanent-candidate-id]").nth(1).click();
            await waitFor(async () => {
              const previewText = await page.locator(".paper-permanent-preview").textContent();
              assert.match(String(previewText || ""), /An unsaved draft should survive candidate switches/);
              const statusText = await currentPaperWorkspaceStatusText(page);
              assert.match(String(statusText || ""), /已对齐到这条候选的永久笔记候选/);
            }, 4000);

            await page.locator("[data-paper-permanent-candidate-id]").nth(0).click();
            await waitFor(async () => {
              const previewText = await page.locator(".paper-permanent-preview").textContent();
              assert.match(String(previewText || ""), new RegExp(`已保存为：${savedPermanentNoteId}`));
              const statusText = await currentPaperWorkspaceStatusText(page);
              assert.match(String(statusText || ""), /已对齐到这条候选已保存的永久笔记路径/);
              const draftBriefText = await page.locator("[data-paper-draft-brief]").textContent();
              assert.match(String(draftBriefText || ""), /Step 4: 已保存永久笔记路径/);
              assert.match(String((await page.locator("[data-paper-draft-brief-step-four]").textContent()) || ""), /Step 4: 已保存永久笔记路径/);
              assert.match(String((await page.locator("[data-paper-draft-brief-saved-note]").textContent()) || ""), new RegExp(`Saved note: ${savedPermanentNoteId}`));
              assert.match(
                String((await page.locator("[data-paper-draft-brief-next-action]").textContent()) || ""),
                /Next action: .*originality \/ authorship/
              );
              assert.equal(await page.locator("#btnCopyDraftBrief").getAttribute("disabled"), null);
              assert.match(String((await page.locator("#btnCopyDraftBrief").textContent()) || ""), /复制 brief，回看已保存路径/);
              assert.match(
                String((await page.locator("[data-paper-draft-continuity]").textContent()) || ""),
                /继续写 draft 前，先回看 originality \/ authorship/
              );
            }, 4000);

            await page.click("#btnCopyDraftBrief");
            await waitFor(async () => {
              const statusText = await currentPaperWorkspaceStatusText(page);
              assert.match(String(statusText || ""), /已复制 draft brief/);
              assert.match(String(statusText || ""), /下一步：.*originality \/ authorship/);
              const copiedText = await page.evaluate(
                () => window.__paperWorkspaceLastDraftBrief || (Array.isArray(window.__copiedTexts) ? window.__copiedTexts.at(-1) : "")
              );
              assert.match(String(copiedText || ""), /Step 4: 已保存永久笔记路径 \(.+\)/);
              assert.match(String(copiedText || ""), /Saved permanent note: /);
              assert.match(String(copiedText || ""), /Next action: .*originality \/ authorship/);
            }, 4000);

            await page.locator(".paper-candidate").nth(1).click();
            await waitFor(async () => {
              const previewText = await page.locator(".paper-permanent-preview").textContent();
              assert.match(String(previewText || ""), /An unsaved draft should survive candidate switches/);
              const statusText = await currentPaperWorkspaceStatusText(page);
              assert.match(String(statusText || ""), /已对齐到这条候选的永久笔记候选/);
            }, 4000);

            await page.locator(".paper-candidate").nth(0).click();
            await waitFor(async () => {
              const previewText = await page.locator(".paper-permanent-preview").textContent();
              assert.match(String(previewText || ""), new RegExp(`已保存为：${savedPermanentNoteId}`));
              const statusText = await currentPaperWorkspaceStatusText(page);
              assert.match(String(statusText || ""), /已对齐到这条候选已保存的永久笔记路径/);
              const draftBriefText = await page.locator("[data-paper-draft-brief]").textContent();
              assert.match(String(draftBriefText || ""), /Step 4: 已保存永久笔记路径/);
            }, 4000);

            await page.fill("#translationRelationInput", "Saved relation after the permanent note was already confirmed.");
            await page.click("#btnSaveTranslation");
            await waitFor(async () => {
              const text = await page.locator(".paper-result-json").textContent();
              assert.match(text || "", /"stage": "save_translation"/);
              const statusText = await currentPaperWorkspaceStatusText(page);
              assert.match(String(statusText || ""), /这条转述已经更新过|重新生成永久笔记候选/);
            }, 6000);
            await waitFor(async () => {
              const translationStepText = await page.locator(".paper-grid .paper-card.paper-span-2").nth(0).textContent();
              assert.match(String(translationStepText || ""), /Step 4 .*旧版转述|下一步先重新生成永久笔记候选/);
              const previewText = await page.locator(".paper-permanent-preview").textContent();
              assert.match(String(previewText || ""), /旧版转述|重新生成永久笔记候选/);
              assert.equal(await page.locator("#btnCreatePermanentCandidate").getAttribute("disabled"), null);
              assert.match(String((await page.locator("#btnCreatePermanentCandidate").textContent()) || ""), /重新生成永久笔记候选/);
              assert.notEqual(await page.locator("#btnSavePermanentNote").getAttribute("disabled"), null);
              assert.notEqual(await page.locator("#confirmAuthorshipInput").getAttribute("disabled"), null);
              assert.notEqual(await page.locator("#permanentStatusInput").getAttribute("disabled"), null);
              assert.match(String((await page.locator("#btnSavePermanentNote").textContent()) || ""), /先重新生成永久笔记候选/);
            }, 4000);

            await waitFor(async () => {
              assert.notEqual(await page.locator("#btnStartDraftKickoff").getAttribute("disabled"), null);
              assert.match(String((await page.locator("#btnStartDraftKickoff").textContent()) || ""), /先刷新 Step 4/);
              assert.match(
                String((await page.locator("#draftKickoffTextarea").inputValue()) || ""),
                /Local draft kickoff wording that should survive refresh\./
              );
              assert.match(
                String((await page.locator("#draftKickoffPreviousTextarea").inputValue()) || ""),
                new RegExp(`Kickoff written before refreshing stale Step 4\\.|${refreshedKickoffRelation.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`)
              );
            }, 4000);

            await page.locator(".paper-candidate").nth(1).click();
            await waitFor(async () => {
              const previewText = await page.locator(".paper-permanent-preview").textContent();
              assert.match(String(previewText || ""), /An unsaved draft should survive candidate switches/);
              const statusText = await currentPaperWorkspaceStatusText(page);
              assert.match(String(statusText || ""), /已对齐到这条候选的永久笔记候选/);
            }, 4000);

            await page.locator(".paper-candidate").nth(0).click();
            await waitFor(async () => {
              const translationStepText = await page.locator(".paper-grid .paper-card.paper-span-2").nth(0).textContent();
              assert.match(String(translationStepText || ""), /Step 4 .*旧版转述|下一步先重新生成永久笔记候选/);
              const statusText = await currentPaperWorkspaceStatusText(page);
              assert.match(String(statusText || ""), /这条转述已经更新过|重新生成永久笔记候选/);
              const previewText = await page.locator(".paper-permanent-preview").textContent();
              assert.match(String(previewText || ""), /旧版转述|重新生成永久笔记候选/);
              assert.match(
                String((await page.locator("[data-paper-draft-continuity]").textContent()) || ""),
                /先重新生成永久笔记候选，再继续写 draft/
              );
              const draftBriefText = await page.locator("[data-paper-draft-brief]").textContent();
              assert.match(String(draftBriefText || ""), /Step 4: 已生成永久笔记候选/);
              assert.notEqual(await page.locator("#btnCopyDraftBrief").getAttribute("disabled"), null);
              assert.match(String((await page.locator("#btnCopyDraftBrief").textContent()) || ""), /先刷新 Step 4/);
              assert.match(String((await page.locator("#btnStartDraftKickoff").textContent()) || ""), /先刷新 Step 4/);
              assert.match(
                String((await page.locator("#draftKickoffTextarea").inputValue()) || ""),
                /Local draft kickoff wording that should survive refresh\./
              );
              assert.match(
                String((await page.locator("#draftKickoffPreviousTextarea").inputValue()) || ""),
                new RegExp(`Kickoff written before refreshing stale Step 4\\.|${refreshedKickoffRelation.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`)
              );
              assert.equal(await page.locator("#btnCreatePermanentCandidate").getAttribute("disabled"), null);
              assert.match(String((await page.locator("#btnCreatePermanentCandidate").textContent()) || ""), /重新生成永久笔记候选/);
              assert.notEqual(await page.locator("#btnSavePermanentNote").getAttribute("disabled"), null);
              assert.match(String((await page.locator("#btnSavePermanentNote").textContent()) || ""), /先重新生成永久笔记候选/);
              assert.equal(await page.locator("[data-paper-draft-brief-copy]").count(), 0);
            }, 4000);

            await page.click("#btnCreatePermanentCandidate");
            await waitFor(async () => {
              const text = await page.locator(".paper-result-json").textContent();
              assert.match(text || "", /"stage": "(create_permanent_candidate|permanent_candidate)"/);
              const statusText = await currentPaperWorkspaceStatusText(page);
              assert.match(String(statusText || ""), /永久笔记候选已生成/);
              assert.equal(await page.locator("#btnSavePermanentNote").getAttribute("disabled"), null);
              assert.equal(await page.locator("#confirmAuthorshipInput").getAttribute("disabled"), null);
              assert.equal(await page.locator("#permanentStatusInput").getAttribute("disabled"), null);
            }, 6000);

            await page.locator("#confirmAuthorshipInput").check();
            let refreshedSavedPermanentNoteId = "";
            await page.click("#btnSavePermanentNote");
            await waitFor(async () => {
              const text = await page.locator(".paper-result-json").textContent();
              assert.match(text || "", /"stage": "save_permanent_note"/);
              const parsed = JSON.parse(text || "{}");
              refreshedSavedPermanentNoteId = String(
                parsed?.permanentNote?.id || parsed?.permanentCandidate?.savedPermanentNoteId || ""
              ).trim();
              assert.ok(refreshedSavedPermanentNoteId);
              const statusText = await currentPaperWorkspaceStatusText(page);
              assert.match(String(statusText || ""), /永久笔记已保存/);
            }, 6000);

            await waitFor(async () => {
              assert.match(
                String((await page.locator("[data-paper-draft-brief-step-four]").textContent()) || ""),
                /Step 4: 已保存永久笔记路径/
              );
              assert.match(
                String((await page.locator("[data-paper-draft-brief-saved-note]").textContent()) || ""),
                new RegExp(`Saved note: ${refreshedSavedPermanentNoteId}`)
              );
              assert.equal(await page.locator("#btnAdoptPreviousKickoff").getAttribute("disabled"), null);
              assert.match(String((await page.locator("#btnStartDraftKickoff").textContent()) || ""), /载入新版 brief，更新本地 draft/);
              assert.match(
                String((await page.locator("#draftKickoffTextarea").inputValue()) || ""),
                /Local draft kickoff wording that should survive refresh\./
              );
              assert.match(
                String((await page.locator("#draftKickoffPreviousTextarea").inputValue()) || ""),
                new RegExp(refreshedKickoffRelation.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
              );
            }, 4000);

            await page.locator(".paper-candidate").nth(1).click();
            await waitFor(async () => {
              const statusText = await currentPaperWorkspaceStatusText(page);
              assert.match(String(statusText || ""), /已对齐到这条候选的永久笔记候选/);
            }, 4000);

            await page.locator(".paper-candidate").nth(0).click();
            await waitFor(async () => {
              const statusText = await currentPaperWorkspaceStatusText(page);
              assert.match(String(statusText || ""), /已对齐到这条候选已保存的永久笔记路径/);
              assert.match(
                String((await page.locator("[data-paper-draft-brief-step-four]").textContent()) || ""),
                /Step 4: 已保存永久笔记路径/
              );
              assert.match(
                String((await page.locator("[data-paper-draft-brief-saved-note]").textContent()) || ""),
                new RegExp(`Saved note: ${refreshedSavedPermanentNoteId}`)
              );
            }, 4000);

            await page.click("#btnAdoptPreviousKickoff");
            await waitFor(async () => {
              const statusText = await currentPaperWorkspaceStatusText(page);
              assert.match(String(statusText || ""), /已采用上一版 kickoff 写法/);
              assert.match(String(statusText || ""), /当前本地 draft 仍指向最新转述链路/);
              assert.match(
                String((await page.locator("[data-paper-draft-brief-step-four]").textContent()) || ""),
                /Step 4: 已保存永久笔记路径/
              );
              assert.match(
                String((await page.locator("[data-paper-draft-brief-saved-note]").textContent()) || ""),
                new RegExp(`Saved note: ${refreshedSavedPermanentNoteId}`)
              );
              assert.match(
                String((await page.locator("#draftKickoffTextarea").inputValue()) || ""),
                new RegExp(refreshedKickoffRelation.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
              );
              assert.match(
                String((await page.locator("#draftKickoffPreviousTextarea").inputValue()) || ""),
                /Local draft kickoff wording that should survive refresh\./
              );
            }, 4000);

            await openPaperWorkspace(page, webBase);
            await page.fill("#paperIdInput", paperId);
            await page.click("#btnLoadPaperWorkspace");
            await waitFor(async () => {
              const text = await page.locator(".paper-result-json").textContent();
              assert.match(text || "", /"stage": "load_workspace"/);
              const statusText = await currentPaperWorkspaceStatusText(page);
              assert.match(String(statusText || ""), /已对齐到这条候选已保存的永久笔记路径/);
              assert.match(
                String((await page.locator("[data-paper-draft-brief-step-four]").textContent()) || ""),
                /Step 4: 已保存永久笔记路径/
              );
              assert.match(
                String((await page.locator("[data-paper-draft-brief-saved-note]").textContent()) || ""),
                new RegExp(`Saved note: ${refreshedSavedPermanentNoteId}`)
              );
              assert.match(
                String((await page.locator("#draftKickoffTextarea").inputValue()) || ""),
                new RegExp(refreshedKickoffRelation.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
              );
              assert.match(
                String((await page.locator("#draftKickoffPreviousTextarea").inputValue()) || ""),
                /Local draft kickoff wording that should survive refresh\./
              );
              assert.match(String((await page.locator("#btnStartDraftKickoff").textContent()) || ""), /继续本地 draft/);
              assert.equal(await page.locator("#btnAdoptPreviousKickoff").getAttribute("disabled"), null);
            }, 6000);

            const secondRefreshedKickoffRelation = "Saved path relation after a second kickoff refresh cycle.";
            await page.fill("#translationRelationInput", secondRefreshedKickoffRelation);
            await page.click("#btnSaveTranslation");
            await waitFor(async () => {
              const text = await page.locator(".paper-result-json").textContent();
              assert.match(text || "", /"stage": "save_translation"/);
              const statusText = await currentPaperWorkspaceStatusText(page);
              assert.match(String(statusText || ""), /这条转述已经更新过|重新生成永久笔记候选/);
              assert.match(String((await page.locator("#btnStartDraftKickoff").textContent()) || ""), /先刷新 Step 4/);
              assert.match(
                String((await page.locator("[data-paper-draft-kickoff-note]").textContent()) || ""),
                /仍基于旧版转述/
              );
              assert.equal(await page.locator("#btnCreatePermanentCandidate").getAttribute("disabled"), null);
              assert.match(String((await page.locator("#btnCreatePermanentCandidate").textContent()) || ""), /重新生成永久笔记候选/);
            }, 6000);

            await page.click("#btnCreatePermanentCandidate");
            await waitFor(async () => {
              const text = await page.locator(".paper-result-json").textContent();
              assert.match(text || "", /"stage": "(create_permanent_candidate|permanent_candidate)"/);
              assert.equal(await page.locator("#confirmAuthorshipInput").getAttribute("disabled"), null);
              assert.equal(await page.locator("#btnSavePermanentNote").getAttribute("disabled"), null);
            }, 6000);

            await page.locator("#confirmAuthorshipInput").check();
            let secondSavedPermanentNoteId = "";
            await page.click("#btnSavePermanentNote");
            await waitFor(async () => {
              const text = await page.locator(".paper-result-json").textContent();
              assert.match(text || "", /"stage": "save_permanent_note"/);
              const parsed = JSON.parse(text || "{}");
              secondSavedPermanentNoteId = String(
                parsed?.permanentNote?.id || parsed?.permanentCandidate?.savedPermanentNoteId || ""
              ).trim();
              assert.ok(secondSavedPermanentNoteId);
              const statusText = await currentPaperWorkspaceStatusText(page);
              assert.match(String(statusText || ""), /永久笔记已保存/);
              assert.match(String((await page.locator("#btnStartDraftKickoff").textContent()) || ""), /载入新版 brief，更新本地 draft/);
              assert.ok((await page.locator("[data-paper-permanent-saved-note-id]").count()) >= 3);
              assert.equal(
                await page.locator(`[data-paper-permanent-saved-note-id="${savedPermanentNoteId}"]`).count(),
                1
              );
              assert.equal(
                await page.locator(`[data-paper-permanent-saved-note-id="${secondSavedPermanentNoteId}"]`).count(),
                1
              );
            }, 6000);

            await page.click("#btnStartDraftKickoff");
            await waitFor(async () => {
              const statusText = await currentPaperWorkspaceStatusText(page);
              assert.match(String(statusText || ""), /已载入本地 draft kickoff/);
              assert.match(
                String((await page.locator("#draftKickoffTextarea").inputValue()) || ""),
                new RegExp(secondRefreshedKickoffRelation.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
              );
              assert.match(
                String((await page.locator("#draftKickoffPreviousTextarea").inputValue()) || ""),
                new RegExp(refreshedKickoffRelation.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
              );
              assert.equal(await page.locator("#btnAdoptPreviousKickoff").getAttribute("disabled"), null);
            }, 4000);

            await openPaperWorkspace(page, webBase);
            await page.fill("#paperIdInput", paperId);
            await page.click("#btnLoadPaperWorkspace");
            await waitFor(async () => {
              const text = await page.locator(".paper-result-json").textContent();
              assert.match(text || "", /"stage": "load_workspace"/);
              const statusText = await currentPaperWorkspaceStatusText(page);
              assert.match(String(statusText || ""), /已对齐到这条候选已保存的永久笔记路径/);
              assert.ok((await page.locator("[data-paper-permanent-saved-note-id]").count()) >= 3);
              assert.equal(
                await page.locator(`[data-paper-permanent-saved-note-id="${savedPermanentNoteId}"]`).count(),
                1
              );
              assert.equal(
                await page.locator(`[data-paper-permanent-saved-note-id="${secondSavedPermanentNoteId}"]`).count(),
                1
              );
              assert.match(
                String((await page.locator("[data-paper-draft-brief-step-four]").textContent()) || ""),
                /Step 4: 已保存永久笔记路径/
              );
              assert.match(
                String((await page.locator("#draftKickoffTextarea").inputValue()) || ""),
                new RegExp(secondRefreshedKickoffRelation.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
              );
              assert.match(
                String((await page.locator("#draftKickoffPreviousTextarea").inputValue()) || ""),
                new RegExp(refreshedKickoffRelation.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
              );
              assert.match(String((await page.locator("#btnStartDraftKickoff").textContent()) || ""), /继续本地 draft/);
              assert.equal(await page.locator("#btnAdoptPreviousKickoff").getAttribute("disabled"), null);
            }, 6000);

            await page.locator(".paper-candidate").nth(1).click();
            await waitFor(async () => {
              const statusText = await currentPaperWorkspaceStatusText(page);
              assert.match(String(statusText || ""), /已对齐到这条候选的永久笔记候选/);
              assert.equal(await page.locator("#draftKickoffTextarea").count(), 0);
            }, 4000);

            await page.locator(".paper-candidate").nth(0).click();
            await waitFor(async () => {
              const statusText = await currentPaperWorkspaceStatusText(page);
              assert.match(String(statusText || ""), /已对齐到这条候选已保存的永久笔记路径/);
              assert.match(
                String((await page.locator("[data-paper-draft-brief-step-four]").textContent()) || ""),
                /Step 4: 已保存永久笔记路径/
              );
              assert.match(
                String((await page.locator("#draftKickoffTextarea").inputValue()) || ""),
                new RegExp(secondRefreshedKickoffRelation.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
              );
              assert.match(
                String((await page.locator("#draftKickoffPreviousTextarea").inputValue()) || ""),
                new RegExp(refreshedKickoffRelation.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
              );
              assert.match(String((await page.locator("#btnStartDraftKickoff").textContent()) || ""), /继续本地 draft/);
              assert.equal(await page.locator("#btnAdoptPreviousKickoff").getAttribute("disabled"), null);
            }, 4000);

            await page.locator("[data-paper-permanent-candidate-id]").nth(1).click();
            await waitFor(async () => {
              const statusText = await currentPaperWorkspaceStatusText(page);
              assert.match(String(statusText || ""), /已对齐到这条候选的永久笔记候选/);
              assert.equal(await page.locator("#draftKickoffTextarea").count(), 0);
            }, 4000);

            await page
              .locator("[data-paper-permanent-candidate-id]", {
                hasText: secondSavedPermanentNoteId
              })
              .click();
            await waitFor(async () => {
              const statusText = await currentPaperWorkspaceStatusText(page);
              assert.match(String(statusText || ""), /已对齐到这条候选已保存的永久笔记路径/);
              assert.match(
                String((await page.locator("[data-paper-draft-brief-step-four]").textContent()) || ""),
                /Step 4: 已保存永久笔记路径/
              );
              assert.match(
                String((await page.locator("#draftKickoffTextarea").inputValue()) || ""),
                new RegExp(secondRefreshedKickoffRelation.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
              );
              assert.match(
                String((await page.locator("#draftKickoffPreviousTextarea").inputValue()) || ""),
                new RegExp(refreshedKickoffRelation.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
              );
              assert.match(String((await page.locator("#btnStartDraftKickoff").textContent()) || ""), /继续本地 draft/);
              assert.equal(await page.locator("#btnAdoptPreviousKickoff").getAttribute("disabled"), null);
            }, 4000);

            await page
              .locator("[data-paper-permanent-candidate-id]", {
                hasText: refreshedSavedPermanentNoteId
              })
              .click();
            await waitFor(async () => {
              const statusText = await currentPaperWorkspaceStatusText(page);
              assert.match(String(statusText || ""), /这条转述已经更新过|重新生成永久笔记候选/);
              assert.match(
                String((await page.locator("[data-paper-draft-continuity]").textContent()) || ""),
                /先重新生成永久笔记候选，再继续写 draft/
              );
              assert.match(
                String((await page.locator("#draftKickoffTextarea").inputValue()) || ""),
                new RegExp(secondRefreshedKickoffRelation.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
              );
              assert.match(
                String((await page.locator("#draftKickoffPreviousTextarea").inputValue()) || ""),
                new RegExp(refreshedKickoffRelation.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
              );
              assert.match(String((await page.locator("#btnStartDraftKickoff").textContent()) || ""), /先刷新 Step 4/);
              assert.equal(await page.locator("#btnAdoptPreviousKickoff").getAttribute("disabled"), null);
            }, 4000);

            await openPaperWorkspace(page, webBase);
            await page.fill("#paperIdInput", paperId);
            await page.click("#btnLoadPaperWorkspace");
            await waitFor(async () => {
              const text = await page.locator(".paper-result-json").textContent();
              assert.match(text || "", /"stage": "load_workspace"/);
              const statusText = await currentPaperWorkspaceStatusText(page);
              assert.match(String(statusText || ""), /这条转述已经更新过|重新生成永久笔记候选/);
              assert.ok((await page.locator("[data-paper-permanent-saved-note-id]").count()) >= 3);
              assert.match(
                String((await page.locator("[data-paper-draft-continuity]").textContent()) || ""),
                /先重新生成永久笔记候选，再继续写 draft/
              );
              assert.match(
                String((await page.locator("#draftKickoffTextarea").inputValue()) || ""),
                new RegExp(secondRefreshedKickoffRelation.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
              );
              assert.match(
                String((await page.locator("#draftKickoffPreviousTextarea").inputValue()) || ""),
                new RegExp(refreshedKickoffRelation.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
              );
              assert.match(String((await page.locator("#btnStartDraftKickoff").textContent()) || ""), /先刷新 Step 4/);
              assert.equal(await page.locator("#btnAdoptPreviousKickoff").getAttribute("disabled"), null);
            }, 6000);

            await page.locator(".paper-candidate").nth(1).click();
            await waitFor(async () => {
              const statusText = await currentPaperWorkspaceStatusText(page);
              assert.match(String(statusText || ""), /已对齐到这条候选的永久笔记候选/);
              assert.equal(await page.locator("#draftKickoffTextarea").count(), 0);
            }, 4000);

            await page.locator(".paper-candidate").nth(0).click();
            await waitFor(async () => {
              const statusText = await currentPaperWorkspaceStatusText(page);
              assert.match(String(statusText || ""), /已对齐到这条候选已保存的永久笔记路径/);
              assert.match(
                String((await page.locator("[data-paper-draft-brief-saved-note]").textContent()) || ""),
                new RegExp(`Saved note: ${secondSavedPermanentNoteId}`)
              );
              assert.match(
                String((await page.locator("#draftKickoffTextarea").inputValue()) || ""),
                new RegExp(secondRefreshedKickoffRelation.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
              );
              assert.match(
                String((await page.locator("#draftKickoffPreviousTextarea").inputValue()) || ""),
                new RegExp(refreshedKickoffRelation.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
              );
              assert.match(String((await page.locator("#btnStartDraftKickoff").textContent()) || ""), /继续本地 draft/);
              assert.equal(await page.locator("#btnAdoptPreviousKickoff").getAttribute("disabled"), null);
            }, 4000);

            await page
              .locator("[data-paper-permanent-candidate-id]", {
                hasText: secondSavedPermanentNoteId
              })
              .click();
            await waitFor(async () => {
              const statusText = await currentPaperWorkspaceStatusText(page);
              assert.match(String(statusText || ""), /已对齐到这条候选已保存的永久笔记路径/);
              assert.match(String((await page.locator("#btnStartDraftKickoff").textContent()) || ""), /继续本地 draft/);
              assert.match(
                String((await page.locator("#draftKickoffTextarea").inputValue()) || ""),
                new RegExp(secondRefreshedKickoffRelation.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
              );
            }, 4000);
	        });
  
  test("prototype writing entry switch clears stale strong-model analysis summary", async (t) => {
  if (process.env.RUN_BROWSER_E2E !== "1") {
    t.skip("Set RUN_BROWSER_E2E=1 to enable browser e2e in local runs.");
    return;
  }

  const playwright = await optionalPlaywright(t);
  if (!playwright) return;

  const stack = await startPrototypeStack(t, playwright, {
    beforeGoto: async (page) => {
      await page.addInitScript(() => {
        window.confirm = () => true;
      });
      await page.route("**/api/v1/writing/ai-analysis", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            item: {
              request: {
                requestType: "writing_strong_model_analysis",
                model: { model: "mock-strong-model" }
              },
              result: {
                summary: { artifactCount: 2 },
                artifacts: [
                  { type: "WritingMove", status: "pending_review" },
                  { type: "EvidenceGap", status: "pending_review" }
                ]
              }
            }
          })
        });
      });
    }
  });
  if (!stack) return;
  const { apiBase, page, vaultPath, webBase } = stack;

  const writingDirectory = await postJson(apiBase, "/api/v1/directories", {
    title: "Writing Entry Reset Scope",
    parentDirectoryId: "dir_original_default",
    directoryType: "custom",
    fsPath: path.join(vaultPath, "notes", "original", "writing-entry-reset-scope"),
    maxNotes: 500
  });
  assert.equal(writingDirectory.status, 201, JSON.stringify(writingDirectory.json));
  const writingDirectoryId = writingDirectory.json.item.id;

  const noteA = await postJson(apiBase, "/api/v1/notes", {
    directoryId: writingDirectoryId,
    status: "active",
    body: "# Entry reset claim\n\nA fresh writing entry should invalidate previous analysis."
  });
  assert.equal(noteA.status, 201, JSON.stringify(noteA.json));

  const noteB = await postJson(apiBase, "/api/v1/notes", {
    directoryId: writingDirectoryId,
    status: "active",
    body: "# Entry reset evidence\n\nSwitching inputs should clear old strong-model summaries."
  });
  assert.equal(noteB.status, 201, JSON.stringify(noteB.json));

  await page.goto(`${webBase}/prototype`, { waitUntil: "networkidle" });
  await page.locator('[data-action="quick-original"]').click();
  await page.locator(`.explorer-item[data-kind="folder"][data-id="${writingDirectoryId}"]`).click();
  await page.locator('.explorer-item[data-kind="file"]', { hasText: "Entry reset claim" }).click();
  await page.locator('.rail-btn[data-module="writing"]').click();

  await page.click("#btnWritingUseCurrent");
  await page.waitForFunction(() => {
    const text = document.querySelector("#writingBasketSummary")?.textContent || "";
    return text.includes("写锟斤拷锟斤拷锟斤拷锟斤拷锟斤拷 1 锟斤拷锟斤拷锟矫笔硷拷");
  });

  await page.click("#btnWritingStrongModelAnalysis");
  await page.waitForFunction(() => {
    const text = document.querySelector("#writingStrongModelSummary")?.textContent || "";
    return text.includes("锟窖癸拷一锟斤拷 2 锟斤拷写锟斤拷锟斤拷锟斤拷锟斤拷");
  });

  await page.click("#btnWritingAddVisible");
  await page.waitForFunction(() => {
    const basketText = document.querySelector("#writingBasketSummary")?.textContent || "";
    const summaryText = document.querySelector("#writingStrongModelSummary")?.textContent || "";
    return basketText.includes("写锟斤拷锟斤拷锟斤拷锟斤拷锟斤拷 2 锟斤拷锟斤拷锟矫笔硷拷") && summaryText.includes("锟斤拷未准锟斤拷强模锟酵凤拷锟斤拷");
  });

  const strongModelSummary = await page.locator("#writingStrongModelSummary").textContent();
  assert.match(strongModelSummary || "", /锟斤拷未准锟斤拷强模锟酵凤拷锟斤拷/);
});

test("prototype writing center can save a theme index, edit central question, and create a project from theme", async (t) => {
  if (process.env.RUN_BROWSER_E2E !== "1") {
    t.skip("Set RUN_BROWSER_E2E=1 to enable browser e2e in local runs.");
    return;
  }

  const playwright = await optionalPlaywright(t);
  if (!playwright) return;

  const stack = await startPrototypeStack(t, playwright);
  if (!stack) return;
  const { apiBase, page, vaultPath, webBase } = stack;

  const noteA = await createWritingReadyPermanentNote(apiBase, {
    body: "# Theme Browser Claim\n\nA theme should carry a central question, not just grouped notes.",
    thesis: "A theme should carry a central question, not just grouped notes.",
    threeLineSummary: [
      "A theme should carry a central question.",
      "That makes grouped notes serve one reusable problem.",
      "It helps writing start from a theme instead of a blank page."
    ],
    boundaryOrCounterpoint: "A loose cluster can exist temporarily, but it should not stay forever without a question."
  });

  const noteB = await createWritingReadyPermanentNote(apiBase, {
    body: "# Theme Browser Tension\n\nA second note adds the tension the theme still needs.",
    thesis: "A mature theme needs tension, not only support.",
    threeLineSummary: [
      "A mature theme needs tension, not only support.",
      "That keeps the theme from turning into a storage bucket.",
      "It gives the later writing project a sharper structure."
    ],
    boundaryOrCounterpoint: "Some themes start narrow, but they still need an explicit question and growing tension."
  });

  const relation = await postJson(apiBase, `/api/v1/notes/${encodeURIComponent(noteA.json.item.id)}/relations`, {
    toNoteId: noteB.json.item.id,
    relationType: "supports",
    rationale: "The first theme note gives the second one a structural support edge before project creation.",
    insightQuestion: "What central question now organizes these two notes as one theme?",
    confidence: 1
  });
  assert.equal(relation.status, 201, JSON.stringify(relation.json));

  await page.goto(`${webBase}/prototype`, { waitUntil: "networkidle" });
  await page.locator('.rail-btn[data-module="writing"]').click();
  await page.locator("#writingBasketNoteIds").waitFor({ state: "visible" });
  const targetBasketIds = [noteA.json.item.id, noteB.json.item.id];
  await page.fill("#writingBasketNoteIds", targetBasketIds.join("\n"));

  await page.evaluate(() => {
    const answers = ["Browser Theme Index", "A theme saved from the browser flow."];
    window.prompt = () => answers.shift() ?? "";
  });
  await page.click("#btnWritingSaveThemeIndex");

  let themeCard = null;
  await waitFor(async () => {
    const indexCards = await fetchJson(apiBase, "/api/v1/index-cards?directoryId=dir_original_default&indexType=topic&includeDescendants=true&limit=20");
    assert.equal(indexCards.status, 200, JSON.stringify(indexCards.json));
    themeCard = indexCards.json.items.find((item) => item.title === "Browser Theme Index");
    assert.ok(themeCard);
  }, 10000);
  await page.goto(`${webBase}/prototype`, { waitUntil: "networkidle" });
  await page.locator('[data-action="quick-original"]').click();
  await page.locator('.rail-btn[data-module="writing"]').click();
  await page.locator('#writingThemeIndexList .writing-note-card', { hasText: "Browser Theme Index" }).click();
  await page.waitForFunction(() => {
    const value = document.querySelector("#writingThemeDetailTitle")?.value || "";
    return value.includes("Browser Theme Index");
  }, null, { timeout: 10000 });
  await page.waitForFunction(() => {
    const summary = document.querySelector('[data-writing-theme-project-summary]')?.textContent || "";
    const button = document.querySelector('[data-writing-theme-action="create-project"]');
    return summary.includes("锟缴达拷锟斤拷") && button?.textContent?.includes("锟斤拷锟斤拷写锟斤拷锟斤拷目") && !button?.hasAttribute("disabled");
  }, null, { timeout: 10000 });
  await page.waitForFunction(() => {
    const hint = document.querySelector("#writingThemeIndexesHint")?.textContent || "";
    return !hint.includes("锟斤拷锟节讹拷取锟斤拷锟斤拷锟斤拷锟斤拷");
  }, null, { timeout: 10000 });

  await page.fill("#writingThemeDetailCentralQuestion", "What question should organize these two permanent notes before writing begins?");
  await page.fill("#writingThemeDetailThesis", "A theme becomes useful when it organizes notes around one reusable question.");
  await page.fill("#writingThemeDetailSummary1", "This theme is about turning two mature notes into one reusable question.");
  await page.fill("#writingThemeDetailSummary2", "That matters because writing should begin from theme-level structure, not loose grouping.");
  await page.fill("#writingThemeDetailSummary3", "It gives the next writing project a sharper starting point.");
  await page.click('[data-writing-theme-action="save"]');
  await waitFor(async () => {
    const statusText = await currentStatusText(page);
    assert.match(String(statusText || ""), /锟窖憋拷锟斤拷锟斤拷锟解：Browser Theme Index/);
  }, 10000);

  await page.click('[data-writing-theme-action="create-project"]');

  await waitFor(async () => {
    const resultText = await page.locator("#writingResult").textContent();
    assert.match(String(resultText || ""), /\"stage\": \"writing_project\"/);
  }, 10000);

  const projects = await fetchJson(apiBase, "/api/v1/writing-projects?limit=10");
  assert.equal(projects.status, 200, JSON.stringify(projects.json));
  const themedProject = projects.json.items.find((item) => item.title.includes("Browser Theme Index"));
  assert.ok(themedProject);
  assert.deepEqual(themedProject.related_index_ids, [themeCard.id]);
});

test("prototype writing center can create a project from a theme index after its notes were only preloaded as directory stubs", async (t) => {
  if (process.env.RUN_BROWSER_E2E !== "1") {
    t.skip("Set RUN_BROWSER_E2E=1 to enable browser e2e in local runs.");
    return;
  }

  const playwright = await optionalPlaywright(t);
  if (!playwright) return;

  const stack = await startPrototypeStack(t, playwright);
  if (!stack) return;
  const { apiBase, page, webBase } = stack;

  const noteA = await createWritingReadyPermanentNote(apiBase, {
    body: "# Cold Start Theme Claim\n\nA cold-start theme should still hydrate its member notes before gating project creation.",
    thesis: "Cold-start theme readiness should not depend on whether notes were already opened in the UI.",
    threeLineSummary: [
      "Cold-start theme readiness should not depend on UI preload order.",
      "That matters because theme entry is supposed to be a real writing shortcut.",
      "The UI should hydrate the needed notes before it decides whether project creation is allowed."
    ],
    distillationStatus: "confirmed",
    boundaryOrCounterpoint: "This only works if the theme reuses the same readiness semantics as the writing basket."
  });

  const noteB = await createWritingReadyPermanentNote(apiBase, {
    body: "# Cold Start Theme Tension\n\nA second mature note adds enough relation structure for project creation.",
    thesis: "A second mature note gives the theme enough structure to become project-ready.",
    threeLineSummary: [
      "A second mature note gives the theme enough structure.",
      "That matters because project creation should depend on structure, not cache state.",
      "It keeps the theme entry path consistent with the writing basket."
    ],
    distillationStatus: "confirmed",
    boundaryOrCounterpoint: "A theme with only one isolated note should still stop before project creation."
  });

  const relation = await postJson(apiBase, `/api/v1/notes/${encodeURIComponent(noteA.json.item.id)}/relations`, {
    toNoteId: noteB.json.item.id,
    relationType: "supports",
    rationale: "The second note gives the first enough explicit structure to justify project creation.",
    insightQuestion: "What question now organizes these notes as one reusable writing entry?",
    confidence: 1
  });
  assert.equal(relation.status, 201, JSON.stringify(relation.json));

  const coldTheme = await postJson(apiBase, "/api/v1/index-cards", {
    directoryId: "dir_original_default",
    indexType: "topic",
    title: "Cold Start Theme Index",
    summary: "A theme index created entirely through the API before the browser loads any note bodies.",
    thesis: "Theme entry should hydrate its own context before deciding whether project creation is allowed.",
    threeLineSummary: [
      "Theme entry should hydrate its own context.",
      "That keeps project gating tied to note quality instead of cache timing.",
      "It makes cold-start theme entry behave like the rest of the writing flow."
    ],
    centralQuestion: "How should a cold-start theme decide whether it can create a writing project?",
    items: [
      { noteId: noteA.json.item.id, shortLabel: "claim", rationale: "Sets the cold-start claim." },
      { noteId: noteB.json.item.id, shortLabel: "tension", rationale: "Adds the missing structure." }
    ]
  });
  assert.equal(coldTheme.status, 201, JSON.stringify(coldTheme.json));

  await page.goto(`${webBase}/prototype`, { waitUntil: "networkidle" });
  await page.locator('[data-action="quick-original"]').click();
  await page.locator('.explorer-item[data-kind="file"]', { hasText: "Cold Start Theme Claim" }).waitFor();
  await page.locator('.explorer-item[data-kind="file"]', { hasText: "Cold Start Theme Tension" }).waitFor();
  await page.locator('.rail-btn[data-module="writing"]').click();
  await page.locator('#writingThemeIndexList .writing-note-card', { hasText: "Cold Start Theme Index" }).click();
  await page.waitForFunction(() => {
    const value = document.querySelector("#writingThemeDetailTitle")?.value || "";
    return value.includes("Cold Start Theme Index");
  }, null, { timeout: 10000 });


  await page.waitForFunction(() => {
    const summary = document.querySelector('[data-writing-theme-project-summary]')?.textContent || "";
    const button = document.querySelector('[data-writing-theme-action="create-project"]');
    return summary.includes("锟缴达拷锟斤拷") && button?.textContent?.includes("锟斤拷锟斤拷写锟斤拷锟斤拷目") && !button?.hasAttribute("disabled");
  }, null, { timeout: 10000 });

  await page.click('[data-writing-theme-action="create-project"]');

  await waitFor(async () => {
    const resultText = await page.locator("#writingResult").textContent();
    assert.match(String(resultText || ""), /\"stage\": \"writing_project\"/);
  }, 10000);

  const projects = await fetchJson(apiBase, "/api/v1/writing-projects?limit=10");
  assert.equal(projects.status, 200, JSON.stringify(projects.json));
  const themedProject = projects.json.items.find((item) => item.title.includes("Cold Start Theme Index"));
  assert.ok(themedProject);
  assert.deepEqual(themedProject.related_index_ids, [coldTheme.json.item.id]);
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
  const { apiBase, page, vaultPath, webBase } = stack;

  const graphDirectory = await postJson(apiBase, "/api/v1/directories", {
    title: "Graph UI Scope",
    parentDirectoryId: "dir_original_default",
    directoryType: "custom",
    fsPath: path.join(vaultPath, "notes", "original", "graph-ui-scope"),
    maxNotes: 500
  });
  assert.equal(graphDirectory.status, 201, JSON.stringify(graphDirectory.json));
  const graphDirectoryId = graphDirectory.json.item.id;

  const targetNote = await postJson(apiBase, "/api/v1/notes", {
    directoryId: graphDirectoryId,
    body: "# Graph target\n\nThis note should be opened from the graph."
  });
  assert.equal(targetNote.status, 201);

  const sourceNote = await postJson(apiBase, "/api/v1/notes", {
    directoryId: graphDirectoryId,
    body: "# Graph source\n\nThis note links to [[Graph target]] and should create one graph edge."
  });
  assert.equal(sourceNote.status, 201);

  await page.goto(`${webBase}/prototype`, { waitUntil: "networkidle" });
  await page.locator(`.explorer-item[data-kind="folder"][data-id="${graphDirectoryId}"]`).click();
  await page.locator('.rail-btn[data-module="graph"]').click();

  await waitFor(async () => {
    await page.waitForSelector("#graphCanvas .graph-node", { timeout: 500 });
    const summary = await page.locator("#graphSummary").textContent();
    const [nodeCount = 0, edgeCount = 0] = [...String(summary || "").matchAll(/\d+/g)].map((match) => Number(match[0]));
    assert.ok(nodeCount >= 2, summary || "");
    assert.ok(edgeCount >= 1, summary || "");
    await page.locator("#graphCanvas .graph-edge", { hasText: "Graph source" }).waitFor({ timeout: 500 });
    await page.locator('[data-graph-followup-action="relations"]', { hasText: "去锟斤拷锟斤拷系" }).waitFor({ timeout: 500 });
  }, 7000);

  await page.locator('[data-graph-followup-action="relations"]', { hasText: "去锟斤拷锟斤拷系" }).first().click();
  await page.waitForFunction(() => {
    const activeModule = document.querySelector('.rail-btn[data-module="explorer"]')?.classList.contains("active");
    const form = document.querySelector("[data-create-relation-form]");
    const focus = document.activeElement;
    return Boolean(activeModule && form && focus && focus.getAttribute("data-relation-target-search") !== null);
  });

  const relationFormText = await page.locator("[data-create-relation-form]").textContent();
  assert.ok(String(relationFormText || "").trim().length > 0);
  const statusTextAfterFollowup = await currentStatusText(page);
  assert.match(statusTextAfterFollowup || "", /图锟阶打开笔硷拷|锟斤拷锟斤拷系/);

  await page.locator("#graphCanvas .graph-node", { hasText: "Graph target" }).click();
  await page.waitForFunction(() => document.querySelector("#editorBody")?.value?.includes("Graph target"));

  const activeEditorText = await page.locator("#editorBody").inputValue();
  assert.match(activeEditorText, /Graph target/);
});

test("prototype graph panel bridge gap followup opens relation creation on an isolated note", async (t) => {
  if (process.env.RUN_BROWSER_E2E !== "1") {
    t.skip("Set RUN_BROWSER_E2E=1 to enable browser e2e in local runs.");
    return;
  }

  const playwright = await optionalPlaywright(t);
  if (!playwright) return;

  const stack = await startPrototypeStack(t, playwright);
  if (!stack) return;
  const { apiBase, page, vaultPath, webBase } = stack;

  const graphDirectory = await postJson(apiBase, "/api/v1/directories", {
    title: "Graph Bridge Scope",
    parentDirectoryId: "dir_original_default",
    directoryType: "custom",
    fsPath: path.join(vaultPath, "notes", "original", "graph-bridge-scope"),
    maxNotes: 500
  });
  assert.equal(graphDirectory.status, 201, JSON.stringify(graphDirectory.json));
  const graphDirectoryId = graphDirectory.json.item.id;

  const noteA = await postJson(apiBase, "/api/v1/notes", {
    directoryId: graphDirectoryId,
    body: "# Bridge Gap A\n\nThis note is currently isolated and should ask for a bridge relation."
  });
  assert.equal(noteA.status, 201);

  const noteB = await postJson(apiBase, "/api/v1/notes", {
    directoryId: graphDirectoryId,
    body: "# Bridge Gap B\n\nThis second isolated note creates a disconnected structure."
  });
  assert.equal(noteB.status, 201);

  await page.goto(`${webBase}/prototype`, { waitUntil: "networkidle" });
  await page.locator(`.explorer-item[data-kind="folder"][data-id="${graphDirectoryId}"]`).click();
  await page.locator('.rail-btn[data-module="graph"]').click();

  await waitFor(async () => {
    const summary = await page.locator("#graphSummary").textContent();
    const [nodeCount = 0] = [...String(summary || "").matchAll(/\d+/g)].map((match) => Number(match[0]));
    assert.ok(nodeCount >= 2, summary || "");
    await page.locator('[data-graph-followup-action="bridge"]', { hasText: "去锟斤拷锟脚斤拷" }).waitFor({ timeout: 500 });
  }, 7000);

  await page.locator('[data-graph-followup-action="bridge"]', { hasText: "去锟斤拷锟脚斤拷" }).first().click();
  await page.waitForFunction(() => {
    const activeModule = document.querySelector('.rail-btn[data-module="explorer"]')?.classList.contains("active");
    const form = document.querySelector("[data-create-relation-form]");
    const focus = document.activeElement;
    return Boolean(activeModule && form && focus && focus.getAttribute("data-relation-target-search") !== null);
  });

  const relationFormText = await page.locator("[data-create-relation-form]").textContent();
  assert.ok(String(relationFormText || "").trim().length > 0);
  const statusTextAfterFollowup = await currentStatusText(page);
  assert.match(statusTextAfterFollowup || "", /锟斤拷锟脚接癸拷系/);
});

test("prototype graph panel tension followup opens boundary field on the source note", async (t) => {
  if (process.env.RUN_BROWSER_E2E !== "1") {
    t.skip("Set RUN_BROWSER_E2E=1 to enable browser e2e in local runs.");
    return;
  }

  const playwright = await optionalPlaywright(t);
  if (!playwright) return;

  const stack = await startPrototypeStack(t, playwright);
  if (!stack) return;
  const { apiBase, page, vaultPath, webBase } = stack;

  const graphDirectory = await postJson(apiBase, "/api/v1/directories", {
    title: "Graph Tension Scope",
    parentDirectoryId: "dir_original_default",
    directoryType: "custom",
    fsPath: path.join(vaultPath, "notes", "original", "graph-tension-scope"),
    maxNotes: 500
  });
  assert.equal(graphDirectory.status, 201, JSON.stringify(graphDirectory.json));
  const graphDirectoryId = graphDirectory.json.item.id;

  const noteA = await postJson(apiBase, "/api/v1/notes", {
    directoryId: graphDirectoryId,
    body: "# Tension Source\n\nThis note should be opened so the user can add a sharper boundary."
  });
  assert.equal(noteA.status, 201);

  const noteB = await postJson(apiBase, "/api/v1/notes", {
    directoryId: graphDirectoryId,
    body: "# Tension Target\n\nThis note is challenged by the source note."
  });
  assert.equal(noteB.status, 201);

  const relation = await postJson(apiBase, `/api/v1/notes/${encodeURIComponent(noteA.json.item.id)}/relations`, {
    toNoteId: noteB.json.item.id,
    relationType: "counterexample_to",
    rationale: "The source note provides a counterexample that should push the user to clarify the boundary.",
    insightQuestion: "What boundary would keep this judgment from overreaching?",
    confidence: 1
  });
  assert.equal(relation.status, 201, JSON.stringify(relation.json));

  await page.goto(`${webBase}/prototype`, { waitUntil: "networkidle" });
  await page.locator(`.explorer-item[data-kind="folder"][data-id="${graphDirectoryId}"]`).click();
  await page.locator('.rail-btn[data-module="graph"]').click();

  await waitFor(async () => {
    const summary = await page.locator("#graphSummary").textContent();
    const [nodeCount = 0, edgeCount = 0] = [...String(summary || "").matchAll(/\d+/g)].map((match) => Number(match[0]));
    assert.ok(nodeCount >= 2, summary || "");
    assert.ok(edgeCount >= 1, summary || "");
    await page.locator('[data-graph-followup-action="tension"]', { hasText: "去锟斤拷锟斤拷锟斤拷/锟竭斤拷" }).waitFor({ timeout: 500 });
  }, 7000);

  await page.locator('[data-graph-followup-action="tension"]', { hasText: "去锟斤拷锟斤拷锟斤拷/锟竭斤拷" }).first().click();
  await page.waitForFunction(() => {
    const activeModule = document.querySelector('.rail-btn[data-module="explorer"]')?.classList.contains("active");
    const boundaryField = document.querySelector('[data-note-distillation-form] textarea[name="boundaryOrCounterpoint"]');
    const focus = document.activeElement;
    return Boolean(activeModule && boundaryField && focus === boundaryField);
  });

  const statusTextAfterFollowup = await currentStatusText(page);
  assert.ok(String(statusTextAfterFollowup || "").trim().length > 0);
});

test("prototype graph panel seeds the Yijing demo network", async (t) => {
  if (process.env.RUN_BROWSER_E2E !== "1") {
    t.skip("Set RUN_BROWSER_E2E=1 to enable browser e2e in local runs.");
    return;
  }

  const playwright = await optionalPlaywright(t);
  if (!playwright) return;

  const stack = await startPrototypeStack(t, playwright);
  if (!stack) return;
  const { apiBase, page, webBase } = stack;

  await page.goto(`${webBase}/prototype`, { waitUntil: "networkidle" });
  await page.locator('.rail-btn[data-module="graph"]').click();
  await page.locator("#graphSeedYijing").click();

  await waitFor(async () => {
    const notes = await fetchJson(apiBase, "/api/v1/directories/dir_demo_yijing_knowledge_network/notes");
    assert.equal(notes.status, 200, JSON.stringify(notes.json));
    assert.equal(notes.json.total, 21);

    const graph = await fetchJson(apiBase, "/api/v1/graph?scope=directory&directoryId=dir_demo_yijing_knowledge_network");
    assert.equal(graph.status, 200, JSON.stringify(graph.json));
    assert.equal(graph.json.item.totalNodes, 21);
    assert.equal(graph.json.item.totalEdges, 27);

    const statusText = await currentStatusText(page);
    assert.match(String(statusText || ""), /锟阶撅拷锟斤拷锟斤拷/);
    assert.ok((await page.locator("#graphCanvas .graph-node").count()) >= 21);
    assert.ok((await page.locator("#graphCanvas .graph-edge").count()) >= 27);
  }, 15000);

  await page.locator("#graphRelationTypeFilter").selectOption("supports");
  await waitFor(async () => {
    const summaryText = await page.locator("#graphSummary").textContent();
    assert.match(String(summaryText || ""), /锟斤拷前锟斤拷示/);
    assert.match(String(summaryText || ""), /支锟斤拷/);
    assert.equal(await page.locator("#graphCanvas .graph-edge").count(), 6);
  }, 5000);

  await page.locator("#graphRelationTypeFilter").selectOption("all");
  await waitFor(async () => {
    assert.ok((await page.locator("#graphCanvas .graph-edge").count()) >= 27);
  }, 5000);
});

test("prototype smart notes startup demo opens the guide note without duplicating seed data", async (t) => {
  if (process.env.RUN_BROWSER_E2E !== "1") {
    t.skip("Set RUN_BROWSER_E2E=1 to enable browser e2e in local runs.");
    return;
  }

  const playwright = await optionalPlaywright(t);
  if (!playwright) return;

  const stack = await startPrototypeStack(t, playwright);
  if (!stack) return;
  const { apiBase, page, webBase } = stack;

  await page.goto(`${webBase}/prototype?demo=smart-notes-product-thinking`, { waitUntil: "networkidle" });

  await waitFor(async () => {
    const statusText = await currentStatusText(page);
    assert.match(String(statusText || ""), /Smart Notes 锟斤拷品思锟斤拷 Demo/);
    assert.match(String(statusText || ""), /锟窖打开碉拷锟斤拷锟绞硷拷/);

    const startupState = await page.evaluate(() => ({
      module: window.__prototypeState?.module || "",
      selectedFileId: window.__prototypeState?.selectedFileId || "",
      selectedFolderId: window.__prototypeState?.selectedFolderId || ""
    }));
    assert.equal(startupState.module, "explorer");
    assert.equal(startupState.selectedFileId, "GUIDE-SN-001");
    assert.equal(startupState.selectedFolderId, "dir_demo_smart_notes_product_thinking_original");
  }, 15000);

  const firstSeedDirectory = await fetchJson(apiBase, "/api/v1/directories/dir_demo_smart_notes_product_thinking_original/notes");
  assert.equal(firstSeedDirectory.status, 200, JSON.stringify(firstSeedDirectory.json));
  assert.equal(firstSeedDirectory.json.total, 102);

  await page.goto(`${webBase}/prototype?demo=smart-notes-product-thinking`, { waitUntil: "networkidle" });
  await waitFor(async () => {
    const statusText = await currentStatusText(page);
    assert.match(String(statusText || ""), /锟窖打开碉拷锟斤拷锟绞硷拷/);
    const startupState = await page.evaluate(() => ({
      module: window.__prototypeState?.module || "",
      selectedFileId: window.__prototypeState?.selectedFileId || ""
    }));
    assert.equal(startupState.module, "explorer");
    assert.equal(startupState.selectedFileId, "GUIDE-SN-001");
  }, 15000);

  await page.click('.rail-btn[data-module="writing"]');
  await waitFor(async () => {
    const writingState = await page.evaluate(() => ({
      title: document.querySelector("#writingTitle")?.value || "",
      goal: document.querySelector("#writingGoal")?.value || "",
      audience: document.querySelector("#writingAudience")?.value || "",
      basketSummary: document.querySelector("#writingBasketSummary")?.textContent || ""
    }));
    assert.ok(String(writingState.title || "").trim().length > 0);
    assert.ok(String(writingState.goal || "").trim().length > 0);
    assert.ok(String(writingState.audience || "").trim().length > 0);
    assert.match(writingState.basketSummary, /WP-SN-PM-001/);
    assert.match(writingState.basketSummary, /DS-SN-PM-001/);
  }, 15000);

  const secondSeedDirectory = await fetchJson(apiBase, "/api/v1/directories/dir_demo_smart_notes_product_thinking_original/notes");
  assert.equal(secondSeedDirectory.status, 200, JSON.stringify(secondSeedDirectory.json));
  assert.equal(secondSeedDirectory.json.total, 102);
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

  await acceptPrompt(page, /锟斤拷锟斤拷锟斤拷目录/, "Renamed Folder");
  await openContextAction(page, folderRow, "rename");

  await waitFor(async () => {
    await page.locator('.explorer-item[data-kind="folder"]', { hasText: "Renamed Folder" }).waitFor({ timeout: 500 });
    const statusText = await page.locator("#statusText").textContent();
    assert.match(statusText || "", /目录锟窖革拷锟铰诧拷锟斤拷锟斤拷/);
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
    assert.match(statusText || "", /目录锟姐级锟窖革拷锟铰诧拷锟斤拷锟斤拷/);
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

  await acceptPrompt(page, /锟斤拷锟斤拷锟斤拷锟绞硷拷/, "Renamed note title");
  await openContextAction(page, noteRow, "rename");

  await waitFor(async () => {
    await page.locator('.explorer-item[data-kind="file"]', { hasText: "Renamed note title" }).waitFor({ timeout: 500 });
    const statusText = await page.locator("#statusText").textContent();
    assert.match(statusText || "", /锟斤拷同锟斤拷锟斤拷 Markdown|锟绞硷拷锟斤拷锟斤拷锟斤拷锟斤拷/);
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
    assert.match(String(statusText || ""), /锟窖达拷Markdown 锟侥硷拷位锟斤拷/);
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

  await acceptPrompt(page, /锟狡讹拷锟斤拷目录 ID/, targetDirectory.json.item.id);
  await openContextAction(page, noteRow, "move");

  await waitFor(async () => {
    const statusText = await page.locator("#statusText").textContent();
    assert.match(statusText || "", /锟斤拷锟狡讹拷锟绞记诧拷锟斤拷锟斤拷/);
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
    assert.match(dialog.message(), /确锟斤拷删锟斤拷锟绞硷拷/);
    assert.match(dialog.message(), /Markdown 锟侥硷拷/);
    await dialog.accept();
  });
  await openContextAction(page, movedRow, "delete");

  await waitFor(async () => {
    const statusText = await page.locator("#statusText").textContent();
    assert.match(statusText || "", /锟斤拷删锟斤拷锟绞记诧拷锟斤拷锟斤拷/);
    const deletedNote = await fetchJson(apiBase, `/api/v1/notes/${encodeURIComponent(note.json.item.id)}`);
    assert.equal(deletedNote.status, 404);
  }, 8000);

  await assert.rejects(fs.access(movedMarkdownPath));
});

test("prototype AI inbox field suggestion flow adopts a suggestion as draft and updates the target note", async (t) => {
  if (process.env.RUN_BROWSER_E2E !== "1") {
    t.skip("Set RUN_BROWSER_E2E=1 to enable browser e2e in local runs.");
    return;
  }

  const playwright = await optionalPlaywright(t);
  if (!playwright) return;

  const stack = await startPrototypeStack(t, playwright);
  if (!stack) return;
  const { apiBase, page, webBase } = stack;

  const fixture = await createAiFieldSuggestionFixture(apiBase, {
    title: "Inbox review target",
    body: "The inbox review flow should only advance after explicit user action."
  });

  await reloadPrototype(page, webBase);
  await openAiInboxModule(page);
  await filterAiInboxBySourceNote(page, fixture.noteId);

  const item = page.locator(`#aiInboxPanel .ai-inbox-list-pane [data-ai-inbox-artifact-id="${fixture.artifactId}"]`);
  await item.waitFor();
  await item.click();

  await waitFor(async () => {
    const detailText = await page.locator("#aiInboxPanel .ai-inbox-detail-pane").textContent();
    assert.match(String(detailText || ""), new RegExp(escapeRegExp(fixture.suggestionId)));
  }, 8000);

  await page.locator('#aiInboxPanel .ai-inbox-detail-pane [data-ai-inbox-suggestion-status="adopted_as_draft"]').click();

  await waitFor(async () => {
    const note = await fetchJson(apiBase, `/api/v1/notes/${encodeURIComponent(fixture.noteId)}`);
    assert.equal(note.status, 200);
    assert.equal(
      note.json.item[noteFieldKey(fixture.targetField)],
      suggestionFieldValue(fixture.suggestedContent, fixture.targetField)
    );
  }, 8000);

  await waitFor(async () => {
    assert.equal(await page.evaluate(() => window.__prototypeState?.module || ""), "explorer");
  }, 8000);
});

test("prototype AI inbox reviewed detail can mark an adopted draft edited and then confirmed", async (t) => {
  if (process.env.RUN_BROWSER_E2E !== "1") {
    t.skip("Set RUN_BROWSER_E2E=1 to enable browser e2e in local runs.");
    return;
  }

  const playwright = await optionalPlaywright(t);
  if (!playwright) return;

  const stack = await startPrototypeStack(t, playwright);
  if (!stack) return;
  const { apiBase, page, webBase } = stack;

  const fixture = await createAiFieldSuggestionFixture(apiBase, {
    title: "Inbox reviewed detail target",
    body: "This adopted draft should be edited and confirmed from the reviewed AI inbox detail."
  });
  await adoptSuggestionAsDraftViaApi(apiBase, fixture);
  const editedThesis = "Inbox browser review changed this thesis before final confirmation.";

  await reloadPrototype(page, webBase);
  await openAiInboxModule(page);
  await filterAiInboxBySourceNote(page, fixture.noteId);
  await waitFor(async () => {
    const reviewedCount = String(await page.locator('#aiInboxPanel [data-ai-inbox-view="reviewed"] strong').textContent() || "").trim();
    assert.notEqual(reviewedCount, "0");
  }, 8000);
  await page.evaluate(() => {
    const button = document.querySelector('#aiInboxPanel [data-ai-inbox-view="reviewed"]');
    if (!button) throw new Error("missing reviewed tab");
    button.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
  });
  await waitFor(async () => {
    const present = await page.evaluate((artifactId) => Boolean(document.querySelector(`#aiInboxPanel [data-ai-inbox-artifact-id="${artifactId}"]`)), fixture.artifactId);
    assert.equal(present, true);
  }, 8000);
  await page.evaluate((artifactId) => {
    const item = document.querySelector(`#aiInboxPanel [data-ai-inbox-artifact-id="${artifactId}"]`);
    if (!item) throw new Error(`missing reviewed inbox item: ${artifactId}`);
    item.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
  }, fixture.artifactId);

  await waitFor(async () => {
    assert.equal(await page.locator("#aiInboxSuggestionContentEditor").isVisible(), true);
    const detailText = await page.locator("#aiInboxPanel .ai-inbox-detail-pane").textContent();
    assert.match(String(detailText || ""), /Adopted as draft/);
  }, 8000);

  await page.locator("#aiInboxSuggestionContentEditor").fill(JSON.stringify({ thesis: editedThesis }, null, 2));
  await page.locator('#aiInboxPanel .ai-inbox-detail-pane [data-ai-inbox-suggestion-status="edited"]').click();

  await waitFor(async () => {
    const suggestion = await fetchJson(apiBase, `/api/v1/ai-suggestions/${encodeURIComponent(fixture.suggestionId)}?canonical=true`);
    assert.equal(suggestion.status, 200);
    assert.equal(suggestion.json.item.status, "edited");
    assert.equal(suggestionFieldValue(suggestion.json.item.content, fixture.targetField), editedThesis);
  }, 8000);

  await page.locator("#aiInboxSuggestionContentEditor").fill(JSON.stringify({ thesis: editedThesis }, null, 2));
  await page.locator('#aiInboxPanel .ai-inbox-detail-pane [data-ai-inbox-suggestion-status="confirmed"]').click();

  await waitFor(async () => {
    const suggestion = await fetchJson(apiBase, `/api/v1/ai-suggestions/${encodeURIComponent(fixture.suggestionId)}?canonical=true`);
    assert.equal(suggestion.status, 200);
    assert.equal(suggestion.json.item.status, "confirmed");
    assert.equal(suggestionFieldValue(suggestion.json.item.content, fixture.targetField), editedThesis);
    assert.equal(suggestion.json.canonical.latest_review_event.event_type, "confirmed");
  }, 8000);

  await waitFor(async () => {
    const detailText = await page.locator("#aiInboxPanel .ai-inbox-detail-pane").textContent();
    assert.match(String(detailText || ""), /Confirmed/);
    assert.match(String(detailText || ""), new RegExp(escapeRegExp(editedThesis)));
  }, 8000);
});

test("prototype AI inbox reviewed detail keeps invalid reviewed JSON as inline error without submitting", async (t) => {
  if (process.env.RUN_BROWSER_E2E !== "1") {
    t.skip("Set RUN_BROWSER_E2E=1 to enable browser e2e in local runs.");
    return;
  }

  const playwright = await optionalPlaywright(t);
  if (!playwright) return;

  const stack = await startPrototypeStack(t, playwright);
  if (!stack) return;
  const { apiBase, page, webBase } = stack;

  const fixture = await createAiFieldSuggestionFixture(apiBase, {
    title: "Inbox invalid reviewed JSON target",
    body: "This adopted draft should reject invalid reviewed JSON from the AI inbox detail."
  });
  await adoptSuggestionAsDraftViaApi(apiBase, fixture);

  let patchCount = 0;
  await page.route(`${apiBase}/api/v1/ai-suggestions/${fixture.suggestionId}?canonical=true`, async (route, request) => {
    if (request.method() === "PATCH") patchCount += 1;
    await route.continue();
  });

  await reloadPrototype(page, webBase);
  await openAiInboxModule(page);
  await filterAiInboxBySourceNote(page, fixture.noteId);
  await page.locator('#aiInboxPanel [data-ai-inbox-view="reviewed"]').click();

  const reviewedItem = page.locator(`#aiInboxPanel .ai-inbox-list-pane [data-ai-inbox-artifact-id="${fixture.artifactId}"]`);
  await reviewedItem.waitFor();
  await reviewedItem.click();

  await waitFor(async () => {
    assert.equal(await page.locator("#aiInboxSuggestionContentEditor").isVisible(), true);
  }, 8000);

  await page.locator("#aiInboxSuggestionContentEditor").fill("{not valid json}");
  await page.locator('#aiInboxPanel .ai-inbox-detail-pane [data-ai-inbox-suggestion-status="edited"]').click();

  await waitFor(async () => {
    const detailText = await page.locator("#aiInboxPanel .ai-inbox-detail-pane").textContent();
    assert.match(String(detailText || ""), /must be valid JSON/i);
  }, 8000);

  assert.equal(patchCount, 0);
  const suggestion = await fetchJson(apiBase, `/api/v1/ai-suggestions/${encodeURIComponent(fixture.suggestionId)}?canonical=true`);
  assert.equal(suggestion.status, 200);
  assert.equal(suggestion.json.item.status, "adopted_as_draft");
});

test("prototype AI inbox can reject a linked suggestion and keeps the reviewed artifact inspectable", async (t) => {
  if (process.env.RUN_BROWSER_E2E !== "1") {
    t.skip("Set RUN_BROWSER_E2E=1 to enable browser e2e in local runs.");
    return;
  }

  const playwright = await optionalPlaywright(t);
  if (!playwright) return;

  const stack = await startPrototypeStack(t, playwright);
  if (!stack) return;
  const { apiBase, page, webBase } = stack;

  const fixture = await createAiFieldSuggestionFixture(apiBase, {
    title: "Inbox reject target",
    body: "This suggestion should be rejected from the AI inbox detail view."
  });

  await reloadPrototype(page, webBase);
  await openAiInboxModule(page);
  await filterAiInboxBySourceNote(page, fixture.noteId);

  const item = page.locator(`#aiInboxPanel .ai-inbox-list-pane [data-ai-inbox-artifact-id="${fixture.artifactId}"]`);
  await item.waitFor();
  await item.click();
  await page.locator('#aiInboxPanel .ai-inbox-detail-pane [data-ai-inbox-suggestion-status="rejected"]').click();

  await waitFor(async () => {
    const suggestion = await fetchJson(apiBase, `/api/v1/ai-suggestions/${encodeURIComponent(fixture.suggestionId)}?canonical=true`);
    assert.equal(suggestion.status, 200);
    assert.equal(suggestion.json.item.status, "rejected");
  }, 8000);

  await page.locator('#aiInboxPanel [data-ai-inbox-view="reviewed"]').click();
  const reviewedItem = page.locator(`#aiInboxPanel .ai-inbox-list-pane [data-ai-inbox-artifact-id="${fixture.artifactId}"]`);
  await reviewedItem.waitFor();
  await reviewedItem.click();

  await waitFor(async () => {
    const detailText = await page.locator("#aiInboxPanel .ai-inbox-detail-pane").textContent();
    assert.match(String(detailText || ""), /Rejected/);
  }, 8000);

  const detail = await fetchJson(apiBase, `/api/v1/ai/inbox/${encodeURIComponent(fixture.artifactId)}?canonical=true`);
  assert.equal(detail.status, 200);
  assert.equal(detail.json.canonical.artifact.status, "ignored");
  assert.equal(detail.json.canonical.suggestion.status, "rejected");
});

test("prototype AI inbox reject plus refresh keeps the reviewed artifact stable", async (t) => {
  if (process.env.RUN_BROWSER_E2E !== "1") {
    t.skip("Set RUN_BROWSER_E2E=1 to enable browser e2e in local runs.");
    return;
  }

  const playwright = await optionalPlaywright(t);
  if (!playwright) return;

  const stack = await startPrototypeStack(t, playwright);
  if (!stack) return;
  const { apiBase, page, webBase } = stack;

  const fixture = await createAiFieldSuggestionFixture(apiBase, {
    title: "Inbox reject refresh target",
    body: "This suggestion should remain inspectable after reject plus refresh."
  });

  await reloadPrototype(page, webBase);
  await openAiInboxModule(page);
  await filterAiInboxBySourceNote(page, fixture.noteId);

  const item = page.locator(`#aiInboxPanel .ai-inbox-list-pane [data-ai-inbox-artifact-id="${fixture.artifactId}"]`);
  await item.waitFor();
  await item.click();
  await page.locator('#aiInboxPanel .ai-inbox-detail-pane [data-ai-inbox-suggestion-status="rejected"]').click();

  await waitFor(async () => {
    const suggestion = await fetchJson(apiBase, `/api/v1/ai-suggestions/${encodeURIComponent(fixture.suggestionId)}?canonical=true`);
    assert.equal(suggestion.status, 200);
    assert.equal(suggestion.json.item.status, "rejected");
  }, 8000);

  await page.locator('#aiInboxPanel [data-ai-inbox-view="reviewed"]').click();
  await page.locator("#btnAiInboxRefresh").click();

  const reviewedItem = page.locator(`#aiInboxPanel .ai-inbox-list-pane [data-ai-inbox-artifact-id="${fixture.artifactId}"]`);
  await reviewedItem.waitFor();
  await reviewedItem.click();

  await waitFor(async () => {
    const detailText = await page.locator("#aiInboxPanel .ai-inbox-detail-pane").textContent();
    assert.match(String(detailText || ""), /Rejected/);
    assert.doesNotMatch(String(detailText || ""), /锟斤拷锟斤拷失锟斤拷/);
  }, 8000);

  const detail = await fetchJson(apiBase, `/api/v1/ai/inbox/${encodeURIComponent(fixture.artifactId)}?canonical=true`);
  assert.equal(detail.status, 200);
  assert.equal(detail.json.canonical.artifact.status, "ignored");
  assert.equal(detail.json.canonical.suggestion.status, "rejected");
});

test("prototype AI inbox reviewed reopen continuity keeps canonical detail aligned after refresh and tab switches", async (t) => {
  if (process.env.RUN_BROWSER_E2E !== "1") {
    t.skip("Set RUN_BROWSER_E2E=1 to enable browser e2e in local runs.");
    return;
  }

  const playwright = await optionalPlaywright(t);
  if (!playwright) return;

  const stack = await startPrototypeStack(t, playwright);
  if (!stack) return;
  const { page, webBase, apiBase } = stack;

  const fixture = await createAiFieldSuggestionFixture(apiBase, {
    title: "Inbox reviewed reopen continuity target",
    body: "Reopening the same reviewed inbox item should keep detail aligned after refresh and tab switches."
  });
  await adoptSuggestionAsDraftViaApi(apiBase, fixture);

  await reloadPrototype(page, webBase);
  await openAiInboxModule(page);
  await filterAiInboxBySourceNote(page, fixture.noteId);
  await page.locator('#aiInboxPanel [data-ai-inbox-view="reviewed"]').click();

  const reviewedItem = page.locator(`#aiInboxPanel .ai-inbox-list-pane [data-ai-inbox-artifact-id="${fixture.artifactId}"]`);
  await reviewedItem.waitFor();
  await reviewedItem.click();

  await waitFor(async () => {
    const detailText = await page.locator("#aiInboxPanel .ai-inbox-detail-pane").textContent();
    assert.match(String(detailText || ""), /Adopted as draft/);
    assert.match(String(detailText || ""), new RegExp(escapeRegExp(fixture.suggestionId)));
    assert.equal(await page.locator("#aiInboxSuggestionContentEditor").isVisible(), true);
  }, 8000);

  await page.locator("#btnAiInboxRefresh").click();
  await page.locator('#aiInboxPanel [data-ai-inbox-view="pending"]').click();
  await page.locator('#aiInboxPanel [data-ai-inbox-view="reviewed"]').click();
  await reviewedItem.waitFor();
  await reviewedItem.click();

  await waitFor(async () => {
    const detailText = await page.locator("#aiInboxPanel .ai-inbox-detail-pane").textContent();
    assert.match(String(detailText || ""), /Adopted as draft/);
    assert.match(String(detailText || ""), new RegExp(escapeRegExp(fixture.suggestionId)));
    assert.equal(await page.locator("#aiInboxSuggestionContentEditor").isVisible(), true);
    assert.doesNotMatch(String(detailText || ""), /Review safety/);
    assert.doesNotMatch(String(detailText || ""), /姝ｅ湪璇诲彇寤鸿璇︽儏/);
  }, 8000);
});

test("prototype AI inbox review-action continuity keeps detail aligned with filtered pending selection changes", async (t) => {
  if (process.env.RUN_BROWSER_E2E !== "1") {
    t.skip("Set RUN_BROWSER_E2E=1 to enable browser e2e in local runs.");
    return;
  }

  const playwright = await optionalPlaywright(t);
  if (!playwright) return;

  const stack = await startPrototypeStack(t, playwright);
  if (!stack) return;
  const { apiBase, page, webBase } = stack;

  const firstFixture = await createAiFieldSuggestionFixture(apiBase, {
    title: "Inbox filtered continuity first target",
    body: "Rejecting this pending inbox item should move detail to another visible pending item."
  });
  const secondFixture = await createAiFieldSuggestionFixture(apiBase, {
    title: "Inbox filtered continuity second target",
    body: "This pending inbox item should stay visible after the first one is rejected."
  });
  const loneFixture = await createAiFieldSuggestionFixture(apiBase, {
    title: "Inbox filtered continuity lone target",
    body: "Rejecting the last filtered pending inbox item should clear list and detail."
  });

  await reloadPrototype(page, webBase);
  await openAiInboxModule(page);

  const firstItem = page.locator(`#aiInboxPanel .ai-inbox-list-pane [data-ai-inbox-artifact-id="${firstFixture.artifactId}"]`);
  await firstItem.waitFor();
  await page.evaluate((artifactId) => {
    document
      .querySelector(`#aiInboxPanel .ai-inbox-list-pane [data-ai-inbox-artifact-id="${artifactId}"]`)
      ?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
  }, firstFixture.artifactId);

  await waitFor(async () => {
    const detailText = await page.locator("#aiInboxPanel .ai-inbox-detail-pane").textContent();
    assert.match(String(detailText || ""), new RegExp(escapeRegExp(firstFixture.noteId)));
    assert.match(String(detailText || ""), /Reject/);
  }, 8000);

  await page.locator('#aiInboxPanel .ai-inbox-detail-pane [data-ai-inbox-suggestion-status="rejected"]').click({ force: true });

  await waitFor(async () => {
    const suggestion = await fetchJson(apiBase, `/api/v1/ai-suggestions/${encodeURIComponent(firstFixture.suggestionId)}?canonical=true`);
    assert.equal(suggestion.status, 200);
    assert.equal(suggestion.json.item.status, "rejected");
  }, 8000);

  await waitFor(async () => {
    const detailText = await page.locator("#aiInboxPanel .ai-inbox-detail-pane").textContent();
    assert.doesNotMatch(String(detailText || ""), new RegExp(escapeRegExp(firstFixture.noteId)));
    const switchedToRemainingSuggestion =
      new RegExp(escapeRegExp(secondFixture.noteId)).test(String(detailText || "")) ||
      new RegExp(escapeRegExp(loneFixture.noteId)).test(String(detailText || ""));
    assert.equal(switchedToRemainingSuggestion, true);
  }, 8000);

  await waitFor(async () => {
    assert.equal(await firstItem.count(), 0);
    const activeRows = await page.locator("#aiInboxPanel .ai-inbox-list-pane .ai-inbox-item.is-active").count();
    assert.equal(activeRows >= 1, true);
  }, 8000);

  await filterAiInboxBySourceNote(page, loneFixture.noteId);

  const loneItem = page.locator(`#aiInboxPanel .ai-inbox-list-pane [data-ai-inbox-artifact-id="${loneFixture.artifactId}"]`);
  await waitFor(async () => {
    assert.equal(await loneItem.count(), 1);
  }, 8000);

  await page.evaluate((artifactId) => {
    document
      .querySelector(`#aiInboxPanel .ai-inbox-list-pane [data-ai-inbox-artifact-id="${artifactId}"]`)
      ?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
  }, loneFixture.artifactId);

  await waitFor(async () => {
    const detailText = await page.locator("#aiInboxPanel .ai-inbox-detail-pane").textContent();
    assert.match(String(detailText || ""), new RegExp(escapeRegExp(loneFixture.suggestionId)));
    assert.match(String(detailText || ""), /Reject/);
  }, 8000);

  await page.locator('#aiInboxPanel .ai-inbox-detail-pane [data-ai-inbox-suggestion-status="rejected"]').click({ force: true });

  await waitFor(async () => {
    const suggestion = await fetchJson(apiBase, `/api/v1/ai-suggestions/${encodeURIComponent(loneFixture.suggestionId)}?canonical=true`);
    assert.equal(suggestion.status, 200);
    assert.equal(suggestion.json.item.status, "rejected");
  }, 8000);

  await page.evaluate(() => {
    const button = document.querySelector('#aiInboxPanel [data-ai-inbox-view="reviewed"]');
    if (!button) throw new Error("missing reviewed tab");
    button.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
  });

  const loneReviewedItem = page.locator(`#aiInboxPanel .ai-inbox-list-pane [data-ai-inbox-artifact-id="${loneFixture.artifactId}"]`);
  await waitFor(async () => {
    assert.equal(await loneReviewedItem.count(), 1);
  }, 8000);

  await page.evaluate((artifactId) => {
    document
      .querySelector(`#aiInboxPanel .ai-inbox-list-pane [data-ai-inbox-artifact-id="${artifactId}"]`)
      ?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
  }, loneFixture.artifactId);

  await waitFor(async () => {
    const detailText = await page.locator("#aiInboxPanel .ai-inbox-detail-pane").textContent();
    assert.match(String(detailText || ""), /Rejected/);
    assert.match(String(detailText || ""), new RegExp(escapeRegExp(loneFixture.suggestionId)));
  }, 8000);

  await page.locator('#aiInboxPanel .ai-inbox-detail-pane [data-ai-inbox-decision="archived"]').click({ force: true });

  await waitFor(async () => {
    const listText = await page.locator("#aiInboxPanel .ai-inbox-list-pane").textContent();
    const detailText = await page.locator("#aiInboxPanel .ai-inbox-detail-pane").textContent();
    assert.ok(String(listText || "").trim().length > 0);
    assert.ok(String(detailText || "").trim().length > 0);
    assert.doesNotMatch(String(detailText || ""), /姝ｅ湪璇诲彇寤鸿璇︽儏/);
    assert.doesNotMatch(String(detailText || ""), new RegExp(escapeRegExp(loneFixture.noteId)));
  }, 8000);

  const detail = await fetchJson(apiBase, `/api/v1/ai/inbox/${encodeURIComponent(loneFixture.artifactId)}?canonical=true`);
  assert.equal(detail.status, 200);
  assert.equal(detail.json.canonical.artifact.status, "archived");
  assert.equal(detail.json.canonical.suggestion.status, "rejected");
});

test("prototype AI inbox guards stale detail selection and duplicate reviewed submit", async (t) => {
  if (process.env.RUN_BROWSER_E2E !== "1") {
    t.skip("Set RUN_BROWSER_E2E=1 to enable browser e2e in local runs.");
    return;
  }

  const playwright = await optionalPlaywright(t);
  if (!playwright) return;

  const stack = await startPrototypeStack(t, playwright);
  if (!stack) return;
  const { apiBase, page, webBase } = stack;

  const slowFixture = await createAiFieldSuggestionFixture(apiBase, {
    title: "Inbox stale selection slow target",
    body: "The first inbox detail request should resolve too late and must not overwrite the second reviewed selection."
  });
  const fastFixture = await createAiFieldSuggestionFixture(apiBase, {
    title: "Inbox stale selection fast target",
    body: "The second inbox detail request should win and stay visible in reviewed AI inbox detail."
  });
  await adoptSuggestionAsDraftViaApi(apiBase, slowFixture);
  await adoptSuggestionAsDraftViaApi(apiBase, fastFixture);

  let delayedSlowDetail = false;
  await page.route(`${apiBase}/api/v1/ai/inbox/${slowFixture.artifactId}?canonical=true`, async (route) => {
    if (!delayedSlowDetail) {
      delayedSlowDetail = true;
      await new Promise((resolve) => setTimeout(resolve, 700));
    }
    await route.continue();
  });

  let editRequestCount = 0;
  await page.route(`${apiBase}/api/v1/ai-suggestions/${fastFixture.suggestionId}?canonical=true`, async (route, request) => {
    if (request.method() === "PATCH") {
      editRequestCount += 1;
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    await route.continue();
  });

  await reloadPrototype(page, webBase);
  await openAiInboxModule(page);

  await page.evaluate(() => {
    const button = document.querySelector('#aiInboxPanel [data-ai-inbox-view="reviewed"]');
    if (!button) throw new Error("missing reviewed tab");
    button.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
  });

  const slowItem = page.locator(`#aiInboxPanel .ai-inbox-list-pane [data-ai-inbox-artifact-id="${slowFixture.artifactId}"]`);
  const fastItem = page.locator(`#aiInboxPanel .ai-inbox-list-pane [data-ai-inbox-artifact-id="${fastFixture.artifactId}"]`);
  await slowItem.waitFor();
  await fastItem.waitFor();

  await page.evaluate((artifactId) => {
    document
      .querySelector(`#aiInboxPanel .ai-inbox-list-pane [data-ai-inbox-artifact-id="${artifactId}"]`)
      ?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
  }, slowFixture.artifactId);
  await page.evaluate((artifactId) => {
    document
      .querySelector(`#aiInboxPanel .ai-inbox-list-pane [data-ai-inbox-artifact-id="${artifactId}"]`)
      ?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
  }, fastFixture.artifactId);

  await waitFor(async () => {
    const detailText = await page.locator("#aiInboxPanel .ai-inbox-detail-pane").textContent();
    assert.match(String(detailText || ""), new RegExp(escapeRegExp(fastFixture.suggestionId)));
    assert.doesNotMatch(String(detailText || ""), new RegExp(escapeRegExp(slowFixture.suggestionId)));
  }, 8000);

  await page.locator("#aiInboxSuggestionContentEditor").fill(JSON.stringify({ thesis: "Duplicate inbox click should still submit once." }, null, 2));
  const editButton = page.locator('#aiInboxPanel .ai-inbox-detail-pane [data-ai-inbox-suggestion-status="edited"]');
  const firstClick = editButton.click({ force: true });

  await waitFor(async () => {
    assert.equal(await editButton.isDisabled(), true);
  }, 4000);

  await editButton.click({ force: true, timeout: 250 }).catch(() => {});
  await firstClick;

  await waitFor(async () => {
    const suggestion = await fetchJson(apiBase, `/api/v1/ai-suggestions/${encodeURIComponent(fastFixture.suggestionId)}?canonical=true`);
    assert.equal(suggestion.status, 200);
    assert.equal(suggestion.json.item.status, "edited");
    assert.equal(
      suggestion.json.item.history.filter((entry) => entry.toStatus === "edited").length,
      1
    );
  }, 8000);

  assert.equal(editRequestCount, 1);
});

test("prototype AI inbox shows inline no-op UX for already adopted reviewed field suggestions without resubmitting", async (t) => {
  if (process.env.RUN_BROWSER_E2E !== "1") {
    t.skip("Set RUN_BROWSER_E2E=1 to enable browser e2e in local runs.");
    return;
  }

  const playwright = await optionalPlaywright(t);
  if (!playwright) return;

  const stack = await startPrototypeStack(t, playwright);
  if (!stack) return;
  const { apiBase, page, webBase } = stack;

  const fixture = await createAiFieldSuggestionFixture(apiBase, {
    title: "Inbox no-op reviewed adopt target",
    body: "Triggering adopt again from reviewed detail should no-op inline instead of resubmitting."
  });
  await adoptSuggestionAsDraftViaApi(apiBase, fixture);

  let adoptPostCount = 0;
  await page.route(`${apiBase}/api/v1/ai/inbox/${fixture.artifactId}/adopt-field-suggestion?canonical=true`, async (route, request) => {
    if (request.method() === "POST") adoptPostCount += 1;
    await route.continue();
  });

  await reloadPrototype(page, webBase);
  await openAiInboxModule(page);
  await filterAiInboxBySourceNote(page, fixture.noteId);
  await page.locator('#aiInboxPanel [data-ai-inbox-view="reviewed"]').click();

  const reviewedItem = page.locator(`#aiInboxPanel .ai-inbox-list-pane [data-ai-inbox-artifact-id="${fixture.artifactId}"]`);
  await reviewedItem.waitFor();
  await reviewedItem.click();

  await waitFor(async () => {
    const button = page.locator(`#aiInboxPanel .ai-inbox-detail-pane [data-ai-inbox-adopt-field="${fixture.artifactId}"]`);
    assert.equal(await button.isDisabled(), true);
  }, 8000);

  await page.evaluate((artifactId) => {
    const button = document.querySelector(`#aiInboxPanel .ai-inbox-detail-pane [data-ai-inbox-adopt-field="${artifactId}"]`);
    if (!button) throw new Error("missing adopt-field button");
    button.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
  }, fixture.artifactId);

  await waitFor(async () => {
    const detailText = await page.locator("#aiInboxPanel .ai-inbox-detail-pane").textContent();
    assert.match(String(detailText || ""), /This field suggestion is already Adopted as draft\./);
    assert.equal(await page.locator('#aiInboxPanel .ai-inbox-detail-pane [data-ai-inbox-action-notice="true"]').count(), 1);
  }, 8000);

  assert.equal(adoptPostCount, 0);
  const suggestion = await fetchJson(apiBase, `/api/v1/ai-suggestions/${encodeURIComponent(fixture.suggestionId)}?canonical=true`);
  assert.equal(suggestion.status, 200);
  assert.equal(suggestion.json.item.status, "adopted_as_draft");
});

test("prototype settings AI suggestions panel edits confirms and rejects suggestions through the real review flow", async (t) => {
  if (process.env.RUN_BROWSER_E2E !== "1") {
    t.skip("Set RUN_BROWSER_E2E=1 to enable browser e2e in local runs.");
    return;
  }

  const playwright = await optionalPlaywright(t);
  if (!playwright) return;

  const stack = await startPrototypeStack(t, playwright);
  if (!stack) return;
  const { apiBase, page, webBase } = stack;

  const editableFixture = await createAiFieldSuggestionFixture(apiBase, {
    title: "Settings editable target",
    body: "This suggestion should be edited and then confirmed from settings."
  });
  await adoptSuggestionAsDraftViaApi(apiBase, editableFixture);

  const rejectFixture = await createAiFieldSuggestionFixture(apiBase, {
    title: "Settings reject target",
    body: "This suggestion should be rejected from settings."
  });
  const editedThesis = "Settings browser review produced the final user-owned thesis.";

  await reloadPrototype(page, webBase);
  await openSettingsModule(page);

  await filterAiSuggestionsByTarget(page, editableFixture.noteId);
  const editableRow = page.locator(`#settingsAiSuggestionsPanel .ai-inbox-list-pane [data-ai-suggestion-id="${editableFixture.suggestionId}"]`);
  await editableRow.waitFor();
  await editableRow.click();

  await waitFor(async () => {
    assert.equal(await page.locator("#aiSuggestionContentEditor").isVisible(), true);
    const detailText = await page.locator("#settingsAiSuggestionsPanel .ai-inbox-detail-pane").textContent();
    assert.match(String(detailText || ""), /Adopted as draft/);
  }, 8000);

  await page.locator("#aiSuggestionContentEditor").fill(JSON.stringify({ thesis: editedThesis }, null, 2));
  await page.locator('#settingsAiSuggestionsPanel .ai-inbox-detail-pane [data-ai-suggestion-status="edited"]').click();

  await waitFor(async () => {
    const suggestion = await fetchJson(apiBase, `/api/v1/ai-suggestions/${encodeURIComponent(editableFixture.suggestionId)}?canonical=true`);
    assert.equal(suggestion.status, 200);
    assert.equal(suggestion.json.item.status, "edited");
    assert.equal(suggestionFieldValue(suggestion.json.item.content, editableFixture.targetField), editedThesis);
  }, 8000);

  await page.locator("#aiSuggestionContentEditor").fill(JSON.stringify({ thesis: editedThesis }, null, 2));
  const firstConfirmButton = page.locator('#settingsAiSuggestionsPanel .ai-inbox-detail-pane [data-ai-suggestion-status="confirmed"]');
  await waitFor(async () => {
    assert.equal(await firstConfirmButton.isEnabled(), true);
  }, 8000);
  await firstConfirmButton.click({ force: true });

  await waitFor(async () => {
    const suggestion = await fetchJson(apiBase, `/api/v1/ai-suggestions/${encodeURIComponent(editableFixture.suggestionId)}?canonical=true`);
    assert.equal(suggestion.status, 200);
    assert.equal(suggestion.json.item.status, "confirmed");
    assert.equal(suggestionFieldValue(suggestion.json.item.content, editableFixture.targetField), editedThesis);
  }, 8000);

  await filterAiSuggestionsByTarget(page, rejectFixture.noteId);
  const rejectRow = page.locator(`#settingsAiSuggestionsPanel .ai-inbox-list-pane [data-ai-suggestion-id="${rejectFixture.suggestionId}"]`);
  await rejectRow.waitFor();
  await rejectRow.click();
  await page.locator('#settingsAiSuggestionsPanel .ai-inbox-detail-pane [data-ai-suggestion-status="rejected"]').click();

  await waitFor(async () => {
    const suggestion = await fetchJson(apiBase, `/api/v1/ai-suggestions/${encodeURIComponent(rejectFixture.suggestionId)}?canonical=true`);
    assert.equal(suggestion.status, 200);
    assert.equal(suggestion.json.item.status, "rejected");
  }, 8000);

  await waitFor(async () => {
    const detailText = await page.locator("#settingsAiSuggestionsPanel .ai-inbox-detail-pane").textContent();
    assert.match(String(detailText || ""), /Rejected/);
  }, 8000);
});

test("prototype settings AI suggestions guards stale detail selection and duplicate review submits", async (t) => {
  if (process.env.RUN_BROWSER_E2E !== "1") {
    t.skip("Set RUN_BROWSER_E2E=1 to enable browser e2e in local runs.");
    return;
  }

  const playwright = await optionalPlaywright(t);
  if (!playwright) return;

  const stack = await startPrototypeStack(t, playwright);
  if (!stack) return;
  const { apiBase, page, webBase } = stack;

  const slowFixture = await createAiFieldSuggestionFixture(apiBase, {
    title: "Settings stale selection slow target",
    body: "The first detail request should resolve too late and must not overwrite the second selection."
  });
  const fastFixture = await createAiFieldSuggestionFixture(apiBase, {
    title: "Settings stale selection fast target",
    body: "The second detail request should win and stay visible."
  });
  await adoptSuggestionAsDraftViaApi(apiBase, slowFixture);
  await adoptSuggestionAsDraftViaApi(apiBase, fastFixture);

  let delayedSlowDetail = false;
  await page.route(`${apiBase}/api/v1/ai-suggestions/${slowFixture.suggestionId}?canonical=true`, async (route) => {
    if (!delayedSlowDetail) {
      delayedSlowDetail = true;
      await new Promise((resolve) => setTimeout(resolve, 700));
    }
    await route.continue();
  });

  let editRequestCount = 0;
  await page.route(`${apiBase}/api/v1/ai-suggestions/${fastFixture.suggestionId}?canonical=true`, async (route, request) => {
    if (request.method() === "PATCH") {
      editRequestCount += 1;
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    await route.continue();
  });

  await reloadPrototype(page, webBase);
  await openSettingsModule(page);

  const slowRow = page.locator(`#settingsAiSuggestionsPanel .ai-inbox-list-pane [data-ai-suggestion-id="${slowFixture.suggestionId}"]`);
  const fastRow = page.locator(`#settingsAiSuggestionsPanel .ai-inbox-list-pane [data-ai-suggestion-id="${fastFixture.suggestionId}"]`);
  await slowRow.waitFor();
  await fastRow.waitFor();

  await slowRow.click();
  await fastRow.click();

  await waitFor(async () => {
    const detailText = await page.locator("#settingsAiSuggestionsPanel .ai-inbox-detail-pane").textContent();
    assert.match(String(detailText || ""), new RegExp(escapeRegExp(fastFixture.noteId)));
    assert.doesNotMatch(String(detailText || ""), new RegExp(escapeRegExp(slowFixture.noteId)));
  }, 8000);

  await page.locator("#aiSuggestionContentEditor").fill(JSON.stringify({ thesis: "Duplicate click should still submit once." }, null, 2));
  const editButton = page.locator('#settingsAiSuggestionsPanel .ai-inbox-detail-pane [data-ai-suggestion-status="edited"]');
  const firstClick = editButton.click();

  await waitFor(async () => {
    assert.equal(await editButton.isDisabled(), true);
  }, 4000);

  await editButton.click({ timeout: 250 }).catch(() => {});
  await firstClick;

  await waitFor(async () => {
    const suggestion = await fetchJson(apiBase, `/api/v1/ai-suggestions/${encodeURIComponent(fastFixture.suggestionId)}?canonical=true`);
    assert.equal(suggestion.status, 200);
    assert.equal(suggestion.json.item.status, "edited");
    assert.equal(
      suggestion.json.item.history.filter((entry) => entry.toStatus === "edited").length,
      1
    );
  }, 8000);

  assert.equal(editRequestCount, 1);
});

test("prototype settings AI suggestions review-action continuity keeps detail aligned with filtered selection changes", async (t) => {
  if (process.env.RUN_BROWSER_E2E !== "1") {
    t.skip("Set RUN_BROWSER_E2E=1 to enable browser e2e in local runs.");
    return;
  }

  const playwright = await optionalPlaywright(t);
  if (!playwright) return;

  const stack = await startPrototypeStack(t, playwright);
  if (!stack) return;
  const { apiBase, page, webBase } = stack;

  const firstEditedFixture = await createAiFieldSuggestionFixture(apiBase, {
    title: "Settings filtered continuity first edited target",
    body: "Confirming this edited suggestion should move selection to the next filtered suggestion."
  });
  await adoptSuggestionAsDraftViaApi(apiBase, firstEditedFixture);
  await markSuggestionEditedViaApi(apiBase, firstEditedFixture, "First edited fixture should leave the edited filter after confirm.");

  const secondEditedFixture = await createAiFieldSuggestionFixture(apiBase, {
    title: "Settings filtered continuity second edited target",
    body: "This edited suggestion should become the next visible detail after the first one is confirmed."
  });
  await adoptSuggestionAsDraftViaApi(apiBase, secondEditedFixture);
  await markSuggestionEditedViaApi(apiBase, secondEditedFixture, "Second edited fixture should stay visible in the edited filter.");

  const loneEditedFixture = await createAiFieldSuggestionFixture(apiBase, {
    title: "Settings filtered continuity lone edited target",
    body: "Confirming the last edited suggestion should clear the filtered list and detail."
  });
  await adoptSuggestionAsDraftViaApi(apiBase, loneEditedFixture);
  await markSuggestionEditedViaApi(apiBase, loneEditedFixture, "Lone edited fixture should empty the edited filter after confirm.");

  await reloadPrototype(page, webBase);
  await openSettingsModule(page);

  await filterAiSuggestionsByStatus(page, "edited");
  const firstEditedRow = page.locator(
    `#settingsAiSuggestionsPanel .ai-inbox-list-pane [data-ai-suggestion-id="${firstEditedFixture.suggestionId}"]`
  );
  await firstEditedRow.waitFor();
  await firstEditedRow.click({ force: true });

  await waitFor(async () => {
    const detailText = await page.locator("#settingsAiSuggestionsPanel .ai-inbox-detail-pane").textContent();
    assert.match(String(detailText || ""), new RegExp(escapeRegExp(firstEditedFixture.noteId)));
    assert.match(String(detailText || ""), /Confirm/);
    assert.equal(await page.locator("#aiSuggestionContentEditor").isVisible(), true);
  }, 8000);

  const loneConfirmButton = page.locator('#settingsAiSuggestionsPanel .ai-inbox-detail-pane [data-ai-suggestion-status="confirmed"]:visible');
  await waitFor(async () => {
    assert.equal(await loneConfirmButton.isEnabled(), true);
  }, 8000);
  await loneConfirmButton.click({ force: true });

  await waitFor(async () => {
    const suggestion = await fetchJson(
      apiBase,
      `/api/v1/ai-suggestions/${encodeURIComponent(firstEditedFixture.suggestionId)}?canonical=true`
    );
    assert.equal(suggestion.status, 200);
    assert.equal(suggestion.json.item.status, "confirmed");
  }, 8000);

  await waitFor(async () => {
    const detailText = await page.locator("#settingsAiSuggestionsPanel .ai-inbox-detail-pane").textContent();
    assert.doesNotMatch(String(detailText || ""), new RegExp(escapeRegExp(firstEditedFixture.noteId)));
    const switchedToRemainingSuggestion =
      new RegExp(escapeRegExp(secondEditedFixture.noteId)).test(String(detailText || "")) ||
      new RegExp(escapeRegExp(loneEditedFixture.noteId)).test(String(detailText || ""));
    assert.equal(switchedToRemainingSuggestion, true);
  }, 8000);

  await waitFor(async () => {
    assert.equal(await firstEditedRow.count(), 0);
    const activeRows = await page.locator("#settingsAiSuggestionsPanel .ai-inbox-list-pane .ai-inbox-item.is-active").count();
    assert.equal(activeRows >= 1, true);
  }, 8000);

  await filterAiSuggestionsByTarget(page, loneEditedFixture.noteId);
  const loneEditedRow = page.locator(
    `#settingsAiSuggestionsPanel .ai-inbox-list-pane [data-ai-suggestion-id="${loneEditedFixture.suggestionId}"]`
  );

  await waitFor(async () => {
    const listText = await page.locator("#settingsAiSuggestionsPanel .ai-inbox-list-pane").textContent();
    assert.match(String(listText || ""), new RegExp(escapeRegExp(loneEditedFixture.noteId)));
    assert.doesNotMatch(String(listText || ""), new RegExp(escapeRegExp(secondEditedFixture.noteId)));
    assert.equal(await loneEditedRow.count(), 1);
  }, 8000);

  await loneEditedRow.first().click({ force: true });

  await waitFor(async () => {
    const className = await loneEditedRow.first().getAttribute("class");
    assert.match(String(className || ""), /is-active/);
  }, 8000);

  await waitFor(async () => {
    const detailText = await page.locator("#settingsAiSuggestionsPanel .ai-inbox-detail-pane").textContent();
    assert.match(String(detailText || ""), new RegExp(escapeRegExp(loneEditedFixture.noteId)));
  }, 8000);

  await page.locator('#settingsAiSuggestionsPanel .ai-inbox-detail-pane [data-ai-suggestion-status="confirmed"]').click({ force: true });

  await waitFor(async () => {
    const suggestion = await fetchJson(
      apiBase,
      `/api/v1/ai-suggestions/${encodeURIComponent(loneEditedFixture.suggestionId)}?canonical=true`
    );
    assert.equal(suggestion.status, 200);
    assert.equal(suggestion.json.item.status, "confirmed");
  }, 8000);

  await waitFor(async () => {
    const listText = await page.locator("#settingsAiSuggestionsPanel .ai-inbox-list-pane").textContent();
    const detailText = await page.locator("#settingsAiSuggestionsPanel .ai-inbox-detail-pane").textContent();
    assert.match(String(listText || ""), /No AI suggestions match these filters/);
    assert.match(String(detailText || ""), /Pick a suggestion to inspect its target, content, and review history/);
    assert.doesNotMatch(String(detailText || ""), /Loading suggestion detail/);
    assert.doesNotMatch(String(detailText || ""), new RegExp(escapeRegExp(loneEditedFixture.noteId)));
  }, 8000);
});
