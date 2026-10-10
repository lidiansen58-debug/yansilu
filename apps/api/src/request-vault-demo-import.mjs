import path from "node:path";

export async function importDemoInRequestVault(req, { vaultPath, currentVaultPath, readJson, initVault, seed }) {
  const body = await readJson(req);
  const assertCurrent = () => {
    if (currentVaultPath() !== vaultPath || (body.expectedVaultPath !== undefined
      && path.relative(vaultPath, path.resolve(String(body.expectedVaultPath))) !== "")) {
      throw Object.assign(new Error("笔记库已切换，本次示例导入未执行。请在原笔记库核对后重试。"), { code: "VAULT_CHANGED" });
    }
  };
  assertCurrent();
  await initVault(vaultPath);
  assertCurrent();
  // A switch after import starts must never redirect its writes into another vault.
  return seed(vaultPath);
}
