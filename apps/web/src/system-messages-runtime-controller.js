export function markSystemMessagesReadForRuntime(deps = {}) {
  const {
    getMessages = () => [],
    setMessages = () => {},
    persistSystemMessages = () => {},
    renderSystemMessages = () => {}
  } = deps;
  const messages = (getMessages() || []).map((message) => ({ ...message, read: true }));
  setMessages(messages);
  persistSystemMessages();
  renderSystemMessages();
  return messages;
}

export function addSystemMessageForRuntime(message = {}, options = {}, deps = {}) {
  const {
    getMessages = () => [],
    setMessages = () => {},
    getSelectedMessageId = () => "",
    setSelectedMessageId = () => {},
    normalizeSystemMessage = (item) => item,
    limit = 50,
    persistSystemMessages = () => {},
    renderSystemMessages = () => {},
    openSystemMessages = () => {}
  } = deps;
  const normalized = normalizeSystemMessage(message);
  const messages = [normalized, ...(getMessages() || []).filter((item) => item.id !== normalized.id)].slice(0, limit);
  setMessages(messages);
  if (options?.interrupt || !getSelectedMessageId()) setSelectedMessageId(normalized.id);
  persistSystemMessages();
  renderSystemMessages();
  if (options?.interrupt) openSystemMessages({ latestOnly: true });
  return normalized;
}

export function upsertSystemMessageForRuntime(message = {}, options = {}, deps = {}) {
  const {
    getMessages = () => [],
    setMessages = () => {},
    getSelectedMessageId = () => "",
    setSelectedMessageId = () => {},
    normalizeSystemMessage = (item) => item,
    upsertSystemMessageList = () => ({ messages: [], message: normalizeSystemMessage(message) }),
    limit = 50,
    persistSystemMessages = () => {},
    renderSystemMessages = () => {},
    openSystemMessages = () => {}
  } = deps;
  const result = upsertSystemMessageList(getMessages(), message, {
    normalize: normalizeSystemMessage,
    limit,
    preserveRead: options?.preserveRead !== false
  });
  setMessages(result.messages);
  if (options?.interrupt || !getSelectedMessageId()) setSelectedMessageId(result.message.id);
  persistSystemMessages();
  renderSystemMessages();
  if (options?.interrupt) openSystemMessages({ latestOnly: true });
  return result.message;
}

export function resolveSystemMessageByDedupeKeyForRuntime(dedupeKey = "", deps = {}) {
  const {
    getMessages = () => [],
    setMessages = () => {},
    normalizeSystemMessage = (item) => item,
    persistSystemMessages = () => {},
    renderSystemMessages = () => {},
    now = () => new Date().toISOString()
  } = deps;
  const cleanKey = String(dedupeKey || "").trim();
  if (!cleanKey) return null;
  const existing = (getMessages() || []).find((item) => item.dedupeKey === cleanKey);
  if (!existing || existing.resolvedAt) return existing || null;
  const resolved = normalizeSystemMessage({
    ...existing,
    read: true,
    resolvedAt: now()
  });
  setMessages((getMessages() || []).map((item) => (item.id === resolved.id ? resolved : item)));
  persistSystemMessages();
  renderSystemMessages();
  return resolved;
}
