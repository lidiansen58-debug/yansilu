import test from "node:test";
import assert from "node:assert/strict";

import { createDesktopFileCommandService } from "../../apps/web/src/desktop-file-command-service.js";

test("desktop file command service switches vault through injected implementation", async () => {
  const calls = [];
  const service = createDesktopFileCommandService({
    switchVaultImpl: async (vaultPath) => {
      calls.push(vaultPath);
      return { vaultPath, initialized: true };
    }
  });

  const result = await service.switchVault("E:\\Vaults\\yansilu");
  assert.deepEqual(calls, ["E:\\Vaults\\yansilu"]);
  assert.equal(result.vaultPath, "E:\\Vaults\\yansilu");
  assert.equal(result.initialized, true);
});

test("desktop file command service forwards external link requests", async () => {
  const previousWindow = globalThis.window;
  const calls = [];
  const service = createDesktopFileCommandService();

  globalThis.window = {
    open(url, target, features) {
      calls.push({ url, target, features });
      return {};
    }
  };

  try {
    const result = await service.openExternalUrl("https://github.com/lidiansen/yansilu-feedback");
    assert.equal(result.ok, true);
    assert.equal(result.source, "browser");
    assert.deepEqual(calls, [
      {
        url: "https://github.com/lidiansen/yansilu-feedback",
        target: "_blank",
        features: "noopener,noreferrer"
      }
    ]);
  } finally {
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
  }
});
