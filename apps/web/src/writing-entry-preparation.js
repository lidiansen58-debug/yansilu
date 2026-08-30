import { checkOriginality, fetchNote, updateNote } from "./prototype-api.js";
import { parseLinks } from "./prototype-store.js";
import { applyLoadedNoteToClientState } from "./loaded-note-client-state.js";

export function renderWritingEntryPreparation(note, { escapeHtml, isWritingEligibleNote }) {
  if (!note || !["permanent", "original"].includes(note.noteType) || isWritingEligibleNote(note)) return "";
  const reason = note.authorship?.user_confirmed
    ? "这条笔记还未通过原创性检查。检查通过后即可加入写作。"
    : "这条笔记还需要你确认是自己的判断，并完成原创性检查。";
  return `<article class="writing-note-card" data-writing-note-id="${escapeHtml(note.id)}">
    <strong class="writing-note-title">${escapeHtml(note.title || "未命名笔记")}</strong>
    <p class="writing-note-meta">${reason}</p>
    <div class="writing-note-actions">
      <button class="mini-btn" type="button" data-writing-action="prepare" data-writing-note-id="${escapeHtml(note.id)}">确认并加入相关笔记</button>
      <button class="mini-btn" type="button" data-writing-action="open" data-writing-note-id="${escapeHtml(note.id)}">打开笔记</button>
    </div>
    <p class="writing-note-meta" role="status" data-writing-preparation-status></p>
  </article>`;
}

export async function prepareWritingEntryNote(noteId, deps) {
  const { state, editor, mapNoteItem, confirm = message => window.confirm(message),
    read = fetchNote, check = checkOriginality, update = updateNote } = deps;
  const scope = state.noteMoveVaultScope ||= {};
  const assertCurrent = () => {
    if (state.noteMoveVaultScope !== scope || state.noteMoveVaultSwitching || state.noteMoveVaultUncertain || state.unresolvedNoteMove) {
      throw new Error("笔记库或移动状态已改变，请完成当前操作后重试。");
    }
    if ((state.tabs || []).some(tab => tab.noteId === noteId && tab.dirty)) {
      throw new Error("这条笔记还有未保存修改。请先打开笔记保存，再加入写作。");
    }
  };
  assertCurrent();
  const note = await read(noteId);
  assertCurrent();
  if (!note || note.noteType !== "permanent") throw new Error("请先选择一条永久笔记。");
  if (!confirm(`确认“${note.title}”已经是你用自己的话写成的判断，而不是直接摘抄？\n检查通过后会加入相关笔记。`)) return false;
  const literature = await editor.linkedLiteratureForHydratedOriginality(note, parseLinks(note.body));
  assertCurrent();
  const payload = editor.originalityPayloadFromLiterature(note, note.body, literature);
  // Match the persisted-note check: citation locators are not required here.
  payload.originalityPlan = { ...payload.originalityPlan, requireCitationLocator: false };
  const result = await check(payload);
  assertCurrent();
  const evaluation = result?.originalityGuard?.evaluations?.find(item => item.permanentId === noteId);
  if (evaluation?.status !== "pass") {
    throw new Error(evaluation?.status === "blocked" || evaluation?.reasons?.some(reason => reason.includes("similarity"))
      ? "内容仍较接近来源原文，请打开笔记改写成自己的判断，再重新检查。"
      : "原创性检查未通过或暂不可用。请确认笔记已有清楚的观点，再重试。");
  }
  const latest = await read(noteId);
  assertCurrent();
  if (latest.body !== note.body || latest.updatedAt !== note.updatedAt) throw new Error("笔记在检查期间发生了变化，请重新确认。");
  const updated = await update(noteId, {
    status: "active", originalityStatus: evaluation.status, originalitySimilarity: evaluation.similarity,
    authorship: { ...latest.authorship, user_confirmed: true }
  });
  assertCurrent();
  applyLoadedNoteToClientState(state, mapNoteItem(updated), { refreshLoaded: true });
  if (!updated.authorship?.user_confirmed || updated.status !== "active") throw new Error("笔记仍未通过写作检查，请打开笔记核对后重试。");
  return true;
}
