function systemMessagesViewDeps(deps = {}) {
  return {
    notes: [],
    escapeHtml: (value = "") => String(value ?? ""),
    systemMessageActionLabel: () => "",
    systemMessageDisplayTitle: (message = {}) => message.title || message.id || "",
    systemMessagePreviewText: (message = {}) => message.body || "",
    systemMessageSubjectText: () => "",
    ...deps
  };
}

export function renderSystemMessageEmptyListView() {
  return `<div class="system-message-empty-list">鏆傛棤娑堟伅</div>`;
}

export function renderSystemMessageEmptyDetailView() {
  return `
    <article class="system-message-detail-card system-message-empty-card">
      <h3>鏆傛棤闇€瑕佸鐞嗙殑娑堟伅</h3>
      <div class="system-message-body">AI 鍒嗘瀽銆佸浘璋辨壂鎻忔垨璁″垝浠诲姟浜х敓寰呭鍐呭鍚庯紝浼氭樉绀哄湪杩欓噷锛涢噰绾冲墠涓嶄細鏀瑰姩绗旇鎴栧浘璋便€?/div>
    </article>
  `;
}

export function renderSystemMessageListView(messages = [], selectedMessage = null, deps = {}) {
  const {
    notes,
    escapeHtml,
    systemMessageDisplayTitle,
    systemMessagePreviewText,
    systemMessageSubjectText
  } = systemMessagesViewDeps(deps);

  return messages
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
}

export function renderSystemMessageDetailView(message = null, deps = {}) {
  if (!message) return "";
  const {
    notes,
    escapeHtml,
    systemMessageActionLabel,
    systemMessageDisplayTitle,
    systemMessageSubjectText
  } = systemMessagesViewDeps(deps);
  const actionLabel = systemMessageActionLabel(message);
  const subject = systemMessageSubjectText(message, notes);
  return `
    <article class="system-message-detail-card" data-system-message-detail-id="${escapeHtml(message.id)}">
      <div class="system-message-detail-kicker">${message.resolvedAt ? "\u5df2\u5b8c\u6210" : message.read ? "\u5df2\u8bfb" : "\u672a\u8bfb"}</div>
      <h3>${escapeHtml(systemMessageDisplayTitle(message, notes))}</h3>
      ${
        subject
          ? `<div class="system-message-focus"><span>鐩稿叧绗旇</span><strong>${escapeHtml(subject)}</strong></div>`
          : ""
      }
      <div class="system-message-body">${escapeHtml(message.body || "\u6ca1\u6709\u66f4\u591a\u5185\u5bb9\u3002")}</div>
      <div class="system-message-meta">${escapeHtml(new Date(message.createdAt).toLocaleString())}</div>
      ${
        actionLabel
          ? `<div class="system-message-actions"><button class="mini-btn primary" type="button" data-system-message-action="${escapeHtml(message.action)}" data-system-message-id="${escapeHtml(message.id)}">${escapeHtml(actionLabel)}</button></div>`
          : ""
      }
    </article>
  `;
}
