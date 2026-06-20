import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import http from "node:http";
import net from "node:net";
import os from "node:os";
import path from "node:path";
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

async function startManifestServer(manifest) {
  const server = http.createServer((req, res) => {
    if (req.url === "/update.json") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(manifest));
      return;
    }
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "manifest unavailable" }));
  });
  await new Promise((resolve, reject) => {
    server.on("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  const port = typeof address === "object" ? address.port : 0;
  return {
    url: `http://127.0.0.1:${port}/update.json`,
    failingUrl: `http://127.0.0.1:${port}/missing.json`,
    close: () => server.close()
  };
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

test("app update API checks configured manifest and keeps API healthy after failures", async (t) => {
  const vaultPath = await makeTempDir("yansilu-app-update-vault-");
  const port = await findFreePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const manifestServer = await startManifestServer({
    version: "0.1.2",
    releaseDate: "2026-06-20",
    channel: "beta",
    changelog: ["Critical update smoke test."],
    downloadUrl: "https://example.test/yansilu-0.1.2.exe",
    minimumSupportedVersion: "0.1.1-beta.1",
    critical: true,
    checksum: { algorithm: "sha256", value: "abc123" }
  });

  const child = spawn(process.execPath, ["apps/api/src/server.mjs"], {
    cwd: REPO_ROOT,
    env: {
      ...process.env,
      API_PORT: String(port),
      VAULT_PATH: vaultPath,
      YANSILU_UPDATE_MANIFEST_URL: manifestServer.url
    },
    stdio: ["ignore", "pipe", "pipe"]
  });

  t.after(() => child.kill());
  t.after(() => manifestServer.close());
  await waitForHealth(baseUrl);

  const version = await getJson(baseUrl, "/api/v1/app/version");
  assert.equal(version.status, 200, JSON.stringify(version.json));
  assert.equal(version.json.item.version, "0.1.1-beta.1");
  assert.equal(version.json.item.manifestUrl, manifestServer.url);

  const checked = await postJson(baseUrl, "/api/v1/app/updates/check", {});
  assert.equal(checked.status, 200, JSON.stringify(checked.json));
  assert.equal(checked.json.item.status, "update-available");
  assert.equal(checked.json.item.latestVersion, "0.1.2");
  assert.equal(checked.json.item.critical, true);
  assert.equal(checked.json.item.manifest.checksum.value, "abc123");

  const failed = await postJson(baseUrl, "/api/v1/app/updates/check", {
    manifestUrl: manifestServer.failingUrl
  });
  assert.equal(failed.status, 200, JSON.stringify(failed.json));
  assert.equal(failed.json.item.status, "failed");
  assert.equal(failed.json.item.error.code, "UPDATE_MANIFEST_FETCH_FAILED");

  const health = await getJson(baseUrl, "/health");
  assert.equal(health.status, 200, JSON.stringify(health.json));
  assert.equal(health.json.service, "api");
});
