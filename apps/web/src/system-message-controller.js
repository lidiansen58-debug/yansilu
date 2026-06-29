import {
  systemMessageActionRoute as defaultSystemMessageActionRoute
} from "./system-message-route-model.js";

export function systemMessageById(messages = [], messageId = "") {
  const cleanId = String(messageId || "").trim();
  return (Array.isArray(messages) ? messages : []).find((message) => message.id === cleanId) || null;
}

export async function openSystemMessageActionForRuntime({
  message = null,
  action = "",
  route = null
} = {}, deps = {}) {
  const {
    systemMessageActionRoute = defaultSystemMessageActionRoute,
    aiInboxFiltersForSystemMessage = () => null,
    setAiInboxFilters = () => {},
    resetAiInboxDetail = () => {},
    closeSystemMessages = () => {},
    activateModule = () => {},
    openAiInboxModule = async () => {},
    setSettingsItem = () => {},
    openNoteById = () => false,
    openSystemMessageWorkflow = async () => false,
    renderSystemMessages = () => {},
    setStatus = () => {}
  } = deps;
  const resolvedRoute = route && typeof route === "object" ? route : systemMessageActionRoute(action);
  const messageId = String(message?.id || "").trim();

  if (resolvedRoute.kind === "ai-inbox") {
    const messageFilters = aiInboxFiltersForSystemMessage(message);
    if (messageFilters) {
      setAiInboxFilters(messageFilters);
      resetAiInboxDetail();
    }
    closeSystemMessages();
    activateModule("aiInbox");
    await openAiInboxModule();
    setStatus(resolvedRoute.statusMessage, resolvedRoute.statusType);
    return { handled: true, kind: "ai-inbox", messageId };
  }

  if (resolvedRoute.kind === "settings-update") {
    closeSystemMessages();
    activateModule("settings");
    setSettingsItem("version-update", { render: true, announce: false });
    setStatus(resolvedRoute.statusMessage, resolvedRoute.statusType);
    return { handled: true, kind: "settings-update", messageId };
  }

  if (resolvedRoute.kind === "note") {
    const noteId = String(message?.noteId || "").trim();
    if (!noteId) {
      setStatus(resolvedRoute.failureStatus, "warn");
      return { handled: true, kind: "note", messageId, opened: false };
    }
    const opened = openNoteById(noteId, { preferTitleSelection: false });
    if (opened) {
      closeSystemMessages();
      activateModule("explorer");
    }
    setStatus(opened ? resolvedRoute.successStatus : resolvedRoute.failureStatus, opened ? "ok" : "warn");
    return { handled: true, kind: "note", messageId, opened };
  }

  if (resolvedRoute.kind === "workflow" || resolvedRoute.kind === "workflow-entry") {
    const opened = await openSystemMessageWorkflow(message || {});
    setStatus(opened ? resolvedRoute.successStatus : resolvedRoute.failureStatus, opened ? "ok" : "warn");
    return { handled: true, kind: resolvedRoute.kind, messageId, opened };
  }

  renderSystemMessages();
  return { handled: true, kind: resolvedRoute.kind || "unknown", messageId };
}

export async function handleSystemMessageActionForRuntime({
  messages = [],
  messageId = "",
  action = ""
} = {}, deps = {}) {
  const {
    setSelectedMessageId = () => {},
    markSystemMessageRead = (items) => items,
    setMessages = () => {},
    persistSystemMessages = () => {}
  } = deps;
  const cleanMessageId = String(messageId || "").trim();
  setSelectedMessageId(cleanMessageId);
  const readMessages = markSystemMessageRead(messages, cleanMessageId);
  setMessages(readMessages);
  persistSystemMessages();
  return openSystemMessageActionForRuntime({
    message: systemMessageById(readMessages, cleanMessageId),
    action
  }, deps);
}
