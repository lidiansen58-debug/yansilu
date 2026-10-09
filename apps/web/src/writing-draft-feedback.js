/** Keep the action stable while reporting whether the current input is saved. */
export function renderWritingDraftFeedback(deps = {}, { saveState = "idle", unavailableReason = "", uncertain = false } = {}) {
  const button = deps.$?.("btnWritingSaveDraft");
  const feedback = deps.$?.("writingDraftSaveFeedback");
  const text = unavailableReason || ({
    idle: "尚未保存", dirty: "有未保存的修改", saving: "正在保存…", saved: "已保存",
    error: uncertain ? "保存结果未确认，请先核查。修改仍保留。" : "保存失败，修改已保留。"
  }[saveState] || "尚未保存");
  if (button) {
    button.textContent = saveState === "saving" ? "正在保存..." : saveState === "error" ? uncertain ? "核查后再保存" : "重试保存" : "保存";
    button.setAttribute?.("aria-busy", String(saveState === "saving"));
  }
  if (feedback) {
    feedback.textContent = text;
    feedback.setAttribute?.("data-state", saveState);
  }
}
