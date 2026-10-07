import { createWritingHistoryDialog, fillWritingHistoryVersions, fillWritingHistoryPreview } from "./writing-history-dialog-view.js";
import { acceptSavedWritingOutline } from "./writing-outline-recovery.js";
import { buildWritingOutlineOutput } from "./writing-outline-output.js";
import { createWritingRestorationId, restoreWritingHistoryWithReadback } from "./writing-history-restore.js";

const activeDialogs = new WeakMap();

export async function openWritingHistory(deps) {
  const { $ = () => null, writingState, state = {}, getVaultPath = () => "", listProjectScaffolds,
    fetchDraftScaffold, renderWritingPanel, applyWritingTab = () => {}, setStatus = () => {},
    downloadTextFile, writingScaffoldFileName } = deps;
  if (activeDialogs.has(writingState)) return activeDialogs.get(writingState);
  const documentRef = $("btnWritingHistory")?.ownerDocument;
  if (!documentRef || !writingState.project?.id || !writingState.scaffold?.id) return null;
  const opening = { projectId: writingState.project.id, scaffoldId: writingState.scaffold.id, vault: getVaultPath(), scope: state.noteMoveVaultScope, module: state.module };
  activeDialogs.set(writingState, opening);
  $("writingMoreMenu")?.removeAttribute("open");
  setStatus("正在载入提纲历史…", "");
  await writingState.outlineSaveQueue?.catch(() => null);
  if (writingState.project?.id !== opening.projectId || writingState.scaffold?.id !== opening.scaffoldId
    || getVaultPath() !== opening.vault || state.noteMoveVaultScope !== opening.scope || state.module !== opening.module || state.noteMoveVaultSwitching || state.noteMoveVaultUncertain) {
    activeDialogs.delete(writingState); return null;
  }
  const project = structuredClone(writingState.project), scaffold = structuredClone(writingState.scaffold);
  const vault = getVaultPath(), scope = state.noteMoveVaultScope, module = state.module;
  const snapshot = () => JSON.stringify([writingState.project?.id, writingState.project?.scaffold_id,
    writingState.scaffold?.id, writingState.scaffold?.updated_at, writingState.scaffold?.sections,
    writingState.scaffold?.open_questions, writingState.draftMarkdown, writingState.bookChapter]);
  const before = snapshot();
  const view = createWritingHistoryDialog(documentRef);
  let revision = 0, bundle = null, requestId = "", restoring = false, done = false, offset = 0, hasOlder = false;
  const current = () => !done && view.dialog.open && getVaultPath() === vault && state.noteMoveVaultScope === scope
    && state.module === module && !state.noteMoveVaultSwitching && !state.noteMoveVaultUncertain && snapshot() === before;
  const close = () => {
    if (restoring) return;
    done = true; revision++;
    view.dialog.close(); view.dialog.remove();
    activeDialogs.delete(writingState);
    documentRef.removeEventListener("keydown", onKey, true);
    $("writingMoreMenu")?.querySelector("summary")?.focus();
  };
  const onKey = event => {
    if (!view.dialog.open) return;
    event.stopImmediatePropagation();
    if (event.isComposing || event.keyCode === 229) return;
    if (event.key === "Tab") {
      const targets = [...view.dialog.querySelectorAll("button:not([disabled]),select:not([disabled])")].filter(el => !el.hidden && el.getClientRects().length);
      const first = targets[0], last = targets.at(-1), active = documentRef.activeElement;
      if (!view.dialog.contains(active) || (event.shiftKey ? active === first : active === last)) {
        event.preventDefault(); (event.shiftKey ? last : first)?.focus();
      }
    }
    if (event.key === "Escape") { event.preventDefault(); close(); }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") event.preventDefault();
  };
  const fail = error => {
    if (!current()) { close(); return; }
    view.status.textContent = String(error?.message || error);
    view.retry.hidden = false;
  };
  const loadSelected = async () => {
    const request = ++revision, id = view.select.value;
    bundle = null; requestId = ""; view.restore.disabled = true; view.exportButton.disabled = true;
    view.retry.hidden = true;
    view.preview.replaceChildren(); view.status.textContent = "正在载入提纲…";
    if (!id) { view.status.textContent = offset ? "没有更早的提纲，请查看较新的版本。" : "没有已保存的提纲。"; return; }
    try {
      const response = await fetchDraftScaffold(id);
      if (request !== revision) return;
      if (!current()) { close(); return; }
      if (response?.item?.id !== id || response.item.writing_project_id !== project.id || !Array.isArray(response.item.sections)) throw new Error("历史提纲读取结果不匹配，请重新载入。");
      bundle = response;
      fillWritingHistoryPreview(view, response.item);
      view.status.textContent = id === project.scaffold_id ? "当前已保存的提纲。" : "恢复会另存为新版本，不改动文章正文。";
      view.restore.disabled = id === project.scaffold_id;
      view.exportButton.disabled = false;
    } catch (error) { if (request === revision) fail(error); }
  };
  const loadVersions = async (nextOffset = offset) => {
    const request = ++revision;
    bundle = null; view.select.disabled = true; view.restore.disabled = true; view.exportButton.disabled = true;
    view.newer.disabled = true; view.older.disabled = true;
    view.retry.hidden = true;
    view.status.textContent = "正在载入历史记录…";
    try {
      const versions = await listProjectScaffolds(project.id, 50, nextOffset);
      if (request !== revision) return;
      if (!current()) { close(); return; }
      fillWritingHistoryVersions(view, versions, project.scaffold_id);
      offset = nextOffset; hasOlder = versions.length === 50;
      view.newer.disabled = offset === 0; view.older.disabled = !hasOlder;
      view.select.disabled = false;
      await loadSelected();
    } catch (error) { if (request === revision) fail(error); }
  };
  view.dialog.querySelector("[data-history-close]").addEventListener("click", close);
  view.dialog.addEventListener("cancel", event => { event.preventDefault(); close(); });
  view.select.addEventListener("change", loadSelected);
  view.retry.addEventListener("click", () => loadVersions());
  view.newer.addEventListener("click", () => loadVersions(Math.max(0, offset - 50)));
  view.older.addEventListener("click", () => loadVersions(offset + 50));
  view.exportButton.addEventListener("click", () => {
    if (!current() || !bundle || restoring) return;
    try { downloadTextFile(writingScaffoldFileName(project.title), buildWritingOutlineOutput({ project, scaffold: bundle.item })); }
    catch (error) { fail(error); }
  });
  view.restore.addEventListener("click", async () => {
    if (!current() || !bundle || restoring || bundle.item.id === project.scaffold_id) return;
    if (!documentRef.defaultView.confirm("恢复此提纲？当前提纲会保留为历史版本；未保存的编辑不会带入新版本。文章正文不变。")) return;
    if (!current()) return;
    restoring = true;
    for (const button of view.dialog.querySelectorAll("button, select")) button.disabled = true;
    view.status.textContent = "正在恢复提纲…";
    try {
      requestId ||= createWritingRestorationId(documentRef.defaultView.crypto);
      const restored = await restoreWritingHistoryWithReadback(deps, project.id, { sourceScaffoldId: bundle.item.id, restorationId: requestId,
        expectedScaffoldId: project.scaffold_id, expectedScaffoldUpdatedAt: scaffold.updated_at,
        expectedProjectUpdatedAt: project.updated_at, expectedSourceUpdatedAt: bundle.item.updated_at, expectedVaultPath: vault }, current);
      if (!current()) { restoring = false; close(); return; }
      if (restored?.id !== requestId || restored.writing_project?.id !== project.id || restored.writing_project.scaffold_id !== requestId || !Array.isArray(restored.sections)) throw new Error("恢复结果未能确认，请重试以核对已保存的版本。");
      let warning = "";
      try { acceptSavedWritingOutline(deps, project.id, restored); }
      catch (error) { warning = `提纲已恢复，但本机恢复记录未能更新：${String(error?.message || error)}`; }
      writingState.project = { ...project, ...restored.writing_project };
      writingState.scaffold = restored;
      writingState.scaffoldMarkdown = restored.markdown || "";
      restoring = false; close();
      renderWritingPanel(); applyWritingTab("outline");
      setStatus(warning || "历史提纲已恢复为新版本，文章正文未改动。", warning ? "warn" : "ok");
    } catch (error) { restoring = false; fail(error); }
    finally {
      if (!done) {
        for (const button of view.dialog.querySelectorAll("button, select")) button.disabled = false;
        view.restore.disabled = !bundle || bundle.item.id === project.scaffold_id;
        view.exportButton.disabled = !bundle;
        view.newer.disabled = offset === 0; view.older.disabled = !hasOlder;
      }
    }
  });
  documentRef.addEventListener("keydown", onKey, true);
  activeDialogs.set(writingState, view);
  view.dialog.showModal();
  await loadVersions();
  return view;
}
