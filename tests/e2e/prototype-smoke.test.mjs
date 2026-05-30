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

async function postJson(baseUrl, pathname, body) {
  const res = await fetch(`${baseUrl}${pathname}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const json = await res.json();
  return { status: res.status, json };
}

test("prototype web server loads against a real API service", async (t) => {
  const vaultPath = await makeTempDir("yansilu-e2e-vault-");
  const directoryRoot = path.join(vaultPath, "notes", "original", "yansilu-e2e-dirs");
  const apiPort = await findFreePort();
  const webPort = await findFreePort();
  const apiBase = `http://127.0.0.1:${apiPort}`;
  const webBase = `http://127.0.0.1:${webPort}`;

  const api = spawn(process.execPath, ["apps/api/src/server.mjs"], {
    cwd: REPO_ROOT,
    env: {
      ...process.env,
      API_PORT: String(apiPort),
      WEB_PORT: String(webPort),
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
  const webHealth = await waitForJsonHealth(`${webBase}/health`);
  assert.equal(webHealth.apiBase, apiBase);

  const apiRoot = await fetch(`${apiBase}/`);
  assert.equal(apiRoot.status, 200);
  const apiRootHtml = await apiRoot.text();
  assert.match(apiRootHtml, /研思录开发服务已启动/);
  assert.match(apiRootHtml, new RegExp(`http://127\\.0\\.0\\.1:${webPort}/prototype`));

  const page = await fetch(`${webBase}/prototype`);
  assert.equal(page.status, 200);
  const html = await page.text();
  assert.ok(html.includes(`window.__API_BASE__ = "${apiBase}"`));
  assert.match(html, /prototype-app\.js/);
  assert.match(html, /id="importPageMount"/);
  assert.match(html, /id="exportTargetPath"/);
  assert.match(html, /id="btnExportMarkdown"/);
  assert.match(html, /id="writingPanel"/);
  assert.match(html, /id="btnWritingCreateProject"/);
  assert.match(html, /id="btnWritingCreateScaffold"/);
  assert.match(html, /id="literatureWorkspace"/);
  assert.match(html, /id="literatureQueueSummary"/);
  assert.match(html, /id="literatureQueueList"/);
  assert.match(html, /id="btnLiteratureOpenNext"/);
  assert.match(html, /id="btnFocusMode"/);
  assert.match(html, /id="editorIntentNote"/);
  assert.match(html, /id="originalityNotice"/);
  assert.match(html, /id="editorHelper"/);

  const createdDirectory = await postJson(apiBase, "/api/v1/directories", {
    title: "e2e-directory",
    parentDirectoryId: "dir_original_default",
    directoryType: "custom",
    fsPath: path.join(directoryRoot, "e2e-directory"),
    maxNotes: 500
  });
  assert.equal(createdDirectory.status, 201);

  const createdNote = await postJson(apiBase, "/api/v1/notes", {
    directoryId: createdDirectory.json.item.id,
    body: "# E2E smoke note\n\nCreated through the same API used by the prototype."
  });
  assert.equal(createdNote.status, 201);
  assert.equal(createdNote.json.item.title, "E2E smoke note");
});
