import { withMoveDeadline } from "./note-move-recovery.js";
import { applyLoadedNoteToClientState } from "./loaded-note-client-state.js";
import { noteCreationStorage } from "./note-creation-storage.js";

const uncertain = error => !["NOTE_PAYLOAD_INVALID", "VAULT_CHANGED", "desktop_api_unavailable"].includes(error?.code);
const failure = error => ({ note: null, remote: false, error });

export function createNoteCreationController({ state, folderById, findUntitledPlaceholder,
  isLocalOnlyNote, initialBodyForFolder, createNote,
  fetchNote, mapNoteItem, ensureEditableNoteBody, openStandaloneEditorWindow, openNoteById,
  getVaultPath = () => "", getStorage = () => typeof window === "undefined" ? null : window.localStorage,
  createId = () => crypto.randomUUID(), timeoutMs = 15000, verifyTimeoutMs = 5000 }) {
  let pending = null;
  let inFlight = null;
  const scope = () => state.noteMoveVaultScope ||= {};
  const current = op => !op.cancelled && op.scope === scope() && !state.noteMoveVaultSwitching && !state.noteMoveVaultUncertain;
  const noteSnapshot = id => JSON.stringify({ note: state.notes.find(note => note.id === id),
    tabs: (state.tabs || []).filter(tab => tab.noteId === id) });
  const release = op => { if (state.pendingNoteCreation === op) state.pendingNoteCreation = null; };
  const assertCurrent = op => { if (!current(op)) throw Object.assign(new Error("笔记库已切换，本次创建结果不会写入当前界面。"), { code: "vault_changed" }); };
  const prepare = async op => {
    if (!folderById(state, op.folderId)) throw new Error("没有可写入的笔记目录，请先选择笔记库");
    const kept = op.options.reuseUntitled !== false
      ? await findUntitledPlaceholder(op.folderId, { isCurrent: () => current(op), signal: op.controller.signal }) : null;
    assertCurrent(op);
    if (kept) {
      return { note: kept, remote: !isLocalOnlyNote(kept), reused: true, reuseSnapshot: noteSnapshot(kept.id) };
    }
    op.body = initialBodyForFolder(op.folderId);
    op.journal?.write(op);
    op.posted = true;
    const created = await createNotePayload(op);
    if (created?.id !== `note_${op.id}` || !created.directoryId || typeof created.body !== "string") {
      throw Object.assign(new Error("本地服务没有返回匹配的创建结果"), { code: "api_unavailable" });
    }
    return { created };
  };
  const createNotePayload = op => createNote({ directoryId: op.folderId, body: op.body, clientCreationId: op.id,
    ...(op.vaultPath ? { expectedVaultPath: op.vaultPath } : {}) });
  const finish = (op, result) => {
    assertCurrent(op);
    op.journal?.clear(op.id);
    const loaded = result.note || mapNoteItem(result.created);
    const note = applyLoadedNoteToClientState(state, loaded, {
      refreshLoaded: Boolean(result.reused && result.reuseSnapshot === noteSnapshot(loaded.id))
    });
    release(op);
    pending = null;
    if (op.options.openInStandalone === true) openStandaloneEditorWindow(note.id);
    else openNoteById(note.id, { preferTitleSelection: op.options.preferTitleSelection !== false,
      preferPlainEditor: op.options.preferPlainEditor === true });
    return { note, remote: result.remote !== false, reused: Boolean(result.reused), cleanedCount: 0 };
  };
  const reconcile = async (op, retryConfirmedMissing = false) => {
    assertCurrent(op);
    if (op.result && !op.needsVerification) return finish(op, op.result);
    if (op.error && (!op.posted || ["VAULT_CHANGED", "desktop_api_unavailable"].includes(op.error.code))) {
      op.journal?.clear(op.id);
      release(op);
      pending = null;
      return failure(op.error);
    }
    let confirmedMissing = false;
    if (op.posted || op.result?.note) {
      try {
        const noteId = op.result?.note?.id || `note_${op.id}`;
        const created = await withMoveDeadline(() => fetchNote(noteId, { timeoutMs: verifyTimeoutMs }), verifyTimeoutMs);
        assertCurrent(op);
        if (created?.id === noteId && created.directoryId && typeof created.body === "string") {
          return finish(op, { created });
        }
        confirmedMissing = created == null;
      } catch (error) {
        if (error?.code === "NOTE_NOT_FOUND") confirmedMissing = true;
      }
    }
    assertCurrent(op);
    if (op.error && !uncertain(op.error) && confirmedMissing) { op.journal?.clear(op.id); release(op); pending = null; return failure(op.error); }
    if (confirmedMissing && retryConfirmedMissing) {
      try {
        const created = await withMoveDeadline(() => createNotePayload(op), timeoutMs);
        assertCurrent(op);
        if (created?.id === `note_${op.id}` && created.directoryId && typeof created.body === "string") {
          return finish(op, { created });
        }
        op.error = Object.assign(new Error("本地服务没有返回匹配的创建结果"), { code: "api_unavailable" });
      } catch (error) {
        op.error = error;
      }
      op.needsVerification = true;
      return reconcile(op);
    }
    return failure(Object.assign(new Error("创建结果尚未确认。再次点击新建会核查同一条笔记，不会重复创建；请检查本地服务。"), { code: "creation_pending" }));
  };
  const run = async options => {
    if (state.noteMoveVaultSwitching || state.noteMoveVaultUncertain) return failure(new Error("请先确认当前笔记库。"));
    if (pending && pending.scope !== scope()) { release(pending); pending = null; }
    if (!pending) {
      const vaultPath = getVaultPath();
      const journal = noteCreationStorage(getStorage(), vaultPath);
      const saved = journal?.read();
      if (saved) {
        pending = { ...saved, journal, scope: scope(), controller: new AbortController(), options: { ...options }, posted: true, needsVerification: true };
        state.pendingNoteCreation = pending;
      }
    }
    if (pending) { pending.needsVerification = true; return reconcile(pending, true); }
    const op = { scope: scope(), controller: new AbortController(), vaultPath: getVaultPath(), folderId: state.selectedFolderId, options: { ...options }, id: createId() };
    op.journal = noteCreationStorage(getStorage(), op.vaultPath);
    pending = op;
    state.pendingNoteCreation = op;
    const work = prepare(op).then(result => { op.result = result; release(op); }, error => {
      op.error = error;
      if (!op.posted || !uncertain(error)) release(op);
    });
    try { await withMoveDeadline(() => work, timeoutMs); }
    catch {
      if (!op.posted && !op.result) {
        op.cancelled = true;
        op.controller.abort();
        release(op);
        if (pending === op) pending = null;
        return failure(Object.assign(new Error("读取现有笔记超时，尚未创建新笔记。可以重试或切换笔记库。"), { code: "creation_prepare_timeout" }));
      }
      op.needsVerification = true;
    }
    return reconcile(op);
  };
  return (options = {}) => {
    if (inFlight) return inFlight;
    inFlight = run(options).catch(failure).finally(() => { inFlight = null; });
    return inFlight;
  };
}
