import { openExternalUrl, openPath, revealPath } from "./desktop-file-adapter.js";
import { pickDirectoryPath } from "./path-picker-adapter.js";

export function createDesktopFileCommandService({ switchVaultImpl } = {}) {
  const browseDirectory = async ({ defaultPath = "", purpose = "目录" } = {}) => {
    const picked = await pickDirectoryPath({ defaultPath });
    return {
      ...picked,
      purpose
    };
  };

  const pickVaultDirectory = async ({ defaultPath = "" } = {}) =>
    browseDirectory({ defaultPath, purpose: "Vault" });

  const revealInFileManager = async (targetPath) => revealPath(targetPath);
  const openDirectory = async (targetPath) => openPath(targetPath);
  const openLink = async (targetUrl) => openExternalUrl(targetUrl);

  const switchVault = async (vaultPath) => {
    if (!switchVaultImpl) throw new Error("switchVault is unavailable");
    return switchVaultImpl(vaultPath);
  };

  const browseAndSwitchVault = async ({ defaultPath = "" } = {}) => {
    const picked = await pickVaultDirectory({ defaultPath });
    if (!picked.path) return { picked, vault: null, changed: false };
    const vault = await switchVault(picked.path);
    return { picked, vault, changed: true };
  };

  return {
    browseDirectory,
    pickVaultDirectory,
    revealInFileManager,
    openDirectory,
    openExternalUrl: openLink,
    switchVault,
    browseAndSwitchVault
  };
}
