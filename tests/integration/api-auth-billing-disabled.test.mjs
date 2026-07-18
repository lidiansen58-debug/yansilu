import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..", "..");

async function findFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
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
      const response = await fetch(`${baseUrl}/health`);
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 80));
  }
  throw new Error("API server did not become healthy");
}

test("account and billing APIs remain unavailable without deleting legacy state", async (t) => {
  const vaultPath = await fs.mkdtemp(path.join(os.tmpdir(), "yansilu-no-auth-vault-"));
  const legacyStatePath = path.join(vaultPath, ".yansilu", "auth-state.json");
  await fs.mkdir(path.dirname(legacyStatePath), { recursive: true });
  await fs.writeFile(legacyStatePath, JSON.stringify({ users: [{ email: "legacy@example.test" }] }), "utf8");
  const port = await findFreePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const child = spawn(process.execPath, ["apps/api/src/server.mjs"], {
    cwd: REPO_ROOT,
    env: { ...process.env, API_PORT: String(port), VAULT_PATH: vaultPath },
    stdio: ["ignore", "pipe", "pipe"]
  });

  t.after(() => child.kill());
  await waitForHealth(baseUrl);
  assert.deepEqual(JSON.parse(await fs.readFile(legacyStatePath, "utf8")), {
    users: [{ email: "legacy@example.test" }]
  });

  const routes = [
    ["POST", "/api/v1/auth/start"],
    ["POST", "/api/v1/auth/verify"],
    ["POST", "/api/v1/auth/logout"],
    ["GET", "/api/v1/me"],
    ["GET", "/api/v1/billing/status"],
    ["POST", "/api/v1/billing/checkout-session"],
    ["POST", "/api/v1/billing/portal-session"],
    ["POST", "/api/v1/billing/mock-complete"],
    ["POST", "/api/v1/billing/webhook/stripe"]
  ];

  for (const [method, pathname] of routes) {
    const response = await fetch(`${baseUrl}${pathname}`, {
      method,
      headers: method === "POST" ? { "Content-Type": "application/json" } : undefined,
      body: method === "POST" ? "{}" : undefined
    });
    const payload = await response.json();
    assert.equal(response.status, 404, `${method} ${pathname}`);
    assert.equal(payload.error.code, "NOT_FOUND", `${method} ${pathname}`);
  }

  const switchedVaultPath = await fs.mkdtemp(path.join(os.tmpdir(), "yansilu-no-auth-switched-vault-"));
  const switchedLegacyStatePath = path.join(switchedVaultPath, ".yansilu", "auth-state.json");
  await fs.mkdir(path.dirname(switchedLegacyStatePath), { recursive: true });
  await fs.writeFile(switchedLegacyStatePath, JSON.stringify({ sessions: [{ token: "legacy-token" }] }), "utf8");

  const switched = await fetch(`${baseUrl}/api/v1/vault`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ vaultPath: switchedVaultPath })
  });
  assert.equal(switched.status, 200, await switched.text());
  assert.deepEqual(JSON.parse(await fs.readFile(switchedLegacyStatePath, "utf8")), {
    sessions: [{ token: "legacy-token" }]
  });
});
