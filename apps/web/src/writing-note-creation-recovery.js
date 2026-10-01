import { withMoveDeadline } from "./note-move-recovery.js";
import { writingCreationStorage } from "./writing-creation-storage.js";

const uncertain = cause => Object.assign(new Error("创建结果尚未确认，输入仍保留。再次保存只会核查原笔记，不会重复创建；请检查本地服务。"), {
  code: "NOTE_SAVE_RESULT_UNCERTAIN", cause
});
const randomId = () => {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 15) | 64;
  bytes[8] = (bytes[8] & 63) | 128;
  const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
};

export async function createWritingNoteWithRecovery(holder, deps, payload, contextId) {
  const scope = deps.state?.noteMoveVaultScope;
  const vaultPath = deps.getVaultPath?.() || "";
  const storage = writingCreationStorage(deps, vaultPath, contextId);
  let pending = holder.pendingNoteCreation;
  if (pending && (pending.scope !== scope || pending.vaultPath !== vaultPath || pending.contextId !== contextId)) {
    pending = null;
  }
  if (!pending) {
    const restored = storage?.read();
    if (restored) {
      pending = { ...restored, scope };
      holder.pendingNoteCreation = pending;
    }
  }
  const clear = () => {
    if (!deps.retainCreationRecovery) storage?.clear();
    if (holder.pendingNoteCreation === pending) holder.pendingNoteCreation = null;
  };
  const matches = note => note?.id === `note_${pending.id}` && note.directoryId === pending.payload.directoryId
    && typeof note.body === "string";
  if (!pending) {
    pending = { id: (deps.createNoteId || randomId)(), scope, vaultPath, contextId, payload: { ...payload } };
    storage?.write(pending);
    holder.pendingNoteCreation = pending;
    try {
      const note = await withMoveDeadline(() => deps.createNote({ ...pending.payload, clientCreationId: pending.id,
        ...(vaultPath ? { expectedVaultPath: vaultPath } : {}) }), deps.creationTimeoutMs ?? 15000);
      if (!matches(note)) throw Object.assign(new Error("创建响应不完整"), { code: "api_unavailable" });
      try { clear(); } catch (error) { throw uncertain(error); }
      return { note, submittedBody: pending.payload.body };
    } catch (error) {
      if (!["api_unavailable", "request_timeout", "NOTE_ID_EXISTS", "NOTE_SAVE_RESULT_UNCERTAIN"].includes(error?.code)) {
        storage?.clear();
        clear();
        throw error;
      }
    }
  }
  try {
    const note = await withMoveDeadline(() => deps.fetchNote(`note_${pending.id}`, {
      timeoutMs: deps.creationVerifyTimeoutMs ?? 5000
    }), deps.creationVerifyTimeoutMs ?? 5000);
    if (!matches(note)) throw uncertain();
    clear();
    return { note, submittedBody: pending.payload.body, recovered: true };
  } catch (error) {
    throw uncertain(error);
  }
}

export function acknowledgeWritingNoteBinding(deps, contextId, noteId) {
  const storage = writingCreationStorage(deps, deps.getVaultPath?.() || "", contextId);
  const record = storage?.read();
  if (record && `note_${record.id}` === noteId) storage.clear();
}
