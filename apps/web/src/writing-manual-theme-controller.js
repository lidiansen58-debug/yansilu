import { buildThemeIndexCreatePayload, THEME_INDEX_MIN_NOTE_COUNT } from "./theme-index-entry-model.js";
import { uniqueStrings } from "./prototype-collection-utils.js";

export function createWritingManualThemeController(deps) {
  let inFlight = null;
  let draft = null;

  async function performSave() {
    const { state, writingState = {}, parseWritingBasketIds, writingThemeIndexScopeDirectoryId, ensureNotesLoaded,
      writingNoteById, isWritingEligibleNote, requestTextInput, createIndexCard,
      upsertWritingThemeIndex, useThemeIndexAsWritingEntry, openTheme } = deps;
    const scope = state.noteMoveVaultScope ||= {};
    const directoryId = writingThemeIndexScopeDirectoryId();
    const noteIds = uniqueStrings(parseWritingBasketIds());
    const key = JSON.stringify([...noteIds].sort());
    const projectId = writingState.project?.id || "";
    const themeId = writingState.selectedThemeIndexId || "";
    const assertCurrent = (checkWritingContext = true) => {
      if (state.noteMoveVaultScope !== scope || state.noteMoveVaultSwitching || state.noteMoveVaultUncertain || state.unresolvedNoteMove ||
          directoryId !== writingThemeIndexScopeDirectoryId() || key !== JSON.stringify(uniqueStrings(parseWritingBasketIds()).sort())) {
        throw new Error("笔记库或相关笔记已改变，请重新创建主题。");
      }
      if (checkWritingContext && (projectId !== (writingState.project?.id || "") || themeId !== (writingState.selectedThemeIndexId || ""))) {
        throw new Error("当前写作内容已切换，请重新创建主题。");
      }
      if (["dirty", "saving", "error"].includes(writingState.draftSaveState)) {
        throw new Error("请先回到草稿完成保存，再新建主题。");
      }
    };
    assertCurrent();
    if (noteIds.length < THEME_INDEX_MIN_NOTE_COUNT) {
      throw new Error(`请先在“相关笔记”中选择至少 ${THEME_INDEX_MIN_NOTE_COUNT} 条永久笔记。`);
    }
    await ensureNotesLoaded(noteIds);
    assertCurrent();
    if (noteIds.some(id => !isWritingEligibleNote(writingNoteById(id)))) {
      throw new Error("部分笔记还未完成作者确认，请先在“相关笔记”中处理。");
    }
    if (!draft || draft.scope !== scope || draft.key !== key || draft.directoryId !== directoryId) {
      draft = { scope, key, directoryId, title: "", question: "", card: null };
    }
    if (!draft.card) {
      const title = await requestTextInput({ title: "新建主题", label: "文章题目", note: `用已选的 ${noteIds.length} 条笔记写一篇文章。`, value: draft.title });
      assertCurrent();
      if (!String(title || "").trim()) return null;
      draft.title = String(title).trim();
      const question = await requestTextInput({ title: "想回答的问题", label: "问题", note: "这篇文章要回答什么？", value: draft.question });
      assertCurrent();
      if (!String(question || "").trim()) return null;
      draft.question = String(question).trim();
      if (noteIds.some(id => !isWritingEligibleNote(writingNoteById(id)))) {
        throw new Error("相关笔记的状态已改变，请重新确认后再创建主题。");
      }
      const payload = buildThemeIndexCreatePayload({ directoryId, noteIds, title: draft.title, noteById: writingNoteById });
      draft.card = await createIndexCard({
        ...payload,
        orderingStrategy: "manual",
        centralQuestion: draft.question,
        summary: draft.question,
        thesis: "用户围绕这个问题手动选择的笔记。",
        threeLineSummary: [draft.question, `相关笔记 ${noteIds.length} 条`, "下一步：整理提纲。"],
        items: payload.items.map(item => ({ ...item, rationale: "用户选择用于讨论这个问题，具体作用可在主题中继续补充。" }))
      });
      if (!draft.card?.id) throw new Error("未收到主题保存结果，请在主题库核查后再试。");
    }
    assertCurrent();
    const card = draft.card;
    upsertWritingThemeIndex(card);
    await useThemeIndexAsWritingEntry(card.id, { replaceBasket: true, resetContext: true, source: "writing_manual_theme", assertCurrent });
    assertCurrent(false);
    openTheme();
    draft = null;
    return card;
  }

  return {
    save() {
      if (!inFlight) inFlight = performSave().finally(() => { inFlight = null; });
      return inFlight;
    }
  };
}
