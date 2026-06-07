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

async function optionalPlaywright(t) {
  try {
    return await import("playwright");
  } catch {
    t.skip("Playwright is not installed; run npm install -D playwright and playwright install chromium to enable browser e2e.");
    return null;
  }
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

async function startPrototypeStack(t, playwright) {
  const vaultPath = await makeTempDir("yansilu-inline-error-e2e-vault-");
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
  await page.goto(`${webBase}/prototype`, { waitUntil: "domcontentloaded" });
  await waitForPrototypeReady(page);

  return { apiBase, webBase, page };
}

async function reloadPrototype(page, webBase) {
  await page.goto(`${webBase}/prototype`, { waitUntil: "domcontentloaded" });
  await waitForPrototypeReady(page);
}

async function createAiFieldSuggestionFixture(baseUrl, options = {}) {
  const title = String(options.title || "AI review fixture").trim();
  const body = String(options.body || "This note should produce a reviewable thesis suggestion for browser coverage.").trim();
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
    artifactId: artifact.id,
    suggestionId
  };
}

async function adoptSuggestionAsDraftViaApi(baseUrl, fixture) {
  const adopted = await postJson(
    baseUrl,
    `/api/v1/ai/inbox/${encodeURIComponent(fixture.artifactId)}/adopt-field-suggestion`,
    { confirm: true, comment: "Adopted through test setup." }
  );
  assert.equal(adopted.status, 200, JSON.stringify(adopted.json));
  assert.equal(adopted.json.item.status, "adopted_as_draft");
}

async function openAiInboxModule(page) {
  await page.locator('.rail-btn[data-module="aiInbox"]').click();
  await waitFor(async () => {
    assert.equal(await page.evaluate(() => window.__prototypeState?.module || ""), "aiInbox");
    assert.equal(await page.locator("#aiInboxPanel").isVisible(), true);
  }, 5000);
}

function settingsPaneId(section = "workspace") {
  const normalized = String(section || "workspace").trim() || "workspace";
  return `#settingsPane${normalized.slice(0, 1).toUpperCase()}${normalized.slice(1)}`;
}

async function openSettingsModule(page, section = "workspace") {
  await page.locator('.rail-btn[data-module="settings"]').click();
  await waitFor(async () => {
    assert.equal(await page.evaluate(() => window.__prototypeState?.module || ""), "settings");
    assert.equal(await page.locator("#settingsPanel").isVisible(), true);
  }, 5000);
  const normalizedSection = String(section || "workspace").trim() || "workspace";
  const navButton = page.locator(`#settingsSectionNav [data-settings-section="${normalizedSection}"]`);
  await navButton.click();
  await waitFor(async () => {
    assert.equal(await navButton.getAttribute("aria-pressed"), "true");
    assert.equal(await page.locator(settingsPaneId(normalizedSection)).isVisible(), true);
  }, 5000);
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

test("AI inbox inline error blocks invalid reviewed JSON submit without PATCH", async (t) => {
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
    const detailText = await page.locator("#aiInboxPanel .ai-inbox-detail-pane").textContent();
    assert.match(String(detailText || ""), /Adopted as draft/);
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
