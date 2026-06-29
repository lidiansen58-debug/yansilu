import {
  handleSystemMessageActionForRuntime
} from "./system-message-controller.js";

export { systemMessageById } from "./system-message-controller.js";

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
  return handleSystemMessageActionForRuntime({
    messages: getMessages(),
    messageId: messageId || getSelectedMessageId(),
    action
  }, {
    ...deps,
    setStatus,
    closeSystemMessages,
    renderSystemMessages,
    setSelectedMessageId,
    markSystemMessageRead,
    setMessages,
    persistSystemMessages
  });
}

export function handleSystemMessageEscapeKey(event, deps = {}) {
  const {
    isSystemMessageModalOpen = () => false,
    closeSystemMessages = () => {}
  } = deps;
  if (event?.key !== "Escape" || !isSystemMessageModalOpen()) return { handled: false };
  closeSystemMessages();
  event?.preventDefault?.();
  return { handled: true };
}

export function installSystemMessageEventHandlers(options = {}) {
  const {
    $ = () => null,
    depsProvider = () => ({})
  } = options;
  const deps = () => depsProvider();
  const registrations = [];
  const add = (id, eventName, handler) => {
    const element = $(id);
    element?.addEventListener?.(eventName, handler);
    registrations.push({ id, eventName, handler, installed: !!element });
  };

  add("systemMessagesButton", "click", (event) => {
    handleSystemMessagesButtonClick(event, deps());
  });
  add("btnSystemMessageClose", "click", () => {
    deps().closeSystemMessages?.();
  });
  add("btnSystemMessageMarkRead", "click", () => {
    handleMarkSystemMessagesRead(deps());
  });
  add("btnSystemMessageOpenAiInbox", "click", async () => {
    await handleOpenAllAiInboxFromSystemMessages(deps());
  });
  add("systemMessageModal", "click", async (event) => {
    await handleSystemMessageModalClick(event, deps());
  });

  return registrations;
}
