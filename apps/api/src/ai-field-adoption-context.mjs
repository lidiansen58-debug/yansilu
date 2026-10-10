import path from "node:path";

export async function readAiFieldAdoptionContext(req, { vaultPath, currentVaultPath, readJson, initVault }) {
  const body = await readJson(req);
  const assertCurrent = () => {
    if (currentVaultPath() !== vaultPath || (body.expectedVaultPath !== undefined &&
      path.relative(vaultPath, path.resolve(String(body.expectedVaultPath))) !== "")) {
      throw Object.assign(new Error("笔记库已切换，本次采纳未执行。请在原笔记库核对后重试。"), { code: "VAULT_CHANGED" });
    }
  };
  assertCurrent();
  await initVault(vaultPath);
  assertCurrent();
  return { body, assertCurrent };
}
