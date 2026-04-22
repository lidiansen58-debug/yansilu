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

async function waitForHealth(baseUrl) {
  const deadline = Date.now() + 5000;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${baseUrl}/health`);
      if (res.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 80));
  }
  throw new Error("API server did not become healthy");
}

async function getJson(baseUrl, pathname) {
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

async function deleteJson(baseUrl, pathname) {
  const res = await fetch(`${baseUrl}${pathname}`, { method: "DELETE" });
  const json = await res.json();
  return { status: res.status, json };
}

test("directories API initializes defaults and persists newly created directory", async (t) => {
  const vaultPath = await makeTempDir("yansilu-api-dirs-vault-");
  const targetPath = await makeTempDir("yansilu-api-dirs-target-");
  const port = await findFreePort();
  const baseUrl = `http://127.0.0.1:${port}`;

  const child = spawn(process.execPath, ["apps/api/src/server.mjs"], {
    cwd: REPO_ROOT,
    env: {
      ...process.env,
      API_PORT: String(port),
      VAULT_PATH: vaultPath
    },
    stdio: ["ignore", "pipe", "pipe"]
  });

  t.after(() => child.kill());
  await waitForHealth(baseUrl);

  const initial = await getJson(baseUrl, "/api/v1/directories");
  assert.equal(initial.status, 200);
  assert.ok(initial.json.total >= 3);
  const initialIds = new Set(initial.json.items.map((x) => x.id));
  assert.equal(initialIds.has("dir_fleeting_default"), true);
  assert.equal(initialIds.has("dir_literature_default"), true);
  assert.equal(initialIds.has("dir_original_default"), true);

  const created = await postJson(baseUrl, "/api/v1/directories", {
    title: "写作方法",
    parentDirectoryId: "dir_original_default",
    directoryType: "custom",
    fsPath: path.join(targetPath, "写作方法"),
    maxNotes: 700
  });
  assert.equal(created.status, 201);
  assert.equal(created.json.item.title, "写作方法");
  assert.equal(created.json.item.parentDirectoryId, "dir_original_default");
  assert.equal(created.json.item.maxNotes, 700);

  await fs.access(created.json.item.fsPath);

  const after = await getJson(baseUrl, "/api/v1/directories");
  assert.equal(after.status, 200);
  const byId = new Map(after.json.items.map((x) => [x.id, x]));
  assert.ok(byId.has(created.json.item.id));

  const patched = await patchJson(baseUrl, `/api/v1/directories/${encodeURIComponent(created.json.item.id)}`, {
    title: "write-method-updated",
    maxNotes: 650
  });
  assert.equal(patched.status, 200);
  assert.equal(patched.json.item.title, "write-method-updated");
  assert.equal(patched.json.item.maxNotes, 650);

  const removed = await deleteJson(baseUrl, `/api/v1/directories/${encodeURIComponent(created.json.item.id)}`);
  assert.equal(removed.status, 200);

  const finalList = await getJson(baseUrl, "/api/v1/directories");
  assert.equal(finalList.status, 200);
  const finalIds = new Set(finalList.json.items.map((x) => x.id));
  assert.equal(finalIds.has(created.json.item.id), false);
});
