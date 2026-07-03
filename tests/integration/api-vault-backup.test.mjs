import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
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

test("API creates encrypted backup and restores it to a new vault", async (t) => {
  try {
    await import("node:sqlite");
  } catch {
    t.skip("node:sqlite is not available in current runtime");
  }
  const vaultPath = await makeTempDir("yansilu-api-backup-vault-");
  const outputDir = await makeTempDir("yansilu-api-backup-output-");
  const restoreParent = await makeTempDir("yansilu-api-backup-restore-");
  const restoredVault = path.join(restoreParent, "restored-api-vault");
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
  t.after(() => fs.rm(vaultPath, { recursive: true, force: true }));
  t.after(() => fs.rm(outputDir, { recursive: true, force: true }));
  t.after(() => fs.rm(restoreParent, { recursive: true, force: true }));
  await waitForHealth(baseUrl);

  const first = await postJson(baseUrl, "/api/v1/notes", {
    directoryId: "dir_original_default",
    body: "# API backup source\n\nAPI encrypted backup unique content."
  });
  assert.equal(first.status, 201, JSON.stringify(first.json));
  const second = await postJson(baseUrl, "/api/v1/notes", {
    directoryId: "dir_original_default",
    body: "# API backup target\n\nTarget content."
  });
  assert.equal(second.status, 201, JSON.stringify(second.json));
  const relation = await postJson(baseUrl, `/api/v1/notes/${encodeURIComponent(first.json.item.id)}/relations`, {
    toNoteId: second.json.item.id,
    relationType: "supports",
    rationale: "API backup relation survives restore.",
    status: "confirmed"
  });
  assert.equal(relation.status, 201, JSON.stringify(relation.json));

  const backup = await postJson(baseUrl, "/api/v1/vault/backups", {
    targetDirectory: outputDir,
    password: "api backup password"
  });
  assert.equal(backup.status, 201, JSON.stringify(backup.json));
  assert.match(backup.json.item.fileName, /^yansilu-backup-\d{8}-\d{6}\.yansilu-backup$/);
  await fs.access(backup.json.item.backupPath);

  const backupBytes = await fs.readFile(backup.json.item.backupPath);
  assert.equal(backupBytes.includes(Buffer.from("API encrypted backup unique content", "utf8")), false);

  const restore = await postJson(baseUrl, "/api/v1/vault/backups/restore", {
    backupPath: backup.json.item.backupPath,
    targetVaultPath: restoredVault,
    password: "api backup password"
  });
  assert.equal(restore.status, 201, JSON.stringify(restore.json));
  assert.equal(path.resolve(restore.json.item.vaultPath), path.resolve(restoredVault));

  const opened = await postJson(baseUrl, "/api/v1/vault", { vaultPath: restoredVault });
  assert.equal(opened.status, 200, JSON.stringify(opened.json));
  const restoredNote = await getJson(baseUrl, `/api/v1/notes/${encodeURIComponent(first.json.item.id)}`);
  assert.equal(restoredNote.status, 200, JSON.stringify(restoredNote.json));
  assert.match(restoredNote.json.item.body, /API encrypted backup unique content/);
  const restoredRelations = await getJson(baseUrl, `/api/v1/notes/${encodeURIComponent(first.json.item.id)}/relations`);
  assert.equal(restoredRelations.status, 200, JSON.stringify(restoredRelations.json));
  assert.equal(restoredRelations.json.item.outgoingLinks.length, 1);
  assert.equal(restoredRelations.json.item.outgoingLinks[0].toNoteId, second.json.item.id);
});
