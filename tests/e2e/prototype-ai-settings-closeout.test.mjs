import test from "node:test";
import assert from "node:assert/strict";
import https from "node:https";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { once } from "node:events";
import { normalizeOpenAiCompatibleBaseUrl } from "../../apps/web/src/ai-settings-remote-config-model.js";
import { optionalPlaywright, startPrototypeStack, fetchJson, waitFor } from "./prototype-copy-test-helpers.mjs";

test("current AI settings test before saving, reload config and cancel a pending provider request", async t => {
  if (process.env.RUN_BROWSER_E2E !== "1") { t.skip("Set RUN_BROWSER_E2E=1"); return; }
  const pw = await optionalPlaywright(t);
  if (!pw) return;
  const certDir = await fs.mkdtemp(path.join(os.tmpdir(), "yansilu-ui-ai-cert-"));
  const cert = path.join(certDir, "cert.pem"), key = path.join(certDir, "key.pem");
  let openssl = process.env.OPENSSL_BIN || "openssl";
  try { execFileSync(openssl, ["version"], { stdio: "ignore" }); }
  catch {
    const git = execFileSync("where.exe", ["git"], { encoding: "utf8" }).trim().split(/\r?\n/)[0];
    openssl = path.resolve(path.dirname(git), "../usr/bin/openssl.exe");
  }
  execFileSync(openssl, ["req", "-x509", "-newkey", "rsa:2048", "-nodes", "-keyout", key,
    "-out", cert, "-days", "1", "-subj", "/CN=localhost", "-addext", "subjectAltName=IP:127.0.0.1,DNS:localhost"], { stdio: "ignore" });
  let calls = 0, hold = false, heldResponse = null;
  const provider = https.createServer({ key: await fs.readFile(key), cert: await fs.readFile(cert) }, async (req, res) => {
    let raw = "";
    for await (const chunk of req) raw += chunk;
    calls++;
    assert.equal(req.headers.authorization, "Bearer synthetic-ui-key");
    assert.equal(JSON.parse(raw).model, "synthetic-ui-model");
    if (hold) { heldResponse = res; return; }
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({ choices: [{ message: { role: "assistant", content: "Synthetic UI connection ready" } }] }));
  });
  provider.listen(0, "127.0.0.1");
  await once(provider, "listening");
  t.after(async () => { provider.closeAllConnections(); await new Promise(resolve => provider.close(resolve)); });
  const stack = await startPrototypeStack(t, pw, { apiEnv: { NODE_EXTRA_CA_CERTS: cert } });
  if (!stack) return;
  const { page, apiBase, webBase, vaultPath } = stack;
  const base = `https://127.0.0.1:${provider.address().port}/v1`;
  const openAi = async () => {
    await page.locator('.rail-btn[data-module="settings"]').click();
    await page.locator('[data-settings-item="ai-settings"]').click();
  };
  await openAi();
  await page.locator('#settingsAiRuntimeMode').selectOption("cloud_only");
  await page.locator('#settingsAiRemoteSection > summary').click();
  await page.locator('#settingsAiProviderEndpointUrl').fill(base);
  await page.locator('#settingsAiSecretRef').fill("synthetic-ui-key");
  await page.locator('#settingsAiRemoteRuntimeModel').fill("synthetic-ui-model");
  await page.locator('#settingsAiRemoteConsent').check();
  assert.equal(await page.locator('#settingsAiSaveProviderConfig').isDisabled(), true);
  await page.locator('#settingsAiCheckProviderHealth').click();
  await page.locator('#settingsAiTestDialog').waitFor({ state: "visible" });
  assert.equal(calls, 0, "save before a connection test must not call the provider");
  await page.locator('#settingsAiTestPrompt').fill("Synthetic connection test only");
  await page.locator('#btnAiTestChatRun').click();
  await waitFor(async () => assert.match(await page.locator('#settingsAiTestChatOutput').innerText(), /Synthetic UI connection ready/), 10000);
  let secrets;
  try { secrets = JSON.parse(await fs.readFile(path.join(vaultPath, '.yansilu/ai-secrets.json'), 'utf8')).secrets; }
  catch (e) { if (e.code !== 'ENOENT') throw e; secrets = {}; }
  assert.equal(secrets['local:settings-remote-api-key'], undefined, "testing leaves the draft key unpersisted");
  await page.locator('#settingsAiTestDialog [data-settings-ai-dialog-close]').click();
  await page.locator('#settingsAiSaveProviderConfig').click();
  await waitFor(async () => assert.equal((await fetchJson(apiBase, '/api/v1/ai/provider-configs/openai_compatible_gateway')).json.item.endpointUrl, `${base}/chat/completions`));
  assert.equal(JSON.parse(await fs.readFile(path.join(vaultPath, '.yansilu/ai-secrets.json'), 'utf8')).secrets['local:settings-remote-api-key'], "synthetic-ui-key");
  await page.goto(`${webBase}/prototype`, { waitUntil: "networkidle" });
  await openAi();
  if (!(await page.locator('#settingsAiRemoteSection').evaluate(node => node.open))) await page.locator('#settingsAiRemoteSection > summary').click();
  assert.equal(normalizeOpenAiCompatibleBaseUrl(await page.locator('#settingsAiProviderEndpointUrl').inputValue()), `${base}/chat/completions`);
  assert.equal(await page.locator('#settingsAiRemoteRuntimeModel').inputValue(), "synthetic-ui-model");
  await page.locator('#settingsAiRemoteConsent').check();
  hold = true;
  await page.locator('#settingsAiCheckProviderHealth').click();
  await page.locator('#settingsAiTestPrompt').fill("Synthetic cancelled test");
  await page.locator('#btnAiTestChatRun').click();
  await waitFor(async () => assert.ok(heldResponse, await page.locator('#settingsAiTestChatOutput').innerText()), 10000);
  await page.locator('#settingsAiTestDialog [data-settings-ai-dialog-close]').click();
  await page.locator('#settingsAiCheckProviderHealth').click();
  assert.match(await page.locator('#settingsAiTestChatOutput').innerText(), /取消/);
  assert.equal(await page.locator('#btnAiTestChatRun').isEnabled(), true);
  assert.equal(JSON.parse(await fs.readFile(path.join(vaultPath, '.yansilu/ai-secrets.json'), 'utf8')).secrets['local:settings-remote-api-key'], "synthetic-ui-key");
});
