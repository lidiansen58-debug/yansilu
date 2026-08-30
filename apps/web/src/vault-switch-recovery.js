import { fetchVaultInfo } from "./prototype-api.js";
import { syncNoteMoveReadOnly, withMoveDeadline } from "./note-move-recovery.js";
import { createVaultSwitchDialog } from "./vault-switch-dialog.js";

export async function switchVaultWithNoteMoveRecovery(state, switchVault, {
  targetVaultPath = "", verifyVault = fetchVaultInfo, loadVault = async () => null,
  commitVault = () => {}, onRejected = () => {},
  switchTimeoutMs = 15000, verifyTimeoutMs = 5000, applyTimeoutMs = 15000,
  createDialog = createVaultSwitchDialog
} = {}) {
  if (state.pendingNoteCreation) throw new Error("笔记仍在创建或等待核查，请确认创建结果后再切换笔记库。");
  if (state.unresolvedNoteMove) throw new Error("移动结果尚未确认，请先点击“重新核查”，确认后再切换笔记库。");
  if (state.pendingNoteMoveId || state.noteMoveVaultSwitching || state.noteMoveVaultUncertain) {
    throw new Error("当前操作尚未完成，请先核查笔记库。");
  }
  state.noteMoveVaultSwitching = true;
  let dialog;
  let outcome;
  const definitiveFailure = error => ["VAULT_SWITCH_FAILED", "VAULT_PATH_REQUIRED", "desktop_api_unavailable"].includes(error?.code);
  const apply = async vault => {
    if (!vault?.vaultPath) throw new Error("未返回有效的笔记库信息");
    const scope = {};
    const controller = new AbortController();
    const isCurrent = () => state.noteMoveVaultScope === scope && !controller.signal.aborted;
    state.noteMoveVaultScope = scope;
    state.unresolvedNoteMove = null;
    state.noteMoveRecoveryCleanup?.();
    state.noteMoveRecoveryCleanup = null;
    try {
      const snapshot = await withMoveDeadline(() => loadVault(vault, { signal: controller.signal, isCurrent }), applyTimeoutMs);
      if (!isCurrent()) throw new Error("笔记库加载已失效");
      commitVault(vault, snapshot);
      state.noteMoveVaultUncertain = false;
      syncNoteMoveReadOnly(state);
      dialog.close();
      return vault;
    } finally { controller.abort(); }
  };
  const verify = async () => {
    if (outcome?.vault?.vaultPath) return apply(outcome.vault);
    const vault = await withMoveDeadline(() => verifyVault({ timeoutMs: verifyTimeoutMs, targetVaultPath }), verifyTimeoutMs);
    // An old-path response cannot prove a timed-out switch will not commit later.
    if (vault?.targetVaultMatchesCurrent !== true) return null;
    return apply(vault);
  };
  const retry = async () => {
    if (state.noteMoveVaultSwitching || !state.noteMoveVaultUncertain) return false;
    if (definitiveFailure(outcome?.error)) {
      state.noteMoveVaultUncertain = false;
      dialog.close();
      onRejected(outcome.error);
      return false;
    }
    state.noteMoveVaultSwitching = true;
    dialog.waiting();
    try {
      if (await verify()) return true;
    } catch { /* Keep protection until the target vault is confirmed and loaded. */ }
    finally { state.noteMoveVaultSwitching = false; }
    dialog.uncertain();
    return false;
  };
  try {
    dialog = createDialog(retry);
    dialog.waiting();
    let vault;
    try {
      vault = await withMoveDeadline(async () => {
        try { const result = await switchVault(); outcome = { vault: result }; return result; }
        catch (error) { outcome = { error }; throw error; }
      }, switchTimeoutMs);
    } catch (error) {
      if (definitiveFailure(error)) {
        dialog.close();
        throw error;
      }
      state.noteMoveVaultUncertain = true;
      try { vault = await verify(); } catch { /* A failed read is not a failed switch. */ }
      if (vault) return vault;
      dialog.uncertain();
      return null;
    }
    state.noteMoveVaultUncertain = true;
    try { return await apply(vault); }
    catch {
      dialog.uncertain();
      return null;
    }
  } finally {
    state.noteMoveVaultSwitching = false;
  }
}
