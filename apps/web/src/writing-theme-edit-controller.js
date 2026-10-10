import { fetchIndexCard, updateIndexCard } from "./prototype-api.js";
import { captureWritingProjectCreationContext } from "./writing-project-creation-context.js";
import { requestWritingThemeEdit } from "./writing-theme-edit-dialog.js";

export function createWritingThemeEditController({ depsProvider, fetchCard = fetchIndexCard, updateCard = updateIndexCard, requestEdit = requestWritingThemeEdit }) {
  let inFlight = null;
  async function performOpen(id, { onOpened = () => {}, returnFocus = null } = {}) {
    const deps = depsProvider();
    const context = captureWritingProjectCreationContext(deps);
    const isCurrent = () => deps.state.module === "writing" && context.isCurrent();
    if (!isCurrent()) throw new Error("请回到当前笔记库的写作页面再编辑主题。");
    let card;
    try { card = await fetchCard(id); }
    catch (error) { if (!isCurrent()) return null; throw error; }
    if (!isCurrent()) return null;
    if (!card?.id || card.id !== id) throw new Error("没有找到这个主题，请刷新后再试。");
    if (!String(card.updated_at || "").trim()) throw new Error("未读到主题的最新版本，请刷新后再试。");
    onOpened();
    return requestEdit({ card, isCurrent, returnFocus, onSave: async values => {
      if (!isCurrent()) throw new Error("笔记库或写作内容已切换，请重新打开主题。");
      const item = await updateCard(id, context.bindPayload({ ...values, expectedUpdatedAt: card.updated_at }));
      // A completed write belongs to the captured vault, even if navigation has moved on.
      if (!isCurrent()) return null;
      if (item?.id !== id) throw new Error("未收到主题保存结果，请重新打开主题核查。");
      deps.upsertWritingThemeIndex(item);
      deps.renderWritingPanel();
      deps.setStatus(`已保存主题：${item.title || item.id}`, "ok");
      return item;
    } });
  }
  return { open(id, options) {
    if (!inFlight) inFlight = performOpen(id, options).finally(() => { inFlight = null; });
    return inFlight;
  } };
}
