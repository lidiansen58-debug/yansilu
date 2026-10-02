const snapshots = new WeakMap();
const readsByHost = new WeakMap();

// Composer reconciliation and sidebar refreshes share ownership of reads.
export function beginRelationSnapshotRead(host, noteId) {
  let reads = readsByHost.get(host);
  if (!reads) { reads = new Map(); readsByHost.set(host, reads); }
  const request = { vault: host.vaultScope?.() };
  reads.set(noteId, request);
  return () => readsByHost.get(host)?.get(noteId) === request && host.vaultScope?.() === request.vault;
}

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
  readsByHost.delete(host);
}
