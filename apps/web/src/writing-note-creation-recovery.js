import { withMoveDeadline } from "./note-move-recovery.js";
import { writingCreationStorage } from "./writing-creation-storage.js";

const uncertain = cause => Object.assign(new Error("创建结果尚未确认，输入仍保留。再次保存会先核查原笔记；确认原编号不存在后才会用同一编号重试。"), {
  code: "NOTE_SAVE_RESULT_UNCERTAIN", cause
});
const retryableCreateErrors = new Set(["api_unavailable", "request_timeout", "NOTE_ID_EXISTS", "NOTE_SAVE_RESULT_UNCERTAIN"]);
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
  let retryConfirmedMissing = Boolean(pending);
  if (pending && (pending.scope !== scope || pending.vaultPath !== vaultPath || pending.contextId !== contextId)) {
    pending = null;
    retryConfirmedMissing = false;
  }
  if (!pending) {
    const restored = storage?.read();
    if (restored) {
      pending = { ...restored, scope };
      holder.pendingNoteCreation = pending;
      retryConfirmedMissing = true;
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
  const readCreatedNote = async () => {
    try {
      const note = await withMoveDeadline(() => deps.fetchNote(`note_${pending.id}`, {
        timeoutMs: deps.creationVerifyTimeoutMs ?? 5000
      }), deps.creationVerifyTimeoutMs ?? 5000);
      if (note == null) return null;
      if (!matches(note)) throw uncertain();
      return note;
    } catch (error) {
      if (error?.code === "NOTE_NOT_FOUND") return null;
      throw uncertain(error);
    }
  };
  let note = await readCreatedNote();
  if (note) {
    clear();
    return { note, submittedBody: pending.payload.body, recovered: true };
  }
  if (!retryConfirmedMissing) throw uncertain();
  try {
    const created = await withMoveDeadline(() => deps.createNote({ ...pending.payload, clientCreationId: pending.id,
      ...(vaultPath ? { expectedVaultPath: vaultPath } : {}) }), deps.creationTimeoutMs ?? 15000);
    if (matches(created)) {
      clear();
      return { note: created, submittedBody: pending.payload.body, recovered: true };
    }
  } catch (error) {
    if (!retryableCreateErrors.has(error?.code)) {
      storage?.clear();
      clear();
      throw error;
    }
  }
  note = await readCreatedNote();
  if (note) {
    clear();
    return { note, submittedBody: pending.payload.body, recovered: true };
  }
  throw uncertain();
}

export function acknowledgeWritingNoteBinding(deps, contextId, noteId) {
  const storage = writingCreationStorage(deps, deps.getVaultPath?.() || "", contextId);
  const record = storage?.read();
  if (record && `note_${record.id}` === noteId) storage.clear();
}
