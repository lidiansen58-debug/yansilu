import path from "node:path";

export async function deleteInRequestVault(req, { vaultPath, currentVaultPath, readJson, initVault, remove, itemId }) {
  const body = await readJson(req);
  const assertCurrent = () => {
    if (currentVaultPath() !== vaultPath || (body.expectedVaultPath !== undefined
      && path.relative(vaultPath, path.resolve(String(body.expectedVaultPath))) !== "")) {
      throw Object.assign(new Error("笔记库已切换，本次删除未执行。请在原笔记库核对后重试。"), { code: "VAULT_CHANGED" });
    }
  };
  assertCurrent();
  await initVault(vaultPath);
  assertCurrent();
  // Keep the original path even if the selected vault changes during removal.
  return remove(vaultPath, itemId);
}
