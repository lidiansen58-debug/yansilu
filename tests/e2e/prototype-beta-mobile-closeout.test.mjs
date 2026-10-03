import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { optionalPlaywright, startPrototypeStack, fetchJson, postJson, waitFor } from "./prototype-copy-test-helpers.mjs";

test("Beta mobile web pairs with desktop, saves a real quick note, reads permanent notes and rejects revoked access", async t => {
  if (process.env.RUN_BROWSER_E2E !== "1") { t.skip("Set RUN_BROWSER_E2E=1"); return; }
  const pw = await optionalPlaywright(t);
  if (!pw) return;
  const stack = await startPrototypeStack(t, pw);
  if (!stack) return;
  const { page: desktop, apiBase, webBase, vaultPath } = stack;
  const permanent = await postJson(apiBase, "/api/v1/notes", {
    directoryId: "dir_original_default", body: "# 手机回看判断\n\n这是用于手机网页验收的合成正文。"
  });
  assert.equal(permanent.status, 201);
  await desktop.locator('.rail-btn[data-module="settings"]').click();
  await desktop.locator('[data-settings-item="mobile-access"]').click();
  await waitFor(async () => assert.match(String(await desktop.locator(".mobile-access-code strong").textContent()), /^\d{6}$/), 7000);
  const code = String(await desktop.locator(".mobile-access-code strong").textContent());
  const phoneContext = await desktop.context().browser().newContext();
  t.after(() => phoneContext.close());
  const phone = await phoneContext.newPage();
  await phone.setViewportSize({ width: 390, height: 844 });
  await phone.addInitScript(() => localStorage.setItem("yansilu.mobileDeviceName", "Beta 合成手机浏览器"));
  await phone.goto(`${webBase}/mobile?pairCode=${code}`, { waitUntil: "networkidle" });
  await phone.locator(".pair-waiting").waitFor();
  await desktop.locator("[data-mobile-access-refresh]").click();
  await desktop.locator("[data-mobile-pair-confirm]").click();
  await phone.locator('[data-go="quick"]').waitFor({ timeout: 10000 });
  await phone.locator('[data-go="quick"]').click();
  const body = "手机网页验收保存的合成随笔，不使用正式笔记。";
  await phone.locator("#quickBody").fill(body);
  const savedResponse = phone.waitForResponse(response => response.url().includes("/quick-notes") && response.request().method() === "POST");
  await phone.locator('#quickForm button[type="submit"]').click();
  const saved = await savedResponse;
  assert.equal(saved.status(), 201);
  const savedItem = (await saved.json()).item;
  await waitFor(async () => assert.match(String(await phone.locator(".success-text").textContent()), /已保存到电脑/), 7000);
  const persisted = await fetchJson(apiBase, `/api/v1/notes/${savedItem.id}`);
  assert.equal(persisted.status, 200, JSON.stringify(savedItem));
  assert.equal(persisted.json.item.noteType, "fleeting");
  assert.match(await fs.readFile(path.join(vaultPath, persisted.json.item.markdownPath), "utf8"), /手机网页验收保存的合成随笔/);
  await phone.locator('.tab[data-view="notes"]').click();
  await phone.locator(`[data-note-id="${permanent.json.item.id}"]`).click();
  assert.match(String(await phone.locator(".note-body").textContent()), /合成正文/);
  const revoke = desktop.locator("[data-mobile-device-revoke]:not([disabled])");
  await revoke.click();
  await waitFor(async () => assert.equal(await revoke.count(), 0), 7000);
  await phone.reload({ waitUntil: "networkidle" });
  await phone.locator("#pairForm").waitFor();
  assert.equal(await phone.evaluate(() => localStorage.getItem("yansilu.mobileAccessToken")), null);
  assert.equal(await phone.locator("#quickForm").count(), 0);
});
