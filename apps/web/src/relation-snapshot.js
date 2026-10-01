const snapshots = new WeakMap();

export function rememberRelationSnapshot(host, noteId, relations) {
  if (!relations || typeof relations !== "object") return;
  snapshots.set(host, { noteId, vault: host.vaultScope?.(), relations });
}

export function currentRelationSnapshot(host, noteId) {
  const snapshot = snapshots.get(host);
  return snapshot?.noteId === noteId && snapshot.vault === host.vaultScope?.() ? snapshot.relations : null;
}

export function clearRelationSnapshot(host) {
  snapshots.delete(host);
}
