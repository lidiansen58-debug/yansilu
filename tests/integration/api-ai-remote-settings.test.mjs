import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import https from "node:https";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn, execFileSync } from "node:child_process";
import { once } from "node:events";

function testOpenSsl() {
  if (process.env.OPENSSL_BIN) return process.env.OPENSSL_BIN;
  try { execFileSync("openssl", ["version"], { stdio: "ignore" }); return "openssl"; } catch {}
  if (process.platform === "win32") {
    const git = execFileSync("where.exe", ["git"], { encoding: "utf8" }).trim().split(/\r?\n/)[0];
    const candidate = path.resolve(path.dirname(git), "../usr/bin/openssl.exe");
    execFileSync(candidate, ["version"], { stdio: "ignore" });
    return candidate;
  }
  throw new Error("OpenSSL is required for the HTTPS provider fixture");
}

test("remote AI settings test, persist, reload and cleared-key failure use real HTTP", async () => {
  const vault = await fs.mkdtemp(path.join(os.tmpdir(), "yansilu-ai-remote-settings-"));
  const certPath = path.join(vault, "test-cert.pem");
  const keyPath = path.join(vault, "test-key.pem");
  const openssl = testOpenSsl();
  execFileSync(openssl, ["req", "-x509", "-newkey", "rsa:2048", "-nodes", "-keyout", keyPath,
    "-out", certPath, "-days", "1", "-subj", "/CN=localhost", "-addext", "subjectAltName=IP:127.0.0.1,DNS:localhost"], { stdio: "ignore" });
  let calls = 0;
  const provider = https.createServer({ key: await fs.readFile(keyPath), cert: await fs.readFile(certPath) }, async (req, res) => {
    let raw = "";
    for await (const chunk of req) raw += chunk;
    calls++;
    res.setHeader("content-type", "application/json");
    if (req.headers.authorization !== "Bearer synthetic-key") {
      res.writeHead(401);
      res.end(JSON.stringify({ error: { code: "invalid_api_key", message: "Synthetic authentication failed" } }));
      return;
    }
    const body = JSON.parse(raw);
    assert.equal(body.model, "synthetic-model");
    res.end(JSON.stringify({ id: "synthetic", model: body.model, choices: [{ index: 0, finish_reason: "stop", message: { role: "assistant", content: "Synthetic connection ready" } }] }));
  });
  provider.listen(0, "127.0.0.1");
  await once(provider, "listening");
  const portProbe = http.createServer();
  portProbe.listen(0, "127.0.0.1");
  await once(portProbe, "listening");
  const port = portProbe.address().port;
  await new Promise(resolve => portProbe.close(resolve));
  const startApi = () => spawn(process.execPath, ["apps/api/src/server.mjs"], {
    cwd: path.resolve(import.meta.dirname, "../.."),
    env: { ...process.env, VAULT_PATH: vault, API_PORT: String(port), NODE_EXTRA_CA_CERTS: certPath },
    stdio: "ignore"
  });
  let child = startApi();
  const base = `http://127.0.0.1:${port}`;
  const request = async (route, body) => {
    const res = await fetch(base + route, body === undefined ? {} : { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    return { status: res.status, json: await res.json() };
  };
  const waitReady = async () => {
    let ready = false;
    for (let i = 0; i < 80; i++) {
      try { if ((await fetch(base + "/health")).ok) { ready = true; break; } } catch {}
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    assert.equal(ready, true);
  };
  try {
    await waitReady();
    const ref = "synthetic_remote_key";
    const config = { providerId: "openai_compatible_gateway", status: "enabled", authMode: "byok_advanced", secretRef: ref,
      endpointUrl: `https://127.0.0.1:${provider.address().port}/v1/chat/completions`,
      runtimeModelMap: { "openai_compatible_gateway:standard": "synthetic-model" } };
    const settings = { userMode: "Balanced", modelPack: "Global Optimized", providerPreset: config.providerId,
      authMode: config.authMode, secretRef: ref, endpointUrl: config.endpointUrl, runtimeModelMap: config.runtimeModelMap,
      modelRef: "openai_compatible_gateway:standard", privacyMode: "normal", prompt: "Synthetic test" };
    const badKey = await request("/api/v1/ai/test-chat", { ...settings, secrets: { [ref]: "incorrect-synthetic-key" } });
    assert.equal(badKey.status, 400);
    assert.equal(badKey.json.error.details.providerError.error_type, "auth_error");
    const tested = await request("/api/v1/ai/test-chat", { ...settings, secrets: { [ref]: "synthetic-key" } });
    assert.equal(tested.status, 200, JSON.stringify(tested.json));
    assert.equal(tested.json.item.output.content, "Synthetic connection ready");
    const secretPath = path.join(vault, ".yansilu/ai-secrets.json");
    const readSecrets = async () => {
      try { return JSON.parse(await fs.readFile(secretPath, "utf8")).secrets; }
      catch (error) { if (error.code === "ENOENT") return {}; throw error; }
    };
    assert.equal((await readSecrets())[ref], undefined, "testing must not persist draft keys");
    const saved = await request("/api/v1/ai/provider-configs", { ...config, secrets: { [ref]: "synthetic-key" } });
    assert.equal(saved.status, 200, JSON.stringify(saved.json));
    const wrongReplacement = await request("/api/v1/ai/test-chat", { ...settings, secrets: { [ref]: "incorrect-synthetic-key" } });
    assert.equal(wrongReplacement.status, 400);
    assert.equal((await readSecrets())[ref], "synthetic-key", "failed draft test must preserve saved key");
    const temporaryClear = await request("/api/v1/ai/test-chat", { ...settings, deleteSecrets: [ref] });
    assert.equal(temporaryClear.status, 400);
    assert.equal((await readSecrets())[ref], "synthetic-key", "test-only deletion must not clear saved key");
    const [concurrentGood, concurrentBad] = await Promise.all([
      request("/api/v1/ai/test-chat", { ...settings, secrets: { [ref]: "synthetic-key" } }),
      request("/api/v1/ai/test-chat", { ...settings, secrets: { [ref]: "incorrect-synthetic-key" } })
    ]);
    assert.equal(concurrentGood.status, 200, JSON.stringify(concurrentGood.json));
    assert.equal(concurrentBad.status, 400);
    assert.equal((await readSecrets())[ref], "synthetic-key", "concurrent tests must not mutate saved credentials");
    const stopped = once(child, "exit");
    child.kill();
    await stopped;
    child = startApi();
    await waitReady();
    const loaded = await request("/api/v1/ai/provider-configs/openai_compatible_gateway");
    assert.equal(loaded.json.item.endpointUrl, config.endpointUrl);
    assert.deepEqual(loaded.json.item.runtimeModelMap, config.runtimeModelMap);
    assert.equal(JSON.stringify(loaded.json).includes("synthetic-key"), false);
    const retested = await request("/api/v1/ai/test-chat", settings);
    assert.equal(retested.status, 200, JSON.stringify(retested.json));
    const cleared = await request("/api/v1/ai/provider-configs", { ...config, status: "disabled", deleteSecrets: [ref], secretRef: "" });
    assert.equal(cleared.status, 200, JSON.stringify(cleared.json));
    const failed = await request("/api/v1/ai/test-chat", settings);
    assert.equal(failed.status, 400);
    assert.notEqual(failed.json.item?.status, "succeeded");
    const secretState = JSON.parse(await fs.readFile(path.join(vault, ".yansilu/ai-secrets.json"), "utf8"));
    assert.equal(secretState.secrets[ref], undefined);
    const restored = await request("/api/v1/ai/provider-configs", { ...config, secrets: { [ref]: "synthetic-key" } });
    assert.equal(restored.status, 200, JSON.stringify(restored.json));
    const recovered = await request("/api/v1/ai/test-chat", settings);
    assert.equal(recovered.status, 200, JSON.stringify(recovered.json));
    assert.ok(calls >= 2);
  } finally {
    const exited = child.exitCode === null ? once(child, "exit") : Promise.resolve();
    child.kill();
    await exited;
    provider.closeAllConnections();
    await new Promise(resolve => provider.close(resolve));
  }
});
