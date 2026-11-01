import test from "node:test";
import assert from "node:assert/strict";
import { buildAiSettingsPayload } from "../../apps/web/src/settings-ai-runtime-actions.js";
import { aiDefaultsForRuntimeMode } from "../../apps/web/src/prototype-ai-settings-controller.js";
import { optionalPlaywright, startPrototypeStack, postJson } from "./prototype-copy-test-helpers.mjs";

test("viewing local or disabled AI settings preserves the stored remote model across reloads", async t => {
  if (process.env.RUN_BROWSER_E2E !== "1") { t.skip("Set RUN_BROWSER_E2E=1"); return; }
  const pw = await optionalPlaywright(t);
  if (!pw) return;
  const stack = await startPrototypeStack(t, pw);
  if (!stack) return;
  const { page, apiBase } = stack;
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  const key = "yansilu:ai:remote-runtime-model";
  const storedModel = "synthetic-saved-remote-model";
  const openSettings = async () => {
    const refreshed = page.waitForResponse(response => response.url().endsWith("/api/v1/ai/route-preview")
      && response.request().method() === "POST");
    await page.locator('.rail-btn[data-module="settings"]').click();
    await page.locator('[data-settings-item="ai-settings"]').click();
    await refreshed;
  };
  await page.evaluate(({ key, storedModel }) => {
    localStorage.setItem(key, storedModel);
    localStorage.setItem("yansilu:ai:runtime-mode", "cloud_only");
    localStorage.setItem("yansilu:ai:model-pack", "Global Optimized");
    localStorage.setItem("yansilu:ai:user-mode", "Balanced");
  }, { key, storedModel });
  await page.reload({ waitUntil: "networkidle" });
  await openSettings();
  assert.equal(await page.evaluate(key => localStorage.getItem(key), key), storedModel, "a remote selection with no saved provider keeps its model while routing is unavailable");
  await page.reload({ waitUntil: "networkidle" });
  await openSettings();
  assert.equal(await page.evaluate(key => localStorage.getItem(key), key), storedModel);
  for (const selection of [{ runtimeMode: "local_only" }, { runtimeMode: "off" }, { runtimeMode: "off", modelPack: "Global Optimized" }]) {
    const { runtimeMode } = selection;
    const defaults = { ...aiDefaultsForRuntimeMode(runtimeMode), ...selection };
    const saved = await postJson(apiBase, "/api/v1/ai/preferences", buildAiSettingsPayload({ runtimeMode, ...defaults }));
    assert.equal(saved.status, 200);
    await page.evaluate(({ key, storedModel, runtimeMode, defaults }) => {
      localStorage.setItem(key, storedModel);
      localStorage.setItem("yansilu:ai:runtime-mode", runtimeMode);
      localStorage.setItem("yansilu:ai:model-pack", defaults.modelPack);
      localStorage.setItem("yansilu:ai:user-mode", defaults.userMode);
    }, { key, storedModel, runtimeMode, defaults });
    await page.reload({ waitUntil: "networkidle" });
    await openSettings();
    assert.equal(await page.locator("#settingsAiRuntimeMode").inputValue(), runtimeMode);
    assert.equal(await page.evaluate(key => localStorage.getItem(key), key), storedModel);
    await page.reload({ waitUntil: "networkidle" });
    await openSettings();
    assert.equal(await page.evaluate(key => localStorage.getItem(key), key), storedModel);
  }
  await page.locator("#settingsAiRuntimeMode").selectOption("cloud_only");
  await page.locator("#settingsAiRemoteSection > summary").click();
  const modelInput = page.locator("#settingsAiRemoteRuntimeModel");
  await modelInput.fill("synthetic-replacement-model");
  await modelInput.press("Tab");
  assert.equal(await page.evaluate(key => localStorage.getItem(key), key), "synthetic-replacement-model");
  await modelInput.fill("");
  await modelInput.press("Tab");
  assert.equal(await page.evaluate(key => localStorage.getItem(key), key), null, "an explicit remote-model clear still takes effect");
  assert.deepEqual(errors, []);
});
