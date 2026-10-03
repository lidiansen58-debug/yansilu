import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { optionalPlaywright, startPrototypeStack, createWritingReadyPermanentNote, fetchJson, waitFor } from "./prototype-copy-test-helpers.mjs";

test("theme suggestion drafts from a previous vault disappear after a real vault switch", async t => {
  if (process.env.RUN_BROWSER_E2E !== "1") { t.skip("Set RUN_BROWSER_E2E=1"); return; }
  const pw = await optionalPlaywright(t);
  if (!pw) return;
  const stack = await startPrototypeStack(t, pw);
  if (!stack) return;
  const { page, apiBase, webBase, vaultPath } = stack;
  for (const name of ["A", "B", "C"]) {
    await createWritingReadyPermanentNote(apiBase, {
      title: `Vault theme ${name}`, body: `# Vault theme ${name}\n\nA separate human judgment. #vault-theme`,
      thesis: `Human judgment ${name} helps organize a theme.`, threeLineSummary: ["A judgment.", "A reason.", "A limit."]
    });
  }
  await page.goto(`${webBase}/prototype`, { waitUntil: "networkidle" });
  await page.locator('.rail-btn[data-module="writing"]').click();
  await page.locator('#btnWritingDiscoverThemes').click();
  const suggestion = page.locator('[data-theme-discovery-suggestion-id]').first();
  await suggestion.waitFor({ state: "visible" });
  await suggestion.locator('[data-theme-discovery-field="title"]').fill("Private old-vault draft");
  await page.locator('.rail-btn[data-module="settings"]').click();
  await page.locator('[data-settings-item="current-vault"]').click();
  const target = path.join(vaultPath, "other-vault");
  await page.locator('#settingsVaultPath').fill(target);
  await page.locator('#settingsSwitchVault').click();
  await waitFor(async () => assert.equal((await fetchJson(apiBase, '/api/v1/vault')).json.item.vaultPath, target));
  await page.locator('[data-vault-switch-recovery]').waitFor({ state: "detached" });
  await page.locator('.rail-btn[data-module="writing"]').click();
  await waitFor(async () => assert.equal(await page.locator('[data-theme-discovery-suggestion-id]').count(), 0));
  assert.equal((await fetchJson(apiBase, '/api/v1/index-cards?indexType=topic')).json.items.length, 0);
});
