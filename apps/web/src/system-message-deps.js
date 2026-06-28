export function createSystemMessageStateAccessors(host = {}) {
  const getMessagesRef = host.getMessagesRef || (() => []);
  const setMessagesRef = host.setMessagesRef || (() => {});
  const getSelectedMessageIdRef = host.getSelectedMessageIdRef || (() => "");
  const setSelectedMessageIdRef = host.setSelectedMessageIdRef || (() => {});
  return {
    getMessages: () => getMessagesRef(),
    setMessages: (messages = []) => {
      const next = Array.isArray(messages) ? messages : [];
      setMessagesRef(next);
      return next;
    },
    getSelectedMessageId: () => getSelectedMessageIdRef(),
    setSelectedMessageId: (messageId = "") => {
      const next = String(messageId || "").trim();
      setSelectedMessageIdRef(next);
      return next;
    }
  };
}

export function buildSystemMessageEventDeps(host = {}) {
  const stateAccessors = host.stateAccessors || createSystemMessageStateAccessors(host);
  return {
    ...stateAccessors,
    markSystemMessageRead: host.markSystemMessageRead,
    persistSystemMessages: host.persistSystemMessages,
    renderSystemMessages: host.renderSystemMessages,
    openSystemMessages: host.openSystemMessages,
    closeSystemMessages: host.closeSystemMessages,
    isSystemMessageModalOpen: host.isSystemMessageModalOpen,
    systemMessageActionRoute: host.systemMessageActionRoute,
    aiInboxFiltersForSystemMessage: host.aiInboxFiltersForSystemMessage,
    globalPendingAiInboxFilters: host.globalPendingAiInboxFilters,
    setAiInboxFilters: host.setAiInboxFilters,
    resetAiInboxDetail: host.resetAiInboxDetail,
    activateModule: host.activateModule,
    openAiInboxModule: host.openAiInboxModule,
    setSettingsItem: host.setSettingsItem,
    openNoteById: host.openNoteById,
    openSystemMessageWorkflow: host.openSystemMessageWorkflow,
    setStatus: host.setStatus
  };
}

export function buildSystemMessagesRuntimeDeps(host = {}) {
  const stateAccessors = host.stateAccessors || createSystemMessageStateAccessors(host);
  return {
    ...stateAccessors,
    normalizeSystemMessage: host.normalizeSystemMessage,
    upsertSystemMessageList: host.upsertSystemMessageList,
    limit: host.limit,
    persistSystemMessages: host.persistSystemMessages,
    renderSystemMessages: host.renderSystemMessages,
    openSystemMessages: host.openSystemMessages
  };
}

export function createSystemMessagePrototypeDepsProviders(hostProvider = () => ({})) {
  const stateAccessors = createSystemMessageStateAccessors({
    getMessagesRef: () => hostProvider().getMessagesRef?.() || [],
    setMessagesRef: (messages = []) => {
      hostProvider().setMessagesRef?.(messages);
    },
    getSelectedMessageIdRef: () => hostProvider().getSelectedMessageIdRef?.() || "",
    setSelectedMessageIdRef: (messageId = "") => {
      hostProvider().setSelectedMessageIdRef?.(messageId);
    }
  });
  return {
    eventDeps: () => buildSystemMessageEventDeps({
      ...hostProvider(),
      stateAccessors
    }),
    runtimeDeps: () => buildSystemMessagesRuntimeDeps({
      ...hostProvider(),
      stateAccessors
    })
  };
}
