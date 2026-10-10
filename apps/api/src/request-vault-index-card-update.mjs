import path from "node:path";

export async function updateIndexCardInRequestVault(req, { vaultPath, currentVaultPath, readJson, initVault, update, itemId }) {
  const body = await readJson(req);
  const assertCurrent = () => {
    if (currentVaultPath() !== vaultPath || (body.expectedVaultPath !== undefined &&
        path.relative(vaultPath, path.resolve(String(body.expectedVaultPath))) !== "")) {
      throw Object.assign(new Error("笔记库已切换，本次主题修改未执行。请重新打开主题后重试。"), { code: "VAULT_CHANGED" });
    }
  };
  assertCurrent();
  await initVault(vaultPath);
  assertCurrent();
  return update(vaultPath, itemId, body);
}
