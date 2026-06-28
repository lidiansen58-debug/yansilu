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
    const systemMessageLabel = "绯荤粺娑堟伅涓?AI 寤鸿";
    button.title = unreadCount ? `${systemMessageLabel}锛?{unreadCount} 鏉℃湭璇伙級` : systemMessageLabel;
    button.dataset.tip = unreadCount ? `绯荤粺娑堟伅 ${unreadCount}` : "绯荤粺娑堟伅";
    button.setAttribute("aria-label", unreadCount ? `${systemMessageLabel}锛?{unreadCount} 鏉℃湭璇伙級` : systemMessageLabel);
  }
  if (markReadButton) {
    markReadButton.disabled = unreadCount === 0;
    markReadButton.title = unreadCount === 0 ? "娌℃湁鏈绯荤粺娑堟伅" : "鍏ㄩ儴鏍囪宸茶";
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
      ? "鏈夋柊鐨勫緟纭浜嬮」锛屽鐞嗗悗浠嶅彲鍦ㄨ繖閲屽洖鐪嬨€?"
      : "杩欓噷姹囨€婚渶瑕佷綘纭鐨勫叧绯汇€侀棶棰樺拰鍐欎綔寤鸿銆?";
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
