import { beginAppNavigation } from "./app-navigation-intent.js";

// A slow home entry must yield to a later page, vault, or project selection.
export async function openTodayWriting({ theme = null, note = null, forWriting = false, deps = {} } = {}) {
  const state = deps.state || {};
  if (state.noteMoveVaultSwitching || state.noteMoveVaultUncertain || state.unresolvedNoteMove) return false;
  const ownsNavigation = beginAppNavigation(state);
  const path = deps.getVaultPath?.();
  let projectRevision;
  const isCurrent = (checkProject = true) => ownsNavigation()
    && (!Object.hasOwn(state, "module") || state.module === "writing")
    && deps.getVaultPath?.() === path
    && (!checkProject || deps.writingState?.projectOpenRevision === projectRevision);
  const themeId = String(theme?.id || "").trim();
  const noteIds = themeId ? [] : (Array.isArray(theme?.noteIds) ? theme.noteIds : [])
    .map(id => String(id || "").trim()).filter(Boolean);
  const noteId = forWriting && !themeId && !noteIds.length ? note?.id || "" : "";
  const title = String(theme?.title || "这个可写主题").trim();
  const count = Number(theme?.noteCount || 0);
  const themeReason = count > 0
    ? `${title} 已经聚合了 ${count} 条相关笔记，适合先续接这个主题。`
    : `${title} 已经在当前主题列表里，适合先从这里续接。`;
  if (forWriting && noteIds.length) deps.addWritingBasketIds?.(noteIds);
  if (noteId) deps.addWritingBasketIds?.([noteId]);
  projectRevision = deps.writingState?.projectOpenRevision;
  deps.markTodayReturnTarget?.({ label: "首页" });
  deps.activateModule?.("writing");
  try {
    await deps.openWritingModule?.({
      ...(forWriting && noteIds.length ? { statusMessage: `已把 ${noteIds.length} 条主题笔记加入写作中心` }
        : noteId ? { statusMessage: "已把这条笔记加入写作中心" } : {}),
      entryReason: forWriting
        ? themeId || noteIds.length ? themeReason : `${String(note?.title || "这条永久笔记").trim()} 已经有明确观点和三句摘要，适合先放入相关笔记继续组织。`
        : themeId ? "已打开主题索引详情。先看中心问题、关键笔记和缺口，再决定是否进入写作。" : themeReason,
      entrySourceLabel: "首页"
    });
    if (!isCurrent()) return false;
    if (themeId) {
      await deps.selectWritingThemeIndex?.(themeId, { isCurrent });
      if (!isCurrent() || (deps.writingState && deps.writingState.selectedThemeIndexId !== themeId)) return false;
    } else if (!forWriting && noteIds.length) deps.addWritingBasketIds?.(noteIds);
    if (!isCurrent(false)) return false;
    deps.applyWritingTab?.(forWriting ? "write" : "themes");
    if (!forWriting) deps.setStatus?.(themeId ? "已打开主题索引详情" : "已打开这组主题材料", "ok");
    return true;
  } catch (error) {
    if (isCurrent(false)) deps.setStatus?.(`打开写作失败：${String(error?.message || error)}`, "warn");
    return false;
  }
}
