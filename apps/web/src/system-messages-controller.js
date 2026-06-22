export function renderSystemMessagesDom(deps = {}) {
  const {
    $,
    getMessages = () => [],
    getSelectedMessageId = () => "",
    setSelectedMessageId = () => {},
    notes = [],
    escapeHtml = (value = "") => String(value ?? ""),
    systemMessageActionLabel,
    systemMessageDisplayTitle,
    systemMessagePreviewText,
    systemMessageSubjectText
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
    button.title = unreadCount ? `${systemMessageLabel}锛?${unreadCount} 鏉℃湭璇伙級` : systemMessageLabel;
    button.dataset.tip = unreadCount ? `绯荤粺娑堟伅 ${unreadCount}` : "绯荤粺娑堟伅";
    button.setAttribute("aria-label", unreadCount ? `${systemMessageLabel}锛?${unreadCount} 鏉℃湭璇?` : systemMessageLabel);
  }
  if (markReadButton) {
    markReadButton.disabled = unreadCount === 0;
    markReadButton.title = unreadCount === 0 ? "娌℃湁鏈绯荤粺娑堟伅" : "鍏ㄩ儴鏍囪宸茶";
  }
  if (!list) return;
  if (!systemMessages.length) {
    list.innerHTML = `<div class="system-message-empty-list">鏆傛棤娑堟伅</div>`;
    if (detail) {
      detail.innerHTML = `
        <article class="system-message-detail-card system-message-empty-card">
          <h3>鏆傛棤闇€瑕佸鐞嗙殑娑堟伅</h3>
          <div class="system-message-body">AI 鍒嗘瀽銆佸浘璋辨壂鎻忔垨璁″垝浠诲姟浜х敓寰呭鍐呭鍚庯紝浼氭樉绀哄湪杩欓噷锛涢噰绾冲墠涓嶄細鏀瑰姩绗旇鎴栧浘璋便€?</div>
        </article>
      `;
    }
    return;
  }
  let selectedSystemMessageId = getSelectedMessageId();
  if (!systemMessages.some((message) => message.id === selectedSystemMessageId)) {
    selectedSystemMessageId = systemMessages[0]?.id || "";
    setSelectedMessageId(selectedSystemMessageId);
  }
  const selectedMessage = systemMessages.find((message) => message.id === selectedSystemMessageId) || systemMessages[0];
  list.innerHTML = systemMessages
    .map((message) => {
      const selected = message.id === selectedMessage?.id;
      const subject = systemMessageSubjectText(message, notes);
      const preview = systemMessagePreviewText(message);
      const title = systemMessageDisplayTitle(message, notes);
      return `
        <article class="system-message-item${message.read ? "" : " is-unread"}${selected ? " is-selected" : ""}" data-system-message-id="${escapeHtml(message.id)}" data-system-message-select="${escapeHtml(message.id)}" role="button" tabindex="0">
          <button class="system-message-title" type="button" data-system-message-select="${escapeHtml(message.id)}" aria-current="${selected ? "true" : "false"}">
            ${message.read ? "" : `<span class="system-message-unread-dot" aria-label="鏈"></span>`}
            <span>${escapeHtml(title)}</span>
          </button>
          ${subject ? `<div class="system-message-subject">${escapeHtml(subject)}</div>` : ""}
          <div class="system-message-preview">${escapeHtml(preview)}</div>
          <div class="system-message-meta">${message.artifactCount ? `${escapeHtml(String(message.artifactCount))} 鏉″缓璁?路 ` : ""}${escapeHtml(new Date(message.createdAt).toLocaleString())}</div>
        </article>
      `;
    })
    .join("");
  if (!detail || !selectedMessage) return;
  const actionLabel = systemMessageActionLabel(selectedMessage);
  detail.innerHTML = `
    <article class="system-message-detail-card" data-system-message-detail-id="${escapeHtml(selectedMessage.id)}">
      <div class="system-message-detail-kicker">${selectedMessage.resolvedAt ? "宸插畬鎴?" : selectedMessage.read ? "宸茶" : "鏈"}</div>
      <h3>${escapeHtml(systemMessageDisplayTitle(selectedMessage, notes))}</h3>
      ${
        systemMessageSubjectText(selectedMessage, notes)
          ? `<div class="system-message-focus"><span>鐩稿叧绗旇</span><strong>${escapeHtml(systemMessageSubjectText(selectedMessage, notes))}</strong></div>`
          : ""
      }
      <div class="system-message-body">${escapeHtml(selectedMessage.body || "娌℃湁鏇村鍐呭銆?")}</div>
      <div class="system-message-meta">${escapeHtml(new Date(selectedMessage.createdAt).toLocaleString())}</div>
      ${
        actionLabel
          ? `<div class="system-message-actions"><button class="mini-btn primary" type="button" data-system-message-action="${escapeHtml(selectedMessage.action)}" data-system-message-id="${escapeHtml(selectedMessage.id)}">${escapeHtml(actionLabel)}</button></div>`
          : ""
      }
    </article>
  `;
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
