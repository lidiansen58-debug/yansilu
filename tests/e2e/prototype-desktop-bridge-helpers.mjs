import assert from "node:assert/strict";
import { fetchJson } from "./prototype-copy-test-helpers.mjs";

// Only the native bridge is synthetic; the API and Vault remain the test stack's real services.
export async function installReadyDesktopBridge(page, apiBase, { revealMode = "opener" } = {}) {
  const health = await fetchJson(apiBase, "/health");
  assert.equal(health.status, 200);
  assert.equal(health.json.ready, true);
  assert.ok(health.json.vaultPath);
  await page.addInitScript(({ apiBase, vaultPath, revealMode }) => {
    window.__desktopBridgeCalls = [];
    window.__tauriRevealCalls = [];
    window.__confirmMessages = [];
    window.confirm = message => { window.__confirmMessages.push(message); return false; };
    const status = { overall: "healthy", services: { api: { status: "healthy", baseUrl: apiBase, vaultPath } } };
    window.__TAURI__ = {
      core: {
        async invoke(command, args) {
          window.__desktopBridgeCalls.push({ command, args });
          if (command === "wait_for_desktop_api_ready" || command === "get_desktop_service_status") return status;
          if (command === "get_desktop_api_base") return apiBase;
          if (command === "plugin:updater|check") return { available: false };
          if (command === "open_in_explorer" && revealMode === "command") return;
          throw new Error(`unknown command in synthetic desktop bridge: ${command}`);
        }
      },
      opener: {
        async revealItemInDir(targetPath) { window.__tauriRevealCalls.push(targetPath); }
      }
    };
  }, { apiBase, vaultPath: health.json.vaultPath, revealMode });
}

export async function assertDesktopBridgeCalls(page, expectedActions) {
  const calls = await page.evaluate(() => window.__desktopBridgeCalls);
  const serviceCommands = new Set(["wait_for_desktop_api_ready", "get_desktop_service_status", "get_desktop_api_base"]);
  assert.equal(calls[0]?.command, "wait_for_desktop_api_ready");
  assert.deepEqual(calls.filter(call => !serviceCommands.has(call.command)).map(call => call.command), expectedActions);
  assert.deepEqual(await page.evaluate(() => window.__confirmMessages), []);
  return calls;
}
