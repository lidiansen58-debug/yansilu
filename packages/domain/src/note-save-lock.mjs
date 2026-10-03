import { realpathSync } from "node:fs";

const pending = new Map();

export async function withNoteSaveLock(vaultPath, noteId, action) {
  // Resolve before yielding so concurrent callers enter the queue in call order.
  const realVault = realpathSync(vaultPath);
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
