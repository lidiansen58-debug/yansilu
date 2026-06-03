import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const FIXTURES_ROOT = path.join(REPO_ROOT, "tests", "fixtures", "imports");

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

async function waitForHealth(baseUrl) {
  const deadline = Date.now() + 5000;
  let lastError;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${baseUrl}/health`);
      if (response.ok) return;
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw lastError || new Error("API did not become healthy");
}

async function postJson(baseUrl, pathname, body) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
  const payload = await response.json();
  return { response, payload };
}

function startApi(port, vaultPath) {
  const child = spawn(process.execPath, ["apps/api/src/server.mjs"], {
    cwd: REPO_ROOT,
    env: {
      ...process.env,
      API_PORT: String(port),
      VAULT_PATH: vaultPath
    },
    stdio: ["ignore", "pipe", "pipe"]
  });

  child.stdout.on("data", () => {});
  child.stderr.on("data", () => {});
  return child;
}

async function stopApi(child) {
  if (!child || child.exitCode !== null) return;
  child.kill();
  await new Promise((resolve) => child.once("exit", resolve));
}

test("simplified Obsidian import preview, confirm, and export works end-to-end", async () => {
  const vaultPath = await makeTempDir("yansilu-simplified-import-vault-");
  const exportPath = await makeTempDir("yansilu-simplified-export-path-");
  const fixturePath = path.join(FIXTURES_ROOT, "obsidian-realistic-vault");
  const port = await findFreePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const api = startApi(port, vaultPath);

  try {
    await waitForHealth(baseUrl);

    const preview = await postJson(baseUrl, "/api/v1/imports/preview", {
      connector: "obsidian",
      payload: { path: fixturePath },
      options: { detectWikilinks: true }
    });

    assert.equal(preview.response.status, 200, JSON.stringify(preview.payload));
    assert.equal(preview.payload.connector, "obsidian");
    assert.equal(preview.payload.status, "preview");
    assert.deepEqual(preview.payload.summary, {
      sources: 2,
      literatureNotes: 2,
      permanentNotes: 1,
      warnings: 0
    });

    const confirm = await postJson(baseUrl, `/api/v1/imports/${preview.payload.importRecordId}/confirm`, {
      confirm: true,
      directoryId: "dir_literature_default"
    });

    assert.equal(confirm.response.status, 200, JSON.stringify(confirm.payload));
    assert.equal(confirm.payload.status, "completed");
    assert.deepEqual(confirm.payload.result.created, {
      sources: 2,
      literatureNotes: 2,
      permanentNotes: 1
    });
    assert.ok(confirm.payload.result.createdFiles.some((item) => item.noteType === "asset"));

    const literatureFile = confirm.payload.result.createdFiles.find((item) => item.noteType === "literature");
    const literatureMarkdown = await fs.readFile(path.join(vaultPath, literatureFile.path), "utf8");
    assert.match(literatureMarkdown, /!\[]\(<\.\.\/\.\.\/assets\/imports\//);

    const exportResult = await postJson(baseUrl, "/api/v1/exports/markdown", {
      targetPath: exportPath,
      directoryId: "dir_original_default"
    });

    assert.equal(exportResult.response.status, 202, JSON.stringify(exportResult.payload));
    assert.equal(exportResult.payload.status, "queued");
    assert.equal(exportResult.payload.copied, 1);

    const exportedFiles = await fs.readdir(exportPath, { recursive: true });
    assert.ok(exportedFiles.some((name) => String(name).endsWith(".md")));
  } finally {
    await stopApi(api);
  }
});
