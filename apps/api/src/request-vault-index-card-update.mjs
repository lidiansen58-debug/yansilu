import path from "node:path";

async function writeIndexCardInRequestVault(req, { vaultPath, currentVaultPath, readJson, initVault }, write) {
  const body = await readJson(req);
  const assertCurrent = () => {
    if (currentVaultPath() !== vaultPath || (body.expectedVaultPath !== undefined &&
        path.relative(vaultPath, path.resolve(String(body.expectedVaultPath))) !== "")) {
      throw Object.assign(new Error("笔记库已切换，本次主题操作未执行。请重新打开主题后重试。"), { code: "VAULT_CHANGED" });
    }
  };
  assertCurrent();
  await initVault(vaultPath);
  assertCurrent();
  return write(body);
}

export function updateIndexCardInRequestVault(req, deps) {
  return writeIndexCardInRequestVault(req, deps, body => deps.update(deps.vaultPath, deps.itemId, body));
}

export function createIndexCardInRequestVault(req, deps) {
  return writeIndexCardInRequestVault(req, deps, body => deps.create(deps.vaultPath, body));
}
