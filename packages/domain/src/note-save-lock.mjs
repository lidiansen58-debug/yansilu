import fs from "node:fs/promises";

const pending = new Map();

export async function withNoteSaveLock(vaultPath, noteId, action) {
  const realVault = await fs.realpath(vaultPath);
  const key = JSON.stringify([process.platform === "win32" ? realVault.toLowerCase() : realVault, noteId]);
  const previous = pending.get(key) || Promise.resolve();
  const current = previous.catch(() => {}).then(action);
  pending.set(key, current);
  try {
    return await current;
  } finally {
    if (pending.get(key) === current) pending.delete(key);
  }
}
