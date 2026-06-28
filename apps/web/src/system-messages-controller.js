import {
  renderSystemMessageDetailView,
  renderSystemMessageEmptyDetailView,
  renderSystemMessageEmptyListView,
  renderSystemMessageListView
} from "./system-messages-view.js";

export function renderSystemMessagesDom(deps = {}) {
  const {
    $,
    getMessages = () => [],
    getSelectedMessageId = () => "",
    setSelectedMessageId = () => {},
    notes = [],
    escapeHtml = (value = "") => String(value ?? "")
  } = deps;
  const systemMessages = getMessages();
  const list = $("systemMessageList");
  const detail = $("systemMessageDetail");
  const button = $("systemMessagesButton");
  const markReadButton = $("btnSystemMessageMarkRead");
  const unreadCount = systemMessages.filter((item) => item.read !== true).length;
  button?.classList.toggle("has-unread", unreadCount > 0);
  if (button) {
    const systemMessageLabel = "系统消息与 AI 建议";
    button.title = unreadCount ? `${systemMessageLabel}（${unreadCount} 条未读）` : systemMessageLabel;
    button.dataset.tip = unreadCount ? `系统消息 ${unreadCount}` : "系统消息";
    button.setAttribute("aria-label", unreadCount ? `${systemMessageLabel}（${unreadCount} 条未读）` : systemMessageLabel);
  }
  if (markReadButton) {
    markReadButton.disabled = unreadCount === 0;
    markReadButton.title = unreadCount === 0 ? "没有未读系统消息" : "全部标记已读";
  }
  if (!list) return;
  if (!systemMessages.length) {
    list.innerHTML = renderSystemMessageEmptyListView();
    if (detail) detail.innerHTML = renderSystemMessageEmptyDetailView();
    return;
  }
  let selectedSystemMessageId = getSelectedMessageId();
  if (!systemMessages.some((message) => message.id === selectedSystemMessageId)) {
    selectedSystemMessageId = systemMessages[0]?.id || "";
    setSelectedMessageId(selectedSystemMessageId);
  }
  const selectedMessage = systemMessages.find((message) => message.id === selectedSystemMessageId) || systemMessages[0];
  const viewDeps = {
    ...deps,
    notes,
    escapeHtml
  };
  list.innerHTML = renderSystemMessageListView(systemMessages, selectedMessage, viewDeps);
  if (!detail || !selectedMessage) return;
  detail.innerHTML = renderSystemMessageDetailView(selectedMessage, viewDeps);
}

export function openSystemMessagesDom({ latestOnly = false } = {}, deps = {}) {
  const {
    $,
    document,
    getMessages = () => [],
    getSelectedMessageId = () => "",
    setSelectedMessageId = () => {},
    hideEditorHelper = () => {},
    renderSystemMessages = () => {}
  } = deps;
  const modal = $("systemMessageModal");
  if (!modal) return;
  const note = $("systemMessageModalNote");
  if (note) {
    note.textContent = latestOnly
      ? "有新的待确认事项，处理后仍可在这里回看。"
      : "这里汇总需要你确认的关系、问题和写作建议。";
  }
  const systemMessages = getMessages();
  const selectedSystemMessageId = getSelectedMessageId();
  if (latestOnly || !systemMessages.some((message) => message.id === selectedSystemMessageId)) {
    setSelectedMessageId(systemMessages[0]?.id || "");
  }
  hideEditorHelper();
  document.body?.classList.add("system-message-modal-open");
  modal.classList.remove("hidden");
  renderSystemMessages();
}

export function closeSystemMessagesDom(deps = {}) {
  const {
    $,
    document
  } = deps;
  document?.body?.classList?.remove("system-message-modal-open");
  $("systemMessageModal")?.classList?.add("hidden");
}

export function isSystemMessageModalOpenDom(deps = {}) {
  const { $ } = deps;
  const modal = $("systemMessageModal");
  return !!modal && !modal.classList.contains("hidden");
}
