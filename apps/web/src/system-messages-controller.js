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
    list.innerHTML = `<div class="system-message-empty-list">暂无消息</div>`;
    if (detail) {
      detail.innerHTML = `
        <article class="system-message-detail-card system-message-empty-card">
          <h3>暂无需要处理的消息</h3>
          <div class="system-message-body">AI 分析、图谱扫描或计划任务产生待审内容后，会显示在这里；采纳前不会改动笔记或图谱。</div>
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
            ${message.read ? "" : `<span class="system-message-unread-dot" aria-label="未读"></span>`}
            <span>${escapeHtml(title)}</span>
          </button>
          ${subject ? `<div class="system-message-subject">${escapeHtml(subject)}</div>` : ""}
          <div class="system-message-preview">${escapeHtml(preview)}</div>
          <div class="system-message-meta">${message.artifactCount ? `${escapeHtml(String(message.artifactCount))} 条建议 · ` : ""}${escapeHtml(new Date(message.createdAt).toLocaleString())}</div>
        </article>
      `;
    })
    .join("");
  if (!detail || !selectedMessage) return;
  const actionLabel = systemMessageActionLabel(selectedMessage);
  detail.innerHTML = `
    <article class="system-message-detail-card" data-system-message-detail-id="${escapeHtml(selectedMessage.id)}">
      <div class="system-message-detail-kicker">${selectedMessage.resolvedAt ? "已完成" : selectedMessage.read ? "已读" : "未读"}</div>
      <h3>${escapeHtml(systemMessageDisplayTitle(selectedMessage, notes))}</h3>
      ${
        systemMessageSubjectText(selectedMessage, notes)
          ? `<div class="system-message-focus"><span>相关笔记</span><strong>${escapeHtml(systemMessageSubjectText(selectedMessage, notes))}</strong></div>`
          : ""
      }
      <div class="system-message-body">${escapeHtml(selectedMessage.body || "没有更多内容。")}</div>
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
