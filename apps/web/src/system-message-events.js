export function systemMessageById(messages = [], messageId = "") {
  const cleanId = String(messageId || "").trim();
  return messages.find((message) => message.id === cleanId) || null;
}

export function readAllSystemMessages(messages = []) {
  return messages.map((message) => ({ ...message, read: true }));
}

export function handleSystemMessagesButtonClick(event, deps = {}) {
  const { openSystemMessages = () => {} } = deps;
  event?.preventDefault?.();
  event?.stopPropagation?.();
  openSystemMessages();
}

export function handleMarkSystemMessagesRead(deps = {}) {
  const {
    getMessages = () => [],
    setMessages = () => {},
    persistSystemMessages = () => {},
    renderSystemMessages = () => {},
    setStatus = () => {}
  } = deps;
  setMessages(readAllSystemMessages(getMessages()));
  persistSystemMessages();
  renderSystemMessages();
  setStatus("系统消息已全部标记为已读", "ok");
}

export async function handleOpenAllAiInboxFromSystemMessages(deps = {}) {
  const {
    globalPendingAiInboxFilters = () => null,
    setAiInboxFilters = () => {},
    resetAiInboxDetail = () => {},
    closeSystemMessages = () => {},
    activateModule = () => {},
    openAiInboxModule = async () => {},
    setStatus = () => {}
  } = deps;
  setAiInboxFilters(globalPendingAiInboxFilters());
  resetAiInboxDetail();
  closeSystemMessages();
  activateModule("aiInbox");
  await openAiInboxModule();
  setStatus("已打开全部待确认建议", "ok");
}

export async function handleSystemMessageModalClick(event, deps = {}) {
  const {
    getMessages = () => [],
    setMessages = () => {},
    getSelectedMessageId = () => "",
    setSelectedMessageId = () => {},
    markSystemMessageRead = (messages) => messages,
    persistSystemMessages = () => {},
    renderSystemMessages = () => {},
    closeSystemMessages = () => {},
    systemMessageActionRoute = () => ({ kind: "" }),
    aiInboxFiltersForSystemMessage = () => null,
    setAiInboxFilters = () => {},
    resetAiInboxDetail = () => {},
    activateModule = () => {},
    openAiInboxModule = async () => {},
    setSettingsItem = () => {},
    openNoteById = () => false,
    openSystemMessageWorkflow = async () => false,
    setStatus = () => {}
  } = deps;

  if (event?.target?.id === "systemMessageModal") {
    closeSystemMessages();
    return { handled: true, kind: "close" };
  }

  const selectButton = event?.target?.closest?.("[data-system-message-select]");
  if (selectButton) {
    const messageId = String(selectButton.dataset.systemMessageSelect || "").trim();
    setSelectedMessageId(messageId);
    setMessages(markSystemMessageRead(getMessages(), messageId));
    persistSystemMessages();
    renderSystemMessages();
    return { handled: true, kind: "select", messageId };
  }

  const actionButton = event?.target?.closest?.("[data-system-message-action]");
  if (!actionButton) return { handled: false, kind: "" };

  const messageId = String(actionButton.dataset.systemMessageId || "").trim();
  const action = String(actionButton.dataset.systemMessageAction || "").trim();
  setSelectedMessageId(messageId || getSelectedMessageId());
  const readMessages = markSystemMessageRead(getMessages(), messageId);
  setMessages(readMessages);
  persistSystemMessages();

  const route = systemMessageActionRoute(action);
  const message = systemMessageById(readMessages, messageId);

  if (route.kind === "ai-inbox") {
    const messageFilters = aiInboxFiltersForSystemMessage(message);
    if (messageFilters) {
      setAiInboxFilters(messageFilters);
      resetAiInboxDetail();
    }
    closeSystemMessages();
    activateModule("aiInbox");
    await openAiInboxModule();
    setStatus(route.statusMessage, route.statusType);
    return { handled: true, kind: "ai-inbox", messageId };
  }

  if (route.kind === "settings-update") {
    closeSystemMessages();
    activateModule("settings");
    setSettingsItem("version-update", { render: true, announce: false });
    setStatus(route.statusMessage, route.statusType);
    return { handled: true, kind: "settings-update", messageId };
  }

  if (route.kind === "note") {
    if (message?.noteId) {
      const opened = openNoteById(message.noteId, { preferTitleSelection: false });
      if (opened) {
        closeSystemMessages();
        activateModule("explorer");
      }
      setStatus(opened ? route.successStatus : route.failureStatus, opened ? "ok" : "warn");
      return { handled: true, kind: "note", messageId, opened };
    }
  }

  if (route.kind === "workflow" || route.kind === "workflow-entry") {
    const opened = await openSystemMessageWorkflow(message || {});
    setStatus(opened ? route.successStatus : route.failureStatus, opened ? "ok" : "warn");
    return { handled: true, kind: route.kind, messageId, opened };
  }

  renderSystemMessages();
  return { handled: true, kind: route.kind || "unknown", messageId };
}
