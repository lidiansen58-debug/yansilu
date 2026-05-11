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

test("vault API initializes default vault and can switch active vault path", async (t) => {
  const defaultVaultPath = await makeTempDir("yansilu-default-vault-");
  const nextVaultPath = path.join(await makeTempDir("yansilu-selected-vault-parent-"), "selected-vault");
  const port = await findFreePort();
  const baseUrl = `http://127.0.0.1:${port}`;

  const child = spawn(process.execPath, ["apps/api/src/server.mjs"], {
    cwd: REPO_ROOT,
    env: {
      ...process.env,
      API_PORT: String(port),
      VAULT_PATH: defaultVaultPath
    },
    stdio: ["ignore", "pipe", "pipe"]
  });

  t.after(() => child.kill());
  await waitForHealth(baseUrl);

  const initial = await getJson(baseUrl, "/api/v1/vault");
  assert.equal(initial.status, 200, JSON.stringify(initial.json));
  assert.equal(path.resolve(initial.json.item.vaultPath), path.resolve(defaultVaultPath));
  assert.equal(initial.json.item.initialized, true);
  await fs.access(path.join(defaultVaultPath, ".yansilu", "vault.json"));

  const switched = await postJson(baseUrl, "/api/v1/vault", { vaultPath: nextVaultPath });
  assert.equal(switched.status, 200, JSON.stringify(switched.json));
  assert.equal(path.resolve(switched.json.item.vaultPath), path.resolve(nextVaultPath));
  assert.equal(switched.json.item.initialized, true);
  await fs.access(path.join(nextVaultPath, ".yansilu", "vault.json"));

  const health = await getJson(baseUrl, "/health");
  assert.equal(health.status, 200);
  assert.equal(path.resolve(health.json.vaultPath), path.resolve(nextVaultPath));

  const directories = await getJson(baseUrl, "/api/v1/directories");
  assert.equal(directories.status, 200);
  assert.ok(directories.json.items.some((item) => item.id === "dir_original_default"));
});

test("AI preferences API previews the effective model route", async (t) => {
  const vaultPath = await makeTempDir("yansilu-ai-route-preview-vault-");
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

  const initial = await getJson(baseUrl, "/api/v1/ai/route-preview");
  assert.equal(initial.status, 200, JSON.stringify(initial.json));
  assert.equal(initial.json.item.userMode, "Auto");
  assert.equal(initial.json.item.provider.providerId, "platform_managed_openai");
  assert.equal(initial.json.item.access.keyMode, "platform_managed");

  const saved = await postJson(baseUrl, "/api/v1/ai/preferences", {
    userMode: "Local / Private",
    advancedSettings: { modelRef: "local_private_gateway:manual-model" }
  });
  assert.equal(saved.status, 200, JSON.stringify(saved.json));

  const preview = await postJson(baseUrl, "/api/v1/ai/route-preview", {});
  assert.equal(preview.status, 200, JSON.stringify(preview.json));
  assert.equal(preview.json.item.userMode, "Local / Private");
  assert.equal(preview.json.item.provider.providerId, "local_private_gateway");
  assert.equal(preview.json.item.route.modelRef, "local_private_gateway:manual-model");
  assert.equal(preview.json.item.route.advancedOverride, true);
  assert.equal(preview.json.item.route.localOnly, true);
  assert.equal(preview.json.item.access.keyMode, "no_key");
});
